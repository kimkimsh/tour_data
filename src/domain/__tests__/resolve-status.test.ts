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

  // A negation whose subject is a barrier the dictionary did not carry. BARRIER_NOUN
  // listed 문턱 and not the head noun 턱, so 없어 had nothing to attach to, fell through
  // to the sentence-wide rule, and reached the harshest verdict in the system.
  ['주 출입구는 턱이 없어 휠체어 접근 가능함', 'entrance_passage', 'supported', '서동공원과 궁남지 — published as 이용 불가, and it is the only 대체추천 in the corpus'],
  ['출입구까지 턱이 없어 휠체어 접근 가능함', 'access_route', 'supported', '무령왕릉 — the same words, which a curated fact was covering for'],
  ['턱이 있음', 'entrance_passage', 'unsupported', 'the bare form as a present barrier, the direction the compound already had'],
  ['경사턱 없음', 'entrance_passage', 'supported', 'a compound the bare head noun reaches'],
  // 턱없이 is an adverb — "nowhere near enough" — not the barrier noun plus a negation.
  // What these two pin is the direction, not the grade: with 턱 matching as a barrier
  // the phrase parsed as a barrier confirmed absent, and under a path field that reads
  // as 이용 가능 for a sentence saying the opposite.
  ['턱없이 부족한 편의시설', 'access_route', 'unsupported', '「nowhere near enough」 — must never read as step-free'],
  ['주차 공간이 턱없이 모자람', 'parking', 'unsupported', 'the same adverb in the phrase it usually appears in'],
  ['편의시설이 턱없어 불편함', 'access_route', 'unsupported', '턱없어 — the ending an 이/는 lookahead missed, and it answered 이용 가능'],
  ['주차면이 턱없다', 'parking', 'unsupported', 'the plain form of the same adverb'],
  ['턱 없음', 'entrance_passage', 'supported', 'the spaced form KTO writes, which the stem lookahead must keep'],

  // KTO records a confirmed absence and its substitute in one breath. The sentence-wide
  // negation rule is what answers these, and backing it off to unknown whenever an
  // un-negated presence claim sits beside the negation turns every one of them into
  // 확인 필요 for a facility somebody has already been told is not there.
  ['장애인 화장실 없음. 인근 공중화장실 이용 가능.', 'restroom', 'unsupported', 'the absence is about this capability; the presence is about another building'],
  ['엘리베이터는 없으나 1층만 관람 가능', 'elevator', 'unsupported', 'the same shape inside one clause'],
  ['휠체어 대여 없음. 유아차는 대여 가능.', 'wheelchair', 'unsupported', 'two rental items, one absent'],
  // The guard must not reach a sentence whose only presence stem is itself negated.
  ['장애인용 화장실이 설치되어 있지 않습니다', 'restroom', 'unsupported', '-지 않- around 설치되어 — the round-09 direction, still unsupported'],

  // A condition qualifies the claim it sits beside, not every claim in the sentence.
  // Read sentence-wide, '일부' softened a different clause's confirmed absence into
  // 일부 가능 — the same defect class as the negation one above, one rule along.
  ['장애인 화장실 없음. 일부 주차구역 이용 가능', 'restroom', 'unsupported', '일부 is about parking; the restroom is confirmed absent'],
  ['계단 있음. 일부 주차구역 이용 가능', 'entrance_passage', 'unsupported', 'the barrier is unconditional; 일부 is past the full stop'],
  ['일부 구간에 계단 있음', 'entrance_passage', 'partial', 'the condition sits on the barrier itself'],
  ['장애인 화장실 있음(일부 층)', 'restroom', 'partial', 'the condition sits on the presence claim'],
  ['사전 예약 필요, 휠체어 대여 가능', 'wheelchair', 'partial', 'a precondition beside the claim it gates'],
  // Season and weather really do qualify a whole sentence, so these stay global.
  // Narrowing them would publish 동절기 미운영 as a permanent absence.
  ['동절기 미운영', 'restroom', 'partial', 'closed in winter, not closed'],
  ['우천 시 이용 불가', 'path_continuity', 'partial', 'weather, and the negation must not win'],
  ['평일만 운영', 'guide_human', 'partial', 'weekdays only'],

  // A marker belongs to the noun it is attached to, and a second noun between the two
  // breaks the attachment. Read across one, the negation on 난간 became the stairs'
  // and a sentence saying 계단 있고 was published as 이용 가능 under a critical item.
  ['계단 있고 난간 없음', 'access_route', 'unsupported', 'the negation belongs to 난간; the stairs are stated present'],
  ['계단 옆 난간 없음', 'access_route', 'unsupported', 'one noun away, and still not the stairs’ negation'],
  ['계단에 손잡이 없음', 'access_route', 'unsupported', 'particle then another noun'],
  ['단차가 있지 않음', 'entrance_passage', 'supported', '장형 부정 cancels the presence marker from the next token'],
  ['턱이 없어', 'entrance_passage', 'supported', 'the marker reaches across a particle, which is the shape KTO writes'],
  ['계단 등 없음', 'access_route', 'supported', 'a one-syllable filler does not break the attachment'],

  // 만 is the exclusivity particle only at the head of the token. Matched anywhere it
  // fired inside 완만 and 미만, and a slope described as gentle came out 이용 불가.
  ['계단으로만 이동 가능', 'access_route', 'unsupported', 'stairs are the only way through'],
  ['단차 5cm 미만', 'entrance_passage', 'unknown', '미만 is not the exclusivity particle either'],
  ['경사가 완만한 편', 'access_route', 'supported', '완만 is read by GENTLE_MODIFIER, not by the 만 particle'],

  // One negation covers every barrier in a list. Leaving the first member unread made
  // a place somebody had checked score worse than one nobody had.
  ['계단 및 단차 없음', 'access_route', 'supported', 'both barriers are negated'],
  ['단차와 계단 없음', 'access_route', 'supported', 'the same list with 와'],
  ['턱, 계단 없음', 'entrance_passage', 'supported', 'the same list with a comma'],

  // A degree adverb stands between the barrier and its own marker without starting a
  // new claim. Read as the next noun, every step-free entrance KTO writes this way came
  // out 이용 불가 — the one direction this function may never be wrong in.
  ['주출입구는 단차가 거의 없어 휠체어 접근 가능함', 'entrance_passage', 'supported', '거의 modifies 없어, and the sentence states wheelchair access on its own'],
  ['계단 전혀 없음', 'access_route', 'supported', '전혀 — an absolute, so the absence is absolute'],
  ['경사가 크게 없음', 'access_route', 'supported', '크게'],
  ['계단 등 없음', 'access_route', 'supported', '등 is a bare particle, not the next noun'],

  // Hardly any is not none, and the difference is a wheel that rolls over the
  // threshold and one that does not. A hedge stops the reading at 일부 가능.
  ['단차 별로 없음', 'entrance_passage', 'partial', 'hardly any is not none'],
  ['단차가 거의 없는 편입니다', 'entrance_passage', 'partial', 'the same hedge in the polite form'],
  ['계단 많지 않음', 'access_route', 'unsupported', 'a negated quantity still has stairs in it'],

  // The marker has to be the head of its own token, and the token has to be one the
  // barrier can reach across. Each of these credited another noun's marker to the
  // barrier and published a confirmed barrier as a step-free way in.
  ['계단 손잡이없음', 'access_route', 'unsupported', 'the handrail is missing, not the stairs'],
  ['계단 옆 문 없음', 'access_route', 'unsupported', '문 is a noun, not a particle'],
  ['단차 없음(휠체어진입불가)', 'entrance_passage', 'unsupported', 'the bracket is a token boundary, and what is inside it is read'],
  ['나무계단으로만 접근 가능', 'access_route', 'unsupported', 'the 무 of 나무 is not the 무- prefix'],

  // A question asserts nothing. Read as a claim, each of these published a verdict out
  // of a sentence asking for one.
  ['계단이 있는지 확인 필요', 'access_route', 'unknown', '-는지 is an embedded question'],
  ['휠체어 대여 불가 여부 확인 필요', 'wheelchair', 'unknown', '여부 after the negation makes it the question, not the answer'],

  ['무단차가 아닌 출입구', 'entrance_passage', 'unsupported', '아닌 cancels the 무- prefix; the syllable is 닌, not 니'],
  ['무단차 아님. 휠체어 이동 불가', 'entrance_passage', 'unsupported', 'the 무- prefix does not survive its own negation'],
  ['단차가 아예 없음', 'entrance_passage', 'supported', '아예 is an absolute, not a hedge'],

  // 단형 부정 written with the verb spelled out. The pattern carried 안 함 and 안 됨 and
  // stopped there, so the commonest polite form fell through to the presence stem 대여
  // and published 이용 가능 for a loan service the source says is not offered.
  ['휠체어 대여 안 합니다', 'wheelchair', 'unsupported', '안 합니다'],
  ['휠체어 대여 안 해요', 'wheelchair', 'unsupported', '안 해요'],
  ['대여 안 한다', 'wheelchair', 'unsupported', '안 한다'],
  ['실내 안내판 있음', 'guide_system', 'supported', '안내 must not read as the 안 negation'],

  // A facility that does not exist yet. 예정 carries no negation, so the presence stem
  // beside it decided the sentence. unknown rather than unsupported: the record says it
  // is coming, and we do not know whether it has since arrived.
  ['휠체어 대여 예정', 'wheelchair', 'unknown', '예정 is not a facility'],
  ['엘리베이터 설치 예정', 'elevator', 'unknown', 'the same, with a different stem'],
  ['경사로 설치 추진 중', 'access_route', 'unknown', '추진 중'],

  // 완만 says the slope is not a barrier, which is what 경사로 says and why 경사로 is
  // excluded from the barrier list outright. With no rule for it the noun stayed
  // unpolarised and the ambiguity rule discarded an explicit statement of access.
  ['경사가 완만하여 휠체어 이동 가능', 'access_route', 'supported', 'the sentence states access outright'],
  ['경사가 완만함', 'access_route', 'supported', 'a gentle slope is not a barrier'],
  ['경사가 완만하지 않음', 'access_route', 'unsupported', 'and the negation of it is one'],

  // 무- is the negation Korean writes in front of the noun. It is what KTO's own
  // survey form uses, and the token scan looks only to the right.
  ['주출입구 무단차', 'entrance_passage', 'supported', '무단차 is a step-free entrance'],

  // A sentence that states an absence has already answered the visitor's question.
  // Softening it because the same sentence also asks for a detail to be confirmed is
  // the expensive direction: 확인 필요 sends a wheelchair user to look for a lift.
  ['엘리베이터 없음. 리프트 설치 여부 확인 필요', 'elevator', 'unsupported', 'the absence outranks the request to check'],
  ['장애인 화장실 없음(위치 확인 필요)', 'restroom', 'unsupported', 'the same shape inside one clause'],
  ['이용 가능 여부 확인 필요', 'elevator', 'unknown', 'a question, not a claim — 확인 필요 still outranks 가능'],
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
