'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { buildScoreboard, sortScoreboard } from '@/domain/scoreboard';
import { getPersona } from '@/domain/personas';
import type { Locale, SuitabilityFactInput, SuitabilityLabel } from '@/domain/types';
import { VerdictBadge } from '@/components/VerdictBadge';
import { useConditions } from '@/components/persona/usePersona';
import { capabilityLabels, type PlaceCardData, type PlaceThumbnail } from './place-view';
import { useToday } from '@/components/useClientValue';
import { LiveRegion } from '@/components/a11y/LiveRegion';
import { PlaceMap, type MapPin } from '@/components/map/PlaceMap';

/**
 * Scores every place in the browser rather than on the server.
 *
 * The conditions live in localStorage, which the server cannot see. Scoring on the
 * server would hand every visitor the same cached HTML, and changing a condition
 * would change nothing on screen. The facts arrive already cached and identical for
 * everyone, which is what keeps the page cacheable.
 */
export function PlaceList({
  places,
  factsByPoi,
}: {
  places: PlaceCardData[];
  factsByPoi: Record<string, SuitabilityFactInput[]>;
}) {
  const t = useTranslations('places');
  const tc = useTranslations('common');
  const tm = useTranslations('map');
  const locale = useLocale() as Locale;
  const { conditions, loaded } = useConditions();
  const today = useToday();

  const entries = useMemo(() => {
    if (!loaded || today === null) return null;
    return sortScoreboard(
      buildScoreboard({
        pois: places.map((p) => ({ slug: p.slug, title: p.title, city: p.cityLabel })),
        factsByPoi,
        personaIds: conditions.personaIds,
        cognitiveOption: conditions.cognitiveOption,
        calculationDate: today,
      }),
    );
  }, [loaded, today, places, factsByPoi, conditions.personaIds, conditions.cognitiveOption]);

  const byslug = new Map(places.map((p) => [p.slug, p]));
  const personaLabel =
    conditions.personaIds.length === 0
      ? tc('conditionsNone')
      : conditions.personaIds
          .map((id) => (locale === 'ko' ? getPersona(id).labelKo : getPersona(id).labelEn))
          .join(' · ');

  if (entries === null) {
    return (
      <div className="grid gap-6">
        {/* The announcement region is mounted here and stays mounted through the swap
            below. A region that is itself replaced by the content it was going to
            announce announces nothing. */}
        <LiveRegion message={t('calculating')} />
        <p className="blank-slot">{t('calculating')}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <LiveRegion message={t('resultsReady', { count: entries.length })} />

      <div className="grid gap-2">
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <strong>{personaLabel}</strong>
          <Link href="/" className="t-sm">
            {tc('changeConditions')}
          </Link>
        </p>
        <p className="max-w-[var(--container-prose)] t-sm text-[var(--color-ink-2)]">
          {t('sortNote')}
        </p>
      </div>

      <ul aria-label={t('listLabel')} className="grid">
        {entries.map(({ poiSlug, title, result }) => {
          const place = byslug.get(poiSlug);
          if (!place) return null;
          const confirmed = (factsByPoi[poiSlug] ?? []).filter((f) => f.status === 'supported');
          return (
            <li key={poiSlug}>
              <article className="tile">
                <Thumbnail thumbnail={place.thumbnail} emptyText={t('noPhoto')} />

                <div className="grid gap-2.5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="t-md">
                      <Link href={`/places/${poiSlug}`} className="!no-underline hover:!underline">
                        {title}
                      </Link>
                    </h2>
                    <p className="t-xs text-[var(--color-ink-2)]">
                      {place.cityLabel}
                      {` · ${t(`role.${place.placeRole}`)}`}
                    </p>
                  </div>

                  <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <VerdictBadge label={result.label} text={tc(`label.${result.label}`)} />
                    {/* Both figures carry the word that says what they count. A bare
                        100 beside a place we have checked six items of reads as a
                        percentage of everything, which is the one thing it is not. */}
                    <Score label={result.label} score={result.score} />
                    <span className="t-xs text-[var(--color-ink-2)]">
                      {t('coverageShort', {
                        known: result.relevantKnownCount,
                        total: result.relevantTotalCount,
                      })}
                    </span>
                  </p>

                  {result.knownCriticalBlockers.length > 0 ? (
                    <p className="font-bold text-[var(--color-state-bad)]">
                      <span aria-hidden="true">✕ </span>
                      {t('blocked')}: {capabilityLabels(result.knownCriticalBlockers, locale)}
                    </p>
                  ) : null}

                  {result.unknownCriticals.length > 0 ? (
                    <p className="font-bold text-[var(--color-state-warn)]">
                      <span aria-hidden="true">⚠ </span>
                      {t('needCheck')}: {capabilityLabels(result.unknownCriticals, locale)}
                    </p>
                  ) : null}

                  {result.label === '정보없음' ? (
                    <p className="blank-slot t-sm">
                      {t('noVerdict', {
                        persona: personaLabel,
                        total: result.requiredCodes.length,
                        unknown: result.unknownCriticals.length,
                      })}
                    </p>
                  ) : null}

                  {confirmed.length > 0 ? (
                    <p className="t-sm">
                      {t('confirmed')}:{' '}
                      {capabilityLabels(
                        confirmed.slice(0, 5).map((f) => f.capabilityCode),
                        locale,
                      )}
                      {confirmed.length > 5 ? ` +${confirmed.length - 5}` : ''}
                    </p>
                  ) : null}

                  <p className="flex flex-wrap gap-2 pt-1">
                    <Link href={`/places/${poiSlug}`} className="btn">
                      {tc('openDetail')}
                    </Link>
                    {place.hasRoute ? (
                      <Link href={`/places/${poiSlug}/route-guide`} className="btn">
                        {tc('openRouteGuide')}
                      </Link>
                    ) : null}
                    {place.hasDocent ? (
                      <Link href={`/places/${poiSlug}/docent`} className="btn">
                        {tc('openDocent')}
                      </Link>
                    ) : null}
                  </p>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {/* Below the list and never instead of it, and fed from the same scored entries,
          so a marker cannot disagree with the row above it about a verdict. */}
      <section aria-labelledby="map-heading" className="grid gap-3">
        <h2 id="map-heading" className="section-head">
          {tm('heading')}
        </h2>
        <PlaceMap
          labelledBy="map-heading"
          center={mapCentre(places)}
          pins={entries.flatMap(({ poiSlug, title, result }) => {
            const place = byslug.get(poiSlug);
            if (!place) return [];
            return [
              {
                slug: poiSlug,
                title,
                lat: place.coord.lat,
                lng: place.coord.lng,
                // The same sentence the badge carries, and the score only where the
                // row shows one: 정보없음 hides it, so the marker hides it too.
                verdict:
                  result.label === '정보없음'
                    ? tc(`label.${result.label}`)
                    : `${tc(`label.${result.label}`)} ${result.score}`,
                tone: TONE[result.label],
                href: `/${locale}/places/${poiSlug}`,
              } satisfies MapPin,
            ];
          })}
        />
      </section>
    </div>
  );
}

const TONE: Record<SuitabilityLabel, MapPin['tone']> = {
  방문가능: 'visitable',
  주의: 'caution',
  대체추천: 'blocked',
  정보없음: 'unknown',
};

/** Midpoint of the places themselves, so the map opens on the set it is showing. */
function mapCentre(places: readonly PlaceCardData[]): { lat: number; lng: number } {
  const lats = places.map((p) => p.coord.lat);
  const lngs = places.map((p) => p.coord.lng);
  return {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  };
}

/**
 * Decorative by construction: the place's name is the heading immediately beside it,
 * so a description here would be the same words twice. A place we hold no photograph
 * of says so rather than leaving a grey rectangle for the reader to interpret.
 */
function Thumbnail({
  thumbnail,
  emptyText,
}: {
  thumbnail: PlaceThumbnail | null;
  emptyText: string;
}) {
  if (thumbnail === null) {
    return (
      <p className="tile__figure tile__figure--empty" aria-hidden="true">
        {emptyText}
      </p>
    );
  }
  return (
    <figure
      className={thumbnail.noTransform ? 'tile__figure tile__figure--contain' : 'tile__figure'}
    >
      <Image
        src={thumbnail.url}
        alt=""
        width={320}
        height={240}
        unoptimized={thumbnail.noTransform}
        sizes="(min-width: 40rem) 12rem, 100vw"
      />
    </figure>
  );
}

/**
 * The visible glyph and the spoken text are separate elements rather than one element
 * with aria-label. A bare span carries no role, so aria-label on it is not guaranteed
 * to be exposed at all — and a bare number with no unit is read as "78", which could
 * be anything on a page that also shows distances, counts and percentages.
 */
function Score({ label, score }: { label: SuitabilityLabel; score: number }) {
  const t = useTranslations('place');
  // A number next to "not enough information" gets read as a rating of the place.
  if (label === '정보없음') {
    return (
      <span className="tabular t-sm text-[var(--color-ink-2)]">
        <span aria-hidden="true">—</span>
        <span className="sr-only">{t('scoreHidden')}</span>
      </span>
    );
  }
  return (
    <span className="t-xs text-[var(--color-ink-2)]">
      {t('scoreShort')}{' '}
      <span className="tabular t-md font-extrabold text-[var(--color-ink)]" aria-hidden="true">
        {score}
      </span>
      <span className="sr-only">{t('score', { score })}</span>
    </span>
  );
}
