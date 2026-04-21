// CHARGEN DATA
// ============================================================
const WHEEL_PALETTE = [
  '#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db',
  '#9b59b6','#e91e63','#00bcd4','#8bc34a','#ff5722','#607d8b',
  '#673ab7','#03a9f4','#cddc39','#ff9800','#795548','#9c27b0',
  '#f44336','#4caf50','#2196f3','#ff4081'
];
function wColor(i){ return WHEEL_PALETTE[i % WHEEL_PALETTE.length]; }

const STAT_COLORS = [
  '#e74c3c','#e67e22','#f39c12','#f1c40f','#2ecc71',
  '#1abc9c','#3498db','#2980b9','#8e44ad','#6c3483'
];

// Races available (13 specified)
const CG_RACES = [
  { id:'goblin',    name:'Goblin',          emoji:'👺', weight:6.5,  subKey:'goblinHorde', trait:null },
  { id:'gnome',     name:'Gnome',           emoji:'🧙', weight:0,    subKey:null,          trait:null }, // DISABLED — placeholder, no unique trait yet
  { id:'human',     name:'Human',           emoji:'👤', weight:6.5,  subKey:'humanSkin',   trait:null },
  { id:'dwarf',     name:'Dwarf',           emoji:'⛏️', weight:6.5,  subKey:null,          trait:null },
  { id:'skeleton',  name:'Skeleton',        emoji:'💀', weight:5.25, subKey:'boneLineage',  trait:'2 PvP wins become Lich (IQ set to 8). Lower bracket become Lich King (+1 all stats).' },
  { id:'troll',     name:'Troll',           emoji:'🧌', weight:5.25, subKey:'trollType',   trait:null },
  { id:'orc',       name:'Orc',             emoji:'🗡️', weight:5.25, subKey:null,          trait:'Win: +2 lowest stat. Lose: -3 highest stat.' },
  { id:'giant',     name:'Giant',           emoji:'🏔️', weight:4.0,  subKey:null,          trait:'After stat roll: if IQ>STR → +5 IQ/-5 STR; if STR>IQ → +5 STR/-5 IQ; if equal → +3 both.' },
  { id:'dragon',    name:'Dragon',          emoji:'🐉', weight:4.0,  subKey:'dragonType',  trait:null },
  { id:'angel',     name:'Angel',           emoji:'👼', weight:3.5,  subKey:'angelRank',   trait:null },
  { id:'primordial',name:'Primordial Being',emoji:'🌌', weight:3.5,  subKey:'elementalWheel', trait:'Each Combat win → receive Elemental Wheel again.' },
  { id:'demon',     name:'Demon',           emoji:'😈', weight:2.5,  subKey:'demonSin',    trait:null },
  { id:'god',       name:'God',             emoji:'✨', weight:2.5,  subKey:'godGift',     trait:null },
];

const CG_SUBRACES = {
  goblinHorde: [
    { label:'×1',      weight:5,  desc:'Nhận -1 all stats. [Trong tournament] Sau mỗi game thắng: +2 vào 3 random stats (có thể trùng).' },
    { label:'×50',     weight:10, desc:'Nhận -1 all stats.' },
    { label:'×100',    weight:25, desc:'Bạn là 1 con Goblin (không có hiệu ứng gì cả).' },
    { label:'×1,000',  weight:25, desc:'Nhận +1 Strength.' },
    { label:'×5,000',  weight:20, desc:'Nhận +1 Strength, +1 Speed.' },
    { label:'×10,000', weight:10, desc:'Nhận +2 Strength, +2 Speed.' },
    { label:'×100,000',weight:5,  desc:'Nhận +1 all stats, chắc chắn có vũ khí.' },
  ],
  humanSkin: [
    { label:'Trắng', weight:30, desc:'Chắc chắn có vũ khí.' },
    { label:'Vàng',  weight:35, desc:'Base IQ không thể dưới 5.' },
    { label:'Đen',   weight:35, desc:'Base Dura không thể dưới 5.' },
  ],
  trollType: [
    { label:'Regular Troll',  weight:42, desc:'Một con Troll thường.' },
    { label:'Ice Troll',      weight:30, desc:'Trong combat: Debuff: Đối thủ -2 movement speed.' },
    { label:'Mountain Troll', weight:25, desc:'Nhận +3 Dura.' },
    { label:'Lich Troll',     weight:3,  desc:'Khi chiến 1 đối thủ có 75% nhận 1 skill từ pool skill của đối thủ, nếu đối thủ không có skill nào thì thôi.' },
  ],
  dragonType: [
    { label:'Tideborn', weight:9,  desc:'Nhận +3 Base Strength.' },
    { label:'Flame',    weight:12, desc:'Nhận 1 skill và +2 vào Stat thấp nhất.' },
    { label:'Crimson',  weight:9,  desc:'Nhận +2 Base IQ và +1 Base Durability.' },
    { label:'Stone',    weight:9,  desc:'Nhận +2 Base Durability.' },
    { label:'Amethyst', weight:9,  desc:'Nhận -1 All Stats, nhận 4 skills.' },
  ],
  angelRank: [
    { label:'Angels',        weight:40, desc:'Nothing special.' },
    { label:'Archangels',    weight:21, desc:'+2 Speed, +1 Martial Arts.' },
    { label:'Principalities',weight:9,  desc:'Sau mỗi PvP thắng: +2 stat thấp nhất (nhận trước PvP reward).' },
    { label:'Powers',        weight:8,  desc:'+1 MA, +1 extra skill (cộng vào số skill từ vòng quay).' },
    { label:'Virtues',       weight:7,  desc:'Miễn nhiễm toàn bộ debuffs: stat debuffs, skill drain/seal, weapon steal, DoT.' },
    { label:'Dominions',     weight:6,  desc:'+3 extra skills (cộng vào số skill từ vòng quay).' },
    { label:'Ophanim',       weight:5,  desc:'+1 all stats.' },
    { label:'Cherubim',      weight:4,  desc:'+2 all stats.' },
  ],
  elementalWheel: [
    { label:'Air',   weight:25, desc:'Nhận +1 vào stat thấp nhất.' },
    { label:'Water', weight:25, desc:'Nhận +1 vào stat cao nhất.' },
    { label:'Fire',  weight:25, desc:'Nhận +1 skill.' },
    { label:'Earth', weight:25, desc:'Nhận +1 Dura, +1 STR.' },
  ],
  demonSin: [
    { label:'Lucifer',    weight:14.28, desc:'(Pride) +2 all stats. Mỗi lần thua tournament: −1 all stats permanent.' },
    { label:'Beelzebub',  weight:14.28, desc:'(Gluttony) Mỗi combat win: +1 random stat permanent. Bắt đầu với 0 skills.' },
    { label:'Leviathan',  weight:14.28, desc:'(Envy) Pre-combat: đối thủ −6 vào 1 stat ngẫu nhiên (chỉ trong trận). Không thể nhận stat bonuses từ PvP rewards (chỉ nhận skill rewards).' },
    { label:'Behemoth',   weight:14.28, desc:'(Wrath) Sau mỗi trận đấu: −1 DUR permanent. Khi HP < 35%: +3 STR, +2 SPD, +2 MA, −1 BIQ, −1 IQ (chỉ trong trận).' },
    { label:'Mammon',     weight:14.28, desc:'(Greed) −2 all stats. Win: nhận 2 PvP rewards thay vì 1.' },
    { label:'Belphegor',  weight:14.28, desc:'(Sloth) SPD −4. Không thể nhận skill từ Copycat hoặc PvP rewards (vẫn quay nhưng không nhận). Mỗi round survive: +1 DUR permanent.' },
    { label:'Asmodeus',   weight:14.28, desc:'(Lust) −1 all stats. Vô hiệu hóa N skills của đối thủ (N = số skill mình có); nếu số skill của mình nhiều hơn đối thủ: đối thủ thêm −1 all stats. Đối thủ khởi đầu với 1 điểm (chỉ BO3/BO5+, không kích hoạt ở BO1/Battle Royale).' },
  ],
  godGift: [
    { label:'Blessed by Surtr', weight:1, desc:'Wheel STR: chắc chắn ≥10. Quay ra đúng 10 → STR nhân đôi (→20). Thua sau 1m46s nếu đối thủ không phải demon/god.' },
    { label:'Blessed by Raijin',    weight:1, desc:'Wheel SPD: chắc chắn ≥10. Quay ra đúng 10 → SPD nhân đôi (→20). Thua sau 1m46s nếu đối thủ không phải demon/god.' },
    { label:'Blessed by Thoth',       weight:1, desc:'Wheel IQ: chắc chắn ≥10. Quay ra đúng 10 → IQ nhân đôi (→20). Thua sau 1m46s nếu đối thủ không phải demon/god.' },
    { label:'Blessed by Athena',      weight:1, desc:'Wheel BIQ: chắc chắn ≥10. Quay ra đúng 10 → BIQ nhân đôi (→20). Thua sau 1m46s nếu đối thủ không phải demon/god.' },
    { label:'Blessed by Shiva',       weight:1, desc:'Wheel MA: chắc chắn ≥10. Quay ra đúng 10 → MA nhân đôi (→20). Thua sau 1m46s nếu đối thủ không phải demon/god.' },
    { label:'Blessed by Atlas',      weight:1, desc:'Wheel DUR: chắc chắn ≥10. Quay ra đúng 10 → DUR nhân đôi (→20). Hồi phục HP mỗi 1.5 giây trong trận (scale DUR). Thua sau 1m46s nếu đối thủ không phải demon/god.' },
  ],
  boneLineage: [
    { label:'Goblin Bones',           weight:6.5,  raceId:'goblin'     },
    { label:'Gnome Bones',            weight:6.5,  raceId:'gnome'      },
    { label:'Human Bones',            weight:6.5,  raceId:'human'      },
    { label:'Dwarf Bones',            weight:6.5,  raceId:'dwarf'      },
    { label:'Troll Bones',            weight:5.25, raceId:'troll'      },
    { label:'Orc Bones',              weight:5.25, raceId:'orc'        },
    { label:'Giant Bones',            weight:4.0,  raceId:'giant'      },
    { label:'Dragon Bones',           weight:4.0,  raceId:'dragon'     },
    { label:'Angel Bones',            weight:3.5,  raceId:'angel'      },
    { label:'Primordial Being Bones', weight:3.5,  raceId:'primordial' },
    { label:'Demon Bones',            weight:2.5,  raceId:'demon'      },
    { label:'God Bones',              weight:2.5,  raceId:'god'        },
  ],
};

// Stat weights from Chargen.md — columns: Goblin,Gnome,Human,Dwarf,Skeleton,Troll,Orc,Giant,Dragon,Angel,Primordial,Demon,God
// Rows are stat values 1-10
const CG_STAT_WEIGHTS = {
  strength: {
    goblin:[10,10,15,18,25,10,5,3,2,2], gnome:[15,10,10,13,22,15,5,5,3,2],
    human:[15,15,10,10,20,10,5,5,5,5],  dwarf:[5,7,8,7,13,20,15,10,9,6],
    skeleton:[10,10,10,10,10,10,10,10,10,10], troll:[10,5,10,5,20,20,15,5,5,5],
    orc:[2,3,4,5,6,35,20,10,8,7],       giant:[5,5,5,10,10,25,25,5,5,5],
    dragon:[12,3,3,3,3,25,31,5,5,10],   angel:[10,10,10,10,10,10,10,10,10,10],
    primordial:[15,5,5,5,5,5,35,10,5,10], demon:[20,5,5,5,5,10,10,10,15,15],
    god:[20,5,5,5,5,10,10,10,15,15]
  },
  speed: {
    goblin:[10,15,15,15,15,15,5,5,3,2], gnome:[10,15,15,15,15,15,5,5,3,2],
    human:[15,10,10,10,20,15,10,5,3,2], dwarf:[20,15,15,15,15,5,5,5,3,2],
    skeleton:[10,10,10,10,10,10,10,10,10,10], troll:[15,10,10,10,20,15,5,5,5,5],
    orc:[15,15,15,15,15,15,4,2,2,2],    giant:[15,15,15,15,15,15,4,2,2,2],
    dragon:[15,5,5,5,15,15,15,15,5,5],  angel:[10,10,10,10,10,10,10,10,10,10],
    primordial:[15,5,5,5,20,20,5,5,5,15], demon:[10,4,4,4,4,35,14,11,4,10],
    god:[15,2,3,4,4,4,44,4,5,15]
  },
  durability: {
    goblin:[10,10,15,20,15,15,10,2,2,1], gnome:[15,10,10,10,30,10,7,3,3,2],
    human:[15,7,8,9,20,16,14,6,3,2],    dwarf:[5,5,5,5,15,20,20,10,8,7],
    skeleton:[10,10,10,10,10,10,10,10,10,10], troll:[6,7,8,9,10,35,10,5,5,5],
    orc:[5,5,7,7,13,23,20,10,5,5],      giant:[5,5,5,10,10,20,20,5,5,15],
    dragon:[5,5,5,10,10,20,15,10,10,10], angel:[10,10,10,10,10,10,10,10,10,10],
    primordial:[15,5,5,10,5,25,10,10,10,5], demon:[15,5,5,5,15,15,15,5,5,15],
    god:[15,5,5,5,10,5,30,5,5,15]
  },
  iq: {
    goblin:[15,15,10,10,20,15,5,5,3,2],  gnome:[10,10,5,5,15,25,15,5,5,5],
    human:[15,5,5,5,15,15,15,12,8,5],   dwarf:[15,10,10,5,20,12,12,8,5,3],
    skeleton:[100,0,0,0,0,0,0,0,0,0],   troll:[15,15,15,5,25,10,5,5,3,2],
    orc:[15,15,15,5,25,10,5,5,3,2],     giant:[10,10,5,5,10,15,25,10,5,5],
    dragon:[15,5,5,5,15,20,5,10,15,5],  angel:[10,10,10,10,10,10,10,10,10,10],
    primordial:[15,5,5,15,5,15,15,5,5,15], demon:[20,5,5,5,20,10,5,5,5,20],
    god:[20,5,5,5,5,5,30,5,5,15]
  },
  battleiq: {
    goblin:[5,10,10,15,23,15,10,5,5,2],  gnome:[15,15,15,15,10,10,10,5,3,2],
    human:[10,5,5,5,15,15,20,10,10,5],  dwarf:[5,5,5,10,15,20,20,10,5,5],
    skeleton:[10,10,10,10,10,10,10,10,10,10], troll:[5,5,5,10,15,20,20,10,5,5],
    orc:[2,3,4,5,6,35,18,12,8,7],       giant:[15,10,10,5,15,15,5,10,10,5],
    dragon:[20,10,5,5,10,20,15,5,5,5],  angel:[10,10,10,10,10,10,10,10,10,10],
    primordial:[15,5,5,15,15,15,15,5,5,5], demon:[20,5,5,5,5,5,35,5,5,10],
    god:[20,5,5,5,5,5,20,10,5,20]
  },
  ma: {
    goblin:[15,15,15,10,10,10,10,5,5,5], gnome:[20,20,15,15,10,5,5,5,3,2],
    human:[15,5,5,5,20,10,15,5,5,15],   dwarf:[12,12,12,4,4,12,24,10,5,5],
    skeleton:[10,10,10,10,10,10,10,10,10,10], troll:[12,12,12,4,4,12,24,10,5,5],
    orc:[10,5,5,15,10,20,15,10,5,5],    giant:[40,5,5,5,5,5,20,5,5,5],
    dragon:[20,5,5,5,20,15,15,5,5,5],   angel:[10,10,10,10,10,10,10,10,10,10],
    primordial:[20,5,5,5,20,10,10,5,5,15], demon:[15,5,5,5,15,25,5,5,5,15],
    god:[20,5,5,5,25,5,5,5,5,20]
  }
};

// ── Per-sub-race stat weights for God ─────────────────────────
// Balance anchors: Blessed by Thoth (non-focus total ≈22.9) and Blessed by Shiva (≈29.6).
// God of STR/SPD/BIQ/DUR adjusted to fit thematically within this range.
// Blessed by Shiva uses CG_STAT_WEIGHTS.god as-is (no override needed).
// Weight templates used:
//   FOCUS      [5,2,3,3,3,4,10,15,35,20]  avg≈7.7
//   High       [10,5,5,5,5,5,15,15,15,20] avg≈6.7
//   Mod-High   [10,5,5,5,10,10,20,15,10,10] avg≈6.2
//   Moderate   [15,10,10,10,10,5,10,10,10,10] avg≈5.35
//   Low        [25,15,10,10,10,5,5,5,5,10] avg≈4.25
//   Very Low   [35,15,15,10,5,5,5,3,4,3]  avg≈3.3
const CG_GOD_SUBRACE_WEIGHTS = {
  // Berserker: huge STR, deadly instincts (BIQ/MA high), fragile (DUR low), dumb and slow
  // Non-focus total ≈24.25
  'Blessed by Surtr': {
    strength:   [5,2,3,3,3,4,10,15,35,20],    // FOCUS — avg≈7.7, 20% for 10
    speed:      [35,15,15,10,5,5,5,3,4,3],    // very low — avg≈3.3
    durability: [25,15,10,10,10,5,5,5,5,10],  // low — avg≈4.25
    iq:         [35,15,15,10,5,5,5,3,4,3],    // very low — avg≈3.3
    battleiq:   [10,5,5,5,5,5,15,15,15,20],   // high — avg≈6.7
    ma:         [10,5,5,5,5,5,15,15,15,20],   // high — avg≈6.7
  },
  // Lightning reflexes: huge SPD, durable speedster (DUR/BIQ high), poor technique (MA/IQ low)
  // Non-focus total ≈25.2
  'Blessed by Raijin': {
    strength:   [25,15,10,10,10,5,5,5,5,10],  // low — avg≈4.25
    speed:      [5,2,3,3,3,4,10,15,35,20],    // FOCUS — avg≈7.7, 20% for 10
    durability: [10,5,5,5,5,5,15,15,15,20],   // high — avg≈6.7
    iq:         [25,15,10,10,10,5,5,5,5,10],  // low — avg≈4.25
    battleiq:   [10,5,5,5,5,5,15,15,15,20],   // high — avg≈6.7
    ma:         [35,15,15,10,5,5,5,3,4,3],    // very low — avg≈3.3
  },
  // Genius scholar: huge IQ, weak body and no combat technique
  // Non-focus total ≈22.9  ← ANCHOR (unchanged)
  'Blessed by Thoth': {
    strength:   [35,15,15,10,5,5,5,3,4,3],    // very low — avg≈3.3
    speed:      [25,15,10,10,10,5,5,5,5,10],  // low — avg≈4.25
    durability: [15,10,10,10,10,5,10,10,10,10], // moderate — avg≈5.35
    iq:         [5,2,3,3,3,4,10,15,35,20],    // FOCUS — avg≈7.7, 20% for 10
    battleiq:   [10,5,5,5,5,5,15,15,15,20],   // high — avg≈6.7
    ma:         [35,15,15,10,5,5,5,3,4,3],    // very low — avg≈3.3
  },
  // Tactical master: huge BIQ, well-rounded fighter, slight STR weakness
  // Non-focus total ≈26.5
  'Blessed by Athena': {
    strength:   [25,15,10,10,10,5,5,5,5,10],  // low — avg≈4.25
    speed:      [15,10,10,10,10,5,10,10,10,10], // moderate — avg≈5.35
    durability: [15,10,10,10,10,5,10,10,10,10], // moderate — avg≈5.35
    battleiq:   [5,2,3,3,3,4,10,15,35,20],    // FOCUS — avg≈7.7, 20% for 10
    iq:         [10,5,5,5,10,10,20,15,10,10],  // mod-high — avg≈6.2
    ma:         [15,10,10,10,10,5,10,10,10,10], // moderate — avg≈5.35
  },
  // Unkillable tank: huge DUR, strong body & trained, slow and tactically limited
  // Non-focus total ≈25.2
  'Blessed by Atlas': {
    strength:   [10,5,5,5,5,5,15,15,15,20],   // high — avg≈6.7
    speed:      [35,15,15,10,5,5,5,3,4,3],    // very low — avg≈3.3
    durability: [5,2,3,3,3,4,10,15,35,20],    // FOCUS — avg≈7.7, 20% for 10
    iq:         [25,15,10,10,10,5,5,5,5,10],  // low — avg≈4.25
    battleiq:   [25,15,10,10,10,5,5,5,5,10],  // low — avg≈4.25
    ma:         [10,5,5,5,5,5,15,15,15,20],   // high — avg≈6.7
  },
  // Blessed by Shiva → uses CG_STAT_WEIGHTS.god as-is (no override needed)
  // Non-focus total ≈29.6  ← ANCHOR (unchanged)
};

const STAT_DISPLAY = [
  { key:'strength',  label:'STR'},
  { key:'speed',     label:'SPD'},
  { key:'durability',label:'DUR'},
  { key:'iq',        label:'IQ'},
  { key:'battleiq',  label:'BIQ'},
  { key:'ma',        label:'MA'},
];

const CG_WEAPONS = [
  { id:'fists',    label:'🥊 Fists' },
  { id:'sword',    label:'⚔️ Sword' },
  { id:'dagger',   label:'🗡️ Dagger' },
  { id:'spear',    label:'🔱 Spear' },
  { id:'bow',      label:'🏹 Bow' },
  { id:'scythe',   label:'🌙 Scythe' },
  { id:'hammer',   label:'🔨 Hammer' },
  { id:'shuriken', label:'⭐ Shuriken' },
];
// Armed-only list (excludes Fists — used in weapon wheel when hasWeapon = true)
const CG_WEAPONS_ARMED = CG_WEAPONS.filter(w => w.id !== 'fists');

// Skill count weights per race — index 0 = 0 skills, index 4 = 4 skills
const CG_SKILL_COUNT_WEIGHTS = {
  goblin:     [30, 30, 20, 10, 10],
  gnome:      [30, 30, 25, 10,  5],
  human:      [25, 25, 25, 15, 10],
  dwarf:      [30, 35, 20, 10,  5],
  skeleton:   [20, 20, 20, 20, 20], // equal (not specified)
  troll:      [30, 35, 20, 10,  5],
  orc:        [30, 35, 20, 10,  5],
  giant:      [45,  5, 10,  5, 35],
  dragon:     [ 5, 15, 50, 20, 10],
  angel:      [15, 20, 30, 25, 10],
  primordial: [15,  5, 25, 35, 20],
  demon:      [20,  5, 15, 35, 25],
  god:        [20,  5, 15, 35, 25],
};
