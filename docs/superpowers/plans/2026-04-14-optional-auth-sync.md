# Optional Auth & Score Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional Google + Discord login via WorkOS AuthKit so players can back up their scores, badges, and streaks to the server and restore them on any device.

**Architecture:** Worker handles auth redirect flow (WorkOS REST API), session management (KV-backed cookies), and sync endpoints (upload/download localStorage snapshots). neon.js detects sessions, auto-syncs after saves, and shows a risk-triggered nudge. Profile page gets a login/logout section. No new HTML pages — WorkOS hosts the login page.

**Tech Stack:** WorkOS AuthKit (REST API), Cloudflare Workers + KV, vanilla JS (ES5).

**Spec:** `docs/superpowers/specs/2026-04-14-optional-auth-sync-design.md`

**Prerequisite:** WorkOS account created, application configured with Google + Discord providers enabled, redirect URI set to `https://neonarcade.net/auth/callback`. Client ID and API Key obtained. These are set as Cloudflare secrets before deployment.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/worker.js` | Modify | Auth endpoints (login, callback, logout, status), sync endpoints (POST/GET), session management |
| `public/neon.js` | Modify | Session detection, auto-sync, restore, risk-triggered nudge, new public methods |
| `public/profile/index.html` | Modify | "Protect Your Scores" login section + logged-in state |
| `wrangler.toml` | Modify | Document secret references |

---

## Task 1: Worker — Auth Endpoints

**Files:**
- Modify: `src/worker.js`
- Modify: `wrangler.toml`

- [ ] **Step 1: Add wrangler.toml secret documentation**

Add a comment block to `wrangler.toml` documenting the required secrets:

```toml
# Secrets (set via: wrangler secret put <NAME>):
# WORKOS_CLIENT_ID — from WorkOS dashboard
# WORKOS_API_KEY — from WorkOS dashboard  
# SESSION_SECRET — random 32-char string for cookie generation
```

- [ ] **Step 2: Add session helper functions to worker.js**

Add after the existing helper functions (after `safeParseArray`, around line 250) and before the challenge page routing:

```javascript
// Generate a random session ID (32 hex chars)
function generateSessionId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Parse a specific cookie from the Cookie header
function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? match[1] : null;
}

// Validate session from cookie, returns session object or null
async function getSession(request, kv) {
  const sessionId = getCookie(request, 'neon_session');
  if (!sessionId || sessionId.length !== 32) return null;
  const data = safeParseObject(await kv.get(`session:${sessionId}`));
  return data;
}

// Build Set-Cookie headers for login
function loginCookieHeaders(sessionId, displayName) {
  return {
    'Set-Cookie': `neon_session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
    'Set-Cookie-2': `neon_user=${encodeURIComponent(displayName)}; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
  };
}

// Build Set-Cookie headers for logout (expire both cookies)
function logoutCookieHeaders() {
  return {
    'Set-Cookie': 'neon_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    'Set-Cookie-2': 'neon_user=; Secure; SameSite=Lax; Path=/; Max-Age=0',
  };
}
```

**Important note on multiple Set-Cookie headers:** Cloudflare Workers' `Response` constructor doesn't support duplicate header names. Use the `Headers` object with `append()` instead:

```javascript
function makeRedirectWithCookies(url, sessionId, displayName) {
  const headers = new Headers({ 'Location': url });
  headers.append('Set-Cookie', `neon_session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`);
  headers.append('Set-Cookie', `neon_user=${encodeURIComponent(displayName)}; Secure; SameSite=Lax; Path=/; Max-Age=2592000`);
  return new Response(null, { status: 302, headers });
}

function makeRedirectWithLogout(url) {
  const headers = new Headers({ 'Location': url });
  headers.append('Set-Cookie', 'neon_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  headers.append('Set-Cookie', 'neon_user=; Secure; SameSite=Lax; Path=/; Max-Age=0');
  return new Response(null, { status: 302, headers });
}
```

- [ ] **Step 3: Add auth route handling**

Add BEFORE the `/c/` challenge page routing (around line 273) and before the `/api/` check. Auth routes are `/auth/*` — not under `/api/` since they involve browser redirects, not JSON API calls.

```javascript
    // ─── Auth Routes ─────────────────────────────────────────────────
    if (url.pathname.startsWith('/auth/')) {
      const authPath = url.pathname.slice(6); // remove '/auth/'

      // GET /auth/login — redirect to WorkOS AuthKit
      if (request.method === 'GET' && authPath === 'login') {
        const returnTo = url.searchParams.get('return_to') || '/';
        const state = btoa(JSON.stringify({ returnTo }));
        const workosUrl = 'https://api.workos.com/user_management/authorize?' +
          'client_id=' + encodeURIComponent(env.WORKOS_CLIENT_ID) +
          '&redirect_uri=' + encodeURIComponent('https://neonarcade.net/auth/callback') +
          '&response_type=code' +
          '&provider=authkit' +
          '&state=' + encodeURIComponent(state);
        return Response.redirect(workosUrl, 302);
      }

      // GET /auth/callback — exchange code for user info, create session
      if (request.method === 'GET' && authPath === 'callback') {
        const code = url.searchParams.get('code');
        const stateParam = url.searchParams.get('state');
        if (!code) return new Response('Missing code', { status: 400 });

        // Exchange code with WorkOS
        const tokenRes = await fetch('https://api.workos.com/user_management/authenticate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + env.WORKOS_API_KEY,
          },
          body: JSON.stringify({
            code,
            client_id: env.WORKOS_CLIENT_ID,
            grant_type: 'authorization_code',
          }),
        });

        if (!tokenRes.ok) {
          return new Response('Auth failed', { status: 401 });
        }

        const tokenData = await tokenRes.json();
        const user = tokenData.user;
        if (!user || !user.id) {
          return new Response('Invalid user data', { status: 401 });
        }

        // Create session
        const sessionId = generateSessionId();
        const displayName = sanitizeName(user.first_name || user.email.split('@')[0] || 'PLR');
        const session = {
          userId: user.id,
          email: user.email,
          name: displayName,
          provider: user.provider || 'unknown',
          created: Date.now(),
        };
        await env.GAME_DATA.put(`session:${sessionId}`, JSON.stringify(session), { expirationTtl: 2592000 });

        // Parse return URL from state
        let returnTo = '/';
        try {
          const stateObj = JSON.parse(atob(stateParam || ''));
          if (stateObj.returnTo && stateObj.returnTo.startsWith('/')) returnTo = stateObj.returnTo;
        } catch(e) {}

        // Set a flag so neon.js knows to restore from server
        // (neon_just_logged_in is handled client-side via URL param)
        const redirectUrl = returnTo + (returnTo.indexOf('?') >= 0 ? '&' : '?') + 'just_logged_in=1';

        return makeRedirectWithCookies(redirectUrl, sessionId, displayName);
      }

      // POST /auth/logout — clear session
      if (request.method === 'POST' && authPath === 'logout') {
        const sessionId = getCookie(request, 'neon_session');
        if (sessionId) {
          await env.GAME_DATA.delete(`session:${sessionId}`);
        }
        const headers = new Headers({ 'Content-Type': 'application/json' });
        headers.append('Set-Cookie', 'neon_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
        headers.append('Set-Cookie', 'neon_user=; Secure; SameSite=Lax; Path=/; Max-Age=0');
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
      }

      // GET /auth/status — check if logged in
      if (request.method === 'GET' && authPath === 'status') {
        const session = await getSession(request, env.GAME_DATA);
        if (session) {
          // Mask email: j...@example.com
          const email = session.email || '';
          const atIdx = email.indexOf('@');
          const masked = atIdx > 1 ? email[0] + '...' + email.slice(atIdx) : email;
          return json({ loggedIn: true, name: session.name, email: masked, provider: session.provider });
        }
        return json({ loggedIn: false });
      }

      return new Response('Not found', { status: 404 });
    }
```

- [ ] **Step 4: Verify syntax**

```bash
node -c src/worker.js
```

- [ ] **Step 5: Commit**

```bash
git add src/worker.js wrangler.toml
git commit -m "Add WorkOS auth endpoints — login, callback, logout, status"
```

---

## Task 2: Worker — Sync Endpoints

**Files:**
- Modify: `src/worker.js`

- [ ] **Step 1: Add merge helper function**

Add after the auth helper functions:

```javascript
// Merge sync data: client + server → merged
function mergeSyncData(client, server) {
  if (!server) return client;
  if (!client) return server;
  var merged = {};

  // Player name: prefer client
  merged.playerName = client.playerName || server.playerName || '';

  // Profile
  var cp = client.profile || {};
  var sp = server.profile || {};
  merged.profile = {
    firstVisit: (cp.firstVisit && sp.firstVisit) ? (cp.firstVisit < sp.firstVisit ? cp.firstVisit : sp.firstVisit) : (cp.firstVisit || sp.firstVisit || ''),
    gamesPlayed: Array.from(new Set([].concat(cp.gamesPlayed || [], sp.gamesPlayed || []))),
    challengeWins: Math.max(cp.challengeWins || 0, sp.challengeWins || 0),
    challengeLosses: Math.max(cp.challengeLosses || 0, sp.challengeLosses || 0),
    topPercentiles: {},
  };
  // Merge percentiles (keep lower = better)
  var allPctGames = Object.keys(cp.topPercentiles || {}).concat(Object.keys(sp.topPercentiles || {}));
  allPctGames.forEach(function(g) {
    var cv = (cp.topPercentiles || {})[g];
    var sv = (sp.topPercentiles || {})[g];
    if (cv !== undefined && sv !== undefined) merged.profile.topPercentiles[g] = Math.min(cv, sv);
    else merged.profile.topPercentiles[g] = cv !== undefined ? cv : sv;
  });

  // Badges: union, keep earliest earned
  merged.badges = {};
  var allBadges = Object.keys(client.badges || {}).concat(Object.keys(server.badges || {}));
  allBadges.forEach(function(id) {
    var cb = (client.badges || {})[id];
    var sb = (server.badges || {})[id];
    if (cb && sb) {
      merged.badges[id] = { earned: cb.earned < sb.earned ? cb.earned : sb.earned, seen: true };
    } else {
      merged.badges[id] = cb || sb;
    }
  });

  // Hub streak: keep higher values
  var cs = client.hubStreak || {};
  var ss = server.hubStreak || {};
  merged.hubStreak = {
    current: Math.max(cs.current || 0, ss.current || 0),
    best: Math.max(cs.best || 0, ss.best || 0),
    lastPlayed: (cs.lastPlayed || '') > (ss.lastPlayed || '') ? cs.lastPlayed : ss.lastPlayed,
    perfectCurrent: Math.max(cs.perfectCurrent || 0, ss.perfectCurrent || 0),
    perfectBest: Math.max(cs.perfectBest || 0, ss.perfectBest || 0),
    lastPerfect: (cs.lastPerfect || '') > (ss.lastPerfect || '') ? cs.lastPerfect : ss.lastPerfect,
  };

  // Scores: union by timestamp, deduplicate, keep top 10
  merged.scores = {};
  var allKeys = Object.keys(client.scores || {}).concat(Object.keys(server.scores || {}));
  Array.from(new Set(allKeys)).forEach(function(key) {
    var ca = (client.scores || {})[key] || [];
    var sa = (server.scores || {})[key] || [];
    // Union by timestamp
    var byTs = {};
    ca.concat(sa).forEach(function(entry) {
      if (entry && entry.ts) byTs[entry.ts] = entry;
    });
    var combined = Object.values(byTs);
    // Sort (assume high mode by default — the exact mode doesn't matter for merging, just keep top 10 by score desc)
    combined.sort(function(a, b) { return b.score - a.score; });
    merged.scores[key] = combined.slice(0, 10);
  });

  return merged;
}
```

- [ ] **Step 2: Add sync endpoints**

Add inside the API route handling, after the daily hub endpoints and before the multiplayer room section:

```javascript
      // ─── Sync Endpoints ───────────────────────────────────────────

      // POST /api/sync — upload localStorage data to server
      if (request.method === 'POST' && segments[0] === 'sync' && segments.length === 1) {
        const session = await getSession(request, env.GAME_DATA);
        if (!session) return json({ error: 'not authenticated' }, 401);

        // Throttle: max 1 sync per 10 seconds
        const throttleKey = `sync_throttle:${session.userId}`;
        const lastSync = await env.GAME_DATA.get(throttleKey);
        if (lastSync) return json({ error: 'sync too frequent, wait 10 seconds' }, 429);
        await env.GAME_DATA.put(throttleKey, '1', { expirationTtl: 10 });

        let body;
        try { body = await request.json(); } catch { return json({ error: 'invalid JSON body' }, 400); }

        // Validate size (rough check)
        const bodyStr = JSON.stringify(body);
        if (bodyStr.length > 524288) return json({ error: 'payload too large (max 512KB)' }, 413);

        // Load existing server data
        const userKey = `user:${session.userId}`;
        const existing = safeParseObject(await env.GAME_DATA.get(userKey));
        const existingData = existing ? existing.data : null;

        // Merge
        const merged = mergeSyncData(body, existingData);

        // Save
        const userData = {
          email: session.email,
          name: session.name,
          provider: session.provider,
          data: merged,
          lastSync: new Date().toISOString(),
        };
        await env.GAME_DATA.put(userKey, JSON.stringify(userData));

        return json({ ok: true, lastSync: userData.lastSync });
      }

      // GET /api/sync — download server data to device
      if (request.method === 'GET' && segments[0] === 'sync' && segments.length === 1) {
        const session = await getSession(request, env.GAME_DATA);
        if (!session) return json({ error: 'not authenticated' }, 401);

        const userKey = `user:${session.userId}`;
        const userData = safeParseObject(await env.GAME_DATA.get(userKey));

        if (!userData || !userData.data) {
          return json({ empty: true });
        }

        return json(userData.data);
      }
```

- [ ] **Step 3: Verify syntax**

```bash
node -c src/worker.js
```

- [ ] **Step 4: Commit**

```bash
git add src/worker.js
git commit -m "Add sync endpoints — upload/download localStorage with merge strategy"
```

---

## Task 3: neon.js — Auth Detection, Auto-Sync, Restore

**Files:**
- Modify: `public/neon.js`

All additions go inside the IIFE. Add a new section after PROFILE & BADGES (after line ~1194, before INJECT STYLES).

- [ ] **Step 1: Add auth detection and sync functions**

```javascript
  // ========== AUTH & SYNC ==========
  var _lastSyncTime = 0;

  function isLoggedIn() {
    return document.cookie.indexOf('neon_user=') >= 0;
  }

  function getLoggedInName() {
    var match = document.cookie.match(/neon_user=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function _collectSyncData() {
    var scores = {};
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf('neonarcade_') === 0 && key.indexOf('scores') >= 0) {
        try {
          var val = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(val)) scores[key] = val;
        } catch(e) {}
      }
    }
    return {
      playerName: localStorage.getItem(NAME_KEY) || '',
      profile: _loadProfile(),
      badges: _loadBadges(),
      hubStreak: _loadHubStreak(),
      scores: scores,
    };
  }

  function syncNow() {
    if (!isLoggedIn()) return Promise.resolve(null);
    var data = _collectSyncData();
    return _post('/sync', data).then(function(result) {
      if (result && result.lastSync) {
        try { localStorage.setItem('neonarcade_last_sync', result.lastSync); } catch(e) {}
      }
      return result;
    }).catch(function() { return null; });
  }

  function _autoSync() {
    if (!isLoggedIn()) return;
    var now = Date.now();
    if (now - _lastSyncTime < 30000) return; // throttle: 30s client-side
    _lastSyncTime = now;
    syncNow(); // fire and forget
  }

  function _restoreFromServer() {
    return _get('/sync').then(function(data) {
      if (!data || data.error || data.empty) return;

      // Write scores
      if (data.scores) {
        for (var key in data.scores) {
          if (data.scores.hasOwnProperty(key)) {
            try { localStorage.setItem(key, JSON.stringify(data.scores[key])); } catch(e) {}
          }
        }
      }
      // Write profile
      if (data.profile) {
        try { localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile)); } catch(e) {}
      }
      // Write badges
      if (data.badges) {
        try { localStorage.setItem(BADGES_KEY, JSON.stringify(data.badges)); } catch(e) {}
      }
      // Write hub streak
      if (data.hubStreak) {
        try { localStorage.setItem(HUB_STREAK_KEY, JSON.stringify(data.hubStreak)); } catch(e) {}
      }
      // Write player name
      if (data.playerName) {
        try { localStorage.setItem(NAME_KEY, data.playerName); } catch(e) {}
        playerName = data.playerName;
      }
    }).catch(function() {});
  }

  function logout() {
    return _post('/auth/logout', {}).then(function() {
      // Clear readable cookie
      document.cookie = 'neon_user=; Path=/; Max-Age=0';
      try { localStorage.removeItem('neonarcade_last_sync'); } catch(e) {}
    }).catch(function() {});
  }
```

- [ ] **Step 2: Add risk-triggered nudge**

```javascript
  var _authNudgeEl = null;

  function _shouldShowAuthNudge() {
    if (isLoggedIn()) return false;
    if (sessionStorage.getItem('neon_auth_nudge_dismissed')) return false;

    var profile = _loadProfile();
    var streak = _loadHubStreak();
    var badges = _loadBadges();
    var badgeCount = 0;
    for (var k in badges) { if (badges.hasOwnProperty(k)) badgeCount++; }

    return (
      (streak.current >= 7) ||
      ((profile.gamesPlayed || []).length >= 5) ||
      (badgeCount >= 3) ||
      (lastGlobalRank >= 1 && lastGlobalRank <= 20)
    );
  }

  function _buildNudgeMessage() {
    var parts = [];
    var streak = _loadHubStreak();
    var badges = _loadBadges();
    var badgeCount = 0;
    for (var k in badges) { if (badges.hasOwnProperty(k)) badgeCount++; }
    var profile = _loadProfile();

    if (streak.current >= 7) parts.push('a ' + streak.current + '-day streak');
    if (badgeCount >= 3) parts.push(badgeCount + ' badges');
    if ((profile.gamesPlayed || []).length >= 5) parts.push((profile.gamesPlayed || []).length + ' games played');

    if (parts.length === 0) return 'Protect your scores across devices.';
    return 'You have ' + parts.join(' and ') + '. Protect your scores?';
  }

  function _showAuthNudge() {
    if (!_shouldShowAuthNudge()) return;
    if (_authNudgeEl) return;

    _authNudgeEl = document.createElement('div');
    _authNudgeEl.className = 'ns-auth-nudge';

    var msg = document.createElement('span');
    msg.className = 'ns-an-msg';
    msg.textContent = '\uD83D\uDEE1\uFE0F ' + _buildNudgeMessage();

    var signIn = document.createElement('a');
    signIn.className = 'ns-an-btn';
    signIn.textContent = 'SIGN IN';
    signIn.href = '/auth/login?return_to=' + encodeURIComponent(window.location.pathname);

    var dismiss = document.createElement('button');
    dismiss.className = 'ns-an-dismiss';
    dismiss.textContent = '\u2715';
    dismiss.addEventListener('click', function() {
      sessionStorage.setItem('neon_auth_nudge_dismissed', '1');
      if (_authNudgeEl) { _authNudgeEl.remove(); _authNudgeEl = null; }
    });

    _authNudgeEl.appendChild(msg);
    _authNudgeEl.appendChild(signIn);
    _authNudgeEl.appendChild(dismiss);
    document.body.appendChild(_authNudgeEl);
  }
```

- [ ] **Step 3: Wire into init() and save()**

In `init()` (around line 51-95), add after `_injectFeedbackBar(cfg.game)` and `_updateProfile()` and `checkBadges()`:

```javascript
    // Restore from server on first login
    if (isLoggedIn()) {
      var params = new URLSearchParams(window.location.search);
      if (params.get('just_logged_in') === '1') {
        _restoreFromServer().then(function() {
          // Clean URL param
          var cleanUrl = window.location.pathname + window.location.search.replace(/[?&]just_logged_in=1/, '');
          if (cleanUrl !== window.location.pathname + window.location.search) {
            try { history.replaceState(null, '', cleanUrl); } catch(e) {}
          }
        });
      }
    }
```

In `save()`, inside the final `.then()` callback (around line 200), after `checkBadges()`:

```javascript
      // Auto-sync if logged in
      _autoSync();

      // Show auth nudge if not logged in and thresholds met
      _showAuthNudge();
```

- [ ] **Step 4: Add CSS for auth nudge**

Add to the styles string in `injectStyles()`:

```javascript
      // Auth nudge
      '.ns-auth-nudge{position:fixed;bottom:0;left:0;right:0;z-index:900;display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 20px;background:#0e0e1a;border-top:1px solid rgba(255,215,0,0.2);font-family:"Rajdhani",sans-serif;animation:nsSlideUp .3s ease}' +
      '@keyframes nsSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}' +
      '.ns-an-msg{color:#9999bb;font-size:14px;letter-spacing:1px}' +
      '.ns-an-btn{font-family:"Orbitron",monospace;font-weight:700;font-size:11px;letter-spacing:2px;padding:8px 20px;border:1px solid #00f0ff;background:rgba(0,240,255,0.06);color:#00f0ff;border-radius:3px;text-decoration:none;text-transform:uppercase;white-space:nowrap}' +
      '.ns-an-btn:hover{background:rgba(0,240,255,0.15)}' +
      '.ns-an-dismiss{background:none;border:none;color:#7a7a9a;font-size:18px;cursor:pointer;padding:4px 8px}' +
```

- [ ] **Step 5: Update return object and NeonScores alias**

Add to both:

```javascript
    isLoggedIn: isLoggedIn,
    getLoggedInName: getLoggedInName,
    syncNow: syncNow,
    logout: logout,
```

- [ ] **Step 6: Verify syntax**

```bash
node -c public/neon.js
```

- [ ] **Step 7: Commit**

```bash
git add public/neon.js
git commit -m "Add auth detection, auto-sync, restore, and risk-triggered nudge to neon.js"
```

---

## Task 4: Profile Page — Login/Logout Section

**Files:**
- Modify: `public/profile/index.html`

- [ ] **Step 1: Add "Protect Your Scores" section**

Read the current profile page. Find the appropriate location (near the top, after the player name header area). Add a section that:

**When NOT logged in** (check `neon_user` cookie via JS):
- Shows a shield emoji (🛡️) and "PROTECT YOUR SCORES" heading
- Text: "Sign in to back up your scores, badges, and streaks across devices. Play anonymously — sign in when ready."
- "SIGN IN" button linking to `/auth/login?return_to=/profile/`
- Subtitle: "Free · No password · Takes 5 seconds"
- Styled with gold accent border

**When logged in:**
- Shows green checkmark (✅) and "SCORES PROTECTED" heading
- Text: "Signed in as j...@example.com" (fetch from `/auth/status`)
- "Last synced: X minutes ago" (read from `neonarcade_last_sync` localStorage)
- "SYNC NOW" button that calls `fetch('/api/sync', { method: 'POST', ... })` with collected localStorage data
- "SIGN OUT" link that calls `fetch('/auth/logout', { method: 'POST' })` then reloads

The login state check is done client-side by reading the `neon_user` cookie:
```javascript
function isLoggedIn() {
  return document.cookie.indexOf('neon_user=') >= 0;
}
```

**Security:** All user-provided text rendered via `textContent`.

- [ ] **Step 2: Verify it loads**

```bash
curl -sL --compressed http://localhost:8777/profile/ | head -5
```

- [ ] **Step 3: Commit**

```bash
git add public/profile/index.html
git commit -m "Add Protect Your Scores login/logout section to profile page"
```

---

## Task 5: Integration — Set Secrets, Deploy, Verify

**Files:**
- All modified files

**Prerequisites:** WorkOS account must be configured before this task. The implementer needs:
- WorkOS Client ID
- WorkOS API Key
- A random 32-char string for SESSION_SECRET

- [ ] **Step 1: Verify syntax**

```bash
node -c public/neon.js && node -c src/worker.js && echo "Both OK"
```

- [ ] **Step 2: Set Cloudflare secrets**

```bash
echo "WORKOS_CLIENT_ID_VALUE" | npx wrangler secret put WORKOS_CLIENT_ID
echo "WORKOS_API_KEY_VALUE" | npx wrangler secret put WORKOS_API_KEY
echo "RANDOM_32_CHAR_STRING" | npx wrangler secret put SESSION_SECRET
```

(Replace with actual values from WorkOS dashboard)

- [ ] **Step 3: Push and deploy**

```bash
git push origin main
npx wrangler deploy
```

- [ ] **Step 4: Verify auth status endpoint (no session)**

```bash
curl -s https://neonarcade.net/auth/status
```

Expected: `{"loggedIn":false}`

- [ ] **Step 5: Verify login redirect**

```bash
curl -sI https://neonarcade.net/auth/login?return_to=/profile/
```

Expected: 302 redirect to `api.workos.com/user_management/authorize?...`

- [ ] **Step 6: Verify sync endpoint rejects unauthenticated requests**

```bash
curl -s https://neonarcade.net/api/sync
```

Expected: `{"error":"not authenticated"}`

- [ ] **Step 7: Full end-to-end test**

1. Open `https://neonarcade.net/profile/` — should show "PROTECT YOUR SCORES" section
2. Play a few games to build up localStorage data
3. Click "SIGN IN" — should redirect to WorkOS AuthKit
4. Sign in with Google or Discord
5. Should redirect back to `/profile/?just_logged_in=1`
6. neon.js should restore server data (if any) and then sync current data
7. Profile should show "SCORES PROTECTED" with email and last sync time
8. Open a game, play it, check that auto-sync fires (network tab shows POST /api/sync)
9. Open incognito, sign in again — verify scores are restored from server
10. Test the risk-triggered nudge: play 5+ games without logging in, verify nudge appears after save
11. Verify nudge disappears after dismissal (doesn't reappear in same session)

- [ ] **Step 8: Commit any fixes**
