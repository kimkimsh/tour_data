import { z } from 'zod';
import {
  ABSENCE_KINDS,
  CAPABILITY_STATUSES,
  CERTIFICATION_GRADES,
  CONTENT_LOCALES,
  DEPTH_TIERS,
  EVIDENCE_LEVELS,
  FACILITY_KINDS,
  FACT_SOURCES,
  LOCALES,
  MEDIA_KINDS,
  PERSONA_IDS,
  ROUTE_STEP_ACTIONS,
} from './types';

/**
 * The real definition of the data model. The SQL DDL only says `payload jsonb`;
 * this file says what is inside it, and readSnapshot() parses against it on every
 * read so a broken shape surfaces immediately instead of rendering as blanks.
 *
 * Every enum is built from the const arrays in types.ts, so the TypeScript union
 * and the runtime check cannot drift apart.
 */

export const LatLngSchema = z.object({ lat: z.number(), lng: z.number() });

const I18nEntrySchema = z.object({
  title: z.string(),
  overview: z.string().nullable(),
  addr: z.string().nullable(),
  tel: z.string().nullable(),
  homepage: z.string().nullable(),
});

export const PoiSchema = z.object({
  slug: z.string().min(1),
  ktoContentId: z.string().min(1),
  contentTypeId: z.number(),
  depthTier: z.enum(DEPTH_TIERS),
  coord: LatLngSchema,
  lDongRegnCd: z.string(),
  lDongSignguCd: z.string(),
  signguCd5: z.string(),
  lclsSystm3: z.string().nullable(),
  /** City name, shown on the card. Taken from content/pois.json, not parsed out of an address. */
  cityKo: z.string().min(1),
  cityEn: z.string().min(1),
  /** Heritage designation name only. Designation numbers are not used. */
  heritageLabel: z.string().nullable(),
  /** Whether this POI is a UNESCO component of the Baekje Historic Areas. */
  isUnescoComponent: z.boolean(),
  /**
   * Set when the place is only part of a component, so the screen can say so
   * instead of printing the component's full name as if it were this one place.
   */
  unescoComponentNote: z.string().nullable(),
  /** KTO modifiedtime, the freshness input. Not a score input. */
  // KTO answers YYYYMMDDHHmmss. Ingest normalises it before it gets here, and this
  // is where that normalisation is enforced: a raw 14-digit stamp is unparseable by
  // Date.parse, which silently pins freshness to the oldest bucket forever.
  ktoModifiedAt: z.iso.date().nullable(),

  // partialRecord, not record: an entry is absent when the multilingual service
  // returned nothing for that POI. A required record would reject the snapshot.
  i18n: z.partialRecord(z.enum(CONTENT_LOCALES), I18nEntrySchema),

  media: z.array(
    z.object({
      /**
       * Either an absolute https URL or a same-origin /api/image-proxy path. Ingest
       * probes the https form and stores the proxy path when it does not serve, so
       * whichever one is here has already been checked against the live host.
       */
      url: z.string().refine(
        (value) => value.startsWith('https://') || value.startsWith('/api/image-proxy?'),
        'must be an https URL or an /api/image-proxy path',
      ),
      kind: z.enum(MEDIA_KINDS),
      /** KTO imgname or galTitle. Never the empty string — falls back to title plus index. */
      alt: z.string().min(1),
      licenseCode: z.string().nullable(),
      /** Finished attribution line, rendered verbatim. Never assembled on screen. */
      attribution: z.string(),
      /** Type3 means true: no optimisation, no crop, no resize. */
      noTransform: z.boolean(),
      caption: z.string().nullable(),
      sourceField: z.string(),
    }),
  ),

  certifications: z.array(
    z.object({
      grade: z.enum(CERTIFICATION_GRADES),
      validUntil: z.iso.date().nullable(),
      sourceNote: z.string().min(1),
      checkedAt: z.string().min(1),
    }),
  ),

  facilities: z.array(
    z.object({
      kind: z.enum(FACILITY_KINDS),
      name: z.string(),
      coord: LatLngSchema.nullable(),
      distanceM: z.number().nullable(),
      phone: z.string().nullable(),
      detail: z.string().nullable(),
      sourceNote: z.string().min(1),
      checkedAt: z.string().min(1),
    }),
  ),

  /** The four *etc fields. Shown as supplementary notes, never scored. */
  etcNotes: z.array(z.object({ sourceField: z.string(), text: z.string() })),
});
export const PoisPayload = z.array(PoiSchema);

export const FactSchema = z.object({
  poiSlug: z.string(),
  capabilityCode: z.string(),
  status: z.enum(CAPABILITY_STATUSES),
  /**
   * null is the default and means we do not know why the field is empty.
   * intrinsic and operator_missing are only ever written when curated-facts.json
   * names a source for that cause.
   */
  absenceKind: z.enum(ABSENCE_KINDS).nullable(),
  /** KTO wording, verbatim. The screen shows this sentence, not our paraphrase. */
  detail: z.string().nullable(),
  source: z.enum(FACT_SOURCES),
  sourceField: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  isKtoScored: z.boolean(),
});
export const AccessibilityPayload = z.array(FactSchema);

/** Free numbers are banned here. We did not measure a gradient, so we do not print one. */
export const SLOPE_NOTES = [
  '평탄',
  '완만한 오르막',
  '완만한 내리막',
  '가파른 구간 있음',
  '계단 있음',
  '단차 있음',
] as const;

export const RouteStepSchema = z.object({
  seq: z.number(),
  action: z.enum(ROUTE_STEP_ACTIONS),
  title: z.string().min(1),
  /** Plain wording. One action per step, short sentences, active voice. */
  easyText: z.string().min(1),
  detail: z.string().nullable(),
  distanceM: z.number().nullable(),
  surface: z.string().nullable(),
  slopeNote: z.enum(SLOPE_NOTES).nullable(),
  hazard: z.string().nullable(),
  photoUrl: z.string().nullable(),
  coord: LatLngSchema.nullable(),
});

export const RouteSchema = z.object({
  poiSlug: z.string(),
  title: z.string().min(1),
  entranceName: z.string().nullable(),
  personaFlags: z.array(z.enum(PERSONA_IDS)),
  totalDistanceM: z.number().nullable(),
  totalMinutes: z.number().nullable(),
  evidenceLevel: z.enum(EVIDENCE_LEVELS),
  /** Empty fails validation. An unstated evidence level is what we refuse to ship. */
  evidenceNote: z.string().min(1),
  checkedAt: z.string().min(1),
  steps: z.array(RouteStepSchema).min(1),
});
export const RoutesPayload = z.array(RouteSchema);

export const DocentSchema = z.object({
  poiSlug: z.string(),
  locale: z.enum(LOCALES),
  seq: z.number(),
  title: z.string(),
  /** Full transcript, used as the on-screen caption. */
  script: z.string().nullable(),
  /** Plain-language rewrite. Written by hand, tier A POIs only. */
  easyScript: z.string().nullable(),
  audioUrl: z.string().nullable(),
  /** Same shape rule as pois[].media[].url — see the note there. */
  imageUrl: z
    .string()
    .refine(
      (value) => value.startsWith('https://') || value.startsWith('/api/image-proxy?'),
      'must be an https URL or an /api/image-proxy path',
    )
    .nullable(),
  playTimeS: z.number().nullable(),
  odiiTid: z.string().nullable(),
  odiiStid: z.string().nullable(),
});
export const DocentPayload = z.array(DocentSchema);

export const VISITOR_CAVEAT =
  '방문자는 관광객과 동일하게 정의되지 않습니다 (출처: 한국관광 데이터랩)';

export const ContextPayload = z.object({
  crowd: z.array(
    z.object({
      poiSlug: z.string(),
      baseYmd: z.string(),
      /**
       * The manual gives no unit, denominator or ceiling, so the raw value is
       * stored unconstrained. A value outside 0..100 makes crowd_forecast
       * unknown rather than assigning it a wrong grade.
       */
      rate: z.number(),
      isPredicted: z.literal(true),
    }),
  ),
  visitors: z.array(
    z.object({
      signguCd5: z.string(),
      signguNm: z.string(),
      touDivCd: z.enum(['1', '2', '3']),
      /** Response value verbatim. The manual writes 현지인(a) / 외지인(b) / 외국인(c). */
      touDivNm: z.string(),
      windowStart: z.string(),
      windowEnd: z.string(),
      days: z.number(),
      /** Kept fractional: touNum is a model estimate, not a head count. */
      dailyAverage: z.number(),
      caveat: z.literal(VISITOR_CAVEAT),
    }),
  ),
  weather: z
    .array(z.object({ signguCd5: z.string(), warning: z.string().nullable() }))
    .optional(),
  fetchedAt: z.string(),
});

export const RelatedPayload = z.array(
  z.object({
    poiSlug: z.string(),
    baseYm: z.string(),
    items: z.array(
      z.object({
        code: z.string(),
        name: z.string(),
        signguNm: z.string().nullable(),
        categoryLcls: z.string().nullable(),
        rank: z.number(),
      }),
    ),
  }),
);

export type Poi = z.infer<typeof PoiSchema>;
export type PoiMedia = Poi['media'][number];
export type PoiFacility = Poi['facilities'][number];
export type PoiCertification = Poi['certifications'][number];
export type Fact = z.infer<typeof FactSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type RouteStep = z.infer<typeof RouteStepSchema>;
export type Docent = z.infer<typeof DocentSchema>;
export type ContextSnapshot = z.infer<typeof ContextPayload>;
export type RelatedSnapshot = z.infer<typeof RelatedPayload>;
export type SlopeNote = (typeof SLOPE_NOTES)[number];

export const SNAPSHOT_KEYS = [
  'pois',
  'accessibility',
  'routes',
  'docent',
  'context',
  'related',
] as const;
export type SnapshotKey = (typeof SNAPSHOT_KEYS)[number];
