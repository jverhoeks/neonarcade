# NEON MIND — Classic Brain Puzzles, Neon Style

Timeless logic puzzles reimagined in the NEON ARCADE aesthetic. No time pressure by default — think clearly, solve elegantly. Difficulty scales through board size, constraint count, and optional timed modes. Sessions: 3-15 minutes. Same single-file HTML5 architecture, mobile-first.

---

## Design Philosophy

### How NEON MIND fits the brand ecosystem
| NEON ARCADE | NEON GRIND | NEON MIND |
|---|---|---|
| Quick viral hits | Progressive skill games | Classic logic puzzles |
| 30-60 seconds | 5-10 minutes | 3-15 minutes |
| Reaction + luck | Speed + adaptation | Logic + deduction |
| "One more try" | "One more level" | "One more puzzle" |
| Share scores | Share level reached | Share solve time + streak |

### Core Loop
```
Pick difficulty -> Solve puzzle -> Track time -> Improve -> Push to harder difficulty -> Daily streak
```

### What makes these work
- **Proven formats** — Sudoku and Minesweeper are among the most played games in history. No explanation needed.
- **No time pressure** (by default) — Relaxing, meditative. Timer shown but not enforced. Optional speed mode for competitive players.
- **Infinite replayability** — Procedurally generated puzzles mean every game is unique.
- **Clear difficulty ladder** — Board size and constraint density scale naturally.
- **Daily puzzles** — Same puzzle for everyone today. Compare solve times. Streak tracking.

### Retention Hooks
- **Daily puzzle** — Same seed for everyone, streak counter, share solve time
- **Difficulty progression** — Easy -> Medium -> Hard -> Expert (unlock by completing previous)
- **Personal bests** — Fastest solve per difficulty, displayed on start screen
- **Streak counter** — Consecutive days played (like Wordle)
- **Solve stats** — Win rate, average time, games played, current/best streak
- **Hints system** — Limited hints (3 per game), doesn't break streak but affects star rating

### Star Ratings (per puzzle)
- 1 star: Completed
- 2 stars: Completed without hints
- 3 stars: Completed without hints, under par time

---

## GAME CONCEPTS

### 1. MINISUDOKU
**Type:** Logic puzzle / number placement
**Core:** Sudoku on a smaller grid. 6x6 grid with 2x3 (or 3x2) blocks. Same rules as classic Sudoku: each row, column, and block must contain digits 1-6 exactly once. Perfect entry point for Sudoku newcomers, satisfying quick solve for veterans.

**Difficulty Levels:**
- **Easy:** 20-22 given digits (out of 36). Single candidate solves only. Avg solve: 1-3 min.
- **Medium:** 16-19 given digits. Requires naked pairs / hidden singles. Avg solve: 3-5 min.
- **Hard:** 12-15 given digits. Requires elimination chains, pointing pairs. Avg solve: 5-10 min.
- **Expert:** 10-12 given digits. Requires advanced techniques (X-wing equivalent on 6x6). Avg solve: 8-15 min.

**Puzzle Generation:**
- Start with a valid completed 6x6 grid
- Randomly remove digits while ensuring unique solution
- Validate difficulty by running a logic solver that tracks which techniques are needed
- Difficulty = set of techniques required (easy = only naked singles, hard = requires chains)
- Generate 3-5 puzzles per difficulty per session (instant, no server needed)

**UI Layout (portrait/mobile-first):**
- 6x6 grid centered, cells large enough for comfortable tapping (min 48px)
- Block boundaries clearly visible (thicker borders or subtle background color difference)
- Number pad 1-6 below the grid
- Selected cell highlighted in cyan, same-number highlights across row/col/block
- Conflicting digits highlighted in pink/red
- Top bar: difficulty label, timer (MM:SS), hints remaining (3 lightbulb icons)
- Bottom: number pad + tools (undo, erase, hint, notes toggle)

**Notes/Pencil Marks:**
- Toggle "notes mode" to enter small candidate numbers in cells
- Long-press a cell to toggle notes mode (mobile)
- Essential for medium+ difficulty

**Controls:**
- Mobile: tap cell to select, tap number to place, tap again to clear. Swipe to toggle notes.
- Desktop: click cell, type number. Spacebar = toggle notes. Z = undo. H = hint.

**Screens:**
1. **Start Screen** — "MINISUDOKU" title, difficulty selector (Easy/Medium/Hard/Expert with lock icons), daily puzzle button, stats overview (games won, streak, best times per difficulty)
2. **Gameplay** — Grid, number pad, tools, timer, hint counter
3. **Puzzle Complete** — Solve time, star rating, comparison to personal best, SHARE button, NEXT PUZZLE / BACK TO MENU
4. **Daily Puzzle** — Same puzzle for everyone, leaderboard of solve times, streak counter

**Sharing:**
```
MINISUDOKU [HARD]
Solved in 4:23
No hints used
Streak: 12 days
neonarcade.net/neonmind/minisudoku
```

**localStorage:**
- `neonarcade_neonmind_minisudoku_stats` — { gamesPlayed, gamesWon, streak, bestStreak, bestTimes: { easy, medium, hard, expert }, dailyHistory: [...] }
- `neonarcade_neonmind_minisudoku_current` — Save in-progress puzzle state (grid, notes, time elapsed)

**Build:** 2/5

---

### 2. SUDOKU
**Type:** Logic puzzle / number placement (classic 9x9)
**Core:** The classic. 9x9 grid, 3x3 blocks, digits 1-9. The king of logic puzzles. Same UI patterns as MiniSudoku but scaled up.

**Difficulty Levels:**
- **Easy:** 36-40 givens. Naked singles only. Avg solve: 3-8 min.
- **Medium:** 30-35 givens. Hidden singles, naked pairs. Avg solve: 8-15 min.
- **Hard:** 25-29 givens. Pointing pairs, box/line reduction, naked triples. Avg solve: 15-30 min.
- **Expert:** 22-26 givens. X-wing, swordfish, XY-wing, unique rectangles. Avg solve: 20-45 min.

**Puzzle Generation:**
- Generate a valid completed 9x9 grid using backtracking with random seeding
- Remove digits symmetrically while ensuring unique solution
- Run constraint solver to classify difficulty by technique required
- Cache a bank of 10+ puzzles per difficulty (generate in background after first load)
- Daily puzzle: use date as seed for deterministic generation

**UI Layout (portrait/mobile-first):**
- 9x9 grid centered, auto-sized to fit screen (cells ~36-44px on phone)
- 3x3 block boundaries via thicker borders + subtle background tint alternation
- Number pad 1-9 in a single row below grid (compact)
- Remaining count per digit shown on number pad (e.g., "1" with small "3" = 3 ones left to place)
- Selected cell = cyan highlight, related cells (same row/col/block) = dim highlight
- Same-digit highlighting across entire grid
- Error highlighting: conflicting digits pulse pink
- Top bar: difficulty, timer, hints (3)
- Auto-save on every move

**Advanced Features:**
- **Undo/Redo** — Full move history, unlimited undo
- **Notes mode** — Pencil marks for candidates, auto-remove when digit placed in same unit
- **Auto-notes** — Button to fill all obvious candidates (available after first manual solve)
- **Highlight mode** — Tap a number on the pad to highlight all instances on board
- **Error checking** — Optional: toggle "check mistakes" to instantly flag wrong digits

**Controls:**
- Mobile: tap cell, tap number. Double-tap to toggle notes. Long-press for cell menu (hint, notes, clear).
- Desktop: click cell, type number. N = notes toggle. Z = undo. Shift+Z = redo. H = hint.

**Screens:**
Same structure as MiniSudoku:
1. Start (difficulty select + daily + stats)
2. Gameplay (grid + tools)
3. Complete (time + stars + share)
4. Daily puzzle (shared seed + streak)

**Sharing:**
```
SUDOKU [EXPERT]
Solved in 23:47
No hints | No errors
Streak: 8 days
neonarcade.net/neonmind/sudoku
```

**localStorage:**
- `neonarcade_neonmind_sudoku_stats`
- `neonarcade_neonmind_sudoku_current`

**Build:** 3/5 (puzzle generation + solver is the hard part)

---

### 3. MINESWEEPER
**Type:** Logic + deduction / grid reveal
**Core:** Classic Minesweeper. Click to reveal cells, flag mines, clear the board. Difficulty scales through board size and mine density. The NEON ARCADE version adds satisfying visual effects — chain reveals cascade with particle effects, flags glow, mines explode with screen shake.

**Difficulty Levels (progressive board sizes):**
- **Tiny:** 5x5, 3 mines (intro / tutorial feel)
- **Easy:** 8x8, 10 mines (classic beginner)
- **Medium:** 12x12, 25 mines (intermediate, needs flagging strategy)
- **Hard:** 16x16, 40 mines (classic advanced)
- **Expert:** 20x16, 60 mines (dense, requires careful logic)
- **Extreme:** 24x20, 99 mines (classic expert density, scrollable on mobile)

**Progression System:**
- Start with Tiny unlocked, complete to unlock Easy, etc.
- Each difficulty has a "best time" tracked
- 3-star rating per difficulty:
  - 1 star: completed
  - 2 stars: completed under par time
  - 3 stars: completed under speed time (top 10% pace for that difficulty)
- After unlocking all difficulties: "ENDLESS" mode with random size/density each game

**First-Click Safety:**
- First click always reveals a zero (opening). The board is generated AFTER the first click to guarantee this.
- Ensures the player always gets a satisfying cascade on their first move.

**Chord/Multi-Reveal:**
- Click a revealed number where the correct number of adjacent flags are placed → auto-reveals all non-flagged neighbors
- This is essential for fast play at higher difficulties

**UI Layout (portrait/mobile-first):**
- Grid centered and auto-sized to fit viewport
- For large boards (16x16+): pinch-to-zoom + pan on mobile, or scrollable with minimap
- Cells: unrevealed = dark raised look, revealed = flat with number, flagged = neon flag icon
- Number colors: 1=cyan, 2=green, 3=pink, 4=purple, 5=orange, 6=cyan-dark, 7=white, 8=gold
- Top bar: mine counter (total - flagged), timer (MM:SS), difficulty label
- Bottom bar: flag mode toggle (mobile), new game button
- Long-press or right-click to flag (desktop: right-click)

**Visual Effects:**
- **Cascade reveal** — When a zero is clicked, adjacent cells reveal in a wave animation (50ms delay per ring), each cell briefly flashes cyan before settling
- **Flag placement** — Flag pulses with neon glow when placed
- **Mine explosion** — On game over: clicked mine explodes with particles + screen shake, then all mines reveal one by one in a ripple pattern with small explosions
- **Win celebration** — All flags light up gold simultaneously, confetti particles, board pulses with a glow
- **Number pop** — Numbers scale up briefly (1.1x) when revealed

**Controls:**
- Mobile: tap to reveal, long-press (300ms) to flag/unflag. Toggle flag mode button for "tap to flag" mode.
- Desktop: left-click = reveal, right-click = flag. Middle-click or click on satisfied number = chord reveal.

**Screens:**
1. **Start Screen** — "MINESWEEPER" title, difficulty grid (Tiny through Extreme with lock/star indicators), best times per difficulty, daily puzzle, stats
2. **Gameplay** — Grid, mine counter, timer, flag toggle
3. **Game Over (loss)** — Mine reveal animation, stats (time, cells revealed, flags placed), RETRY button
4. **Win** — Celebration animation, solve time, star rating, personal best comparison, SHARE, NEXT DIFFICULTY / NEW GAME
5. **Daily** — Same board for everyone (date-seeded), streak tracking

**Sharing:**
```
MINESWEEPER [HARD]
16x16 | 40 mines
Cleared in 3:42
Streak: 5 days
neonarcade.net/neonmind/minesweeper
```

**localStorage:**
- `neonarcade_neonmind_minesweeper_stats` — { perDifficulty: { tiny: { played, won, bestTime }, ... }, streak, bestStreak, dailyHistory }
- `neonarcade_neonmind_minesweeper_current` — Save in-progress game state

**Build:** 3/5

---

## FUTURE GAME IDEAS

### 4. NONOGRAM (Picross)
**Type:** Logic / pixel art reveal
**Core:** Fill in cells on a grid based on number clues along rows and columns. Reveals a pixel art picture. Sizes: 5x5 (easy) to 15x15 (hard). Beautiful neon pixel art as the reward.
**Build:** 3/5

### 5. KAKURO
**Type:** Logic / number puzzle
**Core:** Cross-sum puzzle. Fill digits 1-9 in white cells so each "word" sums to its clue. No repeated digits. Sizes: 4x4 to 10x10.
**Build:** 3/5

### 6. BRIDGES (Hashiwokakero)
**Type:** Logic / connection
**Core:** Connect islands (numbered circles) with bridges. Each island's number = total bridges connected. Bridges can't cross. Relaxing, spatial.
**Build:** 2/5

### 7. LIGHTUP (Akari)
**Type:** Logic / illumination
**Core:** Place lights on a grid so every white cell is lit. Lights illuminate entire row/column until hitting a wall. Numbered walls indicate how many lights touch them. No two lights can see each other.
**Build:** 2/5

### 8. SLITHERLINK
**Type:** Logic / loop drawing
**Core:** Draw a single closed loop on a dotted grid. Numbers indicate how many sides of that cell are part of the loop. Pure deduction, deeply satisfying.
**Build:** 3/5

---

## VISUAL STYLE

Same NEON ARCADE brand but with a calmer, more contemplative mood:

### Color Adaptations
- Background: same #0a0a12 deep dark
- Primary accent: #00f0ff (cyan) for selections, highlights
- Correct/placed: #39ff14 (green) for valid placements
- Error/conflict: #ff2d7b (pink) for mistakes
- Neutral grid: #1a1a2e grid lines, #12121f cell backgrounds
- Given/fixed digits: #8888aa (mid-dim, clearly distinct from player-placed)
- Player-placed digits: #00f0ff (bright cyan)
- Notes/candidates: #4a4a6a (dim, smaller font)
- Flags (minesweeper): #ffd700 (gold)

### Typography
- Same Orbitron + Rajdhani font stack
- Grid numbers: Orbitron 700 for a clean digital look
- Labels/UI: Rajdhani as usual

### Visual Effects (subtler than arcade/grind games)
- Scanline overlay (same as all NEON ARCADE)
- Subtle glow on selected cell (not harsh)
- Smooth cell reveal animations (fade in, slight scale)
- Number cascade on minesweeper zero-reveal
- Gentle particle burst on puzzle complete (not as aggressive as GRIND games)
- No screen shake during puzzles (it's a thinking game) — only on minesweeper mine hit
- Win celebration: grid briefly pulses with colored glow, particles rise

### Mobile Considerations
- Cells must be minimum 36px tap targets (44px preferred)
- For 9x9 Sudoku on small phones: allow pinch-zoom or use full viewport width
- For large Minesweeper: pinch-zoom + pan, or scrollable with position indicator
- Number pad: large buttons, easy to reach with thumb
- No accidental-tap issues: confirm destructive actions (only on minesweeper)

---

## LANDING PAGE (public/neonmind/index.html)

### Brand Identity
- Title: "NEON MIND" — purple primary with cyan accent (like NEON GRIND but different split)
- Tagline: "Classic puzzles. Neon clarity."
- Subtitle: "Timeless logic games in the NEON ARCADE style. Think clearly. Solve elegantly."
- Back link to NEON ARCADE main hub

### Cards
Same card layout as NEON GRIND landing page:
1. MINISUDOKU — "6x6 grids, 4 difficulties, daily puzzles"
2. SUDOKU — "The classic 9x9, beautifully reimagined"
3. MINESWEEPER — "Clear the board. 6 sizes. Don't click a mine."

### Coming Soon Section
NONOGRAM, KAKURO, BRIDGES, LIGHTUP, SLITHERLINK

---

## RECOMMENDED BUILD ORDER

1. **MINISUDOKU** — Smallest scope, proves the puzzle UI patterns, fast to build, reusable code for full Sudoku
2. **MINESWEEPER** — Completely different game type, high visual impact (cascade reveals are satisfying), well-understood mechanics
3. **SUDOKU** — Builds on MiniSudoku code, bigger grid, needs better puzzle generator + solver

---

## SHARED CODE PATTERNS

### Puzzle Timer
```javascript
// Reusable across all NEON MIND games
var timerStart = 0;
var timerPaused = false;
var timerOffset = 0;

function startTimer() { timerStart = Date.now(); timerPaused = false; timerOffset = 0; }
function pauseTimer() { if (!timerPaused) { timerOffset += Date.now() - timerStart; timerPaused = true; } }
function resumeTimer() { if (timerPaused) { timerStart = Date.now(); timerPaused = false; } }
function getElapsed() { return timerOffset + (timerPaused ? 0 : Date.now() - timerStart); }
function formatTime(ms) {
  var s = Math.floor(ms / 1000);
  var m = Math.floor(s / 60);
  s = s % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}
```

### Daily Puzzle Seeding
```javascript
// Same puzzle for everyone on the same day
function getDailySeed() {
  var d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
// Use seed to initialize PRNG for deterministic puzzle generation
```

### Stats Tracking
```javascript
// Shared pattern for all NEON MIND games
function loadStats(key) {
  try { return JSON.parse(localStorage.getItem(key)) || defaultStats(); } catch(e) { return defaultStats(); }
}
function saveStats(key, stats) {
  try { localStorage.setItem(key, JSON.stringify(stats)); } catch(e) {}
}
```
