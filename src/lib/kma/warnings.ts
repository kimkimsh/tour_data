import { z } from 'zod';
import { ORG, gatewayRequest, type KtoResult } from '@/lib/kto/transport';

/**
 * 기상청 특보현황조회 — which weather warnings are in force right now.
 *
 * getPwnStatus, not getPwnCd. The code lookup looks like the better source because it
 * returns structured rows, and KMA says in writing that it is not: 특보코드조회는 현재
 * 발효 중인 특보에 대한 자료를 제공하는 것이 아닌… (data.go.kr Q&A 47679, 46527). It is
 * also capped at six days back, and KMA deletes 특보 data after seven, so a 폭염경보
 * running longer than six days vanishes from it entirely — 공주 and 부여 in July and
 * August is exactly where that happens.
 *
 * getPwnStatus takes four parameters and none of them selects a region: serviceKey,
 * numOfRows, pageNo, dataType. It answers for the whole country and the caller filters.
 * Sending stnId is the trap — this gateway drops unknown parameters silently, so a
 * caller who adds one gets nationwide data with no error and believes it is filtered.
 */
const SERVICE_ID = 'WthrWrnInfoService';
const OPERATION = 'getPwnStatus';

/** One row is the whole national picture, so a page of ten is already generous. */
const ROWS = 10;

/**
 * The bulletin fields. Everything is optional because this gateway omits an element
 * rather than sending it empty, and `items.item` collapses to a single object when one
 * row returns.
 */
const PwnStatusRow = z.looseObject({
  /** 특보발효현황 — the string this module exists to read. */
  t6: z.string().optional(),
  /** 예비특보 — a forecast of a warning, not a warning. Not read here. */
  t7: z.string().optional(),
  other: z.string().optional(),
  /** 발표시각, YYYYMMDDHHmm in KST. */
  tmFc: z.union([z.string(), z.number()]).optional(),
  tmEf: z.union([z.string(), z.number()]).optional(),
});

/**
 * How KMA names the places this service covers.
 *
 * The bulletin writes short forms — `공주`, not `공주시` — and names the province in
 * both long and short form depending on the clause, so both are listed. Keyed by
 * lDongRegnCd because that is what a POI carries.
 *
 * One province, because the service covers one. A code that is not here resolves to
 * unknown rather than to an all-clear: extending the coverage area must fail loudly at
 * the point of extension, not report "no warning" for a region nobody taught it about.
 */
const KMA_REGION_NAMES: Record<string, { provinceNames: readonly string[] }> = {
  // 충청남도
  '44': { provinceNames: ['충청남도', '충남'] },
};

/** `공주시` -> `공주`, `부여군` -> `부여`. KMA writes the bare stem. */
export function kmaDistrictName(cityKo: string): string {
  return cityKo.replace(/[시군구]$/, '');
}

/**
 * The region argument for readWarningFor, or null when this province is outside what
 * KMA_REGION_NAMES covers — in which case the caller must record unknown.
 */
export function kmaRegionFor(
  lDongRegnCd: string,
  cityKo: string,
): { districtNames: readonly string[]; provinceNames: readonly string[] } | null {
  const province = KMA_REGION_NAMES[lDongRegnCd];
  if (!province) return null;
  return { districtNames: [kmaDistrictName(cityKo)], provinceNames: province.provinceNames };
}

export type WarningState = 'none' | 'in_force' | 'unknown';

export interface RegionWarning {
  state: WarningState;
  /** The clauses naming this region, verbatim. Never summarised. */
  warning: string | null;
  scope: 'district' | 'province';
  /** Why, when state is unknown. Reaches the operator's log and the gap report. */
  unknownReason: string | null;
}

/**
 * A clause is `o <종류> : <지역>, <지역>` and the clauses run together with no
 * separator — KMA's own sample contains `전라남도(거문도.초도)o 풍랑주의보`. Splitting on
 * a newline finds one clause; splitting on the marker finds all of them.
 */
const CLAUSE_MARKER = /\s*o\s+/;

/** `충청남도(공주, 부여 제외)` — the region list may exclude what it appears to name. */
const EXCLUSION = /제외/;

/**
 * Parses one 특보발효현황 string for one region.
 *
 * The rule that matters is the one that decides `none`. A parser that fails to find a
 * district it should have found reports "no warning in force", which for this service
 * is the dangerous direction of error — someone reads an all-clear and goes out in a
 * heat warning. So `none` is only returned when the province is not mentioned at all.
 * The moment the province appears without the district being resolvable, the answer is
 * `unknown`, and the screen says so.
 */
export function readWarningFor(
  t6: string,
  region: { districtNames: readonly string[]; provinceNames: readonly string[] },
): RegionWarning {
  const body = t6.trim();
  // KMA writes an empty body, or the single word `없음`, when nothing is in force.
  if (body === '' || /^o?\s*없음$/.test(body)) {
    return { state: 'none', warning: null, scope: 'district', unknownReason: null };
  }

  const clauses = body
    .split(CLAUSE_MARKER)
    .map((clause) => clause.trim())
    .filter((clause) => clause !== '' && clause !== '없음');

  const naming: string[] = [];
  let provinceSeen = false;
  let ambiguous = false;

  for (const clause of clauses) {
    const mentionsDistrict = region.districtNames.some((name) => clause.includes(name));
    const mentionsProvince = region.provinceNames.some((name) => clause.includes(name));
    if (!mentionsDistrict && !mentionsProvince) continue;

    if (EXCLUSION.test(clause)) {
      // `충청남도(공주, 부여 제외)` names the district in order to rule it out, and
      // `충청남도(서산 제외)` rules out a different one. Which of the two this is
      // cannot be read reliably from a substring, and guessing either way is worse
      // than saying so.
      provinceSeen = true;
      ambiguous = true;
      continue;
    }

    if (mentionsDistrict) {
      naming.push(clause);
      continue;
    }
    // The province is named with no district list — `충청남도` alone, or a sub-region
    // whose name we do not hold. Applies to us for all we can tell, but not confirmed.
    provinceSeen = true;
    ambiguous = true;
  }

  if (naming.length > 0) {
    return {
      state: 'in_force',
      warning: naming.join(' / '),
      scope: 'district',
      unknownReason: null,
    };
  }
  if (ambiguous) {
    return {
      state: 'unknown',
      warning: null,
      scope: 'province',
      unknownReason:
        '특보 문구가 도 단위이거나 제외 구역을 포함하고 있어 이 시군구에 해당하는지 확정할 수 없습니다',
    };
  }
  return {
    state: provinceSeen ? 'unknown' : 'none',
    warning: null,
    scope: 'district',
    unknownReason: provinceSeen ? '특보 문구를 이 시군구까지 좁히지 못했습니다' : null,
  };
}

export interface PwnStatus {
  ok: boolean;
  /** The raw 특보발효현황 string, for the caller to read per region. */
  t6: string | null;
  /** Bulletin issue time as given, YYYYMMDDHHmm KST. */
  tmFc: string | null;
  message: string | null;
}

/**
 * One call, no region parameter. The caller runs readWarningFor over the result once
 * per district.
 */
export async function getWeatherWarnings(): Promise<PwnStatus> {
  const result: KtoResult = await gatewayRequest(ORG.kma, SERVICE_ID, OPERATION, {
    numOfRows: ROWS,
    pageNo: 1,
  });

  if (!result.ok) {
    return { ok: false, t6: null, tmFc: null, message: result.message };
  }

  const rows = result.items.map((item) => PwnStatusRow.safeParse(item)).flatMap((parsed) =>
    parsed.success ? [parsed.data] : [],
  );
  const row = rows[0];
  if (!row || row.t6 === undefined) {
    // A shape we do not recognise is not an all-clear. Saying so is the whole point.
    return {
      ok: false,
      t6: null,
      tmFc: null,
      message: 'getPwnStatus returned no t6 field',
    };
  }

  return { ok: true, t6: row.t6, tmFc: row.tmFc === undefined ? null : String(row.tmFc), message: null };
}
