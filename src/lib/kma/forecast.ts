import { z } from 'zod';
import { ORG, gatewayRequest, type KtoResult } from '@/lib/kto/transport';

/**
 * 기상청 단기예보 and 중기예보 — what the weather will be, as opposed to
 * src/lib/kma/warnings.ts, which is what it is doing right now.
 *
 * The two answer different questions and fail in different directions, which is why
 * they are separate modules. A 특보 is a safety fact: getting it wrong sends someone
 * out into a heat warning, so warnings.ts refuses to say "none" unless it is certain.
 * A forecast is a planning estimate that is routinely wrong by a category, and the
 * screen has to say so. What they share is the direction of failure: no answer is
 * `unknown`, never "fine".
 *
 * Both services live behind the same data.go.kr gateway as 특보 (org 1360000) and are
 * signed with the same key, so transport.ts already handles the dataType=JSON split.
 */

const VILAGE_SERVICE_ID = 'VilageFcstInfoService_2.0';
const VILAGE_OPERATION = 'getVilageFcst';
const MID_SERVICE_ID = 'MidFcstInfoService';
const MID_LAND_OPERATION = 'getMidLandFcst';
const MID_TA_OPERATION = 'getMidTa';

/**
 * 단기예보 is addressed by a 5km grid cell, not by latitude and longitude. These are the
 * 시군구 representative cells from KMA's published 격자_위경도 table (2607 edition), not
 * values computed from a POI coordinate: a POI sits wherever it sits, and two POIs in one
 * district can straddle a cell boundary — 공주 has sites in both (63,102) and (63,103),
 * about 5km and 1°C apart. The weather row is keyed by district, so the district's own
 * cell is the one that matches what the row claims to describe.
 */
const VILAGE_GRID: Record<string, { nx: number; ny: number }> = {
  '44150': { nx: 63, ny: 102 }, // Gongju-si
  '44760': { nx: 59, ny: 99 }, // Buyeo-gun
};

/**
 * 중기육상예보 covers a whole forecast region, keyed by lDongRegnCd. `11C20000` is
 * 대전·세종·충청남도 together — there is no 충남-only region and no per-city one.
 */
const MID_LAND_REGIONS: Record<string, string> = {
  '44': '11C20000',
};

/**
 * 중기기온 is per city, and unlike 중기육상 it does reach this far down. Both of ours
 * exist and answer; they sit in different code blocks, which is why one is 11C204xx and
 * the other 11C205xx.
 */
const MID_TA_REGIONS: Record<string, string> = {
  '44150': '11C20402', // Gongju
  '44760': '11C20501', // Buyeo
};

/** 단기예보 issue times, KST. Data appears about ten minutes after each. */
const VILAGE_BASE_TIMES = [200, 500, 800, 1100, 1400, 1700, 2000, 2300] as const;
const VILAGE_PUBLISH_DELAY_MINUTES = 10;

/** 중기예보 issue times, KST. Only the last 24 hours are retrievable. */
const MID_BASE_HOURS = [6, 18] as const;

/**
 * One issue carries every category for every hour of three to four days, which is
 * roughly 800 rows. We read one day, so a page has to be large enough to contain it
 * without paging — paging here would multiply calls by the number of days we skip.
 */
const VILAGE_ROWS = 300;

/**
 * Categories this module reads, and only these.
 *
 * PCP, SNO and WSD are deliberately absent. In the extension window — the last day of
 * each issue — those three switch from a measurement to a qualitative integer code, so
 * `PCP: "2"` means "보통 비, 3~15mm/h" on one day and 2mm on every other day. One field,
 * two encodings, no flag saying which. Nothing here needs them, so nothing here reads
 * them.
 */
const READ_CATEGORIES = new Set(['TMP', 'TMX', 'TMN', 'POP', 'PTY', 'SKY']);

const VilageRow = z.looseObject({
  category: z.string().optional(),
  fcstDate: z.string().optional(),
  fcstTime: z.string().optional(),
  fcstValue: z.union([z.string(), z.number()]).optional(),
});

const MidRow = z.record(z.string(), z.unknown());

/** 하늘상태. There is no 2 — 구름조금 was folded into 맑음 in 2019 and is not issued. */
const SKY_LABELS: Record<string, string> = {
  '1': '맑음',
  '3': '구름많음',
  '4': '흐림',
};

/** 강수형태 as 단기예보 issues it. The 초단기 set is wider; this operation uses 0–4. */
const DRY = '0';
const PTY_LABELS: Record<string, string> = {
  [DRY]: '없음',
  '1': '비',
  '2': '비/눈',
  '3': '눈',
  '4': '소나기',
};

/**
 * Reference temperatures, in degrees Celsius.
 *
 * These are NOT 특보 thresholds and must never be labelled as one. 폭염 특보 is defined
 * on 일 최고 **체감온도**, which folds in humidity and wind, and KMA closed the 체감온도
 * open API in May 2026 — no endpoint serves the number the regulation is written
 * against. What TMX gives is plain air temperature, so 33 here reproduces the shape of
 * the 폭염주의보 bar without being it, and a humid day clears 33 체감온도 well below 33
 * air. Treated as "this is a hard day to be outdoors", never as "a warning is in force";
 * the warning itself comes from getPwnStatus and has its own capability.
 *
 * 한파주의보 is written on plain 아침 최저기온, so -12 is the real bar — but its other
 * arm (a 10°C drop from yesterday, and 3°C below the seasonal normal) needs history this
 * module does not fetch, so only the absolute arm is checked.
 */
const HOT_DAY_TMX = 33;
const COLD_DAY_TMN = -12;

/** POP at or above this reads as "likely enough to plan around". */
const RAIN_LIKELY_POP = 60;

/**
 * Least to most disruptive. A day carries one row per three-hour step, and the day's
 * verdict is the worst step in it — a dry morning does not cancel an afternoon of rain
 * for someone whose route is an unpaved slope.
 */
const PTY_BY_SEVERITY = [DRY, '4', '2', '1', '3'] as const;
const SKY_BY_SEVERITY = ['1', '3', '4'] as const;

export interface DayForecast {
  /** YYYYMMDD, KST. */
  fcstDate: string;
  /** 일 최고기온, °C. Absent late in the day for today, and on the extension day. */
  tmx: number | null;
  /** 일 최저기온, °C. Only the 0200 issue carries today's. */
  tmn: number | null;
  /** Highest 강수확률 across the day, %. */
  pop: number | null;
  /** The day's 강수형태, worst one that appears. '0' when it stays dry. */
  pty: string | null;
  /** The day's 하늘상태, worst one that appears. */
  sky: string | null;
}

export interface ShortTermForecast {
  ok: boolean;
  /** Issue this came from, `${YYYYMMDD} ${HHmm}` KST. */
  baseAt: string | null;
  days: DayForecast[];
  message: string | null;
}

/** `2026-09-13T21:07+09:00` -> `{ ymd: '20260913', minutes: 1267 }`. */
function seoulNow(now: Date): { ymd: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return {
    ymd: `${get('year')}${get('month')}${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

function ymdMinusOne(ymd: string): string {
  const date = new Date(
    Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8))),
  );
  date.setUTCDate(date.getUTCDate() - 1);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
}

/**
 * The newest issue that has actually been published.
 *
 * Before 02:10 KST there is no issue for today yet, so the answer is yesterday's 2300 —
 * which is also the longest issue of the eight, reaching four days out rather than
 * three. Asking for an issue that exists on the clock but not yet on the server returns
 * an empty body rather than an error, so the ten minutes are subtracted here rather than
 * discovered by a failed call.
 */
export function vilageBaseFor(now: Date): { baseDate: string; baseTime: string } {
  const { ymd, minutes } = seoulNow(now);
  const usable = VILAGE_BASE_TIMES.filter((time) => {
    const issueMinutes = Math.floor(time / 100) * 60 + (time % 100);
    return minutes >= issueMinutes + VILAGE_PUBLISH_DELAY_MINUTES;
  });
  const latest = usable[usable.length - 1];
  if (latest === undefined) {
    return { baseDate: ymdMinusOne(ymd), baseTime: '2300' };
  }
  return { baseDate: ymd, baseTime: String(latest).padStart(4, '0') };
}

/**
 * The newest 중기예보 issue. Two a day, and only the last 24 hours are retrievable, so
 * there is no fallback beyond yesterday's 18:00.
 *
 * KMA publishes no delay figure for this service the way it does for 단기예보, so the
 * issue is treated as available on the hour. A too-early request returns an empty body,
 * and the caller reports unknown rather than guessing.
 */
export function midBaseFor(now: Date): string {
  const { ymd, minutes } = seoulNow(now);
  const hour = Math.floor(minutes / 60);
  const usable = MID_BASE_HOURS.filter((issueHour) => hour >= issueHour);
  const latest = usable[usable.length - 1];
  if (latest === undefined) return `${ymdMinusOne(ymd)}1800`;
  return `${ymd}${String(latest).padStart(2, '0')}00`;
}

export function vilageGridFor(signguCd5: string): { nx: number; ny: number } | null {
  return VILAGE_GRID[signguCd5] ?? null;
}

export function midLandRegionFor(lDongRegnCd: string): string | null {
  return MID_LAND_REGIONS[lDongRegnCd] ?? null;
}

export function midTaRegionFor(signguCd5: string): string | null {
  return MID_TA_REGIONS[signguCd5] ?? null;
}

function worst(values: string[], order: readonly string[]): string | null {
  let found: string | null = null;
  for (const value of values) {
    const rank = order.indexOf(value);
    if (rank < 0) continue;
    if (found === null || rank > order.indexOf(found)) found = value;
  }
  return found;
}

/** Folds one issue's rows into one entry per forecast day. */
export function foldVilageRows(
  rows: ReadonlyArray<{ category?: string; fcstDate?: string; fcstValue?: string | number }>,
): DayForecast[] {
  const byDate = new Map<string, { tmx: number[]; tmn: number[]; pop: number[]; pty: string[]; sky: string[] }>();
  for (const row of rows) {
    if (row.category === undefined || row.fcstDate === undefined || row.fcstValue === undefined) continue;
    if (!READ_CATEGORIES.has(row.category)) continue;
    const bucket = byDate.get(row.fcstDate) ?? { tmx: [], tmn: [], pop: [], pty: [], sky: [] };
    const text = String(row.fcstValue).trim();
    const numeric = Number(text);
    // +900 and beyond is KMA's missing marker, not a temperature.
    const isMissing = !Number.isFinite(numeric) || numeric >= 900 || numeric <= -900;
    switch (row.category) {
      case 'TMX':
        if (!isMissing) bucket.tmx.push(numeric);
        break;
      case 'TMN':
        if (!isMissing) bucket.tmn.push(numeric);
        break;
      case 'POP':
        if (!isMissing) bucket.pop.push(numeric);
        break;
      case 'PTY':
        bucket.pty.push(text);
        break;
      case 'SKY':
        bucket.sky.push(text);
        break;
      default:
        break;
    }
    byDate.set(row.fcstDate, bucket);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fcstDate, bucket]) => ({
      fcstDate,
      tmx: bucket.tmx.length > 0 ? Math.max(...bucket.tmx) : null,
      tmn: bucket.tmn.length > 0 ? Math.min(...bucket.tmn) : null,
      pop: bucket.pop.length > 0 ? Math.max(...bucket.pop) : null,
      // Worst, not first: an afternoon of rain matters even if the morning is dry.
      pty: worst(bucket.pty, PTY_BY_SEVERITY),
      sky: worst(bucket.sky, SKY_BY_SEVERITY),
    }));
}

export async function getShortTermForecast(
  signguCd5: string,
  now: Date,
): Promise<ShortTermForecast> {
  const grid = vilageGridFor(signguCd5);
  if (grid === null) {
    return { ok: false, baseAt: null, days: [], message: `no 단기예보 grid for ${signguCd5}` };
  }
  const { baseDate, baseTime } = vilageBaseFor(now);
  const result: KtoResult = await gatewayRequest(ORG.kma, VILAGE_SERVICE_ID, VILAGE_OPERATION, {
    numOfRows: VILAGE_ROWS,
    pageNo: 1,
    base_date: baseDate,
    base_time: baseTime,
    nx: grid.nx,
    ny: grid.ny,
  });
  if (!result.ok) {
    return { ok: false, baseAt: null, days: [], message: result.message };
  }
  const rows = result.items
    .map((item) => VilageRow.safeParse(item))
    .flatMap((parsed) => (parsed.success ? [parsed.data] : []));
  const days = foldVilageRows(rows);
  if (days.length === 0) {
    return {
      ok: false,
      baseAt: `${baseDate} ${baseTime}`,
      days: [],
      message: `getVilageFcst returned no readable rows for ${baseDate} ${baseTime}`,
    };
  }
  return { ok: true, baseAt: `${baseDate} ${baseTime}`, days, message: null };
}

export interface OutlookDay {
  /** Day number as KMA labels it: N days after the issue date, 4 through 10. */
  dayOffset: number;
  /** 오전/오후 where the service splits them, single value from day 8 on. */
  amWeather: string | null;
  pmWeather: string | null;
  amRainPct: number | null;
  pmRainPct: number | null;
  tmn: number | null;
  tmx: number | null;
}

export interface MidOutlook {
  ok: boolean;
  /** Issue this came from, YYYYMMDDHHmm KST. */
  tmFc: string | null;
  days: OutlookDay[];
  message: string | null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function stringOrNull(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return null;
}

/**
 * 중기예보 covers day 4 to day 10 after the issue date, and the 06:00 issue is the only
 * one that carries day 4 — the 18:00 issue starts at day 5. Day 8 onward is one value,
 * not an 오전/오후 pair, so those two columns hold the same number by construction.
 *
 * There are no `wf3`/`taMin3` fields. The three-day slot belongs to 단기예보, which since
 * late 2024 reaches three or four days depending on the issue, and the two overlap.
 */
export function foldMidRows(land: Record<string, unknown>, ta: Record<string, unknown>): OutlookDay[] {
  const days: OutlookDay[] = [];
  for (let dayOffset = 4; dayOffset <= 10; dayOffset += 1) {
    const split = dayOffset <= 7;
    const amWeather = split
      ? stringOrNull(land[`wf${dayOffset}Am`])
      : stringOrNull(land[`wf${dayOffset}`]);
    const pmWeather = split
      ? stringOrNull(land[`wf${dayOffset}Pm`])
      : stringOrNull(land[`wf${dayOffset}`]);
    const amRainPct = split
      ? numberOrNull(land[`rnSt${dayOffset}Am`])
      : numberOrNull(land[`rnSt${dayOffset}`]);
    const pmRainPct = split
      ? numberOrNull(land[`rnSt${dayOffset}Pm`])
      : numberOrNull(land[`rnSt${dayOffset}`]);
    const tmn = numberOrNull(ta[`taMin${dayOffset}`]);
    const tmx = numberOrNull(ta[`taMax${dayOffset}`]);
    if (
      amWeather === null &&
      pmWeather === null &&
      amRainPct === null &&
      pmRainPct === null &&
      tmn === null &&
      tmx === null
    ) {
      continue;
    }
    days.push({ dayOffset, amWeather, pmWeather, amRainPct, pmRainPct, tmn, tmx });
  }
  return days;
}

export async function getMidOutlook(
  lDongRegnCd: string,
  signguCd5: string,
  now: Date,
): Promise<MidOutlook> {
  const landRegId = midLandRegionFor(lDongRegnCd);
  const taRegId = midTaRegionFor(signguCd5);
  if (landRegId === null || taRegId === null) {
    return {
      ok: false,
      tmFc: null,
      days: [],
      message: `no 중기예보 region for ${lDongRegnCd}/${signguCd5}`,
    };
  }
  const tmFc = midBaseFor(now);
  const [land, ta] = await Promise.all([
    gatewayRequest(ORG.kma, MID_SERVICE_ID, MID_LAND_OPERATION, {
      numOfRows: 10,
      pageNo: 1,
      regId: landRegId,
      tmFc,
    }),
    gatewayRequest(ORG.kma, MID_SERVICE_ID, MID_TA_OPERATION, {
      numOfRows: 10,
      pageNo: 1,
      regId: taRegId,
      tmFc,
    }),
  ]);
  if (!land.ok) return { ok: false, tmFc, days: [], message: land.message };
  if (!ta.ok) return { ok: false, tmFc, days: [], message: ta.message };

  const landRow = MidRow.safeParse(land.items[0]);
  const taRow = MidRow.safeParse(ta.items[0]);
  if (!landRow.success || !taRow.success) {
    return { ok: false, tmFc, days: [], message: '중기예보 rows did not parse' };
  }
  const days = foldMidRows(landRow.data, taRow.data);
  if (days.length === 0) {
    return { ok: false, tmFc, days: [], message: `중기예보 held no day for ${tmFc}` };
  }
  return { ok: true, tmFc, days, message: null };
}

export type OutdoorState = 'good' | 'caution' | 'poor' | 'unknown';

export interface DayCondition {
  state: OutdoorState;
  /** Shown verbatim. Names the number that decided it, never just the verdict. */
  detail: string | null;
  unknownReason: string | null;
}

/**
 * How one forecast day reads for someone who has to cross open ground slowly.
 *
 * The order is deliberate: precipitation first, because it is the one that changes what
 * the ground is rather than how it feels. An unpaved slope in the rain stops being a
 * route for a wheelchair, and four of our six sites have one. Heat comes second and
 * cold third; both are endurance, and a visitor who can leave can leave.
 *
 * No forecast is `unknown`, never `good`. A planning aid that invents a fine day is
 * worse than one that admits it does not know.
 */
export function readDayCondition(day: DayForecast | undefined): DayCondition {
  if (day === undefined) {
    return { state: 'unknown', detail: null, unknownReason: '해당 날짜의 예보를 받지 못했습니다' };
  }
  const skyLabel = day.sky === null ? undefined : SKY_LABELS[day.sky];
  const ptyLabel = day.pty === null || day.pty === DRY ? undefined : PTY_LABELS[day.pty];

  const parts: string[] = [];
  if (skyLabel !== undefined) parts.push(skyLabel);
  if (day.tmx !== null) parts.push(`최고 ${day.tmx}℃`);
  if (day.tmn !== null) parts.push(`최저 ${day.tmn}℃`);
  if (day.pop !== null) parts.push(`강수확률 ${day.pop}%`);
  const summary = parts.length > 0 ? parts.join(' · ') : null;
  const tail = summary === null ? '' : ` — ${summary}`;

  if (ptyLabel !== undefined) {
    return {
      state: 'poor',
      detail: `${ptyLabel} 예보${tail}. 비포장 경사로는 이동이 어려워집니다`,
      unknownReason: null,
    };
  }
  if (day.tmx !== null && day.tmx >= HOT_DAY_TMX) {
    return {
      state: 'poor',
      detail: `최고기온 ${day.tmx}℃ 예보${tail}. 그늘 없는 구간이 긴 곳은 피하는 편이 낫습니다 (기온 기준이며 폭염 특보 판정이 아닙니다)`,
      unknownReason: null,
    };
  }
  if (day.tmn !== null && day.tmn <= COLD_DAY_TMN) {
    return {
      state: 'poor',
      detail: `최저기온 ${day.tmn}℃ 예보${tail}. 노면 결빙 가능성이 있습니다 (기온 기준이며 한파 특보 판정이 아닙니다)`,
      unknownReason: null,
    };
  }
  if (day.pop !== null && day.pop >= RAIN_LIKELY_POP) {
    return {
      state: 'caution',
      detail: `강수확률 ${day.pop}%${tail}. 우비와 대체 실내 공간을 함께 준비하세요`,
      unknownReason: null,
    };
  }
  if (summary === null) {
    return {
      state: 'unknown',
      detail: null,
      unknownReason: '예보에 읽을 수 있는 값이 없었습니다',
    };
  }
  return { state: 'good', detail: `${summary}. 야외 이동에 무리가 없는 예보입니다`, unknownReason: null };
}

export { SKY_LABELS, PTY_LABELS, HOT_DAY_TMX, COLD_DAY_TMN, RAIN_LIKELY_POP };
