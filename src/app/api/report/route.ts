import { NextResponse } from 'next/server';
import { z } from 'zod';
import { REPORT_CATEGORIES } from '@/domain/types';
import { POI_SLUGS } from '@/lib/content';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { seoulToday } from '@/domain/today';

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

/**
 * How far back a sighting may be dated. A year: 현장 상황 제보 is about a condition
 * somebody could still meet, and the screen prints the date next to the report, so an
 * older one reads as current unless a reader checks it.
 */
const REPORT_MAX_AGE_DAYS = 365;

/**
 * Evaluated per request, not once at module load: this process outlives a day, and a
 * bound frozen at boot drifts a little further from the calendar every hour it runs.
 */
function sightingIsPlausible(value: string): boolean {
  const today = seoulToday();
  const oldest = new Date(Date.parse(`${today}T00:00:00Z`) - REPORT_MAX_AGE_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return value <= today && value >= oldest;
}

const Body = z.object({
  // The slug is not free text. It is half of the unique index that enforces one
  // report per person per place per day, so any string the caller invents is a fresh
  // key and the daily limit stops applying at all.
  poiSlug: z.string().refine((slug) => POI_SLUGS.has(slug), { message: 'unknown place' }),
  category: z.enum(REPORT_CATEGORIES),
  // Bounded, not just well-formed. z.iso.date() accepts 2099-01-01, and the place page
  // prints occurred_on verbatim — "2099-01-01 목격" published as a sighting, on a
  // service whose entire claim is that it does not state what it has not checked. A
  // mistyped year on a mobile date picker is one keystroke away.
  occurredOn: z.iso
    .date()
    .refine(sightingIsPlausible, {
      message: 'occurredOn must be within the last year and not in the future',
    })
    .nullable(),
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
