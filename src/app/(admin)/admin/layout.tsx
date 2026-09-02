import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import '../../globals.css';
import koMessages from '../../../../messages/ko.json';

/**
 * A second root layout. The admin screen sits outside the localised tree — it has
 * one Korean-speaking operator, and giving it a locale segment would put a language
 * switch on a page where nobody needs one.
 *
 * The locale is pinned rather than absent so the screen's copy still comes from the
 * message files. Two namespaces are handed to the client, not the whole file: the
 * operator's screen has no use for the visitor's strings.
 */
export const metadata: Metadata = {
  title: '방문자 제보 관리 · 모두의 백제',
  robots: { index: false, follow: false },
};

const ADMIN_MESSAGES = { admin: koMessages.admin, common: koMessages.common };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <NextIntlClientProvider locale="ko" messages={ADMIN_MESSAGES}>
          <a className="skip-link" href="#main-content">
            {koMessages.common.skipToContent}
          </a>
          <main id="main-content" tabIndex={-1} className="shell py-8">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
