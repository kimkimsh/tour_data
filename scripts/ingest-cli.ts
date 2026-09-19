/**
 * The command line around scripts/ingest.ts.
 *
 * A separate file rather than a guard inside that one. The guard was
 * `require.main === module`, which esbuild's cjs output satisfies and Turbopack's ESM
 * context does not — `module` is not defined there, so importing the module from a
 * route threw at evaluation. Detecting the entry point is the wrong instrument anyway:
 * the failure it protects against is a full collection running against the live
 * gateway during `next build`, and a check that can be wrong in either direction is
 * not what should stand between that and a deploy. A module that never runs itself
 * cannot.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseStages, runIngest } from './ingest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// tsx does not load .env.local the way next dev does.
const ENV_FILE = join(ROOT, '.env.local');
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const args = process.argv.slice(2);

// Not top-level await: package.json has no "type": "module", so tsx hands this file to
// esbuild's cjs format, which cannot host one.
runIngest({
  contentRoot: ROOT,
  dryRun: args.includes('--dry-run'),
  stages: parseStages(args.find((arg) => arg.startsWith('--only='))?.slice('--only='.length)),
}).catch((cause: unknown) => {
  console.error(`ingest: ${cause instanceof Error ? cause.message : String(cause)}`);
  process.exitCode = 1;
});
