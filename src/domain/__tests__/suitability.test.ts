import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { calculateSuitability } from '../suitability';
import { assertPersonaMatrix } from '../personas';
import { CAPABILITIES } from '../capabilities';
import { findScoreInput, goldenCases } from './golden-cases';
import { RECENT_DATE, facts, withPersonas } from './fixtures';
import type { SuitabilityResult } from '../types';

const GOLDEN_DIR = join(dirname(fileURLToPath(import.meta.url)), '__golden__');
const UPDATE = process.env.UPDATE_GOLDEN === '1';

/**
 * Golden files pin the whole result so a silent numeric change fails loudly.
 * They cannot, on their own, prove the first implementation right — that is what
 * the "spec properties" block below is for, and what the property suite covers.
 */
function checkGolden(name: string, input: unknown, actual: SuitabilityResult): void {
  const file = join(GOLDEN_DIR, `${name}.json`);
  const record = { name, input, expected: actual };
  if (UPDATE || !existsSync(file)) {
    mkdirSync(GOLDEN_DIR, { recursive: true });
    writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    return;
  }
  const stored = JSON.parse(readFileSync(file, 'utf8')) as { expected: SuitabilityResult };
  expect(actual).toEqual(stored.expected);
}

describe('capability catalogue', () => {
  it('holds 30 capabilities, 23 of them KTO-scored', () => {
    expect(CAPABILITIES).toHaveLength(30);
    expect(CAPABILITIES.filter((c) => c.ktoField !== null)).toHaveLength(23);
  });

  it('has unique codes and unique KTO field names', () => {
    const codes = CAPABILITIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    const fields = CAPABILITIES.map((c) => c.ktoField).filter((f): f is string => f !== null);
    expect(new Set(fields).size).toBe(fields.length);
  });

  it('satisfies the persona matrix invariants', () => {
    expect(() => assertPersonaMatrix()).not.toThrow();
  });
});

describe('golden cases', () => {
  for (const testCase of goldenCases()) {
    it(testCase.name, () => {
      const result = calculateSuitability(testCase.input);
      checkGolden(testCase.name, testCase.input, result);
    });
  }
});

describe('spec properties the golden files must keep', () => {
  const run = (name: string) => {
    const found = goldenCases().find((c) => c.name === name);
    if (!found) throw new Error(`unknown golden case: ${name}`);
    return calculateSuitability(found.input);
  };

  it('every persona scores 100 when everything is supported', () => {
    for (const name of [
      'p1a-all-supported',
      'p1b-all-supported',
      'p2a-all-supported',
      'p3-all-supported',
    ]) {
      const result = run(name);
      expect(result.score).toBe(100);
      expect(result.label).toBe('방문가능');
    }
  });

  it('both deaf criticals unknown hides the score', () => {
    const result = run('p2b-all-unknown');
    expect(result.label).toBe('정보없음');
    expect(result.unknownCriticals).toEqual(['sign_guide', 'video_caption']);
  });

  it('multiple personas use the least-served fit', () => {
    const combined = run('multi-persona-min');
    const alone = (['P1a', 'P1b', 'P3'] as const).map(
      (id) =>
        calculateSuitability(
          withPersonas(
            [id],
            facts('supported', {
              access_route: { status: 'partial' },
              entrance_passage: { status: 'partial' },
              wheelchair: { status: 'partial' },
              elevator: { status: 'partial' },
            }),
          ),
        ).layerB,
    );
    expect(combined.layerB).toBeCloseTo(Math.min(...alone), 12);
  });

  it('a confirmed critical barrier is the only route to the go-elsewhere label', () => {
    const blocked = run('critical-unsupported');
    expect(blocked.label).toBe('대체추천');
    expect(blocked.score).toBeLessThanOrEqual(49);
    expect(blocked.knownCriticalBlockers).toEqual(['path_continuity']);

    const partial = run('critical-partial-not-blocked');
    expect(partial.label).not.toBe('대체추천');
    expect(partial.knownCriticalBlockers).toEqual([]);
    // v7: not a blocker, but not clear either. It caps at 주의 and the screen names it.
    expect(partial.label).toBe('주의');
    expect(partial.partialCriticals).toEqual(['path_continuity']);

    const low = run('low-score-not-blocked');
    expect(low.knownCriticalBlockers).toEqual([]);
    expect(low.label).toBe('주의');
    expect(low.unknownCriticals).toContain('path_continuity');
  });

  it('one unknown critical out of five caps the label without hiding the score', () => {
    const result = run('critical-unknown-minority');
    expect(result.label).toBe('주의');
    expect(result.unknownCriticals).toEqual(['path_continuity']);
  });

  it('a majority of unknown criticals hides the verdict', () => {
    expect(run('critical-unknown-majority').label).toBe('정보없음');
  });

  it('exactly half unknown is not a majority', () => {
    const result = run('critical-unknown-boundary');
    expect(result.unknownCriticals).toHaveLength(1);
    expect(result.label).toBe('주의');
  });

  it('an unchecked item the visitor does not depend on moves coverage, not the score', () => {
    const fewer = run('low-coverage-criticals-known');
    const more = run('low-coverage-criticals-known-more');

    expect(fewer.unknownCriticals).toEqual([]);
    expect(more.unknownCriticals).toEqual([]);
    // Three more unknowns, none of them critical for this persona.
    expect(more.coverage).toBeLessThan(fewer.coverage);
    expect(more.evidenceConfidence).toBeLessThan(fewer.evidenceConfidence);
    // The assertions that fail if the coverage cap is reintroduced.
    expect(more.score).toBe(fewer.score);
    expect(more.label).toBe(fewer.label);
    expect(more.coverage).toBeLessThan(0.65);
    expect(more.label).toBe('방문가능');
  });

  it('a verdict is reachable with no condition chosen', () => {
    // The defect v6 exists to remove: under v5 the model's ceiling on data this sparse
    // was 62 while the band needed 75, so 방문가능 could not be produced by any input.
    const reachable = run('general-verdict-reachable');
    expect(reachable.requiredCodes).toEqual([
      'access_route',
      'entrance_passage',
      'path_continuity',
      'restroom',
    ]);
    expect(reachable.unknownCriticals).toEqual([]);
    expect(reachable.score).toBeGreaterThanOrEqual(75);
    expect(reachable.label).toBe('방문가능');

    // One of those four unchecked, nothing else changed.
    const capped = run('general-verdict-one-unknown');
    expect(capped.unknownCriticals).toEqual(['path_continuity']);
    expect(capped.label).toBe('주의');
  });

  it('the score is exactly A x B — nothing else multiplies it', () => {
    // v5 dropped the certification layer. This is the assertion that would fail if a
    // third factor were reintroduced without the spec being changed with it.
    for (const name of ['boundary-74', 'boundary-75', 'all-partial'] as const) {
      const r = run(name);
      expect(r.score).toBe(Math.round(Math.min(100, Math.max(0, 100 * r.layerA * r.layerB))));
    }
  });

  it('stale data changes confidence only, never the score or the label', () => {
    const stale = run('stale-data');
    const fresh = calculateSuitability(withPersonas(['P1a'], facts('supported', {}, RECENT_DATE)));
    expect(stale.freshness).toBeCloseTo(0.75, 12);
    expect(stale.score).toBe(fresh.score);
    expect(stale.label).toBe(fresh.label);
    expect(stale.evidenceConfidence).toBeLessThan(fresh.evidenceConfidence);
  });

  it('alternatives are chosen by label, not by score', () => {
    const withBetter = run('alternatives-by-label');
    expect(withBetter.alternatives.map((a) => a.poiSlug)).toEqual(['gongju-national-museum']);

    const noneBetter = run('alternatives-none-better');
    expect(noneBetter.alternatives).toEqual([]);
  });

  it('all-partial reproduces the arithmetic stated in the spec', () => {
    const result = run('all-partial');
    expect(result.layerA).toBeCloseTo(0.5, 12);
    expect(result.layerB).toBeCloseTo(0.875, 12);
    expect(result.score).toBe(44);
    expect(result.label).toBe('주의');
  });

  it('all-unknown with no persona selected yields no verdict', () => {
    const result = run('all-unknown-p0');
    expect(result.coverage).toBe(0);
    expect(result.label).toBe('정보없음');
  });

  it('the score floor is zero, not a negative number', () => {
    const result = run('zero-score-clamp');
    expect(result.score).toBe(0);
    expect(result.label).toBe('대체추천');
  });

  it('the band boundary sits exactly between 74 and 75', () => {
    const below = calculateSuitability(findScoreInput(74));
    const above = calculateSuitability(findScoreInput(75));
    expect(below.score).toBe(74);
    expect(below.label).toBe('주의');
    expect(above.score).toBe(75);
    expect(above.label).toBe('방문가능');
  });

  it('unknown leaves the denominator, the way not_applicable does', () => {
    const all = run('p1a-all-supported');
    const someUnknown = calculateSuitability(
      withPersonas(
        ['P1a'],
        facts('supported', {
          parking: { status: 'unknown' },
          nursing_room: { status: 'unknown' },
          baby_chair: { status: 'unknown' },
        }),
      ),
    );
    expect(someUnknown.score).toBe(all.score);
    expect(someUnknown.layerA).toBeCloseTo(all.layerA, 12);
    const facility = someUnknown.axes.find((a) => a.axis === 'facility');
    // The three unknowns are all on the facility axis; its mean is taken over what is left.
    expect(facility?.knownCount).toBe(4);
    expect(facility?.totalCount).toBe(7);
    expect(facility?.rawScore).toBeCloseTo(1, 12);
  });

  it('an axis with nothing known leaves the weighted sum and keeps its row', () => {
    const result = calculateSuitability(
      withPersonas(
        ['P1a'],
        facts('supported', {
          crowd_forecast: { status: 'unknown' },
          weather_warning: { status: 'unknown' },
          weather_forecast: { status: 'unknown' },
        }),
      ),
    );
    const context = result.axes.find((a) => a.axis === 'context');
    expect(context?.knownCount).toBe(0);
    expect(context?.weight).toBe(0);
    expect(context?.totalCount).toBe(3);
    // The other five weights are scaled back to 1.00, so an all-supported remainder
    // still scores 100 rather than losing the context axis's 0.10.
    expect(result.axes.reduce((sum, a) => sum + a.weight, 0)).toBeCloseTo(1, 12);
    expect(result.score).toBe(100);
  });

  it('not_applicable leaves the denominator, and is not counted as an item', () => {
    const result = run('not-applicable-excluded');
    // 23 KTO-scored fields less the two guest-room ones this kind of place cannot have.
    expect(result.ktoTotalCount).toBe(21);
    const facility = result.axes.find((a) => a.axis === 'facility');
    expect(facility?.totalCount).toBe(5);
    expect(facility?.rawScore).toBeCloseTo(1, 12);
  });

  /**
   * The label comparison exists so a blocked place is never offered as somewhere to
   * go instead. Admitting equal labels let the "go elsewhere" set recommend itself.
   */
  it('never offers a blocked place as the alternative to a blocked place', () => {
    const blocked = withPersonas(['P1a'], facts('unknown', { path_continuity: { status: 'unsupported' } }), {
      scoredAlternatives: [
        { poiSlug: 'busosanseong', title: '부소산성', label: '대체추천', score: 45 , city: '부여군' },
        { poiSlug: 'jeongnimsaji', title: '정림사지', label: '대체추천', score: 40 , city: '부여군' },
        { poiSlug: 'gongsanseong', title: '공산성', label: '주의', score: 52 , city: '부여군' },
      ],
    });
    const result = calculateSuitability(blocked);
    expect(result.label).toBe('대체추천');
    expect(result.alternatives.map((a) => a.poiSlug)).toEqual(['gongsanseong']);
  });

  /**
   * A persona whose whole critical set turned out not to apply has nothing to judge
   * on. Guarding the no-verdict arm on the persona count instead of on the critical
   * set left that case with a printed score over an empty evidence base.
   */
  it('gives no verdict when every critical item does not apply to this place', () => {
    const excluded = withPersonas(
      ['P3'],
      facts('unknown', {
        restroom: { absenceKind: 'not_applicable' },
        stroller: { absenceKind: 'not_applicable' },
      }),
    );
    const result = calculateSuitability(excluded);
    expect(result.coverage).toBe(0);
    expect(result.label).toBe('정보없음');
  });

  /**
   * Layer B takes the least-served companion, and the home screen tells the visitor the
   * verdict follows whoever needs the most support. The no-verdict rule took its ratio
   * over the union of the companions' critical sets instead, so a companion the place
   * happens to serve well diluted the denominator: with both of a deaf visitor's
   * critical items unknown, P2b alone gave 정보없음 and hid the score, and P2b with a
   * wheelchair-using companion gave 주의 and a 95 — on identical evidence, because 2 of
   * the combined 7 is not a majority even though it is all of what that visitor needs.
   */
  it('a well-served companion cannot dilute another companion\'s unknowns', () => {
    const blindSpot = facts('supported', {
      sign_guide: { status: 'unknown' },
      video_caption: { status: 'unknown' },
    });
    const alone = calculateSuitability(withPersonas(['P2b'], blindSpot));
    const together = calculateSuitability(withPersonas(['P2b', 'P1a'], blindSpot));

    expect(alone.label).toBe('정보없음');
    expect(together.label).toBe('정보없음');
    expect(together.unknownCriticals).toEqual(alone.unknownCriticals);
  });

  it('the same input produces the same output a hundred times over', () => {
    const found = goldenCases().find((c) => c.name === 'determinism')!;
    const first = JSON.stringify(calculateSuitability(found.input));
    for (let i = 0; i < 100; i += 1) {
      expect(JSON.stringify(calculateSuitability(found.input))).toBe(first);
    }
  });
});
