import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import '../../globals.css';
import { routing } from '@/i18n/routing';
import { SkipLinks } from '@/components/a11y/SkipLink';
import { RouteFocus } from '@/components/a11y/RouteFocus';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { EmergencyContacts } from '@/components/EmergencyContacts';
import { safetyDirectory } from '@/lib/content';
import { currentDataSource } from '@/lib/data';
import type { Locale } from '@/domain/types';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  return {
    title: { default: t('siteName'), template: `%s · ${t('siteName')}` },
    description: t('tagline'),
  };
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'common' });

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <SkipLinks toContent={t('skipToContent')} toNav={t('skipToNav')} />
          <RouteFocus />
          <SiteHeader locale={locale as Locale} />
          {/* The whole service is an argument about where data comes from, so the one
              state where none of it was collected has to say so on every screen. */}
          {currentDataSource() === 'fixtures' ? (
            <p role="status" className="shell mt-4 callout callout--caution">
              {t('fixtureBanner')}
            </p>
          ) : null}
          <main id="main-content" tabIndex={-1} className="shell py-8">
            {children}
          </main>
          <SiteFooter />
          {/* Nationwide numbers only. The city-specific accessible taxi and emergency room
              appear in each place's safety section, where the city is known — an
              emergency sheet with eight buttons is a worse emergency sheet. */}
          <EmergencyContacts contacts={safetyDirectory.filter((c) => c.cityKo === null)} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
