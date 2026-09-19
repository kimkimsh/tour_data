/**
 * Copies the six published snapshots out of Supabase into content/generated.
 *
 * The collection itself moved to a Vercel cron in icn1, because a GitHub runner could
 * not reliably open a connection to apis.data.go.kr. A function cannot commit to git,
 * so the thing that ran here and is worth keeping is the other half: the committed
 * files are what makes `git diff` answer "what changed since yesterday", which is this
 * project's substitute for an ingest-history table. They are also the fixtures
 * `pnpm build:fixtures` and the e2e suite run against.
 *
 * This talks to Supabase and to nothing else, so the address wall that moved the
 * collection has no bearing on it.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

import { SNAPSHOT_KEYS, type SnapshotKey } from '../src/domain/snapshot-schema';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED = join(ROOT, 'content', 'generated');

const ENV_FILE = join(ROOT, '.env.local');
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

function exit(message: string): never {
  console.error(`pull-snapshots: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // The service role key, because it is the one this repository's workflows already
  // hold. Nothing here writes; a read-only key would be the better fit the day one
  // exists as a secret.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) exit('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set');

  const db = createClient(url, key, { auth: { persistSession: false } });
  mkdirSync(GENERATED, { recursive: true });

  let written = 0;
  let unchanged = 0;
  for (const snapshotKey of SNAPSHOT_KEYS as readonly SnapshotKey[]) {
    const { data, error } = await db
      .from('data_snapshots')
      .select('payload')
      .eq('key', snapshotKey)
      .maybeSingle();

    if (error) exit(`${snapshotKey}: ${error.message}`);
    if (!data) {
      // Not an error. A key with no row is the state before the first run of a stage,
      // and overwriting the committed file with nothing would lose more than it says.
      console.warn(`warn  ${snapshotKey}: no row in data_snapshots, file left alone`);
      continue;
    }

    const path = join(GENERATED, `${snapshotKey}.json`);
    const next = `${JSON.stringify(data.payload, null, 2)}\n`;
    const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
    if (current === next) {
      unchanged += 1;
      continue;
    }
    writeFileSync(path, next, 'utf8');
    written += 1;
    console.log(`ok       ${snapshotKey}.json`);
  }

  console.log(`\n${written} file(s) written, ${unchanged} unchanged`);
}

main().catch((cause: unknown) => {
  console.error(`pull-snapshots: ${cause instanceof Error ? cause.message : String(cause)}`);
  process.exitCode = 1;
});
