# AutoRPNG Battle (TORACO) — Game Design Document (English)

> **Version**: 4.2 | **Engine**: Vanilla HTML5 Canvas + Web Audio API | **Files**: `index.html` · `style.css` · 30+ JS modules

---

## Table of Contents

1. [Overview](#1-overview)
2. [Core Concept](#2-core-concept)
3. [Game Flow](#3-game-flow)
4. [Radoser (Fighter Unit)](#4-radoser-fighter-unit)
5. [Character Stats](#5-character-stats)
6. [Races & Subraces](#6-races--subraces)
7. [Character Creation (Chargen)](#7-character-creation-chargen)
8. [Skills](#8-skills)
9. [Roster System](#9-roster-system)
10. [Arena (Playing Field)](#10-arena-playing-field)
11. [Physics System](#11-physics-system)
12. [Weapons](#12-weapons)
13. [Combat Mechanics](#13-combat-mechanics)
14. [Special Mechanics](#14-special-mechanics)
15. [Race Skills](#15-race-skills)
16. [Projectile System](#16-projectile-system)
17. [Scaling System (Power Growth)](#17-scaling-system-power-growth)
18. [Match Phases](#18-match-phases)
19. [Visual & Audio Feedback](#19-visual--audio-feedback)
20. [UI & Screens](#20-ui--screens)
21. [Technical Reference](#21-technical-reference)

---

## 1. Overview

**AutoRPNG Battle (TORACO)** is a local browser game where 2–12 physics-driven fighters called **Radosers** battle inside a closed arena. Each Radoser is a unique character generated through a full RPG chargen system — with race, subrace, six combat stats, a weapon, and up to 8 skills — then launched into a physics simulation. No direct player control during battle.

| Property | Value |
|----------|-------|
| Platform | Web Browser (static HTML — open `index.html` directly) |
| Players | 0 (spectator) |
| Match Type | Free-for-all (last Radoser standing) |
| Fighters per match | 2–12 |
| Canvas Size | 1000 × 1000 px |

---

## 2. Core Concept

> *"Radosers with weapons bounce inside an arena. Physics and RPG stats decide the fight. The last one alive wins."*

**Design pillars:**
- **Pure physics movement** — no AI steering, only bouncing off walls and opponents
- **RPG identity** — each Radoser has race, stats, skills, and a weapon that define combat style
- **Emergent strategy** — weapon scaling + stat differences + skills create natural power curves
- **Readable chaos** — damage numbers, particles, and Battle Log keep the spectator informed

---

## 3. Game Flow

```
[MENU]
  → Showcase: rotating preview of your Radosers
  → Radosers: view / create / search / filter Radosers
  → Battle: Quick Match, Tournament, PvE Boss Raid
  → Wiki: in-game reference

[CHARGEN] (optional — create a new Radoser)
  → Name → Race → Subrace → Roll 6 stats → Weapon → Skill Count → Skills → Confirm
  → Saved to local roster (localStorage)
  Quick Create: name prompt → auto-advances all steps
  Debug Radoser: manually set all values
  Bulk Create: generate 1–128 Radosers at once

[BATTLE]
  → 3-second countdown
  → Radosers launch from spread angles toward center
  → Physics simulation: wall bounces, collisions, weapon attacks, skill triggers, race skills
  → Match ends when 1 Radoser remains

[RESULT]
  → Winner announced + match stats
  → Options: Rematch | Back to Menu
```

---

## 4. Radoser (Fighter Unit)

Every Radoser is a circle fighter. Core values scale with character stats (see §5).

| Property | Formula | Notes |
|----------|---------|-------|
| Max HP | `50 + DUR × 10` | Range: 60–150 |
| Radius | 24 px | Fixed (`BALL_R`) |
| Mass | `radius² × 0.05` | Affects momentum transfer |
| Max Speed | `10 + SPD × 1.5` | Range: 11.5–25 |
| Evade Chance | `BIQ × 0.03` | Range: 3%–30% |
| Evade Duration | 60 frames | Full immunity + cyan glow |
| Crit Chance | `IQ × 0.05` | Range: 5%–50% |
| Crit Multiplier | ×1.5 | Fixed |
| Melee Immunity | 4 frames | After taking a melee hit |
| Projectile Immunity | 8 frames | After taking a projectile hit (separate counter) |
| Spin Bonus | `MA × 0.003` | Weapon rotation speed bonus |

> **Note:** Melee and projectile immunity counters are completely independent — a projectile hit does not reset melee immunity and vice versa.

---

## 5. Character Stats

Six stats on a **1–10 scale**, rolled during chargen via race-weighted probability tables.

| Stat | Short | Combat Effect |
|------|-------|--------------|
| Strength | STR | Weapon damage multiplier (`baseDmg × STR`) |
| Speed | SPD | Max speed · attack cooldown reduction (−1 per point) · fire rate |
| Durability | DUR | Max HP |
| Intelligence | IQ | Crit chance (IQ×5%) · Exploit · Mind Break · Smite damage |
| Battle IQ | BIQ | Evade chance (BIQ×3%) · Read & React · Troll net trap duration |
| Martial Arts | MA | Weapon spin speed · Deflection · Flow State · Smite stun |

Subrace bonuses are applied **inline** during chargen (shown immediately after each stat spin).

---

## 6. Races & Subraces

13 playable races, each with a unique visual decoration, stat distribution, optional subrace table, and (for 7 races) a **Race Skill** (see §15).

### Race List

| Race | Emoji | Weight | Rarity | Race Skill |
|------|-------|--------|--------|-----------|
| Goblin | 👺 | 6.5 | Common | — |
| Gnome | 🧙 | 6.5 | Common | — |
| Human | 👤 | 6.5 | Common | ⚡ Limit Break |
| Dwarf | ⛏️ | 6.5 | Common | — |
| Skeleton | 💀 | 5.25 | Uncommon | — |
| Troll | 🧌 | 5.25 | Uncommon | 🕸️ Net Throw |
| Orc | 🗡️ | 5.25 | Uncommon | 🩸 Blood Price |
| Giant | 🏔️ | 4.0 | Rare | 🌍 Quake |
| Dragon | 🐉 | 4.0 | Rare | 🔥 Flame Breath |
| Angel | 👼 | 3.5 | Epic | ✨ Smite |
| Primordial Being | 🌌 | 3.5 | Epic | 🌌 Void Grip |
| Demon | 😈 | 2.5 | Legendary | — |
| God | ✨ | 2.5 | Legendary | — |

> Weight controls how often a race appears during random chargen. Higher = more common.

### Race Traits

| Race | Trait |
|------|-------|
| Skeleton | 2 PvP wins → Lich (IQ fixed 8). 4 wins → Lich King (+1 all stats). Immune to AIDS. |
| Orc | Win → +2 lowest stat. Lose → −3 highest stat. |
| Giant | After stat roll: IQ>STR → +5IQ/−5STR; STR>IQ → +5STR/−5IQ; equal → +3 both. |
| Angel | Starts with "Pacifist" Archetype; higher ranks grant bonus stats/skills. |
| Primordial | Each Combat win → re-spin Elemental Wheel. |

### Subraces (detail)

**Goblin Horde** (×1 to ×100,000, 7 tiers)
- ×1 → −1 all stats · ×50 → −1 all stats · ×100 → no effect
- ×1,000 → +1 STR · ×5,000 → +1 STR +1 SPD · ×10,000 → +2 STR +2 SPD
- ×100,000 → +1 all stats, guaranteed weapon

**Human Skin** — Trắng (guaranteed weapon) · Vàng (IQ min 5) · Đen (DUR min 5)

**Troll Type** — Regular (no effect) · Ice (combat: −2 SPD to all opponents at round start) · Mountain (+3 DUR) · Lich (75% chance to steal 1 skill from opponent)

**Dragon Type** — Tideborn (+3 STR) · Flame (+1 skill, +2 lowest stat) · Crimson (+2 IQ, +1 DUR) · Stone (+2 DUR) · Amethyst (−1 all stats, +4 skills)

**Angel Ranks** (8 tiers) — Angels (none) → Archangels (+2 SPD, +1 MA) → Principalities (post-combat +2 lowest) → Powers (Paladin archetype, +2 MA) → Virtues (cannot be debuffed) → Dominions (+2 skills) → Ophanim (+1 all stats) → Cherubim (+2 all stats)

**Primordial Elements** — Air (+1 lowest) · Water (+1 highest) · Fire (+1 skill) · Earth (+1 DUR, +1 STR). All equal weight.

**Demon Sins** (7) — Lucifer (Egoist, skill cap 4) · Beelzebub (1 stat maxes 10) · Leviathan (Leviathan's Mark gear) · Behemoth (lose: 1 stat→0; win: +2) · Mammon (−2 all, double rewards) · Belphegor (+1 starting point) · Asmodeus (AIDS skill)

**God Gifts** — 9 Norse gods equal weight: Odin · Týr · Frigg · Baldur · Loki · Freyja · Eir · Bragi · Thor

**Skeleton Bone Lineage** — reveals past race (matching original race weights), affects stat rolls.

### Visual Decorations (cosmetic only)

| Race | Visual |
|------|--------|
| Skeleton | Hollow eye sockets, bone crack, nose hole, teeth |
| Orc | Tusks, war-paint marks |
| Dragon | Scales, tail |
| Angel | Golden glowing halo (no wings) |
| Primordial | Animated orbiting energy dots |
| God | Animated pulsing golden rays |
| Demon | Curved horns, sinister markings |
| Goblin / Gnome / Human / Dwarf / Troll / Giant | No decoration |

All Radosers (except Skeleton) have anime-style gradient oval eyes with a color derived from their body color.

---

## 7. Character Creation (Chargen)

14 sequential steps. Subrace bonuses applied inline after each spin.

| Step | Screen | Description |
|------|--------|-------------|
| 1 | name | Enter character name (or pick from 200+ hero name pool) |
| 2 | race | Spin race (13 races, weighted) |
| 3 | subrace | Spin subrace (skipped if race has none) |
| 4–9 | str / spd / dur / iq / biq / ma | Spin each stat via race-weighted table |
| 10 | hasweapon | Armed or Unarmed (some subraces auto-skip to Armed) |
| 11 | weapon | Pick one of 7 weapons (skipped if unarmed) |
| 12 | skillcount | Spin skill count 0–4 (race-weighted). Subrace bonuses add on top. |
| 13 | skillpick | Spin and pick each skill individually |
| 14 | done | Summary screen → Confirm to add to roster |

**Quick Create:** name prompt → auto-advances all steps using random rolls.

**Debug Radoser:** modal to manually set race, subrace, all 6 stats, weapon, and skills.

**Bulk Create:** enter count (1–128) → instantly generates all Radosers following full chargen rules (weighted race, stats, subraces, skills). Shows race breakdown after creation.

---

## 8. Skills

Skills acquired during chargen via spin wheels. Count determined first (0–4 base, modified by subraces), then each skill picked individually.

### Skill Types

| Type | When it Activates |
|------|------------------|
| Passive | Always active — no trigger |
| Pre-Combat | Once at round start |
| In-Combat | Reactive — triggers on specific events |
| Post-Combat | Once after round ends |

### Full Skill List

#### Passive
| Skill | Effect |
|-------|--------|
| 🛡️ Iron Body | +20 max HP |
| 🦏 Thick Hide | −10% damage received |
| 💨 Swift | +15% movement speed cap |
| 👁️ Sharp Eye | +10% crit chance |
| ✨ Extended Immunity | Melee immunity 4 → 30 frames; Projectile immunity 8 → 16 frames |
| ⚓ Heavy Mass | +30% mass (less knockback) |
| 🪞 Deflection | MA×2% chance to completely negate a hit |

#### Pre-Combat
| Skill | Effect |
|-------|--------|
| 📢 War Cry | First hit this round deals 2× damage |
| 🏰 Fortify | Start with a 1-hit absorption shield |
| ⚡ Adrenaline | First 5s: +50% movement speed |
| 🦅 Predator | +15% damage when target has less HP |
| 🩸 First Blood | First hit of round stuns opponent 30 frames |
| 🧿 Mind Break | If IQ > target IQ: −(gap × 3%) to their final damage (max 60%) |

#### In-Combat
| Skill | Effect |
|-------|--------|
| 😤 Berserker | +50% damage while HP < 30% |
| 🔥 Phoenix | Survive one lethal hit with 1 HP (once/round) |
| ↩️ Counter | After being parried: next hit deals 2× damage |
| 🧛 Vampiric | On hit: heal 5% of damage dealt |
| 🗡️ Parry Master | On parry: no knockback + weapon spin ×2 for 1.5s |
| 🌀 Momentum | On kill (FFA): +10% speed stack (max 5×) |
| 👻 Shadow Step | On evade: teleport to a random safe spot |
| 💉 Blood Frenzy | On kill: heal 25 HP |
| 🌊 Flow State | On hit: +MA×1% speed per stack (resets when you take a hit) |
| ⚡ Read & React | On being hit: BIQ×3% chance to instantly counter-attack |
| 💡 Exploit | On hit: (IQ+BIQ)×1% chance to deal double damage |

#### Post-Combat
| Skill | Effect |
|-------|--------|
| 📚 Learning | After losing: +5% damage next round |
| 🧬 Adaptation | After losing: +20% resist to killer's weapon type |
| 🩹 Survivor | Win with HP<20%: +10 max HP permanently |
| 🏅 Veteran | Win: +1 random stat (cumulative, no cap) |
| 🌙 Mastery | Win with HP<50%: MA×3% chance +1 dmg/proj to weapon permanently |
| 💎 Perfectionist | Win >80% HP: +15% dmg. Win ≤80% HP: −10% dmg |
| 🩸 Blood Mark | Lose: mark opponent — they start next round with 80% HP |
| 🎭 Copycat | Win: BIQ×3.5% chance to learn 1 random skill from opponent |

### Stat-Scaling Skills

| Skill | Scales With | Formula |
|-------|------------|---------|
| 🪞 Deflection | MA | MA×2% negate chance |
| 🌊 Flow State | MA | MA×1% speed per hit stack |
| ⚡ Read & React | BIQ | BIQ×3% counter chance |
| 💡 Exploit | IQ + BIQ | (IQ+BIQ)×1% double damage |
| 🧿 Mind Break | IQ | IQ gap × 3% damage debuff |

### Skill Count Probability by Race

| Race | 0 | 1 | 2 | 3 | 4 |
|------|---|---|---|---|---|
| Goblin | 30% | 30% | 20% | 10% | 10% |
| Gnome | 30% | 30% | 25% | 10% | 5% |
| Human | 25% | 25% | 25% | 15% | 10% |
| Dwarf | 30% | 35% | 20% | 10% | 5% |
| Skeleton | 20% | 20% | 20% | 20% | 20% |
| Troll | 30% | 35% | 20% | 10% | 5% |
| Orc | 30% | 35% | 20% | 10% | 5% |
| Giant | 45% | 5% | 10% | 5% | 35% |
| Dragon | 5% | 15% | 50% | 20% | 10% |
| Angel | 15% | 20% | 30% | 25% | 10% |
| Primordial | 15% | 5% | 25% | 35% | 20% |
| Demon | 20% | 5% | 15% | 35% | 25% |
| God | 20% | 5% | 15% | 35% | 25% |

> Subrace bonuses (Amethyst +4, Flame +1, Primordial Fire +1, Angel Dominions +2) stack on top of this count.

---

## 9. Roster System

- All created Radosers saved to **`localStorage['cgRoster']`** as a JSON array
- Persists between sessions — refresh does not delete roster
- **Search bar:** smart query syntax — `race=orc`, `str>5`, `weapon=bow`, `total>=40`, `iq!=1`, plain text searches name/race
- **Filter panel:** filter chips by Race and Weapon (single-select each, stacks with search)
- Each Radoser record contains: name · color · race · subrace · 6 stats · weapon · skills · `championshipTag` (optional)

### 9a. Radoser Title Badges

Each Radoser automatically receives a **Title Badge** based on their stat distribution. Evaluated in priority order:

| Tier | Badge | Condition |
|------|-------|-----------|
| Perfect | 🐐 GOAT | All 6 stats = 10 (total = 60) |
| Perfect | 🌟 Legend | Total ≥ 55 |
| Multi-10 | ⚡ Demigod | ≥ 4 stats equal 10 |
| Multi-10 | 🔥 Prodigy | ≥ 3 stats equal 10 |
| Single-10 | 💨 Speedster | SPD = 10 |
| Single-10 | 💪 Destroyer | STR = 10 |
| Single-10 | 🛡️ Iron Wall | DUR = 10 |
| Single-10 | 🧠 Mastermind | IQ = 10 |
| Single-10 | 👻 Phantom | BIQ = 10 |
| Single-10 | 🌪️ Whirlwind | MA = 10 |
| Build | 🏋️ Tank | STR ≥ 8 AND DUR ≥ 8 |
| Build | 💥 Glass Cannon | SPD ≥ 8 AND DUR ≤ 3 |
| Build | 🐂 Berserker | STR ≥ 8 AND SPD ≤ 3 |
| Build | 🐦 Trickster | SPD ≥ 8 AND STR ≤ 3 |
| Build | 🎯 Tactician | IQ ≥ 8 AND BIQ ≥ 8 |
| Build | 🎭 Dancer | MA ≥ 8 |
| Build | ⚖️ All-Rounder | Every stat ≥ 7 |
| Build | 🟢 Balanced | Every stat ≥ 5 |
| Build | 🎪 One-Trick | maxStat ≥ 8 AND total ≤ 25 |
| Total | ⚔️ Veteran | Total ≥ 45 |
| Total | 🔥 Warrior | Total ≥ 35 |
| Total | 📊 Average | Total ≥ 25 |
| Total | 😐 Mid | Total ≥ 15 |
| Total | 🌱 Rookie | Fallback |

### 9b. Championship Tag Badge

When a Radoser is created during a **Toraco Championship** draft, they receive a **`[TAG]`** badge:

- Set once when entering Championship setup — **Name** (1–16 characters) + **Tag** (exactly 3 characters, uppercase, A–Z / 0–9)
- Example: Championship name `Sunohana`, tag `SHN` → badge displays as **`[SHN]`**
- Tag badge appears alongside the Title Badge on all roster cards and stat popups
- All Radosers created via chargen draft, Quick Create, or Fill Remaining inherit the tag
- Tag is stored as `championshipTag` + `championshipName` on the Radoser record in localStorage

---

## 10. Arena (Playing Field)

Five preset arena shapes plus a custom arena builder.

| Arena | Shape | Default Dimensions |
|-------|-------|-------------------|
| Square | Rectangle | 600 × 600 px (inset 200 px) |
| Circle | Circle | radius = 220 px |
| Rectangle | Rectangle | 600 × 400 px |
| Cross | Cross (+) | arm = 240, thick = 300 |
| Hole | Square + inner obstacle | 1000 × 1000, hole radius = 70 |

**Custom Arena Builder** — max dimensions: square/rect 1000 px, circle/hole radius 600 px, cross arm 500 px.

**Wall bounce:** perfectly elastic (`WALL_BOUNCE = 1.0`).

---

## 11. Physics System

### 11.1 Movement

| Parameter | Value |
|-----------|-------|
| Friction | 0.99985 per frame |
| Max Speed | `10 + SPD × 1.5` per Radoser |
| Gravity (optional) | +0.15 vy/frame (toggle button) |

### 11.2 Wall Bounce

- Reflects velocity: `v -= dot(v, n) × (1 + WALL_BOUNCE) × n`
- Ball snapped to wall surface (prevents tunneling)
- **Wall Speed Boost:** on contact → speed ×1.1; decays via `prev × 0.9747` over ~180 frames (3 s)
- `bounceCooldown` = 12 frames after wall hit

### 11.3 Ball-to-Ball Collision

- Elastic collision coefficient **e = 1.85** (slightly superelastic)
- Positional push: `overlap × 0.52`
- `bounceCooldown` = 20 frames for both after collision

### 11.4 Squash Effect

On hit: `squashX = 1.3, squashY = 0.75`, recovers at 0.15/frame (visual only).

---

## 12. Weapons

Eight weapons — 6 melee, 2 ranged.

### 12.1 Melee Weapons

| Weapon | Base Dmg | Base KB | Length | Hit Radius | CD Formula | Scaling |
|--------|----------|---------|--------|-----------|-----------|---------|
| 🥊 Fists | 2 | 2 | 22 px | 11 px | max(2, 13−SPD) | −0.5f CD/hit (min 8f) |
| ⚔️ Sword | 1 | 4 | 50 px | 8 px | max(2, 28−SPD) | +1 dmg/hit |
| 🗡️ Dagger | 1 | 2 | 28 px | 8 px | max(2, 18−SPD) | +0.012 spin/hit (max 0.55) |
| 🔱 Spear | 1 | 5 | 65 px | 8 px | max(2, 38−SPD) | +4 px length / +0.5 dmg/hit |
| 🌙 Scythe | 1 | 5 | 48 px | 18 px | max(2, 34−SPD) | Dual blade at 5 hits |
| 🔨 Hammer | 1 | 12 | 38 px | 14 px | max(2, 48−SPD) | +0.8 KB/hit |

### 12.2 Ranged Weapons

| Weapon | Melee Dmg | Proj Dmg | Fire Interval | Proj Speed | Scaling |
|--------|-----------|----------|--------------|------------|---------|
| 🏹 Bow | 0 | 1/arrow | max(5, 140−SPD×2) | 7.5 px/fr | +1 arrow/hit |
| ⭐ Shuriken | 0 | 1/star | max(5, 250−SPD×2) | 3 px/fr | +1 star/hit |

**Bow specifics:**
- **Starting arrows** = SPD stat (higher SPD → more arrows from the start)
- **Arrow visual size** scales with STR stat (higher STR → larger arrows)
- **Soft auto-aim:** weapon angle tracks nearest enemy at `MA × 0.003 rad/frame`
- **Aim cone:** only fires when enemy is within `(20 + IQ × 4)°` of current aim angle
- Arrow burst: `arrowCount` arrows per cycle, 4-frame delay between shots

**Shuriken specifics:**
- Bounces off walls up to 2 times before disappearing
- Can be deflected by weapon contact (ownership transfers)

### 12.3 Parry Hit Points

Parry detection uses multiple hit points per weapon:

| Weapon | Hit Points |
|--------|-----------|
| Fists | 6 points along full blade (ball.radius → tip) |
| Sword | tip (r=8) + mid 65% (r=6) + near 35% (r=6) — 3 points, one side |
| Dagger | tip center (r=8) + 2 perpendicular side points at ±8px (r=6 each) |
| Spear | Dynamic N points along full shaft (grows with bonusLength) |
| Scythe | 5-point arc sweep (dual blade adds 5 more) |
| Hammer | Single tip point (r=14) |
| Bow | Single center point (r=16) |
| Shuriken | Single center point (r=14) |

---

## 13. Combat Mechanics

### 13.1 Damage Formula

```
base       = weapon.baseDamage
           + (MA × 0.15)   if dagger/shadowfang   [scales with STR]
dmg        = (base × STR + weapon.bonusDamage) × rageMult
           + (MA × 0.5)    if fists/iron_fist     [FLAT — does NOT scale with STR]
finalDamage = dmg × critMultiplier × (1 − mindBreakDebuff)
```

- **STR multiplier:** `base × charSTR` (STR 1→×1, STR 10→×10)
- **Fists/Iron Fist MA bonus:** flat `+MA×0.5` added *after* STR multiplication — MA=10 → +5 flat regardless of STR
- **Dagger/Shadowfang MA bonus:** `+MA×0.15` added to base *before* STR — MA=10, STR=10 → +15 to final damage
- **critMultiplier** = 1.5 if `random < critChance (IQ × 0.05)`, else 1.0
- **evadeCheck** = 0 if `random < evadeChance (BIQ × 0.03)` → full dodge + 60f immunity window
- **mindBreakDebuff** = accumulated from opponent's Mind Break skill (max 60%)
- **rageMult** = 1.5 when `matchTime ≥ 80 × 60` frames (Rage Phase)

### 13.2 Knockback

```
knockbackForce = (baseKnockback + bonusKnockback) × 1.4
```

Applied in attacker → defender direction.

### 13.3 Immunity Frames

| Hit Type | Default | With Extended Immunity |
|----------|---------|----------------------|
| Melee | 4 frames | 30 frames |
| Projectile | 8 frames | 16 frames |

Both counters are **separate** — a projectile hit only resets `projImmunityFrames`, not `immunityFrames`.

### 13.4 Parry System

**Trigger conditions:**
1. Both fighters' `parryCooldown == 0`
2. Any hit point distance < `(r1 + r2 + 6)` px
3. Both weapon directions facing each other: `dot(dir1, dir2) < −0.2` (facing opposite) **AND** `dot(dir, toEnemy) > 0.2` for each

**Parry effects:**

| Effect | Value |
|--------|-------|
| Recoil impulse | 5.5 units outward |
| Parry cooldown | 25 frames (both) |
| Bounce cooldown | 22 frames (both) |
| Weapon angle deflect | +π × 0.15 rad |
| Particles | 14 golden sparks |
| Sound | Square 880 Hz + 660 Hz chord |

---

## 14. Special Mechanics

### 14.1 Evade

| Property | Value |
|----------|-------|
| Chance | `BIQ × 0.03` (3–30%) |
| Duration | 60 frames |
| Effect | Full immunity, cyan glow |
| Display | "EVADE" text in cyan |

### 14.2 Critical Hit

| Property | Value |
|----------|-------|
| Chance | `IQ × 0.05` (5%–50%) |
| Multiplier | ×1.5 |
| Visual | ⚡CRIT! gold label |
| Blood particles | ×2 (12 vs normal 6) |

### 14.3 Wall Speed Boost

| Property | Value |
|----------|-------|
| Trigger | Wall collision |
| Boost | ×1.1 speed |
| Decay | ×0.9747 per frame (~3 s) |
| Sparks | 6 golden particles |

### 14.4 Ice Troll Debuff (Subrace)

At round start, all opponents permanently lose −2 SPD (−3 maxSpd) for that round. Displayed as `🧊 -2 SPD` floating text.

---

## 15. Race Skills

Seven races have unique active or passive abilities that trigger automatically during battle.

### 15.1 🔥 Dragon — Flame Breath

| Property | Value |
|----------|-------|
| Activation | Auto-activates when cooldown reaches 0 |
| Duration | `round((120 + MA × 12) × 1.12)` frames (~2.2s – 4.5s) |
| Cooldown | `max(600, 1800 − SPD × 40)` frames (~10s – 30s) |
| Damage | STR × 3 per tick (every 20 frames = 0.33s) |
| Cone angle | `π/6 + MA × 0.012` rad halfCone (widens with MA) |
| Sweep | Oscillates ±(35 + MA×1.5)° around locked mouth direction |
| Sweep freq | `0.045 + IQ × 0.003` rad/frame (IQ1 → ~2.2s/cycle, IQ10 → ~1.4s/cycle) |
| Flame immunity | Per-enemy 18f cooldown (independent of weapon immunity) |

Visual: 3-layer fire cone (outer haze + main body with jagged tip + bright hot core). No straight edge lines — organic look.

### 15.2 🕸️ Troll — Net Throw

| Property | Value |
|----------|-------|
| Activation | Auto-fires at nearest enemy when cooldown = 0 |
| Cooldown (hit) | `max(360, 840 − SPD × 48)` frames (~6s – 14s) |
| Cooldown (miss) | 70% of full cooldown |
| Net speed | 5 px/frame |
| Net radius | Starts at 10 px, grows by +0.032 per px traveled (~10px→30px+ at max range) |
| Trap duration | `max(60, 30 + BIQ × 18)` frames (~1s – 3.5s) |

### 15.3 🌌 Primordial Being — Void Grip

| Property | Value |
|----------|-------|
| Activation | Passive — triggers when an enemy weapon hits this Primordial |
| Stick chance | `min(0.60, BIQ × 0.06)` (6%–60%) |
| Stuck duration | `60 + MA × 15` frames (~1s – 3.5s) |
| Cooldown | None (passive) |

Effect: The attacker's weapon gets "stuck in the void" — pulled toward the Primordial's center for the duration.

### 15.4 ⚡ Human — Limit Break

| Property | Value |
|----------|-------|
| Activation | **One-time trigger** when HP drops below 20% of max HP |
| Duration | **Permanent until end of match** — cannot expire or reset |
| Cooldown | None (HP-threshold based) |
| Melee AI | Charges directly at nearest enemy at speed × 1.5, no retreat |
| Ranged AI | Kites at ideal 250px distance (±60px dead zone), lerp factor 0.07 |
| Damage stack | Each hit landed adds +15% damage (no cap, stacks persist through match end) |
| HP drain | None — this is a last-stand skill, not a berserk |
| Visual | Pulsing gold double-ring glow + `⚡×N` stack counter above ball |

> **Design intent:** Human is the "underdog" race. Limit Break is their last-gasp trump card — only when truly on the brink (HP < 20%) do they flip the script. The longer they survive at death's door, the more dangerous they become.

### 15.5 🩸 Orc — Blood Price

| Property | Value |
|----------|-------|
| Type | Passive |
| Stack gain | +1 Bloodlust stack per hit received (capped at 5) |
| Burst trigger | At 5 stacks → next attack armed as BURST (stacks reset) |
| Burst damage bonus | `× (1 + STR × 0.15)` on that one hit |
| Burst heal | `round(DUR × 2)` HP restored on burst hit landing |
| Cooldown | None (stack-based) |
| Visual | `🩸×N` badge above ball; pulsing crimson double-ring when BURST ready |

> **Design intent:** Orc rewards aggressive play — you take hits to fuel your next devastating burst. High DUR Orcs get meaningful healing; high STR Orcs deal crushing burst damage. The 5-hit requirement creates a tense wait-and-watch rhythm.

### 15.6 🌍 Giant — Quake

| Property | Value |
|----------|-------|
| Type | Active (auto-fires when cooldown = 0) |
| Cooldown | `max(1200, 1800 − STR × 50 − DUR × 30)` frames (~20s – 30s) |
| Shockwave force | `6 + STR × 1.5` px/frame velocity impulse (falloff with distance) |
| Force falloff | `max(0.1, 1 − dist / 380)` — scales from full force at center to 10% at edge |
| Close damage | `round(STR × 2)` to enemies within 160px |
| Push radius | Affects ALL living enemies regardless of distance |
| Visual | Expanding gold shockwave ring (30-frame animation) + `🌍 READY` glow when cooldown = 0 |

> **Design intent:** Giant is a slow bruiser who periodically reshuffles the entire battlefield. In FFA (many-player), Quake is chaotic and powerful — sending multiple enemies flying. In 1v1, it's a reliable spacing reset tool. High STR Giants hit hard and push far.

### 15.7 ✨ Angel — Smite

| Property | Value |
|----------|-------|
| Activation | Auto-fires at nearest enemy when cooldown = 0 |
| Cooldown | `max(600, 900 − SPD × 40)` frames (~6s – 10s) |
| Windup | 60 frames before strike |
| Damage | `8 + IQ × 2` (IQ1 → 10, IQ10 → 28) |
| Stun | `60 + MA × 12` frames (~1s – 3s) |
| Miss condition | If target moves > `(radius × 2.5 + 30)` px from cast point during windup → miss |
| Telegraph | Pulsing dashed ring + crosshair on target throughout windup (grows brighter near strike) |

---

## 16. Projectile System

### Arrows (🏹 Bow)

| Property | Value |
|----------|-------|
| Speed | 7.5 + weapon speed bonus px/frame |
| Visual radius | Scales with STR (higher STR = larger arrows) |
| Wall behavior | Disappears on wall contact |
| Deflectable | Yes — weapon tip contact redirects + transfers ownership |
| Starting count | = SPD stat (not fixed 1) |
| Burst | `arrowCount` arrows per cycle, 4-frame delay between |
| Immunity | 8 frames projectile immunity on hit |

### Shurikens (⭐)

| Property | Value |
|----------|-------|
| Speed | 3 px/frame |
| Radius | 8 px |
| Wall bounces | Up to 2 |
| Deflectable | Yes |
| Burst | `shurikenCount` per cycle, 4-frame delay between |
| Immunity | 8 frames projectile immunity on hit |

**Projectile deflection:** Weapon tip within range → deflected, ownership transfers. 5 spark particles spawned.

---

## 17. Scaling System (Power Growth)

Each weapon tracks a **hits counter**. Every confirmed hit (not evaded) triggers scaling.

| Weapon | Scaling Stat | Per Hit | Cap |
|--------|-------------|---------|-----|
| 🥊 Fists | Attack Cooldown | −0.5 frames | min 8 fr |
| ⚔️ Sword | Bonus Damage | +1 | None |
| 🗡️ Dagger | Spin Speed | +0.012 | max 0.55 |
| 🔱 Spear | Length + Damage | +4 px / +0.5 | None |
| 🏹 Bow | Arrow Count + Speed | +1 arrow / +0.3 | None |
| 🌙 Scythe | Dual Mode | Activates at 5 hits | 2 blades |
| 🔨 Hammer | Knockback | +0.8 | None |
| ⭐ Shuriken | Star Count | +1 (every 2 hits) | None |

---

## 18. Match Phases

| Phase | Time | Effect |
|-------|------|--------|
| Normal | 0 – 60 s | Standard play |
| Speed Floor | 60 – 80 s | Every 10 s: minimum speed increases |
| Rage Mode | 80 s+ | Damage ×1.5, knockback ×1.5, attack cooldowns −30% |

---

## 19. Visual & Audio Feedback

### 19.1 Particle Effects

| Event | Count | Color | Lifetime |
|-------|-------|-------|----------|
| Wall bounce | 6 | Gold/orange | 20–35 fr |
| Parry | 14 | Gold | 25–40 fr |
| Normal hit | 6 blood | Red tones | 18–28 fr |
| Critical hit | 12 blood | Red tones | 18–28 fr |
| Projectile deflect | 5 | Cyan/white | 20 fr |
| Death explosion | 30 | Mixed | 35–60 fr |

### 19.2 Floating Text

| Event | Color |
|-------|-------|
| Normal hit | `-[damage]` white |
| Critical hit | `⚡CRIT!` gold + `-[damage]` gold |
| Evade | `EVADE` cyan |
| Smite windup | "✨ SMITE!" yellow |
| Smite hit | `⚡ -[damage]` yellow |
| Smite miss | `✨ miss!` grey |
| Limit Break | `⚡ LIMIT BREAK!` gold |
| Limit Break stack | `⚡ ×N` gold |
| Flame Breath | `🔥 FLAME BREATH!` orange |
| Net trap | `🕸️ TRAPPED!` gold |
| Ice Troll | `🧊 -2 SPD` blue |
| Mind Break | `🧿 MIND BREAK -X%` purple |

### 19.3 Sound Effects

All SFX use **`HTMLAudioElement` + `cloneNode()`** (works on `file://` protocol). Procedural Web Audio API tones serve as fallback when files fail to load.

Files are stored in `sfx/` folder. To swap a sound: replace the file in `sfx/` with the same name.

| Event | File | Fallback (procedural) |
|-------|------|-----------------------|
| Parry | `sfx/sfx_parry.mp3` | Square 880 Hz + 660 Hz |
| Hit — Sword / default | `sfx/sfx_hit_sword.mp3` → `sfx_hit_generic.wav` | Sawtooth 200 Hz |
| Hit — Dagger / Shadowfang | `sfx/sfx_hit_dagger.mp3` | ↑ |
| Hit — Spear / Gungnir | `sfx/sfx_hit_spear.mp3` | ↑ |
| Hit — Fists / Iron Fist | `sfx/sfx_hit_fists.mp3` | ↑ |
| Hit — Scythe / Harvester | `sfx/sfx_hit_scythe.mp3` | ↑ |
| Shoot — Bow / Medusa Bow | `sfx/sfx_shoot_bow.mp3` | Sine 440 Hz |
| Shoot — Shuriken / Fuma | `sfx/sfx_shoot_shuriken.mp3` | ↑ |
| Shuriken wall bounce | `sfx/sfx_bounce_shuriken.mp3` | *(none)* |
| Ball wall bounce | `sfx/sfx_wall_bounce.mp3` | *(none)* |
| Mjolnir lightning | `sfx/sfx_lightning.mp3` | Sawtooth 120 Hz |
| Death | *(procedural only)* | Sawtooth 100 Hz + Square 60 Hz |
| Weapon scale up | *(procedural only)* | Sine 1100 Hz |

---

## 20. UI & Screens

### Main Tabs

| Tab / Screen | Content |
|---|---|
| **Showcase** | Rotating preview of roster Radosers (7s interval, canvas animation) |
| **Radosers** | Full roster list; search (smart query syntax); filter by race/weapon; create / delete / export / import Radosers |
| **Battle** | Quick Match · Tournament bracket · Toraco Championship · PvE Boss Raid |
| **Wiki** | In-game reference: Stats · Combat · Races · Weapons · Race Skills · Skills |
| **Changelogs** | Patch history (collapsible) |

### In-Match Controls

| Button | Action |
|--------|--------|
| ⏸ Pause | Pause / resume |
| ← Menu | Return to menu |
| 🌍 Gravity | Toggle gravity (+0.15 vy/frame) |
| 🔍 100% | Zoom cycle: 100% → 85% → 70% → 55% |
| ⚡ Speed: 1× | Speed cycle: 1× → 2× → 3× → 5× |

### Battle Log

- Live panel shows last 8 entries during battle
- Full history accessible via modal
- Logs: hits, crits, evades, parries, projectile hits, skill triggers, deaths, race skills
- Format: `MM:SS AttackerName → DefenderName [event] [HP left: X]`

---

## 20b. Toraco Championship

Mega-tournament mode supporting 128 or 256 players across 3 sequential phases.

### Entry & Setup

- Select from Main Menu → **Toraco Championship** card
- **First-time setup:** enter Championship **Name** (1–16 chars) and **Tag** (3 chars, e.g. `SHN`) — identifies this championship instance
- Choose size: **128** or **256** players
- Select Radosers from roster (remaining slots filled by bots); selection capped at size
- All Radosers drafted in this championship are auto-tagged `[TAG]` and saved to the global roster
- Auto-save to `localStorage` — resumable via **Resume Championship** button

### Phase 1 — Battle Royale (FFA)

| Property | Value |
|----------|-------|
| Format | FFA groups of 4 fighters |
| Groups | size ÷ 4 (32 groups for 128, 64 for 256) |
| Match | Single FFA round — last Radoser standing wins |
| Advance | 1 winner per group → proceeds to Phase 2 |

### Phase 2 — Last Stand (1v1 BO1)

| Property | Value |
|----------|-------|
| Format | Single-elimination 1v1, BO1 |
| Entrants | Phase 1 winners (32 for 128-player, 64 for 256-player) |
| Advance | 16 winners proceed to Phase 3 |

### Phase 3 — Double Elimination (DE16, BO3)

| Property | Value |
|----------|-------|
| Format | Double-elimination bracket, 16 players |
| Match format | BO3 (first to 2 wins) |
| Structure | Winners Bracket (R1→R2→SF→F) + Losers Bracket (R1→R2→R3→R4→SF→F) + Grand Final |
| Champion | Winner of Grand Final |

### PVP Reward
- Winners of each match (FFA, 1v1, BO3) spin the PVP Reward Wheel
- Stat/skill gains are **temporary** — reset when championship ends (not saved to roster)

### Bracket Viewer
- Phase navigation: Prev / Next phase buttons
- FFA: group grid — click fighter to view Fighter Card
- 1v1 & DE: bracket-match cards — click fighter to view Fighter Card, score shown as `X – Y`
- Champion screen: clickable name → Fighter Card

---

## 21. Technical Reference

### Core Constants

| Constant | Value |
|----------|-------|
| `CW / CH` | 1000 / 1000 px |
| `BALL_R` | 24 px |
| `BASE_HP` | 100 |
| `WALL_BOUNCE` | 1.0 |
| Friction | 0.99985 / frame |
| Elastic Coeff (e) | 1.85 |
| Gravity | 0.15 vy/frame (optional) |
| Wall Boost | ×1.1, decay 0.9747/frame |
| Frame Rate | 60 fps (requestAnimationFrame) |

### File Structure

```
AutoRPNG battle/
├── index.html           — DOM: tabs, modals, HUD, wiki, changelog
├── style.css            — All styling (dark theme + Mirage variant)
├── audio.js             — SFX API (HTMLAudioElement + cloneNode; procedural fallback)
│                           Public: sfxHit(weaponId), sfxParry(), sfxShoot(weaponId),
│                                   sfxWallBounce(), sfxLightning(), sfxDeath(), sfxScale()
├── sfx/                 — All SFX audio files (MP3/WAV). Swap files here — no code changes needed.
│   ├── sfx_parry.mp3
│   ├── sfx_hit_sword.mp3 / sfx_hit_dagger.mp3 / sfx_hit_spear.mp3
│   ├── sfx_hit_fists.mp3 / sfx_hit_scythe.mp3 / sfx_hit_generic.wav
│   ├── sfx_shoot_bow.mp3 / sfx_shoot_shuriken.mp3
│   ├── sfx_bounce_shuriken.mp3 / sfx_wall_bounce.mp3
│   └── sfx_lightning.mp3
├── constants.js         — CW/CH, BALL_R, ARENAS, BALL_COLORS, generateRadoserColor()
├── weapons.js           — WEAPON_DEFS array, getHitPoints(), _checkWeaponHit()
├── projectile.js        — Arrow & Shuriken classes, resolveProjectiles()
├── particles.js         — Particle system (spawnParticle, spawnSparks, spawnDamageNumber)
├── arena.js             — Arena rendering, clampToBall() wall bounce
├── skills.js            — SKILL_DEFS, RACE_SKILL_DEFS, all skill hooks, race skill logic
├── ball.js              — Ball class: constructor, update(), draw(), takeDamage()
├── collision.js         — Ball-to-ball elastic collision, projectile collision
├── state.js             — Global match state object (players, projectiles, rstate, etc.)
├── game-loop.js         — step() main loop: physics, combat, particles, phase management
├── setup.js             — initGame(), match setup, fighter construction
├── result.js            — Result screen rendering, match stats
├── tournament.js        — Tournament bracket logic, BO1/BO3/BO5
├── championship.js      — Toraco Championship (FFA → Last Stand → Double Elimination)
├── ui.js                — HUD, battle log, in-match controls, arena builder (AB_PARAMS)
├── chargen-data.js      — CG_RACES, CG_SUBRACES, CG_STAT_WEIGHTS, CG_WEAPONS, SKILL_DEFS
├── spin-wheel.js        — SpinWheel class (canvas wheel animation)
├── chargen.js           — Chargen flow, Quick Create, Debug Radoser
├── roster.js            — renderRoster(), search/filter, localStorage, hero showcase
├── pve.js               — PvE boss raid mode
├── boss.js              — Boss base class and shared logic
├── boss-krag.js / boss-vael.js / boss-ignar.js  — Individual boss implementations
├── boss-molthrex.js / boss-syvara.js / boss-grakk.js / boss-maddox.js
├── boss-moves.js / boss-*-moves.js — Boss move sets
├── maps.js              — PvE map definitions
├── asset-editor.js      — Race shape asset editor (_raceAssetOverrides)
└── game.js              — Legacy backup (not loaded)
```

### Key Code Sections

| Section | File | Description |
|---------|------|-------------|
| `WEAPON_DEFS` | `weapons.js` | 8 weapon config objects (draw, getHitPoints, onHit) |
| `ARENAS` | `constants.js` | 5 preset arena configs |
| `CG_RACES` | `chargen-data.js` | 13-race chargen config with weights |
| `CG_SUBRACES` | `chargen-data.js` | Subrace tables per race |
| `CG_STAT_WEIGHTS` | `chargen-data.js` | Per-race probability weights for each stat (1–10) |
| `SKILL_DEFS` | `chargen-data.js` + `skills.js` | All 25 skill definitions |
| `RACE_SKILL_DEFS` | `skills.js` | 7 race skill definitions |
| `initRaceSkillState()` | `skills.js` | Initializes rs_* properties per race on ball construction |
| `updateRaceSkills()` | `skills.js` | Per-frame race skill logic (Dragon, Troll, Human, Primordial, Angel, Giant) |
| `updateRaceSkillProjectiles()` | `skills.js` | Troll net + Smite bolt tick updates |
| `class Ball` | `ball.js` | Radoser unit: stats, physics, weapon, rendering |
| `takeDamage()` | `ball.js` | Damage application with separate melee/proj immunity |
| `clampToBall()` | `collision.js` | Wall collision per arena shape |
| `collide()` | `collision.js` | Ball-to-ball elastic collision |
| `_checkWeaponHit()` | `weapons.js` | Melee weapon hit detection using getHitPoints() |
| `step()` | `game-loop.js` | Main game loop |
| `generateRadoserColor()` | `constants.js` | Golden ratio hue distribution for unique colors |
| `renderRoster()` | `roster.js` | Roster grid with smart search + filter |
| `parseRosterQuery()` | `roster.js` | Smart search parser (race=, str>, weapon=, etc.) |

---

*AutoRPNG Battle (TORACO) — GDD v4.2*
