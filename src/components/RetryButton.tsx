'use client';

import { useRouter } from 'next/navigation';

/**
 * Refreshes the route rather than reloading the document, so the retry does not
 * throw away the client state the visitor already has — the chosen conditions, a
 * half-written report.
 */
export function RetryButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button type="button" className="btn" onClick={() => router.refresh()}>
      {label}
    </button>
  );
}
