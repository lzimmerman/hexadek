// Monkey test: random taps, drags, buttons and keys on the real page, checking the game stays sound.
//
//   node tools/monkey.js [--steps 3000] [--runs 4] [--buttons 0.12] [--out DIR] [--chrome PATH]
//
// Builds a test copy of index.html in DIR (default: a temp folder) with a small hook for reading the
// game, then runs it in headless Chrome. Each step does one random thing a player could do: tap or
// drag on the board (mouse or touch), press any visible button (dialogs and the level grid too),
// or press Escape / Ctrl+Z. After each step it checks:
//   no script errors; every stack at most 12 tiles of valid colours or stones; a tray of 3;
//   a score that never goes negative; the end card shows only when the game has ended.
// Animation frames run on timers so Chrome's virtual clock drives them.

const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const steps = Number(opt('steps', 3000)), runs = Number(opt('runs', 4)), press = Number(opt('buttons', 0.12));   // share of steps that press a button
const out = opt('out', fs.mkdtempSync(path.join(os.tmpdir(), 'hexadek-monkey-')));
const chrome = opt('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
let html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const hook = '  let ending = null;';
if (!html.includes(hook)) { console.error('monkey: the hook line is missing from index.html: ' + hook.trim()); process.exit(2); }
html = html.replace(hook, hook + " window.__t = { get g() { return g; }, get state() { return state; }, get ending() { return ending; } };");

const page = seed => html
  .replace('<head>', `<head><script>
    window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);
    window.__errors = []; window.onerror = (m, u, l) => { window.__errors.push(m + ' @' + l); };
    try { localStorage.clear(); } catch (e) {}
  </script>`)
  .replace('</body>', `<script>
  (function () {
    let s = ${seed};
    const rnd = () => { let t = s = (s + 0x6D2B79F5) | 0; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const pick = a => a[Math.floor(rnd() * a.length)];
    const c = document.getElementById('c'), problems = [], seen = { games: new Set(), won: 0, over: 0, buttons: {} };
    const visible = b => !b.disabled && b.offsetParent !== null && b.getClientRects().length;
    function pe(type, x, y, kind) { c.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: kind, clientX: x, clientY: y, bubbles: true })); }
    function act() {
      const dlg = [...document.querySelectorAll('dialog[open]')].pop();
      const scope = dlg || document;
      const buttons = [...scope.querySelectorAll('button')].filter(b => visible(b) && (dlg || !b.closest('dialog')));
      const r = rnd();
      if (!dlg && r < ${1 - press - 0.03}) {
        const R = c.getBoundingClientRect(), kind = rnd() < 0.5 ? 'touch' : 'mouse';
        const x = R.left + rnd() * R.width, y = R.top + rnd() * R.height;
        pe('pointerdown', x, y, kind);
        if (rnd() < 0.4) for (let i = 1; i <= 4; i++) pe('pointermove', x + (rnd() - 0.5) * 80 * i, y + (rnd() - 0.5) * 80 * i, kind);
        const R2 = c.getBoundingClientRect();
        pe('pointerup', R2.left + rnd() * R2.width, R2.top + rnd() * R2.height, kind);
      } else if (r < 0.97 && buttons.length) {
        const b = pick(buttons); seen.buttons[b.id || b.textContent.trim().slice(0, 12)] = 1; b.click();
      } else {
        document.dispatchEvent(new KeyboardEvent('keydown', rnd() < 0.5 ? { key: 'Escape' } : { key: 'z', ctrlKey: true }));
      }
    }
    function check(i) {
      const T = window.__t, g = T.g;
      if (!g) return;
      seen.games.add(g.start + '/' + g.mode + '/' + (g.level || ''));
      for (const k in g.board) {
        const st = g.board[k];
        if (st.length > 12) problems.push(i + ': stack of ' + st.length + ' at ' + k);
        if (st.some(t => !(t === 99 || (Number.isInteger(t) && t >= 0 && t < g.colours)))) problems.push(i + ': bad tile at ' + k + ' ' + st);
      }
      if (g.tray.length !== 3) problems.push(i + ': tray of ' + g.tray.length);
      if (g.score < 0) problems.push(i + ': negative score');
      const card = document.getElementById('over').classList.contains('show');
      if (card && T.state !== 'won' && T.state !== 'over') problems.push(i + ': end card while ' + T.state);
      if (card && T.state === 'won') seen.wonCard = true;
      if (T.state === 'won' && !seen.lastWon) seen.won++; seen.lastWon = T.state === 'won';
      if (T.state === 'over' && !seen.lastOver) seen.over++; seen.lastOver = T.state === 'over';
    }
    let i = 0;
    function step() {
      try { act(); } catch (e) { problems.push(i + ': ' + e.message); }
      setTimeout(() => {
        try { check(i); } catch (e) { problems.push(i + ': check ' + e.message); }
        if (++i < ${steps} && problems.length + window.__errors.length < 5) return step();
        const all = window.__errors.concat(problems);
        document.title = 'MONKEY ' + (all.length ? 'PROBLEMS' : 'ok') + ' steps=' + i + ' games=' + seen.games.size +
          ' wins=' + seen.won + ' losses=' + seen.over + ' buttons=' + Object.keys(seen.buttons).length + (all.length ? ' :: ' + all.join(' | ') : '');
      }, 30 + Math.floor(rnd() * 200));
    }
    setTimeout(step, 500);
  })();
  </script></body>`);

let bad = 0;
for (let r = 0; r < runs; r++) {
  const file = path.join(out, 'monkey' + r + '.html');
  fs.writeFileSync(file, page(1234 + r * 7));
  const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--window-size=' + (r % 2 ? '844,390' : '430,860'),
    '--virtual-time-budget=' + (steps * 300 + 5000), '--dump-dom', 'file://' + file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 });
  const title = (dom.match(/<title>([^<]*)<\/title>/) || [])[1] || 'no result (did not finish)';
  console.log(`run ${r + 1} (${r % 2 ? 'landscape' : 'portrait'}): ${title.replace(/&amp;/g, '&')}`);
  if (!title.startsWith('MONKEY ok')) bad++;
}
process.exit(bad ? 1 : 0);
