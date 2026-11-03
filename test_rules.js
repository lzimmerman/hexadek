const fs = require('fs'), assert = require('assert');
const html = fs.readFileSync(process.argv[2], 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];
eval(js + '; global.R = {CFG, CELLS, neighbours, runLen, newGame, newStack, pourResult, pour, undo, place, roomState, legalTargets, tutorialGame, TUTORIAL, poursLeft, undosLeft, isWon, COLOURS, LEVELS, STONE, pourRule, gameName, starsFor, starGoals, deckMax, levelTargets, levelAbout, CHAPTERS, pickBands, ENDLESS_TIERS, ENDLESS_RAMP, ENDLESS_SEED, ENDLESS_POOL, ENDLESS_SKIP, ENDLESS_PERKS, endlessTier, endlessDeckSeed, endlessOffer, endlessGame, STONE_LAYOUTS, DAILY_TIERS, dailyDate, dailyName, dailyTier, dailyGame, dailyTargets, hintMove, tallyGame, collectGoal};');
// Checks the game rules in index.html: node test_rules.js index.html
const {CFG, CELLS, neighbours, runLen, newGame, pourResult, pour, undo, place, roomState} = R;
assert.equal(CELLS.length, 19);
assert.equal(neighbours('0,0').filter(k => CELLS.includes(k)).length, 6);
// generated stacks: sizes, bands, no two touching bands the same colour
const g0 = newGame(42); let bandsSeen = new Set();
for (let i = 0; i < 2000; i++) { const st = R.newStack(g0);
  assert(st.length >= 2 && st.length <= 6);
  let bands = 1; for (let j = 1; j < st.length; j++) if (st[j] !== st[j-1]) bands++;
  assert(bands <= 3); bandsSeen.add(bands); }
assert.equal(bandsSeen.size, 3);
// same seed, same game
assert.deepEqual(newGame(7).tray, newGame(7).tray);
// pours
const g = newGame(1, 'free'); const b = g.board;
b['0,0'] = [0, 1, 1, 1]; b['1,0'] = [2, 1]; b['2,0'] = [3];
let r = pourResult(b, '0,0', '1,0'); assert.deepEqual([r.n, r.after, r.clears, r.emptiesFrom], [3, 4, false, false]);
assert.equal(pourResult(b, '0,0', '2,0'), null, 'not a neighbour');
assert.equal(pourResult(b, '1,0', '2,0'), null, 'colour mismatch');
assert(pourResult(b, '0,0', '0,1'), 'empty neighbour allowed');
pour(g, '0,0', '1,0'); assert.deepEqual(b['0,0'], [0]); assert.deepEqual(b['1,0'], [2, 1, 1, 1, 1]);
undo(g); assert.deepEqual(g.board['0,0'], [0, 1, 1, 1]); assert.deepEqual(g.board['1,0'], [2, 1]);
// height limit: only what fits moves
g.board['0,0'] = [4, 4, 4, 4]; g.board['1,0'] = [0,1,0,1,0,1,0,1,0,4];
r = pour(g, '0,0', '1,0'); assert.equal(r.n, 2); assert.equal(g.board['1,0'].length, 12); assert.deepEqual(g.board['0,0'], [4, 4]); assert(!r.clears);
// a full hexadek of one colour clears, with the turn multiplier
g.board['0,0'] = [2,2,2,2,2,2]; g.board['1,0'] = [2,2,2,2,2,2]; g.board['-1,0'] = [3,3,3,3,3,3]; g.board['-1,1'] = [3,3,3,3,3,3];
const s0 = g.score; r = pour(g, '0,0', '1,0'); assert(r.clears); assert.deepEqual(g.board['1,0'], []); assert.equal(g.score - s0, 120);
r = pour(g, '-1,0', '-1,1'); assert.equal(r.points, 240, 'second clear x2');
undo(g); assert.equal(g.score - s0, 120); assert.equal(g.clearsThisTurn, 1);
// place ends the turn
const tr = g.tray[0].slice(), nx = g.next.slice();
const empty = CELLS.find(k => !g.board[k].length);
assert(place(g, 1, empty)); assert.equal(g.history.length, 0); assert.equal(g.clearsThisTurn, 0); assert.deepEqual(g.tray[1], nx);
assert(!place(g, 0, empty), 'cell taken');
// room states
const full = newGame(3); CELLS.forEach((k, i) => full.board[k] = [i % 5, (i + 1) % 5]);   // no neighbour pairs ... check
console.log('full board, mixed tops:', roomState(full.board));
CELLS.forEach((k, i) => { const [q, rr] = k.split(',').map(Number); full.board[k] = Array(12).fill(0).map((_, j) => (j + ((q - rr) % 3 + 3) % 3) % 3); });
console.log('full board, all stacks at 12:', roomState(full.board));
const one = newGame(4); CELLS.forEach(k => one.board[k] = [1, 0]); one.board['0,0'] = [0];
console.log('full board, a single-colour stack beside a match:', roomState(one.board));
console.log('all rules tests passed');

// the tutorial: every move it asks for is legal, in order, and the last pour makes a hexadek
const tg = R.tutorialGame();
R.TUTORIAL.forEach((st, i) => {
  const e = st.expect;
  if (!e) return;
  if (e.pour) { const r = pour(tg, e.pour[0], e.pour[1]); assert(r, 'tutorial step ' + (i + 1) + ' pour is legal');
    if (i === R.TUTORIAL.length - 2) assert(r.clears, 'the tutorial ends with a hexadek'); }
  else assert(place(tg, e.place[0], e.place[1]), 'tutorial step ' + (i + 1) + ' place is legal');
});
assert.equal(tg.score, 120);
// restart: the same seed deals the same stacks
const ga = newGame(99); assert.equal(ga.start, 99); assert.deepEqual(newGame(ga.start).tray, ga.tray);
console.log('tutorial and restart tests passed');

// Standard games: pours are counted
const st = newGame(5); assert.equal(st.mode, 'standard'); assert.equal(st.pours, CFG.pours.start);
st.board['0,0'] = [1]; st.board['1,0'] = [1]; st.board['2,0'] = [1]; st.board['2,-1'] = [1];
pour(st, '0,0', '1,0'); assert.equal(st.pours, CFG.pours.start - 1);
undo(st); assert.equal(st.pours, CFG.pours.start, 'undo gives the pour back');
st.pours = 0; assert.equal(pour(st, '0,0', '1,0'), null, 'no pours, no pour');
place(st, 0, '-1,0'); assert.equal(st.pours, CFG.pours.perPlace);
st.pours = CFG.pours.max - 1; place(st, 0, '-2,0'); assert.equal(st.pours, CFG.pours.max, 'capped');
st.board['0,1'] = Array(6).fill(2); st.board['1,1'] = Array(6).fill(2); st.pours = 1;
const rc = pour(st, '0,1', '1,1'); assert(rc.clears); assert.equal(st.pours, CFG.pours.perClear, 'a hexadek gives one back');
// game over counts pours: a full board that one pour could open is over with no pours
const fb = newGame(4); CELLS.forEach(k => fb.board[k] = [1, 0]); fb.board['0,0'] = [0];
assert.equal(roomState(fb.board, 1), 'full'); assert.equal(roomState(fb.board, 0), 'over');
// the tutorial is a Free game; restart keeps the seed
assert.equal(R.tutorialGame().mode, 'free');
console.log('standard mode tests passed');

// undo limit: Standard games have CFG.undos per game; Free games are unlimited
const ug = newGame(6); ug.board['0,0'] = [1]; ug.board['1,0'] = [1]; ug.pours = 99;
for (let i = 0; i < CFG.undos; i++) { pour(ug, '0,0', '1,0'); assert(undo(ug), 'undo ' + (i + 1)); }
pour(ug, '0,0', '1,0'); assert(!undo(ug), 'no undos left'); assert.equal(R.undosLeft(ug), 0);
const fg = newGame(6, 'free'); fg.board['0,0'] = [1]; fg.board['1,0'] = [1];
for (let i = 0; i < CFG.undos + 3; i++) { pour(fg, '0,0', '1,0'); assert(undo(fg)); }
const legacy = newGame(6); delete legacy.undos; assert.equal(R.undosLeft(legacy), CFG.undos);
console.log('undo limit tests passed');

// colours: Custom offers 3 to 13 in steps of 2 (levels use 4 and 6 too), and every colour has its own symbol
assert(R.COLOURS.length >= 13); assert(R.COLOURS.length <= R.STONE, 'colour indices (0 to length - 1) stay clear of the stone');
assert.equal(new Set(R.COLOURS.map(c => c[1])).size, R.COLOURS.length);
for (const n of [3, 4, 5, 6, 7, 9, 11, 13]) {
  const cg = newGame(3, 'standard', n); assert.equal(cg.colours, n); const seen = new Set();
  for (let i = 0; i < 500; i++) R.newStack(cg).forEach(c => seen.add(c));
  assert.equal(seen.size, n, n + ' colours used');
}
assert.deepEqual(newGame(3, 'standard', 6).tray, newGame(3, 'standard', 6).tray, 'restart keeps the colours');
// Survive: a deck of CFG.deck stacks, won once all are placed
const sg = newGame(12, 'survive'); assert.equal(sg.deckSize, CFG.deck); assert(R.poursLeft(sg) === CFG.pours.start);
for (let i = 0; i < CFG.deck; i++) {
  const slot = sg.tray.findIndex(t => t); assert(slot >= 0, 'a stack to place at turn ' + i);
  assert(place(sg, slot, '0,0')); sg.board['0,0'] = [];
  if (i === CFG.deck - CFG.traySize - 1) assert.equal(sg.next, null, 'next runs out first');
}
assert(R.isWon(sg)); assert(sg.tray.every(t => t === null)); assert(!place(sg, 0, '0,0'));
assert(!R.isWon(newGame(12, 'standard')));
// custom games: any deck length, with limited or free pours; names say what differs from Classic
const fd = newGame(12, 'free', 5, null, 50); assert.equal(fd.deckSize, 50); assert.equal(R.poursLeft(fd), Infinity);
for (let i = 0; i < 50; i++) { assert(place(fd, fd.tray.findIndex(t => t), '0,0')); fd.board['0,0'] = []; }
assert(R.isWon(fd));
assert.equal(newGame(1, 'survive', 5, null, 50).deckSize, 50); assert.equal(newGame(1, 'free').deckSize, null);
assert.equal(newGame(1, 'standard', 5, null, 30).deckSize, null, 'Classic has no deck');
assert.equal(R.gameName(newGame(1, 'standard')), 'Classic');
assert.equal(R.gameName(newGame(1, 'survive')), 'Deck of 30');
assert.equal(R.gameName(newGame(1, 'free', 7, null, 50)), 'Deck of 50 · free pours · 7 colours');
assert.equal(R.gameName(newGame(1, 'free', 3)), 'Classic · free pours · 3 colours');
console.log('colour and deck tests passed');

// Levels: fixed settings per level, the same deck on restart
const {LEVELS, STONE} = R;
LEVELS.forEach((L, i) => {
  const lg = newGame(1000 + i + 1, 'level', null, i + 1);
  assert.equal(lg.deckSize, L.deck); assert.equal(lg.colours, L.colours);
  assert.deepEqual(lg.tray, newGame(1000 + i + 1, 'level', null, i + 1).tray, 'level ' + (i + 1) + ' deck is fixed');
  for (let j = 0; j < 300; j++) {
    const st = R.newStack(lg); let bands = 1;
    for (let k = 1; k < st.length; k++) if (st[k] !== st[k - 1]) bands++;
    const [lo, hi] = L.bandOdds ? [1, L.bandOdds.length] : L.bands;   // odds: any count with a chance
    assert(bands >= lo && bands <= hi, 'level ' + (i + 1) + ' bands');
    assert(st.every(c => c < L.colours));
  }
  assert(R.gameName(lg).startsWith('Level ' + (i + 1)));
});
// band odds: mostly mixed, sometimes one colour, never more bands than tiles
{ const counts = [0, 0, 0, 0];
  for (let j = 0; j < 9000; j++) counts[R.pickBands([1, 4, 4], 6, j / 9000)]++;
  assert.deepEqual(counts, [0, 1000, 4000, 4000]);
  assert.equal(R.pickBands([1, 4, 4], 2, 0.99), 2); }
assert.equal(LEVELS.length, 72); assert.equal(R.CHAPTERS.length, 6);
const l1 = newGame(1001, 'level', null, 1); assert.equal(R.poursLeft(l1), Infinity); assert.equal(R.undosLeft(l1), Infinity);
const tb = LEVELS.findIndex(L => L.pours && L.pours.max === 6) + 1, l3 = newGame(1000 + tb, 'level', null, tb), P3 = LEVELS[tb - 1].pours;
assert.equal(R.poursLeft(l3), P3.start);
place(l3, 0, '0,0'); assert.equal(l3.pours, Math.min(P3.max, P3.start + P3.perPlace));
for (let i = 0; i < 5; i++) place(l3, 0, CELLS[i + 1]); assert.equal(l3.pours, P3.max, 'tight budget caps at its own max');
const l2 = newGame(1006, 'level', null, 6); assert.equal(R.pourRule(l2), CFG.pours);
// every level after a chapter's first says what's new; decks never shrink within a chapter
LEVELS.forEach((L, i) => { assert(R.levelAbout(i + 1).length > 5);
  if (L.step) assert(L.deck >= LEVELS[i - 1].deck, 'level ' + (i + 1) + ' deck'); });
console.log('level tests passed');

// Stones: can't be poured or poured onto; a neighbouring clear breaks the top one
const sl = LEVELS.findIndex(L => L.stones) + 1, l4 = newGame(1000 + sl, 'level', null, sl);
for (const k in LEVELS[sl - 1].stones) assert.deepEqual(l4.board[k], LEVELS[sl - 1].stones[k]);
const sb = newGame(9, 'free'); for (const k of CELLS) sb.board[k] = [];
sb.board['0,0'] = [STONE, STONE]; sb.board['1,0'] = [2, STONE]; sb.board['-1,0'] = [1];
assert.equal(pourResult(sb.board, '0,0', '0,1'), null, 'a stone cannot be poured');
assert.equal(pourResult(sb.board, '-1,0', '0,0'), null, 'nothing pours onto a stone');
sb.board['0,1'] = Array(11).fill(3); sb.board['1,1'] = [3];   // 0,1 neighbours both stones
const cr = pour(sb, '1,1', '0,1'); assert(cr.clears);
assert.deepEqual(sb.board['0,0'], [STONE], 'one clear breaks one stone');
assert.deepEqual(sb.board['1,0'], [2], 'a broken stone uncovers what was under it');
assert.deepEqual(cr.broke.sort(), ['0,0', '1,0']);
assert(undo(sb)); assert.deepEqual(sb.board['0,0'], [STONE, STONE], 'undo puts stones back');
const stones = {}; for (const k of CELLS) stones[k] = [STONE];
assert.equal(roomState(stones, Infinity), "over", "a board of stones is stuck");
console.log('stone tests passed');

// Stars: 1 for finishing, 2 for the score, 3 for the score plus the extra goal
const st1 = newGame(1001, 'level', null, 1), T1 = R.levelTargets(1);
assert.equal(R.starsFor(st1), 0, 'no stars before the deck is done');
st1.turn = st1.deckSize; assert.equal(R.starsFor(st1), 1);
st1.score = T1.score; assert.equal(R.starsFor(st1), 2);
st1.score = T1.top - 1; assert.equal(R.starsFor(st1), 2, 'just short of the top score'); st1.score = T1.top; assert.equal(R.starsFor(st1), 3);
st1.score = 0; assert.equal(R.starsFor(st1), 1, 'the third star needs the second');
const st4 = newGame(1000 + sl, 'level', null, sl); st4.turn = st4.deckSize; st4.score = R.levelTargets(sl).top;
assert.equal(R.starsFor(st4), 2, 'stones still standing');
for (const k of CELLS) st4.board[k] = st4.board[k].filter(c => c !== STONE);
assert.equal(R.starsFor(st4), 3, 'every stone broken');
assert.equal(R.starsFor(newGame(5, 'survive')), 0, 'only levels have stars');
LEVELS.forEach((L, i) => {
  const T = R.levelTargets(i + 1), pts = CFG.hexadek * CFG.pointsPerTile;
  assert(T.M >= 3, 'level ' + (i + 1) + ' can make hexadeks');
  // targets come from the computer player (LEVEL_TARGETS): whole hexadeks, ★★★ above ★★, both within what the deck allows
  assert(T.score >= pts && T.score % pts === 0 && T.top % pts === 0, 'level ' + (i + 1) + ' targets in hexadeks');
  assert(T.top > T.score, 'level ' + (i + 1) + ': ★★★ asks more than ★★');
  assert(T.score <= (T.M - 1) * pts && T.top <= (T.M + 1) * pts, 'level ' + (i + 1) + ' targets: ★★ short of every hexadek, ★★★ at most one combo past it');
  assert.equal(T.stones, !!L.stones);
});
const hx = newGame(9, 'free'); for (const k of CELLS) hx.board[k] = [];
hx.board['0,0'] = Array(11).fill(1); hx.board['1,0'] = [1];
pour(hx, '1,0', '0,0'); assert.equal(hx.hexadeks, 1); undo(hx); assert.equal(hx.hexadeks, 0, 'undo takes a hexadek back');
console.log('star tests passed');

// Endless: tiers ramp then draw from the top; decks come from the checked pool; rewards apply to one stage
const { ENDLESS_TIERS: ET, ENDLESS_RAMP: ER, ENDLESS_SKIP: ES, ENDLESS_PERKS: EP } = R;
for (let s = 1; s <= ER; s++) assert.equal(R.endlessTier(77, s), s - 1, 'the ramp is in order');
const tops = new Set();
for (let s = ER + 1; s < ER + 200; s++) { const t = R.endlessTier(77, s); assert(t >= ER && t < ET.length); tops.add(t); }
assert.equal(tops.size, ET.length - ER, 'every top tier comes up');
for (let run = 1; run < 40; run++) for (let s = 1; s < 30; s++) {
  const t = R.endlessTier(run, s), i = R.endlessDeckSeed(run, s, t) - R.ENDLESS_SEED - 1000 * t;
  assert(i >= 0 && i < R.ENDLESS_POOL && !(ES[t] || []).includes(i), 'a checked deck');
  const offer = R.endlessOffer(run, s), next = ET[R.endlessTier(run, s + 1)];
  assert.equal(new Set(offer).size, 2, 'two different rewards');
  assert(offer.every(id => EP[id] && (id !== 'stone' || next.stones)), 'only rewards that help next stage');
}
assert.deepEqual(R.endlessGame(5, 3).tray, R.endlessGame(5, 3).tray, 'a run deals the same decks again');
const e1 = R.endlessGame(5, 1, null, 0); assert.equal(e1.deckSize, ET[0].deck); assert.equal(R.gameName(e1), 'Endless · Stage 1');
assert(!e1.level && R.starsFor(e1) === 0);
const e3 = R.endlessGame(5, 3, 'budget', 2400), t3 = ET[2];
assert.equal(e3.score, 2400, 'the run total carries on'); assert.equal(e3.pourRule, CFG.pours, 'Classic\'s budget');
assert.equal(R.endlessGame(5, 3, 'short', 0).deckSize, t3.deck - 5);
assert.deepEqual(R.endlessGame(5, 3, 'lighter', 0).bandOdds, [1.4, 1, 1], 'more single-colour stacks');
assert.equal(R.endlessGame(5, 3, 'undos', 0).undos, CFG.undos + 3, 'a retired reward in a saved run still works');
for (let run = 1; run < 40; run++) for (let st = 1; st < 30; st++)
  assert(R.endlessOffer(run, st).every(id => !EP[id].old), 'retired rewards aren\'t offered');
assert(!R.endlessOffer(1, 0).includes('budget'), 'no bigger budget for a stage that already has the roomy one');
const stoneCells = g => CELLS.filter(k => g.board[k].includes(STONE)).length;
assert.equal(stoneCells(R.endlessGame(5, 3, 'stone', 0)), stoneCells(R.endlessGame(5, 3, null, 0)) - 1, 'a stone gone');
assert.deepEqual(ET[2].stones, R.STONE_LAYOUTS[2], 'the reward leaves the tier itself alone');
const gone = R.endlessGame(5, 3, 'stone', 0).endless.gone;
assert(ET[2].stones[gone] && !R.endlessGame(5, 3, 'stone', 0).board[gone].length, 'the game knows which stone went');
const ew = R.endlessGame(9, 1, null, 0);
for (let i = 0; i < ew.deckSize; i++) { assert(place(ew, ew.tray.findIndex(t => t), '0,0')); ew.board['0,0'] = []; }
assert(R.isWon(ew));
console.log('endless tests passed');

// the daily puzzle: one deck per date, from the checked Endless pools; the week climbs
assert.equal(R.dailyDate(new Date(2026, 10, 2)), 20261102);
assert.equal(R.dailyName(20261102), 'Mon 2 Nov');
assert.equal(R.dailyTier(20261102), 1, 'Monday is gentle');
assert.equal(R.dailyTier(20261107), 7, 'Saturday is hard');
for (const d of [20261101, 20261108, 20261115, 20261122]) assert(R.dailyTier(d) >= R.ENDLESS_RAMP, 'Sunday draws a top tier');
const d1 = R.dailyGame(20261102);
assert.deepEqual(d1.tray, R.dailyGame(20261102).tray, 'the same date deals the same deck');
assert.notDeepEqual(d1.start, R.dailyGame(20261109).start, 'another date, another deck');
assert.equal(d1.mode, 'daily'); assert.equal(R.gameName(d1), 'Daily · Mon 2 Nov');
for (let d = 20261101; d <= 20261130; d++) {   // every deck from the checked part of its pool
  const g = R.dailyGame(d), i = g.start - R.ENDLESS_SEED - 1000 * g.daily.tier;
  assert(i >= 0 && i < R.ENDLESS_POOL && !(R.ENDLESS_SKIP[g.daily.tier] || []).includes(i), 'daily ' + d + ' is a checked deck');
  const T = R.dailyTargets(d); assert(T.M > 3 && T.score < T.top, 'daily ' + d + ' has sensible targets');
}
const dw = R.dailyGame(20261103), DT = R.dailyTargets(20261103);
for (let i = 0; i < dw.deckSize; i++) { assert(place(dw, dw.tray.findIndex(t => t), '0,0')); dw.board['0,0'] = []; }
assert.equal(R.starsFor(dw), 1, 'finishing is a star'); dw.score = DT.top; assert.equal(R.starsFor(dw), 3);
console.log('daily tests passed');


// Classic ramps up: a new colour every CLASSIC_RAMP.every deks, and undo takes it back
{
  const g = R.newGame(1, 'standard'); g.hexadeks = 9; g.history = [];
  for (const k of R.CELLS) g.board[k] = [];
  g.board['0,0'] = Array(9).fill(0); g.board['1,0'] = [0, 0, 0];
  assert(g.ramp && g.colours === 5, 'Classic starts at 5 colours');
  const r = pour(g, '1,0', '0,0');
  assert(r.clears && g.colours === 6 && r.newColour === 5, 'the tenth dek brings a sixth colour');
  undo(g); assert.equal(g.colours, 5, 'undo takes the colour back');
  assert(!R.newGame(1, 'standard', 7).ramp && !R.newGame(1, 'free').ramp, 'custom games keep their colours');
  console.log('classic ramp tests passed');
}

// hints: a dek first, room on a full board, and a placement beside a match
{
  const g = R.newGame(1, 'standard'); g.history = [];
  for (const k of R.CELLS) g.board[k] = [];
  g.board['0,0'] = Array(9).fill(1); g.board['1,0'] = [2, 1, 1, 1]; g.board['-1,0'] = [3, 3];
  let h = R.hintMove(g);
  assert(h.why === 'dek' && h.from === '1,0' && h.to === '0,0', 'a hint finishes a dek first: ' + JSON.stringify(h));
  g.board['1,0'] = [2]; g.tray = [[4, 4], [3, 3, 3], [0]];
  h = R.hintMove(g);
  assert(h.why === 'place' && h.slot === 1 && R.neighbours(h.to).includes('-1,0'), 'a stack goes beside its colour: ' + JSON.stringify(h));
  for (const k of R.CELLS) g.board[k] = [k === '0,0' ? 1 : 5, k === '0,0' ? 2 : 6];
  g.board['1,0'] = [6];   // one tile: pouring it onto a neighbouring 6 empties the cell
  h = R.hintMove(g);
  assert(h.why === 'room' && R.pourResult(g.board, h.from, h.to).emptiesFrom, 'a full board: a pour that makes room: ' + JSON.stringify(h));
  console.log('hint tests passed');
}

// records and milestones: totals add up, and one note at most, the rarest first
{
  const T = R.tallyGame;
  const cl = R.newGame(3, 'standard'); cl.hexadeks = 12; cl.turn = 120;
  let [n, note] = T(cl, { deks: 40, games: 9, classic: 100 }, {}, true);
  assert.deepEqual([n.deks, n.games, n.classic], [52, 10, 120]);
  assert.equal(note, 'Your 50th dek in all!', 'a dek milestone beats the Classic record and game 10');
  [n, note] = T(cl, { deks: 60, games: 20, classic: 100 }, {}, true);
  assert.equal(note, 'Your longest Classic yet: 120 turns.');
  [n, note] = T(cl, { deks: 60, games: 20 }, {}, true);
  assert.equal(note, '', 'no record to beat on the first Classic');
  [n, note] = T(cl, { deks: 40, games: 9 }, {}, false);
  assert.equal(note, '', 'a game that was left: counted, but nothing said');
  assert.equal(n.deks, 52);
  const lv = R.newGame(1001, 'level', null, 1);
  assert.equal(T(lv, { deks: 0, games: 3 }, { chapterDone: 2 }, true)[1], 'Chapter 2, every level ★★★!');
  console.log('record tests passed');
}

// collect levels: two per chapter, the goal from the deck, ★★ for the colour
{
  assert.deepEqual(R.LEVELS.filter(L => L.collect).map(L => L.n), [5, 11, 17, 23, 29, 35, 41, 47, 53, 59, 65, 71]);
  const g = R.newGame(1005, 'level', null, 5), C = R.collectGoal(g);
  assert(C && C.deks >= 1 && C.colour >= 0, 'level 5 has a collect goal');
  assert.equal(R.collectGoal(R.newGame(1004, 'level', null, 4)), null, 'level 4 does not');
  g.turn = g.deckSize; g.score = 99999; g.made = {};
  assert.equal(R.starsFor(g), 1, 'a high score alone is not ★★ on a collect level');
  g.made[C.colour] = C.deks;
  assert.equal(R.starsFor(g), 3, 'the colour, and the score, give ★★★');
  console.log('collect tests passed');
}
