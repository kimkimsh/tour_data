import { CAPABILITIES } from '../capabilities';
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
 * Builds a full 32-capability fact array. Tests state only what differs from the
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
      verifiedAt:
        override.verifiedAt !== undefined
          ? override.verifiedAt
          : status === 'unknown'
            ? null
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
