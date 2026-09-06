'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { buildScoreboard, sortScoreboard } from '@/domain/scoreboard';
import { criticalCodesFor, getPersona } from '@/domain/personas';
import type { Locale, PersonaId, SuitabilityFactInput, SuitabilityLabel } from '@/domain/types';
import { VerdictBadge } from '@/components/VerdictBadge';
import { useConditions } from '@/components/persona/usePersona';
import { capabilityLabels, type PlaceCardData } from './place-view';
import { useToday } from '@/components/useClientValue';
import { LiveRegion } from '@/components/a11y/LiveRegion';

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
  const locale = useLocale() as Locale;
  const { conditions, loaded } = useConditions();
  const today = useToday();

  const entries = useMemo(() => {
    if (!loaded || today === null) return null;
    return sortScoreboard(
      buildScoreboard({
        pois: places.map((p) => ({
          slug: p.slug,
          title: p.title,
        })),
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
        <p className="card">{t('calculating')}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <LiveRegion message={t('resultsReady', { count: entries.length })} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-[1.02rem]">
          <strong>{personaLabel}</strong>
        </p>
        <Link href="/" className="text-[0.95rem]">
          {tc('changeConditions')}
        </Link>
      </div>

      <p className="max-w-[var(--container-prose)] text-[0.92rem] text-[var(--color-ink-2)]">
        {t('sortNote')}
      </p>

      <ul aria-label={t('listLabel')} className="grid gap-4">
        {entries.map(({ poiSlug, title, result }) => {
          const place = byslug.get(poiSlug);
          if (!place) return null;
          const confirmed = confirmedCodes(factsByPoi[poiSlug] ?? []);
          return (
            <li key={poiSlug}>
              <article className="card grid gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2>
                      <Link href={`/places/${poiSlug}`} className="!no-underline hover:!underline">
                        {title}
                      </Link>
                    </h2>
                    <p className="mt-1 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-ink-2)]">
                      {place.cityLabel}
                      {place.isUnescoComponent ? ` · ${t('componentSite')}` : ` · ${t('adjacentSite')}`}
                    </p>
                  </div>
                  <p className="flex flex-wrap items-center gap-2">
                    <VerdictBadge label={result.label} text={tc(`label.${result.label}`)} />
                    <ScoreOrDash label={result.label} score={result.score} />
                  </p>
                </div>

                {result.label === '정보없음' ? (
                  <p className="blank-slot">
                    {t('noVerdict', {
                      persona: personaLabel,
                      total: requiredCount(conditions.personaIds, factsByPoi[poiSlug] ?? []),
                      unknown: result.unknownCriticals.length,
                    })}
                    {result.unknownCriticals.length > 0 ? (
                      <span className="mt-1 block font-bold">
                        → {capabilityLabels(result.unknownCriticals, locale)}
                      </span>
                    ) : null}
                  </p>
                ) : null}

                {result.unknownCriticals.length > 0 && result.label !== '정보없음' ? (
                  <p className="font-bold text-[var(--color-state-warn)]">
                    <span aria-hidden="true">⚠ </span>
                    {t('needCheck')}: {capabilityLabels(result.unknownCriticals, locale)}
                  </p>
                ) : null}

                {result.knownCriticalBlockers.length > 0 ? (
                  <p className="font-bold text-[var(--color-state-bad)]">
                    <span aria-hidden="true">✕ </span>
                    {capabilityLabels(result.knownCriticalBlockers, locale)}
                  </p>
                ) : null}

                {confirmed.length > 0 ? (
                  <p className="text-[0.95rem]">
                    {t('confirmed')}: {capabilityLabels(confirmed.slice(0, 5), locale)}
                    {confirmed.length > 5 ? ` +${confirmed.length - 5}` : ''}
                  </p>
                ) : null}

                <p className="evidence__provenance">
                  {tc('unknownCountScoped', {
                    unknown: result.ktoUnknownCount,
                    total: result.ktoTotalCount,
                  })}
                </p>

                <p className="flex flex-wrap gap-2">
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
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The visible glyph and the spoken text are separate elements rather than one element
 * with aria-label. A bare span carries no role, so aria-label on it is not guaranteed
 * to be exposed at all — and a bare number with no unit is read as "78", which could
 * be anything on a page that also shows distances, counts and percentages.
 */
function ScoreOrDash({ label, score }: { label: SuitabilityLabel; score: number }) {
  const t = useTranslations('place');
  // A number next to "not enough information" gets read as a rating of the place.
  if (label === '정보없음') {
    return (
      <span className="tabular text-[1.15rem] text-[var(--color-ink-2)]">
        <span aria-hidden="true">—</span>
        <span className="sr-only">{t('scoreHidden')}</span>
      </span>
    );
  }
  return (
    <span className="tabular text-[1.35rem] font-extrabold">
      <span aria-hidden="true">{score}</span>
      <span className="sr-only">{t('score', { score })}</span>
    </span>
  );
}

function confirmedCodes(facts: readonly SuitabilityFactInput[]): string[] {
  return facts.filter((f) => f.status === 'supported').map((f) => f.capabilityCode);
}

/**
 * Size of the required set the verdict was taken over. The result object reports
 * which required items are unknown or blocked but not how many there were, and the
 * sentence needs the denominator.
 */
function requiredCount(
  personaIds: readonly PersonaId[],
  facts: readonly SuitabilityFactInput[],
): number {
  const required = new Set(personaIds.flatMap((id) => criticalCodesFor(id)));
  return facts.filter(
    (f) => required.has(f.capabilityCode) && f.absenceKind !== 'not_applicable',
  ).length;
}
