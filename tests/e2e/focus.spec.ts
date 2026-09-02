import { expect, test } from '@playwright/test';

/**
 * Focus behaviours. Between them they catch most of what a manual screen-reader pass
 * would find, and they run in a few seconds.
 *
 * The first two cover the trap that catches almost everyone: a skip link whose target
 * has no tabindex scrolls the page and leaves focus where it was, so the next Tab
 * returns to the header. Asserting on document.activeElement rather than on scroll
 * position is what makes these able to fail — and BOTH skip links are asserted,
 * because testing only the one that worked is how the second one stayed broken.
 */
test('the skip link is the first tab stop and actually moves focus', async ({ page }) => {
  await page.goto('/ko');
  await page.keyboard.press('Tab');

  const firstStop = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    text: document.activeElement?.textContent?.trim(),
  }));
  expect(firstStop.tag).toBe('A');
  expect(firstStop.text).toBe('본문 바로가기');

  await page.keyboard.press('Enter');
  const focusedId = await page.evaluate(() => document.activeElement?.id);
  expect(focusedId).toBe('main-content');
});

test('the second skip link moves focus into the navigation', async ({ page }) => {
  await page.goto('/ko');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');

  const secondStop = await page.evaluate(() => document.activeElement?.textContent?.trim());
  expect(secondStop).toBe('주요 메뉴 바로가기');

  await page.keyboard.press('Enter');
  const focusedId = await page.evaluate(() => document.activeElement?.id);
  expect(focusedId).toBe('primary-nav');

  // And the next Tab lands inside the nav rather than back at the header.
  await page.keyboard.press('Tab');
  const inNav = await page.evaluate(
    () => document.activeElement?.closest('#primary-nav') !== null,
  );
  expect(inNav).toBe(true);
});

test('a route change moves focus into the new page', async ({ page }) => {
  await page.goto('/ko');
  await page.getByRole('link', { name: '관광지', exact: true }).click();
  await expect(page).toHaveURL(/\/ko\/places$/);

  const focused = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    inMain: document.activeElement?.closest('main') !== null,
  }));
  // The h1 is the target, so the heading text is what gets read.
  expect(focused.tag).toBe('H1');
  expect(focused.inMain).toBe(true);
});

test('the emergency dialog traps focus and returns it to its trigger', async ({ page }) => {
  await page.goto('/ko');
  const trigger = page.getByRole('button', { name: '긴급 연락' });
  await trigger.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: '긴급 연락처' })).toBeVisible();

  const insideDialog = await page.evaluate(
    () => document.activeElement?.closest('[role="dialog"]') !== null,
  );
  expect(insideDialog).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
