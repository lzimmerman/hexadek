// Shared by the browser tests: open the game with a small hook for reading it, and tap, drag or
// hold on its board like a player.
const { addHook } = require('../tools/monkey-page');

// Opens the game. The page is served with the hook added (window.__t: the game, its state, and
// where cells and tray slots are drawn). Storage starts empty once per test; options:
//   seen: false shows the first-visit welcome; stars: { 1: 3, 2: 2 } as if those levels were played;
//   played: the version last played ('1.1.0' shows what's new since; null: before versions were kept),
//   by default this one, so nothing pops up;
//   html: a function to change the page's HTML before it loads (the monkey test uses it).
async function openGame(page, { seen = true, stars = {}, html, played = require('../package.json').version } = {}) {
  await page.route(u => u.pathname.endsWith('/') || u.pathname.endsWith('/index.html'), async route => {
    const res = await route.fetch();
    let body = await res.text();
    body = html ? html(body) : addHook(body);
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } });
  });
  await page.addInitScript(({ seen, stars, played }) => {   // once per tab, so a reload keeps the progress
    if (sessionStorage.getItem('__fresh')) return;
    sessionStorage.setItem('__fresh', '1');
    localStorage.clear();
    if (seen) localStorage.setItem('hexadek.seen', '1');
    if (played) localStorage.setItem('hexadek.version', played);
    for (const [n, s] of Object.entries(stars)) localStorage.setItem('hexadek.stars.lv' + n, String(s));
  }, { seen, stars, played });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('./');
  if (!html) await page.waitForFunction(() => window.__t && window.__t.g && window.__t.S);
  return errors;
}

const game = (page, fn, arg) => page.evaluate(fn, arg);
// Where a board cell or tray slot is on the page.
async function cellPoint(page, k) {
  return page.evaluate(k => { const r = document.getElementById('c').getBoundingClientRect(), [x, y] = window.__t.cellXY(k);
    return { x: r.left + x, y: r.top + y }; }, k);
}
async function slotPoint(page, i) {
  return page.evaluate(i => { const r = document.getElementById('c').getBoundingClientRect(), [x, y] = window.__t.slotXY(i);
    return { x: r.left + x, y: r.top + y }; }, i);
}
// A tap: a real touch on phones, a click elsewhere.
async function tap(page, hasTouch, p) {
  if (hasTouch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
async function drag(page, a, b) {
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(a.x + (b.x - a.x) * i / 8, a.y + (b.y - a.y) * i / 8);
  await page.mouse.up();
}
// Sets the board (cell -> tiles, bottom first; other cells empty) and redraws.
async function setBoard(page, board) {
  await page.evaluate(b => { const g = window.__t.g; for (const k in g.board) g.board[k] = b[k] ? b[k].slice() : []; window.__t.after(); }, board);
}

module.exports = { openGame, game, cellPoint, slotPoint, tap, drag, setBoard };
