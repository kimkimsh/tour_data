// Browser-side Supabase client. The anonymous session behind the S7 report flow and
// any signed-in admin session live here; server.ts reads the same session back out of
// the request cookies.

import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

/**
 * One client per tab, held for the lifetime of the document. A second instance would
 * run its own token-refresh timer and the two would race to write the same auth
 * cookie, which shows up as random sign-outs.
 */
export function createBrowserClient(): SupabaseClient {
  if (!client) {
    // Static process.env.X reads only — a computed lookup is not substituted at build
    // time and resolves to undefined in the browser.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must both be set',
      );
    }
    client = createSsrBrowserClient(url, anonKey);
  }
  return client;
}
