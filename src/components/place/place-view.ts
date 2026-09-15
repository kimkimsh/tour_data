import { getCapability } from '@/domain/capabilities';
import type { ContentLocale, Locale, PlaceRole, SuitabilityFactInput } from '@/domain/types';
import type { Fact, Poi } from '@/domain/snapshot-schema';

/**
 * One photograph of a place, chosen on the server so every client gets the same one.
 * `noTransform` is a KOGL type 3 licence: the image may not be cropped, so the tile
 * fits it whole instead of filling the frame with it.
 */
export interface PlaceThumbnail {
  url: string;
  alt: string;
  noTransform: boolean;
}

/** Lean shape the client screens need. Kept small so it survives serialisation cheaply. */
export interface PlaceCardData {
  slug: string;
  title: string;
  cityLabel: string;
  heritageLabel: string | null;
  placeRole: PlaceRole;
  unescoComponentNote: string | null;
  hasRoute: boolean;
  hasDocent: boolean;
  thumbnail: PlaceThumbnail | null;
  coord: { lat: number; lng: number };
}

/**
 * The card shape, built once so the list screen and the detail screen cannot disagree
 * about what a place is called or which photograph stands for it.
 *
 * The thumbnail is the first photograph in the snapshot, which is the order the
 * gallery ranking left them in — a choice made at ingest, where somebody can see the
 * picture, rather than in the browser where nobody can.
 */
export function toPlaceCardData(
  poi: Poi,
  locale: Locale,
  options: { hasRoute: boolean; hasDocent: boolean },
): PlaceCardData {
  const photo = poi.media.find((m) => m.kind === 'photo') ?? poi.media[0];
  return {
    slug: poi.slug,
    title: poi.i18n[locale as ContentLocale]?.title ?? poi.i18n.ko?.title ?? poi.slug,
    cityLabel: locale === 'en' ? poi.cityEn : poi.cityKo,
    heritageLabel: poi.heritageLabel,
    placeRole: poi.placeRole,
    unescoComponentNote: poi.unescoComponentNote,
    hasRoute: options.hasRoute,
    hasDocent: options.hasDocent,
    thumbnail: photo ? { url: photo.url, alt: photo.alt, noTransform: photo.noTransform } : null,
    coord: poi.coord,
  };
}

export function capabilityLabel(code: string, locale: Locale): string {
  const capability = getCapability(code);
  if (!capability) return code;
  return locale === 'ko' ? capability.labelKo : capability.labelEn;
}

export function capabilityLabels(codes: readonly string[], locale: Locale): string {
  return codes.map((code) => capabilityLabel(code, locale)).join(', ');
}

/** Drops poiSlug and sourceField: the score function neither reads nor needs them. */
export function toSuitabilityFacts(facts: readonly Fact[]): SuitabilityFactInput[] {
  return facts.map((fact) => ({
    capabilityCode: fact.capabilityCode,
    status: fact.status,
    absenceKind: fact.absenceKind,
    detail: fact.detail,
    source: fact.source,
    verifiedAt: fact.verifiedAt,
    isKtoScored: fact.isKtoScored,
  }));
}

export function groupFactsByPoi(facts: readonly Fact[]): Record<string, SuitabilityFactInput[]> {
  const grouped: Record<string, SuitabilityFactInput[]> = {};
  for (const fact of facts) {
    (grouped[fact.poiSlug] ??= []).push(...toSuitabilityFacts([fact]));
  }
  return grouped;
}

/**
 * How each source is named on screen. Two of them are file paths and stay
 * untranslated — naming the actual file is the point.
 */
const SOURCE_LABEL: Record<string, { ko: string; en: string }> = {
  kto_with: { ko: '한국관광공사 무장애여행', en: 'KTO barrier-free travel' },
  curated: { ko: '공개 자료로 확인', en: 'Confirmed from public material' },
  derived_route: { ko: '경로 데이터', en: 'Route data' },
  derived_facility: { ko: 'content/facilities.json', en: 'content/facilities.json' },
  tats: { ko: '관광지 집중률 API', en: 'Crowding forecast API' },
  kma: { ko: '기상청', en: 'Korea Meteorological Administration' },
};

export function sourceLabel(source: string, locale: Locale): string {
  const entry = SOURCE_LABEL[source];
  if (!entry) return source;
  return locale === 'ko' ? entry.ko : entry.en;
}

/**
 * One piece of a provenance line. `mono` marks the machine tokens — an upstream field
 * name, a file path, a date — which are the only parts the monospaced face is for.
 * Korean prose set in it falls back to a system Hangul font at a Latin advance width
 * and comes out spaced like broken text.
 */
export interface ProvenancePart {
  text: string;
  mono: boolean;
}

export interface Provenance {
  /** Who said it, and the check date. Always present. */
  parts: ProvenancePart[];
  /** Set when sourceField carries a URL, so the row can link rather than print it. */
  href: string | null;
  /** What to show in place of the URL: the note beside it, or its host. */
  hrefLabel: string | null;
}

/** The two sources whose on-screen name is a file path rather than an institution. */
const PATH_SOURCES: ReadonlySet<string> = new Set(['derived_facility']);

/**
 * A curated fact's sourceField is `https://… (note)`, and printed as text that ran to
 * five wrapped lines of monospace under every claim on the page — the same ninety
 * characters twenty-two times, none of them clickable. Split, the note names the
 * source and the URL becomes the link it always was.
 *
 * A KTO fact's sourceField is a field name like `wheelchair`, which has no URL and is
 * shown as it is: it is what lets a reader look the value up in the dataset.
 */
const LEADING_URL = /^(https?:\/\/\S+)(?:\s*\((.+)\))?$/;

export function provenanceLine(
  fact: Pick<Fact, 'source' | 'sourceField' | 'verifiedAt'>,
  locale: Locale,
): Provenance {
  const url = fact.sourceField === null ? null : LEADING_URL.exec(fact.sourceField.trim());
  const parts: ProvenancePart[] = [
    { text: sourceLabel(fact.source, locale), mono: PATH_SOURCES.has(fact.source) },
    { text: url ? '' : (fact.sourceField ?? ''), mono: true },
    { text: fact.verifiedAt ?? '', mono: true },
  ].filter((part) => part.text !== '');
  if (!url) return { parts, href: null, hrefLabel: null };
  return { parts, href: url[1]!, hrefLabel: url[2] ?? hostOf(url[1]!) };
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
