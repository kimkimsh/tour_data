/**
 * Runs before `next build`. Two jobs, both of which can fail on today's data:
 *
 *  1. Every pair in tokens.json meets its minimum contrast ratio, in BOTH themes.
 *     The minimum differs by token role — body text 4.5:1, large text and UI
 *     boundaries 3:1 — so checking everything at 4.5 would fail the tokens that
 *     were deliberately built to the large-text rule.
 *  2. globals.css declares the same hex for every token. The value has to exist
 *     in two places (a JSON the script reads, a CSS the browser reads), so the
 *     disagreement between them is what gets checked.
 *
 * Ratios are never hard-coded here. Values written down in a document drifted
 * from the real arithmetic once already, so this recomputes from the hex.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS_PATH = join(ROOT, 'src/styles/tokens.json');
const CSS_PATH = join(ROOT, 'src/app/globals.css');

interface Tokens {
  light: Record<string, string>;
  dark: Record<string, string>;
  checks: Array<{ fg: string; bg: string; min: number; note: string }>;
}

function channelToLinear(value: number): number {
  const c = value / 255;
  // 0.03928 is the threshold axe-core uses. Matching it keeps this script and the
  // axe scan from disagreeing about a borderline pair.
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a 6-digit hex colour: ${hex}`);
  const int = Number.parseInt(m[1]!, 16);
  const r = channelToLinear((int >> 16) & 0xff);
  const g = channelToLinear((int >> 8) & 0xff);
  const b = channelToLinear(int & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/** Truncates rather than rounds: 4.4996 fails 4.5. */
function floor2(value: number): number {
  return Math.floor(value * 100) / 100;
}

function readCssTokens(css: string, blockMarker: string): Map<string, string> {
  const start = css.indexOf(blockMarker);
  if (start === -1) throw new Error(`marker not found in globals.css: ${blockMarker}`);
  const end = css.indexOf('/* end', start);
  const block = css.slice(start, end === -1 ? undefined : end);
  const found = new Map<string, string>();
  for (const match of block.matchAll(/--color-([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    found.set(match[1]!, match[2]!.toUpperCase());
  }
  return found;
}

const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf8')) as Tokens;
const css = readFileSync(CSS_PATH, 'utf8');
const failures: string[] = [];

for (const theme of ['light', 'dark'] as const) {
  const palette = tokens[theme];
  for (const check of tokens.checks) {
    const fg = palette[check.fg];
    const bg = palette[check.bg];
    if (!fg || !bg) {
      failures.push(`${theme}: token missing for ${check.fg} on ${check.bg}`);
      continue;
    }
    const ratio = floor2(contrastRatio(fg, bg));
    if (ratio < check.min) {
      failures.push(
        `${theme}: ${check.fg} (${fg}) on ${check.bg} (${bg}) is ${ratio.toFixed(2)}:1, needs ${check.min}:1 — ${check.note}`,
      );
    }
  }
}

const cssLight = readCssTokens(css, '/* tokens: light */');
const cssDark = readCssTokens(css, '/* tokens: dark */');

for (const [theme, declared, expected] of [
  ['light', cssLight, tokens.light],
  ['dark', cssDark, tokens.dark],
] as const) {
  for (const [name, hex] of Object.entries(expected)) {
    const inCss = declared.get(name);
    if (!inCss) {
      failures.push(`${theme}: globals.css does not declare --color-${name}`);
    } else if (inCss !== hex.toUpperCase()) {
      failures.push(
        `${theme}: --color-${name} is ${inCss} in globals.css but ${hex.toUpperCase()} in tokens.json`,
      );
    }
  }
  for (const name of declared.keys()) {
    if (!(name in expected)) {
      failures.push(`${theme}: globals.css declares --color-${name}, which tokens.json does not define`);
    }
  }
}

if (failures.length > 0) {
  console.error('contrast check failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const pairCount = tokens.checks.length * 2;
console.log(`contrast check passed: ${pairCount} pairs, ${cssLight.size + cssDark.size} tokens mirrored`);
