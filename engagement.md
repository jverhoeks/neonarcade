# NEON ARCADE — Engagement & Growth Strategy

## Current State (March 2026)

54 games live. Solid SEO, global leaderboards, emoji share buttons, like/report feedback. Some daily-seed games (Signal, Territory, Gridlock, Burndown, plus NEON MIND puzzles). One async multiplayer (Wordchain Duel). Streaks in ~10 games. No challenge links except Wordchain Duel.

---

## Gap Analysis: What We Have vs What Drives Virality

| Viral Mechanic | Status | Coverage |
|----------------|--------|----------|
| Zero friction (open & play) | Done | All 54 games |
| Emoji share results | Done | All 54 games |
| Global leaderboards | Done | All 54 games (via neon.js) |
| Daily seeds | Partial | ~6 games (Signal, Territory, Gridlock, Burndown, some NEON MIND) |
| Streak tracking | Partial | ~10 games |
| Challenge links (encoded seed in URL) | Almost none | Only Wordchain Duel |
| Percentile ranking ("Top X%") | Missing | 0 games |
| Game of the Day spotlight | Missing | — |
| Social/2P games | Minimal | 1 game (Wordchain Duel) |

---

## Priority Actions (ordered by impact / effort)

### P1 — Percentile in Share Text (neon.js upgrade)
**Effort:** Small — single neon.js change propagates to all 54 games
**Impact:** High — "Top 3% globally" is dramatically more shareable than a raw score

Add a percentile calculation to `Neon.save()` based on global leaderboard position. Include in the result object so games can add it to share text. Example:

```
CHIMP TEST
Level 14 | Top 2% globally
[emoji grid]
neonarcade.net/neonarcade/chimp.html
```

**Implementation:**
- Worker returns total player count alongside globalRank
- neon.js computes `percentile = Math.max(1, Math.ceil((1 - globalRank / totalPlayers) * 100))`
- Expose as `result.percentile` from `Neon.save()`
- Games append "Top X%" to share strings

---

### P2 — Challenge Links for Competitive Games
**Effort:** Medium — per-game work but follows a repeatable pattern
**Impact:** Highest organic growth loop — every score becomes a dare URL

Encode game seed + player score in a URL hash. Recipient plays the exact same level/config and compares directly. "Beat my 127 WPM" with a link is irresistible.

**Pattern:**
```javascript
// Generate challenge link
function encodeChallenge(seed, score) {
  const data = btoa(JSON.stringify({ s: seed, sc: score }));
  return window.location.origin + window.location.pathname + '#c=' + data;
}

// Decode on load
function decodeChallenge() {
  const hash = window.location.hash;
  if (!hash.startsWith('#c=')) return null;
  try { return JSON.parse(atob(hash.slice(3))); } catch(e) { return null; }
}
```

**Best candidates (high-competition games):**
1. Chimp — "Beat my level 14"
2. TypeBlitz — "Beat my 127 WPM"
3. ClickSpeed — "Beat my 14.2 CPS"
4. MathBlitz — "Beat my streak of 47"
5. ColorName — "Beat my 52 correct"
6. GridMatch — "Beat my round 31"
7. Burndown — "Beat my 23.4s speedrun"
8. All NEON MIND puzzles — same seed = direct time comparison
9. Reflex Chain — "Beat my 187ms average"
10. NumberSense — "Beat my 8% avg error"

**UX:** Add a "CHALLENGE A FRIEND" button next to the existing SHARE button on game-over screens. Copies a challenge URL instead of emoji text.

---

### P3 — Daily Mode + Streaks for All Puzzle Games
**Effort:** Medium — daily seed logic exists in some games, needs standardizing
**Impact:** High — habit formation, FOMO from streak loss, daily water-cooler conversation

**What to add:**
- Mode toggle on start screen: **DAILY** | **FREE PLAY**
- Daily seed: `Math.floor(Date.now() / 86400000)` (same for everyone in UTC)
- Streak counter stored in localStorage, visible on start screen
- Streak in share text: `Streak: 14 days`
- Visual streak badge (fire emoji at 7+, diamond at 30+)

**Games that need daily mode added:**
- All NEON MIND puzzles not yet daily (Minesweeper, Kakuro, Bridges, Nurikabe, Tango, LightUp, Tents, Skyscrapers)
- NEON GRIND tests (MathBlitz, ColorName, ClickSpeed, GridMatch, NumberSense, Reflex Chain)
- Competitive NEON ARCADE games (Chimp, TypeBlitz, Burndown)

**Games already daily:** Signal, Territory, Gridlock, Sudoku, Queens, MiniSudoku, Nonogram

---

### P4 — Game of the Day on Homepage
**Effort:** Small — JS logic on index.html only
**Impact:** Medium — reduces choice paralysis for new visitors, highlights best content

**Implementation:**
- Curated rotation array of ~15 best games (not random — pick the most "wow" ones)
- Cycle daily using date-based index
- Hero card at top of homepage: large screenshot, game name, one-line hook, PLAY NOW button
- Badge on the game's regular card: "TODAY'S PICK"

**Curated picks (games that hook in <5 seconds):**
Chimp, Tetris Betrayal, Pong Both Sides, Impostor Pixel, Catalyst, Burndown, Faultline, Territory, Signal, Pac-Man Amnesia, Doodle Drop, Pour, Bloomfield, TypeBlitz, ClickSpeed

---

### P5 — Build Social/2P Games (MIMIC or VETO)
**Effort:** Medium (2/5 build difficulty each)
**Impact:** Very high — every play requires sharing. Built-in viral loop.

**Why these specifically:**
- MIMIC ("How well do you know me?"): 10 preference questions, send link to friend, they predict your answers. Compatibility score. Every play = 1 share minimum. The social hook is universal.
- VETO (bracket debates): 16-item bracket, both players eliminate to a winner, reveal compatibility. Daily themes. Endlessly replayable.

These are the only game types where **playing IS sharing**. A single player can't complete the game without recruiting a second.

**Recommendation:** Build MIMIC first — simpler (no bracket UI), stronger social hook, works on any platform.

---

### P6 — Build a Connections Clone
**Effort:** Medium (2/5 build difficulty)
**Impact:** Very high — 10M+ daily NYT players validate this exact format

NYT Connections is the #2 most-played daily game after Wordle. The format (16 words, find 4 groups of 4) is proven. A neon-themed daily version with our leaderboard infrastructure and emoji-grid sharing would tap into an enormous existing audience searching for "connections game free" or "connections unlimited."

**Key differentiators from NYT:**
- Unlimited play (not just 1 daily)
- Global leaderboard (NYT has none)
- Challenge links (play the same puzzle as a friend)
- Neon aesthetic
- Category themes (tech, gaming, music, movies, science)

---

## Quick Wins Checklist

Small changes that improve engagement across all games with minimal per-game work:

- [ ] **Percentile in neon.js** — "Top X%" in every share
- [ ] **Game of the Day** on homepage
- [ ] **"Play again" auto-focus** — after game over, Enter/Space immediately restarts (reduce friction to retry)
- [ ] **Sound toggle remembers preference** — localStorage, so returning players don't have to mute every time
- [ ] **Return visit greeting** — "Welcome back! Your best: X" on start screen (neon.js already has the data)
- [ ] **Cross-promote** — after game over, show "Try also: [related game]" link to reduce bounce

---

## Metrics to Track

If analytics are added later, these are the engagement signals that matter:

| Metric | What it tells you |
|--------|-------------------|
| Games per session | Are people exploring or bouncing? |
| Return rate (daily) | Is the daily loop working? |
| Share button clicks | Is the share text compelling? |
| Challenge link opens | Are challenge links converting? |
| Streak length distribution | How sticky is the daily habit? |
| Leaderboard submissions | Are people competing or just playing? |
| Time to first action | Is the start screen too slow? |

---

## Content & Distribution Ideas

### Where to post games
- **Reddit**: r/WebGames, r/IndieGaming, r/puzzles, r/BrowserGames — post individual games, not the hub
- **Hacker News**: "Show HN" for the technical angle (54 games, zero dependencies, single HTML files)
- **TikTok/Reels**: Screen recordings of Chimp test fails, Tetris Betrayal rage, Pong Both Sides chaos
- **Twitter/X**: Daily puzzle results (emoji grids) create organic impressions
- **Discord**: Gaming servers, puzzle communities, speedrun communities
- **Product Hunt**: Launch the full collection as a product

### Content hooks by game
| Game | Hook | Platform |
|------|------|----------|
| Chimp | "Are you smarter than a chimpanzee?" | TikTok, Reddit |
| Tetris Betrayal | "Play Tetris badly ON PURPOSE" | TikTok, Twitter |
| Pong Both Sides | "Control BOTH paddles at once" | TikTok, Reddit |
| Faultline | "Find the shifted pixel row" | Twitter, Reddit |
| TypeBlitz | "What's your WPM?" | Twitter, LinkedIn |
| ClickSpeed | "What's your CPS?" | TikTok, YouTube |
| Territory | Daily strategy puzzle | Twitter (daily results) |
| Signal | Daily cipher | Twitter (daily results) |
| Impostor Pixel | "Spot the different color" | TikTok, Instagram |
| Burndown | "Speedrun these micro-tasks" | TikTok, Reddit |

### SEO opportunities
- Target "X game free online" long-tail keywords (e.g., "chimp test free", "connections game unlimited", "typing speed test")
- Each game page already has structured data — ensure Google indexes all 54 pages
- Add a `/games` sitemap index if not already present
- Blog posts: "How we built 54 browser games in a weekend" (dev community bait)
