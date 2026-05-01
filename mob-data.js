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
  // ── Mike tyson ────────────────────────────────────────────────
  mike: {
    displayName:  'Tyson, Iron Mike',
    race:         'human',
    color:        '#3f3727',         // dark skin
    radius:       24,
    weaponId:     'fists',
    skills:       [ ],                //
    charStats:    { strength:10, speed:8, durability:4, iq:5, battleiq:5, ma:8 }, // total 40
  },
// ── Vi ────────────────────────────────────────────────
  vi: {
    displayName:  'Vi, The Forgotten Champion',
    race:         'giant',
    color:        '#6b2253',         // pink
    radius:       24,
    weaponId:     'katana',
    skills:       ['mind_break','war_cry','phoenix','exploit','heavy_mass','parry_tech_3'],           //Stat trước trận chung kết
    charStats:    { strength:10, speed:9, durability:9, iq:12, battleiq:11, ma:3 }, // total 54
  },
  // ── Hanzo ────────────────────────────────────────────────
  hanzo: {
    displayName:  'Hanzo, The Invisible Shadow',
    race:         'human',
    color:        '#f0c060',         // golden — yellow skin
    radius:       24,
    weaponId:     'chakram',
    skills:       ['shadow_step','extended_immunity','thick_hide'],               
    charStats:    { strength:3, speed:6, durability:5, iq:10, battleiq:10, ma:7 }, // total 41
  },
  // ── Thor ────────────────────────────────────────────────
  thor: {
    displayName:  'Thor, The God of Thunder',
    race:         'god',
    color:        '#f0c060e1',         // golden — yellow skin
    radius:       32,
    weaponId:     'mjolnir',
    skills:       ['shadow_step','berserker','ground_pound'],                
    charStats:    { strength:8, speed:8, durability:10, iq:6, battleiq:6, ma:3 }, // total 39
  },
  // ── Ishin ────────────────────────────────────────────────
  ishin: {
    displayName:  'Ishin, Holy Sword',
    race:         'human',
    color:        '#f0c060',         // golden — yellow skin
    radius:       24,
    weaponId:     'katana',
    skills:       ['parry_tech_1','parry_tech_2','parry_tech_3'],                // PT1/PT2/PT3 managed by _checkPT()
    charStats:    { strength:7, speed:7, durability:8, iq:10, battleiq:5, ma:6 }, // total 43
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
  thor: {
    id:         'thor',
    icon:       '⚡',
    name:       'Thor, The God of Thunder',
    desc:       'A legendary god known for his immense strength and control over thunder.',
    difficulty: 4,
    waves: [
      {
        label: '⚔️ The Duel',
        mobs: [{ template: 'thor', count: 1 }],
      },
    ],
  },

  vi: {
    id:         'vi',
    icon:       '⚔️',
    name:       'Vi, The Forgotten Champion',
    desc:       'A legendary warrior known for her unmatched combat skills and resilience.',
    difficulty: 4,
    waves: [
      {
        label: '⚔️ The Duel',
        mobs: [{ template: 'vi', count: 1 }],
      },
    ],
  },

 mike: {
    id:         'mike',
    icon:       '🥊',
    name:       'Tyson, Iron Mike',
    desc:       'A legendary boxer known for his incredible punching power and resilience.',
    difficulty: 4,
    waves: [
      {
        label: '🥊 The Duel',
        mobs: [{ template: 'mike', count: 1 }],
      },
    ],
  },
  
 hanzo: {
    id:         'hanzo',
    icon:       '🥊',
    name:       'Hanzo, The Invisible Shadow',
    desc:       'A legendary ninja known for his unmatched precision and stealth.',
    difficulty: 4,
    waves: [
      {
        label: '🥊 The Duel',
        mobs: [{ template: 'hanzo', count: 1 }],
      },
    ],
  },
};


