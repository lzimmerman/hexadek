// Hint: it shows a move without making it, counts once per position, and following it is a legal move
const { test, expect } = require('@playwright/test');
const { openGame } = require('./helpers');

test('hint shows a move, counted once per position', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => document.getElementById('intro').classList.remove('show'));
  const before = await page.evaluate(() => JSON.stringify(window.__t.g.board));
  await page.locator('#hint').click();
  await expect(page.locator('#msg')).toHaveText(/^Hint: /);
  expect(await page.evaluate(() => JSON.stringify(window.__t.g.board))).toBe(before);   // shown, not made
  await page.locator('#hint').click(); await page.locator('#hint').click();
  expect(await page.evaluate(() => window.__t.g.hints)).toBe(1);
  // follow it: the hinted tray stack is picked, so tapping the glowing cell places it
  const placed = await page.evaluate(() => { const t = window.__t, h = hintMove(t.g); return h.from ? pour(t.g, h.from, h.to) : place(t.g, h.slot, h.to); });
  expect(placed).toBeTruthy();
  await page.evaluate(() => window.__t.after());
  await page.locator('#hint').click();
  expect(await page.evaluate(() => window.__t.g.hints)).toBe(2);
  expect(errors).toEqual([]);
});
