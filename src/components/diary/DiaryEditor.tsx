'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getPersona } from '@/domain/personas';
import type { DiaryEntry } from '@/domain/types';
import { Eyebrow } from '@/components/Eyebrow';
import { LiveRegion } from '@/components/a11y/LiveRegion';
import { useConditions } from '@/components/persona/usePersona';
import { useDiary } from './useDiary';

/** What one place block needs to exist. Assembled on the server from the snapshots. */
export interface DiaryPlaceOption {
  slug: string;
  title: string;
  steps: Array<{ seq: number; title: string }>;
  /** The place itself, then every route step that carries a coordinate: the GPX track. */
  coords: Array<{ lat: number; lng: number; name: string }>;
}

type DiaryPlace = DiaryEntry['places'][number];

const BYTES_PER_KB = 1024;
/** Mirrors the cap /api/export/* rejects a body over. */
const MEMO_MAX_LENGTH = 4000;
/** The one-liner is handed to the report form, which refuses anything longer. */
const NOTE_MAX_LENGTH = 500;
/** One <wpt> plus one <trkpt> with a name, near enough for a "roughly this big" hint. */
const GPX_BYTES_PER_POINT = 150;
const GPX_BYTES_HEADER = 450;

/**
 * Reads the Content-Disposition the export route set, so the file the visitor gets
 * is named by the route rather than by a second copy of the name kept here.
 */
function filenameFrom(disposition: string | null): string | null {
  if (disposition === null) return null;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (encoded?.[1]) return decodeURIComponent(encoded[1]);
  const ascii = /filename="([^"]+)"/i.exec(disposition);
  return ascii?.[1] ?? null;
}

function kilobytes(bytes: number): number {
  return Math.max(1, Math.round(bytes / BYTES_PER_KB));
}

/**
 * The trip record editor. Everything it writes goes to this browser only.
 *
 * The companion conditions are not asked for again: they are whatever S1 holds, and
 * they are stamped into the record on every write. A record therefore carries the
 * conditions in force when it was last edited, which is what a record of a past trip
 * should say.
 */
export function DiaryEditor({ options }: { options: DiaryPlaceOption[] }) {
  const t = useTranslations('diary');
  const tc = useTranslations('common');
  // Shared with S5 on purpose: the same file, described the same way in both places.
  const tr = useTranslations('routeGuide');
  const locale = useLocale();
  const { entry, loaded, setEntry } = useDiary();
  const { conditions, loaded: conditionsLoaded } = useConditions();
  const [announcement, setAnnouncement] = useState('');
  const [chosenSlug, setChosenSlug] = useState('');
  const announcementCount = useRef(0);
  const lastObjectUrl = useRef<string | null>(null);
  const groupId = useId();

  const announce = useCallback((text: string) => {
    announcementCount.current += 1;
    // A live region says nothing when the new text equals the text it already holds.
    // The trailing no-break space is not spoken, and unlike a plain space it survives
    // whitespace normalisation, so two identical messages in a row still differ.
    setAnnouncement(announcementCount.current % 2 === 0 ? `${text} ` : text);
  }, []);

  const update = useCallback(
    (next: DiaryEntry) => {
      setEntry({
        ...next,
        personaIds: conditions.personaIds,
        cognitiveOption: conditions.cognitiveOption,
      });
    },
    [conditions.cognitiveOption, conditions.personaIds, setEntry],
  );

  const download = useCallback(
    async (kind: 'text' | 'gpx', fallbackName: string) => {
      let response: Response;
      try {
        response = await fetch(`/api/export/${kind}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(entry),
        });
      } catch {
        announce(t('exportFailed'));
        return;
      }
      if (!response.ok) {
        announce(t('exportFailed'));
        return;
      }

      const url = URL.createObjectURL(await response.blob());
      // Revoking straight after click cancels the download in some browsers, so the
      // previous URL is released when the next export replaces it instead.
      if (lastObjectUrl.current !== null) URL.revokeObjectURL(lastObjectUrl.current);
      lastObjectUrl.current = url;

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filenameFrom(response.headers.get('content-disposition')) ?? fallbackName;
      // Firefox ignores a click on an anchor that is not in the document.
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    },
    [announce, entry, t],
  );

  if (!loaded || !conditionsLoaded) {
    return (
      <div className="grid gap-8">
        {/* Same position as the region in the loaded branch, so React keeps one DOM
            node across the swap and the message is actually announced. */}
        <LiveRegion message={t('loading')} />
        <p className="card">{t('loading')}</p>
      </div>
    );
  }

  const addedSlugs = new Set(entry.places.map((place) => place.poiSlug));
  const available = options.filter((option) => !addedSlugs.has(option.slug));
  const selected = available.some((option) => option.slug === chosenSlug)
    ? chosenSlug
    : (available[0]?.slug ?? '');

  const companionLabel =
    conditions.personaIds.length === 0
      ? tc('conditionsNone')
      : conditions.personaIds
          .map((id) => (locale === 'ko' ? getPersona(id).labelKo : getPersona(id).labelEn))
          .join(' · ');

  const patchPlace = (slug: string, patch: Partial<DiaryPlace>) => {
    update({
      ...entry,
      places: entry.places.map((place) =>
        place.poiSlug === slug ? { ...place, ...patch } : place,
      ),
    });
  };

  const addPlace = () => {
    const option = options.find((candidate) => candidate.slug === selected);
    if (!option) return;
    update({
      ...entry,
      places: [
        ...entry.places,
        {
          poiSlug: option.slug,
          title: option.title,
          // A record is written about a place the visitor went to; unticking says otherwise.
          visited: true,
          steps: option.steps.map((step) => ({ ...step, done: false })),
          memo: '',
          accessibilityNote: '',
          coords: option.coords,
        },
      ],
    });
    announce(t('announceAdded', { title: option.title, count: entry.places.length + 1 }));
  };

  /**
   * Focus is moved to the place picker, because the button that had focus is the one
   * being removed. Without this the browser drops focus to <body> and a keyboard user
   * starts the page over.
   */
  const removePlace = (place: DiaryPlace) => {
    update({
      ...entry,
      places: entry.places.filter((candidate) => candidate.poiSlug !== place.poiSlug),
    });
    announce(t('announceRemoved', { title: place.title, count: entry.places.length - 1 }));
    document.getElementById(`${groupId}-add`)?.focus();
  };

  const dateMissing = entry.date === '';
  // Both hints say "about". The record's own JSON stands in for the text file rather
  // than building it here, because that would need both snapshots in the browser.
  const textBytes = new TextEncoder().encode(JSON.stringify(entry)).length;
  const gpxPointCount = entry.places.reduce((sum, place) => sum + place.coords.length, 0);

  return (
    <div className="grid gap-8">
      <LiveRegion message={announcement || t('ready')} />
      <div className="card grid gap-4 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <label htmlFor={`${groupId}-date`} className="font-bold">
            {t('date')}
          </label>
          <input
            id={`${groupId}-date`}
            type="date"
            className="field max-w-[14rem]"
            value={entry.date}
            aria-invalid={dateMissing}
            aria-describedby={dateMissing ? `${groupId}-date-error` : undefined}
            onChange={(event) => update({ ...entry, date: event.target.value })}
          />
          {dateMissing ? (
            <p id={`${groupId}-date-error`} className="text-[0.92rem] font-bold">
              {t('dateRequired')}
            </p>
          ) : null}
        </div>

        <div className="grid content-start gap-2">
          <p className="font-bold">{t('companions')}</p>
          <p>{companionLabel}</p>
          <p>
            <Link href="/" className="text-[0.95rem]">
              {tc('changeConditions')}
            </Link>
          </p>
        </div>
      </div>

      {entry.places.length === 0 ? <p className="blank-slot">{t('empty')}</p> : null}

      {entry.places.map((place) => {
        const noteParams = new URLSearchParams({ poi: place.poiSlug });
        if (place.accessibilityNote.trim() !== '') {
          noteParams.set('note', place.accessibilityNote.trim());
        }
        return (
          <section
            key={place.poiSlug}
            className="card grid gap-4"
            aria-labelledby={`${groupId}-${place.poiSlug}-heading`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 id={`${groupId}-${place.poiSlug}-heading`} className="item-head">
                {place.title}
              </h2>
              <button type="button" className="btn" onClick={() => removePlace(place)}>
                {t('removePlace')}
              </button>
            </div>

            <div className="flex min-h-[44px] items-center gap-3">
              <input
                id={`${groupId}-${place.poiSlug}-visited`}
                type="checkbox"
                className="control"
                checked={place.visited}
                onChange={(event) => patchPlace(place.poiSlug, { visited: event.target.checked })}
              />
              <label
                htmlFor={`${groupId}-${place.poiSlug}-visited`}
                className="flex-1 py-1 text-[1.05rem]"
              >
                {t('visited')}
              </label>
            </div>

            {place.steps.length > 0 ? (
              <fieldset className="grid gap-1">
                <legend className="font-bold">{t('stepCheck')}</legend>
                {place.steps.map((step) => (
                  <div key={step.seq} className="flex min-h-[44px] items-center gap-3">
                    <input
                      id={`${groupId}-${place.poiSlug}-step-${step.seq}`}
                      type="checkbox"
                      className="control"
                      checked={step.done}
                      onChange={(event) =>
                        patchPlace(place.poiSlug, {
                          steps: place.steps.map((candidate) =>
                            candidate.seq === step.seq
                              ? { ...candidate, done: event.target.checked }
                              : candidate,
                          ),
                        })
                      }
                    />
                    <label
                      htmlFor={`${groupId}-${place.poiSlug}-step-${step.seq}`}
                      className="flex-1 py-1"
                    >
                      <span className="tabular">{step.seq}.</span> {step.title}
                    </label>
                  </div>
                ))}
              </fieldset>
            ) : null}

            <div className="grid gap-2">
              <label htmlFor={`${groupId}-${place.poiSlug}-memo`} className="font-bold">
                {t('memo')}
              </label>
              <textarea
                id={`${groupId}-${place.poiSlug}-memo`}
                className="field min-h-[6rem]"
                rows={3}
                maxLength={MEMO_MAX_LENGTH}
                value={place.memo}
                onChange={(event) => patchPlace(place.poiSlug, { memo: event.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor={`${groupId}-${place.poiSlug}-note`} className="font-bold">
                {t('accessibilityNote')}
              </label>
              <input
                id={`${groupId}-${place.poiSlug}-note`}
                type="text"
                className="field"
                maxLength={NOTE_MAX_LENGTH}
                value={place.accessibilityNote}
                onChange={(event) =>
                  patchPlace(place.poiSlug, { accessibilityNote: event.target.value })
                }
              />
              {/* The loop this screen exists for: what one visitor wrote down becomes
                  the report the next visitor reads. */}
              <p>
                <Link href={`/report?${noteParams.toString()}`} className="btn">
                  {t('reportThis')}
                </Link>
              </p>
            </div>
          </section>
        );
      })}

      <div className="card grid gap-3">
        <label htmlFor={`${groupId}-add`} className="font-bold">
          {t('addPlaceSelect')}
        </label>
        {available.length === 0 ? (
          <p className="blank-slot">{t('allAdded')}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {/* A native select, not a listbox widget: on a phone with a screen reader
                it is the picker that behaves, and it needs no keyboard code of ours. */}
            <select
              id={`${groupId}-add`}
              className="field max-w-[20rem]"
              value={selected}
              onChange={(event) => setChosenSlug(event.target.value)}
            >
              {available.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.title}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn--filled" onClick={addPlace}>
              {t('addPlace')}
            </button>
          </div>
        )}
      </div>

      <section aria-labelledby={`${groupId}-exports`} className="grid gap-3">
        <Eyebrow as="h2" id={`${groupId}-exports`}>{t('exports')}</Eyebrow>
        <p className="flex flex-wrap gap-3">
          <Link href="/diary/print" className="btn">
            {t('openPrint')}
          </Link>
          <button
            type="button"
            className="btn"
            onClick={() => void download('text', 'trip-record.txt')}
          >
            {t('exportText')}
            <span className="font-normal text-[0.85rem]">
              {t('exportTextHint', { size: kilobytes(textBytes) })}
            </span>
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void download('gpx', 'trip-record.gpx')}
          >
            {t('exportGpx')}
            <span className="font-normal text-[0.85rem]">
              {tr('gpxFileNote', {
                size: kilobytes(GPX_BYTES_HEADER + gpxPointCount * GPX_BYTES_PER_POINT),
              })}
            </span>
          </button>
        </p>
        <p className="text-[0.92rem] text-[var(--color-ink-2)]">{t('printHint')}</p>
      </section>

    </div>
  );
}
