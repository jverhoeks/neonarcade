---
description: Run comprehensive audits on all NEON ARCADE games — checks neon.js integration, color palette, SEO, security, performance, and JS runtime errors. Fixes issues, updates changelog, and optionally writes a blog post.
---

# NEON ARCADE Game Audit

Run a comprehensive audit of all game HTML files. Fix issues found, update the changelog, and write a blog post if the audit is significant.

## Available Scripts

All scripts are in the `scripts/` directory:

### 1. Full Audit (static checks)
```bash
node scripts/audit-games.js
```
Checks: neon.js integration, color palette compliance, SEO tags, security patterns, performance, visual effects.

Options:
- `--json` — JSON output for programmatic use
- `--category=neonarcade` — audit only one category
- Pass specific file paths to audit individual games

### 2. HTML/JS Validation
```bash
node scripts/validate-html.js
```
Checks: HTML structure, JS syntax (via vm.Script), required patterns, dangerous code patterns.

### 3. Smoke Test (runtime JS errors via Playwright)
```bash
node scripts/smoke-test.js
```
Starts a local server with mocked API endpoints, loads every game in headless Chromium, checks for JS runtime errors. Requires: `npx playwright` (auto-installs on first run).

## Workflow — Follow These Steps

### Step 1: Run All Audits
```bash
node scripts/validate-html.js && node scripts/audit-games.js
```
Optionally also run `node scripts/smoke-test.js` for runtime testing.

### Step 2: Report Findings
Summarize in a table: game, issue type, severity, details.

### Step 3: Fix Errors
Fix all ERROR-level issues. Discuss WARN-level issues with user before changing.

### Step 4: Re-run Audits
Verify fixes by re-running the scripts. Iterate until 0 errors.

### Step 5: ALWAYS Update `public/updates.html`
**This is mandatory after ANY fixes.** Add a new date-section entry at the TOP of the `<main class="timeline">` section. Follow the existing format exactly:

```html
<!-- DATE — DESCRIPTION -->
<div class="date-section">
  <div class="date-marker">
    <div class="date-dot cyan"></div>
    <div class="date-info">
      <div class="date-text cyan">MONTH DD, YYYY</div>
      <div class="wave-label">MAINTENANCE — Game Audit Fixes</div>
    </div>
  </div>
  <div class="game-list">
    <!-- One game-entry per fix -->
    <div class="game-entry" style="cursor:default">
      <div class="game-num" style="color:var(--neon-cyan)">FIX</div>
      <div class="game-details">
        <div class="game-header">
          <span class="game-name">GAME NAME</span>
          <span class="cat-tag arcade">CATEGORY</span>
        </div>
        <div class="game-desc">Description of what was fixed.</div>
      </div>
    </div>
    <!-- Repeat for each fix -->
  </div>
</div>
```

Available dot/text colors: `cyan`, `gold`, `green`, `pink`, `purple`.
Available cat-tags: `arcade`, `mind`, `grind`, `classic`, `casino`, `quest`.

### Step 6: Write Blog Post (if significant audit)
**Write a blog post in `public/blog.html` if the audit found 3+ errors OR involved security/architecture changes.** Minor fixes (1-2 typos, missing tags) do not need a blog post.

Add the article at the TOP of the articles container (after the last `</script>` in `<head>` and before the first existing article in `<main>`). Follow the existing format:

1. Add JSON-LD structured data in `<head>`:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Title Here",
  "description": "One-line description.",
  "url": "https://neonarcade.net/blog.html#anchor-slug",
  "datePublished": "YYYY-MM-DD",
  "author": { "@type": "Organization", "name": "NEON ARCADE", "url": "https://neonarcade.net" },
  "publisher": { "@type": "Organization", "name": "NEON ARCADE", "url": "https://neonarcade.net", "logo": { "@type": "ImageObject", "url": "https://neonarcade.net/og-image.png" } },
  "image": "https://neonarcade.net/og-image.png",
  "mainEntityOfPage": "https://neonarcade.net/blog.html#anchor-slug"
}
</script>
```

2. Add article section in `<main>`:
```html
<section class="article" id="anchor-slug">
  <div class="article-meta">
    <span class="article-num">NN</span>
    <span class="article-date">Month DD, YYYY</span>
  </div>
  <h2 class="article-title">Title Here</h2>
  <p>Article content using NEON ARCADE voice: technical, direct, no fluff.</p>
  <!-- Use <h3> for subsections, <code> for inline code -->
  <!-- Use <div class="code-block" data-lang="javascript"><code>...</code></div> for code blocks -->
  <!-- Use stats-row for key metrics -->
</section>
```

Blog post voice guidelines:
- Technical and direct. Write like an engineer explaining to another engineer.
- Lead with the problem, then the solution, then what you learned.
- Include specific numbers (games audited, errors found, lines changed).
- Use code snippets to show before/after of interesting fixes.
- Keep it under 800 words.

### Step 7: Commit, Push, PR
Use `/commit-push-pr` or do it manually. Include all changed game files, scripts, updates.html, and blog.html in the commit.

## Quick Check (single game)
```bash
node scripts/audit-games.js public/neonarcade/my-game.html
```

## Exit Codes
- `0` = passed (may have warnings)
- `1` = errors found (must fix)
