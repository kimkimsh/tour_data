import { describe, expect, it } from 'vitest';
import {
  foldMidRows,
  foldVilageRows,
  midBaseFor,
  midTaRegionFor,
  readDayCondition,
  vilageBaseFor,
  vilageGridFor,
  type DayForecast,
} from './forecast';

/**
 * Three things here can be wrong without anything else noticing.
 *
 * The issue-time arithmetic decides which forecast we ask for at all, and asking for
 * one that has not been published yet returns an empty body rather than an error — so
 * a wrong base time reads as "no forecast" forever. The fold decides what a day means
 * when the service answers per three-hour step. The verdict decides what a visitor is
 * told, and the direction of its errors is the point: a missing forecast has to reach
 * `unknown`, never `good`.
 */

/** `2026-09-13T21:07+09:00`. Every case fixes the clock so none of this floats. */
function kst(iso: string): Date {
  return new Date(iso);
}

function row(category: string, fcstDate: string, fcstValue: string | number) {
  return { category, fcstDate, fcstValue };
}

const NO_DAY: DayForecast = {
  fcstDate: '20260913',
  tmx: null,
  tmn: null,
  pop: null,
  pty: null,
  sky: null,
};

describe('vilageBaseFor', () => {
  it('takes the issue whose ten-minute publication delay has passed', () => {
    expect(vilageBaseFor(kst('2026-09-13T20:11:00+09:00'))).toEqual({
      baseDate: '20260913',
      baseTime: '2000',
    });
  });

  it('does not take an issue that is on the clock but not yet on the server', () => {
    // 20:09 KST — the 2000 issue exists as a time and has no data behind it.
    expect(vilageBaseFor(kst('2026-09-13T20:09:00+09:00'))).toEqual({
      baseDate: '20260913',
      baseTime: '1700',
    });
  });

  it("falls back to yesterday's 2300 before the day's first issue lands", () => {
    expect(vilageBaseFor(kst('2026-09-13T01:30:00+09:00'))).toEqual({
      baseDate: '20260912',
      baseTime: '2300',
    });
    expect(vilageBaseFor(kst('2026-09-13T02:09:00+09:00'))).toEqual({
      baseDate: '20260912',
      baseTime: '2300',
    });
  });

  it('crosses a month boundary backwards', () => {
    expect(vilageBaseFor(kst('2026-09-01T00:05:00+09:00'))).toEqual({
      baseDate: '20260831',
      baseTime: '2300',
    });
  });

  it('reads the clock in Seoul, not in UTC', () => {
    // A UTC afternoon is already the next day in Seoul, so the issue belongs to the KST
    // date, not the UTC one.
    expect(vilageBaseFor(new Date('2026-09-13T16:30:00Z'))).toEqual({
      baseDate: '20260913',
      baseTime: '2300',
    });
  });
});

describe('midBaseFor', () => {
  it('takes 0600 through the morning and 1800 after six', () => {
    expect(midBaseFor(kst('2026-09-13T09:00:00+09:00'))).toBe('202609130600');
    expect(midBaseFor(kst('2026-09-13T18:00:00+09:00'))).toBe('202609131800');
  });

  it("falls back to yesterday's 1800 before the morning issue", () => {
    expect(midBaseFor(kst('2026-09-13T05:59:00+09:00'))).toBe('202609121800');
  });
});

describe('region lookups', () => {
  it('uses the district representative grid cell, not a POI cell', () => {
    // Gongju has sites in (63,103); the district's published cell is (63,102).
    expect(vilageGridFor('44150')).toEqual({ nx: 63, ny: 102 });
    expect(vilageGridFor('44760')).toEqual({ nx: 59, ny: 99 });
  });

  it('answers null for a district nobody taught it about', () => {
    expect(vilageGridFor('11110')).toBeNull();
    expect(midTaRegionFor('11110')).toBeNull();
  });

  it('holds both 중기기온 codes, which sit in different blocks', () => {
    expect(midTaRegionFor('44150')).toBe('11C20402');
    expect(midTaRegionFor('44760')).toBe('11C20501');
  });
});

describe('foldVilageRows', () => {
  it('keeps the worst 강수형태 of the day, not the first', () => {
    const days = foldVilageRows([
      row('PTY', '20260913', '0'),
      row('PTY', '20260913', '1'),
      row('PTY', '20260913', '0'),
    ]);
    expect(days).toHaveLength(1);
    expect(days[0]?.pty).toBe('1');
  });

  it('keeps the worst 하늘상태 and the highest 강수확률', () => {
    const days = foldVilageRows([
      row('SKY', '20260913', '1'),
      row('SKY', '20260913', '4'),
      row('POP', '20260913', 20),
      row('POP', '20260913', 70),
    ]);
    expect(days[0]?.sky).toBe('4');
    expect(days[0]?.pop).toBe(70);
  });

  it('drops KMA missing markers rather than reading them as temperatures', () => {
    const days = foldVilageRows([row('TMX', '20260913', -999), row('TMN', '20260913', 900)]);
    expect(days[0]?.tmx).toBeNull();
    expect(days[0]?.tmn).toBeNull();
  });

  it('ignores categories it does not read, PCP among them', () => {
    // PCP switches to a qualitative code on the extension day, so it is never read.
    const days = foldVilageRows([row('PCP', '20260913', '2'), row('TMP', '20260913', 19)]);
    expect(days[0]).toEqual({
      fcstDate: '20260913',
      tmx: null,
      tmn: null,
      pop: null,
      pty: null,
      sky: null,
    });
  });

  it('returns one entry per day, in date order', () => {
    const days = foldVilageRows([
      row('POP', '20260915', 10),
      row('POP', '20260913', 20),
      row('POP', '20260914', 30),
    ]);
    expect(days.map((day) => day.fcstDate)).toEqual(['20260913', '20260914', '20260915']);
  });
});

describe('foldMidRows', () => {
  const land = {
    wf4Am: '맑음',
    wf4Pm: '구름많음',
    rnSt4Am: 10,
    rnSt4Pm: 20,
    wf5Am: '구름많음',
    wf5Pm: '구름많음',
    rnSt5Am: 20,
    rnSt5Pm: 20,
    wf8: '흐림',
    rnSt8: 60,
  };
  const ta = { taMin4: 15, taMax4: 27, taMin5: 17, taMax5: 27, taMin8: 18, taMax8: 26 };

  it('splits 오전/오후 through day 7 and stops splitting from day 8', () => {
    const days = foldMidRows(land, ta);
    const day4 = days.find((day) => day.dayOffset === 4);
    const day8 = days.find((day) => day.dayOffset === 8);
    expect(day4?.amWeather).toBe('맑음');
    expect(day4?.pmWeather).toBe('구름많음');
    expect(day8?.amWeather).toBe('흐림');
    expect(day8?.pmWeather).toBe('흐림');
    expect(day8?.amRainPct).toBe(60);
    expect(day8?.pmRainPct).toBe(60);
  });

  it('skips a day the issue does not carry', () => {
    // The 1800 issue starts at day 5; nothing should invent a day 4.
    const { wf4Am, wf4Pm, rnSt4Am, rnSt4Pm, ...evening } = land;
    void wf4Am;
    void wf4Pm;
    void rnSt4Am;
    void rnSt4Pm;
    const { taMin4, taMax4, ...eveningTa } = ta;
    void taMin4;
    void taMax4;
    const days = foldMidRows(evening, eveningTa);
    expect(days.some((day) => day.dayOffset === 4)).toBe(false);
    expect(days.some((day) => day.dayOffset === 5)).toBe(true);
  });

  it('never reaches for a day 3 field, because none exists', () => {
    const days = foldMidRows({ wf3Am: '맑음' }, { taMin3: 10 });
    expect(days).toEqual([]);
  });
});

describe('readDayCondition', () => {
  it('is unknown, not good, when there is no forecast for the day', () => {
    expect(readDayCondition(undefined).state).toBe('unknown');
    expect(readDayCondition(NO_DAY).state).toBe('unknown');
  });

  it('calls rain poor and says what it does to the ground', () => {
    const verdict = readDayCondition({ ...NO_DAY, pty: '1', pop: 80, sky: '4', tmx: 22 });
    expect(verdict.state).toBe('poor');
    expect(verdict.detail).toContain('비');
    expect(verdict.detail).toContain('비포장');
  });

  it('ranks precipitation above heat', () => {
    const verdict = readDayCondition({ ...NO_DAY, pty: '1', tmx: 35 });
    expect(verdict.detail).toContain('비포장');
  });

  it('calls a hot day poor and refuses to call it a 폭염 특보', () => {
    const verdict = readDayCondition({ ...NO_DAY, pty: '0', tmx: 34, sky: '1' });
    expect(verdict.state).toBe('poor');
    expect(verdict.detail).toContain('34℃');
    expect(verdict.detail).toContain('폭염 특보 판정이 아닙니다');
  });

  it('leaves a warm day alone below the reference temperature', () => {
    expect(readDayCondition({ ...NO_DAY, pty: '0', tmx: 32, sky: '1' }).state).toBe('good');
  });

  it('calls a cold day poor and refuses to call it a 한파 특보', () => {
    const verdict = readDayCondition({ ...NO_DAY, pty: '0', tmn: -13, sky: '1' });
    expect(verdict.state).toBe('poor');
    expect(verdict.detail).toContain('한파 특보 판정이 아닙니다');
  });

  it('calls a high 강수확률 caution even with no 강수형태 yet', () => {
    const verdict = readDayCondition({ ...NO_DAY, pty: '0', pop: 60, sky: '4' });
    expect(verdict.state).toBe('caution');
    expect(verdict.detail).toContain('60%');
  });

  it('is good on a dry day and names the numbers behind the verdict', () => {
    const verdict = readDayCondition({ ...NO_DAY, pty: '0', pop: 10, sky: '1', tmx: 24, tmn: 15 });
    expect(verdict.state).toBe('good');
    expect(verdict.detail).toContain('맑음');
    expect(verdict.detail).toContain('최고 24℃');
    expect(verdict.unknownReason).toBeNull();
  });
});
