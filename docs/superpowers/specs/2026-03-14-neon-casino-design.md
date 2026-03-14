# NEON CASINO — Casino Games Category Design Spec

**Date:** 2026-03-14
**Status:** Draft
**Category:** New category for NEON ARCADE platform

---

## Overview

NEON CASINO is a new game category featuring classic casino card and table games reimagined with the NEON ARCADE neon aesthetic. All games use a persistent chip bankroll with hash-based integrity checking. Poker features room-based multiplayer; all other games are solo vs AI dealer/house.

### Design Priorities (ranked)

1. **"One more hand" loop** — Fast rounds, persistent bankroll creates stakes
2. **Neon casino identity** — Glowing cards, neon chips, felt-to-dark-neon table surfaces
3. **Shareable wins** — Big win moments, global leaderboard for highest bankroll

### Constraints

- Same architecture: single `.html` file per game, inline CSS/JS
- Same visual style: NEON ARCADE brand (dark bg #0a0a12, neon accents, Orbitron/Rajdhani, scanlines, glow effects)
- Same infrastructure: `neon.js` for scores/leaderboards, Cloudflare Worker backend
- No real money — play chips only
- localStorage for bankroll persistence with hash integrity check

---

## Category Infrastructure

### Hub Page

- `public/neoncasino/index.html` — Category hub following existing hub page pattern
- Accent color: **gold** (`#ffd700`) — casino gold, distinct from all existing categories, evokes chips and jackpots
- Badge: `badge-casino` (`#ffd700` gold background, dark text) — new CSS class alongside existing badges
- Each game card shows current bankroll balance (reads `neoncasino_bankroll` from localStorage, displays as "💰 X,XXX")
- Update CLAUDE.md to add `badge-casino` to the available badges list

### Hub Page Design

- **Hero section:** "NEON CASINO" title (Orbitron 900), subtitle "CLASSIC GAMES. NEON STAKES.", bankroll display prominent center
- **Background accent:** Radial gradient with gold (#ffd700) glow top-center, subtle pink (#ff2d7b) bottom-right (casino warmth)
- **Bankroll bar:** Persistent bar below hero showing current chip count + RESET button + daily bonus indicator
- **Game cards:** Standard card pattern with gold accent. Each card shows the game type icon and a "PLAY" button
- **Stats section:** Total hands played, biggest win, current bankroll (all from localStorage)

### File Structure

```
public/neoncasino/
  index.html              # NEON CASINO hub page
  blackjack.html          # Blackjack vs AI dealer
  poker.html              # Texas Hold'em (multiplayer rooms + AI)
  roulette.html           # Roulette wheel betting
  slots.html              # Neon slot machine
  video-poker.html        # Jacks or Better draw poker
  screenshots/            # 1280x800 PNGs per game
```

### Worker Registration

Add to `src/worker.js` KNOWN_GAMES:

```javascript
'blackjack':    { mode: 'high', maxScore: 1000000 },
'poker':        { mode: 'high', maxScore: 1000000 },
'roulette':     { mode: 'high', maxScore: 1000000 },
'slots':        { mode: 'high', maxScore: 1000000 },
'video-poker':  { mode: 'high', maxScore: 1000000 },
```

Score = current bankroll. `maxScore` is generous ceiling — server rejects anything above.

---

## Shared Chip System

### Bankroll

- **Shared across all 5 casino games** — one bankroll, stored in localStorage
- Starting balance: **1,000 chips**
- Key: `neoncasino_bankroll`
- Value: JSON object `{ chips: number, hash: string }`

### Hash Integrity

```javascript
// Simple HMAC-like integrity check
const SALT = 'N30N_C4S1N0_2026';

function hashBankroll(chips) {
  // FNV-1a hash of chips + salt — not cryptographic, just anti-casual-tampering
  let h = 2166136261;
  const s = SALT + ':' + chips;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function saveBankroll(chips) {
  localStorage.setItem('neoncasino_bankroll', JSON.stringify({
    chips: chips,
    hash: hashBankroll(chips)
  }));
}

function loadBankroll() {
  try {
    const data = JSON.parse(localStorage.getItem('neoncasino_bankroll'));
    if (data && data.hash === hashBankroll(data.chips)) {
      return data.chips;
    }
  } catch (e) {}
  // Tampered or missing — reset
  return null; // Triggers fresh start flow
}
```

- On load: if hash mismatch, show "Bankroll corrupted — starting fresh" and reset to 1,000
- Salt is visible in source (not a secret) — just prevents casual DevTools `localStorage.setItem()` edits

### Daily Bonus

- If bankroll drops below 100 chips, offer a "DAILY BONUS: +500 chips" button
- Limited to once per 24 hours via localStorage timestamp (`neoncasino_last_bonus`)
- Prevents permanent "broke" state that kills engagement

### Reset Option

- "RESET BANKROLL" button on casino hub page AND in each game's start screen menu
- Confirmation dialog: "Reset to 1,000 chips? Your bankroll and local scores will be cleared. This can't be undone."
- Clears: `neoncasino_bankroll`, all game-specific localStorage keys, local leaderboard entries
- Does NOT clear global leaderboard submissions (those are server-side)

### Leaderboard Integration

- Score submitted to Neon.js = current bankroll at time of submission
- Submit on: game exit, big win threshold, or manual "SAVE TO LEADERBOARD" action
- `Neon.init({ game: 'blackjack', mode: 'high', key: 'neonarcade_neoncasino_blackjack_scores' })`
- Storage key convention follows project standard: `neonarcade_neoncasino_{game}_scores`
- Global leaderboard shows highest bankroll achieved

---

## Game Designs

### 1. Blackjack

**Solo vs AI dealer.**

**Gameplay:**
- Standard Blackjack rules: hit, stand, double down, split
- 6-deck shoe, reshuffled at 75% penetration
- Dealer stands on soft 17
- Blackjack pays 3:2, insurance pays 2:1
- Minimum bet: 10 chips, maximum bet: bankroll or 10,000 (whichever is lower)

**Screens:**
1. **Start screen** — Title, current bankroll, bet selector (chips on felt), START/DEAL button, leaderboard
2. **Game screen** — Felt table, dealer hand (one face-down), player hand, hit/stand/double/split buttons, chip count
3. **Round result** — Win/lose/push animation, bankroll update, DEAL AGAIN / CHANGE BET buttons
4. **Bust/Blackjack** — Special particle effects + screen shake

**Visual details:**
- Cards: dark background with neon-outlined suits (cyan hearts/diamonds, pink spades/clubs)
- Card flip animation on reveal (CSS 3D transform)
- Chip stack visualization next to bet area
- Dealer "thinking" animation (subtle pulse)

**Sound effects:**
- Card deal (short swoosh)
- Card flip (snap)
- Chip bet placement (clink)
- Win (ascending tone + chime)
- Bust (descending tone + buzz)
- Blackjack (fanfare)

**Share format:**
```
🃏 NEON BLACKJACK
💰 Bankroll: 2,450 | 🏆 Best: 5,200
🎯 15 hands | ✅ 10 wins | 💥 2 blackjacks
neonarcade.net/neoncasino/blackjack.html
```

---

### 2. Poker (Texas Hold'em)

**Multiplayer (room codes) + AI opponents.**

**Table setup:**
- 6-seat table
- Solo play: player + 3 AI opponents + 2 empty seats (visually present, labeled "OPEN — share room code")
- Multiplayer: up to 6 human players via room code, AI fills remaining seats (minimum 0 AI if 6 humans)
- As humans join, AI players are removed (highest-numbered seat AI leaves first)

**Gameplay:**
- Texas Hold'em rules: 2 hole cards, 5 community cards (flop/turn/river)
- Blinds: small blind 10, big blind 20 (fixed — no escalation in casual mode)
- Actions: fold, check, call, raise (min raise = big blind, max = all-in)
- Side pots calculated correctly for all-in situations
- AI difficulty: basic strategy — considers hand strength, pot odds, position. Not exploitable but beatable.

**Multiplayer room system:**
- CREATE ROOM → generates 4-character room code
- JOIN ROOM → enter code to join table
- **Reuses existing `/api/room/*` endpoints** (same generic message-passing system as Battleship)
- The existing room system supports 2 players (p1/p2 tokens). For Poker (up to 6 players), the worker needs a **new multi-player room variant**:
  - `POST /api/mroom/create` → `{ code, token }` — creates a room with player slots (max 6)
  - `POST /api/mroom/join` → `{ code, token, seat }` — joins a room, assigns a seat
  - `POST /api/mroom/send` → `{ code, token, msg }` — broadcasts a message to all other players
  - `GET /api/mroom/poll?code=X&token=Y&after=Z` → returns messages from all other players since timestamp
  - `POST /api/mroom/close` → closes the room
  - Room data structure: `{ tokens: { seat1: token, seat2: token, ... }, messages: [], state, created }`
  - Messages encode poker actions as JSON: `{ type: 'action', action: 'raise', amount: 100, seat: 2 }`
  - All game logic (dealing, hand evaluation, pot calculation) runs client-side; the room is just a message relay
- Turn timer: 30 seconds per action (enforced client-side, auto-fold on timeout)
- Room expires after 10 minutes of inactivity (KV TTL)

**Scope note:** Poker is ~3x the code of Blackjack due to multiplayer room sync, AI personalities, 6-seat table rendering, side pot calculations, and hand evaluation. Build it last after all other games establish the card/chip UI patterns. Consider splitting implementation into phases: (1) solo AI-only, (2) add multiplayer room support.

**AI opponents:**
- 3 personality types, randomly assigned:
  - **Tight** — plays few hands, bets conservatively
  - **Loose** — plays many hands, calls often
  - **Aggressive** — raises frequently, bluffs sometimes
- Names: generated neon-themed names (e.g., "PIXEL", "FLUX", "VOLT", "CIPHER", "PRISM", "GLITCH")
- Thinking delay: 1-3 seconds (randomized, feels natural)

**Screens:**
1. **Start screen** — Title, bankroll, PLAY SOLO / CREATE ROOM / JOIN ROOM buttons, leaderboard
2. **Table screen** — Oval felt table, 6 seats (occupied/empty), community cards center, pot display, action buttons bottom
3. **Showdown** — Cards revealed with flip animation, winning hand highlighted, pot slides to winner
4. **Between hands** — Brief pause, chip counts update, new hand auto-deals

**Visual details:**
- Oval table with neon border glow (gold accent)
- Player avatars: simple neon-outlined circles with 3-char names
- Hole cards: slight peek animation (cards tilt up from corner)
- Community cards: deal one at a time with slide animation
- Pot: glowing chip pile in center, grows with bets
- Active player: seat border pulses cyan
- Folded players: dimmed out
- Empty seats: dashed border, "JOIN" label

**Sound effects:**
- Card deal (swoosh per card)
- Check (double tap)
- Chip bet (clink, scaled by amount)
- Fold (soft whoosh)
- All-in (dramatic tone)
- Win pot (chips cascading)

**Share format:**
```
🃏 NEON POKER
💰 Won 1,200 chips in 8 hands
👥 4-player table | 🏆 Biggest pot: 800
🎯 Best hand: Full House
neonarcade.net/neoncasino/poker.html
```

---

### 3. Roulette

**Solo — bet on the neon wheel.**

**Gameplay:**
- European roulette (single zero — 37 pockets, 0-36)
- Bet types: straight (35:1), split (17:1), street (11:1), corner (8:1), line (5:1), dozen (2:1), column (2:1), red/black (1:1), odd/even (1:1), high/low (1:1)
- Multiple bets per spin allowed
- Minimum bet per position: 10 chips
- Maximum total bet per spin: bankroll or 10,000

**Screens:**
1. **Start screen** — Title, bankroll, START button, leaderboard
2. **Betting screen** — Roulette table layout (numbers grid + outside bets), chip selector, placed bets visualization, SPIN button
3. **Spin screen** — Animated wheel spinning, ball bouncing, lands on number
4. **Result screen** — Winning number highlighted, winning bets glow, payout animation, bankroll update, BET AGAIN button

**Visual details:**
- Wheel: circular with alternating red (#ff2d7b) and black (#1a1a2e) pockets, green zero, neon number labels
- Ball: glowing white/cyan orb with trail
- Spin animation: wheel rotates, ball decelerates with realistic physics (ease-out curve)
- Table layout: neon grid lines, numbers in standard roulette arrangement
- Winning number: pulse glow + particle burst
- Chip placement: click/tap to place, chips stack visually

**Sound effects:**
- Chip placement (clink)
- Spin start (whoosh building)
- Ball bouncing (tick tick tick, decelerating)
- Ball lands (satisfying thunk)
- Win (chime + ascending)
- Loss (subtle descending)
- Big win (fanfare + particles)

**Share format:**
```
🎰 NEON ROULETTE
💰 Bankroll: 3,200 | 🎯 Hit: 17 Black
📊 5 spins | ✅ 3 wins | 💥 Straight hit!
neonarcade.net/neoncasino/roulette.html
```

---

### 4. Slots

**Solo — neon slot machine.**

**Gameplay:**
- 5 reels, 3 rows, 20 paylines
- Symbols (neon-themed): 💎 Diamond (wild), ⚡ Lightning (scatter), 🎰 Seven, 🔔 Bell, 🍒 Cherry, 🃏 Card, ⭐ Star
- Wild substitutes for all except scatter
- 3+ scatters trigger FREE SPINS bonus (5/10/15 free spins for 3/4/5 scatters)
- Paytable displayed on info screen
- Bet per spin: 10/20/50/100 chips (adjustable)
- Auto-spin option (10/25/50 spins)

**Screens:**
1. **Start screen** — Title, bankroll, machine preview, PLAY button, leaderboard
2. **Machine screen** — 5x3 reel grid, spin button, bet selector, bankroll display, paytable button
3. **Spin animation** — Reels cascade/spin with blur, stop left to right with bounce
4. **Win screen** — Winning paylines highlighted with glow trace, win amount animates up, particles on big wins
5. **Bonus screen** — Free spins mode with distinct visual treatment (purple tint, enhanced particles)

**Visual details:**
- Machine frame: neon border with chrome/metallic accents
- Reels: dark background, symbols are neon-outlined vector icons (not emoji — drawn with canvas or CSS). Share text uses emoji as stand-ins for the in-game neon symbols.
- Reel spin: motion blur effect, staggered stop (left to right, 0.3s apart)
- Win lines: glowing colored lines traced across winning combinations
- Big win (>50x bet): full-screen celebration, "BIG WIN" text with mega glow, chip fountain particles
- Jackpot display: running counter at top of machine

**Sound effects:**
- Spin start (mechanical whoosh)
- Reel stop (thunk, one per reel, increasing pitch)
- Small win (short chime)
- Medium win (extended chime + coins)
- Big win (fanfare + cascading coins)
- Scatter hit (electric zap)
- Free spin trigger (dramatic buildup + celebration)

**Share format:**
```
🎰 NEON SLOTS
💰 Bankroll: 5,800 | 🎯 Best spin: 500x
🔥 12 spins | 💎 2 wilds | ⚡ Free spins hit!
neonarcade.net/neoncasino/slots.html
```

---

### 5. Video Poker

**Solo — Jacks or Better draw poker.**

**Gameplay:**
- Standard 52-card deck, reshuffled each hand
- Deal 5 cards, hold 0-5 cards, draw replacements
- Payout table (Jacks or Better, per 1-unit bet):
  - Royal Flush: 250x (800x on max bet)
  - Straight Flush: 50x
  - Four of a Kind: 25x
  - Full House: 9x
  - Flush: 6x
  - Straight: 4x
  - Three of a Kind: 3x
  - Two Pair: 2x
  - Jacks or Better: 1x
- Bet: 1-5 units (unit = 10 chips, so 10-50 chips per hand)
- "Double or Nothing" option after any win: guess red/black on next card

**Screens:**
1. **Start screen** — Title, bankroll, paytable preview, PLAY button, leaderboard
2. **Deal screen** — 5 cards face up, HOLD buttons under each card, paytable visible above, DRAW button
3. **Result screen** — Winning hand name highlighted on paytable, cards in winning combination glow, payout animation
4. **Double or Nothing** — Single card face down, RED/BLACK buttons, reveal with flip animation

**Visual details:**
- Cards: large, centered, neon-outlined (same style as Blackjack)
- HOLD indicator: glowing badge below held cards
- Paytable: always visible above cards, current bet column highlighted, winning row flashes on win
- Double or Nothing: dramatic card flip with suspenseful pause

**Sound effects:**
- Deal (5 rapid card swooshes)
- Hold toggle (click)
- Draw (swoosh per replaced card)
- Win (chime scaled by hand rank)
- Royal Flush (epic fanfare + screen shake)
- Double or Nothing: heartbeat buildup, reveal sting (win/lose)

**Share format:**
```
🃏 NEON VIDEO POKER
💰 Bankroll: 2,100 | 🏆 Best: Full House
🎯 20 hands | ✅ 8 wins | 💥 4 of a Kind!
neonarcade.net/neoncasino/video-poker.html
```

---

## Build Order

1. **Shared chip system** — Bankroll load/save/hash/reset/daily-bonus utilities (can be a small module at top of each game, or a shared section)
2. **Blackjack** — Simplest card game, establishes card rendering + chip betting UI patterns
3. **Video Poker** — Reuses card rendering from Blackjack, adds hold/draw mechanics
4. **Roulette** — Different visual (wheel + table), establishes betting grid patterns
5. **Slots** — Most complex visuals (reel animation, paylines), standalone
6. **Poker** — Most complex overall (multiplayer, AI, room system). Built last to leverage all UI patterns from earlier games.
7. **Hub page + integration** — Category hub, main hub updates, worker registration, sitemap, etc.

---

## Integration Checklist

Per the project's "How to Add a New Game" rules, each game needs:

- [ ] Game HTML file in `public/neoncasino/`
- [ ] Card on category hub `public/neoncasino/index.html`
- [ ] Entry in `public/index.html` CATALOG array
- [ ] Game count updates in main hub
- [ ] Slug registered in `src/worker.js` KNOWN_GAMES
- [ ] Screenshot at 1280x800 in `public/neoncasino/screenshots/`
- [ ] SEO tags (og:locale, twitter:url, canonical, structured data)
- [ ] Entry in `public/updates.html`
- [ ] Entry in `public/sitemap.xml`
- [ ] Entry in `public/llms.txt`
- [ ] All standard NEON effects (scanlines, glow, shake, particles)
- [ ] HiDPI canvas rendering (devicePixelRatio)
- [ ] Mobile touch support
- [ ] ESC key returns to start screen
- [ ] Sound effects (Web Audio API)
- [ ] Update CLAUDE.md: add `badge-casino` to available badges list
- [ ] Update CLAUDE.md: add `neoncasino` to category list and file structure
