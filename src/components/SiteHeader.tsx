'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { LocaleSwitch } from '@/components/LocaleSwitch';
import type { Locale } from '@/domain/types';

const NAV = [
  { href: '/', key: 'home' },
  { href: '/places', key: 'places' },
  { href: '/courses', key: 'courses' },
  { href: '/gap-report', key: 'gapReport' },
  { href: '/diary', key: 'diary' },
] as const;

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = useTranslations('common');
  // usePathname from the i18n navigation returns the path without the locale prefix,
  // which is the same shape NAV holds.
  const pathname = usePathname();

  return (
    <header className="no-print border-b border-[var(--color-rule)]">
      <div className="shell flex flex-wrap items-center justify-between gap-3 py-3">
        <Link href="/" className="!no-underline">
          <span className="block t-lg font-extrabold tracking-[-0.03em]">
            {t('siteName')}
          </span>
          <span className="block font-mono t-xs uppercase tracking-[0.14em] text-[var(--color-gilt)]">
            Gongju · Buyeo
          </span>
        </Link>

        {/* tabIndex is what makes the skip link work: without it the browser scrolls to
            the nav but focus stays on the link, so the next Tab returns to the header. */}
        <nav
          id="primary-nav"
          tabIndex={-1}
          aria-label={t('navLabel')}
          className="order-3 w-full sm:order-2 sm:w-auto"
        >
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {NAV.map((item) => {
              const current =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <li key={item.key}>
                  {/* aria-current is the part that matters: five identical links gave a
                      screen-reader user nothing to locate themselves by. The underline
                      is the sighted half of the same answer. */}
                  <Link
                    href={item.href}
                    aria-current={current ? 'page' : undefined}
                    className={
                      current
                        ? 'inline-flex min-h-[44px] items-center font-bold !text-[var(--color-ink)] underline decoration-2 underline-offset-[0.35em]'
                        : 'inline-flex min-h-[44px] items-center !no-underline hover:!underline'
                    }
                  >
                    {t(`nav.${item.key}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <LocaleSwitch locale={locale} />
      </div>
    </header>
  );
}
