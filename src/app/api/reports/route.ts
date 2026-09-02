import { NextResponse } from 'next/server';
import { REPORT_CATEGORIES } from '@/domain/types';
import { getPublicDb, isSupabaseConfigured } from '@/lib/supabase/public';

/**
 * Visitor reports for one place, newest first.
 *
 * Fetched from the browser rather than rendered into the page, because the place
 * page is cached for an hour and a report has to appear the moment it is posted
 * (docs/spec/02_stack.md section 5). Hidden rows are excluded by RLS, not here.
 *
 * flagged_at is deliberately not selected, and the anon role has no privilege to
 * select it either — this route's discretion alone was unenforced, because PostgREST
 * publishes the table and a caller could just ask for the column. The column list
 * below and the anon grant in 002_reports.sql are the same list; if one grows, the
 * other has to.
 *
 * /api/report/flag returns an empty body so a caller cannot learn whether a report
 * was already flagged, and handing the same timestamp to every visitor here would
 * give it away.
 */
export const dynamic = 'force-dynamic';

const MAX_ROWS = 50;

export async function GET(request: Request) {
  const poiSlug = new URL(request.url).searchParams.get('poi');
  if (!poiSlug) return NextResponse.json({ error: 'poi is required' }, { status: 400 });

  if (!isSupabaseConfigured()) {
    // Not an error: the screen renders its empty state and says why.
    return NextResponse.json({ available: false, reports: [] });
  }

  const { data, error } = await getPublicDb()
    .from('barrier_reports')
    .select('id, poi_slug, category, occurred_on, detail, created_at')
    .eq('poi_slug', poiSlug)
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS);

  if (error) {
    // Logged, not returned: the message names the table, the column and the policy.
    console.error(`reports query failed: ${error.message}`);
    return NextResponse.json({ error: 'failed' }, { status: 502 });
  }

  return NextResponse.json({
    available: true,
    reports: (data ?? []).filter((row) =>
      (REPORT_CATEGORIES as readonly string[]).includes(row.category as string),
    ),
  });
}
