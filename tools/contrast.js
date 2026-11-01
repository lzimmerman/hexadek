// Contrast check for Hexadek's colour themes (themes.js): node tools/contrast.js [theme]
//
// Uses the WCAG contrast ratio (1 to 21). "Must" pairs are text and key signals: below their
// minimum the line is marked FAIL and the script exits with an error. "Should" pairs are
// board shapes and outlines: below their minimum they're marked low, as a prompt to look.
// Tile colours come from COLOURS in index.html, so the check follows the game.

const fs = require('fs'), path = require('path');
const { THEMES } = require(path.join(__dirname, '..', 'themes.js'));
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const TILES = [], list = html.match(/const COLOURS = \[([\s\S]*?)\];/)[1], re = /\['(#[0-9a-f]{6})', '(\w+)'\]/gi;
for (let m; (m = re.exec(list));) TILES.push([m[1], m[2]]);   // (no matchAll: works on older Node too)
const STONE = html.match(/STONE_COLOUR = '(#[0-9a-f]{6})'/i)[1];

function lum(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// [foreground, background, minimum, what it is]
const MUST = [
  ['ink', 'bg', 7, 'main text on the page'],
  ['ink', 'panel', 7, 'main text on cards and buttons'],
  ['muted', 'bg', 4.5, 'labels and hints on the page'],
  ['muted', 'panel', 4.5, 'hints on cards'],
  ['accent', 'panel', 4.5, 'accent text on cards (level label, tutorial hint)'],
  ['accent', 'bg', 3, 'title accent, large'],
  ['on-accent', 'accent', 4.5, 'primary button text'],
  ['good', 'panel', 4.5, '"Hexadek!" in the status line'],
  ['warn', 'bg', 3, 'pours running low (large bold number)'],
  ['danger', 'bg', 3, 'no pours left (large bold number)'],
  ['gold', 'panel', 3, 'stars on the end card'],
  ['gold', 'bg', 3, 'stars in the goals box'],
];
const SHOULD = [
  ['accent', 'cell', 3, 'target rings on empty cells'],
  ['cell-edge', 'cell', 1.6, 'empty cell outline'],
  ['cell', 'plate', 1.12, 'empty cells against the board plate'],
  ['cell', 'bg', 1.12, 'empty cells against the page'],
];

const only = process.argv[2];
let fails = 0;
for (const [key, T] of Object.entries(THEMES)) {
  if (only && key !== only) continue;
  for (const mode of ['light', 'dark']) {
    const C = T[mode], out = [];
    for (const [f, b, min, what] of MUST) {
      const r = ratio(C[f], C[b]);
      if (r < min) { fails++; out.push(`  FAIL ${f} on ${b}: ${r.toFixed(2)} (needs ${min}) - ${what}`); }
    }
    for (const [f, b, min, what] of SHOULD) {
      const r = ratio(C[f], C[b]);
      if (r < min) out.push(`  low  ${f} on ${b}: ${r.toFixed(2)} (aim ${min}) - ${what}`);
    }
    const stone = ratio(STONE, C.cell);
    if (stone < 1.8) { fails++; out.push(`  FAIL stone on cell: ${stone.toFixed(2)} (needs 1.8) - stones must not look like empty cells`); }
    const weak = TILES.map(([hex, sym]) => [sym, ratio(hex, C.cell)]).filter(([, r]) => r < 1.25);
    if (weak.length) out.push('  low  tiles close to the empty-cell colour: ' + weak.map(([s, r]) => s + ' ' + r.toFixed(2)).join(', ') +
                              ' (their dark edges and symbols still show them)');
    const worst = Math.min(...MUST.map(([f, b]) => ratio(C[f], C[b]) / 1));
    console.log(`${(T.name + ' (' + mode + ')').padEnd(26)} ${out.some(l => l.includes('FAIL')) ? 'FAIL' : 'ok  '}   ink/bg ${ratio(C.ink, C.bg).toFixed(1)}  muted/panel ${ratio(C.muted, C.panel).toFixed(1)}  accent/panel ${ratio(C.accent, C.panel).toFixed(1)}  button ${ratio(C['on-accent'], C.accent).toFixed(1)}  stone/cell ${stone.toFixed(1)}`);
    for (const l of out) console.log(l);
  }
}
// the game's own colours (index.html) should be the classic theme
const block = re2 => { const m = html.match(re2); const o = {}; if (m) for (const [, k, v] of m[1].split(';').map(x => x.match(/--([\w-]+):\s*(#[0-9a-f]{6})/i)).filter(Boolean).map(x => x)) o[k] = v; return o; };
const pageLight = block(/:root \{([^}]*)\}/), pageDark = block(/:root\[data-theme="dark"\] \{([^}]*)\}/);
for (const [mode, page] of [['light', pageLight], ['dark', pageDark]])
  for (const [k, v] of Object.entries(THEMES.classic[mode]))
    if (page[k] && page[k].toLowerCase() !== v.toLowerCase()) { fails++; console.log(`  FAIL index.html --${k} (${mode}) is ${page[k]}, but themes.js classic has ${v}`); }
if (fails) { console.log(`\n${fails} must-pass check(s) failed.`); process.exit(1); }
console.log('\nAll must-pass checks pass.');
