import { NextResponse } from 'next/server';

/**
 * Serves one KTO image through this origin, byte for byte.
 *
 * Two reasons it exists. Most KTO image URLs are http, and an https page blocks
 * them as mixed content. And a KOGL type 3 image may not be transformed at all, so
 * it cannot go through the image optimiser — this route rewrites nothing.
 *
 * The host allow-list is the whole security model: without it, `?url=` turns this
 * into an open proxy that will fetch anything, including addresses only this
 * server can reach.
 */
const ALLOWED_HOSTS = new Set(['tong.visitkorea.or.kr', 'cdn.visitkorea.or.kr']);

/**
 * Upstream media type to the one this route serves it as.
 *
 * `image/jpg` is not a registered media type and is what tong.visitkorea.or.kr sends
 * for every photograph — all 89 of them, measured. Checking against the registered
 * spelling alone rejected every KTO image with 415, so nothing this route was built
 * to serve ever reached a browser. It is normalised rather than passed through:
 * the bytes are a JPEG and the header should say so.
 */
const CONTENT_TYPE_MAP: ReadonlyArray<readonly [upstream: string, served: string]> = [
  ['image/jpeg', 'image/jpeg'],
  ['image/jpg', 'image/jpeg'],
  ['image/png', 'image/png'],
  ['image/webp', 'image/webp'],
  ['image/gif', 'image/gif'],
];
const ALLOWED_CONTENT_TYPES = CONTENT_TYPE_MAP.map(([upstream]) => upstream);
const TIMEOUT_MS = 8000;
const MAX_BYTES = 12 * 1024 * 1024;

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get('url');
  if (!target) return new NextResponse('url is required', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new NextResponse('url is not absolute', { status: 400 });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return new NextResponse('unsupported protocol', { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return new NextResponse('host not allowed', { status: 403 });
  }
  // The allow-list matches the host and says nothing about the port, so an allowed
  // hostname on port 8080 reached whatever listens there.
  if (parsed.port !== '') {
    return new NextResponse('port not allowed', { status: 403 });
  }
  // A query string or credentials on an image URL is not something KTO serves, and
  // both are ways to make one allowed path behave as several.
  if (parsed.search !== '' || parsed.username !== '' || parsed.password !== '') {
    return new NextResponse('url is not a plain image path', { status: 400 });
  }

  const upstream = await fetch(parsed, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    // No redirect following: a redirect could leave the allow-list.
    redirect: 'error',
    headers: { accept: ALLOWED_CONTENT_TYPES.join(', ') },
  }).catch(() => null);

  if (!upstream?.ok) return new NextResponse('upstream failed', { status: 502 });

  const contentType = upstream.headers.get('content-type') ?? '';
  const served = CONTENT_TYPE_MAP.find(([upstreamType]) => contentType.startsWith(upstreamType))?.[1];
  if (served === undefined) return new NextResponse('not an image', { status: 415 });

  // A missing content-length used to read as 0, pass the check, and then buffer the
  // whole body before the byteLength test below caught it. Requiring the header means
  // the size is known before a byte is read.
  const declared = upstream.headers.get('content-length');
  if (declared === null) return new NextResponse('length not declared', { status: 411 });
  const length = Number(declared);
  if (!Number.isFinite(length) || length <= 0 || length > MAX_BYTES) {
    return new NextResponse('too large', { status: 413 });
  }

  const body = await upstream.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return new NextResponse('too large', { status: 413 });

  return new NextResponse(body, {
    headers: {
      'content-type': served,
      'cache-control': 'public, max-age=86400, immutable',
      'content-security-policy': "default-src 'none'; sandbox",
    },
  });
}
