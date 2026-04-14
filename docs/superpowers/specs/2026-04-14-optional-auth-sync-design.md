# NEON ARCADE — Optional Auth & Score Sync Design

**Date:** 2026-04-14
**Status:** Approved
**Scope:** Optional WorkOS AuthKit login (Google + Discord), server-side score backup, cross-device sync, risk-triggered nudge

---

## Goal

Let players protect their scores, badges, and streaks by optionally signing in with Google or Discord. Playing anonymously (localStorage) remains the default — auth is never required. Once logged in, data syncs to Cloudflare KV and can be restored on any device.

## Principles

1. **Zero friction by default** — no login walls, no prompts on first visit
2. **Nudge when it matters** — prompt only when the player has something worth protecting
3. **Sync, don't migrate** — localStorage remains the source of truth during gameplay. Server is a backup that merges on sync.
4. **No passwords** — WorkOS AuthKit handles Google + Discord OAuth. No email/password forms, no "forgot password" flows.

---

## 1. WorkOS AuthKit Integration

### How WorkOS Works

WorkOS AuthKit provides a hosted login page. The flow:
1. Player clicks "Sign In" → redirected to `https://authkit.{app}.com`
2. Player picks Google or Discord → WorkOS handles the entire OAuth flow
3. WorkOS redirects back to `https://neonarcade.net/auth/callback?code=...`
4. Worker exchanges the code via WorkOS REST API → gets user info
5. Worker creates a session, sets cookies, redirects player back

**WorkOS handles:** OAuth redirect, token exchange, user directory, provider management.
**We handle:** Session cookies, KV storage, score sync, nudge logic.

### WorkOS Configuration (one-time manual setup)

1. Create WorkOS account at workos.com (free, 1M MAU)
2. Create an application in the WorkOS dashboard
3. Enable social providers: Google, Discord (toggle switches — no Google Cloud Console needed)
4. Set redirect URI: `https://neonarcade.net/auth/callback`
5. Copy: Client ID, API Key

### Worker Environment Variables

Store as Cloudflare secrets (not in code):
- `WORKOS_CLIENT_ID` — from WorkOS dashboard
- `WORKOS_API_KEY` — from WorkOS dashboard
- `SESSION_SECRET` — random 32-char string for cookie signing

Configure in wrangler.toml:
```toml
[vars]
WORKOS_CLIENT_ID = "" # Set via wrangler secret put

# Secrets set via: wrangler secret put WORKOS_API_KEY
# Secrets set via: wrangler secret put SESSION_SECRET
```

---

## 2. Auth Endpoints (worker.js)

### GET /auth/login

Redirects the player to WorkOS AuthKit.

```
GET /auth/login?return_to=/profile/
→ 302 Redirect to https://api.workos.com/user_management/authorize?
    client_id={WORKOS_CLIENT_ID}
    &redirect_uri=https://neonarcade.net/auth/callback
    &response_type=code
    &provider=authkit
    &state={return_to_encoded}
```

The `state` parameter carries the `return_to` URL so the callback knows where to send the player after login. State is base64-encoded JSON: `{ returnTo: "/profile/" }`.

### GET /auth/callback

Exchanges the WorkOS code for user info and creates a session.

```
GET /auth/callback?code=...&state=...

Worker:
1. POST https://api.workos.com/user_management/authenticate
   Body: { code, client_id, grant_type: "authorization_code" }
   Headers: Authorization: Bearer {WORKOS_API_KEY}

2. Response: { user: { id, email, first_name, last_name, profile_picture_url } }

3. Generate session ID: 32-char random hex via crypto.getRandomValues()

4. Store in KV:
   Key: session:{sessionId}
   Value: { userId: user.id, email: user.email, name: user.first_name, ts: Date.now() }
   TTL: 2592000 (30 days)

5. Set cookies:
   - neon_session={sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
   - neon_user={first_name_3chars}; Secure; SameSite=Lax; Path=/; Max-Age=2592000
     (readable by JS for UI — not HttpOnly)

6. Decode state → get returnTo URL
7. 302 Redirect to returnTo (default: /)
```

The `neon_user` cookie is a readable flag that neon.js checks to know if the player is logged in. It contains only the 3-char display name — no sensitive data.

### POST /auth/logout

Clears the session.

```
POST /auth/logout

Worker:
1. Read neon_session cookie
2. Delete session:{sessionId} from KV
3. Clear both cookies (Max-Age=0)
4. Return { ok: true }
```

### GET /auth/status

Returns current auth state (called by neon.js on init).

```
GET /auth/status

Worker:
1. Read neon_session cookie
2. Look up session:{sessionId} in KV
3. If valid: return { loggedIn: true, name: "JON", email: "j...@example.com" }
4. If not: return { loggedIn: false }
```

Email is partially masked in the response (first char + ... + @domain) for display purposes.

---

## 3. Sync Endpoints (worker.js)

### POST /api/sync — Upload localStorage to server

Called automatically by neon.js after every `Neon.save()` when logged in. Also callable manually via "SYNC NOW" button.

```
POST /api/sync
Headers: Cookie: neon_session=...
Body: {
  playerName: "JON",
  profile: { firstVisit: "2026-04-14", gamesPlayed: [...], challengeWins: 3, ... },
  badges: { first_daily: { earned: "2026-04-14", seen: true }, ... },
  hubStreak: { current: 14, best: 21, lastPlayed: "2026-04-14", ... },
  scores: {
    "neonarcade_scores_sudoku_easy": [{ score: 142, ts: 1713020000, name: "JON" }, ...],
    "neonarcade_neonmind_queens_scores_7": [...],
    ...
  }
}

Worker:
1. Validate session from cookie
2. Read existing user data from KV: user:{userId}
3. Merge:
   - scores: for each key, union both arrays by timestamp, deduplicate, keep top 10 per key
   - badges: union (keep earliest earned date)
   - profile.gamesPlayed: union arrays
   - profile.challengeWins/Losses: keep max of local vs server
   - hubStreak: keep higher current/best values; keep most recent lastPlayed
   - playerName: prefer client value (player may have changed it)
4. Write merged data to KV: user:{userId} (no TTL — permanent)
5. Return { ok: true, lastSync: "2026-04-14T12:00:00Z" }
```

**Rate limiting:** Max 1 sync per 10 seconds per session (to prevent spam from rapid save() calls). Use a KV key `sync_throttle:{sessionId}` with 10s TTL.

**Size limit:** Request body max 512KB. This covers even a player with scores across all 72 games.

### GET /api/sync — Download server data to device

Called when a player logs in on a new device.

```
GET /api/sync
Headers: Cookie: neon_session=...

Worker:
1. Validate session from cookie
2. Read user:{userId} from KV
3. Return the full data object (same structure as POST body)
4. Client writes each key to localStorage
```

---

## 4. neon.js Changes

### Session Detection

On `init()`, check for the readable `neon_user` cookie:

```javascript
function _isLoggedIn() {
  return document.cookie.indexOf('neon_user=') >= 0;
}

function _getLoggedInName() {
  var match = document.cookie.match(/neon_user=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
```

### Auto-Sync After Save

In `save()`, after all existing async work, if logged in:

```javascript
// Fire-and-forget sync — never blocks game flow
if (_isLoggedIn()) {
  _syncToServer();
}
```

`_syncToServer()` collects all relevant localStorage keys and POSTs to `/api/sync`. Throttled to max once per 30 seconds client-side (tracked via a timestamp variable, not localStorage).

```javascript
var _lastSyncTime = 0;

function _syncToServer() {
  var now = Date.now();
  if (now - _lastSyncTime < 30000) return; // throttle: 30s
  _lastSyncTime = now;

  var data = _collectSyncData();
  _post('/sync', data).catch(function() {}); // fire and forget
}
```

### Collecting Sync Data

```javascript
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
    playerName: localStorage.getItem('neonarcade_player_name') || '',
    profile: _loadProfile(),
    badges: _loadBadges(),
    hubStreak: _loadHubStreak(),
    scores: scores,
  };
}
```

### Restore From Server

Called once after login callback redirects back:

```javascript
function _restoreFromServer() {
  return _get('/sync').then(function(data) {
    if (!data || data.error) return;

    // Write scores
    if (data.scores) {
      for (var key in data.scores) {
        if (data.scores.hasOwnProperty(key)) {
          localStorage.setItem(key, JSON.stringify(data.scores[key]));
        }
      }
    }

    // Write profile, badges, streak
    if (data.profile) localStorage.setItem('neonarcade_profile', JSON.stringify(data.profile));
    if (data.badges) localStorage.setItem('neonarcade_badges', JSON.stringify(data.badges));
    if (data.hubStreak) localStorage.setItem('neonarcade_daily_hub_streak', JSON.stringify(data.hubStreak));
    if (data.playerName) localStorage.setItem('neonarcade_player_name', data.playerName);
  });
}
```

Called on `init()` if logged in AND a `neon_just_logged_in` sessionStorage flag is set (flag set by the callback redirect, cleared after restore).

### Risk-Triggered Nudge

After `Neon.save()`, if NOT logged in, evaluate thresholds:

```javascript
function _shouldShowAuthNudge() {
  if (_isLoggedIn()) return false;
  if (sessionStorage.getItem('neon_auth_nudge_dismissed')) return false;

  var profile = _loadProfile();
  var streak = _loadHubStreak();
  var badges = _loadBadges();
  var badgeCount = Object.keys(badges).length;

  return (
    (streak.current >= 7) ||
    ((profile.gamesPlayed || []).length >= 5) ||
    (badgeCount >= 3) ||
    (lastGlobalRank >= 1 && lastGlobalRank <= 20)
  );
}
```

If true, show a bottom bar:

```
🛡️ You have a 14-day streak and 8 badges. Protect your scores?  [SIGN IN]  [✕]
```

- Non-blocking, fixed to bottom of screen
- Dismiss button sets `sessionStorage` flag (won't show again this session)
- "SIGN IN" links to `/auth/login?return_to={currentPage}`
- Shows once per session max
- Personalized message based on what the player has (streak, badges, games played)

### New CSS

```css
.ns-auth-nudge { position: fixed; bottom: 0; left: 0; right: 0; z-index: 900; ... }
```

Styled as a dark bar with gold border-top, Rajdhani text, "SIGN IN" button in cyan.

### New Public Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `Neon.isLoggedIn()` | `boolean` | Check if player has active session |
| `Neon.getLoggedInName()` | `string\|null` | Get logged-in display name |
| `Neon.syncNow()` | `Promise` | Manually trigger sync |
| `Neon.logout()` | `Promise` | POST /auth/logout + clear cookies |

---

## 5. Profile Page Changes

### Not Logged In State

Add a "PROTECT YOUR SCORES" card section:

```
┌─────────────────────────────────────────┐
│  🛡️ PROTECT YOUR SCORES                │
│                                         │
│  Sign in to back up your scores,        │
│  badges, and streaks across devices.    │
│  Play anonymously — sign in when ready. │
│                                         │
│  [🔵 SIGN IN WITH GOOGLE]              │
│  [🟣 SIGN IN WITH DISCORD]             │
│                                         │
│  Free • No password • Takes 5 seconds   │
└─────────────────────────────────────────┘
```

Both buttons link to `/auth/login?return_to=/profile/`. WorkOS handles provider selection on their page, but we can deep-link to a specific provider if WorkOS supports it (otherwise both go to the same AuthKit page).

### Logged In State

Replace the card with:

```
┌─────────────────────────────────────────┐
│  ✅ SCORES PROTECTED                    │
│                                         │
│  Signed in as jon@gm...com (Google)     │
│  Last synced: 2 minutes ago             │
│                                         │
│  [SYNC NOW]          [SIGN OUT]         │
└─────────────────────────────────────────┘
```

- "SYNC NOW" calls `Neon.syncNow()`
- "SIGN OUT" calls `Neon.logout()` then reloads

---

## 6. Data Model

### KV Keys

| Pattern | TTL | Description |
|---------|-----|-------------|
| `session:{id}` | 30 days | Session data: userId, email, name, timestamp |
| `user:{workosUserId}` | none (permanent) | Full synced data: scores, badges, profile, streak |
| `sync_throttle:{sessionId}` | 10s | Rate limit guard for sync endpoint |

### User Data Structure

```json
{
  "email": "jon@example.com",
  "name": "JON",
  "provider": "google",
  "data": {
    "playerName": "JON",
    "profile": {
      "firstVisit": "2026-04-14",
      "gamesPlayed": ["sudoku", "queens", "neon-snake"],
      "challengeWins": 3,
      "challengeLosses": 1,
      "topPercentiles": { "sudoku": 7, "queens": 12 }
    },
    "badges": {
      "first_daily": { "earned": "2026-04-14", "seen": true },
      "streak7": { "earned": "2026-04-20", "seen": true }
    },
    "hubStreak": {
      "current": 14,
      "best": 21,
      "lastPlayed": "2026-04-14",
      "perfectCurrent": 7,
      "perfectBest": 12,
      "lastPerfect": "2026-04-14"
    },
    "scores": {
      "neonarcade_scores_sudoku_easy": [
        { "score": 142, "ts": 1713020000000, "name": "JON" }
      ]
    }
  },
  "lastSync": "2026-04-14T12:00:00Z"
}
```

### Merge Strategy

When syncing (POST /api/sync), the server merges client data with existing server data:

| Field | Merge Rule |
|-------|-----------|
| `scores[key]` | Union both arrays by `ts` field, deduplicate, sort by mode, keep top 10 |
| `badges` | Union keys, keep earliest `earned` date per badge |
| `profile.gamesPlayed` | Union arrays (deduplicate) |
| `profile.challengeWins` | Keep max(client, server) |
| `profile.challengeLosses` | Keep max(client, server) |
| `profile.topPercentiles[game]` | Keep min(client, server) — lower percentile = better rank |
| `profile.firstVisit` | Keep earliest date |
| `hubStreak.current` | Keep max(client, server) |
| `hubStreak.best` | Keep max(client, server) |
| `hubStreak.lastPlayed` | Keep most recent date |
| `playerName` | Prefer client value |

---

## 7. Security Considerations

- **Session cookie is HttpOnly** — not accessible to JavaScript, prevents XSS token theft
- **neon_user cookie is NOT HttpOnly** — readable by JS, contains only display name (no sensitive data)
- **SameSite=Lax** — prevents CSRF for POST endpoints (browser won't send cookie on cross-origin POST)
- **WorkOS API key** is a Cloudflare secret — never exposed to client
- **Sync endpoint validates session** — no auth = 401
- **Sync data is validated** — reject payloads > 512KB, validate structure
- **Rate limiting** — existing POST rate limiter covers auth endpoints; sync has additional 10s throttle
- **No passwords stored** — WorkOS handles all credential management

---

## 8. Files Changed

| File | Action | What |
|------|--------|------|
| `src/worker.js` | Modify | Auth endpoints (login, callback, logout, status), sync endpoints (POST/GET), session management |
| `public/neon.js` | Modify | Session detection, auto-sync, risk-triggered nudge, restore from server, new public methods |
| `public/profile/index.html` | Modify | "Protect Your Scores" section with login/logout states |
| `wrangler.toml` | Modify | Add WorkOS secret references |

---

## 9. Out of Scope

- Email/password login (WorkOS supports it but adds friction)
- Magic links (nice-to-have for later)
- Push notifications (requires service worker, separate feature)
- Apple Sign-In (can toggle on in WorkOS dashboard later)
- Account deletion UI (can be manual/email-based initially)
- Two-factor authentication (overkill for a game site)
