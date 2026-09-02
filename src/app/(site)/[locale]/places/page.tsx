import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getFacts, getPois, getRoutes, getDocent, orEmpty } from '@/lib/data';
import { Eyebrow } from '@/components/Eyebrow';
import { SnapshotProblem } from '@/components/SnapshotGate';
import { PlaceList } from '@/components/place/PlaceList';
import { groupFactsByPoi, type PlaceCardData } from '@/components/place/place-view';
import type { ContentLocale, Locale } from '@/domain/types';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'places' });
  return { title: t('metaTitle') };
}

export default async function PlacesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'places' });

  const [pois, facts] = await Promise.all([getPois(), getFacts()]);
  if (!pois.ok) return <SnapshotProblem result={pois} />;
  if (!facts.ok) return <SnapshotProblem result={facts} />;

  const routes = orEmpty(await getRoutes());
  const docent = orEmpty(await getDocent());

  const places: PlaceCardData[] = pois.data.map((poi) => ({
    slug: poi.slug,
    title: titleFor(poi.i18n, locale as Locale, poi.slug),
    cityLabel: locale === 'en' ? poi.cityEn : poi.cityKo,
    heritageLabel: poi.heritageLabel,
    isUnescoComponent: poi.isUnescoComponent,
    unescoComponentNote: poi.unescoComponentNote,
    hasRoute: routes.some((route) => route.poiSlug === poi.slug),
    hasDocent: docent.some((story) => story.poiSlug === poi.slug),
    certifications: poi.certifications.map((c) => ({ grade: c.grade, validUntil: c.validUntil })),
  }));

  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1>{t('title')}</h1>
      </section>

      <PlaceList places={places} factsByPoi={groupFactsByPoi(facts.data)} />

      {/* DEC-2: the release ships without a map. Every function works from the list,
          so a half-accessible map would cost more than it adds. */}
      <section aria-label="지도" className="card">
        <p className="text-[0.95rem] text-[var(--color-ink-2)]">{t('mapUnavailable')}</p>
      </section>
    </div>
  );
}

function titleFor(
  i18n: Partial<Record<ContentLocale, { title: string }>>,
  locale: Locale,
  fallback: string,
): string {
  return i18n[locale]?.title ?? i18n.ko?.title ?? fallback;
}
