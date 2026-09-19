import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cache } from 'react';
import type { z } from 'zod';

import { getPublicDb, isSupabaseConfigured } from '@/lib/supabase/public';
import {
  AccessibilityPayload,
  ContextPayload,
  DocentPayload,
  PoisPayload,
  RelatedPayload,
  RoutesPayload,
  type SnapshotKey,
} from '@/domain/snapshot-schema';

/**
 * Reads the six snapshots. Two things this module is responsible for.
 *
 * First, telling "there is no data yet" apart from "the query failed". The
 * screens use different wording for the two, and a single thrown error cannot
 * carry that difference (docs/spec/07_screens.md, all-screens table).
 *
 * Second, choosing where the data comes from. `fixtures` reads the files ingest
 * writes for git history, which lets the app run and the build prerender without
 * a Supabase project. A production build or server may not land there by accident:
 * it has to say MODU_DATA_SOURCE=fixtures out loud, which is what pnpm
 * build:fixtures and pnpm start:fixtures do. See resolveSource().
 */

/**
 * `snapshot` is the only part of a failure a public screen may render. `message`
 * carries Postgres errors, Zod issues and the deployment instructions below, every
 * one of which names something internal.
 */
export type SnapshotResult<T> =
  | { ok: true; data: T; source: DataSource }
  | { ok: false; kind: 'missing' | 'error'; snapshot: SnapshotKey; message: string };

export type DataSource = 'supabase' | 'fixtures';

const FIXTURE_DIR = join(process.cwd(), 'content', 'generated');

function resolveSource(): DataSource {
  const explicit = process.env.MODU_DATA_SOURCE;
  if (explicit === 'fixtures') return 'fixtures';
  if (explicit === 'supabase') return 'supabase';
  if (isSupabaseConfigured()) return 'supabase';
  // A deploy that lost its environment variables would otherwise serve the example
  // data as though it were collected. Failing here is the point. NODE_ENV is checked
  // alongside VERCEL because `next build && next start` on any other host — Docker, a
  // VPS, a judging laptop — is just as much a production deploy, and pnpm
  // seed:fixtures writes the very directory that would be served.
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    throw new Error(
      'Supabase is not configured on this deployment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or set MODU_DATA_SOURCE=fixtures deliberately.',
    );
  }
  return 'fixtures';
}

async function readFixture(key: SnapshotKey): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(join(FIXTURE_DIR, `${key}.json`), 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

/**
 * `message` names a Postgres error, a Zod issue or a deployment instruction, none of
 * which may reach a public page — so SnapshotProblem renders only `snapshot`, and this
 * is the one place the text is written down. Without it a snapshot outage left no
 * trace anywhere: the screen said "다시 시도해 주세요" and the server log said nothing.
 */
function fail<T>(
  kind: 'missing' | 'error',
  key: SnapshotKey,
  message: string,
): Extract<SnapshotResult<T>, { ok: false }> {
  if (kind === 'error') console.error(`snapshot read failed — ${message}`);
  return { ok: false, kind, snapshot: key, message };
}

async function readSnapshot<T>(
  key: SnapshotKey,
  schema: z.ZodType<T>,
): Promise<SnapshotResult<T>> {
  let source: DataSource;
  try {
    source = resolveSource();
  } catch (error) {
    return fail('error', key, (error as Error).message);
  }

  let payload: unknown;
  if (source === 'fixtures') {
    try {
      payload = await readFixture(key);
    } catch (error) {
      return fail('error', key, `${key}: ${(error as Error).message}`);
    }
    if (payload === undefined) {
      return fail('missing', key, `${key}: no fixture file`);
    }
  } else {
    const { data, error } = await getPublicDb()
      .from('data_snapshots')
      .select('payload')
      .eq('key', key)
      .maybeSingle();
    // maybeSingle, not single: single() reports "no row" as an error, and the two
    // have to reach the screen as different states.
    if (error) return fail('error', key, `${key}: ${error.message}`);
    if (!data) return fail('missing', key, `${key}: no snapshot row`);
    payload = data.payload;
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    // A shape that no longer matches is a broken snapshot, not an empty one.
    return fail('error', key, `${key}: ${parsed.error.issues[0]?.message ?? 'invalid shape'}`);
  }
  return { ok: true, data: parsed.data, source };
}

export const getPois = cache(() => readSnapshot('pois', PoisPayload));
export const getFacts = cache(() => readSnapshot('accessibility', AccessibilityPayload));
export const getRoutes = cache(() => readSnapshot('routes', RoutesPayload));
export const getDocent = cache(() => readSnapshot('docent', DocentPayload));
export const getContext = cache(() => readSnapshot('context', ContextPayload));
export const getRelated = cache(() => readSnapshot('related', RelatedPayload));

/**
 * Rows for a section the page decorates with rather than depends on, plus whether the
 * read failed.
 *
 * The two halves of this module's first responsibility meet here. "No rows" and "the
 * read failed" are the same empty array to a caller, and the screens spend that array
 * on presence: no route row means no 경로 안내 보기 button, no docent row means no
 * 오디오 해설 듣기, no related row means the section is gone. Returning [] for a failed
 * read therefore publishes "this place has no route guide" out of a Postgres error —
 * a claim nobody made, on the one service whose whole argument is that it does not
 * make them.
 *
 * `missing` stays an empty array. Nothing has been collected yet is a true statement
 * about the data, and it is the state every screen is built to render.
 */
export interface OptionalRows<T> {
  rows: T[];
  /** The read failed. The page still renders; the sections fed by it say so. */
  unavailable: boolean;
}

export function optionalRows<T>(result: SnapshotResult<T[]>): OptionalRows<T> {
  if (result.ok) return { rows: result.data, unavailable: false };
  if (result.kind === 'error') return { rows: [], unavailable: true };
  return { rows: [], unavailable: false };
}

export const currentDataSource = cache((): DataSource | 'unresolved' => {
  try {
    return resolveSource();
  } catch {
    return 'unresolved';
  }
});
