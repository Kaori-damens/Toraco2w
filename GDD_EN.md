# AutoRPNG Battle — Game Design Document (English)

> **Version**: 2.0 | **Engine**: Vanilla HTML5 Canvas + Web Audio API | **Files**: `index.html` · `style.css` · `game.js`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Core Concept](#2-core-concept)
3. [Game Flow](#3-game-flow)
4. [Radoser (Fighter Unit)](#4-radoser-fighter-unit)
5. [Character Stats](#5-character-stats)
6. [Races & Subraces](#6-races--subraces)
7. [Character Creation (Chargen)](#7-character-creation-chargen)
8. [Roster System](#8-roster-system)
9. [Arena (Playing Field)](#9-arena-playing-field)
10. [Physics System](#10-physics-system)
11. [Weapons](#11-weapons)
12. [Combat Mechanics](#12-combat-mechanics)
13. [Special Mechanics](#13-special-mechanics)
14. [Projectile System](#14-projectile-system)
15. [Scaling System (Power Growth)](#15-scaling-system-power-growth)
16. [Match Phases](#16-match-phases)
17. [Visual & Audio Feedback](#17-visual--audio-feedback)
18. [UI & Screens](#18-ui--screens)
19. [Technical Reference](#19-technical-reference)

---

## 1. Overview

**AutoRPNG Battle** is a local browser game where 2–6 physics-driven fighters called **Radosers** battle inside a closed arena. Each Radoser is a unique character generated through a full RPG chargen system — with race, subrace, and six combat stats — then armed with a weapon. Movement is purely physics-based; no direct player control during battle.

| Property | Value |
|----------|-------|
| Platform | Web Browser (3-file project: HTML + CSS + JS) |
| Players | 0 (spectator) |
| Match Type | Free-for-all (last Radoser standing) |
| Fighters per match | 2–6 |
| Canvas Size | 800 × 800 px |

---

## 2. Core Concept

> *"Radosers with weapons bounce inside an arena. Physics and RPG stats decide the fight. The last one alive wins."*

**Design pillars:**
- **Pure physics movement** — no AI steering, only bouncing off walls and opponents
- **RPG identity** — each Radoser has race, stats, and a weapon that define their combat style
- **Emergent strategy** — weapon scaling + stat differences create natural power curves
- **Readable chaos** — damage numbers, particles, and Battle Log keep the spectator informed

---

## 3. Game Flow

```
[MENU]
  → Roster: view / create Radosers
  → Quick Match: pick fighters + arena → ⚔️ FIGHT!

[CHARGEN] (optional — create a new Radoser)
  → Name → Race → Subrace → Roll 6 stats → Weapon → Confirm
  → Saved to local roster (localStorage)

[BATTLE]
  → 3-second countdown
  → Radosers launch from spread angles toward center
  → Physics simulation: wall bounces, collisions, weapon attacks
  → Match ends when 1 Radoser remains

[RESULT]
  → Winner announced + match stats
  → Options: Rematch | Back to Menu
```

**Launch behavior:**
- Each Radoser launches from a spread angle ±0.4 rad toward the arena center
- Launch speed is based on the **Speed** stat

---

## 4. Radoser (Fighter Unit)

Every Radoser is a circle fighter. Core values scale with character stats (see §5).

| Stat | Formula | Notes |
|------|---------|-------|
| Max HP | `50 + DUR × 10` | Range: 60–150 |
| Radius | 24 px | Fixed (`BALL_R`) |
| Mass | `radius² × 0.05` | Affects momentum transfer |
| Max Speed | `10 + SPD × 1.5` | Range: 11.5–25 |
| Evade Chance | `BIQ × 0.03` | Range: 3%–30% |
| Evade Duration | 60 frames | Immunity + cyan glow |
| Crit Chance | `IQ × 0.05` | Range: 5%–50% |
| Crit Multiplier | ×1.5 | Fixed |
| Immunity Frames | 18 | Invincibility after being hit |
| Spin Bonus | `MA × 0.003` | Weapon rotation speed bonus |

---

## 5. Character Stats

Six stats on a **1–10 scale**, rolled during chargen via race-weighted probability tables.

| Stat | Short | Combat Effect |
|------|-------|--------------|
| Strength | STR | Base damage multiplier |
| Speed | SPD | Max speed, attack cooldown reduction, launch speed, projectile fire rate |
| Durability | DUR | Max HP |
| Intelligence | IQ | Crit chance |
| Battle IQ | BIQ | Evade chance |
| Martial Arts | MA | Weapon spin speed |

Each race has its own stat weight table — higher weights make certain stat values more likely when rolling.

---

## 6. Races & Subraces

13 playable races, each with a unique visual decoration, stat distribution, and subrace table.

### Race List

| Race | Emoji | Weight | Key Trait |
|------|-------|--------|-----------|
| Goblin | 👺 | 6.5 | Horde — size multiplier changes stats |
| Gnome | 🧙 | 6.5 | — |
| Human | 👤 | 6.5 | — |
| Dwarf | ⛏️ | 6.5 | — |
| Skeleton | 💀 | 5.25 | 2 wins → Lich (IQ=8); 4 wins → Lich King (+1 all); immune to AIDS |
| Troll | 🧌 | 5.25 | Variants: Ice, Mountain, Lich |
| Orc | 🗡️ | 5.25 | Win → +2 lowest stat; Lose → −3 highest stat |
| Giant | 🏔️ | 4.0 | After roll: highest stat gets bonus redistribution |
| Dragon | 🐉 | 4.0 | 11 elemental/type subraces |
| Angel | 👼 | 3.5 | Starts with "Pacifist" Archetype; higher ranks gain powers |
| Primordial Being | 🌌 | 3.5 | Win → receive Elemental Wheel |
| Demon | 😈 | 2.5 | 7 Sin variants, each with a unique curse/blessing |
| God | ✨ | 2.5 | 11 divine gifts |

> Weight controls how often a race appears during random chargen. Higher = more common.

### Subraces (summary)

**Goblin Horde** — size multiplier (×1 to ×100,000) affects stat bonuses; largest get Unique Weapon.

**Troll** — Regular / Ice (enemy −2 SPD in combat) / Mountain (+3 DUR) / Lich (gain Power from dead).

**Dragon** (11 types) — Crimson, Stone, Amethyst, Ancient, Undead, Zephyrian, Tideborn, Thunder, Flame, Ice, Chaos. Each gives different stat bonuses or special abilities.

**Angel Ranks** (8 tiers) — Angels → Archangels → Principalities → Powers → Virtues → Dominions → Ophanim → Cherubim. Higher ranks give more stat bonuses and Powers.

**Primordial Elements** — Air / Water / Fire / Earth. Each grants 1 Power + 1 stat bonus.

**Demon Sins** (7) — Lucifer, Beelzebub, Leviathan, Behemoth, Mammon, Belphegor, Asmodeus. Each has a unique curse and win/loss condition.

**God Gifts** (11) — Cursed Sword, War, Love, Time, Fortune, Secret Evil, Knowledge, Arts & Magic, Wilderness & Sea, Creation, Moon. Each grants a different boon.

**Skeleton Bone Lineage** — reveals the skeleton's past race (Goblin, Gnome, Human, etc.) — flavor only.

### Visual Decorations (cosmetic, no hitbox change)

| Race | Visual |
|------|--------|
| Skeleton | Hollow eye sockets, bone crack, nose hole, teeth |
| Orc | Tusks, war-paint marks |
| Dragon | Scales, tail (no horns) |
| Angel | Golden glowing halo |
| Primordial | Animated orbiting energy dots |
| God | Animated pulsing golden rays |
| Demon | Curved horns, sinister markings |
| Goblin / Gnome / Human / Dwarf / Troll / Giant | No decoration |

All Radosers (except Skeleton) have anime-style gradient oval eyes with a color derived from their body color.

---

## 7. Character Creation (Chargen)

12 sequential steps:

| Step | Screen | Description |
|------|--------|-------------|
| 1 | name | Enter character name (or pick from 200+ hero name pool) |
| 2 | race | Roll / pick race (weighted random) |
| 3 | subrace | Roll / pick subrace within race |
| 4–9 | str / spd / dur / iq / biq / ma | Roll each stat via race-weighted table (spin wheel UI) |
| 10 | hasweapon | Choose Armed or Unarmed |
| 11 | weapon | Pick one of 8 weapons (skipped if unarmed) |
| 12 | done | Summary screen → Confirm to save |

**Quick Create mode:** auto-advances through all steps for fast generation.

---

## 8. Roster System

- All created Radosers are saved to **`localStorage['cgRoster']`** as a JSON array
- Persists between sessions — refresh does not delete roster
- Each Radoser record contains:

```
{
  charName, color,
  race: { id, name, emoji },
  subrace: { label, desc },
  charStats: { strength, speed, durability, iq, battleiq, ma },
  weapon: 'fists' | 'sword' | ... ,
}
```

- In **Quick Match**, press `+` to open the Fighter Picker modal and select from roster
- Bot fighters (random stats) can also be added

---

## 9. Arena (Playing Field)

Five arena shapes, each changes ricochet geometry and corner traps.

| Arena | Shape | Dimensions | Notes |
|-------|-------|-----------|-------|
| Square | Rectangle | 600 × 600 (inset 100px) | Many corners |
| Circle | Circle | radius = 220 px | No corners, constant bounce angles |
| Rectangle | Rectangle | 600 × 400 | Horizontal momentum dominant |
| Cross | Cross (+) | arm = 240, thick = 300 | 4 pockets, complex geometry |
| Hole | Square + inner obstacle | 800 × 800, hole r = 70 | Central pit ball bounces off |

**Wall bounce:** perfectly elastic (`WALL_BOUNCE = 1.0`).

---

## 10. Physics System

### 10.1 Movement

| Parameter | Value |
|-----------|-------|
| Friction | 0.99985 per frame |
| Max Speed | `10 + SPD × 1.5` per Radoser |
| Gravity (optional) | +0.15 vy/frame (toggle button) |

### 10.2 Wall Bounce

- Reflects velocity: `v -= dot(v, n) × (1 + WALL_BOUNCE) × n`
- Ball snapped to wall surface (prevents tunneling)
- **Wall Speed Boost:** on contact → speed ×1.1; decays via `prev × 0.9747` over ~180 frames (3 s)
- `bounceCooldown` = 12 frames after wall hit

### 10.3 Ball-to-Ball Collision

- Elastic collision coefficient **e = 1.85** (slightly superelastic)
- Positional push: `overlap × 0.52`
- `bounceCooldown` = 20 frames for both after collision

### 10.4 Squash Effect

On hit: `squashX = 1.3, squashY = 0.75`, recovers at 0.15/frame (visual only).

---

## 11. Weapons

Eight weapons — 6 melee, 2 ranged.

### 11.1 Melee Weapons

| Weapon | Base Dmg | Base KB | Length | Hit Radius | Cooldown | Scaling |
|--------|----------|---------|--------|-----------|---------|---------|
| 🥊 Fists | 2 | 2 | 22 px | 11 px | 16 fr | Attack speed |
| ⚔️ Sword | 1 | 4 | 50 px | 8 px | 28 fr | Damage |
| 🗡️ Dagger | 1 | 2 | 28 px | 8 px | 18 fr | Spin speed |
| 🔱 Spear | 1 | 5 | 65 px | 8 px | 38 fr | Length + damage |
| 🌙 Scythe | 1 | 5 | 48 px | 18 px | 34 fr | Dual blade |
| 🔨 Hammer | 1 | 12 | 38 px | 14 px | 48 fr | Knockback |

All cooldowns are reduced by SPD stat: `max(2, baseCooldown − SPD)`.

### 11.2 Ranged Weapons

| Weapon | Melee Dmg | Fire Interval | Projectile Speed | Projectile Radius | Scaling |
|--------|-----------|--------------|-----------------|------------------|---------|
| 🏹 Bow | 0 | 130 fr | 7.5 units/fr | 5 px | Arrow count + speed |
| ⭐ Shuriken | 0 | 120 fr | 3 units/fr | 8 px | Star count |

Fire interval scales with SPD: Bow `max(5, 140 − SPD×2)`, Shuriken `max(5, 250 − SPD×2)`.

### 11.3 Weapon Descriptions

**🥊 Fists** — Fastest attack rate. Short range. Scales attack speed — snowballs with hit count. Can partially parry incoming projectiles (50% damage reflect).

**⚔️ Sword** — Balanced melee, scales raw damage permanently. Reliable and simple.

**🗡️ Dagger** — Short blade, fast spin. Scales rotation speed — harder to dodge at high stacks.

**🔱 Spear** — Longest reach. Slow attack, high knockback. Scales length AND damage — near untouchable late-game. When parried: spin reverses + −10% spin for 60 frames.

**🌙 Scythe** — Wide arc (18 px hit radius). Unlocks dual-blade mode at 5 hits — attacks both directions simultaneously.

**🔨 Hammer** — Slowest weapon, massive knockback (12 base). Scales knockback — can launch opponents across the entire arena. On hit: enemy weapon −30% spin for 1.5 s.

**🏹 Bow** — Fires arrow volleys every ~130 frames. Scales arrow count (unlimited). Multiple arrows fire in burst with 4-frame delay between shots.

**⭐ Shuriken** — Fires shuriken bursts every ~120 frames. Wall bounces: up to 2 times. Scales star count (every 2 hits). Can be deflected by weapon contact.

---

## 12. Combat Mechanics

### 12.1 Damage Formula

```
finalDamage = (baseDamage + bonusDamage) × STR_multiplier × critMultiplier × evadeCheck
```

- **critMultiplier** = 1.5 if `random < critChance (IQ × 0.05)`, else 1.0
- **evadeCheck** = 0 if `random < evadeChance (BIQ × 0.03)` → full dodge, else 1

### 12.2 Knockback

```
knockbackForce = (baseKnockback + bonusKnockback) × 1.4
```

Applied from attacker → defender direction.

### 12.3 Parry System

**Trigger conditions:**
1. Both fighters' `parryCooldown == 0`
2. Weapon tip distance < `(r1 + r2 + 6)` px
3. Dot product of weapon directions > 0.2 (weapons aimed at each other)

**Parry effects:**

| Effect | Value |
|--------|-------|
| Recoil impulse | 5.5 units outward |
| Parry cooldown | 25 frames (both) |
| Bounce cooldown | 22 frames (both) |
| Weapon angle deflection | +π × 0.15 rad |
| Particles | 14 golden sparks |
| Sound | Square 880 Hz + 660 Hz chord |

---

## 13. Special Mechanics

### 13.1 Evade

| Property | Value |
|----------|-------|
| Chance | `BIQ × 0.03` (3–30%) |
| Duration | 60 frames |
| Effect | Full immunity, cyan glow |
| Display | "EVADE" text in cyan |

### 13.2 Critical Hit

| Property | Value |
|----------|-------|
| Chance | `IQ × 0.05` (5–50%) |
| Multiplier | ×1.5 |
| Visual | ⚡CRIT! gold label |
| Blood particles | ×2 (12 vs normal 6) |

### 13.3 Wall Speed Boost

| Property | Value |
|----------|-------|
| Trigger | Wall collision |
| Boost | ×1.1 speed |
| Decay | ×0.9747 per frame (~3 s) |
| Sparks | 6 golden particles |

---

## 14. Projectile System

### Arrows (🏹 Bow)

| Property | Value |
|----------|-------|
| Speed | 7.5 + weapon speed bonus |
| Radius | 5 px |
| Wall behavior | Disappears on wall contact |
| Deflectable | Yes — weapon tip contact redirects + transfers ownership |
| Burst | `arrowCount` arrows per cycle, 4-frame delay between |

### Shurikens (⭐)

| Property | Value |
|----------|-------|
| Speed | 3 units/frame |
| Radius | 8 px |
| Wall bounces | Up to 2 |
| Deflectable | Yes |
| Burst | `shurikenCount` per cycle, 4-frame delay between |

**Projectile deflection:** Weapon tip within range → deflected, ownership transfers to deflecting Radoser. 5 spark particles spawned.

---

## 15. Scaling System (Power Growth)

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

## 16. Match Phases

| Phase | Time | Effect |
|-------|------|--------|
| Normal | 0 – 60 s | Standard play |
| Speed Floor | 60 – 80 s | Every 10 s: minimum speed increases (fighters can't slow down) |
| Rage Mode | 80 s+ | Damage ×1.5, knockback ×1.5, attack cooldowns −30% |

---

## 17. Visual & Audio Feedback

### 17.1 Particle Effects

| Event | Count | Color | Lifetime |
|-------|-------|-------|----------|
| Wall bounce | 6 | Gold/orange | 20–35 fr |
| Parry | 14 | Gold | 25–40 fr |
| Normal hit | 6 blood | Red tones | 18–28 fr |
| Critical hit | 12 blood | Red tones | 18–28 fr |
| Projectile deflect | 5 | Cyan/white | 20 fr |
| Death explosion | 30 | Mixed | 35–60 fr |

### 17.2 Floating Text

- Normal hit: `-[damage]` white
- Critical hit: `⚡CRIT!` gold + `-[damage]` gold
- Evade: `EVADE` cyan
- Weapon level up: scale-up label

### 17.3 Sound Effects

| Event | Description |
|-------|-------------|
| Hit | Sawtooth 200 Hz, 0.15 s |
| Parry | Square 880 Hz + 660 Hz, 0.1–0.12 s |
| Shoot | Sine 440 Hz, 0.08 s |
| Death | Sawtooth 100 Hz + Square 60 Hz |
| Scale up | Sine 1100 Hz, 0.15 s |

---

## 18. UI & Screens

### Main Tabs

| Tab / Screen | Content |
|---|---|
| **Radosers** | Full roster list; create / delete Radosers |
| **Battle** | Quick Match setup (select fighters + arena → fight) |
| **Showcase** | Preview selected Radoser with animated race decoration |

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
- Logs: hits, crits, evades, parries, projectile hits, deaths
- Format: `MM:SS AttackerName → DefenderName [event] [HP left: X]`

---

## 19. Technical Reference

### Core Constants

| Constant | Value |
|----------|-------|
| `CW / CH` | 800 / 800 px |
| `BALL_R` | 24 px |
| `BASE_HP` | 100 |
| `WALL_BOUNCE` | 1.0 |
| Friction | 0.99985 / frame |
| Elastic Coeff (e) | 1.85 |
| Gravity | 0.15 vy/frame |
| Wall Boost | ×1.1, decay 0.9747/frame |
| Frame Rate | 60 fps (requestAnimationFrame) |

### File Structure

```
AutoRPNG battle/
├── index.html    — DOM structure, tabs, modals, HUD
├── style.css     — All styling (~1925 lines)
└── game.js       — All game logic, physics, rendering (~5826 lines)
```

### Key Code Sections

| Section | Description |
|---------|-------------|
| `WEAPON_DEFS` | Array of 8 weapon config objects |
| `ARENAS` | Object map of 5 arena configs |
| `CG_RACES` | 13-race chargen config with subrace tables |
| `CG_STAT_WEIGHTS` | Per-race probability weights for each stat value |
| `class Ball` | Radoser unit: stats, physics, weapon, rendering |
| `drawRaceDecoration()` | Race-specific visual (cosmetic only) |
| `clampToBall()` | Wall collision & bounce per arena |
| `collide()` | Ball-to-ball elastic collision |
| `_checkWeaponHit()` | Melee weapon hit detection & damage |
| `step()` | Main game loop: physics, combat, particles |
| `drawArena()` | Arena rendering per type |
| `initGame()` | Match init + Radoser spawning |
| `renderRoster()` | Roster tab UI builder |
| `buildHUD()` | In-battle HP bar generator |
| `window._raceAssetOverrides` | Static shape overrides per race (persistent via localStorage) |

---

*AutoRPNG Battle — GDD v2.0*
