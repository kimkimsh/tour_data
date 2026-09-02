import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * SPEC_ROUTES is the six routes docs/spec/08_accessibility_legal.md section 1.3 names
 * as the scan set; EXTRA_ROUTES is everything else a visitor can reach. The two lists
 * stay separate so the spec's own claim remains checkable against its own set.
 *
 * wcag22aa is deliberately absent from the tags. KWCAG 2.2 did not adopt several of
 * the WCAG 2.2 additions (target size, the focus-obscured pair), so failing a build
 * on them would fail it against a bar the certification does not use. Those are
 * treated as quality goals in the design system instead.
 *
 * An automated scan catches something like a third to a half of the 33 checkpoints.
 * A clean run here is not a compliance claim, which is why the wording on the site
 * says "self-assessment" and never "certified".
 */
const SPEC_ROUTES = [
  '/ko',
  '/ko/places',
  '/ko/places/gongsanseong',
  '/ko/places/gongsanseong/route-guide',
  '/ko/report',
  '/ko/gap-report',
] as const;

/**
 * Beyond what the spec asks for. Every one of these was outside the scan set while
 * being a screen a visitor reaches: the second locale (where a Korean string served
 * under lang="en" is exactly the kind of defect a scan finds), the audio screen, the
 * two diary screens, and the operator's screen.
 *
 * /admin/reports is included on purpose even though it renders its sign-in form
 * without a session — that form is what an unauthenticated visitor sees, so it is the
 * state worth scanning.
 */
const EXTRA_ROUTES = [
  '/en',
  '/en/places',
  '/en/places/gongsanseong',
  '/en/gap-report',
  '/ko/courses',
  '/ko/places/gongsanseong/docent',
  '/ko/diary',
  '/ko/diary/print',
  '/ko/credits',
  '/ko/privacy',
  '/admin/reports',
] as const;

for (const route of [...SPEC_ROUTES, ...EXTRA_ROUTES]) {
  test(`no axe violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    // The verdict panels compute after hydration; scanning before that would scan a
    // placeholder.
    await page.waitForLoadState('networkidle');

    // axe does not enter a closed <details>, so the calculation table — the screen
    // this whole service is an argument for — was never scanned. Opening them all
    // first is the difference between a check that can fail and one that cannot.
    await page.evaluate(() => {
      document.querySelectorAll('details').forEach((element) => {
        element.open = true;
      });
    });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // The map canvas is excluded when a map ships: a scan cannot see inside it.
      // That is a hand-off to manual checking, not an exemption.
      .exclude('.map-canvas')
      .analyze();

    const summary = results.violations.map(
      (violation) =>
        `${violation.id} (${violation.impact}) x${violation.nodes.length}: ${violation.help}`,
    );
    expect(summary, summary.join('\n')).toEqual([]);
  });
}
