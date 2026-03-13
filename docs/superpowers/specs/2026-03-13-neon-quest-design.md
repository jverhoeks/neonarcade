# NEON QUEST — Longer-Session Game Category Design Spec

**Date:** 2026-03-13
**Status:** Draft
**Category:** New 5th category for NEON ARCADE platform

---

## Overview

NEON QUEST is a new game category for the NEON ARCADE platform featuring longer-session (5-60 minute), stickier games designed for repeat play over weeks. While the existing 4 categories (NEON ARCADE, NEON MIND, NEON GRIND, NEON CLASSIC) focus on sub-60-second viral hits, NEON QUEST targets "commute games" — games people come back to daily for extended sessions.

### Design Priorities (ranked)

1. **Stickiness** — Players return day after day for weeks
2. **Session depth** — 5-60 minute sessions with save/resume for longer games
3. **Virality** — Sharing comes from "you have to try this" moments, not emoji grids

### Design Principles (NEON QUEST amendments)

The core NEON ARCADE platform optimizes for sub-60-second sessions and "playing in <3 seconds." NEON QUEST games are exempt from these constraints but must still follow adapted principles:

- **Learnable in 30 seconds** — First interaction must be intuitive. Tutorial pacing, not upfront rules. The player should be *doing something* within 5 seconds of clicking START, even if the full system reveals over minutes
- **Shareable moment in first session** — Every game must produce a screenshot/share-worthy result within the first play session, even if the player doesn't finish
- **Save/resume for sessions >15 min** — Players on a commute must be able to close and return without losing progress
- **Same "one more try" hook** — Even in longer games, the retry impulse must be strong. Roguelike runs end with "I could do better." Discovery games end with "I wonder what X+Y makes."

### Constraints

- Same architecture: single `.html` file per game, inline CSS/JS
- Same visual style: NEON ARCADE brand (dark bg, neon accents, Orbitron/Rajdhani, scanlines, glow effects)
- Same infrastructure: `neon.js` for scores/leaderboards, Cloudflare Worker backend
- localStorage for save/resume persistence (budget: keep saves under 50KB per game to share 5MB localStorage across all games)
- No server-side game state (everything client-side)

---

## Category Infrastructure

### Hub Page

- `public/neonquest/index.html` — Category hub following existing hub page pattern
- Accent color: **orange** (`#ff8c00`) — warm, distinct from all existing categories, fits the "deeper/longer" vibe
- Badge: `badge-quest` (orange) — CSS class to be added alongside existing badge-new, badge-hot, etc.
- Games tagged with session length estimates

### File Structure

```
public/neonquest/
  index.html              # NEON QUEST hub page
  fusion.html             # Atomic Merge Physics
  jackpot.html            # Slot Machine Roguelike
  firewall.html           # Circuit Board Tower Defense
  swarm.html              # Drone Survivor-like
  synthesis.html           # Neon Alchemy Lab
  screenshots/            # 1280x800 PNGs per game
```

### Worker Registration

Each game registered in `src/worker.js` KNOWN_GAMES with appropriate mode and maxScore.

### Save/Resume Pattern

Games with sessions >15 min must implement save/resume via localStorage:

```javascript
// Save pattern
function saveGameState() {
  var state = { /* game-specific state */ };
  localStorage.setItem('neonquest_gamename_save', JSON.stringify(state));
}

// Auto-save every 30 seconds during gameplay
setInterval(saveGameState, 30000);

// Resume on load
function loadGameState() {
  var saved = localStorage.getItem('neonquest_gamename_save');
  if (saved) {
    // Show "Continue?" prompt on start screen
  }
}
```

---

## Game 1: FUSION — Atomic Merge Physics

### Concept

Suika Game meets the periodic table. Drop atoms into a reactor chamber. When two identical atoms touch, they fuse into the next element. Physics makes atoms bounce and roll. Goal: reach the heaviest element before the reactor overflows.

### Session Length

5-15 minutes per game. No save needed (short sessions).

### Core Mechanics

1. **Drop** — Player taps/clicks to choose a column. A random atom drops from above with gravity
2. **Physics** — Atoms are circles with realistic bounce, friction, and settling behavior inside the reactor
3. **Fusion** — Two identical atoms touching merge into the next element at the contact point. Particle burst + screen shake + sound
4. **Chain reactions** — A fusion may create an atom that touches another identical one, triggering cascading fusions
5. **Overflow** — If any atom crosses the danger line at the top for >2 seconds, game over
6. **Radioactive decay** — Elements above a threshold (e.g., Polonium+) are unstable. They shrink over 5 seconds and vanish. Creates gaps and new physics interactions
7. **Preview** — Player sees current atom + next 2 atoms in queue

### Element Progression

Hydrogen(1) → Helium(2) → Lithium(3) → Beryllium(4) → Boron(5) → Carbon(6) → Nitrogen(7) → Oxygen(8) → Fluorine(9) → Neon(10) → Sodium(11) → Magnesium(12) → Aluminum(13) → Silicon(14) → Phosphorus(15) → Sulfur(16) → Chlorine(17) → Argon(18) → Potassium(19) → Calcium(20) → Iron(26) → Copper(29) → Silver(47) → Gold(79) → Uranium(92)

Curated list of ~24 stages. Atom radius scales **logarithmically** with atomic number (not linearly) so heavy elements stay manageable. Each element has a distinct neon color.

### Visual Design

- Reactor: rounded rectangle container with glowing walls, danger line at top pulses red when atoms are near
- Atoms: colored circles with element symbol (H, He, Li...) in Orbitron font
- Fusion: bright flash at merge point, particle burst in element's color, camera shake proportional to element weight
- Chain reactions: increasing pitch sound per chain, multiplier text flies up
- Background: reactor hums, subtle particle effects inside

### Scoring

- Points per fusion (heavier = more points)
- Chain reaction multiplier (2x, 3x, 4x...)
- Heaviest element reached (primary stat for sharing)

### Meta-progression (localStorage)

- **Element Collection** — Grid showing all elements ever created. Percentage complete
- **Unlock starting elements** — Reach Carbon → can start runs with Helium. Reach Iron → can start with Carbon. Shortens early game for experienced players
- **Best records** — Heaviest element, longest chain, highest score

### Neon.js Integration

```javascript
Neon.init({
  game: 'fusion',
  mode: 'high',
  key: 'neonarcade_neonquest_fusion_scores'
});
```

### Sharing Format

```
⚛️ FUSION
Heaviest: Fe (Iron) | 47 fusions
⬜⬜🟦🟦🟩🟩🟨🟨🟧🔴
Chain: 6x combo!
neonarcade.net/neonquest/fusion.html
```

### Controls

- **Desktop:** Mouse to position, click to drop. Left/right arrows alternative
- **Mobile:** Tap column to drop. Drag for precise positioning
- **ESC:** Quit to start screen

### Build Difficulty

3/5 — Circle-based physics (simpler than arbitrary shapes but still substantial). Requires Verlet integration with iterative constraint solving for stable stacking. Key challenges: multi-body collision resolution (pile of 15+ atoms settling without jitter), preventing tunneling at high velocities, stable resting contacts. No external physics library — all inline JS. Atom radius should scale logarithmically with atomic number to keep heavy elements manageable on screen.

---

## Game 2: JACKPOT — Slot Machine Roguelike

### Concept

A roguelike deckbuilder where your "deck" is a slot machine. Pull the lever, symbols land on reels. Matching symbols deal damage, earn gold, trigger effects. Between fights you buy new symbols, remove weak ones, add "weights" that bend probability. Kill enemies, beat bosses, see how deep you go.

### Session Length

10-15 minutes per run. No save needed (runs are short enough).

### Core Mechanics

1. **Spin** — 3 reels (upgradeable to 5) spin and land on random symbols drawn from your symbol pool
2. **Resolve** — Matching symbols trigger effects:
   - 3 match = full effect
   - 2 match = half effect
   - No match = nothing (wasted spin)
   - Special combos: specific pairs/triples with bonus effects
3. **Enemy turn** — After your spin resolves, the enemy attacks. You see their intent (damage amount) before your spin, informing your strategy
4. **Fight structure** — Enemy has HP bar. Reduce to 0 to win. You have HP bar (starts at 50). Die = run over
5. **Shop between fights** — Spend gold on:
   - Add a new symbol to your pool (makes it more likely to appear)
   - Remove a symbol (reduces pool, increasing odds for remaining symbols)
   - Buy a weight (makes one specific symbol 2x likely)
   - Buy a relic (permanent passive effect for this run)
6. **Floor structure** — 3 fights per floor + shop. Boss every 3rd floor. 15 floors = full run (5 acts of 3 floors each, boss at floors 3, 6, 9, 12, 15)

### Symbol System

**Starting pool (6 symbols, 2 copies each = 12 total):**

| Symbol | Effect (3-match) | Effect (2-match) |
|--------|-------------------|-------------------|
| ⚔️ Sword | 8 damage | 4 damage |
| 🛡️ Shield | Block 8 damage next enemy turn | Block 4 |
| 💰 Coin | +6 gold | +3 gold |
| ❤️ Heart | Heal 5 HP | Heal 2 HP |

**Buyable symbols (unlocked progressively):**

| Symbol | Effect (3-match) | Cost |
|--------|-------------------|------|
| 💎 Diamond | +12 gold | 8g |
| 🔥 Fire | 12 damage to all enemies | 10g |
| ⚡ Lightning | 6 damage, chains to next enemy | 8g |
| 🎯 Crit | 20 damage (single target) | 12g |
| 💀 Skull | 15 damage to enemy AND 5 to self | 6g |
| 🌀 Wild | Copies adjacent reel's symbol | 15g |
| 🧲 Magnet | Steal 4 gold from enemy | 7g |
| ❄️ Frost | Enemy skips next attack | 12g |
| 🔄 Respin | Spin again (free extra turn) | 10g |

### Relic System

Relics are persistent passive effects for the duration of a run. Max 5 relics.

| Relic | Effect | Cost |
|-------|--------|------|
| Lucky 7 | Every 7th spin: all reels match | 20g |
| Loaded Dice | Reel 1 always lands on your most weighted symbol | 15g |
| Double Down | 3-matches pay as 4-match, but misses deal 3 self-damage | 12g |
| Recycler | Unmatched symbols give 1 gold each | 10g |
| Iron Curtain | Start each fight with 5 block | 12g |
| Blood Pact | +3 damage per spin, but lose 1 HP per spin | 8g |
| Golden Touch | Gold earned +50% | 15g |
| Adrenaline | Below 25% HP: all damage doubled | 10g |

### Enemy Design

**Regular enemies (3 per floor):**
- **Virus** — 20 HP, 4 damage/turn. Basic
- **Firewall** — 30 HP, 3 damage/turn but gains 5 shield each turn
- **Botnet** — 15 HP each, spawns in pairs
- **Ransomware** — 25 HP, "encrypts" a random reel for 2 turns (that reel shows ??? and doesn't count)
- **Phisher** — 20 HP, steals 2 gold per turn

**Bosses (every 3rd floor):**
- **Floor 3: Trojan** — 60 HP. Copies one of your symbols and uses it against you
- **Floor 6: Worm** — 80 HP. Splits into two 40 HP enemies at half health
- **Floor 9: Rootkit** — 100 HP. Disables one relic each turn (cycles through them)
- **Floor 12: Zero-Day** — 120 HP. Immune to your most common symbol type
- **Floor 15: Singularity** — 150 HP. All of the above, rotating each turn

### Meta-progression (localStorage)

- **Symbol unlocks** — New symbols become available in shops after reaching floor milestones
- **Relic unlocks** — New relics after defeating specific bosses
- **Machine upgrades** — Permanent: start with 4 reels (after clearing floor 6), start with a free weight (after clearing floor 9)
- **Run history** — Best floor, best gold earned, fastest boss kill

### Visual Design

- Central slot machine with spinning reels, lever animation, flashing lights on match
- Enemy on the right side with HP bar and attack intent indicator
- Your HP bar at bottom
- Shop: neon storefront with items on shelves
- Match animations: reels glow, connecting line between matching symbols, damage numbers fly toward enemy

### Neon.js Integration

```javascript
Neon.init({
  game: 'jackpot',
  mode: 'high',
  key: 'neonarcade_neonquest_jackpot_scores'
});
// Score = floor reached * 100 + gold earned + enemies killed * 10
```

### Sharing Format

```
🎰 JACKPOT
Floor 14 | Boss: Rootkit — DEFEATED
💀⚔️⚔️⚔️💎 — JACKPOT!
Best combo: 5x Lightning Chain
neonarcade.net/neonquest/jackpot.html
```

### Controls

- **Desktop:** Click lever or press Space to spin. Click shop items to buy. Number keys for quick-buy
- **Mobile:** Tap lever to spin. Tap items in shop. Swipe through relic descriptions
- **ESC:** Quit to start screen

### Build Difficulty

3/5 — Turn-based (no real-time rendering pressure). Main work: symbol pool probability math, enemy AI/balancing, shop economy tuning, reel spin animation.

---

## Game 3: FIREWALL — Circuit Board Tower Defense

### Concept

Defend a neon circuit board from waves of viruses. Towers are security programs placed on circuit nodes. The board dynamically evolves — every 5 waves you choose new circuit paths to activate, reshaping enemy pathing and opening new tower slots.

### Session Length

10-25 minutes. Save/resume for sessions interrupted mid-wave.

### Core Mechanics

1. **Build phase** — Place security programs on available nodes along circuit traces. Each program has a range radius and attack type
2. **Wave phase** — Enemies stream along glowing circuit traces from spawn points toward your Core. Programs auto-fire within range
3. **Active abilities** — Tap any program to trigger its special ability (cooldown-based). Adds real-time tactical decisions
4. **Between waves** — Earn data (currency) from kills. Spend on: new programs, upgrades (3 tiers per program), or overclocking
5. **Board evolution** — Every 5 waves, choose 1 of 3 circuit expansions. Each adds new trace paths (changing where enemies walk) AND new node slots (where you can build). The board literally grows
6. **Overclocking** — Any program can be overclocked: 2x attack speed for 10 seconds. 30 second cooldown. 3 overclocks without cooling = program burns out permanently. High-risk panic button
7. **Core HP** — Core has 20 HP. Each enemy reaching core = 1-3 HP lost (depending on enemy type). Core at 0 = game over

### Security Programs (Towers)

| Program | Range | Damage | Attack Speed | Special Ability (tap) | Cost |
|---------|-------|--------|--------------|----------------------|------|
| SCANNER | Large | 0 | — | Reveals cloaked enemies in range for 10s. Tags fast enemies (slows 20%) | 50 |
| FIREWALL | — | — | — | Blocks a path segment. Enemies must burn through (200 HP barrier). Regenerates between waves | 75 |
| ANTIVIRUS | Medium | 8 | Medium | Execute: instant kill on enemy below 15% HP in range | 100 |
| ENCRYPTOR | Medium | 2 | Slow | AoE slow pulse: all enemies in range slowed 50% for 5s | 80 |
| PATCHER | Small | 0 | — | Heals all programs in range to full. Removes Ransomware debuffs | 60 |
| QUARANTINE | Small | 0 | — | Traps one enemy for 5s. Trapped enemy takes 3x damage from all sources | 90 |

**Upgrade tiers (3 per program):**
- Tier 1 (100 data): +50% base stat (range/damage/HP)
- Tier 2 (200 data): New passive effect (e.g., Antivirus gains piercing shots)
- Tier 3 (400 data): Ability enhancement (e.g., Quarantine traps 2 enemies)

### Enemy Types

| Enemy | HP | Speed | Damage to Core | Special |
|-------|-----|-------|----------------|---------|
| Worm | 15 | Medium | 1 | Splits into 2 mini-worms (8 HP each) on death |
| Trojan | 25 | Slow | 3 | Disguised as data packet (blue, friendly-looking). Only revealed by Scanner. If undetected: 3x core damage |
| Ransomware | 30 | Slow | 1 | Encrypts programs it passes: disabled for 10s. Patcher cleanses |
| DDoS Swarm | 5 each | Fast | 1 each | Spawn in groups of 10-15. Overwhelm single-target programs |
| Zero-Day | 20 | Fast | 2 | Cloaked (invisible without Scanner). Ignores FIREWALL barriers |
| Logic Bomb | 40 | Slow | 2 | On death: damages all programs in small radius. Don't kill near your towers |
| Rootkit (Boss) | 200 | Slow | 5 | Every 10 waves. Disables one random circuit path for the duration of the fight. Huge HP |

### Board Evolution System

Every 5 waves, player chooses from 3 randomly generated circuit expansions:

- Each expansion shows: new paths (white preview), new nodes (green dots), and which spawn points connect
- Expansions can create shortcuts (enemies reach core faster but through more towers) or long routes (more exposure but less tower coverage)
- Strategic choice: more nodes in a chokepoint? Or spread towers across multiple paths?
- Board starts as simple 2-path layout, ends as complex 6-8 path network by wave 30+

### Wave Structure

- Waves 1-5: Basic worms and DDoS swarms. Tutorial pacing
- Waves 6-10: Trojans and Ransomware introduced. Board evolution 1
- Waves 11-15: Zero-Days appear. Need Scanner coverage. Board evolution 2
- Waves 16-20: Logic Bombs. Placement strategy matters. Board evolution 3
- Waves 21-25: All enemy types mixed. Intensity ramps. Board evolution 4
- Waves 26-30: Elite versions (faster, more HP). Board evolution 5
- Wave 30: Rootkit boss
- Waves 31+: Endless mode. Difficulty keeps scaling. How far can you go?

### Meta-progression (localStorage)

- **Program unlocks** — Quarantine unlocked after reaching wave 10, Patcher after wave 15
- **Board presets** — Unlock starting layouts with more nodes after reaching wave milestones
- **Challenge modes** — "No Scanner" / "Speed waves" / "One program type only" — unlock after clearing wave 30
- **Stats** — Total viruses purged, waves survived, programs lost to overclocking

### Save/Resume

Auto-save between waves. On return, show "Continue from Wave 17?" with board state preview.

### Visual Design

- Dark circuit board background with glowing green/cyan traces
- Enemies flow along traces as colored pulses
- Programs are icon-nodes that pulse when firing
- Fusion of damage: laser beams, particle shots, ice crystals — all in neon colors
- Board evolution: new traces animate in with a satisfying "circuit connecting" effect
- Overclocking: program node turns orange/red, sparks fly, faster animation
- Core: central pulsing hexagon. Flashes red on damage. Particles leak when low HP

### Neon.js Integration

```javascript
Neon.init({
  game: 'firewall',
  mode: 'high',
  key: 'neonarcade_neonquest_firewall_scores'
});
// Score = wave reached * 100 + viruses purged * 2
```

### Sharing Format

```
🔒 FIREWALL
Wave 34 | Viruses purged: 847
🟦🟦🟩🟩🟩🟨🟨🟧🟧🔴
Boss: Rootkit v3 — DEFEATED
Programs: 12 | Overclocks: 8 | Burnouts: 1
neonarcade.net/neonquest/firewall.html
```

### Controls

- **Desktop:** Click node to place/select program. Click ability button or press hotkey. Mouse over enemy for info
- **Mobile:** Tap node to place. Tap program to select + show ability button. Tap ability to activate
- **ESC:** Quit to start screen (with save prompt)

### Build Difficulty

3/5 — Pathfinding (A* on grid graph), wave spawning, tower targeting AI. Dynamic board evolution is the novel challenge. Well-documented genre with many reference implementations.

---

## Game 4: SWARM — Drone Survivor-like

### Concept

Control a swarm of neon drones, not a single character. Drones auto-attack nearby enemies. Core mechanic: split your swarm into independent groups or merge them back. More drones together = stronger per drone. Spread apart = cover more ground but weaker. Survive 15 minutes of escalating waves.

### Session Length

15-25 minutes per run. No save needed (fixed 15-min runs).

### Core Mechanics

1. **Movement** — Swarm follows cursor/finger. Drones orbit focal point in a loose formation
2. **Auto-attack** — Each drone fires at nearest enemy within range. Fire rate and damage are per-drone stats
3. **Split** — Tap/click right half of screen to detach a splinter group at current position. Splinter holds position and auto-fires independently. Max 3 splinter groups
4. **Recall** — Tap/click left half to recall all splinters. They fly back to your main swarm
5. **Swarm strength scaling** — Drones in larger groups get a cohesion bonus: +5% damage per nearby drone. 20 drones together = each does 100% bonus damage. Incentivizes grouping but limits coverage
6. **XP and leveling** — Enemies drop XP orbs. Orbs are attracted to nearest swarm group. Level up → choose 1 of 3 upgrades
7. **15-minute timer** — Survive to win. Boss at 5:00, 10:00, 15:00. Enemy density and speed escalate continuously

### Split/Merge Tactical Depth

The split/merge system is what differentiates SWARM from Vampire Survivors:

- **Chokepoint defense** — Leave a splinter guarding a spawn point while your main swarm roams
- **XP farming** — Split into 3 groups to cover more ground and collect more XP orbs
- **Boss focus** — Recall everything for maximum cohesion bonus against bosses
- **Sacrifice plays** — Send a small splinter as bait to draw enemies away from your main group
- **Splinter AI** — Splinters auto-kite (move away from enemies that get too close) but aren't as smart as player-controlled main swarm. Babysitting tension

### Upgrade System (choose 1 of 3 per level)

**Swarm upgrades:**
- +3 drones to swarm
- Drone orbit radius +20% (spread out more, cover more area)
- Drone movement speed +15%

**Firepower upgrades:**
- All drone damage +20%
- Fire rate +15%
- Piercing shots (bullets pass through 2 enemies)
- Homing bullets (slight tracking)

**Splinter upgrades:**
- Splinter groups get shield (absorbs 1 hit per drone before taking damage)
- Splinters attract XP orbs from 2x range
- Splinters auto-recall when below 3 drones (survival instinct)
- +1 max splinter group (up to 4)

**Sacrifice upgrades:**
- Consume 5 drones: all remaining get +30% damage permanently
- Consume 10 drones: gain a central laser beam (high sustained damage)
- Consume 3 drones: create a stationary mine field at current position

**Utility upgrades:**
- XP magnet range +50%
- Heal 1 HP per 10 kills
- Speed boost for 3s after recalling splinters

**Special upgrades (rare, appear every 5 levels):**
- EMP pulse: tap to stun all enemies on screen for 2s (30s cooldown)
- Shield bubble: main swarm is invulnerable for 3s (45s cooldown)
- Kamikaze: sacrifice a splinter group — each drone explodes for massive AoE damage

### Enemy Types

| Enemy | HP | Speed | Behavior |
|-------|-----|-------|----------|
| Glitch | 5 | Medium | Basic swarm fodder. Moves toward nearest drone group |
| Hunter | 10 | Fast | Always chases your SMALLEST group. Punishes careless splitting |
| Magnet | 15 | Slow | Pulls drones out of formation. Disrupts cohesion bonus. Splitting counters (smaller pull per group) |
| Titan | 80 | Very slow | Massive HP sponge. Needs focused fire (merge to kill efficiently) |
| Spawner | 30 | Stationary | Pumps out Glitches every 2s. Must be hunted down. Send a splinter |
| Phaser | 12 | Medium | Blinks in/out of existence. Invulnerable for 1s, vulnerable for 2s. Timing matters |
| Blackout (Boss) | 500 | Slow | Disables minimap. Drones go dark (no glow) for 3s intervals. Creates chaos. Splinters can't auto-target during blackout |

### Run Structure

- **0:00-2:00** — Glitches only. Learn movement, get first few levels
- **2:00-5:00** — Hunters and Magnets appear. Splitting becomes relevant
- **5:00** — Boss: Titan King (800 HP, spawns Glitches)
- **5:00-8:00** — Spawners appear. Need to send splinters to hunt them
- **8:00-10:00** — Phasers appear. All enemy types mixed
- **10:00** — Boss: Magnet Lord (1000 HP, constant drone pull)
- **10:00-13:00** — Elite versions of all enemies. Density spikes
- **13:00-15:00** — Absolute chaos. Screen fills. Survival mode
- **15:00** — Final Boss: Blackout (1500 HP). Defeat to win

### Meta-progression (localStorage)

- **Drone types** — Unlock after run milestones:
  - Laser drones (continuous beam instead of bullets) — survive 10 min
  - Shield drones (project shield around nearby drones) — survive 12 min
  - Healer drones (slowly repair damaged drones) — win a run
- **Starting loadout** — Choose drone type composition before a run
- **Permanent upgrades** — Start with +2 drones, +1 max splinter group, faster XP gain. Spend "scrap" earned per run
- **Mutations** — Run modifiers unlocked after winning: "Double enemies + double XP", "No splitting allowed", "Drones don't auto-fire (manual aim)", "Splinters are permanent (can't recall)"

### Visual Design

- Dark arena with subtle grid
- Drones: small glowing triangles orbiting focal point. Color-coded by type (cyan=standard, red=laser, blue=shield, green=healer)
- Bullets: thin neon lines from each drone to target
- Enemies: distinct silhouettes with glow. Titans are large. Swarms of Glitches are a sea of dots
- Split effect: drones peel off in an arc, leave a brief trail
- Merge effect: drones stream back, satisfying "snap" when formation completes
- Screen at 12+ minutes: absolute visual chaos — hundreds of projectiles, particles everywhere. The Vampire Survivors "screen melt" aesthetic

### Neon.js Integration

```javascript
Neon.init({
  game: 'swarm',
  mode: 'high',
  key: 'neonarcade_neonquest_swarm_scores'
});
// Score = survival time in seconds * 10 + kills
```

### Sharing Format

```
🐝 SWARM
Survived: 14:32 / 15:00 — SO CLOSE
Peak drones: 47 | Sacrificed: 18
Kills: 2,841 | Build: Laser Kamikaze
⬛⬛🟩🟩🟩🟩🟩🟩🟩🔴
neonarcade.net/neonquest/swarm.html
```

### Controls

- **Desktop:** Mouse = move swarm. Right-click = split at cursor position. Left-click = recall. Space = activate special ability
- **Mobile:** Finger = move swarm. Tap right half = split at swarm position. Tap left half = recall. Double-tap = special ability
- **ESC:** Quit to start screen

### Performance Considerations

- Target: 60fps with 50 drones + 200 enemies + bullets on screen
- Spatial hashing for collision detection (grid-based)
- Object pooling for bullets and particles (no GC spikes)
- Canvas-based rendering (not DOM). HiDPI support via devicePixelRatio

**Performance degradation strategy:** Monitor frame delta. If `frameDelta > 20ms` for 30 consecutive frames, activate low-quality mode:
- Level 1 (mild): Disable particle effects, reduce bullet trail length
- Level 2 (moderate): Cap max enemies to 150, reduce drone projectile draw (show every 2nd bullet)
- Level 3 (mobile fallback): Reduce canvas resolution to 0.75x, cap max enemies to 100, simplify drone orbiting to fixed positions

Desktop right-click controls require `event.preventDefault()` on the `contextmenu` event.

### Build Difficulty

4/5 — Smooth real-time rendering with many entities. Spatial hashing, object pooling, splinter AI pathfinding. Most complex game in the lineup. Proven feasible: Vampire Survivors started as a browser game on itch.io.

---

## Game 5: SYNTHESIS — Neon Alchemy Lab

### Concept

Research game in a neon chemistry lab. Start with 4 base elements. Combine on workbench to discover new substances. Discoveries unlock equipment that enables new combination types. 500+ items across 6 tiers. No time pressure — pure exploration, save/resume between sessions.

### Session Length

10-60 minutes. Full save/resume required. Sessions can be any length — open the lab, discover a few things, close.

### Core Mechanics

1. **Combine** — Drag two items from inventory onto the workbench reaction zone. If valid combination: new item created with reaction animation. If invalid: workbench flickers red, items returned
2. **Inventory** — All discovered items stored in scrollable inventory. Search/filter by name or category. Items show rarity glow (common=cyan, uncommon=green, rare=purple, legendary=gold)
3. **Equipment unlocks** — Specific discoveries unlock new lab equipment. Each piece enables a new combination category:
   - **Workbench** (start) — Basic combinations
   - **Furnace** (unlock: discover Metal) — Heat-based combinations
   - **Microscope** (unlock: discover Cell) — Reveals hints for undiscovered items
   - **Centrifuge** (unlock: discover Compound) — Split items back into components (clue system)
   - **Particle Accelerator** (unlock: discover Plasma) — High-energy combinations
   - **Quantum Lab** (unlock: discover Exotic Matter) — Final tier combinations
4. **Hint system** — Lab notebook shows silhouettes of undiscovered items per tier. Microscope reveals one ingredient for a selected silhouette (costs "insight points" earned from discoveries)
5. **Catalog wall** — Periodic-table-style grid on lab wall showing all items. Filled = glowing. Empty = dark silhouette. Visual progress tracker
6. **Flavor text** — Every item has a 1-2 sentence description with lore about the neon universe

### Discovery Tree Structure

| Tier | Equipment | Unlocks At | Item Count | Example Discoveries |
|------|-----------|------------|------------|-------------------|
| 1 — Basics | Workbench | Start | ~40 | Water+Fire=Steam, Earth+Water=Mud, Fire+Earth=Lava, Air+Fire=Smoke |
| 2 — Heat | Furnace | Discover "Metal" | ~80 | Sand+Furnace=Glass, Metal+Furnace=Alloy, Clay+Furnace=Ceramic |
| 3 — Analysis | Microscope | Discover "Cell" | ~100 | Microscope hints. Bacteria, Crystal, Polymer, Enzyme |
| 4 — Separation | Centrifuge | Discover "Compound" | ~100 | Split items for clues. Refined metals, pure elements, isotopes |
| 5 — High Energy | Particle Accelerator | Discover "Plasma" | ~80 | Fusion, Antimatter, Neutron Star, Quantum Foam |
| 6 — Synthesis | Quantum Lab | Discover "Exotic Matter" | ~50 | Nanobots, AI Core, Singularity, Neon Star |

**5 Capstone discoveries (branch endings):**
1. **Neon Star** — Energy branch capstone. The heart of the NEON ARCADE universe
2. **Digital Life** — Electronics + Biology crossover
3. **Philosopher's Code** — Alchemy + Computing crossover
4. **Event Horizon** — Space branch capstone
5. **Perfect Organism** — Biology branch capstone

### Themed Branches

Items belong to themed branches that each have a visual identity:

- **Elements & Chemistry** (cyan) — Base materials, compounds, reactions
- **Electronics** (green) — Circuits, chips, programs, AI
- **Energy** (gold) — Heat, light, fusion, stars
- **Biology** (pink) — Cells, organisms, evolution
- **Space** (purple) — Planets, cosmic phenomena, exotic matter

### Centrifuge Mechanic (Reverse Engineering)

The Centrifuge is a disguised hint system:
- Place any discovered item in the Centrifuge
- It "splits" into its two component items (the ones used to create it)
- This reveals recipes for items you haven't found yet by showing what they break down into
- Clever players will reverse-engineer the tree by splitting known items and recombining the components in new ways

### Visual Design

- Lab background with visible equipment stations along the walls. New equipment appears with unlock animation
- Workbench: central glowing platform. Items placed on it float and orbit
- Reaction animation: items merge, flash, particles spiral, new item materializes with rarity glow
- Failed reaction: items repel each other, red flash, "bzzt" sound
- Catalog wall: massive grid filling the back wall. Each discovery lights up a cell. Visible progress
- Equipment: each station has idle animations (furnace flames, centrifuge spinning, particles in accelerator)
- Lab evolves visually: Tier 1 = dim starter lab. By Tier 6 = fully lit, humming, spectacular neon research facility

### Meta-progression (localStorage)

- **Full save/resume** — Inventory, catalog, equipment, discovery count all persist
- **Discovery milestones** — 50/100/200/300/500 items unlock cosmetic lab themes:
  - 50: Arctic Lab (blue/white palette)
  - 100: Volcanic Lab (red/orange)
  - 200: Deep Sea Lab (dark blue/bioluminescent)
  - 300: Space Station (stars visible through windows)
  - 500: Quantum Realm (reality glitching aesthetic)
- **Speedrun mode** — Unlocked after finding all 5 capstones. Timer. How fast to reach Neon Star?
- **Statistics** — Total discoveries, failed combinations attempted, time played, rarest item found

### Neon.js Integration

```javascript
Neon.init({
  game: 'synthesis',
  mode: 'high',
  key: 'neonarcade_neonquest_catalyst_scores'
});
// Score = total discoveries (for leaderboard ranking)
// Separate leaderboard for speedrun mode
```

### Sharing Format

```
🧪 SYNTHESIS
Catalog: 234/512 | Tier 4 unlocked
Latest: Quantum Foam ✨
Branch progress:
⚗️ Chemistry ████░░ 67%
⚡ Energy    ██████ 100%
🔬 Biology   ███░░░ 48%
💻 Tech      ████░░ 62%
🌌 Space     ██░░░░ 31%
neonarcade.net/neonquest/synthesis.html
```

### Controls

- **Desktop:** Drag items from inventory to workbench. Click equipment to switch stations. Click equipment to switch stations. Scroll inventory. Click catalog for details
- **Mobile:** Drag to combine. Tap equipment tabs. Scroll/swipe inventory. Pinch to zoom catalog wall
- **ESC:** Return to start screen (auto-saves)

### Data Architecture

The combination tree is a JSON lookup table embedded in the HTML:

```javascript
var RECIPES = {
  'water+fire': 'steam',
  'earth+water': 'mud',
  // ... 500+ entries
  // Bidirectional: 'water+fire' and 'fire+water' both work
};

var ITEMS = {
  'steam': { name: 'Steam', tier: 1, branch: 'chemistry', rarity: 'common', desc: 'Water liberated by heat. The first sign of transformation.', unlocks: null },
  'metal': { name: 'Metal', tier: 1, branch: 'chemistry', rarity: 'uncommon', desc: 'Forged from earth and fire. Civilization begins here.', unlocks: 'furnace' },
  // ...
};
```

V1 can ship with ~200 items (Tiers 1-3 complete). Tiers 4-6 added in updates. The data structure makes expansion trivial.

### Build Difficulty

3/5 — No physics, no real-time combat. Main work: designing 500+ items and their combination tree (can start with 200), drag-and-drop UX, equipment unlock flow, catalog UI. Rendering is simple. The design work (item/recipe curation) is bigger than the engineering work.

### Content Pipeline

- **File size budget:** Expect 150-300KB for the full HTML file with 500 items. V1 ships at ~100KB with 200 items (Tiers 1-3)
- **Recipe validation:** Build a simple validation script (can be a separate Node script, not shipped) that walks the recipe tree from base elements and flags: orphaned items (unreachable from base elements), dead ends (items that aren't ingredients for anything AND aren't capstones), circular dependencies
- **Recipe authoring:** Recipes authored as a flat JSON object. Bidirectional lookup handled in code (sort keys alphabetically so 'fire+water' and 'water+fire' both resolve). Each item tested by verifying reachability from base elements
- **Expansion:** Adding items is trivial — add entries to RECIPES and ITEMS objects. No code changes needed. Updates can add 50-100 items at a time

### UI Scrolling Note

This game requires scrollable inventory and zoomable catalog, which conflicts with the base CSS `overflow: hidden` on body. The game must implement custom scroll containers (overflow-y: auto on inventory panel, touch-based pan/zoom on catalog) while keeping body overflow hidden to prevent page bounce on mobile.

---

## Build Priority (Recommended Order)

| Order | Game | Build | Rationale |
|-------|------|-------|-----------|
| 1 | FUSION | 3/5 | Proves NEON QUEST category. Immediate "one more try" appeal. Physics is non-trivial but well-documented |
| 2 | SYNTHESIS | 3/5 | Can ship with 200 items. Longest retention game. Different session type than FUSION |
| 3 | JACKPOT | 3/5 | Turn-based = reliable build. Novel slot machine angle generates buzz |
| 4 | FIREWALL | 3/5 | Best brand fit. Dynamic maze is unique. Builds on TD genre knowledge |
| 5 | SWARM | 4/5 | Most complex but highest ceiling. Build last when patterns are established |

### Category Launch

Launch NEON QUEST when games 1-2 are complete (FUSION + SYNTHESIS). This gives the category:
- One quick-session game (FUSION, 5-15 min)
- One long-session game (SYNTHESIS, 10-60 min with save/resume)
- Enough variety to justify a new category hub page

Add JACKPOT, FIREWALL, and SWARM as they're completed.

---

## Integration Checklist (per game)

Same as existing NEON ARCADE checklist, plus:

1. All standard game checklist items (SEO, neon.js, share, sound, mobile, etc.)
2. Create `public/neonquest/` directory and hub page with orange accent theme
3. Add NEON QUEST to main `public/index.html` navigation, category grid, and CATALOG array
4. Add NEON QUEST nav link to all 4 existing category hub pages' navigation bars
5. Define `badge-quest` CSS class (orange) alongside existing badge classes
6. Register games in `src/worker.js` KNOWN_GAMES
7. Update game counts across all hub pages ("ALL X GAMES" links + header/SEO)
8. Add localStorage save/resume where session >15 min (keep saves under 50KB per game)
9. Update `public/sitemap.xml` and `public/llms.txt`
10. Take screenshots at 1280x800 → `public/neonquest/screenshots/`
11. Update `public/updates.html` changelog
12. Verify `public/_headers` covers `/neonquest/*` paths
13. Check if `public/manifest.json` needs a NEON QUEST entry
