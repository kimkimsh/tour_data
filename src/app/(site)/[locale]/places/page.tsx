import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getFacts, getPois, getRoutes, getDocent, optionalRows } from '@/lib/data';
import { PartialData, SnapshotProblem } from '@/components/SnapshotGate';
import { PlaceList } from '@/components/place/PlaceList';
import { groupFactsByPoi, toPlaceCardData, type PlaceCardData } from '@/components/place/place-view';
import type { Locale } from '@/domain/types';

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

  const routes = optionalRows(await getRoutes());
  const docent = optionalRows(await getDocent());

  const places: PlaceCardData[] = pois.data.map((poi) =>
    toPlaceCardData(poi, locale as Locale, {
      hasRoute: routes.rows.some((route) => route.poiSlug === poi.slug),
      hasDocent: docent.rows.some((story) => story.poiSlug === poi.slug),
    }),
  );

  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <h1>{t('title')}</h1>
      </section>

      {routes.unavailable || docent.unavailable ? <PartialData /> : null}

      <PlaceList places={places} factsByPoi={groupFactsByPoi(facts.data)} />

    </div>
  );
}


