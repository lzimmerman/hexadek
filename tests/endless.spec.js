// Endless: start a run, clear a stage, pick a reward, carry the score on, lose, and keep the best run.
const { test, expect } = require('@playwright/test');
const { openGame, game, slotPoint, cellPoint, tap, setBoard } = require('./helpers');

async function finishStage(page, hasTouch) {   // jump to the last stack of the stage, then place it
  await game(page, () => { const g = window.__t.g; g.turn = g.deckSize - 1; g.tray = [g.tray[0], null, null]; g.next = null; g.deckLeft = 0; window.__t.after(); });
  await setBoard(page, {});
  await tap(page, hasTouch, await slotPoint(page, 0));
  await tap(page, hasTouch, await cellPoint(page, '0,0'));
}

test('Endless: stages, rewards and the best run', async ({ page, hasTouch }) => {
  const errors = await openGame(page);
  await page.locator('#new').click();
  await expect(page.locator('#endlessbest')).toHaveText('');
  await page.locator('#newendless').click();
  await expect(page.locator('#mode')).toHaveText('Endless · Stage 1');
  await expect(page.locator('#msg')).toHaveText(/^Stage 1: place 30 stacks\.$/);
  await game(page, () => { window.__t.g.score = 600; });
  await finishStage(page, hasTouch);
  await expect(page.locator('#over')).toHaveClass(/show/, { timeout: 10000 });
  await expect(page.locator('#overtitle')).toHaveText('Stage 1 cleared!');
  await expect(page.locator('#overperks button')).toHaveCount(2);
  await expect(page.locator('#overnext')).toBeHidden();
  await expect(page.locator('#overstage')).toBeDisabled();   // a reward first
  const perk = await page.locator('#overperks button').last().getAttribute('data-perk');
  const name = await page.locator('#overperks button').last().locator('b').textContent();
  await page.locator('#overperks button').first().click();   // a change of mind is fine
  await page.locator('#overperks button').last().click();
  await expect(page.locator('#overperks button').last()).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#overperks button').first()).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('#mode')).toHaveText('Endless · Stage 1');   // picking doesn't start the stage
  await page.locator('#overstage').click();
  await expect(page.locator('#mode')).toHaveText('Endless · Stage 2');
  await expect(page.locator('#msg')).toContainText('Stage 2: place ' + (perk === 'short' ? 25 : 30) + ' stacks · ' + name.replace(/^✓ /, ''));
  expect(await game(page, () => [window.__t.g.score, window.__t.g.endless.perk])).toEqual([600, perk]);
  // a full board with nothing to pour: the run is over, and its stage count is the best
  const full = {}; ['0,0', '1,0', '-1,0', '0,1', '0,-1', '1,-1', '-1,1', '2,0', '-2,0', '0,2', '0,-2', '2,-2', '-2,2', '2,-1', '-2,1', '1,1', '-1,-1', '1,-2', '-1,2']
    .forEach((k, i) => { full[k] = [i % 2 ? 0 : 1, i % 2 ? 1 : 0]; });
  await game(page, () => { window.__t.g.pours = 0; });
  await setBoard(page, full);
  await expect(page.locator('#overtitle')).toHaveText('Run over', { timeout: 10000 });
  await expect(page.locator('#overtext')).toContainText('You cleared 1 stage, with 600 points: your best run!');
  await expect(page.locator('#overperks')).toBeHidden();
  await page.locator('#overnew').click();
  await expect(page.locator('#endlessbest')).toHaveText('Your best: 1 stage, 600 points.');
  expect(errors).toEqual([]);
});

test('Endless: Restart asks before starting the run again', async ({ page }) => {
  await openGame(page);
  await page.locator('#new').click();
  await page.locator('#newendless').click();
  const run = await game(page, () => window.__t.g.endless.run);
  await game(page, () => { window.__t.g.endless.stage = 4; window.__t.after(); });   // well into a run
  await page.locator('#restart').click();
  await expect(page.locator('#asktext')).toContainText('Restart this run from stage 1');
  await page.locator('#askyes').click();
  expect(await game(page, () => [window.__t.g.endless.stage, window.__t.g.endless.run])).toEqual([1, run]);
});
