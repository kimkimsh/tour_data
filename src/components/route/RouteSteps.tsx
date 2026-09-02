'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { Route } from '@/domain/snapshot-schema';
import { useConditions } from '@/components/persona/usePersona';
import { LiveRegion } from '@/components/a11y/LiveRegion';

type ViewMode = 'all' | 'one';

/**
 * The step cards. Everything a visitor needs is in this list, and the list alone —
 * no map is required to follow it.
 *
 * "One step at a time" is the default when the cognitive option is on. It hides the
 * other steps from view, but the step count and the current position stay in the
 * text, so a screen-reader user is never told less than a sighted one.
 */
export function RouteSteps({ route }: { route: Route }) {
  const t = useTranslations('routeGuide');
  const { conditions, loaded } = useConditions();
  const [mode, setMode] = useState<ViewMode | null>(null);
  const [current, setCurrent] = useState(0);
  const groupId = useId();

  const effectiveMode: ViewMode = mode ?? (loaded && conditions.cognitiveOption ? 'one' : 'all');
  const visible = effectiveMode === 'all' ? route.steps : route.steps.slice(current, current + 1);

  return (
    <div className="grid gap-5">
      <fieldset className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <legend className="sr-only">{t('viewMode')}</legend>
        {(['all', 'one'] as const).map((value) => {
          const id = `${groupId}-${value}`;
          return (
            <span key={value} className="flex items-center gap-2">
              <input
                id={id}
                type="radio"
                name="route-view"
                className="control"
                checked={effectiveMode === value}
                onChange={() => setMode(value)}
              />
              <label htmlFor={id} className="min-h-[44px] py-1">
                {value === 'all' ? t('viewAll') : t('viewOne')}
              </label>
            </span>
          );
        })}
      </fieldset>

      {/* Mounted in both modes so it survives the switch, and it carries the position
          because pressing "next" replaces the card silently otherwise. */}
      <LiveRegion
        message={
          effectiveMode === 'one'
            ? `${t('stepOf', { seq: current + 1, total: route.steps.length })} ${route.steps[current]?.title ?? ''}`
            : ''
        }
      />

      {effectiveMode === 'one' ? (
        <p className="tabular font-bold">
          {t('stepOf', { seq: current + 1, total: route.steps.length })}
        </p>
      ) : null}

      <ol aria-label={t('stepsLabel')} className="grid gap-5">
        {visible.map((step) => (
          <li key={step.seq} className="card grid gap-3">
            <p className="eyebrow">
              <span>{t('step', { seq: step.seq })}</span>
            </p>
            {/* alt="" because nobody wrote a description of this photo, and repeating
                the heading that follows it announces the same words twice while
                claiming to describe an image. The step text is the accessible
                equivalent by design: this guide is written to be followed without the
                pictures. */}
            {step.photoUrl ? (
              <Image
                src={step.photoUrl}
                alt=""
                width={720}
                height={480}
                className="h-auto w-full"
              />
            ) : null}
            <h2 className="item-head">{step.title}</h2>
            <p className="text-[1.06rem]">{step.easyText}</p>
            {step.detail ? <p className="text-[0.97rem]">{step.detail}</p> : null}

            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[0.93rem]">
              {/* div, not span: only div, dt and dd may be children of a dl, and a
                  span between them breaks the term-to-value mapping that is the whole
                  reason for using a dl here. */}
              {step.distanceM !== null ? (
                <div className="flex gap-1">
                  <dt className="text-[var(--color-ink-2)]">m</dt>
                  <dd className="tabular font-bold">{step.distanceM}</dd>
                </div>
              ) : null}
              {step.surface ? (
                <div className="flex gap-1">
                  <dt className="text-[var(--color-ink-2)]">{t('surface')}</dt>
                  <dd className="font-bold">{step.surface}</dd>
                </div>
              ) : null}
              {/* Never a number. Nobody measured a gradient, and the content check
                  rejects anything outside the six allowed words. */}
              {step.slopeNote ? (
                <div className="flex gap-1">
                  <dt className="text-[var(--color-ink-2)]">{t('slope')}</dt>
                  <dd className="font-bold">{step.slopeNote}</dd>
                </div>
              ) : null}
            </dl>

            {step.hazard ? (
              <p className="callout callout--caution font-bold">
                <span aria-hidden="true">⚠ </span>
                {t('hazard')}: {step.hazard}
              </p>
            ) : null}
          </li>
        ))}
      </ol>

      {effectiveMode === 'one' ? (
        <p className="flex gap-3">
          <button
            type="button"
            className="btn"
            disabled={current === 0}
            onClick={() => setCurrent((index) => Math.max(0, index - 1))}
          >
            {t('prev')}
          </button>
          <button
            type="button"
            className="btn btn--filled"
            disabled={current >= route.steps.length - 1}
            onClick={() => setCurrent((index) => Math.min(route.steps.length - 1, index + 1))}
          >
            {t('next')}
          </button>
        </p>
      ) : null}
    </div>
  );
}
