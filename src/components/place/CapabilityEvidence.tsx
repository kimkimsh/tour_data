import { useTranslations } from 'next-intl';
import { AXES } from '@/domain/types';
import type { Axis, CapabilityStatus, Locale } from '@/domain/types';
import { CAPABILITIES, KTO_PROSE_FIELDS, getCapability } from '@/domain/capabilities';
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

      {/* Said once, here. It used to be printed under every item whose status is
          unknown, and at seventeen of them on one place the screen became a column of
          identical dashed boxes — the same sentence seventeen times reads as a
          rendering fault, and it buried the rows that do carry a reason of their own. */}
      <p className="max-w-[var(--container-prose)] t-sm text-[var(--color-ink-2)]">
        {tc('absence.null')}
      </p>

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
                    /* Only where the row has a reason of its own. The default — we do
                       not know why the field is blank — is stated once above. */
                    absenceExplanation={
                      status === 'unknown' && fact?.absenceKind
                        ? tc(`absence.${fact.absenceKind}`)
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
          <ul className="mt-3 grid gap-4">
            {etcNotes.map((note) => {
              const label = proseLabel(note.sourceField, t);
              return (
                <li key={note.sourceField} className="grid gap-1">
                  {/* A Korean heading, not the wire key. A list headed
                      `detailWithTour2.blindhandicapetc` is not findable by anyone
                      looking for what it says, and 대중교통 — a capability row until
                      this round — is the one people search for by name. The field
                      name stays underneath, where every other source line sits.
                      h4 because the section itself is the h3 above. */}
                  {label === null ? null : <h4 className="subhead">{label}</h4>}
                  <p lang="ko">{note.text}</p>
                  <p className="evidence__provenance">{note.sourceField}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

/**
 * The Korean name for a prose field, or null for one this build has no name for —
 * detailInfo2 rows arrive under whatever `infoname` the operator typed, and inventing
 * a heading for those would name something we did not read.
 */
function proseLabel(
  sourceField: string,
  t: (key: string) => string,
): string | null {
  const field = sourceField.startsWith(PROSE_PREFIX) ? sourceField.slice(PROSE_PREFIX.length) : null;
  if (field === null) return null;
  return (KTO_PROSE_FIELDS as readonly string[]).includes(field) ? t(`proseLabel.${field}`) : null;
}

const PROSE_PREFIX = 'detailWithTour2.';

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
