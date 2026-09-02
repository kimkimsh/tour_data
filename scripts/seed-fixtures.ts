/**
 * Builds the six snapshot files WITHOUT calling the KTO API.
 *
 * Why this exists: `pnpm probe` and `pnpm ingest` both need a service key, and the
 * key takes a day to arrive. Until it does, `content/generated/` is empty and every
 * screen renders its "no data collected yet" state, which makes the whole service
 * impossible to review or demonstrate.
 *
 * What it is NOT: example data. Every capability KTO would supply is written as
 * `unknown` with `absenceKind: null` — which is exactly what the screens would show
 * if KTO answered with empty fields. Nothing is invented. The only facts with a
 * value are the ones a person confirmed and cited in content/curated-facts.json,
 * and the only places, coordinates and facilities are the ones in content/.
 *
 * So the output is not a mock of the finished service. It is the service, told the
 * truth about how little we currently know — and it makes the gap report do real
 * work on day one.
 *
 * `pnpm ingest` overwrites all of it as soon as a key exists.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import {
  AccessibilityPayload,
  ContextPayload,
  DocentPayload,
  PoisPayload,
  RelatedPayload,
  RoutesPayload,
  type Fact,
  type Poi,
  type Route,
} from '../src/domain/snapshot-schema';
import { CAPABILITIES } from '../src/domain/capabilities';
import { distanceMeters } from '../src/domain/geo';
import {
  CertificationsInput,
  CuratedFactsInput,
  FacilitiesInput,
  PoisInput,
  RouteInput,
} from '../src/domain/content-schema';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const GENERATED = join(CONTENT, 'generated');

const ACCOMMODATION_CONTENT_TYPE_IDS: readonly number[] = [32];
const EMERGENCY_SUPPORTED_M = 500;
const EMERGENCY_PARTIAL_M = 1000;
const AED_SUPPORTED_M = 300;
const AED_PARTIAL_M = 1000;

function read<T>(relative: string, schema: z.ZodType<T>): T {
  const path = join(CONTENT, relative);
  if (!existsSync(path)) {
    console.error(`seed-fixtures: content/${relative} is missing`);
    process.exit(1);
  }
  const parsed = schema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (!parsed.success) {
    console.error(`seed-fixtures: content/${relative}\n${z.prettifyError(parsed.error)}`);
    process.exit(1);
  }
  return parsed.data;
}

function write(name: string, payload: unknown): void {
  mkdirSync(GENERATED, { recursive: true });
  writeFileSync(join(GENERATED, `${name}.json`), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

const pois = read('pois.json', PoisInput);
const facilities = read('facilities.json', FacilitiesInput);
const certifications = read('certifications.json', CertificationsInput);
const curated = read('curated-facts.json', CuratedFactsInput);

const poisPayload: Poi[] = pois.map((poi) => ({
  slug: poi.slug,
  ktoContentId: poi.ktoContentId,
  contentTypeId: poi.contentTypeId,
  depthTier: poi.depthTier,
  coord: poi.coord,
  lDongRegnCd: poi.lDongRegnCd,
  lDongSignguCd: poi.lDongSignguCd,
  signguCd5: poi.signguCd5,
  lclsSystm3: poi.lclsSystm3,
  cityKo: poi.cityKo,
  cityEn: poi.cityEn,
  heritageLabel: poi.heritageLabel,
  isUnescoComponent: poi.isUnescoComponent,
  unescoComponentNote: poi.unescoComponentNote,
  // No collection has happened, so there is no upstream modification date to stand
  // in for a check date.
  ktoModifiedAt: null,
  i18n: {
    ko: { title: poi.nameKo, overview: null, addr: null, tel: null, homepage: null },
    en: { title: poi.nameEn, overview: null, addr: null, tel: null, homepage: null },
  },
  // Empty rather than a placeholder image: we hold no licensed image URL, and the
  // detail screen already has a state for that.
  media: [],
  certifications: certifications
    .filter((cert) => cert.poiSlug === poi.slug)
    .map((cert) => ({
      grade: cert.grade,
      validUntil: cert.validUntil,
      sourceNote: cert.sourceNote,
      checkedAt: cert.checkedAt,
    })),
  facilities: facilities
    .filter((facility) => facility.poiSlug === poi.slug)
    .map((facility) => ({
      kind: facility.kind,
      name: facility.name,
      coord: facility.coord,
      distanceM: facility.coord ? Math.round(distanceMeters(poi.coord, facility.coord)) : null,
      phone: facility.phone,
      detail: facility.detail,
      sourceNote: facility.sourceNote,
      checkedAt: facility.checkedAt,
    })),
  etcNotes: [],
}));

const routes: Route[] = [];
for (const poi of pois) {
  const relative = `routes/${poi.slug}.json`;
  if (existsSync(join(CONTENT, relative))) routes.push(read(relative, RouteInput));
}

function nearest(poi: Poi, kind: string): number | null {
  const distances = poi.facilities
    .filter((facility) => facility.kind === kind && facility.distanceM !== null)
    .map((facility) => facility.distanceM!);
  return distances.length === 0 ? null : Math.min(...distances);
}

function bandStatus(distance: number, supportedMax: number, partialMax: number): Fact['status'] {
  if (distance <= supportedMax) return 'supported';
  if (distance <= partialMax) return 'partial';
  return 'unsupported';
}

const facts: Fact[] = [];
for (const poi of poisPayload) {
  for (const capability of CAPABILITIES) {
    const notApplicable =
      !ACCOMMODATION_CONTENT_TYPE_IDS.includes(poi.contentTypeId) &&
      (capability.code === 'room' || capability.code === 'hearing_room');

    if (capability.ktoField !== null) {
      facts.push({
        poiSlug: poi.slug,
        capabilityCode: capability.code,
        status: 'unknown',
        absenceKind: notApplicable ? 'not_applicable' : null,
        detail: null,
        source: 'kto_with',
        sourceField: capability.ktoField,
        verifiedAt: null,
        isKtoScored: true,
      });
      continue;
    }

    // The two distance capabilities can be derived right now, because the facility
    // list is hand-researched and cited. Everything else derived needs an API.
    let status: Fact['status'] = 'unknown';
    let detail: string | null = null;
    if (capability.code === 'emergency_distance') {
      const distance = nearest(poi, 'hospital');
      if (distance !== null) {
        status = bandStatus(distance, EMERGENCY_SUPPORTED_M, EMERGENCY_PARTIAL_M);
        detail = `${distance}m`;
      }
    } else if (capability.code === 'aed_distance') {
      const distance = nearest(poi, 'aed');
      if (distance !== null) {
        status = bandStatus(distance, AED_SUPPORTED_M, AED_PARTIAL_M);
        detail = `${distance}m`;
      }
    } else if (capability.code === 'path_continuity') {
      const route = routes.find((r) => r.poiSlug === poi.slug);
      if (route) {
        const hazards = route.steps.filter((step) => step.hazard !== null).length;
        status = hazards === 0 ? 'supported' : 'partial';
        detail = `경로 단계 ${route.steps.length}개 중 주의 표시 ${hazards}개`;
      }
    }

    facts.push({
      poiSlug: poi.slug,
      capabilityCode: capability.code,
      status,
      absenceKind: null,
      detail,
      source: capability.code === 'path_continuity' ? 'derived_route' : 'derived_facility',
      sourceField: null,
      verifiedAt: status === 'unknown' ? null : new Date().toISOString().slice(0, 10),
      isKtoScored: false,
    });
  }
}

// Same priority as ingest: a curated fact wins, and it keeps the KTO denominator flag
// so the gap report still counts it as one of the 24 columns.
const byKey = new Map(facts.map((fact) => [`${fact.poiSlug}::${fact.capabilityCode}`, fact]));
for (const entry of curated) {
  const key = `${entry.poiSlug}::${entry.capabilityCode}`;
  const existing = byKey.get(key);
  byKey.set(key, {
    poiSlug: entry.poiSlug,
    capabilityCode: entry.capabilityCode,
    status: entry.status,
    absenceKind: entry.absenceKind ?? null,
    detail: entry.detail,
    source: 'curated',
    // The citation, same as ingest's applyCurated. Without it the evidence card reads
    // "공개 자료로 확인" with nothing after it — the one thing curated-facts.json
    // exists to supply.
    sourceField: entry.source,
    verifiedAt: entry.checkedAt,
    isKtoScored: existing?.isKtoScored ?? false,
  });
}

write('pois', PoisPayload.parse(poisPayload));
write('accessibility', AccessibilityPayload.parse([...byKey.values()]));
write('routes', RoutesPayload.parse(routes));
write('docent', DocentPayload.parse([]));
write(
  'context',
  ContextPayload.parse({ crowd: [], visitors: [], fetchedAt: new Date().toISOString() }),
);
write('related', RelatedPayload.parse([]));

const known = [...byKey.values()].filter((fact) => fact.status !== 'unknown').length;
console.log(
  `seed-fixtures wrote 6 snapshots: ${poisPayload.length} places, ${byKey.size} capability rows, ` +
    `${known} of them with a value.\n` +
    'Every KTO capability is unknown because no collection has run. ' +
    'Run `pnpm probe` then `pnpm ingest` once KTO_SERVICE_KEY_DECODING exists.',
);
