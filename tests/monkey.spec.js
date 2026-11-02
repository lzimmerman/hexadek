// The monkey test (tools/monkey-page.js) in every browser engine: random taps, drags, buttons and
// keys, checking the game stays sound. Shorter than tools/monkey.js, since it runs in real time.
const { test, expect } = require('@playwright/test');
const { monkeyPage } = require('../tools/monkey-page');
const { openGame } = require('./helpers');

test('random play keeps the game sound', async ({ page }) => {
  test.setTimeout(240000);
  await openGame(page, { html: h => monkeyPage(h, { seed: 4242, steps: 300 }) });
  await page.waitForFunction(() => document.title.startsWith('MONKEY'), null, { timeout: 200000, polling: 1000 });
  const title = await page.title();
  expect(title, title).toMatch(/^MONKEY ok/);
});
