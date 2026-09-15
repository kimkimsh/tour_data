'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { buildScoreboard } from '@/domain/scoreboard';
import { getPersona } from '@/domain/personas';
import { POLICY_VERSION } from '@/domain/suitability';
import type {
  Locale,
  SuitabilityFactInput,
  SuitabilityLabel,
  SuitabilityResult,
} from '@/domain/types';
import { VerdictBadge } from '@/components/VerdictBadge';
import { useConditions } from '@/components/persona/usePersona';
import { capabilityLabel, capabilityLabels, type PlaceCardData } from './place-view';
import { useToday } from '@/components/useClientValue';
import { LiveRegion } from '@/components/a11y/LiveRegion';

const VERDICT_MODIFIER: Record<SuitabilityLabel, string> = {
  방문가능: 'visitable',
  주의: 'caution',
  대체추천: 'blocked',
  정보없음: 'unknown',
};

/** Items with a status, which is the set the score is the mean over. */
function knownCount(facts: readonly SuitabilityFactInput[]): number {
  return facts.filter((f) => f.status !== 'unknown' && f.absenceKind !== 'not_applicable').length;
}

/**
 * The verdict, and — behind one disclosure — every number the verdict came from.
 *
 * Numbers here are rendered straight off SuitabilityResult. Nothing is recomputed
 * and nothing is typed in by hand: a figure on this screen that the function did
 * not produce would be exactly the claim this service refuses to make.
 */
export function VerdictPanel({
  poiSlug,
  places,
  factsByPoi,
  hasRoute,
  hasDocent,
}: {
  poiSlug: string;
  places: PlaceCardData[];
  factsByPoi: Record<string, SuitabilityFactInput[]>;
  hasRoute: boolean;
  hasDocent: boolean;
}) {
  const t = useTranslations('place');
  const tc = useTranslations('common');
  const tp = useTranslations('places');
  const locale = useLocale() as Locale;
  const { conditions, loaded } = useConditions();
  const today = useToday();

  const board = useMemo(() => {
    if (!loaded || today === null) return null;
    return buildScoreboard({
      pois: places.map((p) => ({ slug: p.slug, title: p.title, city: p.cityLabel })),
      factsByPoi,
      personaIds: conditions.personaIds,
      cognitiveOption: conditions.cognitiveOption,
      calculationDate: today,
    });
  }, [loaded, today, places, factsByPoi, conditions.personaIds, conditions.cognitiveOption]);

  const entry = board?.find((e) => e.poiSlug === poiSlug);

  if (!entry) {
    return (
      <section className="grid gap-4" aria-labelledby="verdict-heading">
        <h2 id="verdict-heading" className="section-head">
          {t('headingVerdict')}
        </h2>
        {/* Mounted before the verdict exists and kept in place through the swap: a
            region replaced by its own content announces nothing. */}
        <LiveRegion message={tp('calculating')} />
        <p className="card">{tp('calculating')}</p>
      </section>
    );
  }

  const { result } = entry;
  const facts = factsByPoi[poiSlug] ?? [];
  const personaLabel =
    conditions.personaIds.length === 0
      ? tc('conditionsNone')
      : conditions.personaIds
          .map((id) => (locale === 'ko' ? getPersona(id).labelKo : getPersona(id).labelEn))
          .join(' · ');
  const confirmed = facts.filter((f) => f.status === 'supported').map((f) => f.capabilityCode);

  return (
    <section className="grid gap-4" aria-labelledby="verdict-heading">
      <h2 id="verdict-heading" className="section-head">
        {t('headingVerdict')}
      </h2>
      <LiveRegion message={tc(`label.${result.label}`)} />

      {/*
        The order inside this block is the argument: the verdict, then what the verdict
        rests on, then the two figures, then the conditions it was taken under. The
        score used to open it at 2.1rem, which reads as a measurement — and it is a mean
        over whichever fields happened to be filled in. What a visitor can act on is
        which of their own requirements is still unchecked, so that line comes first.
      */}
      <div className={`verdict verdict--${VERDICT_MODIFIER[result.label]}`}>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <VerdictBadge label={result.label} text={tc(`label.${result.label}`)} size="lg" />
          <span className="t-sm text-[var(--color-ink-2)]">
            {t('verdictBasis', { items: capabilityLabels(result.requiredCodes, locale) })}
          </span>
        </p>

        {result.knownCriticalBlockers.length > 0 ? (
          // Named, like the line below it. A bare "✕ 점자블록" leaves the reader to work
          // out which of the four states it means, next to a line that does say.
          <p className="t-md font-bold text-[var(--color-state-bad)]">
            <span aria-hidden="true">✕ </span>
            {t('blockedItems')}: {capabilityLabels(result.knownCriticalBlockers, locale)}
          </p>
        ) : null}

        {/* Required by the label rule: a caution verdict that does not name what to
            check leaves the visitor with nothing to act on. */}
        {result.unknownCriticals.length > 0 ? (
          <p className="t-md font-bold text-[var(--color-state-warn)]">
            <span aria-hidden="true">⚠ </span>
            {t('needCheckItems')}: {capabilityLabels(result.unknownCriticals, locale)}
          </p>
        ) : null}

        {result.label === '정보없음' ? (
          <p className="blank-slot t-sm">{t('scoreHiddenReason')}</p>
        ) : null}

        <div className="stat-row">
          {result.label === '정보없음' ? null : (
            <p className="stat">
              <span className="stat__figure">
                <span aria-hidden="true">{result.score}</span>
                <span className="sr-only">{t('score', { score: result.score })}</span>
              </span>
              <span className="stat__label">{t('scoreBasis', { count: knownCount(facts) })}</span>
            </p>
          )}
          <p className="stat">
            <span className="stat__figure">
              {t('coverageValue', {
                known: result.relevantKnownCount,
                total: result.relevantTotalCount,
              })}
            </span>
            <span className="stat__label">{t('coverageBasis')}</span>
          </p>
          <p className="stat">
            <span className="stat__figure">{result.evidenceConfidence}</span>
            {/* Body text, not a title attribute: that never appears on a touch device,
                never appears for a keyboard user, and is read inconsistently. The
                distinction it draws — confidence is not the score — is the one people
                get wrong. */}
            <span className="stat__label">{t('confidenceBasis')}</span>
          </p>
        </div>

        <dl className="grid gap-x-3 gap-y-1 t-sm sm:grid-cols-[7rem_1fr]">
          <dt className="font-bold">{t('conditions')}</dt>
          <dd>{personaLabel}</dd>
          {confirmed.length > 0 ? (
            <>
              <dt className="font-bold">{t('confirmedItems')}</dt>
              <dd>{capabilityLabels(confirmed, locale)}</dd>
            </>
          ) : null}
          <dt className="font-bold">{tc('status.unknown')}</dt>
          {/* The value repeats no part of its own label. The row read
              "정보 없음 | 정보 없음 17건 / 22건", which looks like a rendering fault. */}
          <dd>
            {t('unknownCountValue', {
              unknown: result.ktoUnknownCount,
              total: result.ktoTotalCount,
            })}
          </dd>
        </dl>
      </div>

      <p className="flex flex-wrap gap-2">
        {hasRoute ? (
          <Link href={`/places/${poiSlug}/route-guide`} className="btn btn--filled">
            {tc('openRouteGuide')}
          </Link>
        ) : null}
        {hasDocent ? (
          <Link href={`/places/${poiSlug}/docent`} className="btn">
            {tc('openDocent')}
          </Link>
        ) : null}
        <Link href={`/report?poi=${poiSlug}`} className="btn">
          {tc('openReport')}
        </Link>
      </p>

      <CalculationDisclosure result={result} locale={locale} />

      {result.alternatives.length > 0 ? (
        <section aria-labelledby="alternatives-heading" className="grid gap-3">
          <h2 id="alternatives-heading" className="section-head">{t('headingAlternatives')}</h2>
          <p className="t-sm text-[var(--color-ink-2)]">{t('alternativesHint')}</p>
          <ul className="grid gap-2">
            {result.alternatives.map((alt) => (
              <li key={alt.poiSlug} className="flex flex-wrap items-center gap-3">
                <Link href={`/places/${alt.poiSlug}`}>{alt.title}</Link>
                <VerdictBadge label={alt.label} text={tc(`label.${alt.label}`)} />
                {alt.label === '정보없음' ? null : <span className="tabular font-bold">{alt.score}</span>}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

function CalculationDisclosure({
  result,
  locale,
}: {
  result: SuitabilityResult;
  locale: Locale;
}) {
  const t = useTranslations('place');
  const tc = useTranslations('common');
  const emptyAxes = result.axes.filter((axis) => axis.knownCount === 0);

  return (
    <details className="card">
      <summary className="cursor-pointer font-bold">{t('openCalc')}</summary>

      <div className="mt-4 grid gap-5">
        <div className="scroll-x">
          <table className="data-table">
            <caption>{t('axisTable')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('axisHeader.axis')}</th>
                <th scope="col">{t('axisHeader.weight')}</th>
                <th scope="col">{t('axisHeader.raw')}</th>
                <th scope="col">{t('axisHeader.weighted')}</th>
                <th scope="col">{t('axisHeader.known')}</th>
              </tr>
            </thead>
            <tbody>
              {result.axes.map((axis) => (
                <tr key={axis.axis}>
                  <th scope="row">{locale === 'ko' ? axis.labelKo : axis.labelEn}</th>
                  <td>{axis.weight.toFixed(2)}</td>
                  <td>{axis.rawScore.toFixed(3)}</td>
                  <td>{axis.weighted.toFixed(3)}</td>
                  <td>
                    {axis.knownCount} / {axis.totalCount}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{t('layerA')}</th>
                <td colSpan={2} />
                <td className="font-bold">{result.layerA.toFixed(3)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <dl className="grid gap-1 sm:grid-cols-[12rem_1fr]">
          <dt className="font-bold">{t('layerB')}</dt>
          <dd className="tabular">{result.layerB.toFixed(3)}</dd>
        </dl>

        <p className="font-bold">
          {t('scoreFormula', {
            a: result.layerA.toFixed(3),
            b: result.layerB.toFixed(3),
            score: result.score,
          })}
        </p>
        <p className="t-xs text-[var(--color-ink-2)]">{t('roundingNote')}</p>

        <div className="border-t border-[var(--color-rule)] pt-4">
          <p className="font-bold">
            {t('confidence', { value: result.evidenceConfidence })}
          </p>
          {/* The two factors named, not printed bare. "0.60 × 0.90" beside a sentence
              is a debug line: nothing on the row says which number is which. */}
          <p className="mt-1 t-sm">
            {t('whyCautionCoverage', {
              known: result.relevantKnownCount,
              total: result.relevantTotalCount,
            })}
          </p>
          <p className="mt-1 t-sm tabular">
            {t('confidenceFactors', {
              coverage: result.coverage.toFixed(2),
              freshness: result.freshness.toFixed(2),
            })}
          </p>
          <p className="mt-1 t-xs text-[var(--color-ink-2)]">{t('freshnessNote')}</p>
        </div>

        {result.label === '주의' ? (
          <div>
            <h3 className="subhead">{t('whyCaution')}</h3>
            <p className="mt-1 t-sm">
              {result.unknownCriticals.length > 0
                ? t('whyCautionUnknown', {
                    items: capabilityLabels(result.unknownCriticals, locale),
                  })
                : t('whyCautionScore', { score: result.score })}
            </p>
          </div>
        ) : null}

        {emptyAxes.length > 0 ? (
          <div>
            <h3 className="subhead">{t('biggestGaps')}</h3>
            <ul className="mt-1 grid gap-1 t-sm">
              {emptyAxes.map((axis) => (
                <li key={axis.axis}>
                  {t('axisAllUnknown', {
                    axis: locale === 'ko' ? axis.labelKo : axis.labelEn,
                    count: axis.totalCount,
                  })}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {result.deductions.length > 0 ? (
          <p className="t-sm text-[var(--color-ink-2)]">
            {result.deductions
              .slice(0, 8)
              .map((d) => capabilityLabel(d.capabilityCode, locale))
              .join(', ')}
            {result.deductions.length > 8 ? ` +${result.deductions.length - 8}` : ''}
          </p>
        ) : null}

        <p className="evidence__provenance border-t border-[var(--color-rule)] pt-3">
          {tc('honesty.formula', { version: POLICY_VERSION })}
        </p>
      </div>
    </details>
  );
}

