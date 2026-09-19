import { NextResponse } from 'next/server';

/**
 * TEMPORARY. Delete once the question below is answered.
 *
 * The nightly ingest fails about half the time from a GitHub runner with
 * UND_ERR_CONNECT_TIMEOUT against apis.data.go.kr:443 — all-or-nothing per run, so the
 * wall is bound to the runner's source address. Moving the job to a Vercel cron in
 * icn1 is only worth doing if a function in that region can open the connection, and a
 * proxied image from tong.visitkorea.or.kr does not answer that: a different host can
 * sit behind a different firewall.
 *
 * Two hosts per call so the comparison is inside one invocation, and no service key —
 * a 4xx from the gateway proves the TCP connection and the TLS handshake, which is the
 * whole question. Same shared secret as /api/revalidate, so a public deployment does
 * not carry an unauthenticated outbound fetch even for the few minutes this exists.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TARGETS = [
  ['gateway', 'https://apis.data.go.kr/B551011/KorService2/ldongCode2?MobileOS=ETC&MobileApp=probe&_type=json&numOfRows=1&pageNo=1'],
  ['images', 'https://tong.visitkorea.or.kr/cms/resource_photo/76/3404476_image2_1.jpg'],
] as const;

export async function GET(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return new NextResponse('not configured', { status: 503 });
  const header = request.headers.get('authorization') ?? '';
  if (header !== `Bearer ${secret}`) return new NextResponse('forbidden', { status: 403 });

  const results = [];
  for (const [name, url] of TARGETS) {
    const started = Date.now();
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(20_000),
        headers: { accept: '*/*' },
      });
      results.push({ target: name, ok: true, status: response.status, ms: Date.now() - started });
    } catch (cause) {
      results.push({ target: name, ok: false, ms: Date.now() - started, why: describe(cause) });
    }
  }

  return NextResponse.json({ region: process.env.VERCEL_REGION ?? null, results });
}

/** The cause chain, because undici's own message is the constant string "fetch failed". */
function describe(cause: unknown): string {
  const parts: string[] = [];
  let current: unknown = cause;
  const seen = new Set<unknown>();
  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    const code = (current as NodeJS.ErrnoException).code;
    parts.push(code ? `${current.name}(${code}): ${current.message}` : `${current.name}: ${current.message}`);
    current = (current as { cause?: unknown }).cause;
  }
  return parts.join(' <- ') || String(cause);
}
