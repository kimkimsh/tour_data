import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

/**
 * Next 16 renamed Middleware to Proxy: this file must be called proxy.ts and the
 * export must be named accordingly.
 *
 * The matcher deliberately excludes api, admin, _next, _vercel and anything with
 * a file extension. Without the api exclusion, POST /api/report would be
 * redirected to /ko/api/report and answer 404 with no visible cause. /admin sits
 * outside the localised tree by design (docs/spec/02_stack.md section 2).
 */
export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|admin|_next|_vercel|.*\\..*).*)'],
};
