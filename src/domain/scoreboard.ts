import { calculateSuitability, labelRank } from './suitability';
import type {
  AlternativePoi,
  PersonaId,
  SuitabilityFactInput,
  SuitabilityLabel,
  SuitabilityResult,
} from './types';

export interface ScoreboardPoi {
  slug: string;
  title: string;
  /**
   * The city the place is in. Alternatives are drawn from the same one: a visitor
   * reading 공산성 is standing in 공주, and offering them a better-scoring place forty
   * kilometres away in 부여 is not an alternative to today's visit.
   */
  city: string;
}

export interface ScoreboardInput {
  pois: ReadonlyArray<ScoreboardPoi>;
  factsByPoi: Readonly<Record<string, ReadonlyArray<SuitabilityFactInput>>>;
  personaIds: ReadonlyArray<PersonaId>;
  cognitiveOption: boolean;
  calculationDate: string;
}

export interface ScoreboardEntry {
  poiSlug: string;
  title: string;
  result: SuitabilityResult;
}

/**
 * Scores every place under one set of conditions, then hands each place the other
 * places as candidate alternatives.
 *
 * Two passes are unavoidable: a place cannot recommend an alternative until every
 * other place has a verdict, and the alternatives rule compares verdicts rather
 * than scores. Six places, so the cost is irrelevant and the ordering is what
 * matters — one pass would compare against whatever had been computed so far.
 */
export function buildScoreboard(input: ScoreboardInput): ScoreboardEntry[] {
  const base = input.pois.map((poi) => ({
    poi,
    result: calculateSuitability({
      facts: input.factsByPoi[poi.slug] ?? [],
      personaIds: input.personaIds,
      cognitiveOption: input.cognitiveOption,
      calculationDate: input.calculationDate,
      scoredAlternatives: [],
    }),
  }));

  const candidates: AlternativePoi[] = base.map(({ poi, result }) => ({
    poiSlug: poi.slug,
    title: poi.title,
    score: result.score,
    label: result.label,
    city: poi.city,
  }));

  return base.map(({ poi }) => ({
    poiSlug: poi.slug,
    title: poi.title,
    result: calculateSuitability({
      facts: input.factsByPoi[poi.slug] ?? [],
      personaIds: input.personaIds,
      cognitiveOption: input.cognitiveOption,
      calculationDate: input.calculationDate,
      scoredAlternatives: candidates.filter(
        (c) => c.poiSlug !== poi.slug && c.city === poi.city,
      ),
    }),
  }));
}

/** How many of the chosen conditions came out at this label on their own. */
function personaLabelCount(entry: ScoreboardEntry, label: SuitabilityLabel): number {
  return entry.result.perPersona.filter((row) => row.label === label).length;
}

/** Chosen-condition items whose status is known, over the items the verdict rests on. */
function requiredKnownRatio(entry: ScoreboardEntry): number {
  const { requiredCodes, unknownCriticals } = entry.result;
  if (requiredCodes.length === 0) return 0;
  return (requiredCodes.length - unknownCriticals.length) / requiredCodes.length;
}

/**
 * Verdict first, then the evidence behind it. "Not enough information" sits above
 * "try elsewhere" on purpose: a place we do not know about ranks above a place we
 * know has a confirmed barrier.
 *
 * Every tiebreak is a quantity the card shows. The score used to be the second key,
 * and the screen hides the score on exactly the rows where it decided the most —
 * eleven 정보없음 places came back in an order the visitor could not see, read, or
 * disagree with. It also made the order rest on an average of whichever items each
 * place happened to have, which is not the same question twice.
 */
export function sortScoreboard(entries: ScoreboardEntry[]): ScoreboardEntry[] {
  return [...entries].sort(
    (a, b) =>
      labelRank(a.result.label) - labelRank(b.result.label) ||
      personaLabelCount(a, '정보없음') - personaLabelCount(b, '정보없음') ||
      personaLabelCount(a, '주의') - personaLabelCount(b, '주의') ||
      requiredKnownRatio(b) - requiredKnownRatio(a) ||
      // Code-point order. localeCompare with no locale follows the runtime's ICU
      // data, so the server and the browser can disagree about two equal rows.
      (a.poiSlug < b.poiSlug ? -1 : a.poiSlug > b.poiSlug ? 1 : 0),
  );
}
