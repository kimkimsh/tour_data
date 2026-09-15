import { useTranslations } from 'next-intl';
import { AXES } from '@/domain/types';
import type { Axis, CapabilityStatus, Locale } from '@/domain/types';
import { CAPABILITIES, getCapability } from '@/domain/capabilities';
import { AXIS_LABEL } from '@/domain/suitability';
import type { Fact } from '@/domain/snapshot-schema';
import { EvidenceRow } from '@/components/EvidenceRow';
import { provenanceLine } from './place-view';

/**
 * Every item in the catalogue, grouped by axis, each with its status, the upstream
 * sentence, the
 * field name and the check date.
 *
 * Rendered on the server: none of it depends on the chosen conditions, so it is
 * identical for every visitor and stays inside the cached HTML.
 *
 * Deliberately not tabs. A tab panel that is not selected is removed from the
 * accessibility tree, and the completion criterion for this screen is that every
 * item is present. Six headed groups with a jump list cost nothing and keep that
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
      <h2 id="evidence-heading" className="section-head">{t('headingEvidence')}</h2>

      <nav aria-label={t('fieldTabs')}>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 t-sm">
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
            {/* h3, under the section's own h2: the six axes are parts of "the items
                behind the verdict", and at the same level a reader moving by heading
                cannot tell they belong to it.

                The axis name alone. The English key beside it — 진입 ENTRY — was a second
                name for the heading in a language the Korean screen is not in, and on
                the English screen it was the same word twice. */}
            <h3 id={`axis-${axis}-heading`} className="subhead">
              {axisLabel(axis, locale)}
            </h3>
            <div>
              {items.map((capability) => {
                const fact = byCode.get(capability.code);
                const status = fact?.status ?? 'unknown';
                return (
                  <EvidenceRow
                    key={capability.code}
                    title={locale === 'ko' ? capability.labelKo : capability.labelEn}
                    statusText={statusWord(status, axis, fact?.absenceKind ?? null, tc)}
                    statusKind={status}
                    quotedDetail={fact?.detail ?? null}
                    derived={capability.ktoField === null}
                    derivedLabel={tc('derivedLabel')}
                    absenceExplanation={
                      status === 'unknown'
                        ? tc(`absence.${fact?.absenceKind ?? 'null'}`)
                        : null
                    }
                    provenance={
                      fact
                        ? provenanceLine(fact, locale)
                        : {
                            parts: [
                              { text: capability.ktoField ?? capability.code, mono: true },
                              { text: tc('status.unknown'), mono: false },
                            ],
                            href: null,
                            hrefLabel: null,
                          }
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
          <h3 id="etc-heading" className="subhead">
            {t('etcNotes')}
          </h3>
          <p className="mt-1 t-sm text-[var(--color-ink-2)]">{t('etcNotesHint')}</p>
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

/**
 * The four status words answer "can you use this facility", and on the context axis
 * there is no facility to use. A crowding forecast of 82 was rendered "이용 불가",
 * which on a barrier-free service reads as "you cannot go" rather than "it will be
 * busy"; the same word sat under 기상 특보 and 응급실 거리. Those five items get a
 * vocabulary about the condition instead.
 *
 * A capability that does not apply to this kind of place gets its own word too. The
 * explanation underneath already said 해당하지 않는 항목 while the badge said
 * 정보 없음, which are different claims.
 */
function statusWord(
  status: CapabilityStatus,
  axis: Axis,
  absenceKind: string | null,
  tc: (key: string) => string,
): string {
  if (status === 'unknown' && absenceKind === 'not_applicable') return tc('status.notApplicable');
  return axis === 'context' ? tc(`contextStatus.${status}`) : tc(`status.${status}`);
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
