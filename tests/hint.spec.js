// Hint: it shows a move without making it, counts once per position, and following it is a legal move
const { test, expect } = require('@playwright/test');
const { openGame } = require('./helpers');

test('hint shows a move, counted once per position', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => document.getElementById('intro').classList.remove('show'));
  // on an empty board: a tip, not a move, and not counted
  await page.locator('#hint').click();
  await expect(page.locator('#msg')).toHaveText('Start anywhere; keep the middle free.');
  expect(await page.evaluate(() => window.__t.g.hints)).toBeUndefined();
  await expect(page.locator('#status')).toHaveClass(/pulse/);   // the message pulses as it appears
  await page.evaluate(() => { const t = window.__t; place(t.g, 0, '0,0'); t.after(); });
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

// Messages fit the status line: every hint on one line on a 360px phone, and on a 320px one anything, however
// long, is shown whole (two smaller lines at worst), never cut off with "…" (play test, 2026-11-03)
for (const w of [320, 360]) test(`status messages fit a ${w}px phone`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 760 });
  const errors = await openGame(page);
  const fit = await page.evaluate(() => {
    const st = document.getElementById('status'), m = document.getElementById('msg');
    const show = (t, flash) => {   // as hud() does
      st.classList.toggle('flash', flash); m.textContent = t;
      st.classList.remove('tight', 'two');
      if (m.scrollWidth > m.clientWidth) st.classList.add('tight');
      if (m.scrollWidth > m.clientWidth) st.classList.add('two');
      return { t, two: st.classList.contains('two'), whole: m.scrollWidth <= m.clientWidth && m.scrollHeight <= m.clientHeight + 1 };
    };
    return [...Object.values(HINT_TEXT).map(t => show(t, true)),
            show('Dek! +360 (×3) · 2 stones broken · biggest combo yet! · New best!', true)];
  });
  for (const f of fit) expect(f.whole, f.t + ' is shown whole').toBe(true);
  if (w === 360) for (const f of fit.slice(0, -1)) expect(f.two, f.t + ' fits one line').toBe(false);
  expect(errors).toEqual([]);
});
