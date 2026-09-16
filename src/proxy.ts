import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';

import { routing } from '@/i18n/routing';

/**
 * Next 16 renamed Middleware to Proxy: this file must be called proxy.ts and the
 * export must be named accordingly.
 *
 * Two jobs, and they do not overlap. Everything under the localised tree goes to
 * next-intl. /admin is not in that tree (docs/spec/02_stack.md section 2) and gets the
 * Supabase token refresh instead — see below for why it has to happen here.
 *
 * The matcher still excludes api, _next, _vercel and anything with a file extension.
 * Without the api exclusion, POST /api/report would be redirected to /ko/api/report and
 * answer 404 with no visible cause.
 */
const intl = createMiddleware(routing);

const ADMIN_PREFIX = '/admin';

/**
 * Touches the session so @supabase/ssr can write a rotated token back.
 *
 * The admin screen is a Server Component, and it calls getUser(). Past the access
 * token's hour that call spends the refresh token server-side and hands the new pair
 * to the cookie writer — which throws in a Server Component, where there is no response
 * to write to, and src/lib/supabase/server.ts drops it. The browser then replays a
 * refresh token the server already consumed, and past Supabase's short reuse window
 * that is reuse detection: the operator is signed out mid-session with no explanation.
 *
 * Here there is a response. The same call runs against it, the rotated cookies land on
 * it, and the render downstream reads a session that is still valid. Nothing is
 * decided here: the membership check stays on the page, where a failure can say so.
 */
async function refreshAdminSession(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // A deployment with no database attached renders the screen's own "unavailable"
  // state. Throwing here would answer 500 for the same condition.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser, not getSession: getSession returns whatever the cookie claims without
  // verifying its signature, and only getUser reaches the server that can rotate.
  await supabase.auth.getUser();
  return response;
}

export default async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith(ADMIN_PREFIX)) {
    return refreshAdminSession(request);
  }
  return intl(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
