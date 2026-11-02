// @screens: screenshots of the main screens in every engine, light and dark, for a look side by side.
// Not part of the usual run: npm run test:screens (saves to screens/, then builds screens/index.html).
const { test } = require('@playwright/test');
const path = require('path');
const { openGame, cellPoint, setBoard } = require('./helpers');

const played = Object.fromEntries(Array.from({ length: 16 }, (_, i) => [i + 1, 1 + (i % 3)]));

for (const scheme of ['light', 'dark']) {
  test(`main screens, ${scheme} @screens`, async ({ page }, info) => {
    test.setTimeout(90000);
    const shot = name => page.screenshot({ path: path.join('screens', info.project.name, scheme + '-' + name + '.png') });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await openGame(page, { seen: false, stars: played });
    await shot('1-welcome');
    await page.locator('#welcomeclose').click();
    await page.locator('#new').click();
    await page.locator('#newchoose').click();
    await shot('2-all-levels');
    await page.locator('#levelgrid button.lv[data-n="17"]').click();
    await shot('3-level-card');
    await page.locator('#introgo').click();
    await shot('4-level');
    await setBoard(page, { '0,0': [3, 3, 0, 0, 5, 1, 1], '1,0': [1, 1, 1], '-1,1': [99] });
    const p = await cellPoint(page, '0,0');
    await page.mouse.move(p.x, p.y); await page.mouse.down();
    await page.waitForFunction(() => !!window.__t.ui.peek);
    await shot('5-peek');
    await page.mouse.up();
    const size = page.viewportSize();
    await page.setViewportSize({ width: size.height, height: size.width });   // on its side
    await page.waitForTimeout(300);
    await shot('6-landscape');
    await page.setViewportSize(size);
    await page.evaluate(() => { const g = window.__t.g; g.tray = [null, null, null]; g.next = null; g.turn = g.deckSize; g.score = 1320; window.__t.after(); });
    await page.waitForSelector('#over.show');
    await shot('7-end-card');
    await page.locator('#overnext').click();
    await page.locator('#help').click();
    await shot('8-how-to-play');
  });
}
