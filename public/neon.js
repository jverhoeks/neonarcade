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
    submitScore: function(game, name, score, mode) {
      return _post('/leaderboard/' + game, { name: name, score: score, mode: mode || 'high' });
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
    playerName = localStorage.getItem(NAME_KEY) || '';
    localScores = JSON.parse(localStorage.getItem(cfg.key) || '[]');
    lastGlobalRank = -1;
    globalBoard = [];

    api.play(cfg.game);
    api.leaderboard(cfg.game).then(function(data) {
      if (data && data.leaderboard) globalBoard = data.leaderboard;
    });

    // Auto-inject floating feedback bar
    _injectFeedbackBar(cfg.game);
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
  // Returns promise: { scores, isNewBest, globalRank }
  function save(score) {
    // Reject null/undefined/NaN scores — but allow 0 (valid for time-based puzzles)
    if (score === null || score === undefined || score !== score) {
      return Promise.resolve({ scores: localScores, isNewBest: false, globalRank: -1 });
    }

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

    if (playerName && qualifies) {
      return api.submitScore(cfg.game, playerName, score, cfg.mode).then(function(data) {
        if (data && data.leaderboard) {
          globalBoard = data.leaderboard;
          for (var i = 0; i < globalBoard.length; i++) {
            if (globalBoard[i].name === playerName && globalBoard[i].score === score) {
              lastGlobalRank = i + 1;
              break;
            }
          }
        }
        return { scores: localScores, isNewBest: isNewBest, globalRank: lastGlobalRank };
      });
    }

    return Promise.resolve({ scores: localScores, isNewBest: isNewBest, globalRank: -1 });
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

      globalBoard.slice(0, 10).forEach(function(s, i) {
        var isYou = lastGlobalRank === i + 1;
        var row = _makeRow('#' + (i + 1), s.name || '???', fmtScore(s.score), null, isYou);
        container.appendChild(row);
      });
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
      '.ns-fb-bar{position:fixed;bottom:8px;left:8px;z-index:800;display:flex}';
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
  };
})();
