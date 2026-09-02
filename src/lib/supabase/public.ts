// Anonymous, cookie-free Supabase client. Reads data_snapshots and nothing else.
//
// Kept separate from server.ts because @supabase/ssr's createServerClient reads
// cookies(), and reading cookies() opts the whole route out of static rendering in
// Next 16. Snapshot pages are cached with `export const revalidate = 3600` and
// invalidated by revalidatePath after ingest (docs/spec/02_stack.md §5), so they must
// never touch cookies. Snapshots are byte-identical for every visitor, so there is no
// session to carry here.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

/**
 * Whether a live database is reachable at all. src/lib/data.ts uses this to choose
 * between data_snapshots and the local content/generated/*.json fixtures, so it has
 * to answer without throwing and without importing next/headers.
 */
export function isSupabaseConfigured(): boolean {
  // Static process.env.X reads only. Next substitutes these literals at build time;
  // a computed process.env[name] lookup is left in place and resolves to undefined,
  // which is how "undefined" ends up inside a request URL.
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Built on first call rather than at import time: an unconfigured environment must be
 * able to import this module and fall back to fixtures, so the failure has to happen
 * where the database is actually wanted.
 */
export function getPublicDb(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must both be set to read snapshots from Supabase',
      );
    }
    client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
