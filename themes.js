// Hexadek colour themes.
//
// Each theme has a light and a dark set of colours. The keys are the page's CSS colour
// variables in index.html (--bg, --panel, ...), so a theme is applied by setting them.
// To change a theme, edit its hex values; to add one, copy a block and give it a new key.
// Check every theme after editing:   node tools/contrast.js
// See them side by side:             open tools/themes.html in a browser
//
// What each colour is for:
//   bg         page background, and the inside of the goals box on cards
//   panel      cards, dialogs, buttons and the status line
//   ink        main text, and the outline of a selected stack
//   muted      secondary text: labels, hints, "next"
//   cell       an empty board cell
//   cell-edge  the outline of empty cells, chips and inputs
//   plate      the board's backing, under the cells
//   accent     highlights: target rings, the blue in the title, primary buttons, links
//   on-accent  text on accent (primary buttons)
//   good       "Hexadek!" in the status line, met goals
//   warn       pours running low
//   danger     no pours left
//   gold       stars
//   line       dividers and the status line's border
//
// Tiles keep their own colours (COLOURS in index.html) in every theme, so players can rely on
// them, and the symbols tell them apart for colour-blind players. Stones stay grey (#6b7280).
// tools/contrast.js checks tiles and stones against each theme's cells.
//
// Chapter themes: Journey chapter n uses CHAPTER_THEMES[n - 1]. Natural palettes, soft rather
// than neon. index.html loads this file: a Journey level shows its chapter's theme (and the
// level list tints each chapter), every other game uses classic. Without this file the game
// keeps its built-in classic colours.

const THEMES = {
  classic: {   // the game's colours before themes: also the fallback
    name: 'Classic',
    light: { bg: '#f4f1ea', panel: '#ffffff', ink: '#16181d', muted: '#555a63', cell: '#e2dccf', 'cell-edge': '#a89f8c',
             plate: '#cfc6b4', accent: '#1d4ed8', 'on-accent': '#ffffff', good: '#15803d', warn: '#b45309',
             danger: '#b91c1c', gold: '#b07b00', line: '#d9d3c5' },
    dark:  { bg: '#111318', panel: '#1d2129', ink: '#f1f3f6', muted: '#aeb4bf', cell: '#272d38', 'cell-edge': '#4a5466',
             plate: '#1a1e26', accent: '#82aaff', 'on-accent': '#0b1220', good: '#4ade80', warn: '#fbbf24',
             danger: '#f87171', gold: '#fbbf24', line: '#343b48' },
  },
  meadow: {   // chapter 1, First steps: pale grass, cream, a soft sky
    name: 'Meadow',
    light: { bg: '#f1f4e8', panel: '#fdfdf8', ink: '#1a2416', muted: '#4c5845', cell: '#dfe7cf', 'cell-edge': '#8f9f78',
             plate: '#c6d3ae', accent: '#2a63a8', 'on-accent': '#ffffff', good: '#2e7a2e', warn: '#9c5a06',
             danger: '#b42318', gold: '#b07b00', line: '#d6ddc6' },
    dark:  { bg: '#121811', panel: '#1b231a', ink: '#eef3e9', muted: '#a8b49f', cell: '#263124', 'cell-edge': '#4d5f48',
             plate: '#18201a', accent: '#8dbdf5', 'on-accent': '#0b1a2b', good: '#79d68a', warn: '#f2c14e',
             danger: '#f28b82', gold: '#f2c14e', line: '#2f3b2d' },
  },
  dunes: {   // chapter 2, Tight budget: sand, warm stone, dry grass
    name: 'Dunes',
    light: { bg: '#f6efe1', panel: '#fffaf1', ink: '#2a2117', muted: '#665643', cell: '#eadbc0', 'cell-edge': '#ae956e',
             plate: '#d8c39e', accent: '#a94a16', 'on-accent': '#ffffff', good: '#4a7a0e', warn: '#8f5506',
             danger: '#b42318', gold: '#b97f00', line: '#e2d3b7' },
    dark:  { bg: '#1a1510', panel: '#251e17', ink: '#f5ede1', muted: '#c2b29b', cell: '#33291f', 'cell-edge': '#67553f',
             plate: '#211b14', accent: '#f0a46b', 'on-accent': '#24140a', good: '#a8d97c', warn: '#f5c451',
             danger: '#f59a8b', gold: '#f5c451', line: '#3a2f24' },
  },
  riverbed: {   // chapter 3, Stones: slate, moss, wet pebbles; cells kept light so grey stones stand out
    name: 'Riverbed',
    light: { bg: '#eef2f0', panel: '#ffffff', ink: '#172123', muted: '#4a585a', cell: '#dbe4e0', 'cell-edge': '#879995',
             plate: '#bfcdc8', accent: '#1d6b74', 'on-accent': '#ffffff', good: '#2b7a4b', warn: '#9a5807',
             danger: '#b42318', gold: '#b97f00', line: '#d3dcd8' },
    dark:  { bg: '#101617', panel: '#192123', ink: '#e9f0f0', muted: '#a3b2b4', cell: '#2a3638', 'cell-edge': '#526466',
             plate: '#162022', accent: '#72c6cf', 'on-accent': '#062023', good: '#72d4a2', warn: '#f2c14e',
             danger: '#f28b82', gold: '#f2c14e', line: '#2c383a' },
  },
  autumn: {   // chapter 4, More colours: russet, ochre, deep green
    name: 'Autumn woods',
    light: { bg: '#f7f0e5', panel: '#fffaf2', ink: '#2b1d14', muted: '#685142', cell: '#ecdbc6', 'cell-edge': '#ac8a6a',
             plate: '#dbc1a2', accent: '#963211', 'on-accent': '#ffffff', good: '#3d6112', warn: '#8f5506',
             danger: '#b01c1c', gold: '#b2741c', line: '#e5d2bb' },
    dark:  { bg: '#18120e', panel: '#231a14', ink: '#f6ece2', muted: '#c4ad98', cell: '#33261d', 'cell-edge': '#6a5040',
             plate: '#1f1712', accent: '#f29a6b', 'on-accent': '#2a1206', good: '#a6cc6e', warn: '#f5c451',
             danger: '#f59a8b', gold: '#e9b44c', line: '#3b2c22' },
  },
  dusk: {   // chapter 5, Long haul: dusk at sea, blue-grey and violet with a low sun
    name: 'Dusk at sea',
    light: { bg: '#eef0f6', panel: '#ffffff', ink: '#1a1d2b', muted: '#4d5270', cell: '#dadded', 'cell-edge': '#8c91b2',
             plate: '#c3c7dc', accent: '#5341b0', 'on-accent': '#ffffff', good: '#2b7a4b', warn: '#9a5807',
             danger: '#b4233a', gold: '#b07b00', line: '#d7dae8' },
    dark:  { bg: '#12131f', panel: '#1b1d2c', ink: '#eceef8', muted: '#aab0cc', cell: '#272b42', 'cell-edge': '#4d5378',
             plate: '#171a29', accent: '#a99bff', 'on-accent': '#15112e', good: '#72d4a2', warn: '#f5c451',
             danger: '#ff8fa3', gold: '#f5c451', line: '#2c3048' },
  },
  nightforest: {   // chapter 6, Mastery: deep green-black, moonlight, embers
    name: 'Night forest',
    light: { bg: '#e9efea', panel: '#fbfdfb', ink: '#102018', muted: '#42554a', cell: '#d3ded6', 'cell-edge': '#82978a',
             plate: '#b8c8bd', accent: '#1b5a45', 'on-accent': '#ffffff', good: '#2b7a2e', warn: '#925600',
             danger: '#b42318', gold: '#b2741c', line: '#cfdbd2' },
    dark:  { bg: '#0b120e', panel: '#131d17', ink: '#e8f0ea', muted: '#9fb2a5', cell: '#1f2c24', 'cell-edge': '#43594b',
             plate: '#101a14', accent: '#a9c9f2', 'on-accent': '#0b1626', good: '#7fd6a0', warn: '#f5b74f',
             danger: '#f59a8b', gold: '#f0b457', line: '#24332a' },
  },
};

const CHAPTER_THEMES = ['meadow', 'dunes', 'riverbed', 'autumn', 'dusk', 'nightforest'];

// CSS that sets a theme's colours, following the page's own light/dark rules: the light set,
// the dark set when the device is in dark mode (unless the page is forced light), and the
// dark set when the page is forced dark (data-theme="dark").
function themeCSS(name) {
  const T = THEMES[name] || THEMES.classic;
  const vars = set => Object.entries(set).map(([k, v]) => '--' + k + ': ' + v + ';').join(' ');
  return ':root { ' + vars(T.light) + ' }\n' +
         '@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ' + vars(T.dark) + ' } }\n' +
         ':root[data-theme="dark"] { ' + vars(T.dark) + ' }';
}

// Applies a theme to the page. The game must then re-read its colours for the board
// (its resize() does that) so the canvas matches.
function applyTheme(name, doc = document) {
  let el = doc.getElementById('theme-vars');
  if (!el) { el = doc.createElement('style'); el.id = 'theme-vars'; doc.head.appendChild(el); }
  el.textContent = themeCSS(name);
}

if (typeof module !== 'undefined') module.exports = { THEMES, CHAPTER_THEMES, themeCSS };
