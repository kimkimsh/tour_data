import { expect, test, type Page } from '@playwright/test';

/**
 * What a screen reader actually runs together, rather than what the page contains.
 *
 * Accessible names and browse-mode lines are built by concatenating the text of
 * adjacent nodes. Flex and grid `gap`, margins and stacked blocks all separate things
 * visually while contributing nothing to that text, and Chrome leaves whitespace-only
 * text nodes out of the accessibility tree — so a written {' '} disappears with them.
 * Two values that look separated are then spoken as one word:
 * 「방문 가능휠체어 이용 기준」, 「1330 관광통역안내1330」, 「재생 시간2분 4초」.
 *
 * ── Why this reads textContent and not an accessible name ──
 *
 * Playwright computes accessible names to the specification, which inserts a space
 * between block-level descendants. Chrome does not, and Chrome is what NVDA reads.
 * So `ariaSnapshot()` reports the masthead as 「모두의 백제 Gongju · Buyeo」 whether
 * or not the separator is there, and a test written against it passes over the
 * defect without seeing it — which is how it was first written here, and it passed
 * against a build with the separator deliberately removed.
 *
 * textContent concatenates exactly as Chrome does. Nodes marked aria-hidden are
 * stripped first, because those are removed from speech and their glyphs would
 * otherwise look like defects.
 *
 * Nothing else in the suite can see this. axe has no rule for it: the accessible name
 * is present and non-empty, which is all the name rules ask. A visual pass cannot see
 * it either, because the gap is drawn correctly. It took reading an NVDA speech log.
 */

/** Set before first paint: the per-condition verdict rows do not render without it. */
async function withConditions(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'modu-baekje.conditions.v1',
      JSON.stringify({
        personaIds: ['P1a', 'P1b', 'P2a'],
        cognitiveOption: false,
        budgetMode: 'full_day',
      }),
    );
  });
}

/** The text a screen reader has to work with: everything spoken, in document order. */
async function spokenText(page: Page, selector = 'body'): Promise<string> {
  return page.locator(selector).evaluate((root) => {
    const clone = root.cloneNode(true) as HTMLElement;
    for (const node of clone.querySelectorAll('[aria-hidden="true"], script, style')) {
      node.remove();
    }
    return clone.textContent ?? '';
  });
}

/**
 * Each entry is a string NVDA spoke as one run before the separators were added.
 * They are kept verbatim, so removing a separator puts the original defect back and
 * turns this red.
 */
const GLUED: Array<{ path: string; strings: string[] }> = [
  {
    path: '/ko',
    strings: ['모두의 백제Gongju · Buyeo'],
  },
  {
    path: '/ko/places',
    strings: [
      '방문 가능휠체어 이용 기준',
      '주의 필요휠체어 이용 기준',
      '정보 없음휠체어 이용 기준',
      '다른 곳 권장눈이 잘 안 보임 기준',
      '주의 필요동행 전체',
      '정보 없음동행 전체',
      '방문 가능동행 전체',
      '다른 곳 권장동행 전체',
    ],
  },
  {
    path: '/ko/places/gongsanseong',
    strings: [
      '정보 없음기준 항목',
      '주의 필요기준 항목',
      '방문 가능기준 항목',
      '응급실1,627m',
      // The evidence rows: status against the label that says where the item came from.
      '정보 없음우리가 더한 항목',
      '일부 가능우리가 더한 항목',
      '이용 가능우리가 더한 항목',
      '이용 불가우리가 더한 항목',
      '해당 없음우리가 더한 항목',
    ],
  },
  {
    path: '/ko/places/gongsanseong/docent',
    strings: ['재생 시간2분', '재생 시간1분', '재생 시간3분'],
  },
];

for (const { path, strings } of GLUED) {
  test(`${path} speaks no two values as one word`, async ({ page }) => {
    await withConditions(page);
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const text = await spokenText(page);
    for (const glued of strings) {
      expect(text, `「${glued}」 is spoken as one word`).not.toContain(glued);
    }
  });
}

/**
 * The emergency sheet is behind its trigger, so its text is only in the document once
 * the dialog is open. It is also the screen that matters most: a visitor reaches it
 * when something has gone wrong, and the number ran onto the end of the centre's name.
 */
test('the emergency sheet separates each name from its number', async ({ page }) => {
  await page.goto('/ko');
  await page.getByRole('button', { name: '긴급 연락' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const text = await spokenText(page, '[role="dialog"]');
  for (const glued of ['관광통역안내1330', '소방·구급119', '(국내)02-3210-0404', '(장애인콜택시)1644-5588']) {
    expect(text, `「${glued}」 is spoken as one word`).not.toContain(glued);
  }
});

/**
 * There is deliberately no pattern rule here, only the list above.
 *
 * A scan for a Hangul syllable against a Latin letter or a digit was tried and
 * removed. textContent has no line breaks, so it cannot tell an inline run from two
 * stacked blocks, and a screen reader reads two blocks as two lines: it reported
 * 「우리가 더한 항목content/facilities.json」, 「공주중동성당TarRlteTarService1」 and
 * 「매우 높음detailWithTour2.handicapetc」, none of which NVDA ever spoke as one
 * utterance. It also cannot see the worst real case — 「방문 가능휠체어 이용 기준」 is
 * Hangul against Hangul, which no character rule separates from ordinary prose.
 *
 * A check that fires on correct pages gets switched off, so what is kept is the set
 * that was measured. New instances are found the way these were: by reading a speech
 * log, and then added here.
 */
