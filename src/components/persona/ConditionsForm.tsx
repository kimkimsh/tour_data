'use client';

import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { PERSONAS, getPersona } from '@/domain/personas';
import { BUDGET_MODES } from '@/domain/types';
import type { BudgetMode, PersonaId } from '@/domain/types';
import { LiveRegion } from '@/components/a11y/LiveRegion';
import { useConditions } from './usePersona';

/**
 * Native checkbox and radio inputs inside a fieldset, deliberately. A custom
 * control would need to reproduce grouping, the legend, and the label association
 * that the platform already gets right, and this is the one form every visitor
 * must be able to complete.
 */
export function ConditionsForm() {
  const t = useTranslations('home');
  const locale = useLocale();
  const router = useRouter();
  const { conditions, setConditions } = useConditions();
  const [announcement, setAnnouncement] = useState('');
  const groupId = useId();

  const togglePersona = (id: PersonaId, checked: boolean) => {
    const personaIds = checked
      ? [...conditions.personaIds, id]
      : conditions.personaIds.filter((p) => p !== id);
    const next = {
      ...conditions,
      personaIds,
      cognitiveOption: conditions.cognitiveOption && personaIds.includes('P3'),
    };
    setConditions(next);
    setAnnouncement(describe(next.personaIds, locale));
  };

  return (
    <form
      className="grid gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        router.push('/places');
      }}
    >
      <fieldset className="grid gap-3">
        <legend className="t-md font-bold">{t('conditionsLegend')}</legend>

        {PERSONAS.map((persona) => {
          const id = `${groupId}-${persona.id}`;
          const checked = conditions.personaIds.includes(persona.id);
          return (
            <div key={persona.id} className="grid gap-2">
              <div className="flex items-start gap-3">
                <input
                  id={id}
                  type="checkbox"
                  className="control mt-1"
                  checked={checked}
                  onChange={(event) => togglePersona(persona.id, event.target.checked)}
                />
                {/* No persona code beside the choice. P1a is a row of a table in the
                    spec, and printing it here put the document's own filing system on
                    the one screen every visitor has to get through — a label that reads
                    as a form number on a question about who they are travelling with. */}
                <label htmlFor={id} className="min-h-[44px] flex-1 py-1">
                  {locale === 'ko' ? persona.choiceKo : persona.choiceEn}
                </label>
              </div>

              {persona.id === 'P3' ? (
                <div className="ml-9 flex items-start gap-3 border-l-2 border-[var(--color-rule)] pl-4">
                  <input
                    id={`${groupId}-cognitive`}
                    type="checkbox"
                    className="control mt-1"
                    checked={conditions.cognitiveOption}
                    disabled={!checked}
                    onChange={(event) =>
                      setConditions({ ...conditions, cognitiveOption: event.target.checked })
                    }
                    aria-describedby={`${groupId}-cognitive-hint`}
                  />
                  <div className="flex-1">
                    <label htmlFor={`${groupId}-cognitive`} className="block min-h-[44px] py-1">
                      {t('cognitiveOption')}
                    </label>
                    <p id={`${groupId}-cognitive-hint`} className="t-xs text-[var(--color-ink-2)]">
                      {t('cognitiveHint')}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </fieldset>

      {/* The rule that separates this service from a filter list. Without it on
          screen, nobody discovers why the score dropped. */}
      {conditions.personaIds.length >= 2 ? (
        <aside className="callout callout--note">
          <h2 className="subhead">{t('minRuleTitle')}</h2>
          {/* The rule is stated without naming a persona. It used to name the one with
              the shortest rest limit, which is the itinerary's tightest companion and
              not necessarily the one Layer B actually takes the minimum over — so the
              screen asserted a basis for the calculation that could be the wrong one. */}
          <p className="mt-1 t-sm">{t('minRule')}</p>
        </aside>
      ) : null}

      <fieldset className="grid gap-2">
        <legend className="t-md font-bold">{t('budgetLegend')}</legend>
        {BUDGET_MODES.map((mode) => {
          const id = `${groupId}-budget-${mode}`;
          return (
            <div key={mode} className="flex items-center gap-3">
              <input
                id={id}
                type="radio"
                name="budget"
                className="control"
                checked={conditions.budgetMode === mode}
                onChange={() => setConditions({ ...conditions, budgetMode: mode as BudgetMode })}
              />
              <label htmlFor={id} className="min-h-[44px] flex-1 py-1">
                {t(`budget.${mode}`)}
              </label>
            </div>
          );
        })}
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn--filled">
          {t('goPlaces')}
        </button>
        <button type="button" className="btn" onClick={() => router.push('/courses')}>
          {t('goCourses')}
        </button>
      </div>

      <LiveRegion message={announcement} />
    </form>
  );
}

function describe(personaIds: PersonaId[], locale: string): string {
  if (personaIds.length === 0) return locale === 'ko' ? '조건을 모두 해제했습니다.' : 'No conditions selected.';
  const names = personaIds.map((id) => (locale === 'ko' ? getPersona(id).labelKo : getPersona(id).labelEn));
  return locale === 'ko' ? `선택: ${names.join(', ')}` : `Selected: ${names.join(', ')}`;
}

