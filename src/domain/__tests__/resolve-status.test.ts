import { describe, expect, it } from 'vitest';
import { resolveStatus } from '../capabilities';
import type { CapabilityStatus } from '../types';

/**
 * Every sentence here is either verbatim from a KTO detailWithTour2 response, from a
 * 공주시 / 부여군 facility table, or from the review that found the two directions
 * this function used to get wrong. The point of the file is that the golden
 * suitability cases feed statuses in directly and therefore never exercise the step
 * that produced them — this is the only place where the Korean text is on trial.
 *
 * Each case names the field the sentence arrived in, because the same words mean
 * different things in different ones: '계단 없음' under `route` is a step-free way in,
 * and under `elevator` it is a sentence that never mentioned a lift.
 */
const CASES: ReadonlyArray<readonly [string, string, CapabilityStatus, string]> = [
  // Empty and "we do not know yet"
  ['', 'access_route', 'unknown', 'no value at all'],
  ['   ', 'access_route', 'unknown', 'whitespace only'],
  ['미확인', 'elevator', 'unknown', 'explicitly unconfirmed'],
  ['설치 여부 확인 필요', 'elevator', 'unknown', 'needs checking outranks the word 설치'],
  ['담당자 문의 필요', 'elevator', 'unknown', 'needs checking'],
  ['현황 파악 중', 'elevator', 'unknown', 'needs checking'],

  // A barrier confirmed ABSENT is good news
  ['단차 없음', 'access_route', 'supported', 'no level change'],
  ['장애물 없음', 'access_route', 'supported', 'no obstacle'],
  ['문턱 없음', 'entrance_passage', 'supported', 'no threshold'],
  ['계단 없음', 'access_route', 'supported', 'no stairs'],
  ['출입구 단차 없고 경사로 있음', 'access_route', 'supported', 'barrier absent and facility present in one sentence'],

  // A barrier confirmed PRESENT is the barrier
  ['계단만 있음', 'access_route', 'unsupported', 'stairs only — the case that used to read as supported'],
  ['단차 있음', 'access_route', 'unsupported', 'a level change is present'],
  ['입구에 계단이 있습니다', 'entrance_passage', 'unsupported', 'stairs present, polite form'],
  ['일부 구간에 계단 있음', 'access_route', 'partial', 'stairs present on part of the route'],

  // A facility confirmed ABSENT is bad news
  ['엘리베이터 없음', 'elevator', 'unsupported', 'no lift — the case that used to read as unknown'],
  ['경사로 없음', 'access_route', 'unsupported', 'no ramp; 경사로 must not be read as the barrier word 경사'],
  ['장애인 화장실 없음', 'restroom', 'unsupported', 'no accessible restroom'],
  ['휠체어 대여 없음', 'wheelchair', 'unsupported', 'no wheelchair loan — used to read as supported via 대여'],
  ['유아차 대여 없음', 'stroller', 'unsupported', 'no stroller loan'],
  ['보조견 동반 불가', 'help_dog', 'unsupported', 'guide dogs refused — a bare 불가'],
  ['수어 통역 불가', 'sign_guide', 'unsupported', 'no sign-language interpreting'],
  ['미설치', 'braille_block', 'unsupported', 'not installed'],
  ['운영하지 않음', 'elevator', 'unsupported', 'not operated'],
  // Not a claim that anything is missing. Read as one it produced 대체추천 with the
  // score capped at 49 out of a sentence with no facility and no barrier in it.
  // Whether an item truly does not apply is set by hand in curated-facts.json.
  ['해당 없음', 'room', 'unknown', 'stated as not applicable, which is not an absence'],
  ['해당사항 없음', 'hearing_room', 'unknown', 'the longer form of the same phrase'],

  // A facility negation phrased outside the old closed list. Every one of these
  // returned 'supported' — a stated absence published as a confirmed facility —
  // because the presence stem sits inside the negated predicate.
  ['장애인용 화장실이 설치되어 있지 않습니다', 'restroom', 'unsupported', '-지 않- around 설치되어'],
  ['운영 안 함', 'elevator', 'unsupported', '단형 부정 in front of 운영'],
  ['제공 안 함', 'audio_guide', 'unsupported', '단형 부정 in front of 제공'],
  ['대여하지 않음', 'wheelchair', 'unsupported', '-지 않- around 대여'],
  ['비치하지 않음', 'big_print', 'unsupported', '-지 않- around 비치'],
  ['휠체어 대여 안 됨', 'wheelchair', 'unsupported', '안 됨 after 대여'],
  ['엘리베이터 고장으로 운영 중단', 'elevator', 'unsupported', 'a facility that has stopped'],
  ['엘리베이터 없어요', 'elevator', 'unsupported', '해요체 negation — 없어, not 없음'],
  ['수유실 없어요', 'nursing_room', 'unsupported', '해요체 negation'],
  ['엘리베이터 미비', 'elevator', 'unsupported', '미- prefix'],
  ['경사로 파손', 'access_route', 'unsupported', 'the ramp is broken'],
  ['계단으로만 이동 가능', 'access_route', 'unsupported', 'stairs only — 가능 used to decide this alone'],

  // Conditional
  ['일부 구간 이용 불가', 'access_route', 'partial', 'part of it is unusable — must not become 대체추천'],
  ['일부 가능', 'elevator', 'partial', 'partly possible'],
  ['사전 문의 후 이용', 'parking', 'partial', 'ask first'],
  ['예약 필요', 'guide_human', 'partial', 'reservation required'],
  ['평일만 운영', 'elevator', 'partial', 'weekdays only'],
  ['동절기 미운영', 'elevator', 'partial', 'closed in winter'],
  [
    '경사로로 이루어져 있으나 흙구간 및 일부구간 접근 어려움',
    'entrance_passage',
    'partial',
    '정림사지 — the ramp exists but part of the surface is soil',
  ],
  [
    '경사가 심한 돌길이라 휠체어와 유모차 진입 어려움',
    'path_continuity',
    'partial',
    '부소산성 낙화암 — steep stone path',
  ],

  // Present
  ['출입구까지 경사로가 설치되어 있음', 'access_route', 'supported', '공산성 — the sentence the place page prints'],
  ['주출입구는 경사로가 있어 휠체어 접근이 가능합니다', 'entrance_passage', 'supported', '부소산성 main gate'],
  ['대여가능(수동휠체어 2대)', 'wheelchair', 'supported', 'wheelchair loan with a count'],
  ['장애인 주차장 있음(매표소주차장 2대, 방문자센터 1대)', 'parking', 'supported', 'parking with a count'],
  ['오디오 가이드 제공', 'audio_guide', 'supported', 'audio guide provided'],
  ['안내요원 상시 배치', 'guide_human', 'unknown', 'no vocabulary this function recognises — stays unknown'],
];

describe('resolveStatus', () => {
  for (const [input, code, expected, why] of CASES) {
    it(`${code}: ${JSON.stringify(input)} → ${expected} (${why})`, () => {
      expect(resolveStatus(input, code)).toBe(expected);
    });
  }

  it('never invents a verdict for text it does not recognise', () => {
    expect(resolveStatus('가나다라마바사', 'elevator')).toBe('unknown');
    expect(resolveStatus('2026년 3월 기준', 'elevator')).toBe('unknown');
  });

  it('treats null and undefined the same as an empty string', () => {
    expect(resolveStatus(null, 'elevator')).toBe('unknown');
    expect(resolveStatus(undefined, 'elevator')).toBe('unknown');
  });

  /**
   * A list negates every member at once, and the members are not all the same kind of
   * thing. '계단·엘리베이터 없음' says the stairs are gone and so is the lift; reading the
   * marker as the stairs' alone and deleting the phrase published a confirmed lift.
   */
  it('a negation shared across a list is read for every member', () => {
    const lists: ReadonlyArray<readonly [string, string]> = [
      ['계단·엘리베이터 없음', 'elevator'],
      ['계단, 승강기 없음', 'elevator'],
      ['단차·경사로 없음', 'access_route'],
      ['장애물·점자블록 없음', 'braille_block'],
      ['문턱 및 수유실 없음', 'nursing_room'],
    ];
    for (const [s, code] of lists) {
      expect(resolveStatus(s, code), s).toBe('unsupported');
    }
  });

  /**
   * The same four sentences the barrier-absence rule was written for, read against a
   * field they say nothing about. 'supported' here is a lift, a restroom or a feeding
   * room marked confirmed on the strength of a sentence about stairs.
   */
  it('a barrier absence is not evidence about a facility', () => {
    for (const code of ['elevator', 'restroom', 'nursing_room', 'braille_block']) {
      for (const s of ['단차 없음', '장애물 없음', '문턱 없음', '계단 없음']) {
        expect(resolveStatus(s, code), `${code}: ${s}`).toBe('unknown');
      }
    }
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
