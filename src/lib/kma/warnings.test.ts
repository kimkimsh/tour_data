import { describe, expect, it } from 'vitest';
import { readWarningFor, type WarningState } from './warnings';

/**
 * The second place in this project where a Korean string becomes a machine verdict —
 * resolveStatus is the other — and the one where being wrong is a safety failure
 * rather than a wrong score. Nothing else can catch it: the golden suitability cases
 * receive a status directly and never see the sentence that produced it.
 *
 * Every string below is either KMA's own published sample or the documented shape of
 * one. The strings that are inferred rather than captured are marked, because the day
 * a real 충남 bulletin arrives they are the ones to check first.
 */
const GONGJU = { districtNames: ['공주'], provinceNames: ['충청남도', '충남'] } as const;
const BUYEO = { districtNames: ['부여'], provinceNames: ['충청남도', '충남'] } as const;

/** KMA's own guide sample, verbatim — note the missing separator before `o 풍랑주의보`. */
const KMA_SAMPLE =
  'o 강풍주의보 : 울릉도.독도, 전라남도(거문도.초도)o 풍랑주의보 : 남해서부동쪽먼바다, 남해동부먼바다, 동해중부먼바다, 동해남부먼바다';

const CASES: ReadonlyArray<readonly [string, string, WarningState, string]> = [
  ['', '빈 문자열', 'none', 'nothing in force anywhere'],
  ['없음', '없음 한 단어', 'none', "KMA's all-clear"],
  ['o 없음', 'o 없음', 'none', 'the same with a clause marker'],
  [KMA_SAMPLE, 'KMA 공식 샘플 (섬·바다만)', 'none', 'our province is not named at all'],
  [
    'o 폭염경보 : 충청남도(공주, 부여, 청양)',
    '시군구를 직접 지명 [추정 형태]',
    'in_force',
    'the district is named outside any exclusion',
  ],
  [
    'o 호우주의보 : 충청남도(공주)o 강풍주의보 : 제주도',
    '구분자 없이 이어진 두 절 [추정 형태]',
    'in_force',
    'the clause split has to find the first one',
  ],
  [
    'o 폭염경보 : 충청남도',
    '도 이름만',
    'unknown',
    'applies to us for all we can tell, but the bulletin does not say',
  ],
  [
    'o 한파주의보 : 충남 북부내륙',
    '도의 하위 구역 [추정 형태]',
    'unknown',
    'a sub-region whose membership we do not hold',
  ],
  [
    'o 폭염경보 : 충청남도(서산, 태안 제외)',
    '다른 시군구를 제외',
    'unknown',
    'we are probably included, but 제외 makes a substring read unreliable',
  ],
  [
    'o 대설주의보 : 강원도, 경상북도',
    '다른 도',
    'none',
    'our province is genuinely absent',
  ],
];

describe('readWarningFor', () => {
  for (const [t6, name, expected, why] of CASES) {
    it(`${name} → ${expected} (${why})`, () => {
      expect(readWarningFor(t6, GONGJU).state).toBe(expected);
    });
  }

  it('names 부여 and 공주 independently', () => {
    const t6 = 'o 폭염경보 : 충청남도(부여, 서천)';
    expect(readWarningFor(t6, BUYEO).state).toBe('in_force');
    // The other district is not in that list, but the province is — so unknown, never none.
    expect(readWarningFor(t6, GONGJU).state).toBe('unknown');
  });

  it('returns the clause verbatim rather than a summary', () => {
    const result = readWarningFor('o 폭염경보 : 충청남도(공주, 부여)', GONGJU);
    expect(result.warning).toBe('폭염경보 : 충청남도(공주, 부여)');
  });

  it('joins every clause that names us, so a second warning is not dropped', () => {
    const result = readWarningFor(
      'o 폭염경보 : 충청남도(공주)o 호우주의보 : 충청남도(공주, 부여)',
      GONGJU,
    );
    expect(result.warning).toContain('폭염경보');
    expect(result.warning).toContain('호우주의보');
  });

  it('marks a province-level answer as province scope', () => {
    expect(readWarningFor('o 폭염경보 : 충청남도', GONGJU).scope).toBe('province');
    expect(readWarningFor('o 폭염경보 : 충청남도(공주)', GONGJU).scope).toBe('district');
  });

  /**
   * The invariant the whole module exists for. Being wrong toward `unknown` costs a
   * visitor a "we could not check" line; being wrong toward `none` sends them out
   * under a heat warning believing it was checked.
   */
  it('never answers none once our province is mentioned', () => {
    const mentioning = [
      'o 폭염경보 : 충청남도',
      'o 폭염경보 : 충청남도(서산 제외)',
      'o 한파주의보 : 충남 북부내륙',
      'o 강풍주의보 : 충청남도 서해안',
      'o 건조주의보 : 충남',
    ];
    for (const t6 of mentioning) {
      expect(readWarningFor(t6, GONGJU).state, t6).not.toBe('none');
    }
  });

  it('gives a reason whenever it answers unknown', () => {
    for (const t6 of ['o 폭염경보 : 충청남도', 'o 폭염경보 : 충청남도(서산 제외)']) {
      const result = readWarningFor(t6, GONGJU);
      expect(result.state).toBe('unknown');
      expect(result.unknownReason).toBeTruthy();
    }
  });
});
