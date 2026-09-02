import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function SiteFooter() {
  const t = useTranslations('common.footer');

  return (
    <footer className="no-print mt-16 border-t border-[var(--color-rule)] py-8">
      <div className="shell grid gap-3">
        {/* No KOGL type is named here. Images arrive as type 1 and type 3, and the
            heritage commentary as type 1 and type 4, so one type printed site-wide
            would be false on most pages. The type sits beside each asset instead. */}
        <p className="text-[0.88rem] text-[var(--color-ink-2)]">{t('source')}</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[0.9rem]">
          <li>
            <Link href="/credits">{t('credits')}</Link>
          </li>
          <li>
            <Link href="/privacy">{t('privacy')}</Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
