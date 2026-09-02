/**
 * Section label. It names what the section is, in the gilt tone, followed by a rule
 * that runs to the edge of the column. A section without a role to name does not get
 * one.
 *
 * `as` is not styling. Wherever an eyebrow is the thing a section points at with
 * aria-labelledby, it is that section's heading and has to be one: a <p> target
 * leaves the section out of the heading outline entirely, and on the place detail
 * screen that hid seven sections — the verdict included — while the outline jumped
 * h1 to h3.
 */
export function Eyebrow({
  children,
  id,
  as = 'p',
}: {
  children: React.ReactNode;
  id?: string;
  as?: 'p' | 'h2' | 'h3';
}) {
  const Tag = as;
  return (
    <Tag className="eyebrow" id={id}>
      <span>{children}</span>
    </Tag>
  );
}
