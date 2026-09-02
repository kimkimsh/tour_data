import type { DiaryDocument, DiaryEntry } from './types';
import type { Poi, Route } from './snapshot-schema';
import { getPersona } from './personas';

const PERSONA_LABEL_FALLBACK = '조건 미선택';

/**
 * Builds the *content* of the trip record. Rendering is the caller's job — the
 * print page, the text route and the GPX route all consume this one shape, so the
 * three exports cannot disagree about what the trip was.
 */
export function buildDiaryDocument(
  entry: DiaryEntry,
  snapshot: { pois: readonly Poi[]; routes: readonly Route[] },
): DiaryDocument {
  const personaLabels =
    entry.personaIds.length === 0
      ? [PERSONA_LABEL_FALLBACK]
      : entry.personaIds.map((id) => getPersona(id).labelKo);
  if (entry.cognitiveOption && entry.personaIds.includes('P3')) {
    personaLabels.push('인지·발달 친화');
  }

  const attributions = new Set<string>();
  attributions.add('출처: 한국관광공사 TourAPI (https://api.visitkorea.or.kr/)');

  const sections = entry.places.map((place) => {
    const poi = snapshot.pois.find((p) => p.slug === place.poiSlug);
    const photo = poi?.media.find((m) => m.kind === 'photo') ?? poi?.media[0] ?? null;
    if (photo) attributions.add(photo.attribution);

    const route = snapshot.routes.find((r) => r.poiSlug === place.poiSlug);
    const lines: Array<{ label: string; value: string }> = [
      { label: '방문', value: place.visited ? '방문함' : '방문하지 않음' },
    ];
    if (poi?.heritageLabel) lines.push({ label: '지정', value: poi.heritageLabel });
    const address = poi?.i18n.ko?.addr;
    if (address) lines.push({ label: '주소', value: address });
    if (route) {
      lines.push({ label: '경로 안내', value: route.title });
      lines.push({ label: '근거 수준', value: route.evidenceNote });
    }
    if (place.accessibilityNote.trim() !== '') {
      lines.push({ label: '접근성 한 줄', value: place.accessibilityNote.trim() });
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
    title: '나의 백제 여행 기록',
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
export function diaryToText(doc: DiaryDocument): string {
  const lines: string[] = [doc.title, `날짜: ${doc.dateLabel}`, `동행 조건: ${doc.personaLabels.join(', ')}`, ''];
  for (const section of doc.sections) {
    lines.push(`[${section.heading}]`);
    for (const line of section.lines) lines.push(`${line.label}: ${line.value}`);
    for (const step of section.steps) {
      lines.push(`${step.done ? '완료' : '미완료'} ${step.seq}. ${step.title}`);
    }
    if (section.memo) lines.push(`메모: ${section.memo}`);
    lines.push('');
  }
  lines.push('--- 출처 ---');
  for (const attribution of doc.attributions) lines.push(attribution);
  return `${lines.join('\n')}\n`;
}

export function diaryCoords(entry: DiaryEntry): Array<{ lat: number; lng: number; name: string }> {
  return entry.places.flatMap((place) => place.coords);
}
