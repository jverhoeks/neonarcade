// NEON ARCADE — API client (loaded by landing pages and games)
// Usage: <script src="/api.js"></script>
// Then: NeonAPI.play('neon-snake'), NeonAPI.like('neon-snake'), etc.

window.NeonAPI = (function() {
  var BASE = '/api';

  function post(path, body) {
    return fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function(r) { return r.json(); }).catch(function() { return null; });
  }

  function get(path) {
    return fetch(BASE + path).then(function(r) { return r.json(); }).catch(function() { return null; });
  }

  return {
    // Increment play count
    play: function(game) { return post('/play/' + game); },

    // Increment likes
    like: function(game) { return post('/like/' + game); },

    // Report issue
    issue: function(game) { return post('/issue/' + game); },

    // Get all stats (for landing pages)
    allStats: function() { return get('/stats'); },

    // Get single game stats
    stats: function(game) { return get('/stats/' + game); },

    // Get leaderboard
    leaderboard: function(game) { return get('/leaderboard/' + game); },

    // Submit score (mode: 'high' for arcade, 'low' for time-based puzzles)
    submitScore: function(game, name, score, mode) {
      return post('/leaderboard/' + game, { name: name, score: score, mode: mode || 'high' });
    },
  };
})();
