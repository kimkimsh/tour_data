import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getPois } from '@/lib/data';
import { SnapshotProblem } from '@/components/SnapshotGate';
import { ReportForm } from '@/components/report/ReportForm';
import type { ContentLocale } from '@/domain/types';

/**
 * Dynamic, and said out loud. `revalidate = 3600` used to sit here and did nothing:
 * the component reads searchParams, which makes the route fully dynamic — it appears
 * in neither `routes` nor `dynamicRoutes` in the prerender manifest, unlike its ten
 * siblings. Every other route in this app states its caching intent accurately.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'report' });
  return { title: t('metaTitle') };
}

/**
 * A repeated query parameter — ?note=a&note=b — arrives as an array. The form takes one
 * poi and one note, and handing the array on put an array where a string was expected:
 * detail.trim() threw and a malformed link showed the visitor a failure screen.
 */
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ poi?: string | string[]; note?: string | string[] }>;
}) {
  const { locale } = await params;
  const { poi: rawPoi, note: rawNote } = await searchParams;
  const poi = firstValue(rawPoi);
  const note = firstValue(rawNote);
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
