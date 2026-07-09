# Minesweeper

A modern, dependency-free take on classic Minesweeper. Built with plain HTML5, CSS3, and vanilla JavaScript (ES6 modules): no frameworks, no build step.

**[Play it live](https://leo-bonacini.github.io/minesweeper/)** · hosted on GitHub Pages

## Features

- Four difficulty presets (Easy 9×9, Medium 16×16, Hard 30×16, Expert 40×20) plus a validated Custom board
- Guaranteed-safe first click, recursive flood-fill reveal, chord-reveal (double-click / middle-click / satisfied-flag click)
- Mine counter, live timer, pause/resume, win/loss detection, restart
- Six themes: Dark, Light, Windows 95, Cyberpunk, Forest, Ocean
- Reveal, flag, explosion, victory, and hover animations; particle effects (explosion sparks, confetti, sparkles), board shake, screen flash
- Synthesized sound effects via the Web Audio API (no binary audio assets to load), with a mute toggle
- Full statistics tracked in `localStorage`: games played, win rate, streaks, best times per difficulty, average completion time, flags placed, cells revealed
- Settings panel: theme, sound, reduced motion, high contrast, animation speed, cell size, custom board
- Accessibility: full keyboard play (arrow keys to move, Enter/Space to reveal, F to flag), ARIA grid labeling, visible focus states, `prefers-reduced-motion` support, high-contrast mode
- Mobile support: tap to reveal, long-press to flag, a Flag Mode toggle for touch devices, responsive layout for portrait and landscape
- Seeded board generation (`Board` accepts a seed) so runs can be reproduced deterministically
- Hint button that reveals a guaranteed-safe cell

## Controls

| Action | Desktop | Touch |
|---|---|---|
| Reveal cell | Left click | Tap |
| Flag / unflag cell | Right click | Long-press, or enable Flag Mode then tap |
| Chord (reveal neighbors) | Double-click / middle-click a revealed number | — |
| Move focus | Arrow keys | — |
| Reveal focused cell | Enter / Space | — |
| Flag focused cell | F | — |
| Pause / resume | Pause button | Pause button |

## Technologies

- HTML5
- CSS3 (custom properties, Grid, glassmorphism, keyframe animations)
- Vanilla JavaScript (ES6 classes, ES modules)
- Web Audio API for sound synthesis
- `localStorage` for settings and statistics persistence

No React, Vue, Angular, Bootstrap, or Tailwind.

## Folder Structure

```
minesweeper/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── game.js        Game state machine, orchestrates everything
│   ├── board.js        Board/grid logic, mine placement, flood-fill
│   ├── cell.js          Single-cell state
│   ├── ui.js             DOM rendering, input handling, settings UI
│   ├── timer.js         Elapsed-time tracking
│   ├── storage.js     localStorage persistence for stats & settings
│   └── sound.js       Web Audio synthesized sound effects
├── assets/
│   ├── sounds/     (reserved: sounds are synthesized, no files needed)
│   └── icons/         (reserved for custom icon assets)
└── README.md
```

## Installation

No build tooling required.

```bash
git clone https://github.com/leo-bonacini/minesweeper.git
cd minesweeper
open index.html
```

Or serve it locally (recommended, since some browsers restrict ES module imports over `file://`):

```bash
cd minesweeper
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deployment

The game is fully static, so it's served directly from this repo via GitHub Pages (Settings → Pages → deploy from the `main` branch, root folder). No build step, so there's nothing to publish beyond pushing to `main`.
