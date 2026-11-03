// Records and milestones: "New best!" mid-game, and one note on the end card
const { test, expect } = require('@playwright/test');
const { openGame } = require('./helpers');

test('a new best mid-game, and a dek milestone on the end card', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => {
    document.getElementById('intro').classList.remove('show');
    localStorage.setItem('hexadek.stats', JSON.stringify({ deks: 49, games: 3 }));
    window.__t.g.prevBest = 10;   // as if an earlier game had scored 10
  });
  let sawBest = false;
  for (let i = 0; i < 400; i++) {
    const r = await page.evaluate(() => {
      const t = window.__t;
      if (document.getElementById('over').classList.contains('show') || isWon(t.g)) return 'end';
      const h = hintMove(t.g);
      if (!h) return 'end';
      if (h.from) t.doPour(h.from, h.to); else t.doPlace(h.slot, h.to);
      return document.getElementById('msg').textContent;
    });
    if (r === 'end') break;
    if (/New best!/.test(r)) sawBest = true;
  }
  expect(sawBest).toBe(true);
  await expect(page.locator('#overnote')).toHaveText('Your 50th dek in all!');
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('hexadek.stats')));
  expect(st.deks).toBeGreaterThan(49);
  expect(st.games).toBe(4);
  expect(errors).toEqual([]);
});
