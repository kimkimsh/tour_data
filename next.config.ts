import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

// KTO image hosts. Ingest rewrites http to https before storing and probes the result
// with a HEAD request; an asset whose https form does not serve is stored as an
// /api/image-proxy path instead, which needs no entry here because it is same-origin
// (docs/spec/03_external_data.md section 4.3).
const KTO_IMAGE_HOSTS = ['tong.visitkorea.or.kr', 'cdn.visitkorea.or.kr'] as const;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: KTO_IMAGE_HOSTS.map((hostname) => ({
      protocol: 'https' as const,
      hostname,
    })),
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
