'use client';

import { useSyncExternalStore } from 'react';

/**
 * Two values that only exist in the browser: whether hydration has happened, and
 * today's date.
 *
 * Both are read through useSyncExternalStore rather than an effect that calls
 * setState. The server snapshot renders first, the client snapshot replaces it right
 * after hydration, and React handles the switch — which is the whole reason the
 * hook exists. Setting state inside an effect to do the same thing schedules an
 * extra render pass and is what react-hooks/set-state-in-effect is pointing at.
 */
function subscribeNever(): () => void {
  // Neither value changes while the page is open. A date that rolls over at
  // midnight during a session is not worth a timer: the score would shift under a
  // reader mid-sentence, and a reload fixes it.
  return () => {};
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

/** ISO date, or null until hydration. Feeds calculationDate, which the domain requires. */
export function useToday(): string | null {
  return useSyncExternalStore(
    subscribeNever,
    // A new string each call, but Object.is compares strings by value, so React
    // sees a stable snapshot.
    () => new Date().toISOString().slice(0, 10),
    () => null,
  );
}
