# Polish & Virality Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add viral mechanics (challenge links, daily mode, streaks, percentile, enhanced sharing) to the NEON ARCADE platform by extending neon.js and worker.js, so all 72 games benefit automatically.

**Architecture:** Everything builds into `public/neon.js` (client library, currently ~534 lines) and `src/worker.js` (Cloudflare Worker, currently ~655 lines). Two new HTML pages: challenge landing page and public leaderboard. Per-game changes are minimal — only games opting into daily mode need a code change.

**Tech Stack:** Vanilla JS (no frameworks), Cloudflare Workers + KV, HTML5 Canvas for score cards.

**Spec:** `docs/superpowers/specs/2026-04-13-polish-and-virality-design.md`

**Security note:** All dynamic text rendered in HTML pages uses `escHtml()` helper (creates a text node via `document.createElement('div').textContent`) or `textContent` assignment to prevent XSS. No raw `innerHTML` with user input.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `public/neon.js` | Modify | Add challenge, daily, streak, percentile, share, score card features |
| `src/worker.js` | Modify | Add challenge, score distribution, daily play count endpoints + challenge page routing |
| `public/c/index.html` | Create | Challenge landing page — shows challenger score, OG tags injected by worker |
| `public/leaderboards/index.html` | Create | Public leaderboard browser — dropdown per game, global top 20 |

---

## Task 1: Screenshots for 4 Games

**Files:**
- Create: `public/neonarcade/screenshots/chimp.png`
- Create: `public/neonmind/screenshots/connections.png`
- Create: `public/neonmind/screenshots/tango.png`
- Create: `public/neongrind/screenshots/clickspeed.png`

- [ ] **Step 1: Start local server**

```bash
cd /Users/jjverhoeks/src/tries/2026-03-05-viralwebgame/public && python3 -m http.server 8777 &
```

- [ ] **Step 2: Take screenshots with Playwright**

```bash
npx playwright screenshot --viewport-size="1280,800" http://localhost:8777/neonarcade/chimp.html public/neonarcade/screenshots/chimp.png
npx playwright screenshot --viewport-size="1280,800" http://localhost:8777/neonmind/connections.html public/neonmind/screenshots/connections.png
npx playwright screenshot --viewport-size="1280,800" http://localhost:8777/neonmind/tango.html public/neonmind/screenshots/tango.png
npx playwright screenshot --viewport-size="1280,800" http://localhost:8777/neongrind/clickspeed.html public/neongrind/screenshots/clickspeed.png
```

- [ ] **Step 3: Verify screenshots exist and have reasonable size**

```bash
ls -la public/neonarcade/screenshots/chimp.png public/neonmind/screenshots/connections.png public/neonmind/screenshots/tango.png public/neongrind/screenshots/clickspeed.png
```

Expected: 4 PNG files, each 50KB-500KB.

- [ ] **Step 4: Commit**

```bash
git add public/neonarcade/screenshots/chimp.png public/neonmind/screenshots/connections.png public/neonmind/screenshots/tango.png public/neongrind/screenshots/clickspeed.png
git commit -m "Add missing screenshots for chimp, connections, tango, clickspeed"
```

---

## Task 2: Worker — Challenge Endpoints

**Files:**
- Modify: `src/worker.js`

Add three new endpoints for challenge link creation, retrieval, and response. Insert them after the existing leaderboard endpoints and before the multiplayer room endpoints.

- [ ] **Step 1: Add challenge code generator function**

Add after the `generateToken()` function (after line 158 in worker.js):

```javascript
// Generate a random 6-char alphanumeric challenge code (uppercase + digits)
function generateChallengeCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * 36)];
  }
  return code;
}
```

- [ ] **Step 2: Add POST /api/challenge endpoint**

Add before the multiplayer room section (`// ─── Multiplayer Room Endpoints`):

```javascript
      // ─── Challenge Link Endpoints ──────────────────────────────────

      // POST /api/challenge — create a challenge link
      if (request.method === 'POST' && segments[0] === 'challenge' && segments.length === 1) {
        let body;
        try { body = await request.json(); } catch { return json({ error: 'invalid JSON body' }, 400); }

        const game = sanitizeGame(body.game);
        if (!game || !KNOWN_GAMES[game]) return json({ error: 'unknown game' }, 404);

        const gameConfig = KNOWN_GAMES[game];
        const name = sanitizeName(body.name);
        const score = parseInt(body.score, 10);
        if (!name || name.length < 1) return json({ error: 'name required' }, 400);
        if (isNaN(score) || score <= 0) return json({ error: 'valid score required' }, 400);
        if (score > gameConfig.maxScore) return json({ error: 'score exceeds maximum' }, 400);

        const text = typeof body.text === 'string' ? body.text.slice(0, 500) : '';

        // Generate unique code with collision check
        let code = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = generateChallengeCode();
          const existing = await env.GAME_DATA.get(`challenge:${candidate}`);
          if (!existing) {
            code = candidate;
            break;
          }
        }
        if (!code) return json({ error: 'failed to generate code, try again' }, 503);

        const challenge = { game, score, name, text, ts: Date.now(), response: null };
        await env.GAME_DATA.put(`challenge:${code}`, JSON.stringify(challenge), { expirationTtl: 2592000 }); // 30 days
        return json({ code });
      }

      // GET /api/challenge/:code — retrieve a challenge
      if (request.method === 'GET' && segments[0] === 'challenge' && segments.length === 2) {
        const code = (segments[1] || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        if (code.length !== 6) return json({ error: 'invalid code' }, 400);

        const data = safeParseObject(await env.GAME_DATA.get(`challenge:${code}`));
        if (!data) return json({ error: 'challenge not found' }, 404);

        return json({
          game: data.game,
          score: data.score,
          name: data.name,
          text: data.text,
          ts: data.ts,
          responded: !!data.response,
          response: data.response,
        });
      }

      // POST /api/challenge/:code/respond — submit a challenge response
      if (request.method === 'POST' && segments[0] === 'challenge' && segments.length === 3 && segments[2] === 'respond') {
        const code = (segments[1] || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        if (code.length !== 6) return json({ error: 'invalid code' }, 400);

        const data = safeParseObject(await env.GAME_DATA.get(`challenge:${code}`));
        if (!data) return json({ error: 'challenge not found' }, 404);
        if (data.response) return json({ error: 'challenge already responded' }, 400);

        let body;
        try { body = await request.json(); } catch { return json({ error: 'invalid JSON body' }, 400); }

        const name = sanitizeName(body.name);
        const score = parseInt(body.score, 10);
        if (!name) return json({ error: 'name required' }, 400);
        if (isNaN(score) || score <= 0) return json({ error: 'valid score required' }, 400);

        const gameConfig = KNOWN_GAMES[data.game];
        if (!gameConfig) return json({ error: 'unknown game' }, 404);

        const mode = gameConfig.mode;
        let result, diff;
        if (mode === 'low') {
          result = score <= data.score ? 'win' : 'lose';
          diff = data.score - score;
        } else {
          result = score >= data.score ? 'win' : 'lose';
          diff = score - data.score;
        }

        data.response = { name, score, ts: Date.now(), result, diff };
        await env.GAME_DATA.put(`challenge:${code}`, JSON.stringify(data), { expirationTtl: 2592000 });

        return json({
          result,
          diff,
          challenge: { game: data.game, score: data.score, name: data.name },
          response: { score, name },
        });
      }
```

- [ ] **Step 3: Add challenge page routing with OG tag injection**

Replace the early-return block for non-API routes:

```javascript
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }
```

with:

```javascript
    // Challenge page with dynamic OG tags
    if (url.pathname.startsWith('/c/') && url.pathname.length > 3) {
      const code = url.pathname.slice(3).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (code.length === 6) {
        const data = safeParseObject(await env.GAME_DATA.get(`challenge:${code}`));
        if (data && data.game) {
          const gameName = data.game.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const title = `${data.name} scored ${data.score.toLocaleString()} in ${gameName} — Can you beat it?`;
          const desc = 'Challenge accepted? Play now on NEON ARCADE. No download, no login.';
          const screenshotUrl = `https://neonarcade.net/screenshots/${data.game}.png`;

          const assetResponse = await env.ASSETS.fetch(new Request(url.origin + '/c/index.html', request));
          let html = await assetResponse.text();

          html = html.replace(/__OG_TITLE__/g, title.replace(/"/g, '&quot;'));
          html = html.replace(/__OG_DESC__/g, desc);
          html = html.replace(/__OG_IMAGE__/g, screenshotUrl);
          html = html.replace(/__OG_URL__/g, `https://neonarcade.net/c/${code}`);
          html = html.replace(/__CHALLENGE_CODE__/g, code);

          return new Response(html, {
            headers: { 'Content-Type': 'text/html;charset=UTF-8' },
          });
        }
      }
      return env.ASSETS.fetch(new Request(url.origin + '/c/index.html', request));
    }

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }
```

- [ ] **Step 4: Verify worker.js syntax**

```bash
node -c src/worker.js
```

Expected: no syntax errors.

- [ ] **Step 5: Commit**

```bash
git add src/worker.js
git commit -m "Add challenge link endpoints and OG tag injection to worker"
```

---

## Task 3: Worker — Score Distribution & Daily Play Endpoints

**Files:**
- Modify: `src/worker.js`

- [ ] **Step 1: Add score distribution helper functions**

Add after the `increment()` function:

```javascript
// Update score distribution buckets for percentile calculation
async function updateDistribution(kv, game, score) {
  const config = KNOWN_GAMES[game];
  if (!config) return null;
  const key = `dist:${game}`;
  let dist;
  try {
    const raw = await kv.get(key);
    dist = raw ? JSON.parse(raw) : null;
  } catch { dist = null; }

  if (!dist || typeof dist !== 'object') {
    dist = { totalScores: 0, buckets: {} };
  }

  const maxScore = config.maxScore;
  const bucketSize = Math.ceil(maxScore / 10);
  const bucketIdx = Math.min(Math.floor(score / bucketSize), 9);
  const bucketKey = String(bucketIdx);

  dist.totalScores = (dist.totalScores || 0) + 1;
  dist.buckets[bucketKey] = (dist.buckets[bucketKey] || 0) + 1;

  await kv.put(key, JSON.stringify(dist));
  return dist;
}

function calcPercentile(dist, score, game) {
  if (!dist || dist.totalScores === 0) return { percentile: 50, rank: 'Top 50%', totalScores: 0 };

  const config = KNOWN_GAMES[game];
  const maxScore = config.maxScore;
  const bucketSize = Math.ceil(maxScore / 10);
  const bucketIdx = Math.min(Math.floor(score / bucketSize), 9);
  const mode = config.mode;

  let below = 0;
  if (mode === 'low') {
    for (let i = bucketIdx + 1; i <= 9; i++) {
      below += (dist.buckets[String(i)] || 0);
    }
  } else {
    for (let i = 0; i < bucketIdx; i++) {
      below += (dist.buckets[String(i)] || 0);
    }
  }

  const percentile = Math.round((below / dist.totalScores) * 100);
  const clamped = Math.max(1, Math.min(99, percentile));
  const topPct = 100 - clamped;
  return { percentile: clamped, rank: 'Top ' + topPct + '%', totalScores: dist.totalScores };
}
```

- [ ] **Step 2: Add POST /api/score/:game and GET percentile endpoints**

Add after the challenge endpoints (before multiplayer room section):

```javascript
      // POST /api/score/:game — record score in distribution, return percentile
      if (request.method === 'POST' && segments[0] === 'score' && segments[1]) {
        const game = sanitizeGame(segments[1]);
        if (!game || !KNOWN_GAMES[game]) return json({ error: 'unknown game' }, 404);

        let body;
        try { body = await request.json(); } catch { return json({ error: 'invalid JSON body' }, 400); }

        const score = parseInt(body.score, 10);
        if (isNaN(score) || score <= 0) return json({ error: 'valid score required' }, 400);
        if (score > KNOWN_GAMES[game].maxScore) return json({ error: 'score exceeds maximum' }, 400);

        const dist = await updateDistribution(env.GAME_DATA, game, score);
        const result = calcPercentile(dist, score, game);
        return json(result);
      }

      // GET /api/leaderboard/:game/percentile/:score — read-only percentile lookup
      if (request.method === 'GET' && segments[0] === 'leaderboard' && segments[2] === 'percentile' && segments[3]) {
        const game = sanitizeGame(segments[1]);
        if (!game || !KNOWN_GAMES[game]) return json({ error: 'unknown game' }, 404);

        const score = parseInt(segments[3], 10);
        if (isNaN(score) || score <= 0) return json({ error: 'valid score required' }, 400);

        let dist;
        try {
          const raw = await env.GAME_DATA.get(`dist:${game}`);
          dist = raw ? JSON.parse(raw) : null;
        } catch { dist = null; }

        const result = calcPercentile(dist || { totalScores: 0, buckets: {} }, score, game);
        return json(result);
      }
```

- [ ] **Step 3: Enhance POST /api/play/:game to track daily plays**

Replace the existing POST /api/play handler with:

```javascript
      if (request.method === 'POST' && segments[0] === 'play' && segments[1]) {
        const game = sanitizeGame(segments[1]);
        if (!game || !KNOWN_GAMES[game]) return json({ error: 'unknown game' }, 404);
        const today = new Date().toISOString().slice(0, 10);
        const dailyKey = `plays_daily:${game}:${today}`;
        const [plays, dailyPlays] = await Promise.all([
          increment(env.GAME_DATA, `plays:${game}`),
          increment(env.GAME_DATA, dailyKey),
        ]);
        // Re-put daily count with 48h TTL for auto-cleanup
        await env.GAME_DATA.put(dailyKey, String(dailyPlays), { expirationTtl: 172800 });
        return json({ game, plays, playsToday: dailyPlays });
      }
```

- [ ] **Step 4: Enhance GET /api/stats/:game to return daily plays**

Replace the existing GET /api/stats/:game handler with:

```javascript
      if (request.method === 'GET' && segments[0] === 'stats' && segments[1]) {
        const game = sanitizeGame(segments[1]);
        if (!game || !KNOWN_GAMES[game]) return json({ error: 'unknown game' }, 404);
        const today = new Date().toISOString().slice(0, 10);
        const [plays, likes, issues, playsToday] = await Promise.all([
          env.GAME_DATA.get(`plays:${game}`),
          env.GAME_DATA.get(`likes:${game}`),
          env.GAME_DATA.get(`issues:${game}`),
          env.GAME_DATA.get(`plays_daily:${game}:${today}`),
        ]);
        return json({
          game,
          plays: parseInt(plays || '0', 10),
          likes: parseInt(likes || '0', 10),
          issues: parseInt(issues || '0', 10),
          playsToday: parseInt(playsToday || '0', 10),
        });
      }
```

- [ ] **Step 5: Verify worker.js syntax**

```bash
node -c src/worker.js
```

- [ ] **Step 6: Commit**

```bash
git add src/worker.js
git commit -m "Add score distribution, percentile, and daily play count endpoints"
```

---

## Task 4: Challenge Landing Page

**Files:**
- Create: `public/c/index.html`

- [ ] **Step 1: Create directory and challenge page**

Create `public/c/index.html` — a neon-styled page that fetches challenge data via API and renders the challenger's score. Uses `__OG_TITLE__` etc. placeholders that the worker replaces with real values for social previews. All user-provided text is rendered via `textContent` (never raw HTML insertion) to prevent XSS. See the full file content in the spec's section 2.1 for the page structure.

The page must:
- Parse challenge code from URL path or `__CHALLENGE_CODE__` injected by worker
- Fetch `/api/challenge/{code}` to get challenge data
- Render challenger name, score, game name using safe DOM methods (textContent)
- Show "CAN YOU BEAT THIS?" CTA and "PLAY NOW" link to the game with `?challenge={code}` param
- If already responded, show vs result
- Map game slugs to categories for correct game URL path
- Full neon styling matching the brand (scanlines, glow, Orbitron/Rajdhani fonts)

- [ ] **Step 2: Verify the file renders locally**

Open `http://localhost:8777/c/index.html` — should show "Challenge not found" (no worker injection locally). Styling should look correct.

- [ ] **Step 3: Commit**

```bash
mkdir -p public/c
git add public/c/index.html
git commit -m "Add challenge landing page with dynamic OG tag support"
```

---

## Task 5: neon.js — Challenge System

**Files:**
- Modify: `public/neon.js`

Add challenge creation, detection, and response handling. All additions go inside the existing IIFE, after the feedback section (after line 496) and before the style injection block.

- [ ] **Step 1: Add challenge state variables and API methods**

Add these functions after the feedback section:
- `_challengeData` variable (active challenge from URL param)
- `_lastScore` variable (last score saved)
- `_lastPercentile` variable (last percentile from /api/score)
- `_challengeBar` variable (floating challenge button element)
- `_playsToday` and `_playsTotal` variables (used by init() in Step 3, available via getPlaysToday/getPlaysTotal)
- `_getChallengeCode()` — reads `?challenge=` from URL params
- `getChallenge()` — fetches challenge data if URL has challenge param, stores in `_challengeData`
- `challenge(shareText)` — POSTs to `/api/challenge`, copies URL, shows confirmation
- `respondChallenge(myScore)` — POSTs to `/api/challenge/{code}/respond`, shows result overlay
- `_showChallengeConfirm()` — "CHALLENGE LINK COPIED!" toast notification
- `_showChallengeResult(data)` — fullscreen win/lose overlay with score comparison
- `_injectChallengeBar()` — floating "CHALLENGE A FRIEND" button (bottom-right), auto-dismiss after 30s

- [ ] **Step 2: Modify save() to integrate percentile, challenge, and streak**

Enhance `save()` (lines 104-146) to:
- Store `_lastScore = score`
- After local + global save, also POST to `/api/score/{game}` for percentile
- If `_challengeData` is active, call `respondChallenge(score)`
- If `cfg.daily`, call `_updateStreak()`
- After all promises resolve, call `_injectChallengeBar()`
- Return result including `percentile: _lastPercentile`

- [ ] **Step 3: Modify init() to load challenge data, play stats, and streak**

Enhance `init()` (lines 51-68) to:
- Accept new options: `daily`, `emoji`, `title`
- If `daily: true`, append today's date to storage key
- Call `getChallenge()` to check for URL challenge param
- Call `api.stats()` to fetch play counts (store in `_playsToday`, `_playsTotal`)
- If daily, call `_loadStreak()`

- [ ] **Step 4: Add challenge + percentile CSS to injectStyles()**

Add CSS rules for:
- `.ns-chal-bar` / `.ns-chal-btn` — floating challenge button with pulse animation
- `.ns-challenge-confirm` / `.ns-cc-out` — slide-in/out toast
- `.ns-challenge-result` / `.ns-cr-*` — fullscreen result overlay

- [ ] **Step 5: Update return object and NeonScores alias**

Add all new methods to the `return` block: `challenge`, `getChallenge`, `respondChallenge`, `getDailySeed`, `getStreak`, `renderStreak`, `share`, `formatShare`, `generateScoreCard`, `getPlaysToday`, `getPlaysTotal`, `getPercentile`.

- [ ] **Step 6: Verify neon.js syntax**

```bash
node -c public/neon.js
```

- [ ] **Step 7: Commit**

```bash
git add public/neon.js
git commit -m "Add challenge system to neon.js — create, detect, respond, auto-inject UI"
```

---

## Task 6: neon.js — Daily Seeds & Streak Tracking

**Files:**
- Modify: `public/neon.js`

- [ ] **Step 1: Add daily seed and streak functions**

Add after the challenge section (note: `_playsToday` and `_playsTotal` were already declared in Task 5):
- `getDailySeed()` — FNV-1a hash of UTC date string, returns unsigned 32-bit integer
- `_streakKey()` — returns localStorage key for current game's streak
- `_todayStr()` / `_yesterdayStr()` — UTC date string helpers
- `_loadStreak()` — reads streak from localStorage, returns `{ current, best, lastPlayed }`
- `getStreak()` — public accessor (returns empty if not daily mode)
- `_updateStreak()` — on daily completion: if lastPlayed was yesterday, increment; if older, reset to 1; update best
- `renderStreak(el)` — renders fire emoji + streak count badge into given element

- [ ] **Step 2: Add streak badge CSS**

Add `.ns-streak-badge` style rule to the styles string.

- [ ] **Step 3: Verify syntax**

```bash
node -c public/neon.js
```

- [ ] **Step 4: Commit**

```bash
git add public/neon.js
git commit -m "Add daily seed and streak tracking to neon.js"
```

---

## Task 7: neon.js — Enhanced Share & Score Cards

**Files:**
- Modify: `public/neon.js`

- [ ] **Step 1: Add formatShare, share, and generateScoreCard**

Add after the streak section:
- `formatShare(opts)` — builds standardized emoji share text: emoji + title, score + percentile + streak, progress bar, challenge URL
- `share(opts)` — uses `navigator.share()` on mobile (with optional image file), clipboard fallback on desktop, shows "COPIED!" toast
- `_clipboardShare(text, url)` — clipboard write helper
- `_showCopyConfirm()` — "COPIED TO CLIPBOARD!" toast
- `generateScoreCard(opts)` — renders 1200x630 canvas: dark gradient bg, scanlines, emoji, game name in Orbitron with cyan glow, score in gold, rank badge, streak, player name, NEON ARCADE branding. Returns `Promise<canvas>`.

- [ ] **Step 2: Verify syntax**

```bash
node -c public/neon.js
```

- [ ] **Step 3: Commit**

```bash
git add public/neon.js
git commit -m "Add enhanced sharing, formatShare, and score card generation to neon.js"
```

---

## Task 8: neon.js — Enhanced Leaderboard Rendering

**Files:**
- Modify: `public/neon.js`

- [ ] **Step 1: Enhance render() with rank hints and percentile display**

Replace the `render()` function to add:
- After global top 10, if player is NOT on board: show hypothetical rank ("Your score would be #8") or threshold ("Score 1,240+ to join")
- If `_lastPercentile` exists, show "TOP X% GLOBALLY" badge in gold below leaderboard
- Pulsing glow style on the player's own row

- [ ] **Step 2: Add rank hint and percentile CSS**

Add `.ns-rank-hint` and `.ns-percentile` style rules.

- [ ] **Step 3: Verify syntax**

```bash
node -c public/neon.js
```

- [ ] **Step 4: Commit**

```bash
git add public/neon.js
git commit -m "Enhance leaderboard rendering with rank hints and percentile display"
```

---

## Task 9: Public Leaderboard Page

**Files:**
- Create: `public/leaderboards/index.html`

- [ ] **Step 1: Create the leaderboard browser page**

A standalone neon-styled page with:
- Game picker dropdown (grouped by category: NEON ARCADE, MIND, GRIND, CLASSIC, QUEST, CASINO)
- URL param support: `?game=neon-snake` pre-selects
- Fetches `/api/leaderboard/{game}` and `/api/stats/{game}` on selection
- Renders top 20 with gold/silver/bronze rank coloring
- Shows total plays + today's plays
- "PLAY {GAME}" link to the game page
- All user text rendered via `textContent` (safe DOM methods)
- Full neon styling, SEO meta tags, canonical URL

- [ ] **Step 2: Verify it loads locally**

Open `http://localhost:8777/leaderboards/` — game picker should show all categories. Selecting a game will attempt API fetch (won't work locally without worker, but structure renders).

- [ ] **Step 3: Commit**

```bash
mkdir -p public/leaderboards
git add public/leaderboards/index.html
git commit -m "Add public leaderboard browser page"
```

---

## Task 10: Integration — Final Assembly & Verify

**Files:**
- Modify: `public/neon.js` (final verification)
- Modify: `src/worker.js` (final verification)

- [ ] **Step 1: Verify neon.js section order**

The file should have this structure:
1. API helpers (`_post`, `_get`, `api` object)
2. Scores (config, localScores, init, save, etc.)
3. UI: Score Table (render, _makeRow)
4. UI: Name Prompt (promptName)
5. UI: Global Splash (showGlobalSplash)
6. UI: Feedback (renderFeedback, _injectFeedbackBar)
7. Challenge Links (challenge, getChallenge, respondChallenge, _injectChallengeBar)
8. Daily Mode & Streaks (getDailySeed, getStreak, renderStreak, _updateStreak)
9. Share Upgrades (formatShare, share, generateScoreCard)
10. Style injection (injectStyles with all CSS)
11. Backward compat aliases
12. Return object (all methods)

- [ ] **Step 2: Run syntax checks**

```bash
node -c public/neon.js && node -c src/worker.js
```

- [ ] **Step 3: Start local server and smoke test**

```bash
cd /Users/jjverhoeks/src/tries/2026-03-05-viralwebgame/public && python3 -m http.server 8777
```

Open `http://localhost:8777/neonarcade/neon-snake.html`:
- Verify game loads without console errors
- Play a round, verify score saves
- Check challenge bar appears (bottom-right) after game over
- Check leaderboard renders
- Open `http://localhost:8777/leaderboards/` and verify it loads
- Open `http://localhost:8777/c/index.html` and verify it shows "challenge not found"

- [ ] **Step 4: Final commit**

```bash
git add public/neon.js src/worker.js
git commit -m "Complete virality engine integration — challenge links, daily mode, streaks, percentile, share upgrades"
```

---

## Task 11: Deploy & Verify Production

- [ ] **Step 1: Deploy to Cloudflare**

```bash
npx wrangler deploy
```

- [ ] **Step 2: Verify challenge endpoint**

```bash
curl -X POST https://neonarcade.net/api/challenge \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://neonarcade.net' \
  -d '{"game":"neon-snake","score":100,"name":"TST","text":"test"}'
```

Expected: `{ "code": "XXXXXX" }`

- [ ] **Step 3: Verify challenge page OG tags**

```bash
curl -s https://neonarcade.net/c/XXXXXX | grep og:title
```

Expected: OG title with challenger name and score.

- [ ] **Step 4: Verify score distribution endpoint**

```bash
curl -X POST https://neonarcade.net/api/score/neon-snake \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://neonarcade.net' \
  -d '{"score":100}'
```

Expected: `{ "percentile": ..., "rank": "Top ...%", "totalScores": ... }`

- [ ] **Step 5: Verify daily play stats**

```bash
curl https://neonarcade.net/api/stats/neon-snake
```

Expected: Response includes `playsToday` field.

- [ ] **Step 6: Full end-to-end test on production**

1. Open `https://neonarcade.net/neonarcade/neon-snake.html`
2. Play and complete a game
3. Verify percentile appears in leaderboard
4. Click "CHALLENGE A FRIEND"
5. Verify challenge URL is copied
6. Open challenge URL in incognito
7. Verify OG preview shows challenger info
8. Play the challenge
9. Verify win/lose result screen

- [ ] **Step 7: Commit any production fixes**
