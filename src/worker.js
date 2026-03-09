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

  // NEON GRIND (mode: high)
  'mathblitz':           { mode: 'high', maxScore: 100000 },
  'reflex-chain':        { mode: 'high', maxScore: 100000 },
  'neurosort':           { mode: 'high', maxScore: 100000 },
  'colorname':           { mode: 'high', maxScore: 1000 },
  'numbersense':         { mode: 'high', maxScore: 2000 },
  'gridmatch':           { mode: 'high', maxScore: 1000 },

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

  // NEON CLASSIC (retro games, mode: high)
  'invaders':            { mode: 'high', maxScore: 1000000 },
  'breakout':            { mode: 'high', maxScore: 1000000 },
  'tetris':              { mode: 'high', maxScore: 1000000 },
  'tetris-sprint':       { mode: 'low', maxScore: 86400 },
  '2048':                { mode: 'high', maxScore: 10000000 },
  'pairs':               { mode: 'low', maxScore: 86400 },
  'asteroids':           { mode: 'high', maxScore: 1000000 },
  'frogger':             { mode: 'high', maxScore: 1000000 },
};

function isAllowedOrigin(request) {
  const origin = request.headers.get('Origin') || '';
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

      // POST /api/play/:game — increment play count
      if (request.method === 'POST' && segments[0] === 'play' && segments[1]) {
        const game = sanitizeGame(segments[1]);
        if (!game || !KNOWN_GAMES[game]) return json({ error: 'unknown game' }, 404);
        const plays = await increment(env.GAME_DATA, `plays:${game}`);
        return json({ game, plays });
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

      // GET /api/stats/:game — single game stats
      if (request.method === 'GET' && segments[0] === 'stats' && segments[1]) {
        const game = sanitizeGame(segments[1]);
        if (!game || !KNOWN_GAMES[game]) return json({ error: 'unknown game' }, 404);
        const [plays, likes, issues] = await Promise.all([
          env.GAME_DATA.get(`plays:${game}`),
          env.GAME_DATA.get(`likes:${game}`),
          env.GAME_DATA.get(`issues:${game}`),
        ]);
        return json({
          game,
          plays: parseInt(plays || '0', 10),
          likes: parseInt(likes || '0', 10),
          issues: parseInt(issues || '0', 10),
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

      // GET /api/leaderboard/:game — get leaderboard
      if (request.method === 'GET' && segments[0] === 'leaderboard' && segments[1]) {
        const game = sanitizeGame(segments[1]);
        if (!game || !KNOWN_GAMES[game]) return json({ error: 'unknown game' }, 404);
        const data = safeParseArray(await env.GAME_DATA.get(`lb:${game}`));
        return json({ game, leaderboard: data });
      }

      return json({ error: 'not found' }, 404);

    } catch (err) {
      console.error(err);
      return json({ error: 'internal error' }, 500);
    }
  },
};
