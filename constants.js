
// ============================================================
// CONSTANTS
// ============================================================
const CW = 1000, CH = 1000;
const BALL_R = 24;
const BASE_HP = 100;

// ============================================================
// RANDOM NAME POOL — heroes from Dota2, LoL, Valorant, Overwatch, etc.
// ============================================================
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

// Arena configs — 18 arenas: 3 sizes × 3 shapes × (blank + trap)
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
  med_square_trap:  { type:'square', x:190, y:190, w:620, h:620, size:'medium', label:'M. Square ⚡', traps:{ pillars:3, lightning:1 } },
  med_circle_trap:  { type:'circle', cx:500, cy:500, r:290, size:'medium', label:'M. Circle ⚡', traps:{ pillars:3, lightning:1 } },
  med_rect_trap:    { type:'rect',   x:125, y:250, w:750, h:500, size:'medium', label:'M. Rect ⚡',   traps:{ pillars:3, lightning:1 } },
  med_square_trap2: { type:'square', x:190, y:190, w:620, h:620, size:'medium', label:'M. Square ⚔', traps:{ pillars:3, scythe:true } },
  med_circle_trap2: { type:'circle', cx:500, cy:500, r:290, size:'medium', label:'M. Circle ⚔', traps:{ pillars:3, scythe:true } },
  med_rect_trap2:   { type:'rect',   x:125, y:250, w:750, h:500, size:'medium', label:'M. Rect ⚔',   traps:{ pillars:3, scythe:true } },
  // ── Large (7–12) ──────────────────────────────────────────────────
  large_square: { type:'square', x:90, y:90, w:820, h:820, size:'large', label:'L. Square' },
  large_circle: { type:'circle', cx:500, cy:500, r:370, size:'large', label:'L. Circle' },
  large_rect:   { type:'rect',   x:50, y:175, w:900, h:650, size:'large', label:'L. Rect' },
  large_square_trap: { type:'square', x:90, y:90, w:820, h:820, size:'large', label:'L. Square ⚠', traps:{ pillars:5, scythe:true } },
  large_circle_trap: { type:'circle', cx:500, cy:500, r:370, size:'large', label:'L. Circle ⚠', traps:{ pillars:5, scythe:true } },
  large_rect_trap:   { type:'rect',   x:50, y:175, w:900, h:650, size:'large', label:'L. Rect ⚠',   traps:{ pillars:5, scythe:true } },
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
};

const BALL_COLORS = ['#4488ff', '#ff4455', '#44cc88', '#ffaa22', '#cc44ff', '#ff88aa'];

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
