import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

/**
 * The screen for an address inside the localised tree that names nothing.
 *
 * It lives in this segment so Next renders it inside the (site) layout — language,
 * skip links, navigation and the emergency button all present — while still answering
 * 404. The page it replaces was a [...rest] catch-all, which got the layout by being a
 * real page and paid for it with a 200: every typo, every dead link and every address
 * an attacker chose was an indexable page on the real domain whose title came from the
 * URL.
 *
 * The locale is not read here. next-intl's provider is already above this in the
 * layout, so getTranslations resolves against the request's locale on its own.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations('common');

  return (
    <div className="grid gap-4">
      <h1>{t('error.notFoundTitle')}</h1>
      <p>{t('error.notFoundBody')}</p>
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
