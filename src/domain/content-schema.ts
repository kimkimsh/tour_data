import { z } from 'zod';
import {
  BUDGET_MODES,
  CAPABILITY_STATUSES,
  CERTIFICATION_GRADES,
  DEPTH_TIERS,
  FACILITY_KINDS,
} from './types';
import { LatLngSchema, RouteSchema } from './snapshot-schema';
import { CAPABILITIES } from './capabilities';

/**
 * Schemas for the hand-written files in content/. Shared by scripts/ingest.ts,
 * scripts/validate-content.ts and src/lib/content.ts so a field can only be
 * defined once.
 *
 * Two rules are enforced here rather than by review, because review is what
 * already failed elsewhere in this project:
 *  - every curated fact carries a source and a check date;
 *  - a slope is one of six words, never a number.
 */

const CAPABILITY_CODES = CAPABILITIES.map((c) => c.code) as [string, ...string[]];

/** Gongju and Buyeo sit inside these bounds. A swapped pair lands in the Pacific. */
export const KoreanLatLng = z.object({
  lat: z.number().min(33).max(39),
  lng: z.number().min(124).max(132),
});

export const PoiInputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  nameKo: z.string().min(1),
  /** Hand-written fallback used until EngService2 supplies an English title. */
  nameEn: z.string().min(1),
  /** Confirmed by the P0-1 probe. An empty string fails validation. */
  ktoContentId: z.string().min(1),
  contentTypeId: z.union([z.literal(12), z.literal(14)]),
  lDongRegnCd: z.string().length(2),
  lDongSignguCd: z.string().length(3),
  signguCd5: z.string().length(5),
  lclsSystm3: z.string().nullable(),
  coord: KoreanLatLng,
  cityKo: z.string().min(1),
  cityEn: z.string().min(1),
  /** Designation name only. Designation numbers are not used at all. */
  heritageLabel: z.string().nullable(),
  /** A UNESCO component of the Baekje Historic Areas, or an adjacent facility. */
  isUnescoComponent: z.boolean(),
  /** Set when the POI is only part of a component, so the screen can say so. */
  unescoComponentNote: z.string().nullable(),
  depthTier: z.enum(DEPTH_TIERS),
  odiiKeyword: z.string().min(1),
  /** Name as the crowding dataset spells it. Null until the P0-5 probe confirms it. */
  tatsName: z.string().nullable(),
  /** 32-hex related-POI key, filled in by ingest from searchKeyword1. */
  tAtsCd: z.string().nullable(),
  source: z.string().min(1),
  checkedAt: z.iso.date(),
});
export const PoisInput = z.array(PoiInputSchema).min(1);

export const FacilityInputSchema = z.object({
  poiSlug: z.string(),
  kind: z.enum(FACILITY_KINDS),
  name: z.string().min(1),
  coord: KoreanLatLng.nullable(),
  phone: z.string().nullable(),
  detail: z.string().nullable(),
  sourceNote: z.string().min(1),
  checkedAt: z.iso.date(),
});
export const FacilitiesInput = z.array(FacilityInputSchema);

export const CertificationInputSchema = z.object({
  poiSlug: z.string(),
  grade: z.enum(CERTIFICATION_GRADES),
  validUntil: z.iso.date().nullable(),
  sourceNote: z.string().min(1),
  checkedAt: z.iso.date(),
});
export const CertificationsInput = z.array(CertificationInputSchema);

export const CuratedFactSchema = z.object({
  poiSlug: z.string(),
  capabilityCode: z.enum(CAPABILITY_CODES),
  status: z.enum(CAPABILITY_STATUSES),
  /**
   * Deliberately narrower than ABSENCE_KINDS. A curated `not_registered` removes the
   * whole place from the municipal priority list, and a curated `not_applicable`
   * removes a capability from ktoTotalCount and every axis mean — both silently, and
   * both from a single hand-edited line. Those two kinds are ingest's to derive from
   * the dataset, never a content file's to assert.
   */
  absenceKind: z.enum(['intrinsic', 'operator_missing']).nullable().optional(),
  detail: z.string().nullable(),
  /** A URL or an institution, never empty. This is the file's whole point. */
  source: z.string().min(4),
  checkedAt: z.iso.date(),
});
export const CuratedFactsInput = z.array(CuratedFactSchema);

export const ItineraryTemplateSchema = z
  .object({
    id: z.string().min(1),
    budgetMode: z.enum(BUDGET_MODES),
    titleKo: z.string().min(1),
    titleEn: z.string().min(1),
    orderedPoiSlugs: z.array(z.string()).min(1),
    stayMinutes: z.array(z.number().int().positive()),
    transferMinutes: z.array(z.number().int().nonnegative()),
    note: z.string().nullable(),
  })
  .refine((t) => t.stayMinutes.length === t.orderedPoiSlugs.length, {
    error: 'stayMinutes must have one entry per stop',
    path: ['stayMinutes'],
  })
  .refine((t) => t.transferMinutes.length === t.orderedPoiSlugs.length - 1, {
    error: 'transferMinutes must have one entry per gap between stops',
    path: ['transferMinutes'],
  });
export const ItinerariesInput = z.array(ItineraryTemplateSchema);

export const SafetyContactSchema = z.object({
  id: z.string().min(1),
  labelKo: z.string().min(1),
  labelEn: z.string().min(1),
  tel: z.string().min(3),
  /** Set when the number belongs to one city rather than the whole country. */
  cityKo: z.string().nullable(),
  note: z.string().nullable(),
  sourceNote: z.string().min(1),
  checkedAt: z.iso.date(),
});
export const SafetyDirectoryInput = z.array(SafetyContactSchema).min(1);

/** content/routes/{slug}.json uses the snapshot shape directly: no transform step. */
export const RouteInput = RouteSchema;

export type PoiInput = z.infer<typeof PoiInputSchema>;
export type FacilityInput = z.infer<typeof FacilityInputSchema>;
export type CertificationInput = z.infer<typeof CertificationInputSchema>;
export type CuratedFact = z.infer<typeof CuratedFactSchema>;
export type ItineraryTemplateInput = z.infer<typeof ItineraryTemplateSchema>;
export type SafetyContact = z.infer<typeof SafetyContactSchema>;
export { LatLngSchema };
