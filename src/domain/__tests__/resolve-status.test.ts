import { describe, expect, it } from 'vitest';
import { resolveStatus } from '../capabilities';
import type { CapabilityStatus } from '../types';

/**
 * Every sentence here is either verbatim from a KTO detailWithTour2 response, from a
 * 공주시 / 부여군 facility table, or from the review that found the two directions
 * this function used to get wrong. The point of the file is that the golden
 * suitability cases feed statuses in directly and therefore never exercise the step
 * that produced them — this is the only place where the Korean text is on trial.
 */
const CASES: ReadonlyArray<readonly [string, CapabilityStatus, string]> = [
  // Empty and "we do not know yet"
  ['', 'unknown', 'no value at all'],
  ['   ', 'unknown', 'whitespace only'],
  ['미확인', 'unknown', 'explicitly unconfirmed'],
  ['설치 여부 확인 필요', 'unknown', 'needs checking outranks the word 설치'],
  ['담당자 문의 필요', 'unknown', 'needs checking'],
  ['현황 파악 중', 'unknown', 'needs checking'],

  // A barrier confirmed ABSENT is good news
  ['단차 없음', 'supported', 'no level change'],
  ['장애물 없음', 'supported', 'no obstacle'],
  ['문턱 없음', 'supported', 'no threshold'],
  ['계단 없음', 'supported', 'no stairs'],
  ['출입구 단차 없고 경사로 있음', 'supported', 'barrier absent and facility present in one sentence'],

  // A barrier confirmed PRESENT is the barrier
  ['계단만 있음', 'unsupported', 'stairs only — the case that used to read as supported'],
  ['단차 있음', 'unsupported', 'a level change is present'],
  ['입구에 계단이 있습니다', 'unsupported', 'stairs present, polite form'],
  ['일부 구간에 계단 있음', 'partial', 'stairs present on part of the route'],

  // A facility confirmed ABSENT is bad news
  ['엘리베이터 없음', 'unsupported', 'no lift — the case that used to read as unknown'],
  ['경사로 없음', 'unsupported', 'no ramp; 경사로 must not be read as the barrier word 경사'],
  ['장애인 화장실 없음', 'unsupported', 'no accessible restroom'],
  ['휠체어 대여 없음', 'unsupported', 'no wheelchair loan — used to read as supported via 대여'],
  ['유아차 대여 없음', 'unsupported', 'no stroller loan'],
  ['보조견 동반 불가', 'unsupported', 'guide dogs refused — a bare 불가'],
  ['수어 통역 불가', 'unsupported', 'no sign-language interpreting'],
  ['미설치', 'unsupported', 'not installed'],
  ['운영하지 않음', 'unsupported', 'not operated'],
  ['해당 없음', 'unsupported', 'stated as not applicable'],

  // Conditional
  ['일부 구간 이용 불가', 'partial', 'part of it is unusable — must not become 대체추천'],
  ['일부 가능', 'partial', 'partly possible'],
  ['사전 문의 후 이용', 'partial', 'ask first'],
  ['예약 필요', 'partial', 'reservation required'],
  ['평일만 운영', 'partial', 'weekdays only'],
  ['동절기 미운영', 'partial', 'closed in winter'],
  [
    '경사로로 이루어져 있으나 흙구간 및 일부구간 접근 어려움',
    'partial',
    '정림사지 — the ramp exists but part of the surface is soil',
  ],
  [
    '경사가 심한 돌길이라 휠체어와 유모차 진입 어려움',
    'partial',
    '부소산성 낙화암 — steep stone path',
  ],

  // Present
  ['출입구까지 경사로가 설치되어 있음', 'supported', '공산성 — the sentence the place page prints'],
  ['주출입구는 경사로가 있어 휠체어 접근이 가능합니다', 'supported', '부소산성 main gate'],
  ['대여가능(수동휠체어 2대)', 'supported', 'wheelchair loan with a count'],
  ['장애인 주차장 있음(매표소주차장 2대, 방문자센터 1대)', 'supported', 'parking with a count'],
  ['오디오 가이드 제공', 'supported', 'audio guide provided'],
  ['안내요원 상시 배치', 'unknown', 'no vocabulary this function recognises — stays unknown'],
];

describe('resolveStatus', () => {
  for (const [input, expected, why] of CASES) {
    it(`${JSON.stringify(input)} → ${expected} (${why})`, () => {
      expect(resolveStatus(input)).toBe(expected);
    });
  }

  it('never invents a verdict for text it does not recognise', () => {
    expect(resolveStatus('가나다라마바사')).toBe('unknown');
    expect(resolveStatus('2026년 3월 기준')).toBe('unknown');
  });

  it('treats null and undefined the same as an empty string', () => {
    expect(resolveStatus(null)).toBe('unknown');
    expect(resolveStatus(undefined)).toBe('unknown');
  });

  /**
   * The asymmetry the rule set is tuned toward. Being wrong in the
   * unsupported direction costs a trip the visitor could have made and is
   * recoverable — the raw sentence is on screen next to the verdict. Being wrong in
   * the unknown direction tells a wheelchair user that a confirmed barrier is merely
   * unresolved, which sends them to a building they cannot enter.
   */
  it('a facility negation is never softened to unknown', () => {
    const facilityNegations = [
      '엘리베이터 없음',
      '장애인 화장실 없음',
      '점자블록 없음',
      '수유실 없음',
      '보조견 동반 불가',
    ];
    for (const s of facilityNegations) {
      expect(resolveStatus(s), s).toBe('unsupported');
    }
  });
});
