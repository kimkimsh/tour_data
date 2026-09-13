import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Eyebrow } from '@/components/Eyebrow';

/**
 * Any address under a locale that no other route claims.
 *
 * A catch-all rather than not-found.tsx, for the same reason the place pages render
 * their own missing-place screen: every route in this app sits under a route group
 * with its own root layout, so Next has no app/layout.tsx to wrap a not-found render
 * in and answers with a document carrying no lang attribute, no heading and no text.
 * Reached through this segment instead, the screen arrives inside the real layout —
 * language, skip links, navigation and the emergency button all present.
 *
 * Next matches a static or dynamic segment ahead of a catch-all, so this shadows
 * nothing. The cost is the status code: 200 where 404 would be correct. An address
 * outside the locale tree entirely still answers 404, from src/app/not-found.tsx.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  return { title: t('error.notFoundTitle') };
}

export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'common' });

  return (
    <div className="grid gap-4">
      <Eyebrow>{t('error.notFoundEyebrow')}</Eyebrow>
      <h1>{t('error.notFoundTitle')}</h1>
      <p className="text-[1.02rem]">{t('error.notFoundBody')}</p>
      <p className="flex flex-wrap gap-2">
        <Link href="/places" className="btn btn--filled">
          {t('nav.places')}
        </Link>
        <Link href="/" className="btn">
          {t('nav.home')}
        </Link>
      </p>
    </div>
  );
}
