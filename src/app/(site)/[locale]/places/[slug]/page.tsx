import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getContext, getDocent, getFacts, getPois, getRelated, getRoutes, orEmpty } from '@/lib/data';
import { distanceMeters } from '@/domain/geo';
import type { ContentLocale, Locale } from '@/domain/types';
import { SnapshotProblem } from '@/components/SnapshotGate';
import { VerdictPanel } from '@/components/place/VerdictPanel';
import { CapabilityEvidence, countKtoItems } from '@/components/place/CapabilityEvidence';
import { ReportsSection } from '@/components/place/ReportsSection';
import { groupFactsByPoi, toPlaceCardData, type PlaceCardData } from '@/components/place/place-view';
import { SourceText } from '@/components/SourceText';
import { PlaceMap } from '@/components/map/PlaceMap';

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
  // Never the slug. Falling back to it put whatever the caller typed into the title of
  // a page the caller could then link to — "Account-Suspended-Call-02-1234-5678 ·
  // 모두의 백제", served 200 from the real domain.
  if (!poi) {
    const tc = await getTranslations({ locale, namespace: 'common' });
    return { title: tc('error.notFoundTitle') };
  }
  return { title: poi.i18n[locale as ContentLocale]?.title ?? poi.i18n.ko?.title ?? slug };
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
  const tm = await getTranslations({ locale, namespace: 'map' });

  const [pois, facts] = await Promise.all([getPois(), getFacts()]);
  if (!pois.ok) return <SnapshotProblem result={pois} />;
  if (!facts.ok) return <SnapshotProblem result={facts} />;

  const poi = pois.data.find((p) => p.slug === slug);
  // notFound(), not a rendered stand-in: this segment has its own not-found.tsx, so the
  // screen arrives inside the real layout and the answer is a 404 rather than a 200.
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

  const places: PlaceCardData[] = pois.data.map((p) =>
    toPlaceCardData(p, localeKey, {
      hasRoute: routes.some((route) => route.poiSlug === p.slug),
      hasDocent: docent.some((story) => story.poiSlug === p.slug),
    }),
  );

  const crowd = contextResult.ok
    ? contextResult.data.crowd.find((row) => row.poiSlug === poi.slug)
    : undefined;
  const relatedForPoi = related.find((row) => row.poiSlug === poi.slug);
  const headerPhoto = poi.media.find((m) => m.kind === 'photo') ?? poi.media[0];

  return (
    <article className="grid gap-12">
      <header className="page-split">
        <div className="grid gap-2">
          <h1>{title}</h1>
          {/* No letter-spacing on this line, unlike the eyebrows elsewhere. It carries a
              designation name — 사적 「공주 공산성」 — and tracking applied to Hangul opens
              the space inside the quotation marks until the name looks like two. */}
          {/* Not monospaced. It carries a city and a designation name — 공주시 · 사적
              「공주 공산성」 — and Hangul has no glyphs in the mono stack, so every word
              landed a Latin advance width apart. */}
          <p className="t-xs tracking-[0.02em] text-[var(--color-ink-2)]">
            {localeKey === 'en' ? poi.cityEn : poi.cityKo}
            {/* The designation name is Korean in both locales: it is the name the Korea
                Heritage Service gazetted, and a translation of it would not resolve. */}
            {poi.heritageLabel ? <span lang="ko"> · {poi.heritageLabel}</span> : null}
          </p>
          <p className="t-sm text-[var(--color-ink-2)]">
            {tp(`role.${poi.placeRole}`)}
            {/* The note is hand-written Korean in content/pois.json and has no English
                form, so it is declared rather than served under lang="en", where an
                English voice sounds Hangul out as phonemes. */}
            {poi.unescoComponentNote ? (
              <span lang="ko"> — {poi.unescoComponentNote}</span>
            ) : null}
          </p>
          {/* Shown as a fact, not folded into the score. v5 dropped the certification
              bonus because it reached one place in six and every other certification
              found belonged to an ancillary building — but the designation itself is
              verified and worth a visitor's attention, so it says so and cites itself. */}
          {poi.certifications.length > 0 ? (
            <ul className="mt-1 grid gap-1">
              {poi.certifications.map((cert) => (
                <li key={`${cert.grade}-${cert.sourceNote}`} className="t-sm">
                  <span className="badge badge--visitable">{tc(`certification.${cert.grade}`)}</span>
                  <span lang="ko" className="evidence__provenance ml-2">
                    <SourceText>{cert.sourceNote}</SourceText>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {/* The overview is whatever the locale's own TourAPI service returned, and
              the English service falls back to the Korean row when it has none. */}
          {i18n?.overview ? (
            <p
              lang={poi.i18n[locale as ContentLocale]?.overview ? localeKey : 'ko'}
              className="mt-2 max-w-[var(--container-prose)]"
            >
              {i18n.overview}
            </p>
          ) : null}
        </div>

        {/* One photograph, beside the description rather than behind the title. Text
            over an image cannot be held to a contrast ratio, and this build fails on
            contrast. The gallery of everything we hold is further down the page; this
            is the picture that says which place you are reading about. */}
        {headerPhoto ? (
          <figure
            className={
              headerPhoto.noTransform
                ? 'tile__figure tile__figure--contain'
                : 'tile__figure'
            }
          >
            <Image
              src={headerPhoto.url}
              alt=""
              width={520}
              height={390}
              unoptimized={headerPhoto.noTransform}
              sizes="(min-width: 64rem) 18rem, 100vw"
              priority
            />
          </figure>
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
          {/* The figure with its scale, not on its own. cnctrRate has no documented
              unit, denominator or ceiling, so "82.94" printed large told a reader
              nothing they could act on — and the same number is banded into a word
              two sections above, where it reads as 혼잡. */}
          <p className="mt-2 tabular t-lg font-extrabold">
            {t('crowdRate', { value: crowd.rate.toFixed(1) })}
          </p>
          <p className="evidence__provenance mt-1">
            <span className="font-mono">
              {isoDate(crowd.baseYmd)} · TatsCnctrRateService · cnctrRate
            </span>
          </p>
        </section>
      ) : null}

      <section aria-labelledby="photos-heading" className="grid gap-3">
        <h2 id="photos-heading" className="section-head">{t('headingPhotos')}</h2>
        {poi.media.length === 0 ? (
          <p className="blank-slot">{t('noPhotos')}</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2">
            {poi.media.map((media, index) => (
              <li key={media.url} className="grid gap-2">
                {/* A KOGL type 3 image may not be cropped, filtered or resized. With
                    unoptimized the original bytes are served and no srcset is
                    generated, so the licence holds without dropping out of the
                    component that enforces width, height and alt. */}
                <Image
                  src={media.url}
                  // Numbered. Where the gallery record carries no title of its own the
                  // alt fell back to the place name, so seventeen photographs on one
                  // page announced themselves with the same three syllables and a
                  // screen-reader user could not tell one from the next. Describing
                  // what is in them is not available to us — nobody has looked, and
                  // writing a description we did not check is the one thing this
                  // service refuses everywhere else.
                  alt={
                    media.caption && media.caption !== title
                      ? media.caption
                      : t('photoAlt', { place: title, index: index + 1 })
                  }
                  // The alt, the caption and the credit all come from the Korean
                  // gallery record.
                  lang="ko"
                  width={640}
                  height={427}
                  unoptimized={media.noTransform}
                  className={media.noTransform ? 'h-auto w-full object-contain' : 'h-auto w-full'}
                />
                {/* The photographer's own title for the shot. The gallery search is
                    a keyword match, so some of these name a neighbouring subject —
                    낙화암 inside 부소산성, or the bridge across from 공산성 — and an
                    unlabelled photograph under this place's heading claims to be of
                    this place. */}
                {media.caption && media.caption !== title ? (
                  <p lang="ko" className="t-sm">
                    {media.caption}
                  </p>
                ) : null}
                <p lang="ko" className="evidence__provenance">
                  {media.attribution}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* The place and the facilities the section below lists, on one surface. The
          list is still the thing that carries the phone numbers, the opening hours and
          the source of every coordinate; this shows where they are in relation to each
          other, which a column of distances in metres cannot. */}
      <section aria-labelledby="place-map-heading" className="grid gap-3">
        <h2 id="place-map-heading" className="section-head">
          {tm('heading')}
        </h2>
        <PlaceMap
          labelledBy="place-map-heading"
          center={poi.coord}
          zoom={15}
          pins={[
            {
              slug: poi.slug,
              title,
              lat: poi.coord.lat,
              lng: poi.coord.lng,
              verdict: null,
              tone: 'subject',
              href: null,
            },
            ...poi.facilities.flatMap((facility) =>
              facility.coord === null
                ? []
                : [
                    {
                      slug: `${poi.slug}-${facility.kind}-${facility.name}`,
                      title: facility.name,
                      lat: facility.coord.lat,
                      lng: facility.coord.lng,
                      verdict: tc(`facility.${facility.kind}`),
                      tone: 'facility' as const,
                      href: null,
                    },
                  ],
            ),
          ]}
        />
      </section>

      <section aria-labelledby="safety-heading" className="grid gap-3">
        <h2 id="safety-heading" className="section-head">{t('headingSafety')}</h2>
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
                  {/* Facility names, notes and source lines are Korean in both
                      locales — they name real places and cite Korean pages — so the
                      language is declared rather than left to an English voice. */}
                  <div lang="ko">
                    <p className="font-bold">
                      {facility.name}
                      {distance !== null ? (
                        <span className="ml-2 tabular font-normal">
                          {t('distanceMeters', { value: distance })}
                        </span>
                      ) : null}
                    </p>
                    {facility.detail ? <p className="t-sm">{facility.detail}</p> : null}
                    {facility.phone ? (
                      <p className="mt-1">
                        <a href={`tel:${facility.phone.replace(/[^+\d]/g, '')}`} className="btn">
                          {facility.phone}
                        </a>
                      </p>
                    ) : null}
                  </div>
                  <p lang="ko" className="evidence__provenance">
                    <SourceText>{facility.sourceNote}</SourceText> · {facility.checkedAt}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <p className="t-xs text-[var(--color-ink-2)]">{t('safetyNote')}</p>
      </section>

      {relatedForPoi && relatedForPoi.items.length > 0 ? (
        <section
          aria-labelledby="related-heading"
          className="callout callout--caution grid gap-3"
        >
          <h2 id="related-heading" className="section-head">{t('headingRelated')}</h2>
          {/* Kept visually apart from the alternatives block above: these places were
              never scored and their accessibility was never checked. */}
          <p className="font-bold">
            <span aria-hidden="true">⚠ </span>
            {tc('honesty.related')}
          </p>
          {/* Korean place names straight from the related-attractions dataset. */}
          <ul lang="ko" className="flex flex-wrap gap-x-4 gap-y-1">
            {relatedForPoi.items.map((item) => (
              <li key={item.code}>
                {item.name}
                {item.categoryLcls ? (
                  <span className="ml-1 t-xs text-[var(--color-ink-2)]">
                    {item.categoryLcls}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="evidence__provenance">
            <span className="font-mono">TarRlteTarService1 · {relatedForPoi.baseYm}</span>
          </p>
        </section>
      ) : null}
    </article>
  );
}

const KTO_COMPACT_DATE = /^(\d{4})(\d{2})(\d{2})$/;

/** YYYYMMDD is a KTO request parameter, not a date anybody reads. */
function isoDate(value: string): string {
  const match = KTO_COMPACT_DATE.exec(value);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : value;
}

