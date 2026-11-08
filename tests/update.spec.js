// The update check: an app left open on the home screen offers a newer release when it comes back to the screen
const { test, expect } = require('@playwright/test');
const { openGame } = require('./helpers');

test('a newer release is offered under the title, and tapping it reloads into it', async ({ page }) => {
  await page.clock.install();
  const errors = await openGame(page);
  const shown = await page.locator('#version').textContent();
  await expect(page.locator('#update')).toBeHidden();
  const before = await page.evaluate(() => {   // a move, to see it survive the reload
    document.getElementById('intro').classList.remove('show');
    const t = window.__t, h = hintMove(t.g);
    if (h.from) t.doPour(h.from, h.to); else t.doPlace(h.slot, h.to);
    return JSON.stringify([t.g.turn, t.g.score, t.g.board]);
  });
  // the server now has a newer release (the page's own HTML with the version changed)
  const newer = 'v99.0.0';
  await page.route(u => u.pathname.endsWith('/index.html'), async route => {
    const res = await route.fetch();
    const body = (await res.text()).replace('id="version">' + shown, 'id="version">' + newer);
    await route.fulfill({ response: res, body });
  });
  const back = () => page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await back();   // too soon after loading: no check yet
  await page.waitForTimeout(200);
  await expect(page.locator('#update')).toBeHidden();
  await page.clock.fastForward('31:00');
  await back();
  await expect(page.locator('#update')).toHaveText('Update to ' + newer);
  await expect(page.locator('#version')).toBeHidden();
  // tapping reloads (from the same server, so the version under the title is the newer one)
  await page.unroute(u => u.pathname.endsWith('/index.html'));
  await Promise.all([page.waitForEvent('load'), page.locator('#update').click()]);
  await expect(page.locator('#version')).toHaveText(shown);   // the test server still has this release
  await expect(page.locator('#update')).toBeHidden();
  await page.waitForFunction(() => window.__t && window.__t.g);
  expect(await page.evaluate(() => JSON.stringify([window.__t.g.turn, window.__t.g.score, window.__t.g.board]))).toBe(before);
  expect(errors).toEqual([]);
});

test('the same release: nothing is offered', async ({ page }) => {
  await page.clock.install();
  const errors = await openGame(page);
  await page.clock.fastForward('31:00');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(500);
  await expect(page.locator('#update')).toBeHidden();
  await expect(page.locator('#version')).toBeVisible();
  expect(errors).toEqual([]);
});

test("after an update, what's new once; never on a first visit", async ({ page }) => {
  const errors = await openGame(page, { played: '1.1.0' });
  const ver = (await page.locator('#version').textContent()).trim();
  await expect(page.locator('#whatsnew')).toBeVisible();
  await expect(page.locator('#wntitle')).toHaveText('Updated to ' + ver);
  await expect(page.locator('#wnlist li').first()).toBeVisible();
  await page.locator('#wnok').click();
  await expect(page.locator('#whatsnew')).toBeHidden();
  await page.reload();
  await page.waitForFunction(() => window.__t && window.__t.g);
  await expect(page.locator('#whatsnew')).toBeHidden();   // once
  expect(errors).toEqual([]);
});

test("a first visit: the welcome, not what's new", async ({ page }) => {
  const errors = await openGame(page, { seen: false, played: null });
  await expect(page.locator('#welcome')).toBeVisible();
  await expect(page.locator('#whatsnew')).toBeHidden();
  expect(errors).toEqual([]);
});

test('How to play closes from the top, wherever it is scrolled to', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => document.getElementById('intro').classList.remove('show'));
  await page.locator('#help').click();
  await page.waitForTimeout(300);   // opening focuses the heading, which scrolls to the top
  const at = await page.evaluate(() => {
    const d = document.getElementById('rules'); d.scrollTop = d.scrollHeight / 2;
    return [d.scrollTop, document.getElementById('rulesx').getBoundingClientRect().top - d.getBoundingClientRect().top];
  });
  expect(at[0]).toBeGreaterThan(1000);   // well down the help...
  expect(at[1]).toBeLessThan(40);        // ...and the close button still at its top
  await page.locator('#rulesx').click();
  await expect(page.locator('#rules')).toBeHidden();
  expect(errors).toEqual([]);
});
