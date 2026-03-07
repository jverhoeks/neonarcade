# Security Audit Report — NEON ARCADE

**Date:** 2026-03-07
**Scope:** Cloudflare Worker backend (src/worker.js), client library (neon.js), admin dashboards, game files

---

## CRITICAL

### 1. Race condition in `increment()` — counter manipulation
**File:** `src/worker.js:33-38`

Read-then-write without atomicity. Under concurrent requests, two workers can read the same value and both write `val + 1`, losing increments. KV doesn't support atomic increment natively — acceptable for analytics counters, but be aware of undercounting.

### 2. No score upper bound — leaderboard pollution
**File:** `src/worker.js:136-139`

No maximum score enforced. An attacker can POST `score: 999999999` to any leaderboard and permanently occupy all 20 slots with fake scores. This is the most impactful issue — it can destroy every leaderboard with a simple curl command.

### 3. No rate limiting — abuse of all POST endpoints
**File:** `src/worker.js` (all POST handlers)

No rate limiting on `/api/play`, `/api/like`, `/api/issue`, or `/api/leaderboard`. An attacker can:
- Spam millions of fake plays/likes/issues
- Flood leaderboards with entries
- Drive up Cloudflare KV costs (writes are billed)

### 4. Leaderboard mode injection
**File:** `src/worker.js:149`

Any user can submit to any game with `mode: 'low'`, even for high-score games. This re-sorts the entire leaderboard in ascending order, pushing real high scores to the bottom. The mode should be stored per-game server-side, not trusted from the client.

---

## HIGH

### 5. Admin pages publicly accessible
**Files:** `admin/stats.html`, `admin/topscores.html`

No authentication. Anyone can view internal analytics, all player names/scores, and game popularity data.

### 6. No Content-Security-Policy header
**File:** `_headers`

Only sets `Content-Type`. Missing: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`. Games can be iframed (clickjacking), no XSS mitigation layer, no HSTS.

### 7. KV namespace key pollution
**File:** `src/worker.js`

Any attacker can create arbitrary game slugs by POSTing to `/api/play/anything-they-want`. Creates KV keys like `plays:anything-they-want`, polluting stats and KV storage. No validation that the game actually exists.

---

## MEDIUM

### 8. innerHTML usage with derived data
**Files:** `neonarcade/wordchain.html:1257,1449`, `neongrind/reflex-chain.html:633`

Data derives from internal word lists (not user input), so not currently exploitable. But the pattern is fragile — if the data source ever changes, this becomes XSS.

### 9. Leaderboard allows duplicate name flooding
**File:** `src/worker.js:144`

No deduplication. An attacker can submit 20 entries as "AAA" and fill the entire leaderboard for one name. Should enforce one entry per name (keep best only).

### 10. Error details swallowed with no logging
**File:** `src/worker.js:172-173`

Errors aren't leaked to clients (good), but there's no logging. No visibility into production errors. Add `console.error(err)` for Cloudflare Workers logs.

### 11. Client-side name sanitization mismatch
**Files:** `neon.js:77` vs `src/worker.js:29`

- Client: allows `A-Z0-9`, 3 chars max
- Server: allows `A-Z` only (no digits), 5 chars max

A player entering "A1B" gets "AB" server-side (2 chars), causing confusion or leaderboard issues.

---

## LOW

### 12. `request.json()` not guarded
**File:** `src/worker.js:134`

If body isn't valid JSON, throws and returns generic 500 instead of clear 400.

### 13. `JSON.parse` on KV data not guarded
**File:** `src/worker.js:142,166`

If KV data gets corrupted, `JSON.parse` throws. Leaderboard requests fail with 500 until manually fixed.

### 14. `localStorage` key injection
**File:** `neon.js:54`

A game passing an unusual `key` value could overwrite another game's localStorage. Low risk since all games are same-origin first-party code.

### 15. Server still accepts score of 0
**File:** `src/worker.js:139`

For time-based puzzles, 0 seconds is impossible. Client-side fix added but server still accepts `score: 0`.

---

## Summary & Recommendations

| Priority | Issue | Fix | Effort |
|----------|-------|-----|--------|
| CRITICAL | No score upper bound | Add max score cap per game server-side | Small |
| CRITICAL | Mode injection | Store mode per game server-side, don't trust client | Small |
| CRITICAL | No rate limiting | Add per-IP rate limiting in worker | Medium |
| HIGH | Admin pages public | Add auth or IP-restrict admin pages | Small |
| HIGH | No security headers | Add CSP, X-Frame-Options, HSTS to `_headers` | Small |
| HIGH | KV key pollution | Validate game slug against known game list | Small |
| MEDIUM | innerHTML usage | Replace with textContent + DOM creation | Small |
| MEDIUM | Duplicate name flooding | Deduplicate leaderboard entries per name | Small |
| MEDIUM | Name sanitization mismatch | Align client and server (allow A-Z0-9, 3 chars) | Small |
| MEDIUM | No error logging | Add console.error in catch block | Trivial |
| LOW | request.json() unguarded | Wrap in try/catch with 400 response | Trivial |
| LOW | KV JSON.parse unguarded | Add try/catch with fallback to empty array | Trivial |
| LOW | Server accepts score 0 | Add `score < 1` check for 'low' mode games | Trivial |
