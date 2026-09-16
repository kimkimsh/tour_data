'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * The text for a polite live region, and the one call that replaces it.
 *
 * A live region says nothing when the new text equals the text it already holds, so
 * pressing the same button twice announced once. The alternating trailing no-break
 * space is what makes the second message differ: it is not spoken, and unlike a plain
 * space it survives the whitespace normalisation a reader applies before comparing.
 *
 * It exists as a hook because the three screens that need it were solving it three
 * ways, and two of them appended `new Date().toLocaleTimeString()` — a clock read out
 * to the visitor, in whatever language the device was set to, after every action.
 *
 * Pair it with one LiveRegion mounted outside whatever branch the screen swaps, or
 * the region is replaced by the content it was going to announce and says nothing.
 */
export function useAnnouncer(): {
  announcement: string;
  announce: (text: string) => void;
} {
  const [announcement, setAnnouncement] = useState('');
  const count = useRef(0);

  const announce = useCallback((text: string) => {
    count.current += 1;
    setAnnouncement(count.current % 2 === 0 ? `${text} ` : text);
  }, []);

  return { announcement, announce };
}
