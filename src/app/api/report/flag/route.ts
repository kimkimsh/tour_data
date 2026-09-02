import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPublicDb, isSupabaseConfigured } from '@/lib/supabase/public';

/**
 * Marks one report as flagged. The RPC writes a first-flag timestamp and does
 * nothing on any later call, so there is no count for an anonymous caller to
 * inflate and no way to reorder what the operator reads.
 *
 * It returns nothing on purpose: the caller cannot learn whether the report was
 * already flagged, and does not need to.
 */
export const dynamic = 'force-dynamic';

const Body = z.object({ id: z.uuid() });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const { error } = await getPublicDb().rpc('flag_report', { target: parsed.data.id });
  if (error) return NextResponse.json({ error: 'failed' }, { status: 502 });

  return NextResponse.json({ ok: true });
}
