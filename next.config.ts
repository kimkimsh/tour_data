import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

import { AUDIO_HOSTS } from './src/config/media-hosts';

// KTO image hosts. Ingest rewrites http to https before storing and probes the result
// with a HEAD request; an asset whose https form does not serve is stored as an
// /api/image-proxy path instead (docs/spec/03_external_data.md section 4.3).
const KTO_IMAGE_HOSTS = ['tong.visitkorea.or.kr', 'cdn.visitkorea.or.kr'] as const;

/**
 * NAVER Maps v3, measured rather than copied from the documentation — and measured on
 * both schemes, because the SDK does not use the same hosts on each.
 *
 * Over http it fetches from nrbe.map.naver.net and static.naver.net. Over https it
 * fetches the same things from nrbe.pstatic.net and ssl.pstatic.net. A policy written
 * from a `next dev` session therefore passes locally and blocks every tile on the
 * deployed site, which is what happened: the first release rendered thirteen markers
 * on a blank grey square. All four are listed.
 *
 * The key check is JSONP, so oapi is a script source rather than a connect source, and
 * the style manifests behave the same way — nrbe answers `/styles/basic.json?callback=…`
 * with executable JavaScript. ssl/static serve the sprite sheets and the drag cursor.
 *
 * No scheme on any of them, deliberately. A bare host matches the page's own scheme,
 * which keeps the http form usable under `next dev` while a deployed https page still
 * refuses it — CSP only ever relaxes http to https, never the other way.
 *
 * kr-col-ext.nelo.navercorp.com is deliberately absent. It is NELO, NAVER's error
 * collector, and the map draws its tiles, its markers and its controls without it,
 * measured with the host blocked on both schemes. A telemetry endpoint allowed in to
 * quiet a console warning is a data flow this service's privacy policy would then have
 * to declare.
 */
const NAVER_MAP_SCRIPT_HOSTS = [
  'oapi.map.naver.com',
  'nrbe.map.naver.net',
  'nrbe.pstatic.net',
] as const;
const NAVER_MAP_ASSET_HOSTS = [
  'nrbe.map.naver.net',
  'static.naver.net',
  'nrbe.pstatic.net',
  'ssl.pstatic.net',
] as const;

/** Every host the map touches, listed once. */
const NAVER_MAP_HOSTS = [
  ...new Set([...NAVER_MAP_SCRIPT_HOSTS, ...NAVER_MAP_ASSET_HOSTS]),
];

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
 * The one Supabase origin this deployment talks to, read from the public URL that the
 * browser client is built with, so the two cannot name different projects.
 */
const SUPABASE_CONNECT_SRC = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : 'https://*.supabase.co';

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
  //
  // The project host, not https://*.supabase.co. The wildcard let a script on these
  // pages talk to any Supabase project on the internet, which is a wider hole than the
  // one directive it was meant to open. Falls back to the wildcard only when the
  // variable is absent, which is a build with no database attached.
  `connect-src 'self' ${SUPABASE_CONNECT_SRC} ${NAVER_MAP_HOSTS.join(' ')}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
  /**
   * Two years, subdomains included. The service is https-only on Vercel, and without
   * this a visitor who types the bare host once is one intercepted redirect away from
   * having their session cookie read. Not preloaded: the list is hard to leave and
   * that is the owner's call to make separately.
   */
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Three capabilities this service states it does not use. The privacy policy says
  // so about location in particular (docs/spec/13_legal_citations.md section 1), and
  // this is that sentence in a form the browser enforces.
  { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=()' },
];

const nextConfig: NextConfig = {
  /*
    The cron route reads the committed inputs — pois.json, facilities.json,
    certifications.json, curated-facts.json, the route files and the plain-language
    docent scripts. Next traces imports, and these are opened by path at run time, so
    without naming them the function deploys without them and the first stage exits on
    "content/pois.json is missing".
  */
  outputFileTracingIncludes: {
    '/api/cron/ingest': ['./content/**/*.json', './content/docent-easy/**/*.md'],
  },
  // The framework's version is not the visitor's business, and it is the first thing
  // an automated scan reads.
  poweredByHeader: false,
  experimental: {
    /**
     * Every route here sits under a route group with its own root layout — (site),
     * (admin), (print) — so there is no app/layout.tsx for Next to wrap an unmatched
     * address in. Without this flag it wrapped one in its own stand-in layout, which
     * renders a bare <html>, and app/not-found.tsx rendered a second <html lang="ko">
     * inside it. The parser merged the two and React reported an attribute mismatch it
     * would not patch up, on every 404. This is the file convention for exactly that
     * case: it returns the whole document itself and no layout runs.
     */
    globalNotFound: true,
  },
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
