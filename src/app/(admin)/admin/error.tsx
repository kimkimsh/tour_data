'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

/**
 * The same screen as (site)/[locale]/error.tsx, for the other root layout.
 *
 * A route group with its own root layout gets its own error boundary or none at all,
 * and this one had none: a throw here — createServerClient() with the environment
 * variables missing, say — reached Next's built-in fallback, which is an unstyled
 * English line with no lang attribute, served to the one operator who has to act on it.
 */
export default function AdminError({
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
      <h1>{t('error.loadFailedTitle')}</h1>
      <p>{t('error.loadFailedBody')}</p>
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
