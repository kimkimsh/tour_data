import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getContext, getFacts, getPois } from '@/lib/data';
import { absenceLabel, computeGapReport, gapRowsToCsv, statusLabel } from '@/domain/gap';
import type { GapFact } from '@/domain/gap';
import { SnapshotProblem } from '@/components/SnapshotGate';
import type { ContentLocale, Locale } from '@/domain/types';
import { capabilityLabel } from '@/components/place/place-view';

export const revalidate = 3600;

/**
 * How many rows each place gets on screen. The CSV carries all of them.
 *
 * A flat "top 40" stopped working the moment the catalogue grew past six places: the
 * places with the least data filled the whole table with their own blanks, three of
 * them took thirty-three rows between them, and the places an officer has actually
 * been working on dropped off the screen. Everything at the top of that list scores
 * the same 1.00 anyway — critical somewhere, unknown, no cause recorded — so the order
 * inside it was never carrying information. Each place's own worst three is.
 */
const PRIORITY_ROWS_PER_PLACE = 3;

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
  const shownPriorities = topPerPlace(report.priorities, PRIORITY_ROWS_PER_PLACE);
  const csvKb = Math.max(
    1,
    Math.round(
      new TextEncoder().encode(gapRowsToCsv(report.priorities, titles, localeKey)).length / 1024,
    ),
  );

  return (
    <div className="grid gap-10">
      <header className="grid gap-2">
        <h1>{t('title')}</h1>
        <p className="t-sm text-[var(--color-ink-2)]">
          {t('asOf', { date: asOf, places: report.fill.length })}
        </p>
      </header>

      <section aria-labelledby="fill-heading" className="grid gap-3">
        {/* Its own heading. Both section headings used to be column-header strings, so
            the table of filled items was titled "항목 수" — the name of its last column. */}
        <h2 id="fill-heading">{t('fillSectionTitle')}</h2>
        <div className="scroll-x" tabIndex={0} role="region" aria-label={t('fillSectionTitle')}>
          <table className="data-table">
            <caption>{t('fillCaption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('fillHeader.place')}</th>
                {/* The heading of a number column sits over its numbers. Left-aligned
                    headings above right-aligned figures put 「한국관광공사 확인」 250px
                    from the digit it counts, and the pair stopped reading as one
                    column. */}
                <th scope="col" className="tabular">
                  {t('fillHeader.kto')}
                </th>
                <th scope="col" className="tabular">
                  {t('fillHeader.curated')}
                </th>
                <th scope="col" className="tabular">
                  {t('fillHeader.unknown')}
                </th>
                <th scope="col" className="tabular">
                  {t('fillHeader.total')}
                </th>
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
        <p className="max-w-[var(--container-prose)] t-sm text-[var(--color-ink-2)]">
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
        <h2 id="priority-heading">{t('prioritySectionTitle')}</h2>
        {report.priorities.length === 0 ? (
          <p className="blank-slot">{t('empty')}</p>
        ) : (
          <div className="scroll-x" tabIndex={0} role="region" aria-label={t('prioritySectionTitle')}>
            <table className="data-table">
              <caption>{t('priorityCaption')}</caption>
              <thead>
                <tr>
                  {/* No rank column. Sequential numbers down a column of identical
                      priorities asserted an order the priority itself denies, and
                      repeating the tied rank instead gave forty rows all headed "1",
                      which labels nothing. The table is sorted, the priority is shown,
                      and the place is what an officer refers to. */}
                  <th scope="col">{t('priorityHeader.place')}</th>
                  <th scope="col">{t('priorityHeader.capability')}</th>
                  {/* "Status", not a status value. This read `tc('status.unknown')`
                      because priorityHeader had no status key, so a screen reader
                      announced each cell as "Unknown, No information". */}
                  <th scope="col">{t('priorityHeader.status')}</th>
                  <th scope="col">{t('priorityHeader.cause')}</th>
                  <th scope="col" className="tabular">
                    {t('priorityHeader.priority')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {shownPriorities.map((row) => (
                  <tr key={`${row.poiSlug}-${row.capabilityCode}`}>
                    <th scope="row">{titles[row.poiSlug] ?? row.poiSlug}</th>
                    <td>{capabilityLabel(row.capabilityCode, localeKey)}</td>
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
        {/* Said out loud. The table showed the first 40 of 80 with nothing on screen to
            say so, while the CSV button beside it carried all of them. */}
        {report.priorities.length > shownPriorities.length ? (
          <p className="t-sm text-[var(--color-ink-2)]">
            {t('priorityShown', {
              perPlace: PRIORITY_ROWS_PER_PLACE,
              shown: shownPriorities.length,
              total: report.priorities.length,
            })}
          </p>
        ) : null}

        <div className="card">
          <h3 className="subhead">{t('causeLegendTitle')}</h3>
          <ul className="mt-2 grid gap-1 t-sm">
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
          <p className="mt-3 t-sm text-[var(--color-ink-2)]">{t('causeNote')}</p>
        </div>
      </section>

      <section aria-labelledby="visitors-heading" className="grid gap-2">
        <h2 id="visitors-heading" className="subhead">
          {t('visitorsTitle')}
        </h2>
        {contextResult.ok && contextResult.data.visitors.length > 0 ? (
          <>
            <p className="t-sm">
              {t('visitorsWindow', {
                start: isoDate(contextResult.data.visitors[0]!.windowStart),
                end: isoDate(contextResult.data.visitors[0]!.windowEnd),
              })}
            </p>
            <ul className="grid gap-1">
              {contextResult.data.visitors.map((row) => (
                <li key={`${row.signguCd5}-${row.touDivCd}`} className="tabular">
                  {t('visitorsValue', {
                    place: cityName(row.signguCd5, row.signguNm, pois.data, localeKey),
                    // Rounded to a whole person. A daily average printed as
                    // "79,241.3명" says nothing the integer does not, and reads as a
                    // precision the underlying figure does not carry.
                    value: Math.round(row.dailyAverage).toLocaleString(locale),
                  })}{' '}
                  <span className="t-sm text-[var(--color-ink-2)]">
                    {t('visitorsDivision', { division: divisionName(row.touDivCd, row.touDivNm, localeKey) })}
                  </span>
                </li>
              ))}
            </ul>
            <p className="t-sm text-[var(--color-ink-2)]">{t('visitorsDelay')}</p>
            {/* role="note" and never hidden: the caveat is the reason this figure is
                allowed on the page at all. The Korean literal is frozen by a Zod
                z.literal in the snapshot schema, so the English page gets the message
                file's translation of the same sentence rather than Korean it cannot
                read. */}
            <p role="note" className="t-sm" lang={localeKey}>
              {localeKey === 'ko'
                ? contextResult.data.visitors[0]!.caveat
                : tc('honesty.visitors')}
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
            <span className="ml-2 font-normal t-xs">{t('csvHint', { size: csvKb })}</span>
          </a>
        </p>
        <p className="t-sm text-[var(--color-ink-2)]">{tc('honesty.gapScope', { count: report.fill.length })}</p>
      </section>
    </div>
  );
}

/**
 * The first `perPlace` rows of each place, in the order computeGapReport already put
 * them. That order is global, so taking the head of each place's slice keeps every
 * place's own ranking while giving each of them the same amount of the screen.
 */
function topPerPlace<T extends { poiSlug: string }>(rows: readonly T[], perPlace: number): T[] {
  const taken = new Map<string, number>();
  const out: T[] = [];
  for (const row of rows) {
    const count = taken.get(row.poiSlug) ?? 0;
    if (count >= perPlace) continue;
    taken.set(row.poiSlug, count + 1);
    out.push(row);
  }
  return out;
}

function CauseMark({ absenceKind }: { absenceKind: string | null }) {
  const mark = absenceKind === null ? '○' : absenceKind === 'intrinsic' ? '◆' : '●';
  return <span aria-hidden="true">{mark} </span>;
}

/** The most recent check date across every fact, used as the report's as-of line. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const KTO_COMPACT_DATE = /^(\d{4})(\d{2})(\d{2})$/;

/**
 * The visitor rows name their city and their visitor class in Korean only — they are
 * DataLab response fields, not interface text — so the English page printed
 * "공주시 — 79,241 visitors Basis: 외지인(b)". The city is already in the catalogue in
 * both languages; the class is a documented code, and its name comes from the code
 * rather than from the response string, whose "(b)" is an internal marker.
 */
function cityName(
  signguCd5: string,
  fallback: string,
  pois: ReadonlyArray<{ signguCd5: string; cityKo: string; cityEn: string }>,
  locale: Locale,
): string {
  const poi = pois.find((p) => p.signguCd5 === signguCd5);
  if (!poi) return fallback;
  return locale === 'en' ? poi.cityEn : poi.cityKo;
}

/** DataLab touDivCd. 1 resident, 2 domestic visitor from elsewhere, 3 from abroad. */
const VISITOR_DIVISION: Record<string, { ko: string; en: string }> = {
  '1': { ko: '현지인', en: 'local residents' },
  '2': { ko: '외지인', en: 'domestic visitors from elsewhere' },
  '3': { ko: '외국인', en: 'visitors from abroad' },
};

function divisionName(touDivCd: string, fallback: string, locale: Locale): string {
  const entry = VISITOR_DIVISION[touDivCd];
  if (!entry) return fallback;
  return locale === 'en' ? entry.en : entry.ko;
}

/**
 * The visitor window comes back in the KTO parameter format, YYYYMMDD, which is a
 * machine argument and not a date anybody reads. Anything else is printed as it
 * arrived rather than reformatted into a shape it may not have.
 */
function isoDate(value: string): string {
  const match = KTO_COMPACT_DATE.exec(value);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : value;
}

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
