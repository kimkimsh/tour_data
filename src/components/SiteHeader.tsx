import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
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

  return (
    <header className="no-print border-b border-[var(--color-rule)]">
      <div className="shell flex flex-wrap items-center justify-between gap-3 py-3">
        <Link href="/" className="!no-underline">
          <span className="block text-[1.28rem] font-extrabold tracking-[-0.03em]">
            {t('siteName')}
          </span>
          <span className="block font-mono text-[0.7rem] uppercase tracking-[0.14em] text-[var(--color-gilt)]">
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
            {NAV.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="inline-flex min-h-[44px] items-center !no-underline hover:!underline">
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <LocaleSwitch locale={locale} />
      </div>
    </header>
  );
}
