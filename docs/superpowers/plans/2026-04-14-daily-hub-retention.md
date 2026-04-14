# Daily Hub & Retention System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified daily puzzle hub, cross-game badge system, and player profile page so NEON ARCADE becomes a daily habit, not a one-time visit.

**Architecture:** Daily hub reads completion status from localStorage (same keys the games already write). Badge system and profile tracking are added to neon.js's existing `init()` and `save()` flows. One new server endpoint for social proof (daily completion counter). Two new HTML pages (daily hub, profile). All client-side, zero accounts.

**Tech Stack:** Vanilla JS (ES5, no frameworks), Cloudflare Workers + KV, HTML5 Canvas for share cards.

**Spec:** `docs/superpowers/specs/2026-04-14-daily-hub-retention-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `public/neon.js` | Modify | Profile tracking, badge system, badge toast UI, updated init/save |
| `src/worker.js` | Modify | Daily completion counter endpoints |
| `public/daily/index.html` | Create | Daily puzzle hub — 5 cards, streak, progress, share, social proof |
| `public/profile/index.html` | Create | Player profile — badges, stats, scores, share card |
| `public/index.html` | Modify | Add "DAILY CHALLENGE" link to hub |
| `public/sitemap.xml` | Modify | Add `/daily/` and `/profile/` entries |
| `public/llms.txt` | Modify | Add daily hub and profile documentation |

---

## Task 1: Worker — Daily Completion Endpoints

**Files:**
- Modify: `src/worker.js`

- [ ] **Step 1: Add POST /api/daily/complete endpoint**

Add before the multiplayer room section, after the score/percentile endpoints. This records when a player completes all 5 daily puzzles. Deduplicates by name+date.

```javascript
      // ─── Daily Hub Endpoints ───────────────────────────────────────

      // POST /api/daily/complete — record daily completion (all 5 puzzles)
      if (request.method === 'POST' && segments[0] === 'daily' && segments[1] === 'complete') {
        let body;
        try { body = await request.json(); } catch { return json({ error: 'invalid JSON body' }, 400); }

        const name = sanitizeName(body.name);
        if (!name) return json({ error: 'name required' }, 400);

        const today = new Date().toISOString().slice(0, 10);
        const namesKey = `daily_complete_names:${today}`;
        const countKey = `daily_complete:${today}`;

        // Deduplicate by name
        const namesRaw = await env.GAME_DATA.get(namesKey);
        let names = [];
        try { names = namesRaw ? JSON.parse(namesRaw) : []; } catch { names = []; }
        if (!Array.isArray(names)) names = [];

        if (names.indexOf(name) >= 0) {
          // Already reported today
          const count = parseInt(await env.GAME_DATA.get(countKey) || '0', 10);
          return json({ count, date: today });
        }

        // Add name (cap at 500) and increment
        if (names.length < 500) names.push(name);
        const count = await increment(env.GAME_DATA, countKey);
        await Promise.all([
          env.GAME_DATA.put(namesKey, JSON.stringify(names), { expirationTtl: 172800 }),
          env.GAME_DATA.put(countKey, String(count), { expirationTtl: 172800 }),
        ]);

        return json({ count, date: today });
      }

      // GET /api/daily/stats — get today's completion count
      if (request.method === 'GET' && segments[0] === 'daily' && segments[1] === 'stats') {
        const today = new Date().toISOString().slice(0, 10);
        const count = parseInt(await env.GAME_DATA.get(`daily_complete:${today}`) || '0', 10);
        return json({ completions: count, date: today });
      }
```

- [ ] **Step 2: Verify syntax**

```bash
node -c src/worker.js
```

- [ ] **Step 3: Commit**

```bash
git add src/worker.js
git commit -m "Add daily completion counter endpoints to worker"
```

---

## Task 2: neon.js — Profile Tracking

**Files:**
- Modify: `public/neon.js`

Add profile data structure that tracks games played, first visit, and challenge record. Updated on every `init()` and `save()`.

- [ ] **Step 1: Add profile state and helper functions**

Add a new section after the SHARE UPGRADES section (after line ~985, before INJECT STYLES):

```javascript
  // ========== PROFILE & BADGES ==========
  var PROFILE_KEY = 'neonarcade_profile';
  var BADGES_KEY = 'neonarcade_badges';
  var HUB_STREAK_KEY = 'neonarcade_daily_hub_streak';

  function _loadProfile() {
    try {
      var raw = localStorage.getItem(PROFILE_KEY);
      var p = raw ? JSON.parse(raw) : null;
      if (p && typeof p === 'object') return p;
    } catch(e) {}
    return { firstVisit: '', gamesPlayed: [], challengeWins: 0, challengeLosses: 0, topPercentiles: {} };
  }

  function _saveProfile(profile) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch(e) {}
  }

  function getProfile() {
    return _loadProfile();
  }

  function _updateProfile() {
    var profile = _loadProfile();
    if (!profile.firstVisit) {
      profile.firstVisit = _todayStr();
    }
    if (!Array.isArray(profile.gamesPlayed)) profile.gamesPlayed = [];
    if (cfg.game && profile.gamesPlayed.indexOf(cfg.game) < 0) {
      profile.gamesPlayed.push(cfg.game);
    }
    _saveProfile(profile);
    return profile;
  }

  function _updateProfilePercentile(game, percentile) {
    var profile = _loadProfile();
    if (!profile.topPercentiles) profile.topPercentiles = {};
    var prev = profile.topPercentiles[game];
    // Lower percentile number = better rank (Top 3% = percentile 97, but we store the "top X%" number)
    if (prev === undefined || percentile < prev) {
      profile.topPercentiles[game] = percentile;
    }
    _saveProfile(profile);
  }

  function _updateProfileChallenge(won) {
    var profile = _loadProfile();
    if (won) {
      profile.challengeWins = (profile.challengeWins || 0) + 1;
    } else {
      profile.challengeLosses = (profile.challengeLosses || 0) + 1;
    }
    _saveProfile(profile);
  }
```

- [ ] **Step 2: Update init() to call _updateProfile()**

In the `init()` function (around line 51-95), add after the feedback bar injection (line 94):

```javascript
    // Update player profile
    _updateProfile();
```

- [ ] **Step 3: Update save() to update percentile in profile**

In the `save()` function, inside the percentile promise handler (around line 178-182), add after storing `_lastPercentile`:

```javascript
        _updateProfilePercentile(cfg.game, data.percentile);
```

- [ ] **Step 4: Update respondChallenge() to track wins/losses**

In `respondChallenge()`, after showing the result (inside the `.then` handler), add:

```javascript
        _updateProfileChallenge(data.result === 'win');
```

- [ ] **Step 5: Verify syntax**

```bash
node -c public/neon.js
```

- [ ] **Step 6: Commit**

```bash
git add public/neon.js
git commit -m "Add profile tracking to neon.js — games played, percentiles, challenges"
```

---

## Task 3: neon.js — Badge System

**Files:**
- Modify: `public/neon.js`

- [ ] **Step 1: Add badge definitions and check logic**

Add after the profile functions (still in the PROFILE & BADGES section):

```javascript
  var BADGE_DEFS = [
    { id: 'first_daily',    name: 'First Daily',   emoji: '\uD83C\uDF05', desc: 'Complete any daily puzzle' },
    { id: 'streak7',        name: 'Daily Regular',  emoji: '\uD83D\uDD25', desc: '7-day streak' },
    { id: 'streak30',       name: 'Daily Devotee',  emoji: '\u26A1',       desc: '30-day streak' },
    { id: 'streak100',      name: 'Daily Legend',    emoji: '\uD83D\uDC51', desc: '100-day streak' },
    { id: 'perfect_day',    name: 'Perfect Day',    emoji: '\u2B50',       desc: 'Complete all 5 dailies' },
    { id: 'perfect_week',   name: 'Perfect Week',   emoji: '\uD83D\uDC8E', desc: '7 consecutive perfect days' },
    { id: 'explorer',       name: 'Explorer',       emoji: '\uD83E\uDDED', desc: 'Play 10 different games' },
    { id: 'collector',      name: 'Collector',      emoji: '\uD83D\uDDFA\uFE0F', desc: 'Play 25 different games' },
    { id: 'completionist',  name: 'Completionist',  emoji: '\uD83C\uDFC6', desc: 'Play all 72 games' },
    { id: 'speed_demon',    name: 'Speed Demon',    emoji: '\u26A1',       desc: 'Top 10% globally' },
    { id: 'world_class',    name: 'World Class',    emoji: '\uD83C\uDF0D', desc: 'Top 1% globally' },
    { id: 'challenger',     name: 'Challenger',     emoji: '\u2694\uFE0F', desc: 'Send first challenge' },
    { id: 'rival',          name: 'Rival',          emoji: '\uD83E\uDD4A', desc: 'Win 5 challenges' },
  ];

  function _loadBadges() {
    try {
      var raw = localStorage.getItem(BADGES_KEY);
      var b = raw ? JSON.parse(raw) : null;
      if (b && typeof b === 'object') return b;
    } catch(e) {}
    return {};
  }

  function _saveBadges(badges) {
    try { localStorage.setItem(BADGES_KEY, JSON.stringify(badges)); } catch(e) {}
  }

  function getBadges() {
    return _loadBadges();
  }

  function _awardBadge(id) {
    var badges = _loadBadges();
    if (badges[id]) return false; // already earned
    badges[id] = { earned: _todayStr(), seen: false };
    _saveBadges(badges);
    return true;
  }

  function checkBadges() {
    var badges = _loadBadges();
    var profile = _loadProfile();
    var hubStreak = _loadHubStreak();

    // Games played badges
    var gp = (profile.gamesPlayed || []).length;
    if (!badges.explorer && gp >= 10) _awardBadge('explorer');
    if (!badges.collector && gp >= 25) _awardBadge('collector');
    if (!badges.completionist && gp >= 72) _awardBadge('completionist');

    // First daily badge
    if (!badges.first_daily && cfg.daily && _lastScore !== null) _awardBadge('first_daily');

    // Hub streak badges
    var sc = hubStreak.current || 0;
    if (!badges.streak7 && sc >= 7) _awardBadge('streak7');
    if (!badges.streak30 && sc >= 30) _awardBadge('streak30');
    if (!badges.streak100 && sc >= 100) _awardBadge('streak100');

    // Perfect day/week (checked externally by daily hub page)

    // Percentile badges
    if (_lastPercentile !== null && _lastPercentile !== undefined) {
      var topPct = 100 - _lastPercentile;
      if (!badges.speed_demon && topPct <= 10) _awardBadge('speed_demon');
      if (!badges.world_class && topPct <= 1) _awardBadge('world_class');
    }

    // Challenger badge (checked in challenge function)
    // Rival badge
    var cw = profile.challengeWins || 0;
    if (!badges.rival && cw >= 5) _awardBadge('rival');

    // Show toasts for unseen badges
    _showUnseenBadgeToasts();
  }

  function _loadHubStreak() {
    try {
      var raw = localStorage.getItem(HUB_STREAK_KEY);
      var s = raw ? JSON.parse(raw) : null;
      if (s && typeof s === 'object') return s;
    } catch(e) {}
    return { current: 0, best: 0, lastPlayed: '', perfectCurrent: 0, perfectBest: 0, lastPerfect: '' };
  }

  function _showUnseenBadgeToasts() {
    var badges = _loadBadges();
    var unseen = [];
    for (var id in badges) {
      if (badges[id] && !badges[id].seen) {
        var def = null;
        for (var i = 0; i < BADGE_DEFS.length; i++) {
          if (BADGE_DEFS[i].id === id) { def = BADGE_DEFS[i]; break; }
        }
        if (def) unseen.push(def);
        badges[id].seen = true;
      }
    }
    _saveBadges(badges);

    // Show toasts sequentially with delay
    unseen.forEach(function(def, idx) {
      setTimeout(function() {
        var el = document.createElement('div');
        el.className = 'ns-badge-toast';
        var inner = document.createElement('div');
        inner.className = 'ns-bt-inner';
        inner.textContent = '\uD83C\uDFC5 BADGE: ' + def.emoji + ' ' + def.name;
        el.appendChild(inner);
        document.body.appendChild(el);
        setTimeout(function() { el.classList.add('ns-bt-out'); }, 2500);
        setTimeout(function() { el.remove(); }, 3000);
      }, idx * 3500);
    });
  }
```

- [ ] **Step 2: Wire checkBadges into save() and init()**

In `init()`, add after `_updateProfile()`:

```javascript
    // Check badges
    checkBadges();
```

In `save()`, add inside the `.then()` callback (around line 194), after `_injectChallengeBar()`:

```javascript
      checkBadges();
```

- [ ] **Step 3: Wire challenger badge into challenge()**

In the `challenge()` function, after the successful POST, add:

```javascript
      _awardBadge('challenger');
      _showUnseenBadgeToasts();
```

- [ ] **Step 4: Add badge toast CSS to injectStyles()**

Add to the styles string (before the closing `';`):

```javascript
      // Badge toast
      '.ns-badge-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:10001;animation:nsSlideIn .3s ease}' +
      '.ns-bt-inner{font-family:"Orbitron",monospace;font-weight:700;font-size:12px;letter-spacing:2px;padding:12px 24px;background:#0e0e1a;border:1px solid #ffd700;color:#ffd700;border-radius:4px;box-shadow:0 0 20px rgba(255,215,0,0.3);white-space:nowrap}' +
      '.ns-badge-toast.ns-bt-out{animation:nsSlideOut .4s ease forwards}' +
```

- [ ] **Step 5: Update return object and NeonScores alias**

Add these to both the return block and NeonScores:

```javascript
    checkBadges: checkBadges,
    getBadges: getBadges,
    getProfile: getProfile,
```

- [ ] **Step 6: Verify syntax**

```bash
node -c public/neon.js
```

- [ ] **Step 7: Commit**

```bash
git add public/neon.js
git commit -m "Add badge system to neon.js — 13 achievements with unlock toasts"
```

---

## Task 4: Daily Hub Page

**Files:**
- Create: `public/daily/index.html`

- [ ] **Step 1: Create the daily hub page**

Create `public/daily/index.html` — a neon-styled page that:

1. Shows today's date and a "DAILY CHALLENGE" header
2. Displays 5 puzzle cards (Sudoku, Mini Sudoku, Queens, Minesweeper, Nonogram)
3. Each card reads localStorage to check completion:
   - Scan all localStorage keys for pattern `{baseKey}*_{todayCompact}` where todayCompact is `YYYYMMDD` (no dashes) — this matches the format neon.js uses (`cfg.key + '_' + _todayStr().replace(/-/g, '')`)
   - If scores found: show ✅ with best score
   - If not found: show 🔒 with PLAY link to game
4. Shows combined streak from `neonarcade_daily_hub_streak` localStorage key
5. Shows progress bar: X/5 complete
6. When all 5 complete: calls `POST /api/daily/complete`, shows social proof count, share button, countdown
7. Fetches `GET /api/daily/stats` on load for social proof
8. Links to `/profile` for full stats
9. Updates hub streak on page load (any completion = regular streak, all 5 = perfect streak)
10. Share button produces the emoji daily recap format from the spec

**Daily game config (hardcoded in the page):**
```javascript
var DAILY_GAMES = [
  { slug: 'sudoku',      name: 'SUDOKU',      emoji: '\uD83D\uDD22', category: 'neonmind', keyPrefix: 'neonarcade_scores_sudoku_' },
  { slug: 'minisudoku',  name: 'MINI SUDOKU', emoji: '\uD83D\uDD22', category: 'neonmind', keyPrefix: 'neonarcade_neonmind_minisudoku_scores_' },
  { slug: 'queens',      name: 'QUEENS',      emoji: '\uD83D\uDC51', category: 'neonmind', keyPrefix: 'neonarcade_neonmind_queens_scores_' },
  { slug: 'minesweeper', name: 'MINESWEEPER', emoji: '\uD83D\uDCA3', category: 'neonmind', keyPrefix: 'neonarcade_neonmind_minesweeper_scores_' },
  { slug: 'nonogram',    name: 'NONOGRAM',    emoji: '\uD83C\uDFA8', category: 'neonmind', keyPrefix: 'neonarcade_neonmind_nonogram_scores_' },
];
```

**Completion detection logic:**
```javascript
function isGameComplete(game) {
  var today = getTodayCompact(); // "20260414"
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.indexOf(game.keyPrefix) === 0 && key.indexOf(today) >= 0) {
      try {
        var scores = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(scores) && scores.length > 0) return scores[0];
      } catch(e) {}
    }
  }
  return null;
}
```

**Hub streak update logic:**
```javascript
function updateHubStreak(completedCount) {
  var streak = loadHubStreak();
  var today = getTodayStr(); // "2026-04-14"
  var yesterday = getYesterdayStr();

  if (completedCount > 0 && streak.lastPlayed !== today) {
    streak.current = (streak.lastPlayed === yesterday) ? streak.current + 1 : 1;
    streak.lastPlayed = today;
    if (streak.current > streak.best) streak.best = streak.current;
  }
  if (completedCount >= 5 && streak.lastPerfect !== today) {
    streak.perfectCurrent = (streak.lastPerfect === yesterday) ? streak.perfectCurrent + 1 : 1;
    streak.lastPerfect = today;
    if (streak.perfectCurrent > streak.perfectBest) streak.perfectBest = streak.perfectCurrent;
  }
  saveHubStreak(streak);
  return streak;
}
```

**Day number calculation:**
```javascript
var LAUNCH_DATE = new Date('2026-03-05T00:00:00Z');
function getDayNumber() {
  var now = new Date();
  return Math.floor((now - LAUNCH_DATE) / 86400000) + 1;
}
```

**Security:** All user-provided text rendered via `textContent`. No innerHTML with dynamic data.

**Neon styling:** Match the brand — #0a0a12 bg, scanlines, Orbitron/Rajdhani, glow effects. Cards on dark surface (#12121f) with colored borders (green for complete, dim for pending). SEO meta tags, noindex (daily pages change every day).

**Auto-refresh:** On `visibilitychange` event (user returns from game tab), re-scan localStorage and update card states. No polling needed.

- [ ] **Step 2: Create the directory**

```bash
mkdir -p public/daily
```

- [ ] **Step 3: Verify it loads locally**

```bash
curl -s http://localhost:8777/daily/ | head -5
```

- [ ] **Step 4: Commit**

```bash
git add public/daily/index.html
git commit -m "Add daily puzzle hub page — 5 games, streak, progress, share"
```

---

## Task 5: Player Profile Page

**Files:**
- Create: `public/profile/index.html`

- [ ] **Step 1: Create the profile page**

Create `public/profile/index.html` — a neon-styled page that reads all stats from localStorage and displays:

1. **Player name** from `neonarcade_player_name`
2. **"Playing since"** from `neonarcade_profile` → `firstVisit`
3. **Streaks section:** combined daily streak + perfect streak from `neonarcade_daily_hub_streak`
4. **Badges grid:** Read `neonarcade_badges`, display earned badges as emoji with name. Unearned badges shown dimmed. Reference `BADGE_DEFS` array (hardcode the same 13 definitions).
5. **Stats:** Games played count (from profile.gamesPlayed), challenge wins/losses
6. **Best scores:** Scan localStorage for all keys matching `neonarcade_*scores*`, extract game slug from key, display top score per game. Format time-based games (mode: low) as mm:ss. Use a static game registry for display names and modes (same registry as leaderboard page).
7. **Share button:** "SHARE MY STATS" generates summary text with name, streak, badge count, games played. Uses clipboard/navigator.share.
8. **Link back** to `/` and to `/daily`

**Game registry for display names (hardcode):** Same list used in leaderboard page — array of `{slug, name, category, mode}` objects covering all 72 games.

**Security:** All user-provided text via `textContent`.

**Neon styling:** Match brand. Use card sections with headers. SEO meta tags with canonical `/profile/`.

- [ ] **Step 2: Create directory**

```bash
mkdir -p public/profile
```

- [ ] **Step 3: Verify it loads locally**

```bash
curl -s http://localhost:8777/profile/ | head -5
```

- [ ] **Step 4: Commit**

```bash
git add public/profile/index.html
git commit -m "Add player profile page — badges, stats, scores"
```

---

## Task 6: Main Hub — Daily Challenge Link

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add a prominent "DAILY CHALLENGE" link**

Read the current `public/index.html` to find the appropriate location — likely near the top of the page, above or alongside the category links. Add a card or button linking to `/daily/`:

The link should be visually prominent — a card with a fire emoji, "DAILY CHALLENGE" title, today's date, and the player's streak if available. Style it with a gold or warm glow to stand out from the cyan category links.

Read the existing index.html structure first to find the best insertion point and match the existing card/link pattern.

- [ ] **Step 2: Commit**

```bash
git add public/index.html
git commit -m "Add Daily Challenge link to main hub page"
```

---

## Task 7: Sitemap & llms.txt Updates

**Files:**
- Modify: `public/sitemap.xml`
- Modify: `public/llms.txt`

- [ ] **Step 1: Add /daily/ and /profile/ to sitemap.xml**

Add two new URL entries:
```xml
<url>
  <loc>https://neonarcade.net/daily/</loc>
  <changefreq>daily</changefreq>
  <priority>0.8</priority>
</url>
<url>
  <loc>https://neonarcade.net/profile/</loc>
  <changefreq>weekly</changefreq>
  <priority>0.5</priority>
</url>
```

- [ ] **Step 2: Add daily hub and profile to llms.txt**

Add entries describing both pages and the badge system.

- [ ] **Step 3: Commit**

```bash
git add public/sitemap.xml public/llms.txt
git commit -m "Add daily hub and profile to sitemap and llms.txt"
```

---

## Task 8: Integration — Verify & Deploy

**Files:**
- All modified files

- [ ] **Step 1: Verify syntax**

```bash
node -c public/neon.js && node -c src/worker.js && echo "Both OK"
```

- [ ] **Step 2: Smoke test locally**

Start server if not running:
```bash
cd /Users/jjverhoeks/src/tries/2026-03-05-viralwebgame/public && python3 -m http.server 8777 &
```

Test pages load:
- `http://localhost:8777/daily/` — should show 5 puzzle cards
- `http://localhost:8777/profile/` — should show empty profile (no data yet)
- `http://localhost:8777/` — should show Daily Challenge link

- [ ] **Step 3: Push and deploy**

```bash
git push origin main
npx wrangler deploy
```

- [ ] **Step 4: Verify production endpoints**

```bash
# Daily stats endpoint
curl -s https://neonarcade.net/api/daily/stats

# Daily completion endpoint
curl -s -X POST https://neonarcade.net/api/daily/complete \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://neonarcade.net' \
  -d '{"name":"TST"}'

# Pages load
curl -sL --compressed https://neonarcade.net/daily/ | head -5
curl -sL --compressed https://neonarcade.net/profile/ | head -5
```

- [ ] **Step 5: End-to-end test**

1. Open `https://neonarcade.net/daily/`
2. Verify 5 puzzle cards show as incomplete (🔒)
3. Click one puzzle, complete it, return to daily hub
4. Verify the completed puzzle shows ✅ with score
5. Verify streak incremented
6. Check that badge toast appears (first_daily badge)
7. Open `/profile/` and verify game appears in "games played"
8. Complete all 5, verify share button works, social proof counter

- [ ] **Step 6: Commit any fixes**
