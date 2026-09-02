import { getCapability } from '@/domain/capabilities';
import type { Locale, SuitabilityFactInput } from '@/domain/types';
import type { Fact } from '@/domain/snapshot-schema';

/** Lean shape the client screens need. Kept small so it survives serialisation cheaply. */
export interface PlaceCardData {
  slug: string;
  title: string;
  cityLabel: string;
  heritageLabel: string | null;
  isUnescoComponent: boolean;
  unescoComponentNote: string | null;
  hasRoute: boolean;
  hasDocent: boolean;
  certifications: Array<{ grade: string; validUntil: string | null }>;
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
 * The provenance line: who said it, under which upstream field name, and when it
 * was checked. The field name is shown on purpose — it is what lets a reader go
 * and look the value up themselves.
 */
export function provenanceLine(
  fact: Pick<Fact, 'source' | 'sourceField' | 'verifiedAt'>,
  locale: Locale,
): string {
  return [sourceLabel(fact.source, locale), fact.sourceField, fact.verifiedAt]
    .filter((part): part is string => Boolean(part))
    .join(' · ');
}
