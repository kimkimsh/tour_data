import Link from 'next/link';
import './globals.css';
import koMessages from '../../messages/ko.json';
import enMessages from '../../messages/en.json';

/**
 * The screen for an address that matches no route at all. An unknown place *slug* is a
 * different case: those pages call notFound() and get
 * src/app/(site)/[locale]/not-found.tsx, inside the real layout.
 *
 * This file convention exists for an app with more than one root layout, which is this
 * one — (site), (admin) and (print) each have theirs, so there is no single layout to
 * compose a 404 from. Next skips rendering the tree entirely and serves what is here,
 * which is why the document has to be whole: <html>, <body>, and its own stylesheet
 * import.
 *
 * Both languages, because an address that matches nothing carries no locale segment to
 * read one from. Each block declares its own, so a screen reader does not sound out the
 * Korean with an English voice or the other way round.
 */
export const metadata = {
  title: `${koMessages.common.error.notFoundTitle} · ${koMessages.common.siteName}`,
};

export default function GlobalNotFound() {
  const ko = koMessages.common;
  const en = enMessages.common;

  return (
    <html lang="ko">
      <body>
        <main id="main-content" className="shell py-12">
          <div className="grid gap-8">
            <div className="grid gap-4" lang="ko">
              <h1>{ko.error.notFoundTitle}</h1>
              <p>{ko.error.notFoundBody}</p>
              <p className="flex flex-wrap gap-2">
                <Link href="/ko/places" className="btn btn--filled">
                  {ko.nav.places}
                </Link>
                <Link href="/ko" className="btn">
                  {ko.nav.home}
                </Link>
              </p>
            </div>

            <div className="grid gap-4 border-t border-[var(--color-rule)] pt-8" lang="en">
              <h2>{en.error.notFoundTitle}</h2>
              <p>{en.error.notFoundBody}</p>
              <p className="flex flex-wrap gap-2">
                <Link href="/en/places" className="btn btn--filled">
                  {en.nav.places}
                </Link>
                <Link href="/en" className="btn">
                  {en.nav.home}
                </Link>
              </p>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
