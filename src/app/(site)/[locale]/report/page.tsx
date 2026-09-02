import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getPois } from '@/lib/data';
import { Eyebrow } from '@/components/Eyebrow';
import { SnapshotProblem } from '@/components/SnapshotGate';
import { ReportForm } from '@/components/report/ReportForm';
import type { ContentLocale } from '@/domain/types';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'report' });
  return { title: t('metaTitle') };
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ poi?: string; note?: string }>;
}) {
  const { locale } = await params;
  const { poi, note } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'report' });

  const pois = await getPois();
  if (!pois.ok) return <SnapshotProblem result={pois} />;

  const places = pois.data.map((entry) => ({
    slug: entry.slug,
    title: entry.i18n[locale as ContentLocale]?.title ?? entry.i18n.ko?.title ?? entry.slug,
  }));

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1>{t('title')}</h1>
      </header>

      <ReportForm
        places={places}
        initialPoiSlug={places.some((p) => p.slug === poi) ? (poi ?? null) : null}
        initialDetail={note ?? null}
      />
    </div>
  );
}
