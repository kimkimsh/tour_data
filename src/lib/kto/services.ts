import type { z } from 'zod';
import type { LatLng } from '@/domain/types';
import {
  AreaBasedList2Schema,
  AreaBasedSyncList2Schema,
  DetailCommon2Schema,
  DetailImage2Schema,
  DetailInfo2Schema,
  DetailIntro2Schema,
  DetailWithTour2Schema,
  GallerySearchList1Schema,
  LclsSystmCode2Schema,
  LdongCode2Schema,
  LocgoRegnVisitrDDSchema,
  SearchKeyword1Schema,
  StoryBasedListSchema,
  TatsCnctrRateSchema,
  ThemeBasedListSchema,
  parseRows,
  type AreaBasedList2Item,
  type AreaBasedSyncList2Item,
  type DetailCommon2Item,
  type DetailImage2Item,
  type DetailInfo2Item,
  type DetailIntro2Item,
  type DetailWithTour2Item,
  type GallerySearchList1Item,
  type LclsSystmCode2Item,
  type LdongCode2Item,
  type LocgoRegnVisitrDDItem,
  type SearchKeyword1Item,
  type StoryBasedListItem,
  type TatsCnctrRateItem,
  type ThemeBasedListItem,
} from './schemas';
import {
  DEFAULT_PAGE_SIZE,
  fetchAllPages,
  ktoRequest,
  type KtoPagesResult,
  type KtoParams,
  type KtoPagingOptions,
  type KtoRequestOptions,
  type KtoResult,
} from './transport';

/**
 * One named function per operation this project calls. Flat on purpose: the interesting
 * facts are per-operation (which parameter spelling, which code system, which paging trap)
 * and a shared abstraction would have to hide exactly those differences.
 *
 * Region codes are always parameters, never constants here. The five-digit sigungu codes
 * live in content/pois.json and nowhere else (docs/spec/05_ingest.md 5.0); a function that
 * takes them as arguments is what enforces that.
 *
 * Two operations are deliberately absent. `areaCode2` and `categoryCode2` carry an
 * end-of-2025 expiry notice in the KorWithService2 v4.3 manual and were deleted outright from
 * the KorService2 v4.4 manual. Both paths still route today (measured 2026-09-02: an
 * unregistered key answers 30, not 12), so a retired operation is not something a call can
 * tell us — the manuals are the only signal, and we take them at their word. Region and
 * category labels come from `ldongCode2` and `lclsSystmCode2` instead.
 */

export const SERVICE_IDS = {
  korWith: 'KorWithService2',
  kor: 'KorService2',
  eng: 'EngService2',
  jpn: 'JpnService2',
  chs: 'ChsService2',
  odii: 'Odii',
  tatsCnctrRate: 'TatsCnctrRateService',
  dataLab: 'DataLabService',
  tarRlteTar: 'TarRlteTarService1',
  photoGallery: 'PhotoGalleryService1',
} as const;

function withRows<T>(result: KtoResult, schema: z.ZodType<T>): KtoResult<T> {
  if (!result.ok) return result;
  return { ...result, items: parseRows(schema, result.items) };
}

function withPagedRows<T>(result: KtoPagesResult, schema: z.ZodType<T>): KtoPagesResult<T> {
  if (!result.ok) return result;
  return { ...result, items: parseRows(schema, result.items) };
}

// ── KorWithService2 — barrier-free travel information ───────────────────────────

/**
 * KorWithService2/detailWithTour2. The request parameter is `contentId` with a capital I;
 * the response key is lower-case `contentid`.
 *
 * resultCode 03 arrives as ok with zero rows and means only "no barrier-free response for
 * this contentId" — not "this place is unregistered". Three causes produce it (absent from
 * the dataset, wrong contentId, transient) and P0-11's list query is what separates them.
 */
export function getBarrierFreeDetail(
  contentId: string,
  options?: KtoRequestOptions,
): Promise<KtoResult<DetailWithTour2Item>> {
  return ktoRequest(SERVICE_IDS.korWith, 'detailWithTour2', { contentId }, options).then((result) =>
    withRows(result, DetailWithTour2Schema),
  );
}

/**
 * KorWithService2/areaBasedList2. This service is still on manual v4.3, so both the old
 * (areaCode/sigunguCode) and new (lDong*) parameters exist in its request table. We send the
 * new ones only.
 */
export function listBarrierFreePois(
  params: {
    lDongRegnCd: string;
    lDongSignguCd: string;
    contentTypeId?: number;
    arrange?: string;
  },
  options?: KtoPagingOptions,
): Promise<KtoPagesResult<AreaBasedList2Item>> {
  return fetchAllPages(SERVICE_IDS.korWith, 'areaBasedList2', { ...params }, options).then((result) =>
    withPagedRows(result, AreaBasedList2Schema),
  );
}

/**
 * KorWithService2/areaBasedSyncList2, the operation P0-11 uses: it answers registration and
 * contentId in one pass, where detailWithTour2 needs the contentId up front. `showflag=1`
 * excludes hidden records.
 *
 * The lDong filters are passed when supplied because the manual's own unfiltered sample
 * reports totalCount 8,852 — 89 pages. Whether the filter is honoured here is unverified,
 * so the caller must check `truncated` before reading "not found" as "not registered".
 */
export function listBarrierFreeSync(
  params: { lDongRegnCd?: string; lDongSignguCd?: string; showflag?: string },
  options?: KtoPagingOptions,
): Promise<KtoPagesResult<AreaBasedSyncList2Item>> {
  return fetchAllPages(
    SERVICE_IDS.korWith,
    'areaBasedSyncList2',
    { showflag: params.showflag ?? '1', lDongRegnCd: params.lDongRegnCd, lDongSignguCd: params.lDongSignguCd },
    options,
  ).then((result) => withPagedRows(result, AreaBasedSyncList2Schema));
}

// ── KorService2 — Korean tourism information ────────────────────────────────────

/**
 * KorService2/areaBasedList2. v4.4 deleted areaCode/sigunguCode/cat1-3 from the request, so
 * only the lDong and lclsSystm codes are accepted. `arrange` takes A (title), C (modified),
 * D (created) and O/Q/R for the same orders restricted to records that have a
 * representative image. There is no B.
 */
export function listPoisByArea(
  params: {
    lDongRegnCd: string;
    lDongSignguCd: string;
    contentTypeId?: number;
    lclsSystm1?: string;
    lclsSystm2?: string;
    lclsSystm3?: string;
    arrange?: string;
  },
  options?: KtoPagingOptions,
): Promise<KtoPagesResult<AreaBasedList2Item>> {
  return fetchAllPages(SERVICE_IDS.kor, 'areaBasedList2', { ...params }, options).then((result) =>
    withPagedRows(result, AreaBasedList2Schema),
  );
}

/** KorService2/detailCommon2. v4.3 dropped the *YN toggles, so the full block always comes. */
export function getPoiCommon(
  contentId: string,
  options?: KtoRequestOptions,
): Promise<KtoResult<DetailCommon2Item>> {
  return ktoRequest(SERVICE_IDS.kor, 'detailCommon2', { contentId }, options).then((result) =>
    withRows(result, DetailCommon2Schema),
  );
}

/**
 * KorService2/detailIntro2. The returned field set differs completely per contentTypeId;
 * DetailIntro2Schema carries both the type 12 and type 14 sets, and a caller that wants only
 * one re-parses with the narrow schema.
 */
export function getPoiIntro(
  contentId: string,
  contentTypeId: number,
  options?: KtoRequestOptions,
): Promise<KtoResult<DetailIntro2Item>> {
  return ktoRequest(SERVICE_IDS.kor, 'detailIntro2', { contentId, contentTypeId }, options).then(
    (result) => withRows(result, DetailIntro2Schema),
  );
}

/**
 * KorService2/detailInfo2 — the second documented source of barrier-free prose. For
 * contentTypeId 12 and 38 the allowed `infoname` values include 장애인편의시설 (spelled with
 * a space in the KorWithService2 manual), which arrives as one free-text paragraph. It is
 * shown as a note and never split into capability codes automatically.
 */
export function getPoiRepeatInfo(
  contentId: string,
  contentTypeId: number,
  options?: KtoRequestOptions,
): Promise<KtoResult<DetailInfo2Item>> {
  return ktoRequest(SERVICE_IDS.kor, 'detailInfo2', { contentId, contentTypeId }, options).then(
    (result) => withRows(result, DetailInfo2Schema),
  );
}

/**
 * KorService2/detailImage2. `imageYN` is not an on/off switch: Y returns content images and
 * N returns food-menu images for restaurant records.
 */
export function getPoiImages(
  contentId: string,
  options?: KtoRequestOptions,
): Promise<KtoResult<DetailImage2Item>> {
  return ktoRequest(SERVICE_IDS.kor, 'detailImage2', { contentId, imageYN: 'Y' }, options).then(
    (result) => withRows(result, DetailImage2Schema),
  );
}

/** KorService2/ldongCode2. Bootstrap: turns the stored codes into Korean labels. */
export function getLdongCodes(
  lDongRegnCd: string,
  options?: KtoPagingOptions,
): Promise<KtoPagesResult<LdongCode2Item>> {
  return fetchAllPages(
    SERVICE_IDS.kor,
    'ldongCode2',
    { lDongRegnCd, lDongListYn: 'Y' },
    options,
  ).then((result) => withPagedRows(result, LdongCode2Schema));
}

/** KorService2/lclsSystmCode2. The manual quotes totalCount 243 for the whole tree. */
export function getLclsSystmCodes(
  options?: KtoPagingOptions,
): Promise<KtoPagesResult<LclsSystmCode2Item>> {
  return fetchAllPages(SERVICE_IDS.kor, 'lclsSystmCode2', { lclsSystmListYn: 'Y' }, options).then(
    (result) => withPagedRows(result, LclsSystmCode2Schema),
  );
}

// ── EngService2 / JpnService2 / ChsService2 — multilingual ──────────────────────

/** Keyed by the content locale stored in the pois snapshot. Korean uses KorService2. */
export const MULTILINGUAL_SERVICE_IDS = {
  en: SERVICE_IDS.eng,
  ja: SERVICE_IDS.jpn,
  'zh-CN': SERVICE_IDS.chs,
} as const;

export type MultilingualLocale = keyof typeof MULTILINGUAL_SERVICE_IDS;

const MULTILINGUAL_CONTENT_TYPE_IDS = new Map<number, number>([
  [12, 76],
  [14, 78],
  [15, 85],
  [28, 75],
  [32, 80],
  [38, 79],
  [39, 82],
]);

/**
 * The multilingual services number the content types differently, and passing the Korean
 * id returns an empty list rather than an error — a silent nothing.
 *
 * detailCommon2 takes no contentTypeId, so nothing in the current call plan needs this. It
 * exists because every list or search call added later does, and discovering the renumbering
 * again from an empty response is expensive. Returns null for 25 (travel course), which the
 * multilingual services do not carry at all.
 */
export function toMultilingualContentTypeId(korContentTypeId: number): number | null {
  return MULTILINGUAL_CONTENT_TYPE_IDS.get(korContentTypeId) ?? null;
}

/**
 * {Eng,Jpn,Chs}Service2/detailCommon2 with the Korean contentId. Whether that id addresses
 * the same place in the multilingual services is unverified (P0-10) — the manuals never say
 * "identical" and each uses a different sample id. If it turns out not to, the multilingual
 * path moves to searchKeyword2 by title.
 */
export function getMultilingualPoiCommon(
  locale: MultilingualLocale,
  contentId: string,
  options?: KtoRequestOptions,
): Promise<KtoResult<DetailCommon2Item>> {
  return ktoRequest(MULTILINGUAL_SERVICE_IDS[locale], 'detailCommon2', { contentId }, options).then(
    (result) => withRows(result, DetailCommon2Schema),
  );
}

// ── Odii — audio guide ─────────────────────────────────────────────────────────

/**
 * The manual gives only a `ko` sample and no list of allowed values, while the service
 * description mentions four languages and the response carries a four-bit langCheck. P0-4
 * tries the candidates; until then this is the one value seen in a manual.
 */
export const ODII_DEFAULT_LANG_CODE = 'ko';

/** Manual maximum for the location-based operations. Larger values are the caller's risk. */
export const ODII_MAX_RADIUS_M = 20_000;

/**
 * Odii/themeBasedList, one page. The only parameter is the language, and the manual's sample
 * totalCount is 1,504, so this is also the exhaustive enumeration ingest and P0-3 use:
 * matching by coordinate carries no assumption about the registered name, where a keyword
 * search assumes "공산성" is spelled that way in Odii.
 */
export function searchOdiiThemes(
  page: number,
  langCode: string = ODII_DEFAULT_LANG_CODE,
  options?: KtoRequestOptions & { numOfRows?: number },
): Promise<KtoResult<ThemeBasedListItem>> {
  const numOfRows = options?.numOfRows ?? DEFAULT_PAGE_SIZE;
  return ktoRequest(
    SERVICE_IDS.odii,
    'themeBasedList',
    { langCode, numOfRows, pageNo: page },
    options,
  ).then((result) => withRows(result, ThemeBasedListSchema));
}

/** Odii/themeBasedList, every page to totalCount. */
export function listAllOdiiThemes(
  langCode: string = ODII_DEFAULT_LANG_CODE,
  options?: KtoPagingOptions,
): Promise<KtoPagesResult<ThemeBasedListItem>> {
  return fetchAllPages(SERVICE_IDS.odii, 'themeBasedList', { langCode }, options).then((result) =>
    withPagedRows(result, ThemeBasedListSchema),
  );
}

/**
 * Odii/themeSearchList. The parameter table names the language `lang` and the example URL in
 * the same entry uses `langCode`, so the name is an argument until P0-4 settles it.
 */
export function searchOdiiThemesByKeyword(
  keyword: string,
  langParamName: 'lang' | 'langCode',
  langCode: string = ODII_DEFAULT_LANG_CODE,
  options?: KtoRequestOptions & { numOfRows?: number },
): Promise<KtoResult<ThemeBasedListItem>> {
  const params: KtoParams = {
    keyword,
    [langParamName]: langCode,
    numOfRows: options?.numOfRows ?? DEFAULT_PAGE_SIZE,
  };
  return ktoRequest(SERVICE_IDS.odii, 'themeSearchList', params, options).then((result) =>
    withRows(result, ThemeBasedListSchema),
  );
}

/**
 * Odii/themeLocationBasedList. Unlike storyLocationBasedList, this operation's parameter
 * table and its example URL agree on mapX/mapY/langCode, so only that set is sent.
 * `radius` and the language are both required — omitting either answers resultCode 11.
 */
export function listOdiiThemesNearby(
  coord: LatLng,
  radiusM: number,
  langCode: string = ODII_DEFAULT_LANG_CODE,
  options?: KtoRequestOptions & { numOfRows?: number },
): Promise<KtoResult<ThemeBasedListItem>> {
  return ktoRequest(
    SERVICE_IDS.odii,
    'themeLocationBasedList',
    {
      mapX: coord.lng,
      mapY: coord.lat,
      radius: radiusM,
      langCode,
      numOfRows: options?.numOfRows ?? DEFAULT_PAGE_SIZE,
    },
    options,
  ).then((result) => withRows(result, ThemeBasedListSchema));
}

/**
 * Odii/storyBasedList — the finished MP3 plus its full transcript, which is why the docent
 * screen needs neither speech synthesis nor script writing.
 */
export function getOdiiStories(
  tid: string,
  tlid: string,
  langCode: string = ODII_DEFAULT_LANG_CODE,
  options?: KtoRequestOptions & { numOfRows?: number },
): Promise<KtoResult<StoryBasedListItem>> {
  return ktoRequest(
    SERVICE_IDS.odii,
    'storyBasedList',
    { tid, tlid, langCode, numOfRows: options?.numOfRows ?? DEFAULT_PAGE_SIZE },
    options,
  ).then((result) => withRows(result, StoryBasedListSchema));
}

/**
 * Which of the two contradictory parameter spellings storyLocationBasedList is sent.
 * 'table' is mapX/mapY/langCode, 'example' is xCoord/yCoord/lang, 'both' sends all six.
 */
export type OdiiCoordNaming = 'both' | 'table' | 'example';

/**
 * Exported so a probe can print the set it sent without rebuilding it. Unknown query
 * parameters are ignored by the gateway, which is what makes 'both' safe.
 */
export function odiiLocationParams(
  coord: LatLng,
  radiusM: number,
  langCode: string,
  naming: OdiiCoordNaming,
): KtoParams {
  const table = { mapX: coord.lng, mapY: coord.lat, langCode };
  const example = { xCoord: coord.lng, yCoord: coord.lat, lang: langCode };
  const base = { radius: radiusM };
  if (naming === 'table') return { ...base, ...table };
  if (naming === 'example') return { ...base, ...example };
  return { ...base, ...table, ...example };
}

/**
 * Odii/storyLocationBasedList. Its parameter table says mapX/mapY/langCode while the call
 * example in the same manual says xCoord/yCoord/lang, so the default sends both sets in one
 * request: whichever the server reads, an answer comes back. Sending one set at a time is
 * how the probe attributes which spelling is live (P0-9 item 6).
 */
export function listOdiiStoriesNearby(
  coord: LatLng,
  radiusM: number,
  langCode: string = ODII_DEFAULT_LANG_CODE,
  naming: OdiiCoordNaming = 'both',
  options?: KtoRequestOptions & { numOfRows?: number },
): Promise<KtoResult<StoryBasedListItem>> {
  return ktoRequest(
    SERVICE_IDS.odii,
    'storyLocationBasedList',
    {
      ...odiiLocationParams(coord, radiusM, langCode, naming),
      numOfRows: options?.numOfRows ?? DEFAULT_PAGE_SIZE,
    },
    options,
  ).then((result) => withRows(result, StoryBasedListSchema));
}

// ── TatsCnctrRateService — forecast crowding ────────────────────────────────────

/**
 * The operation name is `tatsCnctrRatedList`, with a d, which is the spelling in the
 * manual's example URL and not the one in its operation table.
 *
 * The gateway resolves the path before it validates the key, so an unregistered key answers
 * 12 for a name that does not exist and 30 for one that does. Measured that way on
 * 2026-09-02: `tatsCnctrRateList` -> 12 (twice), `tatsCnctrRatedList` -> 30 (twice), and the
 * controls `TatsCnctrRateService/garbageXyz` -> 12, `KorService2/ldongCode2` -> 30. The table
 * spelling is not a live endpoint. Do not "correct" this back to the manual's table without
 * repeating that measurement — P0-9 item 1 calls both names on every probe run.
 */
const TATS_CNCTR_RATE_OPERATION = 'tatsCnctrRatedList';

/**
 * TatsCnctrRateService, forecast crowding. Note the parameter spelling: `signguCd` (no u
 * after sig) and a five-digit administrative code, unlike KorService2's three-digit
 * `lDongSignguCd`. Mixing the two returns an empty list, not an error.
 *
 * Paged to totalCount deliberately. One row per site per day for the coming 30 days means a
 * sigungu with dozens of sites overflows any single page, and stopping at page one reports a
 * forecast that exists as unknown. `cnctrRate` is a forecast, never current crowding.
 */
export function getCrowdForecast(
  params: { areaCd: string; signguCd: string; tAtsNm?: string },
  options?: KtoPagingOptions,
): Promise<KtoPagesResult<TatsCnctrRateItem>> {
  return fetchAllPages(
    SERVICE_IDS.tatsCnctrRate,
    TATS_CNCTR_RATE_OPERATION,
    { ...params },
    options,
  ).then((result) => withPagedRows(result, TatsCnctrRateSchema));
}

// ── DataLabService — regional visitor counts ────────────────────────────────────

/**
 * DataLabService/locgoRegnVisitrDDList for one day, all pages.
 *
 * The request has no region parameter: the response is the whole country, about 740 rows per
 * day including the three touDivCd rows per sigungu, and the caller filters on `signguCode`.
 * One day per call for the same reason — eight days at once is roughly 5,900 rows, which
 * numOfRows=1000 truncates, and depending on the sort order our two sigungu can be absent
 * from the response entirely. That failure is silent, which is what makes it dangerous.
 */
export function getVisitorsForDay(
  ymd: string,
  options?: KtoPagingOptions,
): Promise<KtoPagesResult<LocgoRegnVisitrDDItem>> {
  return fetchAllPages(
    SERVICE_IDS.dataLab,
    'locgoRegnVisitrDDList',
    { startYmd: ymd, endYmd: ymd },
    { numOfRows: 1000, ...options },
  ).then((result) => withPagedRows(result, LocgoRegnVisitrDDSchema));
}

// ── TarRlteTarService1 — related tourist sites ──────────────────────────────────

/**
 * TarRlteTarService1/searchKeyword1 — note the `1` on both the service id and the operation.
 * Same five-digit `signguCd` spelling as TatsCnctrRateService.
 *
 * Chosen over areaBasedList1 because the area listing defaults to numOfRows=10 against a
 * manual sample totalCount of 800: our sites can be missing from page one while related data
 * exists. This call also yields `tAtsCd`, which takes later matching off string comparison.
 * The related sites themselves carry no contentid and, since v4.1, no address.
 */
export function searchRelatedTourism(
  params: { keyword: string; baseYm: string; areaCd: string; signguCd: string },
  options?: KtoPagingOptions,
): Promise<KtoPagesResult<SearchKeyword1Item>> {
  return fetchAllPages(SERVICE_IDS.tarRlteTar, 'searchKeyword1', { ...params }, options).then(
    (result) => withPagedRows(result, SearchKeyword1Schema),
  );
}

// ── PhotoGalleryService1 — tourism photographs ─────────────────────────────────

/**
 * PhotoGalleryService1/gallerySearchList1. `keyword` is required. This operation is what
 * replaced a 48-call exhaustive sweep of galleryList1 with one call per name.
 *
 * `arrange` here is A (photographed date), B (title), C (modified) — B exists in this
 * service and does not exist in KorService2's arrange.
 */
export function searchPhotoGallery(
  keyword: string,
  options?: KtoPagingOptions & { arrange?: string },
): Promise<KtoPagesResult<GallerySearchList1Item>> {
  return fetchAllPages(
    SERVICE_IDS.photoGallery,
    'gallerySearchList1',
    { keyword, arrange: options?.arrange },
    options,
  ).then((result) => withPagedRows(result, GallerySearchList1Schema));
}
