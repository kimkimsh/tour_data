import { useTranslations } from 'next-intl';
import { AXES } from '@/domain/types';
import type { Axis, Locale } from '@/domain/types';
import { CAPABILITIES, getCapability } from '@/domain/capabilities';
import { AXIS_LABEL } from '@/domain/suitability';
import type { Fact } from '@/domain/snapshot-schema';
import { EvidenceRow } from '@/components/EvidenceRow';
import { Eyebrow } from '@/components/Eyebrow';
import { provenanceLine } from './place-view';

/**
 * All 32 items, grouped by axis, each with its status, the upstream sentence, the
 * upstream field name and the check date.
 *
 * Rendered on the server: none of it depends on the chosen conditions, so it is
 * identical for every visitor and stays inside the cached HTML.
 *
 * Deliberately not tabs. A tab panel that is not selected is removed from the
 * accessibility tree, and the completion criterion for this screen is that all 32
 * items are present. Six headed groups with a jump list cost nothing and keep that
 * true (docs/spec/07_screens.md S2 makes the same call about the map).
 */
export function CapabilityEvidence({
  facts,
  locale,
  ktoUnknownCount,
  ktoTotalCount,
  etcNotes,
}: {
  facts: readonly Fact[];
  locale: Locale;
  ktoUnknownCount: number;
  ktoTotalCount: number;
  etcNotes: ReadonlyArray<{ sourceField: string; text: string }>;
}) {
  const t = useTranslations('place');
  const tc = useTranslations('common');
  const byCode = new Map(facts.map((fact) => [fact.capabilityCode, fact]));

  return (
    <section className="grid gap-5" aria-labelledby="evidence-heading">
      <Eyebrow as="h2" id="evidence-heading">{t('eyebrowEvidence')}</Eyebrow>

      <nav aria-label={t('fieldTabs')}>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.92rem]">
          {AXES.map((axis) => (
            <li key={axis}>
              <a href={`#axis-${axis}`}>{axisLabel(axis, locale)}</a>
            </li>
          ))}
        </ul>
      </nav>

      {AXES.map((axis) => {
        const items = CAPABILITIES.filter((capability) => capability.axis === axis);
        return (
          <section key={axis} id={`axis-${axis}`} aria-labelledby={`axis-${axis}-heading`}>
            <h2 id={`axis-${axis}-heading`} className="subhead">
              {axisLabel(axis, locale)}
              <span className="ml-2 font-mono text-[0.72rem] font-normal uppercase tracking-[0.12em] text-[var(--color-ink-2)]">
                {axis}
              </span>
            </h2>
            <div>
              {items.map((capability) => {
                const fact = byCode.get(capability.code);
                const status = fact?.status ?? 'unknown';
                return (
                  <EvidenceRow
                    key={capability.code}
                    title={locale === 'ko' ? capability.labelKo : capability.labelEn}
                    statusText={tc(`status.${status}`)}
                    statusKind={status}
                    quotedDetail={fact?.detail ?? null}
                    derived={capability.ktoField === null}
                    absenceExplanation={
                      status === 'unknown'
                        ? tc(`absence.${fact?.absenceKind ?? 'null'}`)
                        : null
                    }
                    provenance={
                      fact
                        ? provenanceLine(fact, locale)
                        : `${capability.ktoField ?? capability.code} · ${tc('status.unknown')}`
                    }
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="border-t border-[var(--color-rule)] pt-3 font-bold">
        {tc('unknownCountScoped', { unknown: ktoUnknownCount, total: ktoTotalCount })}
      </p>

      {etcNotes.length > 0 ? (
        <section aria-labelledby="etc-heading" className="card">
          <h2 id="etc-heading" className="subhead">
            {t('etcNotes')}
          </h2>
          <p className="mt-1 text-[0.9rem] text-[var(--color-ink-2)]">{t('etcNotesHint')}</p>
          <ul className="mt-3 grid gap-3">
            {etcNotes.map((note) => (
              <li key={note.sourceField}>
                <p className="evidence__provenance">{note.sourceField}</p>
                <p>{note.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

function axisLabel(axis: Axis, locale: Locale): string {
  return locale === 'ko' ? AXIS_LABEL[axis].ko : AXIS_LABEL[axis].en;
}

/** Counts the KTO-scored items, excluding the ones that cannot apply to this place. */
export function countKtoItems(facts: readonly Fact[]): { unknown: number; total: number } {
  const scored = facts.filter(
    (fact) =>
      getCapability(fact.capabilityCode)?.ktoField != null &&
      fact.absenceKind !== 'not_applicable',
  );
  return {
    unknown: scored.filter((fact) => fact.status === 'unknown').length,
    total: scored.length,
  };
}
