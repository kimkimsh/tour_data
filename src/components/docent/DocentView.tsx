'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Docent } from '@/domain/snapshot-schema';
import type { Locale } from '@/domain/types';
import { DocentPlayer } from './DocentPlayer';

/**
 * Story picker plus the language and plain-language switches.
 *
 * The plain-language option only appears where a person actually wrote one. Offering
 * a switch that falls back to the original would say the plain version exists.
 */
export function DocentView({ stories, uiLocale }: { stories: Docent[]; uiLocale: Locale }) {
  const t = useTranslations('docent');
  const groupId = useId();
  const [locale, setLocale] = useState<Locale>(
    stories.some((s) => s.locale === uiLocale) ? uiLocale : 'ko',
  );
  const [easyMode, setEasyMode] = useState(false);

  const available = Array.from(new Set(stories.map((s) => s.locale))) as Locale[];
  const forLocale = stories.filter((s) => s.locale === locale).sort((a, b) => a.seq - b.seq);
  const hasEasy = forLocale.some((s) => s.easyScript !== null);

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {available.length > 1 ? (
          <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <legend className="sr-only">{t('language')}</legend>
            {available.map((value) => {
              const id = `${groupId}-lang-${value}`;
              return (
                <span key={value} className="flex items-center gap-2">
                  <input
                    id={id}
                    type="radio"
                    name="docent-locale"
                    className="control"
                    checked={locale === value}
                    onChange={() => setLocale(value)}
                  />
                  <label htmlFor={id} className="min-h-[44px] py-1" lang={value}>
                    {value === 'ko' ? '한국어' : 'English'}
                  </label>
                </span>
              );
            })}
          </fieldset>
        ) : null}

        {hasEasy ? (
          <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <legend className="sr-only">{t('mode')}</legend>
            {[false, true].map((value) => {
              const id = `${groupId}-mode-${value}`;
              return (
                <span key={String(value)} className="flex items-center gap-2">
                  <input
                    id={id}
                    type="radio"
                    name="docent-mode"
                    className="control"
                    checked={easyMode === value}
                    onChange={() => setEasyMode(value)}
                  />
                  <label htmlFor={id} className="min-h-[44px] py-1">
                    {value ? t('modeEasy') : t('modeOriginal')}
                  </label>
                </span>
              );
            })}
          </fieldset>
        ) : null}
      </div>

      {forLocale.map((story) => (
        <section key={`${story.locale}-${story.seq}`} aria-labelledby={`story-${story.seq}`} className="grid gap-4">
          <h2 id={`story-${story.seq}`} className="item-head">
            {story.title}
          </h2>
          <DocentPlayer story={story} easyMode={easyMode} />
        </section>
      ))}
    </div>
  );
}
