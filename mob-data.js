// ============================================================
// MOB DATA — Templates & Encounter Definitions
// ============================================================
// Add new mob types here; no other file needs to change.

// ── Mob Templates ────────────────────────────────────────────
// charStats total = 18 for goblins; Ishin = 35
const MOB_TEMPLATES = {

  // ── Goblins ──────────────────────────────────────────────
  goblin_dagger: {
    displayName: 'Goblin',
    race:        'goblin',
    color:       '#5a9a22',
    radius:      16,
    weaponId:    'dagger',
    skills:      [],
    charStats:   { strength:2, speed:7, durability:2, iq:3, battleiq:2, ma:2 }, // total 18
  },

  goblin_melee: {
    displayName: 'Goblin',
    race:        'goblin',
    color:       '#4a8018',
    radius:      16,
    weaponId:    null,               // chosen from weaponPool at spawn
    weaponPool:  ['sword','hammer','spear'],
    skills:      [],
    charStats:   { strength:4, speed:5, durability:4, iq:2, battleiq:2, ma:1 }, // total 18
  },

  goblin_brute: {
    displayName: 'Goblin Brute',
    race:        'goblin',
    color:       '#8a3a10',          // reddish — visually signals danger
    radius:      18,
    weaponId:    'hammer',
    skills:      ['berserker'],
    charStats:   { strength:8, speed:3, durability:4, iq:1, battleiq:1, ma:1 }, // total 18
  },

  // ── Ishin ────────────────────────────────────────────────
  ishin: {
    displayName:  'Ishin, Holy Sword',
    race:         'human',
    color:        '#f0c060',         // golden — yellow skin
    radius:       24,
    weaponId:     'katana',
    skills:       [],                // PT1/PT2/PT3 managed by _checkPT()
    charStats:    { strength:7, speed:5, durability:3, iq:10, battleiq:5, ma:5 }, // total 35
    // Phase thresholds (HP %)
    ptThresholds: [0.75, 0.50, 0.25],
  },
};

// ── Encounter Definitions ─────────────────────────────────
const ENCOUNTER_DEFS = {

  goblin_horde: {
    id:         'goblin_horde',
    icon:       '👺',
    name:       'Goblin Horde',
    desc:       'Face 10 goblins across 2 waves. Wave 1: 6 scouts. Wave 2: 4 reinforcements including Brutes.',
    difficulty: 2,                   // 1–5 stars
    waves: [
      {
        label: '👺 Wave 1 — Scouting Party',
        mobs: [
          { template: 'goblin_dagger', count: 2 },
          { template: 'goblin_melee',  count: 4 },
        ],
      },
      {
        label: '👺 Wave 2 — Reinforcements',
        mobs: [
          { template: 'goblin_melee',  count: 2 },
          { template: 'goblin_brute',  count: 2 },
        ],
      },
    ],
  },

  ishin: {
    id:         'ishin',
    icon:       '⚔️',
    name:       'Ishin, Holy Sword',
    desc:       'A legendary swordsman who grows stronger as HP drops. Three Phase Transitions at 75 / 50 / 25% HP.',
    difficulty: 4,
    waves: [
      {
        label: '⚔️ The Duel',
        mobs: [{ template: 'ishin', count: 1 }],
      },
    ],
  },

};
