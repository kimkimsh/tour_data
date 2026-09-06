import type { GapFillRow, GapReport, GapRow, PersonaId, SuitabilityFactInput } from './types';
import { CAPABILITIES, catalogueIndex, getCapability } from './capabilities';
import { PERSONAS, gradeFor } from './personas';

export interface GapFact extends SuitabilityFactInput {
  poiSlug: string;
}

const CRITICAL_SOMEWHERE = new Set(
  CAPABILITIES.filter((c) =>
    PERSONAS.some((p) => gradeFor(p.id as PersonaId, c.code) === 'critical'),
  ).map((c) => c.code),
);

/**
 * Priority = impact x severity x feasibility.
 *
 * feasibility treats "cause unknown" and "operator has not filled it in" alike,
 * because the officer's first action is the same in both cases: check this cell
 * and fill it. What differs is whether *we* know the cause, and the report's
 * cause column says that — the priority number does not.
 */
function impactOf(capabilityCode: string): number {
  return CRITICAL_SOMEWHERE.has(capabilityCode) ? 1.0 : 0.5;
}

function severityOf(status: SuitabilityFactInput['status']): number {
  // Not knowing is more urgent than knowing it is absent: absence needs
  // construction, a blank needs one check.
  return status === 'unknown' ? 1.0 : 0.2;
}

function feasibilityOf(absenceKind: SuitabilityFactInput['absenceKind']): number | null {
  switch (absenceKind) {
    case null:
    case 'operator_missing':
      return 1.0;
    case 'intrinsic':
      return 0.1;
    case 'not_applicable':
    case 'not_registered':
      return null;
  }
}

/**
 * The accessibility snapshot holds a row only for what ingest actually wrote, so a
 * place added to pois.json before the next accessibility run has no rows at all, and
 * a place whose snapshot predates a catalogue addition is missing that code. The
 * place page fills those gaps as unknown (suitability.normaliseFacts) — this does
 * the same, from the same catalogue, so spec 6.7's claim that the two screens cannot
 * disagree on the denominator holds by construction rather than by coincidence.
 */
function fillCatalogue(
  facts: ReadonlyArray<GapFact>,
  poiSlugs: ReadonlyArray<string>,
): ReadonlyArray<GapFact> {
  const present = new Set(facts.map((f) => `${f.poiSlug}\u0000${f.capabilityCode}`));
  const filled: GapFact[] = facts.slice();
  for (const poiSlug of poiSlugs) {
    for (const capability of CAPABILITIES) {
      if (present.has(`${poiSlug}\u0000${capability.code}`)) continue;
      filled.push({
        poiSlug,
        capabilityCode: capability.code,
        status: 'unknown',
        absenceKind: null,
        source: capability.ktoField === null ? 'derived' : 'kto_with',
        isKtoScored: capability.ktoField !== null,
        verifiedAt: null,
        detail: null,
      });
    }
  }
  return filled;
}

/**
 * `knownPoiSlugs` is the authoritative place list, normally every slug in the pois
 * snapshot. Passing it is what lets a place with no accessibility rows at all still
 * appear in the fill table as 0 filled / 22 unknown, instead of vanishing from the
 * municipal report.
 */
export function computeGapReport(
  rawFacts: ReadonlyArray<GapFact>,
  knownPoiSlugs?: ReadonlyArray<string>,
): GapReport {
  const poiSlugs = Array.from(
    new Set([...(knownPoiSlugs ?? []), ...rawFacts.map((f) => f.poiSlug)]),
  );
  const facts = fillCatalogue(rawFacts, poiSlugs);

  const notRegisteredPoiSlugs = poiSlugs.filter((slug) =>
    facts.some((f) => f.poiSlug === slug && f.absenceKind === 'not_registered'),
  );

  const fill: GapFillRow[] = poiSlugs.map((poiSlug) => {
    const scored = facts.filter(
      (f) => f.poiSlug === poiSlug && f.isKtoScored && f.absenceKind !== 'not_applicable',
    );
    const unknown = scored.filter((f) => f.status === 'unknown').length;
    const known = scored.filter((f) => f.status !== 'unknown');
    return {
      poiSlug,
      ktoFilled: known.filter((f) => f.source === 'kto_with').length,
      curatedFilled: known.filter((f) => f.source !== 'kto_with').length,
      unknown,
      ktoTotal: scored.length,
    };
  });

  const unknownCountByPoi = new Map(fill.map((row) => [row.poiSlug, row.unknown]));

  const priorities: GapRow[] = [];
  for (const fact of facts) {
    if (notRegisteredPoiSlugs.includes(fact.poiSlug)) continue;
    if (fact.status !== 'unknown' && fact.status !== 'unsupported') continue;
    const feasibility = feasibilityOf(fact.absenceKind);
    if (feasibility === null) continue;
    const capability = getCapability(fact.capabilityCode);
    if (!capability) continue;

    const impact = impactOf(fact.capabilityCode);
    const severity = severityOf(fact.status);
    priorities.push({
      poiSlug: fact.poiSlug,
      capabilityCode: fact.capabilityCode,
      labelKo: capability.labelKo,
      labelEn: capability.labelEn,
      status: fact.status,
      absenceKind: fact.absenceKind,
      priority: impact * severity * feasibility,
      impact,
      severity,
      feasibility,
      source: fact.source,
      verifiedAt: fact.verifiedAt,
    });
  }

  // Three tie-breakers, so the order is fully determined. Screenshots, the CSV
  // and the golden results must not shuffle between runs.
  priorities.sort(
    (a, b) =>
      b.priority - a.priority ||
      (unknownCountByPoi.get(b.poiSlug) ?? 0) - (unknownCountByPoi.get(a.poiSlug) ?? 0) ||
      catalogueIndex(a.capabilityCode) - catalogueIndex(b.capabilityCode) ||
      a.poiSlug.localeCompare(b.poiSlug),
  );

  return { fill, priorities, notRegisteredPoiSlugs };
}

export const GAP_CSV_HEADER = [
  '관광지',
  '항목코드',
  '항목명',
  '상태',
  '부재유형',
  '우선순위',
  '출처',
  '확인일',
] as const;

const STATUS_LABEL_KO: Record<SuitabilityFactInput['status'], string> = {
  supported: '확인됨',
  partial: '일부 가능',
  unsupported: '이용 불가',
  unknown: '정보 없음',
};

/**
 * Must stay identical to common.status.* in messages/en.json — the same four states
 * are rendered from both, on screens a reader moves between. They disagreed:
 * `unknown` was "No information" here and "Unknown" there.
 *
 * The set separates two axes on purpose. Available / Partly available / Not available
 * describe the facility; "Not known" describes our information. "Not available" and
 * "No information" both start with a negation and read as synonyms, which is the one
 * confusion the Korean (이용 불가 / 정보 없음) never had.
 */
const STATUS_LABEL_EN: Record<SuitabilityFactInput['status'], string> = {
  supported: 'Available',
  partial: 'Partly available',
  unsupported: 'Not available',
  unknown: 'Not known',
};

const ABSENCE_LABEL_KO: Record<string, string> = {
  intrinsic: '구조 제약(확인됨)',
  operator_missing: '미입력(확인됨)',
  not_applicable: '해당 없음',
  not_registered: '데이터셋 미등록',
};

export function absenceLabelKo(absenceKind: SuitabilityFactInput['absenceKind']): string {
  if (absenceKind === null) return '원인 미확인';
  return ABSENCE_LABEL_KO[absenceKind] ?? '원인 미확인';
}

/**
 * No "(confirmed)" suffix. It was internal provenance leaking into the UI, it
 * collided with "Confirmed" as a status word, and the legend in messages/en.json
 * spelled the same idea "(established)" — one concept, two English words, both on the
 * same screen.
 */
const ABSENCE_LABEL_EN: Record<string, string> = {
  intrinsic: 'Structural constraint',
  operator_missing: 'Not entered by the operator',
  not_applicable: 'Not applicable',
  not_registered: 'Not in the source data',
};

export function statusLabelKo(status: SuitabilityFactInput['status']): string {
  return STATUS_LABEL_KO[status];
}

/**
 * The gap report ships in both locales, and the status and cause columns used to be
 * Korean on /en with no lang attribute — an English screen reader voice reading
 * Korean text produces phonemes, not words.
 */
export function statusLabel(status: SuitabilityFactInput['status'], locale: string): string {
  return locale === 'ko' ? STATUS_LABEL_KO[status] : STATUS_LABEL_EN[status];
}

export function absenceLabel(absenceKind: SuitabilityFactInput['absenceKind'], locale: string): string {
  if (locale === 'ko') return absenceLabelKo(absenceKind);
  if (absenceKind === null) return 'Cause not established';
  return ABSENCE_LABEL_EN[absenceKind] ?? 'Cause not established';
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function gapRowsToCsv(rows: ReadonlyArray<GapRow>, poiTitles: Record<string, string>): string {
  const lines = [GAP_CSV_HEADER.join(',')];
  for (const row of rows) {
    lines.push(
      [
        csvCell(poiTitles[row.poiSlug] ?? row.poiSlug),
        csvCell(row.capabilityCode),
        csvCell(row.labelKo),
        csvCell(statusLabelKo(row.status)),
        csvCell(absenceLabelKo(row.absenceKind)),
        row.priority.toFixed(2),
        csvCell(row.source),
        csvCell(row.verifiedAt ?? ''),
      ].join(','),
    );
  }
  // Excel opens a UTF-8 CSV as mojibake without a byte-order mark, and this file
  // is meant to be handed to a municipal officer who will open it in Excel.
  return `﻿${lines.join('\r\n')}\r\n`;
}
