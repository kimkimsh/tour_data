'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

/**
 * The print route's own boundary. Same reason as the admin one: a route group with
 * its own root layout gets its own error boundary or none at all.
 *
 * No retry button and no eyebrow. This page exists to be sent to a printer, and the
 * only useful thing it can say when it cannot build itself is that it could not.
 */
export default function PrintError({ error }: { error: Error & { digest?: string } }) {
  const t = useTranslations('common');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid gap-3">
      <h1>{t('error.loadFailedTitle')}</h1>
      <p>{t('error.loadFailedBody')}</p>
      {error.digest ? (
        <p className="evidence__provenance">{t('error.digest', { digest: error.digest })}</p>
      ) : null}
    </div>
  );
}
