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

const { monkeyPage } = require('./monkey-page');

let bad = 0;
for (let r = 0; r < runs; r++) {
  const file = path.join(out, 'monkey' + r + '.html');
  fs.writeFileSync(file, monkeyPage(html, { seed: 1234 + r * 7, steps, press }));
  const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--window-size=' + (r % 2 ? '844,390' : '430,860'),
    '--virtual-time-budget=' + (steps * 300 + 5000), '--dump-dom', 'file://' + file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 });
  const title = (dom.match(/<title>([^<]*)<\/title>/) || [])[1] || 'no result (did not finish)';
  console.log(`run ${r + 1} (${r % 2 ? 'landscape' : 'portrait'}): ${title.replace(/&amp;/g, '&')}`);
  if (!title.startsWith('MONKEY ok')) bad++;
}
process.exit(bad ? 1 : 0);
