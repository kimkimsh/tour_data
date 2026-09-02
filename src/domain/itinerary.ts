import type {
  BudgetMode,
  ItineraryResult,
  ItineraryWarning,
  ItineraryTemplate,
  PersonaId,
} from './types';
import { COGNITIVE_OPTION, getPersona } from './personas';

/** No persona selected: stay times are used as written and no rest limit applies. */
const P0_STAY_MULTIPLIER = 1.0;
const P0_REST_LIMIT_MINUTES = Number.POSITIVE_INFINITY;

export interface ItineraryQuery {
  budgetMode: BudgetMode;
  personaIds: readonly PersonaId[];
  cognitiveOption: boolean;
  templates: readonly ItineraryTemplate[];
}

/**
 * A selector, not an optimiser. It picks the pre-written template for the chosen
 * time budget and applies the persona corrections.
 *
 * Multipliers are never multiplied together — the largest single one is used.
 * Combining three companions' multipliers makes the day explode to a length
 * nobody would recognise as their trip.
 *
 * Rest minutes are not added to the total. docs/spec/06_suitability.md section 7
 * lists them in the formula but defines no duration, and its own worked example
 * in 07_screens.md S4 sums stay plus transfer only. The rest limit surfaces as a
 * warning instead of an invented number.
 */
export function buildItinerary(query: ItineraryQuery): ItineraryResult | null {
  const template = query.templates.find((t) => t.budgetMode === query.budgetMode);
  if (!template) return null;

  const multipliers = query.personaIds.map((id) => getPersona(id).stayMultiplier);
  if (query.cognitiveOption && query.personaIds.includes('P3')) {
    multipliers.push(COGNITIVE_OPTION.stayMultiplier);
  }
  const stayMultiplier = multipliers.length === 0 ? P0_STAY_MULTIPLIER : Math.max(...multipliers);

  const limits = query.personaIds.map((id) => getPersona(id).restLimitMinutes);
  if (query.cognitiveOption && query.personaIds.includes('P3')) {
    limits.push(COGNITIVE_OPTION.restLimitMinutes);
  }
  const restLimitMinutes = limits.length === 0 ? P0_REST_LIMIT_MINUTES : Math.min(...limits);

  const warnings: ItineraryWarning[] = [];
  const legs = template.orderedPoiSlugs.map((poiSlug, index) => {
    const baseStayMinutes = template.stayMinutes[index] ?? 0;
    const transferToNextMinutes =
      index < template.orderedPoiSlugs.length - 1 ? (template.transferMinutes[index] ?? 0) : null;

    if (transferToNextMinutes !== null && transferToNextMinutes > restLimitMinutes) {
      warnings.push({
        kind: 'transfer_exceeds_rest_limit',
        afterPoiSlug: poiSlug,
        transferMinutes: transferToNextMinutes,
        limitMinutes: restLimitMinutes,
        personaId: tightestSource(query, restLimitMinutes),
      });
    }

    return {
      poiSlug,
      baseStayMinutes,
      adjustedStayMinutes: Math.round(baseStayMinutes * stayMultiplier),
      transferToNextMinutes,
    };
  });

  const totalMinutes =
    legs.reduce((sum, leg) => sum + leg.adjustedStayMinutes, 0) +
    legs.reduce((sum, leg) => sum + (leg.transferToNextMinutes ?? 0), 0);

  return {
    templateId: template.id,
    legs,
    stayMultiplier,
    restLimitMinutes,
    totalMinutes,
    warnings,
  };
}

/**
 * Where the binding limit came from, so the copy can name it. The cognitive option is
 * checked first because its 15 minutes is tighter than any persona's, and attributing
 * it to P3 printed a persona beside a limit that is not P3's.
 */
function tightestSource(
  query: ItineraryQuery,
  restLimitMinutes: number,
): PersonaId | 'P0' | 'cognitive' {
  if (
    query.cognitiveOption &&
    query.personaIds.includes('P3') &&
    restLimitMinutes === COGNITIVE_OPTION.restLimitMinutes
  ) {
    return 'cognitive';
  }
  if (query.personaIds.length === 0) return 'P0';
  let tightest = query.personaIds[0]!;
  for (const id of query.personaIds) {
    if (getPersona(id).restLimitMinutes < getPersona(tightest).restLimitMinutes) tightest = id;
  }
  return tightest;
}
