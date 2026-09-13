import { expect, test } from '@playwright/test';

/**
 * An address that names nothing has to say so in the status line, not only on screen.
 *
 * Every one of these answered 200 before. The locale tree was covered by a [...rest]
 * catch-all, which is a real page and therefore a real 200, and the three place
 * screens rendered a stand-in instead of calling notFound(). A crawler, a judge's link
 * checker and a search engine all read that as "this page exists".
 */
const MISSING = [
  '/ko/nope',
  '/en/nope',
  '/ko/places/no-such-place',
  '/ko/places/no-such-place/docent',
  '/ko/places/no-such-place/route-guide',
  '/admin/nope',
] as const;

for (const path of MISSING) {
  test(`${path} answers 404`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
  });
}

test('a real page still answers 200', async ({ page }) => {
  const response = await page.goto('/ko/places/gongsanseong');
  expect(response?.status()).toBe(200);
});

/**
 * generateMetadata fell back to the slug when no place matched, so the tab title of a
 * 200 page was whatever the caller put in the URL — a phishing line on the real domain.
 */
test('a slug that names nothing never reaches the title', async ({ page }) => {
  await page.goto('/ko/places/Account-Suspended-Call-02-1234-5678');
  await expect(page).not.toHaveTitle(/Account-Suspended/);
});

/**
 * The screen a wrong place slug reaches is rendered inside the real layout, so it
 * keeps the language, the navigation and the emergency button.
 */
test('the missing-place screen keeps the site around it', async ({ page }) => {
  await page.goto('/ko/places/no-such-place');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('이 주소에는 아무것도 없습니다');
});
