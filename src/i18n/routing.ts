import { defineRouting } from 'next-intl/routing';
import { LOCALES } from '@/domain/types';

/**
 * The interface ships in Korean and English, and so does the content: ContentLocale
 * is derived from this list rather than written out again, so the two cannot drift.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: 'ko',
  localePrefix: 'always',
});
