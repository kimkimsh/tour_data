'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Eyebrow } from '@/components/Eyebrow';

/**
 * The screen for a render that threw.
 *
 * Every reachable failure this service knows about already has a sentence — a
 * snapshot that is missing, a lookup that failed, a report that did not post. This
 * catches the ones it does not know about: a misconfigured data source, a content
 * file that will not parse, a bug. Next's own fallback for those is an unstyled
 * English line with no lang attribute and no way forward.
 *
 * The thrown message is not printed. It names files and tables, and the visitor can
 * do nothing with it; `digest` is the handle that ties this screen to the server log.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid gap-4">
      <Eyebrow>{t('error.unexpectedEyebrow')}</Eyebrow>
      <h1>{t('error.loadFailedTitle')}</h1>
      <p className="text-[1.02rem]">{t('error.loadFailedBody')}</p>
      <p>
        <button type="button" className="btn btn--filled" onClick={reset}>
          {t('retry')}
        </button>
      </p>
      {error.digest ? (
        <p className="evidence__provenance">{t('error.digest', { digest: error.digest })}</p>
      ) : null}
    </div>
  );
}
