import Link from 'next/link';
import './globals.css';
import koMessages from '../../messages/ko.json';

/**
 * The screen for an address that names nothing.
 *
 * It renders its own document. Every route in this app lives under a route group
 * with its own root layout — (site), (admin), (print) — so there is no app/layout.tsx
 * for Next to wrap a not-found render in, and without this file the answer is Next's
 * built-in error document: no lang attribute, no heading, no text. A blank page to a
 * sighted reader and silence to a screen reader, on a service whose audience is
 * disabled visitors.
 *
 * Korean only, and no locale switch. A 404 has no route params, so there is no locale
 * to read; the links go to the Korean tree, which is the default the middleware sends
 * an unprefixed visitor to anyway.
 */
export const metadata = {
  title: `${koMessages.common.error.notFoundTitle} · ${koMessages.common.siteName}`,
};

export default function NotFound() {
  const t = koMessages.common;

  return (
    <html lang="ko">
      <body>
        <main id="main-content" className="shell py-12">
          <div className="grid gap-4">
            <p className="eyebrow">
              <span>{t.error.notFoundEyebrow}</span>
            </p>
            <h1>{t.error.notFoundTitle}</h1>
            <p className="text-[1.02rem]">{t.error.notFoundBody}</p>
            <p className="flex flex-wrap gap-2">
              <Link href="/ko/places" className="btn btn--filled">
                {t.nav.places}
              </Link>
              <Link href="/ko" className="btn">
                {t.nav.home}
              </Link>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
