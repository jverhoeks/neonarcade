# NEON ARCADE — SEO Optimization Plan

## Current State (Completed)

### 1. Technical SEO Foundation
- [x] **robots.txt** — Created with proper crawl directives, blocks `/admin/` and `/src/`, references sitemap
- [x] **sitemap.xml** — 39 public pages listed with priority levels and change frequency
- [x] **Canonical URLs** — Every page has `<link rel="canonical">` to prevent duplicate content
- [x] **Meta robots** — `index, follow` on all public pages
- [x] **Theme color** — `#0a0a12` set for mobile browser chrome
- [x] **Lang attribute** — `<html lang="en">` on all pages

### 2. On-Page SEO (All 39 Pages)
- [x] **Title tags** — SEO-optimized with primary keyword + brand suffix (e.g., "Sudoku — Free Online Sudoku Puzzle | NEON ARCADE")
- [x] **Meta descriptions** — 140-160 char action-oriented descriptions targeting "free online [game] game" queries
- [x] **Meta keywords** — Game-specific keyword phrases per page
- [x] **Author meta** — NEON ARCADE on all pages

### 3. Social Sharing / Open Graph (All 39 Pages)
- [x] **og:title** — Matches optimized title tag
- [x] **og:description** — Matches meta description
- [x] **og:image** — Points to `/screenshots/{game-name}.png` (1280x800) per game, `/og-image.png` for hubs
- [x] **og:image:width/height** — 1280x800 declared for proper rendering
- [x] **og:url** — Full canonical URL
- [x] **og:type** — `website` for all pages
- [x] **og:site_name** — NEON ARCADE
- [x] **og:locale** — en_US

### 4. Twitter Cards (All 39 Pages)
- [x] **twitter:card** — `summary_large_image` for rich preview
- [x] **twitter:title** — Matches optimized title
- [x] **twitter:description** — Matches meta description
- [x] **twitter:image** — Matches og:image (screenshot per game)

### 5. Structured Data / JSON-LD (All 39 Pages)
- [x] **Homepage** — `WebSite` schema with Organization publisher
- [x] **Category hubs** (3 pages) — `CollectionPage` schema linked to parent WebSite
- [x] **Game pages** (31 games) — `VideoGame` schema with:
  - `genre` (Arcade, Puzzle, Strategy, Educational, Word Game)
  - `gamePlatform`: "Web Browser"
  - `applicationCategory`: "Game"
  - `operatingSystem`: "Any"
  - `offers`: Free ($0 USD, InStock)
  - `isFamilyFriendly`: true
  - `inLanguage`: "en"
  - `author`: NEON ARCADE Organization
  - `image`: Screenshot URL

---

## Next Steps (Recommended)

### 6. Content & Keyword Strategy
- [ ] **Create an og-image.png** (1280x800) — A branded social sharing image for the homepage and hub pages showing the NEON ARCADE logo with neon styling
- [ ] **Verify all screenshots exist** — Ensure `/screenshots/{game-name}.png` exists for every game so social shares display correctly
- [x] **Add H1 tags** — Wrap logo/title elements in semantic `<h1>` on all 4 hub pages
- [x] **Add breadcrumb JSON-LD** — BreadcrumbList schema on all 31 game pages (Home > Category > Game)
- [ ] **Add FAQ schema** — Create FAQ sections on hub pages (e.g., "What games can I play for free?" "Do I need to download anything?") for FAQ rich snippets

### 7. Performance & Core Web Vitals
- [x] **Add `<link rel="preconnect">` tags** — Added to all 39 pages for `fonts.googleapis.com` and `fonts.gstatic.com`
- [ ] **Minimize CSS** — Consider minifying inline CSS for faster first paint
- [x] **Add `loading="lazy"`** to screenshot images on all 3 category hub pages (35 images total)
- [ ] **Add `fetchpriority="high"`** to above-the-fold images

### 8. Crawlability & Indexing
- [ ] **Submit sitemap to Google Search Console** — Register site and submit `sitemap.xml`
- [ ] **Submit sitemap to Bing Webmaster Tools** — Register and submit
- [ ] **Add Google Search Console verification meta tag** — `<meta name="google-site-verification" content="...">`
- [ ] **Add Bing verification meta tag** — `<meta name="msvalidate.01" content="...">`
- [ ] **Monitor crawl errors** — Check Search Console for 404s, crawl issues
- [ ] **Request indexing** — Use URL Inspection tool for key pages

### 9. Analytics & Tracking
- [ ] **Add Google Analytics 4 (GA4)** — Track pageviews, game starts, completions, shares
- [ ] **Add event tracking** — Track: game_start, game_complete, share_click, leaderboard_view
- [ ] **Set up Google Search Console** — Monitor impressions, clicks, CTR, average position
- [ ] **Monitor Core Web Vitals** — LCP, FID, CLS via Search Console or PageSpeed Insights

### 10. Link Building & Discovery
- [ ] **Submit to browser game directories** — itch.io, CrazyGames, Poki, Kongregate
- [ ] **Submit to ProductHunt** — Launch as a collection of free browser games
- [ ] **Create a blog/changelog page** — New game announcements help with fresh content signals
- [x] **Add internal linking** — "More Games" bar on all 31 game pages with 4 related games + category hub link
- [x] **Add a "More Games" section** on each game page — Fixed bottom bar with cross-links to related games, appears after 3 seconds

### 11. Local & Social Signals
- [ ] **Create social profiles** — Twitter/X, TikTok, Reddit presence for the brand
- [ ] **Add social profile links** to footer — Helps with brand entity recognition
- [ ] **Add `sameAs` to Organization JSON-LD** — Link social profiles in structured data
- [ ] **Encourage sharing** — The share button already copies emoji results; consider adding direct Twitter/X share links

### 12. Advanced SEO
- [ ] **Add `hreflang` tags** if planning multilingual support
- [ ] **Add `manifest.json`** for PWA support — Helps with installability and return visits
- [ ] **Add service worker** for offline support — Improves user experience metrics
- [ ] **Implement dynamic `<meta>` for daily games** — Signal, Territory change daily; consider updating meta descriptions or adding `dateModified`
- [ ] **Add `SoftwareApplication` aggregate rating** — Once reviews/ratings exist, add to JSON-LD
- [x] **Create a 404.html** — Custom neon-styled 404 page with links to all 3 category hubs

---

## Keyword Targeting Strategy

### Primary Keywords (Homepage)
- "free online games"
- "browser games no download"
- "instant play games"
- "free arcade games online"
- "HTML5 games"

### Category Keywords
| Category | Target Keywords |
|----------|----------------|
| NEON ARCADE | free arcade games, action games online, browser arcade games |
| NEON MIND | free puzzle games online, sudoku online, minesweeper free, logic puzzles |
| NEON GRIND | speed math game, reaction time test, brain training games |

### Per-Game Long-Tail Keywords
Each game targets "[game name] free online" and "[game type] game no download" patterns:
- "free sudoku online" → /neonmind/sudoku.html
- "free minesweeper online" → /neonmind/minesweeper.html
- "free snake game online" → /neonarcade/neon-snake.html
- "free tetris online" → /neonarcade/tetris-betrayal.html
- "math speed test" → /neongrind/mathblitz.html
- "reaction time test" → /neongrind/reflex-chain.html
- "nonogram puzzle free" → /neonmind/nonogram.html
- "kakuro puzzle online" → /neonmind/kakuro.html

---

## SEO Audit Scores (Expected)

### Before Optimization
| Check | Score |
|-------|-------|
| Meta Description | 0% (0/39 pages) |
| Open Graph | 0% (0/39 pages) |
| Twitter Cards | 0% (0/39 pages) |
| Structured Data | 0% (0/39 pages) |
| Canonical URLs | 0% (0/39 pages) |
| robots.txt | Missing |
| sitemap.xml | Missing |

### After Optimization (Current)
| Check | Score |
|-------|-------|
| Meta Description | 100% (39/39 pages) |
| Open Graph | 100% (39/39 pages) |
| Twitter Cards | 100% (39/39 pages) |
| Structured Data | 100% (39/39 pages) |
| Canonical URLs | 100% (39/39 pages) |
| robots.txt | Present |
| sitemap.xml | Present (39 URLs) |

---

## File Reference

### New Files
- `robots.txt` — Crawl directives and sitemap reference
- `sitemap.xml` — Full site map with 39 URLs
- `SEO_PLAN.md` — This document

### Modified Files (39 total)
- `index.html` — Main hub
- `neonarcade/index.html` — NEON ARCADE hub
- `neonmind/index.html` — NEON MIND hub
- `neongrind/index.html` — NEON GRIND hub
- 18 games in `neonarcade/`
- 8 games in `neonmind/`
- 3 games in `neongrind/`
