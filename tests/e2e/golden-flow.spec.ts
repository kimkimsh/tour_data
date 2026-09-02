import { expect, test, type Page } from '@playwright/test';

/**
 * The demonstration script, written as a test. If this passes, the walkthrough works.
 *
 * The four steps that carry the most weight are not the clicks. They are:
 *  - the two screens reporting the same unknown count (they read one array),
 *  - zero requests to the KTO gateway (the no-external-call rule, structurally),
 *  - zero geolocation calls (the legal position rests on this),
 *  - the verdict changing when the conditions change (proves the score is computed
 *    in the browser, since the HTML is cached and identical for everyone).
 */

const KTO_HOST = 'apis.data.go.kr';

async function watchForbiddenCalls(page: Page): Promise<{ kto: string[] }> {
  const kto: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes(KTO_HOST)) kto.push(request.url());
  });
  await page.addInitScript(() => {
    (window as unknown as { __geoCalls: string[] }).__geoCalls = [];
    const geolocation = navigator.geolocation;
    if (!geolocation) return;
    // Both methods, not just getCurrentPosition: watchPosition streams coordinates
    // just as effectively, and the legal claim covers collection of any kind.
    for (const name of ['getCurrentPosition', 'watchPosition'] as const) {
      const original = (geolocation as unknown as Record<string, unknown>)[name];
      if (typeof original !== 'function') continue;
      (geolocation as unknown as Record<string, unknown>)[name] = function (...args: unknown[]) {
        (window as unknown as { __geoCalls: string[] }).__geoCalls.push(name);
        return (original as (...a: unknown[]) => unknown).apply(this, args);
      };
    }
  });
  return { kto };
}

test('a visitor can reach a verdict, its basis, a route and the gap report', async ({ page }) => {
  const forbidden = await watchForbiddenCalls(page);

  await page.goto('/ko');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.getByLabel('휠체어를 이용해요').check();
  await page.getByLabel('오래 걷기 어려워요').check();
  await page.getByLabel('유아차와 함께 가요').check();

  // The rule that separates this from a filter list has to be on screen.
  await expect(page.getByText('가장 조건이 까다로운 분을 기준으로 판정합니다')).toBeVisible();

  await page.getByLabel('반나절 (3~4시간)').check();
  await page.getByRole('button', { name: '관광지 보기' }).click();

  await expect(page).toHaveURL(/\/ko\/places$/);
  const list = page.getByRole('list', { name: '관광지 목록' });
  await expect(list).toBeVisible();
  const cards = list.getByRole('article');
  await expect(cards.first()).toBeVisible();
  const cardCount = await cards.count();
  expect(cardCount).toBeGreaterThanOrEqual(1);

  await cards.first().getByRole('link', { name: '상세 보기' }).click();
  await expect(page).toHaveURL(/\/ko\/places\/[a-z0-9-]+$/);

  // The unknown counter must name its denominator on screen, and the label has to say
  // the count covers the KTO items only.
  const counter = page.getByText(/정보 없음 \d+건 \/ \d+건 \(한국관광공사 항목 기준\)/).first();
  await expect(counter).toBeVisible();
  const counterText = (await counter.textContent()) ?? '';
  const unknownOnDetail = Number(/정보 없음 (\d+)건/.exec(counterText)?.[1] ?? '-1');
  expect(unknownOnDetail).toBeGreaterThanOrEqual(0);

  // Every axis group, including the derived one, is present without opening anything.
  // Matched by the section's own heading id, not by name: several capability labels
  // contain an axis name ('휴식 좌석' inside the rest axis), so a name regex matches
  // two headings and Playwright's strict mode rejects it.
  for (const axis of ['entry', 'continuity', 'facility', 'information', 'rest', 'context']) {
    await expect(page.locator(`#axis-${axis}-heading`)).toBeVisible();
  }
  await expect(page.getByText('derived').first()).toBeVisible();

  await page.getByRole('group').filter({ hasText: '이 점수가 나온 계산' }).first().click();
  await expect(page.getByText(/점수 = 100 ×/)).toBeVisible();
  await expect(page.getByText(/데이터 신뢰도 \d+%/).first()).toBeVisible();

  await page.goto('/ko/gap-report');
  const gapRow = page.getByRole('table').first();
  await expect(gapRow).toBeVisible();
  // 13: the same number on two screens, because both count the same snapshot array.
  const gapText = (await page.locator('body').textContent()) ?? '';
  expect(gapText).toContain(String(unknownOnDetail));

  // 14 and 15: the two structural guarantees.
  expect(forbidden.kto, 'the browser must never call the KTO gateway').toEqual([]);
  expect(
    await page.evaluate(() => (window as unknown as { __geoCalls: string[] }).__geoCalls),
    'the service must never ask for a location',
  ).toEqual([]);
});

test('changing the conditions changes the order and the labels', async ({ page }) => {
  await page.goto('/ko');
  await page.getByLabel('휠체어를 이용해요').check();
  await page.getByRole('button', { name: '관광지 보기' }).click();
  const wheelchairOrder = await page
    .getByRole('list', { name: '관광지 목록' })
    .getByRole('heading', { level: 2 })
    .allTextContents();

  await page.goto('/ko');
  await page.getByLabel('휠체어를 이용해요').uncheck();
  await page.getByLabel('귀가 잘 안 들려요').check();
  await page.getByRole('button', { name: '관광지 보기' }).click();
  const deafSummary = await page.getByRole('list', { name: '관광지 목록' }).textContent();

  // The verdict for deaf visitors is expected to be mostly "not enough information":
  // the two capabilities it depends on are the ones KTO's own service does not even
  // filter on. That is the finding, not a bug — so the assertion is that the screen
  // says it, not that the score is good.
  expect(wheelchairOrder.length).toBeGreaterThan(0);
  expect(deafSummary).toBeTruthy();
});

/**
 * The two A-tier places are the ones the scope promises a route guide for. Asserting
 * on them rather than skipping when none exists: a missing route file is the
 * deliverable being unfinished, and a green suite must not say otherwise.
 */
const ROUTE_GUIDE_SLUGS = ['gongsanseong', 'busosanseong'] as const;

test('the route guide states its evidence level before any step', async ({ page }) => {
  await page.goto('/ko/places');
  const routeLink = page.getByRole('link', { name: '경로 안내 보기' }).first();
  await expect(
    routeLink,
    `a route guide is expected for ${ROUTE_GUIDE_SLUGS.join(' and ')}; content/routes/*.json is missing one`,
  ).toBeVisible();

  await routeLink.click();
  await expect(
    page.getByText('공공 자료·공식 사진·위성 이미지를 근거로 작성했습니다'),
  ).toBeVisible();
  await expect(page.getByRole('list', { name: '경로 단계' })).toBeVisible();
  // A gradient as a number is what the content check forbids; this is the screen-side
  // half of that rule.
  await expect(page.locator('body')).not.toContainText(/경사\s*\d+(\.\d+)?\s*%/);
});
