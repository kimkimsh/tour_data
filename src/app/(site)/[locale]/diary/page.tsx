import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getPois, getRoutes, orEmpty } from '@/lib/data';
import { Eyebrow } from '@/components/Eyebrow';
import { SnapshotProblem } from '@/components/SnapshotGate';
import { DiaryEditor, type DiaryPlaceOption } from '@/components/diary/DiaryEditor';
import type { ContentLocale } from '@/domain/types';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'diary' });
  return { title: t('metaTitle') };
}

export default async function DiaryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'diary' });

  // The record itself is in localStorage; the snapshot is only needed to start a
  // place block. Without the list of places there is nothing to add, so this is a
  // gate rather than an empty list.
  const pois = await getPois();
  if (!pois.ok) return <SnapshotProblem result={pois} />;
  const routes = orEmpty(await getRoutes());

  const options: DiaryPlaceOption[] = pois.data.map((poi) => {
    const title = poi.i18n[locale as ContentLocale]?.title ?? poi.i18n.ko?.title ?? poi.slug;
    const steps = routes.find((route) => route.poiSlug === poi.slug)?.steps ?? [];
    return {
      slug: poi.slug,
      title,
      steps: steps.map((step) => ({ seq: step.seq, title: step.title })),
      coords: [
        { lat: poi.coord.lat, lng: poi.coord.lng, name: title },
        ...steps.flatMap((step) =>
          step.coord === null ? [] : [{ lat: step.coord.lat, lng: step.coord.lng, name: step.title }],
        ),
      ],
    };
  });

  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1>{t('title')}</h1>
        <p className="max-w-[var(--container-prose)]">{t('storedLocally')}</p>
      </section>

      <DiaryEditor options={options} />
    </div>
  );
}
