/**
 * Checks everything under content/ that a person types by hand.
 *
 * The point is not schema tidiness. Three of these checks are the only thing
 * standing between the service and a claim it cannot support: a fact with no
 * source, a gradient written as a number, and a place whose KTO content id was
 * never confirmed by a real call.
 *
 * Also compares the two places the report categories are written down. A value
 * present in one and not the other fails nothing at runtime — the insert just
 * errors on a category the enum does not have, in production, on a visitor's
 * report.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import {
  CertificationsInput,
  CuratedFactsInput,
  FacilitiesInput,
  ItinerariesInput,
  PoisInput,
  RouteInput,
  SafetyDirectoryInput,
} from '../src/domain/content-schema';
import { REPORT_CATEGORIES } from '../src/domain/types';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');

/** Written into content/pois.json until the P0-1 probe returns a real id. */
export const UNRESOLVED_CONTENT_ID = 'UNRESOLVED';

const problems: string[] = [];
const notes: string[] = [];

function fail(where: string, message: string): void {
  problems.push(`${where}: ${message}`);
}

function readJson(relative: string): unknown | undefined {
  const path = join(CONTENT, relative);
  if (!existsSync(path)) {
    fail(relative, 'file is missing');
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(relative, `not valid JSON — ${(error as Error).message}`);
    return undefined;
  }
}

function parseOr<T>(relative: string, schema: z.ZodType<T>, raw: unknown): T | undefined {
  if (raw === undefined) return undefined;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    fail(relative, `\n${z.prettifyError(parsed.error)}`);
    return undefined;
  }
  return parsed.data;
}

const pois = parseOr('pois.json', PoisInput, readJson('pois.json'));
const facilities = parseOr('facilities.json', FacilitiesInput, readJson('facilities.json'));
const certifications = parseOr('certifications.json', CertificationsInput, readJson('certifications.json'));
const curated = parseOr('curated-facts.json', CuratedFactsInput, readJson('curated-facts.json'));
parseOr('itineraries.json', ItinerariesInput, readJson('itineraries.json'));
parseOr('safety-directory.json', SafetyDirectoryInput, readJson('safety-directory.json'));

const slugs = new Set(pois?.map((poi) => poi.slug) ?? []);

if (pois) {
  if (slugs.size !== pois.length) fail('pois.json', 'two entries share a slug');

  const unresolved = pois.filter((poi) => poi.ktoContentId === UNRESOLVED_CONTENT_ID);
  if (unresolved.length > 0) {
    // This is the gate, not a warning. A place published with an unconfirmed id
    // silently collects another place's accessibility data.
    fail(
      'pois.json',
      `${unresolved.length} place(s) still carry ktoContentId "${UNRESOLVED_CONTENT_ID}": ` +
        `${unresolved.map((poi) => poi.slug).join(', ')}.\n` +
        '  Run `pnpm probe` (P0-1) with a KTO service key, then copy the confirmed ids in.\n' +
        '  docs/spec/11_open_items.md P0-1 explains why the three id sets in the older documents must not be trusted.',
    );
  }

  const missingTats = pois.filter((poi) => poi.tatsName === null);
  if (missingTats.length > 0) {
    notes.push(
      `${missingTats.length} place(s) have no tatsName yet (crowd forecast stays unknown for them): ` +
        missingTats.map((poi) => poi.slug).join(', '),
    );
  }
}

for (const [name, rows] of [
  ['facilities.json', facilities],
  ['certifications.json', certifications],
  ['curated-facts.json', curated],
] as const) {
  for (const row of rows ?? []) {
    if (!slugs.has(row.poiSlug)) fail(name, `poiSlug "${row.poiSlug}" is not in pois.json`);
  }
}

// A curated fact may only name a cause when it also names where the cause came from.
for (const fact of curated ?? []) {
  if (
    (fact.absenceKind === 'intrinsic' || fact.absenceKind === 'operator_missing') &&
    fact.source.length < 8
  ) {
    fail(
      'curated-facts.json',
      `${fact.poiSlug}/${fact.capabilityCode} declares absenceKind "${fact.absenceKind}" ` +
        'but its source is too short to say how that cause was established',
    );
  }
}

const routesDir = join(CONTENT, 'routes');
if (existsSync(routesDir)) {
  for (const file of readdirSync(routesDir).filter((name) => name.endsWith('.json'))) {
    const route = parseOr(`routes/${file}`, RouteInput, readJson(`routes/${file}`));
    if (!route) continue;
    if (!slugs.has(route.poiSlug)) {
      fail(`routes/${file}`, `poiSlug "${route.poiSlug}" is not in pois.json`);
    }
    const seqs = route.steps.map((step) => step.seq);
    if (new Set(seqs).size !== seqs.length) fail(`routes/${file}`, 'two steps share a seq');
    if (route.evidenceLevel === 'desk' && !/실측|측정|현장/.test(route.evidenceNote)) {
      notes.push(
        `routes/${file}: evidenceLevel is "desk" — evidenceNote should say plainly that nothing was measured on site`,
      );
    }
  }
} else {
  notes.push('content/routes/ does not exist yet, so no place has a route guide');
}

// The report categories exist as a TypeScript union and as a Postgres enum. Two
// copies of one list drift, so the drift itself is what gets checked.
const migration = join(ROOT, 'supabase/migrations/002_reports.sql');
if (existsSync(migration)) {
  const sql = readFileSync(migration, 'utf8');
  const enumBlock = /create type report_category as enum \(([\s\S]*?)\);/.exec(sql);
  if (!enumBlock) {
    fail('002_reports.sql', 'could not find the report_category enum');
  } else {
    const inSql = [...enumBlock[1]!.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]!);
    const inTs = [...REPORT_CATEGORIES];
    if ([...inSql].sort().join(',') !== [...inTs].sort().join(',')) {
      fail(
        '002_reports.sql',
        `report_category enum and REPORT_CATEGORIES disagree.\n  SQL: ${inSql.join(', ')}\n  TS : ${inTs.join(', ')}`,
      );
    }
  }
} else {
  fail('002_reports.sql', 'file is missing');
}

for (const note of notes) console.warn(`note  ${note}`);

if (problems.length > 0) {
  console.error(`\ncontent validation failed (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(
  `content validation passed: ${slugs.size} places, ${facilities?.length ?? 0} facilities, ` +
    `${certifications?.length ?? 0} certifications, ${curated?.length ?? 0} curated facts`,
);
