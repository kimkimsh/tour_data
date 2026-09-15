/**
 * KTO and the hand-written content files in, six jsonb snapshots out.
 *
 * Runs on a schedule and by hand, never in response to a page view. That is what
 * lets the screens hold to "no external API call at request time", and it is why a
 * portal outage during judging cannot take the service down.
 *
 * Two invariants worth stating before reading further.
 *
 * Order. `accessibility` runs after `routes` and `context`, because three of its
 * eight derived capabilities read those two snapshots. Run it first and those three
 * are permanently unknown — and rebuilding routes afterwards does not fix the
 * already-written accessibility payload.
 *
 * Atomicity. Each stage builds its whole payload in memory, validates it, and
 * writes once. A failure halfway through leaves the previous snapshot serving
 * rather than publishing half a payload. No staging table is needed for that.
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
  SNAPSHOT_KEYS,
  VISITOR_CAVEAT,
  type Fact,
  type Poi,
  type Route,
  type SnapshotKey,
} from '../src/domain/snapshot-schema';
import { CAPABILITIES, KTO_ETC_FIELDS, resolveStatus } from '../src/domain/capabilities';
import { distanceMeters } from '../src/domain/geo';
import { AUDIO_HOSTS } from '../src/config/media-hosts';
import { CONTENT_LOCALES, type ContentLocale } from '../src/domain/types';
import {
  CertificationsInput,
  CuratedFactsInput,
  FacilitiesInput,
  PoisInput,
  RouteInput,
  UNRESOLVED_CONTENT_ID,
  type CuratedFact,
  type PoiInput,
} from '../src/domain/content-schema';
import {
  getBarrierFreeDetail,
  getCrowdForecast,
  getLclsSystmCodes,
  getLdongCodes,
  getMultilingualPoiCommon,
  getOdiiStories,
  getPoiCommon,
  getPoiImages,
  getPoiIntro,
  getPoiRepeatInfo,
  getVisitorsForDay,
  listAllOdiiThemes,
  searchPhotoGallery,
  searchRelatedTourism,
  type MultilingualLocale,
} from '../src/lib/kto/services';
import {
  gatewayCallStats,
  hasServiceKey,
  isQuotaExceeded,
  isOperationRetired,
  type KtoPagesResult,
  type KtoResult,
} from '../src/lib/kto/transport';
import { ktoTimestampToIsoDate, readStoryCoord, readThemeCoord } from '../src/lib/kto/schemas';
import { getWeatherWarnings, kmaRegionFor, readWarningFor } from '../src/lib/kma/warnings';
import { getMidOutlook, getShortTermForecast, readDayCondition } from '../src/lib/kma/forecast';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const GENERATED = join(CONTENT, 'generated');

// tsx does not load .env.local the way next dev does.
const ENV_FILE = join(ROOT, '.env.local');
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const STAGE_ORDER = [
  'bootstrap',
  'pois',
  'routes',
  'context',
  'accessibility',
  'docent',
  'related',
] as const;
type Stage = (typeof STAGE_ORDER)[number];

/**
 * How close an undeclared Odii theme has to be before ingest mentions it. It selects
 * nothing — `odiiThemeIds` in content/pois.json does that — and only decides which
 * unclaimed themes are worth a person's attention.
 */
const ODII_REVIEW_RADIUS_M = 1000;
const VISITOR_WINDOW_DAYS = 8;

/**
 * How far back to walk looking for the newest day DataLabService has published.
 * Sized from the measured lag (see buildContext) with two weeks of headroom, so the
 * scan still finds the edge if KTO publishes later than it does today.
 */
const VISITOR_LAG_SCAN_DAYS = 45;
const CROWD_SUPPORTED_MAX = 40;
const CROWD_PARTIAL_MAX = 70;
const EMERGENCY_SUPPORTED_M = 500;
const EMERGENCY_PARTIAL_M = 1000;
const AED_SUPPORTED_M = 300;
const AED_PARTIAL_M = 1000;
const HIDDEN_REPORT_TTL_DAYS = 90;
/**
 * Guest-room capabilities only exist for accommodation. Written as a list of ids
 * rather than an inequality so that widening PoiInputSchema to accept type 32 does
 * not silently mark a hotel's rooms as not applicable.
 */
const ACCOMMODATION_CONTENT_TYPE_IDS: readonly number[] = [32];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyArg = args.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);
const stages: Stage[] = onlyArg
  ? onlyArg.split(',').map((name) => {
      if (!(STAGE_ORDER as readonly string[]).includes(name)) {
        exit(`unknown stage "${name}". Stages: ${STAGE_ORDER.join(', ')}`);
      }
      return name as Stage;
    })
  : [...STAGE_ORDER];

/**
 * Spec 3.4: a stage that hits the daily quota must write nothing at all. Warning and
 * continuing publishes a half-filled payload, and the next day's run then sees data
 * where it exists and skips it, so the missing half never arrives.
 */
function abortOnQuota(result: KtoResult | KtoPagesResult, where: string): void {
  if (isQuotaExceeded(result)) {
    exit(`daily quota reached while fetching ${where}. Nothing was published; run again later.`);
  }
}

function exit(message: string): never {
  console.error(`ingest: ${message}`);
  process.exit(1);
}

/**
 * Today in Asia/Seoul, as YYYY-MM-DD.
 *
 * Not `new Date().toISOString().slice(0, 10)`. This runs on GitHub Actions and Vercel,
 * both UTC, so between 00:00 and 09:00 KST that expression names yesterday — the visitor
 * is standing in Korea and every date this pipeline writes is a Korean date. The
 * database already had this right (barrier_reports.created_day is generated `at time
 * zone 'Asia/Seoul'`); the TypeScript side did not.
 *
 * en-CA because it formats as YYYY-MM-DD.
 */
function seoulToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

/** The same instant as YYYYMMDD, which is what the KTO date parameters take. */
function seoulTodayCompact(): string {
  return seoulToday().replace(/-/g, '');
}

function warn(message: string): void {
  console.warn(`warn  ${message}`);
}

function readContent<T>(relative: string, schema: z.ZodType<T>): T {
  const path = join(CONTENT, relative);
  if (!existsSync(path)) exit(`content/${relative} is missing`);
  const parsed = schema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (!parsed.success) exit(`content/${relative}\n${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

/**
 * A previously written snapshot. Reads the git-tracked copy rather than the
 * database, so a partial run (`--only=accessibility`) behaves the same whether or
 * not Supabase is reachable.
 */
function readGenerated<T>(key: SnapshotKey, schema: z.ZodType<T>): T | undefined {
  const path = join(GENERATED, `${key}.json`);
  if (!existsSync(path)) return undefined;
  const parsed = schema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (!parsed.success) {
    warn(`content/generated/${key}.json does not match its schema and was ignored`);
    return undefined;
  }
  return parsed.data;
}

/**
 * The database is written first and the file second, so a failed upsert leaves both
 * on the old payload. The other order lets content/generated/*.json run ahead of
 * data_snapshots, and both later stages and src/lib/data.ts can read those files —
 * a discrepancy that would then look like collected data.
 */
/**
 * Nothing is published after a call that never reached the gateway.
 *
 * A stage assembles whatever its calls returned and publishes it, which is right when
 * the gateway answered and wrong when it did not: an unanswered call and an empty
 * answer are the same empty array by the time a stage builds its payload. Measured —
 * a GitHub Actions run reached apis.data.go.kr on none of its calls, warned on every
 * one, and still published a pois snapshot with media: [] over the good one. Six place
 * pages then said 이 관광지 사진은 아직 모으지 못했습니다 about 89 photographs that exist.
 *
 * Yesterday's snapshot is the correct output of a run that could not see today. This
 * is the same call abortOnQuota makes and for the same reason.
 */
function requireGatewayWasReachable(what: SnapshotKey | 'bootstrap'): void {
  const { reached, unreachable } = gatewayCallStats();
  if (unreachable === 0) return;
  exit(
    `${unreachable} call(s) never reached the gateway (${reached} did). Nothing was published, ` +
      `including ${what}: a stage cannot tell an unanswered call from an empty answer, and the ` +
      'snapshot already in place was collected when the gateway was reachable.',
  );
}

async function publish(key: SnapshotKey, payload: unknown, rowCount: number, sourceNote: string) {
  requireGatewayWasReachable(key);

  const writeFile = () => {
    mkdirSync(GENERATED, { recursive: true });
    writeFileSync(join(GENERATED, `${key}.json`), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  };

  if (dryRun) {
    writeFile();
    console.log(`dry-run  ${key}: ${rowCount} rows (file written, database untouched)`);
    return;
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    writeFile();
    warn(`${key}: Supabase is not configured, so only content/generated/${key}.json was written`);
    return;
  }

  const { createAdminClient } = await import('../src/lib/supabase/admin');
  const { error } = await createAdminClient()
    .from('data_snapshots')
    .upsert({
      key,
      payload,
      row_count: rowCount,
      source_note: sourceNote,
      updated_at: new Date().toISOString(),
    });
  if (error) exit(`${key}: could not write the snapshot — ${error.message}`);
  writeFile();
  console.log(`ok       ${key}: ${rowCount} rows`);
}

function requireKey(): void {
  if (!hasServiceKey()) {
    exit(
      'KTO_SERVICE_KEY_DECODING is not set. Put the DECODING form of the key in .env.local — ' +
        'the ENCODING form is re-encoded by URLSearchParams and the gateway answers resultCode 30.',
    );
  }
}

// ── stage 0: bootstrap ─────────────────────────────────────────────────────────

async function bootstrap(pois: PoiInput[]): Promise<void> {
  requireKey();
  const regionCode = pois[0]?.lDongRegnCd;
  if (!regionCode) exit('content/pois.json has no entries');

  const [ldong, lcls] = await Promise.all([getLdongCodes(regionCode), getLclsSystmCodes()]);
  if (!ldong.ok) warn(`ldongCode2 failed: ${ldong.message}`);
  if (!lcls.ok) warn(`lclsSystmCode2 failed: ${lcls.message}`);

  // This stage writes its file directly rather than through publish(), so it needs
  // the same guard: an unreachable gateway would otherwise replace 2,338 lines of
  // code tables with two empty arrays, and every later stage reads this file.
  requireGatewayWasReachable('bootstrap');

  mkdirSync(GENERATED, { recursive: true });
  writeFileSync(
    join(GENERATED, 'codes.json'),
    `${JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        ldong: ldong.ok ? ldong.items : [],
        lclsSystm: lcls.ok ? lcls.items : [],
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log('ok       bootstrap: content/generated/codes.json');
}

// ── stage 1: pois ──────────────────────────────────────────────────────────────

function toHttps(url: string): string {
  return url.replace(/^http:\/\//, 'https://');
}

/**
 * The same URL back, unless its host is one Content-Security-Policy will not let the
 * browser play — in which case the run stops here.
 *
 * Storing such a URL is worse than storing none: the player renders, the controls
 * work, and the fetch is refused by the policy without firing the error handler the
 * player listens for. src/config/media-hosts.ts is the list to edit, and editing it
 * changes the response header in the same commit.
 */
function checkedAudioUrl(url: string, poiSlug: string): string {
  const host = new URL(url).hostname;
  if (!(AUDIO_HOSTS as readonly string[]).includes(host)) {
    exit(
      `${poiSlug}: Odii returned audio on ${host}, which Content-Security-Policy blocks. ` +
        `Add it to AUDIO_HOSTS in src/config/media-hosts.ts and redeploy, then run again.`,
    );
  }
  return url;
}

const IMAGE_PROBE_TIMEOUT_MS = 6000;
const probedImageUrls = new Map<string, string>();

/**
 * The stored image URL, decided here rather than at render time.
 *
 * Most KTO image URLs are http and an https page blocks them as mixed content, so
 * toHttps is tried first — but the https form does not always serve. When it does not,
 * the URL that goes into the snapshot is /api/image-proxy, which fetches the original
 * bytes over http server-side and passes them through this origin unchanged (that
 * route rewrites nothing, which is what a KOGL type 3 image requires).
 *
 * Deciding at ingest is the point: the choice is made once against the live host,
 * recorded in the payload, and visible in the committed file — rather than being a
 * fallback path in the app that nothing ever selects.
 */
async function resolveImageUrl(rawUrl: string): Promise<string> {
  const cached = probedImageUrls.get(rawUrl);
  if (cached !== undefined) return cached;

  const https = toHttps(rawUrl);
  // A one-byte ranged GET, not HEAD. tong.visitkorea.or.kr answers HEAD with 405 on
  // every path, so the probe failed for every image and sent all of them through
  // /api/image-proxy — measured at 460 of 460 in the first full run, and recorded as
  // a cost this service would have to carry. It does not: the same 89 URLs answer a
  // ranged GET with 206 and the image bytes. Range keeps the probe to one byte.
  const serves = await fetch(https, {
    headers: { range: 'bytes=0-0' },
    signal: AbortSignal.timeout(IMAGE_PROBE_TIMEOUT_MS),
    redirect: 'error',
  })
    .then((response) => response.ok && (response.headers.get('content-type') ?? '').startsWith('image/'))
    .catch(() => false);

  const resolved = serves ? https : `/api/image-proxy?url=${encodeURIComponent(rawUrl)}`;
  if (!serves) warn(`${https} does not serve over https; routed through /api/image-proxy`);
  probedImageUrls.set(rawUrl, resolved);
  return resolved;
}

/**
 * Photo-gallery hits, most-relevant first and then cut short.
 *
 * gallerySearchList1 keyword-matches loosely, so a search for 공산성 comes back with
 * 백제군사박물관 (a museum in Nonsan), 금강철교 and 미르섬 among the 121 rows it
 * returned. Two problems, one fix: a photo of somewhere else under this place's name
 * is wrong, and 121 images on one page is 121 requests through /api/image-proxy —
 * every KTO asset fails the https probe, so the proxy is the only path they take.
 *
 * Rows whose own title names the place come first. The rest are kept, not dropped:
 * 낙화암 and 군창지 are inside 부소산성 and their titles never say so, and the page
 * prints each photo's own title beside it, so a reader can see what they are looking
 * at. The cap is what removes the far-off ones.
 */
const GALLERY_PHOTO_LIMIT = 8;

function rankAndCapGallery<T extends { galTitle?: string | null }>(
  items: readonly T[],
  keyword: string,
): T[] {
  const wanted = keyword.replace(/\s+/g, '');
  const names = (item: T) => (item.galTitle ?? '').replace(/\s+/g, '').includes(wanted);
  return [...items.filter(names), ...items.filter((item) => !names(item))].slice(
    0,
    GALLERY_PHOTO_LIMIT,
  );
}

async function buildPois(pois: PoiInput[]): Promise<void> {
  requireKey();
  const facilities = readContent('facilities.json', FacilitiesInput);
  const certifications = readContent('certifications.json', CertificationsInput);

  const built: Poi[] = [];

  for (const poi of pois) {
    if (poi.ktoContentId === UNRESOLVED_CONTENT_ID) {
      exit(`${poi.slug}: ktoContentId is still "${UNRESOLVED_CONTENT_ID}". Run \`pnpm probe\` first.`);
    }

    const [common, intro, images, repeatInfo] = await Promise.all([
      getPoiCommon(poi.ktoContentId),
      getPoiIntro(poi.ktoContentId, poi.contentTypeId),
      getPoiImages(poi.ktoContentId),
      // Only contentTypeId 12 and 38 list the barrier-free-facilities value among
      // their allowed infoname values; type 14 does not, so the call is skipped
      // rather than made and discarded.
      poi.contentTypeId === 12
        ? getPoiRepeatInfo(poi.ktoContentId, poi.contentTypeId)
        : Promise.resolve(null),
    ]);

    for (const result of [common, intro, images]) {
      if (isQuotaExceeded(result)) exit('daily quota reached. Nothing was published; run again later.');
      if (isOperationRetired(result)) exit('an operation answered 12 (absent or retired). Check spec 03.');
    }

    const i18n: Partial<Record<ContentLocale, {
      title: string;
      overview: string | null;
      addr: string | null;
      tel: string | null;
      homepage: string | null;
    }>> = {};

    const koRow = common.ok ? common.items[0] : undefined;
    // Our name, not the catalogue's. A TourAPI title is a listing headline: it
    // appends "[유네스코 세계유산]" with inconsistent spacing, and for busosanseong it
    // names a larger asset than the one this record is about — "관북리유적과 부소산성",
    // where every fact, route and score here covers 부소산성 alone. content/pois.json
    // carries the designation name checked against the Korea Heritage Service, and
    // that is the name the screens, the exports and the gap report all have to agree
    // on. Everything else in this block still comes from upstream.
    i18n.ko = {
      title: poi.nameKo,
      overview: koRow?.overview ?? null,
      addr: [koRow?.addr1, koRow?.addr2].filter(Boolean).join(' ') || null,
      tel: koRow?.tel ?? null,
      homepage: koRow?.homepage ?? null,
    };

    for (const locale of CONTENT_LOCALES.filter((l) => l !== 'ko')) {
      const result = await getMultilingualPoiCommon(locale as MultilingualLocale, poi.ktoContentId);
      if (!result.ok) {
        abortOnQuota(result, `${poi.slug} ${locale} detailCommon2`);
        warn(`${poi.slug}: ${locale} detailCommon2 failed — ${result.message}`);
        continue;
      }
      const row = result.items[0];
      if (!row?.title) continue;
      i18n[locale] = {
        // Same rule as the Korean title above: ours names the asset this record
        // covers, and the two locales have to be about the same place.
        title: locale === 'en' ? poi.nameEn : row.title,
        overview: row.overview ?? null,
        addr: [row.addr1, row.addr2].filter(Boolean).join(' ') || null,
        tel: row.tel ?? null,
        homepage: row.homepage ?? null,
      };
    }
    // The hand-written English name is the fallback, so an English screen never
    // shows a slug where a title belongs.
    i18n.en ??= { title: poi.nameEn, overview: null, addr: null, tel: null, homepage: null };

    const media: Poi['media'] = [];
    for (const [index, image] of (images.ok ? images.items : []).entries()) {
      const url = image.originimgurl ?? image.smallimageurl;
      if (!url) continue;
      const noTransform = image.cpyrhtDivCd === 'Type3';
      media.push({
        url: await resolveImageUrl(url),
        kind: 'photo',
        // imgname is the only image description KTO gives, and a screen-reader user
        // is a first-class visitor here, so an empty one falls back to a real phrase
        // rather than to the empty string.
        alt: image.imgname?.trim() || `${poi.nameKo} 사진 ${index + 1}`,
        licenseCode: image.cpyrhtDivCd ?? null,
        attribution: noTransform
          ? '출처: 한국관광공사 · 공공누리 제3유형 (변경금지)'
          : '출처: 한국관광공사 TourAPI',
        noTransform,
        caption: null,
        sourceField: 'detailImage2.originimgurl',
      });
    }

    const gallery = await searchPhotoGallery(poi.nameKo);
    if (gallery.ok) {
      for (const photo of rankAndCapGallery(gallery.items, poi.odiiKeyword)) {
        if (!photo.galWebImageUrl) continue;
        media.push({
          url: await resolveImageUrl(photo.galWebImageUrl),
          kind: 'gallery',
          alt: photo.galTitle?.trim() || `${poi.nameKo} 관광사진`,
          // The photo-gallery manual states no licence at all, so no KOGL type is
          // claimed here. The photographer is named and the image is not altered.
          licenseCode: null,
          attribution: `출처: 한국관광공사 관광사진갤러리${photo.galPhotographer ? ` · ${photo.galPhotographer}` : ''}`,
          noTransform: true,
          caption: photo.galTitle ?? null,
          sourceField: 'gallerySearchList1.galWebImageUrl',
        });
      }
    } else {
      abortOnQuota(gallery, `${poi.slug} gallerySearchList1`);
      warn(`${poi.slug}: gallerySearchList1 failed — ${gallery.message}`);
    }

    const etcNotes: Poi['etcNotes'] = [];
    for (const row of repeatInfo?.ok ? repeatInfo.items : []) {
      if (!row.infoname || !row.infotext) continue;
      if (!/장애인\s*편의시설/.test(row.infoname)) continue;
      etcNotes.push({
        sourceField: `detailInfo2.infoname=${row.infoname}`,
        // Stored as prose and shown as prose. Splitting a paragraph into capability
        // codes automatically is the inference principle 1 forbids.
        text: row.infotext.replace(/<br\s*\/?>/gi, '\n'),
      });
    }

    const poiFacilities = facilities
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
      }));

    built.push({
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
      placeRole: poi.placeRole,
      unescoComponentNote: poi.unescoComponentNote,
      ktoModifiedAt: ktoTimestampToIsoDate(koRow?.modifiedtime),
      i18n,
      media,
      certifications: certifications
        .filter((cert) => cert.poiSlug === poi.slug)
        .map((cert) => ({
          grade: cert.grade,
          validUntil: cert.validUntil,
          sourceNote: cert.sourceNote,
          checkedAt: cert.checkedAt,
        })),
      facilities: poiFacilities,
      etcNotes,
    });
  }

  const payload = PoisPayload.parse(built);
  await publish('pois', payload, payload.length, '한국관광공사 detailCommon2/detailIntro2/detailImage2 + gallerySearchList1 + content/*.json');
}

// ── stage 2: routes ────────────────────────────────────────────────────────────

async function buildRoutes(pois: PoiInput[]): Promise<void> {
  const routes: Route[] = [];
  for (const poi of pois) {
    const relative = `routes/${poi.slug}.json`;
    if (!existsSync(join(CONTENT, relative))) continue;
    routes.push(readContent(relative, RouteInput));
  }
  // No publish flag: a route file that exists is shown. The previous design had an
  // is_published column that nothing ever set to true.
  const payload = RoutesPayload.parse(routes);
  await publish('routes', payload, payload.length, 'content/routes/*.json');
}

// ── stage 3: context ───────────────────────────────────────────────────────────

function ymdMinus(ymd: string, days: number): string {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6)) - 1;
  const day = Number(ymd.slice(6, 8));
  const date = new Date(Date.UTC(year, month, day - days));
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

async function buildContext(pois: PoiInput[]): Promise<void> {
  requireKey();

  const crowd: z.infer<typeof ContextPayload>['crowd'] = [];
  const sigunguCodes = Array.from(new Set(pois.map((poi) => poi.signguCd5)));

  for (const signguCd of sigunguCodes) {
    const areaCd = pois.find((poi) => poi.signguCd5 === signguCd)!.lDongRegnCd;
    const result = await getCrowdForecast({ areaCd, signguCd });
    if (!result.ok) {
      abortOnQuota(result, `crowd forecast ${signguCd}`);
      warn(`crowd forecast for ${signguCd} failed — ${result.message}`);
      continue;
    }
    if (result.truncated) {
      warn(`crowd forecast for ${signguCd} hit the page cap; a site may be missing`);
    }
    for (const poi of pois.filter((p) => p.signguCd5 === signguCd)) {
      if (poi.tatsName === null) continue;
      const rows = result.items.filter((row) => row.tAtsNm === poi.tatsName);
      // One row per day for the next 30 days. The nearest date is the useful one.
      const nearest = rows.sort((a, b) => (a.baseYmd ?? '').localeCompare(b.baseYmd ?? ''))[0];
      if (!nearest?.baseYmd || nearest.cnctrRate === undefined) continue;
      crowd.push({ poiSlug: poi.slug, baseYmd: nearest.baseYmd, rate: nearest.cnctrRate, isPredicted: true });
    }
  }

  // The window ends at the most recent day the API actually answers for, found by
  // walking back from today. The delay is measured, never assumed: a hard-coded
  // "four days" wastes a call when the delay is five and drops a day when it is three.
  //
  // The scan has to reach further back than anyone expects, which is what sets the
  // bound. Measured one call per day across a full month: thirty consecutive dates
  // answered resultCode 0000 with totalCount 0, and the thirty-first answered with 807
  // rows. An empty day is not an error here and not the end of the data — it is the
  // publication lag, and it is around a month rather than the few days the earlier
  // spec assumed. A bound shorter than the lag makes a working service look dead:
  // every probe succeeds, every probe is empty, and context.visitors is silently [].
  const today = seoulTodayCompact();
  let endYmd: string | null = null;
  for (let back = 0; back < VISITOR_LAG_SCAN_DAYS && endYmd === null; back += 1) {
    const candidate = ymdMinus(today, back);
    const probe = await getVisitorsForDay(candidate);
    if (probe.ok && probe.items.length > 0) endYmd = candidate;
  }

  const visitors: z.infer<typeof ContextPayload>['visitors'] = [];
  if (endYmd === null) {
    warn(
      `no visitor data answered within the last ${VISITOR_LAG_SCAN_DAYS} days; context.visitors is empty`,
    );
  } else {
    const wanted = new Set(sigunguCodes);
    const totals = new Map<string, { sum: number; days: number; name: string; divisionName: string }>();
    for (let offset = 0; offset < VISITOR_WINDOW_DAYS; offset += 1) {
      const ymd = ymdMinus(endYmd, offset);
      const day = await getVisitorsForDay(ymd);
      if (!day.ok) {
        abortOnQuota(day, `visitors ${ymd}`);
        warn(`visitors for ${ymd} failed — ${day.message}`);
        continue;
      }
      for (const row of day.items) {
        if (!row.signguCode || !wanted.has(row.signguCode)) continue;
        // Three rows arrive per sigungu per day, one per touDivCd. Averaging without
        // filtering counts one day three times. '2' is the out-of-town domestic
        // division, the closest thing to a visiting tourist.
        if (row.touDivCd !== '2') continue;
        if (row.touNum === undefined) continue;
        const entry = totals.get(row.signguCode) ?? {
          sum: 0,
          days: 0,
          name: row.signguNm ?? row.signguCode,
          divisionName: row.touDivNm ?? '',
        };
        entry.sum += row.touNum;
        entry.days += 1;
        totals.set(row.signguCode, entry);
      }
    }
    for (const [signguCd5, entry] of totals) {
      visitors.push({
        signguCd5,
        signguNm: entry.name,
        touDivCd: '2',
        // The response value verbatim. The manual's three division names are
        // local, out-of-town and foreign, each with a letter suffix, and it never
        // uses a word meaning "domestic" — so neither does this field.
        touDivNm: entry.divisionName,
        windowStart: ymdMinus(endYmd, VISITOR_WINDOW_DAYS - 1),
        windowEnd: endYmd,
        days: entry.days,
        // Left fractional: touNum is a mobile-signal model estimate, not a head count.
        dailyAverage: entry.days === 0 ? 0 : entry.sum / entry.days,
        caveat: VISITOR_CAVEAT,
      });
    }
  }

  const weather = await buildWeather(pois);
  const forecast = await buildForecast(pois);

  const payload = ContextPayload.parse({
    crowd,
    visitors,
    weather,
    forecast,
    fetchedAt: new Date().toISOString(),
  });
  await publish(
    'context',
    payload,
    crowd.length + visitors.length + weather.length + forecast.length,
    '한국관광공사 TatsCnctrRateService + DataLabService + 기상청 WthrWrnInfoService · VilageFcstInfoService_2.0 · MidFcstInfoService',
  );
}

// ── stage 4: accessibility ─────────────────────────────────────────────────────

function derivedStatus(value: number, supportedMax: number, partialMax: number) {
  // Half-open intervals. cnctrRate arrives fractional (the manual's sample is 64.65),
  // so ranges written as 41-70 leave 40.5 undefined.
  if (value <= supportedMax) return 'supported' as const;
  if (value <= partialMax) return 'partial' as const;
  return 'unsupported' as const;
}

/** The crowding band as a word, on the same thresholds derivedStatus uses. */
function crowdBandKo(rate: number): string {
  if (rate <= CROWD_SUPPORTED_MAX) return '여유';
  if (rate <= CROWD_PARTIAL_MAX) return '보통';
  return '혼잡';
}

/** YYYYMMDD, which is what the KTO date parameters carry, as a date people read. */
function formatYmd(value: string): string {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : value;
}

async function buildAccessibility(pois: PoiInput[]): Promise<void> {
  requireKey();
  const curated = readContent('curated-facts.json', CuratedFactsInput);
  const routes = readGenerated('routes', RoutesPayload);
  const context = readGenerated('context', ContextPayload);
  const poisSnapshot = readGenerated('pois', PoisPayload);

  if (!routes) warn('routes snapshot missing: path_continuity will be unknown');
  if (!context) warn('context snapshot missing: crowd_forecast will be unknown');
  if (!poisSnapshot) warn('pois snapshot missing: the distance capabilities will be unknown');

  const facts: Fact[] = [];

  for (const poi of pois) {
    const detail = await getBarrierFreeDetail(poi.ktoContentId);
    if (isQuotaExceeded(detail)) exit('daily quota reached. Nothing was published; run again later.');

    const row = detail.ok ? detail.items[0] : undefined;
    const noResponse = !detail.ok || detail.items.length === 0;
    if (noResponse) {
      // resultCode 03 alone does not establish "not registered": a wrong contentId and
      // a transient failure produce the same answer. absenceKind stays null and the
      // screen says we did not receive a response, not why.
      warn(`${poi.slug}: no barrier-free response. Cause unknown — see P0-11.`);
    }

    const verifiedAt = poisSnapshot?.find((p) => p.slug === poi.slug)?.ktoModifiedAt ?? null;

    for (const capability of CAPABILITIES) {
      if (capability.ktoField === null) continue;
      const raw = row ? ((row as Record<string, unknown>)[capability.ktoField] as string | undefined) : undefined;
      // Not applicable, not unknown: a place that is not accommodation cannot have a
      // guest room, and scoring that 0.35 drags the facilities axis down and inflates
      // the "unknown" count that goes to the municipality.
      const notApplicable =
        !ACCOMMODATION_CONTENT_TYPE_IDS.includes(poi.contentTypeId) &&
        (capability.code === 'room' || capability.code === 'hearing_room');

      facts.push({
        poiSlug: poi.slug,
        capabilityCode: capability.code,
        status: notApplicable ? 'unknown' : resolveStatus(raw, capability.code),
        absenceKind: notApplicable ? 'not_applicable' : null,
        detail: raw?.trim() ? raw.trim() : null,
        source: 'kto_with',
        sourceField: capability.ktoField,
        // KTO gives no per-item date, only one modifiedtime per place, so that is
        // what every KTO-sourced item carries. The screen says so.
        verifiedAt: notApplicable ? null : verifiedAt,
        isKtoScored: true,
      });
    }

    const route = routes?.find((r) => r.poiSlug === poi.slug);
    const hazardSteps = route?.steps.filter((step) => step.hazard !== null).length ?? null;
    push(facts, poi.slug, 'path_continuity', route
      ? {
          status: hazardSteps === 0 ? 'supported' : 'partial',
          detail: `경로 단계 ${route.steps.length}개 중 주의 표시 ${hazardSteps}개`,
          source: 'derived_route',
        }
      : null);

    const crowdRow = context?.crowd.find((c) => c.poiSlug === poi.slug);
    push(facts, poi.slug, 'crowd_forecast', crowdRow
      ? crowdRow.rate < 0 || crowdRow.rate > 100
        ? // The manual states no unit, denominator or ceiling for cnctrRate, so a value
          // outside 0..100 breaks the assumption the grades rest on. A wrong grade is
          // worse than no grade.
          { status: 'unknown', detail: `집중률 ${crowdRow.rate} — 스케일 가정 밖`, source: 'tats' }
        : {
            status: derivedStatus(crowdRow.rate, CROWD_SUPPORTED_MAX, CROWD_PARTIAL_MAX),
            // The band in words, then the figure. The manual gives cnctrRate no unit,
            // denominator or ceiling, so the bare number was unreadable on screen —
            // "예측 혼잡도 82.94" told a visitor nothing about whether to go that day.
            // The thresholds it is banded against are named right here rather than
            // left to a reader to infer from the badge.
            detail:
              `${crowdBandKo(crowdRow.rate)} — 집중률 ${crowdRow.rate.toFixed(1)}` +
              ` (${CROWD_SUPPORTED_MAX} 이하 여유 · ${CROWD_PARTIAL_MAX} 이하 보통).` +
              ` ${formatYmd(crowdRow.baseYmd)} 기준, 향후 30일 예측치입니다`,
            source: 'tats',
          }
      : null);

    // Reads the state, never infers it from an empty field. A missing row and a row
    // saying "could not check" both land on unknown; only an explicit `none` is an
    // all-clear. push(..., null) is what produces unknown, so the unknown branch has to
    // stay a branch rather than a fallthrough.
    const weatherRow = context?.weather?.find((w) => w.signguCd5 === poi.signguCd5);
    push(facts, poi.slug, 'weather_warning', weatherRow && weatherRow.state !== 'unknown'
      ? {
          status: weatherRow.state === 'none' ? 'supported' : 'unsupported',
          detail:
            weatherRow.state === 'none'
              ? `발효 중인 기상 특보가 없습니다 (${weatherRow.checkedAt} 확인` +
                `${weatherRow.scope === 'province' ? ', 도 단위 조회' : ''})`
              : weatherRow.warning,
          source: 'kma',
        }
      : null);

    // Only today's day is scored. The 4-10 day outlook lives in the same snapshot row
    // and is never turned into a fact: a suitability score answers for one moment, and
    // a value indexed by a different day would make the same ramp score differently on
    // Tuesday and Thursday for a reason that has nothing to do with the ramp.
    const forecastRow = context?.forecast?.find((f) => f.signguCd5 === poi.signguCd5);
    push(facts, poi.slug, 'weather_forecast', forecastRow && forecastRow.today.state !== 'unknown'
      ? {
          status:
            forecastRow.today.state === 'good'
              ? 'supported'
              : forecastRow.today.state === 'caution'
                ? 'partial'
                : 'unsupported',
          detail: forecastRow.today.detail,
          source: 'kma',
        }
      : null);

    const snapshotPoi = poisSnapshot?.find((p) => p.slug === poi.slug);
    push(facts, poi.slug, 'emergency_distance', nearestFacility(snapshotPoi, 'hospital', EMERGENCY_SUPPORTED_M, EMERGENCY_PARTIAL_M));
    push(facts, poi.slug, 'aed_distance', nearestFacility(snapshotPoi, 'aed', AED_SUPPORTED_M, AED_PARTIAL_M));
    // Presence, not distance (spec 5.7). nearestFacility drops any facility whose
    // coordinate is unknown, and no rest area in facilities.json has one — so routing
    // this through the distance helper left rest_seating unknown at every place that
    // has a rest area listed.
    const restAreas = (snapshotPoi?.facilities ?? []).filter((f) => f.kind === 'rest_area');
    push(facts, poi.slug, 'rest_seating', restAreas.length > 0
      ? {
          status: 'supported',
          detail: `휴게 시설 ${restAreas.length}곳: ${restAreas.map((f) => f.name).join(', ')}`,
          source: 'derived_facility',
        }
      : null);

    // shade_indoor and visual_alarm have no upstream field and no derivation. They are
    // filled by hand in curated-facts.json or they stay unknown.
    push(facts, poi.slug, 'shade_indoor', null);
    push(facts, poi.slug, 'visual_alarm', null);
  }

  // Source priority, applied here and nowhere else. Two places computing it would
  // eventually disagree, and both the screen and the domain function assume the
  // (place, capability) pair appears exactly once.
  const merged = applyCurated(facts, curated);

  const payload = AccessibilityPayload.parse(merged);
  await publish('accessibility', payload, payload.length, '한국관광공사 detailWithTour2 + 파생 8항목 + content/curated-facts.json');

  const etcFields = KTO_ETC_FIELDS.join(', ');
  console.log(`         *etc fields (${etcFields}) are carried on pois[].etcNotes, never scored`);
}

function push(
  facts: Fact[],
  poiSlug: string,
  capabilityCode: string,
  value: { status: Fact['status']; detail: string | null; source: Fact['source'] } | null,
): void {
  facts.push({
    poiSlug,
    capabilityCode,
    status: value?.status ?? 'unknown',
    absenceKind: null,
    detail: value?.detail ?? null,
    source: value?.source ?? 'derived_facility',
    sourceField: null,
    verifiedAt: value ? seoulToday() : null,
    isKtoScored: false,
  });
}

function nearestFacility(
  poi: Poi | undefined,
  kind: Poi['facilities'][number]['kind'],
  supportedMax: number,
  partialMax: number,
): { status: Fact['status']; detail: string | null; source: Fact['source'] } | null {
  const candidates = (poi?.facilities ?? []).filter(
    (facility) => facility.kind === kind && facility.distanceM !== null,
  );
  if (candidates.length === 0) return null;
  const nearest = candidates.reduce((a, b) => (a.distanceM! <= b.distanceM! ? a : b));
  const distance = nearest.distanceM!;
  return {
    status:
      supportedMax === Number.POSITIVE_INFINITY
        ? 'supported'
        : derivedStatus(distance, supportedMax, partialMax),
    // "직선거리" in the sentence itself, not only in the source note underneath. This
    // is the figure a visitor reads when deciding whether help is close, and a
    // straight line across a hillside is shorter than the path up it — at 공산성 and
    // 부소산성 the walk is the long way round. The number is honest about its method
    // where it is read, or it is not honest at all.
    detail: `${nearest.name} 직선거리 ${distance.toLocaleString('ko-KR')}m`,
    source: 'derived_facility',
  };
}

function applyCurated(facts: Fact[], curated: CuratedFact[]): Fact[] {
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
      // The citation from curated-facts.json, carried through to the provenance line
      // on the evidence card. Fact has no dedicated citation field, and dropping it
      // here left the card reading "공개 자료로 확인" with nothing after it — the one
      // thing that file exists to supply.
      sourceField: entry.source,
      verifiedAt: entry.checkedAt,
      // Keeps the gap-report denominator: a curated value for a KTO capability is
      // still one of the 24 columns, it was simply filled by us rather than by KTO.
      isKtoScored: existing?.isKtoScored ?? false,
    });
  }
  return [...byKey.values()];
}

/**
 * One 특보현황 call for the whole country, then one read per district.
 *
 * Every failure path lands on `unknown` with a reason rather than on `none`. A false
 * all-clear is the one output of this stage that could get somebody hurt, so there is
 * no branch that produces `none` without a successful fetch and an unambiguous read.
 */
async function buildWeather(
  pois: PoiInput[],
): Promise<NonNullable<z.infer<typeof ContextPayload>['weather']>> {
  const checkedAt = seoulToday();
  const districts = Array.from(
    new Map(pois.map((poi) => [poi.signguCd5, poi])).values(),
  );

  const status = await getWeatherWarnings();
  if (!status.ok || status.t6 === null) {
    warn(`weather warnings unavailable — ${status.message ?? 'no t6'}; every place stays unknown`);
    return districts.map((poi) => ({
      signguCd5: poi.signguCd5,
      state: 'unknown' as const,
      warning: null,
      scope: 'district' as const,
      unknownReason: `기상특보를 조회하지 못했습니다: ${status.message ?? 'no t6'}`,
      checkedAt,
    }));
  }

  return districts.map((poi) => {
    const region = kmaRegionFor(poi.lDongRegnCd, poi.cityKo);
    if (region === null) {
      warn(`no KMA region names for lDongRegnCd ${poi.lDongRegnCd} (${poi.cityKo})`);
      return {
        signguCd5: poi.signguCd5,
        state: 'unknown' as const,
        warning: null,
        scope: 'province' as const,
        unknownReason: `기상청 특보 문구에서 ${poi.cityKo}를 찾는 방법이 등록돼 있지 않습니다`,
        checkedAt,
      };
    }
    const read = readWarningFor(status.t6!, region);
    if (read.state === 'unknown') warn(`weather for ${poi.cityKo}: ${read.unknownReason}`);
    return { signguCd5: poi.signguCd5, ...read, checkedAt };
  });
}

/**
 * 단기예보 for today and 중기예보 for the week after, one row per district.
 *
 * Separate from buildWeather because the two fail in opposite directions and must not
 * share a row. A 특보 that cannot be checked has to read "모름" on the screen, because a
 * false all-clear is a safety failure. A forecast that cannot be fetched simply is not
 * there, and the day's planning line disappears — nobody is endangered by not being told
 * it might rain on Thursday. Both still land on unknown rather than on "fine".
 *
 * 중기예보 is fetched even though nothing scores it: it is the only source that reaches
 * past three days, and picking which day to travel is the question a visitor who needs
 * to plan a route actually has.
 */
async function buildForecast(
  pois: PoiInput[],
): Promise<NonNullable<z.infer<typeof ContextPayload>['forecast']>> {
  const checkedAt = seoulToday();
  const now = new Date();
  const today = seoulTodayCompact();
  const districts = Array.from(new Map(pois.map((poi) => [poi.signguCd5, poi])).values());

  const rows: NonNullable<z.infer<typeof ContextPayload>['forecast']> = [];
  for (const poi of districts) {
    const short = await getShortTermForecast(poi.signguCd5, now);
    if (!short.ok) warn(`단기예보 for ${poi.cityKo} unavailable — ${short.message}`);
    const todayCondition = readDayCondition(
      short.ok ? short.days.find((day) => day.fcstDate === today) : undefined,
    );

    const mid = await getMidOutlook(poi.lDongRegnCd, poi.signguCd5, now);
    if (!mid.ok) warn(`중기예보 for ${poi.cityKo} unavailable — ${mid.message}`);

    rows.push({
      signguCd5: poi.signguCd5,
      baseAt: short.baseAt,
      today: todayCondition,
      outlook: mid.ok ? mid.days : [],
      checkedAt,
    });
  }
  return rows;
}

// ── stage 5: docent ────────────────────────────────────────────────────────────

async function buildDocent(pois: PoiInput[]): Promise<void> {
  requireKey();

  // Exhaustive enumeration and coordinate matching, not a keyword search. A keyword
  // adds the assumption that Odii registered the place under the name we know.
  const themes = await listAllOdiiThemes('ko');
  if (!themes.ok) {
    abortOnQuota(themes, 'Odii themeBasedList');
    warn(`Odii themeBasedList failed — ${themes.message}. docent left unchanged.`);
    return;
  }
  if (themes.truncated) warn('Odii theme list hit the page cap; some places may be missing');

  const stories: z.infer<typeof DocentPayload> = [];

  const byTid = new Map(themes.items.filter((theme) => theme.tid).map((theme) => [theme.tid!, theme]));
  reportUndeclaredThemes(pois, themes.items);

  for (const poi of pois) {
    // seq numbers the stories of a place, not of a theme. A place can hold several
    // themes — 무령왕릉과 왕릉원 holds the tomb park's own tour and the exhibition hall's —
    // and restarting at 1 inside each of them gave one screen two sections numbered 1,
    // which collided as React keys, collided again as the DOM ids the headings are
    // labelled by, and interleaved the two tours when the list sorted on it.
    const seqByLocale = new Map<string, number>();

    for (const tid of poi.odiiThemeIds) {
      const theme = byTid.get(tid);
      if (!theme) {
        warn(`${poi.slug}: odiiThemeIds names tid ${tid}, which themeBasedList does not list`);
        continue;
      }
      if (!theme.tlid) {
        warn(`${poi.slug}: Odii theme ${tid} (${theme.title ?? '?'}) has no tlid`);
        continue;
      }
      for (const locale of ['ko', 'en'] as const) {
        const result = await getOdiiStories(tid, theme.tlid, locale);
        if (!result.ok) {
          abortOnQuota(result, `${poi.slug} storyBasedList (${locale})`);
          warn(`${poi.slug}: storyBasedList (${locale}) failed — ${result.message}`);
          continue;
        }
        for (const story of result.items) {
          // readStoryCoord exists because addr1/addr2 hold coordinates in this
          // response while the same names hold an address in themeBasedList.
          readStoryCoord(story);
          const seq = (seqByLocale.get(locale) ?? 0) + 1;
          seqByLocale.set(locale, seq);
          stories.push({
            poiSlug: poi.slug,
            locale,
            seq,
            title: story.title ?? '',
            script: story.script ?? null,
            easyScript: readEasyScript(poi.slug, locale),
            audioUrl: story.audioUrl ? checkedAudioUrl(toHttps(story.audioUrl), poi.slug) : null,
            imageUrl: story.imageUrl ? await resolveImageUrl(story.imageUrl) : null,
            playTimeS: story.playTime ?? null,
            odiiTid: story.tid ?? tid,
            odiiStid: story.stid ?? null,
          });
        }
      }
    }
  }

  const payload = DocentPayload.parse(stories);
  await publish('docent', payload, payload.length, '한국관광공사 Odii themeBasedList + storyBasedList');
}

/**
 * Names every theme near a place that no place claims. Odii adds themes, and without
 * this the only way to learn that 부여 궁남지 now has a tour is for somebody to read the
 * catalogue by hand. It writes a line and changes nothing: which themes are about a
 * place is an editorial judgment, and 백제문화단지's theme sits 115m from the royal tombs.
 */
function reportUndeclaredThemes(
  pois: PoiInput[],
  themes: ReadonlyArray<Parameters<typeof readThemeCoord>[0]>,
): void {
  const claimed = new Set(pois.flatMap((poi) => poi.odiiThemeIds));
  for (const theme of themes) {
    if (!theme.tid || claimed.has(theme.tid)) continue;
    const reading = readThemeCoord(theme);
    if (!reading.ok) continue;
    const near = pois
      .map((poi) => ({ poi, m: Math.round(distanceMeters(poi.coord, reading.coord)) }))
      .filter((row) => row.m <= ODII_REVIEW_RADIUS_M)
      .sort((a, b) => a.m - b.m)[0];
    if (!near) continue;
    warn(
      `Odii theme ${theme.tid} (${theme.title ?? '?'}) is ${near.m}m from ${near.poi.slug} and is claimed by no place. Add it to odiiThemeIds or leave it out on purpose.`,
    );
  }
}

/** Plain-language text is written by a person; the API does not provide one. */
function readEasyScript(slug: string, locale: string): string | null {
  const path = join(CONTENT, 'docent-easy', `${slug}.${locale}.md`);
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

// ── stage 6: related ───────────────────────────────────────────────────────────

/**
 * The month searchKeyword1 is keyed by, as a Korean calendar month.
 *
 * Read from seoulToday() rather than getUTCMonth(). The nightly workflow fires at
 * 19:00 UTC, which is 04:00 KST the next day, so on the first of a Korean month the
 * UTC clock still reads the last day of the previous month and stepping back one from
 * there lands two months behind.
 */
function lastMonthYm(): string {
  const [year, month] = seoulToday().split('-');
  const date = new Date(Date.UTC(Number(year), Number(month) - 2, 1));
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function buildRelated(pois: PoiInput[]): Promise<void> {
  requireKey();
  const baseYm = lastMonthYm();
  const rows: z.infer<typeof RelatedPayload> = [];

  for (const poi of pois) {
    const result = await searchRelatedTourism({
      keyword: poi.nameKo,
      baseYm,
      areaCd: poi.lDongRegnCd,
      signguCd: poi.signguCd5,
    });
    if (!result.ok) {
      abortOnQuota(result, `${poi.slug} searchKeyword1`);
      warn(`${poi.slug}: searchKeyword1 failed — ${result.message}`);
      continue;
    }
    // Exact name match only. A fuzzy match here would attach another place's related
    // list to this one, and the list is already labelled "accessibility unchecked".
    const items = result.items.filter((item) => item.tAtsNm === poi.nameKo);
    if (items.length === 0) continue;

    rows.push({
      poiSlug: poi.slug,
      baseYm,
      items: items.map((item) => ({
        code: item.rlteTatsCd ?? '',
        name: item.rlteTatsNm ?? '',
        signguNm: item.rlteSignguNm ?? null,
        categoryLcls: item.rlteCtgryLclsNm ?? null,
        rank: item.rlteRank ?? 0,
      })),
    });
  }

  const payload = RelatedPayload.parse(rows);
  await publish('related', payload, payload.length, '한국관광공사 TarRlteTarService1 searchKeyword1');
}

// ── hidden report cleanup ──────────────────────────────────────────────────────

/**
 * The privacy policy says a hidden report is deleted after 90 days. This is the code
 * that makes that true. A retention promise with nothing enforcing it is worse than
 * no promise.
 */
async function deleteExpiredHiddenReports(): Promise<void> {
  if (dryRun) return;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const { createAdminClient } = await import('../src/lib/supabase/admin');
  const cutoff = new Date(Date.now() - HIDDEN_REPORT_TTL_DAYS * 86_400_000).toISOString();
  const { error } = await createAdminClient()
    .from('barrier_reports')
    .delete()
    .eq('is_hidden', true)
    .lt('hidden_at', cutoff);
  if (error) warn(`hidden report cleanup failed — ${error.message}`);
}

// ── revalidate ─────────────────────────────────────────────────────────────────

async function revalidate(): Promise<void> {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (dryRun || !site || !secret) return;

  const response = await fetch(`${site}/api/revalidate`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify({ keys: SNAPSHOT_KEYS }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);

  // A failed invalidation is not fatal: every page revalidates on its own within the
  // hour. Saying so is better than retrying.
  if (!response?.ok) warn('cache invalidation failed; pages refresh on their own within the hour');
  else console.log('ok       cache invalidated');
}

// ── run ────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const pois = readContent('pois.json', PoisInput);

  for (const stage of STAGE_ORDER) {
    if (!stages.includes(stage)) continue;
    console.log(`\n— ${stage}`);
    switch (stage) {
      case 'bootstrap':
        await bootstrap(pois);
        break;
      case 'pois':
        await buildPois(pois);
        break;
      case 'routes':
        await buildRoutes(pois);
        break;
      case 'context':
        await buildContext(pois);
        break;
      case 'accessibility':
        await buildAccessibility(pois);
        break;
      case 'docent':
        await buildDocent(pois);
        break;
      case 'related':
        await buildRelated(pois);
        break;
    }
  }

  await deleteExpiredHiddenReports();
  await revalidate();
  console.log('\ningest finished');
}

// Not top-level await: package.json has no "type": "module", so tsx hands this file to
// esbuild's cjs format, which cannot host one — `pnpm ingest` dies before the first
// stage with "Top-level await is currently not supported". Same shape as probe.ts.
main().catch((cause: unknown) => {
  console.error(`ingest: ${cause instanceof Error ? cause.message : String(cause)}`);
  process.exitCode = 1;
});
