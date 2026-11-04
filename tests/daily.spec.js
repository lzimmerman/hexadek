// Daily puzzle: today's deck from the New game dialog, stars, Copy result, the streak and Restart.
const { test, expect } = require('@playwright/test');
const { openGame, game, slotPoint, cellPoint, tap, setBoard } = require('./helpers');

async function finishDeck(page, hasTouch) {   // jump to the last stack of the deck, then place it
  await game(page, () => { const g = window.__t.g; g.turn = g.deckSize - 1; g.tray = [g.tray[0], null, null]; g.next = null; g.deckLeft = 0; window.__t.after(); });
  await setBoard(page, {});
  await tap(page, hasTouch, await slotPoint(page, 0));
  await tap(page, hasTouch, await cellPoint(page, '0,0'));
}

test('Daily puzzle: today\'s deck, stars, Copy result and the streak', async ({ page, hasTouch, browserName, context }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 2, 12, 0));   // Monday 2 November 2026, noon
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = await openGame(page);
  await page.locator('#new').click();
  await page.locator('#newmode').selectOption('daily');
  await expect(page.locator('#dailyabout')).toContainText('Today, Mon 2 Nov: the week\'s gentlest.');
  await expect(page.locator('#dailybest')).toHaveText('');
  await page.locator('#newdaily').click();
  await expect(page.locator('#mode')).toHaveText('Daily · Mon 2 Nov');
  await expect(page.locator('#msg')).toHaveText(/^★ place \d+ · ★★ \d+ pts · ★★★ \d+ pts$/);
  const start = await game(page, () => window.__t.g.start);
  await game(page, () => { window.__t.g.score = dailyTargets(20261102).top; window.__t.g.hexadeks = 5; });
  await finishDeck(page, hasTouch);
  await expect(page.locator('#over')).toHaveClass(/show/, { timeout: 10000 });
  await expect(page.locator('#overstarbig')).toHaveText('★★★');
  await expect(page.locator('#overtext')).toContainText('Daily streak: 1 day.');
  await expect(page.locator('#overshare')).toBeVisible();
  if (browserName === 'chromium') {   // the text to paste in a message
    await page.locator('#overshare').click();
    await expect(page.locator('#overshare')).toHaveText('Copied!');
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toMatch(/^Hexadek \| 2 Nov · ⭐⭐⭐ [\d,]+\n(?:🟩){5}(?:⬜)+ 5\/\d+ deks$/u);
  }
  await expect(page.locator('#overrestart')).toHaveText('Play again');
  await page.locator('#overrestart').click();   // the same deck again
  expect(await game(page, () => [window.__t.g.start, window.__t.g.daily.date, window.__t.g.turn])).toEqual([start, 20261102, 0]);
  await page.locator('#new').click();
  await expect(page.locator('#newmode')).toHaveValue('daily');
  await expect(page.locator('#dailybest')).toHaveText(/^Today: ★★★ \d+ points\. Streak: 1 day\.$/);
  await expect(page.locator('#newdaily')).toHaveText('Back to today\'s puzzle');
  expect(errors).toEqual([]);
});

test('Daily puzzle: a shape Wednesday says so, and its result is v2', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 4, 12, 0));   // Wednesday 4 November 2026: the first, on Ring
  const errors = await openGame(page);
  await page.locator('#new').click();
  await page.locator('#newmode').selectOption('daily');
  await expect(page.locator('#dailyabout')).toContainText('Today, Wed 4 Nov: a steady one, on the Ring board.');
  await page.locator('#newdaily').click();
  expect(await game(page, () => [window.__t.g.holes, window.__t.g.daily.v])).toEqual(['ring', 2]);
  expect(errors).toEqual([]);
});
