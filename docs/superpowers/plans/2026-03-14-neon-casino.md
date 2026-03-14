# NEON CASINO Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new NEON CASINO category with 5 casino games (Blackjack, Video Poker, Roulette, Slots, Poker) sharing a persistent chip bankroll system.

**Architecture:** Each game is a single standalone HTML file in `public/neoncasino/` following the existing NEON ARCADE pattern. All 5 games share a persistent bankroll stored in localStorage with FNV-1a hash integrity checking. Poker includes multiplayer room support via new `/api/mroom/*` worker endpoints for 6-player tables. All games use neon.js for leaderboards and the standard NEON visual style (dark bg, neon accents, scanlines, glow, particles).

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, Web Audio API (oscillator-based sounds), Canvas API (HiDPI), Cloudflare Workers (KV storage)

**Spec:** `docs/superpowers/specs/2026-03-14-neon-casino-design.md`

---

## Chunk 1: Infrastructure & Blackjack

### Task 1: Register casino games in worker backend

**Files:**
- Modify: `src/worker.js:72-82` (add after NEON CLASSIC section, before closing `};`)

- [ ] **Step 1: Add NEON CASINO entries to KNOWN_GAMES**

After line 81 (`'tictactoe': ...`), add:

```javascript
  // NEON CASINO (mode: high — bankroll-based)
  'blackjack':           { mode: 'high', maxScore: 1000000 },
  'poker':               { mode: 'high', maxScore: 1000000 },
  'roulette':            { mode: 'high', maxScore: 1000000 },
  'slots':               { mode: 'high', maxScore: 1000000 },
  'video-poker':         { mode: 'high', maxScore: 1000000 },
```

- [ ] **Step 2: Verify worker syntax**

Run: `node -c src/worker.js`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/worker.js
git commit -m "Register 5 NEON CASINO games in worker KNOWN_GAMES"
```

---

### Task 2: Create neoncasino directory and screenshots folder

**Files:**
- Create: `public/neoncasino/` directory
- Create: `public/neoncasino/screenshots/` directory

- [ ] **Step 1: Create directories**

```bash
mkdir -p public/neoncasino/screenshots
```

- [ ] **Step 2: Verify**

```bash
ls -la public/neoncasino/
```

Expected: empty directory with `screenshots/` subdirectory

---

### Task 3: Build Blackjack

**Files:**
- Create: `public/neoncasino/blackjack.html`

This is the first casino game. It establishes the shared bankroll system (load/save/hash/reset/daily-bonus) and card rendering patterns that Video Poker and Poker will reuse.

- [ ] **Step 1: Create the complete Blackjack game file**

Create `public/neoncasino/blackjack.html` — a single standalone HTML file containing:

**HEAD section:**
- Full SEO template from CLAUDE.md with all placeholders filled:
  - Title: `Blackjack — Free Online Card Game | NEON ARCADE`
  - Canonical: `https://neonarcade.net/neoncasino/blackjack.html`
  - og:locale: `en_US`, twitter:url matching canonical
  - Screenshot path: `https://neonarcade.net/neoncasino/screenshots/blackjack.png`
  - Schema.org VideoGame + BreadcrumbList (Home → NEON CASINO → Blackjack)
- Google Fonts via `<link>` (Orbitron + Rajdhani) — NOT @import
- Viewport: `width=device-width, initial-scale=1.0, user-scalable=no`

**CSS (inline `<style>`):**
- Standard reset: `* { margin:0; padding:0; box-sizing:border-box; }`
- Body: `background: #0a0a12; font-family: 'Rajdhani', sans-serif; color: #fff; touch-action: none; user-select: none;`
- Scanline overlay on `body::after` (repeating-linear-gradient 2px)
- Screen management: `.screen { display:none; } .screen.active { display:flex; flex-direction:column; align-items:center; justify-content:center; }`
- Three screens: `#start-screen`, `#game-screen`, `#result-screen`
- Card styling: dark card face (#12121f), neon-outlined suits (cyan for hearts/diamonds, pink for spades/clubs), rounded corners, card flip via CSS 3D transform (preserve-3d, rotateY)
- Chip styling: circular elements with gold border and glow
- Button: `.play-btn` following CLAUDE.md pattern (Orbitron, cyan border, hover glow+scale)
- Action buttons: hit/stand/double/split — distinct colors (cyan hit, green stand, gold double, purple split)
- Neon glow text-shadow on titles and scores
- Screen shake animation `@keyframes shake`
- Responsive: cards and table scale to viewport (use vw/vh units, media queries for mobile)

**HTML structure:**
```html
<div id="start-screen" class="screen active">
  <!-- Title: "BLACKJACK" (Orbitron 900), subtitle, bankroll display -->
  <!-- Bet selector: chip buttons (10, 25, 50, 100, 500) -->
  <!-- DEAL button -->
  <!-- Leaderboard container -->
  <!-- Reset bankroll button (small, bottom) -->
</div>

<div id="game-screen" class="screen">
  <!-- Top: dealer area (cards + label) -->
  <!-- Middle: bet + bankroll display -->
  <!-- Bottom: player area (cards + hand value) -->
  <!-- Action buttons: HIT / STAND / DOUBLE / SPLIT -->
</div>

<div id="result-screen" class="screen">
  <!-- Result message (WIN/LOSE/PUSH/BLACKJACK!) -->
  <!-- Payout info -->
  <!-- Stats: hands played, wins, blackjacks -->
  <!-- DEAL AGAIN / CHANGE BET / SHARE buttons -->
  <!-- Leaderboard container -->
</div>
```

**JavaScript (inline `<script>` after neon.js include):**

Include `<script src="/neon.js"></script>` before game script.

IIFE structure `(() => { ... })();` containing:

1. **Bankroll system** (shared pattern for all casino games):
```javascript
const SALT = 'N30N_C4S1N0_2026';
function hashBankroll(chips) {
  let h = 2166136261;
  const s = SALT + ':' + chips;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
function saveBankroll(chips) {
  localStorage.setItem('neoncasino_bankroll', JSON.stringify({ chips, hash: hashBankroll(chips) }));
}
function loadBankroll() {
  try {
    const data = JSON.parse(localStorage.getItem('neoncasino_bankroll'));
    if (data && data.hash === hashBankroll(data.chips)) return data.chips;
  } catch (e) {}
  return null;
}
function initBankroll() {
  let chips = loadBankroll();
  if (chips === null) { chips = 1000; saveBankroll(chips); }
  return chips;
}
function canDailyBonus() {
  const last = parseInt(localStorage.getItem('neoncasino_last_bonus') || '0', 10);
  return Date.now() - last > 86400000;
}
function claimDailyBonus() {
  localStorage.setItem('neoncasino_last_bonus', '' + Date.now());
  bankroll += 500;
  saveBankroll(bankroll);
}
function resetBankroll() {
  localStorage.removeItem('neoncasino_bankroll');
  localStorage.removeItem('neoncasino_last_bonus');
  bankroll = 1000;
  saveBankroll(bankroll);
}
```

2. **Card deck system:**
- `createDeck()` — returns shuffled 6-deck shoe (312 cards), each card = `{ suit, rank, value }`
- `shuffleDeck(deck)` — Fisher-Yates shuffle
- `drawCard(deck)` — pops card from deck, reshuffles if penetration > 75%
- `handValue(cards)` — returns `{ value, soft }` handling aces (1 or 11)
- `isBlackjack(cards)` — ace + 10-value on first 2 cards

3. **Game state:**
```javascript
let bankroll = initBankroll();
let bet = 0;
let deck = [];
let playerHands = []; // Array of hands (for split)
let activeHand = 0;
let dealerCards = [];
let stats = JSON.parse(localStorage.getItem('neoncasino_blackjack_stats') || '{"hands":0,"wins":0,"blackjacks":0}');
```

4. **Neon.js integration:**
```javascript
Neon.init({ game: 'blackjack', mode: 'high', key: 'neonarcade_neoncasino_blackjack_scores' });
```

5. **Game flow functions:**
- `showScreen(id)` — hides all screens, shows target
- `startDeal()` — validates bet <= bankroll, deducts bet, deals 2 cards each, checks for blackjack
- `hit()` — draws card for player, checks bust
- `stand()` — moves to next hand or dealer turn
- `doubleDown()` — doubles bet, draws one card, stands
- `split()` — if pair, splits into two hands, deducts additional bet
- `dealerTurn()` — dealer draws until 17+, resolves all hands
- `resolveHand(hand)` — compares to dealer, calculates payout (3:2 blackjack, 2:1 insurance, 1:1 win)
- `showResult()` — updates bankroll, saves, shows result screen
- `share()` — copies emoji result to clipboard

6. **Card rendering:**
- DOM-based card elements (div with suit symbol + rank text)
- Face-down card: solid neon-outlined back
- Card deal animation: CSS transition (translate from deck position)
- Card flip: CSS 3D transform (rotateY 180deg)

7. **Sound effects** (Web Audio API oscillator-based):
- `playSound(type)` with types: 'deal', 'flip', 'chip', 'win', 'bust', 'blackjack'
- Short oscillator tones (50-200ms), different frequencies per type

8. **Particle effects:**
- `spawnParticles(x, y, color, count)` — spawns 8-20 small divs that animate outward and fade
- Trigger on: win, blackjack, bust

9. **Input handlers:**
- Click/tap on action buttons
- Keyboard: H=hit, S=stand, D=double, ESC=back to start screen
- Touch-friendly button sizing (min 44px)

10. **Responsive:**
- Cards scale based on viewport width
- On mobile: stack vertically, larger touch targets
- HiDPI not needed (DOM-based, not canvas)

- [ ] **Step 2: Test the game locally**

```bash
cd public && python3 -m http.server 8777 &
```

Open `http://localhost:8777/neoncasino/blackjack.html` and verify:
- Start screen shows with bankroll 1000
- Can place bets and deal
- Hit/stand/double work correctly
- Blackjack detection works
- Win/lose updates bankroll correctly
- Bankroll persists on page reload
- Share button copies correct format
- ESC returns to start screen
- Mobile touch controls work
- Sound effects play
- Scanlines, glow, particles visible

- [ ] **Step 3: Take screenshot**

Use Playwright to screenshot at 1280x800:
```javascript
// Take screenshot of the start screen
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('http://localhost:8777/neoncasino/blackjack.html');
await page.waitForTimeout(2000); // Let fonts and animations load
await page.screenshot({ path: 'public/neoncasino/screenshots/blackjack.png' });
```

- [ ] **Step 4: Commit**

```bash
git add public/neoncasino/blackjack.html public/neoncasino/screenshots/blackjack.png
git commit -m "Add Blackjack — first NEON CASINO game with shared bankroll system"
```

---

### Task 4: Build Video Poker

**Files:**
- Create: `public/neoncasino/video-poker.html`

Reuses the bankroll system pattern and card rendering from Blackjack. Adds hold/draw mechanics and paytable display.

- [ ] **Step 1: Create the complete Video Poker game file**

Create `public/neoncasino/video-poker.html` — single standalone HTML file containing:

**HEAD section:**
- Same SEO template as Blackjack but with Video Poker specifics:
  - Title: `Video Poker — Free Online Card Game | NEON ARCADE`
  - Canonical: `https://neonarcade.net/neoncasino/video-poker.html`
  - Screenshot: `https://neonarcade.net/neoncasino/screenshots/video-poker.png`
  - BreadcrumbList: Home → NEON CASINO → Video Poker

**CSS:** Same base as Blackjack plus:
- Paytable grid: fixed above cards, columns for bet 1-5, rows highlight on win
- HOLD badge: glowing label below each card
- 5-card layout: horizontal row, responsive sizing

**HTML structure:**
```html
<div id="start-screen" class="screen active">
  <!-- Title: "VIDEO POKER" -->
  <!-- Subtitle: "JACKS OR BETTER" -->
  <!-- Bankroll display, bet selector (1-5 units × 10 chips) -->
  <!-- DEAL button, leaderboard container, reset button -->
</div>

<div id="game-screen" class="screen">
  <!-- Paytable: visible at top, current bet column highlighted -->
  <!-- 5 cards in a row, HOLD button under each -->
  <!-- DRAW button (replaces unheld cards) -->
  <!-- Bankroll + bet display -->
</div>

<div id="double-screen" class="screen">
  <!-- "DOUBLE OR NOTHING" title -->
  <!-- Single face-down card -->
  <!-- RED / BLACK buttons -->
  <!-- Current win amount at stake -->
  <!-- COLLECT button to skip -->
</div>

<div id="result-screen" class="screen">
  <!-- Hand name (e.g. "FULL HOUSE!") -->
  <!-- Payout amount -->
  <!-- Stats, DEAL AGAIN / SHARE buttons -->
  <!-- Leaderboard container -->
</div>
```

**JavaScript:**

Same IIFE pattern. Includes:

1. **Bankroll system** — identical code to Blackjack (copy the same hashBankroll/saveBankroll/loadBankroll/initBankroll/canDailyBonus/claimDailyBonus/resetBankroll functions)

2. **Single 52-card deck** (reshuffled each hand, unlike Blackjack's 6-deck shoe)

3. **Hand evaluation:**
```javascript
function evaluateHand(cards) {
  // Returns: { rank: 0-9, name: 'Royal Flush'|..., payout: multiplier }
  // Ranks: 0=nothing, 1=jacks-or-better, 2=two-pair, 3=three-of-a-kind,
  //        4=straight, 5=flush, 6=full-house, 7=four-of-a-kind,
  //        8=straight-flush, 9=royal-flush
}
```

4. **Payout table** (per 1-unit bet):
```javascript
const PAYOUTS = [0, 1, 2, 3, 4, 6, 9, 25, 50, 250];
// Royal Flush at max bet (5 units): 800 instead of 250
```

5. **Game flow:**
- `deal()` — deal 5 cards, enable hold toggles
- `toggleHold(index)` — toggle hold state on card
- `draw()` — replace unheld cards, evaluate hand, show result
- `offerDouble()` — if won, offer double-or-nothing
- `doubleGuess(color)` — draw card, if guessed right: double winnings, offer again. Wrong: lose all.
- `collect()` — take current winnings, return to deal

6. **Card rendering, sounds, particles** — same patterns as Blackjack

7. **Neon.js integration:**
```javascript
Neon.init({ game: 'video-poker', mode: 'high', key: 'neonarcade_neoncasino_video-poker_scores' });
```

8. **Input:** Click/tap cards to hold, keyboard 1-5 to toggle hold, D=draw, ESC=start screen

9. **Share format:**
```
🃏 NEON VIDEO POKER
💰 Bankroll: X,XXX | 🏆 Best: [hand name]
🎯 XX hands | ✅ X wins | 💥 [best hand]!
neonarcade.net/neoncasino/video-poker.html
```

- [ ] **Step 2: Test locally**

Open `http://localhost:8777/neoncasino/video-poker.html` and verify:
- Deal shows 5 cards
- Hold toggle works (click + keyboard 1-5)
- Draw replaces unheld cards
- Hand evaluation is correct (test each hand type)
- Paytable highlights winning row
- Double or Nothing works correctly
- Bankroll shared with Blackjack (same localStorage key)
- Bankroll persists, share works, ESC works, sounds play

- [ ] **Step 3: Take screenshot at 1280x800**

Save to `public/neoncasino/screenshots/video-poker.png`

- [ ] **Step 4: Commit**

```bash
git add public/neoncasino/video-poker.html public/neoncasino/screenshots/video-poker.png
git commit -m "Add Video Poker (Jacks or Better) with double-or-nothing"
```

---

## Chunk 2: Roulette & Slots

### Task 5: Build Roulette

**Files:**
- Create: `public/neoncasino/roulette.html`

Canvas-based game — animated spinning wheel + betting table layout. This is the first canvas-heavy casino game.

- [ ] **Step 1: Create the complete Roulette game file**

Create `public/neoncasino/roulette.html` — single standalone HTML file:

**HEAD:** Same SEO template pattern:
- Title: `Roulette — Free Online Casino Game | NEON ARCADE`
- Canonical: `https://neonarcade.net/neoncasino/roulette.html`
- BreadcrumbList: Home → NEON CASINO → Roulette

**CSS:** Standard neon base plus:
- Split layout: wheel on top/left, betting table on bottom/right
- Betting table: CSS grid matching European roulette layout (0-36 + outside bets)
- Number cells colored: red (#ff2d7b), black (#1a1a2e), green (zero)
- Placed chips: small circular overlays on bet positions
- Chip selector bar: row of chip denominations

**HTML:**
```html
<div id="start-screen" class="screen active">
  <!-- Title: "ROULETTE" -->
  <!-- Bankroll, START button, leaderboard, reset -->
</div>

<div id="game-screen" class="screen">
  <!-- Top: canvas for wheel animation -->
  <!-- Middle: betting table grid (numbers + outside bets) -->
  <!-- Bottom: chip selector + SPIN button + bankroll + CLEAR BETS -->
</div>

<div id="result-screen" class="screen">
  <!-- Winning number display (big, glowing) -->
  <!-- Payout breakdown -->
  <!-- BET AGAIN / SHARE, leaderboard -->
</div>
```

**JavaScript:**

1. **Bankroll system** — same as Blackjack/Video Poker

2. **HiDPI Canvas setup** (REQUIRED for canvas games):
```javascript
const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('wheel-canvas');
const logicalW = 400, logicalH = 400;
canvas.width = logicalW * dpr;
canvas.height = logicalH * dpr;
canvas.style.width = logicalW + 'px';
canvas.style.height = logicalH + 'px';
const ctx = canvas.getContext('2d');
ctx.scale(dpr, dpr);
```

3. **Wheel data:**
```javascript
// European roulette: 37 pockets, standard sequence
const WHEEL_NUMBERS = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
```

4. **Wheel rendering:**
- `drawWheel(rotation)` — draw the wheel at given rotation angle
- Alternating red/black/green pockets with neon outlines
- Numbers rendered along the arc
- Ball: white/cyan glowing circle drawn at edge

5. **Spin animation:**
- `spinWheel()` — animate rotation over 3-5 seconds using requestAnimationFrame
- Wheel spins fast then decelerates (ease-out cubic)
- Ball bounces a few times before settling (2-3 small jumps)
- Final position determines winning number

6. **Betting table:**
- Click/tap a cell to place a chip (current denomination)
- Track placed bets: `Map<position, amount>`
- Bet positions: numbers 0-36, split/street/corner (by adjacent number pairs), dozen, column, red/black, odd/even, high/low
- Visual: chip stacks appear on bet positions
- CLEAR BETS button removes all bets

7. **Payout calculation:**
```javascript
function calculatePayouts(winningNumber, bets) {
  // Returns total payout based on all placed bets
  // straight 35:1, split 17:1, street 11:1, corner 8:1,
  // line 5:1, dozen 2:1, column 2:1, even-money 1:1
}
```

8. **Sounds:**
- Chip placement (clink)
- Spin start (building whoosh)
- Ball bouncing (decelerating ticks)
- Ball lands (thunk)
- Win (chime), Loss (descend), Big win (fanfare)

9. **Neon.js:**
```javascript
Neon.init({ game: 'roulette', mode: 'high', key: 'neonarcade_neoncasino_roulette_scores' });
```

10. **Responsive:** Canvas scales to available width. Betting table uses CSS grid with auto-sizing. On mobile: table below wheel, scrollable if needed.

11. **Share format:**
```
🎰 NEON ROULETTE
💰 Bankroll: X,XXX | 🎯 Hit: XX [Color]
📊 X spins | ✅ X wins | 💥 [best hit type]!
neonarcade.net/neoncasino/roulette.html
```

- [ ] **Step 2: Test locally**

Verify: wheel spins smoothly at 60fps, bets place correctly, payouts are accurate, bankroll shared with other casino games, canvas is sharp on Retina displays.

- [ ] **Step 3: Take screenshot at 1280x800**

Save to `public/neoncasino/screenshots/roulette.png`

- [ ] **Step 4: Commit**

```bash
git add public/neoncasino/roulette.html public/neoncasino/screenshots/roulette.png
git commit -m "Add Roulette with animated wheel, European layout, and full bet types"
```

---

### Task 6: Build Slots

**Files:**
- Create: `public/neoncasino/slots.html`

Most complex visuals — 5x3 reel grid with spin animation, 20 paylines, free spins bonus. Canvas-based.

- [ ] **Step 1: Create the complete Slots game file**

Create `public/neoncasino/slots.html` — single standalone HTML file:

**HEAD:** SEO template:
- Title: `Slots — Free Online Slot Machine Game | NEON ARCADE`
- Canonical: `https://neonarcade.net/neoncasino/slots.html`
- BreadcrumbList: Home → NEON CASINO → Slots

**CSS:** Standard neon base plus:
- Machine frame: border with metallic/chrome gradient + neon glow
- Reel grid: 5 columns × 3 rows, dark background
- Symbol styling: neon-outlined vector icons
- Win line overlay: colored glowing lines
- Big win overlay: full-screen celebration with large text
- Bet selector bar: 10/20/50/100 chip buttons
- Auto-spin toggle

**HTML:**
```html
<div id="start-screen" class="screen active">
  <!-- Title: "SLOTS" with slot-machine-style framing -->
  <!-- Bankroll, PLAY button, paytable button, leaderboard -->
</div>

<div id="game-screen" class="screen">
  <!-- Machine frame border -->
  <!-- Canvas: 5x3 reel grid with spin animation -->
  <!-- Win display: current win amount -->
  <!-- Controls: bet selector, SPIN button, auto-spin toggle -->
  <!-- Bankroll display -->
</div>

<div id="paytable-screen" class="screen">
  <!-- Symbol payouts table -->
  <!-- Payline diagram (20 lines) -->
  <!-- BACK button -->
</div>

<div id="bonus-screen" class="screen">
  <!-- "FREE SPINS!" title -->
  <!-- Spins remaining counter -->
  <!-- Same reel grid but with purple tint overlay -->
</div>
```

**JavaScript:**

1. **Bankroll system** — same pattern

2. **HiDPI Canvas setup** (same pattern as Roulette)

3. **Symbol system:**
```javascript
// 7 symbols, drawn as neon vector icons on canvas (not emoji)
const SYMBOLS = [
  { id: 'diamond', color: '#00f0ff', draw: (ctx, x, y, size) => { /* diamond shape */ } },
  { id: 'lightning', color: '#ffd700', draw: (ctx, x, y, size) => { /* bolt shape */ } },
  { id: 'seven', color: '#ff2d7b', draw: (ctx, x, y, size) => { /* 7 digit */ } },
  { id: 'bell', color: '#b44dff', draw: (ctx, x, y, size) => { /* bell shape */ } },
  { id: 'cherry', color: '#ff2d7b', draw: (ctx, x, y, size) => { /* cherry shape */ } },
  { id: 'card', color: '#39ff14', draw: (ctx, x, y, size) => { /* card shape */ } },
  { id: 'star', color: '#ff8c00', draw: (ctx, x, y, size) => { /* star shape */ } },
];
```

4. **Reel system:**
- Each reel: array of symbol indices (weighted random)
- Diamond (wild) weight: low, Lightning (scatter) weight: low, others: higher
- 5 reels spin independently

5. **Spin animation:**
- requestAnimationFrame loop
- Each reel scrolls symbols vertically with motion blur
- Reels stop left to right, 0.3s apart
- Bounce effect on stop (overshoot + spring back)

6. **Payline evaluation:**
```javascript
// 20 paylines (standard 5x3 pattern)
const PAYLINES = [
  [1,1,1,1,1], // middle row
  [0,0,0,0,0], // top row
  [2,2,2,2,2], // bottom row
  [0,1,2,1,0], // V shape
  [2,1,0,1,2], // inverted V
  // ... 15 more standard patterns
];

function evaluatePaylines(grid, bet) {
  // For each payline, check for 3/4/5 matching symbols from left
  // Wild (diamond) substitutes for anything except scatter
  // Returns: { totalWin, winningLines: [{ line, symbols, count, payout }] }
}
```

7. **Scatter/bonus:**
- 3+ lightning scatters anywhere → FREE SPINS (5/10/15 for 3/4/5)
- Free spins: same gameplay but no bet deducted, purple visual tint

8. **Win display:**
- Small win: flash win amount
- Medium win (>10x): extended animation, win amount counts up
- Big win (>50x): full-screen "BIG WIN" overlay with mega glow, particle fountain

9. **Auto-spin:** Toggle button, spins automatically at 2-second intervals until toggled off or bankroll runs out

10. **Sounds:**
- Spin start (mechanical whoosh)
- Reel stop (thunk, increasing pitch per reel)
- Win tiers (small chime → medium coins → big fanfare)
- Scatter hit (electric zap)
- Free spin trigger (dramatic buildup)

11. **Neon.js:**
```javascript
Neon.init({ game: 'slots', mode: 'high', key: 'neonarcade_neoncasino_slots_scores' });
```

12. **Share format:**
```
🎰 NEON SLOTS
💰 Bankroll: X,XXX | 🎯 Best spin: XXXx
🔥 XX spins | 💎 X wilds | ⚡ Free spins hit!
neonarcade.net/neoncasino/slots.html
```

- [ ] **Step 2: Test locally**

Verify: reels spin smoothly at 60fps, paylines evaluate correctly, wild substitution works, scatter triggers free spins, win tiers display correctly, auto-spin works, bankroll shared, canvas sharp on Retina.

- [ ] **Step 3: Take screenshot at 1280x800**

Save to `public/neoncasino/screenshots/slots.png`

- [ ] **Step 4: Commit**

```bash
git add public/neoncasino/slots.html public/neoncasino/screenshots/slots.png
git commit -m "Add Slots with 5x3 reels, 20 paylines, wilds, and free spins bonus"
```

---

## Chunk 3: Poker (Multiplayer)

### Task 7: Add multi-player room endpoints to worker

**Files:**
- Modify: `src/worker.js` (add `/api/mroom/*` endpoints before the closing `return json({ error: 'not found' }, 404);` at line 469)

- [ ] **Step 1: Add multi-player room endpoints**

Add these endpoints to `src/worker.js` after the existing room endpoints (after line 467, before the `return json({ error: 'not found' }, 404);`):

```javascript
      // ─── Multi-Player Room Endpoints (up to 6 players) ─────────────

      // POST /api/mroom/create — create a multi-player room
      if (request.method === 'POST' && segments[0] === 'mroom' && segments[1] === 'create') {
        let code = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = generateRoomCode();
          const existing = await env.GAME_DATA.get(`mroom:${candidate}`);
          if (!existing) { code = candidate; break; }
        }
        if (!code) return json({ error: 'failed to generate room code, try again' }, 503);

        const token = generateToken();
        const room = {
          seats: { 0: { token, name: null } },
          messages: [],
          created: Date.now(),
          state: 'waiting',
          maxSeats: 6,
        };
        await env.GAME_DATA.put(`mroom:${code}`, JSON.stringify(room), { expirationTtl: 600 });
        return json({ code, token, seat: 0 });
      }

      // POST /api/mroom/join — join a multi-player room
      if (request.method === 'POST' && segments[0] === 'mroom' && segments[1] === 'join') {
        let body;
        try { body = await request.json(); } catch { return json({ error: 'invalid JSON body' }, 400); }

        const code = sanitizeRoomCode(body.code);
        if (!code) return json({ error: 'invalid room code' }, 400);

        const room = safeParseObject(await env.GAME_DATA.get(`mroom:${code}`));
        if (!room) return json({ error: 'room not found' }, 404);
        if (room.state === 'closed') return json({ error: 'room closed' }, 400);

        const occupiedSeats = Object.keys(room.seats).map(Number);
        if (occupiedSeats.length >= room.maxSeats) return json({ error: 'room full' }, 400);

        // Find first open seat
        let seat = -1;
        for (let i = 0; i < room.maxSeats; i++) {
          if (!room.seats[i]) { seat = i; break; }
        }
        if (seat === -1) return json({ error: 'no seats available' }, 400);

        const token = generateToken();
        room.seats[seat] = { token, name: body.name || null };
        await env.GAME_DATA.put(`mroom:${code}`, JSON.stringify(room), { expirationTtl: 600 });
        return json({ code, token, seat });
      }

      // POST /api/mroom/send — broadcast a message to room
      if (request.method === 'POST' && segments[0] === 'mroom' && segments[1] === 'send') {
        let body;
        try { body = await request.json(); } catch { return json({ error: 'invalid JSON body' }, 400); }

        const code = sanitizeRoomCode(body.code);
        if (!code) return json({ error: 'invalid room code' }, 400);
        if (!body.token) return json({ error: 'token required' }, 400);

        const room = safeParseObject(await env.GAME_DATA.get(`mroom:${code}`));
        if (!room) return json({ error: 'room not found' }, 404);

        // Verify token and find sender seat
        let fromSeat = -1;
        for (const [s, data] of Object.entries(room.seats)) {
          if (data && data.token === body.token) { fromSeat = parseInt(s, 10); break; }
        }
        if (fromSeat === -1) return json({ error: 'invalid token' }, 403);

        room.messages.push({ from: fromSeat, msg: body.msg, ts: Date.now() });
        if (room.messages.length > 100) room.messages = room.messages.slice(-100);

        await env.GAME_DATA.put(`mroom:${code}`, JSON.stringify(room), { expirationTtl: 600 });
        return json({ ok: true });
      }

      // GET /api/mroom/poll?code=X&token=Y&after=Z — poll for messages from other players
      if (request.method === 'GET' && segments[0] === 'mroom' && segments[1] === 'poll') {
        const code = sanitizeRoomCode(url.searchParams.get('code'));
        if (!code) return json({ error: 'invalid room code' }, 400);
        const token = url.searchParams.get('token');
        if (!token) return json({ error: 'token required' }, 400);

        const room = safeParseObject(await env.GAME_DATA.get(`mroom:${code}`));
        if (!room) return json({ error: 'room not found' }, 404);

        let mySeat = -1;
        for (const [s, data] of Object.entries(room.seats)) {
          if (data && data.token === token) { mySeat = parseInt(s, 10); break; }
        }
        if (mySeat === -1) return json({ error: 'invalid token' }, 403);

        const after = parseInt(url.searchParams.get('after') || '0', 10);
        const messages = room.messages.filter(m => m.from !== mySeat && m.ts > after);
        const seats = {};
        for (const [s, data] of Object.entries(room.seats)) {
          seats[s] = { name: data.name };
        }
        return json({ messages, state: room.state, seats });
      }

      // POST /api/mroom/close — close a multi-player room
      if (request.method === 'POST' && segments[0] === 'mroom' && segments[1] === 'close') {
        let body;
        try { body = await request.json(); } catch { return json({ error: 'invalid JSON body' }, 400); }

        const code = sanitizeRoomCode(body.code);
        if (!code) return json({ error: 'invalid room code' }, 400);
        if (!body.token) return json({ error: 'token required' }, 400);

        const room = safeParseObject(await env.GAME_DATA.get(`mroom:${code}`));
        if (!room) return json({ error: 'room not found' }, 404);

        // Verify token belongs to seat 0 (room creator)
        if (!room.seats[0] || body.token !== room.seats[0].token) {
          return json({ error: 'only room creator can close' }, 403);
        }

        room.state = 'closed';
        await env.GAME_DATA.put(`mroom:${code}`, JSON.stringify(room), { expirationTtl: 600 });
        return json({ ok: true });
      }
```

- [ ] **Step 2: Verify worker syntax**

Run: `node -c src/worker.js`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/worker.js
git commit -m "Add multi-player room endpoints (/api/mroom/*) for up to 6 players"
```

---

### Task 8: Build Poker (Texas Hold'em)

**Files:**
- Create: `public/neoncasino/poker.html`

Most complex game — 6-seat table, AI opponents with personalities, multiplayer room codes, hand evaluation, pot/side-pot calculation.

**Implementation approach:** Build in two phases within this task:
1. Core game with AI opponents (solo play)
2. Add multiplayer room integration

- [ ] **Step 1: Create the complete Poker game file**

Create `public/neoncasino/poker.html` — single standalone HTML file:

**HEAD:** SEO template:
- Title: `Poker — Free Online Texas Hold'em Game | NEON ARCADE`
- Canonical: `https://neonarcade.net/neoncasino/poker.html`
- BreadcrumbList: Home → NEON CASINO → Poker

**CSS:** Standard neon base plus:
- Oval table: elliptical div with gold neon border glow, dark surface (#12121f)
- 6 seats arranged around oval (CSS absolute positioning)
- Seat styling: circle border, 3-char name, chip count, cards
- Active seat: pulsing cyan border
- Folded seat: dimmed (opacity 0.4)
- Empty seat: dashed border, "JOIN" label
- Community cards: 5 cards centered on table
- Pot display: glowing gold text in table center
- Action bar: fold/check/call/raise buttons at bottom
- Raise slider: range input with neon styling

**HTML:**
```html
<div id="start-screen" class="screen active">
  <!-- Title: "POKER" subtitle: "TEXAS HOLD'EM" -->
  <!-- Bankroll display -->
  <!-- PLAY SOLO button -->
  <!-- CREATE ROOM / JOIN ROOM buttons -->
  <!-- Room code input (for join) -->
  <!-- Leaderboard, reset button -->
</div>

<div id="game-screen" class="screen">
  <!-- Oval table background -->
  <!-- 6 seat positions (absolute) with cards, name, chips -->
  <!-- 5 community cards center -->
  <!-- Pot display -->
  <!-- Action bar: FOLD / CHECK / CALL / RAISE + slider -->
  <!-- Room code display (if multiplayer) + share room link -->
</div>

<div id="result-screen" class="screen">
  <!-- Session summary: hands played, biggest pot, best hand -->
  <!-- PLAY AGAIN / SHARE buttons -->
  <!-- Leaderboard -->
</div>
```

**JavaScript:**

1. **Bankroll system** — same pattern

2. **Hand evaluation engine:**
```javascript
function evaluatePokerHand(cards) {
  // Takes 5-7 cards, finds best 5-card hand
  // Returns: { rank: 0-9, name: string, cards: best5 }
  // 0=high-card, 1=pair, 2=two-pair, 3=three-of-a-kind,
  // 4=straight, 5=flush, 6=full-house, 7=four-of-a-kind,
  // 8=straight-flush, 9=royal-flush
  // With kicker comparison for tie-breaking
}
```

3. **AI opponent system:**
```javascript
const AI_PERSONALITIES = {
  tight:      { playRange: 0.25, raiseFreq: 0.15, bluffFreq: 0.05 },
  loose:      { playRange: 0.60, raiseFreq: 0.20, bluffFreq: 0.10 },
  aggressive: { playRange: 0.40, raiseFreq: 0.45, bluffFreq: 0.20 },
};
const AI_NAMES = ['PIXEL', 'FLUX', 'VOLT', 'CIPHER', 'PRISM', 'GLITCH', 'SPARK', 'HEXA'];

function aiDecision(ai, holeCards, communityCards, potSize, toCall, stage) {
  // Returns: { action: 'fold'|'check'|'call'|'raise', amount?: number }
  // Considers: hand strength, pot odds, personality, bluff chance
  // Thinking delay: 1-3 seconds (setTimeout)
}
```

4. **Table/pot management:**
```javascript
// Table state
let seats = []; // Array of 6: null (empty) | { name, chips, cards, folded, isAI, personality, allIn }
let communityCards = [];
let pot = 0;
let sidePots = [];
let dealerSeat = 0;
let currentSeat = 0;
let stage = 'preflop'; // preflop, flop, turn, river, showdown

function initSoloTable() {
  // Player at seat 0, 3 AI at seats 1-3, seats 4-5 empty
  // Each AI gets random personality + name
  // Each starts with buy-in from bankroll (200 chips)
}

function nextStage() {
  // preflop→flop (3 cards), flop→turn (1 card), turn→river (1 card), river→showdown
}

function calculateSidePots() {
  // Handle all-in situations correctly
}

function determineWinner(activePlayers, communityCards) {
  // Evaluate each player's best 5-card hand from their 2 + 5 community
  // Split pot on ties
}
```

5. **Game flow:**
- `startHand()` — shuffle deck, deal 2 cards each, post blinds
- `playerAction(action, amount)` — process player's action
- `processAiTurns()` — AI players act in sequence with thinking delays
- `advanceAction()` — move to next active player or next stage
- `showdown()` — reveal hands, determine winner, distribute pot
- `endHand()` — update chip counts, check for eliminated players, auto-deal next hand

6. **Multiplayer integration:**
```javascript
let roomCode = null;
let roomToken = null;
let isMultiplayer = false;
let pollInterval = null;

async function createRoom() {
  const res = await fetch('/api/mroom/create', { method: 'POST' });
  const data = await res.json();
  roomCode = data.code;
  roomToken = data.token;
  isMultiplayer = true;
  startPolling();
  showRoomCode();
}

async function joinRoom(code) {
  const name = Neon.getName() || 'PLR';
  const res = await fetch('/api/mroom/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, name })
  });
  // ...
}

function startPolling() {
  let lastTs = 0;
  pollInterval = setInterval(async () => {
    const res = await fetch(`/api/mroom/poll?code=${roomCode}&token=${roomToken}&after=${lastTs}`);
    const data = await res.json();
    data.messages.forEach(processRemoteMessage);
    if (data.messages.length) lastTs = data.messages[data.messages.length - 1].ts;
    updateSeatsFromRemote(data.seats);
  }, 1000);
}

async function sendAction(action) {
  await fetch('/api/mroom/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: roomCode, token: roomToken, msg: JSON.stringify(action) })
  });
}
```

7. **Card rendering:** DOM-based (same neon card style as Blackjack)
   - Hole cards: only player's own cards visible, others face-down
   - Showdown: flip animation reveals all active hands
   - Community cards: dealt one-at-a-time with slide animation

8. **Sounds:**
- Card deal, check (double tap), chip bet (clink), fold (whoosh), all-in (dramatic), win pot (cascade)

9. **Neon.js:**
```javascript
Neon.init({ game: 'poker', mode: 'high', key: 'neonarcade_neoncasino_poker_scores' });
```

10. **Input:**
- Click/tap action buttons
- Keyboard: F=fold, C=check/call, R=raise, ESC=back to start
- Raise slider: drag or click

11. **Turn timer:** 30 seconds per action, visible countdown on active seat, auto-fold on timeout

12. **Share format:**
```
🃏 NEON POKER
💰 Won X,XXX chips in X hands
👥 X-player table | 🏆 Biggest pot: X,XXX
🎯 Best hand: [hand name]
neonarcade.net/neoncasino/poker.html
```

- [ ] **Step 2: Test solo AI play**

Verify: table renders correctly, AI opponents make reasonable decisions, hand evaluation is correct, pot distribution works, side pots calculate correctly, chip counts update properly, bankroll saves.

- [ ] **Step 3: Test multiplayer**

Open two browser tabs/windows:
- Tab 1: Create room, note room code
- Tab 2: Join room with code
- Verify: both players see each other, turns alternate correctly, actions sync via polling

- [ ] **Step 4: Take screenshot at 1280x800**

Save to `public/neoncasino/screenshots/poker.png`

- [ ] **Step 5: Commit**

```bash
git add public/neoncasino/poker.html public/neoncasino/screenshots/poker.png
git commit -m "Add Poker (Texas Hold'em) with AI opponents and multiplayer rooms"
```

---

## Chunk 4: Hub Page & Full Integration

### Task 9: Create NEON CASINO hub page

**Files:**
- Create: `public/neoncasino/index.html`

Follow the existing category hub page pattern (reference: `public/neonclassic/index.html`).

- [ ] **Step 1: Create the hub page**

Create `public/neoncasino/index.html` — follows the `neonclassic/index.html` pattern but with gold accent (#ffd700) and casino identity:

**HEAD:** SEO template:
- Title: `NEON CASINO — Free Online Casino Games | NEON ARCADE`
- Canonical: `https://neonarcade.net/neoncasino/`
- Description: `Play free online casino games — Blackjack, Poker, Roulette, Slots, and Video Poker. No download, no login, no real money.`
- BreadcrumbList: Home → NEON CASINO

**CSS:** Same hub page pattern as neonclassic with:
- Gold accent color: all accents use `#ffd700` instead of cyan/pink
- Title glow: gold text-shadow
- Category link/button: gold border + hover glow
- Bankroll bar: sticky bar below hero showing chip count + reset + daily bonus
- Background: radial gradient with gold glow top-center

**HTML structure:**
```html
<header>
  <!-- Back link: "← NEON ARCADE" pointing to / -->
  <!-- Title: "NEON CASINO" (Orbitron 900, gold glow) -->
  <!-- Subtitle: "CLASSIC GAMES. NEON STAKES." -->
  <!-- Bankroll bar: 💰 X,XXX chips | RESET button | daily bonus indicator -->
  <!-- Game count: "5 CASINO GAMES" -->
</header>

<main>
  <!-- Sort bar: Default, Most Played, Most Liked, A-Z -->
  <div class="games-grid">
    <!-- 5 game cards following existing card pattern -->
  </div>
</main>

<footer>
  <!-- Credit + back link -->
</footer>
```

**Game cards (5 total):**

```html
<a href="blackjack.html" class="game-card" data-accent="gold">
  <div class="card-screenshot">
    <img src="screenshots/blackjack.png" alt="Blackjack" onerror="this.style.display='none';this.parentElement.querySelector('.placeholder').style.display='block'">
    <div class="placeholder" style="display:none">🃏</div>
    <span class="card-badge badge-new">NEW</span>
  </div>
  <div class="card-body">
    <span class="card-number">GAME 01</span>
    <h2 class="card-title">BLACKJACK</h2>
    <p class="card-desc">Classic 21 vs the AI dealer. Hit, stand, double down, or split. Fast rounds, neon cards, persistent bankroll.</p>
    <div class="card-tags">
      <span class="tag">Cards</span>
      <span class="tag">Solo</span>
      <span class="tag">Strategy</span>
    </div>
    <div class="card-play">PLAY NOW <span class="play-arrow">&rarr;</span></div>
  </div>
</a>

<!-- Poker card: tags include "Multiplayer", "Room Codes" -->
<!-- Roulette card: tags include "Wheel", "Betting" -->
<!-- Slots card: tags include "Reels", "Bonus", "Free Spins" -->
<!-- Video Poker card: tags include "Cards", "Hold/Draw" -->
```

**JavaScript:**
- Read bankroll from localStorage and display in bankroll bar
- Reset button with confirmation dialog
- Daily bonus check and button
- Sort functionality (same pattern as other hub pages)
- Fetch play stats via `NeonAPI.allStats()` for sort-by-popularity

- [ ] **Step 2: Test locally**

Verify: hub page displays all 5 game cards, bankroll bar shows correct value, reset works, game links work, sort works, responsive on mobile.

- [ ] **Step 3: Commit**

```bash
git add public/neoncasino/index.html
git commit -m "Add NEON CASINO hub page with gold accent and bankroll bar"
```

---

### Task 10: Add NEON CASINO to main hub page

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add NEON CASINO category section**

In `public/index.html`, after the NEON MIND section (after line 585 `</div>`) and before the section-line + "MORE FROM NEON ARCADE" section, add:

```html
<div class="section-line"></div>

<!-- NEON CASINO — Casino Games -->
<div class="category">
  <div class="category-header">
    <div>
      <h2 class="category-title" style="color:var(--neon-gold);text-shadow:0 0 10px rgba(255,215,0,0.4);">NEON CASINO</h2>
      <p class="category-sub">Free casino games — cards, roulette, slots</p>
    </div>
    <a href="/neoncasino/" class="category-link" style="color:var(--neon-gold);border-color:rgba(255,215,0,0.2);">ALL 5 GAMES &rarr;</a>
  </div>
  <div class="games-row" id="casino-games">
    <div class="loading">Loading top games...</div>
  </div>
</div>
```

- [ ] **Step 2: Add casino entries to CATALOG array**

In the CATALOG object (around line 636), add a `casino` array after the `mind` array:

```javascript
    casino: [
      { slug: 'blackjack', name: 'BLACKJACK', desc: 'Classic 21 vs AI dealer. Hit, stand, double, split. Persistent bankroll.', img: 'neoncasino/screenshots/blackjack.png', path: 'neoncasino/', modes: ['1p','ai'] },
      { slug: 'poker', name: 'POKER', desc: 'Texas Hold\'em. 6-seat table with AI opponents or friends via room codes.', img: 'neoncasino/screenshots/poker.png', path: 'neoncasino/', modes: ['1p','ai','online'] },
      { slug: 'roulette', name: 'ROULETTE', desc: 'European roulette. Place your bets, spin the neon wheel.', img: 'neoncasino/screenshots/roulette.png', path: 'neoncasino/', modes: ['1p'] },
      { slug: 'slots', name: 'SLOTS', desc: 'Neon slot machine. 5 reels, 20 paylines, wilds, free spins.', img: 'neoncasino/screenshots/slots.png', path: 'neoncasino/', modes: ['1p'] },
      { slug: 'video-poker', name: 'VIDEO POKER', desc: 'Jacks or Better. Hold, draw, double or nothing.', img: 'neoncasino/screenshots/video-poker.png', path: 'neoncasino/', modes: ['1p'] },
    ],
```

- [ ] **Step 3: Add casino to the picked/render logic**

In the `picked` object (around line 786), add:
```javascript
    casino: shuffle(CATALOG.casino).slice(0, 3),
```

Add a `renderCategory` call (around line 805):
```javascript
  renderCategory('casino-games', picked.casino, 'neoncasino/');
```

In the stats update section (around line 811), add `'casino'` to the forEach array and add:
```javascript
  renderCategory('casino-games', picked.casino, 'neoncasino/');
```

- [ ] **Step 4: Update game count**

Update the header description (line 520) from "62 free games" to "67 free games" and from "four collections" to "five collections":
```
67 free games in five collections: quick arcade action, retro classics reborn, classic brain puzzles, progressive skill challenges, and casino card & table games.
```

Update the "ALL X GAMES" links if any reference a total count.

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "Add NEON CASINO category to main hub with 5 game entries"
```

---

### Task 11: Update sitemap, llms.txt, and updates.html

**Files:**
- Modify: `public/sitemap.xml`
- Modify: `public/llms.txt`
- Modify: `public/updates.html`

- [ ] **Step 1: Add entries to sitemap.xml**

Add 6 new `<url>` entries (hub + 5 games):

```xml
  <url>
    <loc>https://neonarcade.net/neoncasino/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://neonarcade.net/neoncasino/blackjack.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://neonarcade.net/neoncasino/poker.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://neonarcade.net/neoncasino/roulette.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://neonarcade.net/neoncasino/slots.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://neonarcade.net/neoncasino/video-poker.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
```

- [ ] **Step 2: Add NEON CASINO section to llms.txt**

Add a new section:

```
### NEON CASINO
Casino card and table games with persistent chip bankroll. Gold neon aesthetic.
- Blackjack — Solo vs AI dealer, classic 21
- Poker — Texas Hold'em, 6-seat table, AI opponents + multiplayer room codes
- Roulette — European roulette, full bet types
- Slots — 5×3 reels, 20 paylines, wilds, free spins bonus
- Video Poker — Jacks or Better with double-or-nothing
```

- [ ] **Step 3: Add changelog entry to updates.html**

Add a new entry at the top of the changelog list with today's date:

```html
<li>
  <strong>2026-03-14</strong> — <span class="update-type new">NEW CATEGORY</span>
  <strong>NEON CASINO</strong> launched with 5 games:
  <a href="/neoncasino/blackjack.html">Blackjack</a>,
  <a href="/neoncasino/poker.html">Poker</a> (multiplayer),
  <a href="/neoncasino/roulette.html">Roulette</a>,
  <a href="/neoncasino/slots.html">Slots</a>,
  <a href="/neoncasino/video-poker.html">Video Poker</a>.
  Persistent chip bankroll shared across all casino games with global leaderboard.
</li>
```

- [ ] **Step 4: Commit**

```bash
git add public/sitemap.xml public/llms.txt public/updates.html
git commit -m "Add NEON CASINO to sitemap, llms.txt, and changelog"
```

---

### Task 12: Final verification and screenshot pass

**Files:** No new files — verification only

- [ ] **Step 1: Start local server**

```bash
cd public && python3 -m http.server 8777
```

- [ ] **Step 2: Verify each game loads and plays**

Open each URL and confirm:
- `http://localhost:8777/neoncasino/` — hub page loads, all 5 cards visible, bankroll bar works
- `http://localhost:8777/neoncasino/blackjack.html` — can deal, hit, stand, bankroll updates
- `http://localhost:8777/neoncasino/video-poker.html` — deal, hold, draw, double-or-nothing
- `http://localhost:8777/neoncasino/roulette.html` — place bets, spin, payouts correct
- `http://localhost:8777/neoncasino/slots.html` — reels spin, paylines evaluate, free spins trigger
- `http://localhost:8777/neoncasino/poker.html` — solo AI game plays through, actions work

- [ ] **Step 3: Verify shared bankroll**

1. Play Blackjack, note bankroll
2. Open Roulette, confirm same bankroll
3. Win/lose in Roulette, go back to Blackjack, confirm updated

- [ ] **Step 4: Verify mobile**

Test each game on mobile viewport (375×812):
- Touch controls work
- Cards/elements are readable
- Name input keyboard appears for Neon.js prompt

- [ ] **Step 5: Verify main hub integration**

- `http://localhost:8777/` — NEON CASINO section visible with 3 random games
- Game count shows "67 free games in five collections"
- Casino game cards link correctly

- [ ] **Step 6: Retake any screenshots if needed**

If any screenshots need updating, retake at 1280×800 viewport.

- [ ] **Step 7: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "Fix issues found during final NEON CASINO verification"
```
