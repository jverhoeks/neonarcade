// NEON ARCADE — API Worker
// Handles /api/* routes, falls through to static assets for everything else

const ALLOWED_ORIGINS = [
  'https://neonarcade.net',
  'https://www.neonarcade.net',
];

// Known games registry: mode + maxScore per game slug
const KNOWN_GAMES = {
  // NEON ARCADE (mode: high)
  'neon-snake':          { mode: 'high', maxScore: 100000 },
  'impostor-pixel':      { mode: 'high', maxScore: 100000 },
  'catalyst':            { mode: 'high', maxScore: 100000 },
  'pong-both-sides':     { mode: 'high', maxScore: 100000 },
  'afterglow':           { mode: 'high', maxScore: 100000 },
  'flappy-rewind':       { mode: 'high', maxScore: 100000 },
  'palette':             { mode: 'high', maxScore: 100000 },
  'pacman-amnesia':      { mode: 'high', maxScore: 100000 },
  'territory':           { mode: 'high', maxScore: 64 },
  'signal':              { mode: 'high', maxScore: 10000 },
  'burndown':            { mode: 'high', maxScore: 100000 },
  'mine-finder':         { mode: 'high', maxScore: 100000 },
  'tetris-betrayal':     { mode: 'high', maxScore: 100000 },
  'faultline':           { mode: 'high', maxScore: 10000 },
  'wordchain':           { mode: 'high', maxScore: 100000 },
  'wordchain-duel':      { mode: 'high', maxScore: 100000 },
  'split-second':        { mode: 'high', maxScore: 100000 },
  'chromaself':          { mode: 'high', maxScore: 100000 },
  'curfew':              { mode: 'high', maxScore: 100000 },
  'truecolor':           { mode: 'high', maxScore: 10000 },
  'gridlock':            { mode: 'high', maxScore: 100000 },
  'doodle-drop':         { mode: 'high', maxScore: 100000 },
  'breakout-architect':  { mode: 'high', maxScore: 100000 },
  'chimp':               { mode: 'high', maxScore: 100 },
  'clickspeed-standard': { mode: 'high', maxScore: 500 },
  'clickspeed-precision':{ mode: 'high', maxScore: 500 },
  'clickspeed-burst':    { mode: 'high', maxScore: 500 },
  'pour':                { mode: 'high', maxScore: 100000 },
  'bloomfield':          { mode: 'high', maxScore: 100 },
  'typeblitz':           { mode: 'high', maxScore: 5000 },
  'veto':                { mode: 'high', maxScore: 100 },
  'mimic':               { mode: 'high', maxScore: 100 },

  // NEON GRIND (mode: high)
  'mathblitz':           { mode: 'high', maxScore: 100000 },
  'reflex-chain':        { mode: 'high', maxScore: 100000 },
  'neurosort':           { mode: 'high', maxScore: 100000 },
  'colorname':           { mode: 'high', maxScore: 1000 },
  'numbersense':         { mode: 'high', maxScore: 2000 },
  'gridmatch':           { mode: 'high', maxScore: 1000 },
  'sequencer':           { mode: 'high', maxScore: 100000 },

  // NEON MIND (mode: low — time-based puzzles)
  'sudoku':              { mode: 'low', maxScore: 86400 },
  'minisudoku':          { mode: 'low', maxScore: 86400 },
  'queens':              { mode: 'low', maxScore: 86400 },
  'minesweeper':         { mode: 'low', maxScore: 86400 },
  'kakuro':              { mode: 'low', maxScore: 86400 },
  'nonogram':            { mode: 'low', maxScore: 86400 },
  'nurikabe':            { mode: 'low', maxScore: 86400 },
  'bridges':             { mode: 'low', maxScore: 86400 },
  'tango':               { mode: 'low', maxScore: 86400 },
  'lightup':             { mode: 'low', maxScore: 86400 },
  'tents':               { mode: 'low', maxScore: 86400 },
  'skyscrapers':         { mode: 'low', maxScore: 86400 },
  'priorself':           { mode: 'low', maxScore: 86400 },
  'connections':         { mode: 'low', maxScore: 86400 },
  'hitori':              { mode: 'low', maxScore: 86400 },
  'kenken':              { mode: 'low', maxScore: 86400 },
  'culprit':             { mode: 'low', maxScore: 86400 },
  'faction':             { mode: 'high', maxScore: 9000 },

  // NEON WORLD (mode: high — score-based)
  'decade':              { mode: 'high', maxScore: 5000 },
  'style':               { mode: 'high', maxScore: 1500 },

  // NEON QUEST (longer-session deep games, mode: high)
  'fusion':              { mode: 'high', maxScore: 10000000 },
  'jackpot':             { mode: 'high', maxScore: 100000 },
  'firewall':            { mode: 'high', maxScore: 100000 },
  'swarm':               { mode: 'high', maxScore: 100000 },
  'synthesis':           { mode: 'high', maxScore: 10000 },

  // NEON CLASSIC (retro games, mode: high)
  'invaders':            { mode: 'high', maxScore: 1000000 },
  'breakout':            { mode: 'high', maxScore: 1000000 },
  'tetris':              { mode: 'high', maxScore: 1000000 },
  '2048':                { mode: 'high', maxScore: 10000000 },
  'pairs':               { mode: 'low', maxScore: 86400 },
  'asteroids':           { mode: 'high', maxScore: 1000000 },
  'frogger':             { mode: 'high', maxScore: 1000000 },
  'battleship':          { mode: 'low', maxScore: 200 },
  'tictactoe':           { mode: 'high', maxScore: 10000 },

  // NEON CASINO (mode: high — bankroll-based)
  'blackjack':           { mode: 'high', maxScore: 1000000 },
  'poker':               { mode: 'high', maxScore: 1000000 },
  'roulette':            { mode: 'high', maxScore: 1000000 },
  'slots':               { mode: 'high', maxScore: 1000000 },
  'video-poker':         { mode: 'high', maxScore: 1000000 },
};

function isAllowedOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  // Same-origin requests (e.g. fetch from neonarcade.net) may not send Origin header
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return { 'Vary': 'Origin' };
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

// Sanitize game slug: only allow lowercase alphanumeric + hyphens
function sanitizeGame(game) {
  return (game || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50);
}

// Sanitize 3-char name: uppercase, letters + digits only
function sanitizeName(name) {
  return (name || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
}

// Atomic increment using KV
async function increment(kv, key) {
  const val = parseInt(await kv.get(key) || '0', 10);
  const next = val + 1;
  await kv.put(key, String(next));
  return next;
}

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

// Per-IP rate limiting: 30 requests/minute across all POST endpoints
async function checkRateLimit(kv, request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const minute = Math.floor(Date.now() / 60000);
  const key = `ratelimit:${ip}:${minute}`;
  const current = parseInt(await kv.get(key) || '0', 10);
  if (current >= 30) return false;
  await kv.put(key, String(current + 1), { expirationTtl: 60 });
  return true;
}

// Generate a random 4-letter uppercase room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * 26)];
  }
  return code;
}

// Generate a random token string
function generateToken() {
  return Math.random().toString(36).slice(2, 14);
}

// Generate a random 6-char alphanumeric challenge code (uppercase + digits)
function generateChallengeCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * 36)];
  }
  return code;
}

// Sanitize room code: uppercase A-Z only, exactly 4 chars
function sanitizeRoomCode(code) {
  if (typeof code !== 'string') return null;
  const cleaned = code.toUpperCase().replace(/[^A-Z]/g, '');
  return cleaned.length === 4 ? cleaned : null;
}

// Safe JSON parse from KV with fallback (object version)
function safeParseObject(data) {
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : null;
  } catch {
    return null;
  }
}

// Safe JSON parse from KV with fallback
function safeParseArray(data) {
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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
  return safeParseObject(await kv.get(`session:${sessionId}`));
}

// Create redirect response with login cookies (uses Headers.append for multiple Set-Cookie)
function makeRedirectWithCookies(url, sessionId, displayName) {
  const headers = new Headers({ 'Location': url });
  headers.append('Set-Cookie', `neon_session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`);
  headers.append('Set-Cookie', `neon_user=${encodeURIComponent(displayName)}; Secure; SameSite=Lax; Path=/; Max-Age=2592000`);
  return new Response(null, { status: 302, headers });
}

// Merge sync data: client + server → merged
function mergeSyncData(client, server) {
  if (!server) return client;
  if (!client) return server;
  const merged = {};

  merged.playerName = client.playerName || server.playerName || '';

  // Profile
  const cp = client.profile || {};
  const sp = server.profile || {};
  merged.profile = {
    firstVisit: (cp.firstVisit && sp.firstVisit) ? (cp.firstVisit < sp.firstVisit ? cp.firstVisit : sp.firstVisit) : (cp.firstVisit || sp.firstVisit || ''),
    gamesPlayed: [...new Set([...(cp.gamesPlayed || []), ...(sp.gamesPlayed || [])])],
    challengeWins: Math.max(cp.challengeWins || 0, sp.challengeWins || 0),
    challengeLosses: Math.max(cp.challengeLosses || 0, sp.challengeLosses || 0),
    topPercentiles: {},
  };
  const allPctKeys = new Set([...Object.keys(cp.topPercentiles || {}), ...Object.keys(sp.topPercentiles || {})]);
  for (const g of allPctKeys) {
    const cv = (cp.topPercentiles || {})[g];
    const sv = (sp.topPercentiles || {})[g];
    merged.profile.topPercentiles[g] = (cv !== undefined && sv !== undefined) ? Math.min(cv, sv) : (cv !== undefined ? cv : sv);
  }

  // Badges: union, keep earliest earned
  merged.badges = {};
  const allBadgeKeys = new Set([...Object.keys(client.badges || {}), ...Object.keys(server.badges || {})]);
  for (const id of allBadgeKeys) {
    const cb = (client.badges || {})[id];
    const sb = (server.badges || {})[id];
    if (cb && sb) {
      merged.badges[id] = { earned: cb.earned < sb.earned ? cb.earned : sb.earned, seen: true };
    } else {
      merged.badges[id] = cb || sb;
    }
  }

  // Hub streak: keep higher/more recent
  const cs = client.hubStreak || {};
  const ss = server.hubStreak || {};
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
  const allScoreKeys = new Set([...Object.keys(client.scores || {}), ...Object.keys(server.scores || {})]);
  for (const key of allScoreKeys) {
    const ca = (client.scores || {})[key] || [];
    const sa = (server.scores || {})[key] || [];
    const byTs = {};
    [...ca, ...sa].forEach(entry => { if (entry && entry.ts) byTs[entry.ts] = entry; });
    const combined = Object.values(byTs);
    combined.sort((a, b) => b.score - a.score);
    merged.scores[key] = combined.slice(0, 10);
  }

  return merged;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request);
    const json = (data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ─── Auth Routes ─────────────────────────────────────────────────
    if (url.pathname.startsWith('/auth/')) {
      const authPath = url.pathname.slice(6);

      // GET /auth/login — redirect to WorkOS AuthKit
      if (request.method === 'GET' && authPath === 'login') {
        const returnTo = url.searchParams.get('return_to') || '/';
        const state = btoa(JSON.stringify({ returnTo }));
        const workosUrl = 'https://api.workos.com/user_management/authorize?' +
          'client_id=' + encodeURIComponent(env.WORKOS_CLIENT_ID || '') +
          '&redirect_uri=' + encodeURIComponent('https://neonarcade.net/auth/callback') +
          '&response_type=code&provider=authkit' +
          '&state=' + encodeURIComponent(state);
        return Response.redirect(workosUrl, 302);
      }

      // GET /auth/callback — exchange code, create session
      if (request.method === 'GET' && authPath === 'callback') {
        const code = url.searchParams.get('code');
        const stateParam = url.searchParams.get('state');
        if (!code) return new Response('Missing code', { status: 400 });

        const tokenRes = await fetch('https://api.workos.com/user_management/authenticate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (env.WORKOS_API_KEY || ''),
          },
          body: JSON.stringify({
            code,
            client_id: env.WORKOS_CLIENT_ID || '',
            client_secret: env.WORKOS_API_KEY || '',
            grant_type: 'authorization_code',
          }),
        });

        if (!tokenRes.ok) {
          const errBody = await tokenRes.text();
          console.error('WorkOS auth failed:', tokenRes.status, errBody);
          return new Response('Auth failed: ' + tokenRes.status + ' ' + errBody, { status: 401 });
        }

        const tokenData = await tokenRes.json();
        const user = tokenData.user;
        if (!user || !user.id) return new Response('Invalid user data', { status: 401 });

        const sessionId = generateSessionId();
        const displayName = sanitizeName(user.first_name || (user.email || '').split('@')[0] || 'PLR');
        const session = {
          userId: user.id,
          email: user.email || '',
          name: displayName,
          provider: user.provider || 'unknown',
          created: Date.now(),
        };
        await env.GAME_DATA.put(`session:${sessionId}`, JSON.stringify(session), { expirationTtl: 2592000 });

        let returnTo = '/';
        try {
          const stateObj = JSON.parse(atob(stateParam || ''));
          if (stateObj.returnTo && stateObj.returnTo.startsWith('/')) returnTo = stateObj.returnTo;
        } catch(e) {}

        const redirectUrl = returnTo + (returnTo.indexOf('?') >= 0 ? '&' : '?') + 'just_logged_in=1';
        return makeRedirectWithCookies(redirectUrl, sessionId, displayName);
      }

      // POST /auth/logout — clear session
      if (request.method === 'POST' && authPath === 'logout') {
        const sessionId = getCookie(request, 'neon_session');
        if (sessionId) await env.GAME_DATA.delete(`session:${sessionId}`);
        const headers = new Headers({ 'Content-Type': 'application/json' });
        headers.append('Set-Cookie', 'neon_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
        headers.append('Set-Cookie', 'neon_user=; Secure; SameSite=Lax; Path=/; Max-Age=0');
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
      }

      // GET /auth/status — check if logged in
      if (request.method === 'GET' && authPath === 'status') {
        const session = await getSession(request, env.GAME_DATA);
        if (session) {
          const email = session.email || '';
          const atIdx = email.indexOf('@');
          const masked = atIdx > 1 ? email[0] + '...' + email.slice(atIdx) : email;
          return json({ loggedIn: true, name: session.name, email: masked, provider: session.provider });
        }
        return json({ loggedIn: false });
      }

      return new Response('Not found', { status: 404 });
    }

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

          const assetResponse = await env.ASSETS.fetch(new Request(url.origin + '/c/', request));
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
      return env.ASSETS.fetch(new Request(url.origin + '/c/', request));
    }

    // Only handle /api/ routes
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    const path = url.pathname.replace('/api/', '');
    const segments = path.split('/').filter(Boolean);

    try {
      // Reject POST requests from unknown origins
      if (request.method === 'POST' && !isAllowedOrigin(request)) {
        return json({ error: 'forbidden' }, 403);
      }

      // Rate limit all POST requests
      if (request.method === 'POST') {
        const allowed = await checkRateLimit(env.GAME_DATA, request);
        if (!allowed) return json({ error: 'rate limit exceeded' }, 429);
      }

      // POST /api/play/:game — increment play count + daily plays
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

      // POST /api/like/:game — increment likes
      if (request.method === 'POST' && segments[0] === 'like' && segments[1]) {
        const game = sanitizeGame(segments[1]);
        if (!game || !KNOWN_GAMES[game]) return json({ error: 'unknown game' }, 404);
        const likes = await increment(env.GAME_DATA, `likes:${game}`);
        return json({ game, likes });
      }

      // POST /api/issue/:game — increment issues
      if (request.method === 'POST' && segments[0] === 'issue' && segments[1]) {
        const game = sanitizeGame(segments[1]);
        if (!game || !KNOWN_GAMES[game]) return json({ error: 'unknown game' }, 404);
        const issues = await increment(env.GAME_DATA, `issues:${game}`);
        return json({ game, issues });
      }

      // GET /api/stats — all game stats
      if (request.method === 'GET' && segments[0] === 'stats' && !segments[1]) {
        const list = await env.GAME_DATA.list({ prefix: 'plays:' });
        const games = {};
        for (const key of list.keys) {
          const game = key.name.replace('plays:', '');
          games[game] = { plays: 0, likes: 0, issues: 0 };
        }
        for (const game of Object.keys(games)) {
          const [plays, likes, issues] = await Promise.all([
            env.GAME_DATA.get(`plays:${game}`),
            env.GAME_DATA.get(`likes:${game}`),
            env.GAME_DATA.get(`issues:${game}`),
          ]);
          games[game] = {
            plays: parseInt(plays || '0', 10),
            likes: parseInt(likes || '0', 10),
            issues: parseInt(issues || '0', 10),
          };
        }
        return json({ games });
      }

      // GET /api/stats/:game — single game stats (with daily plays)
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

      // POST /api/leaderboard/:game — submit score
      if (request.method === 'POST' && segments[0] === 'leaderboard' && segments[1]) {
        const game = sanitizeGame(segments[1]);
        if (!game || !KNOWN_GAMES[game]) return json({ error: 'unknown game' }, 404);

        const gameConfig = KNOWN_GAMES[game];

        // Safe JSON parse of request body
        let body;
        try {
          body = await request.json();
        } catch {
          return json({ error: 'invalid JSON body' }, 400);
        }

        const name = sanitizeName(body.name);
        const score = parseInt(body.score, 10);

        if (!name || name.length < 1) return json({ error: 'name required (1-3 alphanumeric chars)' }, 400);
        if (isNaN(score) || score <= 0) return json({ error: 'valid score required (> 0)' }, 400);
        if (score > gameConfig.maxScore) return json({ error: 'score exceeds maximum' }, 400);

        const key = `lb:${game}`;
        const existing = safeParseArray(await env.GAME_DATA.get(key));

        // Use mode from registry, not from client
        const mode = gameConfig.mode;

        // Deduplicate: keep only best score per name
        const byName = {};
        for (const entry of existing) {
          const n = entry.name;
          if (!byName[n]) {
            byName[n] = entry;
          } else {
            if (mode === 'low') {
              if (entry.score < byName[n].score) byName[n] = entry;
            } else {
              if (entry.score > byName[n].score) byName[n] = entry;
            }
          }
        }

        // Insert or update new submission
        const newEntry = { name, score, ts: Date.now() };
        if (!byName[name]) {
          byName[name] = newEntry;
        } else {
          if (mode === 'low') {
            if (score < byName[name].score) byName[name] = newEntry;
          } else {
            if (score > byName[name].score) byName[name] = newEntry;
          }
        }

        // Sort and keep top 20
        const sorted = Object.values(byName);
        if (mode === 'low') {
          sorted.sort((a, b) => a.score - b.score);
        } else {
          sorted.sort((a, b) => b.score - a.score);
        }

        const top = sorted.slice(0, 20);
        await env.GAME_DATA.put(key, JSON.stringify(top));

        return json({ game, leaderboard: top });
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

      // GET /api/leaderboard/:game — get leaderboard
      if (request.method === 'GET' && segments[0] === 'leaderboard' && segments[1]) {
        const game = sanitizeGame(segments[1]);
        if (!game || !KNOWN_GAMES[game]) return json({ error: 'unknown game' }, 404);
        const data = safeParseArray(await env.GAME_DATA.get(`lb:${game}`));
        return json({ game, leaderboard: data });
      }

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

      // ─── Score Distribution & Percentile Endpoints ─────────────────

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
          const count = parseInt(await env.GAME_DATA.get(countKey) || '0', 10);
          return json({ count, date: today });
        }

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

      // ─── Sync Endpoints ───────────────────────────────────────────

      // POST /api/sync — upload localStorage data to server
      if (request.method === 'POST' && segments[0] === 'sync' && segments.length === 1) {
        try {
          const session = await getSession(request, env.GAME_DATA);
          if (!session) return json({ error: 'not authenticated' }, 401);

          const throttleKey = `sync_throttle:${session.userId}`;
          const lastSync = await env.GAME_DATA.get(throttleKey);
          if (lastSync) return json({ error: 'sync too frequent' }, 429);
          await env.GAME_DATA.put(throttleKey, '1', { expirationTtl: 10 });

          let body;
          try { body = await request.json(); } catch (parseErr) { return json({ error: 'invalid JSON body: ' + parseErr.message }, 400); }
          if (!body || typeof body !== 'object') return json({ error: 'body must be an object' }, 400);

          const userKey = `user:${session.userId}`;
          const existing = safeParseObject(await env.GAME_DATA.get(userKey));

          let merged;
          try {
            merged = mergeSyncData(body, existing ? existing.data : null);
          } catch (mergeErr) {
            console.error('Merge error:', mergeErr);
            // If merge fails, just store the client data directly
            merged = body;
          }

          const userData = {
            email: session.email,
            name: session.name,
            provider: session.provider,
            data: merged,
            lastSync: new Date().toISOString(),
          };

          const serialized = JSON.stringify(userData);
          if (serialized.length > 524288) return json({ error: 'merged data too large' }, 413);
          await env.GAME_DATA.put(userKey, serialized);
          return json({ ok: true, lastSync: userData.lastSync });
        } catch (syncErr) {
          console.error('Sync error:', syncErr.stack || syncErr.message || syncErr);
          return new Response(JSON.stringify({ error: 'sync failed', detail: String(syncErr.message || syncErr) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }

      // GET /api/sync — download server data to device
      if (request.method === 'GET' && segments[0] === 'sync' && segments.length === 1) {
        const session = await getSession(request, env.GAME_DATA);
        if (!session) return json({ error: 'not authenticated' }, 401);

        const userData = safeParseObject(await env.GAME_DATA.get(`user:${session.userId}`));
        if (!userData || !userData.data) return json({ empty: true });
        return json(userData.data);
      }

      // ─── Multiplayer Room Endpoints ────────────────────────────────

      // POST /api/room/create — create a new multiplayer room
      if (request.method === 'POST' && segments[0] === 'room' && segments[1] === 'create') {
        let code = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = generateRoomCode();
          const existing = await env.GAME_DATA.get(`room:${candidate}`);
          if (!existing) {
            code = candidate;
            break;
          }
        }
        if (!code) return json({ error: 'failed to generate room code, try again' }, 503);

        const p1Token = generateToken();
        const room = {
          p1Token,
          p2Token: null,
          messages: [],
          created: Date.now(),
          state: 'waiting',
        };
        await env.GAME_DATA.put(`room:${code}`, JSON.stringify(room), { expirationTtl: 600 });
        return json({ code, token: p1Token });
      }

      // POST /api/room/join — join an existing room
      if (request.method === 'POST' && segments[0] === 'room' && segments[1] === 'join') {
        let body;
        try { body = await request.json(); } catch { return json({ error: 'invalid JSON body' }, 400); }

        const code = sanitizeRoomCode(body.code);
        if (!code) return json({ error: 'invalid room code' }, 400);

        const room = safeParseObject(await env.GAME_DATA.get(`room:${code}`));
        if (!room) return json({ error: 'room not found' }, 404);
        if (room.state !== 'waiting') return json({ error: 'room not available' }, 400);

        const p2Token = generateToken();
        room.p2Token = p2Token;
        room.state = 'paired';
        await env.GAME_DATA.put(`room:${code}`, JSON.stringify(room), { expirationTtl: 600 });
        return json({ code, token: p2Token });
      }

      // POST /api/room/send — send a message to the room
      if (request.method === 'POST' && segments[0] === 'room' && segments[1] === 'send') {
        let body;
        try { body = await request.json(); } catch { return json({ error: 'invalid JSON body' }, 400); }

        const code = sanitizeRoomCode(body.code);
        if (!code) return json({ error: 'invalid room code' }, 400);
        if (!body.token) return json({ error: 'token required' }, 400);

        const room = safeParseObject(await env.GAME_DATA.get(`room:${code}`));
        if (!room) return json({ error: 'room not found' }, 404);

        // Verify token and determine sender role
        let from;
        if (body.token === room.p1Token) from = 'p1';
        else if (body.token === room.p2Token) from = 'p2';
        else return json({ error: 'invalid token' }, 403);

        // Append message, keep only last 50
        room.messages.push({ from, msg: body.msg, ts: Date.now() });
        if (room.messages.length > 50) {
          room.messages = room.messages.slice(-50);
        }

        await env.GAME_DATA.put(`room:${code}`, JSON.stringify(room), { expirationTtl: 600 });
        return json({ ok: true });
      }

      // GET /api/room/poll?code=ABCD&token=...&after=TIMESTAMP — poll for new messages
      if (request.method === 'GET' && segments[0] === 'room' && segments[1] === 'poll') {
        const code = sanitizeRoomCode(url.searchParams.get('code'));
        if (!code) return json({ error: 'invalid room code' }, 400);
        const token = url.searchParams.get('token');
        if (!token) return json({ error: 'token required' }, 400);

        const room = safeParseObject(await env.GAME_DATA.get(`room:${code}`));
        if (!room) return json({ error: 'room not found' }, 404);

        // Verify token and determine player role
        let myRole;
        if (token === room.p1Token) myRole = 'p1';
        else if (token === room.p2Token) myRole = 'p2';
        else return json({ error: 'invalid token' }, 403);

        const after = parseInt(url.searchParams.get('after') || '0', 10);

        // Return messages from the OTHER player after the given timestamp
        const messages = room.messages.filter(m => m.from !== myRole && m.ts > after);
        return json({ messages, state: room.state });
      }

      // POST /api/room/close — close a room
      if (request.method === 'POST' && segments[0] === 'room' && segments[1] === 'close') {
        let body;
        try { body = await request.json(); } catch { return json({ error: 'invalid JSON body' }, 400); }

        const code = sanitizeRoomCode(body.code);
        if (!code) return json({ error: 'invalid room code' }, 400);
        if (!body.token) return json({ error: 'token required' }, 400);

        const room = safeParseObject(await env.GAME_DATA.get(`room:${code}`));
        if (!room) return json({ error: 'room not found' }, 404);

        // Verify token belongs to either player
        if (body.token !== room.p1Token && body.token !== room.p2Token) {
          return json({ error: 'invalid token' }, 403);
        }

        room.state = 'closed';
        await env.GAME_DATA.put(`room:${code}`, JSON.stringify(room), { expirationTtl: 600 });
        return json({ ok: true });
      }

      // ─── Multi-Player Room Endpoints (up to 6 players) ─────────────

      // POST /api/mroom/create — create a new multi-player room (up to 6 seats)
      if (request.method === 'POST' && segments[0] === 'mroom' && segments[1] === 'create') {
        let body;
        try { body = await request.json(); } catch { body = {}; }

        const name = sanitizeName(body.name || '');

        let code = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = generateRoomCode();
          const existing = await env.GAME_DATA.get(`mroom:${candidate}`);
          if (!existing) {
            code = candidate;
            break;
          }
        }
        if (!code) return json({ error: 'failed to generate room code, try again' }, 503);

        const token = generateToken();
        const room = {
          seats: { 0: { token, name: name || 'P1' } },
          messages: [],
          created: Date.now(),
          state: 'waiting',
          maxSeats: 6,
        };
        await env.GAME_DATA.put(`mroom:${code}`, JSON.stringify(room), { expirationTtl: 600 });
        return json({ code, token, seat: 0 });
      }

      // POST /api/mroom/join — join an existing multi-player room
      if (request.method === 'POST' && segments[0] === 'mroom' && segments[1] === 'join') {
        let body;
        try { body = await request.json(); } catch { return json({ error: 'invalid JSON body' }, 400); }

        const code = sanitizeRoomCode(body.code);
        if (!code) return json({ error: 'invalid room code' }, 400);

        const name = sanitizeName(body.name || '');

        const room = safeParseObject(await env.GAME_DATA.get(`mroom:${code}`));
        if (!room) return json({ error: 'room not found' }, 404);
        if (room.state === 'closed') return json({ error: 'room closed' }, 400);

        // Find next available seat
        const maxSeats = room.maxSeats || 6;
        let seatIndex = -1;
        for (let i = 0; i < maxSeats; i++) {
          if (!room.seats[String(i)]) {
            seatIndex = i;
            break;
          }
        }
        if (seatIndex === -1) return json({ error: 'room full' }, 400);

        const token = generateToken();
        room.seats[String(seatIndex)] = { token, name: name || ('P' + (seatIndex + 1)) };

        // If all seats filled, mark as full (but game can start with fewer)
        const occupiedSeats = Object.keys(room.seats).length;
        if (occupiedSeats >= maxSeats) {
          room.state = 'full';
        }

        await env.GAME_DATA.put(`mroom:${code}`, JSON.stringify(room), { expirationTtl: 600 });
        return json({ code, token, seat: seatIndex });
      }

      // POST /api/mroom/send — send a message to the multi-player room
      if (request.method === 'POST' && segments[0] === 'mroom' && segments[1] === 'send') {
        let body;
        try { body = await request.json(); } catch { return json({ error: 'invalid JSON body' }, 400); }

        const code = sanitizeRoomCode(body.code);
        if (!code) return json({ error: 'invalid room code' }, 400);
        if (!body.token) return json({ error: 'token required' }, 400);

        const room = safeParseObject(await env.GAME_DATA.get(`mroom:${code}`));
        if (!room) return json({ error: 'room not found' }, 404);

        // Verify token and determine sender seat
        let fromSeat = -1;
        for (const [seat, data] of Object.entries(room.seats)) {
          if (data.token === body.token) {
            fromSeat = parseInt(seat, 10);
            break;
          }
        }
        if (fromSeat === -1) return json({ error: 'invalid token' }, 403);

        // Append message, keep only last 100
        room.messages.push({ from: fromSeat, msg: body.msg, ts: Date.now() });
        if (room.messages.length > 100) {
          room.messages = room.messages.slice(-100);
        }

        // Update state if included in message
        if (body.state) {
          room.state = String(body.state).slice(0, 20);
        }

        await env.GAME_DATA.put(`mroom:${code}`, JSON.stringify(room), { expirationTtl: 600 });
        return json({ ok: true });
      }

      // GET /api/mroom/poll?code=ABCD&token=...&after=TIMESTAMP — poll for new messages
      if (request.method === 'GET' && segments[0] === 'mroom' && segments[1] === 'poll') {
        const code = sanitizeRoomCode(url.searchParams.get('code'));
        if (!code) return json({ error: 'invalid room code' }, 400);
        const token = url.searchParams.get('token');
        if (!token) return json({ error: 'token required' }, 400);

        const room = safeParseObject(await env.GAME_DATA.get(`mroom:${code}`));
        if (!room) return json({ error: 'room not found' }, 404);

        // Verify token and determine player seat
        let mySeat = -1;
        for (const [seat, data] of Object.entries(room.seats)) {
          if (data.token === token) {
            mySeat = parseInt(seat, 10);
            break;
          }
        }
        if (mySeat === -1) return json({ error: 'invalid token' }, 403);

        const after = parseInt(url.searchParams.get('after') || '0', 10);

        // Return messages from OTHER players after the given timestamp
        const messages = room.messages.filter(m => m.from !== mySeat && m.ts > after);

        // Build seats info (without tokens for security)
        const seats = {};
        for (const [seat, data] of Object.entries(room.seats)) {
          seats[seat] = { name: data.name };
        }

        return json({ messages, state: room.state, seats, mySeat });
      }

      // POST /api/mroom/close — close a multi-player room
      if (request.method === 'POST' && segments[0] === 'mroom' && segments[1] === 'close') {
        let body;
        try { body = await request.json(); } catch { return json({ error: 'invalid JSON body' }, 400); }

        const code = sanitizeRoomCode(body.code);
        if (!code) return json({ error: 'invalid room code' }, 400);
        if (!body.token) return json({ error: 'token required' }, 400);

        const room = safeParseObject(await env.GAME_DATA.get(`mroom:${code}`));
        if (!room) return json({ error: 'room not found' }, 404);

        // Verify token belongs to any seated player
        let valid = false;
        for (const data of Object.values(room.seats)) {
          if (data.token === body.token) { valid = true; break; }
        }
        if (!valid) return json({ error: 'invalid token' }, 403);

        room.state = 'closed';
        await env.GAME_DATA.put(`mroom:${code}`, JSON.stringify(room), { expirationTtl: 600 });
        return json({ ok: true });
      }

      return json({ error: 'not found' }, 404);

    } catch (err) {
      console.error('Worker error:', err.stack || err.message || err);
      return new Response(JSON.stringify({ error: 'internal error', detail: String(err.message || err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};
