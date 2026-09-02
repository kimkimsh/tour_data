'use client';

import { useState } from 'react';
import { LiveRegion } from '@/components/a11y/LiveRegion';
import { ReportRow, type AdminReport } from './ReportRow';

/**
 * Owns the one announcement region for the whole list.
 *
 * The rows carry no region of their own. The query returns up to 200 of them, and 200
 * polite regions queue against each other — a screen reader works through the backlog
 * one message at a time, so the operator hears the result of an action they took
 * several actions ago.
 */
export function ReportList({ reports }: { reports: ReadonlyArray<AdminReport> }) {
  const [announcement, setAnnouncement] = useState('');

  return (
    <>
      <LiveRegion message={announcement} />
      <ul className="grid gap-4">
        {reports.map((report) => (
          <ReportRow key={report.id} report={report} announce={setAnnouncement} />
        ))}
      </ul>
    </>
  );
}
