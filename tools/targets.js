// Star targets from the computer player's scores: node tools/targets.js DIR [--write]
//
// DIR holds output of   node tools/bot.js --json --skill good|expert --games 20 [--levels A-B]
// (any number of files). For each level:
//   ★★  = the score the "good" player reaches in Q2 of its finished games (rounded down to a hexadek,
//         120); the expert's finished games where the good player finishes fewer than half
//   ★★★ = the score the "expert" player reaches in Q3 of its finished games (rounded up), plus EXTRA
//         hexadeks, since play tests reach more than the expert does;
//         on stones levels, counting only the expert games that broke every stone
// so every level asks the same of the player, whatever its deck happens to allow.
// Q2, Q3 and EXTRA were chosen so levels 1-16, which play-tested well with the old formula
// ((M - 1) and (M + 2) hexadeks), keep about the same targets on average.
// On play-tested levels (1 to TESTED) each target stays within STEP2 / STEP3 hexadeks of the old
// formula (elsewhere within LOOSE), so the computer player
// evens out the outliers without reshaping levels that already play well.
// Prints the table next to the old formula; --write puts it into index.html (LEVEL_TARGETS).

const fs = require('fs'), path = require('path');
const dir = process.argv[2], write = process.argv.includes('--write');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const Q2 = Number(arg('q2', 0.7)), Q3 = Number(arg('q3', 0.1));   // share of finished games that reach each target
const STEP2 = Number(arg('step2', 1)), STEP3 = Number(arg('step3', 2));   // most hexadeks a target may move from the old formula
const TESTED = Number(arg('tested', 24)), LOOSE = Number(arg('loose', 3));   // ...on play-tested levels; others may move LOOSE
const EXTRA = Number(arg('extra', 1));   // ★★★: hexadeks above the expert's score (play tests reach more than it does)
const PTS = 120;
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const { LEVELS } = eval('(() => {' + html.match(/<script>([\s\S]*)<\/script>/)[1] + '; return { LEVELS }; })()');   // for which levels have stones

const runs = {};   // runs[level][skill] = games
for (const f of fs.readdirSync(dir)) for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
  if (!line.startsWith('JSON ')) continue;
  const r = JSON.parse(line.slice(5));
  ((runs[r.level] = runs[r.level] || {})[r.skill] = (runs[r.level][r.skill] || [])).push(...r.games);
}
const reached = (scores, share) => {   // the highest score that at least `share` of games reach
  const s = scores.slice().sort((a, b) => b - a);
  return s[Math.max(0, Math.ceil(share * s.length) - 1)];
};

const rows = [], levels = Object.keys(runs).map(Number).sort((a, b) => a - b);
for (const n of levels) {
  const G = runs[n].good, E = runs[n].expert;
  if (!G || !E) { console.error('level ' + n + ': needs both good and expert games'); process.exit(1); }
  const M = G[0].M;
  const Ewin = E.filter(g => g.won && !g.stonesLeft);   // a stones level's ★★★ also needs every stone broken
  // ★★ needs a finished deck, so only finished games count; if the good player rarely finishes, use the expert's
  const Gwin = G.filter(g => g.won), Ewon = E.filter(g => g.won);
  const base = Gwin.length >= G.length / 2 ? Gwin : Ewon.length ? Ewon : G;
  let score = Math.floor(reached(base.map(g => g.score), Q2) / PTS) * PTS;
  let top = (Math.ceil(reached((Ewin.length ? Ewin : E).map(g => g.score), Q3) / PTS) + EXTRA) * PTS;
  const oldScore = (M - 1) * PTS, oldTop = (M + (LEVELS[n - 1].stones ? 1 : 2)) * PTS;
  const near = (v, old, step) => Math.min(old + step * PTS, Math.max(old - step * PTS, v));   // smooth outliers, keep the shape
  const t = n <= TESTED;
  score = near(score, oldScore, t ? STEP2 : LOOSE); top = near(top, oldTop, t ? STEP3 : LOOSE);
  score = Math.max(score, PTS);              // at least one hexadek
  top = Math.max(top, score + PTS);          // ★★★ always asks for more than ★★
  rows.push({ n, M, score, top, oldScore, oldTop,
    goodRate: G.filter(g => g.won && g.score >= score).length / G.length,
    expertTop: E.filter(g => g.won && g.score >= top && !g.stonesLeft).length / E.length });
}

console.log('level  M   ★★ old→new    ★★★ old→new    good ★★  expert ★★★');
for (const r of rows) console.log(`${String(r.n).padStart(5)} ${String(r.M).padStart(3)}  ${String(r.oldScore).padStart(5)}→${String(r.score).padEnd(6)} ` +
  `${String(r.oldTop).padStart(5)}→${String(r.top).padEnd(6)}  ${(100 * r.goodRate).toFixed(0).padStart(5)}%  ${(100 * r.expertTop).toFixed(0).padStart(7)}%`);
const avg = (a, f) => a.reduce((s, r) => s + f(r), 0) / a.length;
const early = rows.filter(r => r.n <= 16);
if (early.length) console.log(`\nlevels 1-16, mean change: ★★ ${avg(early, r => r.score - r.oldScore).toFixed(0)}, ★★★ ${avg(early, r => r.top - r.oldTop).toFixed(0)} points`);

if (write) {
  if (rows.length !== 72) { console.error('--write needs all 72 levels'); process.exit(1); }
  const file = path.join(__dirname, '..', 'index.html');
  const re = /(\/\/ LEVEL_TARGETS:begin[^\n]*\n)[\s\S]*?(\n\/\/ LEVEL_TARGETS:end)/;
  if (!re.test(html)) { console.error('index.html has no LEVEL_TARGETS markers'); process.exit(1); }
  const body = 'const LEVEL_TARGETS = [   // [★★ score, ★★★ score] for levels 1 to 72\n' +
    rows.reduce((out, r, i) => out + (i % 6 ? ' ' : '  ') + '[' + r.score + ', ' + r.top + '],' + (i % 6 === 5 ? '\n' : ''), '') + '];';
  fs.writeFileSync(file, html.replace(re, (m, a, b) => a + body + b));
  console.log('\nWrote LEVEL_TARGETS into index.html.');
}
