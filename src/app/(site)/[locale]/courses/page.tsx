import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getDocent, getFacts, getPois, getRoutes, orEmpty } from '@/lib/data';
import { itineraries } from '@/lib/content';
import { Eyebrow } from '@/components/Eyebrow';
import { SnapshotProblem } from '@/components/SnapshotGate';
import { CourseView } from '@/components/course/CourseView';
import { groupFactsByPoi, type PlaceCardData } from '@/components/place/place-view';
import type { ContentLocale, Locale } from '@/domain/types';

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

  const routes = orEmpty(await getRoutes());
  const docent = orEmpty(await getDocent());
  const localeKey = locale as Locale;

  const places: PlaceCardData[] = pois.data.map((poi) => ({
    slug: poi.slug,
    title: poi.i18n[locale as ContentLocale]?.title ?? poi.i18n.ko?.title ?? poi.slug,
    cityLabel: localeKey === 'en' ? poi.cityEn : poi.cityKo,
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
        <h1>{t('metaTitle')}</h1>
      </section>

      <CourseView
        templates={itineraries}
        places={places}
        factsByPoi={groupFactsByPoi(facts.data)}
      />
    </div>
  );
}
