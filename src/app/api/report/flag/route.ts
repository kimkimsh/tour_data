import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/supabase/public';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Marks one report as flagged. The RPC writes a first-flag timestamp and does
 * nothing on any later call, so there is no count for a caller to inflate.
 *
 * It returns nothing on purpose: the caller cannot learn whether the report was
 * already flagged, and does not need to.
 *
 * Session-aware client, not the cookie-free one: flag_report is granted to
 * `authenticated` only, so the anonymous session's token has to travel with the call.
 * A caller with no session gets 401 here rather than a Postgres permission error.
 */
export const dynamic = 'force-dynamic';

const Body = z.object({ id: z.uuid() });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const supabase = await createServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'no_session' }, { status: 401 });

  const { error } = await supabase.rpc('flag_report', { target: parsed.data.id });
  if (error) {
    // Logged, not returned: the message names the function and the role.
    console.error(`flag_report failed: ${error.message}`);
    return NextResponse.json({ error: 'failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
