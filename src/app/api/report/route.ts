import { NextResponse } from 'next/server';
import { z } from 'zod';
import { REPORT_CATEGORIES } from '@/domain/types';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';

/**
 * Posts one visitor report. It becomes visible immediately — there is no review
 * queue (docs/spec/01_scope.md section 4.4 (4)).
 *
 * The caller must already hold an anonymous session; the browser creates one with
 * signInAnonymously() before posting, and the cookie travels with this request.
 * The row is written as that user, so the insert policy checks it belongs to them.
 */
export const dynamic = 'force-dynamic';

const DETAIL_MAX = 500;

const Body = z.object({
  poiSlug: z.string().min(1),
  category: z.enum(REPORT_CATEGORIES),
  occurredOn: z.iso.date().nullable(),
  detail: z.string().max(DETAIL_MAX).nullable(),
  consent: z.literal(true),
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', detail: z.prettifyError(parsed.error) }, { status: 400 });
  }

  const supabase = await createServerClient();
  // getUser(), not getSession(): a session read trusts the cookie without verifying it.
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'no_session' }, { status: 401 });

  // No .select() here, and not by omission: destructuring only { error } makes
  // supabase-js send Prefer: return=minimal, so PostgREST emits no RETURNING. A bare
  // .select() would ask for the whole row and be refused on reporter_id, which
  // authenticated may write but not read. .select('id') is the form that works.
  const { error } = await supabase.from('barrier_reports').insert({
    reporter_id: auth.user.id,
    poi_slug: parsed.data.poiSlug,
    category: parsed.data.category,
    occurred_on: parsed.data.occurredOn,
    detail: parsed.data.detail,
  });

  if (error) {
    // 23505 is the unique index on (reporter, place, category, created_day). There is
    // no select-then-insert check before this and there should not be: it loses the
    // race when two requests from the same reporter arrive together, and the index
    // does not. The 409 is what the form turns into a sentence.
    if (error.code === '23505') return NextResponse.json({ error: 'duplicate' }, { status: 409 });
    // error.message is not returned. It is a Postgres string naming the table, the
    // column and the constraint, and the form has nothing to do with it.
    console.error(`report insert failed: ${error.message}`);
    return NextResponse.json({ error: 'failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
