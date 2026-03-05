# NEON ARCADE — Viral Web Games

## Project Overview
Collection of viral single-file HTML5 browser games under the "NEON ARCADE" brand. Each game is a standalone `.html` file — no build tools, no frameworks, no server required. Open the file, play instantly.

## Architecture
- Each game = 1 HTML file (HTML + CSS + JS, all inline)
- Landing page: `landing.html` — card grid linking to all games with screenshots
- Screenshots: `screenshots/{game-name}.png` — 1280x800 viewport captures
- Game ideas backlog: `VIRAL_GAME_IDEAS.md` — ranked list of 25+ concepts

## File Structure
```
index.html                # Main landing page (NEON ARCADE hub)
neon-snake.html           # Neon Snake (the original)
impostor-pixel.html       # Spot the different tile
catalyst.html             # One-touch chain reaction
pong-both-sides.html      # Control both paddles
afterglow.html            # Toxic trail maze
flappy-rewind.html        # Forward + rewind with inverted gravity
palette.html              # Color matching / Color IQ
pacman-amnesia.html       # Invisible maze Pac-Man
screenshots/              # PNG screenshots for landing page
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
2. **Game over screen** — Stats, high score comparison, SHARE button, PLAY AGAIN button
3. **Share button** — Copies emoji-based result to clipboard via `navigator.clipboard.writeText()`. Use `navigator.share()` as primary on mobile with clipboard fallback
4. **High score** — Persisted via `localStorage.setItem('gamename_best', score)`
5. **Sound effects** — Web Audio API (oscillator-based, no external audio files). At minimum: action sound, success sound, fail/death sound
6. **Mobile support** — Touch controls, `touch-action: none`, responsive canvas sizing, `user-scalable=no` in viewport meta
7. **Desktop support** — Keyboard controls (arrows/WASD/space as appropriate)
8. **HiDPI rendering** — Use `devicePixelRatio` for sharp canvas on Retina displays
9. **60fps** — Use `requestAnimationFrame` with delta-time or fixed timestep

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

1. Create `{game-name}.html` in project root (single file, self-contained)
2. Follow the visual style guide above exactly
3. Include all required features (start screen, game over, share, high score, sound, mobile)
4. Take a screenshot at 1280x800 and save as `screenshots/{game-name}.png`
5. Add a card to `landing.html` following the existing card pattern:
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
       <div class="card-tags">
         <span class="tag">{Tag1}</span>
         <span class="tag">{Tag2}</span>
         <span class="tag">{Tag3}</span>
       </div>
       <div class="card-play">PLAY NOW <span class="play-arrow">→</span></div>
     </div>
   </a>
   ```
6. Available accent colors for cards: `cyan`, `pink`, `green`, `gold`, `purple`, `orange`, `white`
7. Available badges: `badge-new` (green), `badge-hot` (pink), `badge-classic` (gold)

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
- Serve locally: `python3 -m http.server 8777`
- Test each game loads and is playable
- Verify mobile touch controls work
- Check localStorage persistence
- Test share button copies correct format
- Screenshot at 1280x800 for landing page cards
