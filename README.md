This is a Claude project to improve on the UX of some common hex-stacking games, and to try out interesting ruleset possibilities.

# Hexadek

A hex-grid stacking puzzle. Stacks of coloured tiles arrive three at a time; place them on a
small hex board, pour matching colours from stack to stack, and complete a **hexadek**, 12 tiles
of one colour, to clear it and score. Several hexadeks in one turn make a combo.

- **Journey:** 72 levels in 6 chapters, each bringing something new (pour budgets, stones,
  more colours, longer decks), with one to three stars per level.
- **Standard, Survive and Free** games, and **Custom**: any of them with 3 to 13 colours.
- A tutorial, colour themes by chapter, light and dark modes, haptics, and a hold-to-peek
  view of any stack. Every colour also has its own symbol, so colour alone is never needed.

## Playing

Open `index.html` in a browser; `themes.js` and `fonts/` need to sit beside it. There's no
build step, no server and no network use: the game is plain HTML, CSS and JavaScript, and keeps
progress in the browser's local storage on the device. How to play (in the game) explains the
rules.

## Development

Tests (Node 11 or later):

```sh
node test_rules.js index.html
```

Tools, in `tools/`:

| Tool | What it does |
|---|---|
| `bot.js` | Computer players that play the real rules, for tuning levels (`--skill player` is matched to play tests) |
| `targets.js` | Sets each level's star targets from the computer players' scores |
| `hubcompare.js` | Compares the computer player with and without the "hub" strategy |
| `monkey.js` | Random taps, drags and buttons on the real page in headless Chrome, checking the game stays sound |
| `contrast.js` | Contrast checks for the colour themes |
| `themes.html` | A preview of every colour theme, light and dark |

## Credits

- **Lexend** typeface, bundled in `fonts/`: Copyright 2018 The Lexend Project Authors
  (https://github.com/googlefonts/lexend), with Reserved Font Name "RevReading Lexend".
  Licensed under the SIL Open Font License, Version 1.1; the full licence is in
  [`fonts/OFL.txt`](fonts/OFL.txt) and at https://openfontlicense.org. The font files are the
  Latin and Latin Extended subsets of Lexend as served by Google Fonts, otherwise unchanged.
- The random number generator is **mulberry32**, written in 2017 by Tommy Ettinger and
  dedicated to the public domain
  ([source](https://gist.github.com/tommyettinger/46a874533244883189143505d203312c)). Credited
  as a courtesy: the dedication asks for nothing.
- Game design, code, tile symbols and colour themes were made for this project with
  [Claude Code](https://claude.com/claude-code).

## Licence

The game's code is under the [MIT License](LICENSE), copyright (c) 2026 lzimmerman. This covers
everything in the repository except `fonts/`: the Lexend font files keep their own SIL Open
Font License ([`fonts/OFL.txt`](fonts/OFL.txt)), as noted under Credits.

