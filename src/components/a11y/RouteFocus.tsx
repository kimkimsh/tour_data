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
  // The path this component was mounted at, not a "have I run yet" flag. React runs
  // an effect twice on mount in development, and a boolean guard flips on the first
  // pass and lets the second one through — so every fresh page load put a focus ring
  // around its own h1 before the reader had touched anything. Comparing paths cannot
  // be fooled by a repeated run, because the path has not changed.
  const focusedFor = useRef(pathname);

  useEffect(() => {
    if (focusedFor.current === pathname) return;
    focusedFor.current = pathname;
    const target =
      document.querySelector<HTMLElement>('main h1') ??
      document.getElementById('main-content');
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.setAttribute('data-route-focus', '');
    target.focus();
    // Dropped on blur so the ring belongs to this one arrival. Left in place, a later
    // mouse click on the heading would draw a keyboard focus ring.
    target.addEventListener('blur', () => target.removeAttribute('data-route-focus'), {
      once: true,
    });
  }, [pathname]);

  return null;
}
