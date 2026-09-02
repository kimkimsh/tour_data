import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { LOCALES } from '@/domain/types';

/**
 * Called by scripts/ingest.ts when a run finishes, so a new snapshot reaches the
 * screens in seconds without a redeploy.
 *
 * A shared secret rather than a signed body: the worst this endpoint can do when
 * called by a stranger is drop a cache entry, and the request-timing comparison
 * below is the part that actually matters.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return new NextResponse('not configured', { status: 503 });

  const header = request.headers.get('authorization') ?? '';
  if (!safeEqual(header, `Bearer ${secret}`)) {
    return new NextResponse('forbidden', { status: 403 });
  }

  // Snapshots feed every page, so the invalidation is per locale layout rather
  // than per route.
  for (const locale of LOCALES) revalidatePath(`/${locale}`, 'layout');

  return NextResponse.json({ ok: true, locales: LOCALES });
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
