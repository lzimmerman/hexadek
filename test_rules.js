const fs = require('fs'), assert = require('assert');
const html = fs.readFileSync(process.argv[2], 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];
eval(js + '; global.R = {CFG, CELLS, neighbours, runLen, newGame, newStack, pourResult, pour, undo, place, roomState, legalTargets, tutorialGame, TUTORIAL};');
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
const g = newGame(1); const b = g.board;
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
