# NEON ARCADE — Polish & Virality Engine Design

**Date:** 2026-04-13
**Status:** Approved
**Scope:** Two-phase project — quick polish pass, then virality engine built into neon.js + worker.js

---

## Phase 1: Polish

One targeted fix. Audit confirmed HiDPI (devicePixelRatio) and ESC key handling are already present in all 72 games.

### 1.1 Missing Screenshots (4 games)

Generate screenshots for: `chimp`, `connections`, `tango`, `clickspeed`.

**Method:** Open game in browser at 1280x800 viewport, navigate to a visually interesting state (mid-game or start screen with populated leaderboard), capture PNG.

**Output paths:**
- `public/neonarcade/screenshots/chimp.png`
- `public/neonmind/screenshots/connections.png`
- `public/neonmind/screenshots/tango.png`
- `public/neongrind/screenshots/clickspeed.png`

---

## Phase 2: Virality Engine

Four layers, all built into neon.js and worker.js so every game benefits automatically with minimal per-game changes.

### 2.1 Challenge Links (Acquisition Layer)

The highest-impact viral feature. Every share becomes a playable invitation.

#### Flow

```
Player finishes game
    → clicks CHALLENGE A FRIEND
    → neon.js POSTs to /api/challenge
    → worker stores { game, score, name, shareText } in KV, returns 6-char code
    → URL copied: neonarcade.net/c/Xk9mQ2
    → friend opens URL
    → challenge page shows: "JON scored 2,450 — can you beat it?"
    → OG meta tags render a rich preview (game name, score, neon branding)
    → friend clicks PLAY → redirected to game with ?challenge=Xk9mQ2 param
    → after playing, neon.js compares scores and shows result
```

#### Worker Endpoints

**POST /api/challenge** — Create a challenge
```
Request:  { game: "neon-snake", score: 2450, name: "JON", text: "emoji share text" }
Response: { code: "Xk9mQ2" }
```
- Generates 6-char alphanumeric code (uppercase + digits)
- Collision check: retry up to 5 times if code exists in KV (same pattern as room codes)
- Stores in KV key `challenge:{code}` with 30-day TTL
- Validates game slug against KNOWN_GAMES
- Validates name (sanitizeName) and score (> 0, <= maxScore)
- Rate limited (existing rate limiter covers this)

**GET /api/challenge/{code}** — Retrieve a challenge
```
Response: { game: "neon-snake", score: 2450, name: "JON", text: "...", ts: 1713020000000 }
```
- Returns 404 if expired/not found
- Public endpoint (no auth needed — challenges are meant to be opened)

**POST /api/challenge/{code}/respond** — Record challenger's result
```
Request:  { score: 2680, name: "KAT" }
Response: { result: "win", diff: 230, challenge: { ... }, response: { ... } }
```
- Compares using game's mode (high/low) from KNOWN_GAMES
- Stores response alongside original for the result page
- One response per challenge (first response wins)

#### Challenge Landing Page: `public/c/index.html`

A single HTML page that reads the challenge code from the URL path, fetches challenge data via API, and renders:

- Challenger name + score (big, neon-styled)
- Game name + icon
- "CAN YOU BEAT THIS?" call to action
- PLAY NOW button → links to game page with `?challenge={code}` param
- Full neon styling (same brand look)

**OG Meta Tags:** Since this is a static page but needs dynamic content, the worker will intercept `/c/{code}` requests and inject OG meta tags server-side before serving the HTML. This ensures rich link previews on social media.

Worker route for challenge pages:
```
GET /c/{code} → Read challenge from KV, inject OG tags into HTML template, serve
```

OG tags injected:
```html
<meta property="og:title" content="JON scored 2,450 in Neon Snake — Can you beat it?">
<meta property="og:description" content="Challenge accepted? Play now on NEON ARCADE.">
<meta property="og:image" content="https://neonarcade.net/neonarcade/screenshots/neon-snake.png">
<meta property="og:url" content="https://neonarcade.net/c/Xk9mQ2">
```

#### neon.js Integration

```javascript
// New methods added to Neon:

Neon.challenge(shareText)
// 1. Creates challenge via API
// 2. Builds URL: neonarcade.net/c/{code}
// 3. Copies URL to clipboard (or uses navigator.share on mobile)
// 4. Shows "CHALLENGE LINK COPIED!" confirmation overlay
// Returns promise: { code, url }

Neon.getChallenge()
// Checks URL for ?challenge= param
// If present, fetches challenge data from API
// Returns promise: { game, score, name, text } or null

Neon.respondChallenge(myScore)
// After game ends, if a challenge was active, submits response
// Returns promise: { result: 'win'|'lose', diff, challenge, response }
```

**Challenge button injection (automatic):**
- neon.js already auto-injects a floating feedback bar (bottom-left)
- Similarly, after `Neon.save()` is called, neon.js injects a floating "CHALLENGE" bar (bottom-right)
- Styled as a pulsing neon button: "CHALLENGE A FRIEND"
- Clicking it calls `Neon.challenge()` with the last saved score + auto-generated share text
- The bar auto-dismisses after 30 seconds or on new `Neon.init()` call
- No per-game code needed — any game calling `Neon.save()` gets the button

**Challenge-aware game flow (automatic):**
- On `Neon.init()`, check for `?challenge=` URL param
- If present, fetch challenge data and store it
- After `Neon.save()`, if challenge is active, call `Neon.respondChallenge()`
- Show comparison result: "YOU WIN! +230 points" or "SO CLOSE! -45 points"

### 2.2 Daily Mode & Streaks (Retention Layer)

#### Daily Seed System

```javascript
Neon.getDailySeed()
// Returns a deterministic integer based on UTC date
// Formula: simple hash of "YYYY-MM-DD" string
// Same seed for all players on the same day
// Games use this to seed their RNG for deterministic puzzle/level generation
```

Implementation:
```javascript
function getDailySeed() {
  var d = new Date();
  var str = d.getUTCFullYear() + '-' +
    String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(d.getUTCDate()).padStart(2, '0');
  // Simple FNV-1a hash
  var hash = 2166136261;
  for (var i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
```

Games opt-in to daily mode by passing `daily: true` in `Neon.init()`. When enabled:
- Start screen shows "DAILY CHALLENGE" badge + today's date
- Score key gets date suffix: `{baseKey}_daily_2026-04-13`
- Only one score counts per day (first completion)
- Share text includes "Day #NNN" (days since launch)

#### Streak Tracking

Stored in localStorage per game: `neonarcade_{game}_streak`
```json
{
  "current": 7,
  "best": 14,
  "lastPlayed": "2026-04-13"
}
```

**Logic:**
- On daily game completion, check lastPlayed
- If yesterday: increment current streak
- If today: no change (already played)
- If older: reset current to 1
- Update best if current > best

**neon.js API:**
```javascript
Neon.getStreak()          // → { current: 7, best: 14, lastPlayed: "..." }
Neon.renderStreak(el)     // → renders "🔥7" badge with best streak tooltip
Neon.updateStreak()       // Called internally after daily save
```

**UI additions (automatic for daily games):**
- Start screen: streak badge (fire emoji + count)
- Game-over screen: streak update animation (if extended)
- Share text: includes streak count
- "Come back tomorrow" countdown timer on game-over (hours:minutes until next daily)

#### Rollout Plan

**Wave 1 — Natural dailies (puzzles):** All 15 NEON MIND games. These already generate puzzles — just need to seed from `getDailySeed()`.

**Wave 2 — Skill dailies:** All 8 NEON GRIND games. Daily word set for TypeBlitz, daily sequence for Sequencer, etc.

**Wave 3 — Action dailies:** Select NEON ARCADE games where a daily challenge makes sense (Territory, Signal, Gridlock already have daily-friendly mechanics).

Games that don't suit daily mode (casino, free-play arcade) simply don't pass `daily: true` and are unaffected.

### 2.3 Social Proof (Conversion Layer)

#### Percentile Ranking

After saving a score, neon.js calculates approximate percentile from the global leaderboard.

**Approach:** The global leaderboard stores top 20. For percentile, we need broader distribution data. Two options:

**Option chosen: Bucket-based distribution tracking in worker.**

Worker maintains score distribution buckets per game:
- KV key: `dist:{game}` → `{ totalScores: N, buckets: { "0-100": 45, "100-500": 120, ... } }`
- Bucket boundaries are game-specific (derived from maxScore in KNOWN_GAMES)
- 10 buckets per game, evenly dividing the score range

**Critical: Track ALL scores, not just leaderboard-qualifying ones.** The leaderboard only stores top 20, but percentile needs the full distribution. neon.js will call a dedicated endpoint after every game completion:

**New worker endpoints:**
```
POST /api/score/{game}
Request:  { score: 2450 }
Response: { percentile: 93, rank: "Top 7%", totalScores: 4521 }
```
- Always updates distribution buckets (even if score doesn't qualify for leaderboard)
- Returns percentile immediately so neon.js doesn't need a second request
- Validates score range against KNOWN_GAMES maxScore
- Rate limited

```
GET /api/leaderboard/{game}/percentile/{score}
Response: { percentile: 93, rank: "Top 7%", totalScores: 4521 }
```
- Read-only lookup for challenge pages or external use

**neon.js integration:**
- `Neon.save()` calls `POST /api/score/{game}` for every score (in addition to leaderboard submit if qualifying)
- Percentile is returned and stored in `lastPercentile`
- Game-over screen shows: "TOP 7% GLOBALLY" in neon gold (auto-injected near challenge bar)
- Share text includes percentile

#### Play Counter

**Currently tracked:** Worker already increments `plays:{game}` on every `Neon.init()` call.

**New display:** neon.js fetches play count on init and makes it available:
```javascript
Neon.getPlaysToday()    // → number (from API)
Neon.getPlaysTotal()    // → number (from API)
```

**Worker enhancement:** Track daily plays in addition to total:
- KV key: `plays_daily:{game}:{YYYY-MM-DD}` with 48h TTL
- Return both in existing `GET /api/stats/{game}` response

**Start screen display:** "2,847 plays today" shown below the START button. Creates social proof that this game is active.

#### Visible Leaderboard Enhancement

Current: Global leaderboard shows only for players who check top 5.

**Change:** `Neon.render()` will always show global top 10 (already does this). Enhancement:
- Highlight where the current player's score would rank ("You'd be #8")
- If player is not on the board: show the threshold ("Score 1,240+ to join")
- Pulsing glow on the player's row if they're on the board

#### Public Leaderboard Page

`public/leaderboards/index.html` — A standalone page showing:
- Dropdown to select any game
- Global top 20 for selected game
- Today's play count
- Links to play each game

SEO-friendly, crawlable, linkable. Each game can be deep-linked: `/leaderboards/?game=neon-snake`.

### 2.4 Share Upgrades

#### Standardized Emoji Share Format

Every game gets a consistent share format. neon.js provides a `Neon.formatShare()` helper, but games can override with custom emoji art.

**Default format:**
```
🐍 NEON SNAKE
Score: 2,450 | Top 3% | 🔥7
████████░░░░ 67%
Can you beat me? → neonarcade.net/c/Xk9mQ2
```

**Components:**
- Line 1: Game emoji + name (games register emoji in `Neon.init({ emoji: '🐍' })`)
- Line 2: Score (formatted) | Percentile | Streak (if daily)
- Line 3: Visual progress bar (block chars, based on percentile)
- Line 4: Challenge URL

**neon.js API:**
```javascript
Neon.formatShare({
  score: 2450,
  emoji: '🐍',
  title: 'NEON SNAKE',
  percentile: 93,
  streak: 7,
  challengeCode: 'Xk9mQ2',
  extra: 'Level 12'   // optional game-specific line
})
// Returns formatted string
```

Games can still build their own share text (Wordle-style grids, etc.) and pass it to `Neon.share()`.

#### Enhanced Share Function

```javascript
Neon.share(options)
// options: { text, title, url, imageCanvas }
//
// On mobile (navigator.share available):
//   1. If imageCanvas provided, convert to blob and share as file
//   2. Otherwise share text + url via native share sheet
//
// On desktop:
//   1. Copy text + url to clipboard
//   2. Show "COPIED!" confirmation overlay (auto-dismiss 2s)
//
// Always includes challenge URL if a challenge was created
```

#### Score Card Image Generation

Client-side canvas rendering of a shareable score card.

```javascript
Neon.generateScoreCard({
  game: 'NEON SNAKE',
  emoji: '🐍',
  score: '2,450',
  rank: 'Top 3%',
  streak: 7,
  name: 'JON'
})
// Returns: Promise<canvas> — 1200x630 canvas (OG image ratio)
```

**Card design:**
- Dark background (#0a0a12) with subtle radial gradient
- Game name in Orbitron 900 with cyan glow
- Score big and centered with neon glow
- Rank badge in gold
- Streak fire emoji
- "NEON ARCADE" branding bottom-right
- Scanline overlay for brand consistency
- 1200x630px (standard social card ratio)

**Usage:** Games can add a "SAVE CARD" button on game-over that downloads the PNG. On mobile with navigator.share({ files }), it's shared directly.

**Note:** Font loading for canvas is tricky. The card renderer will use the document's already-loaded Orbitron/Rajdhani fonts. If fonts aren't loaded yet, it falls back to monospace/sans-serif.

---

## Changes Summary

### neon.js Changes

**New init options:**
```javascript
Neon.init({
  game: 'slug',           // existing
  mode: 'high',           // existing
  key: 'storage_key',     // existing
  formatScore: fn,        // existing
  daily: false,           // NEW — enable daily mode
  emoji: '🐍',           // NEW — game emoji for share text
  title: 'NEON SNAKE',   // NEW — display name for share text
})
```

**New public methods:**
| Method | Returns | Description |
|--------|---------|-------------|
| `Neon.challenge(shareText)` | `Promise<{code, url}>` | Create challenge link, copy to clipboard |
| `Neon.getChallenge()` | `Promise<object\|null>` | Check if current page has a challenge param |
| `Neon.respondChallenge(score)` | `Promise<{result, diff}>` | Submit response to active challenge |
| `Neon.getDailySeed()` | `number` | Deterministic seed for today (UTC) |
| `Neon.getStreak()` | `{current, best, lastPlayed}` | Get streak data for current game |
| `Neon.renderStreak(el)` | `void` | Render streak badge into element |
| `Neon.share(options)` | `Promise<void>` | Enhanced share (mobile native + clipboard) |
| `Neon.formatShare(options)` | `string` | Generate standardized emoji share text |
| `Neon.generateScoreCard(opts)` | `Promise<canvas>` | Render 1200x630 score card image |
| `Neon.getPlaysToday()` | `number` | Today's play count (from init fetch) |

**Modified methods:**
- `Neon.save()` — After saving, auto-fetches percentile, updates streak (if daily), checks for active challenge
- `Neon.render()` — Shows "you'd be #N" indicator, threshold to join
- `Neon.init()` — Fetches play stats, checks for challenge param, loads streak data

**Auto-injected UI (no per-game code needed):**
- Challenge button on game-over (appears after `Neon.save()` is called)
- Streak badge on start screens (for daily-enabled games)
- "Come back tomorrow" countdown (for daily-enabled games, after completion)
- Percentile display (after save, shown near leaderboard)
- Play counter on start screens ("2,847 plays today")

### worker.js Changes

**New endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/challenge` | Create challenge (store in KV, 30-day TTL) |
| GET | `/api/challenge/{code}` | Retrieve challenge data |
| POST | `/api/challenge/{code}/respond` | Submit challenge response |
| POST | `/api/score/{game}` | Record score in distribution, return percentile |
| GET | `/api/leaderboard/{game}/percentile/{score}` | Read-only percentile lookup |

**Modified endpoints:**
| Method | Path | Change |
|--------|------|--------|
| POST | `/api/leaderboard/{game}` | Also updates score distribution buckets |
| GET | `/api/stats/{game}` | Also returns `playsToday` |

**New KV keys:**
| Pattern | TTL | Description |
|---------|-----|-------------|
| `challenge:{code}` | 30 days | Challenge data (game, score, name, text, response) |
| `dist:{game}` | none | Score distribution buckets (10 per game) |
| `plays_daily:{game}:{date}` | 48h | Daily play counter |

**Challenge page routing:**
- Worker intercepts `GET /c/{code}` (not under /api/)
- Reads challenge from KV
- Injects OG meta tags into challenge page HTML template
- Falls through to static `public/c/index.html` for client-side rendering

### New Files

| File | Description |
|------|-------------|
| `public/c/index.html` | Challenge landing page (client-side rendered, OG tags injected by worker) |
| `public/leaderboards/index.html` | Public leaderboard browser page |

### Per-Game Changes

**Polish (Phase 1):** 4 games get screenshots. HiDPI and ESC handling already complete across all 72 games.

**Virality (Phase 2):** Minimal per-game changes needed:
- Games wanting daily mode: add `daily: true` to `Neon.init()` and use `Neon.getDailySeed()` in their RNG
- Games wanting custom emoji share: add `emoji` and `title` to `Neon.init()`
- Everything else is automatic via neon.js

---

## Build Order

1. **Phase 1: Polish** — 4 missing screenshots
2. **Phase 2a: Challenge links** — worker endpoints + neon.js challenge methods + challenge page + worker OG injection
3. **Phase 2b: Share upgrades** — formatShare, enhanced share(), score card generation
4. **Phase 2c: Daily & streaks** — daily seed, streak tracking, auto-injected UI, enable on Wave 1 games
5. **Phase 2d: Social proof** — percentile tracking, play counters, leaderboard enhancements, public leaderboard page

Each phase is independently deployable and valuable.

---

## Out of Scope

- Analytics/tracking (important but separate project — needs privacy policy, cookie consent, etc.)
- Referral system (potential future layer — invite codes, bonus unlocks)
- Push notifications / email (would require user accounts)
- Social login (keeps the zero-friction philosophy)
- Pre-filled social media URLs (twitter.com/intent/tweet) — low value vs. native share + clipboard
