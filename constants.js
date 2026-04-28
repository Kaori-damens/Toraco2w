
// ============================================================
// CONSTANTS
// ============================================================
// File này chứa tất cả hằng số và config data tĩnh của game:
//   - CW/CH/BALL_R/BASE_HP  — kích thước canvas & ball mặc định
//   - RANDOM_NAME_POOL       — pool tên ngẫu nhiên lấy từ game nổi tiếng
//   - ARENAS                 — ~40+ cấu hình arena (type, size, vị trí, traps, events)
//   - BALL_COLORS            — palette màu mặc định cho 6 ball đầu
//   - STAT_FORMULAS          — công thức tính HP/SPD/crit/evade từ stat (ball.js constructor)
//   - COMBAT_FORMULAS        — hệ số dame trong chiến đấu (rageMult, STR scaling...)
//   - SKILL_FORMULAS         — tham số của ~30 skill (threshold, mult, scaling...)
//   - RACE_FORMULAS          — mechanic đặc biệt theo race (Human Limit Break, Orc Blood Price...)
//   - generateRadoserColor() — sinh màu ball từ index, đảm bảo luôn khác màu nhau
//
// window.STAT/COMBAT/SKILL/RACE_FORMULAS được gán lên window để config-loader.js
// có thể snapshot và restore về default khi user reset config.

// CW/CH — kích thước canvas (chiều rộng × chiều cao), đơn vị pixel
// BALL_R — bán kính ball tiêu chuẩn (24px), dùng cho collision và render
// BASE_HP — HP gốc trước khi cộng stat DUR (100 + DUR × 10)
const CW = 1000, CH = 1000;
const BALL_R = 24;
const BASE_HP = 100;

// ============================================================
// RANDOM NAME POOL — heroes from Dota2, LoL, Valorant, Overwatch, etc.
// ============================================================
// Pool tên ngẫu nhiên dùng cho Quick Create & Bulk Create.
// Tên lấy từ các game nổi tiếng — mỗi tên là nhân vật quen thuộc của cộng đồng.
// Thêm tên mới: chỉ cần append vào mảng, không cần sửa thêm gì.
const RANDOM_NAME_POOL = [
  // Dota 2
  'Invoker','Juggernaut','Pudge','Axe','Lina','Crystal Maiden','Phantom Assassin',
  'Anti-Mage','Dragon Knight','Faceless Void','Storm Spirit','Puck','Queen of Pain',
  'Templar Assassin','Windranger','Luna','Tidehunter','Doom','Enigma','Morphling',
  'Magnus','Silencer','Nyx Assassin','Meepo','Weaver','Spectre','Slark',
  'Ember Spirit','Earth Spirit','Monkey King','Pangolier','Dark Willow','Grimstroke',
  'Snapfire','Void Spirit','Hoodwink','Marci','Primal Beast','Muerta',
  // League of Legends
  'Yasuo','Zed','Katarina','Jinx','Vi','Ekko','Akali','Garen','Nasus','Darius',
  'Thresh','Lux','Ezreal','Caitlyn','Riven','Fiora','Jhin','Camille','Irelia',
  'Azir','Syndra','Orianna','Mordekaiser','Samira','Yone','Aphelios','Zeri',
  'Vex','Nilah','K\'Sante','Naafiri','Briar','Hwei','Smolder','Aurora',
  'Ahri','LeBlanc','Draven','Vayne','Rengar','Kha\'Zix','Zoe','Qiyana',
  // Valorant
  'Jett','Reyna','Phoenix','Sage','Raze','Sova','Omen','Killjoy','Cypher',
  'Viper','Brimstone','Breach','Skye','Yoru','Astra','Chamber','Neon',
  'Fade','Harbor','Gekko','Deadlock','Clove','Iso','Vyse','Waylay',
  // Overwatch
  'Tracer','Genji','Reaper','Mercy','Hanzo','Cassidy','D.Va','Zarya',
  'Reinhardt','Widowmaker','Symmetra','Zenyatta','Moira','Baptiste',
  'Ashe','Sigma','Echo','Sojourn','Kiriko','Ramattra','Lifeweaver',
  'Illari','Mauga','Venture','Juno',
  // Street Fighter
  'Ryu','Ken','Akuma','Chun-Li','Cammy','Guile','Zangief','Dhalsim',
  'Blanka','Sagat','Vega','Bison','Rashid','Luke','Jamie','Manon','Marisa',
  // Mortal Kombat
  'Scorpion','Sub-Zero','Raiden','Kitana','Mileena','Shang Tsung','Liu Kang',
  'Johnny Cage','Sonya','Kung Lao','Ermac','Reptile','Smoke','Noob Saibot',
  // Tekken
  'Kazuya','Jin','Heihachi','Nina','Lars','Hwoarang','Paul','Yoshimitsu',
  'Devil Jin','King','Law','Christie','Lili','Alisa','Reina',
  // Dark Souls / Elden Ring
  'Artorias','Ornstein','Nameless King','Malenia','Radahn','Margit',
  'Maliketh','Morgott','Rykard','Mohg','Godrick','Renalla',
  // Genshin / Honkai
  'Hu Tao','Raiden Shogun','Zhongli','Venti','Kazuha','Nahida','Neuvillette',
  'Arlecchino','Furina','Navia','Acheron','Blade','Seele','Jingyuan',
  // Other (Smash/Destiny/FF)
  'Sephiroth','Cloud','Tifa','Noctis','Bayonetta','Dante','Vergil',
  'Kratos','Aloy','Geralt','Niko Bellic','Arthur Morgan','Master Chief',
];

function getRandomGameName() {
  return RANDOM_NAME_POOL[Math.floor(Math.random() * RANDOM_NAME_POOL.length)];
}

// ─── ARENAS ─────────────────────────────────────────────────
// Danh sách toàn bộ arena có sẵn trong game.
// Mỗi arena là một object config với các field:
//   type   — hình dạng: 'square' | 'circle' | 'rect' | 'hole_sq' | 'hole_ci' |
//             'hole_re' | 'diamond' | 'cross' — dùng bởi arena.js để vẽ và tính collision
//   x/y/w/h — bounding box (cho type square/rect/hole_sq/hole_re)
//   cx/cy/r  — tâm + bán kính (cho type circle/hole_ci)
//   cx/cy/hw/hh — tâm + half-width/half-height (cho type diamond)
//   cx/cy/arm/thick — tâm + độ dài cánh + độ rộng (cho type cross)
//   size   — 'small' | 'medium' | 'large' — UI filter + gợi ý số người chơi
//   label  — tên hiển thị trong dropdown chọn arena
//   traps  — object { pillars:N, lightning:N, scythe:bool, bombs:N } — init bởi traps.js
//   holes  — mảng { shape:'circle'|'square', cx/cy/r | x/y/w/h } — vùng "hố", ball rơi = chết
//   events — mảng event động (spawn_hole, shrink, volcanic_vent) — xử lý bởi arena-events.js
//   dynamicHoles — mảng hố sinh ra trong runtime (cho diamond_rift)
//
// Size guide: Small = 1v1, Medium = 4–6, Large = 7–12
const ARENAS = {
  // ── Small (1v1) ───────────────────────────────────────────────────
  small_square: { type:'square', x:300, y:300, w:400, h:400, size:'small', label:'S. Square' },
  small_circle: { type:'circle', cx:500, cy:500, r:200, size:'small', label:'S. Circle' },
  small_rect:   { type:'rect',   x:175, y:325, w:650, h:350, size:'small', label:'S. Rect' },
  small_square_trap: { type:'square', x:300, y:300, w:400, h:400, size:'small', label:'S. Square ⚠', traps:{ pillars:1 } },
  small_circle_trap: { type:'circle', cx:500, cy:500, r:200, size:'small', label:'S. Circle ⚠', traps:{ pillars:1 } },
  small_rect_trap:   { type:'rect',   x:175, y:325, w:650, h:350, size:'small', label:'S. Rect ⚠',   traps:{ pillars:1 } },
  // ── Medium (4–6) ──────────────────────────────────────────────────
  med_square: { type:'square', x:190, y:190, w:620, h:620, size:'medium', label:'M. Square' },
  med_circle: { type:'circle', cx:500, cy:500, r:290, size:'medium', label:'M. Circle' },
  med_rect:   { type:'rect',   x:125, y:250, w:750, h:500, size:'medium', label:'M. Rect' },
  med_square_trap:  { type:'square', x:190, y:190, w:620, h:620, size:'medium', label:'M. Square ⚡', traps:{ pillars:5, lightning:1 } },
  med_circle_trap:  { type:'circle', cx:500, cy:500, r:290, size:'medium', label:'M. Circle ⚡', traps:{ pillars:5, lightning:1 } },
  med_rect_trap:    { type:'rect',   x:125, y:250, w:750, h:500, size:'medium', label:'M. Rect ⚡',   traps:{ pillars:5, lightning:1 } },
  med_square_trap2: { type:'square', x:190, y:190, w:620, h:620, size:'medium', label:'M. Square ⚔', traps:{ pillars:5, scythe:true } },
  med_circle_trap2: { type:'circle', cx:500, cy:500, r:290, size:'medium', label:'M. Circle ⚔', traps:{ pillars:5, scythe:true } },
  med_rect_trap2:   { type:'rect',   x:125, y:250, w:750, h:500, size:'medium', label:'M. Rect ⚔',   traps:{ pillars:5, scythe:true } },
  // ── Large (7–12) ──────────────────────────────────────────────────
  large_square: { type:'square', x:90, y:90, w:820, h:820, size:'large', label:'L. Square' },
  large_circle: { type:'circle', cx:500, cy:500, r:370, size:'large', label:'L. Circle' },
  large_rect:   { type:'rect',   x:50, y:175, w:900, h:650, size:'large', label:'L. Rect' },
  large_square_trap: { type:'square', x:90, y:90, w:820, h:820, size:'large', label:'L. Square ⚠', traps:{ pillars:7, scythe:true } },
  large_circle_trap: { type:'circle', cx:500, cy:500, r:370, size:'large', label:'L. Circle ⚠', traps:{ pillars:7, scythe:true } },
  large_rect_trap:   { type:'rect',   x:50, y:175, w:900, h:650, size:'large', label:'L. Rect ⚠',   traps:{ pillars:7, scythe:true } },
  // ── Hole arenas — Small ───────────────────────────────────────────
  hole_sq_c_s:    { type:'hole_sq', x:300, y:300, w:400, h:400, size:'small',  label:'S.Sq ●',   holes:[{shape:'circle',cx:500,cy:500,r:65}] },
  hole_sq_sq_s:   { type:'hole_sq', x:300, y:300, w:400, h:400, size:'small',  label:'S.Sq ■',   holes:[{shape:'square',x:440,y:440,w:120,h:120}] },
  hole_ci_c_s:    { type:'hole_ci', cx:500,cy:500, r:200,         size:'small',  label:'S.Ci ●',   holes:[{shape:'circle',cx:500,cy:500,r:55}] },
  hole_re_2c_s:   { type:'hole_re', x:175, y:325, w:650, h:350, size:'small',  label:'S.Re ●●',  holes:[{shape:'circle',cx:338,cy:500,r:48},{shape:'circle',cx:663,cy:500,r:48}] },
  hole_re_3sq_s:  { type:'hole_re', x:175, y:325, w:650, h:350, size:'small',  label:'S.Re ■■■', holes:[{shape:'square',x:298,y:460,w:80,h:80},{shape:'square',x:460,y:460,w:80,h:80},{shape:'square',x:623,y:460,w:80,h:80}] },
  // ── Hole arenas — Medium ──────────────────────────────────────────
  hole_sq_c_m:    { type:'hole_sq', x:190, y:190, w:620, h:620, size:'medium', label:'M.Sq ●',   holes:[{shape:'circle',cx:500,cy:500,r:85}] },
  hole_sq_sq_m:   { type:'hole_sq', x:190, y:190, w:620, h:620, size:'medium', label:'M.Sq ■',   holes:[{shape:'square',x:425,y:425,w:150,h:150}] },
  hole_ci_c_m:    { type:'hole_ci', cx:500,cy:500, r:290,         size:'medium', label:'M.Ci ●',   holes:[{shape:'circle',cx:500,cy:500,r:72}] },
  hole_re_2c_m:   { type:'hole_re', x:125, y:250, w:750, h:500, size:'medium', label:'M.Re ●●',  holes:[{shape:'circle',cx:313,cy:500,r:60},{shape:'circle',cx:688,cy:500,r:60}] },
  hole_re_3sq_m:  { type:'hole_re', x:125, y:250, w:750, h:500, size:'medium', label:'M.Re ■■■', holes:[{shape:'square',x:266,y:453,w:95,h:95},{shape:'square',x:453,y:453,w:95,h:95},{shape:'square',x:641,y:453,w:95,h:95}] },
  // ── Hole arenas — Large ───────────────────────────────────────────
  hole_sq_c_l:    { type:'hole_sq', x:90,  y:90,  w:820, h:820, size:'large',  label:'L.Sq ●',   holes:[{shape:'circle',cx:500,cy:500,r:105}] },
  hole_sq_sq_l:   { type:'hole_sq', x:90,  y:90,  w:820, h:820, size:'large',  label:'L.Sq ■',   holes:[{shape:'square',x:410,y:410,w:180,h:180}] },
  hole_ci_c_l:    { type:'hole_ci', cx:500,cy:500, r:370,         size:'large',  label:'L.Ci ●',   holes:[{shape:'circle',cx:500,cy:500,r:92}] },
  hole_re_2c_l:   { type:'hole_re', x:50,  y:175, w:900, h:650, size:'large',  label:'L.Re ●●',  holes:[{shape:'circle',cx:275,cy:500,r:75},{shape:'circle',cx:725,cy:500,r:75}] },
  hole_re_3sq_l:  { type:'hole_re', x:50,  y:175, w:900, h:650, size:'large',  label:'L.Re ■■■', holes:[{shape:'square',x:220,y:445,w:110,h:110},{shape:'square',x:445,y:445,w:110,h:110},{shape:'square',x:670,y:445,w:110,h:110}] },

  // ── Dynamic Event Arenas ──────────────────────────────────
  // dynamicHoles / _windGust / _shrinkCount / ventWarnings populated at runtime by arena-events.js
  diamond_rift: {
    type: 'diamond', cx: 500, cy: 500, hw: 320, hh: 320,
    size: 'large', label: '💀 Diamond Rift',
    events: [{ type: 'spawn_hole', interval: 1800, holeR: 55, maxHoles: 5 }],
    dynamicHoles: [],
  },
  shrinking_ring: {
    type: 'circle', cx: 500, cy: 500, r: 350,
    size: 'large', label: '⚠️ Shrinking Ring',
    events: [{ type: 'shrink', interval: 1320, shrinkAmt: 45, minR: 140, maxShrinks: 4 }],
  },
  volcanic_cross: {
    type: 'cross', cx: 500, cy: 500, arm: 340, thick: 210,
    size: 'medium', label: '🌋 Volcanic Cross',
    events: [{ type: 'volcanic_vent', interval: 720, count: 2, warnFrames: 120, blastR: 75, damage: 8, power: 13 }],
  },
};

// BALL_COLORS — palette màu mặc định cho 6 ball đầu tiên khi dùng legacy color picker.
// Từ ball thứ 7 trở đi, generateRadoserColor() sinh màu động dựa theo index.
const BALL_COLORS = ['#4488ff', '#ff4455', '#44cc88', '#ffaa22', '#cc44ff', '#ff88aa'];

// ── Config-overridable formula constants ──────────────────
// Consumed by ball.js constructor (STAT_FORMULAS) and getDamage() (COMBAT_FORMULAS).
// config-loader.js snapshots these at load time so reset always restores true defaults.

// ─── STAT_FORMULAS ──────────────────────────────────────────
// Công thức tính chỉ số cơ bản của Ball từ stat — dùng trong Ball constructor.
// User có thể override bằng Config Loader (Debug mode → 📂 Config → tab Formula).
//
//   hp.base + hp.perDur × DUR       → maxHP (DUR=10 → 150 HP)
//   speed.base + speed.perSpd × SPD → maxSpeed (SPD=10 → 22)
//   crit.chancePerIQ × IQ           → critChance (IQ=10 → 30%)
//   crit.baseMult + (IQ>10? extraPerIQAbove10×(IQ-10): 0) → critMult (crit nhân dame bao nhiêu)
//   evade.perBIQ × BIQ              → evadeChance (BIQ=10 → 20%)
//   deflect.perMA × MA              → deflectChance (weapon deflect projectile, MA=10 → 20%)
window.STAT_FORMULAS = {
  hp:      { base: 50,  perDur: 10  },
  speed:   { base: 7,   perSpd: 1.5 },
  crit:    { chancePerIQ: 0.03, baseMult: 1.5, extraPerIQAbove10: 0.1 },
  evade:   { perBIQ: 0.02 },
  deflect: { perMA:  0.02 },
};

// ─── COMBAT_FORMULAS ────────────────────────────────────────
// Hệ số tính dame trong chiến đấu — dùng trong Ball.getDamage().
//
//   rageMult         — nhân dame khi Rage Mode bật (sau rageThresholdSec giây)
//   rageThresholdSec — giây để kích hoạt Rage Mode (80s mặc định)
//   strMult          — hệ số nhân STR vào dame (1.0 = tuyến tính, STR=10 → ×10)
//   daggerMAScaling  — dagger: base += MA × 0.15, rồi nhân STR (MA scale thấp hơn fists)
//   fistsMAFlat      — fists: dmg += MA × 0.5 FLAT sau STR (không nhân vào base, tránh triple-scale)
window.COMBAT_FORMULAS = {
  rageMult:         1.5,
  rageThresholdSec: 80,
  strMult:          1.0,
  daggerMAScaling:  0.15,
  fistsMAFlat:      0.5,
};

// ─── SKILL_FORMULAS ─────────────────────────────────────────
// Tham số cho ~30 skill — được đọc bởi skills.js, ball.js, collision.js.
// Mỗi key = skillId khớp với SKILL_DEFS trong skills.js.
// User có thể override bằng Config Loader.
window.SKILL_FORMULAS = {
  // ── Passive stat bonuses — áp dụng trong Ball constructor ──
  iron_body:       { hpBonus: 20 },          // +20 HP flat
  swift:           { speedMult: 1.15 },      // ×1.15 maxSpeed
  sharp_eye:       { critBonus: 0.10 },      // +10% crit chance
  heavy_mass:      { massMult: 1.30 },       // ×1.30 mass (knockback nặng hơn khi nhận hit)

  // ── Healing ────────────────────────────────────────────────
  vampiric:        { healPct: 0.05 },        // hồi 5% dame gây ra thành HP mỗi hit

  // ── Outgoing damage mults — nhân vào getDamage() ──────────
  berserker:       { hpThreshold: 0.30, baseMult: 1.2, iqScaling: 0.03 },
  // Khi HP < 30%: mult = 1.2 + IQ×0.03. IQ=10 → ×1.5 dame
  war_cry:         { baseMult: 1.5,  iqScaling: 0.05 },
  // Lần đánh sau khi kích hoạt: 1.5 + IQ×0.05. IQ=10 → ×2.0
  counter:         { baseMult: 1.5,  biqScaling: 0.05 },
  // Sau khi nhận đòn: 1.5 + BIQ×0.05. BIQ=10 → ×2.0
  duel_instinct:   { mult: 1.30 },           // ×1.30 khi chỉ còn 2 ball trên sân
  parry_punish:    { mult: 2.0 },            // ×2.0 đòn đánh ngay sau khi parry thành công
  brawlers_rhythm: { mult: 2.5 },            // ×2.5 sau 3 lần parry liên tiếp (stack reset)
  flurry_finisher: { mult: 2.5 },            // ×2.5 sau 5 lần hit liên tiếp không bị parry
  heavy_momentum:  { perStack: 0.20 },       // +20% dame mỗi stack (tăng khi di chuyển nhanh)

  // ── Incoming damage reduction — áp dụng trong takeDamage() ─
  thick_hide:      { reduction: 0.10 },      // giảm 10% mọi damage nhận vào
  adaptation:      { baseReduction: 0.15, biqScaling: 0.02, maxReduction: 0.35 },
  // Giảm 15% + BIQ×2% damage, tối đa 35%. BIQ=10 → 35% (đạt max)
  guard_stance:    { perBIQ: 0.03, maxReduction: 0.30 },
  // Giảm BIQ×3%, tối đa 30%. BIQ=10 → 30%
  fortify:         { baseAbsorb: 10, perBIQ: 2 },
  // Mỗi hit hấp thụ (10 + BIQ×2) damage flat trước khi tính reduction

  // ── Projectile skills — áp dụng trong collision.resolveProjectiles() ─
  predator:        { mult: 1.15 },           // ×1.15 dame projectile khi target đang chậm/stun
  sniper:          { baseMult: 1.4, iqScaling: 0.03 },
  // ×(1.4 + IQ×0.03) dame projectile thẳng. IQ=10 → ×1.7
  volley:          { baseMult: 1.5, iqScaling: 0.05 },
  // ×(1.5 + IQ×0.05) cho đợt bắn volley (nhiều mũi). IQ=10 → ×2.0
  bounce_damage:   { perBounce: 0.15 },      // +15% dame sau mỗi lần nảy tường
  ricochet_kill:   { mult: 2.0, minBounces: 2 },
  // ×2.0 dame nếu projectile đã nảy ≥2 lần trước khi trúng

  // ── Melee proc skills — trig ngẫu nhiên trong _checkWeaponHit() ─
  exploit:         { chancePerCombinedStat: 0.01, baseMult: 1.5, iqScaling: 0.05 },
  // Chance = (STR+IQ)×1% kích hoạt: ×(1.5 + IQ×0.05). STR=IQ=10 → 20% chance, ×2.0
  reapers_mark:    { mult: 1.80, hpThreshold: 0.30 },
  // ×1.80 dame khi mục tiêu dưới 30% HP
};

// ─── RACE_FORMULAS ──────────────────────────────────────────
// Tham số cho mechanic đặc biệt theo race — đọc bởi ball.js và skills.js.
window.RACE_FORMULAS = {
  human: {
    limitBreak: {
      // Kích hoạt khi HP < 20%: tăng tốc ×1.5, kéo dài 480 frame (8 giây @ 60fps)
      // Sau khi hết: exhaustion → speed ×0.7 trong vài giây
      // Mỗi lần kích hoạt thêm: +15% dame (perStack), stack không giới hạn
      hpThreshold:     0.20,  // ngưỡng HP để kích hoạt
      speedMult:       1.5,   // nhân tốc độ khi Limit Break
      exhaustionMult:  0.7,   // nhân tốc độ sau khi Limit Break hết
      perStack:        0.15,  // +15% dame per stack tích lũy
      durationFrames:  480,   // 480f = 8 giây
    },
  },
  orc: {
    bloodPrice: {
      // Sau mỗi 5 lần nhận damage (stackThreshold): kích nổ burst damage
      // Burst dame = STR × 0.15 × số stack (burstDmgPerSTR)
      stackThreshold:  5,
      burstDmgPerSTR:  0.15,
    },
  },
  dwarf: {
    sharpness: {
      // Mỗi lần hit tích 1 stack Sharpness: +5% dame/stack
      // Stack reset khi bị parry hoặc khi nhận đòn
      perStack: 0.05,
    },
  },
};

// ─── generateRadoserColor ───────────────────────────────────
// Sinh màu hex duy nhất cho ball theo index, đảm bảo màu kế tiếp luôn cách xa nhau nhất.
// Tham số: index (number) — thứ tự ball (0-based)
// Trả về: string hex — ví dụ '#4a8fc2'
//
// Thuật toán Golden Angle: mỗi index dịch thêm 137.508° trên vòng tròn màu (hue).
// 137.508 = 360° × (1 - 1/φ) với φ = golden ratio ≈ 1.618.
// Kết quả: không bao giờ lặp lại màu dù có hàng trăm ball, và 2 màu liền kề luôn trông khác nhau.
// Saturation 65–89% và Lightness 52–68% → màu tươi sáng, không quá nhạt hay tối.
// Generate a unique ball color using golden-ratio hue distribution
// — guarantees max visual distance between adjacent colors, no repeat ever
function generateRadoserColor(index) {
  const hue = (index * 137.508) % 360;                // golden angle spacing
  const sat = 65 + (index % 4) * 8;                   // 65 / 73 / 81 / 89 %
  const lit = 52 + (index % 3) * 8;                   // 52 / 60 / 68 %
  // Convert HSL → hex so downstream code (eye hash, projectile tint) works correctly
  const h = hue / 360, s = sat / 100, l = lit / 100;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const r = Math.round(hue2rgb(h + 1/3) * 255);
  const g = Math.round(hue2rgb(h)       * 255);
  const b = Math.round(hue2rgb(h - 1/3) * 255);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
