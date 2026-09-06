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
  { code: 'entrance_passage', ktoField: 'exit', labelKo: '출입통로', labelEn: 'Entrance', axis: 'entry' },
  { code: 'wheelchair', ktoField: 'wheelchair', labelKo: '휠체어', labelEn: 'Wheelchair rental', axis: 'entry' },
  { code: 'elevator', ktoField: 'elevator', labelKo: '엘리베이터', labelEn: 'Elevator', axis: 'entry' },
  { code: 'ticket_office', ktoField: 'ticketoffice', labelKo: '매표소', labelEn: 'Ticket office', axis: 'entry' },
  { code: 'help_dog', ktoField: 'helpdog', labelKo: '보조견 동반', labelEn: 'Assistance dogs', axis: 'entry' },
  // continuity
  { code: 'public_transport', ktoField: 'publictransport', labelKo: '대중교통', labelEn: 'Public transport', axis: 'continuity' },
  { code: 'braille_block', ktoField: 'braileblock', labelKo: '점자블록', labelEn: 'Tactile paving', axis: 'continuity' },
  { code: 'guide_system', ktoField: 'guidesystem', labelKo: '유도 안내 설비', labelEn: 'Wayfinding signage', axis: 'continuity' },
  { code: 'path_continuity', ktoField: null, labelKo: '경로 연속성', labelEn: 'Route continuity', axis: 'continuity' },
  // facility
  { code: 'restroom', ktoField: 'restroom', labelKo: '화장실', labelEn: 'Accessible toilet', axis: 'facility' },
  { code: 'parking', ktoField: 'parking', labelKo: '주차', labelEn: 'Accessible parking', axis: 'facility' },
  { code: 'stroller', ktoField: 'stroller', labelKo: '유모차', labelEn: 'Stroller rental', axis: 'facility' },
  { code: 'nursing_room', ktoField: 'lactationroom', labelKo: '수유실', labelEn: 'Baby feeding room', axis: 'facility' },
  { code: 'baby_chair', ktoField: 'babysparechair', labelKo: '유아용 보조의자', labelEn: 'High chair', axis: 'facility' },
  { code: 'room', ktoField: 'room', labelKo: '객실', labelEn: 'Wheelchair-accessible room', axis: 'facility' },
  { code: 'hearing_room', ktoField: 'hearingroom', labelKo: '객실(청각)', labelEn: 'Hearing-accessible room', axis: 'facility' },
  // information
  { code: 'audio_guide', ktoField: 'audioguide', labelKo: '오디오 가이드', labelEn: 'Audio guide', axis: 'information' },
  { code: 'big_print', ktoField: 'bigprint', labelKo: '큰 활자 홍보물', labelEn: 'Large print information', axis: 'information' },
  { code: 'braille_promotion', ktoField: 'brailepromotion', labelKo: '점자 홍보물·표지', labelEn: 'Braille information and signage', axis: 'information' },
  { code: 'promotion_material', ktoField: 'promotion', labelKo: '홍보물', labelEn: 'Printed information', axis: 'information' },
  { code: 'guide_human', ktoField: 'guidehuman', labelKo: '안내요원', labelEn: 'Staff assistance', axis: 'information' },
  { code: 'sign_guide', ktoField: 'signguide', labelKo: '수화 안내', labelEn: 'Korean Sign Language (KSL)', axis: 'information' },
  { code: 'video_caption', ktoField: 'videoguide', labelKo: '자막 영상 안내', labelEn: 'Captioned video', axis: 'information' },
  { code: 'visual_alarm', ktoField: null, labelKo: '시각 경보기', labelEn: 'Visual fire alarm', axis: 'information' },
  // rest
  { code: 'auditorium', ktoField: 'auditorium', labelKo: '관람석', labelEn: 'Accessible seating', axis: 'rest' },
  { code: 'rest_seating', ktoField: null, labelKo: '휴식 좌석', labelEn: 'Rest seating', axis: 'rest' },
  { code: 'shade_indoor', ktoField: null, labelKo: '그늘·실내 휴게', labelEn: 'Shade or indoor rest', axis: 'rest' },
  // context
  { code: 'crowd_forecast', ktoField: null, labelKo: '예측 혼잡도', labelEn: 'Expected crowds', axis: 'context' },
  { code: 'weather_warning', ktoField: null, labelKo: '기상 특보', labelEn: 'Weather warning', axis: 'context' },
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

/** Looked for in the few characters after a barrier noun, not across the sentence. */
const NEGATED_NEARBY = /(없|아니|불가|미설치|않)/;
const PRESENT_NEARBY = /(있|존재|많)/;
const NEARBY_WINDOW = 8;

const NEEDS_CHECKING = /(미확인|확인\s*필요|확인\s*요|문의\s*필요|파악\s*중)/;
const NEGATION =
  /(없음|없다|없습니다|없으|불가|미설치|미운영|미제공|설치되지\s*않|설치\s*안|운영하지\s*않|제공하지\s*않|해당\s*없음)/;
const CONDITIONAL =
  /(일부|제한|사전\s*문의|예약\s*필요|협의|평일만|우천\s*시|동절기|어려움|어렵|동반\s*필요)/;
const PRESENCE = /(있음|있습니다|있다|설치되어|설치돼|가능|운영|대여|비치|제공|완비)/;

interface BarrierScan {
  present: boolean;
  absent: boolean;
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
  let rest = '';
  let cursor = 0;

  for (const match of s.matchAll(BARRIER_NOUN)) {
    const start = match.index;
    const end = start + match[0].length;
    const window = s.slice(end, end + NEARBY_WINDOW);
    if (NEGATED_NEARBY.test(window)) absent = true;
    else if (PRESENT_NEARBY.test(window)) present = true;
    else continue;
    // Drop the noun and its window so the remaining text can be read on its own.
    rest += s.slice(cursor, start);
    cursor = Math.min(s.length, end + NEARBY_WINDOW);
  }

  return { present, absent, rest: rest + s.slice(cursor) };
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
export function resolveStatus(raw: string | null | undefined): CapabilityStatus {
  const s = (raw ?? '').trim();
  if (s === '') return 'unknown';

  // A statement that the value itself needs checking outranks every rule below.
  if (NEEDS_CHECKING.test(s)) return 'unknown';

  const barrier = scanBarriers(s);
  const conditional = CONDITIONAL.test(s);

  if (barrier.present) return conditional ? 'partial' : 'unsupported';

  const rest = barrier.rest;
  if (CONDITIONAL.test(rest)) return 'partial';
  if (NEGATION.test(rest)) return 'unsupported';
  if (PRESENCE.test(rest)) return 'supported';
  // A barrier confirmed absent, with nothing else said, is still good news.
  if (barrier.absent) return 'supported';

  return 'unknown';
}
