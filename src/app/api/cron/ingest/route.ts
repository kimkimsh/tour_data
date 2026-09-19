import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { runIngest } from '../../../../../scripts/ingest';

/**
 * The nightly collection, run from Seoul.
 *
 * It lived in GitHub Actions and failed about half the time: UND_ERR_CONNECT_TIMEOUT
 * against apis.data.go.kr:443, all-or-nothing per run, so the wall was bound to the
 * runner's source address rather than to a passing outage. Retrying inside a run
 * redials the same wall. Measured from this region instead, thirteen probes in a row
 * answered in 27–54ms. The deployment already runs in icn1 (vercel.json), so moving
 * the schedule here is what removes the cause rather than drawing again from the same
 * pool of addresses.
 *
 * Nothing is written to disk. A function's filesystem is read-only outside /tmp, and
 * nothing reads content/generated after a run anyway — the stages hand their payloads
 * to each other in memory now, and the screens read Supabase. The committed fixtures
 * are refreshed by the workflow this replaced, which still runs on request.
 *
 * 300 seconds is the ceiling on this plan and cannot be raised. The observed run is
 * 116 seconds. If it ever approaches the ceiling the stages split cleanly — `stages`
 * takes a subset, and the plan allows a hundred cron jobs.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse('not configured', { status: 503 });

  /*
    Vercel sends `authorization: Bearer $CRON_SECRET` on a cron invocation, and the
    path is public otherwise. Compared without an early return on length so a wrong
    secret cannot be found a byte at a time — the same shape as /api/revalidate.
  */
  const header = request.headers.get('authorization') ?? '';
  if (!safeEqual(header, `Bearer ${secret}`)) {
    return new NextResponse('forbidden', { status: 403 });
  }

  const started = Date.now();
  try {
    await runIngest({
      contentRoot: process.cwd(),
      writeFiles: false,
      // This process is the cache. Posting to /api/revalidate would be the deployment
      // asking itself over the network, and NEXT_PUBLIC_SITE_URL is deliberately not
      // set here (docs/guide — Vercel never needed it).
      revalidateOverHttp: false,
    });
    revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true, seconds: Math.round((Date.now() - started) / 1000) });
  } catch (cause) {
    // The message, and a 500 so the cron is recorded as failed. Nothing partial is
    // published: every stage checks the gateway was reachable before it writes.
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error(`cron ingest failed after ${Math.round((Date.now() - started) / 1000)}s — ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** Length-independent comparison, so a wrong secret cannot be found byte by byte. */
function safeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
