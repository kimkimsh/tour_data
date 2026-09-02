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
  elevator: ['C', 'C', '.', '.', 'S'],
  ticket_office: ['S', 'S', 'S', 'S', '.'],
  help_dog: ['.', '.', 'C', '.', '.'],
  public_transport: ['S', 'S', 'S', '.', 'S'],
  braille_block: ['.', '.', 'C', '.', '.'],
  guide_system: ['.', 'S', 'C', 'S', '.'],
  path_continuity: ['S', 'S', 'S', '.', 'S'],
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
  emergency_distance: ['S', 'S', '.', '.', 'S'],
  aed_distance: ['.', 'S', '.', '.', '.'],
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

/** P0: nothing selected. Every capability counts as other, so personaFit is a plain mean. */
export function gradeForP0(): Grade {
  return 'other';
}

export function criticalCodesFor(personaId: PersonaId): string[] {
  return CAPABILITIES.filter((c) => gradeFor(personaId, c.code) === 'critical').map((c) => c.code);
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
}
