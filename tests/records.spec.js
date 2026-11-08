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

test('Classic keeps its best under its own key as its colours rise', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => localStorage.setItem('hexadek.best.standard.6c', '5'));   // a Custom game's best, 6 colours
  await page.locator('#new').click();
  await page.locator('#newmode').selectOption('classic');
  await page.locator('#newclassic').click();
  await expect(page.locator('#mode')).toHaveText('Classic · 5/13 colours');
  const r = await page.evaluate(() => {
    const g = window.__t.g;
    for (const k of Object.keys(g.board)) g.board[k] = [];
    g.hexadeks = 9; g.board['0,0'] = Array(9).fill(0); g.board['1,0'] = [0, 0, 0];
    window.__t.doPour('1,0', '0,0');   // the tenth dek: a sixth colour
    return { colours: g.colours, classic: localStorage.getItem('hexadek.best.standard.ramp' + CLASSIC_RAMP.max),
             custom: localStorage.getItem('hexadek.best.standard.6c'), shown: document.getElementById('best').textContent };
  });
  expect(r.colours).toBe(6);
  expect(Number(r.classic)).toBeGreaterThan(0);
  expect(r.custom).toBe('5');   // untouched
  await expect(page.locator('#best')).toHaveText(r.classic);
  expect(errors).toEqual([]);
});

test('the records panel: totals, and records by mode built from the play log', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => {
    document.getElementById('intro').classList.remove('show');
    localStorage.setItem('hexadek.stats', JSON.stringify({ deks: 120, games: 9, combo: 3, classic: 212 }));
    localStorage.setItem('hexadek.log', JSON.stringify([
      { t: '2026-11-01 10:00', game: 'Classic', level: null, result: 'over', score: 15000, placed: 180, hexadeks: 40 },
      { t: '2026-11-02 10:00', game: 'Level 2 · Ripples', level: 2, result: 'won', score: 900, placed: 25, hexadeks: 5 },
    ]));
  });
  await page.locator('#info').click();
  await expect(page.locator('#records')).toBeVisible();
  await expect(page.locator('#rectotals')).toContainText('212 turns');   // the longest Classic, from before the log
  const rows = page.locator('#recrows .recmode');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toHaveText('Classic1\u00a0game · best\u00a015,000 · most\u00a0turns\u00a0212 · last\u00a01\u00a0Nov');   // turns: the lifetime record wins
  await expect(rows.nth(1)).toHaveText(/Journey/);
  await page.locator('#recordsclose').click();
  // a game that's left with moves made counts, under its mode
  await page.evaluate(() => {
    const t = window.__t, h = hintMove(t.g);
    if (h.from) t.doPour(h.from, h.to); else t.doPlace(h.slot, h.to);
  });
  await page.locator('#restart').click();
  const ask = page.locator('#askyes');
  if (await ask.isVisible()) await ask.click();
  const recs = await page.evaluate(() => JSON.parse(localStorage.getItem('hexadek.records')));
  expect(Object.values(recs).reduce((n, o) => n + o.games, 0)).toBe(3);
  expect(errors).toEqual([]);
});
