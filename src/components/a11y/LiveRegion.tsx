'use client';

/**
 * A polite announcement area. It must exist in the DOM from first paint and stay
 * visible to assistive technology: a region created on demand does not announce
 * its first message, and one hidden with display:none or the hidden attribute
 * never announces at all.
 *
 * One per page. Several polite regions queue against each other.
 */
export function LiveRegion({ message }: { message: string }) {
  return (
    <div role="status" className="sr-only">
      {message}
    </div>
  );
}
