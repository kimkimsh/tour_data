import {
  AXES,
  type AlternativePoi,
  type Axis,
  type AxisBreakdown,
  type CapabilityStatus,
  type Deduction,
  type PersonaId,
  type SuitabilityFactInput,
  type SuitabilityInput,
  type SuitabilityLabel,
  type SuitabilityResult,
} from './types';
import { CAPABILITIES } from './capabilities';
import { GRADE_WEIGHT, criticalCodesFor, gradeFor, relevantCodesFor } from './personas';

/**
 * v5 drops the certification layer. v4's score was A x B x C, where C was a bonus of
 * up to 12% for a barrier-free certification. It reached one place in six, and every
 * other certification found belonged to an ancillary building — a visitor centre, a
 * toilet block — so applying it would have credited a site for a building's award.
 * The score is A x B now, and a certification is shown as a fact rather than added to
 * a number (docs/work_log/04_open_items.md, decision 3).
 */
export const POLICY_VERSION = 'suitability-v5';

/** docs/spec/06_suitability.md section 3. Sums to 1.00. */
export const AXIS_WEIGHT: Record<Axis, number> = {
  entry: 0.3,
  continuity: 0.18,
  facility: 0.18,
  information: 0.14,
  rest: 0.1,
  context: 0.1,
};

export const AXIS_LABEL: Record<Axis, { ko: string; en: string }> = {
  entry: { ko: '진입', en: 'Entry' },
  continuity: { ko: '이동', en: 'Movement' },
  facility: { ko: '편의시설', en: 'Facilities' },
  information: { ko: '정보안내', en: 'Information' },
  rest: { ko: '휴식', en: 'Rest' },
  context: { ko: '상황', en: 'Conditions' },
};

/**
 * unknown = 0.35 means "not knowing is better than absent but does not count as
 * present". The label rules and the coverage cap are the safety net that keeps
 * this value from reading as optimism.
 */
export const STATUS_VALUE: Record<CapabilityStatus, number> = {
  supported: 1.0,
  partial: 0.5,
  unsupported: 0.0,
  unknown: 0.35,
};

const VISITABLE_THRESHOLD = 75;
const COVERAGE_CAP_THRESHOLD = 0.65;
const BLOCKED_SCORE_CEILING = 49;

/** Higher is better. Used for sorting and for the alternatives trigger. */
const LABEL_RANK: Record<SuitabilityLabel, number> = {
  방문가능: 0,
  주의: 1,
  정보없음: 2,
  대체추천: 3,
};

export function labelRank(label: SuitabilityLabel): number {
  return LABEL_RANK[label];
}

interface NormalisedFact extends SuitabilityFactInput {
  axis: Axis;
  labelKo: string;
  /** not_applicable items are dropped from every calculation, not given a value. */
  excluded: boolean;
}

/**
 * Fills in any catalogue code the input did not carry. A capability we hold no
 * fact for is unknown with no absence reason — the same thing ingest writes when
 * KTO returns an empty field.
 */
function normaliseFacts(facts: ReadonlyArray<SuitabilityFactInput>): NormalisedFact[] {
  const byCode = new Map(facts.map((f) => [f.capabilityCode, f]));
  return CAPABILITIES.map((capability) => {
    const fact = byCode.get(capability.code);
    const base: SuitabilityFactInput = fact ?? {
      capabilityCode: capability.code,
      status: 'unknown',
      absenceKind: null,
      detail: null,
      source: capability.ktoField === null ? 'derived_facility' : 'kto_with',
      verifiedAt: null,
      isKtoScored: capability.ktoField !== null,
    };
    return {
      ...base,
      axis: capability.axis,
      labelKo: capability.labelKo,
      excluded: base.absenceKind === 'not_applicable',
    };
  });
}

function buildAxes(facts: NormalisedFact[]): AxisBreakdown[] {
  const present: Array<{ axis: Axis; rawScore: number; knownCount: number; totalCount: number }> = [];
  for (const axis of AXES) {
    const items = facts.filter((f) => f.axis === axis && !f.excluded);
    if (items.length === 0) continue;
    const rawScore = items.reduce((sum, f) => sum + STATUS_VALUE[f.status], 0) / items.length;
    present.push({
      axis,
      rawScore,
      knownCount: items.filter((f) => f.status !== 'unknown').length,
      totalCount: items.length,
    });
  }

  // A whole axis can be not_applicable. Its raw score is undefined, so the axis
  // leaves the weighted sum and the remaining weights are scaled back to 1.00.
  // Left undefined, NaN would spread silently through the score.
  const weightSum = present.reduce((sum, a) => sum + AXIS_WEIGHT[a.axis], 0);
  const scale = weightSum === 0 ? 0 : 1 / weightSum;

  return present.map((a) => {
    const weight = AXIS_WEIGHT[a.axis] * scale;
    return {
      axis: a.axis,
      labelKo: AXIS_LABEL[a.axis].ko,
      labelEn: AXIS_LABEL[a.axis].en,
      weight,
      rawScore: a.rawScore,
      weighted: weight * a.rawScore,
      knownCount: a.knownCount,
      totalCount: a.totalCount,
    };
  });
}

function personaFit(facts: NormalisedFact[], personaId: PersonaId | null): number {
  let numerator = 0;
  let denominator = 0;
  for (const fact of facts) {
    if (fact.excluded) continue;
    const weight =
      personaId === null ? GRADE_WEIGHT.other : GRADE_WEIGHT[gradeFor(personaId, fact.capabilityCode)];
    numerator += STATUS_VALUE[fact.status] * weight;
    denominator += weight;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to)) return Number.POSITIVE_INFINITY;
  return (to - from) / 86_400_000;
}

/**
 * Only items whose status is known carry a check date, so unknown items are
 * skipped. A known item with no date falls into the oldest bucket: we cannot
 * claim a check date we do not have.
 */
function computeFreshness(facts: NormalisedFact[], calculationDate: string): number {
  const dated = facts.filter((f) => !f.excluded && f.status !== 'unknown');
  if (dated.length === 0) return 0.75;
  const total = dated.reduce((sum, fact) => {
    if (fact.verifiedAt === null) return sum + 0.75;
    const age = daysBetween(fact.verifiedAt, calculationDate);
    if (age <= 90) return sum + 1.0;
    if (age <= 365) return sum + 0.9;
    return sum + 0.75;
  }, 0);
  return total / dated.length;
}

function clampScore(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}

function buildDeductions(facts: NormalisedFact[]): Deduction[] {
  return facts
    .filter((f) => !f.excluded && (f.status === 'unknown' || f.status === 'unsupported'))
    .map((f) => ({
      capabilityCode: f.capabilityCode,
      labelKo: f.labelKo,
      reason: f.status === 'unknown' ? `${f.labelKo} 정보 없음` : `${f.labelKo} 이용 불가`,
      axis: f.axis,
    }));
}

function pickAlternatives(
  self: { label: SuitabilityLabel; score: number },
  candidates: ReadonlyArray<AlternativePoi>,
): AlternativePoi[] {
  const selfRank = LABEL_RANK[self.label];
  const better = candidates.filter((c) => LABEL_RANK[c.label] < selfRank);
  const trigger = self.label === '대체추천' || better.length > 0;
  if (!trigger) return [];

  // Better label first, then the higher score inside the same label.
  // A score comparison alone would make six equally sparse POIs recommend each other.
  const sameLabelHigher = candidates.filter(
    (c) => LABEL_RANK[c.label] === selfRank && c.score > self.score,
  );
  return [...better, ...sameLabelHigher]
    .sort((a, b) => LABEL_RANK[a.label] - LABEL_RANK[b.label] || b.score - a.score)
    .slice(0, 3);
}

export function calculateSuitability(input: SuitabilityInput): SuitabilityResult {
  const facts = normaliseFacts(input.facts);
  const included = facts.filter((f) => !f.excluded);
  const byCode = new Map(included.map((f) => [f.capabilityCode, f]));

  const axes = buildAxes(facts);
  const layerA = axes.reduce((sum, a) => sum + a.weighted, 0);

  const personaIds = input.personaIds;
  const fits =
    personaIds.length === 0
      ? [personaFit(facts, null)]
      : personaIds.map((id) => personaFit(facts, id));
  // The least-served companion sets the verdict. A grandchild's stroller score
  // must not paper over a wheelchair barrier.
  const layerB = 0.75 + 0.25 * Math.min(...fits);

  const score0 = clampScore(100 * layerA * layerB);

  const freshness = computeFreshness(facts, input.calculationDate);

  const relevantCodes = relevantCodesFor(personaIds).filter((code) => byCode.has(code));
  const relevantFacts = relevantCodes.map((code) => byCode.get(code)!);
  const coverage =
    relevantFacts.length === 0
      ? 0
      : relevantFacts.filter((f) => f.status !== 'unknown').length / relevantFacts.length;

  const evidenceConfidence = Math.round(100 * coverage * freshness);

  const requiredCodes = Array.from(
    new Set(personaIds.flatMap((id) => criticalCodesFor(id))),
  ).filter((code) => byCode.has(code));
  const requiredFacts = requiredCodes.map((code) => byCode.get(code)!);
  const knownCriticalBlockers = requiredFacts
    .filter((f) => f.status === 'unsupported')
    .map((f) => f.capabilityCode);
  const unknownCriticals = requiredFacts
    .filter((f) => f.status === 'unknown')
    .map((f) => f.capabilityCode);

  let score = score0;
  let label: SuitabilityLabel;

  if (knownCriticalBlockers.length > 0) {
    // Rule 1. Knowing something is not possible is decisive, and this is the only
    // path to the "go elsewhere" label. A low score alone never produces it.
    label = '대체추천';
    score = Math.min(score, BLOCKED_SCORE_CEILING);
  } else if (
    (requiredFacts.length > 0 && unknownCriticals.length / requiredFacts.length > 0.5) ||
    (personaIds.length === 0 && coverage === 0)
  ) {
    // Rule 2. More than half of what matters is unknown, so there is no verdict
    // to give. The second arm covers P0, which has no critical set at all.
    label = '정보없음';
  } else {
    label = score0 >= VISITABLE_THRESHOLD ? '방문가능' : '주의';
    // Rule 4. The cap only ever lowers a visitable verdict to a caution verdict.
    if (unknownCriticals.length > 0 || coverage < COVERAGE_CAP_THRESHOLD) {
      label = '주의';
    }
  }

  return {
    score,
    label,
    layerA,
    layerB,
    axes,
    freshness,
    coverage,
    evidenceConfidence,
    knownCriticalBlockers,
    unknownCriticals,
    deductions: buildDeductions(facts),
    alternatives: pickAlternatives({ label, score }, input.scoredAlternatives),
    ktoUnknownCount: included.filter((f) => f.isKtoScored && f.status === 'unknown').length,
    ktoTotalCount: included.filter((f) => f.isKtoScored).length,
    dataDates: included.map((f) => ({
      capabilityCode: f.capabilityCode,
      verifiedAt: f.verifiedAt,
      source: f.source,
    })),
    policyVersion: POLICY_VERSION,
  };
}
