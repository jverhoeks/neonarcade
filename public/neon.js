// NEON ARCADE — neon.js
// Single client library: API + Scores + Name + UI
// Usage: <script src="/neon.js"></script>
//
// Neon.init({ game: 'neon-snake', mode: 'high' })
// Neon.save(score).then(result => ...)
// Neon.render(container)
// Neon.promptName().then(name => ...)
//
// Also exposes Neon.api.* for landing pages:
//   Neon.api.allStats(), Neon.api.like(game), Neon.api.issue(game)

window.Neon = (function() {
  // ========== API ==========
  var BASE = '/api';

  function _post(path, body) {
    return fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function(r) { return r.json(); }).catch(function() { return null; });
  }

  function _get(path) {
    return fetch(BASE + path).then(function(r) { return r.json(); }).catch(function() { return null; });
  }

  var api = {
    play: function(game) { return _post('/play/' + game); },
    like: function(game) { return _post('/like/' + game); },
    issue: function(game) { return _post('/issue/' + game); },
    allStats: function() { return _get('/stats'); },
    stats: function(game) { return _get('/stats/' + game); },
    leaderboard: function(game) { return _get('/leaderboard/' + game); },
    submitScore: function(game, name, score) {
      return _post('/leaderboard/' + game, { name: name, score: score });
    },
  };

  // ========== SCORES ==========
  var NAME_KEY = 'neonarcade_player_name';
  var cfg = { game: '', mode: 'high', key: '', formatScore: null };
  var localScores = [];
  var globalBoard = [];
  var playerName = '';
  var lastGlobalRank = -1;
  var _overlay = null;
  var _splashEl = null;

  function init(opts) {
    cfg.game = opts.game || '';
    cfg.mode = opts.mode || 'high';
    cfg.key = opts.key || ('neonarcade_scores_' + cfg.game.replace(/-/g, '_'));
    cfg.formatScore = opts.formatScore || null;
    cfg.daily = !!opts.daily;
    cfg.emoji = opts.emoji || '';
    cfg.title = opts.title || '';

    // Reset challenge/percentile/score state
    _challengeData = null;
    _lastScore = null;
    _lastPercentile = null;
    _playsToday = 0;
    _playsTotal = 0;

    // Daily mode: append today's date to storage key
    if (cfg.daily) {
      cfg.key = cfg.key + '_' + _todayStr().replace(/-/g, '');
    }

    playerName = localStorage.getItem(NAME_KEY) || '';
    try { localScores = JSON.parse(localStorage.getItem(cfg.key) || '[]'); } catch(e) { localScores = []; }
    lastGlobalRank = -1;
    globalBoard = [];

    api.play(cfg.game);
    api.leaderboard(cfg.game).then(function(data) {
      if (data && data.leaderboard) globalBoard = data.leaderboard;
    });

    // Check URL for challenge param
    getChallenge();

    // Fetch play counts
    api.stats(cfg.game).then(function(data) {
      if (data) {
        _playsToday = data.playsToday || data.plays_today || 0;
        _playsTotal = data.playsTotal || data.plays_total || data.plays || 0;
      }
    });

    // Auto-inject floating feedback bar
    _injectFeedbackBar(cfg.game);

    // Track profile
    _updateProfile();
  }

  function getHighScore() {
    return localScores.length > 0 ? localScores[0].score : 0;
  }

  function getName() { return playerName; }

  function setName(n) {
    playerName = (n || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    if (playerName) localStorage.setItem(NAME_KEY, playerName);
    return playerName;
  }

  function timeAgo(ts) {
    var diff = Date.now() - ts;
    var mins  = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days  = Math.floor(diff / 86400000);
    if (days  > 0) return days  + (days  === 1 ? ' day ago'  : ' days ago');
    if (hours > 0) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    if (mins  > 0) return mins  + (mins  === 1 ? ' min ago'  : ' mins ago');
    return 'just now';
  }

  function fmtScore(s) {
    if (cfg.formatScore) return cfg.formatScore(s);
    return String(s);
  }

  function isBetter(a, b) {
    return cfg.mode === 'low' ? a < b : a > b;
  }

  // Save locally (top 10) + submit to global if qualifying
  // Returns promise: { scores, isNewBest, globalRank, percentile }
  function save(score) {
    // Reject null/undefined/NaN scores — but allow 0 (valid for time-based puzzles)
    if (score === null || score === undefined || score !== score) {
      return Promise.resolve({ scores: localScores, isNewBest: false, globalRank: -1, percentile: null });
    }

    // Store last score
    _lastScore = score;

    // Local
    try {
      localScores.push({ score: score, ts: Date.now(), name: playerName || '???' });
      if (cfg.mode === 'low') {
        localScores.sort(function(a, b) { return a.score - b.score; });
      } else {
        localScores.sort(function(a, b) { return b.score - a.score; });
      }
      localScores = localScores.slice(0, 10);
      localStorage.setItem(cfg.key, JSON.stringify(localScores));
    } catch(e) {
      // localStorage may throw QuotaExceededError — continue so completion still works
    }
    var isNewBest = localScores.length > 0 && localScores[0].score === score;

    // Global
    lastGlobalRank = -1;
    var qualifies = globalBoard.length < 20 ||
      isBetter(score, globalBoard[globalBoard.length - 1].score);

    var leaderboardPromise;
    if (playerName && qualifies) {
      leaderboardPromise = api.submitScore(cfg.game, playerName, score).then(function(data) {
        if (data && data.leaderboard) {
          globalBoard = data.leaderboard;
          for (var i = 0; i < globalBoard.length; i++) {
            if (globalBoard[i].name === playerName && globalBoard[i].score === score) {
              lastGlobalRank = i + 1;
              break;
            }
          }
        }
      });
    } else {
      leaderboardPromise = Promise.resolve();
    }

    // Percentile
    var percentilePromise = _post('/score/' + cfg.game, { score: score }).then(function(data) {
      if (data && data.percentile !== undefined) {
        _lastPercentile = data.percentile;
        _updateProfilePercentile(cfg.game, data.percentile);
      }
    }).catch(function() {});

    // Challenge response
    var challengePromise = _challengeData
      ? respondChallenge(score)
      : Promise.resolve();

    // Streak update
    if (cfg.daily) {
      _updateStreak();
    }

    return Promise.all([leaderboardPromise, percentilePromise, challengePromise]).then(function() {
      // Inject challenge bar after all async work
      _injectChallengeBar();
      return {
        scores: localScores,
        isNewBest: isNewBest,
        globalRank: lastGlobalRank,
        percentile: _lastPercentile
      };
    });
  }

  function getGlobalRank() { return lastGlobalRank; }
  function getGlobalBoard() { return globalBoard; }

  // ========== UI: Score Table ==========
  function render(container) {
    if (!container) return;
    container.textContent = '';

    var title = document.createElement('div');
    title.className = 'ns-title';
    title.textContent = 'YOUR BESTS';
    container.appendChild(title);

    if (localScores.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'ns-empty';
      empty.textContent = 'No scores yet';
      container.appendChild(empty);
      return;
    }

    localScores.forEach(function(s, i) {
      var row = _makeRow(i + 1, s.name || '???', fmtScore(s.score), timeAgo(s.ts), false);
      container.appendChild(row);
    });

    // Global section
    if (globalBoard.length > 0) {
      var gTitle = document.createElement('div');
      gTitle.className = 'ns-title ns-title-global';
      gTitle.textContent = 'GLOBAL TOP';
      container.appendChild(gTitle);

      var onBoard = false;
      globalBoard.slice(0, 10).forEach(function(s, i) {
        var isYou = lastGlobalRank === i + 1;
        if (isYou) onBoard = true;
        var row = _makeRow('#' + (i + 1), s.name || '???', fmtScore(s.score), null, isYou);
        container.appendChild(row);
      });

      // Rank hint if player not on board
      if (!onBoard && _lastScore !== null && _lastScore !== undefined) {
        var hint = document.createElement('div');
        hint.className = 'ns-rank-hint';
        var wouldBeRank = -1;
        for (var ri = 0; ri < globalBoard.length; ri++) {
          if (isBetter(_lastScore, globalBoard[ri].score)) {
            wouldBeRank = ri + 1;
            break;
          }
        }
        if (wouldBeRank > 0 && wouldBeRank <= 20) {
          hint.textContent = 'Your score would be #' + wouldBeRank;
        } else if (globalBoard.length > 0) {
          var threshold = globalBoard[globalBoard.length - 1].score;
          hint.textContent = 'Score ' + fmtScore(threshold) + (cfg.mode === 'low' ? ' or less' : '+') + ' to join';
        }
        if (hint.textContent) container.appendChild(hint);
      }

      // Percentile badge
      if (_lastPercentile) {
        var pctBadge = document.createElement('div');
        pctBadge.className = 'ns-percentile';
        pctBadge.textContent = 'TOP ' + _lastPercentile + '% GLOBALLY';
        container.appendChild(pctBadge);
      }
    }
  }

  function _makeRow(rank, name, score, time, highlight) {
    var row = document.createElement('div');
    row.className = 'ns-row' + (highlight ? ' ns-you' : '');
    var r = document.createElement('span'); r.className = 'ns-rank'; r.textContent = rank;
    var n = document.createElement('span'); n.className = 'ns-name'; n.textContent = name;
    var v = document.createElement('span'); v.className = 'ns-val';  v.textContent = score;
    row.appendChild(r); row.appendChild(n); row.appendChild(v);
    if (time) {
      var t = document.createElement('span'); t.className = 'ns-time'; t.textContent = time;
      row.appendChild(t);
    }
    return row;
  }

  // ========== UI: Name Prompt ==========
  function promptName() {
    if (playerName) return Promise.resolve(playerName);

    return new Promise(function(resolve) {
      if (_overlay) _overlay.remove();
      _overlay = document.createElement('div');
      _overlay.className = 'ns-name-overlay';

      var box = document.createElement('div');
      box.className = 'ns-name-box';

      var label = document.createElement('div');
      label.className = 'ns-name-label';
      label.textContent = 'ENTER YOUR NAME';

      var sub = document.createElement('div');
      sub.className = 'ns-name-sub';
      sub.textContent = '3 CHARACTERS';

      var inputRow = document.createElement('div');
      inputRow.className = 'ns-name-row';

      // Hidden input to trigger mobile keyboard
      var hiddenInput = document.createElement('input');
      hiddenInput.className = 'ns-name-hidden';
      hiddenInput.type = 'text';
      hiddenInput.inputMode = 'text';
      hiddenInput.autocomplete = 'off';
      hiddenInput.autocapitalize = 'characters';
      hiddenInput.maxLength = 3;
      hiddenInput.setAttribute('aria-label', 'Enter 3-character name');

      var chars = ['', '', ''];
      var slots = [];
      var cursor = 0;

      for (var i = 0; i < 3; i++) {
        var slot = document.createElement('div');
        slot.className = 'ns-name-slot';
        slot.textContent = '_';
        slots.push(slot);
        inputRow.appendChild(slot);
        (function(idx) {
          slot.addEventListener('click', function() {
            cursor = idx;
            updateSlots();
            hiddenInput.focus();
          });
        })(i);
      }

      function updateSlots() {
        for (var j = 0; j < 3; j++) {
          slots[j].textContent = chars[j] || '_';
          slots[j].className = 'ns-name-slot' + (j === cursor ? ' active' : '') + (chars[j] ? ' filled' : '');
        }
        okBtn.style.opacity = (chars[0] && chars[1] && chars[2]) ? '1' : '0.3';
      }

      var okBtn = document.createElement('button');
      okBtn.className = 'ns-name-ok';
      okBtn.textContent = 'OK';
      okBtn.style.opacity = '0.3';

      okBtn.addEventListener('click', function() {
        if (!chars[0] || !chars[1] || !chars[2]) return;
        done(setName(chars.join('')));
      });

      function handleKey(e) {
        if (e.key === 'Backspace') {
          if (chars[cursor]) { chars[cursor] = ''; }
          else if (cursor > 0) { cursor--; chars[cursor] = ''; }
          updateSlots(); e.preventDefault(); return;
        }
        if (e.key === 'Enter') { okBtn.click(); e.preventDefault(); return; }
        var ch = e.key.toUpperCase();
        if (/^[A-Z0-9]$/.test(ch) && cursor < 3) {
          chars[cursor] = ch;
          if (cursor < 2) cursor++;
          updateSlots(); e.preventDefault();
        }
      }

      // Mobile: sync hidden input to slots
      hiddenInput.addEventListener('input', function() {
        var val = hiddenInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
        chars = [val[0] || '', val[1] || '', val[2] || ''];
        cursor = Math.min(val.length, 2);
        updateSlots();
        if (val.length >= 3) hiddenInput.blur();
      });

      document.addEventListener('keydown', handleKey);

      function done(n) {
        document.removeEventListener('keydown', handleKey);
        if (_overlay) { _overlay.remove(); _overlay = null; }
        resolve(n);
      }

      box.appendChild(hiddenInput);
      box.appendChild(label);
      box.appendChild(sub);
      box.appendChild(inputRow);
      box.appendChild(okBtn);
      _overlay.appendChild(box);
      document.body.appendChild(_overlay);
      updateSlots();
      // Focus hidden input after a tick so mobile keyboard appears
      setTimeout(function() { hiddenInput.focus(); }, 100);
    });
  }

  // ========== UI: Global Top 5 Splash ==========
  function showGlobalSplash(rank) {
    if (rank < 1 || rank > 5) return;
    if (_splashEl) _splashEl.remove();

    _splashEl = document.createElement('div');
    _splashEl.className = 'ns-splash';

    var inner = document.createElement('div');
    inner.className = 'ns-splash-inner';

    var crown = document.createElement('div');
    crown.className = 'ns-splash-crown';
    crown.textContent = rank === 1 ? '\uD83D\uDC51' : '\u2B50';

    var msg = document.createElement('div');
    msg.className = 'ns-splash-msg';
    msg.textContent = rank === 1 ? 'GLOBAL #1!' : 'GLOBAL TOP ' + rank + '!';

    var s = document.createElement('div');
    s.className = 'ns-splash-sub';
    s.textContent = rank === 1 ? 'YOU ARE THE BEST IN THE WORLD' : 'YOU MADE THE GLOBAL LEADERBOARD';

    inner.appendChild(crown);
    inner.appendChild(msg);
    inner.appendChild(s);
    _splashEl.appendChild(inner);
    document.body.appendChild(_splashEl);

    // Particles
    var colors = ['#00f0ff', '#ffd700', '#ff2d7b', '#39ff14', '#b44dff'];
    for (var i = 0; i < 30; i++) {
      var p = document.createElement('div');
      p.className = 'ns-splash-p';
      var angle = (Math.PI * 2 * i / 30) + (Math.random() - 0.5) * 0.5;
      var dist = 80 + Math.random() * 120;
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = (Math.random() * 0.3) + 's';
      inner.appendChild(p);
    }

    function dismiss() {
      if (!_splashEl) return;
      _splashEl.classList.add('ns-splash-out');
      setTimeout(function() { if (_splashEl) { _splashEl.remove(); _splashEl = null; } }, 500);
    }

    setTimeout(dismiss, 3000);
    _splashEl.addEventListener('click', dismiss);
  }

  // ========== UI: Feedback Buttons (Like / Issue) ==========
  var _feedbackSent = {}; // session tracker: { 'game-slug:like': true, ... }
  var _feedbackBar = null;

  function _injectFeedbackBar(game) {
    if (_feedbackBar) _feedbackBar.remove();
    _feedbackBar = document.createElement('div');
    _feedbackBar.className = 'ns-fb-bar';
    renderFeedback(_feedbackBar, game);
    document.body.appendChild(_feedbackBar);
  }

  function _fbKey(game, type) { return game + ':' + type; }

  function _hasSentFeedback(game, type) {
    var k = _fbKey(game, type);
    if (_feedbackSent[k]) return true;
    try { if (sessionStorage.getItem('neon_fb_' + k)) return true; } catch(e) {}
    return false;
  }

  function _markFeedback(game, type) {
    var k = _fbKey(game, type);
    _feedbackSent[k] = true;
    try { sessionStorage.setItem('neon_fb_' + k, '1'); } catch(e) {}
  }

  function renderFeedback(container, game) {
    if (!container) return;
    game = game || cfg.game;
    if (!game) return;
    container.textContent = '';

    var row = document.createElement('div');
    row.className = 'ns-fb-row';

    var likeBtn = _makeFbBtn('like', game, '\uD83D\uDC4D', 'LIKE');
    var issueBtn = _makeFbBtn('issue', game, '\u26A0\uFE0F', 'REPORT');

    row.appendChild(likeBtn);
    row.appendChild(issueBtn);
    container.appendChild(row);
  }

  function _makeFbBtn(type, game, icon, label) {
    var sent = _hasSentFeedback(game, type);
    var btn = document.createElement('button');
    btn.className = 'ns-fb-btn' + (type === 'issue' ? ' ns-fb-issue' : '') + (sent ? ' ns-fb-sent' : '');

    var iconSpan = document.createElement('span');
    iconSpan.className = 'ns-fb-icon';
    iconSpan.textContent = icon;
    var labelSpan = document.createElement('span');
    labelSpan.className = 'ns-fb-label';
    labelSpan.textContent = sent ? (type === 'like' ? 'LIKED' : 'REPORTED') : label;
    btn.appendChild(iconSpan);
    btn.appendChild(labelSpan);

    if (sent) {
      btn.disabled = true;
    } else {
      btn.addEventListener('click', function() {
        if (_hasSentFeedback(game, type)) return;
        _markFeedback(game, type);
        if (type === 'like') api.like(game);
        else api.issue(game);
        btn.classList.add('ns-fb-sent');
        btn.disabled = true;
        btn.querySelector('.ns-fb-label').textContent = type === 'like' ? 'LIKED' : 'REPORTED';
      });
    }
    return btn;
  }

  // ========== CHALLENGE LINKS ==========
  var _challengeData = null;
  var _lastScore = null;
  var _lastPercentile = null;
  var _challengeBar = null;
  var _playsToday = 0;
  var _playsTotal = 0;

  function _getChallengeCode() {
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get('challenge') || null;
    } catch(e) { return null; }
  }

  function getChallenge() {
    var code = _getChallengeCode();
    if (!code) return Promise.resolve(null);
    return _get('/challenge/' + code).then(function(data) {
      if (data && data.challenge) {
        _challengeData = data.challenge;
        return _challengeData;
      }
      _challengeData = null;
      return null;
    }).catch(function() { _challengeData = null; return null; });
  }

  function challenge(shareText) {
    var name = playerName || '???';
    var score = _lastScore;
    var body = { game: cfg.game, name: name, score: score };
    if (shareText) body.shareText = shareText;
    return _post('/challenge', body).then(function(data) {
      if (!data || !data.code) return null;
      var url = 'https://neonarcade.net/c/' + data.code;
      var text = shareText ? shareText + '\n' + url : url;
      var shareObj = { title: cfg.title || cfg.game, text: text, url: url };
      var isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      if (isMobile && navigator.share) {
        navigator.share(shareObj).catch(function() {
          navigator.clipboard.writeText(text).catch(function() {});
        });
      } else {
        navigator.clipboard.writeText(text).then(function() {
          _showChallengeConfirm();
        }).catch(function() {
          _showChallengeConfirm();
        });
      }
      return { code: data.code, url: url };
    });
  }

  function respondChallenge(myScore) {
    if (!_challengeData || !_challengeData.code) return Promise.resolve(null);
    var name = playerName || '???';
    return _post('/challenge/' + _challengeData.code + '/respond', {
      name: name, score: myScore
    }).then(function(data) {
      if (data) {
        _showChallengeResult(data);
        _updateProfileChallenge(data.result === 'win');
      }
      return data;
    });
  }

  function _showChallengeConfirm() {
    var el = document.createElement('div');
    el.className = 'ns-challenge-confirm';
    var iconSpan = document.createElement('span');
    iconSpan.style.marginRight = '8px';
    iconSpan.textContent = '\u2694\uFE0F';
    el.appendChild(iconSpan);
    el.appendChild(document.createTextNode('CHALLENGE LINK COPIED!'));
    document.body.appendChild(el);
    setTimeout(function() {
      el.classList.add('ns-cc-out');
      setTimeout(function() { el.remove(); }, 400);
    }, 2000);
  }

  function _showChallengeResult(data) {
    var result = data.result || 'unknown';
    var diff = data.diff || 0;
    var isWin = result === 'win';

    var overlay = document.createElement('div');
    overlay.className = 'ns-challenge-result';

    var inner = document.createElement('div');
    inner.className = 'ns-cr-inner';

    var icon = document.createElement('div');
    icon.className = 'ns-cr-icon';
    icon.textContent = isWin ? '\uD83C\uDFC6' : '\uD83D\uDE24';

    var msg = document.createElement('div');
    msg.className = 'ns-cr-msg';
    msg.textContent = isWin ? 'YOU WIN!' : 'YOU LOSE!';

    var diffEl = document.createElement('div');
    diffEl.className = 'ns-cr-diff';
    var absDiff = Math.abs(diff);
    diffEl.textContent = isWin
      ? 'Won by ' + fmtScore(absDiff) + ' points'
      : 'Lost by ' + fmtScore(absDiff) + ' points';
    if (result === 'tie') {
      msg.textContent = "IT'S A TIE!";
      diffEl.textContent = 'Exactly the same score!';
    }

    inner.appendChild(icon);
    inner.appendChild(msg);
    inner.appendChild(diffEl);
    overlay.appendChild(inner);
    document.body.appendChild(overlay);

    function dismiss() {
      overlay.classList.add('ns-cr-out');
      setTimeout(function() { overlay.remove(); }, 500);
    }

    setTimeout(dismiss, 5000);
    overlay.addEventListener('click', dismiss);
  }

  function _injectChallengeBar() {
    if (_challengeBar) _challengeBar.remove();
    if (!_lastScore && _lastScore !== 0) return;

    _challengeBar = document.createElement('div');
    _challengeBar.className = 'ns-chal-bar';

    var btn = document.createElement('button');
    btn.className = 'ns-chal-btn';
    var btnIcon = document.createElement('span');
    btnIcon.style.marginRight = '6px';
    btnIcon.textContent = '\u2694\uFE0F';
    btn.appendChild(btnIcon);
    btn.appendChild(document.createTextNode('CHALLENGE A FRIEND'));
    btn.addEventListener('click', function() {
      var emoji = cfg.emoji || '\uD83C\uDFAE';
      var title = cfg.title || cfg.game.toUpperCase();
      var scoreStr = fmtScore(_lastScore);
      var pctStr = _lastPercentile ? 'Top ' + _lastPercentile + '%' : '';
      var streakStr = '';
      if (cfg.daily) {
        var s = getStreak();
        if (s.current > 0) streakStr = '\uD83D\uDD25' + s.current;
      }
      var parts = [emoji + ' ' + title];
      var line2 = 'Score: ' + scoreStr;
      if (pctStr) line2 += ' | ' + pctStr;
      if (streakStr) line2 += ' | ' + streakStr;
      parts.push(line2);
      parts.push('Can you beat me?');
      challenge(parts.join('\n'));
    });

    _challengeBar.appendChild(btn);
    document.body.appendChild(_challengeBar);

    // Auto-dismiss after 30s
    setTimeout(function() {
      if (_challengeBar) {
        _challengeBar.style.transition = 'opacity 0.5s';
        _challengeBar.style.opacity = '0';
        setTimeout(function() {
          if (_challengeBar) { _challengeBar.remove(); _challengeBar = null; }
        }, 500);
      }
    }, 30000);
  }

  // ========== DAILY MODE & STREAKS ==========

  function getDailySeed() {
    var str = _todayStr();
    // FNV-1a hash
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function _streakKey() {
    return 'neonarcade_' + cfg.game.replace(/-/g, '_') + '_streak';
  }

  function _todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function _yesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function _loadStreak() {
    try {
      var data = JSON.parse(localStorage.getItem(_streakKey()) || 'null');
      if (data && typeof data.current === 'number') return data;
    } catch(e) {}
    return { current: 0, best: 0, lastPlayed: '' };
  }

  function getStreak() {
    if (!cfg.daily) return { current: 0, best: 0, lastPlayed: '' };
    return _loadStreak();
  }

  function _updateStreak() {
    var data = _loadStreak();
    var today = _todayStr();
    if (data.lastPlayed === today) return data;
    if (data.lastPlayed === _yesterdayStr()) {
      data.current = data.current + 1;
    } else {
      data.current = 1;
    }
    if (data.current > data.best) data.best = data.current;
    data.lastPlayed = today;
    try { localStorage.setItem(_streakKey(), JSON.stringify(data)); } catch(e) {}
    return data;
  }

  function renderStreak(el) {
    if (!el) return;
    var data = getStreak();
    el.className = 'ns-streak-badge';
    el.textContent = '\uD83D\uDD25' + data.current;
    el.title = 'Best streak: ' + data.best;
  }

  // ========== SHARE UPGRADES ==========

  function formatShare(opts) {
    opts = opts || {};
    var emoji = opts.emoji || cfg.emoji || '\uD83C\uDFAE';
    var title = opts.title || cfg.title || cfg.game.toUpperCase();
    var score = opts.score !== undefined ? opts.score : _lastScore;
    var scoreStr = score !== null && score !== undefined ? fmtScore(score) : '???';
    var percentile = opts.percentile || _lastPercentile;
    var percentileNum = percentile ? parseInt(percentile, 10) : null;
    var challengeUrl = opts.challengeUrl || '';
    var streak = null;
    if (cfg.daily) {
      var s = getStreak();
      if (s.current > 0) streak = s.current;
    }

    var lines = [];
    // Line 1: emoji + title
    lines.push(emoji + ' ' + title);
    // Line 2: score | percentile | streak
    var parts = ['Score: ' + scoreStr];
    if (percentile) parts.push('Top ' + percentile + '%');
    if (streak) parts.push('\uD83D\uDD25' + streak);
    lines.push(parts.join(' | '));
    // Line 3: progress bar
    if (percentileNum && percentileNum > 0) {
      var filled = Math.round((1 - percentileNum / 100) * 12);
      if (filled < 0) filled = 0;
      if (filled > 12) filled = 12;
      var bar = '';
      for (var i = 0; i < 12; i++) {
        bar += i < filled ? '\u2588' : '\u2591';
      }
      lines.push(bar);
    }
    // Line 4: CTA
    if (challengeUrl) {
      lines.push('Can you beat me? \u2192 ' + challengeUrl);
    } else {
      lines.push('neonarcade.net');
    }
    return lines.join('\n');
  }

  function share(opts) {
    opts = opts || {};
    var text = opts.text || '';
    var title = opts.title || cfg.title || cfg.game;
    var url = opts.url || '';
    var imageCanvas = opts.imageCanvas || null;

    var isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    if (isMobile && navigator.share) {
      var shareData = { title: title, text: text };
      if (url) shareData.url = url;
      if (imageCanvas && navigator.canShare) {
        return new Promise(function(resolve) {
          imageCanvas.toBlob(function(blob) {
            if (blob) {
              var file = new File([blob], 'score-card.png', { type: 'image/png' });
              var testData = { title: title, text: text, files: [file] };
              if (navigator.canShare(testData)) {
                shareData.files = [file];
              }
            }
            navigator.share(shareData).then(function() {
              resolve(true);
            }).catch(function() {
              _clipboardShare(text, url);
              resolve(false);
            });
          }, 'image/png');
        });
      }
      return navigator.share(shareData).then(function() {
        return true;
      }).catch(function() {
        _clipboardShare(text, url);
        return false;
      });
    }

    return _clipboardShare(text, url);
  }

  function _clipboardShare(text, url) {
    var copyText = text + (url ? '\n' + url : '');
    return navigator.clipboard.writeText(copyText).then(function() {
      _showCopyConfirm();
      return true;
    }).catch(function() {
      _showCopyConfirm();
      return false;
    });
  }

  function _showCopyConfirm() {
    var el = document.createElement('div');
    el.className = 'ns-challenge-confirm';
    var iconSpan = document.createElement('span');
    iconSpan.style.marginRight = '8px';
    iconSpan.textContent = '\uD83D\uDCCB';
    el.appendChild(iconSpan);
    el.appendChild(document.createTextNode('COPIED TO CLIPBOARD!'));
    document.body.appendChild(el);
    setTimeout(function() {
      el.classList.add('ns-cc-out');
      setTimeout(function() { el.remove(); }, 400);
    }, 2000);
  }

  function generateScoreCard(opts) {
    opts = opts || {};
    var emoji = opts.emoji || cfg.emoji || '\uD83C\uDFAE';
    var title = opts.title || cfg.title || cfg.game.toUpperCase();
    var score = opts.score !== undefined ? opts.score : _lastScore;
    var scoreStr = score !== null && score !== undefined ? fmtScore(score) : '???';
    var percentile = opts.percentile || _lastPercentile;
    var rank = opts.rank || lastGlobalRank;
    var name = opts.name || playerName || '???';
    var streak = null;
    if (cfg.daily) {
      var s = getStreak();
      if (s.current > 0) streak = s.current;
    }

    return new Promise(function(resolve) {
      var w = 1200, h = 630;
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');

      // Background gradient
      var grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0a0a12');
      grad.addColorStop(1, '#161625');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Scanline overlay
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (var y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 2);
      }

      // Emoji
      ctx.font = '64px serif';
      ctx.textAlign = 'center';
      ctx.fillText(emoji, w / 2, 120);

      // Game name - Orbitron 900 cyan with glow
      ctx.font = '900 36px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,240,255,0.6)';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(title, w / 2, 190);

      // Score - big gold with glow
      ctx.font = '900 96px Orbitron, monospace';
      ctx.shadowColor = 'rgba(255,215,0,0.6)';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#ffd700';
      ctx.fillText(scoreStr, w / 2, 320);

      // Reset shadow
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // Rank badge
      if (rank > 0 && rank <= 20) {
        ctx.font = '700 24px Orbitron, monospace';
        ctx.fillStyle = '#b44dff';
        ctx.fillText('GLOBAL #' + rank, w / 2, 380);
      }

      // Percentile
      var infoY = 420;
      if (percentile) {
        ctx.font = '500 22px Rajdhani, sans-serif';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('TOP ' + percentile + '% GLOBALLY', w / 2, infoY);
        infoY += 36;
      }

      // Streak
      if (streak) {
        ctx.font = '500 22px Rajdhani, sans-serif';
        ctx.fillStyle = '#ff8c00';
        ctx.fillText('\uD83D\uDD25 ' + streak + ' DAY STREAK', w / 2, infoY);
        infoY += 36;
      }

      // Player name
      ctx.font = '700 20px Rajdhani, sans-serif';
      ctx.fillStyle = '#8888aa';
      ctx.fillText('PLAYER: ' + name, w / 2, infoY);

      // Branding bottom-right
      ctx.textAlign = 'right';
      ctx.font = '700 18px Orbitron, monospace';
      ctx.shadowColor = 'rgba(0,240,255,0.4)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('NEON ARCADE', w - 40, h - 30);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      resolve(canvas);
    });
  }

  // ========== PROFILE & BADGES ==========
  var PROFILE_KEY = 'neonarcade_profile';
  var BADGES_KEY = 'neonarcade_badges';
  var HUB_STREAK_KEY = 'neonarcade_daily_hub_streak';

  function _loadProfile() {
    try {
      var data = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
      if (data && typeof data === 'object') {
        return {
          firstVisit: data.firstVisit || '',
          gamesPlayed: Array.isArray(data.gamesPlayed) ? data.gamesPlayed : [],
          challengeWins: data.challengeWins || 0,
          challengeLosses: data.challengeLosses || 0,
          topPercentiles: data.topPercentiles || {}
        };
      }
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
    if (cfg.game && profile.gamesPlayed.indexOf(cfg.game) === -1) {
      profile.gamesPlayed.push(cfg.game);
    }
    _saveProfile(profile);
  }

  function _updateProfilePercentile(game, percentile) {
    var profile = _loadProfile();
    var pct = parseInt(percentile, 10);
    if (isNaN(pct)) return;
    if (!profile.topPercentiles[game] || pct < profile.topPercentiles[game]) {
      profile.topPercentiles[game] = pct;
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

  // ========== INJECT STYLES ==========
  function injectStyles() {
    if (document.getElementById('neon-styles')) return;
    var el = document.createElement('style');
    el.id = 'neon-styles';
    el.textContent =
      // Score table
      '.ns-title{font-family:"Orbitron",monospace;font-size:11px;letter-spacing:3px;color:#ffd700;text-align:center;margin:12px 0 6px;text-shadow:0 0 8px rgba(255,215,0,.4)}' +
      '.ns-title-global{color:#b44dff;text-shadow:0 0 8px rgba(180,77,255,.4);margin-top:16px}' +
      '.ns-empty{font-family:"Rajdhani",sans-serif;font-size:13px;color:#7a7a9a;text-align:center}' +
      '.ns-row{display:flex;align-items:center;padding:3px 4px;border-bottom:1px solid rgba(255,255,255,.04);font-family:"Rajdhani",sans-serif}' +
      '.ns-you{background:rgba(0,240,255,.06);border-radius:3px}' +
      '.ns-rank{color:#7a7a9a;font-size:12px;width:24px;text-align:center}' +
      '.ns-name{color:#8888aa;font-size:13px;font-weight:700;width:40px;letter-spacing:1px}' +
      '.ns-val{color:#00f0ff;font-size:15px;font-weight:700;text-shadow:0 0 6px rgba(0,240,255,.3);flex:1;text-align:center}' +
      '.ns-time{color:#7a7a9a;font-size:11px;text-align:right;min-width:60px}' +
      // Name overlay
      '.ns-name-overlay{position:fixed;inset:0;z-index:9999;background:rgba(5,5,10,.92);display:flex;align-items:center;justify-content:center;animation:nsIn .3s ease}' +
      '@keyframes nsIn{from{opacity:0}to{opacity:1}}' +
      '.ns-name-box{text-align:center;padding:32px 40px;background:#0e0e1a;border:1px solid rgba(0,240,255,.15);border-radius:8px;box-shadow:0 0 40px rgba(0,240,255,.08)}' +
      '.ns-name-label{font-family:"Orbitron",monospace;font-weight:900;font-size:16px;letter-spacing:4px;color:#00f0ff;text-shadow:0 0 10px rgba(0,240,255,.5);margin-bottom:6px}' +
      '.ns-name-sub{font-family:"Rajdhani",sans-serif;font-weight:300;font-size:12px;letter-spacing:2px;color:#7a7a9a;margin-bottom:20px}' +
      '.ns-name-row{display:flex;justify-content:center;gap:8px;margin-bottom:20px}' +
      '.ns-name-slot{width:44px;height:56px;display:flex;align-items:center;justify-content:center;font-family:"Orbitron",monospace;font-weight:900;font-size:28px;color:#7a7a9a;border:2px solid rgba(255,255,255,.08);border-radius:4px;background:rgba(255,255,255,.02);cursor:pointer;transition:all .15s}' +
      '.ns-name-slot.active{border-color:rgba(0,240,255,.5);box-shadow:0 0 12px rgba(0,240,255,.15);color:#00f0ff}' +
      '.ns-name-slot.filled{color:#fff}' +
      '.ns-name-ok{font-family:"Orbitron",monospace;font-weight:700;font-size:13px;letter-spacing:3px;padding:10px 32px;border:1px solid #00f0ff;background:rgba(0,240,255,.06);color:#00f0ff;cursor:pointer;border-radius:3px;transition:all .2s}' +
      '.ns-name-ok:hover{background:rgba(0,240,255,.15);box-shadow:0 0 16px rgba(0,240,255,.2)}' +
      // Splash
      '.ns-splash{position:fixed;inset:0;z-index:10000;background:rgba(5,5,10,.85);display:flex;align-items:center;justify-content:center;cursor:pointer;animation:nsSplIn .4s cubic-bezier(.2,.8,.3,1.2)}' +
      '@keyframes nsSplIn{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}' +
      '.ns-splash.ns-splash-out{animation:nsSplOut .4s ease forwards}' +
      '@keyframes nsSplOut{to{opacity:0;transform:scale(.8)}}' +
      '.ns-splash-inner{text-align:center;position:relative}' +
      '.ns-splash-crown{font-size:64px;animation:nsBounce .6s ease infinite alternate}' +
      '@keyframes nsBounce{from{transform:translateY(0) scale(1)}to{transform:translateY(-8px) scale(1.1)}}' +
      '.ns-splash-msg{font-family:"Orbitron",monospace;font-weight:900;font-size:clamp(28px,7vw,48px);letter-spacing:6px;color:#ffd700;text-shadow:0 0 20px rgba(255,215,0,.6),0 0 60px rgba(255,215,0,.2);margin-top:12px;animation:nsGlow 1.5s ease infinite alternate}' +
      '@keyframes nsGlow{from{text-shadow:0 0 20px rgba(255,215,0,.6),0 0 60px rgba(255,215,0,.2)}to{text-shadow:0 0 30px rgba(255,215,0,.8),0 0 80px rgba(255,215,0,.4),0 0 120px rgba(255,215,0,.15)}}' +
      '.ns-splash-sub{font-family:"Rajdhani",sans-serif;font-weight:300;font-size:14px;letter-spacing:3px;color:#8888aa;margin-top:8px}' +
      '.ns-splash-p{position:absolute;width:6px;height:6px;border-radius:50%;top:50%;left:50%;animation:nsPart 1s ease-out forwards;pointer-events:none}' +
      '@keyframes nsPart{from{transform:translate(0,0) scale(1);opacity:1}to{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0}}' +
      // Hidden input for mobile keyboard
      '.ns-name-hidden{position:absolute;left:-9999px;top:0;width:1px;height:1px;opacity:0;font-size:16px}' +
      // Feedback buttons
      '.ns-fb-row{display:flex;justify-content:center;gap:12px;margin:10px 0 4px}' +
      '.ns-fb-btn{display:inline-flex;align-items:center;gap:5px;font-family:"Rajdhani",sans-serif;font-weight:500;font-size:13px;letter-spacing:1px;padding:6px 14px;border:1px solid rgba(0,240,255,0.2);background:rgba(0,240,255,0.04);color:#8888aa;cursor:pointer;border-radius:3px;transition:all .2s;text-transform:uppercase}' +
      '.ns-fb-btn:hover:not(:disabled){color:#00f0ff;border-color:rgba(0,240,255,0.4);background:rgba(0,240,255,0.1)}' +
      '.ns-fb-btn.ns-fb-issue{border-color:rgba(255,45,123,0.2);background:rgba(255,45,123,0.04)}' +
      '.ns-fb-btn.ns-fb-issue:hover:not(:disabled){color:#ff2d7b;border-color:rgba(255,45,123,0.4);background:rgba(255,45,123,0.1)}' +
      '.ns-fb-btn.ns-fb-sent{opacity:0.5;cursor:default}' +
      '.ns-fb-icon{font-size:15px}' +
      '.ns-fb-bar{position:fixed;bottom:8px;left:8px;z-index:800;display:flex}' +
      // Challenge bar
      '.ns-chal-bar{position:fixed;bottom:8px;right:8px;z-index:800}' +
      '.ns-chal-btn{font-family:"Orbitron",monospace;font-weight:700;font-size:11px;letter-spacing:2px;padding:10px 18px;border:1px solid #ff2d7b;background:rgba(255,45,123,0.06);color:#ff2d7b;cursor:pointer;border-radius:3px;text-transform:uppercase;animation:nsChalPulse 2s ease infinite}' +
      '.ns-chal-btn:hover{background:rgba(255,45,123,0.15);box-shadow:0 0 20px rgba(255,45,123,0.3)}' +
      '@keyframes nsChalPulse{0%,100%{box-shadow:0 0 4px rgba(255,45,123,0.2)}50%{box-shadow:0 0 16px rgba(255,45,123,0.5)}}' +
      // Challenge confirm toast
      '.ns-challenge-confirm{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:10001;font-family:"Orbitron",monospace;font-weight:700;font-size:13px;letter-spacing:2px;color:#39ff14;padding:12px 24px;background:rgba(10,10,18,0.95);border:1px solid rgba(57,255,20,0.4);border-radius:4px;box-shadow:0 0 20px rgba(57,255,20,0.2);animation:nsCcIn .3s ease}' +
      '@keyframes nsCcIn{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}' +
      '.ns-cc-out{animation:nsCcOut .3s ease forwards}' +
      '@keyframes nsCcOut{to{opacity:0;transform:translateX(-50%) translateY(-20px)}}' +
      // Challenge result overlay
      '.ns-challenge-result{position:fixed;inset:0;z-index:10000;background:rgba(5,5,10,0.9);display:flex;align-items:center;justify-content:center;cursor:pointer;animation:nsIn .4s ease}' +
      '.ns-cr-inner{text-align:center;padding:40px}' +
      '.ns-cr-icon{font-size:64px;margin-bottom:16px}' +
      '.ns-cr-msg{font-family:"Orbitron",monospace;font-weight:900;font-size:clamp(24px,6vw,42px);letter-spacing:4px;color:#ffd700;text-shadow:0 0 20px rgba(255,215,0,0.6),0 0 60px rgba(255,215,0,0.2);margin-bottom:12px}' +
      '.ns-cr-diff{font-family:"Rajdhani",sans-serif;font-weight:300;font-size:16px;letter-spacing:2px;color:#7a7a9a}' +
      '.ns-cr-out{animation:nsSplOut .4s ease forwards}' +
      // Streak badge
      '.ns-streak-badge{font-family:"Orbitron",monospace;font-weight:700;font-size:14px;color:#ffd700;text-shadow:0 0 8px rgba(255,215,0,0.4);display:inline-block}' +
      // Rank hint & percentile
      '.ns-rank-hint{font-family:"Rajdhani",sans-serif;font-weight:500;font-size:12px;letter-spacing:1px;color:#b44dff;text-align:center;margin-top:6px}' +
      '.ns-percentile{font-family:"Orbitron",monospace;font-weight:700;font-size:13px;letter-spacing:2px;color:#ffd700;text-shadow:0 0 8px rgba(255,215,0,0.4);text-align:center;margin-top:8px}';
    document.head.appendChild(el);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles);
  } else {
    injectStyles();
  }

  // ========== Backward compat aliases ==========
  // So landing pages using NeonAPI.* still work
  window.NeonAPI = api;
  // So games using NeonScores.* still work during migration
  window.NeonScores = {
    init: init, save: save, render: render, renderFeedback: renderFeedback,
    promptName: promptName, showGlobalSplash: showGlobalSplash,
    getHighScore: getHighScore, getName: getName, setName: setName,
    getGlobalRank: getGlobalRank, getGlobalBoard: getGlobalBoard,
    timeAgo: timeAgo, fmtScore: fmtScore,
    challenge: challenge, getChallenge: getChallenge, respondChallenge: respondChallenge,
    getDailySeed: getDailySeed, getStreak: getStreak, renderStreak: renderStreak,
    share: share, formatShare: formatShare, generateScoreCard: generateScoreCard,
    getPlaysToday: function() { return _playsToday || 0; },
    getPlaysTotal: function() { return _playsTotal || 0; },
    getPercentile: function() { return _lastPercentile; },
    getProfile: getProfile,
  };

  return {
    api: api,
    init: init,
    save: save,
    render: render,
    renderFeedback: renderFeedback,
    promptName: promptName,
    showGlobalSplash: showGlobalSplash,
    getHighScore: getHighScore,
    getName: getName,
    setName: setName,
    getGlobalRank: getGlobalRank,
    getGlobalBoard: getGlobalBoard,
    timeAgo: timeAgo,
    fmtScore: fmtScore,
    challenge: challenge,
    getChallenge: getChallenge,
    respondChallenge: respondChallenge,
    getDailySeed: getDailySeed,
    getStreak: getStreak,
    renderStreak: renderStreak,
    share: share,
    formatShare: formatShare,
    generateScoreCard: generateScoreCard,
    getPlaysToday: function() { return _playsToday || 0; },
    getPlaysTotal: function() { return _playsTotal || 0; },
    getPercentile: function() { return _lastPercentile; },
    getProfile: getProfile,
  };
})();
