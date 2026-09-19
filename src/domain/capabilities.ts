import type { Axis, CapabilityStatus } from './types';

/**
 * The barrier-free capability catalogue. The mapping between a KTO field name and
 * a domain code exists here and nowhere else — ingest, the screens and the gap
 * report all import it, which is what replaces the deleted "set-equality CI gate".
 *
 * ktoField !== null  -> 23 items that detailWithTour2 returns verbatim. These form
 *                       the gap-report denominator and carry isKtoScored = true.
 * ktoField === null  ->  7 derived items, filled from route data, content files or
 *                        secondary APIs. No source means unknown, never "absent".
 *
 * labelEn exists because the interface ships in ko and en (docs/spec/01_scope.md
 * section 4.2) and the spec supplies only Korean labels.
 */
export interface Capability {
  code: string;
  ktoField: string | null;
  labelKo: string;
  labelEn: string;
  axis: Axis;
}

export const CAPABILITIES: readonly Capability[] = [
  // entry
  { code: 'access_route', ktoField: 'route', labelKo: '접근로', labelEn: 'Route to entrance', axis: 'entry' },
  { code: 'entrance_passage', ktoField: 'exit', labelKo: '출입통로', labelEn: 'Entrance passage', axis: 'entry' },
  { code: 'wheelchair', ktoField: 'wheelchair', labelKo: '휠체어 대여', labelEn: 'Wheelchair rental', axis: 'entry' },
  { code: 'elevator', ktoField: 'elevator', labelKo: '엘리베이터', labelEn: 'Elevator', axis: 'entry' },
  { code: 'ticket_office', ktoField: 'ticketoffice', labelKo: '매표소', labelEn: 'Ticket office', axis: 'entry' },
  { code: 'help_dog', ktoField: 'helpdog', labelKo: '보조견 동반', labelEn: 'Assistance dogs admitted', axis: 'entry' },
  // continuity
  { code: 'braille_block', ktoField: 'braileblock', labelKo: '점자블록', labelEn: 'Tactile paving', axis: 'continuity' },
  { code: 'guide_system', ktoField: 'guidesystem', labelKo: '유도 안내 설비', labelEn: 'Wayfinding guidance', axis: 'continuity' },
  /**
   * Can the visitor move between the points they came to see, inside the visiting area
   * the screen names? Covers changing floors indoors and moving around outdoors, and a
   * ramp, a lift or level ground all answer it.
   *
   * supported   — a usable route to every required point is confirmed
   * partial     — every required point is reachable, under a stated condition
   * unsupported — at least one required point is confirmed to have no usable route
   * unknown     — not enough evidence. "We could not confirm a route" is this, never
   *               `unsupported`; that distinction is the whole load this item carries.
   *
   * No KTO field feeds it. It is written by hand from an operator's own description,
   * which is why personas.ts excepts it from the derived-capability rule rather than
   * treating it like the crowding and weather items beside it.
   */
  { code: 'path_continuity', ktoField: null, labelKo: '관람 동선', labelEn: 'Route through the site', axis: 'continuity' },
  // facility
  { code: 'restroom', ktoField: 'restroom', labelKo: '장애인 화장실', labelEn: 'Accessible toilet', axis: 'facility' },
  { code: 'parking', ktoField: 'parking', labelKo: '장애인 주차구역', labelEn: 'Accessible parking', axis: 'facility' },
  { code: 'stroller', ktoField: 'stroller', labelKo: '유아차 대여', labelEn: 'Stroller rental', axis: 'facility' },
  { code: 'nursing_room', ktoField: 'lactationroom', labelKo: '수유실', labelEn: 'Baby feeding room', axis: 'facility' },
  { code: 'baby_chair', ktoField: 'babysparechair', labelKo: '유아용 보조의자', labelEn: 'High chair', axis: 'facility' },
  { code: 'room', ktoField: 'room', labelKo: '휠체어 이용 가능 객실', labelEn: 'Wheelchair-accessible room', axis: 'facility' },
  { code: 'hearing_room', ktoField: 'hearingroom', labelKo: '청각장애인 편의 객실', labelEn: 'Guest room with communication features', axis: 'facility' },
  // information
  { code: 'audio_guide', ktoField: 'audioguide', labelKo: '오디오 가이드', labelEn: 'Audio guide', axis: 'information' },
  { code: 'big_print', ktoField: 'bigprint', labelKo: '큰 활자 홍보물', labelEn: 'Large print information', axis: 'information' },
  { code: 'braille_promotion', ktoField: 'brailepromotion', labelKo: '점자 홍보물·표지', labelEn: 'Braille information and signage', axis: 'information' },
  { code: 'promotion_material', ktoField: 'promotion', labelKo: '홍보물', labelEn: 'Printed information', axis: 'information' },
  { code: 'guide_human', ktoField: 'guidehuman', labelKo: '안내요원', labelEn: 'Staff assistance', axis: 'information' },
  { code: 'sign_guide', ktoField: 'signguide', labelKo: '수어 안내', labelEn: 'Korean Sign Language (KSL) guidance', axis: 'information' },
  { code: 'video_caption', ktoField: 'videoguide', labelKo: '자막 영상 안내', labelEn: 'Captioned video', axis: 'information' },
  { code: 'visual_alarm', ktoField: null, labelKo: '시각 경보기', labelEn: 'Visual fire alarm', axis: 'information' },
  // rest
  { code: 'auditorium', ktoField: 'auditorium', labelKo: '장애인 관람석', labelEn: 'Accessible seating', axis: 'rest' },
  { code: 'rest_seating', ktoField: null, labelKo: '휴식 좌석', labelEn: 'Rest seating', axis: 'rest' },
  { code: 'shade_indoor', ktoField: null, labelKo: '그늘·실내 휴게', labelEn: 'Shade or indoor rest', axis: 'rest' },
  // context
  { code: 'crowd_forecast', ktoField: null, labelKo: '예측 혼잡도', labelEn: 'Expected crowds', axis: 'context' },
  { code: 'weather_warning', ktoField: null, labelKo: '기상 특보', labelEn: 'Weather warning', axis: 'context' },
  { code: 'weather_forecast', ktoField: null, labelKo: '당일 기상 예보', labelEn: "Today's forecast", axis: 'context' },
  //
  // Distance to an emergency department or a defibrillator is not a capability and is
  // deliberately absent. A capability row has to resolve to supported/partial/
  // unsupported, and there is no distance at which emergency care becomes unavailable
  // — reaching it depends on the road, the ambulance and what the department can
  // treat. Any cutoff put here is invented, and it publishes as a verdict: at 1.6km a
  // 500m/1km pair marked 공산성 unsupported, in red, under the word for "bad".
  // content/facilities.json carries the distances, and the safety section of the place
  // screen prints them with the institution's name, its source and the word 직선거리,
  // which is a fact the visitor can weigh.
] as const;

export type CapabilityCode = (typeof CAPABILITIES)[number]['code'];

/**
 * How long a context reading is still a statement about now, in days.
 *
 * The other twenty-seven items describe a building, which does not change between two
 * visits. These three describe a moment. Freshness alone does not cover them: it
 * discounts confidence and leaves the status standing, so a snapshot kept past its
 * observation window went on saying 발효 중인 기상 특보가 없습니다 — an all-clear about
 * a day that has passed, on the one service whose argument is that it does not say
 * things it has not checked.
 *
 * A warning and today's forecast are about today. The crowding figure says in its own
 * detail line that it is a thirty-day prediction, so thirty days is its own window.
 */
export const CONTEXT_VALIDITY_DAYS: Readonly<Record<string, number>> = {
  weather_warning: 1,
  weather_forecast: 1,
  crowd_forecast: 30,
};

/**
 * True when a context reading has outlived the moment it described.
 *
 * An undated reading counts as expired: a claim about now with no date on it is one
 * nobody can place. Items outside CONTEXT_VALIDITY_DAYS never expire here — a ramp
 * checked last year is stale, which is what freshness is for, not untrue.
 */
export function isStaleContext(
  capabilityCode: string,
  verifiedAt: string | null,
  today: string,
): boolean {
  const window = CONTEXT_VALIDITY_DAYS[capabilityCode];
  if (window === undefined) return false;
  if (verifiedAt === null) return true;
  const from = Date.parse(`${verifiedAt}T00:00:00Z`);
  const to = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return true;
  return (to - from) / 86_400_000 > window;
}

const BY_CODE = new Map(CAPABILITIES.map((c) => [c.code, c]));
const BY_KTO_FIELD = new Map(
  CAPABILITIES.filter((c) => c.ktoField !== null).map((c) => [c.ktoField as string, c]),
);

export function getCapability(code: string): Capability | undefined {
  return BY_CODE.get(code);
}

export function capabilityForKtoField(ktoField: string): Capability | undefined {
  return BY_KTO_FIELD.get(ktoField);
}

export function isKtoScoredCode(code: string): boolean {
  return BY_CODE.get(code)?.ktoField != null;
}

/** Catalogue order. Used as the last tie-breaker in the gap report so the table is deterministic. */
export function catalogueIndex(code: string): number {
  return CAPABILITIES.findIndex((c) => c.code === code);
}

/**
 * detailWithTour2 fields that are prose, not a state. They go to pois[].etcNotes and
 * are shown as "기타 안내"; none of them enters the score.
 *
 * The four *etc fields were always this. `publictransport` joined them because it
 * cannot answer the question a capability row asks. Measured across the 76
 * barrier-free entries in 공주 and 부여, 22 carry a value and almost all of them are
 * directions — '공주역에서 산성동 정류장으로 201,202번 버스 하차 후 도보 30분'. There is
 * no reading of that as available or unavailable, and resolveStatus correctly
 * declined 6 of the 8 samples. The one it did not decline it got backwards:
 * '대중교통 이용가능 : 사기소 정류장.저상버스 없음.' resolved to 이용 불가.
 *
 * The sentence is worth showing and is shown. What it is not is a verdict.
 */
export const KTO_PROSE_FIELDS = [
  'publictransport',
  'handicapetc',
  'blindhandicapetc',
  'hearinghandicapetc',
  'infantsfamilyetc',
] as const;

/**
 * Words for a thing whose PRESENCE is the barrier. Everywhere else in this
 * function a negation means bad news; next to one of these it means good news.
 *
 * '경사' carries a negative lookahead because '경사로' is a ramp — a facility — and
 * matching it as a barrier would turn every "출입구까지 경사로가 설치되어 있음" into
 * an absence.
 *
 * '턱' is the head noun, not '문턱'. Listing the compound missed every sentence that
 * uses the bare form, and KTO writes both: '주 출입구는 턱이 없어 휠체어 접근 가능함'
 * had no barrier to attach its 없어 to, so the negation fell through to the sentence
 * rule below and published a step-free entrance as 이용 불가. The bare form still
 * matches inside 문턱, 경사턱 and 단차턱, all of which are the same barrier.
 *
 * The lookahead excludes 턱없-, the stem of a different word — an adverb meaning
 * "nowhere near enough", and one Korean uses about facilities. Without it '턱없이
 * 부족한 편의시설' parsed as a barrier that is absent, and under a path field that is
 * the reading that publishes 이용 가능 for a sentence saying the opposite. Excluding
 * the whole stem rather than its two commonest endings is what makes 턱없어 and 턱없음
 * safe too; listing 이/는 alone left '편의시설이 턱없어 불편함' answering 이용 가능.
 *
 * The cost is 턱없음 written for a step-free entrance, which now reads as a barrier
 * nobody confirmed and answers 이용 불가. That is the safe direction, and the spaced
 * form KTO actually writes — 턱 없음, 턱이 없어 — still matches, because a barrier and
 * its negation are always separated by a particle or a space and the adverb never is.
 */
const BARRIER_NOUN = /(단차|턱(?!없)|계단|장애물|급경사|경사(?!로)|돌길|자갈|비포장|협소|좁음)/g;

/**
 * Markers, anchored to the head of the token they are looked for in.
 *
 * Unanchored they matched anywhere inside a word, so '계단 손잡이없음' credited the
 * handrail's absence to the stairs and answered 이용 가능 for a sentence saying stairs
 * are there. A marker that belongs to the barrier is the token's own head — 없음, 없어,
 * 없이, 아님, 있음, 있지 — never buried in the middle of another noun.
 */
// 아[니닌님녀], not 아니: Korean writes the syllable whole, so 아닌 and 아님 contain no
// 니 at all and a stem-only pattern reads '무단차가 아닌 출입구' as a step-free entrance.
const NEGATED_NEARBY = /^(없|아[니닌님녀]|불가|미설치|않|못)/;
const PRESENT_NEARBY = /^(있|존재)/;
/**
 * A quantity, not an existence claim. '계단 많음' asserts the stairs are there; '계단
 * 많지 않음' says there are few of them, which is not the same as none — so a quantity
 * marker may answer "present" and may never answer "absent".
 */
const QUANTITY_NEARBY = /^많/;
/**
 * The exclusivity particle: '계단만', '계단으로만' assert the barrier is the only way
 * through, so it reads as presence. Anchored to the start of the token, because a bare
 * 만 also sits inside 완만 (gentle) and 미만 (under) — and '경사가 완만함' read as a
 * confirmed slope is 대체추천 with the score capped at 49, out of a sentence saying the
 * slope is easy.
 */
const EXCLUSIVE_PARTICLE = /^(으로|로)?만/;
/** 장형 부정 cancels the presence marker from the following token: '단차가 있지 않음'. */
const LONG_NEGATION = /^(않|못)/;
/**
 * An embedded question, not a claim: '계단이 있는지 확인 필요' asks whether there are
 * stairs. Read as an assertion it answered 이용 불가 for a sentence that asserts
 * nothing at all.
 */
const INTERROGATIVE = /(는지|은지|을지)$/;
/**
 * 완만 says the slope is gentle, which is a statement that it is not a barrier — the
 * same thing 경사로 says, and 경사로 is already excluded from BARRIER_NOUN for it. With
 * no rule for it the noun stayed unpolarised, the ambiguity rule blocked every positive
 * verdict below, and '경사가 완만하여 휠체어 이동 가능' answered 정보 없음 to a sentence
 * that states wheelchair access outright.
 */
const GENTLE_MODIFIER = /^완만/;

/**
 * The particles that can stand alone between a barrier noun and its marker, and the
 * degree adverbs that can do the same. Both are closed sets, because length cannot
 * tell 옆 from 이 or 거의 from 난간: skipping every one-syllable token stepped over
 * 문 in '계단 옆 문 없음' and credited the door's absence to the stairs, and stopping
 * at every two-syllable token stopped at 거의 and published every step-free entrance
 * KTO writes as '단차가 거의 없어' as 이용 불가.
 *
 * 일부 is deliberately absent from the adverbs. It is a quantity, CONDITIONAL_LOCAL
 * already reads it, and skipping it would take '일부 구간에 계단 있음' off the partial
 * path.
 */
const BARE_PARTICLE =
  /^(이|가|은|는|을|를|에|의|도|와|과|로|으로|에서|에는|에도|및|등|또는|랑|나)$/;
const DEGREE_ADVERB =
  /^(거의|전혀|별로|크게|그다지|다소|약간|조금|매우|아주|아예|하나도|따로|딱히|완전히|상당히|대체로|사실상|모두|전부)$/;
/**
 * A hedged absence. '단차 별로 없음' is not '단차 없음': hardly any is not none, and a
 * path field that answers 이용 가능 to it claims a step-free way in that nobody
 * confirmed. These resolve to 일부 가능 instead.
 */
const HEDGE_ADVERB = /^(거의|별로|그다지|다소|약간|조금|대체로|사실상)$/;

/**
 * Ends the polarity scan. Past one of these the marker belongs to a list, not to
 * the noun the window opened on: '계단·엘리베이터 없음' negates both members, and the
 * second is a facility whose absence is the opposite news from the first's.
 *
 * Without this the window reached over 엘리베이터, read 없음 as the stairs' absence,
 * and deleted the lift along with the window — so a stated absence of a lift was
 * published as a confirmed one. Truncated, the barrier goes unpolarised, which makes
 * it ambiguous, which leaves the whole sentence for NEGATION to read.
 */
const LIST_SEPARATOR = /[·,/]|및|또는|와\s|과\s/;

/**
 * Says the field does not apply here, which is not a claim that anything is missing.
 * Read as a negation it produced the harshest verdict in the system — 대체추천 with the
 * score capped at 49 — out of a sentence that never mentioned a barrier. Marking an
 * item not-applicable removes it from every mean, and that stays a person's call in
 * content/curated-facts.json; all this function may say is that it did not find out.
 */
const NOT_APPLICABLE = /해당\s*(사항\s*)?없/;

const NEEDS_CHECKING = /(미확인|확인\s*필요|확인\s*요|문의\s*필요|파악\s*중)/;

/**
 * A facility that does not exist yet. '휠체어 대여 예정' carries the presence stem 대여
 * and nothing that negates it, so it answered 이용 가능 for a service nobody can use
 * today — and this capability is what a wheelchair user checks before setting out.
 *
 * `unknown`, not `unsupported`: the sentence says the thing is coming, and we do not
 * know whether it has arrived since the record was written.
 */
const FUTURE_PLAN = /(예정|추진\s*중)/;

/**
 * Korean negates by suffix, so a negation marker is a *shape*, not a phrase. An
 * earlier version listed specific collocations — 설치되지 않, 운영하지 않, 제공하지 않 —
 * while PRESENCE matched bare stems, and the two sets were asymmetric in the one
 * direction that matters: every negated form of a facility verb still contains that
 * verb, so any phrasing outside the closed list fell through to PRESENCE and a
 * stated absence was published as a confirmed facility. Measured:
 * '장애인용 화장실이 설치되어 있지 않습니다' → supported, '운영 안 함' → supported,
 * '대여하지 않음' → supported.
 *
 * The general markers below are what Korean actually uses: 장형 부정 (-지 않-, -지 못-),
 * 단형 부정 (안 V, 못 V), 존재 부정 (없-), the 미-/불- prefixes, and the words that
 * state a facility has stopped working.
 */
const NEGATION =
  /(없|불가|아[니닌님녀]|않|못하|못\s|미설치|미운영|미제공|미비치|미배치|미비|중단|중지|폐쇄|고장|파손|안\s*[함됨돼되해하합한])/;
/**
 * Conditions split by what they qualify, because they are not all the same shape.
 *
 * A season or a weather condition qualifies whatever the sentence says, wherever in
 * the sentence it sits — '동절기 미운영' is closed in winter and open otherwise, and
 * reading the 미운영 on its own publishes a permanent absence. These stay sentence-wide.
 *
 * The rest attach to one claim. '일부' is a quantity, '예약 필요' is a precondition, and
 * each belongs to the thing it sits beside. Read sentence-wide they soften a different
 * clause's confirmed absence: '장애인 화장실 없음. 일부 주차구역 이용 가능' answered
 * 일부 가능 under `restroom`, on a sentence stating the restroom is not there. So these
 * are only consulted where there is a claim for them to attach to — see conditionalNear.
 *
 * Measured exposure when this was split: 0 of the 48 KTO sentences in the corpus carry
 * a local condition and a negation at once, so no stored verdict moved.
 */
const CONDITIONAL_SENTENCE = /(평일만|우천\s*시|동절기)/;
const CONDITIONAL_LOCAL =
  /(일부|제한|사전\s*문의|예약\s*필요|협의|어려움|어렵|동반\s*필요)/;

/**
 * Where one claim stops and the next begins. Wider than LIST_SEPARATOR, which splits
 * items inside a list — this splits the list from the next statement, so a condition
 * cannot reach across a full stop into a clause about something else.
 */
const CLAUSE_BOUNDARY = /[.。;\n]/;

/**
 * True when a local condition sits in the same clause as [start, end).
 *
 * Bounded rather than windowed. A fixed character count picked up '계단 있음. 일부
 * 주차구역 이용 가능' as a conditional barrier, because 일부 was twelve characters away
 * — and one full stop away, about a different facility. The clause is the unit a
 * Korean condition actually scopes over.
 */
function conditionalNear(s: string, start: number, end: number): boolean {
  const before = s.slice(0, start);
  const backBoundary = [...before.matchAll(new RegExp(CLAUSE_BOUNDARY, 'g'))].pop();
  const from = backBoundary ? backBoundary.index + 1 : 0;
  const after = s.slice(end);
  const forwardBoundary = CLAUSE_BOUNDARY.exec(after);
  const to = end + (forwardBoundary ? forwardBoundary.index : after.length);
  return CONDITIONAL_LOCAL.test(s.slice(from, to));
}

/**
 * Facility stems. A match is a candidate for 'supported', never a verdict: the
 * window after it has to be clear of a negation marker first, for the reason in the
 * NEGATION docblock.
 */
const PRESENCE_STEM = /(있음|있습니다|있다|있어요|설치되어|설치돼|설치되었|가능|운영|대여|비치|제공|완비)/g;
const PRESENCE_WINDOW = 10;

interface BarrierScan {
  present: boolean;
  /** A condition sits beside the barrier that made `present` true. */
  presentConditional: boolean;
  absent: boolean;
  /** At least one of those absences was hedged — '거의 없음' rather than '없음'. */
  hedgedAbsent: boolean;
  /**
   * A barrier noun was found and the window around it said neither "present" nor
   * "absent". The noun is still in the sentence and still unexplained, so the
   * sentence has not been read — it must not fall through to a positive verdict.
   */
  ambiguous: boolean;
  /** The sentence with each polarised barrier phrase removed. */
  rest: string;
}

/** What the window after one barrier noun said, and how much of it that took. */
interface BarrierPolarity {
  value: 'present' | 'absent' | null;
  /** The absence came through a hedge — '거의 없음' rather than '없음'. */
  hedged: boolean;
  consumed: number;
}

/**
 * Reads the polarity marker that belongs to the barrier noun ending at `end`.
 *
 * Token by token, not character by character. The marker attaches to the noun through
 * a particle — 턱이 없어, 계단 있고 — and never across an intervening noun, so a
 * character window wide enough for the first shape also reaches the second:
 * '계단 있고 난간 없음' put 없음 within eight characters of 계단, the negation was
 * credited to the stairs, and a sentence stating stairs are there was published as
 * 이용 가능 under a critical item.
 *
 * So the search stops at the first token that carries a marker, steps over bare
 * particles, and gives up at the first content word that carries none.
 */
function readBarrierPolarity(s: string, end: number): BarrierPolarity {
  const reach = s.slice(end);
  const separator = LIST_SEPARATOR.exec(reach);
  const window = separator ? reach.slice(0, separator.index) : reach;
  // Brackets split tokens like whitespace. Without that the whole of
  // '없음(휠체어진입불가)' was one token, the scan consumed all of it as the barrier's
  // marker, and the entry prohibition inside the brackets was deleted before any rule
  // could read it.
  const tokens = [...window.matchAll(/[^\s()[\]（）]+/g)];
  let hedged = false;

  for (const [index, match] of tokens.entries()) {
    const token = match[0];
    const consumed = match.index + token.length;
    if (INTERROGATIVE.test(token)) break;
    if (GENTLE_MODIFIER.test(token)) {
      const next = tokens[index + 1];
      // '완만하지 않음' is the slope asserting itself again.
      if (next !== undefined && LONG_NEGATION.test(next[0])) {
        return { value: 'present', hedged: false, consumed: next.index + next[0].length };
      }
      return { value: 'absent', hedged, consumed };
    }
    if (NEGATED_NEARBY.test(token)) return { value: 'absent', hedged, consumed };
    const quantity = QUANTITY_NEARBY.test(token);
    if (PRESENT_NEARBY.test(token) || quantity || EXCLUSIVE_PARTICLE.test(token)) {
      const next = tokens[index + 1];
      if (next !== undefined && LONG_NEGATION.test(next[0])) {
        // A negated quantity is not an absence — '계단 많지 않음' still has stairs — so
        // it leaves the barrier unread rather than answering 'absent'.
        if (quantity) break;
        return { value: 'absent', hedged, consumed: next.index + next[0].length };
      }
      return { value: 'present', hedged: false, consumed };
    }
    if (DEGREE_ADVERB.test(token)) {
      if (HEDGE_ADVERB.test(token)) hedged = true;
      continue;
    }
    if (!BARE_PARTICLE.test(token)) break;
  }
  return { value: null, hedged: false, consumed: 0 };
}

/** Nothing but list punctuation between two barrier nouns — '계단 및 단차', '턱, 계단'. */
const LIST_GAP_ONLY = /^(?:\s|[·,/]|및|또는|와|과)*$/;

/**
 * 무- is the one negation Korean writes in front of the noun rather than after it, and
 * KTO's own survey form uses it: '주출입구 무단차'. The token scan looks only to the
 * right, so without this the commonest positive phrasing in the corpus reads as a
 * barrier nobody polarised.
 *
 * The prefix has to open the word. Matched anywhere before the noun it turned the 무 of
 * 나무 into a negation, and '나무계단으로만 접근 가능' — stairs, and only stairs — came
 * out 이용 가능.
 */
const PREFIX_NEGATION = /(?:^|\s)무$/;

/**
 * Polarity has to be read locally. '단차 없고 경사로 있음' contains both a negation
 * and a presence marker, and only the marker's attachment says which is which.
 *
 * A list member whose own window was cut short by the separator takes the polarity of
 * the member after it, where the two are adjacent with only list punctuation between:
 * one 없음 negates every barrier in '계단 및 단차 없음', and leaving the first member
 * unread made a place somebody had checked read worse than one nobody had.
 */
function scanBarriers(s: string): BarrierScan {
  const hits = [...s.matchAll(BARRIER_NOUN)].map((match) => {
    const start = match.index;
    const end = start + match[0].length;
    if (PREFIX_NEGATION.test(s.slice(0, start))) {
      return { start: start - 1, end, value: 'absent' as const, hedged: false, consumed: 0 };
    }
    return { start, end, ...readBarrierPolarity(s, end) };
  });

  for (let index = hits.length - 2; index >= 0; index -= 1) {
    const hit = hits[index];
    const donor = hits[index + 1];
    if (hit === undefined || donor === undefined) continue;
    if (hit.value !== null || donor.value === null) continue;
    if (!LIST_GAP_ONLY.test(s.slice(hit.end, donor.start))) continue;
    hit.value = donor.value;
    hit.consumed = 0;
  }

  let present = false;
  let presentConditional = false;
  let absent = false;
  let hedgedAbsent = false;
  let ambiguous = false;
  let rest = '';
  let cursor = 0;

  for (const hit of hits) {
    if (hit.value === null) {
      ambiguous = true;
      continue;
    }
    if (hit.value === 'absent') {
      absent = true;
      if (hit.hedged) hedgedAbsent = true;
    }
    else {
      present = true;
      // The noun's own span, not the polarity window — the window runs past the noun
      // and would carry the clause search over a full stop.
      if (conditionalNear(s, hit.start, hit.end)) presentConditional = true;
    }
    // Drop the noun and its marker so the remaining text can be read on its own.
    if (hit.start < cursor) continue;
    rest += s.slice(cursor, hit.start);
    cursor = Math.min(s.length, hit.end + hit.consumed);
  }

  return {
    present,
    presentConditional,
    absent,
    hedgedAbsent,
    ambiguous,
    rest: rest + s.slice(cursor),
  };
}

/** Right after a negation, 여부 turns the whole phrase into a question about it. */
const QUESTION_SUFFIX = /^\s*여부/;

/** The first negation in `s` that states something rather than asking about it. */
function firstAssertedNegation(s: string): { index: number; 0: string } | null {
  const pattern = new RegExp(NEGATION, 'g');
  for (const match of s.matchAll(pattern)) {
    const after = s.slice(match.index + match[0].length);
    if (!QUESTION_SUFFIX.test(after)) return match;
  }
  return null;
}

/**
 * True when a facility stem appears with no negation marker behind it. Same local
 * -polarity technique scanBarriers uses on barrier nouns, applied to the verbs —
 * because in Korean the marker that flips a verb comes after the verb.
 */
function hasUnnegatedPresence(s: string): boolean {
  for (const match of s.matchAll(PRESENCE_STEM)) {
    const end = match.index + match[0].length;
    if (!NEGATION.test(s.slice(end, end + PRESENCE_WINDOW))) return true;
  }
  return false;
}

/**
 * KTO values are free text, not Y/N. This is the single point where a Korean
 * sentence becomes a machine verdict, and everything downstream inherits it — the
 * six axis means, personaFit, coverage, the go-elsewhere rule, the no-verdict rule,
 * the caution cap, and the gap report's severity column.
 *
 * Two directions have to be right at once, and an earlier draft got each of them
 * wrong in turn:
 *
 *  - A negation next to a barrier noun is GOOD. '단차 없음' means no level change.
 *    Reading it as an absence produced "다른 곳 권장" for places that are usable.
 *  - A negation next to a facility noun is BAD. '엘리베이터 없음' means there is no
 *    lift. Reading it as unknown produced "확인 필요" for a confirmed barrier, which
 *    sends a wheelchair user to a building they cannot enter — the more expensive of
 *    the two mistakes, because the visitor is told the state is unresolved rather
 *    than negative.
 *
 * A presence marker next to a barrier noun is also bad: '계단만 있음' is stairs, not
 * a facility. That case is why matching a positive keyword anywhere in the string is
 * not enough.
 *
 * The safety net stays: `detail` keeps the original sentence, the screen prints it
 * verbatim next to the verdict, and curated-facts.json overrides anything this
 * function gets wrong.
 */
export function resolveStatus(
  raw: string | null | undefined,
  capabilityCode?: string,
): CapabilityStatus {
  const s = (raw ?? '').trim();
  if (s === '') return 'unknown';

  if (NOT_APPLICABLE.test(s)) return 'unknown';

  const barrier = scanBarriers(s);

  // A barrier that is there. A season makes it seasonal; a condition written beside the
  // barrier itself ('일부 구간에 계단') makes it partial. A condition belonging to some
  // other clause does not, which is what reading the whole sentence used to do.
  if (barrier.present) {
    return CONDITIONAL_SENTENCE.test(s) || barrier.presentConditional ? 'partial' : 'unsupported';
  }

  const rest = barrier.rest;
  // Sentence-wide on purpose: '동절기 미운영' is closed in winter, not closed.
  if (CONDITIONAL_SENTENCE.test(rest)) return 'partial';
  // Sentence-wide, deliberately, and the one rule here that does not ask what its
  // marker is attached to. KTO's commonest way of recording a confirmed absence names
  // the substitute in the same breath — '장애인 화장실 없음. 인근 공중화장실 이용 가능.'
  // — so a rule that backed off to unknown whenever an un-negated presence claim sat
  // beside the negation would answer 확인 필요 for exactly those, and 확인 필요 is what
  // sends a wheelchair user to a building they cannot enter.
  // A condition in the same clause as the negation softens it — '일부 구간 이용 불가'
  // is partly usable. A condition in a different clause is about a different facility
  // and must not: '장애인 화장실 없음. 일부 주차구역 이용 가능' answered 일부 가능 under
  // `restroom`, on a sentence stating the restroom is not there.
  // '휠체어 대여 불가 여부 확인 필요' asks whether the loan is unavailable; read as a
  // statement it published a confirmed refusal out of an open question. The 여부 has to
  // sit right after the marker, so a sentence that states an absence and separately
  // asks about something else — '엘리베이터 없음. 리프트 설치 여부 확인 필요' — keeps
  // its absence.
  const negation = firstAssertedNegation(rest);
  if (negation !== null) {
    const from = negation.index;
    return conditionalNear(rest, from, from + negation[0].length) ? 'partial' : 'unsupported';
  }
  // Below the two negation rules, above every positive one. A sentence that both
  // states an absence and asks for the detail to be confirmed — '엘리베이터 없음.
  // 리프트 설치 여부 확인 필요' — has already told the visitor the thing is not there,
  // and softening that to 확인 필요 is the more expensive of the two mistakes. Above
  // the positive rules because '이용 가능 여부 확인 필요' is a question, not a claim.
  if (NEEDS_CHECKING.test(s)) return 'unknown';
  // Beside NEEDS_CHECKING and for the same reason: both describe the state of our
  // knowledge or of the facility's future rather than of the facility now, and both
  // have to outrank the positive rules without softening a stated absence above them.
  if (FUTURE_PLAN.test(s)) return 'unknown';
  // A condition with nothing to negate still qualifies the sentence — '예약 필요',
  // '사전 문의 후 이용', '진입 어려움'. Before the ambiguity rule, because a barrier
  // whose polarity could not be read is exactly what '진입 어려움' is explaining.
  if (CONDITIONAL_LOCAL.test(rest)) return 'partial';
  // A barrier noun nobody could read the polarity of blocks every positive verdict
  // below. '계단으로만 이동 가능' used to reach 'supported' this way: the stairs were
  // dropped for want of a marker and 가능 decided the sentence on its own.
  if (barrier.ambiguous) return 'unknown';
  if (hasUnnegatedPresence(rest)) return 'supported';
  // A barrier confirmed absent, with nothing else said, is good news only where the
  // barrier is the subject. '계단 없음' under `route` says the way in is step-free;
  // under `elevator` it says nothing whatever about a lift, and answering 'supported'
  // there printed 엘리베이터 확인됨 for a building nobody had checked.
  //
  // A hedged absence stops at 일부 가능. '단차 별로 없음' is hardly any, not none, and
  // the difference between the two is a wheel that rolls over the threshold and one
  // that does not.
  if (barrier.absent && isPathField(capabilityCode)) {
    return barrier.hedgedAbsent ? 'partial' : 'supported';
  }

  return 'unknown';
}

/**
 * The three codes whose subject is the path itself rather than a named facility. A
 * caller that names no code gets the conservative answer, because a sentence with no
 * field attached cannot be read as a verdict about one.
 */
const PATH_FIELD_CODES: ReadonlySet<string> = new Set([
  'access_route',
  'entrance_passage',
  'path_continuity',
]);

function isPathField(capabilityCode: string | undefined): boolean {
  return capabilityCode !== undefined && PATH_FIELD_CODES.has(capabilityCode);
}
