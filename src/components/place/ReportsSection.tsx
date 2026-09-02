'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Eyebrow } from '@/components/Eyebrow';
import { LiveRegion } from '@/components/a11y/LiveRegion';
import type { ReportCategory } from '@/domain/types';

interface ReportRow {
  id: string;
  category: ReportCategory;
  occurred_on: string | null;
  detail: string | null;
  created_at: string;
}

/**
 * What visitors said, kept visually apart from what we checked.
 *
 * Fetched in the browser: the place page is cached for an hour, and a report has to
 * appear the moment it is posted. It is also the reason this block is a separate
 * component rather than part of the cached server render.
 */
export function ReportsSection({ poiSlug }: { poiSlug: string }) {
  const t = useTranslations('place');
  const tr = useTranslations('report');
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reports?poi=${encodeURIComponent(poiSlug)}`)
      .then((response) => response.json())
      .then((body: { available?: boolean; reports?: ReportRow[] }) => {
        if (cancelled) return;
        setAvailable(body.available !== false);
        setReports(body.reports ?? []);
      })
      .catch(() => {
        if (!cancelled) setReports([]);
      });
    return () => {
      cancelled = true;
    };
  }, [poiSlug]);

  const flag = async (id: string) => {
    await fetch('/api/report/flag', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    // The text has to change for the region to announce again on a second flag.
    setAnnouncement(`${t('reportFlagged')} (${new Date().toLocaleTimeString()})`);
  };

  return (
    <section
      id="visitor-reports"
      aria-labelledby="reports-heading"
      className="grid gap-4 rounded border-2 border-dashed border-[var(--color-rule-strong)] p-5"
    >
      <Eyebrow as="h2" id="reports-heading">{t('eyebrowReports')}</Eyebrow>

      {/* Separated from the checked facts by border, ground and wording. Mixing the
          two would cost both of them their credibility. */}
      <p className="text-[0.95rem]">{t('reportsDisclaimer')}</p>

      {/* One region for the whole section, mounted outside the branch below so it
          survives the swap. Its text used to be an ellipsis, which announces nothing,
          and a second region lower down queued against this one. A flag the visitor
          just pressed outranks a background load. */}
      <LiveRegion
        message={
          announcement ||
          (reports === null ? t('reportsLoading') : t('reportsReady', { count: reports.length }))
        }
      />

      {reports === null ? (
        <p>{t('reportsLoading')}</p>
      ) : reports.length === 0 ? (
        <p className="blank-slot">{available ? t('reportsEmpty') : tr('error.unavailable')}</p>
      ) : (
        <ul className="grid gap-3">
          {reports.map((report) => (
            <li key={report.id} className="border-t border-[var(--color-rule)] pt-3">
              {/* No per-category glyph. Two of the eight shared one emoji, so the mark
                  distinguished nothing, and 🛗 is Emoji 13.0 — it renders as a blank box
                  on exactly the older devices this service is built for. The category
                  name sits right here in text. */}
              <p className="font-bold">
                {tr(`category.${report.category}`)}
                {report.occurred_on ? (
                  <span className="ml-2 font-normal text-[var(--color-ink-2)]">
                    {t('reportSeenOn', { date: report.occurred_on })}
                  </span>
                ) : null}
              </p>
              {report.detail ? <p className="mt-1">{report.detail}</p> : null}
              <p className="mt-1 flex flex-wrap items-center gap-3">
                <span className="evidence__provenance">
                  {t('reportPostedOn', { date: report.created_at.slice(0, 10) })}
                </span>
                {/* The visible word is the same on every row, so the name carries the
                    category and date: a list of identical "신고" links is unusable from
                    a screen reader's link list. */}
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center px-2 text-[0.88rem] underline"
                  aria-label={`${t('reportFlag')} — ${tr(`category.${report.category}`)}, ${report.created_at.slice(0, 10)}`}
                  onClick={() => flag(report.id)}
                >
                  {t('reportFlag')}
                </button>
              </p>
            </li>
          ))}
        </ul>
      )}

      <p>
        <Link href={`/report?poi=${poiSlug}`} className="btn">
          {tr('title')}
        </Link>
      </p>
    </section>
  );
}
