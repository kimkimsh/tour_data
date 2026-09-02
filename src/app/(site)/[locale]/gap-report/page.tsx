import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getContext, getFacts, getPois } from '@/lib/data';
import { absenceLabel, computeGapReport, gapRowsToCsv, statusLabel } from '@/domain/gap';
import type { GapFact } from '@/domain/gap';
import { Eyebrow } from '@/components/Eyebrow';
import { SnapshotProblem } from '@/components/SnapshotGate';
import type { ContentLocale, Locale } from '@/domain/types';
import { capabilityLabel } from '@/components/place/place-view';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'gapReport' });
  return { title: t('metaTitle') };
}

export default async function GapReportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'gapReport' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const localeKey = locale as Locale;

  const [pois, facts] = await Promise.all([getPois(), getFacts()]);
  if (!pois.ok) return <SnapshotProblem result={pois} />;
  if (!facts.ok) return <SnapshotProblem result={facts} />;

  const contextResult = await getContext();
  const titles = Object.fromEntries(
    pois.data.map((poi) => [
      poi.slug,
      poi.i18n[locale as ContentLocale]?.title ?? poi.i18n.ko?.title ?? poi.slug,
    ]),
  );

  const report = computeGapReport(
    facts.data as GapFact[],
    pois.data.map((poi) => poi.slug),
  );
  const asOf = latestVerifiedAt(facts.data) ?? '—';
  const csvKb = Math.max(
    1,
    Math.round(new TextEncoder().encode(gapRowsToCsv(report.priorities, titles)).length / 1024),
  );

  return (
    <div className="grid gap-10">
      <header className="grid gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1>{t('title')}</h1>
        <p className="text-[0.95rem] text-[var(--color-ink-2)]">
          {t('asOf', { date: asOf, places: report.fill.length })}
        </p>
      </header>

      <section aria-labelledby="fill-heading" className="grid gap-3">
        <h2 id="fill-heading">{t('fillHeader.total')}</h2>
        <div className="scroll-x">
          <table className="data-table">
            <caption>{t('fillCaption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('fillHeader.place')}</th>
                <th scope="col">{t('fillHeader.kto')}</th>
                <th scope="col">{t('fillHeader.curated')}</th>
                <th scope="col">{t('fillHeader.unknown')}</th>
                <th scope="col">{t('fillHeader.total')}</th>
              </tr>
            </thead>
            <tbody>
              {[...report.fill]
                .sort((a, b) => b.unknown - a.unknown)
                .map((row) => (
                  <tr key={row.poiSlug}>
                    <th scope="row">{titles[row.poiSlug] ?? row.poiSlug}</th>
                    <td className="tabular">{row.ktoFilled}</td>
                    <td className="tabular">{row.curatedFilled}</td>
                    <td className="tabular font-bold">{row.unknown}</td>
                    <td className="tabular">{row.ktoTotal}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {/* The two filled columns stay apart on purpose: merged, the figure would
            rise every time we fill a cell ourselves, and the number is meant to be
            readable as municipal progress. */}
        <p className="max-w-[var(--container-prose)] text-[0.9rem] text-[var(--color-ink-2)]">
          {t('fillNote')}
        </p>
      </section>

      {report.notRegisteredPoiSlugs.length > 0 ? (
        <section
          aria-labelledby="unregistered-heading"
          className="callout callout--caution"
        >
          <h2 id="unregistered-heading" className="subhead">
            {t('notRegisteredTitle')}
          </h2>
          <ul className="mt-2 grid gap-1">
            {report.notRegisteredPoiSlugs.map((slug) => (
              <li key={slug}>
                <span aria-hidden="true">⚠ </span>
                {t('notRegistered', { place: titles[slug] ?? slug })}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="priority-heading" className="grid gap-3">
        <h2 id="priority-heading">{t('priorityHeader.priority')}</h2>
        {report.priorities.length === 0 ? (
          <p className="blank-slot">{t('empty')}</p>
        ) : (
          <div className="scroll-x">
            <table className="data-table">
              <caption>{t('priorityCaption')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('priorityHeader.rank')}</th>
                  <th scope="col">{t('priorityHeader.place')}</th>
                  <th scope="col">{t('priorityHeader.capability')}</th>
                  <th scope="col">{tc('status.unknown')}</th>
                  <th scope="col">{t('priorityHeader.cause')}</th>
                  <th scope="col">{t('priorityHeader.priority')}</th>
                </tr>
              </thead>
              <tbody>
                {report.priorities.slice(0, 40).map((row, index) => (
                  <tr key={`${row.poiSlug}-${row.capabilityCode}`}>
                    {/* The rank is the row header because it is the first cell, and a
                        scope="row" header that is not first does not label the cells
                        before it. The officer refers to rows by rank anyway. */}
                    <th scope="row" className="tabular">
                      {index + 1}
                    </th>
                    <td>{titles[row.poiSlug] ?? row.poiSlug}</td>
                    <td>
                      {capabilityLabel(row.capabilityCode, localeKey)}
                      <span className="ml-2 font-mono text-[0.72rem] text-[var(--color-ink-2)]">
                        {row.capabilityCode}
                      </span>
                    </td>
                    <td>{statusLabel(row.status, locale)}</td>
                    <td>
                      <CauseMark absenceKind={row.absenceKind} />
                      {absenceLabel(row.absenceKind, locale)}
                    </td>
                    <td className="tabular">{row.priority.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card">
          <h3 className="subhead">{t('causeLegendTitle')}</h3>
          <ul className="mt-2 grid gap-1 text-[0.93rem]">
            <li>
              <span aria-hidden="true">○ </span>
              {t('causeLegend.unknown')}
            </li>
            <li>
              <span aria-hidden="true">● </span>
              {t('causeLegend.operator')}
            </li>
            <li>
              <span aria-hidden="true">◆ </span>
              {t('causeLegend.intrinsic')}
            </li>
          </ul>
          <p className="mt-3 text-[0.9rem] text-[var(--color-ink-2)]">{t('causeNote')}</p>
        </div>
      </section>

      <section aria-labelledby="visitors-heading" className="grid gap-2">
        <h2 id="visitors-heading" className="subhead">
          {t('visitorsTitle')}
        </h2>
        {contextResult.ok && contextResult.data.visitors.length > 0 ? (
          <>
            <p className="text-[0.95rem]">
              {t('visitorsWindow', {
                start: contextResult.data.visitors[0]!.windowStart,
                end: contextResult.data.visitors[0]!.windowEnd,
              })}
            </p>
            <ul className="grid gap-1">
              {contextResult.data.visitors.map((row) => (
                <li key={`${row.signguCd5}-${row.touDivCd}`} className="tabular">
                  {t('visitorsValue', {
                    place: row.signguNm,
                    value: row.dailyAverage.toLocaleString(locale, { maximumFractionDigits: 1 }),
                  })}
                  <span className="ml-2 text-[0.9rem] text-[var(--color-ink-2)]">
                    {t('visitorsDivision', { division: row.touDivNm })}
                  </span>
                </li>
              ))}
            </ul>
            {/* role="note" and never hidden: the caveat is the reason this figure is
                allowed on the page at all. */}
            <p role="note" className="text-[0.9rem]">
              {contextResult.data.visitors[0]!.caveat}
            </p>
          </>
        ) : (
          <p className="blank-slot">{t('visitorsUnavailable')}</p>
        )}
      </section>

      <section aria-labelledby="download-heading" className="grid gap-3">
        <h2 id="download-heading" className="subhead">
          {t('downloadCsv')}
        </h2>
        <p>
          <a className="btn btn--filled" href={`/api/gap-report/csv?locale=${locale}`} download>
            {t('downloadCsv')}
            {/* Format and size, before the click. The bytes are the same ones the route
                returns, from the same pure function over the same rows, so the figure
                cannot drift away from the file. */}
            <span className="ml-2 font-normal text-[0.85rem]">{t('csvHint', { size: csvKb })}</span>
          </a>
        </p>
        <p className="text-[0.9rem] text-[var(--color-ink-2)]">{tc('honesty.gapScope', { count: report.fill.length })}</p>
      </section>
    </div>
  );
}

function CauseMark({ absenceKind }: { absenceKind: string | null }) {
  const mark = absenceKind === null ? '○' : absenceKind === 'intrinsic' ? '◆' : '●';
  return <span aria-hidden="true">{mark} </span>;
}

/** The most recent check date across every fact, used as the report's as-of line. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Compares as strings, which is only sound because every value is YYYY-MM-DD. The
 * shape check is the guard: a 14-digit KTO stamp sorts above every ISO date at
 * index 4, where '0' outranks '-', so one unnormalised value would make this report
 * January when a September date is present.
 */
function latestVerifiedAt(facts: ReadonlyArray<{ verifiedAt: string | null }>): string | null {
  return facts.reduce<string | null>((latest, fact) => {
    const value = fact.verifiedAt;
    if (value === null || !ISO_DATE.test(value)) return latest;
    return latest === null || value > latest ? value : latest;
  }, null);
}
