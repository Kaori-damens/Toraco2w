# AutoRPNG Battle — Game Design Document (English)

> **Version**: 3.0 | **Engine**: Vanilla HTML5 Canvas + Web Audio API | **Files**: `index.html` · `style.css` · 19 JS modules

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
15. [Projectile System](#15-projectile-system)
16. [Scaling System (Power Growth)](#16-scaling-system-power-growth)
17. [Match Phases](#17-match-phases)
18. [Visual & Audio Feedback](#18-visual--audio-feedback)
19. [UI & Screens](#19-ui--screens)
20. [Technical Reference](#20-technical-reference)

---

## 1. Overview

**AutoRPNG Battle** is a local browser game where 2–6 physics-driven fighters called **Radosers** battle inside a closed arena. Each Radoser is a unique character generated through a full RPG chargen system — with race, subrace, six combat stats, a weapon, and up to 8 skills — then launched into a physics simulation. No direct player control during battle.

| Property | Value |
|----------|-------|
| Platform | Web Browser (static HTML — open `index.html` directly) |
| Players | 0 (spectator) |
| Match Type | Free-for-all (last Radoser standing) |
| Fighters per match | 2–6 |
| Canvas Size | 800 × 800 px |

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
  → Roster: view / create Radosers
  → Quick Match: pick fighters + arena → ⚔️ FIGHT!

[CHARGEN] (optional — create a new Radoser)
  → Name → Race → Subrace → Roll 6 stats → Weapon → Skill Count → Skills → Confirm
  → Saved to local roster (localStorage)

[BATTLE]
  → 3-second countdown
  → Radosers launch from spread angles toward center
  → Physics simulation: wall bounces, collisions, weapon attacks, skill triggers
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
| Intelligence | IQ | Crit chance · scales Exploit and Mind Break skills |
| Battle IQ | BIQ | Evade chance · scales Read & React skill |
| Martial Arts | MA | Weapon spin speed · scales Deflection and Flow State skills |

Each race has its own stat weight table — higher weights make certain stat values more likely when rolling. Subrace bonuses are applied **inline** during chargen (shown immediately after each stat spin).

---

## 6. Races & Subraces

13 playable races, each with a unique visual decoration, stat distribution, and optional subrace table.

### Race List

| Race | Emoji | Weight | Key Trait |
|------|-------|--------|-----------|
| Goblin | 👺 | 6.5 | Horde size multiplier (×1 to ×100,000) modifies stats |
| Gnome | 🧙 | 6.5 | — |
| Human | 👤 | 6.5 | Skin color subrace (Trắng/Vàng/Đen) |
| Dwarf | ⛏️ | 6.5 | — |
| Skeleton | 💀 | 5.25 | 2 wins → Lich (IQ fixed 8); 4 wins → Lich King (+1 all stats); Immune to AIDS |
| Troll | 🧌 | 5.25 | Sub-types: Regular / Ice / Mountain / Lich |
| Orc | 🗡️ | 5.25 | Win → +2 lowest stat; Lose → −3 highest stat |
| Giant | 🏔️ | 4.0 | After stat roll: IQ>STR → +5IQ/−5STR; STR>IQ → +5STR/−5IQ; equal → +3 both |
| Dragon | 🐉 | 4.0 | 5 elemental/type subraces |
| Angel | 👼 | 3.5 | Starts with "Pacifist" Archetype; higher ranks grant bonus stats/skills |
| Primordial Being | 🌌 | 3.5 | Each Combat win → spin Elemental Wheel again |
| Demon | 😈 | 2.5 | 7 Sin variants, each with a unique curse/blessing |
| God | ✨ | 2.5 | 9 Norse gods, equal weight |

> Weight controls how often a race appears during random chargen. Higher = more common.

### Subraces (detail)

**Goblin Horde** (×1/×50/×100/×1,000/×5,000/×10,000/×100,000)
- ×1 → −1 all stats; [Tournament] +1 all stats per PvP win
- ×50 → −1 all stats
- ×100 → no effect
- ×1,000 → +1 STR
- ×5,000 → +1 STR, +1 SPD
- ×10,000 → +2 STR, +2 SPD
- ×100,000 → +1 all stats, guaranteed weapon

**Human Skin** — Trắng (guaranteed weapon) · Vàng (IQ min 5) · Đen (DUR min 5)

**Troll Type** — Regular (no effect) · Ice (combat: −2 SPD to all opponents) · Mountain (+3 DUR) · Lich (75% chance to steal 1 skill from opponent)

**Dragon Type** (5 types) — Tideborn (+3 STR) · Flame (+1 skill, +2 lowest stat) · Crimson (+2 IQ, +1 DUR) · Stone (+2 DUR) · Amethyst (−1 all stats, +4 skills)

**Angel Ranks** (8 tiers) — Angels (no bonus) → Archangels (+2 SPD, +1 MA) → Principalities (post-combat +2 lowest) → Powers (Paladin archetype, +2 MA) → Virtues (cannot be debuffed) → Dominions (+2 skills) → Ophanim (+1 all stats) → Cherubim (+2 all stats)

**Primordial Elements** — Air (+1 lowest stat) · Water (+1 highest stat) · Fire (+1 skill) · Earth (+1 DUR, +1 STR). All equal weight. Re-spun after each Combat win.

**Demon Sins** (7) — Lucifer (Egoist archetype, skill cap 4) · Beelzebub (Slow Metabolism, 1 stat maxes 10) · Leviathan (Leviathan's Mark gear) · Behemoth (lose: 1 stat→0; win: 1 stat+2) · Mammon (−2 all, double PvP rewards) · Belphegor (+1 starting point, 66% no point first 2 rounds) · Asmodeus (AIDS skill)

**God Gifts** — 9 Norse gods, equal weight (11.1% each): Odin · Týr · Frigg · Baldur · Loki · Freyja · Eir · Bragi · Thor

**Skeleton Bone Lineage** — reveals the skeleton's past race (weights match original race weights). Affects stat roll distributions.

### Visual Decorations (cosmetic, no hitbox change)

| Race | Visual |
|------|--------|
| Skeleton | Hollow eye sockets, bone crack, nose hole, teeth |
| Orc | Tusks, war-paint marks |
| Dragon | Scales, tail |
| Angel | Golden glowing halo |
| Primordial | Animated orbiting energy dots |
| God | Animated pulsing golden rays |
| Demon | Curved horns, sinister markings |
| Goblin / Gnome / Human / Dwarf / Troll / Giant | No decoration |

All Radosers (except Skeleton) have anime-style gradient oval eyes with a color derived from their body color.

---

## 7. Character Creation (Chargen)

14 sequential steps. Subrace bonuses are applied inline — the adjusted value is shown immediately after each spin.

| Step | Screen | Description |
|------|--------|-------------|
| 1 | name | Enter character name (or pick from 200+ hero name pool) |
| 2 | race | Spin race (13 races, weighted) |
| 3 | subrace | Spin subrace (skipped if race has none) |
| 4–9 | str / spd / dur / iq / biq / ma | Spin each stat via race-weighted table. Subrace stat modifiers applied inline. |
| 10 | hasweapon | Armed or Unarmed (some subraces auto-skip to Armed) |
| 11 | weapon | Pick one of 7 weapons (skipped if unarmed) |
| 12 | skillcount | Spin skill count 0–4 (race-weighted). Subrace bonuses add on top. |
| 13 | skillpick | Spin and pick each skill individually |
| 14 | done | Summary screen → Confirm to add to roster |

**UX note:** The Spin button morphs into the Next button after the wheel stops — no mouse movement required between steps.

**Quick Create mode:** auto-advances through all steps for fast generation.

**Giant trait** is evaluated after MA (last stat) is spun, comparing final STR vs IQ to determine which gets the bonus.

---

## 8. Skills

Skills are acquired during chargen via spin wheels. Count is determined first (0–4 base, modified by subraces), then each skill is picked individually.

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
| ✨ Extended Immunity | Hit immunity window 18 → 30 frames |
| ⚓ Heavy Mass | +30% mass (less knockback) |
| 🪞 Deflection | MA×2% chance to negate a hit |

#### Pre-Combat
| Skill | Effect |
|-------|--------|
| 📢 War Cry | First hit deals 2× damage |
| 🏰 Fortify | Start with 1-hit absorption shield |
| ⚡ Adrenaline | First 5s: +50% movement speed |
| 🦅 Predator | +15% damage vs target with less HP |
| 🩸 First Blood | First hit stuns opponent 30 frames |
| 🧿 Mind Break | If IQ > target: −(IQ gap × 3%) to their final damage |

#### In-Combat
| Skill | Effect |
|-------|--------|
| 😤 Berserker | +50% damage while HP < 30% |
| 🔥 Phoenix | Survive one lethal hit with 1 HP (once/round) |
| ↩️ Counter | After parried: next hit deals 2× damage |
| 🧛 Vampiric | On hit: heal 5% of damage dealt |
| 🗡️ Parry Master | On parry: no knockback + weapon spin ×2 for 1.5s |
| 🌀 Momentum | On kill (FFA): +10% speed stack (max 5×) |
| 👻 Shadow Step | On evade: teleport to random safe spot |
| 💉 Blood Frenzy | On kill: heal 25 HP |
| 🌊 Flow State | On hit: +MA×1% speed/stack (resets on taking a hit) |
| ⚡ Read & React | On being hit: BIQ×3% chance to instantly counter |
| 💡 Exploit | On hit: (IQ+BIQ)×1% chance double damage |

#### Post-Combat
| Skill | Effect |
|-------|--------|
| 📚 Learning | After losing: +5% damage next round |
| 🧬 Adaptation | After losing: +20% resist to killer's weapon type |

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

> Subrace bonuses (Amethyst +4, Flame +1, Primordial Fire +1, Angel Dominions +2) stack on top.

---

## 9. Roster System

- All created Radosers are saved to **`localStorage['cgRoster']`** as a JSON array
- Persists between sessions — refresh does not delete roster
- Each Radoser record contains:

```json
{
  "charName": "...",
  "color": "#rrggbb",
  "race": { "id": "...", "name": "...", "emoji": "..." },
  "subrace": { "label": "...", "desc": "..." },
  "charStats": { "strength": 5, "speed": 4, "durability": 6, "iq": 3, "battleiq": 5, "ma": 4 },
  "weapon": "sword",
  "skills": [{ "id": "berserker", "name": "Berserker", "icon": "😤", "type": "in_combat", "desc": "..." }],
  "skillCount": 2,
  "charRace": "...",
  "charSubrace": { "label": "..." }
}
```

- In **Quick Match**, press `+` to open the Fighter Picker modal and select from roster
- Bot fighters (random stats) can also be added

---

## 10. Arena (Playing Field)

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

| Weapon | Base Dmg | Base KB | Length | Hit Radius | Cooldown | Scaling |
|--------|----------|---------|--------|-----------|---------|---------|
| 🥊 Fists | 2 | 2 | 22 px | 11 px | 16 fr | Attack speed |
| ⚔️ Sword | 1 | 4 | 50 px | 8 px | 28 fr | Damage |
| 🗡️ Dagger | 1 | 2 | 28 px | 8 px | 18 fr | Spin speed |
| 🔱 Spear | 1 | 5 | 65 px | 8 px | 38 fr | Length + damage |
| 🌙 Scythe | 1 | 5 | 48 px | 18 px | 34 fr | Dual blade |
| 🔨 Hammer | 1 | 12 | 38 px | 14 px | 48 fr | Knockback |

All cooldowns are reduced by SPD stat: `max(2, baseCooldown − SPD)`.

### 12.2 Ranged Weapons

| Weapon | Melee Dmg | Fire Interval | Projectile Speed | Projectile Radius | Scaling |
|--------|-----------|--------------|-----------------|------------------|---------|
| 🏹 Bow | 0 | 130 fr | 7.5 units/fr | 5 px | Arrow count + speed |
| ⭐ Shuriken | 0 | 120 fr | 3 units/fr | 8 px | Star count |

Fire interval scales with SPD: Bow `max(5, 140 − SPD×2)`, Shuriken `max(5, 250 − SPD×2)`.

### 12.3 Weapon Descriptions

**🥊 Fists** — Fastest attack rate. Short range. Scales attack speed — snowballs with hit count. Can partially parry incoming projectiles (50% damage reflect).

**⚔️ Sword** — Balanced melee, scales raw damage permanently. Reliable and simple.

**🗡️ Dagger** — Short blade, fast spin. Scales rotation speed — harder to dodge at high stacks.

**🔱 Spear** — Longest reach. Slow attack, high knockback. Scales length AND damage — near untouchable late-game. When parried: spin reverses + −10% spin for 60 frames.

**🌙 Scythe** — Wide arc (18 px hit radius). Unlocks dual-blade mode at 5 hits — attacks both directions simultaneously.

**🔨 Hammer** — Slowest weapon, massive knockback (12 base). Scales knockback — can launch opponents across the entire arena. On hit: enemy weapon −30% spin for 1.5 s.

**🏹 Bow** — Fires arrow volleys every ~130 frames. Scales arrow count (unlimited). Multiple arrows fire in burst with 4-frame delay between shots.

**⭐ Shuriken** — Fires shuriken bursts every ~120 frames. Wall bounces: up to 2 times. Scales star count (every 2 hits). Can be deflected by weapon contact.

---

## 13. Combat Mechanics

### 13.1 Damage Formula

```
finalDamage = (baseDamage + bonusDamage) × STR_multiplier × critMultiplier × evadeCheck
            × (1 − mindBreakDebuff)
```

- **critMultiplier** = 1.5 if `random < critChance (IQ × 0.05)`, else 1.0
- **evadeCheck** = 0 if `random < evadeChance (BIQ × 0.03)` → full dodge, else 1
- **mindBreakDebuff** = accumulated from Mind Break skill (max 60%)

### 13.2 Knockback

```
knockbackForce = (baseKnockback + bonusKnockback) × 1.4
```

Applied from attacker → defender direction.

### 13.3 Parry System

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
| Chance | `IQ × 0.05` (5–50%) |
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

At round start, all opponents permanently lose −2 SPD for that round. Displayed as `🧊 -2 SPD` floating text.

---

## 15. Projectile System

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

## 16. Scaling System (Power Growth)

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

## 17. Match Phases

| Phase | Time | Effect |
|-------|------|--------|
| Normal | 0 – 60 s | Standard play |
| Speed Floor | 60 – 80 s | Every 10 s: minimum speed increases (fighters can't slow down) |
| Rage Mode | 80 s+ | Damage ×1.5, knockback ×1.5, attack cooldowns −30% |

---

## 18. Visual & Audio Feedback

### 18.1 Particle Effects

| Event | Count | Color | Lifetime |
|-------|-------|-------|----------|
| Wall bounce | 6 | Gold/orange | 20–35 fr |
| Parry | 14 | Gold | 25–40 fr |
| Normal hit | 6 blood | Red tones | 18–28 fr |
| Critical hit | 12 blood | Red tones | 18–28 fr |
| Projectile deflect | 5 | Cyan/white | 20 fr |
| Death explosion | 30 | Mixed | 35–60 fr |

### 18.2 Floating Text

- Normal hit: `-[damage]` white
- Critical hit: `⚡CRIT!` gold + `-[damage]` gold
- Evade: `EVADE` cyan
- Skill trigger: skill icon + name
- Ice Troll: `🧊 -2 SPD` blue
- Mind Break: `🧿 MIND BREAK -X%` purple

### 18.3 Sound Effects

| Event | Description |
|-------|-------------|
| Hit | Sawtooth 200 Hz, 0.15 s |
| Parry | Square 880 Hz + 660 Hz, 0.1–0.12 s |
| Shoot | Sine 440 Hz, 0.08 s |
| Death | Sawtooth 100 Hz + Square 60 Hz |
| Scale up | Sine 1100 Hz, 0.15 s |
| Skill activate | Tone 660 Hz, sine, 0.15 s |

---

## 19. UI & Screens

### Main Tabs

| Tab / Screen | Content |
|---|---|
| **Radosers** | Full roster list; create / delete Radosers |
| **Battle** | Quick Match setup (select fighters + arena → fight) |
| **Showcase** | Rotating preview of roster Radosers (random start, 7s interval) |

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
- Logs: hits, crits, evades, parries, projectile hits, skill triggers, deaths
- Format: `MM:SS AttackerName → DefenderName [event] [HP left: X]`

---

## 20. Technical Reference

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
├── index.html         — DOM structure, tabs, modals, HUD
├── style.css          — All styling
├── audio.js           — Web Audio API tone helpers
├── constants.js       — BALL_R, WALL_BOUNCE, etc.
├── weapons.js         — WEAPON_DEFS array, weapon hit logic
├── projectile.js      — Arrow & shuriken classes
├── particles.js       — Particle system
├── arena.js           — Arena configs & rendering
├── skills.js          — SKILL_DEFS, skill hooks (pre/in/post combat)
├── ball.js            — Ball class: stats, physics, rendering, race decoration
├── collision.js       — Ball-to-ball & wall collision
├── state.js           — Global match state object
├── game-loop.js       — step() main loop, phase management
├── setup.js           — initGame(), match setup
├── result.js          — Result screen rendering
├── tournament.js      — Tournament bracket logic
├── ui.js              — HUD, battle log, in-match UI
├── chargen-data.js    — CG_RACES, CG_SUBRACES, CG_STAT_WEIGHTS, CG_WEAPONS, SKILL_DEFS data
├── spin-wheel.js      — SpinWheel class (canvas wheel animation)
├── chargen.js         — Chargen flow: renderCgStep, cgRenderSpin, applySubraceEffects
├── roster.js          — Roster display, localStorage, hero showcase
└── asset-editor.js    — Race shape asset overrides
```

### Key Code Sections

| Section | File | Description |
|---------|------|-------------|
| `WEAPON_DEFS` | `weapons.js` | Array of 8 weapon config objects |
| `ARENAS` | `arena.js` | Object map of 5 arena configs |
| `CG_RACES` | `chargen-data.js` | 13-race chargen config |
| `CG_SUBRACES` | `chargen-data.js` | Subrace tables per race |
| `CG_STAT_WEIGHTS` | `chargen-data.js` | Per-race probability weights for each stat |
| `SKILL_DEFS` | `skills.js` | All 25 skill definitions |
| `skillOnPreCombat()` | `skills.js` | Pre-combat skill triggers (incl. Ice Troll, Mind Break) |
| `skillOnHit()` | `skills.js` | On-hit skill triggers |
| `class Ball` | `ball.js` | Radoser unit: stats, physics, weapon, rendering |
| `drawRaceDecoration()` | `ball.js` | Race-specific visual (cosmetic only) |
| `clampToBall()` | `collision.js` | Wall collision & bounce per arena |
| `collide()` | `collision.js` | Ball-to-ball elastic collision |
| `_checkWeaponHit()` | `weapons.js` | Melee weapon hit detection & damage |
| `step()` | `game-loop.js` | Main game loop: physics, combat, particles |
| `cgRenderSpin()` | `chargen.js` | Spin wheel UI (Spin→Next button morph) |
| `applySubraceEffects()` | `chargen.js` | Inline subrace stat application during chargen |
| `renderRoster()` | `roster.js` | Roster tab UI builder |
| `buildHUD()` | `ui.js` | In-battle HP bar generator |

---

*AutoRPNG Battle — GDD v3.0*
