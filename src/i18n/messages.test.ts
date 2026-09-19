import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import ko from '../../messages/ko.json';
import { routing } from './routing';
import { statusLabel } from '@/domain/gap';

/** Every .ts/.tsx under src/, so a new screen is covered the day it is written. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/**
 * The two message files have to hold the same keys.
 *
 * A key present in one and missing in the other does not throw: next-intl logs
 * MISSING_MESSAGE on the server and the screen renders the key name — `place.score`
 * where a sentence belongs. That is invisible in a browser unless someone is reading
 * the server log, and it is exactly what happened when a live-region string was added
 * to the `places` namespace while the component read `place`.
 */
type Tree = { [key: string]: string | string[] | Tree };

function flatten(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'string' || Array.isArray(value)) return [path];
    return flatten(value, path);
  });
}

/**
 * `{name}` and `{count, plural, ...}` alike — the part before the first comma.
 *
 * A plural branch has to open with `#` for this to hold: `one {Verdict for # place}`
 * reads as a placeholder named `Verdict` and fails the comparison against Korean.
 */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\s*([A-Za-z0-9_]+)/g)].map((match) => match[1] as string).sort();
}

function valueAt(tree: Tree, path: string): string | string[] | undefined {
  let node: Tree | string | string[] | undefined = tree;
  for (const part of path.split('.')) {
    if (typeof node !== 'object' || Array.isArray(node) || node === undefined) return undefined;
    node = node[part];
  }
  return typeof node === 'object' && !Array.isArray(node) ? undefined : node;
}

const koKeys = flatten(ko as Tree);
const enKeys = flatten(en as Tree);

/**
 * Every English string, with array members split out, so a check can reach the copy
 * inside `home.howTo` and `report.afterwards` rather than stopping at the array.
 */
function englishStrings(): { key: string; value: string }[] {
  return enKeys.flatMap((key) => {
    const value = valueAt(en as Tree, key);
    if (typeof value === 'string') return [{ key, value }];
    if (Array.isArray(value)) {
      return value.map((item, index) => ({ key: `${key}[${index}]`, value: item }));
    }
    return [];
  });
}

/**
 * Where a count has no noun after it to agree with, so there is nothing to inflect.
 * `report.error.tooLong` names the unit in the sentence before: "Details can be up to
 * 500 characters. This is {count}."
 */
const COUNT_WITH_NO_NOUN: readonly string[] = [
  'report.error.tooLong',
  // "and 1 more" / "and 12 more". `more` is invariant, and the noun it stands for is
  // the list the phrase is appended to.
  'common.andMore',
];

describe('message files', () => {
  it('cover every locale the router serves', () => {
    expect([...routing.locales].sort()).toEqual(['en', 'ko']);
  });

  it('hold the same keys', () => {
    expect(enKeys.filter((key) => !koKeys.includes(key))).toEqual([]);
    expect(koKeys.filter((key) => !enKeys.includes(key))).toEqual([]);
  });

  it('use the same placeholders in both languages', () => {
    const mismatched = koKeys.flatMap((key) => {
      const a = valueAt(ko as Tree, key);
      const b = valueAt(en as Tree, key);
      if (typeof a !== 'string' || typeof b !== 'string') return [];
      const left = placeholders(a);
      const right = placeholders(b);
      return left.join(',') === right.join(',') ? [] : [`${key}: ko ${left} / en ${right}`];
    });
    expect(mismatched, mismatched.join('\n')).toEqual([]);
  });

  it('keep list-valued keys the same length', () => {
    const mismatched = koKeys.flatMap((key) => {
      const a = valueAt(ko as Tree, key);
      const b = valueAt(en as Tree, key);
      if (!Array.isArray(a) || !Array.isArray(b)) return [];
      return a.length === b.length ? [] : [`${key}: ko ${a.length} / en ${b.length}`];
    });
    expect(mismatched, mismatched.join('\n')).toEqual([]);
  });

  /**
   * The placeholder test above reads `{count, plural, ...}` as `count`, which is what
   * lets ko `{count}건` and en `{count, plural, ...}` count as the same placeholder.
   * The cost is that it cannot see an English count with no plural form behind it, and
   * "Loaded 1 reports." shipped that way.
   */
  it('inflect the noun after every English count', () => {
    const uninflected = englishStrings()
      .filter(({ value }) => /\{\s*count\b/.test(value))
      .filter(({ value }) => !/\{\s*count\s*,\s*plural\s*,/.test(value))
      .map(({ key }) => key)
      .sort();
    // Sorted on both sides: the exemption list is a set, and comparing it in file order
    // made adding a key to either one fail on where it landed rather than on what it is.
    expect(uninflected, uninflected.join('\n')).toEqual([...COUNT_WITH_NO_NOUN].sort());
  });

  /**
   * Every literal key a component asks for, resolved in the namespace it asked in.
   *
   * The key-set comparison above cannot see this: `common.andMore` exists in both
   * files, so both are complete, and a component reading it as `places.andMore` still
   * renders the key name where a sentence belongs. next-intl logs MISSING_MESSAGE on
   * the server and carries on, so the only place it shows is the screen.
   *
   * Template-literal keys — `t(\`label.\${code}\`)` — are skipped here and covered by
   * the enum sweeps below.
   */
  it('resolve every literal key in the namespace its component asked for', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const files = sourceFiles(root);
    const missing: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      // Every namespace a name is bound to in this file, not the last one. Two
      // components in one file each calling their translator `t` is ordinary here, and
      // a single-valued map made the second binding silently replace the first.
      const namespaces = new Map<string, Set<string>>();
      for (const match of text.matchAll(
        /\b(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\s*\(\s*(?:\{[^}]*namespace:\s*)?['"]([\w.]+)['"]/g,
      )) {
        const name = match[1] as string;
        const set = namespaces.get(name) ?? new Set<string>();
        set.add(match[2] as string);
        namespaces.set(name, set);
      }
      if (namespaces.size === 0) continue;
      for (const [variable, candidates] of namespaces) {
        const call = new RegExp(`\\b${variable}(?:\\.raw)?\\(\\s*['"]([\\w.]+)['"]`, 'g');
        for (const use of text.matchAll(call)) {
          const suffix = use[1] as string;
          const resolves = [...candidates].some(
            (namespace) =>
              valueAt(ko as Tree, `${namespace}.${suffix}`) !== undefined &&
              valueAt(en as Tree, `${namespace}.${suffix}`) !== undefined,
          );
          if (!resolves) {
            missing.push(
              `${file.slice(root.length + 1)}: ${variable}('${suffix}') resolves in none of ${[...candidates].join(', ')}`,
            );
          }
        }
      }
    }
    expect(missing, missing.join('\n')).toEqual([]);
  });

  /**
   * The CSV writes the four capability states itself, from its own table, because a
   * server route has no next-intl scope. The reader moves between the screen and the
   * downloaded file, so the two lists have to be one list — and they have drifted
   * before, with `unknown` reading "No information" in the file and "Unknown" on the
   * screen.
   */
  it('spell the four capability states the same in the CSV as on the screen', () => {
    for (const [status, locale] of [
      ['supported', 'ko'],
      ['partial', 'ko'],
      ['unsupported', 'ko'],
      ['unknown', 'ko'],
      ['supported', 'en'],
      ['partial', 'en'],
      ['unsupported', 'en'],
      ['unknown', 'en'],
    ] as const) {
      const onScreen = valueAt((locale === 'ko' ? ko : en) as Tree, `common.status.${status}`);
      expect(statusLabel(status, locale), `${locale}.${status}`).toBe(onScreen);
    }
  });

  it('have no empty strings', () => {
    const empty = koKeys
      .concat(enKeys)
      .filter((key) => valueAt(ko as Tree, key) === '' || valueAt(en as Tree, key) === '');
    expect([...new Set(empty)]).toEqual([]);
  });
});
