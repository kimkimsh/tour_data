import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import ko from '../../messages/ko.json';
import { routing } from './routing';

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
const COUNT_WITH_NO_NOUN: readonly string[] = ['report.error.tooLong'];

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
      .map(({ key }) => key);
    expect(uninflected, uninflected.join('\n')).toEqual([...COUNT_WITH_NO_NOUN]);
  });

  it('have no empty strings', () => {
    const empty = koKeys
      .concat(enKeys)
      .filter((key) => valueAt(ko as Tree, key) === '' || valueAt(en as Tree, key) === '');
    expect([...new Set(empty)]).toEqual([]);
  });
});
