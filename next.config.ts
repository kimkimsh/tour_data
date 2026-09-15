import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

import { AUDIO_HOSTS } from './src/config/media-hosts';

// KTO image hosts. Ingest rewrites http to https before storing and probes the result
// with a HEAD request; an asset whose https form does not serve is stored as an
// /api/image-proxy path instead (docs/spec/03_external_data.md section 4.3).
const KTO_IMAGE_HOSTS = ['tong.visitkorea.or.kr', 'cdn.visitkorea.or.kr'] as const;

/**
 * NAVER Maps v3, measured rather than copied from the documentation.
 *
 * The SDK comes from oapi, and so does the key check — as JSONP, which is a <script>
 * and lands in script-src rather than connect-src. The style manifests behave the same
 * way: nrbe answers `/styles/basic.json?callback=…` with executable JavaScript, so
 * that host is a script source as well as an image source. static.naver.net serves the
 * sprite sheets and the drag cursor.
 *
 * No scheme, deliberately. A bare host matches the page's own scheme, which keeps the
 * http form usable under `next dev` while a deployed https page still refuses it —
 * CSP only ever relaxes http to https, never the other way.
 *
 * kr-col-ext.nelo.navercorp.com is deliberately absent. It is NELO, NAVER's error
 * collector, and the map draws its tiles, its markers and its controls without it,
 * measured with the host blocked. A telemetry endpoint allowed in to quiet a console
 * warning is a data flow this service's privacy policy would then have to declare.
 */
const NAVER_MAP_SCRIPT_HOSTS = ['oapi.map.naver.com', 'nrbe.map.naver.net'] as const;
const NAVER_MAP_ASSET_HOSTS = ['nrbe.map.naver.net', 'static.naver.net'] as const;

/**
 * The proxy path is same-origin, and same-origin used to be enough. Next 16 stopped
 * optimising a local src that carries a query string unless localPatterns names it,
 * and the whole point of this route is `?url=`, so every proxied image threw and took
 * the place page down with it:
 *
 *   Error: Image with src "/api/image-proxy?url=…" is using a query string which is
 *   not configured in images.localPatterns.
 *
 * Nothing served through it until now — resolveImageUrl only falls back to the proxy
 * for an asset whose https form does not answer, and no asset was fetched at all while
 * every ktoContentId read UNRESOLVED. The first real ingest sent all 460 through it.
 *
 * `search` is deliberately absent, which allows any query string. Next's own advice is
 * to pin it, and that assumes a route where the caller supplies a version tag rather
 * than a URL. Here the parameter is the upstream address by construction, so a fixed
 * value cannot exist; the enumeration this guards against is already refused by
 * src/app/api/image-proxy/route.ts, whose host allow-list is the security model.
 */
const IMAGE_PROXY_PATHNAME = '/api/image-proxy';

/**
 * What the browser is allowed to fetch, load and do on these pages.
 *
 * The list is the real inventory, not a template: the fonts are self-hosted
 * (docs/work_log/03_deviations.md D-6), there is no analytics script, the map SDK is
 * NAVER's and nothing else third-party runs, and the only images that are not ours
 * come from the two KTO hosts the image config above names plus NAVER's tiles. `frame-ancestors 'none'` is what X-Frame-Options used to say,
 * in the header that superseded it.
 *
 * 'unsafe-inline' on styles is Tailwind v4's inline `<style>` element, and on scripts
 * is Next's own bootstrap. Removing either needs a nonce, which needs a dynamic
 * response, which is the opposite of the cache design this whole service is built on.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `img-src 'self' data: blob: ${KTO_IMAGE_HOSTS.map((host) => `https://${host}`).join(' ')} ${NAVER_MAP_ASSET_HOSTS.join(' ')}`,
  // Odii's audio, and the captions the player builds from the transcript it already
  // has on screen. The caption track is a data: URL because the text is generated in
  // the browser from paragraphs that arrived with the page — there is no file to
  // fetch, and inventing a route to serve one back would be a round trip to ourselves.
  // data: buys no script execution here; media-src governs <audio> and <video> only.
  `media-src 'self' data: ${AUDIO_HOSTS.map((host) => `https://${host}`).join(' ')}`,
  // 'unsafe-eval' is React Refresh's, and it is only ever loaded by `next dev`. A
  // production bundle never calls eval, so shipping the permission buys an attacker
  // a string-to-code path in exchange for nothing.
  `script-src 'self' 'unsafe-inline' ${NAVER_MAP_SCRIPT_HOSTS.join(' ')}${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  // The Supabase project and the map's own tile requests. Visitor reports are still
  // the only thing this app itself sends anywhere at run time.
  `connect-src 'self' https://*.supabase.co ${NAVER_MAP_SCRIPT_HOSTS.join(' ')} ${NAVER_MAP_ASSET_HOSTS.join(' ')}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Three capabilities this service states it does not use. The privacy policy says
  // so about location in particular (docs/spec/13_legal_citations.md section 1), and
  // this is that sentence in a form the browser enforces.
  { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=()' },
];

const nextConfig: NextConfig = {
  // The framework's version is not the visitor's business, and it is the first thing
  // an automated scan reads.
  poweredByHeader: false,
  images: {
    remotePatterns: KTO_IMAGE_HOSTS.map((hostname) => ({
      protocol: 'https' as const,
      hostname,
    })),
    localPatterns: [{ pathname: IMAGE_PROXY_PATHNAME }],
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
