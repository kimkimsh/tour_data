import type { CapabilityStatus } from '@/domain/types';

/**
 * The one element this service is built around: a claim next to the machinery
 * behind it. The left column is what a visitor reads; the right column is the
 * upstream sentence, the raw field name and the date, set in monospace because it
 * is machine text and looking like machine text is the point.
 *
 * `provenance` is required. A row without it would be an unsourced claim, which is
 * the thing this whole screen exists to refuse.
 */
export function EvidenceRow({
  title,
  statusText,
  statusKind,
  quotedDetail,
  provenance,
  absenceExplanation,
  derived,
}: {
  title: string;
  statusText: string;
  statusKind: CapabilityStatus;
  quotedDetail: string | null;
  provenance: string;
  absenceExplanation: string | null;
  derived: boolean;
}) {
  return (
    <div className="evidence">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="subhead !tracking-normal">{title}</h3>
          <StatusText kind={statusKind} text={statusText} />
          {derived ? (
            <span className="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-[var(--color-ink-2)]">
              derived
            </span>
          ) : null}
        </div>

        {quotedDetail ? (
          <blockquote className="mt-2 border-l-2 border-[var(--color-rule-strong)] pl-3 text-[0.97rem]">
            {quotedDetail}
          </blockquote>
        ) : null}

        {statusKind === 'unknown' ? (
          <p className="blank-slot mt-2 text-[0.94rem]">{absenceExplanation}</p>
        ) : null}
      </div>

      <p className="evidence__provenance">{provenance}</p>
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
function StatusText({ kind, text }: { kind: CapabilityStatus; text: string }) {
  const colour =
    kind === 'supported'
      ? 'var(--color-state-ok)'
      : kind === 'unsupported'
        ? 'var(--color-state-bad)'
        : kind === 'partial'
          ? 'var(--color-state-warn)'
          : 'var(--color-ink-2)';
  return (
    <span className="text-[0.93rem] font-bold" style={{ color: colour }}>
      <span aria-hidden="true">{STATUS_MARK[kind]} </span>
      {text}
    </span>
  );
}
