'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { buildScoreboard } from '@/domain/scoreboard';
import { getPersona, relevantCodesFor } from '@/domain/personas';
import { POLICY_VERSION } from '@/domain/suitability';
import type { Locale, PersonaId, SuitabilityFactInput, SuitabilityResult } from '@/domain/types';
import { VerdictBadge } from '@/components/VerdictBadge';
import { Eyebrow } from '@/components/Eyebrow';
import { useConditions } from '@/components/persona/usePersona';
import { capabilityLabel, capabilityLabels, type PlaceCardData } from './place-view';
import { useToday } from '@/components/useClientValue';
import { LiveRegion } from '@/components/a11y/LiveRegion';

const COVERAGE_CAP_THRESHOLD = 0.65;

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
      pois: places.map((p) => ({ slug: p.slug, title: p.title, certifications: p.certifications })),
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
        <Eyebrow as="h2" id="verdict-heading">
          {t('eyebrowVerdict')}
        </Eyebrow>
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
  const relevantTotal = relevantKnownTotal(conditions.personaIds, facts);

  return (
    <section className="grid gap-4" aria-labelledby="verdict-heading">
      <Eyebrow as="h2" id="verdict-heading">
        {t('eyebrowVerdict')}
      </Eyebrow>
      <LiveRegion message={tc(`label.${result.label}`)} />

      <div className="flex flex-wrap items-center gap-3">
        <VerdictBadge label={result.label} text={tc(`label.${result.label}`)} size="lg" />
        {result.label === '정보없음' ? (
          <span className="tabular text-[1.4rem] text-[var(--color-ink-2)]">
            <span aria-hidden="true">—</span>
            <span className="sr-only">{t('scoreHidden')}</span>
          </span>
        ) : (
          <span className="tabular text-[2.1rem] font-extrabold leading-none tracking-[-0.03em]">
            <span aria-hidden="true">{result.score}</span>
            <span className="sr-only">{t('score', { score: result.score })}</span>
          </span>
        )}
        <span className="ml-auto rounded-full border border-[var(--color-rule-strong)] px-3 py-1 text-[0.88rem]">
          {t('confidence', { value: result.evidenceConfidence })}
        </span>
      </div>

      {/* This sentence used to live only in a title attribute, which never appears on
          a touch device, never appears for a keyboard user, and is read inconsistently.
          The distinction it draws — confidence is not the score — is the one people
          get wrong, so it is body text. */}
      <p className="text-[0.92rem] text-[var(--color-ink-2)]">{t('confidenceHint')}</p>

      {result.label === '정보없음' ? (
        <p className="blank-slot text-[1.02rem]">
          <strong>{t('scoreHiddenReason')}</strong>
          {result.unknownCriticals.length > 0 ? (
            <span className="mt-1 block">
              {t('needCheckItems')}: {capabilityLabels(result.unknownCriticals, locale)}
            </span>
          ) : null}
        </p>
      ) : null}

      {/* Required by the label rule: a caution verdict that does not name what to
          check leaves the visitor with nothing to act on. */}
      {result.unknownCriticals.length > 0 && result.label !== '정보없음' ? (
        <p className="text-[1.05rem] font-bold text-[var(--color-state-warn)]">
          <span aria-hidden="true">⚠ </span>
          {t('needCheckItems')}: {capabilityLabels(result.unknownCriticals, locale)}
        </p>
      ) : null}

      {result.knownCriticalBlockers.length > 0 ? (
        <p className="text-[1.05rem] font-bold text-[var(--color-state-bad)]">
          <span aria-hidden="true">✕ </span>
          {capabilityLabels(result.knownCriticalBlockers, locale)}
        </p>
      ) : null}

      <dl className="grid gap-1 text-[0.98rem] sm:grid-cols-[7rem_1fr]">
        <dt className="font-bold">{t('conditions')}</dt>
        <dd>{personaLabel}</dd>
        {confirmed.length > 0 ? (
          <>
            <dt className="font-bold">{t('confirmedItems')}</dt>
            <dd>{capabilityLabels(confirmed, locale)}</dd>
          </>
        ) : null}
        <dt className="font-bold">{tc('status.unknown')}</dt>
        <dd>
          {tc('unknownCountScoped', {
            unknown: result.ktoUnknownCount,
            total: result.ktoTotalCount,
          })}
        </dd>
      </dl>

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

      <CalculationDisclosure
        result={result}
        personaIds={conditions.personaIds}
        relevantTotal={relevantTotal}
        locale={locale}
      />

      {result.alternatives.length > 0 ? (
        <section aria-labelledby="alternatives-heading" className="grid gap-3">
          <Eyebrow as="h2" id="alternatives-heading">{t('eyebrowAlternatives')}</Eyebrow>
          <p className="text-[0.95rem] text-[var(--color-ink-2)]">{t('alternativesHint')}</p>
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
  personaIds,
  relevantTotal,
  locale,
}: {
  result: SuitabilityResult;
  personaIds: readonly PersonaId[];
  relevantTotal: { known: number; total: number };
  locale: Locale;
}) {
  const t = useTranslations('place');
  const tc = useTranslations('common');
  const emptyAxes = result.axes.filter((axis) => axis.knownCount === 0);

  return (
    <details className="card">
      <summary className="cursor-pointer text-[1.02rem] font-bold">{t('openCalc')}</summary>

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
          <dt className="font-bold">{t('layerC')}</dt>
          <dd className="tabular">
            {result.layerC.toFixed(3)}
            {result.layerC === 1 ? ` — ${t('layerCNone')}` : ''}
          </dd>
        </dl>

        <p className="text-[1.02rem] font-bold">
          {t('scoreFormula', {
            a: result.layerA.toFixed(3),
            b: result.layerB.toFixed(3),
            c: result.layerC.toFixed(3),
            score: result.score,
          })}
        </p>
        <p className="text-[0.88rem] text-[var(--color-ink-2)]">{t('roundingNote')}</p>

        <div className="border-t border-[var(--color-rule)] pt-4">
          <p className="text-[1.02rem] font-bold">
            {t('confidence', { value: result.evidenceConfidence })}
          </p>
          <p className="mt-1 text-[0.95rem]">
            {t('whyCautionCoverage', { known: relevantTotal.known, total: relevantTotal.total })} ·{' '}
            {result.coverage.toFixed(2)} × {result.freshness.toFixed(2)}
          </p>
          <p className="mt-1 text-[0.88rem] text-[var(--color-ink-2)]">{t('freshnessNote')}</p>
        </div>

        {result.label === '주의' ? (
          <div>
            <h3 className="subhead">{t('whyCaution')}</h3>
            <ul className="mt-1 grid gap-1 text-[0.95rem]">
              {result.unknownCriticals.length > 0 ? (
                <li>
                  {t('whyCautionUnknown', {
                    items: capabilityLabels(result.unknownCriticals, locale),
                  })}
                </li>
              ) : null}
              {result.coverage < COVERAGE_CAP_THRESHOLD ? (
                <li>{t('whyCautionCoverage', { known: relevantTotal.known, total: relevantTotal.total })}</li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {emptyAxes.length > 0 ? (
          <div>
            <h3 className="subhead">{t('biggestGaps')}</h3>
            <ul className="mt-1 grid gap-1 text-[0.95rem]">
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
          <p className="text-[0.92rem] text-[var(--color-ink-2)]">
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
        <p className="evidence__provenance">
          {personaIds.length === 0 ? 'P0' : personaIds.join(' + ')} · policy {result.policyVersion}
        </p>
      </div>
    </details>
  );
}

/**
 * Known-to-total over the capabilities the chosen conditions care about — the same
 * set the coverage figure is taken over, so the sentence on screen and the number
 * in the result cannot disagree.
 */
function relevantKnownTotal(
  personaIds: readonly PersonaId[],
  facts: readonly SuitabilityFactInput[],
): { known: number; total: number } {
  const relevant = new Set(relevantCodesFor(personaIds));
  const included = facts.filter(
    (f) => relevant.has(f.capabilityCode) && f.absenceKind !== 'not_applicable',
  );
  return {
    known: included.filter((f) => f.status !== 'unknown').length,
    total: included.length,
  };
}
