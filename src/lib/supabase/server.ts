// Session-aware Supabase client for React Server Components, Server Actions and
// Route Handlers.
//
// Only the report flow (S7) and the admin screen (S8) belong here — anywhere a session
// actually exists. Cached snapshot pages read through ./public.ts instead, because
// touching cookies() would make them dynamic and undo the cache policy in
// docs/spec/02_stack.md §5.

import { cookies } from 'next/headers';
import { createServerClient as createSsrServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Defined next to the snapshot client because that is the module the live-versus-
// fixtures decision belongs to, and it must be answerable without next/headers.
export { isSupabaseConfigured } from './public';

/**
 * A client bound to this request's cookies. Async because cookies() is async from
 * Next 15 on. Never cache or share the returned client — it carries one visitor's
 * session.
 *
 * Authorisation must be decided with getUser() or getClaims(), never getSession():
 * getSession() returns whatever the cookie says without verifying its signature, so
 * the /admin gate would accept a forged cookie.
 */
export async function createServerClient(): Promise<SupabaseClient> {
  // Static process.env.X reads only — see the note in ./public.ts.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must both be set',
    );
  }

  const cookieStore = await cookies();

  return createSsrServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // A Server Component has no response to write to, so set() throws there and
          // only there. The refreshed tokens are written by whichever Server Action or
          // Route Handler runs next, so dropping the write is correct here rather than
          // merely survivable.
        }
      },
    },
  });
}
