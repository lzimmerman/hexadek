// The monkey test's page: the game with a small hook for reading it, and a script that does random
// things a player could do and checks the game stays sound. Used by tools/monkey.js (headless
// Chrome) and tests/monkey.spec.js (Playwright, all three browser engines).
// The result goes in document.title: 'MONKEY ok ...' or 'MONKEY PROBLEMS ... :: what went wrong'.

const HOOK = '  let ending = null;';
// Exposes the game to tests: window.__t.g (the game), .state, .ending, .ui, and helpers for where
// cells and tray slots are drawn.
function addHook(html) {
  if (!html.includes(HOOK)) throw new Error('the hook line is missing from index.html: ' + HOOK.trim());
  return html.replace(HOOK, HOOK + " window.__t = { get g() { return g; }, get state() { return state; }, get ending() { return ending; }," +
    " get ui() { return ui; }, get S() { return S; }, cellXY: k => cellXY(k), slotXY: i => slotXY(i), after: () => after(), doPour: (a, b) => doPour(a, b), doPlace: (s, c) => doPlace(s, c) };");
}

function monkeyPage(html, { seed = 1234, steps = 3000, press = 0.12 } = {}) {
  return addHook(html)
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
}

module.exports = { addHook, monkeyPage, HOOK };
