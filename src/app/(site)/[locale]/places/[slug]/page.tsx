import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getContext, getDocent, getFacts, getPois, getRelated, getRoutes, orEmpty } from '@/lib/data';
import { distanceMeters } from '@/domain/geo';
import type { ContentLocale, Locale } from '@/domain/types';
import { Eyebrow } from '@/components/Eyebrow';
import { SnapshotProblem } from '@/components/SnapshotGate';
import { VerdictPanel } from '@/components/place/VerdictPanel';
import { CapabilityEvidence, countKtoItems } from '@/components/place/CapabilityEvidence';
import { ReportsSection } from '@/components/place/ReportsSection';
import { groupFactsByPoi, type PlaceCardData } from '@/components/place/place-view';

export const revalidate = 3600;

/**
 * Empty on purpose. Every slug is served on first request and then cached for the
 * revalidate window, which is what the cache design asks for. Returning the real
 * list would make the build read the database, and `dynamic = 'force-dynamic'`
 * would switch route caching off entirely rather than merely skip prerendering.
 */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const pois = await getPois();
  const poi = pois.ok ? pois.data.find((p) => p.slug === slug) : undefined;
  const title = poi?.i18n[locale as ContentLocale]?.title ?? poi?.i18n.ko?.title ?? slug;
  return { title };
}

export default async function PlacePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'place' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const tp = await getTranslations({ locale, namespace: 'places' });

  const [pois, facts] = await Promise.all([getPois(), getFacts()]);
  if (!pois.ok) return <SnapshotProblem result={pois} />;
  if (!facts.ok) return <SnapshotProblem result={facts} />;

  const poi = pois.data.find((p) => p.slug === slug);
  if (!poi) notFound();

  const routes = orEmpty(await getRoutes());
  const docent = orEmpty(await getDocent());
  const related = orEmpty(await getRelated());
  const contextResult = await getContext();

  const localeKey = locale as Locale;
  const i18n = poi.i18n[locale as ContentLocale] ?? poi.i18n.ko;
  const title = i18n?.title ?? poi.slug;
  const poiFacts = facts.data.filter((fact) => fact.poiSlug === poi.slug);
  const counts = countKtoItems(poiFacts);

  const places: PlaceCardData[] = pois.data.map((p) => ({
    slug: p.slug,
    title: p.i18n[locale as ContentLocale]?.title ?? p.i18n.ko?.title ?? p.slug,
    cityLabel: localeKey === 'en' ? p.cityEn : p.cityKo,
    heritageLabel: p.heritageLabel,
    isUnescoComponent: p.isUnescoComponent,
    unescoComponentNote: p.unescoComponentNote,
    hasRoute: routes.some((route) => route.poiSlug === p.slug),
    hasDocent: docent.some((story) => story.poiSlug === p.slug),
    certifications: p.certifications.map((c) => ({ grade: c.grade, validUntil: c.validUntil })),
  }));

  const crowd = contextResult.ok
    ? contextResult.data.crowd.find((row) => row.poiSlug === poi.slug)
    : undefined;
  const relatedForPoi = related.find((row) => row.poiSlug === poi.slug);

  return (
    <article className="grid gap-12">
      <header className="grid gap-2">
        <h1>{title}</h1>
        <p className="font-mono text-[0.78rem] uppercase tracking-[0.1em] text-[var(--color-ink-2)]">
          {localeKey === 'en' ? poi.cityEn : poi.cityKo}
          {poi.heritageLabel ? ` · ${poi.heritageLabel}` : ''}
        </p>
        <p className="text-[0.95rem] text-[var(--color-ink-2)]">
          {poi.isUnescoComponent ? tp('componentSite') : tp('adjacentSite')}
          {poi.unescoComponentNote ? ` — ${poi.unescoComponentNote}` : ''}
        </p>
        {i18n?.overview ? (
          <p className="mt-2 max-w-[var(--container-prose)]">{i18n.overview}</p>
        ) : null}
      </header>

      <VerdictPanel
        poiSlug={poi.slug}
        places={places}
        factsByPoi={groupFactsByPoi(facts.data)}
        hasRoute={routes.some((route) => route.poiSlug === poi.slug)}
        hasDocent={docent.some((story) => story.poiSlug === poi.slug)}
      />

      <ReportsSection poiSlug={poi.slug} />

      <CapabilityEvidence
        facts={poiFacts}
        locale={localeKey}
        ktoUnknownCount={counts.unknown}
        ktoTotalCount={counts.total}
        etcNotes={poi.etcNotes}
      />

      {crowd ? (
        <section aria-labelledby="crowd-heading" className="card">
          <h2 id="crowd-heading" className="subhead">
            {tc('honesty.crowd')}
          </h2>
          <p className="mt-2 tabular text-[1.4rem] font-extrabold">{crowd.rate}</p>
          <p className="evidence__provenance mt-1">
            {crowd.baseYmd} · TatsCnctrRateService · cnctrRate
          </p>
        </section>
      ) : null}

      <section aria-labelledby="photos-heading" className="grid gap-3">
        <Eyebrow as="h2" id="photos-heading">{t('eyebrowPhotos')}</Eyebrow>
        {poi.media.length === 0 ? (
          <p className="blank-slot">{t('noPhotos')}</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2">
            {poi.media.map((media) => (
              <li key={media.url} className="grid gap-2">
                {/* A KOGL type 3 image may not be cropped, filtered or resized. With
                    unoptimized the original bytes are served and no srcset is
                    generated, so the licence holds without dropping out of the
                    component that enforces width, height and alt. */}
                <Image
                  src={media.url}
                  alt={media.alt}
                  width={640}
                  height={427}
                  unoptimized={media.noTransform}
                  className={media.noTransform ? 'h-auto w-full object-contain' : 'h-auto w-full'}
                />
                <p className="evidence__provenance">{media.attribution}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="safety-heading" className="grid gap-3">
        <Eyebrow as="h2" id="safety-heading">{t('eyebrowSafety')}</Eyebrow>
        {poi.facilities.length === 0 ? (
          <p className="blank-slot">{tc('status.unknown')}</p>
        ) : (
          <ul className="grid gap-3">
            {poi.facilities.map((facility) => {
              const distance =
                facility.distanceM ??
                (facility.coord ? Math.round(distanceMeters(poi.coord, facility.coord)) : null);
              return (
                <li key={`${facility.kind}-${facility.name}`} className="evidence">
                  <div>
                    <p className="font-bold">
                      {facility.name}
                      {distance !== null ? (
                        <span className="ml-2 tabular font-normal">
                          {t('distanceMeters', { value: distance })}
                        </span>
                      ) : null}
                    </p>
                    {facility.detail ? <p className="text-[0.95rem]">{facility.detail}</p> : null}
                    {facility.phone ? (
                      <p className="mt-1">
                        <a href={`tel:${facility.phone.replace(/[^+\d]/g, '')}`} className="btn">
                          {facility.phone}
                        </a>
                      </p>
                    ) : null}
                  </div>
                  <p className="evidence__provenance">
                    {facility.sourceNote} · {facility.checkedAt}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[0.88rem] text-[var(--color-ink-2)]">{t('safetyNote')}</p>
      </section>

      {relatedForPoi && relatedForPoi.items.length > 0 ? (
        <section
          aria-labelledby="related-heading"
          className="callout callout--caution grid gap-3"
        >
          <Eyebrow as="h2" id="related-heading">{t('eyebrowRelated')}</Eyebrow>
          {/* Kept visually apart from the alternatives block above: these places were
              never scored and their accessibility was never checked. */}
          <p className="font-bold">
            <span aria-hidden="true">⚠ </span>
            {tc('honesty.related')}
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {relatedForPoi.items.map((item) => (
              <li key={item.code}>
                {item.name}
                {item.categoryLcls ? (
                  <span className="ml-1 text-[0.85rem] text-[var(--color-ink-2)]">
                    {item.categoryLcls}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="evidence__provenance">
            TarRlteTarService1 · {relatedForPoi.baseYm}
          </p>
        </section>
      ) : null}
    </article>
  );
}
