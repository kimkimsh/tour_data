/**
 * The single contract. Every other layer imports these names rather than
 * redeclaring them; docs/spec/02_stack.md section 2 rule 3 makes that the
 * replacement for the deleted "set-equality CI gate".
 *
 * Pure TypeScript. No runtime dependency, not even Zod — snapshot-schema.ts
 * builds its Zod schemas from the const arrays below so the two cannot drift.
 */

export const CAPABILITY_STATUSES = ['supported', 'partial', 'unsupported', 'unknown'] as const;
export type CapabilityStatus = (typeof CAPABILITY_STATUSES)[number];

/** null is the default: we do not know why the field is empty. docs/spec/05_ingest.md section 4.2 */
export const ABSENCE_KINDS = ['intrinsic', 'operator_missing', 'not_applicable', 'not_registered'] as const;
export type AbsenceKind = (typeof ABSENCE_KINDS)[number];

export const PERSONA_IDS = ['P1a', 'P1b', 'P2a', 'P2b', 'P3'] as const;
export type PersonaId = (typeof PERSONA_IDS)[number];

export const AXES = ['entry', 'continuity', 'facility', 'information', 'rest', 'context'] as const;
export type Axis = (typeof AXES)[number];

export const LOCALES = ['ko', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Locales stored in the pois snapshot. The interface itself is ko/en only. */
export const CONTENT_LOCALES = ['ko', 'en', 'ja', 'zh-CN'] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

/**
 * Verdict label. Spelling is fixed. The value '정보없음' has no space; the
 * on-screen wording is '정보 없음'. docs/spec/06_suitability.md section 2.
 */
export const SUITABILITY_LABELS = ['방문가능', '주의', '대체추천', '정보없음'] as const;
export type SuitabilityLabel = (typeof SUITABILITY_LABELS)[number];

export const DEPTH_TIERS = ['A', 'B'] as const;
export type DepthTier = (typeof DEPTH_TIERS)[number];

export const FACT_SOURCES = [
  'kto_with',
  'curated',
  'derived_route',
  'derived_facility',
  'tats',
  'kma',
] as const;
export type FactSource = (typeof FACT_SOURCES)[number];

export const CERTIFICATION_GRADES = [
  'bf_preliminary',
  'bf_general',
  'bf_excellent',
  'open_tourism',
] as const;
export type CertificationGrade = (typeof CERTIFICATION_GRADES)[number];

export const FACILITY_KINDS = [
  'restroom',
  'aed',
  'hospital',
  'call_taxi',
  'parking',
  'rest_area',
] as const;
export type FacilityKind = (typeof FACILITY_KINDS)[number];

export const ROUTE_STEP_ACTIONS = [
  'enter',
  'move',
  'rest',
  'turn',
  'caution',
  'restroom',
  'view',
  'exit',
] as const;
export type RouteStepAction = (typeof ROUTE_STEP_ACTIONS)[number];

export const EVIDENCE_LEVELS = ['desk', 'photo', 'field'] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const MEDIA_KINDS = ['photo', 'thumbnail', 'gallery'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const BUDGET_MODES = ['half_day', 'full_day', 'two_days'] as const;
export type BudgetMode = (typeof BUDGET_MODES)[number];

export const REPORT_CATEGORIES = [
  'elevator_broken',
  'ramp_blocked',
  'restroom_closed',
  'construction',
  'surface_damaged',
  'temporary_closure',
  'signage_missing',
  'other',
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

/**
 * WGS84 decimal degrees, always a named object. KTO gives mapx = longitude and
 * mapy = latitude; an array would invite swapping them.
 */
export interface LatLng {
  lat: number;
  lng: number;
}

// ── suitability output contract ──────────────────────────────────────────────

export interface AxisBreakdown {
  axis: Axis;
  labelKo: string;
  labelEn: string;
  /** Fixed weight, renormalised only when a whole axis is not_applicable. */
  weight: number;
  rawScore: number;
  weighted: number;
  knownCount: number;
  totalCount: number;
}

export interface Deduction {
  capabilityCode: string;
  labelKo: string;
  /** Korean sentence, e.g. '엘리베이터 정보 없음'. */
  reason: string;
  axis: Axis;
}

export interface AlternativePoi {
  poiSlug: string;
  title: string;
  score: number;
  label: SuitabilityLabel;
}

export interface SuitabilityResult {
  /** 0..100 integer. Not shown on screen when label === '정보없음'. */
  score: number;
  label: SuitabilityLabel;

  layerA: number;
  layerB: number;
  layerC: number;
  axes: AxisBreakdown[];

  /**
   * Data freshness 0.75..1.00. Deliberately NOT a factor of score — it only
   * feeds evidenceConfidence, and the '데이터 신뢰도' chip renders it.
   * docs/spec/06_suitability.md section 1, DEC-9.
   */
  freshness: number;

  /** Share of the capabilities that matter to the chosen personas whose status is known. */
  coverage: number;
  /** 0..100. Never multiplied into score. */
  evidenceConfidence: number;

  knownCriticalBlockers: string[];
  unknownCriticals: string[];

  deductions: Deduction[];
  alternatives: AlternativePoi[];

  ktoUnknownCount: number;
  /** isKtoScored capabilities that are not not_applicable. Usually 24, not always. */
  ktoTotalCount: number;

  dataDates: { capabilityCode: string; verifiedAt: string | null; source: string }[];
  policyVersion: string;
}

export interface SuitabilityFactInput {
  capabilityCode: string;
  status: CapabilityStatus;
  absenceKind: AbsenceKind | null;
  detail: string | null;
  source: string;
  verifiedAt: string | null;
  isKtoScored: boolean;
}

export interface SuitabilityInput {
  /**
   * Comes straight from the accessibility snapshot. Source priority was already
   * applied at ingest time, so (poiSlug, capabilityCode) appears exactly once;
   * this function never recomputes it. Visitor reports never enter here — they
   * are statements, not facts.
   */
  facts: ReadonlyArray<SuitabilityFactInput>;
  /** Empty means the synthetic P0 (general visit) persona. */
  personaIds: ReadonlyArray<PersonaId>;
  cognitiveOption: boolean;
  certifications: ReadonlyArray<{ grade: string; validUntil: string | null }>;
  /** ISO date. Date.now() must not be called inside the domain layer. */
  calculationDate: string;
  scoredAlternatives: ReadonlyArray<AlternativePoi>;
}

// ── itinerary ────────────────────────────────────────────────────────────────

export interface ItineraryTemplate {
  id: string;
  budgetMode: BudgetMode;
  titleKo: string;
  titleEn: string;
  orderedPoiSlugs: string[];
  /** Minutes per stop, same length as orderedPoiSlugs. */
  stayMinutes: number[];
  /** Minutes between consecutive stops, length = orderedPoiSlugs.length - 1. */
  transferMinutes: number[];
  note: string | null;
}

export interface ItineraryLeg {
  poiSlug: string;
  baseStayMinutes: number;
  adjustedStayMinutes: number;
  transferToNextMinutes: number | null;
}

export interface ItineraryWarning {
  kind: 'transfer_exceeds_rest_limit';
  afterPoiSlug: string;
  transferMinutes: number;
  limitMinutes: number;
  /**
   * 'cognitive' when the tightest limit came from the cognitive option rather than
   * from a persona. Naming P3 there was wrong: P3's own limit is 20 minutes and the
   * option's is 15, so the warning quoted a persona whose limit did not match the
   * number beside it.
   */
  personaId: PersonaId | 'P0' | 'cognitive';
}

export interface ItineraryResult {
  templateId: string;
  legs: ItineraryLeg[];
  stayMultiplier: number;
  restLimitMinutes: number;
  totalMinutes: number;
  warnings: ItineraryWarning[];
}

// ── diary ────────────────────────────────────────────────────────────────────

export interface DiaryEntry {
  /** Bumped when the stored shape changes, so old records stay readable. */
  schemaVersion: 1;
  date: string;
  personaIds: PersonaId[];
  cognitiveOption: boolean;
  places: Array<{
    poiSlug: string;
    /** Title at the time of writing, so the record survives snapshot changes. */
    title: string;
    visited: boolean;
    steps: Array<{ seq: number; title: string; done: boolean }>;
    memo: string;
    accessibilityNote: string;
    coords: Array<{ lat: number; lng: number; name: string }>;
  }>;
}

export interface DiaryDocument {
  title: string;
  dateLabel: string;
  personaLabels: string[];
  sections: Array<{
    heading: string;
    photoUrl: string | null;
    lines: Array<{ label: string; value: string }>;
    steps: Array<{ seq: number; title: string; done: boolean }>;
    memo: string | null;
  }>;
  /** Attribution lines, printed verbatim at the foot of the document. */
  attributions: string[];
}

// ── gap report ───────────────────────────────────────────────────────────────

export interface GapRow {
  poiSlug: string;
  capabilityCode: string;
  labelKo: string;
  labelEn: string;
  status: CapabilityStatus;
  absenceKind: AbsenceKind | null;
  priority: number;
  impact: number;
  severity: number;
  feasibility: number;
  source: string;
  verifiedAt: string | null;
}

export interface GapFillRow {
  poiSlug: string;
  /** source === 'kto_with' — the columns the operator filled. */
  ktoFilled: number;
  /** source === 'curated' — what we confirmed from public material. */
  curatedFilled: number;
  /** status === 'unknown'. ktoFilled + curatedFilled + unknown === ktoTotal. */
  unknown: number;
  ktoTotal: number;
}

export interface GapReport {
  fill: GapFillRow[];
  priorities: GapRow[];
  /** POIs absent from the barrier-free dataset. One line per POI, never 24. */
  notRegisteredPoiSlugs: string[];
}
