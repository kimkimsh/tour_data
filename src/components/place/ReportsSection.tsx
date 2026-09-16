'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LiveRegion } from '@/components/a11y/LiveRegion';
import { useAnnouncer } from '@/components/a11y/useAnnouncer';
import { createBrowserClient } from '@/lib/supabase/browser';
import type { ReportCategory } from '@/domain/types';

/**
 * created_at is a timestamptz, which PostgREST serialises as UTC. Slicing the string
 * printed that UTC calendar day, so a report filed at 07:00 KST was dated the day
 * before. Every date this service shows is the Korean calendar date.
 */
const SEOUL_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' });

function seoulDate(timestamp: string): string {
  return SEOUL_DATE.format(new Date(timestamp));
}

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
/**
 * Four states, not two. An empty list is a claim — "nobody has reported a barrier
 * here" — and a lookup that failed has no right to make it. Collapsing the two is
 * the same error this service refuses everywhere else: an absence of data read as
 * an absence of the thing.
 */
type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; reports: ReportRow[] }
  | { kind: 'unavailable' }
  | { kind: 'failed' };

export function ReportsSection({ poiSlug }: { poiSlug: string }) {
  const t = useTranslations('place');
  const tr = useTranslations('report');
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const { announcement, announce } = useAnnouncer();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reports?poi=${encodeURIComponent(poiSlug)}`)
      .then(async (response) => {
        if (cancelled) return;
        // A non-2xx body carries { error }, never a report list. Reading `reports`
        // off it would turn a 502 into "no reports".
        if (!response.ok) {
          setState({ kind: 'failed' });
          return;
        }
        const body = (await response.json()) as { available?: boolean; reports?: ReportRow[] };
        if (cancelled) return;
        if (body.available === false) setState({ kind: 'unavailable' });
        else if (Array.isArray(body.reports)) setState({ kind: 'ready', reports: body.reports });
        else setState({ kind: 'failed' });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [poiSlug]);

  const reports = state.kind === 'ready' ? state.reports : null;

  /**
   * The session is created here rather than at page load, the same way the report form
   * does it: an anonymous user row should exist because somebody chose to act, not
   * because somebody opened a page. flag_report is granted to `authenticated` only, so
   * without this the route answers 401.
   */
  const flag = async (id: string) => {
    try {
      const supabase = createBrowserClient();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          announce(t('reportFlagFailed'));
          return;
        }
      }

      const response = await fetch('/api/report/flag', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      announce(response.ok ? t('reportFlagged') : t('reportFlagFailed'));
    } catch {
      // fetch rejects rather than resolving when the network is gone, and getSession
      // rejects the same way. Without this the handler rejected unhandled: nothing was
      // announced and the button looked inert.
      announce(t('reportFlagFailed'));
    }
  };

  return (
    <section
      id="visitor-reports"
      aria-labelledby="reports-heading"
      className="grid gap-4 rounded border-2 border-dashed border-[var(--color-rule-strong)] p-5"
    >
      <h2 id="reports-heading" className="section-head">{t('headingReports')}</h2>

      {/* Separated from the checked facts by border, ground and wording. Mixing the
          two would cost both of them their credibility. */}
      <p className="t-sm">{t('reportsDisclaimer')}</p>

      {/* One region for the whole section, mounted outside the branch below so it
          survives the swap. Its text used to be an ellipsis, which announces nothing,
          and a second region lower down queued against this one. A flag the visitor
          just pressed outranks a background load. */}
      <LiveRegion
        message={
          announcement ||
          (state.kind === 'loading'
            ? t('reportsLoading')
            : state.kind === 'ready'
              ? t('reportsReady', { count: state.reports.length })
              : state.kind === 'unavailable'
                ? tr('error.unavailable')
                : t('reportsFailed'))
        }
      />

      {state.kind === 'loading' ? (
        <p>{t('reportsLoading')}</p>
      ) : state.kind === 'unavailable' ? (
        <p className="blank-slot">{tr('error.unavailable')}</p>
      ) : state.kind === 'failed' ? (
        <p className="blank-slot">{t('reportsFailed')}</p>
      ) : reports === null || reports.length === 0 ? (
        <p className="blank-slot">{t('reportsEmpty')}</p>
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
                  <>
                    {/* A literal space, not only a margin. Adjacent elements with no
                        whitespace between them are one word to a screen reader. */}{' '}
                    <span className="ml-1 font-normal text-[var(--color-ink-2)]">
                      {t('reportSeenOn', { date: report.occurred_on })}
                    </span>
                  </>
                ) : null}
              </p>
              {report.detail ? <p className="mt-1">{report.detail}</p> : null}
              <p className="mt-1 flex flex-wrap items-center gap-3">
                <span className="evidence__provenance">
                  {t('reportPostedOn', { date: seoulDate(report.created_at) })}
                </span>
                {/* The visible word is the same on every row, so the name carries the
                    category and date: a list of identical "신고" links is unusable from
                    a screen reader's link list. */}
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center px-2 t-xs underline"
                  aria-label={`${t('reportFlag')} — ${tr(`category.${report.category}`)}, ${seoulDate(report.created_at)}`}
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
