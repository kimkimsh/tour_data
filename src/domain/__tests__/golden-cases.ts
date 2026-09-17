import { CAPABILITIES } from '../capabilities';
import { calculateSuitability } from '../suitability';
import { relevantCodesFor } from '../personas';
import type { AlternativePoi, CapabilityStatus, PersonaId, SuitabilityFactInput, SuitabilityInput } from '../types';
import { CALC_DATE, OLD_DATE, RECENT_DATE, facts, input, withPersonas } from './fixtures';

export interface GoldenCase {
  name: string;
  input: SuitabilityInput;
}

const ALL_SUPPORTED = () => facts('supported');

function unknownOn(codes: string[], base: CapabilityStatus = 'supported'): SuitabilityFactInput[] {
  return facts(
    base,
    Object.fromEntries(codes.map((code) => [code, { status: 'unknown' as CapabilityStatus }])),
  );
}

/**
 * Marks the first `count` capabilities that are relevant to `personaId` but not
 * critical for it as unknown. Drives coverage down while leaving every critical
 * known, which is what separates "we have not checked much" from "we have not
 * checked what this visitor depends on" — v6 answers those two differently.
 */
function coverageCase(personaId: PersonaId, unknownSupportingCount: number): SuitabilityFactInput[] {
  const criticals = new Set(PERSONA_CRITICALS[personaId]);
  const supportingOnly = relevantCodesFor([personaId]).filter((code) => !criticals.has(code));
  return unknownOn(supportingOnly.slice(0, unknownSupportingCount));
}

const PERSONA_CRITICALS: Record<PersonaId, string[]> = {
  P1a: ['access_route', 'entrance_passage', 'wheelchair', 'elevator', 'restroom'],
  P1b: ['access_route', 'entrance_passage', 'elevator', 'restroom'],
  P2a: [
    'help_dog',
    'braille_block',
    'guide_system',
    'audio_guide',
    'big_print',
    'braille_promotion',
    'guide_human',
  ],
  P2b: ['sign_guide', 'video_caption'],
  P3: ['restroom', 'stroller'],
};

/**
 * Searches the fact space for an input whose score is exactly `target`.
 *
 * The 74/75 pair cannot be written by hand: score is a step function of which
 * capabilities carry which status, and the axis weights make the steps uneven.
 * The sweep walks a rotating catalogue order, filling s items with supported and
 * the next p with partial, and keeps the first assignment that also leaves every
 * item the verdict rests on known — otherwise rule 3 answers before the band does
 * and the case proves nothing about the band.
 */
const scoreInputCache = new Map<number, SuitabilityInput>();

export function findScoreInput(target: number): SuitabilityInput {
  const cached = scoreInputCache.get(target);
  if (cached) return cached;
  const codes = CAPABILITIES.map((c) => c.code);
  for (let rotation = 0; rotation < codes.length; rotation += 1) {
    const order = [...codes.slice(rotation), ...codes.slice(0, rotation)];
    for (let supported = 0; supported <= order.length; supported += 1) {
      for (let partial = 0; partial + supported <= order.length; partial += 1) {
        const overrides: Record<string, { status: CapabilityStatus }> = {};
        order.forEach((code, index) => {
          if (index < supported) overrides[code] = { status: 'supported' };
          else if (index < supported + partial) overrides[code] = { status: 'partial' };
          else overrides[code] = { status: 'unknown' };
        });
        const candidate = input({ facts: facts('unknown', overrides), personaIds: [] });
        const result = calculateSuitability(candidate);
        if (result.score !== target) continue;
        if (result.unknownCriticals.length > 0) continue;
        scoreInputCache.set(target, candidate);
        return candidate;
      }
    }
  }
  throw new Error(`no fact assignment produces a score of exactly ${target}`);
}

// The scoreboard filters candidates to one city before they get here, so every
// fixture is already in the same city as the place under test.
const ALTERNATIVES_ALL_CAUTION: AlternativePoi[] = [
  { poiSlug: 'busosanseong', title: '부소산성', score: 52, label: '주의', city: '부여군' },
  { poiSlug: 'jeongnimsaji', title: '정림사지', score: 48, label: '주의', city: '부여군' },
];

const ALTERNATIVES_WITH_BETTER: AlternativePoi[] = [
  { poiSlug: 'gongju-national-museum', title: '국립공주박물관', score: 81, label: '방문가능', city: '부여군' },
  ...ALTERNATIVES_ALL_CAUTION,
];

export function goldenCases(): GoldenCase[] {
  return [
    { name: 'p1a-all-supported', input: withPersonas(['P1a'], ALL_SUPPORTED()) },
    { name: 'p1b-all-supported', input: withPersonas(['P1b'], ALL_SUPPORTED()) },
    { name: 'p2a-all-supported', input: withPersonas(['P2a'], ALL_SUPPORTED()) },
    { name: 'p2b-all-unknown', input: withPersonas(['P2b'], facts('unknown')) },
    { name: 'p3-all-supported', input: withPersonas(['P3'], ALL_SUPPORTED()) },
    {
      name: 'multi-persona-min',
      input: withPersonas(
        ['P1a', 'P1b', 'P3'],
        facts('supported', {
          access_route: { status: 'partial' },
          entrance_passage: { status: 'partial' },
          wheelchair: { status: 'partial' },
          elevator: { status: 'partial' },
        }),
      ),
    },
    {
      name: 'critical-unsupported',
      input: withPersonas(['P1a'], facts('supported', { elevator: { status: 'unsupported' } })),
    },
    {
      name: 'critical-unknown-minority',
      input: withPersonas(['P1a'], unknownOn(['elevator'])),
    },
    {
      name: 'critical-unknown-majority',
      input: withPersonas(['P1a'], unknownOn(['access_route', 'entrance_passage', 'elevator'])),
    },
    {
      name: 'critical-unknown-boundary',
      input: withPersonas(['P2b'], unknownOn(['sign_guide'])),
    },
    // v5 capped the label at 주의 whenever coverage fell under 0.65, which charged the
    // same absence a second time and, on the real corpus, fired every time. These two
    // hold the replacement rule still: an unchecked item the visitor does not depend on
    // moves coverage and confidence and leaves the score and the label alone.
    { name: 'low-coverage-criticals-known', input: withPersonas(['P1a'], coverageCase('P1a', 5)) },
    { name: 'low-coverage-criticals-known-more', input: withPersonas(['P1a'], coverageCase('P1a', 8)) },
    // No condition chosen, so the verdict rests on GENERAL_VERDICT_CODES. The pair is
    // the regression guard for the defect that prompted v6: under v5 no assignment of
    // statuses could reach 방문가능, because unknown items held the score under the band.
    {
      name: 'general-verdict-reachable',
      input: input({
        facts: facts('unknown', {
          access_route: { status: 'supported', verifiedAt: RECENT_DATE },
          entrance_passage: { status: 'supported', verifiedAt: RECENT_DATE },
          elevator: { status: 'supported', verifiedAt: RECENT_DATE },
          restroom: { status: 'supported', verifiedAt: RECENT_DATE },
        }),
      }),
    },
    {
      name: 'general-verdict-one-unknown',
      input: input({
        facts: facts('unknown', {
          access_route: { status: 'supported', verifiedAt: RECENT_DATE },
          entrance_passage: { status: 'supported', verifiedAt: RECENT_DATE },
          restroom: { status: 'supported', verifiedAt: RECENT_DATE },
        }),
      }),
    },
    {
      name: 'stale-data',
      input: withPersonas(['P1a'], facts('supported', {}, OLD_DATE)),
    },
    {
      name: 'alternatives-by-label',
      input: withPersonas(['P1a'], unknownOn(['elevator']), {
        scoredAlternatives: ALTERNATIVES_WITH_BETTER,
      }),
    },
    {
      name: 'alternatives-none-better',
      input: withPersonas(['P1a'], unknownOn(['elevator']), {
        scoredAlternatives: ALTERNATIVES_ALL_CAUTION,
      }),
    },
    {
      // The counter-example that DEC-7 was decided on: four criticals confirmed
      // supported, nothing confirmed absent, and the old rule handed it the
      // "go elsewhere" label anyway.
      name: 'low-score-not-blocked',
      input: withPersonas(
        ['P1a'],
        facts('unknown', {
          access_route: { status: 'supported', verifiedAt: RECENT_DATE },
          entrance_passage: { status: 'supported', verifiedAt: RECENT_DATE },
          wheelchair: { status: 'supported', verifiedAt: RECENT_DATE },
          restroom: { status: 'supported', verifiedAt: RECENT_DATE },
          parking: { status: 'supported', verifiedAt: RECENT_DATE },
        }),
      ),
    },
    { name: 'determinism', input: withPersonas(['P1a', 'P2b'], unknownOn(['elevator', 'sign_guide'])) },
    { name: 'zero-score-clamp', input: withPersonas(['P1a'], facts('unsupported')) },
    { name: 'all-partial', input: input({ facts: facts('partial') }) },
    {
      name: 'critical-partial-not-blocked',
      input: withPersonas(['P1a'], facts('supported', { elevator: { status: 'partial' } })),
    },
    { name: 'all-unknown-p0', input: input({ facts: facts('unknown') }) },
    { name: 'boundary-74', input: findScoreInput(74) },
    { name: 'boundary-75', input: findScoreInput(75) },
    {
      // A POI type where the room capabilities cannot exist. They leave the
      // denominator instead of scoring 0.35, so ktoTotalCount is not 24.
      name: 'not-applicable-excluded',
      input: withPersonas(
        ['P1a'],
        facts('supported', {
          room: { status: 'unknown', absenceKind: 'not_applicable' },
          hearing_room: { status: 'unknown', absenceKind: 'not_applicable' },
        }),
      ),
    },
    {
      // A companion whose whole critical set cannot exist here. Rule 2 has nothing to
      // take a ratio over, and the answer is still "no verdict for that person" — not
      // a badge earned on the other companion's items. Alone this case is 정보없음
      // through the requiredFacts.length === 0 arm; paired it used to come out 방문가능
      // with the deaf visitor's basis silently gone.
      name: 'critical-set-all-not-applicable-pair',
      input: withPersonas(
        ['P2b', 'P1a'],
        facts('supported', {
          sign_guide: { status: 'unknown', absenceKind: 'not_applicable' },
          video_caption: { status: 'unknown', absenceKind: 'not_applicable' },
        }),
      ),
    },
    {
      // noVerdictBasis names the companion the rule fired on, not the union. Here P2b
      // is 2 of 2 unknown and P1a is 0 of 5, so the union ratio is 2/7 — under the half
      // the rule tests, which is the number the screen used to print.
      name: 'no-verdict-basis-names-the-companion',
      input: withPersonas(['P1a', 'P2b'], unknownOn(['sign_guide', 'video_caption'])),
    },
    {
      // The middle freshness bucket, and both of its edges. Every other case sits at
      // 50 days or 476, so the 0.9 constant and the 90/365 boundaries were unpinned:
      // changing 0.9 to any other value left the suite green.
      name: 'freshness-middle-bucket',
      input: input({
        facts: facts('supported', {
          access_route: { verifiedAt: '2026-06-22' }, // 90 days: top bucket, inclusive
          entrance_passage: { verifiedAt: '2026-06-21' }, // 91 days: middle bucket
          elevator: { verifiedAt: '2025-09-20' }, // 365 days: middle bucket, inclusive
          restroom: { verifiedAt: '2025-09-19' }, // 366 days: oldest bucket
        }),
      }),
    },
  ];
}

export const GOLDEN_CALC_DATE = CALC_DATE;
