'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { REPORT_CATEGORIES } from '@/domain/types';
import type { ReportCategory } from '@/domain/types';
import { setReportHidden } from '@/app/(admin)/admin/reports/actions';

export interface AdminReport {
  id: string;
  poi_slug: string;
  category: string;
  occurred_on: string | null;
  detail: string | null;
  created_at: string;
  flagged_at: string | null;
  is_hidden: boolean;
  hidden_reason: string | null;
}

/**
 * Stable codes, not display strings. hidden_reason is a database column read back
 * months later, and storing the Korean label meant a copy edit to the message file
 * silently split one reason into two in the stored data.
 */
const REASON_CODES = ['abuse', 'false', 'duplicate', 'privacy', 'other'] as const;

/**
 * One report, with the two things an operator does: hide it, or copy it into the
 * shape a curated fact takes.
 *
 * Copying does not change any fact. It puts a JSON fragment on the clipboard with
 * capabilityCode and status left blank, so a fact can only enter the data by a
 * person filling those in and committing the file. That commit is the audit record.
 */
export function ReportRow({
  report,
  announce,
}: {
  report: AdminReport;
  announce: (message: string) => void;
}) {
  const t = useTranslations('admin');
  const tr = useTranslations('report');
  const [reason, setReason] = useState<string>(REASON_CODES[0]);
  const [busy, setBusy] = useState(false);
  const category = (REPORT_CATEGORIES as readonly string[]).includes(report.category)
    ? (report.category as ReportCategory)
    : 'other';

  const toggleHidden = async () => {
    setBusy(true);
    const result = await setReportHidden({
      id: report.id,
      hidden: !report.is_hidden,
      reason: report.is_hidden ? null : reason,
    });
    setBusy(false);
    // The timestamp is what makes a second identical action announce again.
    announce(
      result.ok
        ? `${report.is_hidden ? t('unhide') : t('hide')} · ${new Date().toLocaleTimeString()}`
        : `${t('actionFailed')} ${result.message ?? ''}`,
    );
  };

  const copyFact = async () => {
    const fragment = {
      poiSlug: report.poi_slug,
      capabilityCode: '',
      status: '',
      detail: report.detail ?? '',
      source: t('copySource', { id: report.id.slice(0, 6) }),
      checkedAt: new Date().toISOString().slice(0, 10),
    };
    await navigator.clipboard.writeText(JSON.stringify(fragment, null, 2));
    // The whole sentence, including the "paste it and commit" half that used to be
    // dropped: that instruction is the audit step this feature depends on.
    announce(`${t('copied')} (${new Date().toLocaleTimeString()})`);
  };

  return (
    <li className="card grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold">
          {report.poi_slug} · {tr(`category.${category}`)}
          {report.occurred_on ? (
            <span className="ml-2 font-normal text-[var(--color-ink-2)]">
              {tr('reportSeenOnShort', { date: report.occurred_on })}
            </span>
          ) : null}
        </p>
        <p className="flex gap-2">
          {report.flagged_at ? (
            <span className="badge badge--caution">{t('flagged')}</span>
          ) : null}
          {report.is_hidden ? (
            <span className="badge badge--unknown">{t('hidden')}</span>
          ) : null}
        </p>
      </div>

      {report.detail ? <p>{report.detail}</p> : null}

      <p className="evidence__provenance">
        {report.created_at.slice(0, 16).replace('T', ' ')}
        {report.hidden_reason ? ` · ${t('hideReason')} ${reasonLabel(report.hidden_reason, t)}` : ''}
      </p>

      <div className="flex flex-wrap items-end gap-3">
        {report.is_hidden ? null : (
          <span className="grid gap-1">
            <label htmlFor={`reason-${report.id}`} className="text-[0.85rem]">
              {t('hideReason')}
            </label>
            <select
              id={`reason-${report.id}`}
              className="field !min-h-[44px] !w-auto"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              {REASON_CODES.map((value) => (
                <option key={value} value={value}>
                  {t(`reason.${value}`)}
                </option>
              ))}
            </select>
          </span>
        )}
        <button type="button" className="btn" onClick={toggleHidden} disabled={busy}>
          {report.is_hidden ? t('unhide') : t('hide')}
        </button>
        <button type="button" className="btn" onClick={copyFact}>
          {t('copyFact')}
        </button>
      </div>

    </li>
  );
}

/**
 * Rows written before the reason column held codes still carry a Korean label, so an
 * unrecognised value is shown as it was stored rather than swallowed.
 */
function reasonLabel(stored: string, t: (key: string) => string): string {
  return (REASON_CODES as readonly string[]).includes(stored) ? t(`reason.${stored}`) : stored;
}
