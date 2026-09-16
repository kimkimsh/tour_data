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
  const tp = useTranslations('places');
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
      pois: places.map((p) => ({ slug: p.slug, title: p.title, city: p.cityLabel })),
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
        <legend className="font-bold">{t('budgetLegend')}</legend>
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
        <section className="grid gap-4" aria-labelledby="course-heading">
          {/* The course's own title labels the section. It used to be labelled by a
              second heading reading 「코스」, so a screen reader announcing the region
              said the word the page is already titled with, while the line naming
              which course this is was a sibling heading nothing pointed at. */}
          <h2 id="course-heading" className="section-head">
            {locale === 'ko' ? template.titleKo : template.titleEn}
          </h2>

          <p className="t-lg font-bold">
            {itinerary.totalMinutes >= 60
              ? t('total', {
                  hours: Math.floor(itinerary.totalMinutes / 60),
                  minutes: itinerary.totalMinutes % 60,
                })
              : t('totalMinutesOnly', { minutes: itinerary.totalMinutes })}
          </p>
          {conditions.personaIds.length > 0 ? (
            <p className="t-sm text-[var(--color-ink-2)]">
              {t('multiplierNote', {
                persona: warningSourceLabel(itinerary.stayMultiplierSource, locale, tc, th),
                // Two decimals printed "1.30배", which is a machine's way of writing
                // 1.3. Intl drops a trailing zero and keeps 1.25 whole.
                multiplier: itinerary.stayMultiplier,
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
                    <span className="step-mark" aria-hidden="true">
                      {index + 1}
                    </span>
                    <Link href={`/places/${leg.poiSlug}`} className="font-bold">
                      {place?.title ?? leg.poiSlug}
                    </Link>
                    {/* The arrow form only when the conditions actually moved the
                        number. "체류 90분 → 90분" is the same figure twice and reads
                        as a rendering fault. */}
                    <span className="tabular t-sm">
                      {leg.adjustedStayMinutes === leg.baseStayMinutes
                        ? t('stayPlain', { minutes: leg.baseStayMinutes })
                        : t('stay', {
                            base: leg.baseStayMinutes,
                            adjusted: leg.adjustedStayMinutes,
                          })}
                    </span>
                  </p>

                  {result ? (
                    <p className="flex flex-wrap items-center gap-2">
                      <VerdictBadge label={result.label} text={tc(`label.${result.label}`)} />
                      {/* The checked count, not the score. The score is a mean over
                          whichever items happen to be known, so it answers a different
                          question at every place and is not a figure to read four of in
                          a column; the list and detail screens dropped it for the same
                          reason, and it lives in the detail screen's calculation panel. */}
                      <span className="t-xs text-[var(--color-ink-2)]">
                        {tp('checkedOf', {
                          known: result.relevantKnownCount,
                          total: result.relevantTotalCount,
                        })}
                      </span>
                      {/* Named, not listed bare. A capability name on its own beside a
                          badge does not say whether it is confirmed, missing or simply
                          unchecked, and the place list beside it does say. */}
                      {result.unknownCriticals.length > 0 ? (
                        <span className="t-sm text-[var(--color-state-warn)]">
                          <span aria-hidden="true">⚠ </span>
                          {tp('needCheck')}: {capabilityLabels(result.unknownCriticals, locale)}
                        </span>
                      ) : null}
                    </p>
                  ) : null}

                  {leg.transferToNextMinutes !== null ? (
                    <p className="mt-1 border-l-2 border-[var(--color-rule)] pl-3 t-sm">
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
            <p className="t-sm text-[var(--color-ink-2)]">{template.note}</p>
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
