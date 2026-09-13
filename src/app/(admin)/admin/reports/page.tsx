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

type View = 'all' | 'flagged' | 'unflagged' | 'hidden';
type Sort = 'flagged' | 'recent';

/**
 * One screenful, and a way to the next one.
 *
 * The screen used to take 200 rows with no paging and order flagged first, so a
 * caller who flagged enough reports pushed every unflagged one off the end and the
 * operator stopped seeing new ones. Flagging is one anonymous session away — the
 * same session the report form creates — so there is no version of "only a real
 * person can flag" to rely on. Paging is what makes the flood survivable: the rows
 * move down the list instead of out of it. The unflagged view is the other half,
 * and it is the view to open when the flagged set is being used as a weapon.
 */
const PAGE_SIZE = 50;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; sort?: string; page?: string }>;
}) {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: 'admin' });
  const { view: rawView, sort: rawSort, page: rawPage } = await searchParams;
  const view: View =
    rawView === 'flagged' || rawView === 'hidden' || rawView === 'unflagged' ? rawView : 'all';
  const sort: Sort = rawSort === 'recent' ? 'recent' : 'flagged';
  const page = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1);

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
  // answer "you are not an administrator". An error is not that answer, and telling
  // a real operator they are not one during a database wobble sends them looking for
  // a permission problem that does not exist.
  const { data: membership, error: membershipError } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (membershipError) {
    console.error(`admin membership lookup failed: ${membershipError.message}`);
    return (
      <div className="grid gap-4">
        <h1>{t('title')}</h1>
        <p className="blank-slot">{t('lookupFailed')}</p>
      </div>
    );
  }

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
    .select('id, poi_slug, category, occurred_on, detail, created_at, flagged_at, is_hidden, hidden_reason', {
      count: 'exact',
    });

  if (view === 'flagged') query = query.not('flagged_at', 'is', null);
  if (view === 'unflagged') query = query.is('flagged_at', null);
  if (view === 'hidden') query = query.eq('is_hidden', true);

  // One row past the page, so "there is more" is an observation rather than a guess
  // from a count that another writer may have changed since.
  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await (sort === 'flagged'
    ? query.order('flagged_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
    : query.order('created_at', { ascending: false })
  ).range(from, from + PAGE_SIZE);

  if (error) {
    // Logged, not rendered. The message names the table, the column and the policy,
    // and this screen is reachable by anyone who can mint a session.
    console.error(`admin reports query failed: ${error.message}`);
    return (
      <div className="grid gap-4">
        <h1>{t('title')}</h1>
        <p className="blank-slot">{t('lookupFailed')}</p>
      </div>
    );
  }

  const fetched = (data ?? []) as AdminReport[];
  const hasNext = fetched.length > PAGE_SIZE;
  const reports = hasNext ? fetched.slice(0, PAGE_SIZE) : fetched;
  const hiddenCount = reports.filter((row) => row.is_hidden).length;
  const flaggedCount = reports.filter((row) => row.flagged_at !== null).length;

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1>{t('title')}</h1>
        <p className="tabular text-[0.95rem] text-[var(--color-ink-2)]">
          {t('counts', { total: count ?? reports.length, hidden: hiddenCount, flagged: flaggedCount })}
          {' · '}
          {t('page', { page })}
        </p>
      </header>

      {/* Links, not a client-side filter: the view is part of the address, so an
          operator can bookmark the one they use and reload without losing it. */}
      <nav aria-label={`${t('view')} · ${t('sort')}`} className="grid gap-2">
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="font-bold">{t('view')}</span>
          <Link href="/admin/reports?view=all">{t('viewAll')}</Link>
          <Link href="/admin/reports?view=flagged">{t('viewFlagged')}</Link>
          <Link href="/admin/reports?view=unflagged">{t('viewUnflagged')}</Link>
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

      <nav aria-label={t('pagination')} className="flex flex-wrap gap-4">
        {page > 1 ? (
          <Link href={`/admin/reports?view=${view}&sort=${sort}&page=${page - 1}`}>
            {t('prevPage')}
          </Link>
        ) : null}
        {hasNext ? (
          <Link href={`/admin/reports?view=${view}&sort=${sort}&page=${page + 1}`}>
            {t('nextPage')}
          </Link>
        ) : null}
      </nav>

      <p className="text-[0.9rem] text-[var(--color-ink-2)]">{t('copyHint')}</p>
    </div>
  );
}
