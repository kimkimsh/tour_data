import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// The screen strings come from the message file, so rewording one cannot fail a test
// that is about whether an element is there.
import ko from '../../messages/ko.json';

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
  // The screens a wrong address reaches. They were outside every list while being the
  // easiest pages in the build to ship broken: before the catch-all segment existed
  // Next answered them with a document that had no lang attribute, no heading and no
  // text at all, and no scan would have said so.
  '/ko/nope',
  '/en/nope',
  '/ko/places/no-such-place',
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
      // The tile surface is the provider's DOM and can change under us without a
      // commit here. The exclusion is precautionary rather than load-bearing: the same
      // page was scanned with it removed and came back with the same zero violations,
      // markers and all. What we own inside it has its own test below, which asserts
      // the marker contract directly rather than trusting a scan to notice.
      .exclude('.map-canvas')
      .analyze();

    const summary = results.violations.map(
      (violation) =>
        `${violation.id} (${violation.impact}) x${violation.nodes.length}: ${violation.help}`,
    );
    expect(summary, summary.join('\n')).toEqual([]);
  });
}

/**
 * The same scan at phone width, on the screens whose layout actually changes there.
 *
 * Every violation this suite has ever caught was found at the desktop viewport, which
 * is the one width at which a table cannot overflow its box: `.data-table` is
 * inline-size 100%, so at 1280px it fits and nothing scrolls. At 390px it does
 * scroll, and a scrolling box that cannot take focus is unreachable from a keyboard —
 * a wcag21a failure the desktop pass is structurally unable to see.
 */
const NARROW_ROUTES = [
  '/ko/gap-report',
  '/ko/places',
  '/ko/places/gongsanseong',
  '/ko/credits',
] as const;

for (const route of NARROW_ROUTES) {
  test(`no axe violations on ${route} at phone width`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      document.querySelectorAll('details').forEach((element) => {
        element.open = true;
      });
    });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('.map-canvas')
      .analyze();

    const summary = results.violations.map(
      (violation) =>
        `${violation.id} (${violation.impact}) x${violation.nodes.length}: ${violation.help}`,
    );
    expect(summary, summary.join('\n')).toEqual([]);
  });
}

/**
 * The markers, which the scan above steps over.
 *
 * Every one has to be a real link with a name that reads the way its list row reads,
 * big enough to hit, and legible against its own fill — none of which a raster pin on
 * a canvas could be.
 *
 * There are three outcomes and the test treats them differently, because a map that
 * never drew is not the same as markers that passed:
 *
 *  - markers on screen           → check all of them
 *  - no key configured           → nothing to check; say so in an annotation
 *  - key configured, auth refused → fail. That is this origin missing from the NCP
 *    application's Web 서비스 URL list, and it is the one state that looks like a
 *    clean run while checking nothing. Playwright serves these tests from
 *    http://127.0.0.1:3100, so that exact origin has to be registered alongside the
 *    dev server's.
 */
test('every map marker is a named link, or the map plainly did not load', async ({ page }) => {
  await page.goto('/ko/places');
  await page.waitForLoadState('networkidle');
  // The SDK, the key check and the first tiles are three round trips.
  await page.waitForTimeout(5000);

  const pins = page.locator('.map-pin');
  const count = await pins.count();

  if (count === 0) {
    // The list above is the whole service, and this is the sentence that says so.
    await expect(page.getByText(ko.map.unavailable)).toBeVisible();

    const refused = await page.getByText(ko.map.authHint).isVisible();
    expect(
      refused,
      `The map key is set but ${new URL(page.url()).origin} is not on the NCP ` +
        `application's Web 서비스 URL list, so no marker could be checked.`,
    ).toBe(false);

    test.info().annotations.push({
      type: 'map',
      description: 'no map key configured — markers not checked',
    });
    return;
  }

  test.info().annotations.push({ type: 'map', description: `${count} markers checked` });

  const listed = await page.locator('.tile h2').allInnerTexts();
  expect(count).toBe(listed.length);

  for (let index = 0; index < count; index += 1) {
    const pin = pins.nth(index);
    const name = (await pin.getAttribute('aria-label')) ?? '';
    const box = await pin.boundingBox();
    expect(name, `marker ${index} has no accessible name`).not.toBe('');
    // The name opens with the place, so a screen reader announces what it is before
    // it announces how it scored.
    expect(name.startsWith(listed[index]!.trim()), `marker ${index}: "${name}"`).toBe(true);
    expect(await pin.evaluate((el) => el.tagName)).toBe('A');
    expect(box!.width).toBeGreaterThanOrEqual(24);
    expect(box!.height).toBeGreaterThanOrEqual(24);
  }
});
