import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getPois, getRoutes } from '@/lib/data';
import { SnapshotProblem } from '@/components/SnapshotGate';
import { RouteSteps } from '@/components/route/RouteSteps';
import { RouteExports } from '@/components/route/RouteExports';
import { getPersona } from '@/domain/personas';
import type { ContentLocale, Locale } from '@/domain/types';

export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'routeGuide' });
  // The place's name, not its slug. A tab reading "gongsanseong · 경로 안내" is the
  // database key on display, and it is what a reader sees first in history and in
  // a shared bookmark.
  const pois = await getPois();
  const poi = pois.ok ? pois.data.find((p) => p.slug === slug) : undefined;
  if (!poi) {
    const tc = await getTranslations({ locale, namespace: 'common' });
    return { title: tc('error.notFoundTitle') };
  }
  const title = poi.i18n[locale as ContentLocale]?.title ?? poi.i18n.ko?.title ?? slug;
  return { title: `${title} · ${t('metaTitle')}` };
}

export default async function RouteGuidePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'routeGuide' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const tPlace = await getTranslations({ locale, namespace: 'place' });

  const [pois, routes] = await Promise.all([getPois(), getRoutes()]);
  if (!pois.ok) return <SnapshotProblem result={pois} />;
  // A failed read is not an absence. Without this the screen below said "경로 안내를
  // 만들지 않았습니다" — we chose not to write one — for a route that exists and could
  // not be fetched, which is the one kind of sentence this service refuses to print.
  if (!routes.ok && routes.kind === 'error') return <SnapshotProblem result={routes} />;

  const poi = pois.data.find((p) => p.slug === slug);
  if (!poi) notFound();

  const title = poi.i18n[locale as ContentLocale]?.title ?? poi.i18n.ko?.title ?? poi.slug;
  const route = routes.ok ? routes.data.find((r) => r.poiSlug === slug) : undefined;

  if (!route) {
    return (
      <div className="grid gap-4">
        <h1>{title}</h1>
        <p className="blank-slot">{t('none')}</p>
        <p className="t-sm text-[var(--color-ink-2)]">{t('noneHint')}</p>
      </div>
    );
  }

  const localeKey = locale as Locale;

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <h1>
          {title} — {route.title}
        </h1>
        {route.totalDistanceM !== null && route.totalMinutes !== null ? (
          <p className="tabular">
            {t('summary', { distance: route.totalDistanceM, minutes: route.totalMinutes })}
          </p>
        ) : null}
        {route.personaFlags.length > 0 ? (
          <p className="t-sm text-[var(--color-ink-2)]">
            {t('personaFor')}:{' '}
            {route.personaFlags
              .map((id) => (localeKey === 'ko' ? getPersona(id).labelKo : getPersona(id).labelEn))
              .join(' · ')}
          </p>
        ) : null}
      </header>

      {/* Pinned at the top, not tucked into a footnote. Somebody is about to walk
          this route on the strength of it. */}
      <p
        role="note"
        className="callout callout--caution font-bold"
      >
        <span aria-hidden="true">⚠ </span>
        {tc('honesty.routeEvidence')}
        <span className="mt-1 block font-normal t-sm">
          {/* evidenceLevel is one of desk/photo/field. It reached the screen raw, so a
              Korean reader was told the evidence for a route they were about to walk
              was "desk". */}
          {route.evidenceNote} · {tPlace(`evidenceLevel.${route.evidenceLevel}`)} ·{' '}
          {route.checkedAt}
        </span>
      </p>

      <RouteSteps route={route} />
      <RouteExports route={route} fileName={slug} />
    </div>
  );
}

