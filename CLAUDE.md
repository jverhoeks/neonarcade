# NEON ARCADE — Viral Web Games

## Project Overview
Collection of viral single-file HTML5 browser games under the "NEON ARCADE" brand. Each game is a standalone `.html` file — no build tools, no frameworks, no server required. Open the file, play instantly.

## Architecture
- Each game = 1 HTML file (HTML + CSS + JS, all inline)
- Shared client library: `public/neon.js` — unified API, scores, name input, global leaderboard UI
- 6 categories: `public/neonarcade/` (action), `public/neonmind/` (puzzles), `public/neongrind/` (skill/speed), `public/neonchill/` (zen/relaxation), `public/neondaily/` (daily challenges), `public/neonsocial/` (multiplayer)
- Hub pages: `public/index.html` (main), `public/neonarcade/index.html`, `public/neonmind/index.html`, `public/neongrind/index.html`, `public/neonchill/index.html`
- Screenshots: `public/screenshots/{game-name}.png` — 1280x800 viewport captures
- Backend: Cloudflare Worker (`src/worker.js`) with KV storage at `neonarcade.net`
- Admin dashboards: `public/admin/stats.html`, `public/admin/topscores.html`
- All web-servable files live under `public/` — config, docs, and source stay at root

## File Structure
```
public/                   # All web-servable assets (Cloudflare assets directory)
  index.html              # Main hub page linking to categories
  updates.html            # Development log / updates page
  neon.js                 # Shared client library (API + scores + name + leaderboard UI)
  api.js                  # Legacy API client (backward compat)
  manifest.json           # PWA manifest
  robots.txt              # Search engine directives
  sitemap.xml             # Sitemap for SEO
  og-image.png            # Open Graph social image
  404.html                # Custom 404 page
  neonarcade/             # Action/arcade games
    index.html            # NEON ARCADE hub
    neon-snake.html, catalyst.html, pong-both-sides.html, ...
  neonmind/               # Classic brain puzzles
    index.html            # NEON MIND hub
    sudoku.html, queens.html, minesweeper.html, ...
  neongrind/              # Skill/speed games
    index.html            # NEON GRIND hub
    mathblitz.html, reflex-chain.html, ...
  neonchill/              # Zen/relaxation games
    index.html            # NEON CHILL hub
    sandfall.html, silk-draw.html, neon-garden.html, constellation.html
  neondaily/              # Daily challenge games
    signal-daily.html, territory-daily.html, neon-grid.html
  neonsocial/             # Async multiplayer games
    mimic.html, veto.html, same-wave.html
  admin/                  # Admin dashboards
    stats.html, topscores.html
  screenshots/            # PNG screenshots for landing page cards
  blog/                   # Blog posts (markdown)
src/worker.js             # Cloudflare Worker backend
wrangler.toml             # Cloudflare Workers config
CLAUDE.md                 # Project instructions
VIRAL_GAME_IDEAS.md       # Full ideas backlog with 25+ ranked concepts
```

## Visual Style Guide (MANDATORY for all games)

### Colors
```
--bg-deep: #0a0a12          (page background)
--bg-surface: #12121f       (card/surface background)
--neon-cyan: #00f0ff        (primary accent, titles, buttons)
--neon-green: #39ff14       (success, easy items)
--neon-gold: #ffd700        (rewards, hard items)
--neon-pink: #ff2d7b        (danger, errors, game over)
--neon-purple: #b44dff      (secondary accent)
--neon-orange: #ff8c00      (warnings, power-ups)
--text-dim: #4a4a6a         (labels, hints)
--text-mid: #8888aa         (body text)
```

### Typography
- Google Fonts import: `@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap');`
- Headings/titles/scores: `font-family: 'Orbitron', monospace;`
- Body/labels/descriptions: `font-family: 'Rajdhani', sans-serif;`
- Title weight: 900, letter-spacing: 4-8px
- Labels: weight 300, letter-spacing: 2-3px, uppercase

### Visual Effects (apply to ALL games)
- Scanline overlay on body::after (repeating-linear-gradient, 2px transparent + 2px rgba(0,0,0,0.06-0.08))
- Neon glow via text-shadow: `0 0 10px rgba(color, 0.6), 0 0 40px rgba(color, 0.2)`
- Box glow via box-shadow on interactive elements
- Background: radial gradients with subtle colored glows (cyan top, pink bottom-right)
- Screen shake animation on errors/death (translate -3px to 3px, 0.25s)
- Particle effects for feedback (spawn 8-20 particles on events)

### Common CSS Patterns
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; overflow: hidden; background: #0a0a12; font-family: 'Rajdhani', sans-serif; color: #fff; touch-action: none; -webkit-user-select: none; user-select: none; }
```

### Button Style
```css
.play-btn {
  font-family: 'Orbitron', monospace; font-weight: 700; font-size: 14px;
  letter-spacing: 3px; padding: 14px 40px;
  border: 1px solid #00f0ff; background: rgba(0,240,255,0.06);
  color: #00f0ff; cursor: pointer; border-radius: 3px;
  text-transform: uppercase;
}
.play-btn:hover { background: rgba(0,240,255,0.15); box-shadow: 0 0 20px rgba(0,240,255,0.2); transform: scale(1.04); }
```

## Game Development Rules

### Required Features (EVERY game must have)
1. **Start screen** — Game title (Orbitron 900), subtitle explaining the hook, START button, controls hint
2. **Game over / completion screen** — Stats, high score comparison, SHARE button, PLAY AGAIN button
3. **Share button** — Copies emoji-based result to clipboard via `navigator.clipboard.writeText()`. Use `navigator.share()` as primary on mobile with clipboard fallback
4. **Neon.js integration (scores + leaderboard + name)** — Include shared library and use it for all score management:
   ```html
   <!-- Include at end of body, BEFORE your game script -->
   <script src="/neon.js"></script>
   ```
   ```javascript
   // Initialize on page load (call once)
   Neon.init({
     game: 'game-slug',           // Used for API + leaderboard key
     mode: 'high',                // 'high' = higher is better, 'low' = lower is better (time puzzles)
     key: 'neonarcade_neonmind_gamename_scores',  // localStorage key (custom per variant if needed)
     formatScore: function(s) {   // Optional: custom display formatter
       var m = Math.floor(s / 60);
       var sec = Math.floor(s % 60);
       return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
     }
   });

   // On game complete:
   // 1. Prompt for name if not set
   var nameReady = Neon.getName() ? Promise.resolve() : Neon.promptName();
   nameReady.then(function() {
     // 2. Save score (local top 10 + global submission)
     return Neon.save(finalScore);
   }).then(function(result) {
     // result = { scores, isNewBest, globalRank }
     // 3. Render leaderboard table
     Neon.render(document.getElementById('leaderboard-container'));
     // 4. Show celebration if global top 5
     if (result.globalRank >= 1 && result.globalRank <= 5) {
       Neon.showGlobalSplash(result.globalRank);
     }
   });

   // To show leaderboard on start screen:
   Neon.render(document.getElementById('startLB'));
   // To get current high score for display:
   var best = Neon.getHighScore();
   ```
   **Important patterns:**
   - For games with multiple difficulties/sizes: re-call `Neon.init()` with updated `key` when difficulty changes
   - Storage key convention: `neonarcade_{category}_{game}_scores_{variant}` (e.g. `neonarcade_neonmind_queens_scores_7`)
   - Provide a `<div id="...LB"></div>` container — Neon.js renders the full score table + global leaderboard
   - Neon.js auto-injects its own CSS styles, no need to add leaderboard styling
5. **Sound effects** — Web Audio API (oscillator-based, no external audio files). At minimum: action sound, success sound, fail/death sound
6. **Mobile support** — Touch controls, `touch-action: none`, responsive canvas sizing, `user-scalable=no` in viewport meta
7. **Desktop support** — Keyboard controls (arrows/WASD/space as appropriate)
8. **HiDPI rendering** — Use `devicePixelRatio` for sharp canvas on Retina displays
9. **60fps** — Use `requestAnimationFrame` with delta-time or fixed timestep (for games with animation loops)

### Code Structure Pattern
```javascript
(() => {
  // CONFIG constants at top
  // DOM element references
  // Sizing/responsive logic
  // Game state variables
  // init() function
  // Core game loop (tick/update + draw)
  // Input handlers (keyboard + touch)
  // Start/restart functions
  // Render loop for idle animations
})();
```

### Sharing Format Template
```
[emoji] GAME NAME
[key stat]: [value] | [key stat]: [value]
[visual representation using emoji blocks]
[call to action]
```

## Viral Design Principles (apply to every game)
- Zero friction: open link, playing in <3 seconds
- Sessions <60 seconds preferred
- Clear "one more try" hook
- Emotional spikes (surprise, frustration, awe) drive sharing
- Simple to understand in 5 seconds, hard to master
- Every game should produce a moment worth screenshotting or sharing

## How to Add a New Game

1. Create `public/{category}/{game-name}.html` in the appropriate category folder:
   - `public/neonarcade/` — action/arcade games
   - `public/neonmind/` — classic brain puzzles (sudoku, minesweeper, etc.)
   - `public/neongrind/` — skill/speed challenges
   - `public/neonchill/` — zen/relaxation games
   - `public/neondaily/` — daily challenge games
   - `public/neonsocial/` — async multiplayer games
2. Follow the visual style guide above exactly
3. Include `<script src="/neon.js"></script>` and integrate with Neon.init/save/render (see Required Features #4)
4. Include all required features (start screen, game over, share, neon.js scores, sound, mobile)
5. Take a screenshot at 1280x800 and save as `public/screenshots/{game-name}.png`
6. Add a card to the category's `index.html` hub page following the existing card pattern:
   ```html
   <a href="{game-name}.html" class="game-card" data-accent="{color}">
     <div class="card-screenshot">
       <img src="screenshots/{game-name}.png" alt="{Game Name}" onerror="this.style.display='none';this.parentElement.querySelector('.placeholder').style.display='block'">
       <div class="placeholder" style="display:none">[emoji]</div>
       <span class="card-badge badge-new">NEW</span>
     </div>
     <div class="card-body">
       <span class="card-number">GAME XX</span>
       <h2 class="card-title">{GAME NAME}</h2>
       <p class="card-desc">{2-3 sentence description of the hook}</p>
       <div class="card-meta">
         <span class="meta-item"><strong>N</strong> detail</span>
         <span class="meta-item">Category</span>
       </div>
       <div class="card-tags">
         <span class="tag">{Tag1}</span>
         <span class="tag">{Tag2}</span>
         <span class="tag">{Tag3}</span>
       </div>
       <div class="card-play">PLAY NOW <span class="play-arrow">&rarr;</span></div>
     </div>
   </a>
   ```
7. Update the hub page game count in the stats section
8. Available accent colors for cards: `cyan`, `pink`, `green`, `gold`, `purple`, `orange`, `white`
9. Available badges: `badge-new` (green), `badge-hot` (pink), `badge-classic` (gold), `badge-mind` (purple)

## Ideas Backlog
See `VIRAL_GAME_IDEAS.md` for 25+ ranked game concepts organized in tiers:
- TIER 1: High viral + low build effort (build these next)
- TIER 2: High viral + medium build effort
- TIER 3: Ambitious breakout potential
- Honorable mentions

### Next games to build (from TIER 1-2 not yet built):
- TERRITORY — Daily grid strategy puzzle (2/5 difficulty)
- SIGNAL — Daily cipher puzzle with funny messages (2/5)
- BURNDOWN — Speedrun tower of micro-tasks (3/5)
- MINE FINDER — Reverse Minesweeper vs AI (4/5)
- PRIORSELF — Ghost-cooperation puzzle platformer (2/5 code, hard level design)
- TETRIS BETRAYAL — Play Tetris badly on purpose (3/5)
- FAULTLINE — Find the shifted pixel row in photos (3/5)
- WORDCHAIN DUEL — Async 1v1 word chain challenge (2/5)
- DOODLE DROP — Draw platforms while falling (3/5)
- BREAKOUT ARCHITECT — Design levels, challenge friends (3/5)

## Testing
- Serve locally: `cd public && python3 -m http.server 8777`
- Test each game loads and is playable
- Verify mobile touch controls work
- Check localStorage persistence
- Test share button copies correct format
- Screenshot at 1280x800 for landing page cards
