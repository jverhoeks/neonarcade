# NEON ARCADE — Daily Hub & Retention System Design

**Date:** 2026-04-14
**Status:** Approved
**Scope:** Daily puzzle hub page, cross-game badge system, player profile page, and supporting neon.js + worker.js changes

---

## Goal

Turn NEON ARCADE from "72 separate games" into "one platform I visit every day." The research shows that multi-game daily engagement is the #1 retention predictor (NYT data), and streaks increase long-term engagement 3.6x (Duolingo data). This spec builds three things:

1. A **Daily Hub** (`/daily`) that bundles all daily puzzles into one ritual
2. A **Badge System** that rewards cross-game engagement
3. A **Player Profile** (`/profile`) that gives players a persistent identity

All client-side (localStorage), zero accounts required. One server-side addition: a daily completion counter for social proof.

---

## 1. Daily Hub Page (`/daily/index.html`)

### Purpose

A single landing page that players bookmark and visit every day. Shows today's 5 daily puzzles, tracks completion, displays combined streak, and produces a shareable daily recap.

### Layout

```
┌─────────────────────────────────────────────┐
│  🌅 DAILY CHALLENGE — April 14, 2026        │
│  🔥 14 day streak    ⭐ 3/5 complete        │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌───┐│
│  │ ✅  │  │ ✅  │  │ ✅  │  │ 🔒  │  │🔒 ││
│  │SUDOK│  │QUEEN│  │MINES│  │MINI │  │NON ││
│  │02:34│  │01:12│  │00:48│  │PLAY │  │PLAY││
│  └─────┘  └─────┘  └─────┘  └─────┘  └───┘│
│                                             │
│  ████████████░░░░░░░░  3/5                  │
│                                             │
│  47 players completed all 5 today           │
│                                             │
│  [SHARE DAILY RESULTS]                      │
│                                             │
│  Come back tomorrow in 14h 23m              │
├─────────────────────────────────────────────┤
│  🏅 BADGES: 🌅 🔥 ⭐ 🧭        [Profile →] │
└─────────────────────────────────────────────┘
```

### Puzzle Cards

5 cards, one per daily game. Each card shows:
- Game emoji + name
- **Not started:** 🔒 icon, "PLAY" button linking to game. Card has dim appearance, subtle pulse animation.
- **Completed:** ✅ icon, score/time displayed, green glow border. Card links to game (for replay/leaderboard viewing).
- Cards use the neon aesthetic: dark surface (#12121f), glow borders, Orbitron titles.

### Completion Detection

Each daily game writes scores to a date-suffixed localStorage key (e.g., `neonarcade_scores_sudoku_daily_2026-04-14`). The daily hub checks for each:

```javascript
var today = new Date().toISOString().slice(0, 10);
var games = [
  { slug: 'sudoku',      key: 'neonarcade_scores_sudoku_',         emoji: '🔢', name: 'Sudoku' },
  { slug: 'minisudoku',  key: 'neonarcade_neonmind_minisudoku_scores_', emoji: '🔢', name: 'Mini Sudoku' },
  { slug: 'queens',      key: 'neonarcade_neonmind_queens_scores_',     emoji: '👑', name: 'Queens' },
  { slug: 'minesweeper', key: 'neonarcade_neonmind_minesweeper_scores_', emoji: '💣', name: 'Minesweeper' },
  { slug: 'nonogram',    key: 'neonarcade_neonmind_nonogram_scores_',   emoji: '🎨', name: 'Nonogram' },
];
// Each game appends difficulty + '_daily_' + date to its key
// Hub checks: does any localStorage key matching {baseKey}*_daily_{today} exist and have entries?
```

**Key matching challenge:** Each game appends a difficulty suffix before `_daily_`. For example, Sudoku uses `neonarcade_scores_sudoku_easy_daily_2026-04-14`. The hub needs to scan localStorage for any key that contains the game's base key AND ends with `_daily_{today}`.

**Solution:** Iterate all localStorage keys, check if they match the pattern `{baseKey}*_daily_{today}` and contain at least one score entry. This handles all difficulty variants.

For completed games, the hub reads the score from the localStorage entry to display the time/score on the card.

### Combined Streak

New localStorage key: `neonarcade_daily_hub_streak`

```json
{
  "current": 14,
  "best": 21,
  "lastPlayed": "2026-04-14",
  "perfectCurrent": 7,
  "perfectBest": 12,
  "lastPerfect": "2026-04-14"
}
```

**Streak logic (same as per-game streaks):**
- `current` increments when the player completes **any** daily puzzle today (and lastPlayed was yesterday)
- `perfectCurrent` increments when the player completes **all 5** today (and lastPerfect was yesterday)
- If a day is missed, current resets to 0 (or 1 if they play today)
- `best` and `perfectBest` track all-time highs

**Streak update:** The hub page runs the streak check on load and after each game completion (polling localStorage every 5 seconds while the page is open, or on `visibilitychange` event when user returns from a game tab).

### Social Proof Counter

**Worker endpoint:**

```
POST /api/daily/complete
Request: { name: "JON", date: "2026-04-14" }
Response: { count: 47 }
```
- Increments `daily_complete:{date}` in KV
- Deduplicates by name+date: stores `daily_complete_names:{date}` as a set (JSON array of names, capped at 500)
- Returns current count for today
- KV TTL: 48 hours (auto-cleanup)

```
GET /api/daily/stats
Response: { completions: 47, date: "2026-04-14" }
```
- Returns today's completion count
- Called on hub page load to show "47 players completed all 5 today"

**When to call:** neon.js (or the hub page) calls `POST /api/daily/complete` when the 5th puzzle is detected as complete. Called once per day per player (tracked in localStorage: `neonarcade_daily_reported_{date}`).

### Share Format

**All 5 complete:**
```
🌅 NEON ARCADE — Daily #NNN
⭐ 5/5 COMPLETE | 🔥14 day streak

🟩 Sudoku      02:34
🟩 Queens      01:12
🟩 Minesweeper 00:48
🟩 Mini Sudoku 00:31
🟩 Nonogram    03:15

Total: 08:20 | neonarcade.net/daily
```

**Partial completion:**
```
🌅 NEON ARCADE — Daily #NNN
3/5 | 🔥14 day streak

🟩 Sudoku      02:34
🟩 Queens      01:12
🟩 Minesweeper 00:48
⬜ Mini Sudoku
⬜ Nonogram

neonarcade.net/daily
```

**Day number:** Days since launch (e.g., March 5, 2026 = day 1, April 14 = day 41).

**Share mechanism:** Reuse `Neon.share()` from the virality engine — `navigator.share()` on mobile, clipboard on desktop, with confirmation toast.

### Countdown Timer

When all 5 are complete, show "Come back tomorrow in Xh Ym" countdown to midnight UTC. Updates every minute. Creates anticipation and establishes the daily cadence.

### Navigation

- Link from main hub (`/index.html`) — prominent "DAILY CHALLENGE" button/card
- Link from each category hub page
- Link from each daily game's start screen (neon.js can inject a "← Back to Daily Hub" link when `daily: true`)
- The daily hub links to `/profile` for full stats

---

## 2. Badge / Achievement System

### Storage

localStorage key: `neonarcade_badges`

```json
{
  "first_daily": { "earned": "2026-04-14", "seen": true },
  "streak7": { "earned": "2026-04-20", "seen": true },
  "perfect_day": { "earned": "2026-04-14", "seen": false }
}
```

`seen: false` means the player hasn't seen the unlock toast yet. On next page load where badges are checked, show the toast and set `seen: true`.

### Badge Definitions

| ID | Name | Trigger | Emoji | Check Location |
|----|------|---------|-------|---------------|
| `first_daily` | First Daily | Complete any daily puzzle | 🌅 | `Neon.save()` when `cfg.daily === true` |
| `streak7` | Daily Regular | 7-day combined streak | 🔥 | Daily hub streak update |
| `streak30` | Daily Devotee | 30-day combined streak | ⚡ | Daily hub streak update |
| `streak100` | Daily Legend | 100-day combined streak | 👑 | Daily hub streak update |
| `perfect_day` | Perfect Day | Complete all 5 dailies in one day | ⭐ | Daily hub completion check |
| `perfect_week` | Perfect Week | 7 consecutive perfect days | 💎 | Daily hub streak update |
| `explorer` | Explorer | Play 10 different games | 🧭 | `Neon.init()` profile update |
| `collector` | Collector | Play 25 different games | 🗺️ | `Neon.init()` profile update |
| `completionist` | Completionist | Play all 72 games | 🏆 | `Neon.init()` profile update |
| `speed_demon` | Speed Demon | Top 10% globally on any game | ⚡ | `Neon.save()` percentile check |
| `world_class` | World Class | Top 1% globally on any game | 🌍 | `Neon.save()` percentile check |
| `challenger` | Challenger | Send first challenge link | ⚔️ | `Neon.challenge()` |
| `rival` | Rival | Win 5 challenges | 🥊 | `Neon.respondChallenge()` result |

### Badge Check Logic

Built into neon.js as `Neon.checkBadges()`. Called internally after `save()` and `init()`. Reads from localStorage, evaluates conditions, writes new badges if earned.

```javascript
function checkBadges() {
  var badges = _loadBadges();
  var profile = _loadProfile();
  var streak = _loadHubStreak();
  
  // Games played badges
  if (!badges.explorer && profile.gamesPlayed.length >= 10) _awardBadge('explorer');
  if (!badges.collector && profile.gamesPlayed.length >= 25) _awardBadge('collector');
  if (!badges.completionist && profile.gamesPlayed.length >= 72) _awardBadge('completionist');
  
  // Streak badges
  if (!badges.streak7 && streak.current >= 7) _awardBadge('streak7');
  if (!badges.streak30 && streak.current >= 30) _awardBadge('streak30');
  if (!badges.streak100 && streak.current >= 100) _awardBadge('streak100');
  
  // Perfect day/week (checked on daily hub)
  // Speed demon / world class (checked after percentile fetch in save())
  // Challenger / rival (checked in challenge/respond functions)
  
  // Show toasts for unseen badges
  _showUnseenBadgeToasts(badges);
}
```

### Badge Unlock Toast

A small notification at the top of the screen:

```
🏅 BADGE UNLOCKED: 🔥 Daily Regular
    7-day streak achieved!
```

- Same slide-in animation as challenge confirm toast
- Auto-dismiss after 3 seconds
- Gold border (#ffd700) instead of green
- Multiple badges queue (show one at a time, 3s apart)

---

## 3. Player Profile Page (`/profile/index.html`)

### Purpose

A local-only stats page. Everything reads from localStorage. No server calls except play counts.

### Layout

```
┌─────────────────────────────────────────┐
│           JON                           │
│    NEON ARCADE PLAYER                   │
│    Playing since April 2026             │
├─────────────────────────────────────────┤
│  STREAKS                                │
│  🔥 14 current  |  🏆 21 best          │
│  ⭐ 7 perfect   |  ⭐ 12 best perfect  │
├─────────────────────────────────────────┤
│  BADGES (5/13)                          │
│  🌅 🔥 ⭐ 🧭 ⚔️  [dimmed unearned]     │
├─────────────────────────────────────────┤
│  STATS                                  │
│  Games Played: 24/72                    │
│  Challenges Won: 3                      │
│  Top 10% in: Sudoku, Queens             │
├─────────────────────────────────────────┤
│  BEST SCORES                            │
│  Sudoku (Easy)     01:42                │
│  Queens (7x7)      00:58                │
│  Neon Snake         4,230               │
│  ...                                    │
├─────────────────────────────────────────┤
│  [SHARE MY STATS]    [← Back to Games]  │
└─────────────────────────────────────────┘
```

### Data Sources (all localStorage)

| Data | Source Key(s) |
|------|--------------|
| Player name | `neonarcade_player_name` |
| First visit date | `neonarcade_profile` → `firstVisit` |
| Games played set | `neonarcade_profile` → `gamesPlayed` (array of slugs) |
| Combined streak | `neonarcade_daily_hub_streak` |
| Badges | `neonarcade_badges` |
| Challenge record | `neonarcade_profile` → `challengeWins`, `challengeLosses` |
| Best scores | Scan all `neonarcade_scores_*` and `neonarcade_neonmind_*` keys |
| Percentile data | `neonarcade_profile` → `topPercentiles` (map of game → percentile) |

### Profile Data Structure

`neonarcade_profile` in localStorage:

```json
{
  "firstVisit": "2026-04-14",
  "gamesPlayed": ["sudoku", "queens", "neon-snake", "tetris"],
  "challengeWins": 3,
  "challengeLosses": 1,
  "topPercentiles": {
    "sudoku": 7,
    "queens": 12
  }
}
```

Updated by neon.js:
- `firstVisit`: set on first `Neon.init()` call if not present
- `gamesPlayed`: `cfg.game` added to set on every `Neon.init()`
- `challengeWins/Losses`: incremented in `respondChallenge()` and when receiving challenge results
- `topPercentiles`: updated after `save()` when percentile is fetched — stores best percentile per game

### Best Scores Display

The profile page scans all localStorage keys matching known patterns:
- `neonarcade_scores_*`
- `neonarcade_neonmind_*_scores_*`
- `neonarcade_neongrind_*_scores_*`
- etc.

For each, read the array and display the top score. Format using the game's mode (time format for low-mode puzzle games, number for high-mode arcade games).

**Game metadata:** The profile page needs a static lookup of game slugs → display names, categories, and modes. This is the same registry used in the leaderboard page.

### Share Card

"SHARE MY STATS" generates a 1200×630 canvas card (reusing `Neon.generateScoreCard` pattern):
- Player name big in cyan
- Streak + badge count
- Games played count
- Top 3 scores
- NEON ARCADE branding

---

## 4. neon.js Changes

### New init() behavior (additions to existing)

On every `Neon.init()`:
1. Load or create `neonarcade_profile`
2. Set `firstVisit` if missing
3. Add `cfg.game` to `gamesPlayed` set (deduplicated)
4. Save profile
5. Call `checkBadges()` (explorer/collector/completionist)

### New save() behavior (additions to existing)

After existing save logic:
1. If `_lastPercentile` exists, update `topPercentiles` in profile (keep best)
2. Check percentile badges (speed_demon if ≤10%, world_class if ≤1%)
3. Check first_daily badge (if `cfg.daily`)

### New functions

| Function | Description |
|----------|-------------|
| `Neon.checkBadges()` | Evaluate all badge conditions, award new ones, show toasts |
| `Neon.getBadges()` | Returns badge object from localStorage |
| `Neon.getProfile()` | Returns profile object from localStorage |

### New internal functions

| Function | Description |
|----------|-------------|
| `_loadBadges()` | Read `neonarcade_badges` from localStorage |
| `_awardBadge(id)` | Write badge with earned date and seen:false |
| `_loadProfile()` | Read `neonarcade_profile` from localStorage |
| `_saveProfile(profile)` | Write profile to localStorage |
| `_loadHubStreak()` | Read `neonarcade_daily_hub_streak` from localStorage |
| `_showUnseenBadgeToasts()` | Queue and display badge unlock notifications |

### New CSS (in injectStyles)

- `.ns-badge-toast` — gold border badge unlock notification
- Reuses existing animation patterns (nsSlideIn, nsSlideOut)

### Updated return object

Add: `checkBadges`, `getBadges`, `getProfile`

---

## 5. worker.js Changes

### New endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/daily/complete` | Record daily completion, deduplicated by name+date |
| GET | `/api/daily/stats` | Get today's completion count |

### POST /api/daily/complete

```
Request: { name: "JON" }
Response: { count: 47, date: "2026-04-14" }
```

- Validates name via `sanitizeName()`
- Gets today's date (UTC)
- Reads `daily_complete_names:{date}` from KV (JSON array of names)
- If name already in array, return current count without incrementing
- Otherwise, add name to array (cap at 500), increment `daily_complete:{date}` counter
- Both keys have 48h TTL
- Rate limited by existing middleware

### GET /api/daily/stats

```
Response: { completions: 47, date: "2026-04-14" }
```

- Returns today's `daily_complete:{date}` count
- Public endpoint (no auth needed)

---

## 6. New Files

| File | Description |
|------|-------------|
| `public/daily/index.html` | Daily hub page — 5 puzzle cards, streak, progress, share, social proof |
| `public/profile/index.html` | Player profile — badges, stats, scores, share card |

---

## 7. Existing File Changes

| File | Changes |
|------|---------|
| `public/neon.js` | Badge system, profile tracking, updated init/save, new CSS |
| `src/worker.js` | Daily completion endpoints |
| `public/index.html` | Add "DAILY CHALLENGE" button/link to daily hub |
| `public/sitemap.xml` | Add `/daily/` and `/profile/` entries |
| `public/llms.txt` | Add daily hub and profile documentation |

---

## 8. Future Expansion (Out of Scope)

- Streak freeze (forgiveness for one missed day) — add later based on churn data
- More daily games (10 NEON MIND puzzles need seeded RNG refactor first)
- Push notifications for daily reminders (requires service worker)
- Server-side profiles (if cross-device sync is needed)
- Weekly tournaments
- PWA install prompt
