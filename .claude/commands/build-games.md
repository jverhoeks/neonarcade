---
description: Build 3 new games for the most underserved category, then run full audit, security check, and publish changelog + blog post
---

# NEON ARCADE — Build Games

Build 3 new games for the category that needs them most, run full quality checks, then document everything.

## Step 1: Identify Target Category

Count games per category and pick the most underserved:
```bash
for dir in neonarcade neonmind neongrind neonclassic neoncasino neonquest; do
  count=$(ls public/$dir/*.html 2>/dev/null | grep -v index.html | wc -l)
  echo "$dir: $count games"
done
```

Read `VIRAL_GAME_IDEAS.md` to find the top 3 unbuilt ideas for that category. Pick games with:
- Build difficulty 1-2/5 (quick wins)
- HIGH viral potential
- Not yet built (check the "Already Built" tables)

If the user specified a category or games, use those instead.

## Step 2: Plan All 3 Games

For each game, before writing code, define:
1. **Game slug** (e.g., `nback`, `slitherlink`, `aimtrainer`)
2. **Category path** (e.g., `public/neongrind/`)
3. **neon.js storage key** (e.g., `neonarcade_neongrind_nback_scores`)
4. **Score mode** (`high` or `low`)
5. **maxScore** for worker.js registration
6. **Controls**: keyboard + touch
7. **Share format**: emoji text output

## Step 3: Build Each Game

For each of the 3 games, create `public/{category}/{slug}.html` following ALL rules from CLAUDE.md:

### Required in every game:
- Full SEO head (title, description, canonical, OG, Twitter, JSON-LD VideoGame + BreadcrumbList)
- Visual style: #0a0a12 bg, neon palette, Orbitron/Rajdhani fonts via `<link>` (never @import)
- `body::after` scanline overlay
- `@keyframes shake` screen shake
- Particle effects
- Neon glow text-shadow
- Start screen + game over screen
- SHARE button (navigator.share + clipboard fallback)
- neon.js: `Neon.init()`, `Neon.promptName()`, `Neon.save()`, `Neon.render()`
- Web Audio API sound effects (oscillator-based)
- Touch controls + keyboard controls
- ESC key returns to start screen
- Canvas games: `devicePixelRatio` HiDPI rendering
- `requestAnimationFrame` game loop

### Code structure:
```javascript
(() => {
  // CONFIG
  // DOM refs
  // Sizing/responsive
  // State
  // Neon.init()
  // init() / reset()
  // Game loop
  // Input handlers (keyboard + touch)
  // Start / restart
  // Game over → Neon.promptName → Neon.save → Neon.render
  // Share function
})();
```

## Step 4: Take Screenshots

After building each game, take a 1280x800 screenshot:
1. Start a local server: `cd public && python3 -m http.server 8777 &`
2. Use Playwright to navigate to `http://localhost:8777/{category}/{slug}.html`
3. Resize to 1280x800
4. Take screenshot → save to `public/{category}/screenshots/{slug}.png`
5. Kill server when done

## Step 5: Update Hub Pages

For EACH game, update the category hub `public/{category}/index.html`:
- Add game card following the existing card pattern (see CLAUDE.md)
- Update game count in stats section

Update `public/index.html`:
- Add game to CATALOG array
- Update "ALL X GAMES" link text
- Update total game count in header/SEO

## Step 6: Register in Backend

In `src/worker.js`, add each slug to KNOWN_GAMES:
```javascript
'{slug}': { mode: 'high', maxScore: {reasonable_max} },
```

## Step 7: Run Full Audit

```bash
node scripts/validate-html.js public/{category}/{slug1}.html public/{category}/{slug2}.html public/{category}/{slug3}.html
node scripts/audit-games.js public/{category}/{slug1}.html public/{category}/{slug2}.html public/{category}/{slug3}.html
```

Fix ALL errors before proceeding. Zero errors required.

Also run smoke test if Playwright is available:
```bash
node scripts/smoke-test.js public/{category}/{slug1}.html public/{category}/{slug2}.html public/{category}/{slug3}.html
```

## Step 8: Security Check

For each new game, verify:
- [ ] No `eval()` or `new Function()` with dynamic strings
- [ ] No `innerHTML` with user-controlled content
- [ ] All `localStorage` access wrapped in try/catch
- [ ] `atob()`/`JSON.parse()` on URL params has size limits and try/catch
- [ ] Canvas uses `#0a0a12` not `#000` for backgrounds (except light mask compositing)
- [ ] No external scripts loaded (only /neon.js and Google Fonts)

## Step 9: Update public/updates.html

Add a new `<div class="date-section">` at the TOP of `<main class="timeline">` with today's date. Use this exact pattern:

```html
<!-- MONTH DD, YYYY — CATEGORY: 3 NEW GAMES -->
<div class="date-section">
  <div class="date-marker">
    <div class="date-dot {color}"></div>
    <div class="date-info">
      <div class="date-text {color}">MONTH DD, YYYY</div>
      <div class="wave-label">NEW GAMES — {CATEGORY NAME} ({N} games)</div>
    </div>
  </div>
  <div class="game-list">
    <a href="/{category}/{slug}.html" class="game-entry">
      <div class="game-num">{next number}</div>
      <div class="game-details">
        <div class="game-header">
          <span class="game-name">{GAME NAME}</span>
          <span class="cat-tag {tag}">{CATEGORY}</span>
        </div>
        <div class="game-desc">{2-sentence description of what makes it fun/unique}</div>
        <div class="game-quip">"{witty one-liner about the game}"</div>
      </div>
      <div class="game-play">PLAY &rarr;</div>
    </a>
    <!-- repeat for each game -->
  </div>
</div>
```

Available colors: `cyan`, `gold`, `green`, `pink`, `purple`
Available cat-tags: `arcade`, `mind`, `grind`, `classic`, `casino`, `quest`

## Step 10: Write Blog Post in public/blog.html

Since we're adding 3 games, always write a blog post.

### Add JSON-LD in `<head>` (after the last existing Article JSON-LD):
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{Title}",
  "description": "{One-line description}",
  "url": "https://neonarcade.net/blog.html#{anchor}",
  "datePublished": "{YYYY-MM-DD}",
  "author": { "@type": "Organization", "name": "NEON ARCADE", "url": "https://neonarcade.net" },
  "publisher": { "@type": "Organization", "name": "NEON ARCADE", "url": "https://neonarcade.net", "logo": { "@type": "ImageObject", "url": "https://neonarcade.net/og-image.png" } },
  "image": "https://neonarcade.net/og-image.png",
  "mainEntityOfPage": "https://neonarcade.net/blog.html#{anchor}"
}
</script>
```

### Add article section in `<main>` (before the first existing `<section class="article">`):
```html
<section class="article" id="{anchor}">
  <div class="article-meta">
    <span class="article-num">{next article number}</span>
    <span class="article-date">{Month DD, YYYY}</span>
  </div>
  <h2 class="article-title">{Title}</h2>

  <p>{Opening paragraph — what category we expanded and why it needed these games. Be specific: "NEON GRIND had 8 games. The gap was cognitive tests..."}</p>

  <div class="stats-row">
    <div class="stat-box">
      <div class="stat-val {color}">{N}</div>
      <div class="stat-label">New Games</div>
    </div>
    <div class="stat-box">
      <div class="stat-val">{total for category}</div>
      <div class="stat-label">{Category} Total</div>
    </div>
    <div class="stat-box">
      <div class="stat-val green">{total all games}</div>
      <div class="stat-label">Total Games</div>
    </div>
  </div>

  <h3>{Game 1 Name}</h3>
  <p>{What the game is, the core mechanic, why it's viral-ready. Include the sharing hook.}</p>

  <h3>{Game 2 Name}</h3>
  <p>{Same treatment — mechanic, viral hook, what makes it satisfying.}</p>

  <h3>{Game 3 Name}</h3>
  <p>{Same treatment.}</p>

  <h3>What We Learned</h3>
  <p>{1-2 paragraphs on an interesting technical challenge, design decision, or pattern observed across building these games. Be specific — mention actual code, actual numbers, actual tradeoffs.}</p>
</section>
```

Blog post voice: technical and direct, engineer talking to engineer. Lead with the problem, then solution, then what you learned. Specific numbers over vague claims. Under 600 words.

## Step 11: Update public/sitemap.xml

Add `<url>` entries for each new game.

## Step 12: Update public/llms.txt

Add each game to the appropriate category listing.

## Step 13: Commit, Push, PR

```bash
git checkout -b claude/build-{category}-games-{date}
git add public/{category}/*.html public/{category}/screenshots/*.png public/index.html public/updates.html public/blog.html public/sitemap.xml src/worker.js
git commit -m "Add 3 new {CATEGORY} games: {Game1}, {Game2}, {Game3}"
git push -u origin HEAD
gh pr create --title "Add 3 new {CATEGORY} games" --body "..."
```

## Quality Checklist (verify before PR)

- [ ] All 3 games load without JS errors
- [ ] `node scripts/audit-games.js` shows 0 errors for new games
- [ ] `node scripts/validate-html.js` shows 0 errors for new games
- [ ] Screenshots saved at `public/{category}/screenshots/{slug}.png`
- [ ] Game cards added to category hub page
- [ ] CATALOG array updated in public/index.html
- [ ] Game counts updated in public/index.html
- [ ] Worker KNOWN_GAMES updated for all 3 slugs
- [ ] updates.html entry added at top of timeline
- [ ] Blog post added at top of articles in blog.html
- [ ] sitemap.xml updated
- [ ] llms.txt updated
