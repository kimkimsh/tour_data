import type { SuitabilityLabel } from '@/domain/types';

/**
 * Colour, mark and word together. Colour alone must never carry the verdict, and
 * the mark is a text character rather than an icon font so it survives a
 * high-contrast mode and a screen reader reading the badge as one string.
 */
const PRESENTATION: Record<SuitabilityLabel, { className: string; mark: string }> = {
  방문가능: { className: 'badge badge--visitable', mark: '✓' },
  주의: { className: 'badge badge--caution', mark: '⚠' },
  대체추천: { className: 'badge badge--blocked', mark: '✕' },
  정보없음: { className: 'badge badge--unknown', mark: '?' },
};

export function VerdictBadge({
  label,
  text,
  size = 'md',
}: {
  label: SuitabilityLabel;
  text: string;
  size?: 'md' | 'lg';
}) {
  const { className, mark } = PRESENTATION[label];
  return (
    <span className={className} style={size === 'lg' ? { fontSize: '1.05rem', padding: '0.3rem 0.8rem' } : undefined}>
      <span aria-hidden="true">{mark}</span>
      {text}
    </span>
  );
}
