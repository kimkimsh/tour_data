'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { BudgetMode, PersonaId } from '@/domain/types';
import { BUDGET_MODES, PERSONA_IDS } from '@/domain/types';

const STORAGE_KEY = 'modu-baekje.conditions.v1';
const CHANGE_EVENT = 'modu-baekje:conditions';

export interface Conditions {
  personaIds: PersonaId[];
  cognitiveOption: boolean;
  budgetMode: BudgetMode;
}

export const DEFAULT_CONDITIONS: Conditions = {
  personaIds: [],
  cognitiveOption: false,
  budgetMode: 'full_day',
};

function parse(raw: string | null): Conditions {
  if (!raw) return DEFAULT_CONDITIONS;
  try {
    const value = JSON.parse(raw) as Partial<Conditions>;
    const personaIds = Array.isArray(value.personaIds)
      ? value.personaIds.filter((id): id is PersonaId => (PERSONA_IDS as readonly string[]).includes(id))
      : [];
    const budgetMode = (BUDGET_MODES as readonly string[]).includes(value.budgetMode ?? '')
      ? (value.budgetMode as BudgetMode)
      : DEFAULT_CONDITIONS.budgetMode;
    return {
      personaIds,
      // The cognitive option belongs to the family persona; on its own it has
      // nothing to modify and would silently change the itinerary arithmetic.
      cognitiveOption: Boolean(value.cognitiveOption) && personaIds.includes('P3'),
      budgetMode,
    };
  } catch {
    return DEFAULT_CONDITIONS;
  }
}

/**
 * localStorage is an external store, so it is read through useSyncExternalStore.
 *
 * The cache matters: getSnapshot must return a referentially stable value or React
 * re-renders forever, and JSON.parse hands back a new object every call. The cache
 * is keyed on the raw string, so it only rebuilds when the stored text changes.
 */
let cachedRaw: string | null | undefined;
let cachedValue: Conditions = DEFAULT_CONDITIONS;
/** Set only when localStorage refuses to write; keeps the choice for this page view. */
let memoryFallback: Conditions | null = null;

function readSnapshot(): Conditions {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // A private window and blocked site data both throw on access.
    return memoryFallback ?? DEFAULT_CONDITIONS;
  }
  if (memoryFallback !== null) return memoryFallback;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

function serverSnapshot(): Conditions {
  return DEFAULT_CONDITIONS;
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
 * The chosen conditions, kept in this browser only.
 *
 * `loaded` stays part of the contract: until hydration finishes the value is the
 * default, and a screen that renders a verdict from the default would be showing a
 * verdict for conditions the visitor did not choose.
 */
export function useConditions(): {
  conditions: Conditions;
  loaded: boolean;
  setConditions: (next: Conditions) => void;
} {
  const conditions = useSyncExternalStore(subscribe, readSnapshot, serverSnapshot);
  const loaded = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const setConditions = useCallback((next: Conditions) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      memoryFallback = null;
    } catch {
      // Storage refused the write. The choice still applies until the page reloads.
      memoryFallback = next;
    }
    // Same-tab listeners never receive the storage event.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { conditions, loaded, setConditions };
}
