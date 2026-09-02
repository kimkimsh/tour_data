import { calculateSuitability, labelRank } from './suitability';
import type {
  AlternativePoi,
  PersonaId,
  SuitabilityFactInput,
  SuitabilityResult,
} from './types';

export interface ScoreboardPoi {
  slug: string;
  title: string;
  certifications: ReadonlyArray<{ grade: string; validUntil: string | null }>;
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
      certifications: poi.certifications,
      calculationDate: input.calculationDate,
      scoredAlternatives: [],
    }),
  }));

  const candidates: AlternativePoi[] = base.map(({ poi, result }) => ({
    poiSlug: poi.slug,
    title: poi.title,
    score: result.score,
    label: result.label,
  }));

  return base.map(({ poi }) => ({
    poiSlug: poi.slug,
    title: poi.title,
    result: calculateSuitability({
      facts: input.factsByPoi[poi.slug] ?? [],
      personaIds: input.personaIds,
      cognitiveOption: input.cognitiveOption,
      certifications: poi.certifications,
      calculationDate: input.calculationDate,
      scoredAlternatives: candidates.filter((c) => c.poiSlug !== poi.slug),
    }),
  }));
}

/**
 * Verdict first, then score inside a verdict. "Not enough information" sits above
 * "try elsewhere" on purpose: a place we do not know about ranks above a place we
 * know has a confirmed barrier.
 */
export function sortScoreboard(entries: ScoreboardEntry[]): ScoreboardEntry[] {
  return [...entries].sort(
    (a, b) =>
      labelRank(a.result.label) - labelRank(b.result.label) ||
      b.result.score - a.result.score ||
      a.poiSlug.localeCompare(b.poiSlug),
  );
}
