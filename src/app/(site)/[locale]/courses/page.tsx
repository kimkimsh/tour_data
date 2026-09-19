import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getDocent, getFacts, getPois, getRoutes, optionalRows } from '@/lib/data';
import { itineraries } from '@/lib/content';
import { PartialData, SnapshotProblem } from '@/components/SnapshotGate';
import { CourseView } from '@/components/course/CourseView';
import { groupFactsByPoi, type PlaceCardData, toPlaceCardData } from '@/components/place/place-view';
import type { Locale } from '@/domain/types';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'courses' });
  return { title: t('metaTitle') };
}

export default async function CoursesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'courses' });

  const [pois, facts] = await Promise.all([getPois(), getFacts()]);
  if (!pois.ok) return <SnapshotProblem result={pois} />;
  if (!facts.ok) return <SnapshotProblem result={facts} />;

  const routes = optionalRows(await getRoutes());
  const docent = optionalRows(await getDocent());
  const localeKey = locale as Locale;

  const places: PlaceCardData[] = pois.data.map((poi) =>
    toPlaceCardData(poi, localeKey, {
      hasRoute: routes.rows.some((route) => route.poiSlug === poi.slug),
      hasDocent: docent.rows.some((story) => story.poiSlug === poi.slug),
    }),
  );

  return (
    <div className="grid gap-8">
      {/* No eyebrow. It read "코스" directly above an h1 reading "코스", above a card
          whose own eyebrow read "코스" — the word three times in a column, naming
          nothing the heading had not. */}
      <h1>{t('pageTitle')}</h1>

      {routes.unavailable || docent.unavailable ? <PartialData /> : null}

      <CourseView
        templates={itineraries}
        places={places}
        factsByPoi={groupFactsByPoi(facts.data)}
      />
    </div>
  );
}
