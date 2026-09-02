/**
 * pnpm probe — answers the nine P0 questions in docs/spec/11_open_items.md section 1 by
 * calling the real API, and rewrites docs/spec/_probe-results.md with what came back.
 *
 * Three rules this script exists to keep:
 *
 *   1. It probes the way ingest will call. P0-3 enumerates Odii and matches by coordinate
 *      rather than by keyword, because docs/spec/05_ingest.md 5.4 collects that way; a check
 *      that passes by a different route leaves "verified, still broken" as a possible state.
 *   2. It never prints the service key or a full URL. Every message from the transport is
 *      already redacted; nothing here builds a URL of its own.
 *   3. A missing key or a missing content/pois.json exits non-zero with what to do. Passing
 *      quietly with nothing verified is the one outcome that would make this file a lie.
 *
 * Exit code: 0 when every check that ran could answer its question — including answers we
 * would rather not get, such as "this POI is not in the barrier-free dataset". Non-zero when
 * a check could not answer (network, key, parameter error, or an exception).
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { CAPABILITIES, KTO_ETC_FIELDS } from '@/domain/capabilities';
import { distanceMeters } from '@/domain/geo';
import type { LatLng } from '@/domain/types';
import {
  BARRIER_FREE_FIELD_NAMES,
  KOREA_LAT_MAX,
  KOREA_LAT_MIN,
  KOREA_LNG_MAX,
  KOREA_LNG_MIN,
  readMapxyCoord,
  readStoryCoord,
  readThemeCoord,
} from '@/lib/kto/schemas';
import {
  ODII_DEFAULT_LANG_CODE,
  SERVICE_IDS,
  getBarrierFreeDetail,
  getCrowdForecast,
  getLdongCodes,
  getMultilingualPoiCommon,
  getOdiiStories,
  getPoiCommon,
  listAllOdiiThemes,
  listBarrierFreeSync,
  listOdiiThemesNearby,
  listPoisByArea,
  odiiLocationParams,
  searchOdiiThemes,
  searchOdiiThemesByKeyword,
} from '@/lib/kto/services';
import {
  SERVICE_KEY_ENV_NAME,
  hasServiceKey,
  ktoRequest,
  type KtoFail,
  type KtoResult,
} from '@/lib/kto/transport';

const RESULTS_PATH = 'docs/spec/_probe-results.md';
const POIS_PATH = 'content/pois.json';
const ENV_FILE = '.env.local';

/** docs/spec/05_ingest.md 5.4: a themeBasedList row counts as ours inside this radius. */
const ODII_MATCH_RADIUS_M = 1_000;
/** Odii's own sample totalCount is 1,504. 40 pages of 100 leaves headroom without a runaway. */
const ODII_MAX_PAGES = 40;
/** Same idea for the barrier-free sync list, whose unfiltered sample totalCount is 8,852. */
const SYNC_MAX_PAGES = 20;
/** Two coordinates this close are the same place. Used to settle P0-10 without reading titles. */
const SAME_PLACE_METERS = 200;

type CheckStatus = 'pass' | 'partial' | 'fail' | 'error';

interface CheckOutcome {
  id: string;
  status: CheckStatus;
  /** One line for the summary table. */
  summary: string;
  /** Markdown body for the section. */
  lines: string[];
}

interface CheckDefinition {
  id: string;
  title: string;
  run: (context: ProbeContext) => Promise<CheckOutcome>;
}

const STATUS_LABELS: Record<CheckStatus, string> = {
  pass: '✅ 통과',
  partial: '⚠️ 부분',
  fail: '❌ 실패',
  error: '❌ 예외',
};

// ── input: content/pois.json ────────────────────────────────────────────────────

/**
 * Only the fields the probe needs. scripts/validate-content.ts owns the full contract for
 * this file; duplicating it here would create a second authority that drifts.
 */
const ProbePoiSchema = z.looseObject({
  slug: z.string().min(1),
  nameKo: z.string().min(1),
  /** Empty is allowed and expected before P0-1: the probe resolves it by title. */
  ktoContentId: z.string(),
  contentTypeId: z.coerce.number(),
  lDongRegnCd: z.string().min(1),
  lDongSignguCd: z.string().min(1),
  signguCd5: z.string().min(1),
  coord: z.object({
    lat: z.coerce.number().min(KOREA_LAT_MIN).max(KOREA_LAT_MAX),
    lng: z.coerce.number().min(KOREA_LNG_MIN).max(KOREA_LNG_MAX),
  }),
  tatsName: z.string().nullish(),
  odiiKeyword: z.string().nullish(),
});

type ProbePoi = z.infer<typeof ProbePoiSchema>;

/** Valid JSON, so it can be pasted straight into the file. Field notes are printed beside it. */
const POIS_JSON_TEMPLATE = `[
  {
    "slug": "gongsanseong",
    "nameKo": "공산성",
    "ktoContentId": "",
    "contentTypeId": 12,
    "lDongRegnCd": "44",
    "lDongSignguCd": "150",
    "signguCd5": "44150",
    "coord": { "lat": 36.4661, "lng": 127.1236 },
    "tatsName": "공산성",
    "odiiKeyword": "공산성"
  }
]`;

const POIS_FIELD_NOTES: readonly string[] = [
  'ktoContentId  : 비워 두면 탐침이 KorService2/areaBasedList2 제목 검색으로 찾아 준다',
  'lDongRegnCd   : 2자리 시도 코드 — KorService2 / KorWithService2 / 다국어 계열',
  'lDongSignguCd : 3자리 시군구 코드 — 같은 계열',
  'signguCd5     : 5자리 행정표준 시군구 코드 — TatsCnctrRateService / TarRlteTarService1 계열',
  'coord         : WGS84 십진도. lat 위도, lng 경도 (KTO mapx 가 경도, mapy 가 위도다)',
  'tatsName      : 집중률 API 의 tAtsNm 문자열 (P0-5 가 실제 목록과 대조한다)',
  'odiiKeyword   : Odii 제목 대조용. 좌표 매칭이 기본이고 이건 보조다',
];

function loadEnvFile(): void {
  // tsx does not read .env.local the way next dev does, and the key has to come from
  // somewhere. A shell-supplied variable stays authoritative because loadEnvFile does not
  // overwrite what is already set.
  const path = resolve(process.cwd(), ENV_FILE);
  if (existsSync(path)) process.loadEnvFile(path);
}

function readPois(): ProbePoi[] | null {
  const path = resolve(process.cwd(), POIS_PATH);
  if (!existsSync(path)) {
    console.error(`${POIS_PATH} 가 없다. 탐침은 이 파일에서 대상 6곳을 읽는다.`);
    console.error('필요한 형태:');
    console.error(POIS_JSON_TEMPLATE);
    console.error('');
    for (const note of POIS_FIELD_NOTES) console.error(`  ${note}`);
    return null;
  }
  const parsed = z.array(ProbePoiSchema).safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (!parsed.success) {
    console.error(`${POIS_PATH} 형태가 맞지 않는다:`);
    console.error(z.prettifyError(parsed.error));
    return null;
  }
  if (parsed.data.length === 0) {
    console.error(`${POIS_PATH} 가 비어 있다.`);
    return null;
  }
  return parsed.data;
}

// ── shared helpers ──────────────────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined || value === null) return '';
  return String(value);
}

function isFilled(value: unknown): boolean {
  return textOf(value).trim() !== '';
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, '');
}

function failText(result: KtoFail): string {
  return `resultCode=${result.resultCode} — ${result.message}`;
}

function previousYearMonth(today: Date): string {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth(); // 0-based, so this is already "last month"
  const shifted = month === 0 ? { y: year - 1, m: 12 } : { y: year, m: month };
  return `${shifted.y}${String(shifted.m).padStart(2, '0')}`;
}

/** A markdown table row ends at a pipe or a newline, and API strings can carry both. */
function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function truncateList(values: readonly string[], limit: number): string {
  const safe = values.map(cell);
  if (safe.length <= limit) return safe.join(' · ');
  return `${safe.slice(0, limit).join(' · ')} … (총 ${values.length}건)`;
}

// ── contentId resolution (shared by P0-1, P0-10, P0-11) ─────────────────────────

interface ResolvedPoi {
  poi: ProbePoi;
  contentId: string | null;
  resolvedBy: 'pois.json' | 'areaBasedList2' | null;
  matchedTitle: string | null;
  note: string;
}

interface ProbeContext {
  pois: ProbePoi[];
  baseYm: string;
  /** Filled on first use; several checks need the same six contentIds. */
  resolveContentIds: () => Promise<ResolvedPoi[]>;
}

function makeContext(pois: ProbePoi[], baseYm: string): ProbeContext {
  let cached: Promise<ResolvedPoi[]> | null = null;
  return {
    pois,
    baseYm,
    resolveContentIds: () => {
      if (cached === null) cached = resolveContentIds(pois);
      return cached;
    },
  };
}

/**
 * Fills in a contentId for every POI whose pois.json entry leaves it empty, by listing the
 * sigungu with areaBasedList2 and matching the title. Paged to totalCount on purpose: the
 * spec warns three times that a first page of 10 can omit our POIs, and a missed POI here
 * would make every later check report "not registered" for a place that is registered.
 */
async function resolveContentIds(pois: ProbePoi[]): Promise<ResolvedPoi[]> {
  const listings = new Map<string, Map<string, string>>();

  async function titleIndex(poi: ProbePoi): Promise<Map<string, string> | string> {
    const key = `${poi.lDongRegnCd}/${poi.lDongSignguCd}/${poi.contentTypeId}`;
    const cachedIndex = listings.get(key);
    if (cachedIndex !== undefined) return cachedIndex;
    const listed = await listPoisByArea(
      {
        lDongRegnCd: poi.lDongRegnCd,
        lDongSignguCd: poi.lDongSignguCd,
        contentTypeId: poi.contentTypeId,
      },
      { numOfRows: 100, maxPages: 20 },
    );
    if (!listed.ok) return failText(listed);
    const index = new Map<string, string>();
    for (const row of listed.items) {
      const title = textOf(row.title);
      const contentId = textOf(row.contentid);
      if (title !== '' && contentId !== '') index.set(title, contentId);
    }
    listings.set(key, index);
    return index;
  }

  const resolved: ResolvedPoi[] = [];
  for (const poi of pois) {
    if (poi.ktoContentId.trim() !== '') {
      resolved.push({
        poi,
        contentId: poi.ktoContentId.trim(),
        resolvedBy: 'pois.json',
        matchedTitle: null,
        note: 'pois.json 의 값을 그대로 썼다',
      });
      continue;
    }
    const index = await titleIndex(poi);
    if (typeof index === 'string') {
      resolved.push({ poi, contentId: null, resolvedBy: null, matchedTitle: null, note: `areaBasedList2 실패 — ${index}` });
      continue;
    }
    const exact = index.get(poi.nameKo);
    if (exact !== undefined) {
      resolved.push({ poi, contentId: exact, resolvedBy: 'areaBasedList2', matchedTitle: poi.nameKo, note: '제목 완전 일치' });
      continue;
    }
    const wanted = normalizeTitle(poi.nameKo);
    let loose: { title: string; id: string } | null = null;
    for (const [title, id] of index) {
      const candidate = normalizeTitle(title);
      if (candidate === wanted || candidate.includes(wanted)) {
        loose = { title, id };
        break;
      }
    }
    if (loose !== null) {
      resolved.push({
        poi,
        contentId: loose.id,
        resolvedBy: 'areaBasedList2',
        matchedTitle: loose.title,
        note: `공백 무시 부분 일치 — 사람이 확인할 것 ("${loose.title}")`,
      });
      continue;
    }
    resolved.push({
      poi,
      contentId: null,
      resolvedBy: null,
      matchedTitle: null,
      note: `목록 ${index.size}건 안에 제목이 없다`,
    });
  }
  return resolved;
}

// ── P0-1 ────────────────────────────────────────────────────────────────────────

const SCORED_KTO_FIELDS: readonly string[] = CAPABILITIES.flatMap((capability) =>
  capability.ktoField === null ? [] : [capability.ktoField],
);

async function checkP01(context: ProbeContext): Promise<CheckOutcome> {
  const lines: string[] = [];
  const resolved = await context.resolveContentIds();
  lines.push(`점수 대상 항목 수: **${SCORED_KTO_FIELDS.length}개** (src/domain/capabilities.ts 의 ktoField)`);
  lines.push('');
  lines.push('| 관광지 | contentId | 출처 | resultCode | 채움 | 채워진 항목 |');
  lines.push('|---|---|---|---|---|---|');

  let answered = 0;
  let noData = 0;
  let failed = 0;
  const unknownFields = new Set<string>();
  const etcFound: string[] = [];

  for (const entry of resolved) {
    const name = entry.poi.nameKo;
    if (entry.contentId === null) {
      failed += 1;
      lines.push(`| ${name} | — | 미해결 | — | — | ${cell(entry.note)} |`);
      continue;
    }
    const detail = await getBarrierFreeDetail(entry.contentId);
    if (!detail.ok) {
      failed += 1;
      lines.push(`| ${name} | ${entry.contentId} | ${entry.resolvedBy} | ${detail.resultCode} | — | ${cell(detail.message)} |`);
      continue;
    }
    if (detail.items.length === 0) {
      noData += 1;
      lines.push(
        `| ${name} | ${entry.contentId} | ${entry.resolvedBy} | ${detail.resultCode} | 0/${SCORED_KTO_FIELDS.length} | 무장애 응답 없음 (03 하나로 "미등록"이라고 쓰지 않는다 — P0-11 참조) |`,
      );
      continue;
    }
    answered += 1;
    const row = asRecord(detail.items[0]);
    const filled = SCORED_KTO_FIELDS.filter((field) => isFilled(row[field]));
    for (const field of KTO_ETC_FIELDS) {
      if (isFilled(row[field])) etcFound.push(`${name}/${field}`);
    }
    // Reads straight off the wire, not through the typed row: a misspelling in our schema
    // would otherwise show as an empty field, and this is the check that would hide it.
    for (const key of Object.keys(row)) {
      if (key === 'contentid') continue;
      if (!BARRIER_FREE_FIELD_NAMES.includes(key)) unknownFields.add(key);
    }
    lines.push(
      `| ${name} | ${entry.contentId} | ${entry.resolvedBy} | ${detail.resultCode} | **${filled.length}/${SCORED_KTO_FIELDS.length}** | ${filled.length === 0 ? '전부 빈 문자열 — 등록은 됐고 운영자가 안 채웠다' : truncateList(filled, 24)} |`,
    );
  }

  lines.push('');
  if (etcFound.length > 0) {
    lines.push(`\`*etc\` 4개 중 값이 있는 것 (점수 제외, \`pois[].etcNotes\` 로 간다): ${truncateList(etcFound, 12)}`);
  } else {
    lines.push('`*etc` 4개는 전부 비어 있다.');
  }
  if (unknownFields.size > 0) {
    lines.push('');
    lines.push(
      `★ 응답에 우리 카탈로그가 이름을 모르는 필드가 있다: ${truncateList([...unknownFields], 30)} — \`src/lib/kto/schemas.ts\` 와 \`src/domain/capabilities.ts\` 를 확인할 것.`,
    );
  }

  const status: CheckStatus = failed > 0 ? 'fail' : noData > 0 ? 'partial' : 'pass';
  return {
    id: 'P0-1',
    status,
    summary: `응답 ${answered}곳 / 데이터없음(03) ${noData}곳 / 확인불가 ${failed}곳`,
    lines,
  };
}

// ── P0-2 ────────────────────────────────────────────────────────────────────────

async function checkP02(context: ProbeContext): Promise<CheckOutcome> {
  const first = context.pois[0];
  if (first === undefined) {
    return { id: 'P0-2', status: 'fail', summary: 'pois.json 이 비어 있다', lines: ['대상이 없다.'] };
  }
  // The cheapest call that still exercises the key: one row of the code bootstrap.
  const result = await ktoRequest(SERVICE_IDS.kor, 'ldongCode2', {
    lDongRegnCd: first.lDongRegnCd,
    lDongListYn: 'Y',
    numOfRows: 1,
    pageNo: 1,
  });
  if (result.ok) {
    return {
      id: 'P0-2',
      status: 'pass',
      summary: `resultCode=${result.resultCode} (30 아님)`,
      lines: [
        `\`${SERVICE_IDS.kor}/ldongCode2\` → **resultCode=${result.resultCode}**, totalCount=${result.totalCount}`,
        '',
        `인증키가 동작한다. \`${SERVICE_KEY_ENV_NAME}\` 에 Decoding 키가 들어가 있고 이중 인코딩이 없다.`,
      ],
    };
  }
  const lines = [`\`${SERVICE_IDS.kor}/ldongCode2\` → **${failText(result)}**`];
  if (result.resultCode === '30') {
    lines.push('');
    lines.push(
      `★ 30 = 등록되지 않은 서비스키. 대개 키가 틀린 게 아니라 **이중 인코딩**이다 — \`.env.local\` 의 \`${SERVICE_KEY_ENV_NAME}\` 를 "일반 인증키(**Decoding**)" 값으로 교체한다.`,
    );
  } else if (result.resultCode === '31') {
    lines.push('');
    lines.push('★ 31 = 활용기간 만료. 포털에서 연장신청.');
  }
  return { id: 'P0-2', status: 'fail', summary: failText(result), lines };
}

// ── P0-3 ────────────────────────────────────────────────────────────────────────

async function checkP03(context: ProbeContext): Promise<CheckOutcome> {
  const lines: string[] = [];
  const themes = await listAllOdiiThemes(ODII_DEFAULT_LANG_CODE, {
    numOfRows: 100,
    maxPages: ODII_MAX_PAGES,
  });
  if (!themes.ok) {
    return {
      id: 'P0-3',
      status: 'fail',
      summary: failText(themes),
      lines: [`\`${SERVICE_IDS.odii}/themeBasedList\` 전수 열거 실패 — ${failText(themes)}`],
    };
  }

  lines.push(
    `\`${SERVICE_IDS.odii}/themeBasedList\` 전수 열거: totalCount=**${themes.totalCount}**, 받은 행 ${themes.items.length}, ${themes.pagesFetched}페이지${themes.truncated ? ` — ★ ${ODII_MAX_PAGES}페이지 상한에서 잘렸다` : ''}`,
  );

  const withCoord: Array<{ coord: LatLng; tid: string; tlid: string; title: string }> = [];
  const coordFields = new Map<string, number>();
  const coordFailures = new Map<string, number>();
  for (const row of themes.items) {
    const reading = readThemeCoord(row);
    if (reading.ok) {
      coordFields.set(reading.fields, (coordFields.get(reading.fields) ?? 0) + 1);
      withCoord.push({
        coord: reading.coord,
        tid: textOf(row.tid),
        tlid: textOf(row.tlid),
        title: textOf(row.title),
      });
    } else {
      coordFailures.set(reading.reason, (coordFailures.get(reading.reason) ?? 0) + 1);
    }
  }
  lines.push('');
  lines.push(`좌표를 읽을 수 있었던 행: **${withCoord.length} / ${themes.items.length}**`);
  if (coordFields.size > 0) {
    lines.push(`답한 필드 이름: ${[...coordFields].map(([name, count]) => `\`${name}\` ${count}건`).join(' · ')}`);
  }
  if (coordFailures.size > 0) {
    lines.push(`읽지 못한 이유: ${[...coordFailures].map(([reason, count]) => `${reason} (${count}건)`).join(' · ')}`);
  }

  lines.push('');
  lines.push(`### 좌표 매칭 (반경 ${ODII_MATCH_RADIUS_M}m)`);
  lines.push('');
  lines.push('| 관광지 | 매칭된 Odii 관광지 | 거리 | tid / tlid | 이야기 수 |');
  lines.push('|---|---|---|---|---|');

  let matchedPois = 0;
  for (const poi of context.pois) {
    const near = withCoord
      .map((theme) => ({ theme, meters: distanceMeters(poi.coord, theme.coord) }))
      .filter((candidate) => candidate.meters <= ODII_MATCH_RADIUS_M)
      .sort((a, b) => a.meters - b.meters);
    if (near.length === 0) {
      lines.push(`| ${poi.nameKo} | ✗ 없음 | — | — | — |`);
      continue;
    }
    matchedPois += 1;
    for (const candidate of near) {
      const stories = await getOdiiStories(candidate.theme.tid, candidate.theme.tlid);
      const storyCount = stories.ok ? `${stories.items.length} (totalCount ${stories.totalCount})` : failText(stories);
      lines.push(
        `| ${poi.nameKo} | ${cell(candidate.theme.title)} | ${Math.round(candidate.meters)}m | ${candidate.theme.tid} / ${candidate.theme.tlid} | ${cell(storyCount)} |`,
      );
    }
  }

  // The enumeration is the decisive method, so a keyword hit is reported only as the weaker
  // signal it is: it assumes Odii registered the place under the name we know.
  lines.push('');
  lines.push('### 제목 문자열이 겹치는 행 (참고 — 이름으로 등록됐다는 가정이 붙는 약한 신호다)');
  lines.push('');
  for (const poi of context.pois) {
    const byTitle = themes.items
      .filter((row) => normalizeTitle(textOf(row.title)).includes(normalizeTitle(poi.nameKo)))
      .map((row) => `${textOf(row.title)} (tid ${textOf(row.tid)})`);
    lines.push(`- ${poi.nameKo}: ${byTitle.length === 0 ? '없음' : truncateList(byTitle, 6)}`);
  }

  if (withCoord.length === 0) {
    lines.push('');
    lines.push(
      '### ★ themeBasedList 응답에 좌표가 없다 — 좌표 기반 보조 확인으로 대체했다',
    );
    lines.push('');
    lines.push(
      `\`themeBasedList\` 응답 표에 좌표 필드가 있는지는 매뉴얼로 확인되지 않는다(응답 예시의 \`addr1\`/\`addr2\`는 시도·시군명이다). 전수 열거만으로 좌표 매칭이 불가능하므로 \`themeLocationBasedList\`(파라미터 표와 예시가 일치하는 오퍼레이션)로 관광지마다 반경 ${ODII_MATCH_RADIUS_M}m 를 조회했다. 이것도 키워드 가정이 없는 좌표 매칭이다.`,
    );
    lines.push('');
    lines.push('| 관광지 | themeLocationBasedList | 결과 |');
    lines.push('|---|---|---|');
    for (const poi of context.pois) {
      const nearby = await listOdiiThemesNearby(poi.coord, ODII_MATCH_RADIUS_M);
      if (!nearby.ok) {
        lines.push(`| ${poi.nameKo} | 실패 | ${cell(failText(nearby))} |`);
        continue;
      }
      const names = nearby.items.map((row) => `${textOf(row.title)} (tid ${textOf(row.tid)})`);
      if (names.length > 0) matchedPois += 1;
      lines.push(
        `| ${poi.nameKo} | resultCode=${nearby.resultCode}, totalCount=${nearby.totalCount} | ${names.length === 0 ? '✗ 없음' : truncateList(names, 8)} |`,
      );
    }
  }

  return {
    id: 'P0-3',
    status: matchedPois === 0 ? 'partial' : 'pass',
    summary: `열거 ${themes.items.length}행 / 좌표 읽힘 ${withCoord.length}행 / 반경 ${ODII_MATCH_RADIUS_M}m 매칭 ${matchedPois}곳`,
    lines,
  };
}

// ── P0-4 ────────────────────────────────────────────────────────────────────────

const LANG_CODE_CANDIDATES = ['ko', 'en', 'ja', 'jp', 'zh-CN', 'cn1'] as const;

async function checkP04(context: ProbeContext): Promise<CheckOutcome> {
  const lines: string[] = ['| langCode | resultCode | totalCount |', '|---|---|---|'];
  let accepted = 0;
  for (const candidate of LANG_CODE_CANDIDATES) {
    const result = await searchOdiiThemes(1, candidate, { numOfRows: 1 });
    if (result.ok) {
      if (result.totalCount > 0) accepted += 1;
      lines.push(`| \`${candidate}\` | ${result.resultCode} | ${result.totalCount} |`);
    } else {
      lines.push(`| \`${candidate}\` | ${result.resultCode} | — (${result.message}) |`);
    }
  }

  lines.push('');
  lines.push('### `themeSearchList` 의 언어 파라미터 이름');
  lines.push('');
  lines.push('파라미터 표는 `lang`, 같은 항목의 예시 URL 은 `langCode` 다. 같은 키워드로 두 이름을 각각 보냈다.');
  lines.push('');
  lines.push('| 보낸 이름 | resultCode | totalCount |');
  lines.push('|---|---|---|');
  const keyword = context.pois[0]?.odiiKeyword ?? context.pois[0]?.nameKo ?? '백제';
  for (const paramName of ['lang', 'langCode'] as const) {
    const result = await searchOdiiThemesByKeyword(keyword, paramName, ODII_DEFAULT_LANG_CODE, {
      numOfRows: 5,
    });
    lines.push(
      result.ok
        ? `| \`${paramName}\` | ${result.resultCode} | ${result.totalCount} |`
        : `| \`${paramName}\` | ${result.resultCode} | — (${result.message}) |`,
    );
  }
  lines.push('');
  lines.push(`검색 키워드: \`${keyword}\``);
  lines.push('');
  lines.push(
    '두 이름이 같은 `totalCount` 를 주면 서버가 언어 파라미터를 무시한 것일 수 있다 — 그때는 값을 바꿔(예: `en`) 결과가 달라지는 쪽이 실제로 읽히는 이름이다.',
  );

  return {
    id: 'P0-4',
    status: accepted === 0 ? 'fail' : 'pass',
    summary: `후보 ${LANG_CODE_CANDIDATES.length}개 중 데이터가 온 값 ${accepted}개`,
    lines,
  };
}

// ── P0-5 ────────────────────────────────────────────────────────────────────────

async function checkP05(context: ProbeContext): Promise<CheckOutcome> {
  const lines: string[] = [];
  const sigungus = [...new Set(context.pois.map((poi) => poi.signguCd5))];
  let minRate = Number.POSITIVE_INFINITY;
  let maxRate = Number.NEGATIVE_INFINITY;
  let anyRows = false;
  const allNames = new Set<string>();

  for (const signguCd of sigungus) {
    const poi = context.pois.find((candidate) => candidate.signguCd5 === signguCd);
    // areaCd is the 2-digit sido code, which is the same value pois.json stores as
    // lDongRegnCd. Reading it from the file keeps the codes in one place.
    const areaCd = poi?.lDongRegnCd ?? '';
    const listed = await getCrowdForecast({ areaCd, signguCd }, { numOfRows: 100, maxPages: 30 });
    lines.push(`### \`signguCd=${signguCd}\` (areaCd=${areaCd})`);
    lines.push('');
    if (!listed.ok) {
      lines.push(`실패 — ${failText(listed)}`);
      lines.push('');
      continue;
    }
    anyRows = anyRows || listed.items.length > 0;
    const names = new Set<string>();
    for (const row of listed.items) {
      const name = textOf(row.tAtsNm);
      if (name !== '') {
        names.add(name);
        allNames.add(name);
      }
      if (row.cnctrRate !== undefined) {
        minRate = Math.min(minRate, row.cnctrRate);
        maxRate = Math.max(maxRate, row.cnctrRate);
      }
    }
    lines.push(
      `totalCount=**${listed.totalCount}**, 받은 행 ${listed.items.length}, ${listed.pagesFetched}페이지${listed.truncated ? ' — ★ 상한에서 잘렸다' : ''}, 관광지 ${names.size}곳`,
    );
    lines.push('');
    lines.push(`반환된 \`tAtsNm\` 전체: ${names.size === 0 ? '없음' : [...names].map((name) => `\`${name}\``).join(' · ')}`);
    lines.push('');
  }

  lines.push('### 우리 6곳이 목록에 있는가');
  lines.push('');
  lines.push('| 관광지 | pois.json `tatsName` | 목록에 있는가 |');
  lines.push('|---|---|---|');
  for (const poi of context.pois) {
    const wanted = poi.tatsName ?? poi.nameKo;
    const exact = allNames.has(wanted);
    const loose = [...allNames].filter((name) => normalizeTitle(name).includes(normalizeTitle(wanted)));
    lines.push(
      `| ${poi.nameKo} | ${wanted}${poi.tatsName === undefined || poi.tatsName === null ? ' (미기재 — nameKo 사용)' : ''} | ${exact ? '✓ 완전 일치' : loose.length > 0 ? `△ 부분 일치: ${truncateList(loose, 4)}` : '✗ 없음'} |`,
    );
  }

  lines.push('');
  lines.push('### `cnctrRate` 관측 범위 — 40/70 경계의 근거');
  lines.push('');
  if (minRate === Number.POSITIVE_INFINITY) {
    lines.push('값이 하나도 오지 않았다. `crowd_forecast` 경계는 여전히 가정 위에 있다.');
  } else {
    lines.push(`관측 최소 **${minRate}** · 관측 최대 **${maxRate}**`);
    lines.push('');
    lines.push(
      minRate >= 0 && maxRate <= 100
        ? '관측 분포가 0~100 안이다. `05_ingest.md` §5.7 의 40/70 경계를 그대로 쓸 수 있다 (경계값 자체는 여전히 우리가 고른 값이고 매뉴얼이 준 값이 아니다).'
        : '★ 관측 분포가 0~100 밖이다. `05_ingest.md` §5.7 의 40/70 경계를 관측 분포로 다시 잡아야 한다. 그때까지 `crowd_forecast` 는 `unknown` 이다.',
    );
  }

  lines.push('');
  lines.push('### `tAtsNm` 필터가 동작하는가 — 수집이 6콜인지 페이징인지를 정한다');
  lines.push('');
  const filterTarget = context.pois[0];
  if (filterTarget === undefined) {
    lines.push('대상이 없다.');
  } else {
    const wanted = filterTarget.tatsName ?? filterTarget.nameKo;
    const filtered = await getCrowdForecast(
      { areaCd: filterTarget.lDongRegnCd, signguCd: filterTarget.signguCd5, tAtsNm: wanted },
      { numOfRows: 100, maxPages: 5 },
    );
    if (!filtered.ok) {
      lines.push(`\`tAtsNm=${wanted}\` → 실패 ${failText(filtered)}`);
    } else {
      const returned = new Set(filtered.items.map((row) => textOf(row.tAtsNm)));
      const onlyWanted = returned.size <= 1 && (returned.size === 0 || returned.has(wanted));
      lines.push(
        `\`tAtsNm=${wanted}\` → totalCount=${filtered.totalCount}, 행 ${filtered.items.length}, 반환된 이름 ${returned.size === 0 ? '없음' : [...returned].map((name) => `\`${name}\``).join(' · ')}`,
      );
      lines.push('');
      lines.push(
        onlyWanted && filtered.items.length > 0
          ? '필터가 동작한다 → 수집은 관광지별 6콜로 끝낸다.'
          : '필터가 이름을 좁히지 못했다 → 수집은 `totalCount` 까지 페이징한다.',
      );
    }
  }

  return {
    id: 'P0-5',
    status: anyRows ? 'pass' : 'fail',
    summary:
      minRate === Number.POSITIVE_INFINITY
        ? `관광지 ${allNames.size}곳, cnctrRate 관측 없음`
        : `관광지 ${allNames.size}곳, cnctrRate ${minRate}~${maxRate}`,
    lines,
  };
}

// ── P0-6 ────────────────────────────────────────────────────────────────────────

async function checkP06(context: ProbeContext): Promise<CheckOutcome> {
  const regnCodes = [...new Set(context.pois.map((poi) => poi.lDongRegnCd))];
  const lines: string[] = [];
  let failedAny = false;
  let confirmed = 0;

  for (const regnCd of regnCodes) {
    const listed = await getLdongCodes(regnCd, { numOfRows: 100, maxPages: 5 });
    if (!listed.ok) {
      failedAny = true;
      lines.push(`\`lDongRegnCd=${regnCd}\` → 실패 ${failText(listed)}`);
      continue;
    }
    const regnName = textOf(listed.items[0]?.lDongRegnNm);
    lines.push(`\`lDongRegnCd=${regnCd}\` → **${regnName === '' ? '(이름 없음)' : regnName}**, 시군구 ${listed.items.length}건`);
    lines.push('');
    lines.push('| lDongSignguCd | 이름 | 우리 대상 |');
    lines.push('|---|---|---|');
    const wanted = new Set(context.pois.filter((poi) => poi.lDongRegnCd === regnCd).map((poi) => poi.lDongSignguCd));
    for (const row of listed.items) {
      const code = textOf(row.lDongSignguCd);
      if (!wanted.has(code)) continue;
      confirmed += 1;
      const slugs = context.pois.filter((poi) => poi.lDongSignguCd === code).map((poi) => poi.slug);
      lines.push(`| ${code} | ${cell(textOf(row.lDongSignguNm))} | ${slugs.join(', ')} |`);
      wanted.delete(code);
    }
    for (const missing of wanted) {
      failedAny = true;
      lines.push(`| ${missing} | **응답에 없다** | ${context.pois.filter((poi) => poi.lDongSignguCd === missing).map((poi) => poi.slug).join(', ')} |`);
    }
    lines.push('');
  }

  return {
    id: 'P0-6',
    status: failedAny ? 'fail' : 'pass',
    summary: `시군구 코드 ${confirmed}건 확인`,
    lines,
  };
}

// ── P0-9 ────────────────────────────────────────────────────────────────────────

function nameVerdict(result: KtoResult): string {
  if (result.ok) return `✓ 응답 (resultCode=${result.resultCode}, totalCount=${result.totalCount})`;
  if (result.resultCode === '12') return '✗ 이 이름의 오퍼레이션이 없다 (resultCode=12)';
  if (result.resultCode === '11') return '△ 이름은 있고 필수 파라미터가 빠졌다 (resultCode=11)';
  if (result.resultCode === '10') return '△ 이름은 있고 파라미터가 잘못됐다 (resultCode=10)';
  return `✗ ${failText(result)}`;
}

async function checkP09(context: ProbeContext): Promise<CheckOutcome> {
  const poi = context.pois[0];
  if (poi === undefined) {
    return { id: 'P0-9', status: 'fail', summary: 'pois.json 이 비어 있다', lines: ['대상이 없다.'] };
  }
  const lines: string[] = [];

  lines.push('### 1. `TatsCnctrRateService` 오퍼레이션명 — 표 `tatsCnctrRateList` vs 예시 `tatsCnctrRatedList`');
  lines.push('');
  for (const operation of ['tatsCnctrRateList', 'tatsCnctrRatedList']) {
    const result = await ktoRequest(SERVICE_IDS.tatsCnctrRate, operation, {
      areaCd: poi.lDongRegnCd,
      signguCd: poi.signguCd5,
      numOfRows: 1,
      pageNo: 1,
    });
    lines.push(`- \`${operation}\` → ${nameVerdict(result)}`);
  }

  lines.push('');
  lines.push('### 2. Odii 동기화 오퍼레이션명 — 표 `themeBaseSyncdList` vs 예시 `themeBasedSyncList`');
  lines.push('');
  for (const operation of ['themeBaseSyncdList', 'themeBasedSyncList']) {
    const result = await ktoRequest(SERVICE_IDS.odii, operation, {
      langCode: ODII_DEFAULT_LANG_CODE,
      numOfRows: 1,
      pageNo: 1,
    });
    lines.push(`- \`${operation}\` → ${nameVerdict(result)}`);
  }

  lines.push('');
  lines.push('### 3. `TarRlteTarService1` 오퍼레이션명 대소문자 — 표 `AreaBasedList1` vs 예시 `areaBasedList1`');
  lines.push('');
  for (const operation of ['AreaBasedList1', 'areaBasedList1']) {
    const result = await ktoRequest(SERVICE_IDS.tarRlteTar, operation, {
      baseYm: context.baseYm,
      areaCd: poi.lDongRegnCd,
      signguCd: poi.signguCd5,
      numOfRows: 1,
      pageNo: 1,
    });
    lines.push(`- \`${operation}\` → ${nameVerdict(result)}`);
  }

  lines.push('');
  lines.push('### 4. `storyBasedList` 응답 좌표 필드 — 표 `addr1`/`addr2` vs XML 예시 `mapX`/`mapY` ★ 가장 위험하다');
  lines.push('');
  const firstPage = await searchOdiiThemes(1, ODII_DEFAULT_LANG_CODE, { numOfRows: 5 });
  if (!firstPage.ok) {
    lines.push(`\`themeBasedList\` 실패 — ${failText(firstPage)}. tid 를 못 얻어 이 항목을 확인하지 못했다.`);
  } else {
    let reported = false;
    for (const theme of firstPage.items) {
      const tid = textOf(theme.tid);
      const tlid = textOf(theme.tlid);
      if (tid === '' || tlid === '') continue;
      const stories = await getOdiiStories(tid, tlid);
      if (!stories.ok) {
        lines.push(`- tid=${tid} → \`storyBasedList\` 실패 ${failText(stories)}`);
        continue;
      }
      const story = stories.items[0];
      if (story === undefined) {
        lines.push(`- tid=${tid} (${textOf(theme.title)}) → 이야기 0건`);
        continue;
      }
      const reading = readStoryCoord(story);
      lines.push(
        `- tid=${tid} (${textOf(theme.title)}) → \`addr1\`=\`${textOf(story.addr1)}\` \`addr2\`=\`${textOf(story.addr2)}\` \`mapX\`=\`${textOf(story.mapX)}\` \`mapY\`=\`${textOf(story.mapY)}\``,
      );
      lines.push(
        reading.ok
          ? `  → 좌표를 준 필드: **\`${reading.fields}\`** = { lat: ${reading.coord.lat}, lng: ${reading.coord.lng} }`
          : `  → 좌표를 읽지 못했다: ${reading.reason} (본 필드: ${reading.fields})`,
      );
      reported = true;
      break;
    }
    if (!reported) lines.push('- tid/tlid 가 있는 행을 찾지 못해 확인하지 못했다.');
  }

  lines.push('');
  lines.push('### 5. `TarRlteTarService1` 경로 — 서비스ID·오퍼레이션명의 `1` 이 예시에서 둘 다 빠져 있다');
  lines.push('');
  lines.push('한 오퍼레이션에 표기가 3가지 있다(표·Call Back URL·예시 URL). 데이터셋 ID 가 쓰는 `1` 접미사 형태를 먼저 확인한다.');
  lines.push('');
  for (const [serviceId, operation] of [
    ['TarRlteTarService1', 'searchKeyword1'],
    ['TarRlteTarService1', 'searchKeyword'],
    ['TarRlteTarService', 'searchKeyword1'],
    ['TarRlteTarService', 'searchKeyword'],
  ] as const) {
    const result = await ktoRequest(serviceId, operation, {
      keyword: poi.nameKo,
      baseYm: context.baseYm,
      areaCd: poi.lDongRegnCd,
      signguCd: poi.signguCd5,
      numOfRows: 1,
      pageNo: 1,
    });
    lines.push(`- \`${serviceId}/${operation}\` → ${nameVerdict(result)}`);
  }

  lines.push('');
  lines.push('### 6. `storyLocationBasedList` 요청 파라미터 — 표 `mapX`/`mapY`/`langCode` vs 예시 `xCoord`/`yCoord`/`lang`');
  lines.push('');
  lines.push(
    '수집은 두 조합을 한 번에 실어 보낸다(모르는 쿼리 파라미터는 무시되므로 어느 쪽이 살아 있어도 응답이 온다). 어느 쪽이 실제로 읽히는지는 한 조합씩 따로 보내야 갈린다.',
  );
  lines.push('');
  for (const naming of ['table', 'example', 'both'] as const) {
    const sent = odiiLocationParams(poi.coord, ODII_MATCH_RADIUS_M, ODII_DEFAULT_LANG_CODE, naming);
    const result = await ktoRequest(SERVICE_IDS.odii, 'storyLocationBasedList', {
      ...sent,
      numOfRows: 5,
      pageNo: 1,
    });
    lines.push(
      `- \`${naming}\` (${Object.keys(sent).join(', ')}) → ${result.ok ? `resultCode=${result.resultCode}, totalCount=${result.totalCount}, 행 ${result.items.length}` : failText(result)}`,
    );
  }
  lines.push('');
  lines.push(
    '`table` 과 `example` 중 한쪽만 응답하면 그 이름이 실제 계약이다. 둘 다 응답하면 서버가 좌표 파라미터 없이도 답한다는 뜻이므로(반경 필터가 안 걸린 것) `resultCode 11` 여부와 `totalCount` 차이를 함께 본다.',
  );

  return {
    id: 'P0-9',
    status: 'pass',
    summary: '6군데 전부 호출해 기록했다',
    lines,
  };
}

// ── P0-10 ───────────────────────────────────────────────────────────────────────

async function checkP10(context: ProbeContext): Promise<CheckOutcome> {
  const resolved = await context.resolveContentIds();
  const lines: string[] = [
    '`detailCommon2` 에는 `contentTypeId` 파라미터가 없으므로 같은 `contentId` 를 그대로 넣어 국문과 영문을 비교한다.',
    '제목은 언어가 다르니 문자열로 비교할 수 없다 — **좌표가 같은 곳을 가리키는지**로 판정한다.',
    '',
    '| 관광지 | contentId | 국문 제목 | 영문 제목 | 좌표 거리 | 판정 |',
    '|---|---|---|---|---|---|',
  ];

  let same = 0;
  let different = 0;
  let empty = 0;

  for (const entry of resolved) {
    if (entry.contentId === null) {
      lines.push(`| ${entry.poi.nameKo} | — | — | — | — | contentId 미해결 |`);
      continue;
    }
    const ko = await getPoiCommon(entry.contentId);
    const en = await getMultilingualPoiCommon('en', entry.contentId);
    const koRow = ko.ok ? ko.items[0] : undefined;
    const enRow = en.ok ? en.items[0] : undefined;
    const koTitle = textOf(koRow?.title);
    const enTitle = textOf(enRow?.title);

    if (!ko.ok || !en.ok) {
      lines.push(
        `| ${entry.poi.nameKo} | ${entry.contentId} | ${cell(ko.ok ? koTitle : failText(ko))} | ${cell(en.ok ? enTitle : failText(en))} | — | 호출 실패 |`,
      );
      continue;
    }
    if (enRow === undefined) {
      empty += 1;
      lines.push(
        `| ${entry.poi.nameKo} | ${entry.contentId} | ${cell(koTitle)} | (빈 응답, resultCode=${en.resultCode}) | — | **다국어 경로를 searchKeyword2 로 바꿔야 한다** |`,
      );
      continue;
    }
    const koCoord = koRow === undefined ? { ok: false as const, reason: 'no row', fields: '' } : readMapxyCoord(koRow);
    const enCoord = readMapxyCoord(enRow);
    if (koCoord.ok && enCoord.ok) {
      const meters = distanceMeters(koCoord.coord, enCoord.coord);
      const verdict = meters <= SAME_PLACE_METERS ? '✓ 같은 곳' : '✗ 다른 곳';
      if (meters <= SAME_PLACE_METERS) same += 1;
      else different += 1;
      lines.push(
        `| ${entry.poi.nameKo} | ${entry.contentId} | ${cell(koTitle)} | ${cell(enTitle)} | ${Math.round(meters)}m | ${verdict} |`,
      );
    } else {
      lines.push(
        `| ${entry.poi.nameKo} | ${entry.contentId} | ${cell(koTitle)} | ${cell(enTitle)} | 좌표 없음 | 사람이 제목으로 확인할 것 |`,
      );
    }
  }

  lines.push('');
  lines.push(
    different > 0 || empty > 0
      ? '★ 같은 `contentId` 가 다국어에서 같은 관광지를 가리키지 않는 경우가 있다. `05_ingest.md` §5.1 의 다국어 경로를 `searchKeyword2`(관광지명 검색)로 바꾼다.'
      : '같은 `contentId` 가 국문·다국어 양쪽에서 같은 관광지를 가리킨다. 수집 설계를 그대로 쓴다.',
  );

  return {
    id: 'P0-10',
    status: different > 0 || empty > 0 ? 'partial' : same > 0 ? 'pass' : 'fail',
    summary: `같은 곳 ${same} / 다른 곳 ${different} / 빈 응답 ${empty}`,
    lines,
  };
}

// ── P0-11 ───────────────────────────────────────────────────────────────────────

async function checkP11(context: ProbeContext): Promise<CheckOutcome> {
  const lines: string[] = [];
  const unfiltered = await ktoRequest(SERVICE_IDS.korWith, 'areaBasedSyncList2', {
    showflag: '1',
    numOfRows: 1,
    pageNo: 1,
  });
  lines.push(
    unfiltered.ok
      ? `필터 없이: totalCount=**${unfiltered.totalCount}** (매뉴얼 샘플은 8,852)`
      : `필터 없는 호출 실패 — ${failText(unfiltered)}`,
  );
  lines.push('');

  const found = new Map<string, { contentId: string; title: string }>();
  let failedAny = false;
  const pairs = [
    ...new Set(context.pois.map((poi) => `${poi.lDongRegnCd}/${poi.lDongSignguCd}`)),
  ];

  for (const pair of pairs) {
    const [lDongRegnCd = '', lDongSignguCd = ''] = pair.split('/');
    const listed = await listBarrierFreeSync(
      { lDongRegnCd, lDongSignguCd, showflag: '1' },
      { numOfRows: 100, maxPages: SYNC_MAX_PAGES },
    );
    if (!listed.ok) {
      failedAny = true;
      lines.push(`- \`lDongRegnCd=${lDongRegnCd}&lDongSignguCd=${lDongSignguCd}\` → 실패 ${failText(listed)}`);
      continue;
    }
    const filterWorks =
      unfiltered.ok && unfiltered.totalCount > 0 && listed.totalCount < unfiltered.totalCount;
    lines.push(
      `- \`lDongRegnCd=${lDongRegnCd}&lDongSignguCd=${lDongSignguCd}\` → totalCount=**${listed.totalCount}**, 받은 행 ${listed.items.length}, ${listed.pagesFetched}페이지${listed.truncated ? ` — ★ ${SYNC_MAX_PAGES}페이지 상한에서 잘렸다` : ''} · 필터 ${filterWorks ? '동작함' : '**동작하지 않는 것으로 보인다**'}`,
    );
    for (const row of listed.items) {
      const title = normalizeTitle(textOf(row.title));
      for (const poi of context.pois) {
        if (found.has(poi.slug)) continue;
        const wanted = normalizeTitle(poi.nameKo);
        if (title === wanted || title.includes(wanted)) {
          found.set(poi.slug, { contentId: textOf(row.contentid), title: textOf(row.title) });
        }
      }
    }
  }

  lines.push('');
  lines.push('| 관광지 | 무장애 목록에 있는가 | contentId | 목록의 제목 |');
  lines.push('|---|---|---|---|');
  for (const poi of context.pois) {
    const hit = found.get(poi.slug);
    lines.push(
      hit === undefined
        ? `| ${poi.nameKo} | ✗ 없음 | — | — |`
        : `| ${poi.nameKo} | ✓ 있음 | ${hit.contentId} | ${cell(hit.title)} |`,
    );
  }
  lines.push('');
  lines.push(
    '★ 여기서 "없음"이고 P0-1 이 `resultCode 03` 이면 그 관광지는 `absenceKind: \'not_registered\'` 다. 목록이 잘렸거나(위의 상한 표시) 필터가 동작하지 않았으면 **아직 아무것도 확정되지 않았다** — `absenceKind` 는 `null` 로 둔다.',
  );

  return {
    id: 'P0-11',
    status: failedAny ? 'fail' : found.size === context.pois.length ? 'pass' : 'partial',
    summary: `${found.size} / ${context.pois.length} 곳을 목록에서 찾았다`,
    lines,
  };
}

// ── results file ────────────────────────────────────────────────────────────────

const CHECKS: readonly CheckDefinition[] = [
  { id: 'P0-1', title: '6곳이 무장애여행 API(KorWithService2)에 등록돼 있는가', run: checkP01 },
  { id: 'P0-2', title: '인증키가 동작하는가 (resultCode 30 여부)', run: checkP02 },
  { id: 'P0-3', title: 'Odii 에 6곳 콘텐츠가 있는가 — `themeBasedList` 전수 열거 + 좌표 매칭', run: checkP03 },
  { id: 'P0-4', title: 'Odii `langCode` 의 실제 허용값 + `themeSearchList` 의 언어 파라미터 이름', run: checkP04 },
  { id: 'P0-5', title: '집중률 API 의 `tAtsNm` 목록에 우리 관광지가 있는가 + `cnctrRate` 관측 범위', run: checkP05 },
  { id: 'P0-6', title: '법정동 코드 확인 (`ldongCode2`)', run: checkP06 },
  { id: 'P0-9', title: '매뉴얼 표기와 예시가 어긋나는 6군데', run: checkP09 },
  { id: 'P0-10', title: '`contentId` 가 국문/다국어에서 같은 값인가', run: checkP10 },
  { id: 'P0-11', title: '무장애 대상 목록(`areaBasedSyncList2`)으로 6곳을 한 번에 찾을 수 있는가', run: checkP11 },
];

const TITLES = new Map(CHECKS.map((check) => [check.id, check.title]));
/** Kept in the file, produced by hand, never by this script. */
const P07_TITLE = '백제역사유적지구 구성유산 (사람이 국가유산청 포털에서 확인)';
const SECTION_ORDER = ['P0-1', 'P0-2', 'P0-3', 'P0-4', 'P0-5', 'P0-6', 'P0-7', 'P0-9', 'P0-10', 'P0-11'];

interface StoredSection {
  id: string;
  /** The whole section including its heading, exactly as it will be written back. */
  text: string;
  /** Summary-table cell recovered from the machine anchor, if this script wrote it. */
  status: string;
}

/**
 * Splits the existing results file into per-P0 sections.
 *
 * This exists so `--only=P0-3` cannot erase the other eight answers. The file is the single
 * record of what we verified by calling; overwriting the unrun checks with "미실행" would
 * destroy evidence, and the P0-7 section was never a probe output at all.
 */
function readStoredSections(path: string): Map<string, StoredSection> {
  const sections = new Map<string, StoredSection>();
  if (!existsSync(path)) return sections;
  const blocks = readFileSync(path, 'utf8').split(/^(?=## )/m);
  for (const block of blocks) {
    const heading = /^##\s+(P0-\d+)\b/.exec(block);
    const id = heading?.[1];
    if (id === undefined) continue;
    const anchor = /<!--\s*probe\s+id=P0-\d+\s+status=([a-z]+)\s+at=([^\s]+)\s*-->/.exec(block);
    const status = anchor?.[1];
    const at = anchor?.[2];
    sections.set(id, {
      id,
      text: block.replace(/\s+$/, ''),
      status:
        status === undefined || at === undefined
          ? '기록 있음'
          : `${STATUS_LABELS[(status as CheckStatus)] ?? status} · ${at.slice(0, 10)}`,
    });
  }
  return sections;
}

function renderSection(outcome: CheckOutcome, ranAt: string): StoredSection {
  const title = TITLES.get(outcome.id) ?? outcome.id;
  const body = [
    `## ${outcome.id} — ${title}`,
    `<!-- probe id=${outcome.id} status=${outcome.status} at=${ranAt} -->`,
    '',
    `**상태:** ${STATUS_LABELS[outcome.status]} — ${outcome.summary}`,
    '',
    ...outcome.lines,
  ].join('\n');
  return {
    id: outcome.id,
    text: body.replace(/\s+$/, ''),
    status: `${STATUS_LABELS[outcome.status]} · ${ranAt.slice(0, 10)}`,
  };
}

function renderFile(sections: Map<string, StoredSection>, ranAt: string, ranIds: readonly string[]): string {
  const summaryRows = SECTION_ORDER.map((id) => {
    const title = id === 'P0-7' ? P07_TITLE : (TITLES.get(id) ?? id);
    const stored = sections.get(id);
    const status = stored === undefined ? '미실행' : stored.status;
    return `| ${id} | ${title} | ${status} |`;
  });

  const parts = [
    '# 탐침 결과 (`pnpm probe`)',
    '',
    `> **마지막 실행:** ${ranAt} — 이번 실행이 갱신한 항목: ${ranIds.length === 0 ? '없음' : ranIds.join(' · ')}`,
    '> 이 파일은 `scripts/probe.ts` 가 쓴다. **`--only=` 로 일부만 돌리면 나머지 절은 이전 결과가 그대로 남는다.**',
    '> **P0-7 절은 사람이 확인한 결과이고 탐침 산출물이 아니다** — 스크립트는 이 절을 건드리지 않는다.',
    '>',
    '> 확인 항목의 정의와 **범위의 단일 권위**는 [`11_open_items.md`](./11_open_items.md) §1이다.',
    '> 다른 문서에 `[미확인]`으로 남아 있는 항목은 여기 결과가 나온 뒤에만 `[확정]`으로 바뀐다.',
    '',
    '## 실행 방법',
    '',
    '```bash',
    'pnpm probe                # 자동 9건 전체',
    'pnpm probe --only=P0-1',
    'pnpm probe --only=P0-3,P0-4',
    '```',
    '',
    `대상 6곳은 \`${POIS_PATH}\` 에서 읽는다. \`${SERVICE_KEY_ENV_NAME}\` 가 없으면 아무것도 확인하지 않고 종료한다.`,
    '',
    '## 상태 요약',
    '',
    '| ID | 확인할 것 | 상태 |',
    '|---|---|---|',
    ...summaryRows,
    '',
    '> P0-8(관광사진갤러리 검색 오퍼레이션 존재 여부)은 **해소됐다** — 매뉴얼 v4.2 에 `gallerySearchList1` 이 있다 ([`03_external_data.md`](./03_external_data.md) §2.7). 탐침 대상이 아니다.',
    '',
  ];

  // Anything the file holds that this version does not know about is kept and appended,
  // so a section added by a later probe survives an older run of this script.
  const extras = [...sections.keys()].filter((id) => !SECTION_ORDER.includes(id)).sort();
  for (const id of [...SECTION_ORDER, ...extras]) {
    const stored = sections.get(id);
    if (stored === undefined) continue;
    parts.push('---', '', stored.text, '');
  }
  return `${parts.join('\n').replace(/\n{3,}$/, '\n')}\n`;
}

// ── main ────────────────────────────────────────────────────────────────────────

function parseOnly(argv: readonly string[]): string[] | null {
  const flag = argv.find((argument) => argument.startsWith('--only='));
  if (flag === undefined) return CHECKS.map((check) => check.id);
  const wanted = flag.slice('--only='.length).split(',').map((value) => value.trim()).filter((value) => value !== '');
  const unknown = wanted.filter((id) => !TITLES.has(id));
  if (wanted.length === 0 || unknown.length > 0) {
    console.error(`--only 값이 잘못됐다: ${unknown.join(', ')}`);
    console.error(`쓸 수 있는 값: ${CHECKS.map((check) => check.id).join(', ')}`);
    return null;
  }
  return wanted;
}

async function main(): Promise<number> {
  loadEnvFile();

  if (process.argv.includes('--help')) {
    console.log('pnpm probe [--only=P0-1[,P0-3]]');
    console.log(`대상: ${POIS_PATH} · 결과: ${RESULTS_PATH}`);
    return 0;
  }

  if (!hasServiceKey()) {
    console.error(`${SERVICE_KEY_ENV_NAME} 가 없다. 탐침은 실제 호출로만 답할 수 있어서 아무것도 확인하지 않고 멈춘다.`);
    console.error(`  1. 공공데이터포털에서 "일반 인증키(Decoding)" 값을 복사한다 (Encoding 키는 이중 인코딩으로 resultCode 30 이 온다)`);
    console.error(`  2. ${ENV_FILE} 에 ${SERVICE_KEY_ENV_NAME}=<값> 을 넣는다`);
    console.error('  3. pnpm probe');
    return 1;
  }

  const ids = parseOnly(process.argv);
  if (ids === null) return 1;

  const pois = readPois();
  if (pois === null) return 1;

  const ranAt = new Date().toISOString();
  const context = makeContext(pois, previousYearMonth(new Date()));
  const sections = readStoredSections(resolve(process.cwd(), RESULTS_PATH));
  let worstIsFailure = false;

  for (const check of CHECKS) {
    if (!ids.includes(check.id)) continue;
    process.stdout.write(`[${check.id}] ${check.title}\n`);
    let outcome: CheckOutcome;
    try {
      outcome = await check.run(context);
    } catch (cause) {
      // Each check owns one question, so one exception must not take the other eight with
      // it. The error text is written into that section rather than swallowed.
      const message = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
      outcome = {
        id: check.id,
        status: 'error',
        summary: '예외로 확인하지 못했다',
        lines: ['```', message, '```'],
      };
    }
    if (outcome.status === 'fail' || outcome.status === 'error') worstIsFailure = true;
    process.stdout.write(`  ${STATUS_LABELS[outcome.status]} — ${outcome.summary}\n`);
    const rendered = renderSection(outcome, ranAt);
    sections.set(rendered.id, rendered);
  }

  writeFileSync(resolve(process.cwd(), RESULTS_PATH), renderFile(sections, ranAt, ids), 'utf8');
  process.stdout.write(`\n${RESULTS_PATH} 에 기록했다.\n`);
  return worstIsFailure ? 1 : 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (cause: unknown) => {
    console.error(cause instanceof Error ? cause.message : String(cause));
    process.exitCode = 1;
  },
);
