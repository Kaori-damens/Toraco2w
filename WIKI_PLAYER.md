# 📖 TORACO — Player Wiki
> *AutoRPNG Battle — Radoser Arena*
> Version 4.3 · Last updated 2026-04-19

---

## Table of Contents
1. [What is TORACO?](#1-what-is-toraco)
2. [Stats Explained](#2-stats-explained)
3. [How Combat Works](#3-how-combat-works)
4. [Races](#4-races)
5. [Weapons](#5-weapons)
6. [Race Skills](#6-race-skills)
7. [Post-Combat Skills](#7-post-combat-skills)
8. [Creating a Radoser](#8-creating-a-radoser)
9. [Roster & Search](#9-roster--search)
10. [Tournament Mode](#10-tournament-mode)
11. [Tips & Tricks](#11-tips--tricks)

---

## 1. What is TORACO?

**TORACO** is an auto-battler arena where you create fighters called **Radosers** — each one rolled from a random race, random weapon, and randomized stats. Throw 2–12 of them into a 1000×1000 arena and watch them fight to the last one standing.

You don't control the fighters directly. Strategy comes from *building* your roster wisely before the battle starts.

---

## 2. Stats Explained

Every Radoser has **6 core stats**, each ranging from **1–10**.

| Stat | Abbreviation | What it does |
|------|-------------|--------------|
| **Strength** | STR | Melee damage, arrow size (Bow), projectile push |
| **Speed** | SPD | Movement speed, dodge ability, starting arrows (Bow), cooldown reduction |
| **Durability** | DUR | Max HP, damage reduction on hits |
| **IQ** | IQ | Projectile aim cone (Bow), sweep speed (Dragon), behavior precision |
| **Battle IQ** | BIQ | Parry reaction, retreat timing, tactical spacing |
| **Martial Arts** | MA | Attack speed, sweep arc (Dragon), skill potency |

### Derived Values

| Value | Formula |
|-------|---------|
| **Max HP** | `80 + DUR × 12` |
| **Move Speed** | `1.4 + SPD × 0.18` |
| **Attack Interval** | `~55 − MA × 2` frames |
| **Total Power** | STR + SPD + DUR + IQ + BIQ + MA (max 60) |

### Title System

Your Radoser earns a title based on stat distribution:

| Title | Condition |
|-------|-----------|
| 🐐 GOAT | Total = 60 (perfect) |
| 🌟 Legend | Total ≥ 55 |
| ⚡ Demigod | 4+ stats at 10 |
| 🔥 Prodigy | 3+ stats at 10 |
| 💨 Speedster | SPD = 10 |
| 💪 Destroyer | STR = 10 |
| 🛡️ Iron Wall | DUR = 10 |
| 🧠 Mastermind | IQ = 10 |
| 👻 Phantom | BIQ = 10 |
| 🌪️ Whirlwind | MA = 10 |
| 🏋️ Tank | STR ≥ 8 and DUR ≥ 8 |
| 💥 Glass Cannon | SPD ≥ 8 and DUR ≤ 3 |
| 🐂 Berserker | STR ≥ 8 and SPD ≤ 3 |
| 🐦 Trickster | SPD ≥ 8 and STR ≤ 3 |
| 🎯 Tactician | IQ ≥ 8 and BIQ ≥ 8 |
| ⚖️ All-Rounder | All stats ≥ 7 |
| 🟢 Balanced | All stats ≥ 5 |
| ⚔️ Veteran | Total ≥ 45 |
| 🌱 Rookie | Total < 15 |

---

## 3. How Combat Works

### Movement
- Radosers move toward the nearest enemy automatically.
- At close range they begin attacking.
- Low-DUR fighters retreat more aggressively when outmatched.

### Attacking
- **Melee fighters** swing their weapon when in range.
- **Ranged fighters (Bow)** stop at mid-range and fire arrows.
- **Attack interval** is reduced by MA: roughly `55 − MA×2` frames (≈ 1 attack per second at MA 5).

### Damage
- Base melee damage = `STR × 1.5 + weapon bonus`
- Arrow damage = `STR × 1.2 + arrow size bonus`
- Each hit triggers a brief **immunity window** so you can't instantly die to multi-hit spam.

### Immunity Frames
| Hit Type | Immunity Duration |
|----------|------------------|
| Melee | 4 frames |
| Projectile | 8 frames |

Extended immunity applies after taking heavy hits (high DUR fighters absorb more).

### Parry
Weapons can **block** incoming attacks when two weapons physically overlap at the right point. Each weapon has different parry coverage:

| Weapon | Parry Points | Notes |
|--------|-------------|-------|
| Sword | 3 points (35%, 65%, tip) | Best overall parry coverage |
| Dagger | 3 points (tip + 2 side) | Wide tip coverage, perpendicular blocking |
| Spear | 2 points (mid, tip) | Long reach advantage |
| Axe | 2 points | Heavy, harder to parry with |
| Bow | 1 point | Almost no parry ability |
| Fists | Body only | No weapon parry |

**BIQ** affects how often a Radoser attempts to parry.

### Death
- When HP reaches 0, the Radoser is eliminated.
- Last Radoser standing wins the round.
- Match results are tracked in the Stats Log.

---

## 4. Races

There are **13 playable races**, each with different stat weights during character creation and a unique **Race Skill** (some races have one, some don't yet).

### Common Races (Weight 6.5)
These races appear most frequently on the wheel.

| Race | Emoji | Flavor |
|------|-------|--------|
| **Goblin** | 👺 | Low-cost tricksters. Fast and sneaky, fragile. |
| **Gnome** | 🔧 | Tinkerers. High IQ, decent BIQ, low STR. |
| **Human** | 🧑 | Balanced generalists. No extreme highs or lows. |
| **Dwarf** | ⛏️ | Tough and strong. Low SPD, high DUR and STR. |

### Uncommon Races (Weight 5.25)

| Race | Emoji | Flavor |
|------|-------|--------|
| **Troll** | 🧌 | Brutes. Massive STR and DUR, very low IQ. |
| **Orc** | ⚔️ | Warriors. High STR and BIQ, a natural fighter's instinct. |

### Rare Races (Weight 4.0)

| Race | Emoji | Flavor |
|------|-------|--------|
| **Giant** | 🗿 | Colossal. Max DUR potential, huge STR, slow as a boulder. |
| **Dragon** | 🐉 | Fearsome. High across the board. Has the **Flame Breath** race skill. |

### Epic Races (Weight 3.5)

| Race | Emoji | Flavor |
|------|-------|--------|
| **Angel** | 😇 | Divine justice. High MA and IQ. Has the **Holy Smite** race skill. |
| **Primordial Being** | 🌌 | Ancient force. Extreme stat variance — could be a god or a nobody. Has the **Void Pulse** race skill. |

### Legendary Races (Weight 2.5)

| Race | Emoji | Flavor |
|------|-------|--------|
| **Demon** | 😈 | Pure aggression. High STR and MA, reckless. Has the **Blood Surge** race skill. |
| **God** | ✨ | Near-perfect potential. Highest stat weight of any race. |

### Special Race (Weight 5.0)

| Race | Emoji | Flavor |
|------|-------|--------|
| **Skeleton** | 💀 | Undead. IQ is always **1** (bones don't think). Stats follow the race whose bones they are made of. During creation you spin a second wheel — **"Whose bones?"** — to determine their lineage. |

> **Skeleton Bone Lineage**: When you roll Skeleton, a second wheel spins to pick which race's skeleton this is (all 12 non-Skeleton races, same weights). A Skeleton with Dragon Bones gets Dragon-level stat weights — but still has IQ = 1.

---

## 5. Weapons

Weapons are randomly assigned during character creation. Each weapon has a distinct fighting style and a **scaling mechanic** that grows stronger as it lands hits.

### Melee Weapons

| Weapon | Range | Scaling | Stat Bonus | Notes |
|--------|-------|---------|------------|-------|
| ⚔️ **Sword** | Medium | +1 dmg/hit | STR | Balanced. Strong parry coverage (3 hit points). |
| 🗡️ **Dagger** | Short | +spin speed/hit | STR + MA | Fast. MA adds to base damage (×STR). High MA = deadlier dagger. |
| 🔱 **Spear** | Long | +length +dmg/hit | STR | Longest reach. Grows longer every hit. |
| 🌙 **Scythe** | Medium | Dual blade at 5 hits | STR | After 5 hits, gains a second blade for double coverage. |
| 🔨 **Hammer** | Medium | +knockback/hit | STR | Massive knockback. Sends enemies flying further each hit. |
| 🥊 **Fists** | Short | −0.5f cooldown/hit | STR + MA + SPD | Fastest attack speed. MA adds +0.5 flat damage per point (independent of STR). SPD reduces cooldown. |

### Ranged Weapons

| Weapon | Projectile | Scaling | Notes |
|--------|-----------|---------|-------|
| 🏹 **Bow** | Arrows | +1 arrow/hit | Multi-stream at MA≥5 (2 streams) and MA≥10 (3 streams). Soft aim assist scales with MA. |
| ⭐ **Shuriken** | Stars | +1 star/hit | Bounces off walls up to 2× before disappearing. |

### Rare / Unique Weapons *(Championship only)*

| Weapon | Base | Special |
|--------|------|---------|
| 🌟 Excalibur | Sword | At ≤30% HP → 20s Transform: fires a piercing Sword Beam every 2s |
| ✨ Gungnir | Spear | Auto-throws a tracking rune spear every 2s |
| 🪄 Jingubang | Spear | Every 6 hits → 4s WHIRL MODE (360° spin, AoE) |
| ⚡ Mjolnir | Hammer | On hit / wall bounce: 35% chance to fire a bouncing lightning bolt |
| 🔥 Iron Fist | Fists | 5-Ember stacks → Combustion AoE burst (100px radius) |
| 🌑 Shadowfang | Dagger | Poisons on hit. Backstab = guaranteed crit |
| 💀 Harvester | Scythe | 5 Soul Shards → Soul Burst AoE (80px) ×3 damage |
| ⚡ Caliburn | Rapier | 3 parry stacks → 5s speed boost + guaranteed crit |
| 🐍 Medusa Bow | Bow | Each arrow: −1 target maxSpd. At 5 stacks: 2s weapon freeze |
| 🌀 Fuma Shuriken | Shuriken | Each wall bounce: grows larger + ×1.6 damage |
| 🩸 Muramasa | Katana | Frenzy stacks (−3 CD each). IAI Strike: ×4 damage, costs 8% HP |
| 🤺 Rapier | — | Riposte: after parry → next hit deals (1.5 + IQ×0.15)× damage |
| ⚔️ Katana | — | Momentum: 5 hits → IAI Strike (×3 damage); stacks reset on IAI |

### Bow Details
- **Multi-stream:** MA≥5 → 2 arrow streams (+10° spread); MA≥10 → 3 streams (+20° spread)
- **Auto-aim:** Weapon angle tracks nearest enemy at `MA × 0.003 rad/frame`
- **Aim cone:** Only fires when enemy is within `(20 + IQ × 4)°` of weapon angle
- Arrows are physical projectiles — can be blocked / deflected by other weapons

---

## 6. Race Skills

Some races have a **Race Skill** — a powerful ability that activates automatically in combat. Skills have a cooldown and may scale with stats.

---

### 🐉 Dragon — Flame Breath

The Dragon unleashes a cone of fire that deals continuous damage to anything caught in it.

**How it works:**
1. After cooldown expires, the Dragon opens its mouth and breathes fire for several seconds.
2. The fire cone sweeps back and forth in a ±35–50° arc around the Dragon's facing direction — it doesn't lock onto the enemy, it just naturally oscillates like a real creature breathing.
3. Any enemy caught in the cone takes fire damage every frame.
4. After the breath ends, cooldown resets.

**Stat scaling:**
| Stat | Effect |
|------|--------|
| STR | Damage per frame |
| MA | Cone width + duration |
| IQ | Sweep oscillation speed (IQ 1 = slow sweep, IQ 10 = rapid sweep) |
| SPD | Cooldown reduction |

**Visual:** Orange/yellow flame cone with wavy edges and a bright hot core. No hard straight edges — the fire looks organic and flickering.

---

### 😇 Angel — Holy Smite

The Angel calls down a divine lightning bolt on a targeted enemy.

**How it works:**
1. The Angel targets the nearest enemy and begins a **windup** (~1 second).
2. During windup, a **pulsing dashed ring + crosshair** appears on the target's position — this is the strike zone.
3. After windup, the lightning bolt strikes **where the target was when the cast started**.
4. If the target has **moved too far** from the cast position, the bolt **misses** (shows ✨ miss!).
5. On hit: deals Holy damage + applies a **stun** to the target.

**Counter-play:** If you have two fighters and your Angel is targeting an enemy, the enemy's AI may try to escape the strike zone. High-SPD enemies can dodge Smite more reliably.

**Stat scaling:**
| Stat | Effect |
|------|--------|
| IQ | Damage (base 8 + IQ × 2) |
| MA | Stun duration |
| SPD | Cooldown reduction |

---

### 🌌 Primordial Being — Void Pulse

Releases a pulse of void energy that damages and pushes all nearby enemies.

**Stat scaling:** STR = push force, MA = pulse radius, IQ = cooldown reduction.

---

### 😈 Demon — Blood Surge

Enters a frenzy, gaining temporary bonus attack speed and damage at the cost of taking extra damage from all sources.

**Stat scaling:** STR = damage bonus, SPD = duration, MA = attack speed boost.

---

### ⚔️ Orc — War Cry

Lets out a battle cry that boosts the Orc's own STR and MA temporarily.

**Stat scaling:** STR = damage boost magnitude, MA = duration.

---

## 7. Post-Combat Skills

After surviving enough battles, Radosers can earn **Post-Combat Skills** — passive upgrades that persist through future fights.

| Skill | How to earn | Effect |
|-------|------------|--------|
| ⚔️ **Survivor** | Win a match | +2 Max HP per stack |
| 🏅 **Veteran** | Win 3+ matches | All stats gain a small bonus |
| 🎯 **Mastery** | Land 10+ hits in one match | +damage with current weapon |
| 💎 **Perfectionist** | Win without taking damage | +10 Max HP and +1 to lowest stat |
| 🩸 **Blood Mark** | Kill 3+ enemies in one match | Attacks inflict a bleed DoT |
| 🎭 **Copycat** | Parry 5+ times in one match | Occasionally mimics the last attack style of a killed enemy |

> Skills are cumulative — a veteran Radoser can hold multiple skills simultaneously.

---

## 8. Creating a Radoser

### Standard Flow (Character Generator)
The CG (Character Generator) walks you through a sequence of **spinning wheels**:

1. **Race Wheel** — spin to determine your race
2. **Sub-race Wheel** *(only for certain races)* — e.g., Skeleton spins "Whose bones?"
3. **Weapon Wheel** — spin to get your weapon
4. **STR Wheel** → **SPD Wheel** → **DUR Wheel** → **IQ Wheel** *(skipped for Skeleton — always 1)* → **BIQ Wheel** → **MA Wheel**

Each stat wheel uses **weighted segments** based on your race — some races are more likely to roll high STR, others high SPD, etc.

### Quick Create ⚡
Click **Quick Create** on the Roster tab. Enter a name (or leave blank for a random name) and the game auto-runs the entire CG flow without the spinning animation — instant Radoser.

### Bulk Create
Need lots of Radosers fast for tournament testing? Use **Bulk Create** to generate 1–128 Radosers at once in seconds.

### Import / Export
- **Export** saves your current roster to a JSON file.
- **Import** loads a roster from a previously exported file.
- Useful for sharing rosters or backing up your favorites.

---

## 9. Roster & Search

The **Roster tab** shows all your created Radosers as cards with their race, weapon, stats, and title.

### Search Bar
Type in the search box to filter by name. The search is case-insensitive.

### Smart Search Syntax
You can use structured queries for precise filtering. Combine multiple conditions with commas:

```
race=dragon
str>5
weapon=bow
total>=40
race=orc, str>5
race=angel, iq>=8, ma>=8
```

**Supported fields:**

| Field | Aliases | Example |
|-------|---------|---------|
| `race` | — | `race=skeleton` |
| `weapon` | `wpn` | `weapon=bow` |
| `str` | `strength` | `str>=8` |
| `spd` | `speed` | `spd>6` |
| `dur` | `durability` | `dur<=3` |
| `iq` | — | `iq=1` |
| `biq` | `battleiq`, `battle_iq` | `biq>=7` |
| `ma` | `martiarts` | `ma>8` |
| `total` | — | `total>=50` |

**Supported operators:** `=`, `>`, `<`, `>=`, `<=`, `!=`

### Filter Panel
Click **Filter** to open chip selectors for Race and Weapon. Active filters are highlighted and the badge shows how many are active.

---

## 10. Tournament Mode

Set up a **bracket tournament** with your roster:

1. Select participants from your roster
2. Choose bracket size (8, 16, 32, 64, 128)
3. Matches are simulated automatically
4. Track wins, losses, and stats across rounds
5. Champion is crowned at the end

> Tip: Use **Bulk Create** to quickly populate a full 128-bracket for large-scale testing.

---

## 11. Tips & Tricks

**Building a strong Radoser:**
- **Tanky**: High DUR (8+) + decent STR. Works well with Dwarf or Giant race.
- **Glass Cannon**: High SPD + high STR, low DUR. Goblin or Troll work here.
- **Support via Race Skill**: Angel Smite is devastating with high IQ + MA. Angel + Sword is a classic combo.
- **Dragon power**: Flame Breath scales with STR (damage) and MA (width/duration). A Dragon with STR 9 + MA 8 is terrifying. IQ affects sweep speed — high IQ means rapid back-and-forth fire.

**Countering Race Skills:**
- **Dragon Flame Breath** → High SPD lets you dodge the sweep. Stay out of the arc.
- **Angel Smite** → Move immediately after the telegraph ring appears. The bolt hits the *cast position*, not your current position.

**Parry tips:**
- **Sword** is the best parry weapon — 3 points along the blade.
- **Dagger** has great perpendicular coverage — it can parry attacks coming from the side.
- High **BIQ** makes your fighter parry more often and react faster.

**Skeleton builds:**
- Skeleton always has IQ = 1 — don't expect smart behavior.
- But Skeleton + Dragon Bones can have near-Dragon stat rolls — a dumb but powerful brute.
- Skeleton + God Bones is the ultimate glass-cannon wildcard.

**Reading the title:**
- A **Glass Cannon** with SPD 9 + DUR 1 can outrun and outmaneuver nearly anything — but one solid hit ends it.
- **All-Rounder** (all stats ≥ 7) is deceptively strong in long battles — no obvious weakness to exploit.
- **One-Trick** (maxStat ≥ 8 but total ≤ 25) can surprise you: SPD 10 with everything else at 3 is faster than anything, but fragile.

---

*This wiki is auto-generated from game data. For technical/developer documentation, see `GDD_EN.md`.*
