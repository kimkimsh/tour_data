import type { Axis, CapabilityStatus } from './types';

/**
 * The barrier-free capability catalogue. The mapping between a KTO field name and
 * a domain code exists here and nowhere else — ingest, the screens and the gap
 * report all import it, which is what replaces the deleted "set-equality CI gate".
 *
 * ktoField !== null  -> 24 items that detailWithTour2 returns verbatim. These form
 *                       the gap-report denominator and carry isKtoScored = true.
 * ktoField === null  ->  8 derived items, filled from route data, content files or
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
  { code: 'entrance_passage', ktoField: 'exit', labelKo: '출입통로', labelEn: 'Entrance doorway', axis: 'entry' },
  { code: 'wheelchair', ktoField: 'wheelchair', labelKo: '휠체어 대여', labelEn: 'Wheelchair rental', axis: 'entry' },
  { code: 'elevator', ktoField: 'elevator', labelKo: '엘리베이터', labelEn: 'Elevator', axis: 'entry' },
  { code: 'ticket_office', ktoField: 'ticketoffice', labelKo: '매표소', labelEn: 'Ticket office', axis: 'entry' },
  { code: 'help_dog', ktoField: 'helpdog', labelKo: '보조견 동반', labelEn: 'Assistance dogs', axis: 'entry' },
  // continuity
  { code: 'public_transport', ktoField: 'publictransport', labelKo: '대중교통', labelEn: 'Public transport', axis: 'continuity' },
  { code: 'braille_block', ktoField: 'braileblock', labelKo: '점자블록', labelEn: 'Tactile paving', axis: 'continuity' },
  { code: 'guide_system', ktoField: 'guidesystem', labelKo: '유도 안내 설비', labelEn: 'Wayfinding signage', axis: 'continuity' },
  { code: 'path_continuity', ktoField: null, labelKo: '경로 연속성', labelEn: 'Route continuity', axis: 'continuity' },
  // facility
  { code: 'restroom', ktoField: 'restroom', labelKo: '장애인 화장실', labelEn: 'Accessible restroom', axis: 'facility' },
  { code: 'parking', ktoField: 'parking', labelKo: '장애인 주차구역', labelEn: 'Accessible parking', axis: 'facility' },
  { code: 'stroller', ktoField: 'stroller', labelKo: '유아차 대여', labelEn: 'Stroller rental', axis: 'facility' },
  { code: 'nursing_room', ktoField: 'lactationroom', labelKo: '수유실', labelEn: 'Baby feeding room', axis: 'facility' },
  { code: 'baby_chair', ktoField: 'babysparechair', labelKo: '유아용 보조의자', labelEn: 'High chair', axis: 'facility' },
  { code: 'room', ktoField: 'room', labelKo: '휠체어 이용 가능 객실', labelEn: 'Wheelchair-accessible room', axis: 'facility' },
  { code: 'hearing_room', ktoField: 'hearingroom', labelKo: '청각장애인 편의 객실', labelEn: 'Hearing-accessible room', axis: 'facility' },
  // information
  { code: 'audio_guide', ktoField: 'audioguide', labelKo: '오디오 가이드', labelEn: 'Audio guide', axis: 'information' },
  { code: 'big_print', ktoField: 'bigprint', labelKo: '큰 활자 홍보물', labelEn: 'Large print information', axis: 'information' },
  { code: 'braille_promotion', ktoField: 'brailepromotion', labelKo: '점자 홍보물·표지', labelEn: 'Braille information and signage', axis: 'information' },
  { code: 'promotion_material', ktoField: 'promotion', labelKo: '홍보물', labelEn: 'Printed information', axis: 'information' },
  { code: 'guide_human', ktoField: 'guidehuman', labelKo: '안내요원', labelEn: 'Staff assistance', axis: 'information' },
  { code: 'sign_guide', ktoField: 'signguide', labelKo: '수어 안내', labelEn: 'Korean Sign Language (KSL)', axis: 'information' },
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
  { code: 'emergency_distance', ktoField: null, labelKo: '응급실 거리', labelEn: 'Nearest emergency department', axis: 'context' },
  { code: 'aed_distance', ktoField: null, labelKo: '자동심장충격기 거리', labelEn: 'Nearest defibrillator (AED)', axis: 'context' },
] as const;

export type CapabilityCode = (typeof CAPABILITIES)[number]['code'];

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
 * The four *etc fields are not capabilities. When they carry a value it goes to
 * pois[].etcNotes and is shown as "기타 안내"; it never enters the score.
 */
export const KTO_ETC_FIELDS = [
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
 */
const BARRIER_NOUN = /(단차|문턱|계단|장애물|급경사|경사(?!로)|돌길|자갈|비포장|협소|좁음)/g;

/**
 * Looked for in the few characters after a barrier noun, not across the sentence.
 *
 * '만' is in the presence set because it is the exclusivity particle: '계단으로만',
 * '계단만' assert that the barrier is the only way through.
 */
const NEGATED_NEARBY = /(없|아니|불가|미설치|않|못)/;
const PRESENT_NEARBY = /(있|존재|많|만)/;
const NEARBY_WINDOW = 8;

/**
 * Ends the polarity window. Past one of these the marker belongs to a list, not to
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
  /(없|불가|않|못하|못\s|미설치|미운영|미제공|미비치|미배치|미비|중단|중지|폐쇄|고장|파손|안\s*[함됨돼되])/;
const CONDITIONAL =
  /(일부|제한|사전\s*문의|예약\s*필요|협의|평일만|우천\s*시|동절기|어려움|어렵|동반\s*필요)/;

/**
 * Facility stems. A match is a candidate for 'supported', never a verdict: the
 * window after it has to be clear of a negation marker first, for the reason in the
 * NEGATION docblock.
 */
const PRESENCE_STEM = /(있음|있습니다|있다|있어요|설치되어|설치돼|설치되었|가능|운영|대여|비치|제공|완비)/g;
const PRESENCE_WINDOW = 10;

interface BarrierScan {
  present: boolean;
  absent: boolean;
  /**
   * A barrier noun was found and the window around it said neither "present" nor
   * "absent". The noun is still in the sentence and still unexplained, so the
   * sentence has not been read — it must not fall through to a positive verdict.
   */
  ambiguous: boolean;
  /** The sentence with each polarised barrier phrase removed. */
  rest: string;
}

/**
 * Polarity has to be read locally. '단차 없고 경사로 있음' contains both a negation
 * and a presence marker, and only the distance between each marker and the noun it
 * belongs to says which is which.
 */
function scanBarriers(s: string): BarrierScan {
  let present = false;
  let absent = false;
  let ambiguous = false;
  let rest = '';
  let cursor = 0;

  for (const match of s.matchAll(BARRIER_NOUN)) {
    const start = match.index;
    const end = start + match[0].length;
    const separator = LIST_SEPARATOR.exec(s.slice(end, end + NEARBY_WINDOW));
    const windowLength = separator ? separator.index : NEARBY_WINDOW;
    const window = s.slice(end, end + windowLength);
    if (NEGATED_NEARBY.test(window)) absent = true;
    else if (PRESENT_NEARBY.test(window)) present = true;
    else {
      ambiguous = true;
      continue;
    }
    // Drop the noun and its window so the remaining text can be read on its own.
    rest += s.slice(cursor, start);
    cursor = Math.min(s.length, end + windowLength);
  }

  return { present, absent, ambiguous, rest: rest + s.slice(cursor) };
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

  // A statement that the value itself needs checking outranks every rule below.
  if (NEEDS_CHECKING.test(s)) return 'unknown';
  if (NOT_APPLICABLE.test(s)) return 'unknown';

  const barrier = scanBarriers(s);
  const conditional = CONDITIONAL.test(s);

  if (barrier.present) return conditional ? 'partial' : 'unsupported';

  const rest = barrier.rest;
  if (CONDITIONAL.test(rest)) return 'partial';
  if (NEGATION.test(rest)) return 'unsupported';
  // A barrier noun nobody could read the polarity of blocks every positive verdict
  // below. '계단으로만 이동 가능' used to reach 'supported' this way: the stairs were
  // dropped for want of a marker and 가능 decided the sentence on its own.
  if (barrier.ambiguous) return 'unknown';
  if (hasUnnegatedPresence(rest)) return 'supported';
  // A barrier confirmed absent, with nothing else said, is good news only where the
  // barrier is the subject. '계단 없음' under `route` says the way in is step-free;
  // under `elevator` it says nothing whatever about a lift, and answering 'supported'
  // there printed 엘리베이터 확인됨 for a building nobody had checked.
  if (barrier.absent && isPathField(capabilityCode)) return 'supported';

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
