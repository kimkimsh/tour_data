import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { AdminSignIn } from '@/components/admin/AdminSignIn';
import { ReportList } from '@/components/admin/ReportList';
import type { AdminReport } from '@/components/admin/ReportRow';
import { Eyebrow } from '@/components/Eyebrow';

/**
 * The operator's one screen: hide what should not be public, and pick out what is
 * worth turning into a fact.
 *
 * Never cached and never prerendered — it reads a session cookie and shows rows a
 * visitor may not see.
 */
export const dynamic = 'force-dynamic';

/** Pinned: this screen sits outside the localised tree and has one operator. */
const ADMIN_LOCALE = 'ko';

type View = 'all' | 'flagged' | 'hidden';
type Sort = 'flagged' | 'recent';

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; sort?: string }>;
}) {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: 'admin' });
  const { view: rawView, sort: rawSort } = await searchParams;
  const view: View = rawView === 'flagged' || rawView === 'hidden' ? rawView : 'all';
  const sort: Sort = rawSort === 'recent' ? 'recent' : 'flagged';

  if (!isSupabaseConfigured()) {
    return (
      <div className="grid gap-4">
        <h1>{t('title')}</h1>
        <p className="blank-slot">{t('unavailable')}</p>
      </div>
    );
  }

  const supabase = await createServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return (
      <div className="grid gap-5">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1>{t('signIn')}</h1>
        <p className="text-[0.95rem] text-[var(--color-ink-2)]">{t('signInHint')}</p>
        <AdminSignIn deniedMessage={null} />
      </div>
    );
  }

  // The membership row is readable only by its owner, so an empty result is the
  // answer "you are not an administrator" rather than an error.
  const { data: membership } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (!membership) {
    return (
      <div className="grid gap-5">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1>{t('signIn')}</h1>
        <AdminSignIn deniedMessage={t('denied')} />
      </div>
    );
  }

  let query = supabase
    .from('barrier_reports')
    .select('id, poi_slug, category, occurred_on, detail, created_at, flagged_at, is_hidden, hidden_reason');

  if (view === 'flagged') query = query.not('flagged_at', 'is', null);
  if (view === 'hidden') query = query.eq('is_hidden', true);

  const { data, error } = await (sort === 'flagged'
    ? query.order('flagged_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
    : query.order('created_at', { ascending: false })
  ).limit(200);

  if (error) {
    return (
      <div className="grid gap-4">
        <h1>{t('title')}</h1>
        <p className="blank-slot">{error.message}</p>
      </div>
    );
  }

  const reports = (data ?? []) as AdminReport[];
  const hiddenCount = reports.filter((row) => row.is_hidden).length;
  const flaggedCount = reports.filter((row) => row.flagged_at !== null).length;

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1>{t('title')}</h1>
        <p className="tabular text-[0.95rem] text-[var(--color-ink-2)]">
          {t('counts', { total: reports.length, hidden: hiddenCount, flagged: flaggedCount })}
        </p>
      </header>

      {/* Links, not a client-side filter: the view is part of the address, so an
          operator can bookmark the one they use and reload without losing it. */}
      <nav aria-label={`${t('view')} · ${t('sort')}`} className="grid gap-2">
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="font-bold">{t('view')}</span>
          <Link href="/admin/reports?view=all">{t('viewAll')}</Link>
          <Link href="/admin/reports?view=flagged">{t('viewFlagged')}</Link>
          <Link href="/admin/reports?view=hidden">{t('viewHidden')}</Link>
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="font-bold">{t('sort')}</span>
          <Link href={`/admin/reports?view=${view}&sort=flagged`}>{t('sortFlagged')}</Link>
          <Link href={`/admin/reports?view=${view}&sort=recent`}>{t('sortRecent')}</Link>
        </p>
      </nav>

      {reports.length === 0 ? (
        <p className="blank-slot">{t('empty')}</p>
      ) : (
        <ReportList reports={reports} />
      )}

      <p className="text-[0.9rem] text-[var(--color-ink-2)]">{t('copyHint')}</p>
    </div>
  );
}
