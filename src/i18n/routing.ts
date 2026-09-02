import { defineRouting } from 'next-intl/routing';
import { LOCALES } from '@/domain/types';

/**
 * The interface ships in Korean and English. Place titles and overviews are also
 * stored in Japanese and Chinese, but only surfaced inside the detail screen —
 * that distinction lives in ContentLocale, not here.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: 'ko',
  localePrefix: 'always',
});
