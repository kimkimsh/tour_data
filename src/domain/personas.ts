import type { PersonaId } from './types';
import { CAPABILITIES } from './capabilities';

/**
 * Persona x capability grade matrix. docs/spec/06_suitability.md section 4.3.
 *
 * The design rule the matrix has to keep: critical is only ever given to a KTO
 * capability. Derived items (ktoField === null) are normally empty, so making one
 * critical would trip the "critical unknown -> 정보없음" rule and hand almost every
 * POI a 정보없음 label for almost every visitor. assertPersonaMatrix() below
 * checks that, and the golden suite calls it.
 */
export type Grade = 'critical' | 'supporting' | 'other';

export const GRADE_WEIGHT: Record<Grade, number> = {
  critical: 4,
  supporting: 2,
  other: 1,
};

export interface Persona {
  id: PersonaId;
  labelKo: string;
  labelEn: string;
  /** Wording used on the home screen. It avoids naming a disability category. */
  choiceKo: string;
  choiceEn: string;
  /** Stay-time multiplier for itinerary planning. */
  stayMultiplier: number;
  /** Recommended maximum minutes of continuous travel before a rest. */
  restLimitMinutes: number;
}

export const PERSONAS: readonly Persona[] = [
  {
    id: 'P1a',
    labelKo: '휠체어 이용',
    labelEn: 'Wheelchair user',
    choiceKo: '휠체어를 이용해요',
    choiceEn: 'I use a wheelchair',
    stayMultiplier: 1.25,
    restLimitMinutes: 25,
  },
  {
    id: 'P1b',
    labelKo: '시니어·보행 약자',
    labelEn: 'Limited walking',
    choiceKo: '오래 걷기 어려워요',
    choiceEn: 'I cannot walk far',
    stayMultiplier: 1.3,
    restLimitMinutes: 15,
  },
  {
    id: 'P2a',
    labelKo: '시각장애',
    labelEn: 'Blind or low vision',
    choiceKo: '눈이 잘 안 보여요',
    choiceEn: 'I have trouble seeing',
    stayMultiplier: 1.2,
    restLimitMinutes: 30,
  },
  {
    id: 'P2b',
    labelKo: '청각장애',
    labelEn: 'Deaf or hard of hearing',
    choiceKo: '귀가 잘 안 들려요',
    choiceEn: 'I have trouble hearing',
    stayMultiplier: 1.0,
    restLimitMinutes: 40,
  },
  {
    id: 'P3',
    labelKo: '영유아 동반 가족',
    labelEn: 'Family with a young child',
    choiceKo: '유아차와 함께 가요',
    choiceEn: 'I travel with a stroller',
    stayMultiplier: 1.2,
    restLimitMinutes: 20,
  },
] as const;

/** The cognitive option is a sub-option of P3, not a persona. It never changes a grade. */
export const COGNITIVE_OPTION = {
  labelKo: '낯선 곳이 힘든 아이와 함께',
  labelEn: 'Travelling with a child who finds new places hard',
  stayMultiplier: 1.4,
  restLimitMinutes: 15,
} as const;

type GradeCell = 'C' | 'S' | '.';

/**
 * Column order is P1a, P1b, P2a, P2b, P3 — the same order as the table in
 * docs/spec/06_suitability.md section 4.3, read left to right.
 */
const MATRIX: Record<string, readonly [GradeCell, GradeCell, GradeCell, GradeCell, GradeCell]> = {
  access_route: ['C', 'C', 'S', '.', 'S'],
  entrance_passage: ['C', 'C', '.', '.', 'S'],
  wheelchair: ['C', 'S', '.', '.', '.'],
  // Supporting, not critical, and that is v7's central move. A lift is a MEANS of
  // changing level; whether the visitor can reach the places they came to see is the
  // END, and that is path_continuity below. Grading the means critical answered
  // '다른 곳을 권해요' for a pond garden and a riverside pine grove on the strength of
  // 「장애인 전용 엘리베이터 - 없음」, while a two-storey museum with a ramp to the
  // upper floor and no lift got the same verdict for no reason at all. The absence of
  // a lift still enters the score and still shows on screen; it no longer decides.
  elevator: ['S', 'S', '.', '.', 'S'],
  ticket_office: ['S', 'S', 'S', 'S', '.'],
  help_dog: ['.', '.', 'C', '.', '.'],
  braille_block: ['.', '.', 'C', '.', '.'],
  guide_system: ['.', 'S', 'C', 'S', '.'],
  // Critical for the two mobility companions, which is what makes it one of the four
  // GENERAL_VERDICT_CODES. It is the only derived capability allowed to be critical —
  // see DERIVED_CRITICAL_EXCEPTIONS for why that is safe and what it costs.
  path_continuity: ['C', 'C', 'S', '.', 'S'],
  restroom: ['C', 'C', 'S', '.', 'C'],
  parking: ['S', 'S', '.', '.', 'S'],
  stroller: ['.', '.', '.', '.', 'C'],
  nursing_room: ['.', '.', '.', '.', 'S'],
  baby_chair: ['.', '.', '.', '.', 'S'],
  room: ['.', '.', '.', '.', '.'],
  hearing_room: ['.', '.', '.', 'S', '.'],
  audio_guide: ['.', 'S', 'C', '.', '.'],
  big_print: ['.', 'S', 'C', '.', '.'],
  braille_promotion: ['.', '.', 'C', '.', '.'],
  promotion_material: ['.', '.', 'S', 'S', '.'],
  guide_human: ['S', 'S', 'C', 'S', '.'],
  sign_guide: ['.', '.', '.', 'C', '.'],
  video_caption: ['.', '.', '.', 'C', 'S'],
  visual_alarm: ['.', '.', '.', 'S', '.'],
  auditorium: ['S', 'S', '.', '.', 'S'],
  rest_seating: ['S', 'S', 'S', '.', 'S'],
  shade_indoor: ['.', 'S', '.', '.', 'S'],
  crowd_forecast: ['S', 'S', '.', '.', 'S'],
  weather_warning: ['.', 'S', '.', '.', 'S'],
  // Same columns as weather_warning, for the same reason: rain and heat are an endurance
  // and a footing problem, which is P1b and P3. A wheelchair user on a paved route (P1a)
  // is not more exposed than anyone else, and neither reading nor hearing changes in
  // weather (P2a, P2b).
  weather_forecast: ['.', 'S', '.', '.', 'S'],
};

const PERSONA_COLUMN: Record<PersonaId, 0 | 1 | 2 | 3 | 4> = {
  P1a: 0,
  P1b: 1,
  P2a: 2,
  P2b: 3,
  P3: 4,
};

const CELL_TO_GRADE: Record<GradeCell, Grade> = {
  C: 'critical',
  S: 'supporting',
  '.': 'other',
};

export function gradeFor(personaId: PersonaId, capabilityCode: string): Grade {
  const row = MATRIX[capabilityCode];
  if (!row) return 'other';
  return CELL_TO_GRADE[row[PERSONA_COLUMN[personaId]]];
}

export function criticalCodesFor(personaId: PersonaId): string[] {
  return CAPABILITIES.filter((c) => gradeFor(personaId, c.code) === 'critical').map((c) => c.code);
}

/**
 * What a verdict rests on when the visitor has named no condition.
 *
 * P0 has no critical set — that is its definition — and the label rules need one,
 * because '방문 가능' is a claim about the things the verdict was taken over. Handing
 * P0 the whole catalogue makes the claim cover 수어 안내 and 점자 홍보물 for someone who
 * never said they needed either, and no place in the dataset clears it.
 *
 * These four are the items at least two of the five personas treat as critical, so
 * they are the ones this matrix already says are load-bearing for more than one kind
 * of visitor. assertPersonaMatrix checks that claim against the matrix rather than
 * trusting this list, so editing one row of MATRIX cannot leave the list behind.
 *
 * Three of the four are outcomes — can I get there, can I get in, can I use a toilet.
 * The fourth used to be `elevator`, which is not an outcome but one way of achieving
 * one, and a way that is only needed where there is a level to change. Confirming
 * 「엘리베이터 없음」 at a flat outdoor site therefore produced '다른 곳을 권해요' for a
 * place whose own route was confirmed traversable, and made checking a place worse
 * than never checking it. `path_continuity` asks the question `elevator` was standing
 * in for, and asks it in a form that a ramp, a lift or level ground can all answer.
 */
export const GENERAL_VERDICT_CODES = [
  'access_route',
  'entrance_passage',
  'path_continuity',
  'restroom',
] as const;

/**
 * The one derived capability that may be critical.
 *
 * The rule it excepts exists for a measured failure: a derived capability has no KTO
 * field, so being empty is its normal state, and an earlier spec graded several of
 * them critical and turned almost every place into '정보 없음' for every visitor.
 *
 * `path_continuity` is different in the one way that matters — it is filled from
 * `content/curated-facts.json` by a person reading an operator's own description, so
 * it is populated exactly where somebody has looked. The others in that list are fed
 * by an auxiliary API or by geometry (crowding, weather, distance to an emergency
 * room), which is to say they are about the day rather than about the place.
 *
 * What the exception costs: a place nobody has written a route sentence for reads
 * `unknown` here, and an unknown critical is '주의' or '정보 없음'. That is the honest
 * answer for a place nobody has checked, and it is the safe direction — this rule can
 * never manufacture a '방문 가능'. The price is that the label depends on curation
 * effort, so a new place enters the catalogue at '주의' until someone reads its
 * operator's page.
 */
const DERIVED_CRITICAL_EXCEPTIONS = new Set(['path_continuity']);

/** Codes at least `minimum` personas treat as critical. */
function codesCriticalForAtLeast(minimum: number): string[] {
  return CAPABILITIES.filter(
    (c) => PERSONAS.filter((p) => gradeFor(p.id, c.code) === 'critical').length >= minimum,
  ).map((c) => c.code);
}

export function relevantCodesFor(personaIds: readonly PersonaId[]): string[] {
  if (personaIds.length === 0) return CAPABILITIES.map((c) => c.code);
  return CAPABILITIES.filter((c) =>
    personaIds.some((p) => gradeFor(p, c.code) !== 'other'),
  ).map((c) => c.code);
}

export function getPersona(id: PersonaId): Persona {
  const found = PERSONAS.find((p) => p.id === id);
  if (!found) throw new Error(`unknown persona: ${id}`);
  return found;
}

/**
 * Invariants the matrix must satisfy. Called from the test suite rather than at
 * module load, so a violation surfaces as a named failing test.
 */
export function assertPersonaMatrix(): void {
  const missing = CAPABILITIES.filter((c) => !MATRIX[c.code]).map((c) => c.code);
  if (missing.length > 0) {
    throw new Error(`capabilities missing from the persona matrix: ${missing.join(', ')}`);
  }
  const extra = Object.keys(MATRIX).filter((code) => !CAPABILITIES.some((c) => c.code === code));
  if (extra.length > 0) {
    throw new Error(`persona matrix rows with no capability: ${extra.join(', ')}`);
  }
  const derivedCriticals: string[] = [];
  for (const capability of CAPABILITIES) {
    if (capability.ktoField !== null) continue;
    if (DERIVED_CRITICAL_EXCEPTIONS.has(capability.code)) continue;
    for (const persona of PERSONAS) {
      if (gradeFor(persona.id, capability.code) === 'critical') {
        derivedCriticals.push(`${persona.id}/${capability.code}`);
      }
    }
  }
  if (derivedCriticals.length > 0) {
    throw new Error(
      `derived capabilities must never be critical (section 4.2): ${derivedCriticals.join(', ')}`,
    );
  }
  const shared = codesCriticalForAtLeast(2);
  const declared = [...GENERAL_VERDICT_CODES];
  if (shared.join(',') !== declared.join(',')) {
    throw new Error(
      `GENERAL_VERDICT_CODES claims to be the items critical for two or more personas, ` +
        `but the matrix now says that set is [${shared.join(', ')}] and the list says ` +
        `[${declared.join(', ')}]`,
    );
  }
}
