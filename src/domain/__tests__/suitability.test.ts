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
  it('holds 32 capabilities, 24 of them KTO-scored', () => {
    expect(CAPABILITIES).toHaveLength(32);
    expect(CAPABILITIES.filter((c) => c.ktoField !== null)).toHaveLength(24);
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
    expect(blocked.knownCriticalBlockers).toEqual(['elevator']);

    const partial = run('critical-partial-not-blocked');
    expect(partial.label).not.toBe('대체추천');
    expect(partial.knownCriticalBlockers).toEqual([]);

    const low = run('low-score-not-blocked');
    expect(low.knownCriticalBlockers).toEqual([]);
    expect(low.label).toBe('주의');
    expect(low.unknownCriticals).toContain('elevator');
  });

  it('one unknown critical out of five caps the label without hiding the score', () => {
    const result = run('critical-unknown-minority');
    expect(result.label).toBe('주의');
    expect(result.unknownCriticals).toEqual(['elevator']);
  });

  it('a majority of unknown criticals hides the verdict', () => {
    expect(run('critical-unknown-majority').label).toBe('정보없음');
  });

  it('exactly half unknown is not a majority', () => {
    const result = run('critical-unknown-boundary');
    expect(result.unknownCriticals).toHaveLength(1);
    expect(result.label).toBe('주의');
  });

  it('coverage below the threshold caps the label even at a high score', () => {
    const result = run('coverage-cap');
    expect(result.unknownCriticals).toEqual([]);
    expect(result.coverage).toBeLessThan(0.65);
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.label).toBe('주의');
  });

  it('coverage exactly at the threshold does not cap', () => {
    const result = run('coverage-boundary');
    expect(result.coverage).toBeCloseTo(0.65, 12);
    expect(result.label).toBe('방문가능');
  });

  it('certification cannot lift the label across a band boundary', () => {
    const result = run('layer-c-guard');
    expect(result.layerC).toBeGreaterThan(1);
    expect(result.score).toBeGreaterThan(74);
    expect(result.label).toBe('주의');
  });

  it('certification bonus is capped', () => {
    expect(run('layer-c-cap').layerC).toBeCloseTo(1.12, 12);
    expect(run('no-certifications').layerC).toBe(1);
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

  it('not_applicable leaves the denominator instead of scoring 0.35', () => {
    const result = run('not-applicable-excluded');
    expect(result.ktoTotalCount).toBe(22);
    const facility = result.axes.find((a) => a.axis === 'facility');
    expect(facility?.totalCount).toBe(5);
    expect(facility?.rawScore).toBeCloseTo(1, 12);
  });

  it('the same input produces the same output a hundred times over', () => {
    const found = goldenCases().find((c) => c.name === 'determinism')!;
    const first = JSON.stringify(calculateSuitability(found.input));
    for (let i = 0; i < 100; i += 1) {
      expect(JSON.stringify(calculateSuitability(found.input))).toBe(first);
    }
  });
});
