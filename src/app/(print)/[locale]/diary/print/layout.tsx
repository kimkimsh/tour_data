import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import '../../../../globals.css';
import { routing } from '@/i18n/routing';

/**
 * A third root layout, and the reason this route sits in its own group: a layout
 * nested under (site) cannot drop what its parent already rendered, and the header,
 * the nav, the skip links, the emergency button and the footer all have to be gone
 * from a printed document. Reaching that from inside (site) is not possible, so the
 * route moved instead.
 *
 * Nothing here sets a height or an overflow. A single `overflow: hidden` ancestor
 * truncates the whole print job to one page.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'diary' });
  return {
    title: t('printTitle'),
    // The record is in the reader's browser, so this page is empty for everyone else.
    robots: { index: false, follow: false },
  };
}

export default async function DiaryPrintLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <main id="main-content" className="shell py-8">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
