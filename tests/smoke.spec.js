// The game's main paths, in every browser engine: it loads cleanly, a level plays to its end card,
// pours work by drag and by tap, holding a stack peeks at it, the dialogs open, and progress
// survives a reload.
const { test, expect } = require('@playwright/test');
const { openGame, game, cellPoint, slotPoint, tap, drag, setBoard } = require('./helpers');

test('loads cleanly, with the welcome, the font and a theme', async ({ page }) => {
  const errors = await openGame(page, { seen: false });
  await expect(page.locator('#welcome')).toBeVisible();
  await expect(page.locator('#mode')).toHaveText(/^Level 1 · First steps/);
  expect(await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('600 16px Lexend'); })).toBe(true);
  await page.locator('#welcomeclose').click();
  await expect(page.locator('#welcome')).toBeHidden();
  await expect(page.locator('#chapdots')).toContainText('Chapter 1 · 1 of 12');
  expect(errors).toEqual([]);
});

test('plays a level to its end card by tapping', async ({ page, hasTouch }) => {
  const errors = await openGame(page);
  for (let i = 0; i < 80; i++) {
    const s = await game(page, () => {
      const T = window.__t, g = T.g;
      return { state: T.state, turn: g.turn, slot: g.tray.findIndex(t => t), cell: Object.keys(g.board).find(k => !g.board[k].length) };
    });
    if (s.state === 'over' || s.state === 'won') break;
    if (await page.locator('#giveup').isVisible()) { await page.locator('#giveup').click(); continue; }
    if (s.slot < 0 || !s.cell) break;
    await tap(page, hasTouch, await slotPoint(page, s.slot));
    await tap(page, hasTouch, await cellPoint(page, s.cell));
    await page.waitForFunction(t => window.__t.g.turn > t, s.turn);
  }
  await expect(page.locator('#over')).toHaveClass(/show/, { timeout: 10000 });
  await expect(page.locator('#overtitle')).toHaveText(/Deck complete!|No room left/);
  expect(errors).toEqual([]);
});

test('pours by dragging and by tapping', async ({ page, hasTouch }) => {
  const errors = await openGame(page);
  await setBoard(page, { '0,0': [1, 1, 1], '1,0': [1, 1], '-1,0': [2, 2] });
  await drag(page, await cellPoint(page, '1,0'), await cellPoint(page, '0,0'));
  await expect.poll(() => game(page, () => window.__t.g.board['0,0'].length)).toBe(5);
  await tap(page, hasTouch, await cellPoint(page, '-1,0'));           // select a stack...
  await tap(page, hasTouch, await cellPoint(page, '-1,1'));           // ...and tap an empty neighbour
  await expect.poll(() => game(page, () => window.__t.g.board['-1,1'].length)).toBe(2);
  expect(errors).toEqual([]);
});

test('holding a stack peeks at it, and letting go changes nothing', async ({ page }) => {
  const errors = await openGame(page);
  await setBoard(page, { '0,0': [3, 3, 0, 0, 5, 1, 1] });
  const p = await cellPoint(page, '0,0'), before = await game(page, () => JSON.stringify(window.__t.g.board));
  await page.mouse.move(p.x, p.y); await page.mouse.down();
  await expect.poll(() => game(page, () => !!window.__t.ui.peek)).toBe(true);
  await expect(page.locator('#peeklive')).toContainText('Stack: 2 stars, 1 hexagon, 2 hearts, 2 drops');
  await page.mouse.up();
  expect(await game(page, () => [!!window.__t.ui.peek, window.__t.ui.sel, JSON.stringify(window.__t.g.board)])).toEqual([false, null, before]);
  expect(errors).toEqual([]);
});

test('dialogs: How to play, play data, New game and All levels', async ({ page }) => {
  const errors = await openGame(page, { stars: { 1: 3, 2: 2 } });
  await page.locator('#help').click();
  await expect(page.locator('#rules')).toBeVisible();
  await page.locator('#copylog').click();
  await expect(page.locator('#logtext')).toBeVisible();
  await expect(page.locator('#logtext')).toHaveValue(/Hexadek play data/);
  await page.locator('#rulesclose').click();
  await expect(page.locator('#rules')).toBeHidden();
  await page.locator('#new').click();
  await expect(page.locator('#newgame')).toBeVisible();
  await page.locator('#newchoose').click();
  await expect(page.locator('#levelgrid button.lv')).toHaveCount(72);
  await expect(page.locator('#levelgrid button.lv.primary')).toHaveText(/^3/);   // the next level to play
  await page.locator('#levelgrid button.lv[data-n="2"]').click();
  await expect(page.locator('#intro')).toHaveClass(/show/);
  await expect(page.locator('#introlevel')).toContainText('Level 2 of 72');
  expect(errors).toEqual([]);
});

test('New game: Classic, and a Custom game that Restart keeps', async ({ page }) => {
  const errors = await openGame(page);
  await page.locator('#new').click();
  await expect(page.locator('#newmode')).toHaveValue('journey');   // the mode last played
  await expect(page.locator('#newclassic')).toBeHidden();
  await page.locator('#newmode').selectOption('classic');
  await page.locator('#newclassic').click();
  await expect(page.locator('#mode')).toHaveText('Classic');
  await expect(page.locator('#deckbar')).toBeHidden();
  await page.locator('#new').click();
  await expect(page.locator('#newmode')).toHaveValue('classic');
  await page.locator('#newmode').selectOption('custom');
  await page.locator('#newcolours').selectOption('3');
  await page.locator('#newpours').selectOption('free');
  await page.locator('#newlength').selectOption('50');
  await page.locator('#newcustom').click();
  await expect(page.locator('#mode')).toHaveText('Deck of 50 · free pours · 3 colours');
  await expect(page.locator('#decktext')).toHaveText('0 / 50');
  const first = await game(page, () => JSON.stringify(window.__t.g.tray));
  await page.locator('#restart').click();
  expect(await game(page, () => ({ deck: window.__t.g.deckSize, tray: JSON.stringify(window.__t.g.tray) })))
    .toEqual({ deck: 50, tray: first });
  await page.locator('#new').click();   // the dialog remembers the custom settings
  await expect(page.locator('#newmode')).toHaveValue('custom');
  await expect(page.locator('#newpours')).toHaveValue('free');
  await expect(page.locator('#newlength')).toHaveValue('50');
  await expect(page.locator('#newcolours')).toHaveValue('3');
  expect(errors).toEqual([]);
});

test('Custom: a board with holes, kept by Restart and a reload', async ({ page, hasTouch }) => {
  const errors = await openGame(page);
  await page.locator('#new').click();
  await page.locator('#newmode').selectOption('custom');
  await page.locator('#newboard').selectOption('bridge');
  await page.locator('#newcustom').click();
  await expect(page.locator('#mode')).toHaveText('Classic · Bridge');
  const cells = () => game(page, () => Object.keys(window.__t.g.board).length);
  expect(await cells()).toBe(15);
  // a tap on a hole places nothing; a tap on a real cell does
  await tap(page, hasTouch, await slotPoint(page, 0));
  await tap(page, hasTouch, await cellPoint(page, '1,0'));
  expect(await game(page, () => window.__t.g.turn)).toBe(0);
  await tap(page, hasTouch, await slotPoint(page, 0));
  await tap(page, hasTouch, await cellPoint(page, '0,0'));
  await expect.poll(() => game(page, () => window.__t.g.turn)).toBe(1);
  await page.reload();
  await page.waitForFunction(() => window.__t && window.__t.g);
  expect(await cells()).toBe(15);
  await page.locator('#restart').click();
  await page.locator('#askyes').click();
  await expect.poll(() => game(page, () => window.__t.g.turn)).toBe(0);
  expect(await cells()).toBe(15);
  await page.locator('#new').click();
  await expect(page.locator('#newboard')).toHaveValue('bridge');
  expect(errors).toEqual([]);
});

test('See results: a Classic game ends on request, with its end card, and is logged', async ({ page, hasTouch }) => {
  const errors = await openGame(page);
  await page.locator('#new').click();
  await expect(page.locator('#newwarn')).toBeHidden();   // nothing played yet
  await expect(page.locator('#newcurrent')).toBeHidden();
  await page.locator('#newcancel').click();
  await tap(page, hasTouch, await slotPoint(page, 0));   // a level in progress: no End game, as leaving loses it
  await tap(page, hasTouch, await cellPoint(page, '0,0'));
  await page.locator('#new').click();
  await expect(page.locator('#newwarn')).toHaveText('The game you are playing will be lost.');
  await expect(page.locator('#newcurrent')).toBeHidden();
  await page.locator('#newmode').selectOption('classic');
  await page.locator('#newclassic').click();
  await tap(page, hasTouch, await slotPoint(page, 0));
  await tap(page, hasTouch, await cellPoint(page, '1,0'));
  await expect.poll(() => game(page, () => window.__t.g.turn)).toBe(1);
  await page.locator('#new').click();
  await expect(page.locator('#newwarn')).toBeHidden();
  await expect(page.locator('#newcurtext')).toHaveText(/^Classic · \d+ points\. Its score is kept/);
  await page.locator('#newend').click();
  await expect(page.locator('#over')).toBeVisible();
  await expect(page.locator('#overtitle')).toHaveText('Game ended');
  await expect(page.locator('#overundo')).toBeHidden();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hexadek.log')).pop().result)).toBe('ended');
  await page.reload();   // still ended after a reload
  await page.waitForFunction(() => window.__t && window.__t.g);
  await expect(page.locator('#over')).toBeVisible();
  await page.locator('#overnew').click();   // an ended game isn't in progress
  await expect(page.locator('#newcurrent')).toBeHidden();
  expect(errors).toEqual([]);
});

test('end card: every dek but not ★★★ points to combos', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => { const T = window.__t, g = T.g, M = levelTargets(g.level).M;
    g.turn = g.deckSize; g.hexadeks = M; g.score = M * 120; T.after(); });
  await expect(page.locator('#over')).toBeVisible();
  await expect(page.locator('#overtext')).toContainText('★★★ takes combos');
  expect(errors).toEqual([]);
});

test('keeps the game after a reload', async ({ page, hasTouch }) => {
  await openGame(page);
  await tap(page, hasTouch, await slotPoint(page, 0));
  await tap(page, hasTouch, await cellPoint(page, '0,0'));
  await page.waitForFunction(() => window.__t.g.turn === 1);
  const before = await game(page, () => JSON.stringify(window.__t.g.board));
  await page.reload();
  await page.waitForFunction(() => window.__t && window.__t.g);
  expect(await game(page, () => [window.__t.g.turn, JSON.stringify(window.__t.g.board)])).toEqual([1, before]);
});
