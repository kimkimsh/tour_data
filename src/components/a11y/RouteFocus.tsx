'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Moves focus on route change. The App Router does not do this, so a keyboard or
 * screen-reader user stays parked on the link they just followed.
 *
 * Focus goes to the new page's h1 when there is one, so the heading text is read.
 * An off-screen aria-hidden target would be focusable and announce nothing.
 *
 * Nothing is announced here on purpose: Next already renders a route announcer
 * that reads the document title, and a second live region would say it twice.
 */
export function RouteFocus() {
  const pathname = usePathname();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const target =
      document.querySelector<HTMLElement>('main h1') ??
      document.getElementById('main-content');
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.setAttribute('data-route-focus', '');
    target.focus();
  }, [pathname]);

  return null;
}
