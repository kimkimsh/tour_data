import { z } from 'zod';
import type { LatLng } from '@/domain/types';

/**
 * Response shapes for the operations this project actually calls.
 *
 * Two rules run through the whole file.
 *
 * 1. KTO returns everything as a string, including numbers and coordinates, and it adds
 *    fields between manual revisions. So every schema is a `looseObject` (unknown keys
 *    kept, not stripped) and every field is optional. A response is never rejected for
 *    lacking a field — a missing field is data about the operator, which is this
 *    project's subject, not a parse error.
 * 2. Coordinates are read by the reader functions at the bottom, not range-checked inside
 *    a row schema. KTO writes an unknown coordinate as "0" or "", and one such row would
 *    otherwise fail the parse of a 100-row page. The readers report the reason instead.
 */

function toOptionalText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  const text = toOptionalText(value)?.trim();
  if (text === undefined || text === '') return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * The empty string is preserved rather than folded into undefined. "registered but the
 * operator left the field blank" and "the field is not in the response" are different
 * findings, and P0-1 exists to tell them apart.
 */
const ktoText = z.unknown().optional().transform(toOptionalText);

/**
 * Coercion by hand rather than `z.coerce.number()`: coerce turns "" into 0, and 0 is a
 * real value for a count and a plausible-looking wrong value for a coordinate.
 */
const ktoNumber = z.unknown().optional().transform(toOptionalNumber);

// ── KorWithService2 / detailWithTour2 ────────────────────────────────────────────
//
// The spellings below are the contract and three of them are traps: `braileblock` and
// `brailepromotion` carry one l (not `braille`), and the four *etc fields each take a
// different prefix. src/domain/capabilities.ts owns which of these are scored; this file
// only says what arrives on the wire.

const BARRIER_FREE_FIELDS = {
  // common (5)
  parking: ktoText,
  publictransport: ktoText,
  route: ktoText,
  ticketoffice: ktoText,
  promotion: ktoText,
  // physical disability (6 + etc)
  wheelchair: ktoText,
  exit: ktoText,
  elevator: ktoText,
  restroom: ktoText,
  auditorium: ktoText,
  room: ktoText,
  handicapetc: ktoText,
  // visual disability (7 + etc)
  braileblock: ktoText,
  helpdog: ktoText,
  guidehuman: ktoText,
  audioguide: ktoText,
  bigprint: ktoText,
  brailepromotion: ktoText,
  guidesystem: ktoText,
  blindhandicapetc: ktoText,
  // hearing disability (3 + etc)
  signguide: ktoText,
  videoguide: ktoText,
  hearingroom: ktoText,
  hearinghandicapetc: ktoText,
  // infants and family (3 + etc)
  stroller: ktoText,
  lactationroom: ktoText,
  babysparechair: ktoText,
  infantsfamilyetc: ktoText,
} as const;

/** contentid plus the 28 barrier-free fields. Values are free text, never Y/N. */
export const DetailWithTour2Schema = z.looseObject({
  contentid: ktoText,
  ...BARRIER_FREE_FIELDS,
});

/** Every barrier-free key detailWithTour2 is documented to return. */
export const BARRIER_FREE_FIELD_NAMES = Object.keys(BARRIER_FREE_FIELDS) as readonly string[];

// ── KorService2 / multilingual services ─────────────────────────────────────────

const LIST_COMMON_FIELDS = {
  contentid: ktoText,
  contenttypeid: ktoText,
  title: ktoText,
  addr1: ktoText,
  addr2: ktoText,
  zipcode: ktoText,
  /** longitude. mapy is latitude. Read them through readMapxyCoord(). */
  mapx: ktoNumber,
  mapy: ktoNumber,
  mlevel: ktoText,
  tel: ktoText,
  firstimage: ktoText,
  firstimage2: ktoText,
  /** Type1 or Type3. Type3 forbids any transform, so it travels with every image. */
  cpyrhtDivCd: ktoText,
  createdtime: ktoText,
  /** YYYYMMDDHHmmss. Feeds freshness, never the score. */
  modifiedtime: ktoText,
  lDongRegnCd: ktoText,
  lDongSignguCd: ktoText,
  lclsSystm1: ktoText,
  lclsSystm2: ktoText,
  lclsSystm3: ktoText,
} as const;

export const AreaBasedList2Schema = z.looseObject(LIST_COMMON_FIELDS);

/**
 * areaBasedSyncList2 adds the two sync fields. `oldContentid` is spelled with a capital I
 * in the request table while every other response key is lower case, so both spellings are
 * read.
 */
export const AreaBasedSyncList2Schema = z.looseObject({
  ...LIST_COMMON_FIELDS,
  showflag: ktoText,
  oldContentid: ktoText,
  oldcontentid: ktoText,
});

export const DetailCommon2Schema = z.looseObject({
  ...LIST_COMMON_FIELDS,
  homepage: ktoText,
  telname: ktoText,
  overview: ktoText,
});

/** contentTypeId 12, 관광지. Only the fields docs/spec/03_external_data.md 2.2 names. */
const INTRO_TYPE_12_FIELDS = {
  usetime: ktoText,
  restdate: ktoText,
  parking: ktoText,
  infocenter: ktoText,
  chkbabycarriage: ktoText,
  heritage1: ktoText,
  heritage2: ktoText,
  heritage3: ktoText,
  expguide: ktoText,
} as const;

/**
 * contentTypeId 14, 문화시설. `parkingfee` and `discountinfo` are the source for disabled
 * parking waivers and admission discounts, which is why this type is listed separately.
 */
const INTRO_TYPE_14_FIELDS = {
  usetimeculture: ktoText,
  restdateculture: ktoText,
  usefee: ktoText,
  parkingculture: ktoText,
  parkingfee: ktoText,
  discountinfo: ktoText,
  infocenterculture: ktoText,
  spendtime: ktoText,
  scale: ktoText,
} as const;

export const DetailIntro2Type12Schema = z.looseObject({
  contentid: ktoText,
  contenttypeid: ktoText,
  ...INTRO_TYPE_12_FIELDS,
});

export const DetailIntro2Type14Schema = z.looseObject({
  contentid: ktoText,
  contenttypeid: ktoText,
  ...INTRO_TYPE_14_FIELDS,
});

/**
 * Both type field sets in one shape. detailIntro2 returns a different set per
 * contentTypeId, and a per-type return would make the service function's type depend on a
 * runtime argument. Callers that know the type re-parse with the narrow schema above.
 */
export const DetailIntro2Schema = z.looseObject({
  contentid: ktoText,
  contenttypeid: ktoText,
  ...INTRO_TYPE_12_FIELDS,
  ...INTRO_TYPE_14_FIELDS,
});

export const DetailImage2Schema = z.looseObject({
  contentid: ktoText,
  /** Image name, up to 1000 chars. The only alt-text source KTO gives us. */
  imgname: ktoText,
  originimgurl: ktoText,
  smallimageurl: ktoText,
  cpyrhtDivCd: ktoText,
  serialnum: ktoText,
});

export const DetailInfo2Schema = z.looseObject({
  contentid: ktoText,
  contenttypeid: ktoText,
  /** Allowed values include 장애인편의시설 / 장애인 편의시설 — match with /장애인\s*편의시설/. */
  infoname: ktoText,
  /** May contain HTML. */
  infotext: ktoText,
  serialnum: ktoText,
  fldgubun: ktoText,
});

export const LdongCode2Schema = z.looseObject({
  rnum: ktoText,
  lDongRegnCd: ktoText,
  lDongRegnNm: ktoText,
  lDongSignguCd: ktoText,
  lDongSignguNm: ktoText,
});

/**
 * The manuals do not print this response's field table, so the candidate names are all
 * declared and the loose shape keeps whatever else arrives. The bootstrap only needs a
 * code-to-Korean-label pair; the probe records which names actually answered.
 */
export const LclsSystmCode2Schema = z.looseObject({
  rnum: ktoText,
  code: ktoText,
  name: ktoText,
  lclsSystmCd: ktoText,
  lclsSystmNm: ktoText,
  lclsSystm1: ktoText,
  lclsSystm2: ktoText,
  lclsSystm3: ktoText,
});

// ── Odii ────────────────────────────────────────────────────────────────────────

/**
 * themeBasedList. Here `addr1` and `addr2` really are a province and a city name
 * ("충청남도" / "부여군") — the opposite of storyBasedList below, which is why the two
 * never share a parser. Whether this operation returns coordinates at all is unverified:
 * the manual's response example shows none, while ingest needs them to match by distance.
 * All four candidate names are declared and readThemeCoord() reports which one answered.
 */
export const ThemeBasedListSchema = z.looseObject({
  tid: ktoText,
  tlid: ktoText,
  themeCategory: ktoText,
  title: ktoText,
  addr1: ktoText,
  addr2: ktoText,
  imageUrl: ktoText,
  langCode: ktoText,
  /** Bitmask of the four languages, e.g. "1111". */
  langCheck: ktoText,
  mapX: ktoText,
  mapY: ktoText,
  xCoord: ktoText,
  yCoord: ktoText,
  createdtime: ktoText,
  modifiedtime: ktoText,
});

/**
 * storyBasedList. `addr1` is LONGITUDE and `addr2` is LATITUDE — the manual's response
 * table says so, and its XML example uses mapX/mapY for the same two values. Both names
 * are kept as raw text so readStoryCoord() can prefer whichever holds a value and can
 * report the case where addr1 turns out to be a real address after all.
 */
export const StoryBasedListSchema = z.looseObject({
  tid: ktoText,
  tlid: ktoText,
  stid: ktoText,
  stlid: ktoText,
  title: ktoText,
  addr1: ktoText,
  addr2: ktoText,
  mapX: ktoText,
  mapY: ktoText,
  audioTitle: ktoText,
  /** Full transcript. Usable as the on-screen caption with no rewriting. */
  script: ktoText,
  /** Seconds. */
  playTime: ktoNumber,
  /** Direct MP3 link. */
  audioUrl: ktoText,
  imageUrl: ktoText,
  langCode: ktoText,
  langCheck: ktoText,
  createdtime: ktoText,
  modifiedtime: ktoText,
});

// ── TatsCnctrRateService / DataLabService / TarRlteTarService1 / PhotoGallery ────

/**
 * tatsCnctrRateList. One row per tourist site per day for the coming 30 days, so a
 * default numOfRows=10 returns 10 of those 30 days.
 */
export const TatsCnctrRateSchema = z.looseObject({
  baseYmd: ktoText,
  areaCd: ktoText,
  areaNm: ktoText,
  signguCd: ktoText,
  signguNm: ktoText,
  tAtsNm: ktoText,
  /** A forecast index, e.g. 64.65. The manual states no unit, denominator or ceiling. */
  cnctrRate: ktoNumber,
});

/**
 * locgoRegnVisitrDDList. Nationwide: the request takes no region parameter, so the caller
 * filters on signguCode. Three rows per day per sigungu, one per touDivCd.
 */
export const LocgoRegnVisitrDDSchema = z.looseObject({
  signguCode: ktoText,
  signguNm: ktoText,
  /** 1 = Monday … 7 = Sunday. */
  daywkDivCd: ktoText,
  daywkDivNm: ktoText,
  /** 1, 2, 3. The manual's names are 현지인(a) / 외지인(b) / 외국인(c). */
  touDivCd: ktoText,
  /** Stored and displayed verbatim. The manual never writes 내국인. */
  touDivNm: ktoText,
  /** Fractional: a mobile-signal model estimate, not a head count. */
  touNum: ktoNumber,
  baseYmd: ktoText,
});

/**
 * searchKeyword1. `tAtsCd` is the 32-char base tourist-site code; the areaBasedList1
 * response table omits it but this operation documents it, and having it takes later
 * matching off string comparison. The related sites themselves carry no contentid.
 */
export const SearchKeyword1Schema = z.looseObject({
  baseYm: ktoText,
  tAtsCd: ktoText,
  tAtsNm: ktoText,
  areaCd: ktoText,
  areaNm: ktoText,
  signguCd: ktoText,
  signguNm: ktoText,
  rlteTatsCd: ktoText,
  rlteTatsNm: ktoText,
  rlteRegnCd: ktoText,
  rlteRegnNm: ktoText,
  rlteSignguCd: ktoText,
  rlteSignguNm: ktoText,
  rlteCtgryLclsNm: ktoText,
  rlteCtgryMclsNm: ktoText,
  rlteCtgrySclsNm: ktoText,
  rlteRank: ktoNumber,
});

/** gallerySearchList1. The photo manual documents no copyright field for these images. */
export const GallerySearchList1Schema = z.looseObject({
  galContentId: ktoText,
  galContentTypeId: ktoText,
  galTitle: ktoText,
  galWebImageUrl: ktoText,
  galCreatedtime: ktoText,
  galModifiedtime: ktoText,
  galPhotographyMonth: ktoText,
  galPhotographyLocation: ktoText,
  /** e.g. "한국관광공사 김지호". Printed with the image. */
  galPhotographer: ktoText,
  /** Comma-separated. */
  galSearchKeyword: ktoText,
});

export type DetailWithTour2Item = z.infer<typeof DetailWithTour2Schema>;
export type AreaBasedList2Item = z.infer<typeof AreaBasedList2Schema>;
export type AreaBasedSyncList2Item = z.infer<typeof AreaBasedSyncList2Schema>;
export type DetailCommon2Item = z.infer<typeof DetailCommon2Schema>;
export type DetailIntro2Item = z.infer<typeof DetailIntro2Schema>;
export type DetailImage2Item = z.infer<typeof DetailImage2Schema>;
export type DetailInfo2Item = z.infer<typeof DetailInfo2Schema>;
export type LdongCode2Item = z.infer<typeof LdongCode2Schema>;
export type LclsSystmCode2Item = z.infer<typeof LclsSystmCode2Schema>;
export type ThemeBasedListItem = z.infer<typeof ThemeBasedListSchema>;
export type StoryBasedListItem = z.infer<typeof StoryBasedListSchema>;
export type TatsCnctrRateItem = z.infer<typeof TatsCnctrRateSchema>;
export type LocgoRegnVisitrDDItem = z.infer<typeof LocgoRegnVisitrDDSchema>;
export type SearchKeyword1Item = z.infer<typeof SearchKeyword1Schema>;
export type GallerySearchList1Item = z.infer<typeof GallerySearchList1Schema>;

/**
 * Parses one page of rows. A failure here means a row was not an object at all, which is a
 * contract break worth surfacing rather than a row worth dropping silently — every field is
 * optional, so nothing else can fail.
 */
export function parseRows<T>(schema: z.ZodType<T>, items: readonly unknown[]): T[] {
  return items.map((item, index) => {
    const parsed = schema.safeParse(item);
    if (!parsed.success) {
      throw new Error(`row ${index} does not match the schema: ${z.prettifyError(parsed.error)}`);
    }
    return parsed.data;
  });
}

// ── coordinate readers ──────────────────────────────────────────────────────────

/**
 * Gongju and Buyeo sit near lat 36.2–36.5, lng 126.9–127.2. A swapped pair lands in the
 * South Pacific, and KTO writes an unknown coordinate as "0" or "". Both are caught here
 * with a reason the caller can print, which is what a blank grey map cannot tell you.
 */
export const KOREA_LAT_MIN = 33;
export const KOREA_LAT_MAX = 39;
export const KOREA_LNG_MIN = 124;
export const KOREA_LNG_MAX = 132;

export type CoordReading =
  | { ok: true; coord: LatLng; fields: string }
  | { ok: false; reason: string; fields: string };

function makeReading(
  latRaw: number | undefined,
  lngRaw: number | undefined,
  fields: string,
): CoordReading {
  if (latRaw === undefined || lngRaw === undefined) {
    return { ok: false, reason: 'no numeric coordinate in any candidate field', fields };
  }
  if (latRaw < KOREA_LAT_MIN || latRaw > KOREA_LAT_MAX) {
    return { ok: false, reason: `latitude ${latRaw} is outside ${KOREA_LAT_MIN}..${KOREA_LAT_MAX}`, fields };
  }
  if (lngRaw < KOREA_LNG_MIN || lngRaw > KOREA_LNG_MAX) {
    return { ok: false, reason: `longitude ${lngRaw} is outside ${KOREA_LNG_MIN}..${KOREA_LNG_MAX}`, fields };
  }
  return { ok: true, coord: { lat: latRaw, lng: lngRaw }, fields };
}

/** KorService2 / KorWithService2 list and detail rows: mapx is longitude, mapy latitude. */
export function readMapxyCoord(row: { mapx?: number; mapy?: number }): CoordReading {
  return makeReading(row.mapy, row.mapx, 'mapy/mapx');
}

/**
 * storyBasedList. Prefers whichever name carries a value, per P0-9 item 4. `fields` names
 * the pair that answered so the probe can settle table-versus-example without guessing.
 */
export function readStoryCoord(row: StoryBasedListItem): CoordReading {
  const fromAddr = makeReading(toOptionalNumber(row.addr2), toOptionalNumber(row.addr1), 'addr2/addr1');
  if (fromAddr.ok) return fromAddr;
  const fromMap = makeReading(toOptionalNumber(row.mapY), toOptionalNumber(row.mapX), 'mapY/mapX');
  if (fromMap.ok) return fromMap;
  // Both failed. Report the addr pair, because that is what the response table promises,
  // and include whether addr1 held something non-numeric — that answers "was it an address".
  const addr1 = row.addr1 ?? '';
  const suffix = addr1 !== '' && toOptionalNumber(addr1) === undefined ? ` (addr1 is text: ${addr1})` : '';
  return { ok: false, reason: `${fromAddr.reason}${suffix}`, fields: 'addr2/addr1 + mapY/mapX' };
}

/**
 * themeBasedList. Its addr1/addr2 are a province and a city, so they are never read as
 * coordinates here; only the four coordinate candidates are tried. An unsuccessful reading
 * is the expected outcome if the operation returns no coordinates at all, and P0-3 has to
 * report that rather than silently matching nothing.
 */
export function readThemeCoord(row: ThemeBasedListItem): CoordReading {
  const fromMap = makeReading(toOptionalNumber(row.mapY), toOptionalNumber(row.mapX), 'mapY/mapX');
  if (fromMap.ok) return fromMap;
  const fromCoord = makeReading(toOptionalNumber(row.yCoord), toOptionalNumber(row.xCoord), 'yCoord/xCoord');
  if (fromCoord.ok) return fromCoord;
  return { ok: false, reason: fromMap.reason, fields: 'mapY/mapX + yCoord/xCoord' };
}

/**
 * KTO answers `modifiedtime` as YYYYMMDDHHmmss with no separators, which
 * `Date.parse` rejects. Stored verbatim it reaches `computeFreshness` as NaN and
 * every KTO-sourced item sits in the "older than a year" bucket for good, with the
 * raw stamp also printed on the evidence card. Returns null for anything that is
 * not that shape, so a format change surfaces as a missing date rather than a wrong
 * one.
 */
export function ktoTimestampToIsoDate(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').trim();
  if (!/^\d{8}(\d{6})?$/.test(digits)) return null;
  const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}
