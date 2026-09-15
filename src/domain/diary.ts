import type { ContentLocale, DiaryDocument, DiaryEntry, Locale } from './types';
import type { Poi, Route } from './snapshot-schema';
import { getPersona } from './personas';

/**
 * Every word this document puts on a page, handed in by the caller.
 *
 * The domain layer holds no message file, and the printed record used to hold the
 * Korean inline — so /en/diary/print rendered an English page around a Korean
 * document, and the .txt export was Korean whatever the visitor had chosen. The
 * labels come from the same message files as the screen that produced the record.
 */
export interface DiaryLabels {
  title: string;
  notSelected: string;
  cognitive: string;
  visitedLabel: string;
  visited: string;
  notVisited: string;
  designation: string;
  address: string;
  routeGuide: string;
  evidenceLevel: string;
  accessibilityNote: string;
  date: string;
  companions: string;
  memo: string;
  sources: string;
  done: string;
  notDone: string;
}

/**
 * Builds the *content* of the trip record. Rendering is the caller's job — the
 * print page, the text route and the GPX route all consume this one shape, so the
 * three exports cannot disagree about what the trip was.
 */
export function buildDiaryDocument(
  entry: DiaryEntry,
  snapshot: { pois: readonly Poi[]; routes: readonly Route[] },
  labels: DiaryLabels,
  locale: Locale,
): DiaryDocument {
  const personaLabels =
    entry.personaIds.length === 0
      ? [labels.notSelected]
      : entry.personaIds.map((id) =>
          locale === 'ko' ? getPersona(id).labelKo : getPersona(id).labelEn,
        );
  if (entry.cognitiveOption && entry.personaIds.includes('P3')) {
    personaLabels.push(labels.cognitive);
  }

  const attributions = new Set<string>();
  attributions.add('출처: 한국관광공사 TourAPI (https://api.visitkorea.or.kr/)');

  const sections = entry.places.map((place) => {
    const poi = snapshot.pois.find((p) => p.slug === place.poiSlug);
    const photo = poi?.media.find((m) => m.kind === 'photo') ?? poi?.media[0] ?? null;
    if (photo) attributions.add(photo.attribution);

    const route = snapshot.routes.find((r) => r.poiSlug === place.poiSlug);
    const lines: Array<{ label: string; value: string }> = [
      { label: labels.visitedLabel, value: place.visited ? labels.visited : labels.notVisited },
    ];
    // The designation name and the evidence note exist in Korean only — they are
    // quotations from the Korea Heritage Service and from our own route file, not
    // interface text — so they keep a lang attribute's worth of honesty by staying
    // as written rather than being half-translated.
    if (poi?.heritageLabel) lines.push({ label: labels.designation, value: poi.heritageLabel });
    const address = poi?.i18n[locale as ContentLocale]?.addr ?? poi?.i18n.ko?.addr;
    if (address) lines.push({ label: labels.address, value: address });
    if (route) {
      lines.push({ label: labels.routeGuide, value: route.title });
      lines.push({ label: labels.evidenceLevel, value: route.evidenceNote });
    }
    if (place.accessibilityNote.trim() !== '') {
      lines.push({ label: labels.accessibilityNote, value: place.accessibilityNote.trim() });
    }

    return {
      heading: place.title,
      photoUrl: photo?.url ?? null,
      lines,
      steps: place.steps,
      memo: place.memo.trim() === '' ? null : place.memo.trim(),
    };
  });

  return {
    title: labels.title,
    dateLabel: entry.date,
    personaLabels,
    sections,
    attributions: Array.from(attributions),
  };
}

/**
 * Plain text export. No markup, no table drawing, no emoji: it is meant to be
 * pasted into a notes app or an email, or carried to another device.
 * It is not a braille channel — accessible HTML already is that.
 */
export function diaryToText(doc: DiaryDocument, labels: DiaryLabels): string {
  const lines: string[] = [
    doc.title,
    `${labels.date}: ${doc.dateLabel}`,
    `${labels.companions}: ${doc.personaLabels.join(', ')}`,
    '',
  ];
  for (const section of doc.sections) {
    lines.push(`[${section.heading}]`);
    for (const line of section.lines) lines.push(`${line.label}: ${line.value}`);
    for (const step of section.steps) {
      lines.push(`${step.done ? labels.done : labels.notDone} ${step.seq}. ${step.title}`);
    }
    if (section.memo) lines.push(`${labels.memo}: ${section.memo}`);
    lines.push('');
  }
  lines.push(`--- ${labels.sources} ---`);
  for (const attribution of doc.attributions) lines.push(attribution);
  return `${lines.join('\n')}\n`;
}

export function diaryCoords(entry: DiaryEntry): Array<{ lat: number; lng: number; name: string }> {
  return entry.places.flatMap((place) => place.coords);
}
