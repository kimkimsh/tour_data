'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Docent } from '@/domain/snapshot-schema';
import type { Locale } from '@/domain/types';
import { LiveRegion } from '@/components/a11y/LiveRegion';
import { useAnnouncer } from '@/components/a11y/useAnnouncer';
import { SpokenGap } from '@/components/a11y/SpokenGap';
import { DocentPlayer } from './DocentPlayer';

const SECONDS_PER_MINUTE = 60;

/**
 * Story picker plus the language and plain-language switches.
 *
 * The plain-language switch appears when any story on the page has one, and the
 * stories that do not say so themselves — a switch that quietly falls back to the
 * original asserts a plain version was written for every story under it.
 */
export function DocentView({ stories, uiLocale }: { stories: Docent[]; uiLocale: Locale }) {
  const t = useTranslations('docent');
  const groupId = useId();
  const { announcement, announce } = useAnnouncer();
  const [locale, setLocale] = useState<Locale>(
    stories.some((s) => s.locale === uiLocale) ? uiLocale : 'ko',
  );
  const [easyMode, setEasyMode] = useState(false);

  const available = Array.from(new Set(stories.map((s) => s.locale))) as Locale[];
  const forLocale = stories.filter((s) => s.locale === locale).sort((a, b) => a.seq - b.seq);
  const hasEasy = forLocale.some((s) => s.easyScript !== null);

  const countFor = (value: Locale) => stories.filter((s) => s.locale === value).length;
  const easyCountFor = (value: Locale) =>
    stories.filter((s) => s.locale === value && s.easyScript !== null).length;

  return (
    <div className="grid gap-8">
      {/* Either switch replaces every story and every transcript on the page. Without
          this the change was announced only as the radio's own state, and the thing
          that actually moved — which stories are now on screen, and how many of them
          have a plain-language version — was announced by nothing. */}
      <LiveRegion message={announcement} />

      {/* Not rendered at all when neither switch applies. As an always-present row it
          was an empty grid child, and the two 2rem gaps around it left a band of dead
          space between the page heading and the first story. */}
      {available.length > 1 || hasEasy ? (
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
                      onChange={() => {
                        setLocale(value);
                        announce(
                          t('announceLocale', {
                            language: value === 'ko' ? '한국어' : 'English',
                            count: countFor(value),
                          }),
                        );
                      }}
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
                      onChange={() => {
                        setEasyMode(value);
                        announce(
                          t('announceMode', {
                            mode: value ? t('modeEasy') : t('modeOriginal'),
                            ready: easyCountFor(locale),
                            count: forLocale.length,
                          }),
                        );
                      }}
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
      ) : null}

      {/* The id carries the theme as well as the sequence. A place can hold more than
          one Odii theme, and two headings sharing `story-1` made aria-labelledby name
          whichever came first — so half the sections on this page announced another
          section's title. Ingest now numbers per place, and this survives it not
          having yet. */}
      {forLocale.map((story) => {
        const key = `${story.locale}-${story.odiiTid}-${story.odiiStid ?? story.seq}`;
        return (
          <section key={key} aria-labelledby={`story-${key}`} className="grid gap-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id={`story-${key}`} className="item-head">
                {story.title}
              </h2>
              {/* The run time as text. The player is preload="none" — eight recordings
                  on a screen is eight requests nobody asked for — so its own readout
                  says 0:00 / 0:00 until somebody presses play, and a visitor deciding
                  whether to listen wants the length before that. The figure is in the
                  snapshot already. */}
              {story.playTimeS === null ? null : (
                <p className="t-sm text-[var(--color-ink-2)]">
                  {t('playTimeLabel')}
                  {/* The {' '} that used to stand here is in the HTML and not in the
                      accessibility tree — Chrome drops whitespace-only text nodes —
                      so this read as 「재생 시간2분 4초」. */}
                  <SpokenGap />{' '}
                  <span className="tabular">
                    {t('playTime', {
                      minutes: Math.floor(story.playTimeS / SECONDS_PER_MINUTE),
                      seconds: story.playTimeS % SECONDS_PER_MINUTE,
                    })}
                  </span>
                </p>
              )}
            </div>
            <DocentPlayer story={story} easyMode={easyMode} />
          </section>
        );
      })}
    </div>
  );
}
