import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

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

  // The root layout, which every page carries as a tag — `_N_T_/layout` appears in
  // the tag set of every entry under .next/server/app. Snapshots feed all of them, and
  // both route groups hold pages that read one.
  //
  // Per locale was the earlier form and it dropped nothing. revalidatePath builds its
  // tag from the *route file path*, so a page under (site)/[locale] is tagged
  // `_N_T_/(site)/[locale]/layout`; `/ko` never appears as a layout tag, only as the
  // exact-pathname tag `_N_T_/ko`. Measured: a mutated fixture, a 200 {"ok":true} from
  // this route, and the previous render still being served afterwards.
  revalidatePath('/', 'layout');

  return NextResponse.json({ ok: true });
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
