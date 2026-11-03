// @audit: a UX audit of the main screens at several sizes (small phone to tablet, landscape), light and
// dark. Screenshots and screens/audit/report.json: tap targets under 44px, text under 12px, anything
// off the side of the screen, clipped text, and text contrast under 4.5:1 (3:1 when large).
// Run with: npm run test:audit  (about 3 minutes; Chromium only)
const { test } = require('@playwright/test');
const { addHook } = require('../tools/monkey-page');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'screens', 'audit') + '/';
const SIZES = [['se', 320, 568], ['phone', 360, 740], ['big', 412, 915], ['land', 740, 360], ['tablet', 820, 1180]];

function measure() {   // runs in the page
  const out = { small: [], tiny: [], overflow: [], clipped: [], contrast: [] };
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < innerHeight; };
  const top = [...document.querySelectorAll('dialog[open]')].pop();
  const inScope = e => top ? top.contains(e) : !e.closest('dialog') && !(document.getElementById('over').classList.contains('show') && !e.closest('#over'));
  const name = e => (e.id ? '#' + e.id : e.tagName.toLowerCase()) + ' "' + (e.textContent || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 30) + '"';
  for (const e of document.querySelectorAll('button, select, a, input, [role=button], [role=radio]')) {
    if (!vis(e) || !inScope(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) out.small.push(name(e) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
  }
  const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; return [0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]), m[3] === undefined ? 1 : m[3]]; };
  const bgOf = e => { for (let x = e; x; x = x.parentElement) { const b = getComputedStyle(x).backgroundColor; const m = b.match(/[\d.]+/g); if (m && (m[3] === undefined || Number(m[3]) > 0.9)) return b; } return getComputedStyle(document.body).backgroundColor; };
  for (const e of document.querySelectorAll('body *')) {
    if (!vis(e) || !inScope(e) || ['SCRIPT', 'STYLE', 'CANVAS', 'svg'].includes(e.tagName)) continue;
    const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const s = getComputedStyle(e), fs = parseFloat(s.fontSize);
    if (own && fs < 12) out.tiny.push(name(e) + ' ' + fs + 'px');
    const r = e.getBoundingClientRect();
    if (r.right > innerWidth + 1 || r.left < -1) out.overflow.push(name(e) + ' ' + Math.round(r.left) + '–' + Math.round(r.right));
    if (own && (s.overflow === 'hidden' || s.textOverflow === 'ellipsis' || s.whiteSpace === 'nowrap') && e.scrollWidth > e.clientWidth + 1) out.clipped.push(name(e));
    if (own) {
      const [lf, af] = lum(s.color), [lb] = lum(bgOf(e));
      if (af < 0.95) continue;
      const ratio = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05), big = fs >= 24 || (fs >= 18.66 && Number(s.fontWeight) >= 700);
      if (ratio < (big ? 3 : 4.5) && !e.disabled && !e.closest('button:disabled')) out.contrast.push(name(e) + ' ' + ratio.toFixed(2));
    }
  }
  out.pageWidth = document.scrollingElement.scrollWidth + '/' + innerWidth;
  return out;
}

test('UX audit @audit', async ({ browser }, info) => {
  fs.mkdirSync(OUT, { recursive: true });
  test.skip(info.project.name !== 'android-chrome');
  test.setTimeout(600000);
  const report = {};
  for (const scheme of ['light', 'dark']) for (const [sz, w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: sz !== 'tablet', isMobile: sz !== 'tablet', deviceScaleFactor: 2, colorScheme: scheme, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.route(u => u.pathname.endsWith('/') || u.pathname.endsWith('/index.html'), async route => {
      const res = await route.fetch(); await route.fulfill({ response: res, body: addHook(await res.text()), headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } });
    });
    await page.addInitScript(() => { if (!sessionStorage.getItem('f')) { sessionStorage.setItem('f', 1); localStorage.clear(); localStorage.setItem('hexadek.stars.lv1', '3'); } });
    await page.goto(info.project.use.baseURL || 'http://127.0.0.1:8123/'); await page.waitForFunction(() => window.__t && window.__t.S);
    const shot = async (state, prep) => {
      try { await prep(); } catch (e) { report[scheme + ' ' + sz + ' ' + state] = { error: e.message.split('\n')[0] }; return; }
      await page.waitForTimeout(500);
      const key = scheme + ' ' + sz + ' ' + state;
      report[key] = await page.evaluate(measure);
      await page.screenshot({ path: OUT + scheme + '-' + sz + '-' + state + '.png' });
    };
    const closeAll = () => page.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); document.getElementById('intro').classList.remove('show'); });
    await shot('welcome', async () => {});
    await shot('game', async () => { await closeAll(); await page.evaluate(() => { const g = window.__t.g; g.board['0,0'] = [0, 0, 1, 1, 2]; g.board['1,0'] = [3, 3, 3]; g.board['-1,1'] = [4]; window.__t.after(); }); });
    await shot('intro', async () => { await page.locator('#mode').click(); });
    await shot('rules', async () => { await closeAll(); await page.locator('#help').click(); });
    await shot('settings', async () => { await closeAll(); await page.locator('#settings').click(); });
    for (const m of ['journey', 'daily', 'endless', 'classic', 'custom'])
      await shot('new-' + m, async () => { await closeAll(); await page.locator('#new').click(); await page.locator('#newmode').selectOption(m); });
    await shot('levels', async () => { await closeAll(); await page.locator('#new').click(); await page.locator('#newmode').selectOption('journey'); await page.locator('#newchoose').click(); });
    await shot('won', async () => { await closeAll(); await page.evaluate(() => { const g = window.__t.g; g.score = 600; g.hexadeks = 4; g.turn = g.deckSize; window.__t.after(); }); await page.waitForSelector('#over.show', { timeout: 8000 }); });
    await shot('daily-won', async () => { await page.evaluate(() => { document.getElementById('over').classList.remove('show'); }); await page.locator('#new').click(); await page.locator('#newmode').selectOption('daily'); await page.locator('#newdaily').click();
      await page.evaluate(() => { const g = window.__t.g; g.score = 600; g.hexadeks = 6; g.turn = g.deckSize; window.__t.after(); }); await page.waitForSelector('#over.show', { timeout: 8000 }); });
    await shot('endless-reward', async () => { await page.locator('#overnew').click(); await page.locator('#newmode').selectOption('endless'); await page.locator('#newendless').click();
      await page.evaluate(() => { const g = window.__t.g; g.turn = g.deckSize; window.__t.after(); }); await page.waitForSelector('#over.show', { timeout: 8000 }); });
    await ctx.close();
  }
  fs.writeFileSync(OUT + 'report.json', JSON.stringify(report, null, 1));
});
