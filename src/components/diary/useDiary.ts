'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { DiaryEntry, PersonaId } from '@/domain/types';
import { PERSONA_IDS } from '@/domain/types';
import { useHydrated } from '@/components/useClientValue';

const STORAGE_KEY = 'modu-baekje.diary.v1';
const CHANGE_EVENT = 'modu-baekje:diary';
/** The only version this build writes. Any other value reads as an empty record. */
const SCHEMA_VERSION = 1;

type DiaryPlace = DiaryEntry['places'][number];

/**
 * The server snapshot, and the value returned when the record cannot be read at
 * all. `date` is empty rather than today: a date computed during a server render
 * is the server's day, not the visitor's.
 */
const EMPTY_ENTRY: DiaryEntry = {
  schemaVersion: SCHEMA_VERSION,
  date: '',
  personaIds: [],
  cognitiveOption: false,
  places: [],
};

/**
 * Derived exactly as useToday() derives it, so no two screens disagree about which
 * day it is. That means UTC, which before 09:00 in Seoul is still yesterday — the
 * visitor can change the date, and every export takes it from the record.
 * Called only from readSnapshot(), which never runs on the server.
 */
function newEntry(): DiaryEntry {
  return { ...EMPTY_ENTRY, date: new Date().toISOString().slice(0, 10) };
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toStep(value: unknown): DiaryPlace['steps'] {
  const step = value as Record<string, unknown> | null;
  if (!step || typeof step.seq !== 'number' || typeof step.title !== 'string') return [];
  return [{ seq: step.seq, title: step.title, done: step.done === true }];
}

function toCoord(value: unknown): DiaryPlace['coords'] {
  const coord = value as Record<string, unknown> | null;
  if (!coord || typeof coord.lat !== 'number' || typeof coord.lng !== 'number') return [];
  return [{ lat: coord.lat, lng: coord.lng, name: asString(coord.name) }];
}

function toPlace(value: unknown): DiaryPlace[] {
  const place = value as Record<string, unknown> | null;
  if (!place || typeof place.poiSlug !== 'string' || place.poiSlug === '') return [];
  return [
    {
      poiSlug: place.poiSlug,
      title: asString(place.title) || place.poiSlug,
      visited: place.visited === true,
      steps: Array.isArray(place.steps) ? place.steps.flatMap(toStep) : [],
      memo: asString(place.memo),
      accessibilityNote: asString(place.accessibilityNote),
      coords: Array.isArray(place.coords) ? place.coords.flatMap(toCoord) : [],
    },
  ];
}

/**
 * A record this build did not write is not guessed at — an unknown or missing
 * schemaVersion reads as a new record, so a stored shape from another version can
 * never crash the screen. Within version 1 each field is checked too: the value
 * comes from storage the visitor can edit by hand.
 */
function parse(raw: string | null): DiaryEntry {
  if (raw === null) return newEntry();
  try {
    const value = JSON.parse(raw) as Record<string, unknown> | null;
    if (!value || value.schemaVersion !== SCHEMA_VERSION) return newEntry();
    const personaIds = Array.isArray(value.personaIds)
      ? value.personaIds.filter((id): id is PersonaId => (PERSONA_IDS as readonly string[]).includes(id))
      : [];
    return {
      schemaVersion: SCHEMA_VERSION,
      // Kept as stored, empty included: replacing an empty date with today would
      // fight the visitor mid-edit, because a date input reports '' between edits.
      date: asString(value.date),
      personaIds,
      // Same rule as useConditions: the option belongs to the family persona.
      cognitiveOption: value.cognitiveOption === true && personaIds.includes('P3'),
      places: Array.isArray(value.places) ? value.places.flatMap(toPlace) : [],
    };
  } catch {
    return newEntry();
  }
}

let cachedRaw: string | null | undefined;
let cachedValue: DiaryEntry = EMPTY_ENTRY;

/**
 * Holds the record when localStorage cannot be written — a private window, or a
 * browser set to block site data. The condition picker can live without this;
 * this screen cannot, because it is a form: every keystroke would revert to the
 * last readable value. Lives as long as the page, and is dropped again as soon as
 * a write succeeds.
 */
let memoryEntry: DiaryEntry | null = null;

function readSnapshot(): DiaryEntry {
  if (memoryEntry !== null) return memoryEntry;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY_ENTRY;
  }
  // getSnapshot must return the same reference until the stored text changes, or
  // React re-renders without end: parse() hands back a new object every call.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

function serverSnapshot(): DiaryEntry {
  return EMPTY_ENTRY;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/**
 * The trip record, held in this browser only and never posted to a server
 * (docs/spec/07_screens.md S9 rule 1).
 *
 * `loaded` is part of the contract: until hydration finishes the value is the
 * empty record, and a form rendered from it would blank every field the visitor
 * had already written.
 */
export function useDiary(): {
  entry: DiaryEntry;
  loaded: boolean;
  setEntry: (next: DiaryEntry) => void;
} {
  const entry = useSyncExternalStore(subscribe, readSnapshot, serverSnapshot);
  const loaded = useHydrated();

  const setEntry = useCallback((next: DiaryEntry) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      memoryEntry = null;
    } catch {
      memoryEntry = next;
    }
    // Same-tab listeners never receive the storage event.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { entry, loaded, setEntry };
}
