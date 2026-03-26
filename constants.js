
// ============================================================
// CONSTANTS
// ============================================================
const CW = 800, CH = 800;
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
  square: { type: 'square', x: 100, y: 100, w: 600, h: 600 },
  circle: { type: 'circle', cx: 400, cy: 400, r: 220 },
  rect:   { type: 'rect',   x: 100, y: 200, w: 600, h: 400 },
  cross:  { type: 'cross',  cx: 400, cy: 400, arm: 240, thick: 300 },
  hole:   { type: 'hole',   x: 0,   y: 0,   w: 800, h: 800, holeCx: 400, holeCy: 400, holeR: 70 },
};

const BALL_COLORS = ['#4488ff', '#ff4455', '#44cc88', '#ffaa22', '#cc44ff', '#ff88aa'];
