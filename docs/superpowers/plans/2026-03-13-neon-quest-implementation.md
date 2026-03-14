# NEON QUEST Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan.

**Goal:** Build the NEON QUEST category with 5 games, hub page, and all integration points.

**Architecture:** Each game is a single HTML file in `public/neonquest/`. Shared neon.js library for scores. All integration across hub pages, worker.js, sitemap, blog, updates.

**Tech Stack:** HTML5, CSS3, inline JavaScript, Canvas API, Web Audio API, neon.js

---

## Chunk 1: Games (Parallel)

### Task 1: Build FUSION game
- [ ] Create `public/neonquest/fusion.html` per spec (atomic merge physics)
- [ ] Full SEO template, neon.js integration, sound, mobile controls
- [ ] Verlet physics for circle collisions, element progression H→U

### Task 2: Build SYNTHESIS game
- [ ] Create `public/neonquest/synthesis.html` per spec (neon alchemy lab)
- [ ] 200+ item recipe tree (Tiers 1-3), equipment unlocks, save/resume
- [ ] Drag-and-drop workbench, catalog wall, custom scroll containers

### Task 3: Build JACKPOT game
- [ ] Create `public/neonquest/jackpot.html` per spec (slot machine roguelike)
- [ ] Symbol pool, reel spin animation, shop/relic system, 15 floors, 5 bosses
- [ ] Turn-based combat with enemy intents

### Task 4: Build FIREWALL game
- [ ] Create `public/neonquest/firewall.html` per spec (circuit board TD)
- [ ] A* pathfinding, 6 tower types, 7 enemy types, board evolution system
- [ ] Save/resume between waves, overclocking mechanic

### Task 5: Build SWARM game
- [ ] Create `public/neonquest/swarm.html` per spec (drone survivor-like)
- [ ] Split/merge mechanic, spatial hashing, object pooling, 60fps target
- [ ] 15-min timer, meta-progression, performance degradation fallback

### Task 6: Build NEON QUEST hub page
- [ ] Create `public/neonquest/index.html` following existing hub pattern
- [ ] Orange accent (#ff8c00), badge-quest class, 5 game cards

## Chunk 2: Integration (Sequential)

### Task 7: Update all integration points
- [ ] Add 5 games to `public/index.html` CATALOG (new `quest` category)
- [ ] Add NEON QUEST nav links to all existing hub pages
- [ ] Register 5 games in `src/worker.js` KNOWN_GAMES
- [ ] Update `public/sitemap.xml` with 6 new URLs
- [ ] Update `public/llms.txt` with NEON QUEST section
- [ ] Update game counts everywhere (62→67)
- [ ] Update `public/manifest.json` description

### Task 8: Write updates.html changelog entry
- [ ] Add NEON QUEST launch entry with all 5 games

### Task 9: Write blog.html article
- [ ] Article about NEON QUEST: why deeper games, design decisions, game descriptions

## Chunk 3: Screenshots & Testing

### Task 10: Take screenshots
- [ ] Serve locally and screenshot each game at 1280x800

### Task 11: Test all games
- [ ] Load each game, verify start screen, gameplay, game over, share button
- [ ] Verify neon.js integration, mobile controls, ESC key
