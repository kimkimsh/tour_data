// service_role client. It bypasses RLS completely.
//
// For scripts/ only — scripts/ingest.ts writes data_snapshots, which has no write
// policy by design. Never import this from src/app or src/components: the key must
// not reach a response body, a log line, or a client bundle
// (docs/spec/02_stack.md §3).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set; nothing can write to Supabase without it',
    );
  }
  return createClient(url, serviceRoleKey, {
    // Nothing to persist or refresh: the key itself is the credential, and a stored
    // session in a one-shot script would only be a file left on disk.
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
