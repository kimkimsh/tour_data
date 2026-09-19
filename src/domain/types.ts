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

/**
 * Locales stored in the pois snapshot. Distinct from LOCALES because the snapshot could
 * hold a language the interface does not render — an earlier plan stored ja and zh-CN
 * titles for a ko/en interface. It no longer does, so this is LOCALES today.
 *
 * Derived rather than restated: two hand-written lists that must agree drift, and the
 * drift is silent here. scripts/ingest.ts loops this set and casts each member to
 * MultilingualLocale, so a locale present here and absent from MULTILINGUAL_SERVICE_IDS
 * builds a request URL with `undefined` in the service-id slot.
 */
export const CONTENT_LOCALES = LOCALES;
export type ContentLocale = Locale;

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

/**
 * What a place is to this service, and the reason a boolean no longer does.
 *
 * The screens used to print one of two sentences off `isUnescoComponent`: 구성유산, or
 * 구성유산 인접 시설. That was true while the catalogue held six places — four component
 * assets and the two national museums beside them — and became false the moment a
 * Baekje site that is neither was added. A place is not "adjacent to a component" just
 * because it is not one.
 */
export const PLACE_ROLES = ['unesco_component', 'baekje_museum', 'baekje_related'] as const;
export type PlaceRole = (typeof PLACE_ROLES)[number];

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
  /** Same city as the place being judged. The scoreboard filters on it. */
  city: string;
}

/** What one chosen condition's own verdict rests on, and what it comes out as. */
export interface PersonaVerdict {
  personaId: PersonaId;
  label: SuitabilityLabel;
  /** Catalogue order, and the names the screen prints beside this row's badge. */
  requiredCodes: string[];
  unknownCriticals: string[];
  /** Known, reachable, but only under a stated condition. Caps the label at '주의'. */
  partialCriticals: string[];
  knownCriticalBlockers: string[];
}

/**
 * Why a place has no verdict, and for whom.
 *
 * Two different facts wear the same label on screen, and the wording has to tell them
 * apart. `unknown_majority` is "more than half of what this verdict rests on has not
 * been checked", which is a gap somebody could close. `nothing_applies` is "none of
 * those items exists at this kind of place" — nothing is missing and nothing can be
 * filled in, and printing the first sentence for it read as 「0개 항목 중 0개를 모릅니다」
 * under a badge saying there is no verdict.
 */
export interface NoVerdictBasis {
  personaId: PersonaId | null;
  reason: 'unknown_majority' | 'nothing_applies';
  total: number;
  unknown: number;
}

export interface SuitabilityResult {
  /**
   * 0..100 integer. Hidden when label === '정보없음', and off the default screens
   * entirely — it lives inside the calculation panel.
   *
   * It is the average of the items that happen to be known, which is a different
   * question at every place: KTO fills a barrier-free field only where the facility
   * exists, so 6 known items out of 31 produced a 100 at 공주 고마나루 while 국립부여박물관
   * scored 86 on 16. The number cannot carry a comparison between two places, and a
   * caption under it was not enough to stop it being read as one.
   */
  score: number;
  label: SuitabilityLabel;

  layerA: number;
  layerB: number;
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

  /**
   * The two figures `coverage` is the ratio of. Returned rather than left to the
   * screens: three of them used to recount from the raw fact array, which holds only
   * the codes ingest wrote, while this result counts over the filled catalogue. A POI
   * added before its next accessibility run made the sentence read "0개 항목 중 5개를
   * 모릅니다".
   */
  relevantKnownCount: number;
  relevantTotalCount: number;

  /**
   * The capabilities this verdict was taken over — the union of the chosen personas'
   * critical items, or GENERAL_VERDICT_CODES when no condition was chosen.
   */
  requiredCodes: string[];

  /**
   * Why label === '정보없음', counted over the companion the rule actually fired on.
   *
   * Null for every other label. It exists because the rule is asked once per
   * companion while requiredCodes is their union, so the union's own ratio can sit
   * well under the half the rule tests — measured at 3 of 7 on a screen explaining a
   * rule that needs more than half.
   */
  noVerdictBasis: NoVerdictBasis | null;

  /**
   * One row per chosen condition, each answered as if that condition had been the
   * only one chosen. Empty below two conditions, where the headline verdict already
   * is the per-condition one.
   *
   * The headline verdict follows whoever is served least, which is right and which
   * used to be the only thing on screen — so adding a companion whose items nobody
   * has recorded anywhere replaced what the service did know about the first
   * companion with a blank. Measured: a wheelchair user sees 방문가능 at 2 places and
   * 주의 at 8; ticking 청각장애 as well turned all 13 into 정보없음, because the two
   * items a deaf visitor depends on are unrecorded at 12 of the 13.
   *
   * Computed by re-running the whole calculation per condition rather than split out
   * of the combined one: the combined score weights every item by the grade of the
   * least-served companion, so a share of it is not that companion's own answer.
   */
  perPersona: PersonaVerdict[];

  knownCriticalBlockers: string[];
  unknownCriticals: string[];
  partialCriticals: string[];

  deductions: Deduction[];
  alternatives: AlternativePoi[];

  ktoUnknownCount: number;
  /** isKtoScored capabilities that are not not_applicable. Usually all 23, not always. */
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
  /** Which selected condition the multiplier is the largest of. */
  stayMultiplierSource: PersonaId | 'P0' | 'cognitive';
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

/**
 * One catalogue item, counted across every place — the question "which fact should
 * somebody go and establish next", which is the one this report can actually answer.
 *
 * The per-place list it replaced on screen was the three most urgent rows per place,
 * and taking the top three of anything leaves every row at the top score: all 39 came
 * out at priority 1.00, status 정보 없음, cause 원인 미확인, so three of its five columns
 * held one value. The cause column is worse than constant by slicing — no row in the
 * whole dataset carries an absenceKind, so the legend under it explained three symbols
 * of which one can appear.
 */
export interface GapItemRow {
  capabilityCode: string;
  labelKo: string;
  labelEn: string;
  /** Places where nobody has established this item's status. */
  unknownPoiSlugs: string[];
  /** Places where it is confirmed unavailable. A different job, so a different list. */
  blockedPoiSlugs: string[];
  /** Places the item applies to at all. not_applicable leaves this denominator. */
  applicableCount: number;
  /** The conditions that take their verdict on this item. Empty is not "unimportant". */
  criticalFor: PersonaId[];
}

export interface GapReport {
  fill: GapFillRow[];
  priorities: GapRow[];
  /** The same facts as `priorities`, counted per item instead of per place. */
  items: GapItemRow[];
  /** POIs absent from the barrier-free dataset. One line per POI, never one per item. */
  notRegisteredPoiSlugs: string[];
}
