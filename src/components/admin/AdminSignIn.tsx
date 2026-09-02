'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@/lib/supabase/browser';

/**
 * Email and password, because the only account that uses this screen is created by
 * hand in the dashboard. There is no sign-up, no recovery flow and no social
 * provider — each would be a surface with one user behind it.
 */
export function AdminSignIn({ deniedMessage }: { deniedMessage: string | null }) {
  const t = useTranslations('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(deniedMessage);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signInError } = await createBrowserClient().auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (signInError) {
      // Not signInError.message. Supabase distinguishes "no such user" from "wrong
      // password", and repeating that distinction on a public form tells an attacker
      // which addresses are administrators.
      setError(t('signInFailed'));
      return;
    }
    window.location.reload();
  };

  return (
    <form className="grid max-w-sm gap-4" onSubmit={submit}>
      <div className="grid gap-2">
        <label htmlFor="admin-email" className="font-bold">
          {t('email')}
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          className="field"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="admin-password" className="font-bold">
          {t('password')}
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          className="field"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {error ? (
        <p role="alert" className="callout callout--stop font-bold text-[var(--color-state-bad)]">
          {error}
        </p>
      ) : null}
      <p>
        <button type="submit" className="btn btn--filled" disabled={busy}>
          {t('signIn')}
        </button>
      </p>
    </form>
  );
}
