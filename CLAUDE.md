# NEON ARCADE — Viral Web Games

## Project Overview
Collection of viral single-file HTML5 browser games under the "NEON ARCADE" brand. Each game is a standalone `.html` file — no build tools, no frameworks, no server required. Open the file, play instantly.

## Architecture
- Each game = 1 HTML file (HTML + CSS + JS, all inline)
- Shared client library: `public/neon.js` — unified API, scores, name input, global leaderboard UI
- 5 categories: `public/neonarcade/` (action), `public/neonmind/` (puzzles), `public/neongrind/` (skill/speed), `public/neonclassic/` (retro), `public/neoncasino/` (casino)
- Hub pages: `public/index.html` (main), plus category index pages
- Screenshots: `public/{category}/screenshots/{game-name}.png` — 1280x800 viewport captures (each category has its own screenshots subdir)
- Backend: Cloudflare Worker (`src/worker.js`) with KV storage at `neonarcade.net`
- Admin dashboards: `public/admin/stats.html`, `public/admin/topscores.html`
- All deployable web files live in `public/` — control files stay in root

## File Structure
```
public/                   # Deployed to Cloudflare Pages (wrangler assets directory)
  index.html              # Main hub page linking to 5 categories
  neon.js                 # Shared client library (API + scores + name + leaderboard + feedback UI)
  blog.html               # Behind-the-scenes blog
  updates.html            # Changelog
  _headers                # Cloudflare Pages security + content-type headers
  neonarcade/             # Action/arcade games
    index.html            # NEON ARCADE hub
    neon-snake.html, catalyst.html, pong-both-sides.html, ...
  neonmind/               # Classic brain puzzles
    index.html            # NEON MIND hub
    sudoku.html, queens.html, minesweeper.html, ...
  neongrind/              # Skill/speed games
    index.html            # NEON GRIND hub
    mathblitz.html, reflex-chain.html, ...
  neonclassic/            # Retro games reimagined
    index.html            # NEON CLASSIC hub
    tetris.html, invaders.html, breakout.html, ...
  neoncasino/             # Casino card & table games
    index.html            # NEON CASINO hub
    blackjack.html, poker.html, roulette.html, slots.html, video-poker.html
  admin/                  # Admin dashboards
    stats.html, topscores.html
  {category}/screenshots/ # PNG screenshots per category (e.g. neonarcade/screenshots/)

src/worker.js             # Cloudflare Worker backend
wrangler.toml             # Wrangler deployment config (assets.directory = "./public")
CLAUDE.md                 # Project instructions (not deployed)
VIRAL_GAME_IDEAS.md       # Ideas backlog (not deployed)
security.md               # Security audit report (not deployed)
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
--text-dim: #7a7a9a         (labels, hints — WCAG 4.5:1 on #0a0a12)
--text-mid: #9999bb         (body text — WCAG 4.5:1 on #0a0a12)
```
**Contrast rule:** All text must meet WCAG AA (4.5:1 ratio against its background). Never use colors darker than `#7a7a9a` for text on dark backgrounds.

### Typography
- Google Fonts: use `<link>` tag in `<head>` (NOT `@import` — it's render-blocking):
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap">
  ```
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
4. **Like/Report feedback** — Auto-injected by neon.js when `Neon.init()` is called (floating bar, bottom-left). Session-limited via sessionStorage. No game-side code needed — neon.js handles everything. For manual placement use `Neon.renderFeedback(containerEl, gameSlug)`.
5. **Neon.js integration (scores + leaderboard + name)** — Include shared library and use it for all score management:
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
   - Neon.js auto-injects like/report feedback bar — no extra code needed
6. **Sound effects** — Web Audio API (oscillator-based, no external audio files). At minimum: action sound, success sound, fail/death sound
7. **Mobile support** — Touch controls, `touch-action: none`, responsive canvas sizing, `user-scalable=no` in viewport meta
8. **Desktop support** — Keyboard controls (arrows/WASD/space as appropriate). **ESC key must quit to start screen** during gameplay — no score save, no game-over flow, just return to menu.
9. **HiDPI rendering** — Use `devicePixelRatio` for sharp canvas on Retina displays
10. **60fps** — Use `requestAnimationFrame` with delta-time or fixed timestep (for games with animation loops)
11. **SEO & meta tags** — Every game page must include (see template below):
    - `<title>` with format: `{Game Name} — Free Online {Genre} Game | NEON ARCADE`
    - `<meta name="description">` with unique game description
    - Preconnect hints for fonts.googleapis.com and fonts.gstatic.com
    - `<link rel="canonical">` pointing to `https://neonarcade.net/{category}/{game}.html`
    - `<link rel="manifest" href="/manifest.json">`
    - Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`)
    - Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`)
    - Schema.org structured data: `VideoGame` type + `BreadcrumbList`
12. **Accessibility** — Use `<main>` landmark on hub/landing pages. Ensure text meets WCAG AA contrast (4.5:1). Links must be distinguishable by more than color alone (use underline or border).

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

### SEO Head Template (copy into every new game)
```html
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>{Game Name} — Free Online {Genre} Game | NEON ARCADE</title>
<meta name="description" content="Play {Game Name} free online — {unique description}. No download, no login.">
<meta name="keywords" content="{game name}, free {genre} game online, browser game, neon arcade">
<meta name="author" content="NEON ARCADE">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#0a0a12">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="canonical" href="https://neonarcade.net/{category}/{game-slug}.html">
<link rel="manifest" href="/manifest.json">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://neonarcade.net/{category}/{game-slug}.html">
<meta property="og:title" content="{Game Name} — Free Online {Genre} Game | NEON ARCADE">
<meta property="og:description" content="Play {Game Name} free online — {unique description}.">
<meta property="og:image" content="https://neonarcade.net/{category}/screenshots/{game-slug}.png">
<meta property="og:image:width" content="1280">
<meta property="og:image:height" content="800">
<meta property="og:site_name" content="NEON ARCADE">
<meta property="og:locale" content="en_US">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:url" content="https://neonarcade.net/{category}/{game-slug}.html">
<meta name="twitter:title" content="{Game Name} — Free Online {Genre} Game | NEON ARCADE">
<meta name="twitter:description" content="Play {Game Name} free online — {unique description}.">
<meta name="twitter:image" content="https://neonarcade.net/{category}/screenshots/{game-slug}.png">

<!-- Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "{Game Name}",
  "url": "https://neonarcade.net/{category}/{game-slug}.html",
  "description": "Play {Game Name} free online — {unique description}.",
  "genre": "{Genre}",
  "gamePlatform": "Web Browser",
  "applicationCategory": "Game",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "author": { "@type": "Organization", "name": "NEON ARCADE", "url": "https://neonarcade.net" },
  "image": "https://neonarcade.net/{category}/screenshots/{game-slug}.png",
  "inLanguage": "en",
  "isFamilyFriendly": true
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://neonarcade.net/" },
    { "@type": "ListItem", "position": 2, "name": "{CATEGORY NAME}", "item": "https://neonarcade.net/{category}/" },
    { "@type": "ListItem", "position": 3, "name": "{Game Name}", "item": "https://neonarcade.net/{category}/{game-slug}.html" }
  ]
}
</script>

<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap">
<style>
  /* game styles here */
</style>
</head>
```

## How to Add a New Game

1. Create `public/{category}/{game-name}.html` in the appropriate category folder:
   - `public/neonarcade/` — action/arcade games
   - `public/neonmind/` — classic brain puzzles (sudoku, minesweeper, etc.)
   - `public/neongrind/` — skill/speed challenges
   - `public/neonclassic/` — retro games reimagined
   - `public/neoncasino/` — casino card & table games (shared bankroll system)
2. Follow the visual style guide above exactly (colors, typography, effects, contrast)
   - **CRITICAL**: Use ONLY the standard palette colors. NEVER use #000/#000000 for backgrounds (use #0a0a12). NEVER use non-standard accent colors like #ffff00, #00e5ff, #ff6622 etc.
   - **REQUIRED effects**: scanline overlay (body::after), screen shake (@keyframes shake), particle effects, neon glow (text-shadow)
3. Copy the SEO head template above and fill in ALL placeholders — especially:
   - `og:locale` (en_US) — MUST be included
   - `twitter:url` — MUST be included, matching canonical URL
   - Screenshot path in OG/Twitter/JSON-LD MUST use category subdir: `https://neonarcade.net/{category}/screenshots/{game-slug}.png`
4. Include `<script src="/neon.js"></script>` and integrate with Neon.init/save/render (see Required Features #5)
5. Include all required features (start screen, game over, share, neon.js scores, sound, mobile, SEO)
6. **Canvas games MUST use HiDPI rendering**:
   ```javascript
   var dpr = window.devicePixelRatio || 1;
   canvas.width = logicalWidth * dpr;
   canvas.height = logicalHeight * dpr;
   canvas.style.width = logicalWidth + 'px';
   canvas.style.height = logicalHeight + 'px';
   ctx.scale(dpr, dpr);
   ```
7. Take a screenshot at 1280x800 and save as `public/{category}/screenshots/{game-name}.png`
8. Add a card to the category's `index.html` hub page following the existing card pattern:
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
9. Update the hub page game count in the stats section
10. **Update `public/index.html` CATALOG array** — add the new game entry with slug, name, desc, img path
11. **Update `public/index.html` game counts** — update "ALL X GAMES" link text and total game count in header/SEO
12. **Register game in `src/worker.js` KNOWN_GAMES** — add slug with mode ('high'/'low') and maxScore
13. **Update `public/updates.html`** — add changelog entry for the new game
14. **Update `public/sitemap.xml`** — add `<url>` entry for the new game
15. **Update `public/llms.txt`** — add the game to the appropriate category listing
16. Available accent colors for cards: `cyan`, `pink`, `green`, `gold`, `purple`, `orange`, `white`
17. Available badges: `badge-new` (green), `badge-hot` (pink), `badge-classic` (gold), `badge-mind` (purple), `badge-casino` (gold)

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
- Verify mobile touch controls work (including name input keyboard)
- Check localStorage persistence
- Test share button copies correct format
- Screenshot at 1280x800 for landing page cards
- Verify like/report buttons appear and are session-limited
- Check SEO: `<title>`, meta description, OG tags, structured data, canonical URL
- Run Lighthouse: no render-blocking @import, contrast meets 4.5:1, landmarks present
- Links must be distinguishable without color (underline or border)
