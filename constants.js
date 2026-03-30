
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

// Arena configs
const ARENAS = {
  square: { type: 'square', x: 200, y: 200, w: 600, h: 600 },
  circle: { type: 'circle', cx: 500, cy: 500, r: 220 },
  rect:   { type: 'rect',   x: 200, y: 300, w: 600, h: 400 },
  cross:  { type: 'cross',  cx: 500, cy: 500, arm: 240, thick: 300 },
  hole:   { type: 'hole',   x: 0,   y: 0,   w: 1000, h: 1000, holeCx: 500, holeCy: 500, holeR: 70 },
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
