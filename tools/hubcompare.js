// Compare the computer player with and without the hub strategy: node tools/hubcompare.js DIR [skill]
//
// DIR holds output of   node tools/bot.js --json --skill S [--hub auto] --levels A-B
// for one skill (default good) with and without --hub. Prints, per chapter and per kind of level,
// how often each finishes and reaches ★★ / ★★★ (with the game's current targets), the median
// score, and how much of the time the hub player really places in the hub; then the levels
// where the hub helps most and least.

const fs = require('fs'), path = require('path');
const dir = process.argv[2], skill = process.argv[3] || 'good';
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
global.THEMES = {}; global.CHAPTER_THEMES = [];
const { LEVELS, levelTargets } = eval('(() => {' + html.match(/<script>([\s\S]*)<\/script>/)[1] + '; return { LEVELS, levelTargets }; })()');

const runs = {};   // runs[level][skill] = games
for (const f of fs.readdirSync(dir)) for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
  if (!line.startsWith('JSON ')) continue;
  const r = JSON.parse(line.slice(5));
  ((runs[r.level] = runs[r.level] || {})[r.skill] = (runs[r.level][r.skill] || [])).push(...r.games);
}
const A = skill, B = skill + '+hub';
const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
const rate = (gs, f) => gs.length ? gs.filter(f).length / gs.length : 0;
function sum(gs, n) {   // n: level, for its targets (gs may mix levels when n is null)
  return {
    finish: rate(gs, g => g.won),
    two: rate(gs, g => g.won && g.score >= levelTargets(g.level).score),
    three: rate(gs, g => g.won && g.score >= levelTargets(g.level).top && !g.stonesLeft),
    hx: median(gs.map(g => g.hx / g.M)),
    hub: gs.reduce((s, g) => s + (g.hubPlaced || 0), 0) / Math.max(1, gs.reduce((s, g) => s + g.placed, 0)),
  };
}
const levels = Object.keys(runs).map(Number).filter(n => runs[n][A] && runs[n][B]).sort((a, b) => a - b);
for (const n of levels) for (const s of [A, B]) runs[n][s].forEach(g => { g.level = n; });
const P = x => (100 * x).toFixed(0).padStart(4) + '%';
const row = (label, ns) => {
  const a = sum(ns.flatMap(n => runs[n][A])), b = sum(ns.flatMap(n => runs[n][B]));
  console.log(label.padEnd(24) + ` finish ${P(a.finish)} →${P(b.finish)}   ★★ ${P(a.two)} →${P(b.two)}   ★★★ ${P(a.three)} →${P(b.three)}` +
    `   hexadeks ${P(a.hx)} →${P(b.hx)}   in hub ${P(b.hub)}`);
};
console.log(`${A} without → with the hub strategy (${levels.length} levels, ${runs[levels[0]][A].length} games each)\n`);
const chapters = [...new Set(levels.map(n => LEVELS[n - 1].chapter))];
for (const c of chapters) row('Chapter ' + (c + 1) + ' ' + LEVELS[c * 12].name, levels.filter(n => LEVELS[n - 1].chapter === c));
console.log('');
row('no stones', levels.filter(n => !LEVELS[n - 1].stones));
row('stones', levels.filter(n => LEVELS[n - 1].stones));
row('up to 5 colours', levels.filter(n => LEVELS[n - 1].colours <= 5));
row('6 or more colours', levels.filter(n => LEVELS[n - 1].colours > 5));
row('all', levels);

// per level: the gain in ★★★ rate plus a little for ★★ and finishing
const gain = n => { const a = sum(runs[n][A]), b = sum(runs[n][B]); return { n, a, b, d: (b.three - a.three) + 0.5 * (b.two - a.two) + (b.finish - a.finish) }; };
const g = levels.map(gain).sort((x, y) => y.d - x.d);
const line = r => `  L${String(r.n).padEnd(3)} ${LEVELS[r.n - 1].colours} colours${LEVELS[r.n - 1].stones ? ', stones' : '        '}  ` +
  `finish ${P(r.a.finish)} →${P(r.b.finish)}  ★★ ${P(r.a.two)} →${P(r.b.two)}  ★★★ ${P(r.a.three)} →${P(r.b.three)}  in hub ${P(r.b.hub)}`;
console.log('\nHub helps most:'); g.slice(0, 8).forEach(r => console.log(line(r)));
console.log('\nHub helps least (or hurts):'); g.slice(-8).reverse().forEach(r => console.log(line(r)));
