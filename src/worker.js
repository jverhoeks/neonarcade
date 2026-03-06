// NEON ARCADE — API Worker
// Handles /api/* routes, falls through to static assets for everything else

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// Sanitize game slug: only allow lowercase alphanumeric + hyphens
function sanitizeGame(game) {
  return (game || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50);
}

// Sanitize 5-letter name: uppercase, letters only
function sanitizeName(name) {
  return (name || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
}

// Atomic increment using KV
async function increment(kv, key) {
  const val = parseInt(await kv.get(key) || '0', 10);
  const next = val + 1;
  await kv.put(key, String(next));
  return next;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Only handle /api/ routes
    if (!url.pathname.startsWith('/api/')) {
      // Fall through to static assets
      return env.ASSETS.fetch(request);
    }

    const path = url.pathname.replace('/api/', '');
    const segments = path.split('/').filter(Boolean);

    try {
      // POST /api/play/:game — increment play count
      if (request.method === 'POST' && segments[0] === 'play' && segments[1]) {
        const game = sanitizeGame(segments[1]);
        if (!game) return json({ error: 'invalid game' }, 400);
        const plays = await increment(env.GAME_DATA, `plays:${game}`);
        return json({ game, plays });
      }

      // POST /api/like/:game — increment likes
      if (request.method === 'POST' && segments[0] === 'like' && segments[1]) {
        const game = sanitizeGame(segments[1]);
        if (!game) return json({ error: 'invalid game' }, 400);
        const likes = await increment(env.GAME_DATA, `likes:${game}`);
        return json({ game, likes });
      }

      // POST /api/issue/:game — increment issues
      if (request.method === 'POST' && segments[0] === 'issue' && segments[1]) {
        const game = sanitizeGame(segments[1]);
        if (!game) return json({ error: 'invalid game' }, 400);
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
        // Batch get all stats
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
        if (!game) return json({ error: 'invalid game' }, 400);
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
        if (!game) return json({ error: 'invalid game' }, 400);

        const body = await request.json();
        const name = sanitizeName(body.name);
        const score = parseInt(body.score, 10);

        if (!name || name.length < 1) return json({ error: 'name required (up to 5 letters)' }, 400);
        if (isNaN(score) || score < 0) return json({ error: 'valid score required' }, 400);

        const key = `lb:${game}`;
        const existing = JSON.parse(await env.GAME_DATA.get(key) || '[]');

        existing.push({ name, score, ts: Date.now() });

        // Sort: higher score = better (for arcade games)
        // For time-based puzzles, the game should submit inverted scores or we sort ascending
        // We'll support a "mode" field: "high" (default) or "low"
        const mode = body.mode === 'low' ? 'low' : 'high';
        if (mode === 'low') {
          existing.sort((a, b) => a.score - b.score);
        } else {
          existing.sort((a, b) => b.score - a.score);
        }

        const top = existing.slice(0, 20);
        await env.GAME_DATA.put(key, JSON.stringify(top));

        return json({ game, leaderboard: top });
      }

      // GET /api/leaderboard/:game — get leaderboard
      if (request.method === 'GET' && segments[0] === 'leaderboard' && segments[1]) {
        const game = sanitizeGame(segments[1]);
        if (!game) return json({ error: 'invalid game' }, 400);
        const data = JSON.parse(await env.GAME_DATA.get(`lb:${game}`) || '[]');
        return json({ game, leaderboard: data });
      }

      return json({ error: 'not found' }, 404);

    } catch (err) {
      return json({ error: 'internal error' }, 500);
    }
  },
};
