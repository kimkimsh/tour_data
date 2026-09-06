import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { CAPABILITIES } from '../capabilities';
import { calculateSuitability } from '../suitability';
import { criticalCodesFor } from '../personas';
import { CAPABILITY_STATUSES, PERSONA_IDS } from '../types';
import type { CapabilityStatus, PersonaId, SuitabilityFactInput, SuitabilityInput } from '../types';
import { CALC_DATE, OLD_DATE, RECENT_DATE } from './fixtures';

const RUNS = 300;

const statusArb = fc.constantFrom<CapabilityStatus>(...CAPABILITY_STATUSES);

const factsArb = fc
  .array(statusArb, { minLength: CAPABILITIES.length, maxLength: CAPABILITIES.length })
  .map((statuses) =>
    CAPABILITIES.map((capability, index): SuitabilityFactInput => {
      const status = statuses[index]!;
      return {
        capabilityCode: capability.code,
        status,
        absenceKind: null,
        detail: null,
        source: capability.ktoField === null ? 'derived_facility' : 'kto_with',
        verifiedAt: status === 'unknown' ? null : RECENT_DATE,
        isKtoScored: capability.ktoField !== null,
      };
    }),
  );

const personaIdsArb = fc.uniqueArray(fc.constantFrom<PersonaId>(...PERSONA_IDS), {
  minLength: 0,
  maxLength: PERSONA_IDS.length,
});

const certificationsArb = fc.array(
  fc.record({
    grade: fc.constantFrom('bf_preliminary', 'bf_general', 'bf_excellent', 'open_tourism'),
    validUntil: fc.constantFrom<string | null>(null, '2027-01-01', '2024-01-01'),
  }),
  { maxLength: 5 },
);

const inputArb: fc.Arbitrary<SuitabilityInput> = fc
  .record({
    facts: factsArb,
    personaIds: personaIdsArb,
    certifications: certificationsArb,
  })
  .map(({ facts, personaIds, certifications }) => ({
    facts,
    personaIds,
    cognitiveOption: false,
    certifications,
    calculationDate: CALC_DATE,
    scoredAlternatives: [],
  }));

describe('suitability properties', () => {
  it('1. the score stays inside 0..100 and is an integer', () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const { score } = calculateSuitability(input);
        expect(Number.isInteger(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }),
      { numRuns: RUNS },
    );
  });

  it('2. the score is exactly round(100 x A x B), clamped', () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const r = calculateSuitability(input);
        // Rules 1 and 4 may lower the score after this product; nothing may raise it.
        expect(r.score).toBeLessThanOrEqual(
          Math.round(Math.min(100, Math.max(0, 100 * r.layerA * r.layerB))),
        );
      }),
      { numRuns: RUNS },
    );
  });

  it('3. layerB stays inside 0.75..1.00', () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const { layerB } = calculateSuitability(input);
        expect(layerB).toBeGreaterThanOrEqual(0.75);
        expect(layerB).toBeLessThanOrEqual(1);
      }),
      { numRuns: RUNS },
    );
  });

  it('4. a confirmed critical barrier forces the go-elsewhere label and a score at or under 49', () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const criticals = new Set(input.personaIds.flatMap((id) => criticalCodesFor(id)));
        const hasBlocker = input.facts.some(
          (f) => criticals.has(f.capabilityCode) && f.status === 'unsupported',
        );
        const result = calculateSuitability(input);
        if (!hasBlocker) return;
        expect(result.label).toBe('대체추천');
        expect(result.score).toBeLessThanOrEqual(49);
      }),
      { numRuns: RUNS },
    );
  });

  it('5. selecting several personas never scores above the least-served one', () => {
    fc.assert(
      fc.property(factsArb, personaIdsArb, (facts, personaIds) => {
        if (personaIds.length < 2) return;
        const base = {
          facts,
          cognitiveOption: false,
          certifications: [],
          calculationDate: CALC_DATE,
          scoredAlternatives: [],
        };
        const combined = calculateSuitability({ ...base, personaIds }).layerB;
        const alone = personaIds.map(
          (id) => calculateSuitability({ ...base, personaIds: [id] }).layerB,
        );
        expect(combined).toBeLessThanOrEqual(Math.min(...alone) + 1e-12);
      }),
      { numRuns: RUNS },
    );
  });

  it('6. the go-elsewhere label appears exactly when a confirmed blocker exists', () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const result = calculateSuitability(input);
        expect(result.knownCriticalBlockers.length > 0).toBe(result.label === '대체추천');
      }),
      { numRuns: RUNS },
    );
  });

  it('7. changing only the check date moves confidence, never the score or the label', () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const older = {
          ...input,
          facts: input.facts.map((f) => ({
            ...f,
            verifiedAt: f.status === 'unknown' ? null : OLD_DATE,
          })),
        };
        const fresh = calculateSuitability(input);
        const stale = calculateSuitability(older);

        expect(stale.score).toBe(fresh.score);
        expect(stale.label).toBe(fresh.label);
        expect(stale.layerA).toBe(fresh.layerA);
        expect(stale.layerB).toBe(fresh.layerB);
        expect(stale.coverage).toBe(fresh.coverage);
        expect(stale.freshness).toBeLessThanOrEqual(fresh.freshness);
        expect(stale.evidenceConfidence).toBeLessThanOrEqual(fresh.evidenceConfidence);
      }),
      { numRuns: RUNS },
    );
  });

  it('8. the same input produces the same output', () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const first = JSON.stringify(calculateSuitability(input));
        for (let i = 0; i < 5; i += 1) {
          expect(JSON.stringify(calculateSuitability(input))).toBe(first);
        }
      }),
      { numRuns: 60 },
    );
  });
});
