'use client';

import { useId, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { buildItinerary } from '@/domain/itinerary';
import { buildScoreboard } from '@/domain/scoreboard';
import { getPersona } from '@/domain/personas';
import { BUDGET_MODES } from '@/domain/types';
import type {
  BudgetMode,
  ItineraryTemplate,
  ItineraryWarning,
  Locale,
  SuitabilityFactInput,
} from '@/domain/types';
import { VerdictBadge } from '@/components/VerdictBadge';
import { Eyebrow } from '@/components/Eyebrow';
import { useConditions } from '@/components/persona/usePersona';
import { capabilityLabels, type PlaceCardData } from '@/components/place/place-view';
import { useToday } from '@/components/useClientValue';
import { LiveRegion } from '@/components/a11y/LiveRegion';

/**
 * Picks the pre-written template for the chosen time budget and shows what the
 * chosen conditions do to it: the corrected stay times, and a warning on any leg
 * longer than the shortest rest limit in the group.
 *
 * Scores come from the same scoreboard the list and detail screens use, so one
 * place cannot show two different numbers on two screens.
 */
export function CourseView({
  templates,
  places,
  factsByPoi,
}: {
  templates: ItineraryTemplate[];
  places: PlaceCardData[];
  factsByPoi: Record<string, SuitabilityFactInput[]>;
}) {
  const t = useTranslations('courses');
  const tc = useTranslations('common');
  const th = useTranslations('home');
  const locale = useLocale() as Locale;
  const { conditions, loaded, setConditions } = useConditions();
  const today = useToday();
  const groupId = useId();

  const itinerary = useMemo(() => {
    if (!loaded) return null;
    return buildItinerary({
      budgetMode: conditions.budgetMode,
      personaIds: conditions.personaIds,
      cognitiveOption: conditions.cognitiveOption,
      templates,
    });
  }, [loaded, conditions.budgetMode, conditions.personaIds, conditions.cognitiveOption, templates]);

  const scores = useMemo(() => {
    if (!loaded || today === null) return null;
    const board = buildScoreboard({
      pois: places.map((p) => ({ slug: p.slug, title: p.title, certifications: p.certifications })),
      factsByPoi,
      personaIds: conditions.personaIds,
      cognitiveOption: conditions.cognitiveOption,
      calculationDate: today,
    });
    return new Map(board.map((entry) => [entry.poiSlug, entry.result]));
  }, [loaded, today, places, factsByPoi, conditions.personaIds, conditions.cognitiveOption]);

  const template = templates.find((tpl) => tpl.budgetMode === conditions.budgetMode);
  const byslug = new Map(places.map((p) => [p.slug, p]));

  return (
    <div className="grid gap-8">
      <fieldset className="grid gap-2">
        <legend className="text-[1.05rem] font-bold">{t('budgetLegend')}</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {BUDGET_MODES.map((mode) => {
            const id = `${groupId}-${mode}`;
            return (
              <span key={mode} className="flex items-center gap-2">
                <input
                  id={id}
                  type="radio"
                  name="course-budget"
                  className="control"
                  checked={conditions.budgetMode === mode}
                  onChange={() => setConditions({ ...conditions, budgetMode: mode as BudgetMode })}
                />
                <label htmlFor={id} className="min-h-[44px] py-1">
                  {th(`budget.${mode}`)}
                </label>
              </span>
            );
          })}
        </div>
      </fieldset>

      {/* Outside the branch below, so it survives the swap. Its text used to be an
          ellipsis, which announces nothing at all. */}
      <LiveRegion
        message={itinerary === null || scores === null ? t('calculating') : t('ready')}
      />

      {itinerary === null || scores === null ? (
        <p className="card">{t('calculating')}</p>
      ) : template === undefined ? (
        <p className="blank-slot">{t('empty')}</p>
      ) : (
        <section className="card grid gap-4" aria-labelledby="course-heading">
          <Eyebrow as="h2" id="course-heading">{t('eyebrow')}</Eyebrow>
          <h2>{locale === 'ko' ? template.titleKo : template.titleEn}</h2>

          <p className="text-[1.1rem] font-bold">
            {itinerary.totalMinutes >= 60
              ? t('total', {
                  hours: Math.floor(itinerary.totalMinutes / 60),
                  minutes: itinerary.totalMinutes % 60,
                })
              : t('totalMinutesOnly', { minutes: itinerary.totalMinutes })}
          </p>
          {conditions.personaIds.length > 0 ? (
            <p className="text-[0.95rem] text-[var(--color-ink-2)]">
              {t('multiplierNote', {
                persona: tightestLabel(conditions.personaIds, locale),
                multiplier: itinerary.stayMultiplier.toFixed(2),
              })}
            </p>
          ) : null}

          <ol className="grid gap-4">
            {itinerary.legs.map((leg, index) => {
              const place = byslug.get(leg.poiSlug);
              const result = scores.get(leg.poiSlug);
              const warning = itinerary.warnings.find((w) => w.afterPoiSlug === leg.poiSlug);
              return (
                <li key={leg.poiSlug} className="grid gap-1">
                  <p className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-mono text-[0.8rem] text-[var(--color-gilt)]" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Link href={`/places/${leg.poiSlug}`} className="text-[1.06rem] font-bold">
                      {place?.title ?? leg.poiSlug}
                    </Link>
                    <span className="tabular text-[0.95rem]">
                      {t('stay', { base: leg.baseStayMinutes, adjusted: leg.adjustedStayMinutes })}
                    </span>
                  </p>

                  {result ? (
                    <p className="flex flex-wrap items-center gap-2">
                      <VerdictBadge label={result.label} text={tc(`label.${result.label}`)} />
                      {result.label === '정보없음' ? null : (
                        <span className="tabular font-bold">{result.score}</span>
                      )}
                      {result.unknownCriticals.length > 0 ? (
                        <span className="text-[0.9rem] text-[var(--color-state-warn)]">
                          {capabilityLabels(result.unknownCriticals, locale)}
                        </span>
                      ) : null}
                    </p>
                  ) : null}

                  {leg.transferToNextMinutes !== null ? (
                    <p className="mt-1 border-l-2 border-[var(--color-rule)] pl-3 text-[0.95rem]">
                      <span aria-hidden="true">↓ </span>
                      {t('transfer', { minutes: leg.transferToNextMinutes })}
                    </p>
                  ) : null}

                  {warning ? (
                    <p className="callout callout--caution mt-1 font-bold">
                      <span aria-hidden="true">⚠ </span>
                      {t('restWarning', {
                        minutes: warning.transferMinutes,
                        persona: warningSourceLabel(warning.personaId, locale, tc, th),
                        limit: warning.limitMinutes,
                      })}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>

          {template.note ? (
            <p className="text-[0.9rem] text-[var(--color-ink-2)]">{template.note}</p>
          ) : null}

          <p>
            {/* The record itself lives in localStorage and is owned by the diary
                screen, so the slugs travel as a query parameter rather than being
                written from here. One writer for that key, not two. */}
            <Link
              href={`/diary?add=${template.orderedPoiSlugs.join(',')}`}
              className="btn"
            >
              {t('addToDiary')}
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}

function tightestLabel(personaIds: readonly string[], locale: Locale): string {
  const ids = personaIds as ReadonlyArray<Parameters<typeof getPersona>[0]>;
  const tightest = ids.reduce((a, b) =>
    getPersona(a).restLimitMinutes <= getPersona(b).restLimitMinutes ? a : b,
  );
  return locale === 'ko' ? getPersona(tightest).labelKo : getPersona(tightest).labelEn;
}

/**
 * Names whatever set the binding rest limit. 'cognitive' is the option, not a
 * persona, and it holds the tightest limit of all — so it has to be nameable
 * separately or the warning quotes a limit next to the wrong companion.
 */
function warningSourceLabel(
  source: ItineraryWarning['personaId'],
  locale: Locale,
  tc: (key: string) => string,
  th: (key: string) => string,
): string {
  if (source === 'P0') return tc('conditionsNone');
  if (source === 'cognitive') return th('cognitiveOption');
  const persona = getPersona(source);
  return locale === 'ko' ? persona.labelKo : persona.labelEn;
}
