'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import type { Locale } from '@/domain/types';

/**
 * The language link, pointed at the page the reader is already on.
 *
 * It used to point at `/`, which sent anyone switching language back to the home
 * screen — from a place they had scrolled to, a course they had built, or a gap
 * report they were reading. next-intl's usePathname returns the route without the
 * locale segment, which is exactly the href this needs.
 *
 * A client component because that hook is one, and a link rather than a control
 * because the locale is part of the address: it has to be navigable, shareable and
 * usable with no JavaScript.
 */
export function LocaleSwitch({ locale }: { locale: Locale }) {
  const t = useTranslations('common');
  // The route carries no localised pathname map, so this is the real path with the
  // real segment values — no [slug] to fill in.
  const pathname = usePathname();
  const other: Locale = locale === 'ko' ? 'en' : 'ko';

  return (
    <Link
      href={pathname}
      locale={other}
      className="order-2 inline-flex min-h-[44px] items-center gap-1 t-sm"
      lang={other}
    >
      <span className="sr-only">{t('langLabel')}: </span>
      {other === 'en' ? 'English' : '한국어'}
    </Link>
  );
}
