# BESMART — Progressive Puzzle/Skill Games

5-10 minute engagement sessions. Each game has levels that get progressively harder and/or faster. Simple to start, rewarding to master. Practice makes you measurably better. Same NEON ARCADE visual style, mobile-first.

---

## Design Philosophy

### What makes these different from the viral games
| Viral Games (existing) | BeSmart Games (new) |
|---|---|
| 30-60 second sessions | 5-10 minute sessions |
| Instant dopamine, share, leave | Flow state, "just one more level" |
| Random/luck element helps | Pure skill, practice = improvement |
| Score is the hook | Progression is the hook |
| "Beat my score" | "I cleared level 20, how far can you get?" |

### Core Loop
```
Start easy (confidence) -> Get harder (challenge) -> Fail (learn) -> Retry (faster this time) -> Push further -> Share level reached
```

### Progression Mechanics (mix and match per game)
- **Speed ramp** — Same task, less time each level
- **Complexity ramp** — More elements, more rules, more to track
- **Precision ramp** — Tighter tolerances, smaller targets
- **Memory ramp** — More items to remember, longer sequences
- **Multitask ramp** — Juggle more simultaneous tasks
- **Inversion** — Rules flip or rotate every N levels (keeps experts on their toes)

### Retention Hooks
- **Personal best level** — Always visible, always beatable
- **"You're getting faster"** — Show improvement stats (avg time per level over attempts)
- **Streaks** — Consecutive levels cleared without fail
- **Star ratings** — 1-3 stars per level (time-based), completionists replay for 3-star runs
- **Checkpoints** — Every 5 levels, restart from there (prevents frustration, preserves progression feel)

---

## GAME CONCEPTS

### 1. NEUROSORT
**Type:** Pattern matching / speed sorting
**Core:** Items fall from the top. Sort them into correct bins by swiping left/right/down. Level 1: sort by color (2 bins). Level 5: sort by shape (3 bins). Level 10: sort by color AND shape (6 bins). Level 15: rules invert every 5 seconds. Level 20+: speed maxes out, rules change mid-fall.
**Why it works:** Sorting is instinctive. Adding dimensions creates genuine cognitive load. You physically feel yourself getting better — hands move before you think.
**Controls:** Swipe left/right/down (mobile), arrow keys (desktop)
**Levels:** 25 (5 zones of 5, each zone adds a rule)
**Build:** 2/5

### 2. STACKLOGIC
**Type:** Logic / spatial reasoning
**Core:** Place colored blocks on a grid to satisfy rules shown at the edges ("this row must have exactly 2 blue", "this column must alternate"). Level 1: 3x3, 2 colors, 2 rules. Level 10: 5x5, 4 colors, 8 rules. Level 20: 6x6, constraints reference other constraints ("row 3 must mirror row 1").
**Why it works:** Sudoku energy but faster. Each puzzle is 30-60 seconds. Rules compound in satisfying ways. Expert players see solutions instantly that beginners struggle with.
**Controls:** Tap cell to cycle colors (mobile), click (desktop)
**Levels:** 30 (procedurally generated with difficulty curve)
**Build:** 3/5

### 3. REFLEX CHAIN
**Type:** Reaction time / rhythm
**Core:** Targets appear on screen. Tap them before they vanish. Level 1: one target, 2 seconds. Level 5: two targets simultaneously, 1.5s. Level 10: targets move, 1s window. Level 15: decoy targets (tap = fail), 0.8s. Level 20: targets have a specific tap ORDER shown briefly, 0.6s. Level 25: all combined.
**Why it works:** Pure reaction speed with layered complexity. Everyone understands "tap the thing." The decoy/order layers add genuine skill ceiling. Measurable improvement in milliseconds.
**Controls:** Tap/click targets
**Levels:** 25+ (endless after 25 with increasing speed)
**Build:** 2/5

### 4. MATHBLITZ
**Type:** Mental math / speed
**Core:** Solve arithmetic under time pressure. Level 1: single digit addition, 5 seconds. Level 5: two-digit addition/subtraction, 4s. Level 10: multiplication, 3s. Level 15: chained operations (7+3x2-1), 4s. Level 20: "which is bigger?" comparisons with fractions. Level 25: estimate percentages of visual quantities.
**Why it works:** Mental math has a clear skill curve. People love discovering they're faster than they thought. Great for "I'm smarter than you" sharing. Chained operations create genuine difficulty without unfairness.
**Controls:** Tap answer from 4 choices, or swipe for bigger/smaller
**Levels:** 30 (6 zones of 5)
**Build:** 2/5

### 5. PATHFINDER
**Type:** Spatial planning / maze
**Core:** Grid with a start and end. Draw a path, but you can only see the grid for N seconds before it goes dark. Level 1: 5x5 grid, 10s to memorize. Level 5: 7x7, 6s, moving obstacles. Level 10: 9x9, 4s, one-way doors. Level 15: path must collect items in order. Level 20: grid rotates 90 degrees after you memorize it.
**Why it works:** Memory + spatial reasoning. The "going dark" mechanic creates tension. Grid rotation is a genuine brain-breaker that improves with practice. Each level is quick (20-30s).
**Controls:** Swipe to draw path (mobile), click cells (desktop)
**Levels:** 25
**Build:** 3/5

### 6. SEQUENCER
**Type:** Memory / pattern recall
**Core:** Simon Says evolved. Level 1: repeat a 3-note color sequence. Level 5: 6-note sequence, plays faster. Level 10: sequence uses 6 pads instead of 4, with audio pitch cues. Level 15: sequence plays ONCE, backwards. Level 20: two sequences interleaved (odd beats = sequence A, even = sequence B). Level 25: pads shift position after showing.
**Why it works:** Memory games have universal appeal. The interleaved sequences and position-shifting create skill ceilings that feel impossible then become routine. Audio + visual = dual encoding helps learning.
**Controls:** Tap colored pads
**Levels:** 30 (endless mode after, +1 note per level)
**Build:** 2/5

### 7. WORDFORGE
**Type:** Word puzzle / anagram
**Core:** Given N letters, form as many words as possible in a time limit. Level 1: 4 letters, 30s, find 3 words. Level 5: 5 letters, 25s, find 5 words. Level 10: 6 letters, 20s, find 6 words + one must be 5+ letters. Level 15: one letter is "cursed" (must be used in every word). Level 20: letters decay (vanish after 15s if unused). Level 25: form a chain where each word starts with the last letter of the previous.
**Why it works:** Word games have massive proven audiences (Wordle, Scrabble). The decay and chain mechanics add urgency beyond simple anagramming. Vocabulary = status.
**Controls:** Tap letters to form words, swipe to submit
**Levels:** 25
**Build:** 3/5 (needs word dictionary)

### 8. CHROMAFLOW
**Type:** Color mixing / puzzle
**Core:** Mix primary colors to match a target color by routing flows through a pipe network. Level 1: mix 2 primaries, 3 pipes. Level 5: match a secondary color using 3 sources. Level 10: pipes have filters that shift hue. Level 15: time limit, flows are animated. Level 20: target color changes every 10 seconds, reroute on the fly. Level 25: two targets simultaneously.
**Why it works:** Color mixing is intuitive but surprising (subtractive vs additive). Pipe routing = satisfying spatial puzzles. Beautiful to look at — colored liquids flowing through neon pipes. Moving targets force fast re-planning.
**Controls:** Tap to rotate pipe segments, drag to reroute
**Levels:** 25
**Build:** 3/5

### 9. GRIDLOCK SPRINT
**Type:** Sliding puzzle / speed
**Core:** Classic 15-puzzle (slide tiles to order them) but timed with level modifiers. Level 1: 3x3, no timer. Level 5: 4x4, 60s. Level 10: 4x4, 30s. Level 15: tiles are colors not numbers (harder to track). Level 20: grid shifts orientation every 10s. Level 25: 5x5, 45s. Bonus: ghost of your personal best overlaid.
**Why it works:** Sliding puzzles have a deep skill curve. Speedrunning your own ghost is addictive. The orientation shifts punish memorized algorithms and force real spatial thinking.
**Controls:** Swipe tiles (mobile), arrow keys (desktop)
**Levels:** 25
**Build:** 2/5

### 10. DUALMIND
**Type:** Multitasking / split attention
**Core:** Screen splits in two. Each half has a simple task. Do both simultaneously. Level 1: left = tap rising bubbles, right = nothing. Level 3: left = tap bubbles, right = trace a line. Level 7: left = sort colors, right = dodge obstacles (tilt). Level 12: both sides interact (action on left affects right). Level 18: three zones. Level 22+: tasks swap sides without warning.
**Why it works:** Multitasking games are humbling — everyone thinks they can do it. Feeling your brain physically struggle then adapt is deeply satisfying. Side-swap moments are laugh-out-loud frustrating.
**Controls:** Both thumbs (mobile), mouse + keyboard (desktop)
**Levels:** 25
**Build:** 4/5

---

## SHARING FORMAT

```
BESMART: [GAME NAME]
Level [X] / [total] | [star]  [star]  [star] streak
[visual level progress bar using block emojis]
[time or score stat]
Can you beat level [X]?
neonarcade.fun/besmart/[game]
```

Example:
```
BESMART: NEUROSORT
Level 18 / 25 | 3-star streak: 7
[][][][][][][][][][][][][][][][][]..........
Avg sort time: 0.4s
Can you beat level 18?
```

---

## LEVEL SYSTEM

### Stars (per level)
- 1 star: Completed
- 2 stars: Completed under par time
- 3 stars: Completed under speed time (top 10% pace)

### Checkpoints
- Every 5 levels = checkpoint
- After failing, restart from last checkpoint
- Completing all 5 in a zone without dying = zone bonus (cosmetic flair)

### Endless Mode
- Unlocks after clearing all levels
- Procedural generation at max difficulty
- Pure high-score chase

### Progress Persistence
- localStorage for level progress, stars, best times
- Key: `neonarcade_besmart_[gamename]`
- Track: levels cleared, stars per level, attempts per level, total playtime, fastest full run

---

## RECOMMENDED BUILD ORDER

Based on: engagement depth x build speed x mobile friendliness

1. **MATHBLITZ** — Fastest to build, universal appeal, clear skill curve, no assets needed
2. **REFLEX CHAIN** — Simple mechanics, satisfying progression, great on mobile
3. **NEUROSORT** — Swipe-based, intuitive, layered complexity, visually clean
4. **SEQUENCER** — Proven format (Simon), audio adds polish, memory games hook everyone
5. **GRIDLOCK SPRINT** — Classic puzzle reimagined, ghost overlay is the killer feature
6. **STACKLOGIC** — Deeper puzzle, longer sessions, sudoku-adjacent audience
7. **PATHFINDER** — Memory + spatial, strong "aha" moments
8. **WORDFORGE** — Word game audience is massive but needs dictionary data
9. **CHROMAFLOW** — Beautiful visuals, needs good pipe physics
10. **DUALMIND** — Most complex to build, most unique concept, biggest wow factor

---

## ADDITIONAL THOUGHTS

### Why 5-10 minutes works differently than 30-60 seconds
- Viral games optimize for **breadth** (many people, short sessions, share fast)
- BeSmart optimizes for **depth** (fewer people, longer sessions, daily return)
- The share moment shifts from "look at my score" to "look how far I got" — progression > performance
- These games build **habit** (daily practice) rather than **impulse** (one-time play)

### Monetization-friendly
- Natural ad break points between levels / at checkpoints
- "Watch ad to continue from current level" (optional, not required)
- Premium: unlock all checkpoints, remove ads, cosmetic themes

### Competitive angles
- Weekly leaderboards: fastest full-run times
- Challenge links: "Beat my level 15 time"
- Seasonal level packs: new level sets monthly keep it fresh

### Mobile-first considerations
- All games must work with **one thumb** or **two thumbs** — no complex gestures
- Levels are short (20-60 seconds each) so interruptions don't ruin progress
- Checkpoint system means closing the app mid-run doesn't lose more than a few levels
- Portrait orientation preferred (one-handed phone use)
- Haptic feedback on correct/incorrect actions (navigator.vibrate)

### Skill visualization
- Show a "skill graph" in profile: radar chart of reaction time, memory, logic, spatial, math
- Each game contributes to different axes
- "Your brain profile" is inherently shareable
- Compare with friends' profiles

### Anti-frustration design
- Never more than 3 consecutive failures on the same level before offering a hint
- "Skip for now" option (come back later, keeps flow)
- Difficulty smoothing: if a player fails 5+ times, subtly ease the next attempt (10% more time, slightly easier pattern) — never tell them
- Celebrate improvement: "You beat this level 3 seconds faster than your first attempt!"
