import { CAPABILITIES, CONTEXT_VALIDITY_DAYS } from '../capabilities';
import type {
  AbsenceKind,
  CapabilityStatus,
  PersonaId,
  SuitabilityFactInput,
  SuitabilityInput,
} from '../types';

export const CALC_DATE = '2026-09-20';
export const RECENT_DATE = '2026-08-01';
export const OLD_DATE = '2025-06-01';

export interface FactOverride {
  status?: CapabilityStatus;
  absenceKind?: AbsenceKind | null;
  verifiedAt?: string | null;
  detail?: string | null;
}

/**
 * Builds one fact per capability in the catalogue. Tests state only what differs from the
 * baseline, so a case reads as the one thing it is about.
 */
export function facts(
  baseStatus: CapabilityStatus,
  overrides: Record<string, FactOverride> = {},
  baseVerifiedAt: string | null = RECENT_DATE,
): SuitabilityFactInput[] {
  return CAPABILITIES.map((capability) => {
    const override = overrides[capability.code] ?? {};
    const status = override.status ?? baseStatus;
    return {
      capabilityCode: capability.code,
      status,
      absenceKind: override.absenceKind ?? null,
      detail: override.detail ?? null,
      source: capability.ktoField === null ? 'derived_facility' : 'kto_with',
      /*
        Context items are dated today unless a case says otherwise. They describe a
        moment rather than a building, so isStaleContext turns a reading older than its
        window into `unknown` — and with one shared date every case named
        facts('supported') quietly stopped meaning it, for reasons that had nothing to
        do with what the case was about. A nightly run writes today's context anyway.
      */
      verifiedAt:
        override.verifiedAt !== undefined
          ? override.verifiedAt
          : status === 'unknown'
            ? null
            : CONTEXT_VALIDITY_DAYS[capability.code] !== undefined
              ? CALC_DATE
              : baseVerifiedAt,
      isKtoScored: capability.ktoField !== null,
    };
  });
}

export function input(partial: Partial<SuitabilityInput> = {}): SuitabilityInput {
  return {
    facts: partial.facts ?? facts('supported'),
    personaIds: partial.personaIds ?? [],
    cognitiveOption: partial.cognitiveOption ?? false,
    calculationDate: partial.calculationDate ?? CALC_DATE,
    scoredAlternatives: partial.scoredAlternatives ?? [],
  };
}

export function withPersonas(
  personaIds: PersonaId[],
  factList: SuitabilityFactInput[],
  extra: Partial<SuitabilityInput> = {},
): SuitabilityInput {
  return input({ personaIds, facts: factList, ...extra });
}
