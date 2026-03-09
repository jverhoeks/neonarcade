# Security Audit Report — NEON ARCADE

**Date:** 2026-03-09 (updated from 2026-03-07)
**Scope:** Cloudflare Worker backend (src/worker.js), client library (public/neon.js), admin dashboards, security headers (public/_headers), all game HTML files (64 files across 4 categories)
**Auditors:** 3 independent agents + manual review, all converging on same findings

---

## Previous Audit Status (2026-03-07 to 2026-03-09)

### ALL FIXED

| # | Original Issue | Fix |
|---|-------|-----|
| 2 | No score upper bound | KNOWN_GAMES registry with per-game maxScore (worker.js:10-75, enforced at :241) |
| 3 | No rate limiting | Per-IP 30 req/min on all POST endpoints (worker.js:107-115) |
| 4 | Leaderboard mode injection | Server-side mode from KNOWN_GAMES, client param ignored (worker.js:247) |
| 6 | No security headers | CSP, X-Frame-Options: DENY, HSTS, nosniff, Referrer-Policy, Permissions-Policy (_headers) |
| 7 | KV key pollution | All endpoints validate against KNOWN_GAMES allowlist, 404 for unknowns |
| 8 | innerHTML with derived data | All replaced with textContent + createElement. Zero innerHTML assignments remain |
| 9 | Duplicate name flooding | Deduplication by name, best score only (worker.js:249-262) |
| 10 | No error logging | console.error(err) in catch block (worker.js:301) |
| 11 | Name sanitization mismatch | Both client and server: A-Z0-9, 3 chars max |
| 12 | request.json() unguarded | Try/catch with 400 response (worker.js:230-234) |
| 13 | KV JSON.parse unguarded | safeParseArray() helper (worker.js:118-126) |
| 15 | Server accepts score 0 | score <= 0 rejected (worker.js:240) |

### Also fixed in this audit (2026-03-09)

| Issue | Fix |
|-------|-----|
| neon.js JSON.parse on localStorage unguarded | Wrapped in try/catch with [] fallback (neon.js:57) |
| Dead mode parameter sent to API | Removed from submitScore() (neon.js:36-37, :131) |
| Dead esc() function in topscores.html | Removed |
| Pacman-amnesia.html JS syntax error (stray }) | Removed |

### ACCEPTED (will not fix)

| # | Issue | Rationale |
|---|-------|-----------|
| 1 | Race condition in increment() | KV has no atomic increment. Acceptable for analytics counters (undercounting only) |
| 14 | localStorage key injection | All games are same-origin first-party code |

---

## Remaining Open Issues

### HIGH

#### 1. Admin pages publicly accessible
**Files:** public/admin/stats.html, public/admin/topscores.html

No authentication. Anyone can view all game analytics (play counts, likes, issues) and all global leaderboard data (player names + scores).

**Recommendation:** Add Cloudflare Access (Zero Trust) to /admin/* path, or add bearer token check in the Worker.

### MEDIUM

#### 2. CSP allows unsafe-inline for scripts and styles
**File:** public/_headers:7

Required by the single-file HTML architecture (all games use inline script and style). Weakens XSS protection but no injection points exist in the codebase. Accepted trade-off.

#### 3. Rate limiter race condition
**File:** src/worker.js:107-115

Same read-then-write pattern as increment(). Under high concurrency, slightly more than 30 req/min could pass. Still effective against bulk abuse.

**Recommendation:** Accept, or use Cloudflare WAF rate limiting rules for atomic enforcement.

#### 4. CORS processes side effects from any origin
**File:** src/worker.js:77-86

Simple POST requests execute server-side even from non-allowed origins (browser blocks the response, not the request). Any website can trigger play/like counter increments.

**Recommendation:** Check Origin header server-side on POST and reject unknown origins. Low priority since counters are non-critical.

#### 5. Leaderboard read-modify-write race condition
**File:** src/worker.js:222-287

Concurrent submissions to the same game could lose entries. KV limitation.

**Recommendation:** Accept for current scale. Migrate to Durable Objects if precision matters at higher traffic.

### LOW

#### 6. CORS fallback returns production origin for non-matching requests
**File:** src/worker.js:79

Non-browser callers (curl) get Access-Control-Allow-Origin for production even without an Origin header. Not exploitable.

#### 7. Unguarded JSON.parse(localStorage) in some game files
**Files:** bridges.html, tango.html, pairs.html, clickspeed.html, nurikabe.html, chromaself.html, neonarcade/index.html

Some games parse localStorage without try/catch. If data is corrupted, game init crashes. Client-only impact.

**Recommendation:** Add try/catch as time permits. The shared neon.js is now guarded.

---

## Positive Findings

1. Zero eval/Function usage anywhere in the codebase
2. Zero innerHTML assignments -- all DOM rendering uses textContent/createElement
3. No external scripts loaded -- only Google Fonts CSS, everything else is first-party
4. Comprehensive server-side validation: game allowlist, score caps, mode enforcement, name sanitization, rate limiting, deduplication
5. CORS restricted to production domains only
6. Strong security headers: HSTS, X-Frame-Options: DENY, CSP, nosniff, Referrer-Policy, Permissions-Policy
7. No secrets or API keys in client-side code
8. Error handling does not leak stack traces to clients
9. Hash-based challenge links (breakout-architect, wordchain-duel) safely parse data as numeric values only

---

## Summary

| Severity | Open | Fixed | Accepted |
|----------|------|-------|----------|
| CRITICAL | 0 | 4 | 0 |
| HIGH | 1 | 7 | 0 |
| MEDIUM | 3 | 4 | 0 |
| LOW | 2 | 4 | 2 |

**Overall: Strong.** All critical and most high-severity issues are resolved. The single actionable remaining item is admin page authentication (H1). Everything else is architectural trade-offs or minor edge cases.
