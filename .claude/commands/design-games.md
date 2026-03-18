---
description: Research trending viral game mechanics, analyze category gaps, and brainstorm new game ideas for NEON ARCADE
---

# NEON ARCADE — Game Design & Market Research

You are a game designer and market researcher for NEON ARCADE, a collection of viral single-file HTML5 browser games.

## Step 1: Assess Current State

Run this to see game counts per category:
```bash
for dir in neonarcade neonmind neongrind neonclassic neoncasino neonquest; do count=$(ls public/$dir/*.html 2>/dev/null | grep -v index.html | wc -l); echo "$dir: $count games"; done
```

Read `VIRAL_GAME_IDEAS.md` for existing ideas and what's already built.

## Step 2: Market Research

Search the web for current trends in:
- **Viral browser games** (2025-2026) — what's trending on TikTok, Reddit, Product Hunt
- **NYT Games competitors** — daily puzzle formats gaining traction
- **Human Benchmark style tests** — cognitive/skill tests going viral
- **Casual game mechanics** — what mechanics are producing the most downloads/shares
- **Social/multiplayer browser games** — async and real-time formats that spread organically

Focus on games that:
- Work as single HTML files (no server-side game logic needed beyond leaderboards)
- Have sessions under 60 seconds
- Produce shareable results (emoji grids, scores, percentiles)
- Are simple to understand in 5 seconds, hard to master

## Step 3: Identify Category Gaps

Compare game counts and variety across categories:
- Which category has the fewest games and would benefit most from expansion?
- Which category has gaps in game TYPES (e.g., missing a social game, missing a daily puzzle)?
- What mechanics from the market research aren't represented yet?

Current categories:
- **NEON ARCADE** (neonarcade/) — action, arcade, social games
- **NEON MIND** (neonmind/) — classic brain puzzles (Nikoli-style logic)
- **NEON GRIND** (neongrind/) — skill/speed challenges, cognitive tests
- **NEON CLASSIC** (neonclassic/) — retro games reimagined
- **NEON CASINO** (neoncasino/) — casino card & table games
- **NEON QUEST** (neonquest/) — longer progression games

## Step 4: Generate Ideas

For each idea, provide:
```
### GAME NAME
**Category:** NEON XXX
**Type:** Genre / mechanic type
**Mechanic:** 2-3 sentence description of core gameplay
**Why viral:** Why this will spread (specific sharing hook)
**Sharing format:** Example emoji/text share output
**Build difficulty:** X/5
**Priority:** HIGH/MEDIUM/LOW (based on viral potential vs effort)
```

Generate:
- 3 ideas for the most underserved category
- 2 ideas for each other category that has gaps
- 1 wild card idea that doesn't fit neatly into existing categories

## Step 5: Update VIRAL_GAME_IDEAS.md

Add new ideas to the appropriate sections in `VIRAL_GAME_IDEAS.md`. Mark them as NEW. Update the "Already Built" tables if games have been added since the last update.

## Step 6: Present Recommendations

Summarize with a prioritized build list:
1. Top 3 "build next" (HIGH priority, low effort, high viral potential)
2. Top 3 "plan for later" (HIGH priority, medium effort)
3. Any category that needs a new game type not yet represented

## Design Principles (always apply)
- Zero friction: open link, playing in <3 seconds
- Sessions <60 seconds preferred
- Clear "one more try" hook
- Emotional spikes (surprise, frustration, awe) drive sharing
- Simple to understand in 5 seconds, hard to master
- Every game should produce a moment worth screenshotting or sharing
- Must work as a single .html file with inline CSS/JS
- Must integrate with neon.js for scores/leaderboards
- Must follow the NEON ARCADE visual style (see CLAUDE.md)
