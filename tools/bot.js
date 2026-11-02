// Hexadek computer player, for tuning levels.
//
//   node tools/bot.js [options]
//     --file index.html     the game to load (default: index.html next to this folder)
//     --skill expert|good|casual|all   (default all)
//     --skill custom --beam B --depth D --noise N   a player of your own making
//     --games N             games per level and skill (default 20)
//     --level N             only this level; --levels A-B a range (default all)
//     --random              deal a different deck for each game, with the level's settings
//                           (for semi-randomised levels); otherwise each level's fixed deck,
//                           and the games differ only by the player's noise
//     --colours C --deck D  override the level's settings, to try variations
//     --pours S,P,C,M       ...and its pour budget: start, per stack placed, per hexadek, most held
//     --stones N --bands A,B   ...its stones (the layout with N stone cells, 0 for none) and colours per stack
//     --bandodds X,Y,Z      ...or the odds of 1, 2 and 3 colours per stack
//     --verbose             one line per game
//     --json                also a JSON line per level and skill, with every game (for tools/targets.js)
//     --endless             Endless: play every deck in each tier's pool (tools: --tiers A-B, --pool N),
//                           with the expert (decks it can't finish are skipped by the game) and with
//                           --skill (default player), then simulate runs from the pass rates.
//                           --json prints a line per tier; --from DIR combines such lines instead of
//                           playing; --write puts the skip lists into index.html (ENDLESS_SKIP)
//     --hub auto|point|line plays the hub strategy seen in play tests: keep a hub free (the centre, or a
//                           line through it with more colours), place each new stack there, and pour
//                           its colours out to home areas around it, one area per colour.
//                           auto: the centre with up to 5 colours, a line with more. The line runs
//                           along whichever axis has the fewest stones at the start.
//
// It plays by the game's own rule functions, loaded from index.html like the tests do, and
// sees only what a player sees: the board, the tray and the next stack. Each turn it searches
// pour sequences (a beam: the best few boards at each depth), tries every tray stack in every
// empty cell after each, and plays the plan whose board looks best.

const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf('--' + name); return i < 0 ? dflt : args[i + 1]; };
const flag = name => args.includes('--' + name);
const file = opt('file', path.join(__dirname, '..', 'index.html'));
const html = fs.readFileSync(file, 'utf8');
eval(html.match(/<script>([\s\S]*)<\/script>/)[1] +
  ';global.R={CFG,CELLS,neighbours,runLen,topOf,newGame,pourResult,pour,place,roomState,poursLeft,isWon,LEVELS,STONE,starsFor,deckMax,STONE_LAYOUTS,' +
  'ENDLESS_TIERS,ENDLESS_SEED,ENDLESS_POOL,ENDLESS_RAMP,endlessTier}');
const { CFG, CELLS, neighbours, runLen, topOf, newGame, pourResult, pour, place, roomState, poursLeft, isWon, LEVELS, STONE,
        starsFor, deckMax, STONE_LAYOUTS, ENDLESS_TIERS, ENDLESS_SEED, ENDLESS_POOL, ENDLESS_RAMP, endlessTier } = R;

const SKILLS = {   // beam: boards kept per depth; depth: pours searched per turn; noise: randomness in judging
  // player: matched to the play tests through level 60 (2026-11-01): it finishes about as often as a
  // person does under tight pour budgets, where the others overrate people (they plan pours further ahead)
  player: { beam: 2, depth: 3, noise: 50 },
  expert: { beam: 10, depth: 6, noise: 4 },
  good:   { beam: 5, depth: 4, noise: 25 },
  casual: { beam: 2, depth: 2, noise: 70 },
};
if (opt('skill') === 'custom') SKILLS.custom = { beam: Number(opt('beam', 3)), depth: Number(opt('depth', 3)), noise: Number(opt('noise', 40)) };
const W = {        // how the player values a board
  empty: 70, emptyFew: 120,    // each empty cell; extra for each of the first 3 (room to place)
  pure: 0.6,                   // a stack of one colour, times its height squared: only these can clear
                               // (a stack holds 12, so tiles of another colour underneath block it)
  pair: 3,                     // neighbouring tops of one colour, times their combined run
  ready: 15,                   // a pour that would clear is waiting (kept for a combo, or next turn)
  band: 14,                    // each colour change inside a stack
  buried: 1.5,                 // tiles under the top run, a little worse the higher the stack
  pour: 25, pourCap: 4,        // pours left in a budget game, up to pourCap
  stone: 90,                   // each stone still standing
  over: -1e6,                  // no room left
  // --hub only
  zone: 6, zoneOff: 3,         // a top run at its colour's home area / elsewhere, per tile
  hubFull: 8, hubPlace: 40,    // tiles left in the hub, per tile; placing the new stack in the hub
};
const ON = new Set(CELLS), NB = {}; for (const k of CELLS) NB[k] = neighbours(k).filter(n => ON.has(n));   // on the board only

// ---- the hub strategy (--hub) ----
const HUB_MODE = opt('hub', null), R3 = Math.sqrt(3);
let HUB = new Set(), ZONE = {};   // set for each game by setupHub
const cellAngle = k => { const [q, r] = k.split(',').map(Number); return Math.atan2(1.5 * r, R3 * (q + r / 2)); };
function setupHub(g) {
  HUB = new Set(); ZONE = {};
  if (!HUB_MODE) return;
  const mode = HUB_MODE === 'auto' ? (g.colours <= 5 ? 'point' : 'line') : HUB_MODE;
  let axis = 0;
  if (mode === 'point') HUB.add('0,0');
  else {
    const lines = [['-1,0', '0,0', '1,0'], ['0,-1', '0,0', '0,1'], ['1,-1', '0,0', '-1,1']];
    const stones = l => l.reduce((n, k) => n + g.board[k].filter(c => c === STONE).length, 0);
    const line = lines.slice().sort((a, b) => stones(a) - stones(b))[0];
    line.forEach(k => HUB.add(k)); axis = cellAngle(line[2]);
  }
  // home areas: equal slices of the ring around the hub, one per colour
  const C = g.colours, slice = 2 * Math.PI / C;
  for (const k of CELLS) if (!HUB.has(k)) ZONE[k] = Math.floor(((cellAngle(k) - axis + 4 * Math.PI) % (2 * Math.PI)) / slice) % C;
}
function hubValue(board) {
  let v = 0;
  for (const k of CELLS) {
    const st = board[k];
    if (!st.length || topOf(st) === STONE) continue;
    if (HUB.has(k)) { v -= W.hubFull * st.length; continue; }
    v += ZONE[k] === topOf(st) ? W.zone * runLen(st) : -W.zoneOff * runLen(st);
  }
  return v;
}

function mulberry(seed) {
  return () => { let t = seed = (seed + 0x6D2B79F5) | 0; t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// A board's worth to the player, beyond its score.
function judge(board, pours, budget) {
  let v = 0, empty = 0;
  for (const k of CELLS) {
    const st = board[k];
    if (!st.length) { empty++; continue; }
    const top = topOf(st);
    if (top === STONE) { v -= W.stone * st.length; continue; }
    let bands = 0; for (let i = 1; i < st.length; i++) if (st[i] !== st[i - 1]) bands++;
    const run = runLen(st);
    if (!bands) v += W.pure * st.length * st.length;
    else v -= W.band * bands + W.buried * (st.length - run) * (1 + st.length / CFG.hexadek);
    for (const n of NB[k]) {
      if (n < k) continue;
      const o = board[n];
      if (o.length && topOf(o) === top) {
        const r2 = runLen(o);
        v += W.pair * (run + r2);
        if (run + r2 >= CFG.hexadek) {
          const p1 = pourResult(board, k, n), p2 = pourResult(board, n, k);
          if ((p1 && p1.clears) || (p2 && p2.clears)) v += W.ready;
        }
      }
    }
  }
  v += W.empty * empty + W.emptyFew * Math.min(empty, 3);
  if (budget) v += W.pour * Math.min(pours, W.pourCap);
  if (HUB.size) v += hubValue(board);
  return v;
}

const copyBoard = b => { const o = {}; for (const k of CELLS) o[k] = b[k].slice(); return o; };
const boardKey = b => CELLS.map(k => b[k].join('.')).join('|');

// One turn: the best pours and placement for game g, or null when no placement is possible.
function plan(g, skill, rnd) {
  const rule = g.pourRule !== undefined ? g.pourRule : g.mode === 'free' ? null : CFG.pours, budget = !!rule;
  const sim = n => ({ board: copyBoard(n.board), score: n.score, clearsThisTurn: n.clearsThisTurn, pours: n.pours,
                      hexadeks: n.hexadeks, history: [], mode: g.mode, pourRule: g.pourRule });
  const start = { board: g.board, score: g.score, clearsThisTurn: g.clearsThisTurn, pours: g.pours, hexadeks: g.hexadeks || 0, seq: [] };
  const seen = new Set([boardKey(start.board)]);
  let frontier = [start]; const all = [start];
  const noise = () => (rnd() - 0.5) * skill.noise;
  for (let d = 0; d < skill.depth; d++) {
    const next = [];
    for (const n of frontier) {
      if (poursLeft(n) < 1) continue;
      for (const a of CELLS) {
        if (!n.board[a].length) continue;
        for (const b of NB[a]) {
          if (!pourResult(n.board, a, b)) continue;
          const s = sim(n);
          pour(s, a, b);
          const key = boardKey(s.board);
          if (seen.has(key)) continue;
          seen.add(key);
          s.seq = n.seq.concat([[a, b]]); s.history = null;
          s.v = s.score + judge(s.board, s.pours, budget) + noise();
          next.push(s); all.push(s);
        }
      }
    }
    next.sort((x, y) => y.v - x.v);
    frontier = next.slice(0, skill.beam);
    if (!frontier.length) break;
  }
  // after each candidate's pours: every tray stack in every empty cell
  const last = g.deckSize && g.turn === g.deckSize - 1;   // this placement finishes the deck
  let best = null;
  for (const n of all) {
    for (let slot = 0; slot < g.tray.length; slot++) {
      const t = g.tray[slot]; if (!t) continue;
      for (const c of CELLS) {
        if (n.board[c].length) continue;
        n.board[c] = t;
        let v = n.score + judge(n.board, budget ? Math.min(rule.max, n.pours + rule.perPlace) : 0, budget);
        if (last) v = 1e5 + n.score * 100 + v / 100;   // the last stack: only the score counts now
        else if (roomStateCheap(n.board) === 'over' && !canPourAny(n.board, n.pours, budget)) v += W.over;
        n.board[c] = [];
        if (HUB.has(c)) v += W.hubFull * t.length + W.hubPlace;   // the new stack belongs in the hub
        v += noise();
        if (!best || v > best.v) best = { v, seq: n.seq, slot, cell: c };
      }
    }
  }
  return best;
}
const roomStateCheap = b => CELLS.some(k => !b[k].length) ? 'ok' : 'over';
const canPourAny = (b, pours, budget) => (!budget || pours > 0) && CELLS.some(a => b[a].length && NB[a].some(x => pourResult(b, a, x)));

function playGame(g, skill, rnd) {
  setupHub(g);
  for (let guard = 0; guard < 2000; guard++) {
    if (isWon(g)) break;
    const p = plan(g, skill, rnd);
    if (!p) break;
    for (const [a, b] of p.seq) pour(g, a, b);
    g.history = [];
    if (HUB.has(p.cell)) g.hubPlaced = (g.hubPlaced || 0) + 1;
    if (!place(g, p.slot, p.cell)) break;
  }
  return g;
}

// ---- Endless ----
if (flag('endless')) {
  const sk = opt('skill', 'player'), pool = Number(opt('pool', ENDLESS_POOL));
  const tspan = (opt('tiers', '1-' + ENDLESS_TIERS.length) + '-').split('-').map(Number);
  const tiers = {};   // tier (0-based): { skip: [indices], pass: share the player clears, n }
  if (opt('from')) {
    for (const f of fs.readdirSync(opt('from'))) for (const line of fs.readFileSync(path.join(opt('from'), f), 'utf8').split('\n'))
      if (line.startsWith('ENDLESS ')) { const r = JSON.parse(line.slice(8)); tiers[r.tier] = r; }
  } else {
    for (let t = tspan[0] - 1; t < (tspan[1] || tspan[0]); t++) {
      const skip = [], wins = []; const t0 = Date.now();
      for (let i = 0; i < pool; i++) {
        const seed = ENDLESS_SEED + 1000 * t + i;
        const e = playGame(newGame(seed, 'endless', null, null, null, ENDLESS_TIERS[t]), SKILLS.expert, mulberry(i * 31 + t));
        if (!isWon(e)) { skip.push(i); continue; }
        wins.push(isWon(playGame(newGame(seed, 'endless', null, null, null, ENDLESS_TIERS[t]), SKILLS[sk], mulberry(i * 7919 + t))));
      }
      tiers[t] = { tier: t, skip, pass: wins.filter(Boolean).length / Math.max(1, wins.length), n: wins.length, s: (Date.now() - t0) / 1000 };
      if (flag('json')) console.log('ENDLESS ' + JSON.stringify(tiers[t]));
    }
  }
  console.log(`Endless tiers: expert skips, and how often ${sk} clears the rest`);
  for (const t of Object.keys(tiers).map(Number).sort((a, b) => a - b)) {
    const T = ENDLESS_TIERS[t], r = tiers[t];
    console.log(`  tier ${String(t + 1).padStart(2)} ${(T.top || 'stage ' + (t + 1)).padEnd(8)} ${T.colours} colours, deck ${T.deck}` +
      `${T.stones ? ', ' + Object.keys(T.stones).length + ' stones' : ''}${T.pours ? ', pours max ' + T.pours.max : ''}${T.bandOdds ? ', mixed' : ''}`.padEnd(46) +
      `skip ${String(r.skip.length).padStart(2)}/${pool}   clears ${(100 * r.pass).toFixed(0).padStart(3)}%`);
  }
  if (Object.keys(tiers).length === ENDLESS_TIERS.length) {   // runs: each stage cleared with its tier's rate
    const rnd = mulberry(12345), cleared = [];
    for (let run = 0; run < 20000; run++) {
      let s = 1; while (s < 500 && rnd() < tiers[endlessTier(run * 977 + 13, s)].pass) s++;
      cleared.push(s - 1);
    }
    cleared.sort((a, b) => a - b);
    const q = f => cleared[Math.floor(f * (cleared.length - 1))];
    console.log(`Runs (no rewards): stages cleared, median ${q(0.5)}, a good run (top quarter) ${q(0.75)}+, top tenth ${q(0.9)}+;` +
      ` ${(100 * cleared.filter(c => c >= ENDLESS_RAMP).length / cleared.length).toFixed(0)}% get past the ramp (stage ${ENDLESS_RAMP})`);
  }
  if (flag('write')) {
    const file = path.join(__dirname, '..', 'index.html'), re = /(\/\/ ENDLESS_SKIP:begin[^\n]*\n)[\s\S]*?(\n\/\/ ENDLESS_SKIP:end)/;
    const skip = {}; for (const t in tiers) if (tiers[t].skip.length) skip[t] = tiers[t].skip;
    const body = 'const ENDLESS_SKIP = { ' + Object.keys(skip).map(t => t + ': [' + skip[t].join(', ') + ']').join(', ') + ' }' +
      ';   // tier: pool indices whose deck the expert couldn\'t finish';
    fs.writeFileSync(file, html.replace(re, (m, a, b) => a + body + b));
    console.log('Wrote ENDLESS_SKIP into index.html.');
  }
  process.exit(0);
}

// ---- run ----
const games = Number(opt('games', 20));
const skills = opt('skill', 'all') === 'all' ? Object.keys(SKILLS) : [opt('skill')];
const span = (opt('levels', opt('level') || '1-' + LEVELS.length) + '-').split('-').map(Number);   // --levels 49-72
const levels = LEVELS.map((_, i) => i + 1).filter(n => n >= span[0] && n <= (span[1] || span[0]));
const random = flag('random'), verbose = flag('verbose');
const median = a => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const pct = (a, f) => (100 * a.filter(f).length / a.length).toFixed(0).padStart(3) + '%';

console.log(random ? 'Random decks with each level\'s settings' : 'Each level\'s fixed deck (games differ by the player\'s noise)');
console.log('level             skill   finish  hexadeks/M (med)  score med [min–max]   ★    ★★   ★★★');
for (const lv of levels) {
  const L0 = LEVELS[lv - 1];
  LEVELS[lv - 1] = { ...L0, colours: Number(opt('colours', L0.colours)), deck: Number(opt('deck', L0.deck)) };
  if (opt('stones')) LEVELS[lv - 1].stones = Number(opt('stones')) ? STONE_LAYOUTS[Number(opt('stones'))] : null;
  if (opt('bands')) LEVELS[lv - 1].bands = opt('bands').split(',').map(Number);
  if (opt('bandodds')) LEVELS[lv - 1].bandOdds = opt('bandodds').split(',').map(Number);   // odds of 1, 2, 3 bands
  if (opt('pours')) { const [start, perPlace, perClear, max] = opt('pours').split(',').map(Number); LEVELS[lv - 1].pours = { start, perPlace, perClear, max }; }
  for (const sk of skills) {
    const res = [];
    for (let i = 0; i < games; i++) {
      const seed = random ? 50000 + lv * 1000 + i : 1000 + lv;
      const g = newGame(seed, 'level', null, lv);
      const t0 = Date.now();
      playGame(g, SKILLS[sk], mulberry(i * 7919 + lv));
      const M = deckMax(g);
      // a random deck gets targets from its own supply, as semi-randomised levels would
      const pts = CFG.hexadek * CFG.pointsPerTile, won = isWon(g);
      const stars = !random ? starsFor(g) : !won ? 0 : g.score < (M - 1) * pts ? 1 :
        (LEVELS[lv - 1].stones ? g.score >= (M + 1) * pts && !CELLS.some(k => g.board[k].includes(STONE)) : g.score >= (M + 2) * pts) ? 3 : 2;
      res.push({ won, hx: g.hexadeks || 0, M, score: g.score, stars, placed: g.turn, ms: Date.now() - t0, hubPlaced: g.hubPlaced || 0,
                 stonesLeft: CELLS.reduce((n, k) => n + g.board[k].filter(c => c === STONE).length, 0) });
      if (flag('show')) console.log(CELLS.filter(k => g.board[k].length).map(k => k + ':' + g.board[k].join('')).join('  '));
      if (verbose) console.log(`  game ${i + 1}: ${isWon(g) ? 'won ' : 'lost'} placed ${g.turn}/${g.deckSize} hexadeks ${g.hexadeks || 0}/${M} score ${g.score} stars ${res[res.length - 1].stars} (${Date.now() - t0} ms)`);
    }
    if (flag('json')) console.log('JSON ' + JSON.stringify({ level: lv, skill: sk + (HUB_MODE ? '+hub' : ''), games: res }));
    const sc = res.map(r => r.score);
    console.log(`${(lv + ' ' + LEVELS[lv - 1].name).padEnd(17)} ${(sk + (HUB_MODE ? '+hub' : '')).padEnd(7)} ${pct(res, r => r.won)}    ` +
      `${median(res.map(r => r.hx))}/${median(res.map(r => r.M))}`.padEnd(18) +
      `${median(sc)} [${Math.min(...sc)}–${Math.max(...sc)}]`.padEnd(22) +
      `${pct(res, r => r.stars >= 1)} ${pct(res, r => r.stars >= 2)} ${pct(res, r => r.stars >= 3)}`);
  }
  LEVELS[lv - 1] = L0;
}
