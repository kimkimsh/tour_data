import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

/**
 * `requestLocale` carries a deprecation notice in favour of `next/root-params`.
 * Staying here on purpose: root-params types are generated into .next/types
 * during a build, so adopting it makes this file depend on build output. The
 * deprecated parameter still works and is the documented v4 shape.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: 'Asia/Seoul',
  };
});
