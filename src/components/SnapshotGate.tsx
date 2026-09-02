import { useTranslations } from 'next-intl';
import type { SnapshotResult } from '@/lib/data';
import { RetryButton } from './RetryButton';

/**
 * "There is no data yet" and "the query failed" reach the screen as different
 * wording, because they call for different actions: the first is the state before
 * the first ingest run, the second is worth retrying.
 *
 * There is deliberately no fallback to a previous value. Showing yesterday's
 * snapshot as though it were today's is the failure this service exists to refuse.
 */
export function SnapshotProblem({
  result,
}: {
  result: Extract<SnapshotResult<unknown>, { ok: false }>;
}) {
  const t = useTranslations('common.error');
  const tc = useTranslations('common');
  const missing = result.kind === 'missing';

  // h1, not h2. Eight pages return this instead of their own content, and a page
  // whose only heading is an h2 has no top-level heading at all.
  return (
    <section className="callout callout--caution" role="status">
      <h1>{missing ? t('noSnapshotTitle') : t('loadFailedTitle')}</h1>
      <p className="mt-2">{missing ? t('noSnapshotBody') : t('loadFailedBody')}</p>
      {/* Which snapshot, and nothing else. result.message can carry a Postgres error
          or a Zod issue naming a table, a column or a policy, and this page is public. */}
      <p className="evidence__provenance mt-3">{result.message.split(':')[0]}</p>
      {missing ? null : (
        <p className="mt-3">
          <RetryButton label={tc('retry')} />
        </p>
      )}
    </section>
  );
}
