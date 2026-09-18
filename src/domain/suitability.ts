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
import { CAPABILITIES, catalogueIndex } from './capabilities';
import {
  GENERAL_VERDICT_CODES,
  GRADE_WEIGHT,
  criticalCodesFor,
  gradeFor,
  relevantCodesFor,
} from './personas';

/**
 * v6 takes unknown out of the score.
 *
 * v5 gave an unknown item the value 0.35 and left it in every denominator, so a
 * missing field lowered the score, lowered the label through the coverage cap, and
 * lowered the confidence figure — the same absence charged three times. Measured over
 * the six places actually in the database, that put the ceiling of the whole model at
 * 62 while '방문가능' needed 75: no place, for any set of conditions, could reach the
 * label. One of four verdicts was unreachable by arithmetic.
 *
 * The rule the spec already applies to stale data — "an old check date lowers
 * confidence, not score" — now applies to absent data as well. The score answers "of
 * what has been checked, how well does this place serve you"; how much has been
 * checked is the coverage figure beside it, and whether the things this visitor
 * depends on are among the checked ones is what decides the label.
 *
 * v5 dropped the certification layer before that: v4's score was A x B x C, where C
 * was a bonus of up to 12% for a barrier-free certification. It reached one place in
 * six, and every other certification found belonged to an ancillary building — a
 * visitor centre, a toilet block — so applying it would have credited a site for a
 * building's award. A certification is shown as a fact instead.
 */
/**
 * v7 puts an outcome in the verdict set where a means used to sit.
 *
 * `elevator` was one of the four items a no-condition verdict rested on, and it is the
 * only one of the four that is not a thing the visitor wants — it is one way of
 * reaching an upper floor, needed only where there is one. Confirming 「엘리베이터 없음」
 * at 궁남지, 고마나루, 구드래조각공원 and 부여왕릉원 therefore answered '다른 곳을
 * 권해요' at four places whose own routes the same sources described as traversable,
 * and it did so because we had checked them: the day before, all four read '주의' on
 * the strength of knowing nothing. A model in which looking makes a place look worse
 * teaches the wrong thing to whoever fills the data next.
 *
 * `path_continuity` asks what `elevator` was standing in for — can the visitor move
 * between the points they came to see — and a ramp, a lift or level ground all answer
 * it. A two-storey museum reachable only by stairs still blocks, and now blocks for
 * the reason that is true. `elevator` keeps its place in the score and on the screen.
 */
export const POLICY_VERSION = 'suitability-v7';

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
  // 'Situation', not 'Conditions': the visitor's own conditions are named that on
  // every screen, and 'the distances on the conditions axis' could not be read.
  context: { ko: '상황', en: 'Situation' },
};

/**
 * Only the three statuses that assert something. An unknown item has no value here
 * because it takes no part in the score: it leaves the denominator the way a
 * not_applicable item does, and is reported through coverage instead.
 */
export const STATUS_VALUE: Record<Exclude<CapabilityStatus, 'unknown'>, number> = {
  supported: 1.0,
  partial: 0.5,
  unsupported: 0.0,
};

export const VISITABLE_THRESHOLD = 75;
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

/**
 * An axis contributes its mean over the items whose status is known. An axis with
 * nothing known has no mean to contribute, so it leaves the weighted sum and the
 * remaining weights are scaled back to 1.00 — the same treatment a wholly
 * not_applicable axis already had. Its row is still returned, with knownCount 0 and
 * weight 0, because the screen names those axes as the biggest gaps.
 */
function buildAxes(facts: NormalisedFact[]): AxisBreakdown[] {
  const present: Array<{ axis: Axis; rawScore: number; knownCount: number; totalCount: number }> = [];
  for (const axis of AXES) {
    const items = facts.filter((f) => f.axis === axis && !f.excluded);
    if (items.length === 0) continue;
    const known = items.filter((f) => f.status !== 'unknown');
    const rawScore =
      known.length === 0
        ? 0
        : known.reduce((sum, f) => sum + STATUS_VALUE[f.status as KnownStatus], 0) / known.length;
    present.push({ axis, rawScore, knownCount: known.length, totalCount: items.length });
  }

  const weightSum = present
    .filter((a) => a.knownCount > 0)
    .reduce((sum, a) => sum + AXIS_WEIGHT[a.axis], 0);
  const scale = weightSum === 0 ? 0 : 1 / weightSum;

  return present.map((a) => {
    const weight = a.knownCount === 0 ? 0 : AXIS_WEIGHT[a.axis] * scale;
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

type KnownStatus = Exclude<CapabilityStatus, 'unknown'>;

/**
 * Graded mean over the items this persona depends on, taken only over the ones whose
 * status is known. Nothing known returns 0, which the caller turns into the floor of
 * layer B; the label rules reach 정보없음 before that number is ever shown.
 */
function personaFit(facts: NormalisedFact[], personaId: PersonaId | null): number {
  let numerator = 0;
  let denominator = 0;
  for (const fact of facts) {
    if (fact.excluded || fact.status === 'unknown') continue;
    const weight =
      personaId === null ? GRADE_WEIGHT.other : GRADE_WEIGHT[gradeFor(personaId, fact.capabilityCode)];
    numerator += STATUS_VALUE[fact.status] * weight;
    denominator += weight;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Infinity for anything that is not a plain YYYY-MM-DD, which bins the item into the
 * oldest freshness bucket. Date.parse alone is not the guard: it accepts KTO's raw
 * 14-digit stamp as a year and returns a date, and it accepts the same string in two
 * time zones. Negative ages are clamped to 0 — a check date in the future is a data
 * fault, and reading it as maximally fresh is the one interpretation that flatters.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function daysBetween(fromIso: string, toIso: string): number {
  if (!ISO_DATE.test(fromIso) || !ISO_DATE.test(toIso)) return Number.POSITIVE_INFINITY;
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (to - from) / 86_400_000);
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
  // '정보없음' outranks '대체추천' in LABEL_RANK because the rank orders how much the
  // service is willing to say, and saying nothing beats saying no. It does not order
  // accessibility, so a place nobody has checked must never be offered as somewhere
  // better to go: the only thing known about it is that nothing is known. Only the two
  // labels that rest on confirmed facts can stand as an alternative.
  const better = candidates.filter(
    (c) => LABEL_RANK[c.label] < selfRank && (c.label === '방문가능' || c.label === '주의'),
  );
  const trigger = self.label === '대체추천' || better.length > 0;
  if (!trigger) return [];

  // A better label, and nothing else. There used to be a second arm for a place with
  // the same label and a higher score, and the screen no longer shows a score — so
  // "a better verdict under the same conditions" would have been offering a place
  // whose only advantage the reader cannot see, on a figure that is a mean over
  // whichever items each of the two happens to have. A label is the same question at
  // both places, which is what makes the comparison sayable.
  return [...better]
    .sort(
      (a, b) =>
        LABEL_RANK[a.label] - LABEL_RANK[b.label] ||
        b.score - a.score ||
        (a.poiSlug < b.poiSlug ? -1 : a.poiSlug > b.poiSlug ? 1 : 0),
    )
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

  // What the verdict is taken over. With conditions chosen that is the union of their
  // critical items; with none chosen there is no critical set, so the four items more
  // than one persona depends on stand in — see GENERAL_VERDICT_CODES. Handing the
  // no-condition case the whole catalogue instead made '방문가능' a claim about 수어 안내
  // for a visitor who never said they needed it, and no place in the dataset could
  // clear it.
  // Catalogue order for the same reason unknownCriticals below takes it: this list is
  // printed as 「기준 항목」, and flatMap order made the sentence depend on which
  // condition the visitor happened to tick first.
  const requiredCodes = (
    personaIds.length === 0
      ? [...GENERAL_VERDICT_CODES]
      : Array.from(new Set(personaIds.flatMap((id) => criticalCodesFor(id))))
  )
    .filter((code) => byCode.has(code))
    .sort((a, b) => catalogueIndex(a) - catalogueIndex(b));
  const requiredFacts = requiredCodes.map((code) => byCode.get(code)!);
  const knownCriticalBlockers = requiredFacts
    .filter((f) => f.status === 'unsupported')
    .map((f) => f.capabilityCode)
    .sort((a, b) => catalogueIndex(a) - catalogueIndex(b));
  // A condition the visitor has to satisfy before the thing works — staff to be called,
  // a season, a stretch that needs help. Not a blocker, and not clear either, so it
  // caps the label rather than setting it. Without the cap a route the source itself
  // qualifies could reach '방문 가능' on the strength of everything around it, which is
  // the claim this service exists not to make.
  const partialCriticals = requiredFacts
    .filter((f) => f.status === 'partial')
    .map((f) => f.capabilityCode)
    .sort((a, b) => catalogueIndex(a) - catalogueIndex(b));
  // Catalogue order, not selection order. These names are printed beside the badge,
  // and taking them in the order the personas were flatMapped made the sentence on
  // screen depend on which condition chip the visitor tapped first.
  const unknownCriticals = requiredFacts
    .filter((f) => f.status === 'unknown')
    .map((f) => f.capabilityCode)
    .sort((a, b) => catalogueIndex(a) - catalogueIndex(b));

  const noVerdictBasis = findNoVerdictBasis(personaIds, byCode, requiredCodes);

  let score = score0;
  let label: SuitabilityLabel;

  if (knownCriticalBlockers.length > 0) {
    // Rule 1. Knowing something is not possible is decisive, and this is the only
    // path to the "go elsewhere" label. A low score alone never produces it.
    label = '대체추천';
    score = Math.min(score, BLOCKED_SCORE_CEILING);
  } else if (noVerdictBasis !== null || requiredFacts.length === 0) {
    // Rule 2. More than half of what the verdict rests on is unknown, so there is no
    // verdict to give. The second arm covers the case where the whole required set
    // turned out not to apply to this kind of place, which leaves nothing to judge on.
    label = '정보없음';
  } else if (unknownCriticals.length > 0 || partialCriticals.length > 0) {
    // Rule 3. Something the verdict rests on has not been checked, or is only usable
    // under a condition. The screen prints the names beside the badge, which is the
    // only actionable thing on the card.
    label = '주의';
  } else {
    // Rule 4. Everything the verdict rests on is known and none of it blocks, so the
    // score decides. Coverage no longer caps here: it was a second charge for the same
    // absence rule 3 already answers, taken over items this visitor does not depend on,
    // and its threshold sat above anything the corpus reaches.
    label = score0 >= VISITABLE_THRESHOLD ? '방문가능' : '주의';
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
    partialCriticals,
    perPersona:
      personaIds.length < 2
        ? []
        : personaIds.map((id) => {
            // The whole calculation again, one condition at a time. The recursion is
            // one level deep by construction — the inner call has a single condition,
            // so it takes this same branch and stops. Alternatives are dropped from
            // the inner input: they are a property of the group's verdict, not of one
            // companion's, and computing them per companion would be work nothing reads.
            const own = calculateSuitability({ ...input, personaIds: [id], scoredAlternatives: [] });
            return {
              personaId: id,
              label: own.label,
              requiredCodes: own.requiredCodes,
              unknownCriticals: own.unknownCriticals,
              partialCriticals: own.partialCriticals,
              knownCriticalBlockers: own.knownCriticalBlockers,
            };
          }),
    deductions: buildDeductions(facts),
    alternatives: pickAlternatives({ label, score }, input.scoredAlternatives),
    relevantKnownCount: relevantFacts.filter((f) => f.status !== 'unknown').length,
    relevantTotalCount: relevantFacts.length,
    requiredCodes,
    noVerdictBasis: label === '정보없음' ? noVerdictBasis : null,
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

/**
 * Rule 2, asked once per companion rather than once over the union of their critical
 * sets. Layer B already takes the least-served companion, and the interface promises
 * the verdict follows whoever needs the most support; taking the ratio over the union
 * broke that promise in the one direction that matters. Measured: with both of a deaf
 * visitor's critical items unknown, P2b alone gives 정보없음 and hides the score, and
 * P2b with a wheelchair-using companion gives 주의 and a 95 — on identical evidence,
 * because 2 of the combined 7 is not a majority even though it is all of what that
 * visitor depends on.
 *
 * Returns the companion the rule fired on, not just a yes. The screen prints the
 * ratio, and printing the union's ratio there put "7개 중 3개" under a rule that needs
 * more than half — live on 6 of the 13 places for a wheelchair-and-deaf pair.
 */
function findNoVerdictBasis(
  personaIds: ReadonlyArray<PersonaId>,
  byCode: ReadonlyMap<string, NormalisedFact>,
  generalCodes: ReadonlyArray<string>,
): { personaId: PersonaId | null; total: number; unknown: number } | null {
  const sets: { personaId: PersonaId | null; codes: readonly string[] }[] =
    personaIds.length === 0
      ? [{ personaId: null, codes: generalCodes }]
      : personaIds.map((id) => ({
          personaId: id,
          codes: criticalCodesFor(id).filter((code) => byCode.has(code)),
        }));
  for (const { personaId, codes } of sets) {
    // An empty set is not a companion with nothing to worry about — it is a companion
    // this place answers nothing for, which is the same absence of a basis the
    // single-persona arm already calls 정보없음. Returning false here let a second
    // companion's known items carry a 방문가능 badge that claimed for both.
    if (codes.length === 0) return { personaId, total: 0, unknown: 0 };
    const unknown = codes.filter((code) => byCode.get(code)!.status === 'unknown').length;
    if (unknown / codes.length > 0.5) return { personaId, total: codes.length, unknown };
  }
  return null;
}
