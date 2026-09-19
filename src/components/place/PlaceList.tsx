'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { buildScoreboard, sortScoreboard } from '@/domain/scoreboard';
import { getPersona } from '@/domain/personas';
import { getCapability } from '@/domain/capabilities';
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

  // Before anything reads a coordinate. mapCentre spreads the list into Math.min and
  // Math.max, and on an empty list those are Infinity and -Infinity, so the map opened
  // on NaN, NaN under a list with no rows and no explanation in it.
  if (entries.length === 0) {
    return (
      <div className="grid gap-6">
        <LiveRegion message={t('resultsReady', { count: 0 })} />
        <p className="blank-slot">{t('noPlaces')}</p>
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
          /**
           * Facilities only, the same filter the detail panel applies. Unfiltered, the
           * context axis put today's forecast and any weather warning under the word
           * for "available", so every card read 「이용 가능: … 기상 특보」 — a weather
           * warning offered as something the visitor can use.
           */
          const confirmed = (factsByPoi[poiSlug] ?? []).filter(
            (f) => f.status === 'supported' && getCapability(f.capabilityCode)?.axis !== 'context',
          );
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

                  {/* No score here. It is the average of whichever items happen to be
                      known, so it answers a different question at every place: six
                      checked items produced a 100 at one place while sixteen produced
                      an 86 at another, and a caption under the figure was not enough to
                      stop the two being read against each other. What is left is what
                      the figure was standing in for — how much of this place has been
                      checked. The score is still in the calculation panel on the detail
                      screen, under the sentence that says what it is. */}
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <VerdictBadge label={result.label} text={tc(`label.${result.label}`)} />
                    {/* Named when there is more than one verdict on the card. Three
                        badges in a column with only the lower two labelled reads as
                        three conditions, one of them nameless. */}
                    {result.perPersona.length > 0 ? (
                      <span className="t-sm font-bold">{t('groupBadge')}</span>
                    ) : null}
                    <span className="t-xs text-[var(--color-ink-2)]">
                      {t('checkedOf', {
                        known: result.relevantKnownCount,
                        total: result.relevantTotalCount,
                      })}
                      {' · '}
                      {t('unknownCount', {
                        count: result.relevantTotalCount - result.relevantKnownCount,
                      })}
                    </span>
                  </p>

                  {/* One row per chosen condition, on the card rather than only on the
                      detail screen. The headline badge follows the least-served
                      companion, so without these a wheelchair user who also ticks
                      청각장애 loses every wheelchair verdict the service had. */}
                  {result.perPersona.length > 0 ? (
                    <ul className="grid gap-1">
                      {result.perPersona.map((row) => (
                        <li key={row.personaId} className="flex flex-wrap items-center gap-x-2 t-sm">
                          <VerdictBadge label={row.label} text={tc(`label.${row.label}`)} />
                          <span className="text-[var(--color-ink-2)]">
                            {t('perPersonaBadge', {
                              persona:
                                locale === 'ko'
                                  ? getPersona(row.personaId).labelKo
                                  : getPersona(row.personaId).labelEn,
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

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

                  {result.partialCriticals.length > 0 ? (
                    <p className="font-bold text-[var(--color-state-warn)]">
                      <span aria-hidden="true">⚠ </span>
                      {t('condition')}: {capabilityLabels(result.partialCriticals, locale)}
                    </p>
                  ) : null}

                  {result.label === '정보없음' ? (
                    <p className="blank-slot t-sm">
                      {/* No persona in the sentence. The conditions are named once at
                          the top of the list, and dropping them in here produced
                          「조건 미선택 — 일반 방문 기준 기준으로」 in Korean and a clause
                          in the middle of an English sentence. */}
                      {/* Two different reasons wear the same badge. "0개 항목 중 0개를
                          모릅니다" was what the first sentence said for the second one,
                          which reads as nothing being missing. */}
                      {result.noVerdictBasis?.reason === 'nothing_applies'
                        ? t('noVerdictNothingApplies')
                        : t('noVerdict', {
                            total: result.noVerdictBasis?.total ?? result.requiredCodes.length,
                            unknown:
                              result.noVerdictBasis?.unknown ?? result.unknownCriticals.length,
                          })}
                    </p>
                  ) : null}

                  {confirmed.length > 0 ? (
                    <p className="t-sm">
                      {t('confirmed')}:{' '}
                      {capabilityLabels(
                        confirmed.slice(0, CONFIRMED_SHOWN_MAX).map((f) => f.capabilityCode),
                        locale,
                      )}
                      {confirmed.length > CONFIRMED_SHOWN_MAX
                        ? ` ${tc('andMore', { count: confirmed.length - CONFIRMED_SHOWN_MAX })}`
                        : ''}
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
                // The same words the badge carries, and nothing the row does not show.
                // It used to append the score, which is no longer on the card at all.
                verdict: tc(`label.${result.label}`),
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

/** How many confirmed items a card names before the rest are counted. */
const CONFIRMED_SHOWN_MAX = 5;

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

