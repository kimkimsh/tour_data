'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { REPORT_CATEGORIES } from '@/domain/types';
import type { ReportCategory } from '@/domain/types';
import { createBrowserClient } from '@/lib/supabase/browser';

const DETAIL_MAX = 500;

/**
 * One report, published the moment it is posted.
 *
 * A session is created here rather than at page load: an anonymous user row should
 * exist because somebody chose to write something, not because somebody opened a
 * page. The session cookie is what lets the row be written as theirs.
 *
 * Errors move focus to the field that caused them and describe the fix. A polite
 * live region alone leaves a keyboard user hunting for where the problem is.
 *
 * A posted report replaces the form with a confirmation the visitor can read, rather
 * than navigating away from it. Announcing success and pushing a route in the same
 * tick unmounts the region before anything can be spoken, so the one message that
 * confirms the report was accepted was the one message never heard.
 */
export function ReportForm({
  places,
  initialPoiSlug,
  initialDetail,
}: {
  places: Array<{ slug: string; title: string }>;
  initialPoiSlug: string | null;
  initialDetail: string | null;
}) {
  const t = useTranslations('report');
  const groupId = useId();
  const doneRef = useRef<HTMLElement | null>(null);

  const [poiSlug, setPoiSlug] = useState(initialPoiSlug ?? places[0]?.slug ?? '');
  const [category, setCategory] = useState<ReportCategory | ''>('');
  const [occurredOn, setOccurredOn] = useState('');
  const [detail, setDetail] = useState(initialDetail ?? '');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [posted, setPosted] = useState(false);

  useEffect(() => {
    if (posted) doneRef.current?.focus();
  }, [posted]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (poiSlug === '') return fail('place', t('error.place'));
    if (category === '') return fail('category', t('error.category'));
    if (detail.length > DETAIL_MAX) return fail('detail', t('error.tooLong', { count: detail.length }));
    if (!consent) return fail('consent', t('error.consent'));

    setBusy(true);
    try {
      const supabase = createBrowserClient();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) return fail('form', t('error.failed'));
      }

      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          poiSlug,
          category,
          occurredOn: occurredOn === '' ? null : occurredOn,
          detail: detail.trim() === '' ? null : detail.trim(),
          consent: true,
        }),
      });

      if (response.status === 409) return fail('category', t('error.duplicate'));
      // Neither of these is the consent checkbox's fault, and pointing at it told the
      // visitor to fix something that was already correct.
      if (response.status === 503) return fail('form', t('error.unavailable'));
      if (!response.ok) return fail('form', t('error.failed'));

      setPosted(true);
    } finally {
      setBusy(false);
    }
  };

  /**
   * No live-region copy here. Every message is already rendered in a role="alert"
   * next to the control it belongs to, and adding a polite region spoke each one
   * twice.
   */
  function fail(field: string, message: string) {
    setError({ field, message });
    document.getElementById(`${groupId}-${field}`)?.focus();
  }

  const errorFor = (field: string) => (error?.field === field ? error.message : null);

  if (posted) {
    return (
      <section
        ref={doneRef}
        role="status"
        tabIndex={-1}
        className="callout callout--note grid max-w-[var(--container-prose)] gap-4"
      >
        <p className="text-[1.05rem] font-bold">{t('done')}</p>
        <p>
          <Link href={`/places/${poiSlug}#visitor-reports`} className="btn btn--filled">
            {t('goPlace')}
          </Link>
        </p>
      </section>
    );
  }

  return (
    <form className="grid max-w-[var(--container-prose)] gap-7" onSubmit={submit} noValidate>
      <p role="note" className="callout callout--note">
        {t('publicNotice')}
      </p>
      <p className="text-[0.95rem] text-[var(--color-ink-2)]">{t('noLocationNotice')}</p>

      <div className="grid gap-2">
        <label htmlFor={`${groupId}-place`} className="font-bold">
          {t('wherePlace')}
        </label>
        <select
          id={`${groupId}-place`}
          className="field"
          value={poiSlug}
          onChange={(event) => setPoiSlug(event.target.value)}
          aria-invalid={errorFor('place') !== null}
          aria-describedby={errorFor('place') ? `${groupId}-place-error` : undefined}
        >
          {places.map((place) => (
            <option key={place.slug} value={place.slug}>
              {place.title}
            </option>
          ))}
        </select>
        <FieldError id={`${groupId}-place-error`} message={errorFor('place')} />
      </div>

      <fieldset className="grid gap-2">
        <legend className="font-bold">{t('whatProblem')}</legend>
        {REPORT_CATEGORIES.map((value, index) => {
          const id = index === 0 ? `${groupId}-category` : `${groupId}-category-${value}`;
          return (
            <span key={value} className="flex items-center gap-3">
              <input
                id={id}
                type="radio"
                name="category"
                className="control"
                checked={category === value}
                onChange={() => setCategory(value)}
                aria-describedby={errorFor('category') ? `${groupId}-category-error` : undefined}
              />
              <label htmlFor={id} className="min-h-[44px] flex-1 py-1">
                {t(`category.${value}`)}
              </label>
            </span>
          );
        })}
        <FieldError id={`${groupId}-category-error`} message={errorFor('category')} />
      </fieldset>

      <div className="grid gap-2">
        <label htmlFor={`${groupId}-date`} className="font-bold">
          {t('whenSeen')}
        </label>
        <input
          id={`${groupId}-date`}
          type="date"
          className="field"
          value={occurredOn}
          onChange={(event) => setOccurredOn(event.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor={`${groupId}-detail`} className="font-bold">
          {t('detail')}
        </label>
        <textarea
          id={`${groupId}-detail`}
          className="field min-h-[8rem]"
          maxLength={DETAIL_MAX}
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          aria-describedby={
            errorFor('detail')
              ? `${groupId}-detail-hint ${groupId}-detail-error`
              : `${groupId}-detail-hint`
          }
          aria-invalid={errorFor('detail') !== null}
        />
        <p id={`${groupId}-detail-hint`} className="text-[0.9rem] text-[var(--color-ink-2)]">
          {t('detailHint')}
        </p>
        <p className="tabular text-[0.85rem] text-[var(--color-ink-2)]">
          {detail.length} / {DETAIL_MAX}
        </p>
        <FieldError id={`${groupId}-detail-error`} message={errorFor('detail')} />
      </div>

      {/* One checkbox, and it is the only one. Bundling a second consent into this
          box is what the consent rule forbids. */}
      <div className="flex items-start gap-3">
        <input
          id={`${groupId}-consent`}
          type="checkbox"
          className="control mt-1"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          aria-invalid={errorFor('consent') !== null}
          aria-describedby={errorFor('consent') ? `${groupId}-consent-error` : undefined}
        />
        <label htmlFor={`${groupId}-consent`} className="flex-1 py-1 font-bold">
          <span className="mr-2 text-[var(--color-state-bad)]">[{t('consentRequired')}]</span>
          {t('consent')}
        </label>
      </div>
      <FieldError id={`${groupId}-consent-error`} message={errorFor('consent')} />

      {/* Failures that belong to the request rather than to a field. tabIndex lets
          fail() move focus here, which is the only way a keyboard user learns that
          pressing submit did anything. */}
      <FieldError id={`${groupId}-form`} message={errorFor('form')} focusable />

      <p>
        <button type="submit" className="btn btn--filled" disabled={busy}>
          {busy ? t('submitting') : t('submit')}
        </button>
      </p>
    </form>
  );
}

function FieldError({
  id,
  message,
  focusable,
}: {
  id: string;
  message: string | null;
  focusable?: boolean;
}) {
  if (message === null) return null;
  return (
    <p
      id={id}
      role="alert"
      tabIndex={focusable ? -1 : undefined}
      className="callout callout--stop font-bold text-[var(--color-state-bad)]"
    >
      {message}
    </p>
  );
}
