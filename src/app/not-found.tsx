import Link from 'next/link';
import './globals.css';
import koMessages from '../../messages/ko.json';

/**
 * The screen for an address that matches no route at all — outside the localised tree,
 * or a bare segment under it that no page claims. An unknown place *slug* is a
 * different case: those pages call notFound() and get
 * src/app/(site)/[locale]/not-found.tsx, inside the real layout.
 *
 * It renders its own document. Every route in this app lives under a route group with
 * its own root layout — (site), (admin), (print) — so there is no app/layout.tsx for
 * Next to wrap a not-found render in, and the builtin stand-in it supplies instead is
 * a bare <html> with no lang. Declaring one here is what puts the language back: the
 * parser merges the attribute onto the root element, measured as
 * document.documentElement.lang === 'ko' with one <html> and one <body> in the tree.
 *
 * suppressHydrationWarning is for that merge and nothing else. React compares the
 * element it rendered against the one the parser produced, finds an attribute it did
 * not put there, and reports a mismatch it says it will not patch up — over a
 * difference that is the intended result.
 *
 * Korean only, and no locale switch. A 404 has no route params, so there is no locale
 * to read; the links go to the Korean tree, which is where the proxy sends an
 * unprefixed visitor anyway.
 */
export const metadata = {
  title: `${koMessages.common.error.notFoundTitle} · ${koMessages.common.siteName}`,
};

export default function NotFound() {
  const t = koMessages.common;

  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <main id="main-content" className="shell py-12">
          <div className="grid gap-4">
            <h1>{t.error.notFoundTitle}</h1>
            <p>{t.error.notFoundBody}</p>
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
