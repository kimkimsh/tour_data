import type { CapabilityStatus } from '@/domain/types';
import type { Provenance } from '@/components/place/place-view';
import { SpokenGap } from '@/components/a11y/SpokenGap';

/**
 * The one element this service is built around: a claim next to the machinery
 * behind it. The left column is what a visitor reads; the right column is the
 * upstream sentence, the raw field name and the date, set in monospace because it
 * is machine text and looking like machine text is the point.
 *
 * `provenance` is required. A row without it would be an unsourced claim, which is
 * the thing this whole screen exists to refuse. Where it holds a URL the row links to
 * it instead of printing it: the address said nothing a reader could act on without
 * retyping it, and it was the longest thing on the page.
 */
export function EvidenceRow({
  title,
  statusText,
  statusKind,
  notApplicable,
  quotedDetail,
  provenance,
  absenceExplanation,
  derived,
  derivedLabel,
}: {
  title: string;
  statusText: string;
  statusKind: CapabilityStatus;
  /** Carried separately because it is not a status: it rides on `unknown`. */
  notApplicable: boolean;
  quotedDetail: string | null;
  provenance: Provenance;
  absenceExplanation: string | null;
  derived: boolean;
  derivedLabel: string;
}) {
  return (
    <div className="evidence">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h4 className="subhead !tracking-normal">{title}</h4>
          <StatusText kind={statusKind} notApplicable={notApplicable} text={statusText} />
          {derived ? (
            <>
              {/* The heading above starts its own line, so it needs nothing. These two
                  share one, separated by gap-x-3, and were read as
                  「정보 없음우리가 더한 항목」. */}
              <SpokenGap />
              <span className="t-xs text-[var(--color-ink-2)]">{derivedLabel}</span>
            </>
          ) : null}
        </div>

        {/* lang="ko" on both the quotation and the provenance. Every one of these is
            Korean whatever language the interface is in — an upstream sentence, a
            field name, a source note — and on the English screens a reader without it
            gets Hangul sounded out with English phonemes. */}
        {quotedDetail ? (
          <blockquote
            lang="ko"
            className="mt-2 border-l-2 border-[var(--color-rule-strong)] pl-3 t-sm"
          >
            {quotedDetail}
          </blockquote>
        ) : null}

        {/* Only where there is something to say. The generic reason moved to the top
            of the section, and leaving the condition on the status alone printed an
            empty dashed box under every unknown item — seventeen of them on 공산성. */}
        {absenceExplanation === null ? null : (
          <p className="blank-slot mt-2 t-sm">{absenceExplanation}</p>
        )}
      </div>

      <p lang="ko" className="evidence__provenance">
        {provenance.parts.map((part, index) => (
          <span key={`${part.text}-${index}`}>
            {index > 0 ? ' · ' : null}
            <span className={part.mono ? 'font-mono' : undefined}>{part.text}</span>
          </span>
        ))}
        {provenance.href ? (
          <>
            {provenance.parts.length > 0 ? ' · ' : null}
            <a href={provenance.href} target="_blank" rel="noreferrer">
              {provenance.hrefLabel}
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}

const STATUS_MARK: Record<CapabilityStatus, string> = {
  supported: '✓',
  partial: '◐',
  unsupported: '✕',
  unknown: '?',
};

/**
 * state-*, not badge-*. The badge values are chosen to sit under white label text as
 * a fill and only clear 3:1 against the page — enough for a shape, short of the 4.5:1
 * that this small bold text needs, and in dark mode all four land between 3.08 and
 * 3.45:1.
 */
function StatusText({
  kind,
  notApplicable,
  text,
}: {
  kind: CapabilityStatus;
  notApplicable: boolean;
  text: string;
}) {
  const colour =
    kind === 'supported'
      ? 'var(--color-state-ok)'
      : kind === 'unsupported'
        ? 'var(--color-state-bad)'
        : kind === 'partial'
          ? 'var(--color-state-warn)'
          : 'var(--color-ink-2)';
  return (
    <span className="t-sm font-bold" style={{ color: colour }}>
      {/* An item that cannot exist here is not an item nobody checked, and '?' is the
          mark for the second. The word beside it already says 해당 없음; sharing the
          question mark made the badge contradict it. */}
      <span aria-hidden="true">{notApplicable ? '–' : STATUS_MARK[kind]} </span>
      {text}
    </span>
  );
}
