import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

/**
 * The route's contract, exercised against a stubbed upstream.
 *
 * The case that matters is `image/jpg`. It is not a registered media type, it is
 * what tong.visitkorea.or.kr sends for every photograph, and matching only the
 * registered spelling rejected all 89 of them with 415 — so the route existed for
 * months and served nothing. A closed list of spellings meeting an open world is
 * exactly the shape that fails silently, which is why it is pinned here rather than
 * left to a browser to discover.
 */
const ALLOWED = 'https://tong.visitkorea.or.kr/cms/resource_photo/76/3404476_image2_1.jpg';
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]).buffer;

function upstream(contentType: string, bytes: ArrayBuffer = JPEG_BYTES): Response {
  return new Response(bytes, {
    status: 200,
    headers: { 'content-type': contentType, 'content-length': String(bytes.byteLength) },
  });
}

function request(url: string): Request {
  return new Request(`https://example.test/api/image-proxy?url=${encodeURIComponent(url)}`);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('image proxy', () => {
  it('serves image/jpg, and serves it as image/jpeg', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstream('image/jpg')));
    const response = await GET(request(ALLOWED));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
  });

  it.each(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])('serves %s', async (type) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstream(type)));
    const response = await GET(request(ALLOWED));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(type);
  });

  it('refuses a type that is not an image, whatever the bytes are', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstream('text/html')));
    expect((await GET(request(ALLOWED))).status).toBe(415);
  });

  it('refuses a host outside the allow-list', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect((await GET(request('https://example.com/a.jpg'))).status).toBe(403);
    // The refusal happens before the request, or the route is a port scanner.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses a url carrying a query string', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect((await GET(request(`${ALLOWED}?x=1`))).status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses an upstream that declares no length', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JPEG_BYTES, { status: 200, headers: { 'content-type': 'image/jpg' } }),
      ),
    );
    expect((await GET(request(ALLOWED))).status).toBe(411);
  });
});
