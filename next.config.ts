import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

// KTO image hosts. Ingest rewrites http to https before storing and probes the result
// with a HEAD request; an asset whose https form does not serve is stored as an
// /api/image-proxy path instead (docs/spec/03_external_data.md section 4.3).
const KTO_IMAGE_HOSTS = ['tong.visitkorea.or.kr', 'cdn.visitkorea.or.kr'] as const;

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

const nextConfig: NextConfig = {
  images: {
    remotePatterns: KTO_IMAGE_HOSTS.map((hostname) => ({
      protocol: 'https' as const,
      hostname,
    })),
    localPatterns: [{ pathname: IMAGE_PROXY_PATHNAME }],
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
