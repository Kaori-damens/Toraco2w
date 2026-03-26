
// ============================================================
// AUDIO (Web Audio API — procedural, no files needed)
// ============================================================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;

function getACtx() {
  if (!actx) actx = new AudioCtx();
  return actx;
}

function playTone(freq, type, duration, vol, decay) {
  try {
    const ctx = getACtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * decay, ctx.currentTime + duration);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

function sfxParry()  { playTone(880, 'square', 0.12, 0.25, 0.5); setTimeout(()=>playTone(660,'square',0.1,0.15,0.7),30); }
function sfxHit()    { playTone(200, 'sawtooth', 0.15, 0.3, 0.3); }
function sfxShoot()  { playTone(440, 'sine', 0.08, 0.1, 1.5); }
function sfxDeath()  { playTone(100, 'sawtooth', 0.4, 0.4, 0.2); setTimeout(()=>playTone(60,'square',0.3,0.3,0.5),100); }
function sfxScale()  { playTone(1100, 'sine', 0.15, 0.15, 0.8); }

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
// ============================================================
// WEAPON DEFINITIONS
// ============================================================
const WEAPON_DEFS = [
  {
    id: 'fists', name: 'Fists', icon: '🥊', color: '#ff9944',
    desc: 'Super fast',
    aiType: 'melee',
    baseLength: 22, baseSpeed: 0.22, baseDamage: 2, baseKnockback: 2,
    hitRadius: 11, attackCooldown: 16,
    scaling: { type: 'cooldown', amount: -0.5, min: 8 },
    scalingLabel: 'Speed',
    draw(ctx, ball) {
      const w = ball.weapon;
      const hl = ball.radius + this.baseLength;
      for (let s = 0; s <= 1; s++) {
        const a = w.angle + s * Math.PI;
        const r = hl * (s === 0 ? 1 : 0.72);
        const px = ball.x + Math.cos(a) * r;
        const py = ball.y + Math.sin(a) * r;
        const rad = s === 0 ? 11 : 9;
        // glow on scale
        if (w.hits > 0) {
          ctx.save();
          ctx.shadowColor = '#ff9944';
          ctx.shadowBlur = 6 + w.hits;
          ctx.restore();
        }
        ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI*2);
        ctx.fillStyle = '#ff9944'; ctx.fill();
        ctx.strokeStyle = '#330'; ctx.lineWidth = 2; ctx.stroke();
        // knuckle lines
        ctx.strokeStyle = '#cc6622'; ctx.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) {
          const kx = px + Math.cos(a + Math.PI/2) * (k-1) * 3;
          const ky = py + Math.sin(a + Math.PI/2) * (k-1) * 3;
          ctx.beginPath(); ctx.arc(kx, ky, 2, 0, Math.PI*2); ctx.stroke();
        }
      }
    },
    getHitPoints(ball) {
      // Full blade: from base (ball.radius) to tip (ball.radius + baseLength)
      const w = ball.weapon;
      const bladeStart = ball.radius;
      const bladeEnd   = ball.radius + this.baseLength;
      const N = 5; // points along blade
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const d = bladeStart + (i / N) * (bladeEnd - bladeStart);
        pts.push({ x: ball.x + Math.cos(w.angle)*d, y: ball.y + Math.sin(w.angle)*d, r: 9 });
      }
      return pts;
    },
    onHit(w) {
      w.hits++;
      const cd = Math.max(this.scaling.min, this.attackCooldown + w.hits * this.scaling.amount);
      w.attackCooldown = cd;
      sfxScale();
    }
  },
  {
    id: 'sword', name: 'Sword', icon: '⚔️', color: '#aaddff',
    desc: '+Damage/hit',
    aiType: 'melee',
    baseLength: 50, baseSpeed: 0.055, baseDamage: 1, baseKnockback: 4,
    hitRadius: 8, attackCooldown: 28,
    scaling: { type: 'damage', amount: 1 },
    scalingLabel: 'Damage',
    draw(ctx, ball) {
      const w = ball.weapon;
      const len = ball.radius + this.baseLength;
      const ex = ball.x + Math.cos(w.angle) * len;
      const ey = ball.y + Math.sin(w.angle) * len;
      const bx = ball.x + Math.cos(w.angle) * ball.radius;
      const by = ball.y + Math.sin(w.angle) * ball.radius;
      // glow on scale
      if (w.hits > 0) {
        ctx.save();
        ctx.strokeStyle = `rgba(170,220,255,${Math.min(0.6, w.hits*0.1)})`;
        ctx.lineWidth = 10 + w.hits;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#aaddff';
        ctx.shadowBlur = 8 + w.hits * 2;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.restore();
      }
      // blade
      ctx.save();
      ctx.strokeStyle = '#ddeeff';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // edge highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      const perp = w.angle + Math.PI/2;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(perp)*1.5, by + Math.sin(perp)*1.5);
      ctx.lineTo(ex + Math.cos(perp)*1.5, ey + Math.sin(perp)*1.5);
      ctx.stroke();
      // guard
      const gx = ball.x + Math.cos(w.angle) * (ball.radius + 6);
      const gy = ball.y + Math.sin(w.angle) * (ball.radius + 6);
      ctx.strokeStyle = '#aa8833';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(gx + Math.cos(perp)*12, gy + Math.sin(perp)*12);
      ctx.lineTo(gx - Math.cos(perp)*12, gy - Math.sin(perp)*12);
      ctx.stroke();
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon, len = ball.radius + this.baseLength;
      const mid = ball.radius + this.baseLength * 0.65;
      return [
        { x: ball.x + Math.cos(w.angle)*len,  y: ball.y + Math.sin(w.angle)*len,  r: 8 },
        { x: ball.x + Math.cos(w.angle)*mid, y: ball.y + Math.sin(w.angle)*mid, r: 6 }
      ];
    },
    onHit(w) { w.hits++; w.bonusDamage = (w.bonusDamage||0) + this.scaling.amount; sfxScale(); }
  },
  {
    id: 'dagger', name: 'Dagger', icon: '🗡️', color: '#ffcc44',
    desc: '+Spin/hit',
    aiType: 'melee',
    baseLength: 28, baseSpeed: 0.16, baseDamage: 1, baseKnockback: 2,
    hitRadius: 8, attackCooldown: 18,
    scaling: { type: 'speed', amount: 0.012, max: 0.55 },
    scalingLabel: 'Spin',
    draw(ctx, ball) {
      const w = ball.weapon;
      const len = ball.radius + this.baseLength;
      const ex = ball.x + Math.cos(w.angle) * len;
      const ey = ball.y + Math.sin(w.angle) * len;
      const bx = ball.x + Math.cos(w.angle) * ball.radius;
      const by = ball.y + Math.sin(w.angle) * ball.radius;
      if (w.hits > 0) {
        ctx.save();
        ctx.shadowColor = '#ffcc44';
        ctx.shadowBlur = 5 + w.hits * 2;
        ctx.restore();
      }
      ctx.save();
      // blade
      ctx.strokeStyle = '#ffe077';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // tip triangle
      const tipA = w.angle;
      ctx.fillStyle = '#ffee99';
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(tipA + Math.PI*0.85)*6, ey + Math.sin(tipA + Math.PI*0.85)*6);
      ctx.lineTo(ex + Math.cos(tipA - Math.PI*0.85)*6, ey + Math.sin(tipA - Math.PI*0.85)*6);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon, len = ball.radius + this.baseLength;
      return [{ x: ball.x + Math.cos(w.angle)*len, y: ball.y + Math.sin(w.angle)*len, r: 8 }];
    },
    onHit(w) {
      w.hits++;
      w.spinBonus = Math.min(this.scaling.max, (w.spinBonus||0) + this.scaling.amount);
      sfxScale();
    }
  },
  {
    id: 'spear', name: 'Spear', icon: '🔱', color: '#88ccff',
    desc: '+Length+Dmg/hit',
    aiType: 'melee',
    baseLength: 65, baseSpeed: 0.032, baseDamage: 1, baseKnockback: 5,
    hitRadius: 8, attackCooldown: 38,
    scaling: { type: 'length_damage', lengthAmt: 4, damageAmt: 0.5 },
    scalingLabel: 'Length+Dmg',
    draw(ctx, ball) {
      const w = ball.weapon;
      const bonusLen = (w.bonusLength||0);
      const len = ball.radius + this.baseLength + bonusLen;
      const ex = ball.x + Math.cos(w.angle) * len;
      const ey = ball.y + Math.sin(w.angle) * len;
      const bx = ball.x + Math.cos(w.angle) * (ball.radius - 5);
      const by = ball.y + Math.sin(w.angle) * (ball.radius - 5);
      const tailx = ball.x - Math.cos(w.angle) * (ball.radius + 10);
      const taily = ball.y - Math.sin(w.angle) * (ball.radius + 10);
      if (bonusLen > 0) {
        ctx.save();
        ctx.shadowColor = '#88ccff';
        ctx.shadowBlur = 4 + bonusLen * 0.3;
        ctx.restore();
      }
      ctx.save();
      // shaft
      ctx.strokeStyle = '#cc9944';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tailx, taily); ctx.lineTo(bx, by); ctx.stroke();
      // blade
      ctx.strokeStyle = '#aaddff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // tip
      ctx.fillStyle = '#ddeeff';
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(w.angle + Math.PI*0.8)*10, ey + Math.sin(w.angle + Math.PI*0.8)*10);
      ctx.lineTo(ex + Math.cos(w.angle - Math.PI*0.8)*10, ey + Math.sin(w.angle - Math.PI*0.8)*10);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    getHitPoints(ball) {
      // Full shaft: from base (ball.radius-5) to tip — grows with bonusLength
      const w = ball.weapon;
      const shaftStart = ball.radius - 5;
      const shaftEnd   = ball.radius + this.baseLength + (w.bonusLength || 0);
      const shaftLen   = shaftEnd - shaftStart;
      const N = Math.max(4, Math.ceil(shaftLen / 13)); // dày hơn khi scale dài ra
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const d = shaftStart + (i / N) * shaftLen;
        pts.push({ x: ball.x + Math.cos(w.angle)*d, y: ball.y + Math.sin(w.angle)*d, r: 7 });
      }
      return pts;
    },
    onHit(w) {
      w.hits++;
      w.bonusLength  = (w.bonusLength||0) + this.scaling.lengthAmt;
      w.bonusDamage  = (w.bonusDamage||0) + this.scaling.damageAmt;
      sfxScale();
    }
  },
  {
    id: 'bow', name: 'Bow', icon: '🏹', color: '#88ff88',
    desc: '+Arrows/hit',
    aiType: 'ranged',
    baseLength: 38, baseSpeed: 0.04, baseDamage: 0, baseKnockback: 1,
    hitRadius: 8, attackCooldown: 10,
    arrowDamage: 1, arrowSpeed: 7.5, fireInterval: 130,
    scaling: { type: 'arrows', amount: 1, max: Infinity },
    scalingLabel: 'Arrows',
    draw(ctx, ball) {
      const w = ball.weapon;
      const len = ball.radius + this.baseLength;
      const cx = ball.x + Math.cos(w.angle) * (ball.radius + 6);
      const cy = ball.y + Math.sin(w.angle) * (ball.radius + 6);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(w.angle);
      // bow arc
      ctx.strokeStyle = '#886633';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 22, -Math.PI*0.55, Math.PI*0.55);
      ctx.stroke();
      // string
      const stringTautness = w.fireTimer > 0 ? Math.min(8, w.fireTimer * 0.06) : 0;
      ctx.strokeStyle = '#cccc88';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(22*Math.cos(-Math.PI*0.55), 22*Math.sin(-Math.PI*0.55));
      ctx.lineTo(-stringTautness, 0);
      ctx.lineTo(22*Math.cos(Math.PI*0.55), 22*Math.sin(Math.PI*0.55));
      ctx.stroke();
      // arrow nocked
      if (w.fireTimer < w.fireInterval) {
        ctx.strokeStyle = '#cc9944';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-stringTautness, 0);
        ctx.lineTo(22, 0);
        ctx.stroke();
        ctx.fillStyle = '#ccddaa';
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(16, -4);
        ctx.lineTo(16, 4);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },
    getHitPoints(ball) {
      // Bow body itself (for parry target)
      const w = ball.weapon;
      const cx = ball.x + Math.cos(w.angle) * (ball.radius + 6);
      const cy = ball.y + Math.sin(w.angle) * (ball.radius + 6);
      return [{ x: cx, y: cy, r: 16 }];
    },
    onHit(w) {
      w.hits++;
      w.arrowCount = Math.min((w.arrowCount||1) + this.scaling.amount, this.scaling.max);
      w.arrowSpeedBonus = (w.arrowSpeedBonus||0) + 0.3; // +0.3 arrow speed per hit
      sfxScale();
    }
  },
  {
    id: 'scythe', name: 'Scythe', icon: '🌙', color: '#cc44ff',
    desc: 'Super: dual blades',
    aiType: 'melee',
    baseLength: 48, baseSpeed: 0.045, baseDamage: 1, baseKnockback: 5,
    hitRadius: 18, attackCooldown: 34,
    scaling: { type: 'dual', threshold: 5 },
    scalingLabel: 'Hits→Dual',
    draw(ctx, ball) {
      const w = ball.weapon;
      this._drawBlade(ctx, ball, w.angle, w.hits >= 5);
      if (w.hits >= 5) {
        this._drawBlade(ctx, ball, w.angle + Math.PI, false);
      }
    },
    _drawBlade(ctx, ball, angle, glow) {
      const len = ball.radius + this.baseLength;
      const cx = ball.x + Math.cos(angle) * (ball.radius + 10);
      const cy = ball.y + Math.sin(angle) * (ball.radius + 10);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      if (glow) {
        ctx.shadowColor = '#cc44ff';
        ctx.shadowBlur = 15;
      }
      // shaft
      ctx.strokeStyle = '#553366';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.lineTo(len - ball.radius - 10, 0);
      ctx.stroke();
      // curved blade arc
      ctx.strokeStyle = '#dd77ff';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(28, 0, 22, -Math.PI*0.8, Math.PI*0.3);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(28, -1, 21, -Math.PI*0.75, Math.PI*0.2);
      ctx.stroke();
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon;
      const len = ball.radius + this.baseLength;
      const pts = [];
      // primary blade arc sweep points
      for (let i = -2; i <= 2; i++) {
        const a = w.angle + i * 0.25;
        pts.push({ x: ball.x + Math.cos(a)*(len-8), y: ball.y + Math.sin(a)*(len-8), r: 16 });
      }
      // dual blade
      if (w.hits >= 5) {
        for (let i = -2; i <= 2; i++) {
          const a = w.angle + Math.PI + i * 0.25;
          pts.push({ x: ball.x + Math.cos(a)*(len-8), y: ball.y + Math.sin(a)*(len-8), r: 16 });
        }
      }
      return pts;
    },
    onHit(w) { w.hits++; if (w.hits === 5) sfxScale(); }
  },
  {
    id: 'hammer', name: 'Hammer', icon: '🔨', color: '#ff6633',
    desc: '+Knockback/hit',
    aiType: 'melee',
    baseLength: 38, baseSpeed: 0.028, baseDamage: 1, baseKnockback: 12,
    hitRadius: 14, attackCooldown: 48,
    scaling: { type: 'knockback', amount: 0.8 },
    scalingLabel: 'Knockback',
    draw(ctx, ball) {
      const w = ball.weapon;
      const len = ball.radius + this.baseLength;
      const ex = ball.x + Math.cos(w.angle) * len;
      const ey = ball.y + Math.sin(w.angle) * len;
      const bx = ball.x + Math.cos(w.angle) * (ball.radius + 4);
      const by = ball.y + Math.sin(w.angle) * (ball.radius + 4);
      const kb = (w.bonusKnockback||0);
      if (kb > 0) {
        ctx.save();
        ctx.shadowColor = '#ff6633';
        ctx.shadowBlur = 6 + kb * 1.5;
        ctx.restore();
      }
      ctx.save();
      // handle
      ctx.strokeStyle = '#886633';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // head
      ctx.translate(ex, ey);
      ctx.rotate(w.angle);
      const hw = 14 + Math.min(kb * 0.5, 8);
      const hh = 20 + Math.min(kb, 10);
      ctx.fillStyle = '#cc4422';
      ctx.strokeStyle = '#882211';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-hw/2, -hh/2, hw, hh, 3);
      ctx.fill(); ctx.stroke();
      // shine
      ctx.fillStyle = 'rgba(255,150,100,0.4)';
      ctx.beginPath();
      ctx.roundRect(-hw/2+2, -hh/2+2, hw/2, hh-4, 2);
      ctx.fill();
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon;
      const len = ball.radius + this.baseLength;
      return [{ x: ball.x + Math.cos(w.angle)*len, y: ball.y + Math.sin(w.angle)*len, r: 14 }];
    },
    onHit(w) {
      w.hits++;
      w.bonusKnockback = (w.bonusKnockback||0) + this.scaling.amount;
      sfxScale();
    }
  },
  {
    id: 'shuriken', name: 'Shuriken', icon: '⭐', color: '#44eebb',
    desc: '+Stars/hit',
    aiType: 'ranged',
    baseLength: 30, baseSpeed: 0.04, baseDamage: 0, baseKnockback: 1,
    hitRadius: 10, attackCooldown: 10,
    shurikenDamage: 1, shurikenSpeed: 3, fireInterval: 120, maxBounces: 2,
    scaling: { type: 'count', amount: 1, max: Infinity },
    scalingLabel: 'Count',
    draw(ctx, ball) {
      const w = ball.weapon;
      const len = ball.radius + this.baseLength;
      const cx = ball.x + Math.cos(w.angle) * (ball.radius + 4);
      const cy = ball.y + Math.sin(w.angle) * (ball.radius + 4);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(w.angle + (Date.now() * 0.01));
      ctx.strokeStyle = '#44eebb';
      ctx.fillStyle = '#003322';
      ctx.lineWidth = 2;
      // 4-pointed star
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a)*16, Math.sin(a)*16);
        ctx.lineTo(Math.cos(a + Math.PI*0.25)*7, Math.sin(a + Math.PI*0.25)*7);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon;
      const cx = ball.x + Math.cos(w.angle) * (ball.radius + 4);
      const cy = ball.y + Math.sin(w.angle) * (ball.radius + 4);
      return [{ x: cx, y: cy, r: 14 }];
    },
    onHit(w) {
      w.hits++;
      w.shurikenHitBuffer = (w.shurikenHitBuffer || 0) + 1;
      if (w.shurikenHitBuffer >= 2) {
        w.shurikenHitBuffer = 0;
        w.shurikenCount = Math.min((w.shurikenCount||1) + this.scaling.amount, this.scaling.max);
        sfxScale();
      }
    }
  }
];

const WEAPON_MAP = {};
WEAPON_DEFS.forEach(d => WEAPON_MAP[d.id] = d);
// ============================================================
// PROJECTILE
// ============================================================
class Projectile {
  constructor(x, y, vx, vy, owner, type, damage) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.owner = owner;   // ball reference
    this.type = type;     // 'arrow' | 'shuriken'
    this.damage = damage;
    this.alive = true;
    this.bounces = 0;
    this.maxBounces = type === 'shuriken' ? 2 : 0;
    this.immuneFrames = 5;  // brief immunity so it doesn't hit owner instantly
    this.angle = Math.atan2(vy, vx);
    this.r = type === 'arrow' ? 5 : 8;
  }

  update(arena) {
    if (!this.alive) return;
    this.x += this.vx;
    this.y += this.vy;
    if (this.immuneFrames > 0) this.immuneFrames--;

    // Arena collision
    const hit = checkArenaWall(this.x, this.y, this.r, arena);
    if (hit) {
      if (this.bounces < this.maxBounces) {
        if (hit.nx !== 0) this.vx = -this.vx;
        if (hit.ny !== 0) this.vy = -this.vy;
        this.bounces++;
      } else {
        this.alive = false;
      }
    }
    this.angle = Math.atan2(this.vy, this.vx);
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    if (this.type === 'arrow') {
      ctx.fillStyle = '#cc9944';
      ctx.strokeStyle = '#886622';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-12, -2);
      ctx.lineTo(-12, 2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // fletching
      ctx.fillStyle = '#88bb44';
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-14, -4);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-14, 4);
      ctx.closePath(); ctx.fill();
    } else {
      // shuriken
      ctx.strokeStyle = '#44eebb';
      ctx.fillStyle = '#003322';
      ctx.lineWidth = 2;
      const spin = Date.now() * 0.015;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + spin;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a)*8, Math.sin(a)*8);
        ctx.lineTo(Math.cos(a+Math.PI*0.25)*4, Math.sin(a+Math.PI*0.25)*4);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
  }
}
// ============================================================
// PARTICLES
// ============================================================
const particles = [];

function spawnSparks(x, y, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 4;
    particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      life: 20 + Math.random()*15, maxLife: 35,
      color: `hsl(${40+Math.random()*20},100%,${60+Math.random()*30}%)`,
      r: 2 + Math.random()*2, type: 'spark' });
  }
}

function spawnBlood(x, y, count, dir) {
  for (let i = 0; i < count; i++) {
    const a = dir + (Math.random()-0.5) * Math.PI;
    const sp = 1.5 + Math.random() * 3;
    particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      life: 18 + Math.random()*10, maxLife: 28,
      color: `hsl(0,90%,${40+Math.random()*20}%)`,
      r: 2 + Math.random()*2, type: 'blood' });
  }
}

function spawnDeathExplosion(x, y, color) {
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 6;
    particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      life: 35 + Math.random()*25, maxLife: 60,
      color: i < 15 ? color : `hsl(${Math.random()*360},80%,60%)`,
      r: 3 + Math.random()*5, type: 'death' });
  }
}

// Big centre announcement (Speed Floor, Rage Mode, etc.)
const bigAnnouncements = [];
function spawnBigAnnouncement(text, color) {
  bigAnnouncements.push({ text, color, life: 180, maxLife: 180 });
  // also SFX
  playTone(text.includes('RAGE') ? 220 : 440, 'sawtooth', 0.35, 0.08, 0.4);
}
function updateDrawBigAnnouncements(ctx) {
  for (let i = bigAnnouncements.length - 1; i >= 0; i--) {
    const a = bigAnnouncements[i];
    a.life--;
    if (a.life <= 0) { bigAnnouncements.splice(i, 1); continue; }
    const progress = 1 - a.life / a.maxLife;
    const alpha    = a.life < 40 ? a.life / 40 : 1;
    const scale    = 0.6 + 0.4 * Math.min(1, progress * 4);
    const y        = CH / 2 - 40 - progress * 30;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.floor(38 * scale)}px 'Segoe UI', sans-serif`;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(a.text, CW / 2 + 2, y + 2);
    // glow
    ctx.shadowColor = a.color;
    ctx.shadowBlur  = 18;
    ctx.fillStyle   = a.color;
    ctx.fillText(a.text, CW / 2, y);
    ctx.restore();
  }
}

// ── Weapon scale numeric value (for chart) ──
function getBallScaleVal(ball) {
  const def = ball.weaponDef, w = ball.weapon;
  if (!def || !w) return 0;
  switch (def.id) {
    case 'fists':    return +(w.attackCooldown ?? def.attackCooldown);
    case 'sword':    return +(w.bonusDamage    || 0);
    case 'dagger':   return +((w.spinBonus     || 0) * 100).toFixed(3); // ×100 for readability
    case 'spear':    return +(w.bonusDamage    || 0);
    case 'bow':      return +(w.arrowCount     || 1);
    case 'scythe':   return +(w.hits           || 0);
    case 'hammer':   return +(w.bonusKnockback || 0);
    case 'shuriken': return +(w.shurikenCount  || 1);
    default:         return 0;
  }
}
function getBallScaleUnit(ball) {
  const def = ball.weaponDef;
  if (!def) return '';
  switch (def.id) {
    case 'fists':    return 'CD';
    case 'sword':    return '+dmg';
    case 'dagger':   return 'spin×100';
    case 'spear':    return '+dmg';
    case 'bow':      return 'arrows';
    case 'scythe':   return 'hits(→5)';
    case 'hammer':   return '+kb';
    case 'shuriken': return 'stars';
    default:         return '';
  }
}

// ── Stats Log (per-second charts) ──
let _activeChart = 'speed';

function drawStatsChart(metric) {
  const canvas = document.getElementById('stats-chart-canvas');
  const legendEl = document.getElementById('stats-chart-legend');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 28, right: 18, bottom: 34, left: 52 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#080816';
  ctx.fillRect(0, 0, W, H);

  const data = state.statsLog ?? [];
  if (data.length < 2) {
    ctx.fillStyle = '#445'; ctx.textAlign = 'center';
    ctx.font = '13px sans-serif';
    ctx.fillText('Not enough data', W/2, H/2);
    return;
  }

  // For 'scale' metric, read scaleVal field instead of metric key
  const metricKey = metric === 'scale' ? 'scaleVal' : metric;

  // Collect all values to find max
  let maxVal = 0;
  data.forEach(s => s.balls.forEach(b => { maxVal = Math.max(maxVal, b[metricKey] ?? 0); }));
  maxVal = (maxVal * 1.15) || 1;

  const nSnaps = data.length;
  const xScale = cW / Math.max(1, nSnaps - 1);
  const yScale = cH / maxVal;

  // Grid + Y labels
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + cH - (i / gridLines) * cH;
    const val = (maxVal * i / gridLines);
    ctx.strokeStyle = '#12122a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
    ctx.fillStyle = '#445'; ctx.font = '9px monospace'; ctx.textAlign = 'right';
    ctx.fillText(val >= 1 ? val.toFixed(1) : val.toFixed(3), pad.left - 4, y + 3);
  }

  // X axis + labels
  const tickEvery = Math.max(1, Math.ceil(nSnaps / 10));
  ctx.fillStyle = '#445'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
  data.forEach((s, i) => {
    if (i % tickEvery === 0 || i === nSnaps - 1) {
      const x = pad.left + i * xScale;
      const mm = String(Math.floor(s.second / 60)).padStart(2,'0');
      const ss = String(s.second % 60).padStart(2,'0');
      ctx.fillText(`${mm}:${ss}`, x, H - 4);
      ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + cH); ctx.stroke();
    }
  });

  // Chart title
  const titles = { speed: 'Ball Speed (units/frame)', spin: 'Spin Speed (rad/frame)', dmg: 'Damage Dealt / second', scale: 'Weapon Scale Progress' };
  ctx.fillStyle = '#667'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(titles[metric] ?? metric, W/2, 16);

  // Lines per ball
  const nBalls = data[0]?.balls?.length ?? 0;
  for (let bi = 0; bi < nBalls; bi++) {
    const col = data[0].balls[bi]?.color ?? '#fff';
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.shadowColor = col; ctx.shadowBlur = 4;
    ctx.beginPath();
    let started = false;
    data.forEach((s, i) => {
      const val = s.balls[bi]?.[metricKey] ?? 0;
      const x = pad.left + i * xScale;
      const y = pad.top + cH - val * yScale;
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw dots at each data point
    data.forEach((s, i) => {
      const val = s.balls[bi]?.[metricKey] ?? 0;
      const x = pad.left + i * xScale;
      const y = pad.top + cH - val * yScale;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2); ctx.fill();
    });
  }

  // Axes
  ctx.strokeStyle = '#2a2a4a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + cH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top + cH); ctx.lineTo(pad.left + cW, pad.top + cH); ctx.stroke();

  // Legend
  if (legendEl) {
    legendEl.innerHTML = '';
    for (let bi = 0; bi < nBalls; bi++) {
      const b = data[0].balls[bi];
      if (!b) continue;
      const item = document.createElement('div');
      item.className = 'sc-legend-item';
      const unitSuffix = (metric === 'scale' && b.scaleUnit) ? ` <span style="color:#445">(${b.scaleUnit})</span>` : '';
      item.innerHTML = `<div class="sc-legend-dot" style="background:${b.color}"></div><span>${b.name}${unitSuffix}</span>`;
      legendEl.appendChild(item);
    }
  }
}

function showStatsModal() {
  const modal = document.getElementById('stats-log-modal');
  if (!modal) return;
  modal.classList.add('open');
  _activeChart = 'speed';
  document.querySelectorAll('.sc-tab').forEach(t => t.classList.toggle('sel', t.dataset.chart === _activeChart));
  setTimeout(() => drawStatsChart(_activeChart), 30);
}

// ── Battle Log System ──
function getBallLabel(ball) {
  return ball?.charName ?? ball?.weaponDef?.name ?? 'Unknown';
}

function addBattleLog(type, data) {
  if (!state.battleLog) state.battleLog = [];
  const secs = state.matchTime / 60;
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(Math.floor(secs % 60)).padStart(2, '0');
  state.battleLog.push({ time: `${mm}:${ss}`, type, ...data });
  updateLiveLog();
}

function getBlogText(e) {
  const a = `<b style="color:${e.aColor ?? '#aaa'}">${e.attacker ?? '?'}</b>`;
  const d = `<b style="color:${e.dColor ?? '#aaa'}">${e.defender ?? '?'}</b>`;
  if (e.type === 'hit')
    return `${a} → ${d} <span style="color:#ff8866">-${(+e.damage).toFixed(1)}</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'crit')
    return `${a} → ${d} <span style="color:#ffcc00">CRIT -${(+e.damage).toFixed(1)}</span> <span style="color:#888">(${(+e.baseDmg).toFixed(1)}×${e.critMult})</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'evade')
    return `${a} → ${d} <span style="color:#44ffaa">EVADE</span>`;
  if (e.type === 'parry')
    return `${a} ⚔ ${d} <span style="color:#88aaff">parry</span>`;
  if (e.type === 'parry_fists')
    return `${a} <span style="color:#ff8844">(Fists) parried — took -${(+e.damage).toFixed(1)}</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'proj')
    return `${a} → ${d} <span style="color:#dd88ff">-${(+e.damage).toFixed(1)}</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'proj_crit')
    return `${a} → ${d} <span style="color:#ffcc00">CRIT -${(+e.damage).toFixed(1)}</span> <span style="color:#888">(${(+e.baseDmg).toFixed(1)}×${e.critMult})</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'proj_evade')
    return `${a} → ${d} <span style="color:#44ffaa">EVADE</span>`;
  if (e.type === 'heal')
    return `${a} <span style="color:#55ee88">♥ +${(+e.heal).toFixed(1)} HP</span><span style="color:#667"> [${e.source ?? 'heal'}]</span><span style="color:#888"> HP left: ${(+(e.hpAfter ?? 0)).toFixed(1)}</span>`;
  return '';
}

function updateLiveLog() {
  const el = document.getElementById('live-log-entries');
  if (!el) return;
  const log = state.battleLog ?? [];
  const recent = log.slice(-8); // show last 8 entries
  el.innerHTML = recent.map(e =>
    `<div class="log-line type-${e.type}"><span class="log-time">${e.time}</span>${getBlogText(e)}</div>`
  ).join('');
}

function showBattleLogModal() {
  const modal = document.getElementById('battle-log-modal');
  const scroll = document.getElementById('battle-log-scroll');
  if (!modal || !scroll) return;
  const log = state.battleLog ?? [];
  if (log.length === 0) {
    scroll.innerHTML = '<div style="color:#445;padding:12px">No events recorded.</div>';
  } else {
    scroll.innerHTML = log.map(e =>
      `<div class="blog-line type-${e.type}">
        <span class="blog-time">${e.time}</span>
        <span class="blog-text">${getBlogText(e)}</span>
      </div>`
    ).join('');
  }
  modal.classList.add('open');
  // Scroll to bottom
  setTimeout(() => { scroll.scrollTop = scroll.scrollHeight; }, 50);
}

function spawnDamageNumber(x, y, num, color) {
  const text = typeof num === 'string' ? num : `-${Math.round(num)}`;
  particles.push({ x, y: y-10, vx: (Math.random()-0.5)*1.5, vy: -2,
    life: 55, maxLife: 55,
    text, color, type: 'num', r: 0 });
}

function updateParticles() {
  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    p.life--;
    p.x += p.vx; p.y += p.vy;
    if (p.type !== 'num') {
      p.vy += 0.08;
      p.vx *= 0.94;
    }
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles(ctx) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    if (p.type === 'num') {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold 14px Arial Black`;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }
}
// ============================================================
// ARENA HELPERS
// ============================================================
function checkArenaWall(x, y, r, arena) {
  if (arena.type === 'circle') {
    const dx = x - arena.cx, dy = y - arena.cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist + r > arena.r) {
      const nx = dx/dist, ny = dy/dist;
      return { nx, ny };
    }
  } else if (arena.type === 'square' || arena.type === 'rect') {
    if (x - r < arena.x) return { nx: -1, ny: 0 };
    if (x + r > arena.x + arena.w) return { nx: 1, ny: 0 };
    if (y - r < arena.y) return { nx: 0, ny: -1 };
    if (y + r > arena.y + arena.h) return { nx: 0, ny: 1 };
  } else if (arena.type === 'cross') {
    // Cross: center rect + horizontal arm + vertical arm
    const cx = arena.cx, cy = arena.cy;
    const arm = arena.arm, thick = arena.thick;
    const inH = (x >= cx-arm && x <= cx+arm && y >= cy-thick/2 && y <= cy+thick/2);
    const inV = (x >= cx-thick/2 && x <= cx+thick/2 && y >= cy-arm && y <= cy+arm);
    if (!inH && !inV) {
      // Push toward nearest valid area
      const clampedX = Math.max(cx-arm, Math.min(cx+arm, x));
      const clampedY = Math.max(cy-thick/2, Math.min(cy+thick/2, y));
      const dx = x - clampedX, dy = y - clampedY;
      const dist = Math.sqrt(dx*dx+dy*dy);
      if (dist > 0) return { nx: -dx/dist, ny: -dy/dist };
    }
    // Wall checks for cross arms
    if (inH) {
      if (x - r < cx-arm) return { nx: -1, ny: 0 };
      if (x + r > cx+arm) return { nx: 1, ny: 0 };
      if (y - r < cy-thick/2) return { nx: 0, ny: -1 };
      if (y + r > cy+thick/2) return { nx: 0, ny: 1 };
    }
    if (inV) {
      if (x - r < cx-thick/2) return { nx: -1, ny: 0 };
      if (x + r > cx+thick/2) return { nx: 1, ny: 0 };
      if (y - r < cy-arm) return { nx: 0, ny: -1 };
      if (y + r > cy+arm) return { nx: 0, ny: 1 };
    }
  } else if (arena.type === 'hole') {
    // Outer square walls
    if (x - r < arena.x) return { nx: -1, ny: 0 };
    if (x + r > arena.x + arena.w) return { nx: 1, ny: 0 };
    if (y - r < arena.y) return { nx: 0, ny: -1 };
    if (y + r > arena.y + arena.h) return { nx: 0, ny: 1 };
    // Inner circular hole — ball bounces outward
    const hdx = x - arena.holeCx, hdy = y - arena.holeCy;
    const hdist = Math.sqrt(hdx*hdx + hdy*hdy);
    if (hdist < arena.holeR + r && hdist > 0) {
      return { nx: hdx/hdist, ny: hdy/hdist };
    }
  }
  return null;
}

// How much speed is kept after bouncing off a wall (1.0 = elastic, 0 = inelastic)
const WALL_BOUNCE = 1.0;

function clampToBall(ball, arena) {
  const r = ball.radius;
  if (arena.type === 'circle') {
    const dx = ball.x - arena.cx, dy = ball.y - arena.cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const maxDist = arena.r - r;
    if (dist > maxDist) {
      const nx = dx/dist, ny = dy/dist;
      // Snap ball to wall surface
      ball.x = arena.cx + nx * maxDist;
      ball.y = arena.cy + ny * maxDist;
      // Reflect velocity: remove outward component, add (1+restitution)×it back inward
      const dot = ball.vx*nx + ball.vy*ny;
      if (dot > 0) {
        ball.vx -= dot * nx * (1 + WALL_BOUNCE);
        ball.vy -= dot * ny * (1 + WALL_BOUNCE);
      }
    }
  } else if (arena.type === 'square' || arena.type === 'rect') {
    if (ball.x - r < arena.x)           { ball.x = arena.x + r;             ball.vx =  Math.abs(ball.vx) * WALL_BOUNCE; }
    if (ball.x + r > arena.x + arena.w) { ball.x = arena.x + arena.w - r;   ball.vx = -Math.abs(ball.vx) * WALL_BOUNCE; }
    if (ball.y - r < arena.y)           { ball.y = arena.y + r;             ball.vy =  Math.abs(ball.vy) * WALL_BOUNCE; }
    if (ball.y + r > arena.y + arena.h) { ball.y = arena.y + arena.h - r;   ball.vy = -Math.abs(ball.vy) * WALL_BOUNCE; }
  } else if (arena.type === 'cross') {
    const cx = arena.cx, cy = arena.cy, arm = arena.arm, thick = arena.thick;
    // Outer bounds
    if (ball.x < cx-arm+r) { ball.x = cx-arm+r; ball.vx =  Math.abs(ball.vx)*WALL_BOUNCE; }
    if (ball.x > cx+arm-r) { ball.x = cx+arm-r; ball.vx = -Math.abs(ball.vx)*WALL_BOUNCE; }
    if (ball.y < cy-arm+r) { ball.y = cy-arm+r; ball.vy =  Math.abs(ball.vy)*WALL_BOUNCE; }
    if (ball.y > cy+arm-r) { ball.y = cy+arm-r; ball.vy = -Math.abs(ball.vy)*WALL_BOUNCE; }
    // Keep inside cross shape
    const inH = (ball.y > cy-thick/2+r && ball.y < cy+thick/2-r);
    const inV = (ball.x > cx-thick/2+r && ball.x < cx+thick/2-r);
    if (!inH && !inV) {
      ball.vx += (cx - ball.x) * 0.07;
      ball.vy += (cy - ball.y) * 0.07;
    }
  } else if (arena.type === 'hole') {
    // Outer square walls
    if (ball.x - r < arena.x)           { ball.x = arena.x + r;           ball.vx =  Math.abs(ball.vx) * WALL_BOUNCE; }
    if (ball.x + r > arena.x + arena.w) { ball.x = arena.x + arena.w - r; ball.vx = -Math.abs(ball.vx) * WALL_BOUNCE; }
    if (ball.y - r < arena.y)           { ball.y = arena.y + r;           ball.vy =  Math.abs(ball.vy) * WALL_BOUNCE; }
    if (ball.y + r > arena.y + arena.h) { ball.y = arena.y + arena.h - r; ball.vy = -Math.abs(ball.vy) * WALL_BOUNCE; }
    // Inner circular hole — bounce outward
    const hdx = ball.x - arena.holeCx, hdy = ball.y - arena.holeCy;
    const hdist = Math.sqrt(hdx*hdx + hdy*hdy);
    const minHoleDist = arena.holeR + r;
    if (hdist < minHoleDist && hdist > 0) {
      const hnx = hdx/hdist, hny = hdy/hdist;
      ball.x = arena.holeCx + hnx * minHoleDist;
      ball.y = arena.holeCy + hny * minHoleDist;
      const dot = ball.vx*hnx + ball.vy*hny;
      if (dot < 0) {
        ball.vx -= dot * hnx * (1 + WALL_BOUNCE);
        ball.vy -= dot * hny * (1 + WALL_BOUNCE);
      }
    }
  }
}

// Returns a consistent eye color for a ball, hashed from its color string
function getEyeColor(ball) {
  const EYE_PALETTE = [
    '#44ffaa', '#ff4455', '#44aaff', '#ffdd22', '#cc44ff',
    '#ff8822', '#22ddff', '#ff44cc', '#88ff33', '#ff6666',
    '#33ffee', '#ffaa44', '#aaffdd', '#ff88ff', '#aaff44',
  ];
  const hex = ball.color || '#ffffff';
  let h = 0;
  for (let i = 0; i < hex.length; i++) h = (h * 31 + hex.charCodeAt(i)) & 0xffff;
  return EYE_PALETTE[h % EYE_PALETTE.length];
}

// ═══════════════════════════════════════════════════════════════
// RACE DECORATION RENDERER
// Draws cosmetic decorations around ball based on race.
// Hitbox (ball.radius circle) is NEVER changed here.
// Coordinate system after ctx.rotate(fa):
//   +X = forward (movement direction)   -X = back (tail)
//   ±Y = sides (horns, ears, wings)     -Y = above-head (hat, halo)
// ═══════════════════════════════════════════════════════════════
function drawRaceDecoration(ctx, ball) {
  if (!ball.charRace) return;
  const raceId = typeof ball.charRace === 'object' ? ball.charRace.id : ball.charRace;
  if (!raceId) return;

  const r  = ball.radius;
  const spd = Math.hypot(ball.vx, ball.vy);
  const fa  = spd > 0.3 ? Math.atan2(ball.vy, ball.vx) : (ball._deco_fa ?? 0);
  if (spd > 0.3) ball._deco_fa = fa;

  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  // Helper: draw two minimalist anime-style eyes facing +X
  // Elongated horizontal oval, gradient dark→light, no pupil/iris detail
  function eyes(_, __, glowCol) {
    const eyeC = getEyeColor(ball);

    // Parse hex → rgb for gradient construction
    const hex = eyeC.replace('#','');
    const er = parseInt(hex.slice(0,2),16), eg = parseInt(hex.slice(2,4),16), eb = parseInt(hex.slice(4,6),16);
    const lighten = (v,a) => Math.min(255, v+a);
    const darken  = (v,a) => Math.max(0,   v-a);

    const ew = r * 0.21;  // half-width  (landscape oval, wide)
    const eh = r * 0.085; // half-height (flat)
    const ex = r * 0.46;  // forward position on face

    for (const eyY of [-r*0.20, r*0.20]) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, eyY, ew, eh, 0, 0, Math.PI*2);

      // Vertical gradient: lighter top → darker bottom (light from above)
      const grad = ctx.createLinearGradient(ex, eyY - eh, ex, eyY + eh);
      grad.addColorStop(0,   `rgba(${lighten(er,70)},${lighten(eg,70)},${lighten(eb,70)},0.90)`);
      grad.addColorStop(0.45,`rgba(${er},${eg},${eb},0.88)`);
      grad.addColorStop(1,   `rgba(${darken(er,45)},${darken(eg,45)},${darken(eb,45)},0.78)`);

      ctx.fillStyle = grad;
      ctx.fill();

      // Thin blurred border — gives the "hazy anime" outline
      ctx.shadowColor = glowCol || eyeC;
      ctx.shadowBlur  = glowCol ? 8 : 4;
      ctx.strokeStyle = `rgba(${er},${eg},${eb},0.45)`;
      ctx.lineWidth   = 1.0;
      ctx.stroke();

      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  // ── Override check: key present in _raceAssetOverrides → use it (even if empty = no deco) ──
  if (window._raceAssetOverrides && Object.prototype.hasOwnProperty.call(window._raceAssetOverrides, raceId)) {
    const _overrideShapes = window._raceAssetOverrides[raceId];

    // Angel special: golden glowing halo (world-space, shadowBlur not supported in aeDrawShape)
    if (raceId === 'angel') {
      ctx.strokeStyle = '#ffdd33'; ctx.lineWidth = 3;
      ctx.shadowColor = '#ffee55'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.ellipse(0, -r*1.55, r*0.56, r*0.17, 0, 0, Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.rotate(fa); eyes(); ctx.restore(); return;
    }

    ctx.rotate(fa);
    for (const _s of (_overrideShapes || [])) {
      if (_s.visible === false) continue;
      aeDrawShape(ctx, _s, r);
    }
    if (raceId !== 'skeleton') eyes();  // skeleton has custom sockets — no anime eyes
    ctx.restore();
    return;
  }

  switch (raceId) {

    // ── GOBLIN ──────────────────────────────────────────────────────────
    case 'goblin': {
      ctx.rotate(fa);
      ctx.fillStyle = '#4a7a20'; ctx.strokeStyle = '#2a4a10'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        // Big pointy ear
        ctx.beginPath();
        ctx.moveTo(-r*0.15, s*r*0.78);
        ctx.lineTo(-r*0.50, s*r*1.65);
        ctx.lineTo( r*0.45, s*r*1.55);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Inner ear pink flush
        ctx.fillStyle = '#ff8888';
        ctx.beginPath();
        ctx.moveTo(-r*0.10, s*r*0.86);
        ctx.lineTo(-r*0.35, s*r*1.45);
        ctx.lineTo( r*0.24, s*r*1.38);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4a7a20'; ctx.strokeStyle = '#2a4a10'; ctx.lineWidth = 1.5;
      }
      eyes('#ffdd00', '#000');
      break;
    }

    // ── GNOME ────────────────────────────────────────────────────────────
    case 'gnome': {
      ctx.rotate(fa);
      // Hat brim
      ctx.fillStyle = '#773311'; ctx.strokeStyle = '#552200'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(r*0.05, -r*0.95, r*0.62, r*0.18, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      // Hat cone
      ctx.fillStyle = '#cc6633'; ctx.strokeStyle = '#883311'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r*0.55, -r*0.97);
      ctx.lineTo( r*0.05, -r*2.25);
      ctx.lineTo( r*0.65, -r*0.97);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Hat band
      ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(r*0.05, -r*1.06, r*0.55, r*0.15, 0, 0, Math.PI*2); ctx.stroke();
      eyes('#fff', '#3366ff');
      break;
    }

    // ── HUMAN ────────────────────────────────────────────────────────────
    case 'human': {
      ctx.rotate(fa);
      // Hair strands above (-Y)
      ctx.strokeStyle = '#8B5E3C'; ctx.lineWidth = 3;
      [-r*0.42, -r*0.2, r*0.06, r*0.28, r*0.48].forEach((hy, i) => {
        ctx.beginPath();
        ctx.moveTo(hy * 0.65, -r*0.88);
        ctx.quadraticCurveTo(hy + r*0.04*(i-2), -r*1.22, hy + r*0.06*(i-2), -r*1.46);
        ctx.stroke();
      });
      eyes('#fff', '#553311');
      break;
    }

    // ── DWARF ────────────────────────────────────────────────────────────
    case 'dwarf': {
      ctx.rotate(fa);
      // Thick beard at back (-X)
      ctx.fillStyle = '#cc8833'; ctx.strokeStyle = '#996622'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r*0.72, -r*0.52);
      ctx.bezierCurveTo(-r*1.75, -r*0.55, -r*2.05,  r*0.0, -r*1.75,  r*0.55);
      ctx.lineTo(-r*0.72,  r*0.52);
      ctx.bezierCurveTo(-r*1.1, r*0.28, -r*1.1, -r*0.28, -r*0.72, -r*0.52);
      ctx.fill(); ctx.stroke();
      // Braid lines
      ctx.strokeStyle = '#aa6611'; ctx.lineWidth = 1.3;
      [-r*1.1, -r*1.35, -r*1.6].forEach(bx => {
        ctx.beginPath(); ctx.moveTo(bx, -r*0.22); ctx.lineTo(bx - r*0.08, r*0.22); ctx.stroke();
      });
      // Metal helmet ridge
      ctx.fillStyle = '#aaaaaa'; ctx.strokeStyle = '#666'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(r*0.05, -r*0.93, r*0.58, r*0.18, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      eyes('#fff', '#224488');
      break;
    }

    // ── SKELETON ─────────────────────────────────────────────────────────
    case 'skeleton': {
      ctx.rotate(fa);
      // Eye sockets
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(r*0.43, -r*0.27, r*0.20, r*0.16, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r*0.43,  r*0.27, r*0.20, r*0.16, 0, 0, Math.PI*2); ctx.fill();
      // Nose triangle
      ctx.beginPath();
      ctx.moveTo(r*0.70,  0);
      ctx.lineTo(r*0.60, -r*0.10);
      ctx.lineTo(r*0.60,  r*0.10);
      ctx.closePath(); ctx.fill();
      // Teeth
      ctx.fillStyle = '#e8e8d8'; ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
      for (let t = -1; t <= 1; t++) {
        ctx.beginPath();
        ctx.rect(r*0.76, t*r*0.22 - r*0.10, r*0.17, r*0.19);
        ctx.fill(); ctx.stroke();
      }
      // Forehead crack
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(r*0.22, -r*0.66);
      ctx.lineTo(r*0.42, -r*0.46);
      ctx.lineTo(r*0.32, -r*0.30);
      ctx.stroke();
      break;
    }

    // ── TROLL ────────────────────────────────────────────────────────────
    case 'troll': {
      ctx.rotate(fa);
      // Messy spiky hair above (-Y)
      ctx.strokeStyle = '#556633'; ctx.lineWidth = 3;
      [-r*0.46, -r*0.22, 0, r*0.22, r*0.46].forEach((hy, i) => {
        const bend = (i - 2) * r * 0.12;
        ctx.beginPath();
        ctx.moveTo(hy * 0.7, -r*0.88);
        ctx.quadraticCurveTo(hy + bend, -r*1.32, hy + bend*0.5, -r*1.62 - Math.abs(i-2)*r*0.06);
        ctx.stroke();
      });
      // Small blunt horns on sides (±Y)
      ctx.fillStyle = '#776644'; ctx.strokeStyle = '#554422'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(r*0.10, s*r*0.80);
        ctx.quadraticCurveTo(r*0.35, s*r*1.32, r*0.05, s*r*1.58);
        ctx.quadraticCurveTo(-r*0.10, s*r*1.22, r*0.00, s*r*0.86);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // Bulbous nose front (+X)
      ctx.fillStyle = '#5a7a38'; ctx.strokeStyle = '#3a5520'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(r*0.86, 0, r*0.22, r*0.17, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      eyes('#ffcc00', '#000');
      break;
    }

    // ── ORC ──────────────────────────────────────────────────────────────
    case 'orc': {
      ctx.rotate(fa);
      // Upward tusks (±Y, front-ish)
      ctx.fillStyle = '#eeeebb'; ctx.strokeStyle = '#aaaa77'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(r*0.60,  s*r*0.18);
        ctx.quadraticCurveTo(r*1.05, s*r*0.44, r*0.90, s*r*0.74);
        ctx.quadraticCurveTo(r*0.77, s*r*0.50, r*0.71, s*r*0.22);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // Heavy brow ridges
      ctx.strokeStyle = '#1a1200'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(r*0.25, -r*0.44); ctx.lineTo(r*0.62, -r*0.36); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r*0.25,  r*0.44); ctx.lineTo(r*0.62,  r*0.36); ctx.stroke();
      eyes('#ff2200', '#000');
      break;
    }

    // ── GIANT ────────────────────────────────────────────────────────────
    case 'giant': {
      // Stone crack texture — world-space (no rotation with movement)
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
      [ [[ 0.10,-0.56],[ 0.28,-0.18],[ 0.12, 0.14]],
        [[-0.30, 0.35],[-0.05, 0.65]],
        [[ 0.40, 0.16],[ 0.65, 0.38],[ 0.82, 0.18]],
        [[-0.55,-0.30],[-0.77,-0.06]] ].forEach(c => {
        ctx.beginPath(); ctx.moveTo(c[0][0]*r, c[0][1]*r);
        for (let i=1;i<c.length;i++) ctx.lineTo(c[i][0]*r, c[i][1]*r);
        ctx.stroke();
      });
      // Stone pebble highlights
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      [[0.22,-0.38,0.10],[-0.44,0.20,0.08],[0.55,0.30,0.07]].forEach(([x,y,s]) => {
        ctx.beginPath(); ctx.arc(x*r, y*r, s*r, 0, Math.PI*2); ctx.fill();
      });
      // Eyes face movement direction
      ctx.save(); ctx.rotate(fa); eyes('#ff9922', '#000'); ctx.restore();
      break;
    }

    // ── DRAGON ───────────────────────────────────────────────────────────
    case 'dragon': {
      ctx.rotate(fa);
      const srLabel = typeof ball.charSubrace === 'object' ? ball.charSubrace?.label : ball.charSubrace;
      const dc = ({ Crimson:'#dd2200',Stone:'#888',Amethyst:'#9922bb',Ancient:'#887722',
                    Undead:'#558855',Zephyrian:'#33aacc',Tideborn:'#1155bb',Thunder:'#cccc00',
                    Flame:'#ff5500',Ice:'#99ddff',Chaos:'#ee22ee' })[srLabel] ?? '#cc3300';
      // Curved horns on sides (±Y)
      ctx.fillStyle = dc; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo( r*0.15, s*r*0.78);
        ctx.bezierCurveTo(r*0.50, s*r*1.30, r*0.30, s*r*1.82, r*0.00, s*r*1.88);
        ctx.bezierCurveTo(-r*0.20, s*r*1.70, -r*0.05, s*r*1.22, r*0.10, s*r*0.82);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // Wagging tail at back (-X)
      const wag = Math.sin(Date.now()*0.004) * r*0.32;
      ctx.strokeStyle = dc; ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-r*0.85, 0);
      ctx.quadraticCurveTo(-r*1.55, wag, -r*1.92, wag*0.55);
      ctx.stroke();
      // Arrow tail tip
      ctx.fillStyle = dc;
      ctx.save();
      ctx.translate(-r*1.92, wag*0.55);
      ctx.rotate(Math.atan2(wag*0.55, -r*0.37));
      ctx.beginPath(); ctx.moveTo(r*0.18,0); ctx.lineTo(-r*0.10,-r*0.13); ctx.lineTo(-r*0.10,r*0.13); ctx.closePath(); ctx.fill();
      ctx.restore();
      // Scale arc marks
      ctx.strokeStyle = dc+'aa'; ctx.lineWidth = 1.3;
      [[-0.25,-0.46],[0.06,-0.63],[-0.25,0.46],[0.06,0.63],[0.33,0.0]].forEach(([x,y]) => {
        ctx.beginPath(); ctx.arc(x*r, y*r, r*0.18, Math.PI*0.12, Math.PI*0.88); ctx.stroke();
      });
      eyes('#ffaa00', '#000');
      break;
    }

    // ── ANGEL ────────────────────────────────────────────────────────────
    case 'angel': {
      ctx.rotate(fa);
      // Wings on sides (±Y)
      for (const s of [-1, 1]) {
        ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle = 'rgba(200,200,170,0.9)'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo( r*0.35, s*r*0.78);
        ctx.bezierCurveTo(r*0.05, s*r*1.58, -r*0.55, s*r*1.68, -r*0.66, s*r*1.12);
        ctx.bezierCurveTo(-r*0.30, s*r*0.90,  r*0.10, s*r*0.84,  r*0.30, s*r*0.80);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Feather detail
        ctx.strokeStyle = 'rgba(180,180,160,0.55)'; ctx.lineWidth = 1;
        [[0.30,0.86,-0.06,1.12],[0.00,1.06,-0.26,1.32],[-0.36,1.12,-0.56,1.30]].forEach(([x1,y1,x2,y2]) => {
          ctx.beginPath(); ctx.moveTo(x1*r, s*y1*r); ctx.lineTo(x2*r, s*y2*r); ctx.stroke();
        });
      }
      // Halo — always screen-up, world-space
      ctx.restore(); ctx.save(); ctx.translate(ball.x, ball.y);
      ctx.strokeStyle = '#ffdd33'; ctx.lineWidth = 3;
      ctx.shadowColor = '#ffee55'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.ellipse(0, -r*1.55, r*0.56, r*0.17, 0, 0, Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.rotate(fa); eyes('#ccddff', '#336699');
      break;
    }

    // ── PRIMORDIAL BEING ─────────────────────────────────────────────────
    case 'primordial': {
      // Orbiting cosmic dots — world-space
      const t = Date.now() * 0.0012;
      ['#6699ff','#ff55aa','#55ffdd'].forEach((c, i) => {
        const a = t*(1.4 + i*0.35) + i*(Math.PI*2/3);
        ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(Math.cos(a)*r*1.44, Math.sin(a)*r*1.44, r*0.13, 0, Math.PI*2); ctx.fill();
      });
      ctx.shadowBlur = 0;
      // Swirl arcs
      const t2 = Date.now() * 0.0008;
      ctx.strokeStyle = 'rgba(110,150,255,0.55)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(0, 0, r*0.52, t2*2, t2*2 + Math.PI*1.3); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,90,190,0.45)';
      ctx.beginPath(); ctx.arc(0, 0, r*0.74, -t2*1.5, -t2*1.5 + Math.PI*1.5); ctx.stroke();
      // Eyes (face direction)
      ctx.save(); ctx.rotate(fa); eyes('#bbddff', '#334499', '#8899ff'); ctx.restore();
      break;
    }

    // ── DEMON ────────────────────────────────────────────────────────────
    case 'demon': {
      ctx.rotate(fa);
      // Dark aura ring
      ctx.strokeStyle = 'rgba(180,0,0,0.28)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, r*1.18, 0, Math.PI*2); ctx.stroke();
      // Sharp tall horns on sides (±Y)
      ctx.fillStyle = '#cc1100'; ctx.strokeStyle = '#880000'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(r*0.10, s*r*0.78);
        ctx.lineTo(r*0.28, s*r*1.80);
        ctx.lineTo(r*0.52, s*r*0.84);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Horn highlight edge
        ctx.fillStyle = '#ff3322';
        ctx.beginPath();
        ctx.moveTo(r*0.15, s*r*0.82);
        ctx.lineTo(r*0.22, s*r*1.56);
        ctx.lineTo(r*0.33, s*r*0.87);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#cc1100'; ctx.strokeStyle = '#880000'; ctx.lineWidth = 1.5;
      }
      // Swinging devil tail at back (-X)
      const sw = Math.sin(Date.now()*0.005) * r*0.42;
      ctx.strokeStyle = '#cc1100'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-r*0.85, 0);
      ctx.quadraticCurveTo(-r*1.52, sw, -r*1.52, sw + r*0.88);
      ctx.stroke();
      // Diamond arrowhead
      ctx.fillStyle = '#cc1100';
      ctx.save();
      ctx.translate(-r*1.52, sw + r*0.88);
      ctx.rotate(Math.PI * 0.22);
      ctx.beginPath(); ctx.moveTo(r*0.18,0); ctx.lineTo(-r*0.12,-r*0.12); ctx.lineTo(-r*0.05,0); ctx.lineTo(-r*0.12,r*0.12); ctx.closePath(); ctx.fill();
      ctx.restore();
      eyes('#ff1100', '#ffcc00', '#ff0000');
      break;
    }

    // ── GOD ──────────────────────────────────────────────────────────────
    case 'god': {
      // Pulsing golden rays — world-space, always rotating
      const tg = Date.now() * 0.0009;
      for (let i=0; i<8; i++) {
        const a = (i/8)*Math.PI*2 + tg;
        const pulse = 0.55 + 0.45*Math.sin(tg*3 + i*1.1);
        ctx.strokeStyle = `rgba(255,215,0,${0.70*pulse})`;
        ctx.lineWidth = 1.6 + pulse*1.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*r*1.26, Math.sin(a)*r*1.26);
        ctx.lineTo(Math.cos(a)*r*(1.74 + pulse*0.24), Math.sin(a)*r*(1.74 + pulse*0.24));
        ctx.stroke();
      }
      // Golden halo ring
      ctx.strokeStyle = 'rgba(255,215,0,0.78)'; ctx.lineWidth = 3;
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(0, 0, r*1.22, 0, Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
      // Eyes face movement direction
      ctx.save(); ctx.rotate(fa); eyes('#fff8cc', '#ff9900', '#ffee44'); ctx.restore();
      break;
    }

  } // end switch

  ctx.restore();
}

function drawArena(ctx, arena) {
  ctx.save();
  ctx.fillStyle = '#0e0e22';
  if (arena.type === 'circle') {
    ctx.beginPath();
    ctx.arc(arena.cx, arena.cy, arena.r, 0, Math.PI*2);
    ctx.fill();
    // border
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 3;
    ctx.stroke();
    // grid dots
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      for (let d = 50; d < arena.r; d += 50) {
        ctx.beginPath(); ctx.arc(arena.cx+Math.cos(a)*d, arena.cy+Math.sin(a)*d, 2, 0, Math.PI*2); ctx.fill();
      }
    }
  } else if (arena.type === 'square' || arena.type === 'rect') {
    ctx.roundRect(arena.x, arena.y, arena.w, arena.h, arena.type === 'square' ? 8 : 4);
    ctx.fill();
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 3;
    ctx.roundRect(arena.x, arena.y, arena.w, arena.h, arena.type === 'square' ? 8 : 4);
    ctx.stroke();
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let gx = arena.x + 50; gx < arena.x+arena.w; gx += 50) {
      ctx.beginPath(); ctx.moveTo(gx, arena.y); ctx.lineTo(gx, arena.y+arena.h); ctx.stroke();
    }
    for (let gy = arena.y + 50; gy < arena.y+arena.h; gy += 50) {
      ctx.beginPath(); ctx.moveTo(arena.x, gy); ctx.lineTo(arena.x+arena.w, gy); ctx.stroke();
    }
  } else if (arena.type === 'cross') {
    const cx = arena.cx, cy = arena.cy, arm = arena.arm, thick = arena.thick;
    ctx.beginPath();
    ctx.rect(cx-arm, cy-thick/2, arm*2, thick);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(cx-thick/2, cy-arm, thick, arm*2);
    ctx.fill();
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(cx-arm, cy-thick/2, arm*2, thick);
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(cx-thick/2, cy-arm, thick, arm*2);
    ctx.stroke();
  } else if (arena.type === 'hole') {
    // Fill square minus circular hole (even-odd rule)
    ctx.save();
    ctx.fillRule = 'evenodd';
    ctx.beginPath();
    ctx.rect(arena.x, arena.y, arena.w, arena.h);
    ctx.arc(arena.holeCx, arena.holeCy, arena.holeR, 0, Math.PI*2, true);
    ctx.fill('evenodd');
    // Outer border
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 3;
    ctx.strokeRect(arena.x, arena.y, arena.w, arena.h);
    // Inner hole border — glowing edge
    ctx.strokeStyle = '#4a2a6a';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#8844ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(arena.holeCx, arena.holeCy, arena.holeR, 0, Math.PI*2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Grid (clipped to arena minus hole)
    ctx.beginPath();
    ctx.rect(arena.x, arena.y, arena.w, arena.h);
    ctx.arc(arena.holeCx, arena.holeCy, arena.holeR, 0, Math.PI*2, true);
    ctx.clip('evenodd');
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let gx = arena.x + 50; gx < arena.x+arena.w; gx += 50) {
      ctx.beginPath(); ctx.moveTo(gx, arena.y); ctx.lineTo(gx, arena.y+arena.h); ctx.stroke();
    }
    for (let gy = arena.y + 50; gy < arena.y+arena.h; gy += 50) {
      ctx.beginPath(); ctx.moveTo(arena.x, gy); ctx.lineTo(arena.x+arena.w, gy); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}
// ============================================================
// SKILL SYSTEM
// ============================================================
const SKILL_DEFS = [
  // ── PASSIVE (always active) ──────────────────────────────
  { id: 'iron_body',          name: 'Iron Body',          icon: '🛡️', type: 'passive',    desc: '+20 max HP' },
  { id: 'thick_hide',         name: 'Thick Hide',         icon: '🦏', type: 'passive',    desc: '-10% damage received' },
  { id: 'swift',              name: 'Swift',              icon: '💨', type: 'passive',    desc: '+15% movement speed cap' },
  { id: 'sharp_eye',          name: 'Sharp Eye',          icon: '👁️', type: 'passive',    desc: '+10% crit chance' },
  { id: 'extended_immunity',  name: 'Extended Immunity',  icon: '✨', type: 'passive',    desc: 'Hit immunity: 18 → 30 frames' },
  { id: 'heavy_mass',         name: 'Heavy Mass',         icon: '⚓', type: 'passive',    desc: '+30% mass (less knockback)' },
  // ── PRE-COMBAT (triggers once at round start) ────────────
  { id: 'war_cry',    name: 'War Cry',    icon: '📢', type: 'pre_combat', desc: 'First hit this round deals 2× damage' },
  { id: 'fortify',    name: 'Fortify',    icon: '🏰', type: 'pre_combat', desc: 'Start with a 1-hit absorption shield' },
  { id: 'adrenaline', name: 'Adrenaline', icon: '⚡', type: 'pre_combat', desc: 'First 5s: +50% movement speed' },
  { id: 'predator',   name: 'Predator',   icon: '🦅', type: 'pre_combat', desc: '+15% damage when target has less HP' },
  { id: 'first_blood',name: 'First Blood',icon: '🩸', type: 'pre_combat', desc: 'First hit of round stuns opponent 30 frames' },
  // ── IN-COMBAT (reactive event hooks) ────────────────────
  { id: 'berserker',   name: 'Berserker',   icon: '😤', type: 'in_combat', desc: '+50% damage while HP < 30%' },
  { id: 'phoenix',     name: 'Phoenix',     icon: '🔥', type: 'in_combat', desc: 'Survive one lethal hit with 1 HP (once/round)' },
  { id: 'counter',     name: 'Counter',     icon: '↩️', type: 'in_combat', desc: 'After being parried: next hit deals 2× damage' },
  { id: 'vampiric',    name: 'Vampiric',    icon: '🧛', type: 'in_combat', desc: 'On hit: heal 5% of damage dealt' },
  { id: 'parry_master',name: 'Parry Master',icon: '🗡️', type: 'in_combat', desc: 'On parry: no knockback + weapon spin ×2 for 1.5s' },
  { id: 'momentum',    name: 'Momentum',    icon: '🌀', type: 'in_combat', desc: 'On kill (FFA): +10% speed stack (max 5×)' },
  { id: 'shadow_step', name: 'Shadow Step', icon: '👻', type: 'in_combat', desc: 'On evade: teleport to a random safe spot' },
  { id: 'blood_frenzy',name: 'Blood Frenzy',icon: '💉', type: 'in_combat', desc: 'On kill: heal 25 HP' },
  { id: 'flow_state',  name: 'Flow State',  icon: '🌊', type: 'in_combat', desc: 'On hit: +MA×1% speed per stack (reset when hit)' },
  { id: 'read_react',  name: 'Read & React',icon: '⚡', type: 'in_combat', desc: 'On being hit: BIQ×3% chance to instantly counter-attack' },
  { id: 'exploit',     name: 'Exploit',     icon: '💡', type: 'in_combat', desc: 'On hit: (IQ+BIQ)×1% chance double damage' },
  { id: 'deflection',  name: 'Deflection',  icon: '🪞', type: 'passive',   desc: 'MA×2% chance to completely negate a hit' },
  { id: 'mind_break',  name: 'Mind Break',  icon: '🧿', type: 'pre_combat', desc: 'If IQ > target: -(IQ gap × 3%) to their final damage' },
  // ── POST-COMBAT (triggers after round ends) ──────────────
  { id: 'learning',   name: 'Learning',   icon: '📚', type: 'post_combat', desc: 'Losing a round: +5% damage next round' },
  { id: 'adaptation', name: 'Adaptation', icon: '🧬', type: 'post_combat', desc: 'Losing: gain 20% resist to killer\'s weapon type' },
];

const SKILL_MAP = Object.fromEntries(SKILL_DEFS.map(s => [s.id, s]));

// ── Apply permanent stat mods from passive skills ──────────
// Call once per game right after Ball is constructed.
function applySkillPassives(ball, fighter) {
  const sk = ball.skills;
  if (!sk || sk.length === 0) return;

  if (sk.includes('iron_body'))   { ball.maxHp += 20; ball.hp = ball.maxHp; }
  if (sk.includes('swift'))       { ball.maxSpd *= 1.15; ball.baseMaxSpd = ball.maxSpd; }
  if (sk.includes('sharp_eye'))   { ball.critChance += 0.10; }
  if (sk.includes('heavy_mass'))  { ball.mass *= 1.30; }

  // Cross-round bonuses from previous rounds
  ball.skillLearningMult = 1 + (fighter.learningBonus || 0);
  ball.adaptResist       = fighter.adaptResist || null;
}

// ── Init per-round reactive skill state ────────────────────
// Called once per game (balls are recreated each round).
function initRoundSkillState(ball) {
  ball.skillState = {
    warCryReady:     ball.skills.includes('war_cry'),
    fortifyShield:   ball.skills.includes('fortify'),
    firstBloodReady: ball.skills.includes('first_blood'),
    phoenixUsed:     false,
    counterActive:   false,
    momentumStacks:  0,
    flowStateStacks: 0,
  };
}

// ── PRE-COMBAT hook ────────────────────────────────────────
// Called for each ball when the countdown ends → playing begins.
function skillOnPreCombat(ball) {
  if (!ball.skills || ball.skills.length === 0) return;

  // Passive skills: handled by .always-active CSS class set in buildHUD() — no flash needed here.

  // Flash pre-combat skills (they arm themselves at round start)
  const preCombats = ['war_cry','fortify','adrenaline','predator','first_blood'];
  for (const pid of preCombats) {
    if (ball.skills.includes(pid) && SKILL_MAP[pid]) flashSkillHUD(ball, SKILL_MAP[pid]);
  }

  if (ball.skills.includes('adrenaline')) {
    ball.adrenalineUntil = (state.matchTime || 0) + 300; // 5 s × 60 fps
    spawnDamageNumber(ball.x, ball.y - ball.radius - 12, '⚡ ADRENA!', '#ffee44');
  }

  // Mind Break: if IQ > opponent's IQ → they deal less final damage this round
  if (ball.skills.includes('mind_break')) {
    for (const other of state.players) {
      if (other === ball || !other.alive) continue;
      if (ball.teamId >= 0 && ball.teamId === other.teamId) continue;
      const myIQ = ball.charIQ || 1;
      const theirIQ = other.charIQ || 1;
      if (myIQ > theirIQ) {
        const gap = myIQ - theirIQ;
        const debuff = gap * 0.03;
        other.mindBreakDebuff = Math.min((other.mindBreakDebuff || 0) + debuff, 0.60);
        spawnDamageNumber(other.x, other.y - other.radius - 14,
          `🧿 MIND BREAK -${(debuff * 100).toFixed(0)}%`, '#cc88ff');
        flashSkillHUD(ball, SKILL_MAP['mind_break']);
      }
    }
  }
}

// ── ON-HIT hook ────────────────────────────────────────────
// Called from _checkWeaponHit and resolveProjectiles when a hit lands.
function skillOnHit(attacker, defender, dmg) {
  const sk = attacker.skillState;
  if (!sk) return;

  // War Cry: consume after first successful hit
  if (sk.warCryReady) {
    sk.warCryReady = false;
    flashSkillHUD(attacker, SKILL_MAP['war_cry']);
  }

  // First Blood: stun defender on first hit
  if (sk.firstBloodReady) {
    sk.firstBloodReady = false;
    defender.weapon.spinSlowTimer = Math.max(defender.weapon.spinSlowTimer, 30);
    spawnDamageNumber(defender.x, defender.y - defender.radius - 18, 'STUNNED!', '#ff6633');
    flashSkillHUD(attacker, SKILL_MAP['first_blood']);
  }

  // Counter: consume after use (2× damage already applied in getDamage)
  if (sk.counterActive) {
    sk.counterActive = false;
    flashSkillHUD(attacker, SKILL_MAP['counter']);
  }

  // Flow State: +MA×1% max speed per consecutive hit (reset on being hit)
  if (attacker.skills.includes('flow_state')) {
    const stacks = (attacker.skillState.flowStateStacks || 0) + 1;
    attacker.skillState.flowStateStacks = stacks;
    const ma = attacker.charMA || 0;
    spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 14,
      `🌊 FLOW ×${stacks} (+${(ma * stacks).toFixed(0)}%)`, '#44ddff');
    flashSkillHUD(attacker, SKILL_MAP['flow_state']);
  }

  // Vampiric: heal 5% of damage dealt, minimum 1 HP per hit
  if (attacker.skills.includes('vampiric')) {
    const heal = Math.max(1, dmg * 0.05);
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    spawnDamageNumber(attacker.x, attacker.y - attacker.radius, '+' + heal.toFixed(1), '#88ff88');
    addBattleLog('heal', { attacker: getBallLabel(attacker), aColor: attacker.color, heal, hpAfter: +attacker.hp.toFixed(1), source: 'Vampiric' });
    flashSkillHUD(attacker, SKILL_MAP['vampiric']);
  }
}

// ── ON-PARRY hook ──────────────────────────────────────────
// Called after a parry is resolved (collidePair).
// Both balls are passed; each may have Counter or Parry Master.
function skillOnParry(b1, b2) {
  for (const [ball, opp] of [[b1, b2], [b2, b1]]) {
    // Counter: arm the next attack for 2× damage
    if (ball.skillState && ball.skills?.includes('counter') && !ball.skillState.counterActive) {
      ball.skillState.counterActive = true;
      spawnDamageNumber(ball.x, ball.y - ball.radius, 'COUNTER!', '#ff8833');
      flashSkillHUD(ball, SKILL_MAP['counter']);
    }
    // Parry Master: no knockback for self + weapon spin ×2 for 90 frames
    if (ball.skills?.includes('parry_master')) {
      ball.weapon.spinBoostTimer = 90;
      spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '⚡ SPIN UP!', '#cc88ff');
      flashSkillHUD(ball, SKILL_MAP['parry_master']);
    }
  }
}

// ── ON-EVADE hook ──────────────────────────────────────────
// Called from takeDamage when evade roll succeeds.
function skillOnEvade(ball) {
  if (!ball.skills?.includes('shadow_step')) return;
  const a = state.arena;
  let cx, cy, r;
  if (a.type === 'circle') {
    cx = a.cx; cy = a.cy; r = a.r * 0.65;
  } else {
    cx = (a.x || 0) + (a.w || 800) / 2;
    cy = (a.y || 0) + (a.h || 800) / 2;
    r  = Math.min(a.w || 800, a.h || 800) * 0.33;
  }
  const angle = Math.random() * Math.PI * 2;
  const dist  = r * (0.2 + Math.random() * 0.8);
  ball.x = cx + Math.cos(angle) * dist;
  ball.y = cy + Math.sin(angle) * dist;
  ball.vx *= 0.3;
  ball.vy *= 0.3;
  spawnSparks(ball.x, ball.y, 14);
  spawnDamageNumber(ball.x, ball.y - ball.radius, 'SHADOW STEP!', '#cc88ff');
  flashSkillHUD(ball, SKILL_MAP['shadow_step']);
}

// ── ON-KILL hook ───────────────────────────────────────────
// Called from takeDamage when a ball's HP drops to 0.
function skillOnKill(killer, victim) {
  if (!killer || !killer.skillState) return;

  // Blood Frenzy: heal 25 HP
  if (killer.skills?.includes('blood_frenzy')) {
    killer.hp = Math.min(killer.maxHp, killer.hp + 25);
    spawnDamageNumber(killer.x, killer.y - killer.radius, '+25 HP', '#ff4466');
    addBattleLog('heal', { attacker: getBallLabel(killer), aColor: killer.color, heal: 25, hpAfter: +killer.hp.toFixed(1), source: 'Blood Frenzy' });
    flashSkillHUD(killer, SKILL_MAP['blood_frenzy']);
  }

  // Momentum: +10% speed per kill (FFA only, max 5 stacks)
  if (killer.skills?.includes('momentum') && killer.teamId < 0) {
    const stacks = killer.skillState.momentumStacks || 0;
    if (stacks < 5) {
      killer.skillState.momentumStacks = stacks + 1;
      killer.maxSpd = killer.baseMaxSpd * (1 + killer.skillState.momentumStacks * 0.10);
      spawnDamageNumber(
        killer.x, killer.y - killer.radius - 16,
        `MOMENTUM ×${killer.skillState.momentumStacks}`, '#00ddff'
      );
      flashSkillHUD(killer, SKILL_MAP['momentum']);
    }
  }
}

// ── POST-COMBAT hook ───────────────────────────────────────
// Called from showResult() for each player.
// fighter = state.fighters[i] — persists across BO3 rounds.
function skillOnPostCombat(ball, won, fighter) {
  if (!ball.skills || ball.skills.length === 0) return;
  if (won) return; // only losers get post-combat bonuses

  // Learning: +5% damage multiplier next round
  if (ball.skills.includes('learning')) {
    fighter.learningBonus = (fighter.learningBonus || 0) + 0.05;
    spawnDamageNumber(ball.x, ball.y - ball.radius, 'LEARNING +5%', '#88aaff');
    flashSkillHUD(ball, SKILL_MAP['learning']);
  }

  // Adaptation: 20% resistance to the weapon that killed you
  if (ball.skills.includes('adaptation') && ball._killedBy?.weaponDef) {
    fighter.adaptResist = ball._killedBy.weaponDef.id;
    flashSkillHUD(ball, SKILL_MAP['adaptation']);
  }
}
// ============================================================
// BALL CLASS
// ============================================================
class Ball {
  constructor(x, y, color, weaponId, side, charStats = null, teamId = -1) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.radius = BALL_R;
    this.color = color;
    this.side = side;  // 'left' | 'right'
    this.teamId = teamId; // -1 = FFA, 0 or 1 = team match

    // Chargen stat mapping
    const cs = charStats || {};
    const dur = cs.durability ?? null;
    const spd = cs.speed      ?? null;
    const iq  = cs.iq         ?? null;
    const biq = cs.battleiq   ?? null;
    const ma  = cs.ma         ?? null;
    this.charSTR     = cs.strength ?? null;  // used in getDamage()
    this.charSPD     = spd;                  // used in initGame launchSpeed
    this.charMA      = ma;                   // used in _initWeapon spinBonus + Flow State/Deflection
    this.charIQ      = iq  !== null ? iq  : 5;  // used in crit, Exploit, Mind Break
    this.charBIQ     = biq !== null ? biq : 5;  // used in evade, Read & React
    this.charRace    = cs.race    ?? null;   // used in drawRaceDecoration
    this.charSubrace = cs.subrace ?? null;   // used in drawRaceDecoration

    this.maxHp = dur !== null ? (50 + dur * 10) : BASE_HP;
    this.hp    = this.maxHp;
    this.maxSpd     = spd !== null ? (10 + spd * 1.5) : 18;
    this.baseMaxSpd = this.maxSpd; // Speed Floor reference
    this.alive = true;
    this.mass = this.radius * this.radius * 0.05;

    this.immunityFrames = 0;
    this.hitFlash = 0;
    this.squashX = 1; this.squashY = 1;
    this.scale = 1;
    this.bounceCooldown = 0;   // frames after a collision where AI backs off
    this.wallBoostFactor = 1.0; // speed multiplier from wall boost (decays back to 1.0)
    this.evadeChance   = biq !== null ? biq * 0.03 : 0.10;  // BIQ×0.03, default 10%
    this.deflectChance = ma  !== null ? ma  * 0.02 : 0;     // MA×0.02, Deflection skill
    this.mindBreakDebuff = 0;  // % outgoing damage reduction (set by opponent's Mind Break)
    this.evadeFrames = 0;

    this.critChance  = iq  !== null ? iq  * 0.05 : 0.20;  // IQ×0.05,  default 20%
    this.critMult    = 1.5;

    this.weapon = this._initWeapon(weaponId);
    this.weaponDef = WEAPON_MAP[weaponId];

    this.stats = { hits: 0, parries: 0, damageDone: 0 };
    this.speechText = null;
    this.speechFrames = 0;

    // Skill system — populated by setup.js after construction
    this.skills          = [];
    this.skillState      = {};
    this.skillLearningMult = 1;   // from Learning (cross-round)
    this.adaptResist     = null;  // weapon id to resist (from Adaptation)
    this.adrenalineUntil = -1;    // matchTime frame when Adrenaline expires
    this._killedBy       = null;  // attacker ball reference (for Adaptation)
  }

  _initWeapon(id) {
    const def = WEAPON_MAP[id];
    const spd = this.charSPD ?? 5;
    // Per-ball attackCooldown based on SPD
    let ac = def.attackCooldown;
    if      (def.id === 'fists')   ac = Math.max(2, 13 - spd);
    else if (def.id === 'sword')   ac = Math.max(2, 28 - spd);
    else if (def.id === 'dagger')  ac = Math.max(2, 18 - spd);
    else if (def.id === 'spear')   ac = Math.max(2, 38 - spd);
    else if (def.id === 'scythe')  ac = Math.max(2, 34 - spd);
    else if (def.id === 'hammer')  ac = Math.max(2, 48 - spd);
    // Ranged: fireInterval overridden per-ball via weapon.fireInterval
    let fi = def.fireInterval || null;
    if (def.id === 'bow')      fi = Math.max(5, 140 - spd * 2);
    else if (def.id === 'shuriken') fi = Math.max(5, 250 - spd * 2);
    return {
      id,
      angle: 0,
      hits: 0,
      cooldown: 0,
      attackCooldown: ac,
      fireInterval: fi,
      bonusDamage: 0,
      bonusLength: 0,
      bonusKnockback: 0,
      spinBonus: (this.charMA !== null ? this.charMA * 0.003 : 0),  // MA×0.003 base spin
      spinDir: 1,           // 1 = forward, -1 = reversed (spear parry effect)
      spinDebuffTimer: 0,   // frames remaining for 10% spin reduction (spear parry)
      spinSlowTimer: 0,     // frames remaining for 30% spin reduction (hammer slow)
      spinBoostTimer: 0,    // frames remaining for +100% spin boost (Parry Master)
      arrowCount: 1,
      shurikenCount: 1,
      fireTimer: 0,
      burstQueue: 0,
      burstTimer: 0,
      parried: false,
      parryCooldown: 0
    };
  }

  getSpeed() {
    const def    = this.weaponDef;
    const spearDebuff  = this.weapon.spinDebuffTimer > 0 ? 0.9 : 1.0;  // -10% from spear parry
    const hammerDebuff = this.weapon.spinSlowTimer   > 0 ? 0.7 : 1.0;  // -30% from hammer slow
    const parryBoost   = this.weapon.spinBoostTimer  > 0 ? 2.0 : 1.0;  // +100% from Parry Master
    return (def.baseSpeed + this.weapon.spinBonus) * this.scale * this.weapon.spinDir * spearDebuff * hammerDebuff * parryBoost;
  }

  getDamage() {
    const def = this.weaponDef;
    const str = this.charSTR ?? 1;
    const rageMult = (state.matchTime >= 80 * 60) ? 1.5 : 1.0;
    let dmg = (def.baseDamage * str + this.weapon.bonusDamage) * rageMult;
    // Skills that modify outgoing damage
    if (this.skills.includes('berserker') && this.hp / this.maxHp < 0.30) dmg *= 1.5;
    if (this.skillState?.warCryReady)  dmg *= 2;
    if (this.skillState?.counterActive) dmg *= 2;
    if (this.skillLearningMult > 1)    dmg *= this.skillLearningMult;
    // Mind Break debuff: opponent reduced this ball's outgoing damage at round start
    if (this.mindBreakDebuff > 0)      dmg *= (1 - this.mindBreakDebuff);
    return dmg;
  }

  getKnockback() {
    const def = this.weaponDef;
    const rageMult = (state.matchTime >= 80 * 60) ? 1.5 : 1.0;
    return (def.baseKnockback + this.weapon.bonusKnockback) * rageMult;
  }

  getWeaponLength() {
    const def = this.weaponDef;
    return this.radius + def.baseLength + this.weapon.bonusLength;
  }

  update(arena, opponent, projectiles, gravity) {
    if (!this.alive) return;

    // No AI steering — pure physics only

    // Physics — friction: ~99% after 1s, ~91% after 10s, ~84% after 20s
    if (gravity) this.vy += 0.15;
    this.vx *= 0.99985;
    this.vy *= 0.99985;

    // Limit max speed (per-ball, influenced by chargen SPD stat)
    let effectiveMaxSpd = this.maxSpd;
    if (this.skills.includes('adrenaline') && state.matchTime < this.adrenalineUntil) {
      effectiveMaxSpd *= 1.5;
    }
    // Flow State: +MA×1% speed cap per consecutive hit stack
    if (this.skills.includes('flow_state') && this.skillState?.flowStateStacks > 0) {
      effectiveMaxSpd *= (1 + this.skillState.flowStateStacks * (this.charMA || 0) * 0.01);
    }
    const spd = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
    if (spd > effectiveMaxSpd) { this.vx = this.vx/spd*effectiveMaxSpd; this.vy = this.vy/spd*effectiveMaxSpd; }

    const preX = this.x, preY = this.y;
    this.x += this.vx;
    this.y += this.vy;

    // Arena walls — detect bounce for sparks + speed boost
    clampToBall(this, arena);
    const wallHitX = Math.abs(this.x - preX - this.vx) > 1;
    const wallHitY = Math.abs(this.y - preY - this.vy) > 1;
    if ((wallHitX || wallHitY) && spd > 0.5) {
      spawnSparks(this.x, this.y, 6);
      this.bounceCooldown = 12;
      // +20% speed boost, refresh mỗi lần chạm tường
      this.vx *= 1.1;
      this.vy *= 1.1;
      this.wallBoostFactor = 1.1;
    }
    if (this.bounceCooldown > 0) this.bounceCooldown--;

    // Decay wall boost về 1.0 trong 3 giây (180 frames)
    // 0.9747^180 ≈ 0.01 → boost gần như tan hết sau 3s
    if (this.wallBoostFactor > 1.0005) {
      const prev = this.wallBoostFactor;
      this.wallBoostFactor = 1.0 + (prev - 1.0) * 0.9747;
      const ratio = this.wallBoostFactor / prev;  // hệ số giảm tốc frame này
      this.vx *= ratio;
      this.vy *= ratio;
    } else {
      this.wallBoostFactor = 1.0;
    }

    // Weapon rotation
    this.weapon.angle += this.getSpeed();
    if (this.weapon.spinDebuffTimer > 0) this.weapon.spinDebuffTimer--;
    if (this.weapon.spinSlowTimer   > 0) this.weapon.spinSlowTimer--;
    if (this.weapon.spinBoostTimer  > 0) this.weapon.spinBoostTimer--;
    if (this.weapon.cooldown > 0) this.weapon.cooldown--;
    if (this.weapon.parryCooldown > 0) this.weapon.parryCooldown--;
    if (this.immunityFrames > 0) this.immunityFrames--;
    if (this.hitFlash > 0) this.hitFlash--;
    if (this.evadeFrames > 0) this.evadeFrames--;

    // Squash recovery
    this.squashX += (1 - this.squashX) * 0.15;
    this.squashY += (1 - this.squashY) * 0.15;

    // Projectile firing — burst system
    const def = this.weaponDef;
    if (def.aiType === 'ranged') {
      const BURST_DELAY = 4;
      if (this.weapon.burstQueue > 0) {
        // Mid-burst: fire one shot every BURST_DELAY frames
        this.weapon.burstTimer--;
        if (this.weapon.burstTimer <= 0) {
          this.weapon.burstQueue--;
          this.weapon.burstTimer = BURST_DELAY;
          this._fireSingle(projectiles);
          // Last shot fired → reset cooldown timer NOW
          if (this.weapon.burstQueue === 0) {
            this.weapon.fireTimer = 0;
          }
        }
      } else {
        // Between bursts: count cooldown, then queue next burst
        if (opponent && opponent.alive) {
          this.weapon.fireTimer++;
          const interval = this.weapon.fireInterval ?? def.fireInterval ?? 120;
          if (this.weapon.fireTimer >= interval) {
            const count = def.id === 'bow'
              ? (this.weapon.arrowCount || 1)
              : (this.weapon.shurikenCount || 1);
            this.weapon.burstQueue = count;
            this.weapon.burstTimer = 0; // fire first shot immediately
          }
        }
      }
    }

    // Speech
    if (this.speechFrames > 0) this.speechFrames--;
    else this.speechText = null;
  }

  // AI removed — movement is purely physics-driven

  // Fire a single projectile in the direction the weapon is currently pointing
  _fireSingle(projectiles) {
    const def = this.weaponDef;
    const a = this.weapon.angle; // current weapon spin angle — changes each frame naturally
    sfxShoot();
    if (def.id === 'bow') {
      const spd = def.arrowSpeed + (this.weapon.arrowSpeedBonus || 0);
      projectiles.push(new Projectile(
        this.x + Math.cos(a) * this.radius,
        this.y + Math.sin(a) * this.radius,
        Math.cos(a) * spd, Math.sin(a) * spd,
        this, 'arrow', (this.charSTR ?? 1)
      ));
    } else if (def.id === 'shuriken') {
      const spd = def.shurikenSpeed;
      projectiles.push(new Projectile(
        this.x + Math.cos(a) * this.radius,
        this.y + Math.sin(a) * this.radius,
        Math.cos(a) * spd, Math.sin(a) * spd,
        this, 'shuriken', (this.charSTR ?? 1)
      ));
    }
  }

  takeDamage(dmg, fromX, fromY, isCrit = false, attacker = null, isReactCounter = false) {
    if (this.immunityFrames > 0) return false;

    // Evade roll
    if (Math.random() < this.evadeChance) {
      this.evadeFrames = 60;
      this.immunityFrames = 20;
      spawnDamageNumber(this.x, this.y - this.radius, 'EVADE', '#aaffee');
      skillOnEvade(this);
      return false;
    }

    // Skill: Fortify Shield — absorb one hit entirely
    if (this.skillState?.fortifyShield) {
      this.skillState.fortifyShield = false;
      this.immunityFrames = 10;
      spawnSparks(this.x, this.y, 10);
      spawnDamageNumber(this.x, this.y - this.radius, 'BLOCKED!', '#ffffaa');
      return false;
    }

    // Skill: Deflection — MA×2% chance to negate a hit entirely
    if (this.skills.includes('deflection') && Math.random() < this.deflectChance) {
      this.immunityFrames = 10;
      spawnSparks(this.x, this.y, 8);
      spawnDamageNumber(this.x, this.y - this.radius, 'DEFLECT!', '#aaddff');
      if (typeof flashSkillHUD === 'function') flashSkillHUD(this, SKILL_MAP['deflection']);
      return false;
    }

    // Skill: Thick Hide — -10% damage received
    if (this.skills.includes('thick_hide')) dmg *= 0.9;
    // Skill: Adaptation — -20% from the specific weapon type that killed you before
    if (this.adaptResist && attacker?.weaponDef?.id === this.adaptResist) dmg *= 0.8;

    this.hp -= dmg;

    // Flow State: reset stacks when hit
    if (this.skillState?.flowStateStacks > 0) {
      this.skillState.flowStateStacks = 0;
    }

    // Skill: Extended Immunity — 30 frames instead of 18
    this.immunityFrames = this.skills.includes('extended_immunity') ? 30 : 18;
    this.hitFlash = 8;
    const angle = Math.atan2(this.y - fromY, this.x - fromX);
    spawnBlood(this.x, this.y, isCrit ? 12 : 6, angle + Math.PI);
    if (isCrit) {
      spawnDamageNumber(this.x,     this.y - this.radius - 18, 'CRIT!', '#ffe033');
      spawnDamageNumber(this.x + 4, this.y - this.radius,       dmg,    '#ffcc00');
    } else {
      spawnDamageNumber(this.x, this.y - this.radius, dmg, this.color);
    }
    this.squashX = 1.3;
    this.squashY = 0.75;

    // Skill: Read & React — BIQ×3% chance to instantly counter-attack after being hit
    if (!isReactCounter && this.skills.includes('read_react') && attacker?.alive) {
      if (Math.random() < this.charBIQ * 0.03) {
        spawnDamageNumber(this.x, this.y - this.radius - 16, '⚡ REACT!', '#ffdd44');
        if (typeof flashSkillHUD === 'function') flashSkillHUD(this, SKILL_MAP['read_react']);
        attacker.takeDamage(this.getDamage(), this.x, this.y, false, this, true);
      }
    }

    // Skill: Phoenix — survive lethal hit with 1 HP (once per round)
    if (this.hp <= 0 && this.skills.includes('phoenix') && !this.skillState?.phoenixUsed) {
      this.hp = 1;
      this.skillState.phoenixUsed = true;
      spawnDamageNumber(this.x, this.y - this.radius - 24, '🔥 PHOENIX!', '#ff9900');
      return true;
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this._killedBy = attacker;
      sfxDeath();
      spawnDeathExplosion(this.x, this.y, this.color);
      this.speechText = ['RIP', 'Ouch!', '💀', 'GG'][Math.floor(Math.random()*4)];
      this.speechFrames = 120;
      skillOnKill(attacker, this);
    }
    return true;
  }

  draw(ctx) {
    // ── Overtime death: draw as gray ghost ──
    if (!this.alive && this.diedByOvertime) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.translate(this.x, this.y);
      // Gray body
      ctx.fillStyle = '#555';
      ctx.shadowColor = '#333';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      // Dark outline
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Skull-like X cross
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      const s = this.radius * 0.38;
      ctx.beginPath(); ctx.moveTo(-s, -s); ctx.lineTo(s, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s, -s); ctx.lineTo(-s, s); ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.squashX, this.squashY);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius*0.9, this.radius*0.8, this.radius*0.25, 0, 0, Math.PI*2);
    ctx.fill();

    // Immunity shimmer
    if (this.immunityFrames > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${this.immunityFrames/18 * 0.5})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 4, 0, Math.PI*2);
      ctx.stroke();
    }

    // Evade blur effect — ball mờ đi và có vòng cyan nhấp nháy
    if (this.evadeFrames > 0) {
      const t = this.evadeFrames / 60;          // 1.0 → 0.0
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.02); // nhấp nháy
      // Vòng tròn cyan nhấp nháy
      ctx.strokeStyle = `rgba(100, 255, 220, ${t * 0.9 * pulse})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#44ffcc';
      ctx.shadowBlur = 15 + pulse * 12;
      ctx.beginPath(); ctx.arc(0, 0, this.radius + 7, 0, Math.PI * 2); ctx.stroke();
      // Vòng thứ 2 lớn hơn mờ hơn
      ctx.strokeStyle = `rgba(100, 255, 220, ${t * 0.4})`;
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      // Làm mờ ball (globalAlpha thấp)
      ctx.globalAlpha = 0.35 + t * 0.35;
    }

    // Wall boost glow — vòng sáng cam khi đang tăng tốc
    if (this.wallBoostFactor > 1.005) {
      const boostAlpha = (this.wallBoostFactor - 1.0) / 0.2; // 0→1
      ctx.strokeStyle = `rgba(255, 160, 30, ${boostAlpha * 0.85})`;
      ctx.lineWidth = 3 + boostAlpha * 4;
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 12 + boostAlpha * 20;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Hit flash
    const baseColor = this.hitFlash > 0 ? '#ffffff' : this.color;
    ctx.fillStyle = baseColor;
    ctx.shadowColor = this.wallBoostFactor > 1.005 ? '#ff8800' : this.color;
    ctx.shadowBlur = this.alive ? (this.wallBoostFactor > 1.005 ? 18 : 10) : 0;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI*2);
    ctx.fill();

    // Ball outline
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(-this.radius*0.28, -this.radius*0.3, this.radius*0.28, this.radius*0.18, -Math.PI*0.3, 0, Math.PI*2);
    ctx.fill();

    // Team indicator ring
    if (this.teamId >= 0) {
      const TC = ['#00ddff', '#ff8833'];
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = TC[this.teamId] ?? '#fff';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Race decoration (cosmetic only, no hitbox change)
    if (this.alive) drawRaceDecoration(ctx, this);

    // Speech bubble
    if (this.speechText) {
      ctx.save();
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      const alpha = Math.min(1, this.speechFrames / 20);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(this.speechText, this.x, this.y - this.radius - 10);
      ctx.fillText(this.speechText, this.x, this.y - this.radius - 10);
      ctx.restore();
    }
  }

  drawWeapon(ctx) {
    if (!this.alive) return;
    ctx.save();
    // Scale glow
    if (this.weapon.hits > 0) {
      ctx.shadowColor = this.weaponDef.color;
      ctx.shadowBlur = Math.min(20, this.weapon.hits * 3);
    }
    this.weaponDef.draw(ctx, this);
    ctx.restore();
  }

  getScaleLabel() {
    const def = this.weaponDef;
    const w = this.weapon;
    if (def.id === 'fists')    return `⚡ CD: ${w.attackCooldown.toFixed(0)}`;
    if (def.id === 'sword')    return `⚔ Dmg: ${def.baseDamage + (w.bonusDamage||0)}`;
    if (def.id === 'dagger')   return `💨 Spin: ${(def.baseSpeed + (w.spinBonus||0)).toFixed(3)}`;
    if (def.id === 'spear')    return `📏 Len+${(w.bonusLength||0).toFixed(0)} Dmg+${(w.bonusDamage||0).toFixed(1)}`;
    if (def.id === 'bow')      return `🏹 Arrows: ${w.arrowCount||1}  Spd: ${(def.arrowSpeed + (w.arrowSpeedBonus||0)).toFixed(1)}`;
    if (def.id === 'scythe')   return w.hits >= 5 ? '🌙 DUAL BLADES' : `🌙 Hits: ${w.hits}/5`;
    if (def.id === 'hammer')   return `💥 KB: ${(def.baseKnockback + (w.bonusKnockback||0)).toFixed(1)}`;
    if (def.id === 'shuriken') return `⭐ Stars: ${w.shurikenCount||1}`;
    return '';
  }
}
// ============================================================
// COLLISION DETECTION
// ============================================================
function dist2(ax, ay, bx, by) { return (ax-bx)*(ax-bx) + (ay-by)*(ay-by); }

// collidePair: body bounce + parry + weapon hits for two specific balls
function collidePair(b1, b2) {
  if (!b1.alive || !b2.alive) return;

  // 1. Body-body bounce — proper elastic collision
  const dx = b2.x - b1.x, dy = b2.y - b1.y;
  const d = Math.sqrt(dx*dx + dy*dy);
  const minDist = b1.radius + b2.radius;
  if (d < minDist && d > 0) {
    const nx = dx/d, ny = dy/d;
    const overlap = minDist - d;
    const push = overlap * 0.52;
    b1.x -= nx * push;
    b1.y -= ny * push;
    b2.x += nx * push;
    b2.y += ny * push;
    const relVx = b2.vx - b1.vx, relVy = b2.vy - b1.vy;
    const dot = relVx*nx + relVy*ny;
    if (dot < 0) {
      const totalMass = b1.mass + b2.mass;
      const e = 1.85;
      const impulse = (e * dot) / totalMass;
      b1.vx += impulse * b2.mass * nx;
      b1.vy += impulse * b2.mass * ny;
      b2.vx -= impulse * b1.mass * nx;
      b2.vy -= impulse * b1.mass * ny;
      b1.bounceCooldown = 20;
      b2.bounceCooldown = 20;
    }
  }

  // 2. Parry check and weapon hits — skip for teammates (no friendly fire)
  if (b1.teamId >= 0 && b1.teamId === b2.teamId) return; // body bounce still happened above
  if (b1.weapon.parryCooldown === 0 && b2.weapon.parryCooldown === 0) {
    const pts1 = b1.weaponDef.getHitPoints(b1);
    const pts2 = b2.weaponDef.getHitPoints(b2);
    let parryOccurred = false;
    for (const p1 of pts1) {
      for (const p2 of pts2) {
        const threshold = p1.r + p2.r + 6;
        if (dist2(p1.x, p1.y, p2.x, p2.y) < threshold*threshold) {
          const d12x = p2.x - p1.x, d12y = p2.y - p1.y;
          const d12len = Math.sqrt(d12x*d12x + d12y*d12y);
          if (d12len < 0.001) continue;
          const wDir1x = Math.cos(b1.weapon.angle), wDir1y = Math.sin(b1.weapon.angle);
          const dot1 = wDir1x*(d12x/d12len) + wDir1y*(d12y/d12len);
          const wDir2x = Math.cos(b2.weapon.angle), wDir2y = Math.sin(b2.weapon.angle);
          const dot2 = wDir2x*(-d12x/d12len) + wDir2y*(-d12y/d12len);
          if (dot1 > 0.2 && dot2 > 0.2) parryOccurred = true;
        }
      }
    }
    if (parryOccurred) {
      const midX = (b1.x + b2.x) / 2, midY = (b1.y + b2.y) / 2;
      spawnSparks(midX, midY, 14);
      sfxParry();
      const recoil = 5.5;
      const pnx = b1.x - b2.x, pny = b1.y - b2.y;
      const pnl = Math.sqrt(pnx*pnx + pny*pny);
      const b1Fists = b1.weaponDef.id === 'fists';
      const b2Fists = b2.weaponDef.id === 'fists';

      if (b1Fists && b2Fists) {
        // Fists vs Fists: both take damage + normal recoil
        if (pnl > 0) {
          b1.vx += (pnx/pnl)*recoil; b1.vy += (pny/pnl)*recoil;
          b2.vx -= (pnx/pnl)*recoil; b2.vy -= (pny/pnl)*recoil;
        }
        b1.takeDamage(b2.getDamage(), b2.x, b2.y, false, b2);
        b2.takeDamage(b1.getDamage(), b1.x, b1.y, false, b1);
        addBattleLog('parry_fists', { attacker: getBallLabel(b1), defender: getBallLabel(b2), damage: b2.getDamage(), aColor: b1.color, dColor: b2.color, defHp: +Math.max(0, b1.hp).toFixed(1) });
      } else if (b1Fists || b2Fists) {
        // Fists vs melee: fists takes damage (no knockback), other gets recoil only
        const [fistsB, otherB] = b1Fists ? [b1, b2] : [b2, b1];
        const nx = fistsB.x - otherB.x, ny = fistsB.y - otherB.y;
        const nl = Math.sqrt(nx*nx + ny*ny);
        if (nl > 0) { otherB.vx -= (nx/nl)*recoil; otherB.vy -= (ny/nl)*recoil; }
        fistsB.takeDamage(otherB.getDamage(), otherB.x, otherB.y, false, otherB);
        addBattleLog('parry_fists', { attacker: getBallLabel(fistsB), defender: getBallLabel(otherB), damage: otherB.getDamage(), aColor: fistsB.color, dColor: otherB.color, defHp: +Math.max(0, fistsB.hp).toFixed(1) });
      } else {
        // Normal parry: recoil both — Parry Master holders keep their direction
        if (pnl > 0) {
          if (!b1.skills?.includes('parry_master')) { b1.vx += (pnx/pnl)*recoil; b1.vy += (pny/pnl)*recoil; }
          if (!b2.skills?.includes('parry_master')) { b2.vx -= (pnx/pnl)*recoil; b2.vy -= (pny/pnl)*recoil; }
        }
        addBattleLog('parry', { attacker: getBallLabel(b1), defender: getBallLabel(b2), aColor: b1.color, dColor: b2.color });
      }
      b1.weapon.parryCooldown = 25;
      b2.weapon.parryCooldown = 25;
      b1.bounceCooldown = 22;
      b2.bounceCooldown = 22;
      b1.weapon.angle += Math.PI * 0.15;
      b2.weapon.angle += Math.PI * 0.15;
      b1.stats.parries++;
      b2.stats.parries++;
      // Spear parried by melee → reverse spin + 10% debuff for 60 frames
      const applySpearParry = (spearBall, otherBall) => {
        if (spearBall.weaponDef.id === 'spear' && otherBall.weaponDef.aiType === 'melee') {
          spearBall.weapon.spinDir *= -1;
          spearBall.weapon.spinDebuffTimer = 60;
        }
      };
      applySpearParry(b1, b2);
      applySpearParry(b2, b1);
      skillOnParry(b1, b2);
      return;
    }
  }

  // 3. Weapon-to-body damage
  _checkWeaponHit(b1, b2);
  _checkWeaponHit(b2, b1);
}

// resolveProjectiles: projectiles vs all alive balls (any non-owner is a valid target)
function resolveProjectiles(players, projectiles) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    if (!proj.alive || proj.immuneFrames > 0) continue;

    for (const target of players) {
      if (target === proj.owner || !target.alive) continue;
      if (proj.owner && proj.owner.teamId >= 0 && proj.owner.teamId === target.teamId) continue;

      // Check weapon deflect
      const tpts = target.weaponDef.getHitPoints(target);
      let deflected = false;
      for (const tp of tpts) {
        if (dist2(proj.x, proj.y, tp.x, tp.y) < (tp.r + proj.r) * (tp.r + proj.r)) {
          deflected = true; break;
        }
      }
      if (deflected) {
        const da = Math.atan2(proj.y - target.y, proj.x - target.x);
        const spd = Math.sqrt(proj.vx*proj.vx + proj.vy*proj.vy);
        proj.vx = Math.cos(da) * spd * 1.05;
        proj.vy = Math.sin(da) * spd * 1.05;
        proj.owner = target;
        proj.immuneFrames = target.weaponDef.id === 'fists' ? 20 : 8;
        if (target.weaponDef.id === 'fists') {
          // Fists parry ranged: take 50% damage, projectile bounces as normal
          target.takeDamage(proj.damage * 0.5, proj.x, proj.y, false, proj.owner);
        }
        spawnSparks(proj.x, proj.y, 5);
        sfxParry();
        break;
      }

      // Check body hit
      if (dist2(proj.x, proj.y, target.x, target.y) < (proj.r + target.radius) * (proj.r + target.radius)) {
        const isCrit = Math.random() < proj.owner.critChance;
        const rageMult = (state.matchTime >= 80 * 60) ? 1.5 : 1.0;
        const baseProjDmg = proj.damage * rageMult;
        // Skill: Predator — +15% if target has less HP
        const predMult = (proj.owner.skills?.includes('predator') && target.hp < proj.owner.hp) ? 1.15 : 1;
        const dmg = baseProjDmg * (isCrit ? proj.owner.critMult : 1) * predMult;
        const projHit = target.takeDamage(dmg, proj.x, proj.y, isCrit, proj.owner);
        if (projHit) {
          // log
          if (isCrit) {
            addBattleLog('proj_crit', { attacker: getBallLabel(proj.owner), defender: getBallLabel(target), damage: dmg, baseDmg: +baseProjDmg.toFixed(2), critMult: proj.owner.critMult, aColor: proj.owner.color, dColor: target.color, defHp: target.hp });
          } else {
            addBattleLog('proj', { attacker: getBallLabel(proj.owner), defender: getBallLabel(target), damage: dmg, aColor: proj.owner.color, dColor: target.color, defHp: target.hp });
          }
          proj.owner.stats.hits++;
          proj.owner.stats.damageDone += dmg;
          sfxHit();
          const ka = Math.atan2(target.y - proj.y, target.x - proj.x);
          target.vx += Math.cos(ka) * 4.5;
          target.vy += Math.sin(ka) * 4.5;
          target.bounceCooldown = 14;
          proj.owner.weaponDef.onHit(proj.owner.weapon);
          skillOnHit(proj.owner, target, dmg);
        } else {
          addBattleLog('proj_evade', { attacker: getBallLabel(proj.owner), defender: getBallLabel(target), aColor: proj.owner.color, dColor: target.color });
        }
        proj.alive = false;
        break;
      }
    }
  }
}

function _checkWeaponHit(attacker, defender) {
  // No friendly fire in team matches
  if (attacker.teamId >= 0 && attacker.teamId === defender.teamId) return;
  if (attacker.weapon.cooldown > 0) return;
  if (defender.immunityFrames > 0) return;
  const def = attacker.weaponDef;
  if (def.aiType === 'ranged') return; // ranged weapons don't melee-hit

  const pts = def.getHitPoints(attacker);
  for (const p of pts) {
    const threshold = p.r + defender.radius;
    if (dist2(p.x, p.y, defender.x, defender.y) < threshold*threshold) {
      const isCrit = Math.random() < attacker.critChance;
      const isHammer = def.id === 'hammer';
      // Hammer: final damage += knockback / 2
      const kbBonus = isHammer
        ? (def.baseKnockback + (attacker.weapon.bonusKnockback||0)) / 2
        : 0;
      const baseDmgNoCrit = attacker.getDamage() + kbBonus;
      // Skill: Predator — +15% damage when target has less HP
      const predMult = (attacker.skills?.includes('predator') && defender.hp < attacker.hp) ? 1.15 : 1;
      // Skill: Exploit — (IQ+BIQ)×1% chance to deal double damage
      const exploitChance = attacker.skills?.includes('exploit')
        ? ((attacker.charIQ || 0) + (attacker.charBIQ || 0)) * 0.01 : 0;
      const isExploit = exploitChance > 0 && Math.random() < exploitChance;
      const dmg = baseDmgNoCrit * (isCrit ? attacker.critMult : 1) * predMult * (isExploit ? 2 : 1);
      const hitResult = defender.takeDamage(dmg, attacker.x, attacker.y, isCrit, attacker);
      if (hitResult) {
        const rageCDMult = (state.matchTime >= 80 * 60) ? 0.7 : 1.0;
        attacker.weapon.cooldown = Math.max(1, Math.floor(attacker.weapon.attackCooldown * rageCDMult));
        attacker.stats.hits++;
        attacker.stats.damageDone += dmg;
        sfxHit();
        // Battle log: hit or crit
        if (isCrit) {
          addBattleLog('crit', { attacker: getBallLabel(attacker), defender: getBallLabel(defender), damage: dmg, baseDmg: +baseDmgNoCrit.toFixed(2), critMult: attacker.critMult, aColor: attacker.color, dColor: defender.color, defHp: +Math.max(0, defender.hp).toFixed(1) });
        } else {
          addBattleLog('hit', { attacker: getBallLabel(attacker), defender: getBallLabel(defender), damage: dmg, aColor: attacker.color, dColor: defender.color, defHp: +Math.max(0, defender.hp).toFixed(1) });
        }
        // Exploit: flash badge + text
        if (isExploit) {
          spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 20, '💡 EXPLOIT! ×2', '#ffdd00');
          if (typeof flashSkillHUD === 'function') flashSkillHUD(attacker, SKILL_MAP['exploit']);
        }
        // Hammer slow: -30% spin speed for 1.5s (90 frames)
        if (isHammer) {
          defender.weapon.spinSlowTimer = 90;
          spawnDamageNumber(defender.x, defender.y - defender.radius - 18, 'SLOW', '#ff9933');
        }
        // Knockback — cancel defender's current velocity toward attacker first
        const ka = Math.atan2(defender.y - attacker.y, defender.x - attacker.x);
        const kb = attacker.getKnockback();
        // Remove inward velocity so knockback always sends them flying outward
        const inward = defender.vx * -Math.cos(ka) + defender.vy * -Math.sin(ka);
        if (inward > 0) { defender.vx += Math.cos(ka)*inward; defender.vy += Math.sin(ka)*inward; }
        defender.vx += Math.cos(ka) * kb * 1.4;
        defender.vy += Math.sin(ka) * kb * 1.4;
        defender.bounceCooldown = 18;   // defender AI backs off after being hit
        // Scaling
        def.onHit(attacker.weapon);
        skillOnHit(attacker, defender, dmg);
      } else {
        // Evaded
        addBattleLog('evade', { attacker: getBallLabel(attacker), defender: getBallLabel(defender), aColor: attacker.color, dColor: defender.color });
      }
      return;
    }
  }
}
// ============================================================
// GAME STATE
// ============================================================
let state = {
  running: false,
  paused: false,
  ended: false,
  players: [],
  projectiles: [],
  arena: null,
  gravity: false,
  speed: 1,
  frame: 0,
  fighters: [],
  arenaId: 'square',
  winner: null,
  // Countdown + timer
  phase: 'menu',       // 'countdown' | 'playing'
  countdownFrame: 0,
  matchTime: 0,
  // BO3 (set by tournament)
  bo3: null,           // { wins:[0,0], gameNum:1, fighters:[f0,f1] } or null
  // Tournament
  tournament: null,    // { size, rounds, currentRound, currentMatch, ... } or null
  tournament2v2: null, // 2v2 tournament state or null
  matchMode: '1v1',    // '1v1' | '2v2'
  teamIds: [],         // array of teamId per fighter index
  winTeam: -1,         // winning team index in 2v2
};
// ============================================================
// GAME LOOP
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let rafId = null;

function gameLoop() {
  if (!state.running) return;
  rafId = requestAnimationFrame(gameLoop);

  if (state.phase === 'countdown') {
    state.countdownFrame++;
    // 4 phases × 60f: "3" (0–59), "2" (60–119), "1" (120–179), "FIGHT!" (180–239)
    if (state.countdownFrame >= 240) {
      state.phase = 'playing';
      for (const b of state.players) {
        b.vx = b._launchVx || 0;
        b.vy = b._launchVy || 0;
        skillOnPreCombat(b);
      }
    }
  } else if (!state.paused && !state.ended) {
    for (let s = 0; s < state.speed; s++) step();
    state.matchTime += state.speed;
  }

  render();
  updateHUD();
  updateTimerDisplay();
}

function step() {
  state.frame++;
  const players = state.players;

  // Update each ball — pass nearest alive enemy for targeting/firing
  for (const ball of players) {
    let nearest = null, nearestD = Infinity;
    for (const other of players) {
      if (other === ball || !other.alive) continue;
      // Skip teammates in team matches
      if (ball.teamId >= 0 && ball.teamId === other.teamId) continue;
      const d = Math.hypot(ball.x - other.x, ball.y - other.y);
      if (d < nearestD) { nearestD = d; nearest = other; }
    }
    ball.update(state.arena, nearest, state.projectiles, state.gravity);
  }

  // Update projectiles
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    state.projectiles[i].update(state.arena);
    if (!state.projectiles[i].alive) state.projectiles.splice(i, 1);
  }

  // All-pairs body/weapon collision
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      collidePair(players[i], players[j]);
    }
  }

  // Projectiles vs all balls
  resolveProjectiles(players, state.projectiles);

  updateParticles();

  // ── Per-second stats snapshot ──
  if (state.phase === 'playing' && state.matchTime % 60 === 0) {
    const snap = {
      second: Math.floor(state.matchTime / 60),
      balls: players.map(b => {
        const spd  = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
        const spin = Math.abs(b.getSpeed ? b.getSpeed() : 0);
        const dmgDelta = b.stats.damageDone - (b._lastDmgSnap ?? 0);
        b._lastDmgSnap = b.stats.damageDone;
        return { name: getBallLabel(b), color: b.color,
          speed:    +spd.toFixed(2),
          spin:     +spin.toFixed(4),
          dmg:      +dmgDelta.toFixed(2),
          scaleVal: getBallScaleVal(b),
          scaleUnit: getBallScaleUnit(b),
        };
      })
    };
    state.statsLog.push(snap);
  }

  // ── Speed Floor: after 60s → +5% maxSpd every 10s ──
  if (state.matchTime >= 60 * 60) {
    const steps = Math.floor((state.matchTime - 60 * 60) / (10 * 60));
    const mult  = 1 + steps * 0.05;
    for (const b of players) b.maxSpd = b.baseMaxSpd * mult;
  }

  // ── Milestone announcements (one-shot) ──
  if (!state.speedFloorActive && state.matchTime >= 60 * 60) {
    state.speedFloorActive = true;
    spawnBigAnnouncement('SPEED UP!', '#ffcc00');
  }
  if (!state.rageModeActive && state.matchTime >= 80 * 60) {
    state.rageModeActive = true;
    spawnBigAnnouncement('RAGE MODE!', '#ff4400');
  }


  // Check game end
  const alive = players.filter(b => b.alive);
  if (!state.ended && players.length > 1) {
    if (state.matchMode === '2v2') {
      const t0 = alive.filter(b => b.teamId === 0).length;
      const t1 = alive.filter(b => b.teamId === 1).length;
      if (t0 === 0 || t1 === 0) {
        state.ended = true;
        state.winTeam = (t0 > 0) ? 0 : (t1 > 0) ? 1 : -1;
        state.winner  = state.winTeam >= 0
          ? alive.find(b => b.teamId === state.winTeam) ?? null
          : 'draw';
        setTimeout(() => showResult(), 1200);
      }
    } else {
      if (alive.length <= 1) {
        state.ended = true;
        state.winner = alive.length === 0 ? 'draw' : alive[0];
        setTimeout(() => showResult(), 1200);
      }
    }
  }
}

function render() {
  ctx.clearRect(0, 0, CW, CH);
  // Background
  ctx.fillStyle = '#080818';
  ctx.fillRect(0, 0, CW, CH);

  drawArena(ctx, state.arena);

  // Draw weapons behind balls
  for (const b of state.players) b.drawWeapon(ctx);

  // Draw projectiles
  for (const p of state.projectiles) p.draw(ctx);

  // Draw balls
  for (const b of state.players) b.draw(ctx);

  drawParticles(ctx);

  // Game ended overlay
  if (state.ended) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.restore();
  }

  // Countdown overlay
  if (state.phase === 'countdown') renderCountdown();

  // Speed Floor overlay — subtle yellow pulse after 60s
  if (state.matchTime >= 60 * 60 && state.matchTime < 80 * 60 && !state.ended) {
    const a = 0.025 + 0.015 * Math.sin(state.matchTime * 0.08);
    ctx.save(); ctx.fillStyle = `rgba(255,210,0,${a})`; ctx.fillRect(0,0,CW,CH); ctx.restore();
  }
  // Rage Mode overlay — red pulse after 80s (overrides yellow)
  if (state.matchTime >= 80 * 60 && !state.ended) {
    const a = 0.04 + 0.03 * Math.sin(state.matchTime * 0.15);
    ctx.save(); ctx.fillStyle = `rgba(255,50,0,${a})`; ctx.fillRect(0,0,CW,CH); ctx.restore();
  }
  // Big announcements
  updateDrawBigAnnouncements(ctx);
}

function renderCountdown() {
  const f = state.countdownFrame;
  const phase = Math.floor(f / 60);
  const labels = ['3', '2', '1', 'FIGHT!'];
  const colors = ['#ff6666', '#ffaa44', '#ffff44', '#66ff99'];
  if (phase >= labels.length) return;

  const frameInPhase = f % 60;
  const scale = 1 + Math.max(0, 0.55 * (1 - frameInPhase / 25));
  const alpha = frameInPhase < 8 ? frameInPhase / 8 :
                frameInPhase > 50 ? 1 - (frameInPhase - 50) / 10 : 1;

  ctx.save();
  if (phase < 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, 0, CW, CH);
  }
  const fontSize = phase === 3 ? 78 : 108;
  ctx.font = `900 ${Math.round(fontSize * scale)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.shadowColor = colors[phase];
  ctx.shadowBlur = 50;
  ctx.fillStyle = colors[phase];
  ctx.fillText(labels[phase], CW / 2, CH / 2);
  ctx.restore();
}

function updateHUD() {
  state.players.forEach((ball, i) => {
    const curHp = Math.max(0, Math.round(ball.hp));
    const maxHp = Math.round(ball.maxHp);
    const pct   = Math.max(0, curHp / maxHp * 100);
    const fill  = document.getElementById(`hud-hp-fill-${i}`);
    const val   = document.getElementById(`hud-hp-val-${i}`);
    const scale = document.getElementById(`hud-scale-${i}`);
    if (fill)  fill.style.width = pct + '%';
    if (val)   val.textContent  = `${curHp} / ${maxHp}`;
    if (scale) scale.textContent = ball.getScaleLabel();
  });
}

function updateTimerDisplay() {
  const el = document.getElementById('match-timer');
  const ov = document.getElementById('overtime-label');
  if (!el) return;
  const secs = Math.floor(state.matchTime / 60);
  const m    = Math.floor(secs / 60);
  const s    = String(secs % 60).padStart(2, '0');
  el.textContent = `${m}:${s}`;
  // Mode badge
  if (state.matchTime >= 80 * 60) {
    el.className = 'overtime'; // reuse red pulse style
    if (ov) { ov.textContent = 'RAGE'; ov.style.color = '#ff4400'; ov.style.display = ''; }
  } else if (state.matchTime >= 60 * 60) {
    el.className = '';
    if (ov) { ov.textContent = 'SPEED UP'; ov.style.color = '#ffcc00'; ov.style.display = ''; }
  } else {
    el.className = '';
    if (ov) ov.style.display = 'none';
  }
}

function updateBO3Display() {
  const bar = document.getElementById('bo3-score-bar');
  if (!bar) return;
  if (!state.bo3) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  const { wins, fighters, winsNeeded } = state.bo3;
  const needed = winsNeeded ?? 2;
  const f1 = fighters[0], f2 = fighters[1];
  document.getElementById('bo3-f1-name').textContent = f1?.charName ?? f1?.weaponId ?? '—';
  document.getElementById('bo3-f2-name').textContent = f2?.charName ?? f2?.weaponId ?? '—';
  document.getElementById('bo3-score').textContent = `${wins[0]} : ${wins[1]}`;
  // Win pips — dynamically render correct count based on winsNeeded
  ['bo3-pips','bo3-pips-r'].forEach((id, fi) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < needed; i++) {
      const span = document.createElement('span');
      if (i < wins[fi]) span.classList.add('won');
      el.appendChild(span);
    }
  });
}

// ── Skill trigger color by type ── (matches SKILL_DEFS .type values)
function _skillTriggerColor(type) {
  return { passive:'#e8c87a', pre_combat:'#c9902a', in_combat:'#cc3333', post_combat:'#6aaa44' }[type] ?? '#b8a070';
}

// ── Flash a skill badge on the fighter's HUD card ──
// Adds .glowing class to the badge → animation runs 1.5s → fades back to dim.
// Re-triggering before timeout = animation restarts (forceReflow trick).
// Call: flashSkillHUD(ball, skillDef)
function flashSkillHUD(ball, skillDef) {
  const idx = state.players.indexOf(ball);
  if (idx < 0) return;
  const container = document.getElementById(`hud-skills-${idx}`);
  if (!container) return;
  const badge = container.querySelector(`[data-skill-id="${skillDef.id}"]`);
  if (!badge) return;

  // Restart animation on re-trigger
  badge.classList.remove('glowing');
  void badge.offsetWidth; // force reflow so browser sees class was removed
  badge.classList.add('glowing');

  // Clear old timer, set new one (matches animation duration)
  if (badge._glowTimer) clearTimeout(badge._glowTimer);
  badge._glowTimer = setTimeout(() => {
    badge.classList.remove('glowing');
    badge._glowTimer = null;
  }, 1500);
}

function buildHUD() {
  const leftEl  = document.getElementById('hud-left');
  const rightEl = document.getElementById('hud-right');
  leftEl.innerHTML  = '';
  rightEl.innerHTML = '';

  state.players.forEach((ball, i) => {
    const def    = ball.weaponDef;
    const name   = ball.charName
      ? `${ball.charEmoji ?? ''} ${ball.charName}`
      : def.name;
    const wepSub = ball.charName ? `${def.icon} ${def.name}` : '';
    const maxHp  = Math.round(ball.maxHp);

    const card = document.createElement('div');
    card.className = 'hud-card';
    card.style.color = ball.color;
    card.innerHTML = `
      <div class="hud-card-top">
        <div class="hud-card-name" style="color:${ball.color}">
          ${name}
          ${wepSub ? `<span class="wep-sub">${wepSub}</span>` : ''}
        </div>
        <span class="hp-fraction" id="hud-hp-val-${i}">${maxHp} / ${maxHp}</span>
      </div>
      <div class="hp-track">
        <div class="hp-fill" id="hud-hp-fill-${i}"
             style="width:100%;background:${ball.color};box-shadow:0 0 6px ${ball.color}88;"></div>
      </div>
      <span class="hud-scale-tag" id="hud-scale-${i}">${ball.getScaleLabel()}</span>
    `;

    // Skill badges — dim by default, glow on trigger via flashSkillHUD()
    const skillsEl = document.createElement('div');
    skillsEl.className = 'hud-skills';
    skillsEl.id = `hud-skills-${i}`;
    if (ball.skills?.length && typeof SKILL_DEFS !== 'undefined') {
      ball.skills.forEach(sid => {
        const def = SKILL_DEFS.find(s => s.id === sid);
        if (!def) return;
        const badge = document.createElement('span');
        badge.className = 'hud-skill-badge' + (def.type === 'passive' ? ' always-active' : '');
        badge.dataset.skillId = sid;
        badge.style.setProperty('--skill-color', _skillTriggerColor(def.type));
        badge.title = def.desc || '';
        badge.textContent = `${def.icon ?? '✦'} ${def.name}`;
        skillsEl.appendChild(badge);
      });
    }
    card.appendChild(skillsEl);

    // In 2v2: team0 (idx 0,1) → left; team1 (idx 2,3) → right
    // In 1v1/FFA: even → left, odd → right
    const goLeft = state.matchMode === '2v2' ? (ball.teamId === 0 || i < 2) : (i % 2 === 0);
    (goLeft ? leftEl : rightEl).appendChild(card);
  });
}
// ============================================================
// GAME SETUP
// ============================================================
function initGame() {
  const arenaConfig = JSON.parse(JSON.stringify(ARENAS[state.arenaId]));
  state.arena = arenaConfig;
  const N = state.fighters.length;

  // Determine arena center + spread radius
  let cx, cy, spreadR;
  if (arenaConfig.type === 'circle') {
    cx = arenaConfig.cx; cy = arenaConfig.cy;
    spreadR = arenaConfig.r * 0.45;
  } else if (arenaConfig.type === 'rect') {
    cx = arenaConfig.x + arenaConfig.w / 2;
    cy = arenaConfig.y + arenaConfig.h / 2;
    spreadR = Math.min(arenaConfig.w, arenaConfig.h) * 0.33;
  } else if (arenaConfig.type === 'cross') {
    cx = arenaConfig.cx; cy = arenaConfig.cy;
    spreadR = arenaConfig.thick * 0.38;
  } else if (arenaConfig.type === 'hole') {
    cx = arenaConfig.x + arenaConfig.w / 2;
    cy = arenaConfig.y + arenaConfig.h / 2;
    spreadR = Math.min(arenaConfig.w, arenaConfig.h) * 0.34;
  } else { // square
    cx = arenaConfig.x + arenaConfig.w / 2;
    cy = arenaConfig.y + arenaConfig.h / 2;
    spreadR = Math.min(arenaConfig.w, arenaConfig.h) * 0.34;
  }

  // Spread N balls evenly in a circle around center
  const positions = [];
  if (state.matchMode === '2v2' && N === 4) {
    // Team 0 on left, Team 1 on right, staggered vertically
    const gap = Math.min(70, spreadR * 0.4);
    positions.push({ x: cx - spreadR, y: cy - gap }); // team0 ball0
    positions.push({ x: cx - spreadR, y: cy + gap }); // team0 ball1
    positions.push({ x: cx + spreadR, y: cy - gap }); // team1 ball0
    positions.push({ x: cx + spreadR, y: cy + gap }); // team1 ball1
  } else if (N === 2) {
    positions.push({ x: cx - spreadR, y: cy });
    positions.push({ x: cx + spreadR, y: cy });
  } else {
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      positions.push({ x: cx + Math.cos(a) * spreadR, y: cy + Math.sin(a) * spreadR });
    }
  }

  const balls = state.fighters.map((fighter, i) => {
    const pos = positions[i];
    const side = i === 0 ? 'left' : 'right';
    const tId  = (state.matchMode === '2v2' && state.teamIds) ? (state.teamIds[i] ?? -1) : -1;
    const ball = new Ball(pos.x, pos.y, fighter.color, fighter.weaponId, side, fighter.charStats || null, tId);
    ball.charName  = fighter.charName  || null;
    ball.charEmoji = fighter.charEmoji || '';

    // Skills — copy from fighter data, apply passives
    ball.skills = fighter.skills || [];
    applySkillPassives(ball, fighter);
    initRoundSkillState(ball);

    // launchSpeed: nếu có chargen SPD → SPD + random(1~3), không thì 3 + random(0~3)
    const launchAngle = Math.atan2(pos.y - cy, pos.x - cx) + (Math.random() - 0.5) * 0.8;
    let launchSpd;
    if (fighter.charStats?.speed != null) {
      const randPart = 1 + Math.random() * 2;          // 1.0 ~ 3.0
      launchSpd = fighter.charStats.speed + randPart;
      const badThresh  = fighter.charStats.speed + 1.3;
      const goodThresh = fighter.charStats.speed + 2.5;
      if (launchSpd < badThresh)       { ball.speechText = '😴 Bad Start';    ball.speechFrames = 150; }
      else if (launchSpd > goodThresh) { ball.speechText = '🔥 Great Start!'; ball.speechFrames = 150; }
    } else {
      launchSpd = 3 + Math.random() * 3;               // legacy: 3.0 ~ 6.0
      if (launchSpd < 3.7)      { ball.speechText = '😴 Bad Start';    ball.speechFrames = 150; }
      else if (launchSpd > 4.8) { ball.speechText = '🔥 Great Start!'; ball.speechFrames = 150; }
    }
    // Store launch velocity — applied after countdown
    ball._launchVx = Math.cos(launchAngle) * launchSpd;
    ball._launchVy = Math.sin(launchAngle) * launchSpd;
    ball.vx = 0;
    ball.vy = 0;
    ball.weapon.angle = launchAngle;
    return ball;
  });

  state.players = balls;
  state.projectiles = [];
  state.frame = 0;
  state.ended = false;
  state.winner = null;
  state.winTeam    = -1;
  state.speedFloorActive = false;
  state.rageModeActive   = false;
  state.battleLog = [];
  state.statsLog  = [];   // per-second snapshots for charts
  updateLiveLog(); // clear the live panel
  // matchMode is set by caller; default to '1v1' if not set
  if (!state.matchMode) state.matchMode = '1v1';
  state.phase = 'countdown';
  state.countdownFrame = 0;
  state.matchTime = 0;
  particles.length = 0;

  buildHUD();
  updateBO3Display();
  updateTimerDisplay();
}

function startGame() {
  // Random arena for tournament matches
  if (state.tournament && !state.bo3?.gameNum > 1) state.arenaId = randomArena();
  state.matchMode = state.matchMode ?? '1v1';
  state.teamIds   = state.teamIds ?? [];
  initGame();
  state.running = true;
  state.paused  = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(gameLoop);
}

function stopGame() {
  state.running = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}
// ============================================================
// RESULT SCREEN
// ============================================================
function showResult() {
  const titleEl  = document.getElementById('rTitle');
  const statsEl  = document.getElementById('rStats');
  const bo3Panel = document.getElementById('bo3-result-panel');
  const rematch  = document.getElementById('rematchBtn');
  const nextGame = document.getElementById('nextGameBtn');
  const bracketB = document.getElementById('bracketBtn');

  const ballLabel = b => b.charName
    ? `${b.charEmoji ?? ''} ${b.charName} <span style="color:#888;font-size:.8em">(${b.weaponDef.icon} ${b.weaponDef.name})</span>`
    : `${b.weaponDef.icon} ${b.weaponDef.name}`;

  if (state.winner === 'draw' || (state.matchMode === '2v2' && state.winTeam === -1)) {
    titleEl.textContent = '🤝 DRAW!';
    titleEl.className = 'r-title draw';
  } else if (state.matchMode === '2v2' && state.winTeam >= 0) {
    const TC = ['#00ddff', '#ff8833'];
    const tc = TC[state.winTeam];
    const teamName = state.bo3?.fighters?.[state.winTeam]?.charName ?? `Team ${state.winTeam + 1}`;
    titleEl.innerHTML = `<span style="color:${tc};text-shadow:0 0 25px ${tc}">⚔️ ${teamName} WINS!</span>`;
    titleEl.className = 'r-title';
  } else {
    const w = state.winner;
    titleEl.innerHTML = `<span style="color:${w.color};text-shadow:0 0 25px ${w.color}">● ${ballLabel(w)} WINS!</span>`;
    titleEl.className = 'r-title';
  }

  const lines = state.players.map(ball => {
    const isWinner = ball === state.winner;
    return `<strong style="color:${ball.color}">● ${ballLabel(ball)}</strong>${isWinner ? ' 🏆' : ''}<br>
    Hits: ${ball.stats.hits} &nbsp;|&nbsp; Parries: ${ball.stats.parries} &nbsp;|&nbsp; Damage: ${ball.stats.damageDone.toFixed(0)}<br>
    Scaling: ${ball.getScaleLabel()}`;
  });
  statsEl.innerHTML = lines.join('<br><br>') + `<br><br><em style="color:#555">Duration: ${(state.matchTime / 60).toFixed(1)}s</em>`;

  // ── BO3 handling ──
  rematch.style.display  = '';
  nextGame.style.display = 'none';
  bracketB.style.display = 'none';
  bo3Panel.style.display = 'none';
  const menuBtnR = document.getElementById('menuBtnR');
  const blogBtn  = document.getElementById('battleLogBtn');
  const statsBtn = document.getElementById('statsLogBtn');
  if (menuBtnR) menuBtnR.style.display = '';
  if (blogBtn)  blogBtn.style.display  = (state.battleLog?.length > 0) ? '' : 'none';
  if (statsBtn) statsBtn.style.display = (state.statsLog?.length > 1) ? '' : 'none';

  if (state.bo3) {
    const bo3 = state.bo3;
    bo3Panel.style.display = '';
    rematch.style.display  = 'none';
    if (menuBtnR) menuBtnR.style.display = 'none';

    // Record game result
    if (state.winner !== 'draw') {
      const winIdx = state.matchMode === '2v2' ? state.winTeam : state.players.indexOf(state.winner);
      if (winIdx >= 0) bo3.wins[winIdx]++;
    }
    bo3.gameNum++;

    // Update BO3 result panel
    const f0 = bo3.fighters[0], f1 = bo3.fighters[1];
    document.getElementById('bo3-r-f1').textContent = f0?.charName ?? f0?.weaponId ?? '—';
    document.getElementById('bo3-r-f2').textContent = f1?.charName ?? f1?.weaponId ?? '—';
    document.getElementById('bo3-r-score').textContent = `${bo3.wins[0]} : ${bo3.wins[1]}`;

    // Sync wins back to bracket match record
    if (state.tournament2v2 && state.matchMode === '2v2') {
      const t  = state.tournament2v2;
      const m  = t.rounds[t.currentRound]?.[t.currentMatch];
      if (m) m.bo3Wins = [...bo3.wins];
    } else if (state.tournament) {
      const t  = state.tournament;
      const m  = t.rounds[t.currentRound]?.[t.currentMatch];
      if (m) m.bo3Wins = [...bo3.wins];
    }

    const winsNeeded = bo3.winsNeeded ?? 2;
    const matchWinner = bo3.wins[0] >= winsNeeded ? 0 : bo3.wins[1] >= winsNeeded ? 1 : -1;
    if (matchWinner >= 0) {
      const mw = bo3.fighters[matchWinner];
      document.getElementById('bo3-game-label').textContent =
        `Match over — ${mw.charName ?? mw.weaponId} advances!`;
      bracketB.style.display = '';
      // Record in tournament bracket
      if (state.tournament2v2 && state.matchMode === '2v2') {
        recordTournamentMatchResult2v2(mw);
        if (state.tournament2v2.completed) bracketB.textContent = '🏆 Final Results';
      } else if (state.tournament) {
        recordTournamentMatchResult(mw);
        if (state.tournament.completed) {
          bracketB.textContent = '🏆 Final Results';
        }
      }
    } else {
      const gameNum = bo3.gameNum;
      const totalGames = (winsNeeded * 2) - 1;
      document.getElementById('bo3-game-label').textContent =
        `Game ${gameNum - 1} done · Next: Game ${gameNum} of ${totalGames}`;
      nextGame.style.display = '';
    }
  }

  // Post-combat skill hooks (Learning, Adaptation)
  state.players.forEach((ball, i) => {
    const fi = state.fighters[i];
    if (!fi) return;
    const won = state.matchMode === '2v2'
      ? (ball.teamId === state.winTeam)
      : (ball === state.winner);
    skillOnPostCombat(ball, won, fi);
  });

  showScreen('result');
}
// ============================================================
// TOURNAMENT
// ============================================================
// Convert a cgRoster entry → fighter object (used by state.fighters / bracket)
function rosterToFighter(ch) {
  return {
    weaponId:   ch.weapon,
    color:      ch.color,
    charName:   ch.name,
    charEmoji:  ch.raceEmoji ?? '',
    charStats:  { ...ch.stats, race: ch.race ?? null, subrace: ch.subrace ?? null },
    skills:     ch.skills ?? [],
  };
}

function randomArena() {
  const keys = Object.keys(ARENAS);
  return keys[Math.floor(Math.random() * keys.length)];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeBotFighter(idx) {
  const color = BALL_COLORS[idx % BALL_COLORS.length];
  const wpId  = WEAPON_DEFS[Math.floor(Math.random() * WEAPON_DEFS.length)].id;
  const stats = {
    strength:   Math.ceil(Math.random() * 7) + 1,
    speed:      Math.ceil(Math.random() * 7) + 1,
    durability: Math.ceil(Math.random() * 7) + 1,
    iq:         Math.ceil(Math.random() * 5) + 1,
    biq:        Math.ceil(Math.random() * 5) + 1,
    ma:         Math.ceil(Math.random() * 5) + 1,
  };
  return { weaponId: wpId, color, charName: `Bot ${idx + 1}`, charEmoji: '🤖', charStats: stats, isBot: true };
}

function createTournament(size, roster) {
  const participants = [...roster];
  // Pad with bots up to tournament size
  while (participants.length < size) {
    participants.push(makeBotFighter(participants.length));
  }
  shuffle(participants);

  // Build all rounds (single-elimination)
  const rounds = [];
  let prev = participants;
  while (prev.length > 1) {
    const round = [];
    for (let i = 0; i < prev.length; i += 2) {
      round.push({ p1: prev[i], p2: prev[i + 1], winner: null, bo3Wins: [0, 0] });
    }
    rounds.push(round);
    prev = new Array(round.length).fill(null); // placeholders for next round
  }

  return { size, rounds, currentRound: 0, currentMatch: 0, completed: false };
}

function recordTournamentMatchResult(matchWinner) {
  const t = state.tournament;
  if (!t) return;
  const round = t.rounds[t.currentRound];
  const match = round[t.currentMatch];
  match.winner = matchWinner;

  // Place winner into next round if exists
  if (t.currentRound + 1 < t.rounds.length) {
    const nextRound   = t.rounds[t.currentRound + 1];
    const nextMatchIdx = Math.floor(t.currentMatch / 2);
    const slot = t.currentMatch % 2 === 0 ? 'p1' : 'p2';
    nextRound[nextMatchIdx][slot] = matchWinner;
  }

  // Advance pointer
  t.currentMatch++;
  if (t.currentMatch >= round.length) {
    t.currentRound++;
    t.currentMatch = 0;
    if (t.currentRound >= t.rounds.length) {
      t.completed = true;
    }
  }
  renderBracket();
}

function getNextTournamentMatch() {
  const t = state.tournament;
  if (!t || t.completed) return null;
  return t.rounds[t.currentRound]?.[t.currentMatch] ?? null;
}

function renderBracket() {
  const t = state.tournament;
  const container = document.getElementById('bracket-content');
  const titleEl   = document.getElementById('bracket-title');
  if (!container || !t) return;

  const roundNames = ['Round 1','Round 2','Quarter-Finals','Semi-Finals','Final'];
  const totalRounds = t.rounds.length;

  titleEl.textContent = t.completed ? '🏆 Tournament Complete!' : '🏆 Tournament Bracket';

  container.innerHTML = '';
  t.rounds.forEach((round, ri) => {
    const col = document.createElement('div');
    col.className = 'bracket-round';
    const label = document.createElement('div');
    label.className = 'bracket-round-label';
    const labelIdx = totalRounds - 1 - ri;
    label.textContent = roundNames[Math.min(labelIdx, roundNames.length - 1)] ??
                        `Round ${ri + 1}`;
    col.appendChild(label);

    round.forEach((match, mi) => {
      const isCurrent = ri === t.currentRound && mi === t.currentMatch && !t.completed;
      const isDone    = match.winner !== null;
      const div = document.createElement('div');
      div.className = 'bracket-match' + (isCurrent ? ' current' : '') + (isDone ? ' done' : '');

      const players = [match.p1, match.p2];
      players.forEach(p => {
        const row = document.createElement('div');
        row.className = 'bracket-player' + (p && match.winner === p ? ' winner' : '');
        const dot = document.createElement('span');
        dot.className = 'bp-dot';
        dot.style.background = p?.color ?? '#333';
        const name = document.createElement('span');
        name.textContent = p ? (p.charName ?? p.weaponId ?? '?') : '—';
        row.appendChild(dot);
        row.appendChild(name);
        div.appendChild(row);
      });

      if (isDone && match.bo3Wins) {
        const sc = document.createElement('div');
        sc.className = 'bracket-score';
        sc.textContent = `${match.bo3Wins[0]} – ${match.bo3Wins[1]}`;
        div.appendChild(sc);
      }
      col.appendChild(div);
    });
    container.appendChild(col);
  });

  // Champion display
  if (t.completed) {
    const lastRound = t.rounds[t.rounds.length - 1];
    const champion  = lastRound[0]?.winner;
    if (champion) {
      const champDiv = document.createElement('div');
      champDiv.className = 'bracket-round';
      champDiv.innerHTML = `
        <div class="bracket-round-label">Champion</div>
        <div class="bracket-match current">
          <div class="bracket-player winner" style="color:${champion.color};font-size:14px;font-weight:900;padding:8px 4px">
            <span class="bp-dot" style="background:${champion.color}"></span>
            ${champion.charName ?? champion.weaponId}
          </div>
        </div>`;
      container.appendChild(champDiv);
    }
    document.getElementById('nextMatchBtn').disabled = true;
    document.getElementById('nextMatchBtn').textContent = 'Tournament Over';
  } else {
    document.getElementById('nextMatchBtn').disabled = false;
    document.getElementById('nextMatchBtn').textContent = '⚔️ Fight Next Match';
  }
}

function buildTournamentSetup() {
  if (!state.tournament) state.tournament = { size: 16, selectedFighters: [], mode: '1v1' };
  const t       = state.tournament;
  const size    = t.size ?? 16;
  const tmode   = t.mode ?? '1v1';
  const is2v2   = tmode === '2v2';
  // In 2v2 mode, size = number of TEAMS, so actual fighter slots = size * 2
  const slotCount = is2v2 ? size * 2 : size;
  if (!t.selectedFighters) t.selectedFighters = [];

  // Sync tmode button visual state
  document.querySelectorAll('[data-tmode]').forEach(b => b.classList.toggle('sel', b.dataset.tmode === tmode));

  const roster   = JSON.parse(localStorage.getItem('cgRoster') ?? '[]');
  const selected = t.selectedFighters;  // array of roster indices
  const selCount = selected.length;
  const full     = selCount >= slotCount;

  // ── Header counter ──
  const slotInfo = document.getElementById('t-slot-info');
  if (slotInfo) {
    const bots = Math.max(0, slotCount - selCount);
    slotInfo.textContent = `(${selCount} / ${slotCount} selected${bots > 0 ? ` · ${bots} bot${bots>1?'s':''}` : ''}${is2v2 ? ' · 2v2 mode' : ''})`;
    slotInfo.style.color = selCount >= slotCount ? '#44bb77' : '#556';
  }

  // ── Roster cards ──
  const list = document.getElementById('t-roster-list');
  list.innerHTML = '';

  if (roster.length === 0) {
    const empty = document.createElement('div');
    empty.className = 't-roster-empty';
    empty.textContent = 'No Radosers yet — create some first!';
    list.appendChild(empty);
  } else {
    roster.forEach((r, i) => {
      const isSel    = selected.includes(i);
      const isLocked = !isSel && full;
      const card = document.createElement('div');
      card.className = 't-roster-card' +
        (isSel ? ' selected' : '') +
        (isLocked ? ' full-not-selected' : '');

      const wIcon = WEAPON_DEFS.find(d => d.id === r.weapon)?.icon ?? '';
      card.innerHTML = `
        <span class="t-slot-dot" style="background:${r.color ?? '#888'}"></span>
        <span class="t-card-name" style="color:${r.color ?? '#aac'}">${r.raceEmoji ?? ''} ${r.name ?? `Fighter ${i+1}`}</span>
        <span style="font-size:10px;color:#556">${wIcon} ${r.weapon ?? ''}</span>
        <span class="t-card-check">${isSel ? '✓' : ''}</span>
      `;

      if (!isLocked) {
        card.addEventListener('click', () => {
          if (isSel) {
            const idx = selected.indexOf(i);
            if (idx >= 0) selected.splice(idx, 1);
          } else {
            selected.push(i);
          }
          buildTournamentSetup();
        });
      }
      list.appendChild(card);
    });
  }

  // ── Lineup preview (selected + bots) ──
  const summary = document.getElementById('t-slot-summary');
  if (summary) {
    summary.innerHTML = '';
    // Selected Radosers dots
    selected.forEach(idx => {
      const r = roster[idx];
      if (!r) return;
      const dot = document.createElement('span');
      dot.className = 't-summary-dot';
      dot.style.cssText = `background:${r.color ?? '#888'};box-shadow:0 0 4px ${r.color ?? '#888'}88`;
      dot.title = r.name ?? `Fighter ${idx+1}`;
      summary.appendChild(dot);
    });
    // Bot slots
    const bots = Math.max(0, slotCount - selCount);
    if (bots > 0) {
      const botLabel = document.createElement('span');
      botLabel.className = 't-summary-bot';
      botLabel.textContent = `+ ${bots} bot${bots > 1 ? 's' : ''}`;
      summary.appendChild(botLabel);
    }
  }

  // ── Start button ──
  const startBtn = document.getElementById('tStartBtn');
  if (startBtn) startBtn.disabled = false;
}

// ── 2v2 Tournament ──
function createTournament2v2(numTeams, roster) {
  // Pair fighters into teams of 2
  const fighters = [...roster];
  while (fighters.length < numTeams * 2) fighters.push(makeBotFighter(fighters.length));
  shuffle(fighters);

  // Build teams
  const TC = ['#00ddff','#ff8833','#44ff88','#ff44aa','#ffdd00','#aa44ff','#ff6644','#44aaff'];
  const teams = [];
  for (let i = 0; i < numTeams; i++) {
    const f0 = fighters[i * 2], f1 = fighters[i * 2 + 1];
    teams.push({
      charName: `${f0.charName ?? 'Bot'} & ${f1.charName ?? 'Bot'}`,
      color: TC[i % TC.length],
      fighters: [f0, f1],
      isTeam: true,
    });
  }
  shuffle(teams);

  // Build bracket
  const rounds = [];
  let prev = teams;
  while (prev.length > 1) {
    const round = [];
    for (let i = 0; i < prev.length; i += 2) {
      round.push({ p1: prev[i], p2: prev[i + 1], winner: null, bo3Wins: [0, 0] });
    }
    rounds.push(round);
    prev = new Array(round.length).fill(null);
  }
  return { numTeams, rounds, currentRound: 0, currentMatch: 0, completed: false };
}

function getNextTournamentMatch2v2() {
  const t = state.tournament2v2;
  if (!t || t.completed) return null;
  return t.rounds[t.currentRound]?.[t.currentMatch] ?? null;
}

function recordTournamentMatchResult2v2(winTeamObj) {
  const t = state.tournament2v2;
  if (!t) return;
  const round = t.rounds[t.currentRound];
  const match = round[t.currentMatch];
  match.winner = winTeamObj;

  if (t.currentRound + 1 < t.rounds.length) {
    const nextRound = t.rounds[t.currentRound + 1];
    const nextIdx   = Math.floor(t.currentMatch / 2);
    const slot      = t.currentMatch % 2 === 0 ? 'p1' : 'p2';
    nextRound[nextIdx][slot] = winTeamObj;
  }

  t.currentMatch++;
  if (t.currentMatch >= round.length) {
    t.currentRound++;
    t.currentMatch = 0;
    if (t.currentRound >= t.rounds.length) t.completed = true;
  }
  renderBracket2v2();
}

function renderBracket2v2() {
  const t = state.tournament2v2;
  const container = document.getElementById('bracket-content');
  const titleEl   = document.getElementById('bracket-title');
  if (!container || !t) return;

  titleEl.textContent = t.completed ? '🏆 2v2 Tournament Complete!' : '🏆 2v2 Tournament Bracket';
  container.innerHTML = '';

  const roundNames = ['Round 1','Round 2','Quarter-Finals','Semi-Finals','Final'];
  const totalRounds = t.rounds.length;

  t.rounds.forEach((round, ri) => {
    const col = document.createElement('div');
    col.className = 'bracket-round';
    const label = document.createElement('div');
    label.className = 'bracket-round-label';
    const labelIdx = totalRounds - 1 - ri;
    label.textContent = roundNames[Math.min(labelIdx, roundNames.length - 1)] ?? `Round ${ri + 1}`;
    col.appendChild(label);

    round.forEach((match, mi) => {
      const isCurrent = ri === t.currentRound && mi === t.currentMatch && !t.completed;
      const isDone    = match.winner !== null;
      const div = document.createElement('div');
      div.className = 'bracket-match' + (isCurrent ? ' current' : '') + (isDone ? ' done' : '');

      [match.p1, match.p2].forEach(team => {
        const row = document.createElement('div');
        row.className = 'bracket-player' + (team && match.winner === team ? ' winner' : '');
        if (team) {
          const tc = team.color ?? '#888';
          row.innerHTML = `
            <span class="bp-dot" style="background:${tc}"></span>
            <span style="font-size:11px;font-weight:900;color:${tc}">${team.charName ?? '?'}</span>`;
          if (team.fighters) {
            const sub = document.createElement('div');
            sub.style.cssText = 'font-size:9px;color:#556;padding-left:16px;line-height:1.5';
            sub.textContent = team.fighters.map(f => f.charName ?? f.weaponId ?? '?').join(' + ');
            row.appendChild(sub);
          }
        } else {
          row.innerHTML = '<span class="bp-dot" style="background:#333"></span><span>—</span>';
        }
        div.appendChild(row);
      });

      if (isDone && match.bo3Wins) {
        const sc = document.createElement('div');
        sc.className = 'bracket-score';
        sc.textContent = `${match.bo3Wins[0]} – ${match.bo3Wins[1]}`;
        div.appendChild(sc);
      }
      col.appendChild(div);
    });
    container.appendChild(col);
  });

  if (t.completed) {
    const champion = t.rounds[t.rounds.length - 1][0]?.winner;
    if (champion) {
      const champDiv = document.createElement('div');
      champDiv.className = 'bracket-round';
      champDiv.innerHTML = `
        <div class="bracket-round-label">Champions</div>
        <div class="bracket-match current">
          <div class="bracket-player winner" style="color:${champion.color};font-size:13px;font-weight:900;padding:8px 4px">
            <span class="bp-dot" style="background:${champion.color}"></span>
            ${champion.charName ?? '?'}
          </div>
        </div>`;
      container.appendChild(champDiv);
    }
    document.getElementById('nextMatchBtn').disabled = true;
    document.getElementById('nextMatchBtn').textContent = 'Tournament Over';
  } else {
    document.getElementById('nextMatchBtn').disabled = false;
    document.getElementById('nextMatchBtn').textContent = '⚔️ Fight Next Match';
  }
}

// Select-all / clear buttons
document.addEventListener('click', e => {
  if (e.target.id === 'tSelectAllBtn') {
    if (!state.tournament) state.tournament = { size: 16, selectedFighters: [], mode: '1v1' };
    const roster = JSON.parse(localStorage.getItem('cgRoster') ?? '[]');
    const size   = state.tournament.size ?? 16;
    const tmode  = state.tournament.mode ?? '1v1';
    const slotCount = tmode === '2v2' ? size * 2 : size;
    // Select as many as possible up to slotCount
    state.tournament.selectedFighters = roster.slice(0, slotCount).map((_, i) => i);
    buildTournamentSetup();
  }
  if (e.target.id === 'tClearBtn') {
    if (state.tournament) state.tournament.selectedFighters = [];
    buildTournamentSetup();
  }
});
// ============================================================
// UI / SCREENS
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  // Stop the game loop only when leaving the game screen (not when navigating to it)
  if (id !== 'game') stopGame();
}

// Build fighters selection panel (multi-ball)
function buildFightersPanel() {
  const panel = document.getElementById('fighters-panel');
  panel.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'fighters-header';
  header.innerHTML = `<span>Fighters <strong>(${state.fighters.length})</strong></span><span style="color:#444">${state.fighters.length}/12</span>`;
  panel.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'fighters-grid';

  state.fighters.forEach((fighter, i) => {
    const card = document.createElement('div');
    card.className = 'fighter-card';
    card.style.borderColor = fighter.color + '66';

    // Top: dot + name
    const top = document.createElement('div');
    top.className = 'fighter-card-top';
    const dot = document.createElement('div');
    dot.className = 'ball-dot';
    dot.style.background = fighter.color;
    dot.style.color = fighter.color;
    const name = document.createElement('div');
    name.className = 'fighter-name';
    name.style.color = fighter.color;
    name.textContent = fighter.charName
      ? `${fighter.charEmoji ?? ''} ${fighter.charName}`
      : `Ball ${i + 1}`;
    top.appendChild(dot);
    top.appendChild(name);
    card.appendChild(top);

    // Weapon grid (icon-only buttons with tooltip)
    const wgrid = document.createElement('div');
    wgrid.className = 'fighter-card-weapons';
    if (fighter.charName) {
      // Radoser: show fixed weapon, no change allowed
      const fixedWep = WEAPON_DEFS.find(d => d.id === fighter.weaponId);
      const label = document.createElement('div');
      label.style.cssText = 'grid-column:1/-1;font-size:10px;color:#888;text-align:center;padding:2px 0;';
      label.textContent = fixedWep ? `${fixedWep.icon} ${fixedWep.name}` : fighter.weaponId;
      wgrid.appendChild(label);
    } else {
      WEAPON_DEFS.forEach(def => {
        const btn = document.createElement('button');
        btn.className = 'wc-btn' + (def.id === fighter.weaponId ? ' sel' : '');
        btn.textContent = def.icon;
        btn.title = def.name;
        btn.addEventListener('click', () => {
          fighter.weaponId = def.id;
          wgrid.querySelectorAll('.wc-btn').forEach(b => b.classList.remove('sel'));
          btn.classList.add('sel');
          sfxShoot();
        });
        wgrid.appendChild(btn);
      });
    }
    card.appendChild(wgrid);

    // Remove button (only when > 2 fighters)
    if (state.fighters.length > 2) {
      const rem = document.createElement('button');
      rem.className = 'remove-btn';
      rem.textContent = '✕';
      rem.title = 'Remove';
      rem.addEventListener('click', () => {
        state.fighters.splice(i, 1);
        buildFightersPanel();
        sfxShoot();
      });
      card.appendChild(rem);
    }

    grid.appendChild(card);
  });

  // Add fighter card (max 12)
  if (state.fighters.length < 12) {
    const addCard = document.createElement('button');
    addCard.className = 'add-fighter-card';
    addCard.innerHTML = `<span style="font-size:20px">+</span><span>${state.fighters.length}/12</span>`;
    addCard.addEventListener('click', () => {
      showFighterPicker();
    });
    grid.appendChild(addCard);
  }

  panel.appendChild(grid);
  updateStartBtn();
}

// Arena selection
document.querySelectorAll('.a-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.a-btn').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    state.arenaId = btn.dataset.a;
  });
});

// Start button — disabled until ≥ 2 fighters
function updateStartBtn() {
  const btn = document.getElementById('startBtn');
  const enough = state.fighters.length >= 2;
  btn.disabled = !enough;
  btn.title = enough ? '' : 'Add at least 2 fighters to start';
}

document.getElementById('startBtn').addEventListener('click', () => {
  if (state.fighters.length < 2) return;
  state.matchMode = '1v1';
  state.teamIds = [];
  state.tournament2v2 = null;
  showScreen('game');
  startGame();
});

updateStartBtn();

// Pause
document.getElementById('pauseBtn').addEventListener('click', () => {
  state.paused = !state.paused;
  document.getElementById('pauseBtn').textContent = state.paused ? '▶ Resume' : '⏸ Pause';
});

// Menu
document.getElementById('menuBtn').addEventListener('click', () => {
  showScreen('menu');
  buildFightersPanel();
});

// Gravity
document.getElementById('gravBtn').addEventListener('click', () => {
  state.gravity = !state.gravity;
  document.getElementById('gravBtn').textContent = `🌍 Gravity: ${state.gravity ? 'On' : 'Off'}`;
});

// Zoom
const ZOOM_LEVELS = [1.0, 0.85, 0.70, 0.55];
let zoomIdx = 0;
const zoomWrapper = document.getElementById('game-zoom-wrapper');
document.getElementById('zoomBtn').addEventListener('click', () => {
  zoomIdx = (zoomIdx + 1) % ZOOM_LEVELS.length;
  const z = ZOOM_LEVELS[zoomIdx];
  zoomWrapper.style.transform = `scale(${z})`;
  document.getElementById('zoomBtn').textContent = `🔍 ${Math.round(z * 100)}%`;
});

// Speed
const speeds = [1, 2, 3, 5];
let speedIdx = 0;
document.getElementById('speedBtn').addEventListener('click', () => {
  speedIdx = (speedIdx + 1) % speeds.length;
  state.speed = speeds[speedIdx];
  document.getElementById('speedBtn').textContent = `⚡ Speed: ${state.speed}x`;
});

// Spacebar = pause
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && state.running) {
    e.preventDefault();
    state.paused = !state.paused;
    document.getElementById('pauseBtn').textContent = state.paused ? '▶ Resume' : '⏸ Pause';
  }
});

// Result buttons
document.getElementById('rematchBtn').addEventListener('click', () => {
  state.bo3 = null;
  showScreen('game');
  startGame();
});
document.getElementById('menuBtnR').addEventListener('click', () => {
  state.bo3 = null;
  state.tournament = null;
  state.tournament2v2 = null;
  state.matchMode = '1v1';
  state.teamIds = [];
  showScreen('menu');
  buildFightersPanel();
});
document.getElementById('nextGameBtn').addEventListener('click', () => {
  // Continue BO3 — keep same fighters, random arena if tournament
  if (state.tournament || state.tournament2v2) state.arenaId = randomArena();
  showScreen('game');
  startGame();
});
document.getElementById('bracketBtn').addEventListener('click', () => {
  if (state.tournament2v2 && state.matchMode === '2v2') {
    renderBracket2v2();
  } else {
    renderBracket();
  }
  showScreen('bracket');
});

// Stats Log button + tabs
document.getElementById('statsLogBtn')?.addEventListener('click', showStatsModal);
document.getElementById('stats-log-close-btn')?.addEventListener('click', () => {
  document.getElementById('stats-log-modal').classList.remove('open');
});
document.getElementById('stats-log-modal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('stats-log-modal'))
    document.getElementById('stats-log-modal').classList.remove('open');
});
document.querySelectorAll('.sc-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    _activeChart = btn.dataset.chart;
    document.querySelectorAll('.sc-tab').forEach(t => t.classList.toggle('sel', t === btn));
    drawStatsChart(_activeChart);
  });
});

// Battle Log button
document.getElementById('battleLogBtn')?.addEventListener('click', showBattleLogModal);
document.getElementById('battle-log-close-btn')?.addEventListener('click', () => {
  document.getElementById('battle-log-modal').classList.remove('open');
});
document.getElementById('battle-log-modal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('battle-log-modal'))
    document.getElementById('battle-log-modal').classList.remove('open');
});

// Live log collapse toggle
document.getElementById('live-log-header')?.addEventListener('click', () => {
  const wrap = document.getElementById('live-log-wrap');
  const toggle = document.getElementById('live-log-toggle');
  wrap.classList.toggle('collapsed');
  if (toggle) toggle.textContent = wrap.classList.contains('collapsed') ? '▼' : '▲';
});

// Tournament button (menu)
document.getElementById('tournamentBtn').addEventListener('click', () => {
  if (!state.tournament) state.tournament = { size: 8 };
  buildTournamentSetup();
  showScreen('tournament');
});

// Tournament size buttons
document.querySelectorAll('[data-size]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-size]').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    if (!state.tournament) state.tournament = {};
    state.tournament.size = parseInt(btn.dataset.size);
    buildTournamentSetup();
  });
});

// Mode toggle buttons (1v1 / 2v2)
document.addEventListener('click', e => {
  if (e.target.dataset.tmode) {
    if (!state.tournament) state.tournament = { size: 16, selectedFighters: [], mode: '1v1' };
    state.tournament.mode = e.target.dataset.tmode;
    document.querySelectorAll('[data-tmode]').forEach(b => b.classList.toggle('sel', b.dataset.tmode === state.tournament.mode));
    buildTournamentSetup();
  }
});

// BO format buttons
document.querySelectorAll('[data-bo]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-bo]').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    if (!state.tournament) state.tournament = {};
    state.tournament.bo = parseInt(btn.dataset.bo);
  });
});

// Tournament start
document.getElementById('tStartBtn').addEventListener('click', () => {
  const roster   = JSON.parse(localStorage.getItem('cgRoster') ?? '[]');
  const t        = state.tournament ?? {};
  const size     = t.size ?? 16;
  const tmode    = t.mode ?? '1v1';
  const selIdx   = t.selectedFighters ?? [];
  // Convert cgRoster entries → fighter objects
  const bo = t.bo ?? 3;   // preserve chosen format before createTournament overwrites state
  const participants = selIdx.map(i => roster[i]).filter(Boolean).map(rosterToFighter);
  if (tmode === '2v2') {
    state.tournament2v2 = createTournament2v2(size, participants);
    state.tournament2v2.bo = bo;
    // Keep tournament reference for menu-back etc but clear 1v1 tournament
    state.tournament = null;
    renderBracket2v2();
  } else {
    state.tournament2v2 = null;
    state.tournament = createTournament(size, participants);
    state.tournament.bo = bo;  // restore bo into new tournament object
    renderBracket();
  }
  showScreen('bracket');
});
document.getElementById('tBackBtn').addEventListener('click', () => {
  state.tournament = null;
  showScreen('menu');
  buildFightersPanel();
});

// Bracket → Next match
document.getElementById('nextMatchBtn').addEventListener('click', () => {
  // 2v2 tournament
  if (state.tournament2v2 && !state.tournament2v2.completed) {
    const match = getNextTournamentMatch2v2();
    if (!match || !match.p1 || !match.p2) return;
    const bo = state.tournament2v2?.bo ?? 3;
    // 4 fighters: team0[0], team0[1], team1[0], team1[1]
    state.fighters  = [...match.p1.fighters, ...match.p2.fighters];
    state.teamIds   = [0, 0, 1, 1];
    state.matchMode = '2v2';
    state.arenaId   = randomArena();
    state.bo3 = {
      wins: [0, 0],
      gameNum: 1,
      fighters: [match.p1, match.p2],  // team objects
      winsNeeded: Math.ceil(bo / 2),
    };
    updateBO3Display();
    showScreen('game');
    startGame();
    return;
  }
  // 1v1 tournament
  const match = getNextTournamentMatch();
  if (!match) return;
  const bo = state.tournament?.bo ?? 3;
  state.fighters  = [match.p1, match.p2];
  state.matchMode = '1v1';
  state.teamIds   = [];
  state.arenaId   = randomArena();
  state.bo3 = { wins: [0, 0], gameNum: 1, fighters: [match.p1, match.p2], winsNeeded: Math.ceil(bo / 2) };
  updateBO3Display();
  showScreen('game');
  startGame();
});
document.getElementById('bracketMenuBtn').addEventListener('click', () => {
  state.tournament = null;
  state.tournament2v2 = null;
  state.bo3 = null;
  showScreen('menu');
  buildFightersPanel();
});

// ============================================================
// INIT
// ============================================================
buildFightersPanel();
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
  { id:'gnome',     name:'Gnome',           emoji:'🧙', weight:6.5,  subKey:null,          trait:null },
  { id:'human',     name:'Human',           emoji:'👤', weight:6.5,  subKey:null,          trait:null },
  { id:'dwarf',     name:'Dwarf',           emoji:'⛏️', weight:6.5,  subKey:null,          trait:null },
  { id:'skeleton',  name:'Skeleton',        emoji:'💀', weight:5.25, subKey:'boneLineage',  trait:'2 PvP wins → Lich (IQ fixed 8). 4 wins → Lich King (+1 all stats). Immune to AIDS.' },
  { id:'troll',     name:'Troll',           emoji:'🧌', weight:5.25, subKey:'trollType',   trait:null },
  { id:'orc',       name:'Orc',             emoji:'🗡️', weight:5.25, subKey:null,          trait:'Win: +2 lowest stat. Lose: -3 highest stat.' },
  { id:'giant',     name:'Giant',           emoji:'🏔️', weight:4.0,  subKey:null,          trait:'After stat roll: if IQ>STR → +5 IQ/-5 STR; if STR>IQ → +5 STR/-5 IQ; if equal → +3 both.' },
  { id:'dragon',    name:'Dragon',          emoji:'🐉', weight:4.0,  subKey:'dragonType',  trait:null },
  { id:'angel',     name:'Angel',           emoji:'👼', weight:3.5,  subKey:'angelRank',   trait:'Starts with Archetype "Pacifist" (will receive one more Archetype).' },
  { id:'primordial',name:'Primordial Being',emoji:'🌌', weight:3.5,  subKey:'elementalWheel', trait:'Each Combat win → receive Elemental Wheel again.' },
  { id:'demon',     name:'Demon',           emoji:'😈', weight:2.5,  subKey:'demonSin',    trait:null },
  { id:'god',       name:'God',             emoji:'✨', weight:2.5,  subKey:'godGift',     trait:null },
];

const CG_SUBRACES = {
  goblinHorde: [
    { label:'×1',      weight:5,  desc:'-1 all stats. +1 all stats per PvP win.' },
    { label:'×50',     weight:10, desc:'-1 all stats.' },
    { label:'×100',    weight:25, desc:"You're just a Goblin." },
    { label:'×1,000',  weight:20, desc:'+1 Strength.' },
    { label:'×5,000',  weight:15, desc:'+1 Strength, +1 Speed.' },
    { label:'×10,000', weight:15, desc:'+2 Strength, +2 Speed.' },
    { label:'×100,000',weight:10, desc:'+1 all stats, 1 Gear, guaranteed Unique Weapon.' },
  ],
  trollType: [
    { label:'Regular',  weight:42, desc:'Just a Troll.' },
    { label:'Ice',      weight:30, desc:'In combat: enemy -2 Speed.' },
    { label:'Mountain', weight:25, desc:'+3 Durability.' },
    { label:'Lich',     weight:3,  desc:'Gain 1 Power from a dead player after each battle.' },
  ],
  dragonType: [
    { label:'Crimson',  weight:9,  desc:'+2 Base IQ, +1 Base Durability.' },
    { label:'Stone',    weight:9,  desc:'+2 Base Durability.' },
    { label:'Amethyst', weight:9,  desc:'-1 all stats, +4 Powers.' },
    { label:'Ancient',  weight:9,  desc:"In combat: disable opponent's weapon." },
    { label:'Undead',   weight:9,  desc:'1 Summon, +1 Durability.' },
    { label:'Zephyrian',weight:9,  desc:'1 Power, 1 Quirk.' },
    { label:'Tideborn', weight:9,  desc:'+3 Base Strength.' },
    { label:'Thunder',  weight:10, desc:'[PvE] +1 starting point. No penalty on loss.' },
    { label:'Flame',    weight:12, desc:'1 Power, +2 to lowest stat.' },
    { label:'Ice',      weight:10, desc:'+1 Char Dev, +2 to lowest stat.' },
    { label:'Chaos',    weight:5,  desc:'3 Quirks.' },
  ],
  angelRank: [
    { label:'Angels',        weight:40, desc:'Nothing special.' },
    { label:'Archangels',    weight:21, desc:'+2 Speed, +1 Martial Arts.' },
    { label:'Principalities',weight:9,  desc:'After combat: +2 to lowest stat.' },
    { label:'Powers',        weight:8,  desc:'Archetype "Paladin", +2 MA.' },
    { label:'Virtues',       weight:7,  desc:'Cannot be debuffed.' },
    { label:'Dominions',     weight:6,  desc:'2 Powers.' },
    { label:'Ophanim',       weight:5,  desc:'+1 all stats.' },
    { label:'Cherubim',      weight:4,  desc:'+2 all stats.' },
  ],
  elementalWheel: [
    { label:'Air',   weight:25, desc:'Power "Blowing Leaves", +1 Speed, +1 to lowest stat.' },
    { label:'Water', weight:25, desc:'Power "Water Breathing", +1 BIQ, +1 to highest stat.' },
    { label:'Fire',  weight:25, desc:'Power "Fire Control", +1 MA, +1 Power.' },
    { label:'Earth', weight:25, desc:'Power "Earth-Shaking", +1 Strength, +1 Quirk.' },
  ],
  demonSin: [
    { label:'Lucifer',    weight:14.28, desc:'Archetype "Egoist". Power wheel maxes at 4.' },
    { label:'Beelzebub',  weight:14.28, desc:'Quirk "Slow Metabolism". 1 random stat maxes at 10.' },
    { label:'Leviathan',  weight:14.28, desc:'6 players gain Gear "Leviathan\'s Mark". When all die: +6 lowest stat.' },
    { label:'Behemoth',   weight:14.28, desc:'Lose: 1 random stat → 0. Win: 1 random stat +2.' },
    { label:'Mammon',     weight:14.28, desc:'-2 all stats. Win: 2 PvP rewards.' },
    { label:'Belphegor',  weight:14.28, desc:'First 2 rounds: 66% no point on win. +1 starting point.' },
    { label:'Asmodeus',   weight:14.28, desc:'Power "AIDS" (incurable). vs AIDS opponent: +1 starting point.' },
  ],
  godGift: [
    { label:'Cursed Sword',       weight:30, desc:'-1 all stats.' },
    { label:'War',                weight:7,  desc:'+3 Strength.' },
    { label:'Love',               weight:7,  desc:'1 Lover, 50% Archetype "Femboy".' },
    { label:'Time',               weight:7,  desc:'+3 Speed.' },
    { label:'Fortune',            weight:7,  desc:'3× Gear "Golden Coin".' },
    { label:'Secret Evil',        weight:7,  desc:'In combat: +2 to both highest and lowest stats.' },
    { label:'Knowledge',          weight:7,  desc:'+3 IQ.' },
    { label:'Arts & Magic',       weight:7,  desc:'2 Powers.' },
    { label:'Wilderness & Sea',   weight:7,  desc:'1 Summon wheel, 1 Elemental wheel.' },
    { label:'Creation',           weight:7,  desc:"1 Creator's Favor." },
    { label:'Moon',               weight:7,  desc:'Archetype "Pacifist" (+1 more Archetype).' },
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

const STAT_DISPLAY = [
  { key:'strength',  label:'STR', emoji:'💪' },
  { key:'speed',     label:'SPD', emoji:'⚡' },
  { key:'durability',label:'DUR', emoji:'🛡️' },
  { key:'iq',        label:'IQ',  emoji:'🧠' },
  { key:'battleiq',  label:'BIQ', emoji:'⚔️' },
  { key:'ma',        label:'MA',  emoji:'🥋' },
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
// ============================================================
// SPIN WHEEL
// ============================================================
class SpinWheel {
  constructor(canvasEl, items) {
    this.canvas = canvasEl;
    this.ctx = this.canvas.getContext('2d');
    this.items = items.map((it, i) => ({ ...it, color: it.color || wColor(i) }));
    this.rotation = -(Math.PI / 2); // start at top
    this.spinning = false;
    this.total = items.reduce((s, it) => s + it.weight, 0);
    this._draw();
  }
  _draw() {
    const ctx = this.ctx, W = this.canvas.width, cx = W/2, cy = W/2, R = cx - 8;
    ctx.clearRect(0, 0, W, W);
    let a = this.rotation;
    for (const it of this.items) {
      const slice = (it.weight / this.total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a, a + slice); ctx.closePath();
      ctx.fillStyle = it.color; ctx.fill();
      ctx.strokeStyle = '#080818'; ctx.lineWidth = 1.5; ctx.stroke();
      const mid = a + slice / 2, lr = R * 0.68;
      ctx.save();
      ctx.translate(cx + Math.cos(mid)*lr, cy + Math.sin(mid)*lr);
      ctx.rotate(mid + Math.PI/2);
      ctx.fillStyle = '#fff';
      const fs = Math.max(9, Math.min(13, Math.floor(290 / this.items.length)));
      ctx.font = `bold ${fs}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let lbl = it.label.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
      if (lbl.length > 11) lbl = lbl.slice(0,10)+'…';
      ctx.fillText(lbl, 0, 0); ctx.restore();
      a += slice;
    }
    // Hub
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2);
    ctx.fillStyle = '#0a0a1e'; ctx.fill();
    ctx.strokeStyle = '#4488ff'; ctx.lineWidth = 2.5; ctx.stroke();
  }
  spin(onDone) {
    if (this.spinning) return;
    this.spinning = true;
    // Determine winner
    let r = Math.random() * this.total;
    let winner = this.items[0], cumAngle = 0;
    for (const it of this.items) {
      const slice = (it.weight / this.total) * Math.PI * 2;
      r -= it.weight;
      if (r <= 0) { winner = it; break; }
      cumAngle += slice;
    }
    // Recalculate cumAngle for winner
    cumAngle = 0;
    for (const it of this.items) {
      const slice = (it.weight / this.total) * Math.PI * 2;
      if (it === winner) { cumAngle += slice/2; break; }
      cumAngle += slice;
    }
    // Target: winner's midpoint should be at top (-π/2)
    // When rotation = R, first segment starts at R. Top pointer is at -π/2.
    // Segment mid is at R + cumAngle. We want R + cumAngle ≡ -π/2 (mod 2π)
    // So R = -π/2 - cumAngle
    const targetRot = -Math.PI/2 - cumAngle;
    const curNorm = ((this.rotation % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    const tNorm   = ((targetRot % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    let delta = tNorm - curNorm; if (delta <= 0) delta += Math.PI*2;
    const totalSpin = Math.PI*2 * (6 + Math.floor(Math.random()*5)) + delta;
    const dur = 3800 + Math.random()*1200, t0 = performance.now();
    const startRot = this.rotation;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1-t, 4);
      this.rotation = startRot + totalSpin * ease;
      this._draw();
      if (t < 1) { requestAnimationFrame(tick); }
      else { this.spinning = false; onDone(winner, this.items.indexOf(winner)); }
    };
    requestAnimationFrame(tick);
  }
}
// ============================================================
// CHARGEN FLOW
// ============================================================
const CHARGEN_STEPS = ['name','race','subrace','str','spd','dur','iq','biq','ma','hasweapon','weapon','skillcount','skillpick','done'];
let cgState = null;
let cgRoster = JSON.parse(localStorage.getItem('cgRoster') || '[]');
let quickCreateMode = false;
let quickCreateName = ''; // custom name from prompt

function initChargen() {
  cgState = {
    step: 'name', name: '', race: null, subrace: null,
    stats: { strength:null, speed:null, durability:null, iq:null, battleiq:null, ma:null },
    hasWeapon: null,  // true = armed, false = unarmed (fists)
    weapon: null,
    skillCount: 0,    // how many skills to roll
    skills: [],       // array of SKILL_DEF objects picked
  };
  showScreen('chargen');
  renderCgDots();
  renderCgStep();
}

function renderCgDots() {
  const row = document.getElementById('cgDots');
  const steps = ['name','race','subrace','str','spd','dur','iq','biq','ma','hasweapon','weapon','skillcount','skillpick','done'];
  const cur = steps.indexOf(cgState.step);
  row.innerHTML = steps.map((s,i) =>
    `<div class="cg-dot ${i < cur ? 'done' : i === cur ? 'active' : ''}"></div>`
  ).join('');
}

function renderCgStep() {
  renderCgDots();
  const box = document.getElementById('cg-content');
  box.innerHTML = '';
  const s = cgState.step;
  if (s === 'name')    { cgRenderName(box); return; }
  if (s === 'race') {
    cgRenderSpin(box, 'Choose Race', CG_RACES.map((r,i) => ({ label: r.emoji+' '+r.name, weight: r.weight, color: wColor(i) })), (w, idx) => { cgState.race = CG_RACES[idx]; advanceCg(); });
    // Debug: quick-pick buttons
    const dbg = document.createElement('div');
    dbg.style.cssText = 'margin-top:10px;padding:8px 12px;background:#1a1a2e;border:1px dashed #ff6b35;border-radius:8px;';
    dbg.innerHTML = `<div style="font-size:11px;color:#ff6b35;margin-bottom:6px;letter-spacing:1px;">DEBUG — Pick Race</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;">${CG_RACES.map((r,i) =>
        `<button onclick="cgState.race=CG_RACES[${i}];advanceCg();" style="background:#2a2a4a;border:1px solid #444;border-radius:5px;color:#ccc;cursor:pointer;font-size:11px;padding:3px 8px;">${r.emoji} ${r.name}</button>`
      ).join('')}</div>`;
    box.appendChild(dbg);
    return;
  }
  if (s === 'subrace') {
    const sr = CG_SUBRACES[cgState.race.subKey];
    if (!sr) { advanceCg(); return; }
    cgRenderSpin(box, `${cgState.race.emoji} Sub-Race`, sr.map((r,i) => ({ label:r.label, weight:r.weight, color:wColor(i) })), (w,idx) => { cgState.subrace = { ...sr[idx] }; advanceCg(); });
    return;
  }
  const STAT_STEPS = { str:'strength', spd:'speed', dur:'durability', iq:'iq', biq:'battleiq', ma:'ma' };
  if (s === 'iq' && cgState.race?.id === 'skeleton') {
    cgState.stats.iq = 1;
    advanceCg();
    return;
  }
  if (STAT_STEPS[s]) {
    const sk = STAT_STEPS[s];
    const sd = STAT_DISPLAY.find(x => x.key === sk);
    const raceId = (cgState.race.id === 'skeleton' && cgState.subrace?.raceId)
      ? cgState.subrace.raceId
      : cgState.race.id;
    const weights = CG_STAT_WEIGHTS[sk][raceId] || Array(10).fill(10);
    const items = weights.map((w,i) => ({ label: String(i+1), weight: w, color: STAT_COLORS[i] }));
    cgRenderSpin(box, `${sd.emoji} ${sd.label}`, items, (w,idx) => { cgState.stats[sk] = idx+1; advanceCg(); },
      cgState.stats);
    return;
  }
  if (s === 'hasweapon') {
    const items = [
      { label: '⚔️ Armed',   weight: 80, color: '#44ccff' },
      { label: '✊ Unarmed', weight: 20, color: '#ff8844' },
    ];
    cgRenderSpin(box, '🎰 Has Weapon?', items, (_w, idx) => {
      cgState.hasWeapon = (idx === 0);
      if (!cgState.hasWeapon) cgState.weapon = 'fists'; // skip weapon wheel
      advanceCg();
    });
    return;
  }
  if (s === 'weapon') {
    cgRenderSpin(box, '🗡️ Weapon', CG_WEAPONS_ARMED.map((w,i) => ({ label:w.label, weight:1, color:wColor(i) })), (w,idx) => { cgState.weapon = CG_WEAPONS_ARMED[idx].id; advanceCg(); });
    return;
  }
  if (s === 'skillcount') {
    const raceId = cgState.race?.id || 'human';
    const weights = CG_SKILL_COUNT_WEIGHTS[raceId] || [20, 20, 20, 20, 20];
    const items = weights.map((w, i) => ({
      label: i === 0 ? '0 Skills' : `${i} Skill${i > 1 ? 's' : ''}`,
      weight: w,
      color: wColor(i + 4),
    }));
    cgRenderSpin(box, `${cgState.race.emoji} How many Skills?`, items, (_w, idx) => {
      cgState.skillCount = idx;
      advanceCg();
    });
    return;
  }
  if (s === 'skillpick') { cgRenderSkillPick(box); return; }
  if (s === 'done') { cgRenderDone(box); }
}

function advanceCg() {
  const order = ['name','race','subrace','str','spd','dur','iq','biq','ma','hasweapon','weapon','skillcount','skillpick','done'];
  let next = order.indexOf(cgState.step) + 1;
  // If unarmed, skip weapon wheel
  if (order[next] === 'weapon' && cgState.hasWeapon === false) next++;
  // If 0 skills rolled, skip the skill-pick wheel
  if (order[next] === 'skillpick' && cgState.skillCount === 0) next++;
  cgState.step = order[Math.min(next, order.length - 1)];
  renderCgStep();
}

function cgRenderName(box) {
  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label">Step 1 — Enter Character Name</div>
      <div class="cg-name-row">
        <input class="cg-name-input" id="cgNameInput" placeholder="Enter name..." maxlength="24" value="${cgState.name}" autofocus>
        <button class="cg-random-btn" id="cgRandomName" title="Random hero name">🎲</button>
      </div>
      <div class="cg-nav">
        <button class="cg-btn" id="cgBackMenu">← Back</button>
        <button class="cg-btn primary" id="cgNameNext">Next →</button>
      </div>
    </div>`;
  document.getElementById('cgRandomName').onclick = () => {
    const input = document.getElementById('cgNameInput');
    input.value = getRandomGameName();
    input.style.borderColor = '#3a3a6a';
    input.focus();
  };
  document.getElementById('cgNameNext').onclick = () => {
    const v = document.getElementById('cgNameInput').value.trim();
    if (!v) { document.getElementById('cgNameInput').style.borderColor = '#ff4455'; return; }
    cgState.name = v; advanceCg();
  };
  document.getElementById('cgNameInput').onkeydown = e => { if (e.key === 'Enter') document.getElementById('cgNameNext').click(); };
  document.getElementById('cgBackMenu').onclick = () => { showScreen('menu'); buildFightersPanel(); renderRoster(); };
  // Quick create: auto-fill name (custom or random) and advance
  if (quickCreateMode) {
    document.getElementById('cgNameInput').value = quickCreateName || getRandomGameName();
    setTimeout(() => document.getElementById('cgNameNext').click(), 400);
  }
}

function cgRenderSpin(box, title, items, onResult, currentStats) {
  const hasStats = currentStats && Object.values(currentStats).some(v => v !== null);
  const statsHtml = hasStats ? `<div class="cg-stats-grid">${STAT_DISPLAY.map(sd => {
    const v = currentStats[sd.key];
    const statStep = {strength:'str',speed:'spd',durability:'dur',iq:'iq',battleiq:'biq',ma:'ma'};
    const isActive = cgState.step === statStep[sd.key];
    return `<div class="cg-sc ${isActive?'cg-active':v?'cg-done':''}">
      <div class="cg-sc-lbl">${sd.emoji} ${sd.label}</div>
      <div class="cg-sc-val ${v?'':' cg-pending'}">${v ?? '—'}</div>
    </div>`;
  }).join('')}</div>` : '';

  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label">${title}</div>
      ${statsHtml}
      <div class="spin-wrap">
        <canvas id="spinCanvas" width="360" height="360"></canvas>
        <div class="spin-ptr"></div>
      </div>
      <div id="cgResultBox"></div>
      <div class="cg-nav">
        <button class="spin-btn" id="cgSpinBtn">🎰 SPIN!</button>
      </div>
      <div class="cg-nav" id="cgNextNav" style="display:none">
        <button class="cg-btn primary" id="cgSpinNext">Next →</button>
      </div>
      ${cgState.race ? `<div class="cg-trait">${cgState.race.emoji} <b>${cgState.race.name}</b>${cgState.race.trait ? ' — '+cgState.race.trait : ''}</div>` : ''}
    </div>`;

  const wheel = new SpinWheel(document.getElementById('spinCanvas'), items);
  let lastWinIdx = -1;
  const doSpin = () => {
    document.getElementById('cgSpinBtn').disabled = true;
    document.getElementById('cgNextNav').style.display = 'none';
    wheel.spin((winner, idx) => {
      lastWinIdx = idx;
      document.getElementById('cgResultBox').innerHTML = `<div class="cg-result-box">${winner.label}</div>`;
      document.getElementById('cgNextNav').style.display = 'flex';
      playTone(660, 'sine', 0.4, 0.15, 0.5);
      // Quick create: auto-advance after spin lands
      if (quickCreateMode) setTimeout(() => document.getElementById('cgSpinNext')?.click(), 600);
    });
  };
  document.getElementById('cgSpinBtn').onclick = doSpin;
  document.getElementById('cgSpinNext') && (document.getElementById('cgSpinNext').onclick = () => {
    if (lastWinIdx < 0) return;
    onResult(items[lastWinIdx], lastWinIdx);
  });
  // Quick create: auto-trigger spin after short delay
  if (quickCreateMode) setTimeout(doSpin, 300);
}

function cgRenderSkillPick(box) {
  const total    = cgState.skillCount;
  const picked   = cgState.skills;
  const pickedIds = new Set(picked.map(s => s.id));
  const available = SKILL_DEFS.filter(s => !pickedIds.has(s.id));
  const spinNum  = picked.length + 1;

  const pickedHtml = picked.length > 0
    ? `<div class="cg-skills-picked">${picked.map(s =>
        `<span class="cg-skill-tag" title="${s.desc}">${s.icon} ${s.name}</span>`
      ).join('')}</div>`
    : '';

  const items = available.map((s, i) => ({
    label: s.icon + ' ' + s.name,
    weight: 1,
    color: wColor(i),
  }));

  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label">🌀 Skill ${spinNum} of ${total}</div>
      ${pickedHtml}
      <div class="spin-wrap">
        <canvas id="spinCanvas" width="360" height="360"></canvas>
        <div class="spin-ptr"></div>
      </div>
      <div id="cgResultBox"></div>
      <div class="cg-nav">
        <button class="spin-btn" id="cgSpinBtn">🎰 SPIN!</button>
      </div>
      <div class="cg-nav" id="cgNextNav" style="display:none">
        <button class="cg-btn primary" id="cgSpinNext">
          ${spinNum < total ? 'Next Skill →' : 'Done ✓'}
        </button>
      </div>
      ${cgState.race ? `<div class="cg-trait">${cgState.race.emoji} <b>${cgState.race.name}</b></div>` : ''}
    </div>`;

  const wheel = new SpinWheel(document.getElementById('spinCanvas'), items);
  let pickedSkill = null;

  const doSpin = () => {
    document.getElementById('cgSpinBtn').disabled = true;
    document.getElementById('cgNextNav').style.display = 'none';
    wheel.spin((winner, idx) => {
      pickedSkill = available[idx];
      document.getElementById('cgResultBox').innerHTML =
        `<div class="cg-result-box">${winner.label}<br><span style="color:#888;font-size:12px">${pickedSkill.desc}</span></div>`;
      document.getElementById('cgNextNav').style.display = 'flex';
      playTone(660, 'sine', 0.4, 0.15, 0.5);
      if (quickCreateMode) setTimeout(() => document.getElementById('cgSpinNext')?.click(), 600);
    });
  };

  document.getElementById('cgSpinBtn').onclick = doSpin;
  document.getElementById('cgSpinNext').onclick = () => {
    if (!pickedSkill) return;
    cgState.skills.push(pickedSkill);
    if (cgState.skills.length >= total) {
      advanceCg();
    } else {
      renderCgStep(); // re-render skillpick with updated picked list
    }
  };

  if (quickCreateMode) setTimeout(doSpin, 300);
}

function cgRenderDone(box) {
  const r = cgState.race, sr = cgState.subrace, st = cgState.stats;
  const wep = CG_WEAPONS.find(w => w.id === cgState.weapon);
  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label" style="font-size:20px;color:#fff;font-weight:900">${r.emoji} ${cgState.name}</div>
      <div style="color:#7a9ac0;font-size:14px">${r.name}${sr ? ' · '+sr.label : ''}</div>
      <div class="cg-summary">
        <div class="cg-sum-row"><span class="cg-sum-lbl">Weapon</span><span class="cg-sum-val">${wep?.label ?? '—'}</span></div>
        ${sr ? `<div class="cg-sum-row"><span class="cg-sum-lbl">Sub-Race</span><span class="cg-sum-val">${sr.label}</span></div>` : ''}
        ${STAT_DISPLAY.map(sd => `<div class="cg-sum-row"><span class="cg-sum-lbl">${sd.emoji} ${sd.label}</span><span class="cg-sum-val" style="color:${STAT_COLORS[(st[sd.key]||1)-1]}">${st[sd.key] ?? '—'}</span></div>`).join('')}
      ${cgState.skills?.length > 0 ? cgState.skills.map(s => `<div class="cg-sum-row"><span class="cg-sum-lbl">Skill</span><span class="cg-sum-val">${s.icon} ${s.name}</span></div>`).join('') : '<div class="cg-sum-row"><span class="cg-sum-lbl">Skills</span><span class="cg-sum-val" style="color:#555">None</span></div>'}
      </div>
      ${r.trait ? `<div class="cg-trait">${r.trait}</div>` : ''}
      ${sr?.desc ? `<div class="cg-trait">Sub-Race bonus: ${sr.desc}</div>` : ''}
      <div class="cg-nav">
        <button class="cg-btn" id="cgRestart">↺ Restart</button>
        <button class="cg-btn primary" id="cgSave">📜 Add to Radosers</button>
      </div>
    </div>`;
  document.getElementById('cgRestart').onclick = () => initChargen();
  const saveChar = () => {
    const char = {
      id: Date.now() + Math.random(),
      name: cgState.name, race: cgState.race.id, raceName: cgState.race.name,
      raceEmoji: cgState.race.emoji, subrace: cgState.subrace,
      stats: { ...cgState.stats }, weapon: cgState.weapon,
      color: BALL_COLORS[cgRoster.length % BALL_COLORS.length],
      skills: (cgState.skills || []).map(s => s.id),
    };
    cgRoster.push(char);
    localStorage.setItem('cgRoster', JSON.stringify(cgRoster));
    quickCreateMode = false;
    showScreen('menu'); buildFightersPanel(); renderRoster(); renderHeroShowcase();
  };
  document.getElementById('cgSave').onclick = saveChar;
  // Quick create: auto-save
  if (quickCreateMode) setTimeout(saveChar, 800);
}

// ROSTER (RADOSERS)
// ============================================================
// RADOSER TITLE GENERATOR
// ============================================================
function getRadoserTitle(stats) {
  const str = stats.strength  ?? 0;
  const spd = stats.speed     ?? 0;
  const dur = stats.durability?? 0;
  const iq  = stats.iq        ?? 0;
  const biq = stats.battleiq  ?? 0;
  const ma  = stats.ma        ?? 0;
  const total  = str + spd + dur + iq + biq + ma;
  const maxStat = Math.max(str, spd, dur, iq, biq, ma);
  const tens   = [str, spd, dur, iq, biq, ma].filter(v => v === 10).length;

  // ── Perfect / Near-perfect ──
  if (total === 60)  return { title: 'GOAT',       icon: '🐐', color: '#ffd700' };
  if (total >= 55)   return { title: 'Legend',     icon: '🌟', color: '#ff88ff' };

  // ── Multiple 10s ──
  if (tens >= 4)     return { title: 'Demigod',    icon: '⚡', color: '#ff6644' };
  if (tens >= 3)     return { title: 'Prodigy',    icon: '🔥', color: '#ff9944' };

  // ── Single stat = 10 ──
  if (spd === 10)    return { title: 'Speedster',  icon: '💨', color: '#44eeff' };
  if (str === 10)    return { title: 'Destroyer',  icon: '💪', color: '#ff4444' };
  if (dur === 10)    return { title: 'Iron Wall',  icon: '🛡️', color: '#88aaff' };
  if (iq  === 10)    return { title: 'Mastermind', icon: '🧠', color: '#cc88ff' };
  if (biq === 10)    return { title: 'Phantom',    icon: '👻', color: '#88ffcc' };
  if (ma  === 10)    return { title: 'Whirlwind',  icon: '🌪️', color: '#aaffaa' };

  // ── Combination builds ──
  if (str >= 8 && dur >= 8)           return { title: 'Tank',         icon: '🏋️', color: '#ff8866' };
  if (spd >= 8 && dur <= 3)           return { title: 'Glass Cannon', icon: '💥', color: '#ffcc44' };
  if (str >= 8 && spd <= 3)           return { title: 'Berserker',    icon: '🐂', color: '#ff6644' };
  if (spd >= 8 && str <= 3)           return { title: 'Trickster',    icon: '🐦', color: '#44ffcc' };
  if (iq  >= 8 && biq >= 8)           return { title: 'Tactician',    icon: '🎯', color: '#aa88ff' };
  if (ma  >= 8)                       return { title: 'Dancer',       icon: '🎭', color: '#88ffaa' };
  if ([str,spd,dur,iq,biq,ma].every(v => v >= 7)) return { title: 'All-Rounder', icon: '⚖️', color: '#ffd700' };
  if ([str,spd,dur,iq,biq,ma].every(v => v >= 5)) return { title: 'Balanced',    icon: '🟢', color: '#88cc88' };
  if (maxStat >= 8 && total <= 25)    return { title: 'One-Trick',    icon: '🎪', color: '#ffaa44' };

  // ── Total stats fallback ──
  if (total >= 45)   return { title: 'Veteran',    icon: '⚔️',  color: '#ffaa44' };
  if (total >= 35)   return { title: 'Warrior',    icon: '🔥',  color: '#ff8844' };
  if (total >= 25)   return { title: 'Average',    icon: '📊',  color: '#8888aa' };
  if (total >= 15)   return { title: 'Mid',        icon: '😐',  color: '#666688' };
  return               { title: 'Rookie',      icon: '🌱',  color: '#44aa66' };
}

// ============================================================
function renderRoster() {
  const grid = document.getElementById('rosterGrid');
  if (!grid) return;
  if (cgRoster.length === 0) {
    grid.innerHTML = '<div class="roster-empty">No characters yet — create one above!</div>'; return;
  }
  const wepLabel = id => CG_WEAPONS.find(w => w.id === id)?.label ?? id;
  grid.innerHTML = cgRoster.map((ch, idx) => {
    const iq  = ch.stats.iq       ?? null;
    const biq = ch.stats.battleiq ?? null;
    const ma  = ch.stats.ma       ?? null;
    const total = Object.values(ch.stats).reduce((sum, v) => sum + (v ?? 0), 0);
    const t = getRadoserTitle(ch.stats);
    return `
    <div class="roster-card" style="border-color:${ch.color}44">
      <button class="rc-del" data-idx="${idx}">✕</button>
      <div class="rc-name" style="color:${ch.color}">${ch.raceEmoji} ${ch.name}</div>
      <div class="rc-race">${ch.raceName}${ch.subrace ? ' · '+ch.subrace.label : ''}</div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <div class="rc-weapon">${wepLabel(ch.weapon)}</div>
        <span class="rc-title-badge" style="color:${t.color};border-color:${t.color}44">${t.title}</span>
      </div>
      <div class="rc-total">
        <span>Total Stats</span>
        <span class="rc-total-val">${total} <span style="font-size:10px;color:#666">/ 60</span></span>
      </div>
      <div class="rc-actions">
        <button class="rc-stats-btn" data-idx="${idx}">📊 Stats</button>
        <button class="rc-add" data-idx="${idx}">➕ Add to Arena</button>
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.rc-add').forEach(btn => {
    btn.onclick = () => {
      const ch = cgRoster[+btn.dataset.idx];
      if (state.fighters.length >= 12) { alert('Max 12 fighters!'); return; }
      state.fighters.push({ weaponId: ch.weapon, color: ch.color, charName: ch.name, charEmoji: ch.raceEmoji, charStats: { ...ch.stats, race: ch.race ?? null, subrace: ch.subrace ?? null }, skills: ch.skills ?? [] });
      switchToBattleTab();
      sfxShoot();
    };
  });
  grid.querySelectorAll('.rc-del').forEach(btn => {
    btn.onclick = () => {
      cgRoster.splice(+btn.dataset.idx, 1);
      localStorage.setItem('cgRoster', JSON.stringify(cgRoster));
      _heroIdx = 0;
      renderRoster();
      renderHeroShowcase();
    };
  });
  grid.querySelectorAll('.rc-stats-btn').forEach(btn => {
    btn.onclick = () => showCharStats(+btn.dataset.idx);
  });
}

function showCharStats(idx) {
  const ch = cgRoster[idx];
  if (!ch) return;

  const dur = ch.stats.durability ?? 5;
  const spd = ch.stats.speed     ?? 5;
  const str = ch.stats.strength  ?? 1;
  const iq  = ch.stats.iq        ?? null;
  const biq = ch.stats.battleiq  ?? null;
  const ma  = ch.stats.ma        ?? null;
  const wepId  = ch.weapon;
  const wepDef = WEAPON_MAP[wepId];
  const wepName = CG_WEAPONS.find(w => w.id === wepId)?.label ?? wepId;

  // Derived
  const maxHP      = 50 + dur * 10;
  const maxSpd     = 10 + spd * 1.5;
  const launchMin  = spd + 1, launchMax = spd + 3;
  const baseDmg    = wepDef ? wepDef.baseDamage * str : str;
  const critDmg    = +(baseDmg * 1.5).toFixed(2);

  const acMap = { fists: Math.max(2,13-spd), sword: Math.max(2,28-spd),
    dagger: Math.max(2,18-spd), spear: Math.max(2,38-spd),
    scythe: Math.max(2,34-spd), hammer: Math.max(2,48-spd),
    bow: Math.max(5,20-spd), shuriken: Math.max(5,20-spd) };
  const ac     = acMap[wepId] ?? (wepDef?.attackCooldown ?? 20);
  const atkPS  = (60 / ac).toFixed(2);

  const t = getRadoserTitle(ch.stats);
  document.getElementById('smo-name').innerHTML =
    `<span style="color:${ch.color}">${ch.raceEmoji} ${ch.name}</span>
     <span class="rc-title-badge" style="color:${t.color};border-color:${t.color}44;font-size:12px">${t.title}</span>`;
  document.getElementById('smo-race').textContent =
    ch.raceName + (ch.subrace ? ' · ' + ch.subrace.label : '');

  document.getElementById('smo-grid').innerHTML = STAT_DISPLAY.map(sd => `
    <div class="stats-modal-row">
      <div class="stats-modal-lbl">${sd.emoji} ${sd.label}</div>
      <div class="stats-modal-val" style="color:${STAT_COLORS[(ch.stats[sd.key]??1)-1]??'#4d96ff'}">${ch.stats[sd.key] ?? '—'}</div>
    </div>`).join('');

  const wepNameClean = wepName.replace(/^\S+\s*/, '');
  document.getElementById('smo-weapon').innerHTML =
    `Weapon: <b>${wepNameClean}</b>`;

  const row = (lbl, val, color) =>
    `<div class="stats-modal-drow"><span class="stats-modal-dlbl">${lbl}</span><span class="stats-modal-dval" style="color:${color}">${val}</span></div>`;

  const critRate  = iq  !== null ? (iq  * 5).toFixed(0) + '%' : '20%';
  const evadeRate = biq !== null ? (biq * 3).toFixed(0) + '%' : '10%';
  const spinBon   = ma  !== null ? (ma  * 0.003).toFixed(3)   : '0.000';

  const derivedEl     = document.getElementById('smo-derived');
  const derivedToggle = document.getElementById('smo-derived-toggle');

  derivedEl.innerHTML =
    row('❤️ Max HP',       maxHP,                          '#ff6b6b') +
    row('🚀 Launch Speed', `${launchMin} – ${launchMax}`,  '#ffd700') +
    row('⚔️ Base Damage',  baseDmg,                        '#ff9944') +
    row('⚡ Crit Rate',    critRate,                        '#ffe033') +
    row('💥 Crit Damage',  `×1.5 (${critDmg} dmg)`,        '#ffaa33') +
    row('🌀 Evade Chance', evadeRate,                       '#44eebb') +
    row('🔥 Attack Speed', `${atkPS} / sec`,                '#cc88ff');

  // Reset Stats toggle to open state each time modal opens
  derivedEl.style.display = '';
  derivedToggle.querySelector('.smo-arrow').textContent = '▾';
  derivedToggle.onclick = () => {
    const open = derivedEl.style.display !== 'none';
    derivedEl.style.display = open ? 'none' : '';
    derivedToggle.querySelector('.smo-arrow').textContent = open ? '▸' : '▾';
  };

  // ── Skills section ──
  const skillsEl = document.getElementById('smo-skills');
  if (skillsEl) {
    const ids = ch.skills ?? [];
    if (ids.length > 0) {
      const TC = { passive:'#e8c87a', pre_combat:'#c9902a', in_combat:'#cc3333', post_combat:'#6aaa44' };
      const TL = { passive:'Passive', pre_combat:'Pre-Combat', in_combat:'In-Combat', post_combat:'Post-Combat' };
      let cardsHtml = '';
      ids.forEach(sid => {
        const def = typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === sid) : null;
        if (def) {
          const col = TC[def.type] ?? '#8899bb';
          const lbl = TL[def.type] ?? def.type;
          cardsHtml += `
            <div class="smo-skill-card" style="--sc:${col}">
              <div class="smo-skill-top">
                <span class="smo-skill-name">${def.icon ?? '✦'} ${def.name}</span>
                <span class="smo-skill-type">${lbl}</span>
              </div>
              ${def.desc ? `<div class="smo-skill-desc">${def.desc}</div>` : ''}
            </div>`;
        } else {
          cardsHtml += `<div class="smo-skill-card"><span class="smo-skill-name">🔮 ${sid}</span></div>`;
        }
      });
      skillsEl.innerHTML = `
        <div class="smo-collapse-header smo-skills-toggle">
          ✦ Skills (${ids.length}) <span class="smo-arrow">▾</span>
        </div>
        <div class="smo-skills-body">${cardsHtml}</div>`;
      skillsEl.style.display = '';

      // Skills toggle
      const skillToggle = skillsEl.querySelector('.smo-skills-toggle');
      const skillBody   = skillsEl.querySelector('.smo-skills-body');
      skillToggle.onclick = () => {
        const open = skillBody.style.display !== 'none';
        skillBody.style.display = open ? 'none' : '';
        skillToggle.querySelector('.smo-arrow').textContent = open ? '▸' : '▾';
      };
    } else {
      skillsEl.style.display = 'none';
    }
  }

  document.getElementById('statsModal').classList.add('open');
}

document.getElementById('statsModalClose').onclick = () =>
  document.getElementById('statsModal').classList.remove('open');
document.getElementById('statsModal').onclick = e => {
  if (e.target === document.getElementById('statsModal'))
    document.getElementById('statsModal').classList.remove('open');
};

// ── Export ──────────────────────────────────────────────────
document.getElementById('exportRosterBtn').addEventListener('click', () => {
  if (cgRoster.length === 0) { alert('No Radosers to export!'); return; }
  const payload = {
    version: 1,
    app: 'AutoRPNG Battle',
    exported: new Date().toISOString().slice(0, 10),
    count: cgRoster.length,
    radosers: cgRoster,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `radosers_${payload.exported}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── Import ──────────────────────────────────────────────────
let _importParsed = null; // holds validated array before user confirms

function openImportModal() {
  _importParsed = null;
  document.getElementById('importFileInput').value = '';
  document.getElementById('importFileLabelText').textContent = '📂 Choose JSON file…';
  document.getElementById('importPreview').style.display   = 'none';
  document.getElementById('importActions').style.display   = 'none';
  document.getElementById('importError').style.display     = 'none';
  document.getElementById('importModal').style.display     = 'flex';
}
function closeImportModal() {
  document.getElementById('importModal').style.display = 'none';
}

function _applyImport(mode) {
  if (!_importParsed?.length) return;
  if (mode === 'replace') cgRoster.length = 0;
  // Avoid exact duplicates (same id)
  const existingIds = new Set(cgRoster.map(c => c.id));
  let added = 0;
  for (const ch of _importParsed) {
    if (!existingIds.has(ch.id)) { cgRoster.push(ch); added++; }
  }
  localStorage.setItem('cgRoster', JSON.stringify(cgRoster));
  closeImportModal();
  renderRoster();
  renderHeroShowcase();
  const msg = mode === 'replace'
    ? `Imported ${added} Radosers.`
    : `Merged ${added} new Radosers (${_importParsed.length - added} skipped — already exist).`;
  alert(msg);
}

document.getElementById('importRosterBtn').addEventListener('click', openImportModal);
document.getElementById('importModalClose').addEventListener('click', closeImportModal);
document.getElementById('importModal').addEventListener('click', e => {
  if (e.target === document.getElementById('importModal')) closeImportModal();
});

document.getElementById('importFileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('importFileLabelText').textContent = '📄 ' + file.name;
  document.getElementById('importError').style.display = 'none';

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      // Accept both { radosers: [...] } wrapper and plain array
      const arr = Array.isArray(data) ? data : (Array.isArray(data.radosers) ? data.radosers : null);
      if (!arr || arr.length === 0) throw new Error('No radosers found in file.');
      // Basic validation — each entry needs at minimum a name + stats
      for (const ch of arr) {
        if (!ch.name || !ch.stats) throw new Error(`Invalid entry: missing name or stats.`);
      }
      _importParsed = arr;
      document.getElementById('importPreviewText').textContent =
        `✅ Found ${arr.length} Radoser${arr.length > 1 ? 's' : ''} — choose import mode:`;
      document.getElementById('importPreview').style.display = 'block';
      document.getElementById('importActions').style.display = 'flex';
    } catch (err) {
      _importParsed = null;
      document.getElementById('importPreview').style.display  = 'none';
      document.getElementById('importActions').style.display  = 'none';
      const errEl = document.getElementById('importError');
      errEl.textContent = '❌ ' + err.message;
      errEl.style.display = 'block';
    }
  };
  reader.readAsText(file);
});

document.getElementById('importMergeBtn').addEventListener('click',   () => _applyImport('merge'));
document.getElementById('importReplaceBtn').addEventListener('click',  () => _applyImport('replace'));

// Attach create-char button
document.getElementById('createCharBtn').addEventListener('click', () => { quickCreateMode = false; initChargen(); });

// Quick Create — show name prompt first
document.getElementById('quickCreateBtn').addEventListener('click', () => {
  const modal = document.getElementById('qc-name-modal');
  const input = document.getElementById('qc-name-input');
  input.value = '';
  modal.classList.add('open');
  setTimeout(() => input.focus(), 80);
});
document.getElementById('qc-confirm-btn').addEventListener('click', () => {
  const input = document.getElementById('qc-name-input');
  quickCreateName = input.value.trim();
  document.getElementById('qc-name-modal').classList.remove('open');
  quickCreateMode = true;
  initChargen();
});
document.getElementById('qc-cancel-btn').addEventListener('click', () => {
  document.getElementById('qc-name-modal').classList.remove('open');
});
// Enter key confirms
document.getElementById('qc-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('qc-confirm-btn').click();
  if (e.key === 'Escape') document.getElementById('qc-cancel-btn').click();
});
// Click backdrop to cancel
document.getElementById('qc-name-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('qc-name-modal'))
    document.getElementById('qc-cancel-btn').click();
});

// ── Menu tab switching ──
function switchToTab(tabId) {
  document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.menu-tab-pane').forEach(p => p.classList.remove('active'));
  const btn = document.querySelector(`.menu-tab[data-tab="${tabId}"]`);
  if (btn) btn.classList.add('active');
  const pane = document.getElementById(tabId);
  if (pane) pane.classList.add('active');
  if (tabId === 'tab-battle')   buildFightersPanel();
  if (tabId === 'tab-showcase') renderHeroShowcase();
  // Stop avatar animation when leaving showcase tab
  if (tabId !== 'tab-showcase' && _scAvatarRAF) {
    cancelAnimationFrame(_scAvatarRAF); _scAvatarRAF = null;
  }
}

document.querySelectorAll('.menu-tab').forEach(btn => {
  btn.addEventListener('click', () => switchToTab(btn.dataset.tab));
});

function switchToBattleTab() { switchToTab('tab-battle'); }

// ── Showcase Tab ──
let _heroIdx = 0;
let _heroTimer = null;

function renderHeroShowcase() {
  const wrap = document.getElementById('showcase-card-wrap');
  const nav  = document.getElementById('showcase-nav');
  const dots = document.getElementById('scDots');
  if (!wrap) return;

  if (cgRoster.length === 0) {
    wrap.innerHTML = '<div class="showcase-empty">No Radosers yet — create your first warrior!</div>';
    if (nav) nav.style.display = 'none';
    return;
  }

  _heroIdx = (_heroIdx + cgRoster.length) % cgRoster.length;
  const ch  = cgRoster[_heroIdx];
  const s   = ch.stats ?? {};
  const wepLabel = CG_WEAPONS.find(w => w.id === ch.weapon)?.label ?? ch.weapon ?? 'Fists';
  const subText  = ch.subrace ? ' · ' + ch.subrace.label : '';
  const t        = getRadoserTitle(s);

  // Derived stats
  const dur = s.durability ?? 5;
  const spd = s.speed      ?? 5;
  const str = s.strength   ?? 1;
  const iq  = s.iq         ?? null;
  const biq = s.battleiq   ?? null;
  const ma  = s.ma         ?? null;
  const wepId  = ch.weapon;
  const wepDef = WEAPON_MAP[wepId];
  const maxHP  = 50 + dur * 10;
  const maxSpd = +(10 + spd * 1.5).toFixed(1);
  const baseDmg= wepDef ? +(wepDef.baseDamage * str).toFixed(1) : str;
  const acMap  = { fists:Math.max(2,13-spd), sword:Math.max(2,28-spd), dagger:Math.max(2,18-spd),
                   spear:Math.max(2,38-spd), scythe:Math.max(2,34-spd), hammer:Math.max(2,48-spd),
                   bow:Math.max(5,20-spd), shuriken:Math.max(5,20-spd) };
  const ac     = acMap[wepId] ?? (wepDef?.attackCooldown ?? 20);
  const atkPS  = (60/ac).toFixed(2);
  const critRate  = iq  !== null ? (iq  * 5) + '%' : '20%';
  const evadeRate = biq !== null ? (biq * 3) + '%' : '10%';
  const spinBon   = ma  !== null ? '+' + (ma * 0.003).toFixed(3) : '+0.000';

  const drow = (lbl, val, color) =>
    `<div class="sc-drow"><span class="sc-dlbl">${lbl}</span><span class="sc-dval" style="color:${color}">${val}</span></div>`;

  wrap.innerHTML = `
    <div class="showcase-card" style="border:1px solid ${ch.color}55">
      <div class="sc-banner" style="background:linear-gradient(90deg,${ch.color}cc,${ch.color}22)"></div>
      <div class="sc-main">
        <canvas class="sc-avatar-canvas" id="sc-avatar-canvas" width="160" height="160"></canvas>
        <div class="sc-identity">
          <div class="sc-name" style="color:${ch.color}">${ch.name}</div>
          <div class="sc-race-line">${ch.raceName ?? ''}${subText}</div>
          <div class="sc-title-wrap">
            <span class="rc-title-badge" style="color:${t.color};border-color:${t.color}44">${t.title}</span>
          </div>
        </div>
      </div>
      <div class="sc-stats-section">
        <div class="sc-section-lbl">Base Stats</div>
        <div class="sc-stats-grid">
          ${STAT_DISPLAY.map(sd => {
            const val = s[sd.key] ?? '—';
            const col = STAT_COLORS[(+val - 1)] ?? '#4d96ff';
            return `<div class="sc-stat-box">
              <span class="sc-stat-emoji">${sd.emoji}</span>
              <span class="sc-stat-lbl">${sd.label}</span>
              <span class="sc-stat-val" style="color:${col}">${val}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="sc-divider"></div>
      <div class="sc-weapon-row">${wepLabel}</div>
      <div class="sc-divider"></div>
      <div class="sc-derived-section">
        <div class="sc-section-lbl">Combat Stats</div>
        <div class="sc-derived-grid">
          ${drow('❤️ Max HP',       maxHP,              '#ff6b6b')}
          ${drow('⚔️ Base Damage',  baseDmg,            '#ff9944')}
          ${drow('🔥 Atk Speed',    atkPS + '/s',       '#cc88ff')}
          ${drow('⚡ Crit Rate',    critRate,           '#ffe033')}
          ${drow('💥 Crit Damage',  '×1.5',             '#ffaa33')}
          ${drow('🌀 Evade',        evadeRate,          '#44eebb')}
        </div>
      </div>
    </div>`;

  // Nav dots
  if (nav) nav.style.display = cgRoster.length > 1 ? 'flex' : 'none';
  if (dots) {
    dots.innerHTML = cgRoster.map((_, i) =>
      `<div class="sc-dot${i === _heroIdx ? ' active' : ''}" data-i="${i}"></div>`
    ).join('');
    dots.querySelectorAll('.sc-dot').forEach(d => {
      d.onclick = () => { _heroIdx = +d.dataset.i; renderHeroShowcase(); };
    });
  }

  // Start animated avatar canvas
  startShowcaseAvatarAnim(ch);
}

// ── Showcase avatar animation ──────────────────────────────────────────
let _scAvatarRAF = null;

function startShowcaseAvatarAnim(ch) {
  if (_scAvatarRAF) { cancelAnimationFrame(_scAvatarRAF); _scAvatarRAF = null; }

  const canvas = document.getElementById('sc-avatar-canvas');
  if (!canvas) return;
  const ctx2 = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const CX = W / 2, CY = H / 2;
  const R = 38; // ball radius in canvas px

  // Fake ball object — only what drawRaceDecoration needs
  const fakeBall = {
    x: CX, y: CY,
    vx: 0, vy: 0,
    radius: R,
    color: ch.color,
    charRace:    ch.race    ?? null,
    charSubrace: ch.subrace ?? null,
    _deco_fa: 0,
  };

  const t0 = Date.now();

  function frame() {
    const elapsed = (Date.now() - t0) / 1000;
    // Slow rotation so all decorations are visible
    fakeBall._deco_fa = elapsed * 0.55;

    ctx2.clearRect(0, 0, W, H);

    // ── Draw base ball ──────────────────────────────────────────────────
    // Shadow
    ctx2.fillStyle = 'rgba(0,0,0,0.28)';
    ctx2.beginPath();
    ctx2.ellipse(CX, CY + R * 0.88, R * 0.78, R * 0.24, 0, 0, Math.PI * 2);
    ctx2.fill();

    // Ball fill + glow
    const pulse = 0.85 + 0.15 * Math.sin(elapsed * 1.4);
    ctx2.fillStyle = ch.color;
    ctx2.shadowColor = ch.color;
    ctx2.shadowBlur  = 18 * pulse;
    ctx2.beginPath();
    ctx2.arc(CX, CY, R, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.shadowBlur = 0;

    // Outline
    ctx2.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx2.lineWidth = 2;
    ctx2.stroke();

    // Shine highlight
    ctx2.fillStyle = 'rgba(255,255,255,0.22)';
    ctx2.beginPath();
    ctx2.ellipse(CX - R*0.28, CY - R*0.3, R*0.28, R*0.18, -Math.PI*0.3, 0, Math.PI*2);
    ctx2.fill();

    // ── Race decorations ────────────────────────────────────────────────
    drawRaceDecoration(ctx2, fakeBall);

    _scAvatarRAF = requestAnimationFrame(frame);
  }

  frame();
}

function startHeroShowcase() {
  if (cgRoster.length > 0) _heroIdx = Math.floor(Math.random() * cgRoster.length);
  renderHeroShowcase();
  if (_heroTimer) clearInterval(_heroTimer);
  _heroTimer = setInterval(() => {
    if (cgRoster.length > 1) {
      _heroIdx = (_heroIdx + 1) % cgRoster.length;
      renderHeroShowcase();
    }
  }, 7000);
}

document.getElementById('scPrev').onclick = () => { _heroIdx--; renderHeroShowcase(); };
document.getElementById('scNext').onclick = () => { _heroIdx++; renderHeroShowcase(); };

startHeroShowcase();

// ── Fighter Picker Modal ──────────────────────────────────────────────
function showFighterPicker() {
  const list = document.getElementById('fpm-list');
  list.innerHTML = '';

  // ── Radosers section ──
  if (cgRoster.length > 0) {
    const lbl = document.createElement('div');
    lbl.className = 'fpm-section-lbl';
    lbl.textContent = 'Your Radosers';
    list.appendChild(lbl);

    cgRoster.forEach(ch => {
      const wepLabel = CG_WEAPONS.find(w => w.id === ch.weapon)?.label ?? ch.weapon ?? 'Fists';
      const card = document.createElement('div');
      card.className = 'fpm-radoser-card';
      card.style.borderColor = ch.color + '55';
      card.innerHTML = `
        <div class="fpm-dot" style="background:${ch.color};box-shadow:0 0 8px ${ch.color}77"></div>
        <div class="fpm-info">
          <div class="fpm-name" style="color:${ch.color}">${ch.raceEmoji ?? ''} ${ch.name}</div>
          <div class="fpm-meta">${ch.raceName ?? ''}${ch.subrace ? ' · ' + ch.subrace.label : ''} &nbsp;·&nbsp; ${wepLabel}</div>
        </div>
        <span class="fpm-add-tag">ADD</span>`;
      card.addEventListener('click', () => {
        state.fighters.push(rosterToFighter(ch));
        buildFightersPanel();
        closeFighterPicker();
        sfxShoot();
      });
      list.appendChild(card);
    });
  } else {
    const empty = document.createElement('div');
    empty.className = 'fpm-empty';
    empty.textContent = 'No Radosers yet — create some in the Radosers tab!';
    list.appendChild(empty);
  }

  // ── Bot section ──
  const botLbl = document.createElement('div');
  botLbl.className = 'fpm-section-lbl';
  botLbl.style.marginTop = '6px';
  botLbl.textContent = 'or';
  list.appendChild(botLbl);

  const botCard = document.createElement('div');
  botCard.className = 'fpm-bot-card';
  botCard.innerHTML = `<span>🤖</span><span>Add Random Bot</span>`;
  botCard.addEventListener('click', () => {
    const nextColor = BALL_COLORS[state.fighters.length % BALL_COLORS.length];
    state.fighters.push({ weaponId: 'sword', color: nextColor });
    buildFightersPanel();
    closeFighterPicker();
    sfxShoot();
  });
  list.appendChild(botCard);

  document.getElementById('fighter-picker-modal').style.display = 'flex';
}

function closeFighterPicker() {
  document.getElementById('fighter-picker-modal').style.display = 'none';
}

// fpm event listeners are wired via onclick attrs in modal HTML
// ============================================================
// RACE ASSET EDITOR
// ============================================================

window.AE_DATA = {};
window._raceAssetOverrides = {};  // populated from AE_RACE_DEFAULTS after it's defined below

const AE = {
  raceId: 'gnome',
  shapes: [],
  nextId: 1,
  selected: null,
  hoverId: null,
  angle: 0,
  spinning: false,
  dragging: false,
  dragType: null,    // 'body' | 'vertex'
  dragVertexIdx: -1,
  dragStartLx: 0, dragStartLy: 0,
  dragSnapX: 0, dragSnapY: 0,
  dragSnapPoints: null,
  frozenAngle: 0,
  drawMode: null,    // null | 'polygon'
  drawPoints: [],
};

const AE_RACE_DEFAULTS = {
  goblin: [
    { type:'polygon', label:'Ear L',       points:[[-0.15,-0.78],[-0.50,-1.65],[0.45,-1.55]], fill:'#4a7a20', stroke:'#2a4a10', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Ear L Inner', points:[[-0.10,-0.86],[-0.35,-1.45],[0.24,-1.38]], fill:'#ff8888', stroke:null,      sw:1,   opacity:1, visible:true },
    { type:'polygon', label:'Ear R',       points:[[-0.15, 0.78],[-0.50, 1.65],[0.45, 1.55]], fill:'#4a7a20', stroke:'#2a4a10', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Ear R Inner', points:[[-0.10, 0.86],[-0.35, 1.45],[0.24, 1.38]], fill:'#ff8888', stroke:null,      sw:1,   opacity:1, visible:true },
  ],
  gnome: [
    { type:'ellipse', label:'Hat Brim', x:0.05, y:-0.95, rx:0.62, ry:0.18, rot:0, fill:'#773311', stroke:'#552200', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Hat Cone', points:[[-0.55,-0.97],[0.05,-2.25],[0.65,-0.97]],       fill:'#cc6633', stroke:'#883311', sw:1.5, opacity:1, visible:true },
    { type:'ellipse', label:'Hat Band', x:0.05, y:-1.06, rx:0.55, ry:0.15, rot:0, fill:null,   stroke:'#ffcc44', sw:2.2, opacity:1, visible:true },
  ],
  human: [
    { type:'line', label:'Hair 1', points:[[-0.27,-0.88],[-0.50,-1.46]], stroke:'#8B5E3C', sw:3, opacity:1, visible:true },
    { type:'line', label:'Hair 2', points:[[-0.13,-0.88],[-0.24,-1.46]], stroke:'#8B5E3C', sw:3, opacity:1, visible:true },
    { type:'line', label:'Hair 3', points:[[ 0.04,-0.88],[ 0.06,-1.46]], stroke:'#8B5E3C', sw:3, opacity:1, visible:true },
    { type:'line', label:'Hair 4', points:[[ 0.18,-0.88],[ 0.32,-1.46]], stroke:'#8B5E3C', sw:3, opacity:1, visible:true },
    { type:'line', label:'Hair 5', points:[[ 0.31,-0.88],[ 0.56,-1.46]], stroke:'#8B5E3C', sw:3, opacity:1, visible:true },
  ],
  dwarf: [
    { type:'polygon', label:'Beard',   points:[[-0.72,-0.52],[-1.36,-0.44],[-1.73,-0.20],[-1.86,0.15],[-1.75,0.55],[-0.72,0.52],[-0.93,0.29],[-1.01,0],[-0.93,-0.29]], fill:'#cc8833', stroke:'#996622', sw:1.5, opacity:1, visible:true },
    { type:'line',    label:'Braid 1', points:[[-1.10,-0.22],[-1.18, 0.22]], stroke:'#aa6611', sw:1.3, opacity:1, visible:true },
    { type:'line',    label:'Braid 2', points:[[-1.35,-0.22],[-1.43, 0.22]], stroke:'#aa6611', sw:1.3, opacity:1, visible:true },
    { type:'line',    label:'Braid 3', points:[[-1.60,-0.22],[-1.68, 0.22]], stroke:'#aa6611', sw:1.3, opacity:1, visible:true },
    { type:'ellipse', label:'Helmet',  x:0.05, y:-0.93, rx:0.58, ry:0.18, rot:0, fill:'#aaaaaa', stroke:'#666666', sw:1.5, opacity:1, visible:true },
  ],
  skeleton: [
    { type:'ellipse', label:'Socket L', x:0.43, y:-0.27, rx:0.20, ry:0.16, rot:0, fill:'#111111', stroke:null,     sw:1,   opacity:1, visible:true },
    { type:'ellipse', label:'Socket R', x:0.43, y: 0.27, rx:0.20, ry:0.16, rot:0, fill:'#111111', stroke:null,     sw:1,   opacity:1, visible:true },
    { type:'polygon', label:'Nose',     points:[[0.70,0],[0.60,-0.10],[0.60,0.10]], fill:'#111111', stroke:null, sw:1, opacity:1, visible:true },
    { type:'polygon', label:'Tooth 1',  points:[[0.76,-0.32],[0.93,-0.32],[0.93,-0.13],[0.76,-0.13]], fill:'#e8e8d8', stroke:'#666666', sw:1, opacity:1, visible:true },
    { type:'polygon', label:'Tooth 2',  points:[[0.76,-0.10],[0.93,-0.10],[0.93, 0.09],[0.76, 0.09]], fill:'#e8e8d8', stroke:'#666666', sw:1, opacity:1, visible:true },
    { type:'polygon', label:'Tooth 3',  points:[[0.76, 0.12],[0.93, 0.12],[0.93, 0.31],[0.76, 0.31]], fill:'#e8e8d8', stroke:'#666666', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Crack',    points:[[0.22,-0.66],[0.42,-0.46],[0.32,-0.30]], stroke:'rgba(0,0,0,0.5)', sw:1.8, opacity:1, visible:true },
  ],
  troll: [
    { type:'line',    label:'Hair 1', points:[[-0.32,-0.88],[-0.58,-1.74]], stroke:'#556633', sw:3,   opacity:1, visible:true },
    { type:'line',    label:'Hair 2', points:[[-0.15,-0.88],[-0.28,-1.68]], stroke:'#556633', sw:3,   opacity:1, visible:true },
    { type:'line',    label:'Hair 3', points:[[ 0.00,-0.88],[ 0.00,-1.62]], stroke:'#556633', sw:3,   opacity:1, visible:true },
    { type:'line',    label:'Hair 4', points:[[ 0.15,-0.88],[ 0.28,-1.68]], stroke:'#556633', sw:3,   opacity:1, visible:true },
    { type:'line',    label:'Hair 5', points:[[ 0.32,-0.88],[ 0.58,-1.74]], stroke:'#556633', sw:3,   opacity:1, visible:true },
    { type:'polygon', label:'Horn L', points:[[ 0.10,-0.80],[0.35,-1.32],[0.05,-1.58],[-0.10,-1.22],[0.00,-0.86]], fill:'#776644', stroke:'#554422', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Horn R', points:[[ 0.10, 0.80],[0.35, 1.32],[0.05, 1.58],[-0.10, 1.22],[0.00, 0.86]], fill:'#776644', stroke:'#554422', sw:1.5, opacity:1, visible:true },
    { type:'ellipse', label:'Nose',   x:0.86, y:0, rx:0.22, ry:0.17, rot:0, fill:'#5a7a38', stroke:'#3a5520', sw:1.5, opacity:1, visible:true },
  ],
  orc: [
    { type:'polygon', label:'Tusk L', points:[[0.60,-0.18],[1.05,-0.44],[0.90,-0.74],[0.77,-0.50],[0.71,-0.22]], fill:'#eeeebb', stroke:'#aaaa77', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Tusk R', points:[[0.60, 0.18],[1.05, 0.44],[0.90, 0.74],[0.77, 0.50],[0.71, 0.22]], fill:'#eeeebb', stroke:'#aaaa77', sw:1.5, opacity:1, visible:true },
    { type:'line',    label:'Brow L', points:[[0.25,-0.44],[0.62,-0.36]], stroke:'#1a1200', sw:3.5, opacity:1, visible:true },
    { type:'line',    label:'Brow R', points:[[0.25, 0.44],[0.62, 0.36]], stroke:'#1a1200', sw:3.5, opacity:1, visible:true },
  ],
  giant: [
    { type:'line',    label:'Crack 1',  points:[[ 0.10,-0.56],[0.28,-0.18],[0.12, 0.14]], stroke:'rgba(0,0,0,0.3)', sw:2, opacity:1, visible:true },
    { type:'line',    label:'Crack 2',  points:[[-0.30, 0.35],[-0.05,0.65]],              stroke:'rgba(0,0,0,0.3)', sw:2, opacity:1, visible:true },
    { type:'line',    label:'Crack 3',  points:[[ 0.40, 0.16],[0.65, 0.38],[0.82, 0.18]], stroke:'rgba(0,0,0,0.3)', sw:2, opacity:1, visible:true },
    { type:'line',    label:'Crack 4',  points:[[-0.55,-0.30],[-0.77,-0.06]],             stroke:'rgba(0,0,0,0.3)', sw:2, opacity:1, visible:true },
    { type:'ellipse', label:'Pebble 1', x: 0.22, y:-0.38, rx:0.10, ry:0.10, rot:0, fill:'rgba(255,255,255,0.13)', stroke:null, sw:1, opacity:1, visible:true },
    { type:'ellipse', label:'Pebble 2', x:-0.44, y: 0.20, rx:0.08, ry:0.08, rot:0, fill:'rgba(255,255,255,0.13)', stroke:null, sw:1, opacity:1, visible:true },
    { type:'ellipse', label:'Pebble 3', x: 0.55, y: 0.30, rx:0.07, ry:0.07, rot:0, fill:'rgba(255,255,255,0.13)', stroke:null, sw:1, opacity:1, visible:true },
  ],
  dragon: [
    { type:'polygon', label:'Horn L',    points:[[0.15,-0.78],[0.33,-1.28],[0.25,-1.69],[0.00,-1.88],[-0.10,-1.62],[-0.04,-1.23],[0.10,-0.82]], fill:'#cc3300', stroke:'rgba(0,0,0,0.45)', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Horn R',    points:[[0.15, 0.78],[0.33, 1.28],[0.25, 1.69],[0.00, 1.88],[-0.10, 1.62],[-0.04, 1.23],[0.10, 0.82]], fill:'#cc3300', stroke:'rgba(0,0,0,0.45)', sw:1.5, opacity:1, visible:true },
    { type:'line',    label:'Tail',      points:[[-0.85,0],[-1.40,0.16],[-1.92,0.28]], stroke:'#cc3300', sw:3.5, opacity:1, visible:true },
    { type:'polygon', label:'Tail Tip',  points:[[-1.74,0.22],[-2.04,0.32],[-1.82,0.44]], fill:'#cc3300', stroke:null, sw:1, opacity:1, visible:true },
    // Scale arc marks — 5-point approximations of ctx.arc(cx,cy,0.18, PI*0.12, PI*0.88)
    { type:'line', label:'Scale 1', points:[[-0.083,-0.394],[-0.154,-0.308],[-0.250,-0.280],[-0.346,-0.308],[-0.417,-0.394]], stroke:'#cc3300aa', sw:1.3, opacity:1, visible:true },
    { type:'line', label:'Scale 2', points:[[ 0.227,-0.564],[ 0.156,-0.478],[ 0.060,-0.450],[-0.036,-0.478],[-0.107,-0.564]], stroke:'#cc3300aa', sw:1.3, opacity:1, visible:true },
    { type:'line', label:'Scale 3', points:[[-0.083, 0.394],[-0.154, 0.308],[-0.250, 0.280],[-0.346, 0.308],[-0.417, 0.394]], stroke:'#cc3300aa', sw:1.3, opacity:1, visible:true },
    { type:'line', label:'Scale 4', points:[[ 0.227, 0.564],[ 0.156, 0.478],[ 0.060, 0.450],[-0.036, 0.478],[-0.107, 0.564]], stroke:'#cc3300aa', sw:1.3, opacity:1, visible:true },
    { type:'line', label:'Scale 5', points:[[ 0.497, 0.066],[ 0.426, 0.152],[ 0.330, 0.180],[ 0.234, 0.152],[ 0.163, 0.066]], stroke:'#cc3300aa', sw:1.3, opacity:1, visible:true },
  ],
  angel: [
    { type:'polygon', label:'Wing L',      points:[[ 0.35,-0.78],[-0.02,-1.35],[-0.42,-1.46],[-0.66,-1.12],[-0.12,-0.89],[0.30,-0.80]], fill:'rgba(255,255,255,0.92)', stroke:'rgba(200,200,170,0.9)', sw:1.2, opacity:1, visible:true },
    { type:'polygon', label:'Wing R',      points:[[ 0.35, 0.78],[-0.02, 1.35],[-0.42, 1.46],[-0.66, 1.12],[-0.12, 0.89],[0.30, 0.80]], fill:'rgba(255,255,255,0.92)', stroke:'rgba(200,200,170,0.9)', sw:1.2, opacity:1, visible:true },
    { type:'line',    label:'Feather L1',  points:[[ 0.30,-0.86],[-0.06,-1.12]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Feather L2',  points:[[ 0.00,-1.06],[-0.26,-1.32]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Feather L3',  points:[[-0.36,-1.12],[-0.56,-1.30]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Feather R1',  points:[[ 0.30, 0.86],[-0.06, 1.12]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Feather R2',  points:[[ 0.00, 1.06],[-0.26, 1.32]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Feather R3',  points:[[-0.36, 1.12],[-0.56, 1.30]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'ellipse', label:'Halo',        x:0, y:-1.55, rx:0.56, ry:0.17, rot:0, fill:null, stroke:'#ffdd33', sw:3, opacity:1, visible:true },
  ],
  primordial: [
    { type:'ellipse', label:'Swirl Inner', x:0, y:0, rx:0.52, ry:0.52, rot:0, fill:null, stroke:'rgba(110,150,255,0.55)', sw:1.8, opacity:1, visible:true },
    { type:'ellipse', label:'Swirl Outer', x:0, y:0, rx:0.74, ry:0.74, rot:0, fill:null, stroke:'rgba(255,90,190,0.45)',  sw:1.8, opacity:1, visible:true },
    { type:'ellipse', label:'Orb 1',       x: 1.44, y:  0,    rx:0.13, ry:0.13, rot:0, fill:'#6699ff', stroke:null, sw:1, opacity:1, visible:true },
    { type:'ellipse', label:'Orb 2',       x:-0.72, y:  1.25, rx:0.13, ry:0.13, rot:0, fill:'#ff55aa', stroke:null, sw:1, opacity:1, visible:true },
    { type:'ellipse', label:'Orb 3',       x:-0.72, y: -1.25, rx:0.13, ry:0.13, rot:0, fill:'#55ffdd', stroke:null, sw:1, opacity:1, visible:true },
  ],
  demon: [
    { type:'ellipse', label:'Aura',        x:0, y:0, rx:1.18, ry:1.18, rot:0, fill:null, stroke:'rgba(180,0,0,0.28)', sw:6, opacity:1, visible:true },
    { type:'polygon', label:'Horn L',      points:[[0.10,-0.78],[0.28,-1.80],[0.52,-0.84]], fill:'#cc1100', stroke:'#880000', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Horn L Glow', points:[[0.15,-0.82],[0.22,-1.56],[0.33,-0.87]], fill:'#ff3322', stroke:null,     sw:1,   opacity:1, visible:true },
    { type:'polygon', label:'Horn R',      points:[[0.10, 0.78],[0.28, 1.80],[0.52, 0.84]], fill:'#cc1100', stroke:'#880000', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Horn R Glow', points:[[0.15, 0.82],[0.22, 1.56],[0.33, 0.87]], fill:'#ff3322', stroke:null,     sw:1,   opacity:1, visible:true },
    { type:'line',    label:'Tail',        points:[[-0.85,0],[-1.35,0.43],[-1.52,0.88]], stroke:'#cc1100', sw:3, opacity:1, visible:true },
    { type:'polygon', label:'Tail Tip',    points:[[-1.34,0.88],[-1.64,0.76],[-1.57,0.88],[-1.64,1.00]], fill:'#cc1100', stroke:null, sw:1, opacity:1, visible:true },
  ],
  god: [
    { type:'line',    label:'Ray 1',    points:[[ 1.26, 0.00],[ 1.90, 0.00]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 2',    points:[[ 0.89, 0.89],[ 1.34, 1.34]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 3',    points:[[ 0.00, 1.26],[ 0.00, 1.90]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 4',    points:[[-0.89, 0.89],[-1.34, 1.34]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 5',    points:[[-1.26, 0.00],[-1.90, 0.00]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 6',    points:[[-0.89,-0.89],[-1.34,-1.34]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 7',    points:[[ 0.00,-1.26],[ 0.00,-1.90]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 8',    points:[[ 0.89,-0.89],[ 1.34,-1.34]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'ellipse', label:'Halo Ring', x:0, y:0, rx:1.22, ry:1.22, rot:0, fill:null, stroke:'rgba(255,215,0,0.78)', sw:3, opacity:1, visible:true },
  ],
};
// Keep alias for backward compat
const AE_GNOME_DEFAULTS = AE_RACE_DEFAULTS.gnome;

// ── Baked-in race overrides ─────────────────────────────────────────────
// These races use static custom shapes instead of the animated switch case.
// Angel uses the switch case (has golden-glow halo via ctx.shadowBlur).
// Goblin / Gnome / Human / Dwarf / Troll / Giant use the switch case too.
window._raceAssetOverrides = {
  // ── Races with custom static shapes ────────────────────────────────
  skeleton:   AE_RACE_DEFAULTS.skeleton,
  orc:        AE_RACE_DEFAULTS.orc,
  dragon:     AE_RACE_DEFAULTS.dragon.filter(s => s.label !== 'Horn L' && s.label !== 'Horn R'),
  demon:      AE_RACE_DEFAULTS.demon,
  // Angel: key present so switch-case is skipped; halo drawn via special code in override block
  angel:      [],
  // ── Races with NO decoration (empty array = skip switch case too) ──
  goblin: [], gnome: [], human: [], dwarf: [], troll: [], giant: [],
  // primordial & god: NOT listed → fall through to switch case → animated effects preserved
};

function aeNewId() {
  return 's' + (AE.nextId++);
}

function aeLoadRace(raceId) {
  // Save current shapes to AE_DATA
  window.AE_DATA[AE.raceId] = AE.shapes.map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  AE.raceId = raceId;
  AE.selected = null;
  AE.hoverId = null;
  // Load from: in-session cache → saved overrides → hardcoded defaults → empty
  if (window.AE_DATA[raceId]) {
    AE.shapes = window.AE_DATA[raceId].map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else if (window._raceAssetOverrides?.[raceId]?.length > 0) {
    AE.shapes = window._raceAssetOverrides[raceId].map(s => Object.assign({ id: aeNewId() }, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else if (AE_RACE_DEFAULTS[raceId]) {
    AE.shapes = AE_RACE_DEFAULTS[raceId].map(s => Object.assign({ id: aeNewId() }, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else {
    AE.shapes = [];
  }
  aeRenderLayers();
  aeRenderProps();
  if (typeof aeUpdateSaveIndicator === 'function') aeUpdateSaveIndicator();
}

function aeOpen(raceId) {
  const el = document.getElementById('screen-asset-editor');
  el.classList.add('ae-open');
  // Sync race id without saving (first open)
  AE.raceId = raceId || 'gnome';
  document.getElementById('ae-race-select').value = AE.raceId;
  // Load shapes: in-session cache → saved overrides → hardcoded defaults → empty
  if (window.AE_DATA[AE.raceId]) {
    AE.shapes = window.AE_DATA[AE.raceId].map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else if (window._raceAssetOverrides?.[AE.raceId]?.length > 0) {
    AE.shapes = window._raceAssetOverrides[AE.raceId].map(s => Object.assign({ id: aeNewId() }, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else if (AE_RACE_DEFAULTS[AE.raceId]) {
    AE.shapes = AE_RACE_DEFAULTS[AE.raceId].map(s => Object.assign({ id: aeNewId() }, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else {
    AE.shapes = [];
  }
  AE.selected = null;
  AE.hoverId = null;
  AE.drawMode = null;
  AE.drawPoints = [];
  AE.spinning = false;
  document.getElementById('ae-spin-cb').checked = false;
  aeRenderLayers();
  aeRenderProps();
  if (typeof aeUpdateSaveIndicator === 'function') aeUpdateSaveIndicator();
  // Start RAF loop
  if (window._aeRAF) cancelAnimationFrame(window._aeRAF);
  function aeLoop() {
    aeRender();
    window._aeRAF = requestAnimationFrame(aeLoop);
  }
  aeLoop();
}

function aeClose() {
  const el = document.getElementById('screen-asset-editor');
  el.classList.remove('ae-open');
  if (window._aeRAF) { cancelAnimationFrame(window._aeRAF); window._aeRAF = null; }
  // Save
  window.AE_DATA[AE.raceId] = AE.shapes.map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  AE.drawMode = null;
  AE.drawPoints = [];
}

function aeScreenToLocal(e) {
  const canvas = document.getElementById('ae-canvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (e.clientX - rect.left) * scaleX;
  const cy = (e.clientY - rect.top) * scaleY;
  const CX = canvas.width / 2, CY = canvas.height / 2;
  const R = 65;
  const dx = cx - CX, dy = cy - CY;
  const a = AE.dragging ? AE.frozenAngle : AE.angle;
  const cos = Math.cos(-a), sin = Math.sin(-a);
  return {
    lx: +(( dx*cos - dy*sin) / R).toFixed(4),
    ly: +(( dx*sin + dy*cos) / R).toFixed(4),
    cx, cy
  };
}

function aeDistSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx*dx + dy*dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax)*dx + (py - ay)*dy) / len2));
  return Math.hypot(px - (ax + t*dx), py - (ay + t*dy));
}

function aeHitBody(lx, ly, s) {
  switch (s.type) {
    case 'ellipse': {
      const ndx = (lx - s.x) / Math.max(Math.abs(s.rx), 0.05);
      const ndy = (ly - s.y) / Math.max(Math.abs(s.ry), 0.05);
      return ndx*ndx + ndy*ndy <= 1.5;
    }
    case 'polygon': {
      if (!s.points || s.points.length < 3) return false;
      let inside = false;
      for (let i = 0, j = s.points.length - 1; i < s.points.length; j = i++) {
        const xi = s.points[i][0], yi = s.points[i][1];
        const xj = s.points[j][0], yj = s.points[j][1];
        if (((yi > ly) !== (yj > ly)) && (lx < (xj - xi) * (ly - yi) / (yj - yi) + xi)) inside = !inside;
      }
      if (inside) return true;
      for (let i = 0; i < s.points.length; i++) {
        const j = (i + 1) % s.points.length;
        if (aeDistSeg(lx, ly, s.points[i][0], s.points[i][1], s.points[j][0], s.points[j][1]) < 0.2) return true;
      }
      return false;
    }
    case 'line': {
      if (!s.points || s.points.length < 2) return false;
      for (let i = 0; i < s.points.length - 1; i++) {
        if (aeDistSeg(lx, ly, s.points[i][0], s.points[i][1], s.points[i+1][0], s.points[i+1][1]) < 0.25) return true;
      }
      return false;
    }
  }
  return false;
}

function aeGetHandlePoints(s, R) {
  if (s.type === 'ellipse') {
    const cx = s.x * R, cy = s.y * R;
    const rx = Math.abs(s.rx * R), ry = Math.abs(s.ry * R);
    return [[cx-rx,cy-ry],[cx,cy-ry],[cx+rx,cy-ry],[cx+rx,cy],[cx+rx,cy+ry],[cx,cy+ry],[cx-rx,cy+ry],[cx-rx,cy]];
  }
  if (s.points) return s.points.map(([px, py]) => [px * R, py * R]);
  return [];
}

function aeHitTest(lx, ly) {
  // Check vertex handles of selected shape first
  if (AE.selected) {
    const s = AE.shapes.find(x => x.id === AE.selected);
    if (s) {
      const handles = aeGetHandlePoints(s, 1); // in r-units
      for (let i = 0; i < handles.length; i++) {
        const dx = lx - handles[i][0], dy = ly - handles[i][1];
        if (Math.hypot(dx, dy) < 0.2) return { id: s.id, type: 'vertex', idx: i };
      }
    }
  }
  // Body hit test, reverse order
  for (let i = AE.shapes.length - 1; i >= 0; i--) {
    const s = AE.shapes[i];
    if (!s.visible) continue;
    if (aeHitBody(lx, ly, s)) return { id: s.id, type: 'body', idx: -1 };
  }
  return null;
}

function aeDrawShape(ctx, s, R) {
  ctx.save();
  ctx.globalAlpha = s.opacity ?? 1;
  ctx.lineWidth = s.sw ?? 1.5;
  switch (s.type) {
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(s.x * R, s.y * R,
        Math.max(Math.abs(s.rx * R), 0.5),
        Math.max(Math.abs(s.ry * R), 0.5),
        (s.rot || 0) * Math.PI / 180, 0, Math.PI * 2);
      if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
      if (s.stroke) { ctx.strokeStyle = s.stroke; ctx.stroke(); }
      break;
    case 'polygon':
      if (!s.points || s.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0] * R, s.points[0][1] * R);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0] * R, s.points[i][1] * R);
      ctx.closePath();
      if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
      if (s.stroke) { ctx.strokeStyle = s.stroke; ctx.stroke(); }
      break;
    case 'line':
      if (!s.points || s.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0] * R, s.points[0][1] * R);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0] * R, s.points[i][1] * R);
      if (s.stroke) { ctx.strokeStyle = s.stroke; ctx.stroke(); }
      break;
  }
  ctx.restore();
}

function aeStrokeOutline(ctx, s, R) {
  switch (s.type) {
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(s.x * R, s.y * R,
        Math.max(Math.abs(s.rx * R) + 3, 3),
        Math.max(Math.abs(s.ry * R) + 3, 3),
        (s.rot || 0) * Math.PI / 180, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'polygon':
      if (!s.points || s.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0] * R, s.points[0][1] * R);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0] * R, s.points[i][1] * R);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'line':
      if (!s.points || s.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0] * R, s.points[0][1] * R);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0] * R, s.points[i][1] * R);
      ctx.stroke();
      break;
  }
}

function aeRender() {
  const canvas = document.getElementById('ae-canvas');
  if (!canvas || !canvas.offsetParent) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const CX = W / 2, CY = H / 2, R = 65;

  if (AE.spinning && !AE.dragging) AE.angle = Date.now() * 0.0004;

  ctx.clearRect(0, 0, W, H);
  // Background
  ctx.fillStyle = '#080818'; ctx.fillRect(0, 0, W, H);
  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // Center cross
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(CX, 0); ctx.lineTo(CX, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, CY); ctx.lineTo(W, CY); ctx.stroke();
  ctx.setLineDash([]);

  // Ball shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(CX, CY + R*0.88, R*0.78, R*0.24, 0, 0, Math.PI*2); ctx.fill();
  // Ball body
  ctx.fillStyle = '#4488ff'; ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke();
  // Ball highlight
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath(); ctx.ellipse(CX - R*0.28, CY - R*0.3, R*0.28, R*0.18, -0.94, 0, Math.PI*2); ctx.fill();

  // Eyes
  ctx.save(); ctx.translate(CX, CY); ctx.rotate(AE.angle);
  const eyeC = '#44ffaa'; // default preview eye color
  const er = parseInt(eyeC.slice(1,3),16), eg = parseInt(eyeC.slice(3,5),16), eb = parseInt(eyeC.slice(5,7),16);
  for (const ey of [-R*0.20, R*0.20]) {
    const ew = R*0.21, eh = R*0.085, ex = R*0.46;
    ctx.beginPath(); ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI*2);
    const g = ctx.createLinearGradient(ex, ey - eh, ex, ey + eh);
    g.addColorStop(0, `rgba(${Math.min(er+70,255)},${Math.min(eg+70,255)},${Math.min(eb+70,255)},0.9)`);
    g.addColorStop(1, `rgba(${Math.max(er-45,0)},${Math.max(eg-45,0)},${Math.max(eb-45,0)},0.78)`);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = `rgba(${er},${eg},${eb},0.4)`; ctx.lineWidth = 1;
    ctx.shadowColor = eyeC; ctx.shadowBlur = 4; ctx.stroke(); ctx.shadowBlur = 0;
  }
  ctx.restore();

  // Draw all shapes
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(AE.angle);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of AE.shapes) {
    if (!s.visible) continue;
    aeDrawShape(ctx, s, R);
  }
  // Polygon draw mode in-progress
  if (AE.drawMode === 'polygon' && AE.drawPoints.length > 0) {
    ctx.strokeStyle = 'rgba(100,200,255,0.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(AE.drawPoints[0][0] * R, AE.drawPoints[0][1] * R);
    for (let i = 1; i < AE.drawPoints.length; i++) ctx.lineTo(AE.drawPoints[i][0] * R, AE.drawPoints[i][1] * R);
    ctx.stroke(); ctx.setLineDash([]);
    for (const [px, py] of AE.drawPoints) {
      ctx.fillStyle = '#44aaff'; ctx.beginPath(); ctx.arc(px * R, py * R, 5, 0, Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();

  // Selection / hover outlines + vertex handles
  ctx.save(); ctx.translate(CX, CY); ctx.rotate(AE.angle);
  for (const s of AE.shapes) {
    const isSel = s.id === AE.selected;
    const isHov = s.id === AE.hoverId && !isSel;
    if (!isSel && !isHov) continue;
    if (!s.visible) continue;
    ctx.strokeStyle = isSel ? '#44aaff' : 'rgba(200,200,255,0.4)';
    ctx.lineWidth = isSel ? 1.5 : 1;
    ctx.setLineDash([4, 3]);
    aeStrokeOutline(ctx, s, R);
    ctx.setLineDash([]);
    if (isSel) {
      for (const [hx, hy] of aeGetHandlePoints(s, R)) {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#44aaff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function aeRenderLayers() {
  const list = document.getElementById('ae-layers-list');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < AE.shapes.length; i++) {
    const s = AE.shapes[i];
    const row = document.createElement('div');
    row.className = 'ae-layer-row' + (s.id === AE.selected ? ' ae-sel' : '');
    row.dataset.id = s.id;

    // Color dot
    const dot = document.createElement('div');
    dot.className = 'ae-layer-dot';
    const dotColor = s.fill || s.stroke || '#aaaaaa';
    dot.style.background = dotColor;
    row.appendChild(dot);

    // Name (editable on dblclick)
    const name = document.createElement('div');
    name.className = 'ae-layer-name';
    name.textContent = s.label || s.type;
    name.setAttribute('contenteditable', 'false');
    name.title = 'Double-click to rename';
    name.addEventListener('dblclick', e => {
      e.stopPropagation();
      name.setAttribute('contenteditable', 'true');
      name.focus();
      const range = document.createRange();
      range.selectNodeContents(name);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    name.addEventListener('blur', () => {
      name.setAttribute('contenteditable', 'false');
      s.label = name.textContent.trim() || s.type;
    });
    name.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); name.blur(); }
    });
    row.appendChild(name);

    // Visibility toggle
    const vis = document.createElement('button');
    vis.className = 'ae-layer-vis' + (!s.visible ? ' ae-hidden' : '');
    vis.textContent = '👁';
    vis.title = 'Toggle visibility';
    vis.addEventListener('click', e => {
      e.stopPropagation();
      s.visible = !s.visible;
      aeRenderLayers();
    });
    row.appendChild(vis);

    // Delete
    const del = document.createElement('button');
    del.className = 'ae-layer-del';
    del.textContent = '✕';
    del.title = 'Delete shape';
    del.addEventListener('click', e => {
      e.stopPropagation();
      AE.shapes.splice(i, 1);
      if (AE.selected === s.id) { AE.selected = null; aeRenderProps(); }
      aeRenderLayers();
    });
    row.appendChild(del);

    row.addEventListener('click', () => {
      AE.selected = s.id;
      aeRenderLayers();
      aeRenderProps();
    });

    list.appendChild(row);
  }
  if (AE.shapes.length === 0) {
    list.innerHTML = '<div style="font-size:11px;color:#334;text-align:center;padding:14px 0;">No shapes yet</div>';
  }
}

function aeRenderProps() {
  const body = document.getElementById('ae-props-body');
  if (!body) return;
  body.innerHTML = '';
  if (!AE.selected) {
    body.innerHTML = '<div id="ae-props-empty">Select a shape to edit its properties.</div>';
    return;
  }
  const s = AE.shapes.find(x => x.id === AE.selected);
  if (!s) { body.innerHTML = '<div id="ae-props-empty">Select a shape to edit its properties.</div>'; return; }

  const mk = (tag, cls, attrs = {}) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'textContent') el.textContent = v;
      else el.setAttribute(k, v);
    }
    return el;
  };

  // -- General group --
  const genGroup = mk('div', 'ae-prop-group');
  genGroup.appendChild(Object.assign(mk('div', 'ae-prop-group-label'), { textContent: 'General' }));

  // Label
  const labelRow = mk('div', 'ae-prop-row');
  labelRow.appendChild(Object.assign(mk('div', 'ae-prop-lbl'), { textContent: 'Label' }));
  const labelInp = mk('input', 'ae-text-inp');
  labelInp.type = 'text'; labelInp.value = s.label || '';
  labelInp.style.cssText = 'flex:1;min-width:0;';
  labelInp.addEventListener('input', () => { s.label = labelInp.value; aeRenderLayers(); });
  labelRow.appendChild(labelInp);
  genGroup.appendChild(labelRow);

  // Opacity
  const opRow = mk('div', 'ae-prop-row');
  opRow.appendChild(Object.assign(mk('div', 'ae-prop-lbl'), { textContent: 'Opacity' }));
  const opInp = mk('input', 'ae-num-inp');
  opInp.type = 'number'; opInp.step = '0.05'; opInp.min = '0'; opInp.max = '1'; opInp.value = s.opacity ?? 1;
  opInp.addEventListener('input', () => { s.opacity = parseFloat(opInp.value) || 0; });
  opRow.appendChild(opInp);
  genGroup.appendChild(opRow);
  body.appendChild(genGroup);

  // -- Shape-specific group --
  if (s.type === 'ellipse') {
    const shGroup = mk('div', 'ae-prop-group');
    shGroup.appendChild(Object.assign(mk('div', 'ae-prop-group-label'), { textContent: 'Ellipse' }));
    for (const [lbl, key] of [['X', 'x'], ['Y', 'y'], ['RX', 'rx'], ['RY', 'ry'], ['Rot°', 'rot']]) {
      const row = mk('div', 'ae-prop-row');
      row.appendChild(Object.assign(mk('div', 'ae-prop-lbl'), { textContent: lbl }));
      const inp = mk('input', 'ae-num-inp');
      inp.type = 'number'; inp.step = '0.01'; inp.value = s[key] ?? 0;
      inp.addEventListener('input', () => { s[key] = parseFloat(inp.value) || 0; });
      row.appendChild(inp);
      shGroup.appendChild(row);
    }
    body.appendChild(shGroup);
  } else if (s.type === 'polygon' || s.type === 'line') {
    const vtxGroup = mk('div', 'ae-prop-group');
    vtxGroup.appendChild(Object.assign(mk('div', 'ae-prop-group-label'), { textContent: 'Vertices' }));
    const vtxList = mk('div', 'ae-vertices-list');
    const rebuildVtx = () => {
      vtxList.innerHTML = '';
      (s.points || []).forEach((pt, vi) => {
        const row = mk('div', 'ae-vtx-row');
        const idxLbl = mk('div', 'ae-vtx-idx'); idxLbl.textContent = vi;
        const xInp = mk('input', 'ae-num-inp');
        xInp.type = 'number'; xInp.step = '0.01'; xInp.value = pt[0]; xInp.title = 'X';
        xInp.addEventListener('input', () => { pt[0] = parseFloat(xInp.value) || 0; });
        const yInp = mk('input', 'ae-num-inp');
        yInp.type = 'number'; yInp.step = '0.01'; yInp.value = pt[1]; yInp.title = 'Y';
        yInp.addEventListener('input', () => { pt[1] = parseFloat(yInp.value) || 0; });
        const delBtn = mk('button', 'ae-vtx-del'); delBtn.textContent = '✕';
        delBtn.addEventListener('click', () => {
          s.points.splice(vi, 1);
          rebuildVtx();
        });
        row.appendChild(idxLbl); row.appendChild(xInp); row.appendChild(yInp); row.appendChild(delBtn);
        vtxList.appendChild(row);
      });
    };
    rebuildVtx();
    vtxGroup.appendChild(vtxList);
    const addVtxBtn = mk('button', 'ae-add-vtx-btn'); addVtxBtn.textContent = '+ Add Vertex';
    addVtxBtn.addEventListener('click', () => {
      if (!s.points) s.points = [];
      s.points.push([0, 0]);
      rebuildVtx();
    });
    vtxGroup.appendChild(addVtxBtn);
    body.appendChild(vtxGroup);
  }

  // -- Fill group --
  const fillGroup = mk('div', 'ae-prop-group');
  fillGroup.appendChild(Object.assign(mk('div', 'ae-prop-group-label'), { textContent: 'Fill' }));

  const fillRow = mk('div', 'ae-color-row');
  const fillSwatch = mk('div', 'ae-color-swatch');
  fillSwatch.style.background = s.fill || '#000000';
  if (!s.fill) fillSwatch.classList.add('ae-color-swatch-none');
  const fillColorInp = mk('input', 'ae-color-inp');
  fillColorInp.type = 'color'; fillColorInp.value = s.fill || '#ff0000';
  fillColorInp.style.cssText = 'position:absolute;opacity:0;width:0;height:0;pointer-events:none;';
  fillSwatch.appendChild(fillColorInp);
  fillSwatch.addEventListener('click', () => { if (s.fill) fillColorInp.click(); });
  fillColorInp.addEventListener('input', () => {
    s.fill = fillColorInp.value;
    fillSwatch.style.background = s.fill;
    fillSwatch.classList.remove('ae-color-swatch-none');
    aeRenderLayers();
  });

  const noFillCb = mk('input', 'ae-nofill-cb');
  noFillCb.type = 'checkbox'; noFillCb.id = 'ae-nofill-cb'; noFillCb.checked = !s.fill;
  noFillCb.addEventListener('change', () => {
    if (noFillCb.checked) {
      s.fill = null;
      fillSwatch.style.background = '#000';
      fillSwatch.classList.add('ae-color-swatch-none');
    } else {
      s.fill = fillColorInp.value || '#ff0000';
      fillSwatch.style.background = s.fill;
      fillSwatch.classList.remove('ae-color-swatch-none');
    }
    aeRenderLayers();
  });
  const noFillLbl = mk('label', 'ae-nofill-lbl');
  noFillLbl.setAttribute('for', 'ae-nofill-cb'); noFillLbl.textContent = 'No Fill';

  fillRow.appendChild(fillSwatch);
  fillRow.appendChild(noFillCb);
  fillRow.appendChild(noFillLbl);
  fillGroup.appendChild(fillRow);
  body.appendChild(fillGroup);

  // -- Stroke group --
  const strokeGroup = mk('div', 'ae-prop-group');
  strokeGroup.appendChild(Object.assign(mk('div', 'ae-prop-group-label'), { textContent: 'Stroke' }));

  const strokeRow = mk('div', 'ae-color-row');
  const strokeSwatch = mk('div', 'ae-color-swatch');
  strokeSwatch.style.background = s.stroke || '#000000';
  if (!s.stroke) strokeSwatch.classList.add('ae-color-swatch-none');
  const strokeColorInp = mk('input', 'ae-color-inp');
  strokeColorInp.type = 'color'; strokeColorInp.value = s.stroke || '#ffffff';
  strokeColorInp.style.cssText = 'position:absolute;opacity:0;width:0;height:0;pointer-events:none;';
  strokeSwatch.appendChild(strokeColorInp);
  strokeSwatch.addEventListener('click', () => { if (s.stroke) strokeColorInp.click(); });
  strokeColorInp.addEventListener('input', () => {
    s.stroke = strokeColorInp.value;
    strokeSwatch.style.background = s.stroke;
    strokeSwatch.classList.remove('ae-color-swatch-none');
    aeRenderLayers();
  });

  const noStrokeCb = mk('input', 'ae-nofill-cb');
  noStrokeCb.type = 'checkbox'; noStrokeCb.id = 'ae-nostroke-cb'; noStrokeCb.checked = !s.stroke;
  noStrokeCb.addEventListener('change', () => {
    if (noStrokeCb.checked) {
      s.stroke = null;
      strokeSwatch.style.background = '#000';
      strokeSwatch.classList.add('ae-color-swatch-none');
    } else {
      s.stroke = strokeColorInp.value || '#ffffff';
      strokeSwatch.style.background = s.stroke;
      strokeSwatch.classList.remove('ae-color-swatch-none');
    }
    aeRenderLayers();
  });
  const noStrokeLbl = mk('label', 'ae-nofill-lbl');
  noStrokeLbl.setAttribute('for', 'ae-nostroke-cb'); noStrokeLbl.textContent = 'No Stroke';

  strokeRow.appendChild(strokeSwatch);
  strokeRow.appendChild(noStrokeCb);
  strokeRow.appendChild(noStrokeLbl);
  strokeGroup.appendChild(strokeRow);

  const swRow = mk('div', 'ae-prop-row');
  swRow.appendChild(Object.assign(mk('div', 'ae-prop-lbl'), { textContent: 'Width' }));
  const swInp = mk('input', 'ae-num-inp');
  swInp.type = 'number'; swInp.step = '0.1'; swInp.min = '0'; swInp.value = s.sw ?? 1.5;
  swInp.addEventListener('input', () => { s.sw = parseFloat(swInp.value) || 0; });
  swRow.appendChild(swInp);
  strokeGroup.appendChild(swRow);
  body.appendChild(strokeGroup);

  // -- Delete shape button --
  const delBtn = mk('button', 'ae-del-shape-btn'); delBtn.textContent = '🗑 Delete Shape';
  delBtn.addEventListener('click', () => {
    const idx = AE.shapes.findIndex(x => x.id === AE.selected);
    if (idx >= 0) AE.shapes.splice(idx, 1);
    AE.selected = null;
    aeRenderLayers();
    aeRenderProps();
  });
  body.appendChild(delBtn);
}

function aeShapeToCode(s) {
  const fmt = v => {
    const n = parseFloat(v);
    return (n === 0) ? '0' : (Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/\.?0+$/, ''));
  };
  const lines = [];
  if (s.fill || s.stroke || s.sw) {
    const parts = [];
    if (s.fill) parts.push(`ctx.fillStyle='${s.fill}';`);
    if (s.stroke) parts.push(`ctx.strokeStyle='${s.stroke}';`);
    if (s.sw) parts.push(`ctx.lineWidth=${fmt(s.sw)};`);
    lines.push('  ' + parts.join(' '));
  }
  if ((s.opacity ?? 1) !== 1) lines.push(`  ctx.globalAlpha=${fmt(s.opacity)};`);

  switch (s.type) {
    case 'ellipse': {
      const rotRad = ((s.rot || 0) * Math.PI / 180);
      const rotStr = rotRad === 0 ? '0' : fmt(rotRad);
      lines.push(`  ctx.beginPath();`);
      lines.push(`  ctx.ellipse(r*${fmt(s.x)}, r*${fmt(s.y)}, r*${fmt(Math.abs(s.rx))}, r*${fmt(Math.abs(s.ry))}, ${rotStr}, 0, Math.PI*2);`);
      if (s.fill) lines.push(`  ctx.fill();`);
      if (s.stroke) lines.push(`  ctx.stroke();`);
      break;
    }
    case 'polygon': {
      if (!s.points || s.points.length < 2) break;
      lines.push(`  ctx.beginPath();`);
      lines.push(`  ctx.moveTo(r*${fmt(s.points[0][0])}, r*${fmt(s.points[0][1])});`);
      for (let i = 1; i < s.points.length; i++)
        lines.push(`  ctx.lineTo(r*${fmt(s.points[i][0])}, r*${fmt(s.points[i][1])});`);
      lines.push(`  ctx.closePath();`);
      if (s.fill) lines.push(`  ctx.fill();`);
      if (s.stroke) lines.push(`  ctx.stroke();`);
      break;
    }
    case 'line': {
      if (!s.points || s.points.length < 2) break;
      lines.push(`  ctx.beginPath();`);
      lines.push(`  ctx.moveTo(r*${fmt(s.points[0][0])}, r*${fmt(s.points[0][1])});`);
      for (let i = 1; i < s.points.length; i++)
        lines.push(`  ctx.lineTo(r*${fmt(s.points[i][0])}, r*${fmt(s.points[i][1])});`);
      if (s.stroke) lines.push(`  ctx.stroke();`);
      break;
    }
  }
  if ((s.opacity ?? 1) !== 1) lines.push(`  ctx.globalAlpha=1;`);
  return lines.join('\n');
}

function aeGenerateCode() {
  const shapeBlocks = AE.shapes
    .filter(s => s.visible)
    .map(s => aeShapeToCode(s))
    .filter(Boolean)
    .join('\n');
  return `case '${AE.raceId}': {\n  ctx.rotate(fa);\n${shapeBlocks}\n  eyes(); break;\n}`;
}

// ---- Canvas mouse events ----
function aeSetupCanvas() {
  const canvas = document.getElementById('ae-canvas');
  if (!canvas) return;

  let lastClickTime = 0;

  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const { lx, ly } = aeScreenToLocal(e);

    if (AE.drawMode === 'polygon') {
      const now = Date.now();
      if (now - lastClickTime < 350 && AE.drawPoints.length >= 2) {
        // Double-click: close polygon
        const newShape = {
          id: aeNewId(),
          type: 'polygon',
          label: 'Polygon ' + AE.nextId,
          points: AE.drawPoints.map(p => [...p]),
          fill: '#445566',
          stroke: '#aabbcc',
          sw: 1.5,
          opacity: 1,
          visible: true
        };
        AE.shapes.push(newShape);
        AE.selected = newShape.id;
        AE.drawMode = null;
        AE.drawPoints = [];
        document.getElementById('ae-add-polygon-btn').classList.remove('ae-active-mode');
        document.getElementById('ae-mode-hint').textContent = '';
        aeRenderLayers();
        aeRenderProps();
      } else {
        AE.drawPoints.push([lx, ly]);
      }
      lastClickTime = now;
      return;
    }

    // Freeze angle
    AE.frozenAngle = AE.angle;
    const hit = aeHitTest(lx, ly);
    if (!hit) {
      AE.selected = null;
      aeRenderLayers();
      aeRenderProps();
      return;
    }
    if (hit.id !== AE.selected) {
      AE.selected = hit.id;
      aeRenderLayers();
      aeRenderProps();
    }
    const s = AE.shapes.find(x => x.id === hit.id);
    if (!s) return;
    AE.dragging = true;
    AE.dragType = hit.type;
    AE.dragVertexIdx = hit.idx;
    AE.dragStartLx = lx;
    AE.dragStartLy = ly;
    if (s.type === 'ellipse') {
      AE.dragSnapX = s.x;
      AE.dragSnapY = s.y;
    }
    if (s.points) {
      AE.dragSnapPoints = s.points.map(p => [...p]);
    }
    e.preventDefault();
  });

  canvas.addEventListener('mousemove', e => {
    const { lx, ly } = aeScreenToLocal(e);
    if (AE.dragging) {
      const s = AE.shapes.find(x => x.id === AE.selected);
      if (!s) return;
      const dlx = lx - AE.dragStartLx;
      const dly = ly - AE.dragStartLy;
      if (AE.dragType === 'body') {
        if (s.type === 'ellipse') {
          s.x = +(AE.dragSnapX + dlx).toFixed(4);
          s.y = +(AE.dragSnapY + dly).toFixed(4);
          // Sync props panel
          const props = document.getElementById('ae-props-body');
          if (props) {
            const inputs = props.querySelectorAll('input[type="number"]');
            // x and y are first two in ellipse group
          }
        } else if (s.points && AE.dragSnapPoints) {
          for (let i = 0; i < s.points.length; i++) {
            s.points[i][0] = +(AE.dragSnapPoints[i][0] + dlx).toFixed(4);
            s.points[i][1] = +(AE.dragSnapPoints[i][1] + dly).toFixed(4);
          }
        }
      } else if (AE.dragType === 'vertex') {
        const idx = AE.dragVertexIdx;
        if (s.type === 'ellipse') {
          // Vertex handles for ellipse: adjust rx/ry/position based on handle index
          const cx = AE.dragSnapX, cy = AE.dragSnapY;
          const origHandles = [
            // 8 handles: corners and mid-edges
            // lx,ly are already in r-units
          ];
          // For ellipse, just move body on vertex drag for simplicity
          s.x = +(AE.dragSnapX + dlx).toFixed(4);
          s.y = +(AE.dragSnapY + dly).toFixed(4);
        } else if (s.points && AE.dragSnapPoints && idx >= 0 && idx < s.points.length) {
          s.points[idx][0] = +(AE.dragSnapPoints[idx][0] + dlx).toFixed(4);
          s.points[idx][1] = +(AE.dragSnapPoints[idx][1] + dly).toFixed(4);
        }
      }
      // Refresh props for live update
      aeRenderProps();
    } else {
      // Hover
      const hit = aeHitTest(lx, ly);
      const newHover = hit ? hit.id : null;
      if (newHover !== AE.hoverId) {
        AE.hoverId = newHover;
        canvas.style.cursor = newHover ? 'pointer' : (AE.drawMode ? 'crosshair' : 'default');
      }
    }
  });

  canvas.addEventListener('mouseup', () => {
    if (AE.dragging) {
      AE.dragging = false;
      AE.dragType = null;
      AE.dragVertexIdx = -1;
      AE.dragSnapPoints = null;
      aeRenderProps();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    AE.hoverId = null;
    if (AE.dragging) {
      AE.dragging = false;
      AE.dragType = null;
    }
  });
}

// ---- Wire up UI ----
(function aeInit() {
  document.addEventListener('DOMContentLoaded', () => {
    // Open button
    const openBtn = document.getElementById('assetEditorBtn');
    if (openBtn) openBtn.addEventListener('click', () => aeOpen('gnome'));

    // Close button
    const closeBtn = document.getElementById('ae-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', aeClose);

    // Race selector
    const raceSel = document.getElementById('ae-race-select');
    if (raceSel) {
      raceSel.addEventListener('change', () => aeLoadRace(raceSel.value));
    }

    // Spin checkbox
    const spinCb = document.getElementById('ae-spin-cb');
    if (spinCb) spinCb.addEventListener('change', () => { AE.spinning = spinCb.checked; });

    // Add shape buttons
    const addEllipseBtn = document.getElementById('ae-add-ellipse-btn');
    if (addEllipseBtn) addEllipseBtn.addEventListener('click', () => {
      const s = {
        id: aeNewId(), type: 'ellipse', label: 'Ellipse ' + AE.nextId,
        x: 0, y: -1.0, rx: 0.5, ry: 0.2, rot: 0,
        fill: '#445566', stroke: '#aabbcc', sw: 1.5, opacity: 1, visible: true
      };
      AE.shapes.push(s);
      AE.selected = s.id;
      AE.drawMode = null;
      AE.drawPoints = [];
      document.getElementById('ae-add-polygon-btn').classList.remove('ae-active-mode');
      document.getElementById('ae-mode-hint').textContent = '';
      aeRenderLayers();
      aeRenderProps();
    });

    const addPolygonBtn = document.getElementById('ae-add-polygon-btn');
    if (addPolygonBtn) addPolygonBtn.addEventListener('click', () => {
      if (AE.drawMode === 'polygon') {
        // Cancel
        AE.drawMode = null;
        AE.drawPoints = [];
        addPolygonBtn.classList.remove('ae-active-mode');
        document.getElementById('ae-mode-hint').textContent = '';
      } else {
        AE.drawMode = 'polygon';
        AE.drawPoints = [];
        addPolygonBtn.classList.add('ae-active-mode');
        document.getElementById('ae-mode-hint').textContent = 'Click to add vertices • Double-click to finish';
      }
    });

    const addLineBtn = document.getElementById('ae-add-line-btn');
    if (addLineBtn) addLineBtn.addEventListener('click', () => {
      const s = {
        id: aeNewId(), type: 'line', label: 'Line ' + AE.nextId,
        points: [[-0.5, 0], [0.5, 0]],
        fill: null, stroke: '#aabbcc', sw: 1.5, opacity: 1, visible: true
      };
      AE.shapes.push(s);
      AE.selected = s.id;
      AE.drawMode = null;
      AE.drawPoints = [];
      document.getElementById('ae-add-polygon-btn').classList.remove('ae-active-mode');
      document.getElementById('ae-mode-hint').textContent = '';
      aeRenderLayers();
      aeRenderProps();
    });

    // Clear all
    const clearBtn = document.getElementById('ae-clear-btn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      if (!confirm('Clear all shapes for this race?')) return;
      AE.shapes = [];
      AE.selected = null;
      AE.drawMode = null;
      AE.drawPoints = [];
      document.getElementById('ae-add-polygon-btn').classList.remove('ae-active-mode');
      document.getElementById('ae-mode-hint').textContent = '';
      aeRenderLayers();
      aeRenderProps();
    });

    // Save-indicator helper — call whenever race or save state changes
    function aeUpdateSaveIndicator() {
      const hasSave = !!(window._raceAssetOverrides && Object.prototype.hasOwnProperty.call(window._raceAssetOverrides, AE.raceId));
      const btn = document.getElementById('ae-save-btn');
      const ind = document.getElementById('ae-save-indicator');
      if (btn) btn.classList.toggle('has-save', hasSave);
      if (ind) ind.classList.toggle('visible', hasSave);
    }

    // Save — persist to localStorage and apply immediately in drawRaceDecoration
    const saveBtn = document.getElementById('ae-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      const raceId = AE.raceId;
      const snapshots = AE.shapes.map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
      window._raceAssetOverrides = window._raceAssetOverrides || {};
      window._raceAssetOverrides[raceId] = snapshots;
      localStorage.setItem('raceAssets', JSON.stringify(window._raceAssetOverrides));
      saveBtn.textContent = '✓ Saved!';
      setTimeout(() => { saveBtn.textContent = '💾 Save'; }, 1500);
      aeUpdateSaveIndicator();
    });

    // Default — restore hardcoded defaults for current race
    const defaultBtn = document.getElementById('ae-default-btn');
    if (defaultBtn) defaultBtn.addEventListener('click', () => {
      const raceId = AE.raceId;
      const defs = AE_RACE_DEFAULTS[raceId];
      if (defs) {
        AE.shapes = defs.map(s => Object.assign({ id: aeNewId() }, s,
          s.points ? { points: s.points.map(p => [...p]) } : {}));
      } else {
        AE.shapes = [];
      }
      AE.selected = null;
      // Only resets in-memory view — does NOT touch localStorage.
      // To persist, click 💾 Save after resetting.
      window.AE_DATA[raceId] = AE.shapes.map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
      aeRenderLayers();
      aeRenderProps();
      defaultBtn.textContent = '✓ Reset!';
      setTimeout(() => { defaultBtn.textContent = '⚡ Default'; }, 1500);
      // indicator unchanged — Default doesn't touch save state
    });

    // Remove Save — deletes localStorage override, restores built-in animated switch case
    const removeSaveBtn = document.getElementById('ae-remove-save-btn');
    if (removeSaveBtn) removeSaveBtn.addEventListener('click', () => {
      const raceId = AE.raceId;
      if (window._raceAssetOverrides) delete window._raceAssetOverrides[raceId];
      localStorage.setItem('raceAssets', JSON.stringify(window._raceAssetOverrides || {}));
      aeUpdateSaveIndicator();
    });

    // Export (kept for reference, button removed from UI)
    const exportBtn = document.getElementById('ae-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', () => {
      const code = aeGenerateCode();
      document.getElementById('ae-export-code').value = code;
      document.getElementById('ae-export-modal').classList.add('open');
    });

    // Copy
    const copyBtn = document.getElementById('ae-copy-btn');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      const ta = document.getElementById('ae-export-code');
      ta.select();
      try { document.execCommand('copy'); } catch(e) {}
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1500);
    });

    // Export close
    const exportClose = document.getElementById('ae-export-close');
    if (exportClose) exportClose.addEventListener('click', () => {
      document.getElementById('ae-export-modal').classList.remove('open');
    });
    const exportModal = document.getElementById('ae-export-modal');
    if (exportModal) exportModal.addEventListener('click', e => {
      if (e.target === exportModal) exportModal.classList.remove('open');
    });

    // Close editor on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (document.getElementById('ae-export-modal').classList.contains('open')) {
          document.getElementById('ae-export-modal').classList.remove('open');
        } else if (document.getElementById('screen-asset-editor').classList.contains('ae-open')) {
          if (AE.drawMode) {
            AE.drawMode = null;
            AE.drawPoints = [];
            const pb = document.getElementById('ae-add-polygon-btn');
            if (pb) pb.classList.remove('ae-active-mode');
            const hint = document.getElementById('ae-mode-hint');
            if (hint) hint.textContent = '';
          } else {
            aeClose();
          }
        }
      }
    });

    aeSetupCanvas();
  });
})();

// Load roster on start
renderRoster();

// ============================================================
// AUDIO (Web Audio API — procedural, no files needed)
// ============================================================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;

function getACtx() {
  if (!actx) actx = new AudioCtx();
  return actx;
}

function playTone(freq, type, duration, vol, decay) {
  try {
    const ctx = getACtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * decay, ctx.currentTime + duration);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

function sfxParry()  { playTone(880, 'square', 0.12, 0.25, 0.5); setTimeout(()=>playTone(660,'square',0.1,0.15,0.7),30); }
function sfxHit()    { playTone(200, 'sawtooth', 0.15, 0.3, 0.3); }
function sfxShoot()  { playTone(440, 'sine', 0.08, 0.1, 1.5); }
function sfxDeath()  { playTone(100, 'sawtooth', 0.4, 0.4, 0.2); setTimeout(()=>playTone(60,'square',0.3,0.3,0.5),100); }
function sfxScale()  { playTone(1100, 'sine', 0.15, 0.15, 0.8); }

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

// ============================================================
// WEAPON DEFINITIONS
// ============================================================
const WEAPON_DEFS = [
  {
    id: 'fists', name: 'Fists', icon: '🥊', color: '#ff9944',
    desc: 'Super fast',
    aiType: 'melee',
    baseLength: 22, baseSpeed: 0.22, baseDamage: 2, baseKnockback: 2,
    hitRadius: 11, attackCooldown: 16,
    scaling: { type: 'cooldown', amount: -0.5, min: 8 },
    scalingLabel: 'Speed',
    draw(ctx, ball) {
      const w = ball.weapon;
      const hl = ball.radius + this.baseLength;
      for (let s = 0; s <= 1; s++) {
        const a = w.angle + s * Math.PI;
        const r = hl * (s === 0 ? 1 : 0.72);
        const px = ball.x + Math.cos(a) * r;
        const py = ball.y + Math.sin(a) * r;
        const rad = s === 0 ? 11 : 9;
        // glow on scale
        if (w.hits > 0) {
          ctx.save();
          ctx.shadowColor = '#ff9944';
          ctx.shadowBlur = 6 + w.hits;
          ctx.restore();
        }
        ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI*2);
        ctx.fillStyle = '#ff9944'; ctx.fill();
        ctx.strokeStyle = '#330'; ctx.lineWidth = 2; ctx.stroke();
        // knuckle lines
        ctx.strokeStyle = '#cc6622'; ctx.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) {
          const kx = px + Math.cos(a + Math.PI/2) * (k-1) * 3;
          const ky = py + Math.sin(a + Math.PI/2) * (k-1) * 3;
          ctx.beginPath(); ctx.arc(kx, ky, 2, 0, Math.PI*2); ctx.stroke();
        }
      }
    },
    getHitPoints(ball) {
      // Full blade: from base (ball.radius) to tip (ball.radius + baseLength)
      const w = ball.weapon;
      const bladeStart = ball.radius;
      const bladeEnd   = ball.radius + this.baseLength;
      const N = 5; // points along blade
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const d = bladeStart + (i / N) * (bladeEnd - bladeStart);
        pts.push({ x: ball.x + Math.cos(w.angle)*d, y: ball.y + Math.sin(w.angle)*d, r: 9 });
      }
      return pts;
    },
    onHit(w) {
      w.hits++;
      const cd = Math.max(this.scaling.min, this.attackCooldown + w.hits * this.scaling.amount);
      w.attackCooldown = cd;
      sfxScale();
    }
  },
  {
    id: 'sword', name: 'Sword', icon: '⚔️', color: '#aaddff',
    desc: '+Damage/hit',
    aiType: 'melee',
    baseLength: 50, baseSpeed: 0.055, baseDamage: 1, baseKnockback: 4,
    hitRadius: 8, attackCooldown: 28,
    scaling: { type: 'damage', amount: 1 },
    scalingLabel: 'Damage',
    draw(ctx, ball) {
      const w = ball.weapon;
      const len = ball.radius + this.baseLength;
      const ex = ball.x + Math.cos(w.angle) * len;
      const ey = ball.y + Math.sin(w.angle) * len;
      const bx = ball.x + Math.cos(w.angle) * ball.radius;
      const by = ball.y + Math.sin(w.angle) * ball.radius;
      // glow on scale
      if (w.hits > 0) {
        ctx.save();
        ctx.strokeStyle = `rgba(170,220,255,${Math.min(0.6, w.hits*0.1)})`;
        ctx.lineWidth = 10 + w.hits;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#aaddff';
        ctx.shadowBlur = 8 + w.hits * 2;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.restore();
      }
      // blade
      ctx.save();
      ctx.strokeStyle = '#ddeeff';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // edge highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      const perp = w.angle + Math.PI/2;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(perp)*1.5, by + Math.sin(perp)*1.5);
      ctx.lineTo(ex + Math.cos(perp)*1.5, ey + Math.sin(perp)*1.5);
      ctx.stroke();
      // guard
      const gx = ball.x + Math.cos(w.angle) * (ball.radius + 6);
      const gy = ball.y + Math.sin(w.angle) * (ball.radius + 6);
      ctx.strokeStyle = '#aa8833';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(gx + Math.cos(perp)*12, gy + Math.sin(perp)*12);
      ctx.lineTo(gx - Math.cos(perp)*12, gy - Math.sin(perp)*12);
      ctx.stroke();
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon, len = ball.radius + this.baseLength;
      const mid = ball.radius + this.baseLength * 0.65;
      return [
        { x: ball.x + Math.cos(w.angle)*len,  y: ball.y + Math.sin(w.angle)*len,  r: 8 },
        { x: ball.x + Math.cos(w.angle)*mid, y: ball.y + Math.sin(w.angle)*mid, r: 6 }
      ];
    },
    onHit(w) { w.hits++; w.bonusDamage = (w.bonusDamage||0) + this.scaling.amount; sfxScale(); }
  },
  {
    id: 'dagger', name: 'Dagger', icon: '🗡️', color: '#ffcc44',
    desc: '+Spin/hit',
    aiType: 'melee',
    baseLength: 28, baseSpeed: 0.16, baseDamage: 1, baseKnockback: 2,
    hitRadius: 8, attackCooldown: 18,
    scaling: { type: 'speed', amount: 0.012, max: 0.55 },
    scalingLabel: 'Spin',
    draw(ctx, ball) {
      const w = ball.weapon;
      const len = ball.radius + this.baseLength;
      const ex = ball.x + Math.cos(w.angle) * len;
      const ey = ball.y + Math.sin(w.angle) * len;
      const bx = ball.x + Math.cos(w.angle) * ball.radius;
      const by = ball.y + Math.sin(w.angle) * ball.radius;
      if (w.hits > 0) {
        ctx.save();
        ctx.shadowColor = '#ffcc44';
        ctx.shadowBlur = 5 + w.hits * 2;
        ctx.restore();
      }
      ctx.save();
      // blade
      ctx.strokeStyle = '#ffe077';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // tip triangle
      const tipA = w.angle;
      ctx.fillStyle = '#ffee99';
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(tipA + Math.PI*0.85)*6, ey + Math.sin(tipA + Math.PI*0.85)*6);
      ctx.lineTo(ex + Math.cos(tipA - Math.PI*0.85)*6, ey + Math.sin(tipA - Math.PI*0.85)*6);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon, len = ball.radius + this.baseLength;
      return [{ x: ball.x + Math.cos(w.angle)*len, y: ball.y + Math.sin(w.angle)*len, r: 8 }];
    },
    onHit(w) {
      w.hits++;
      w.spinBonus = Math.min(this.scaling.max, (w.spinBonus||0) + this.scaling.amount);
      sfxScale();
    }
  },
  {
    id: 'spear', name: 'Spear', icon: '🔱', color: '#88ccff',
    desc: '+Length+Dmg/hit',
    aiType: 'melee',
    baseLength: 65, baseSpeed: 0.032, baseDamage: 1, baseKnockback: 5,
    hitRadius: 8, attackCooldown: 38,
    scaling: { type: 'length_damage', lengthAmt: 4, damageAmt: 0.5 },
    scalingLabel: 'Length+Dmg',
    draw(ctx, ball) {
      const w = ball.weapon;
      const bonusLen = (w.bonusLength||0);
      const len = ball.radius + this.baseLength + bonusLen;
      const ex = ball.x + Math.cos(w.angle) * len;
      const ey = ball.y + Math.sin(w.angle) * len;
      const bx = ball.x + Math.cos(w.angle) * (ball.radius - 5);
      const by = ball.y + Math.sin(w.angle) * (ball.radius - 5);
      const tailx = ball.x - Math.cos(w.angle) * (ball.radius + 10);
      const taily = ball.y - Math.sin(w.angle) * (ball.radius + 10);
      if (bonusLen > 0) {
        ctx.save();
        ctx.shadowColor = '#88ccff';
        ctx.shadowBlur = 4 + bonusLen * 0.3;
        ctx.restore();
      }
      ctx.save();
      // shaft
      ctx.strokeStyle = '#cc9944';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tailx, taily); ctx.lineTo(bx, by); ctx.stroke();
      // blade
      ctx.strokeStyle = '#aaddff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // tip
      ctx.fillStyle = '#ddeeff';
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(w.angle + Math.PI*0.8)*10, ey + Math.sin(w.angle + Math.PI*0.8)*10);
      ctx.lineTo(ex + Math.cos(w.angle - Math.PI*0.8)*10, ey + Math.sin(w.angle - Math.PI*0.8)*10);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    getHitPoints(ball) {
      // Full shaft: from base (ball.radius-5) to tip — grows with bonusLength
      const w = ball.weapon;
      const shaftStart = ball.radius - 5;
      const shaftEnd   = ball.radius + this.baseLength + (w.bonusLength || 0);
      const shaftLen   = shaftEnd - shaftStart;
      const N = Math.max(4, Math.ceil(shaftLen / 13)); // dày hơn khi scale dài ra
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const d = shaftStart + (i / N) * shaftLen;
        pts.push({ x: ball.x + Math.cos(w.angle)*d, y: ball.y + Math.sin(w.angle)*d, r: 7 });
      }
      return pts;
    },
    onHit(w) {
      w.hits++;
      w.bonusLength  = (w.bonusLength||0) + this.scaling.lengthAmt;
      w.bonusDamage  = (w.bonusDamage||0) + this.scaling.damageAmt;
      sfxScale();
    }
  },
  {
    id: 'bow', name: 'Bow', icon: '🏹', color: '#88ff88',
    desc: '+Arrows/hit',
    aiType: 'ranged',
    baseLength: 38, baseSpeed: 0.04, baseDamage: 0, baseKnockback: 1,
    hitRadius: 8, attackCooldown: 10,
    arrowDamage: 1, arrowSpeed: 7.5, fireInterval: 130,
    scaling: { type: 'arrows', amount: 1, max: Infinity },
    scalingLabel: 'Arrows',
    draw(ctx, ball) {
      const w = ball.weapon;
      const len = ball.radius + this.baseLength;
      const cx = ball.x + Math.cos(w.angle) * (ball.radius + 6);
      const cy = ball.y + Math.sin(w.angle) * (ball.radius + 6);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(w.angle);
      // bow arc
      ctx.strokeStyle = '#886633';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 22, -Math.PI*0.55, Math.PI*0.55);
      ctx.stroke();
      // string
      const stringTautness = w.fireTimer > 0 ? Math.min(8, w.fireTimer * 0.06) : 0;
      ctx.strokeStyle = '#cccc88';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(22*Math.cos(-Math.PI*0.55), 22*Math.sin(-Math.PI*0.55));
      ctx.lineTo(-stringTautness, 0);
      ctx.lineTo(22*Math.cos(Math.PI*0.55), 22*Math.sin(Math.PI*0.55));
      ctx.stroke();
      // arrow nocked
      if (w.fireTimer < w.fireInterval) {
        ctx.strokeStyle = '#cc9944';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-stringTautness, 0);
        ctx.lineTo(22, 0);
        ctx.stroke();
        ctx.fillStyle = '#ccddaa';
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(16, -4);
        ctx.lineTo(16, 4);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },
    getHitPoints(ball) {
      // Bow body itself (for parry target)
      const w = ball.weapon;
      const cx = ball.x + Math.cos(w.angle) * (ball.radius + 6);
      const cy = ball.y + Math.sin(w.angle) * (ball.radius + 6);
      return [{ x: cx, y: cy, r: 16 }];
    },
    onHit(w) {
      w.hits++;
      w.arrowCount = Math.min((w.arrowCount||1) + this.scaling.amount, this.scaling.max);
      w.arrowSpeedBonus = (w.arrowSpeedBonus||0) + 0.3; // +0.3 arrow speed per hit
      sfxScale();
    }
  },
  {
    id: 'scythe', name: 'Scythe', icon: '🌙', color: '#cc44ff',
    desc: 'Super: dual blades',
    aiType: 'melee',
    baseLength: 48, baseSpeed: 0.045, baseDamage: 1, baseKnockback: 5,
    hitRadius: 18, attackCooldown: 34,
    scaling: { type: 'dual', threshold: 5 },
    scalingLabel: 'Hits→Dual',
    draw(ctx, ball) {
      const w = ball.weapon;
      this._drawBlade(ctx, ball, w.angle, w.hits >= 5);
      if (w.hits >= 5) {
        this._drawBlade(ctx, ball, w.angle + Math.PI, false);
      }
    },
    _drawBlade(ctx, ball, angle, glow) {
      const len = ball.radius + this.baseLength;
      const cx = ball.x + Math.cos(angle) * (ball.radius + 10);
      const cy = ball.y + Math.sin(angle) * (ball.radius + 10);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      if (glow) {
        ctx.shadowColor = '#cc44ff';
        ctx.shadowBlur = 15;
      }
      // shaft
      ctx.strokeStyle = '#553366';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.lineTo(len - ball.radius - 10, 0);
      ctx.stroke();
      // curved blade arc
      ctx.strokeStyle = '#dd77ff';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(28, 0, 22, -Math.PI*0.8, Math.PI*0.3);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(28, -1, 21, -Math.PI*0.75, Math.PI*0.2);
      ctx.stroke();
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon;
      const len = ball.radius + this.baseLength;
      const pts = [];
      // primary blade arc sweep points
      for (let i = -2; i <= 2; i++) {
        const a = w.angle + i * 0.25;
        pts.push({ x: ball.x + Math.cos(a)*(len-8), y: ball.y + Math.sin(a)*(len-8), r: 16 });
      }
      // dual blade
      if (w.hits >= 5) {
        for (let i = -2; i <= 2; i++) {
          const a = w.angle + Math.PI + i * 0.25;
          pts.push({ x: ball.x + Math.cos(a)*(len-8), y: ball.y + Math.sin(a)*(len-8), r: 16 });
        }
      }
      return pts;
    },
    onHit(w) { w.hits++; if (w.hits === 5) sfxScale(); }
  },
  {
    id: 'hammer', name: 'Hammer', icon: '🔨', color: '#ff6633',
    desc: '+Knockback/hit',
    aiType: 'melee',
    baseLength: 38, baseSpeed: 0.028, baseDamage: 1, baseKnockback: 12,
    hitRadius: 14, attackCooldown: 48,
    scaling: { type: 'knockback', amount: 0.8 },
    scalingLabel: 'Knockback',
    draw(ctx, ball) {
      const w = ball.weapon;
      const len = ball.radius + this.baseLength;
      const ex = ball.x + Math.cos(w.angle) * len;
      const ey = ball.y + Math.sin(w.angle) * len;
      const bx = ball.x + Math.cos(w.angle) * (ball.radius + 4);
      const by = ball.y + Math.sin(w.angle) * (ball.radius + 4);
      const kb = (w.bonusKnockback||0);
      if (kb > 0) {
        ctx.save();
        ctx.shadowColor = '#ff6633';
        ctx.shadowBlur = 6 + kb * 1.5;
        ctx.restore();
      }
      ctx.save();
      // handle
      ctx.strokeStyle = '#886633';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // head
      ctx.translate(ex, ey);
      ctx.rotate(w.angle);
      const hw = 14 + Math.min(kb * 0.5, 8);
      const hh = 20 + Math.min(kb, 10);
      ctx.fillStyle = '#cc4422';
      ctx.strokeStyle = '#882211';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-hw/2, -hh/2, hw, hh, 3);
      ctx.fill(); ctx.stroke();
      // shine
      ctx.fillStyle = 'rgba(255,150,100,0.4)';
      ctx.beginPath();
      ctx.roundRect(-hw/2+2, -hh/2+2, hw/2, hh-4, 2);
      ctx.fill();
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon;
      const len = ball.radius + this.baseLength;
      return [{ x: ball.x + Math.cos(w.angle)*len, y: ball.y + Math.sin(w.angle)*len, r: 14 }];
    },
    onHit(w) {
      w.hits++;
      w.bonusKnockback = (w.bonusKnockback||0) + this.scaling.amount;
      sfxScale();
    }
  },
  {
    id: 'shuriken', name: 'Shuriken', icon: '⭐', color: '#44eebb',
    desc: '+Stars/hit',
    aiType: 'ranged',
    baseLength: 30, baseSpeed: 0.04, baseDamage: 0, baseKnockback: 1,
    hitRadius: 10, attackCooldown: 10,
    shurikenDamage: 1, shurikenSpeed: 3, fireInterval: 120, maxBounces: 2,
    scaling: { type: 'count', amount: 1, max: Infinity },
    scalingLabel: 'Count',
    draw(ctx, ball) {
      const w = ball.weapon;
      const len = ball.radius + this.baseLength;
      const cx = ball.x + Math.cos(w.angle) * (ball.radius + 4);
      const cy = ball.y + Math.sin(w.angle) * (ball.radius + 4);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(w.angle + (Date.now() * 0.01));
      ctx.strokeStyle = '#44eebb';
      ctx.fillStyle = '#003322';
      ctx.lineWidth = 2;
      // 4-pointed star
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a)*16, Math.sin(a)*16);
        ctx.lineTo(Math.cos(a + Math.PI*0.25)*7, Math.sin(a + Math.PI*0.25)*7);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon;
      const cx = ball.x + Math.cos(w.angle) * (ball.radius + 4);
      const cy = ball.y + Math.sin(w.angle) * (ball.radius + 4);
      return [{ x: cx, y: cy, r: 14 }];
    },
    onHit(w) {
      w.hits++;
      w.shurikenHitBuffer = (w.shurikenHitBuffer || 0) + 1;
      if (w.shurikenHitBuffer >= 2) {
        w.shurikenHitBuffer = 0;
        w.shurikenCount = Math.min((w.shurikenCount||1) + this.scaling.amount, this.scaling.max);
        sfxScale();
      }
    }
  }
];

const WEAPON_MAP = {};
WEAPON_DEFS.forEach(d => WEAPON_MAP[d.id] = d);

// ============================================================
// PROJECTILE
// ============================================================
class Projectile {
  constructor(x, y, vx, vy, owner, type, damage) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.owner = owner;   // ball reference
    this.type = type;     // 'arrow' | 'shuriken'
    this.damage = damage;
    this.alive = true;
    this.bounces = 0;
    this.maxBounces = type === 'shuriken' ? 2 : 0;
    this.immuneFrames = 5;  // brief immunity so it doesn't hit owner instantly
    this.angle = Math.atan2(vy, vx);
    this.r = type === 'arrow' ? 5 : 8;
  }

  update(arena) {
    if (!this.alive) return;
    this.x += this.vx;
    this.y += this.vy;
    if (this.immuneFrames > 0) this.immuneFrames--;

    // Arena collision
    const hit = checkArenaWall(this.x, this.y, this.r, arena);
    if (hit) {
      if (this.bounces < this.maxBounces) {
        if (hit.nx !== 0) this.vx = -this.vx;
        if (hit.ny !== 0) this.vy = -this.vy;
        this.bounces++;
      } else {
        this.alive = false;
      }
    }
    this.angle = Math.atan2(this.vy, this.vx);
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    if (this.type === 'arrow') {
      ctx.fillStyle = '#cc9944';
      ctx.strokeStyle = '#886622';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-12, -2);
      ctx.lineTo(-12, 2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // fletching
      ctx.fillStyle = '#88bb44';
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-14, -4);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-14, 4);
      ctx.closePath(); ctx.fill();
    } else {
      // shuriken
      ctx.strokeStyle = '#44eebb';
      ctx.fillStyle = '#003322';
      ctx.lineWidth = 2;
      const spin = Date.now() * 0.015;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + spin;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a)*8, Math.sin(a)*8);
        ctx.lineTo(Math.cos(a+Math.PI*0.25)*4, Math.sin(a+Math.PI*0.25)*4);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// ============================================================
// PARTICLES
// ============================================================
const particles = [];

function spawnSparks(x, y, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 4;
    particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      life: 20 + Math.random()*15, maxLife: 35,
      color: `hsl(${40+Math.random()*20},100%,${60+Math.random()*30}%)`,
      r: 2 + Math.random()*2, type: 'spark' });
  }
}

function spawnBlood(x, y, count, dir) {
  for (let i = 0; i < count; i++) {
    const a = dir + (Math.random()-0.5) * Math.PI;
    const sp = 1.5 + Math.random() * 3;
    particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      life: 18 + Math.random()*10, maxLife: 28,
      color: `hsl(0,90%,${40+Math.random()*20}%)`,
      r: 2 + Math.random()*2, type: 'blood' });
  }
}

function spawnDeathExplosion(x, y, color) {
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 6;
    particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      life: 35 + Math.random()*25, maxLife: 60,
      color: i < 15 ? color : `hsl(${Math.random()*360},80%,60%)`,
      r: 3 + Math.random()*5, type: 'death' });
  }
}

// Big centre announcement (Speed Floor, Rage Mode, etc.)
const bigAnnouncements = [];
function spawnBigAnnouncement(text, color) {
  bigAnnouncements.push({ text, color, life: 180, maxLife: 180 });
  // also SFX
  playTone(text.includes('RAGE') ? 220 : 440, 'sawtooth', 0.35, 0.08, 0.4);
}
function updateDrawBigAnnouncements(ctx) {
  for (let i = bigAnnouncements.length - 1; i >= 0; i--) {
    const a = bigAnnouncements[i];
    a.life--;
    if (a.life <= 0) { bigAnnouncements.splice(i, 1); continue; }
    const progress = 1 - a.life / a.maxLife;
    const alpha    = a.life < 40 ? a.life / 40 : 1;
    const scale    = 0.6 + 0.4 * Math.min(1, progress * 4);
    const y        = CH / 2 - 40 - progress * 30;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.floor(38 * scale)}px 'Segoe UI', sans-serif`;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(a.text, CW / 2 + 2, y + 2);
    // glow
    ctx.shadowColor = a.color;
    ctx.shadowBlur  = 18;
    ctx.fillStyle   = a.color;
    ctx.fillText(a.text, CW / 2, y);
    ctx.restore();
  }
}

// ── Weapon scale numeric value (for chart) ──
function getBallScaleVal(ball) {
  const def = ball.weaponDef, w = ball.weapon;
  if (!def || !w) return 0;
  switch (def.id) {
    case 'fists':    return +(w.attackCooldown ?? def.attackCooldown);
    case 'sword':    return +(w.bonusDamage    || 0);
    case 'dagger':   return +((w.spinBonus     || 0) * 100).toFixed(3); // ×100 for readability
    case 'spear':    return +(w.bonusDamage    || 0);
    case 'bow':      return +(w.arrowCount     || 1);
    case 'scythe':   return +(w.hits           || 0);
    case 'hammer':   return +(w.bonusKnockback || 0);
    case 'shuriken': return +(w.shurikenCount  || 1);
    default:         return 0;
  }
}
function getBallScaleUnit(ball) {
  const def = ball.weaponDef;
  if (!def) return '';
  switch (def.id) {
    case 'fists':    return 'CD';
    case 'sword':    return '+dmg';
    case 'dagger':   return 'spin×100';
    case 'spear':    return '+dmg';
    case 'bow':      return 'arrows';
    case 'scythe':   return 'hits(→5)';
    case 'hammer':   return '+kb';
    case 'shuriken': return 'stars';
    default:         return '';
  }
}

// ── Stats Log (per-second charts) ──
let _activeChart = 'speed';

function drawStatsChart(metric) {
  const canvas = document.getElementById('stats-chart-canvas');
  const legendEl = document.getElementById('stats-chart-legend');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 28, right: 18, bottom: 34, left: 52 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#080816';
  ctx.fillRect(0, 0, W, H);

  const data = state.statsLog ?? [];
  if (data.length < 2) {
    ctx.fillStyle = '#445'; ctx.textAlign = 'center';
    ctx.font = '13px sans-serif';
    ctx.fillText('Not enough data', W/2, H/2);
    return;
  }

  // For 'scale' metric, read scaleVal field instead of metric key
  const metricKey = metric === 'scale' ? 'scaleVal' : metric;

  // Collect all values to find max
  let maxVal = 0;
  data.forEach(s => s.balls.forEach(b => { maxVal = Math.max(maxVal, b[metricKey] ?? 0); }));
  maxVal = (maxVal * 1.15) || 1;

  const nSnaps = data.length;
  const xScale = cW / Math.max(1, nSnaps - 1);
  const yScale = cH / maxVal;

  // Grid + Y labels
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + cH - (i / gridLines) * cH;
    const val = (maxVal * i / gridLines);
    ctx.strokeStyle = '#12122a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
    ctx.fillStyle = '#445'; ctx.font = '9px monospace'; ctx.textAlign = 'right';
    ctx.fillText(val >= 1 ? val.toFixed(1) : val.toFixed(3), pad.left - 4, y + 3);
  }

  // X axis + labels
  const tickEvery = Math.max(1, Math.ceil(nSnaps / 10));
  ctx.fillStyle = '#445'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
  data.forEach((s, i) => {
    if (i % tickEvery === 0 || i === nSnaps - 1) {
      const x = pad.left + i * xScale;
      const mm = String(Math.floor(s.second / 60)).padStart(2,'0');
      const ss = String(s.second % 60).padStart(2,'0');
      ctx.fillText(`${mm}:${ss}`, x, H - 4);
      ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + cH); ctx.stroke();
    }
  });

  // Chart title
  const titles = { speed: 'Ball Speed (units/frame)', spin: 'Spin Speed (rad/frame)', dmg: 'Damage Dealt / second', scale: 'Weapon Scale Progress' };
  ctx.fillStyle = '#667'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(titles[metric] ?? metric, W/2, 16);

  // Lines per ball
  const nBalls = data[0]?.balls?.length ?? 0;
  for (let bi = 0; bi < nBalls; bi++) {
    const col = data[0].balls[bi]?.color ?? '#fff';
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.shadowColor = col; ctx.shadowBlur = 4;
    ctx.beginPath();
    let started = false;
    data.forEach((s, i) => {
      const val = s.balls[bi]?.[metricKey] ?? 0;
      const x = pad.left + i * xScale;
      const y = pad.top + cH - val * yScale;
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw dots at each data point
    data.forEach((s, i) => {
      const val = s.balls[bi]?.[metricKey] ?? 0;
      const x = pad.left + i * xScale;
      const y = pad.top + cH - val * yScale;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2); ctx.fill();
    });
  }

  // Axes
  ctx.strokeStyle = '#2a2a4a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + cH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top + cH); ctx.lineTo(pad.left + cW, pad.top + cH); ctx.stroke();

  // Legend
  if (legendEl) {
    legendEl.innerHTML = '';
    for (let bi = 0; bi < nBalls; bi++) {
      const b = data[0].balls[bi];
      if (!b) continue;
      const item = document.createElement('div');
      item.className = 'sc-legend-item';
      const unitSuffix = (metric === 'scale' && b.scaleUnit) ? ` <span style="color:#445">(${b.scaleUnit})</span>` : '';
      item.innerHTML = `<div class="sc-legend-dot" style="background:${b.color}"></div><span>${b.name}${unitSuffix}</span>`;
      legendEl.appendChild(item);
    }
  }
}

function showStatsModal() {
  const modal = document.getElementById('stats-log-modal');
  if (!modal) return;
  modal.classList.add('open');
  _activeChart = 'speed';
  document.querySelectorAll('.sc-tab').forEach(t => t.classList.toggle('sel', t.dataset.chart === _activeChart));
  setTimeout(() => drawStatsChart(_activeChart), 30);
}

// ── Battle Log System ──
function getBallLabel(ball) {
  return ball?.charName ?? ball?.weaponDef?.name ?? 'Unknown';
}

function addBattleLog(type, data) {
  if (!state.battleLog) state.battleLog = [];
  const secs = state.matchTime / 60;
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(Math.floor(secs % 60)).padStart(2, '0');
  state.battleLog.push({ time: `${mm}:${ss}`, type, ...data });
  updateLiveLog();
}

function getBlogText(e) {
  const a = `<b style="color:${e.aColor ?? '#aaa'}">${e.attacker ?? '?'}</b>`;
  const d = `<b style="color:${e.dColor ?? '#aaa'}">${e.defender ?? '?'}</b>`;
  if (e.type === 'hit')
    return `${a} → ${d} <span style="color:#ff8866">-${(+e.damage).toFixed(1)}</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'crit')
    return `${a} → ${d} <span style="color:#ffcc00">CRIT -${(+e.damage).toFixed(1)}</span> <span style="color:#888">(${(+e.baseDmg).toFixed(1)}×${e.critMult})</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'evade')
    return `${a} → ${d} <span style="color:#44ffaa">EVADE</span>`;
  if (e.type === 'parry')
    return `${a} ⚔ ${d} <span style="color:#88aaff">parry</span>`;
  if (e.type === 'parry_fists')
    return `${a} <span style="color:#ff8844">(Fists) parried — took -${(+e.damage).toFixed(1)}</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'proj')
    return `${a} → ${d} <span style="color:#dd88ff">-${(+e.damage).toFixed(1)}</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'proj_crit')
    return `${a} → ${d} <span style="color:#ffcc00">CRIT -${(+e.damage).toFixed(1)}</span> <span style="color:#888">(${(+e.baseDmg).toFixed(1)}×${e.critMult})</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'proj_evade')
    return `${a} → ${d} <span style="color:#44ffaa">EVADE</span>`;
  return '';
}

function updateLiveLog() {
  const el = document.getElementById('live-log-entries');
  if (!el) return;
  const log = state.battleLog ?? [];
  const recent = log.slice(-8); // show last 8 entries
  el.innerHTML = recent.map(e =>
    `<div class="log-line type-${e.type}"><span class="log-time">${e.time}</span>${getBlogText(e)}</div>`
  ).join('');
}

function showBattleLogModal() {
  const modal = document.getElementById('battle-log-modal');
  const scroll = document.getElementById('battle-log-scroll');
  if (!modal || !scroll) return;
  const log = state.battleLog ?? [];
  if (log.length === 0) {
    scroll.innerHTML = '<div style="color:#445;padding:12px">No events recorded.</div>';
  } else {
    scroll.innerHTML = log.map(e =>
      `<div class="blog-line type-${e.type}">
        <span class="blog-time">${e.time}</span>
        <span class="blog-text">${getBlogText(e)}</span>
      </div>`
    ).join('');
  }
  modal.classList.add('open');
  // Scroll to bottom
  setTimeout(() => { scroll.scrollTop = scroll.scrollHeight; }, 50);
}

function spawnDamageNumber(x, y, num, color) {
  const text = typeof num === 'string' ? num : `-${Math.round(num)}`;
  particles.push({ x, y: y-10, vx: (Math.random()-0.5)*1.5, vy: -2,
    life: 55, maxLife: 55,
    text, color, type: 'num', r: 0 });
}

function updateParticles() {
  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    p.life--;
    p.x += p.vx; p.y += p.vy;
    if (p.type !== 'num') {
      p.vy += 0.08;
      p.vx *= 0.94;
    }
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles(ctx) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    if (p.type === 'num') {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold 14px Arial Black`;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ============================================================
// ARENA HELPERS
// ============================================================
function checkArenaWall(x, y, r, arena) {
  if (arena.type === 'circle') {
    const dx = x - arena.cx, dy = y - arena.cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist + r > arena.r) {
      const nx = dx/dist, ny = dy/dist;
      return { nx, ny };
    }
  } else if (arena.type === 'square' || arena.type === 'rect') {
    if (x - r < arena.x) return { nx: -1, ny: 0 };
    if (x + r > arena.x + arena.w) return { nx: 1, ny: 0 };
    if (y - r < arena.y) return { nx: 0, ny: -1 };
    if (y + r > arena.y + arena.h) return { nx: 0, ny: 1 };
  } else if (arena.type === 'cross') {
    // Cross: center rect + horizontal arm + vertical arm
    const cx = arena.cx, cy = arena.cy;
    const arm = arena.arm, thick = arena.thick;
    const inH = (x >= cx-arm && x <= cx+arm && y >= cy-thick/2 && y <= cy+thick/2);
    const inV = (x >= cx-thick/2 && x <= cx+thick/2 && y >= cy-arm && y <= cy+arm);
    if (!inH && !inV) {
      // Push toward nearest valid area
      const clampedX = Math.max(cx-arm, Math.min(cx+arm, x));
      const clampedY = Math.max(cy-thick/2, Math.min(cy+thick/2, y));
      const dx = x - clampedX, dy = y - clampedY;
      const dist = Math.sqrt(dx*dx+dy*dy);
      if (dist > 0) return { nx: -dx/dist, ny: -dy/dist };
    }
    // Wall checks for cross arms
    if (inH) {
      if (x - r < cx-arm) return { nx: -1, ny: 0 };
      if (x + r > cx+arm) return { nx: 1, ny: 0 };
      if (y - r < cy-thick/2) return { nx: 0, ny: -1 };
      if (y + r > cy+thick/2) return { nx: 0, ny: 1 };
    }
    if (inV) {
      if (x - r < cx-thick/2) return { nx: -1, ny: 0 };
      if (x + r > cx+thick/2) return { nx: 1, ny: 0 };
      if (y - r < cy-arm) return { nx: 0, ny: -1 };
      if (y + r > cy+arm) return { nx: 0, ny: 1 };
    }
  } else if (arena.type === 'hole') {
    // Outer square walls
    if (x - r < arena.x) return { nx: -1, ny: 0 };
    if (x + r > arena.x + arena.w) return { nx: 1, ny: 0 };
    if (y - r < arena.y) return { nx: 0, ny: -1 };
    if (y + r > arena.y + arena.h) return { nx: 0, ny: 1 };
    // Inner circular hole — ball bounces outward
    const hdx = x - arena.holeCx, hdy = y - arena.holeCy;
    const hdist = Math.sqrt(hdx*hdx + hdy*hdy);
    if (hdist < arena.holeR + r && hdist > 0) {
      return { nx: hdx/hdist, ny: hdy/hdist };
    }
  }
  return null;
}

// How much speed is kept after bouncing off a wall (1.0 = elastic, 0 = inelastic)
const WALL_BOUNCE = 1.0;

function clampToBall(ball, arena) {
  const r = ball.radius;
  if (arena.type === 'circle') {
    const dx = ball.x - arena.cx, dy = ball.y - arena.cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const maxDist = arena.r - r;
    if (dist > maxDist) {
      const nx = dx/dist, ny = dy/dist;
      // Snap ball to wall surface
      ball.x = arena.cx + nx * maxDist;
      ball.y = arena.cy + ny * maxDist;
      // Reflect velocity: remove outward component, add (1+restitution)×it back inward
      const dot = ball.vx*nx + ball.vy*ny;
      if (dot > 0) {
        ball.vx -= dot * nx * (1 + WALL_BOUNCE);
        ball.vy -= dot * ny * (1 + WALL_BOUNCE);
      }
    }
  } else if (arena.type === 'square' || arena.type === 'rect') {
    if (ball.x - r < arena.x)           { ball.x = arena.x + r;             ball.vx =  Math.abs(ball.vx) * WALL_BOUNCE; }
    if (ball.x + r > arena.x + arena.w) { ball.x = arena.x + arena.w - r;   ball.vx = -Math.abs(ball.vx) * WALL_BOUNCE; }
    if (ball.y - r < arena.y)           { ball.y = arena.y + r;             ball.vy =  Math.abs(ball.vy) * WALL_BOUNCE; }
    if (ball.y + r > arena.y + arena.h) { ball.y = arena.y + arena.h - r;   ball.vy = -Math.abs(ball.vy) * WALL_BOUNCE; }
  } else if (arena.type === 'cross') {
    const cx = arena.cx, cy = arena.cy, arm = arena.arm, thick = arena.thick;
    // Outer bounds
    if (ball.x < cx-arm+r) { ball.x = cx-arm+r; ball.vx =  Math.abs(ball.vx)*WALL_BOUNCE; }
    if (ball.x > cx+arm-r) { ball.x = cx+arm-r; ball.vx = -Math.abs(ball.vx)*WALL_BOUNCE; }
    if (ball.y < cy-arm+r) { ball.y = cy-arm+r; ball.vy =  Math.abs(ball.vy)*WALL_BOUNCE; }
    if (ball.y > cy+arm-r) { ball.y = cy+arm-r; ball.vy = -Math.abs(ball.vy)*WALL_BOUNCE; }
    // Keep inside cross shape
    const inH = (ball.y > cy-thick/2+r && ball.y < cy+thick/2-r);
    const inV = (ball.x > cx-thick/2+r && ball.x < cx+thick/2-r);
    if (!inH && !inV) {
      ball.vx += (cx - ball.x) * 0.07;
      ball.vy += (cy - ball.y) * 0.07;
    }
  } else if (arena.type === 'hole') {
    // Outer square walls
    if (ball.x - r < arena.x)           { ball.x = arena.x + r;           ball.vx =  Math.abs(ball.vx) * WALL_BOUNCE; }
    if (ball.x + r > arena.x + arena.w) { ball.x = arena.x + arena.w - r; ball.vx = -Math.abs(ball.vx) * WALL_BOUNCE; }
    if (ball.y - r < arena.y)           { ball.y = arena.y + r;           ball.vy =  Math.abs(ball.vy) * WALL_BOUNCE; }
    if (ball.y + r > arena.y + arena.h) { ball.y = arena.y + arena.h - r; ball.vy = -Math.abs(ball.vy) * WALL_BOUNCE; }
    // Inner circular hole — bounce outward
    const hdx = ball.x - arena.holeCx, hdy = ball.y - arena.holeCy;
    const hdist = Math.sqrt(hdx*hdx + hdy*hdy);
    const minHoleDist = arena.holeR + r;
    if (hdist < minHoleDist && hdist > 0) {
      const hnx = hdx/hdist, hny = hdy/hdist;
      ball.x = arena.holeCx + hnx * minHoleDist;
      ball.y = arena.holeCy + hny * minHoleDist;
      const dot = ball.vx*hnx + ball.vy*hny;
      if (dot < 0) {
        ball.vx -= dot * hnx * (1 + WALL_BOUNCE);
        ball.vy -= dot * hny * (1 + WALL_BOUNCE);
      }
    }
  }
}

// Returns a consistent eye color for a ball, hashed from its color string
function getEyeColor(ball) {
  const EYE_PALETTE = [
    '#44ffaa', '#ff4455', '#44aaff', '#ffdd22', '#cc44ff',
    '#ff8822', '#22ddff', '#ff44cc', '#88ff33', '#ff6666',
    '#33ffee', '#ffaa44', '#aaffdd', '#ff88ff', '#aaff44',
  ];
  const hex = ball.color || '#ffffff';
  let h = 0;
  for (let i = 0; i < hex.length; i++) h = (h * 31 + hex.charCodeAt(i)) & 0xffff;
  return EYE_PALETTE[h % EYE_PALETTE.length];
}

// ═══════════════════════════════════════════════════════════════
// RACE DECORATION RENDERER
// Draws cosmetic decorations around ball based on race.
// Hitbox (ball.radius circle) is NEVER changed here.
// Coordinate system after ctx.rotate(fa):
//   +X = forward (movement direction)   -X = back (tail)
//   ±Y = sides (horns, ears, wings)     -Y = above-head (hat, halo)
// ═══════════════════════════════════════════════════════════════
function drawRaceDecoration(ctx, ball) {
  if (!ball.charRace) return;
  const raceId = typeof ball.charRace === 'object' ? ball.charRace.id : ball.charRace;
  if (!raceId) return;

  const r  = ball.radius;
  const spd = Math.hypot(ball.vx, ball.vy);
  const fa  = spd > 0.3 ? Math.atan2(ball.vy, ball.vx) : (ball._deco_fa ?? 0);
  if (spd > 0.3) ball._deco_fa = fa;

  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  // Helper: draw two minimalist anime-style eyes facing +X
  // Elongated horizontal oval, gradient dark→light, no pupil/iris detail
  function eyes(_, __, glowCol) {
    const eyeC = getEyeColor(ball);

    // Parse hex → rgb for gradient construction
    const hex = eyeC.replace('#','');
    const er = parseInt(hex.slice(0,2),16), eg = parseInt(hex.slice(2,4),16), eb = parseInt(hex.slice(4,6),16);
    const lighten = (v,a) => Math.min(255, v+a);
    const darken  = (v,a) => Math.max(0,   v-a);

    const ew = r * 0.21;  // half-width  (landscape oval, wide)
    const eh = r * 0.085; // half-height (flat)
    const ex = r * 0.46;  // forward position on face

    for (const eyY of [-r*0.20, r*0.20]) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, eyY, ew, eh, 0, 0, Math.PI*2);

      // Vertical gradient: lighter top → darker bottom (light from above)
      const grad = ctx.createLinearGradient(ex, eyY - eh, ex, eyY + eh);
      grad.addColorStop(0,   `rgba(${lighten(er,70)},${lighten(eg,70)},${lighten(eb,70)},0.90)`);
      grad.addColorStop(0.45,`rgba(${er},${eg},${eb},0.88)`);
      grad.addColorStop(1,   `rgba(${darken(er,45)},${darken(eg,45)},${darken(eb,45)},0.78)`);

      ctx.fillStyle = grad;
      ctx.fill();

      // Thin blurred border — gives the "hazy anime" outline
      ctx.shadowColor = glowCol || eyeC;
      ctx.shadowBlur  = glowCol ? 8 : 4;
      ctx.strokeStyle = `rgba(${er},${eg},${eb},0.45)`;
      ctx.lineWidth   = 1.0;
      ctx.stroke();

      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  // ── Override check: key present in _raceAssetOverrides → use it (even if empty = no deco) ──
  if (window._raceAssetOverrides && Object.prototype.hasOwnProperty.call(window._raceAssetOverrides, raceId)) {
    const _overrideShapes = window._raceAssetOverrides[raceId];

    // Angel special: golden glowing halo (world-space, shadowBlur not supported in aeDrawShape)
    if (raceId === 'angel') {
      ctx.strokeStyle = '#ffdd33'; ctx.lineWidth = 3;
      ctx.shadowColor = '#ffee55'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.ellipse(0, -r*1.55, r*0.56, r*0.17, 0, 0, Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.rotate(fa); eyes(); ctx.restore(); return;
    }

    ctx.rotate(fa);
    for (const _s of (_overrideShapes || [])) {
      if (_s.visible === false) continue;
      aeDrawShape(ctx, _s, r);
    }
    if (raceId !== 'skeleton') eyes();  // skeleton has custom sockets — no anime eyes
    ctx.restore();
    return;
  }

  switch (raceId) {

    // ── GOBLIN ──────────────────────────────────────────────────────────
    case 'goblin': {
      ctx.rotate(fa);
      ctx.fillStyle = '#4a7a20'; ctx.strokeStyle = '#2a4a10'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        // Big pointy ear
        ctx.beginPath();
        ctx.moveTo(-r*0.15, s*r*0.78);
        ctx.lineTo(-r*0.50, s*r*1.65);
        ctx.lineTo( r*0.45, s*r*1.55);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Inner ear pink flush
        ctx.fillStyle = '#ff8888';
        ctx.beginPath();
        ctx.moveTo(-r*0.10, s*r*0.86);
        ctx.lineTo(-r*0.35, s*r*1.45);
        ctx.lineTo( r*0.24, s*r*1.38);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4a7a20'; ctx.strokeStyle = '#2a4a10'; ctx.lineWidth = 1.5;
      }
      eyes('#ffdd00', '#000');
      break;
    }

    // ── GNOME ────────────────────────────────────────────────────────────
    case 'gnome': {
      ctx.rotate(fa);
      // Hat brim
      ctx.fillStyle = '#773311'; ctx.strokeStyle = '#552200'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(r*0.05, -r*0.95, r*0.62, r*0.18, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      // Hat cone
      ctx.fillStyle = '#cc6633'; ctx.strokeStyle = '#883311'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r*0.55, -r*0.97);
      ctx.lineTo( r*0.05, -r*2.25);
      ctx.lineTo( r*0.65, -r*0.97);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Hat band
      ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(r*0.05, -r*1.06, r*0.55, r*0.15, 0, 0, Math.PI*2); ctx.stroke();
      eyes('#fff', '#3366ff');
      break;
    }

    // ── HUMAN ────────────────────────────────────────────────────────────
    case 'human': {
      ctx.rotate(fa);
      // Hair strands above (-Y)
      ctx.strokeStyle = '#8B5E3C'; ctx.lineWidth = 3;
      [-r*0.42, -r*0.2, r*0.06, r*0.28, r*0.48].forEach((hy, i) => {
        ctx.beginPath();
        ctx.moveTo(hy * 0.65, -r*0.88);
        ctx.quadraticCurveTo(hy + r*0.04*(i-2), -r*1.22, hy + r*0.06*(i-2), -r*1.46);
        ctx.stroke();
      });
      eyes('#fff', '#553311');
      break;
    }

    // ── DWARF ────────────────────────────────────────────────────────────
    case 'dwarf': {
      ctx.rotate(fa);
      // Thick beard at back (-X)
      ctx.fillStyle = '#cc8833'; ctx.strokeStyle = '#996622'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r*0.72, -r*0.52);
      ctx.bezierCurveTo(-r*1.75, -r*0.55, -r*2.05,  r*0.0, -r*1.75,  r*0.55);
      ctx.lineTo(-r*0.72,  r*0.52);
      ctx.bezierCurveTo(-r*1.1, r*0.28, -r*1.1, -r*0.28, -r*0.72, -r*0.52);
      ctx.fill(); ctx.stroke();
      // Braid lines
      ctx.strokeStyle = '#aa6611'; ctx.lineWidth = 1.3;
      [-r*1.1, -r*1.35, -r*1.6].forEach(bx => {
        ctx.beginPath(); ctx.moveTo(bx, -r*0.22); ctx.lineTo(bx - r*0.08, r*0.22); ctx.stroke();
      });
      // Metal helmet ridge
      ctx.fillStyle = '#aaaaaa'; ctx.strokeStyle = '#666'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(r*0.05, -r*0.93, r*0.58, r*0.18, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      eyes('#fff', '#224488');
      break;
    }

    // ── SKELETON ─────────────────────────────────────────────────────────
    case 'skeleton': {
      ctx.rotate(fa);
      // Eye sockets
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(r*0.43, -r*0.27, r*0.20, r*0.16, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r*0.43,  r*0.27, r*0.20, r*0.16, 0, 0, Math.PI*2); ctx.fill();
      // Nose triangle
      ctx.beginPath();
      ctx.moveTo(r*0.70,  0);
      ctx.lineTo(r*0.60, -r*0.10);
      ctx.lineTo(r*0.60,  r*0.10);
      ctx.closePath(); ctx.fill();
      // Teeth
      ctx.fillStyle = '#e8e8d8'; ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
      for (let t = -1; t <= 1; t++) {
        ctx.beginPath();
        ctx.rect(r*0.76, t*r*0.22 - r*0.10, r*0.17, r*0.19);
        ctx.fill(); ctx.stroke();
      }
      // Forehead crack
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(r*0.22, -r*0.66);
      ctx.lineTo(r*0.42, -r*0.46);
      ctx.lineTo(r*0.32, -r*0.30);
      ctx.stroke();
      break;
    }

    // ── TROLL ────────────────────────────────────────────────────────────
    case 'troll': {
      ctx.rotate(fa);
      // Messy spiky hair above (-Y)
      ctx.strokeStyle = '#556633'; ctx.lineWidth = 3;
      [-r*0.46, -r*0.22, 0, r*0.22, r*0.46].forEach((hy, i) => {
        const bend = (i - 2) * r * 0.12;
        ctx.beginPath();
        ctx.moveTo(hy * 0.7, -r*0.88);
        ctx.quadraticCurveTo(hy + bend, -r*1.32, hy + bend*0.5, -r*1.62 - Math.abs(i-2)*r*0.06);
        ctx.stroke();
      });
      // Small blunt horns on sides (±Y)
      ctx.fillStyle = '#776644'; ctx.strokeStyle = '#554422'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(r*0.10, s*r*0.80);
        ctx.quadraticCurveTo(r*0.35, s*r*1.32, r*0.05, s*r*1.58);
        ctx.quadraticCurveTo(-r*0.10, s*r*1.22, r*0.00, s*r*0.86);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // Bulbous nose front (+X)
      ctx.fillStyle = '#5a7a38'; ctx.strokeStyle = '#3a5520'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(r*0.86, 0, r*0.22, r*0.17, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      eyes('#ffcc00', '#000');
      break;
    }

    // ── ORC ──────────────────────────────────────────────────────────────
    case 'orc': {
      ctx.rotate(fa);
      // Upward tusks (±Y, front-ish)
      ctx.fillStyle = '#eeeebb'; ctx.strokeStyle = '#aaaa77'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(r*0.60,  s*r*0.18);
        ctx.quadraticCurveTo(r*1.05, s*r*0.44, r*0.90, s*r*0.74);
        ctx.quadraticCurveTo(r*0.77, s*r*0.50, r*0.71, s*r*0.22);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // Heavy brow ridges
      ctx.strokeStyle = '#1a1200'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(r*0.25, -r*0.44); ctx.lineTo(r*0.62, -r*0.36); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r*0.25,  r*0.44); ctx.lineTo(r*0.62,  r*0.36); ctx.stroke();
      eyes('#ff2200', '#000');
      break;
    }

    // ── GIANT ────────────────────────────────────────────────────────────
    case 'giant': {
      // Stone crack texture — world-space (no rotation with movement)
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
      [ [[ 0.10,-0.56],[ 0.28,-0.18],[ 0.12, 0.14]],
        [[-0.30, 0.35],[-0.05, 0.65]],
        [[ 0.40, 0.16],[ 0.65, 0.38],[ 0.82, 0.18]],
        [[-0.55,-0.30],[-0.77,-0.06]] ].forEach(c => {
        ctx.beginPath(); ctx.moveTo(c[0][0]*r, c[0][1]*r);
        for (let i=1;i<c.length;i++) ctx.lineTo(c[i][0]*r, c[i][1]*r);
        ctx.stroke();
      });
      // Stone pebble highlights
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      [[0.22,-0.38,0.10],[-0.44,0.20,0.08],[0.55,0.30,0.07]].forEach(([x,y,s]) => {
        ctx.beginPath(); ctx.arc(x*r, y*r, s*r, 0, Math.PI*2); ctx.fill();
      });
      // Eyes face movement direction
      ctx.save(); ctx.rotate(fa); eyes('#ff9922', '#000'); ctx.restore();
      break;
    }

    // ── DRAGON ───────────────────────────────────────────────────────────
    case 'dragon': {
      ctx.rotate(fa);
      const srLabel = typeof ball.charSubrace === 'object' ? ball.charSubrace?.label : ball.charSubrace;
      const dc = ({ Crimson:'#dd2200',Stone:'#888',Amethyst:'#9922bb',Ancient:'#887722',
                    Undead:'#558855',Zephyrian:'#33aacc',Tideborn:'#1155bb',Thunder:'#cccc00',
                    Flame:'#ff5500',Ice:'#99ddff',Chaos:'#ee22ee' })[srLabel] ?? '#cc3300';
      // Curved horns on sides (±Y)
      ctx.fillStyle = dc; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo( r*0.15, s*r*0.78);
        ctx.bezierCurveTo(r*0.50, s*r*1.30, r*0.30, s*r*1.82, r*0.00, s*r*1.88);
        ctx.bezierCurveTo(-r*0.20, s*r*1.70, -r*0.05, s*r*1.22, r*0.10, s*r*0.82);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // Wagging tail at back (-X)
      const wag = Math.sin(Date.now()*0.004) * r*0.32;
      ctx.strokeStyle = dc; ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-r*0.85, 0);
      ctx.quadraticCurveTo(-r*1.55, wag, -r*1.92, wag*0.55);
      ctx.stroke();
      // Arrow tail tip
      ctx.fillStyle = dc;
      ctx.save();
      ctx.translate(-r*1.92, wag*0.55);
      ctx.rotate(Math.atan2(wag*0.55, -r*0.37));
      ctx.beginPath(); ctx.moveTo(r*0.18,0); ctx.lineTo(-r*0.10,-r*0.13); ctx.lineTo(-r*0.10,r*0.13); ctx.closePath(); ctx.fill();
      ctx.restore();
      // Scale arc marks
      ctx.strokeStyle = dc+'aa'; ctx.lineWidth = 1.3;
      [[-0.25,-0.46],[0.06,-0.63],[-0.25,0.46],[0.06,0.63],[0.33,0.0]].forEach(([x,y]) => {
        ctx.beginPath(); ctx.arc(x*r, y*r, r*0.18, Math.PI*0.12, Math.PI*0.88); ctx.stroke();
      });
      eyes('#ffaa00', '#000');
      break;
    }

    // ── ANGEL ────────────────────────────────────────────────────────────
    case 'angel': {
      ctx.rotate(fa);
      // Wings on sides (±Y)
      for (const s of [-1, 1]) {
        ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle = 'rgba(200,200,170,0.9)'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo( r*0.35, s*r*0.78);
        ctx.bezierCurveTo(r*0.05, s*r*1.58, -r*0.55, s*r*1.68, -r*0.66, s*r*1.12);
        ctx.bezierCurveTo(-r*0.30, s*r*0.90,  r*0.10, s*r*0.84,  r*0.30, s*r*0.80);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Feather detail
        ctx.strokeStyle = 'rgba(180,180,160,0.55)'; ctx.lineWidth = 1;
        [[0.30,0.86,-0.06,1.12],[0.00,1.06,-0.26,1.32],[-0.36,1.12,-0.56,1.30]].forEach(([x1,y1,x2,y2]) => {
          ctx.beginPath(); ctx.moveTo(x1*r, s*y1*r); ctx.lineTo(x2*r, s*y2*r); ctx.stroke();
        });
      }
      // Halo — always screen-up, world-space
      ctx.restore(); ctx.save(); ctx.translate(ball.x, ball.y);
      ctx.strokeStyle = '#ffdd33'; ctx.lineWidth = 3;
      ctx.shadowColor = '#ffee55'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.ellipse(0, -r*1.55, r*0.56, r*0.17, 0, 0, Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.rotate(fa); eyes('#ccddff', '#336699');
      break;
    }

    // ── PRIMORDIAL BEING ─────────────────────────────────────────────────
    case 'primordial': {
      // Orbiting cosmic dots — world-space
      const t = Date.now() * 0.0012;
      ['#6699ff','#ff55aa','#55ffdd'].forEach((c, i) => {
        const a = t*(1.4 + i*0.35) + i*(Math.PI*2/3);
        ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(Math.cos(a)*r*1.44, Math.sin(a)*r*1.44, r*0.13, 0, Math.PI*2); ctx.fill();
      });
      ctx.shadowBlur = 0;
      // Swirl arcs
      const t2 = Date.now() * 0.0008;
      ctx.strokeStyle = 'rgba(110,150,255,0.55)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(0, 0, r*0.52, t2*2, t2*2 + Math.PI*1.3); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,90,190,0.45)';
      ctx.beginPath(); ctx.arc(0, 0, r*0.74, -t2*1.5, -t2*1.5 + Math.PI*1.5); ctx.stroke();
      // Eyes (face direction)
      ctx.save(); ctx.rotate(fa); eyes('#bbddff', '#334499', '#8899ff'); ctx.restore();
      break;
    }

    // ── DEMON ────────────────────────────────────────────────────────────
    case 'demon': {
      ctx.rotate(fa);
      // Dark aura ring
      ctx.strokeStyle = 'rgba(180,0,0,0.28)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, r*1.18, 0, Math.PI*2); ctx.stroke();
      // Sharp tall horns on sides (±Y)
      ctx.fillStyle = '#cc1100'; ctx.strokeStyle = '#880000'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(r*0.10, s*r*0.78);
        ctx.lineTo(r*0.28, s*r*1.80);
        ctx.lineTo(r*0.52, s*r*0.84);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Horn highlight edge
        ctx.fillStyle = '#ff3322';
        ctx.beginPath();
        ctx.moveTo(r*0.15, s*r*0.82);
        ctx.lineTo(r*0.22, s*r*1.56);
        ctx.lineTo(r*0.33, s*r*0.87);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#cc1100'; ctx.strokeStyle = '#880000'; ctx.lineWidth = 1.5;
      }
      // Swinging devil tail at back (-X)
      const sw = Math.sin(Date.now()*0.005) * r*0.42;
      ctx.strokeStyle = '#cc1100'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-r*0.85, 0);
      ctx.quadraticCurveTo(-r*1.52, sw, -r*1.52, sw + r*0.88);
      ctx.stroke();
      // Diamond arrowhead
      ctx.fillStyle = '#cc1100';
      ctx.save();
      ctx.translate(-r*1.52, sw + r*0.88);
      ctx.rotate(Math.PI * 0.22);
      ctx.beginPath(); ctx.moveTo(r*0.18,0); ctx.lineTo(-r*0.12,-r*0.12); ctx.lineTo(-r*0.05,0); ctx.lineTo(-r*0.12,r*0.12); ctx.closePath(); ctx.fill();
      ctx.restore();
      eyes('#ff1100', '#ffcc00', '#ff0000');
      break;
    }

    // ── GOD ──────────────────────────────────────────────────────────────
    case 'god': {
      // Pulsing golden rays — world-space, always rotating
      const tg = Date.now() * 0.0009;
      for (let i=0; i<8; i++) {
        const a = (i/8)*Math.PI*2 + tg;
        const pulse = 0.55 + 0.45*Math.sin(tg*3 + i*1.1);
        ctx.strokeStyle = `rgba(255,215,0,${0.70*pulse})`;
        ctx.lineWidth = 1.6 + pulse*1.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*r*1.26, Math.sin(a)*r*1.26);
        ctx.lineTo(Math.cos(a)*r*(1.74 + pulse*0.24), Math.sin(a)*r*(1.74 + pulse*0.24));
        ctx.stroke();
      }
      // Golden halo ring
      ctx.strokeStyle = 'rgba(255,215,0,0.78)'; ctx.lineWidth = 3;
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(0, 0, r*1.22, 0, Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
      // Eyes face movement direction
      ctx.save(); ctx.rotate(fa); eyes('#fff8cc', '#ff9900', '#ffee44'); ctx.restore();
      break;
    }

  } // end switch

  ctx.restore();
}

function drawArena(ctx, arena) {
  ctx.save();
  ctx.fillStyle = '#0e0e22';
  if (arena.type === 'circle') {
    ctx.beginPath();
    ctx.arc(arena.cx, arena.cy, arena.r, 0, Math.PI*2);
    ctx.fill();
    // border
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 3;
    ctx.stroke();
    // grid dots
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      for (let d = 50; d < arena.r; d += 50) {
        ctx.beginPath(); ctx.arc(arena.cx+Math.cos(a)*d, arena.cy+Math.sin(a)*d, 2, 0, Math.PI*2); ctx.fill();
      }
    }
  } else if (arena.type === 'square' || arena.type === 'rect') {
    ctx.roundRect(arena.x, arena.y, arena.w, arena.h, arena.type === 'square' ? 8 : 4);
    ctx.fill();
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 3;
    ctx.roundRect(arena.x, arena.y, arena.w, arena.h, arena.type === 'square' ? 8 : 4);
    ctx.stroke();
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let gx = arena.x + 50; gx < arena.x+arena.w; gx += 50) {
      ctx.beginPath(); ctx.moveTo(gx, arena.y); ctx.lineTo(gx, arena.y+arena.h); ctx.stroke();
    }
    for (let gy = arena.y + 50; gy < arena.y+arena.h; gy += 50) {
      ctx.beginPath(); ctx.moveTo(arena.x, gy); ctx.lineTo(arena.x+arena.w, gy); ctx.stroke();
    }
  } else if (arena.type === 'cross') {
    const cx = arena.cx, cy = arena.cy, arm = arena.arm, thick = arena.thick;
    ctx.beginPath();
    ctx.rect(cx-arm, cy-thick/2, arm*2, thick);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(cx-thick/2, cy-arm, thick, arm*2);
    ctx.fill();
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(cx-arm, cy-thick/2, arm*2, thick);
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(cx-thick/2, cy-arm, thick, arm*2);
    ctx.stroke();
  } else if (arena.type === 'hole') {
    // Fill square minus circular hole (even-odd rule)
    ctx.save();
    ctx.fillRule = 'evenodd';
    ctx.beginPath();
    ctx.rect(arena.x, arena.y, arena.w, arena.h);
    ctx.arc(arena.holeCx, arena.holeCy, arena.holeR, 0, Math.PI*2, true);
    ctx.fill('evenodd');
    // Outer border
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 3;
    ctx.strokeRect(arena.x, arena.y, arena.w, arena.h);
    // Inner hole border — glowing edge
    ctx.strokeStyle = '#4a2a6a';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#8844ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(arena.holeCx, arena.holeCy, arena.holeR, 0, Math.PI*2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Grid (clipped to arena minus hole)
    ctx.beginPath();
    ctx.rect(arena.x, arena.y, arena.w, arena.h);
    ctx.arc(arena.holeCx, arena.holeCy, arena.holeR, 0, Math.PI*2, true);
    ctx.clip('evenodd');
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let gx = arena.x + 50; gx < arena.x+arena.w; gx += 50) {
      ctx.beginPath(); ctx.moveTo(gx, arena.y); ctx.lineTo(gx, arena.y+arena.h); ctx.stroke();
    }
    for (let gy = arena.y + 50; gy < arena.y+arena.h; gy += 50) {
      ctx.beginPath(); ctx.moveTo(arena.x, gy); ctx.lineTo(arena.x+arena.w, gy); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

// ============================================================
// BALL CLASS
// ============================================================
class Ball {
  constructor(x, y, color, weaponId, side, charStats = null, teamId = -1) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.radius = BALL_R;
    this.color = color;
    this.side = side;  // 'left' | 'right'
    this.teamId = teamId; // -1 = FFA, 0 or 1 = team match

    // Chargen stat mapping
    const cs = charStats || {};
    const dur = cs.durability ?? null;
    const spd = cs.speed      ?? null;
    const iq  = cs.iq         ?? null;
    const biq = cs.battleiq   ?? null;
    const ma  = cs.ma         ?? null;
    this.charSTR     = cs.strength ?? null;  // used in getDamage()
    this.charSPD     = spd;                  // used in initGame launchSpeed
    this.charMA      = ma;                   // used in _initWeapon spinBonus
    this.charRace    = cs.race    ?? null;   // used in drawRaceDecoration
    this.charSubrace = cs.subrace ?? null;   // used in drawRaceDecoration

    this.maxHp = dur !== null ? (50 + dur * 10) : BASE_HP;
    this.hp    = this.maxHp;
    this.maxSpd     = spd !== null ? (10 + spd * 1.5) : 18;
    this.baseMaxSpd = this.maxSpd; // Speed Floor reference
    this.alive = true;
    this.mass = this.radius * this.radius * 0.05;

    this.immunityFrames = 0;
    this.hitFlash = 0;
    this.squashX = 1; this.squashY = 1;
    this.scale = 1;
    this.bounceCooldown = 0;   // frames after a collision where AI backs off
    this.wallBoostFactor = 1.0; // speed multiplier from wall boost (decays back to 1.0)
    this.evadeChance = biq !== null ? biq * 0.03 : 0.10;  // BIQ×0.03, default 10%
    this.evadeFrames = 0;

    this.critChance  = iq  !== null ? iq  * 0.05 : 0.20;  // IQ×0.05,  default 20%
    this.critMult    = 1.5;

    this.weapon = this._initWeapon(weaponId);
    this.weaponDef = WEAPON_MAP[weaponId];

    this.stats = { hits: 0, parries: 0, damageDone: 0 };
    this.speechText = null;
    this.speechFrames = 0;
  }

  _initWeapon(id) {
    const def = WEAPON_MAP[id];
    const spd = this.charSPD ?? 5;
    // Per-ball attackCooldown based on SPD
    let ac = def.attackCooldown;
    if      (def.id === 'fists')   ac = Math.max(2, 13 - spd);
    else if (def.id === 'sword')   ac = Math.max(2, 28 - spd);
    else if (def.id === 'dagger')  ac = Math.max(2, 18 - spd);
    else if (def.id === 'spear')   ac = Math.max(2, 38 - spd);
    else if (def.id === 'scythe')  ac = Math.max(2, 34 - spd);
    else if (def.id === 'hammer')  ac = Math.max(2, 48 - spd);
    // Ranged: fireInterval overridden per-ball via weapon.fireInterval
    let fi = def.fireInterval || null;
    if (def.id === 'bow')      fi = Math.max(5, 140 - spd * 2);
    else if (def.id === 'shuriken') fi = Math.max(5, 250 - spd * 2);
    return {
      id,
      angle: 0,
      hits: 0,
      cooldown: 0,
      attackCooldown: ac,
      fireInterval: fi,
      bonusDamage: 0,
      bonusLength: 0,
      bonusKnockback: 0,
      spinBonus: (this.charMA !== null ? this.charMA * 0.003 : 0),  // MA×0.003 base spin
      spinDir: 1,           // 1 = forward, -1 = reversed (spear parry effect)
      spinDebuffTimer: 0,   // frames remaining for 10% spin reduction (spear parry)
      spinSlowTimer: 0,     // frames remaining for 30% spin reduction (hammer slow)
      arrowCount: 1,
      shurikenCount: 1,
      fireTimer: 0,
      burstQueue: 0,
      burstTimer: 0,
      parried: false,
      parryCooldown: 0
    };
  }

  getSpeed() {
    const def    = this.weaponDef;
    const spearDebuff  = this.weapon.spinDebuffTimer > 0 ? 0.9 : 1.0;  // -10% from spear parry
    const hammerDebuff = this.weapon.spinSlowTimer   > 0 ? 0.7 : 1.0;  // -30% from hammer slow
    return (def.baseSpeed + this.weapon.spinBonus) * this.scale * this.weapon.spinDir * spearDebuff * hammerDebuff;
  }

  getDamage() {
    const def = this.weaponDef;
    const str = this.charSTR ?? 1;
    const rageMult = (state.matchTime >= 80 * 60) ? 1.5 : 1.0;
    return (def.baseDamage * str + this.weapon.bonusDamage) * rageMult;
  }

  getKnockback() {
    const def = this.weaponDef;
    const rageMult = (state.matchTime >= 80 * 60) ? 1.5 : 1.0;
    return (def.baseKnockback + this.weapon.bonusKnockback) * rageMult;
  }

  getWeaponLength() {
    const def = this.weaponDef;
    return this.radius + def.baseLength + this.weapon.bonusLength;
  }

  update(arena, opponent, projectiles, gravity) {
    if (!this.alive) return;

    // No AI steering — pure physics only

    // Physics — friction: ~99% after 1s, ~91% after 10s, ~84% after 20s
    if (gravity) this.vy += 0.15;
    this.vx *= 0.99985;
    this.vy *= 0.99985;

    // Limit max speed (per-ball, influenced by chargen SPD stat)
    const spd = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
    if (spd > this.maxSpd) { this.vx = this.vx/spd*this.maxSpd; this.vy = this.vy/spd*this.maxSpd; }

    const preX = this.x, preY = this.y;
    this.x += this.vx;
    this.y += this.vy;

    // Arena walls — detect bounce for sparks + speed boost
    clampToBall(this, arena);
    const wallHitX = Math.abs(this.x - preX - this.vx) > 1;
    const wallHitY = Math.abs(this.y - preY - this.vy) > 1;
    if ((wallHitX || wallHitY) && spd > 0.5) {
      spawnSparks(this.x, this.y, 6);
      this.bounceCooldown = 12;
      // +20% speed boost, refresh mỗi lần chạm tường
      this.vx *= 1.1;
      this.vy *= 1.1;
      this.wallBoostFactor = 1.1;
    }
    if (this.bounceCooldown > 0) this.bounceCooldown--;

    // Decay wall boost về 1.0 trong 3 giây (180 frames)
    // 0.9747^180 ≈ 0.01 → boost gần như tan hết sau 3s
    if (this.wallBoostFactor > 1.0005) {
      const prev = this.wallBoostFactor;
      this.wallBoostFactor = 1.0 + (prev - 1.0) * 0.9747;
      const ratio = this.wallBoostFactor / prev;  // hệ số giảm tốc frame này
      this.vx *= ratio;
      this.vy *= ratio;
    } else {
      this.wallBoostFactor = 1.0;
    }

    // Weapon rotation
    this.weapon.angle += this.getSpeed();
    if (this.weapon.spinDebuffTimer > 0) this.weapon.spinDebuffTimer--;
    if (this.weapon.spinSlowTimer   > 0) this.weapon.spinSlowTimer--;
    if (this.weapon.cooldown > 0) this.weapon.cooldown--;
    if (this.weapon.parryCooldown > 0) this.weapon.parryCooldown--;
    if (this.immunityFrames > 0) this.immunityFrames--;
    if (this.hitFlash > 0) this.hitFlash--;
    if (this.evadeFrames > 0) this.evadeFrames--;

    // Squash recovery
    this.squashX += (1 - this.squashX) * 0.15;
    this.squashY += (1 - this.squashY) * 0.15;

    // Projectile firing — burst system
    const def = this.weaponDef;
    if (def.aiType === 'ranged') {
      const BURST_DELAY = 4;
      if (this.weapon.burstQueue > 0) {
        // Mid-burst: fire one shot every BURST_DELAY frames
        this.weapon.burstTimer--;
        if (this.weapon.burstTimer <= 0) {
          this.weapon.burstQueue--;
          this.weapon.burstTimer = BURST_DELAY;
          this._fireSingle(projectiles);
          // Last shot fired → reset cooldown timer NOW
          if (this.weapon.burstQueue === 0) {
            this.weapon.fireTimer = 0;
          }
        }
      } else {
        // Between bursts: count cooldown, then queue next burst
        if (opponent && opponent.alive) {
          this.weapon.fireTimer++;
          const interval = this.weapon.fireInterval ?? def.fireInterval ?? 120;
          if (this.weapon.fireTimer >= interval) {
            const count = def.id === 'bow'
              ? (this.weapon.arrowCount || 1)
              : (this.weapon.shurikenCount || 1);
            this.weapon.burstQueue = count;
            this.weapon.burstTimer = 0; // fire first shot immediately
          }
        }
      }
    }

    // Speech
    if (this.speechFrames > 0) this.speechFrames--;
    else this.speechText = null;
  }

  // AI removed — movement is purely physics-driven

  // Fire a single projectile in the direction the weapon is currently pointing
  _fireSingle(projectiles) {
    const def = this.weaponDef;
    const a = this.weapon.angle; // current weapon spin angle — changes each frame naturally
    sfxShoot();
    if (def.id === 'bow') {
      const spd = def.arrowSpeed + (this.weapon.arrowSpeedBonus || 0);
      projectiles.push(new Projectile(
        this.x + Math.cos(a) * this.radius,
        this.y + Math.sin(a) * this.radius,
        Math.cos(a) * spd, Math.sin(a) * spd,
        this, 'arrow', (this.charSTR ?? 1)
      ));
    } else if (def.id === 'shuriken') {
      const spd = def.shurikenSpeed;
      projectiles.push(new Projectile(
        this.x + Math.cos(a) * this.radius,
        this.y + Math.sin(a) * this.radius,
        Math.cos(a) * spd, Math.sin(a) * spd,
        this, 'shuriken', (this.charSTR ?? 1)
      ));
    }
  }

  takeDamage(dmg, fromX, fromY, isCrit = false) {
    if (this.immunityFrames > 0) return false;
    // Evade roll — 10% cơ hội né hoàn toàn
    if (Math.random() < this.evadeChance) {
      this.evadeFrames = 60;
      this.immunityFrames = 20;
      spawnDamageNumber(this.x, this.y - this.radius, 'EVADE', '#aaffee');
      return false;
    }
    this.hp -= dmg;
    this.immunityFrames = 18;
    this.hitFlash = 8;
    const angle = Math.atan2(this.y - fromY, this.x - fromX);
    spawnBlood(this.x, this.y, isCrit ? 12 : 6, angle + Math.PI);
    if (isCrit) {
      // Số crit: màu vàng, to hơn, kèm label CRIT!
      spawnDamageNumber(this.x,     this.y - this.radius - 18, 'CRIT!', '#ffe033');
      spawnDamageNumber(this.x + 4, this.y - this.radius,       dmg,      '#ffcc00');
    } else {
      spawnDamageNumber(this.x, this.y - this.radius, dmg, this.color);
    }
    // Squash
    this.squashX = 1.3;
    this.squashY = 0.75;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      sfxDeath();
      spawnDeathExplosion(this.x, this.y, this.color);
      this.speechText = ['RIP', 'Ouch!', '💀', 'GG'][Math.floor(Math.random()*4)];
      this.speechFrames = 120;
    }
    return true;
  }

  draw(ctx) {
    // ── Overtime death: draw as gray ghost ──
    if (!this.alive && this.diedByOvertime) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.translate(this.x, this.y);
      // Gray body
      ctx.fillStyle = '#555';
      ctx.shadowColor = '#333';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      // Dark outline
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Skull-like X cross
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      const s = this.radius * 0.38;
      ctx.beginPath(); ctx.moveTo(-s, -s); ctx.lineTo(s, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s, -s); ctx.lineTo(-s, s); ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.squashX, this.squashY);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius*0.9, this.radius*0.8, this.radius*0.25, 0, 0, Math.PI*2);
    ctx.fill();

    // Immunity shimmer
    if (this.immunityFrames > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${this.immunityFrames/18 * 0.5})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 4, 0, Math.PI*2);
      ctx.stroke();
    }

    // Evade blur effect — ball mờ đi và có vòng cyan nhấp nháy
    if (this.evadeFrames > 0) {
      const t = this.evadeFrames / 60;          // 1.0 → 0.0
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.02); // nhấp nháy
      // Vòng tròn cyan nhấp nháy
      ctx.strokeStyle = `rgba(100, 255, 220, ${t * 0.9 * pulse})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#44ffcc';
      ctx.shadowBlur = 15 + pulse * 12;
      ctx.beginPath(); ctx.arc(0, 0, this.radius + 7, 0, Math.PI * 2); ctx.stroke();
      // Vòng thứ 2 lớn hơn mờ hơn
      ctx.strokeStyle = `rgba(100, 255, 220, ${t * 0.4})`;
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      // Làm mờ ball (globalAlpha thấp)
      ctx.globalAlpha = 0.35 + t * 0.35;
    }

    // Wall boost glow — vòng sáng cam khi đang tăng tốc
    if (this.wallBoostFactor > 1.005) {
      const boostAlpha = (this.wallBoostFactor - 1.0) / 0.2; // 0→1
      ctx.strokeStyle = `rgba(255, 160, 30, ${boostAlpha * 0.85})`;
      ctx.lineWidth = 3 + boostAlpha * 4;
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 12 + boostAlpha * 20;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Hit flash
    const baseColor = this.hitFlash > 0 ? '#ffffff' : this.color;
    ctx.fillStyle = baseColor;
    ctx.shadowColor = this.wallBoostFactor > 1.005 ? '#ff8800' : this.color;
    ctx.shadowBlur = this.alive ? (this.wallBoostFactor > 1.005 ? 18 : 10) : 0;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI*2);
    ctx.fill();

    // Ball outline
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(-this.radius*0.28, -this.radius*0.3, this.radius*0.28, this.radius*0.18, -Math.PI*0.3, 0, Math.PI*2);
    ctx.fill();

    // Team indicator ring
    if (this.teamId >= 0) {
      const TC = ['#00ddff', '#ff8833'];
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = TC[this.teamId] ?? '#fff';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Race decoration (cosmetic only, no hitbox change)
    if (this.alive) drawRaceDecoration(ctx, this);

    // Speech bubble
    if (this.speechText) {
      ctx.save();
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      const alpha = Math.min(1, this.speechFrames / 20);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(this.speechText, this.x, this.y - this.radius - 10);
      ctx.fillText(this.speechText, this.x, this.y - this.radius - 10);
      ctx.restore();
    }
  }

  drawWeapon(ctx) {
    if (!this.alive) return;
    ctx.save();
    // Scale glow
    if (this.weapon.hits > 0) {
      ctx.shadowColor = this.weaponDef.color;
      ctx.shadowBlur = Math.min(20, this.weapon.hits * 3);
    }
    this.weaponDef.draw(ctx, this);
    ctx.restore();
  }

  getScaleLabel() {
    const def = this.weaponDef;
    const w = this.weapon;
    if (def.id === 'fists')    return `⚡ CD: ${w.attackCooldown.toFixed(0)}`;
    if (def.id === 'sword')    return `⚔ Dmg: ${def.baseDamage + (w.bonusDamage||0)}`;
    if (def.id === 'dagger')   return `💨 Spin: ${(def.baseSpeed + (w.spinBonus||0)).toFixed(3)}`;
    if (def.id === 'spear')    return `📏 Len+${(w.bonusLength||0).toFixed(0)} Dmg+${(w.bonusDamage||0).toFixed(1)}`;
    if (def.id === 'bow')      return `🏹 Arrows: ${w.arrowCount||1}  Spd: ${(def.arrowSpeed + (w.arrowSpeedBonus||0)).toFixed(1)}`;
    if (def.id === 'scythe')   return w.hits >= 5 ? '🌙 DUAL BLADES' : `🌙 Hits: ${w.hits}/5`;
    if (def.id === 'hammer')   return `💥 KB: ${(def.baseKnockback + (w.bonusKnockback||0)).toFixed(1)}`;
    if (def.id === 'shuriken') return `⭐ Stars: ${w.shurikenCount||1}`;
    return '';
  }
}

// ============================================================
// COLLISION DETECTION
// ============================================================
function dist2(ax, ay, bx, by) { return (ax-bx)*(ax-bx) + (ay-by)*(ay-by); }

// collidePair: body bounce + parry + weapon hits for two specific balls
function collidePair(b1, b2) {
  if (!b1.alive || !b2.alive) return;

  // 1. Body-body bounce — proper elastic collision
  const dx = b2.x - b1.x, dy = b2.y - b1.y;
  const d = Math.sqrt(dx*dx + dy*dy);
  const minDist = b1.radius + b2.radius;
  if (d < minDist && d > 0) {
    const nx = dx/d, ny = dy/d;
    const overlap = minDist - d;
    const push = overlap * 0.52;
    b1.x -= nx * push;
    b1.y -= ny * push;
    b2.x += nx * push;
    b2.y += ny * push;
    const relVx = b2.vx - b1.vx, relVy = b2.vy - b1.vy;
    const dot = relVx*nx + relVy*ny;
    if (dot < 0) {
      const totalMass = b1.mass + b2.mass;
      const e = 1.85;
      const impulse = (e * dot) / totalMass;
      b1.vx += impulse * b2.mass * nx;
      b1.vy += impulse * b2.mass * ny;
      b2.vx -= impulse * b1.mass * nx;
      b2.vy -= impulse * b1.mass * ny;
      b1.bounceCooldown = 20;
      b2.bounceCooldown = 20;
    }
  }

  // 2. Parry check and weapon hits — skip for teammates (no friendly fire)
  if (b1.teamId >= 0 && b1.teamId === b2.teamId) return; // body bounce still happened above
  if (b1.weapon.parryCooldown === 0 && b2.weapon.parryCooldown === 0) {
    const pts1 = b1.weaponDef.getHitPoints(b1);
    const pts2 = b2.weaponDef.getHitPoints(b2);
    let parryOccurred = false;
    for (const p1 of pts1) {
      for (const p2 of pts2) {
        const threshold = p1.r + p2.r + 6;
        if (dist2(p1.x, p1.y, p2.x, p2.y) < threshold*threshold) {
          const d12x = p2.x - p1.x, d12y = p2.y - p1.y;
          const d12len = Math.sqrt(d12x*d12x + d12y*d12y);
          if (d12len < 0.001) continue;
          const wDir1x = Math.cos(b1.weapon.angle), wDir1y = Math.sin(b1.weapon.angle);
          const dot1 = wDir1x*(d12x/d12len) + wDir1y*(d12y/d12len);
          const wDir2x = Math.cos(b2.weapon.angle), wDir2y = Math.sin(b2.weapon.angle);
          const dot2 = wDir2x*(-d12x/d12len) + wDir2y*(-d12y/d12len);
          if (dot1 > 0.2 && dot2 > 0.2) parryOccurred = true;
        }
      }
    }
    if (parryOccurred) {
      const midX = (b1.x + b2.x) / 2, midY = (b1.y + b2.y) / 2;
      spawnSparks(midX, midY, 14);
      sfxParry();
      const recoil = 5.5;
      const pnx = b1.x - b2.x, pny = b1.y - b2.y;
      const pnl = Math.sqrt(pnx*pnx + pny*pny);
      const b1Fists = b1.weaponDef.id === 'fists';
      const b2Fists = b2.weaponDef.id === 'fists';

      if (b1Fists && b2Fists) {
        // Fists vs Fists: both take damage + normal recoil
        if (pnl > 0) {
          b1.vx += (pnx/pnl)*recoil; b1.vy += (pny/pnl)*recoil;
          b2.vx -= (pnx/pnl)*recoil; b2.vy -= (pny/pnl)*recoil;
        }
        b1.takeDamage(b2.getDamage(), b2.x, b2.y, false);
        b2.takeDamage(b1.getDamage(), b1.x, b1.y, false);
        addBattleLog('parry_fists', { attacker: getBallLabel(b1), defender: getBallLabel(b2), damage: b2.getDamage(), aColor: b1.color, dColor: b2.color, defHp: +Math.max(0, b1.hp).toFixed(1) });
      } else if (b1Fists || b2Fists) {
        // Fists vs melee: fists takes damage (no knockback), other gets recoil only
        const [fistsB, otherB] = b1Fists ? [b1, b2] : [b2, b1];
        const nx = fistsB.x - otherB.x, ny = fistsB.y - otherB.y;
        const nl = Math.sqrt(nx*nx + ny*ny);
        if (nl > 0) { otherB.vx -= (nx/nl)*recoil; otherB.vy -= (ny/nl)*recoil; }
        fistsB.takeDamage(otherB.getDamage(), otherB.x, otherB.y, false);
        addBattleLog('parry_fists', { attacker: getBallLabel(fistsB), defender: getBallLabel(otherB), damage: otherB.getDamage(), aColor: fistsB.color, dColor: otherB.color, defHp: +Math.max(0, fistsB.hp).toFixed(1) });
      } else {
        // Normal parry: recoil both, no damage
        if (pnl > 0) {
          b1.vx += (pnx/pnl)*recoil; b1.vy += (pny/pnl)*recoil;
          b2.vx -= (pnx/pnl)*recoil; b2.vy -= (pny/pnl)*recoil;
        }
        addBattleLog('parry', { attacker: getBallLabel(b1), defender: getBallLabel(b2), aColor: b1.color, dColor: b2.color });
      }
      b1.weapon.parryCooldown = 25;
      b2.weapon.parryCooldown = 25;
      b1.bounceCooldown = 22;
      b2.bounceCooldown = 22;
      b1.weapon.angle += Math.PI * 0.15;
      b2.weapon.angle += Math.PI * 0.15;
      b1.stats.parries++;
      b2.stats.parries++;
      // Spear parried by melee → reverse spin + 10% debuff for 60 frames
      const applySpearParry = (spearBall, otherBall) => {
        if (spearBall.weaponDef.id === 'spear' && otherBall.weaponDef.aiType === 'melee') {
          spearBall.weapon.spinDir *= -1;
          spearBall.weapon.spinDebuffTimer = 60;
        }
      };
      applySpearParry(b1, b2);
      applySpearParry(b2, b1);
      return;
    }
  }

  // 3. Weapon-to-body damage
  _checkWeaponHit(b1, b2);
  _checkWeaponHit(b2, b1);
}

// resolveProjectiles: projectiles vs all alive balls (any non-owner is a valid target)
function resolveProjectiles(players, projectiles) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    if (!proj.alive || proj.immuneFrames > 0) continue;

    for (const target of players) {
      if (target === proj.owner || !target.alive) continue;
      if (proj.owner && proj.owner.teamId >= 0 && proj.owner.teamId === target.teamId) continue;

      // Check weapon deflect
      const tpts = target.weaponDef.getHitPoints(target);
      let deflected = false;
      for (const tp of tpts) {
        if (dist2(proj.x, proj.y, tp.x, tp.y) < (tp.r + proj.r) * (tp.r + proj.r)) {
          deflected = true; break;
        }
      }
      if (deflected) {
        const da = Math.atan2(proj.y - target.y, proj.x - target.x);
        const spd = Math.sqrt(proj.vx*proj.vx + proj.vy*proj.vy);
        proj.vx = Math.cos(da) * spd * 1.05;
        proj.vy = Math.sin(da) * spd * 1.05;
        proj.owner = target;
        proj.immuneFrames = target.weaponDef.id === 'fists' ? 20 : 8;
        if (target.weaponDef.id === 'fists') {
          // Fists parry ranged: take 50% damage, projectile bounces as normal
          target.takeDamage(proj.damage * 0.5, proj.x, proj.y, false);
        }
        spawnSparks(proj.x, proj.y, 5);
        sfxParry();
        break;
      }

      // Check body hit
      if (dist2(proj.x, proj.y, target.x, target.y) < (proj.r + target.radius) * (proj.r + target.radius)) {
        const isCrit = Math.random() < proj.owner.critChance;
        const rageMult = (state.matchTime >= 80 * 60) ? 1.5 : 1.0;
        const baseProjDmg = proj.damage * rageMult;
        const dmg = baseProjDmg * (isCrit ? proj.owner.critMult : 1);
        const projHit = target.takeDamage(dmg, proj.x, proj.y, isCrit);
        if (projHit) {
          // log
          if (isCrit) {
            addBattleLog('proj_crit', { attacker: getBallLabel(proj.owner), defender: getBallLabel(target), damage: dmg, baseDmg: +baseProjDmg.toFixed(2), critMult: proj.owner.critMult, aColor: proj.owner.color, dColor: target.color, defHp: target.hp });
          } else {
            addBattleLog('proj', { attacker: getBallLabel(proj.owner), defender: getBallLabel(target), damage: dmg, aColor: proj.owner.color, dColor: target.color, defHp: target.hp });
          }
          proj.owner.stats.hits++;
          proj.owner.stats.damageDone += dmg;
          sfxHit();
          const ka = Math.atan2(target.y - proj.y, target.x - proj.x);
          target.vx += Math.cos(ka) * 4.5;
          target.vy += Math.sin(ka) * 4.5;
          target.bounceCooldown = 14;
          proj.owner.weaponDef.onHit(proj.owner.weapon);
        } else {
          addBattleLog('proj_evade', { attacker: getBallLabel(proj.owner), defender: getBallLabel(target), aColor: proj.owner.color, dColor: target.color });
        }
        proj.alive = false;
        break;
      }
    }
  }
}

function _checkWeaponHit(attacker, defender) {
  // No friendly fire in team matches
  if (attacker.teamId >= 0 && attacker.teamId === defender.teamId) return;
  if (attacker.weapon.cooldown > 0) return;
  if (defender.immunityFrames > 0) return;
  const def = attacker.weaponDef;
  if (def.aiType === 'ranged') return; // ranged weapons don't melee-hit

  const pts = def.getHitPoints(attacker);
  for (const p of pts) {
    const threshold = p.r + defender.radius;
    if (dist2(p.x, p.y, defender.x, defender.y) < threshold*threshold) {
      const isCrit = Math.random() < attacker.critChance;
      const isHammer = def.id === 'hammer';
      // Hammer: final damage += knockback / 2
      const kbBonus = isHammer
        ? (def.baseKnockback + (attacker.weapon.bonusKnockback||0)) / 2
        : 0;
      const baseDmgNoCrit = attacker.getDamage() + kbBonus;
      const dmg = baseDmgNoCrit * (isCrit ? attacker.critMult : 1);
      const hitResult = defender.takeDamage(dmg, attacker.x, attacker.y, isCrit);
      if (hitResult) {
        const rageCDMult = (state.matchTime >= 80 * 60) ? 0.7 : 1.0;
        attacker.weapon.cooldown = Math.max(1, Math.floor(attacker.weapon.attackCooldown * rageCDMult));
        attacker.stats.hits++;
        attacker.stats.damageDone += dmg;
        sfxHit();
        // Battle log: hit or crit
        if (isCrit) {
          addBattleLog('crit', { attacker: getBallLabel(attacker), defender: getBallLabel(defender), damage: dmg, baseDmg: +baseDmgNoCrit.toFixed(2), critMult: attacker.critMult, aColor: attacker.color, dColor: defender.color, defHp: +Math.max(0, defender.hp).toFixed(1) });
        } else {
          addBattleLog('hit', { attacker: getBallLabel(attacker), defender: getBallLabel(defender), damage: dmg, aColor: attacker.color, dColor: defender.color, defHp: +Math.max(0, defender.hp).toFixed(1) });
        }
        // Hammer slow: -30% spin speed for 1.5s (90 frames)
        if (isHammer) {
          defender.weapon.spinSlowTimer = 90;
          spawnDamageNumber(defender.x, defender.y - defender.radius - 18, 'SLOW', '#ff9933');
        }
        // Knockback — cancel defender's current velocity toward attacker first
        const ka = Math.atan2(defender.y - attacker.y, defender.x - attacker.x);
        const kb = attacker.getKnockback();
        // Remove inward velocity so knockback always sends them flying outward
        const inward = defender.vx * -Math.cos(ka) + defender.vy * -Math.sin(ka);
        if (inward > 0) { defender.vx += Math.cos(ka)*inward; defender.vy += Math.sin(ka)*inward; }
        defender.vx += Math.cos(ka) * kb * 1.4;
        defender.vy += Math.sin(ka) * kb * 1.4;
        defender.bounceCooldown = 18;   // defender AI backs off after being hit
        // Scaling
        def.onHit(attacker.weapon);
      } else {
        // Evaded
        addBattleLog('evade', { attacker: getBallLabel(attacker), defender: getBallLabel(defender), aColor: attacker.color, dColor: defender.color });
      }
      return;
    }
  }
}

// ============================================================
// GAME STATE
// ============================================================
let state = {
  running: false,
  paused: false,
  ended: false,
  players: [],
  projectiles: [],
  arena: null,
  gravity: false,
  speed: 1,
  frame: 0,
  fighters: [],
  arenaId: 'square',
  winner: null,
  // Countdown + timer
  phase: 'menu',       // 'countdown' | 'playing'
  countdownFrame: 0,
  matchTime: 0,
  // BO3 (set by tournament)
  bo3: null,           // { wins:[0,0], gameNum:1, fighters:[f0,f1] } or null
  // Tournament
  tournament: null,    // { size, rounds, currentRound, currentMatch, ... } or null
  tournament2v2: null, // 2v2 tournament state or null
  matchMode: '1v1',    // '1v1' | '2v2'
  teamIds: [],         // array of teamId per fighter index
  winTeam: -1,         // winning team index in 2v2
};

// ============================================================
// GAME LOOP
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let rafId = null;

function gameLoop() {
  if (!state.running) return;
  rafId = requestAnimationFrame(gameLoop);

  if (state.phase === 'countdown') {
    state.countdownFrame++;
    // 4 phases × 60f: "3" (0–59), "2" (60–119), "1" (120–179), "FIGHT!" (180–239)
    if (state.countdownFrame >= 240) {
      state.phase = 'playing';
      for (const b of state.players) {
        b.vx = b._launchVx || 0;
        b.vy = b._launchVy || 0;
      }
    }
  } else if (!state.paused && !state.ended) {
    for (let s = 0; s < state.speed; s++) step();
    state.matchTime += state.speed;
  }

  render();
  updateHUD();
  updateTimerDisplay();
}

function step() {
  state.frame++;
  const players = state.players;

  // Update each ball — pass nearest alive enemy for targeting/firing
  for (const ball of players) {
    let nearest = null, nearestD = Infinity;
    for (const other of players) {
      if (other === ball || !other.alive) continue;
      // Skip teammates in team matches
      if (ball.teamId >= 0 && ball.teamId === other.teamId) continue;
      const d = Math.hypot(ball.x - other.x, ball.y - other.y);
      if (d < nearestD) { nearestD = d; nearest = other; }
    }
    ball.update(state.arena, nearest, state.projectiles, state.gravity);
  }

  // Update projectiles
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    state.projectiles[i].update(state.arena);
    if (!state.projectiles[i].alive) state.projectiles.splice(i, 1);
  }

  // All-pairs body/weapon collision
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      collidePair(players[i], players[j]);
    }
  }

  // Projectiles vs all balls
  resolveProjectiles(players, state.projectiles);

  updateParticles();

  // ── Per-second stats snapshot ──
  if (state.phase === 'playing' && state.matchTime % 60 === 0) {
    const snap = {
      second: Math.floor(state.matchTime / 60),
      balls: players.map(b => {
        const spd  = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
        const spin = Math.abs(b.getSpeed ? b.getSpeed() : 0);
        const dmgDelta = b.stats.damageDone - (b._lastDmgSnap ?? 0);
        b._lastDmgSnap = b.stats.damageDone;
        return { name: getBallLabel(b), color: b.color,
          speed:    +spd.toFixed(2),
          spin:     +spin.toFixed(4),
          dmg:      +dmgDelta.toFixed(2),
          scaleVal: getBallScaleVal(b),
          scaleUnit: getBallScaleUnit(b),
        };
      })
    };
    state.statsLog.push(snap);
  }

  // ── Speed Floor: after 60s → +5% maxSpd every 10s ──
  if (state.matchTime >= 60 * 60) {
    const steps = Math.floor((state.matchTime - 60 * 60) / (10 * 60));
    const mult  = 1 + steps * 0.05;
    for (const b of players) b.maxSpd = b.baseMaxSpd * mult;
  }

  // ── Milestone announcements (one-shot) ──
  if (!state.speedFloorActive && state.matchTime >= 60 * 60) {
    state.speedFloorActive = true;
    spawnBigAnnouncement('SPEED UP!', '#ffcc00');
  }
  if (!state.rageModeActive && state.matchTime >= 80 * 60) {
    state.rageModeActive = true;
    spawnBigAnnouncement('RAGE MODE!', '#ff4400');
  }


  // Check game end
  const alive = players.filter(b => b.alive);
  if (!state.ended && players.length > 1) {
    if (state.matchMode === '2v2') {
      const t0 = alive.filter(b => b.teamId === 0).length;
      const t1 = alive.filter(b => b.teamId === 1).length;
      if (t0 === 0 || t1 === 0) {
        state.ended = true;
        state.winTeam = (t0 > 0) ? 0 : (t1 > 0) ? 1 : -1;
        state.winner  = state.winTeam >= 0
          ? alive.find(b => b.teamId === state.winTeam) ?? null
          : 'draw';
        setTimeout(() => showResult(), 1200);
      }
    } else {
      if (alive.length <= 1) {
        state.ended = true;
        state.winner = alive.length === 0 ? 'draw' : alive[0];
        setTimeout(() => showResult(), 1200);
      }
    }
  }
}

function render() {
  ctx.clearRect(0, 0, CW, CH);
  // Background
  ctx.fillStyle = '#080818';
  ctx.fillRect(0, 0, CW, CH);

  drawArena(ctx, state.arena);

  // Draw weapons behind balls
  for (const b of state.players) b.drawWeapon(ctx);

  // Draw projectiles
  for (const p of state.projectiles) p.draw(ctx);

  // Draw balls
  for (const b of state.players) b.draw(ctx);

  drawParticles(ctx);

  // Game ended overlay
  if (state.ended) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.restore();
  }

  // Countdown overlay
  if (state.phase === 'countdown') renderCountdown();

  // Speed Floor overlay — subtle yellow pulse after 60s
  if (state.matchTime >= 60 * 60 && state.matchTime < 80 * 60 && !state.ended) {
    const a = 0.025 + 0.015 * Math.sin(state.matchTime * 0.08);
    ctx.save(); ctx.fillStyle = `rgba(255,210,0,${a})`; ctx.fillRect(0,0,CW,CH); ctx.restore();
  }
  // Rage Mode overlay — red pulse after 80s (overrides yellow)
  if (state.matchTime >= 80 * 60 && !state.ended) {
    const a = 0.04 + 0.03 * Math.sin(state.matchTime * 0.15);
    ctx.save(); ctx.fillStyle = `rgba(255,50,0,${a})`; ctx.fillRect(0,0,CW,CH); ctx.restore();
  }
  // Big announcements
  updateDrawBigAnnouncements(ctx);
}

function renderCountdown() {
  const f = state.countdownFrame;
  const phase = Math.floor(f / 60);
  const labels = ['3', '2', '1', 'FIGHT!'];
  const colors = ['#ff6666', '#ffaa44', '#ffff44', '#66ff99'];
  if (phase >= labels.length) return;

  const frameInPhase = f % 60;
  const scale = 1 + Math.max(0, 0.55 * (1 - frameInPhase / 25));
  const alpha = frameInPhase < 8 ? frameInPhase / 8 :
                frameInPhase > 50 ? 1 - (frameInPhase - 50) / 10 : 1;

  ctx.save();
  if (phase < 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, 0, CW, CH);
  }
  const fontSize = phase === 3 ? 78 : 108;
  ctx.font = `900 ${Math.round(fontSize * scale)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.shadowColor = colors[phase];
  ctx.shadowBlur = 50;
  ctx.fillStyle = colors[phase];
  ctx.fillText(labels[phase], CW / 2, CH / 2);
  ctx.restore();
}

function updateHUD() {
  state.players.forEach((ball, i) => {
    const curHp = Math.max(0, Math.round(ball.hp));
    const maxHp = Math.round(ball.maxHp);
    const pct   = Math.max(0, curHp / maxHp * 100);
    const fill  = document.getElementById(`hud-hp-fill-${i}`);
    const val   = document.getElementById(`hud-hp-val-${i}`);
    const scale = document.getElementById(`hud-scale-${i}`);
    if (fill)  fill.style.width = pct + '%';
    if (val)   val.textContent  = `${curHp} / ${maxHp}`;
    if (scale) scale.textContent = ball.getScaleLabel();
  });
}

function updateTimerDisplay() {
  const el = document.getElementById('match-timer');
  const ov = document.getElementById('overtime-label');
  if (!el) return;
  const secs = Math.floor(state.matchTime / 60);
  const m    = Math.floor(secs / 60);
  const s    = String(secs % 60).padStart(2, '0');
  el.textContent = `${m}:${s}`;
  // Mode badge
  if (state.matchTime >= 80 * 60) {
    el.className = 'overtime'; // reuse red pulse style
    if (ov) { ov.textContent = 'RAGE'; ov.style.color = '#ff4400'; ov.style.display = ''; }
  } else if (state.matchTime >= 60 * 60) {
    el.className = '';
    if (ov) { ov.textContent = 'SPEED UP'; ov.style.color = '#ffcc00'; ov.style.display = ''; }
  } else {
    el.className = '';
    if (ov) ov.style.display = 'none';
  }
}

function updateBO3Display() {
  const bar = document.getElementById('bo3-score-bar');
  if (!bar) return;
  if (!state.bo3) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  const { wins, fighters, winsNeeded } = state.bo3;
  const needed = winsNeeded ?? 2;
  const f1 = fighters[0], f2 = fighters[1];
  document.getElementById('bo3-f1-name').textContent = f1?.charName ?? f1?.weaponId ?? '—';
  document.getElementById('bo3-f2-name').textContent = f2?.charName ?? f2?.weaponId ?? '—';
  document.getElementById('bo3-score').textContent = `${wins[0]} : ${wins[1]}`;
  // Win pips — dynamically render correct count based on winsNeeded
  ['bo3-pips','bo3-pips-r'].forEach((id, fi) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < needed; i++) {
      const span = document.createElement('span');
      if (i < wins[fi]) span.classList.add('won');
      el.appendChild(span);
    }
  });
}

function buildHUD() {
  const leftEl  = document.getElementById('hud-left');
  const rightEl = document.getElementById('hud-right');
  leftEl.innerHTML  = '';
  rightEl.innerHTML = '';

  state.players.forEach((ball, i) => {
    const def    = ball.weaponDef;
    const name   = ball.charName
      ? `${ball.charEmoji ?? ''} ${ball.charName}`
      : def.name;
    const wepSub = ball.charName ? `${def.icon} ${def.name}` : '';
    const maxHp  = Math.round(ball.maxHp);

    const card = document.createElement('div');
    card.className = 'hud-card';
    card.style.color = ball.color;
    card.innerHTML = `
      <div class="hud-card-top">
        <div class="hud-card-name" style="color:${ball.color}">
          ${name}
          ${wepSub ? `<span class="wep-sub">${wepSub}</span>` : ''}
        </div>
        <span class="hp-fraction" id="hud-hp-val-${i}">${maxHp} / ${maxHp}</span>
      </div>
      <div class="hp-track">
        <div class="hp-fill" id="hud-hp-fill-${i}"
             style="width:100%;background:${ball.color};box-shadow:0 0 6px ${ball.color}88;"></div>
      </div>
      <span class="hud-scale-tag" id="hud-scale-${i}">${ball.getScaleLabel()}</span>
    `;

    // In 2v2: team0 (idx 0,1) → left; team1 (idx 2,3) → right
    // In 1v1/FFA: even → left, odd → right
    const goLeft = state.matchMode === '2v2' ? (ball.teamId === 0 || i < 2) : (i % 2 === 0);
    (goLeft ? leftEl : rightEl).appendChild(card);
  });
}

// ============================================================
// GAME SETUP
// ============================================================
function initGame() {
  const arenaConfig = JSON.parse(JSON.stringify(ARENAS[state.arenaId]));
  state.arena = arenaConfig;
  const N = state.fighters.length;

  // Determine arena center + spread radius
  let cx, cy, spreadR;
  if (arenaConfig.type === 'circle') {
    cx = arenaConfig.cx; cy = arenaConfig.cy;
    spreadR = arenaConfig.r * 0.45;
  } else if (arenaConfig.type === 'rect') {
    cx = arenaConfig.x + arenaConfig.w / 2;
    cy = arenaConfig.y + arenaConfig.h / 2;
    spreadR = Math.min(arenaConfig.w, arenaConfig.h) * 0.33;
  } else if (arenaConfig.type === 'cross') {
    cx = arenaConfig.cx; cy = arenaConfig.cy;
    spreadR = arenaConfig.thick * 0.38;
  } else if (arenaConfig.type === 'hole') {
    cx = arenaConfig.x + arenaConfig.w / 2;
    cy = arenaConfig.y + arenaConfig.h / 2;
    spreadR = Math.min(arenaConfig.w, arenaConfig.h) * 0.34;
  } else { // square
    cx = arenaConfig.x + arenaConfig.w / 2;
    cy = arenaConfig.y + arenaConfig.h / 2;
    spreadR = Math.min(arenaConfig.w, arenaConfig.h) * 0.34;
  }

  // Spread N balls evenly in a circle around center
  const positions = [];
  if (state.matchMode === '2v2' && N === 4) {
    // Team 0 on left, Team 1 on right, staggered vertically
    const gap = Math.min(70, spreadR * 0.4);
    positions.push({ x: cx - spreadR, y: cy - gap }); // team0 ball0
    positions.push({ x: cx - spreadR, y: cy + gap }); // team0 ball1
    positions.push({ x: cx + spreadR, y: cy - gap }); // team1 ball0
    positions.push({ x: cx + spreadR, y: cy + gap }); // team1 ball1
  } else if (N === 2) {
    positions.push({ x: cx - spreadR, y: cy });
    positions.push({ x: cx + spreadR, y: cy });
  } else {
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      positions.push({ x: cx + Math.cos(a) * spreadR, y: cy + Math.sin(a) * spreadR });
    }
  }

  const balls = state.fighters.map((fighter, i) => {
    const pos = positions[i];
    const side = i === 0 ? 'left' : 'right';
    const tId  = (state.matchMode === '2v2' && state.teamIds) ? (state.teamIds[i] ?? -1) : -1;
    const ball = new Ball(pos.x, pos.y, fighter.color, fighter.weaponId, side, fighter.charStats || null, tId);
    ball.charName  = fighter.charName  || null;
    ball.charEmoji = fighter.charEmoji || '';

    // launchSpeed: nếu có chargen SPD → SPD + random(1~3), không thì 3 + random(0~3)
    const launchAngle = Math.atan2(pos.y - cy, pos.x - cx) + (Math.random() - 0.5) * 0.8;
    let launchSpd;
    if (fighter.charStats?.speed != null) {
      const randPart = 1 + Math.random() * 2;          // 1.0 ~ 3.0
      launchSpd = fighter.charStats.speed + randPart;
      const badThresh  = fighter.charStats.speed + 1.3;
      const goodThresh = fighter.charStats.speed + 2.5;
      if (launchSpd < badThresh)       { ball.speechText = '😴 Bad Start';    ball.speechFrames = 150; }
      else if (launchSpd > goodThresh) { ball.speechText = '🔥 Great Start!'; ball.speechFrames = 150; }
    } else {
      launchSpd = 3 + Math.random() * 3;               // legacy: 3.0 ~ 6.0
      if (launchSpd < 3.7)      { ball.speechText = '😴 Bad Start';    ball.speechFrames = 150; }
      else if (launchSpd > 4.8) { ball.speechText = '🔥 Great Start!'; ball.speechFrames = 150; }
    }
    // Store launch velocity — applied after countdown
    ball._launchVx = Math.cos(launchAngle) * launchSpd;
    ball._launchVy = Math.sin(launchAngle) * launchSpd;
    ball.vx = 0;
    ball.vy = 0;
    ball.weapon.angle = launchAngle;
    return ball;
  });

  state.players = balls;
  state.projectiles = [];
  state.frame = 0;
  state.ended = false;
  state.winner = null;
  state.winTeam    = -1;
  state.speedFloorActive = false;
  state.rageModeActive   = false;
  state.battleLog = [];
  state.statsLog  = [];   // per-second snapshots for charts
  updateLiveLog(); // clear the live panel
  // matchMode is set by caller; default to '1v1' if not set
  if (!state.matchMode) state.matchMode = '1v1';
  state.phase = 'countdown';
  state.countdownFrame = 0;
  state.matchTime = 0;
  particles.length = 0;

  buildHUD();
  updateBO3Display();
  updateTimerDisplay();
}

function startGame() {
  // Random arena for tournament matches
  if (state.tournament && !state.bo3?.gameNum > 1) state.arenaId = randomArena();
  state.matchMode = state.matchMode ?? '1v1';
  state.teamIds   = state.teamIds ?? [];
  initGame();
  state.running = true;
  state.paused  = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(gameLoop);
}

function stopGame() {
  state.running = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}

// ============================================================
// RESULT SCREEN
// ============================================================
function showResult() {
  const titleEl  = document.getElementById('rTitle');
  const statsEl  = document.getElementById('rStats');
  const bo3Panel = document.getElementById('bo3-result-panel');
  const rematch  = document.getElementById('rematchBtn');
  const nextGame = document.getElementById('nextGameBtn');
  const bracketB = document.getElementById('bracketBtn');

  const ballLabel = b => b.charName
    ? `${b.charEmoji ?? ''} ${b.charName} <span style="color:#888;font-size:.8em">(${b.weaponDef.icon} ${b.weaponDef.name})</span>`
    : `${b.weaponDef.icon} ${b.weaponDef.name}`;

  if (state.winner === 'draw' || (state.matchMode === '2v2' && state.winTeam === -1)) {
    titleEl.textContent = '🤝 DRAW!';
    titleEl.className = 'r-title draw';
  } else if (state.matchMode === '2v2' && state.winTeam >= 0) {
    const TC = ['#00ddff', '#ff8833'];
    const tc = TC[state.winTeam];
    const teamName = state.bo3?.fighters?.[state.winTeam]?.charName ?? `Team ${state.winTeam + 1}`;
    titleEl.innerHTML = `<span style="color:${tc};text-shadow:0 0 25px ${tc}">⚔️ ${teamName} WINS!</span>`;
    titleEl.className = 'r-title';
  } else {
    const w = state.winner;
    titleEl.innerHTML = `<span style="color:${w.color};text-shadow:0 0 25px ${w.color}">● ${ballLabel(w)} WINS!</span>`;
    titleEl.className = 'r-title';
  }

  const lines = state.players.map(ball => {
    const isWinner = ball === state.winner;
    return `<strong style="color:${ball.color}">● ${ballLabel(ball)}</strong>${isWinner ? ' 🏆' : ''}<br>
    Hits: ${ball.stats.hits} &nbsp;|&nbsp; Parries: ${ball.stats.parries} &nbsp;|&nbsp; Damage: ${ball.stats.damageDone.toFixed(0)}<br>
    Scaling: ${ball.getScaleLabel()}`;
  });
  statsEl.innerHTML = lines.join('<br><br>') + `<br><br><em style="color:#555">Duration: ${(state.matchTime / 60).toFixed(1)}s</em>`;

  // ── BO3 handling ──
  rematch.style.display  = '';
  nextGame.style.display = 'none';
  bracketB.style.display = 'none';
  bo3Panel.style.display = 'none';
  const blogBtn = document.getElementById('battleLogBtn');
  if (blogBtn) blogBtn.style.display = (state.battleLog?.length > 0) ? '' : 'none';
  const statsBtn = document.getElementById('statsLogBtn');
  if (statsBtn) statsBtn.style.display = (state.statsLog?.length > 1) ? '' : 'none';

  if (state.bo3) {
    const bo3 = state.bo3;
    bo3Panel.style.display = '';
    rematch.style.display  = 'none';

    // Record game result
    if (state.winner !== 'draw') {
      const winIdx = state.matchMode === '2v2' ? state.winTeam : state.players.indexOf(state.winner);
      if (winIdx >= 0) bo3.wins[winIdx]++;
    }
    bo3.gameNum++;

    // Update BO3 result panel
    const f0 = bo3.fighters[0], f1 = bo3.fighters[1];
    document.getElementById('bo3-r-f1').textContent = f0?.charName ?? f0?.weaponId ?? '—';
    document.getElementById('bo3-r-f2').textContent = f1?.charName ?? f1?.weaponId ?? '—';
    document.getElementById('bo3-r-score').textContent = `${bo3.wins[0]} : ${bo3.wins[1]}`;

    // Sync wins back to bracket match record
    if (state.tournament2v2 && state.matchMode === '2v2') {
      const t  = state.tournament2v2;
      const m  = t.rounds[t.currentRound]?.[t.currentMatch];
      if (m) m.bo3Wins = [...bo3.wins];
    } else if (state.tournament) {
      const t  = state.tournament;
      const m  = t.rounds[t.currentRound]?.[t.currentMatch];
      if (m) m.bo3Wins = [...bo3.wins];
    }

    const winsNeeded = bo3.winsNeeded ?? 2;
    const matchWinner = bo3.wins[0] >= winsNeeded ? 0 : bo3.wins[1] >= winsNeeded ? 1 : -1;
    if (matchWinner >= 0) {
      const mw = bo3.fighters[matchWinner];
      document.getElementById('bo3-game-label').textContent =
        `Match over — ${mw.charName ?? mw.weaponId} advances!`;
      bracketB.style.display = '';
      // Record in tournament bracket
      if (state.tournament2v2 && state.matchMode === '2v2') {
        recordTournamentMatchResult2v2(mw);
        if (state.tournament2v2.completed) bracketB.textContent = '🏆 Final Results';
      } else if (state.tournament) {
        recordTournamentMatchResult(mw);
        if (state.tournament.completed) {
          bracketB.textContent = '🏆 Final Results';
        }
      }
    } else {
      const gameNum = bo3.gameNum;
      const totalGames = (winsNeeded * 2) - 1;
      document.getElementById('bo3-game-label').textContent =
        `Game ${gameNum - 1} done · Next: Game ${gameNum} of ${totalGames}`;
      nextGame.style.display = '';
    }
  }

  showScreen('result');
}

// ============================================================
// TOURNAMENT
// ============================================================
// Convert a cgRoster entry → fighter object (used by state.fighters / bracket)
function rosterToFighter(ch) {
  return {
    weaponId:   ch.weapon,
    color:      ch.color,
    charName:   ch.name,
    charEmoji:  ch.raceEmoji ?? '',
    charStats:  { ...ch.stats, race: ch.race ?? null, subrace: ch.subrace ?? null },
  };
}

function randomArena() {
  const keys = Object.keys(ARENAS);
  return keys[Math.floor(Math.random() * keys.length)];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeBotFighter(idx) {
  const color = BALL_COLORS[idx % BALL_COLORS.length];
  const wpId  = WEAPON_DEFS[Math.floor(Math.random() * WEAPON_DEFS.length)].id;
  const stats = {
    strength:   Math.ceil(Math.random() * 7) + 1,
    speed:      Math.ceil(Math.random() * 7) + 1,
    durability: Math.ceil(Math.random() * 7) + 1,
    iq:         Math.ceil(Math.random() * 5) + 1,
    biq:        Math.ceil(Math.random() * 5) + 1,
    ma:         Math.ceil(Math.random() * 5) + 1,
  };
  return { weaponId: wpId, color, charName: `Bot ${idx + 1}`, charEmoji: '🤖', charStats: stats, isBot: true };
}

function createTournament(size, roster) {
  const participants = [...roster];
  // Pad with bots up to tournament size
  while (participants.length < size) {
    participants.push(makeBotFighter(participants.length));
  }
  shuffle(participants);

  // Build all rounds (single-elimination)
  const rounds = [];
  let prev = participants;
  while (prev.length > 1) {
    const round = [];
    for (let i = 0; i < prev.length; i += 2) {
      round.push({ p1: prev[i], p2: prev[i + 1], winner: null, bo3Wins: [0, 0] });
    }
    rounds.push(round);
    prev = new Array(round.length).fill(null); // placeholders for next round
  }

  return { size, rounds, currentRound: 0, currentMatch: 0, completed: false };
}

function recordTournamentMatchResult(matchWinner) {
  const t = state.tournament;
  if (!t) return;
  const round = t.rounds[t.currentRound];
  const match = round[t.currentMatch];
  match.winner = matchWinner;

  // Place winner into next round if exists
  if (t.currentRound + 1 < t.rounds.length) {
    const nextRound   = t.rounds[t.currentRound + 1];
    const nextMatchIdx = Math.floor(t.currentMatch / 2);
    const slot = t.currentMatch % 2 === 0 ? 'p1' : 'p2';
    nextRound[nextMatchIdx][slot] = matchWinner;
  }

  // Advance pointer
  t.currentMatch++;
  if (t.currentMatch >= round.length) {
    t.currentRound++;
    t.currentMatch = 0;
    if (t.currentRound >= t.rounds.length) {
      t.completed = true;
    }
  }
  renderBracket();
}

function getNextTournamentMatch() {
  const t = state.tournament;
  if (!t || t.completed) return null;
  return t.rounds[t.currentRound]?.[t.currentMatch] ?? null;
}

function renderBracket() {
  const t = state.tournament;
  const container = document.getElementById('bracket-content');
  const titleEl   = document.getElementById('bracket-title');
  if (!container || !t) return;

  const roundNames = ['Round 1','Round 2','Quarter-Finals','Semi-Finals','Final'];
  const totalRounds = t.rounds.length;

  titleEl.textContent = t.completed ? '🏆 Tournament Complete!' : '🏆 Tournament Bracket';

  container.innerHTML = '';
  t.rounds.forEach((round, ri) => {
    const col = document.createElement('div');
    col.className = 'bracket-round';
    const label = document.createElement('div');
    label.className = 'bracket-round-label';
    const labelIdx = totalRounds - 1 - ri;
    label.textContent = roundNames[Math.min(labelIdx, roundNames.length - 1)] ??
                        `Round ${ri + 1}`;
    col.appendChild(label);

    round.forEach((match, mi) => {
      const isCurrent = ri === t.currentRound && mi === t.currentMatch && !t.completed;
      const isDone    = match.winner !== null;
      const div = document.createElement('div');
      div.className = 'bracket-match' + (isCurrent ? ' current' : '') + (isDone ? ' done' : '');

      const players = [match.p1, match.p2];
      players.forEach(p => {
        const row = document.createElement('div');
        row.className = 'bracket-player' + (p && match.winner === p ? ' winner' : '');
        const dot = document.createElement('span');
        dot.className = 'bp-dot';
        dot.style.background = p?.color ?? '#333';
        const name = document.createElement('span');
        name.textContent = p ? (p.charName ?? p.weaponId ?? '?') : '—';
        row.appendChild(dot);
        row.appendChild(name);
        div.appendChild(row);
      });

      if (isDone && match.bo3Wins) {
        const sc = document.createElement('div');
        sc.className = 'bracket-score';
        sc.textContent = `${match.bo3Wins[0]} – ${match.bo3Wins[1]}`;
        div.appendChild(sc);
      }
      col.appendChild(div);
    });
    container.appendChild(col);
  });

  // Champion display
  if (t.completed) {
    const lastRound = t.rounds[t.rounds.length - 1];
    const champion  = lastRound[0]?.winner;
    if (champion) {
      const champDiv = document.createElement('div');
      champDiv.className = 'bracket-round';
      champDiv.innerHTML = `
        <div class="bracket-round-label">Champion</div>
        <div class="bracket-match current">
          <div class="bracket-player winner" style="color:${champion.color};font-size:14px;font-weight:900;padding:8px 4px">
            <span class="bp-dot" style="background:${champion.color}"></span>
            ${champion.charName ?? champion.weaponId}
          </div>
        </div>`;
      container.appendChild(champDiv);
    }
    document.getElementById('nextMatchBtn').disabled = true;
    document.getElementById('nextMatchBtn').textContent = 'Tournament Over';
  } else {
    document.getElementById('nextMatchBtn').disabled = false;
    document.getElementById('nextMatchBtn').textContent = '⚔️ Fight Next Match';
  }
}

function buildTournamentSetup() {
  if (!state.tournament) state.tournament = { size: 16, selectedFighters: [], mode: '1v1' };
  const t       = state.tournament;
  const size    = t.size ?? 16;
  const tmode   = t.mode ?? '1v1';
  const is2v2   = tmode === '2v2';
  // In 2v2 mode, size = number of TEAMS, so actual fighter slots = size * 2
  const slotCount = is2v2 ? size * 2 : size;
  if (!t.selectedFighters) t.selectedFighters = [];

  // Sync tmode button visual state
  document.querySelectorAll('[data-tmode]').forEach(b => b.classList.toggle('sel', b.dataset.tmode === tmode));

  const roster   = JSON.parse(localStorage.getItem('cgRoster') ?? '[]');
  const selected = t.selectedFighters;  // array of roster indices
  const selCount = selected.length;
  const full     = selCount >= slotCount;

  // ── Header counter ──
  const slotInfo = document.getElementById('t-slot-info');
  if (slotInfo) {
    const bots = Math.max(0, slotCount - selCount);
    slotInfo.textContent = `(${selCount} / ${slotCount} selected${bots > 0 ? ` · ${bots} bot${bots>1?'s':''}` : ''}${is2v2 ? ' · 2v2 mode' : ''})`;
    slotInfo.style.color = selCount >= slotCount ? '#44bb77' : '#556';
  }

  // ── Roster cards ──
  const list = document.getElementById('t-roster-list');
  list.innerHTML = '';

  if (roster.length === 0) {
    const empty = document.createElement('div');
    empty.className = 't-roster-empty';
    empty.textContent = 'No Radosers yet — create some first!';
    list.appendChild(empty);
  } else {
    roster.forEach((r, i) => {
      const isSel    = selected.includes(i);
      const isLocked = !isSel && full;
      const card = document.createElement('div');
      card.className = 't-roster-card' +
        (isSel ? ' selected' : '') +
        (isLocked ? ' full-not-selected' : '');

      const wIcon = WEAPON_DEFS.find(d => d.id === r.weapon)?.icon ?? '';
      card.innerHTML = `
        <span class="t-slot-dot" style="background:${r.color ?? '#888'}"></span>
        <span class="t-card-name" style="color:${r.color ?? '#aac'}">${r.raceEmoji ?? ''} ${r.name ?? `Fighter ${i+1}`}</span>
        <span style="font-size:10px;color:#556">${wIcon} ${r.weapon ?? ''}</span>
        <span class="t-card-check">${isSel ? '✓' : ''}</span>
      `;

      if (!isLocked) {
        card.addEventListener('click', () => {
          if (isSel) {
            const idx = selected.indexOf(i);
            if (idx >= 0) selected.splice(idx, 1);
          } else {
            selected.push(i);
          }
          buildTournamentSetup();
        });
      }
      list.appendChild(card);
    });
  }

  // ── Lineup preview (selected + bots) ──
  const summary = document.getElementById('t-slot-summary');
  if (summary) {
    summary.innerHTML = '';
    // Selected Radosers dots
    selected.forEach(idx => {
      const r = roster[idx];
      if (!r) return;
      const dot = document.createElement('span');
      dot.className = 't-summary-dot';
      dot.style.cssText = `background:${r.color ?? '#888'};box-shadow:0 0 4px ${r.color ?? '#888'}88`;
      dot.title = r.name ?? `Fighter ${idx+1}`;
      summary.appendChild(dot);
    });
    // Bot slots
    const bots = Math.max(0, slotCount - selCount);
    if (bots > 0) {
      const botLabel = document.createElement('span');
      botLabel.className = 't-summary-bot';
      botLabel.textContent = `+ ${bots} bot${bots > 1 ? 's' : ''}`;
      summary.appendChild(botLabel);
    }
  }

  // ── Start button ──
  const startBtn = document.getElementById('tStartBtn');
  if (startBtn) startBtn.disabled = false;
}

// ── 2v2 Tournament ──
function createTournament2v2(numTeams, roster) {
  // Pair fighters into teams of 2
  const fighters = [...roster];
  while (fighters.length < numTeams * 2) fighters.push(makeBotFighter(fighters.length));
  shuffle(fighters);

  // Build teams
  const TC = ['#00ddff','#ff8833','#44ff88','#ff44aa','#ffdd00','#aa44ff','#ff6644','#44aaff'];
  const teams = [];
  for (let i = 0; i < numTeams; i++) {
    const f0 = fighters[i * 2], f1 = fighters[i * 2 + 1];
    teams.push({
      charName: `${f0.charName ?? 'Bot'} & ${f1.charName ?? 'Bot'}`,
      color: TC[i % TC.length],
      fighters: [f0, f1],
      isTeam: true,
    });
  }
  shuffle(teams);

  // Build bracket
  const rounds = [];
  let prev = teams;
  while (prev.length > 1) {
    const round = [];
    for (let i = 0; i < prev.length; i += 2) {
      round.push({ p1: prev[i], p2: prev[i + 1], winner: null, bo3Wins: [0, 0] });
    }
    rounds.push(round);
    prev = new Array(round.length).fill(null);
  }
  return { numTeams, rounds, currentRound: 0, currentMatch: 0, completed: false };
}

function getNextTournamentMatch2v2() {
  const t = state.tournament2v2;
  if (!t || t.completed) return null;
  return t.rounds[t.currentRound]?.[t.currentMatch] ?? null;
}

function recordTournamentMatchResult2v2(winTeamObj) {
  const t = state.tournament2v2;
  if (!t) return;
  const round = t.rounds[t.currentRound];
  const match = round[t.currentMatch];
  match.winner = winTeamObj;

  if (t.currentRound + 1 < t.rounds.length) {
    const nextRound = t.rounds[t.currentRound + 1];
    const nextIdx   = Math.floor(t.currentMatch / 2);
    const slot      = t.currentMatch % 2 === 0 ? 'p1' : 'p2';
    nextRound[nextIdx][slot] = winTeamObj;
  }

  t.currentMatch++;
  if (t.currentMatch >= round.length) {
    t.currentRound++;
    t.currentMatch = 0;
    if (t.currentRound >= t.rounds.length) t.completed = true;
  }
  renderBracket2v2();
}

function renderBracket2v2() {
  const t = state.tournament2v2;
  const container = document.getElementById('bracket-content');
  const titleEl   = document.getElementById('bracket-title');
  if (!container || !t) return;

  titleEl.textContent = t.completed ? '🏆 2v2 Tournament Complete!' : '🏆 2v2 Tournament Bracket';
  container.innerHTML = '';

  const roundNames = ['Round 1','Round 2','Quarter-Finals','Semi-Finals','Final'];
  const totalRounds = t.rounds.length;

  t.rounds.forEach((round, ri) => {
    const col = document.createElement('div');
    col.className = 'bracket-round';
    const label = document.createElement('div');
    label.className = 'bracket-round-label';
    const labelIdx = totalRounds - 1 - ri;
    label.textContent = roundNames[Math.min(labelIdx, roundNames.length - 1)] ?? `Round ${ri + 1}`;
    col.appendChild(label);

    round.forEach((match, mi) => {
      const isCurrent = ri === t.currentRound && mi === t.currentMatch && !t.completed;
      const isDone    = match.winner !== null;
      const div = document.createElement('div');
      div.className = 'bracket-match' + (isCurrent ? ' current' : '') + (isDone ? ' done' : '');

      [match.p1, match.p2].forEach(team => {
        const row = document.createElement('div');
        row.className = 'bracket-player' + (team && match.winner === team ? ' winner' : '');
        if (team) {
          const tc = team.color ?? '#888';
          row.innerHTML = `
            <span class="bp-dot" style="background:${tc}"></span>
            <span style="font-size:11px;font-weight:900;color:${tc}">${team.charName ?? '?'}</span>`;
          if (team.fighters) {
            const sub = document.createElement('div');
            sub.style.cssText = 'font-size:9px;color:#556;padding-left:16px;line-height:1.5';
            sub.textContent = team.fighters.map(f => f.charName ?? f.weaponId ?? '?').join(' + ');
            row.appendChild(sub);
          }
        } else {
          row.innerHTML = '<span class="bp-dot" style="background:#333"></span><span>—</span>';
        }
        div.appendChild(row);
      });

      if (isDone && match.bo3Wins) {
        const sc = document.createElement('div');
        sc.className = 'bracket-score';
        sc.textContent = `${match.bo3Wins[0]} – ${match.bo3Wins[1]}`;
        div.appendChild(sc);
      }
      col.appendChild(div);
    });
    container.appendChild(col);
  });

  if (t.completed) {
    const champion = t.rounds[t.rounds.length - 1][0]?.winner;
    if (champion) {
      const champDiv = document.createElement('div');
      champDiv.className = 'bracket-round';
      champDiv.innerHTML = `
        <div class="bracket-round-label">Champions</div>
        <div class="bracket-match current">
          <div class="bracket-player winner" style="color:${champion.color};font-size:13px;font-weight:900;padding:8px 4px">
            <span class="bp-dot" style="background:${champion.color}"></span>
            ${champion.charName ?? '?'}
          </div>
        </div>`;
      container.appendChild(champDiv);
    }
    document.getElementById('nextMatchBtn').disabled = true;
    document.getElementById('nextMatchBtn').textContent = 'Tournament Over';
  } else {
    document.getElementById('nextMatchBtn').disabled = false;
    document.getElementById('nextMatchBtn').textContent = '⚔️ Fight Next Match';
  }
}

// Select-all / clear buttons
document.addEventListener('click', e => {
  if (e.target.id === 'tSelectAllBtn') {
    if (!state.tournament) state.tournament = { size: 16, selectedFighters: [], mode: '1v1' };
    const roster = JSON.parse(localStorage.getItem('cgRoster') ?? '[]');
    const size   = state.tournament.size ?? 16;
    const tmode  = state.tournament.mode ?? '1v1';
    const slotCount = tmode === '2v2' ? size * 2 : size;
    // Select as many as possible up to slotCount
    state.tournament.selectedFighters = roster.slice(0, slotCount).map((_, i) => i);
    buildTournamentSetup();
  }
  if (e.target.id === 'tClearBtn') {
    if (state.tournament) state.tournament.selectedFighters = [];
    buildTournamentSetup();
  }
});

// ============================================================
// UI / SCREENS
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  // Stop the game loop only when leaving the game screen (not when navigating to it)
  if (id !== 'game') stopGame();
}

// Build fighters selection panel (multi-ball)
function buildFightersPanel() {
  const panel = document.getElementById('fighters-panel');
  panel.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'fighters-header';
  header.innerHTML = `<span>Fighters <strong>(${state.fighters.length})</strong></span><span style="color:#444">${state.fighters.length}/12</span>`;
  panel.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'fighters-grid';

  state.fighters.forEach((fighter, i) => {
    const card = document.createElement('div');
    card.className = 'fighter-card';
    card.style.borderColor = fighter.color + '66';

    // Top: dot + name
    const top = document.createElement('div');
    top.className = 'fighter-card-top';
    const dot = document.createElement('div');
    dot.className = 'ball-dot';
    dot.style.background = fighter.color;
    dot.style.color = fighter.color;
    const name = document.createElement('div');
    name.className = 'fighter-name';
    name.style.color = fighter.color;
    name.textContent = fighter.charName
      ? `${fighter.charEmoji ?? ''} ${fighter.charName}`
      : `Ball ${i + 1}`;
    top.appendChild(dot);
    top.appendChild(name);
    card.appendChild(top);

    // Weapon grid (icon-only buttons with tooltip)
    const wgrid = document.createElement('div');
    wgrid.className = 'fighter-card-weapons';
    if (fighter.charName) {
      // Radoser: show fixed weapon, no change allowed
      const fixedWep = WEAPON_DEFS.find(d => d.id === fighter.weaponId);
      const label = document.createElement('div');
      label.style.cssText = 'grid-column:1/-1;font-size:10px;color:#888;text-align:center;padding:2px 0;';
      label.textContent = fixedWep ? `${fixedWep.icon} ${fixedWep.name}` : fighter.weaponId;
      wgrid.appendChild(label);
    } else {
      WEAPON_DEFS.forEach(def => {
        const btn = document.createElement('button');
        btn.className = 'wc-btn' + (def.id === fighter.weaponId ? ' sel' : '');
        btn.textContent = def.icon;
        btn.title = def.name;
        btn.addEventListener('click', () => {
          fighter.weaponId = def.id;
          wgrid.querySelectorAll('.wc-btn').forEach(b => b.classList.remove('sel'));
          btn.classList.add('sel');
          sfxShoot();
        });
        wgrid.appendChild(btn);
      });
    }
    card.appendChild(wgrid);

    // Remove button (only when > 2 fighters)
    if (state.fighters.length > 2) {
      const rem = document.createElement('button');
      rem.className = 'remove-btn';
      rem.textContent = '✕';
      rem.title = 'Remove';
      rem.addEventListener('click', () => {
        state.fighters.splice(i, 1);
        buildFightersPanel();
        sfxShoot();
      });
      card.appendChild(rem);
    }

    grid.appendChild(card);
  });

  // Add fighter card (max 12)
  if (state.fighters.length < 12) {
    const addCard = document.createElement('button');
    addCard.className = 'add-fighter-card';
    addCard.innerHTML = `<span style="font-size:20px">+</span><span>${state.fighters.length}/12</span>`;
    addCard.addEventListener('click', () => {
      showFighterPicker();
    });
    grid.appendChild(addCard);
  }

  panel.appendChild(grid);
  updateStartBtn();
}

// Arena selection
document.querySelectorAll('.a-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.a-btn').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    state.arenaId = btn.dataset.a;
  });
});

// Start button — disabled until ≥ 2 fighters
function updateStartBtn() {
  const btn = document.getElementById('startBtn');
  const enough = state.fighters.length >= 2;
  btn.disabled = !enough;
  btn.title = enough ? '' : 'Add at least 2 fighters to start';
}

document.getElementById('startBtn').addEventListener('click', () => {
  if (state.fighters.length < 2) return;
  state.matchMode = '1v1';
  state.teamIds = [];
  state.tournament2v2 = null;
  showScreen('game');
  startGame();
});

updateStartBtn();

// Pause
document.getElementById('pauseBtn').addEventListener('click', () => {
  state.paused = !state.paused;
  document.getElementById('pauseBtn').textContent = state.paused ? '▶ Resume' : '⏸ Pause';
});

// Menu
document.getElementById('menuBtn').addEventListener('click', () => {
  showScreen('menu');
  buildFightersPanel();
});

// Gravity
document.getElementById('gravBtn').addEventListener('click', () => {
  state.gravity = !state.gravity;
  document.getElementById('gravBtn').textContent = `🌍 Gravity: ${state.gravity ? 'On' : 'Off'}`;
});

// Zoom
const ZOOM_LEVELS = [1.0, 0.85, 0.70, 0.55];
let zoomIdx = 0;
const zoomWrapper = document.getElementById('game-zoom-wrapper');
document.getElementById('zoomBtn').addEventListener('click', () => {
  zoomIdx = (zoomIdx + 1) % ZOOM_LEVELS.length;
  const z = ZOOM_LEVELS[zoomIdx];
  zoomWrapper.style.transform = `scale(${z})`;
  document.getElementById('zoomBtn').textContent = `🔍 ${Math.round(z * 100)}%`;
});

// Speed
const speeds = [1, 2, 3, 5];
let speedIdx = 0;
document.getElementById('speedBtn').addEventListener('click', () => {
  speedIdx = (speedIdx + 1) % speeds.length;
  state.speed = speeds[speedIdx];
  document.getElementById('speedBtn').textContent = `⚡ Speed: ${state.speed}x`;
});

// Spacebar = pause
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && state.running) {
    e.preventDefault();
    state.paused = !state.paused;
    document.getElementById('pauseBtn').textContent = state.paused ? '▶ Resume' : '⏸ Pause';
  }
});

// Result buttons
document.getElementById('rematchBtn').addEventListener('click', () => {
  state.bo3 = null;
  showScreen('game');
  startGame();
});
document.getElementById('menuBtnR').addEventListener('click', () => {
  state.bo3 = null;
  state.tournament = null;
  state.tournament2v2 = null;
  state.matchMode = '1v1';
  state.teamIds = [];
  showScreen('menu');
  buildFightersPanel();
});
document.getElementById('nextGameBtn').addEventListener('click', () => {
  // Continue BO3 — keep same fighters, random arena if tournament
  if (state.tournament || state.tournament2v2) state.arenaId = randomArena();
  showScreen('game');
  startGame();
});
document.getElementById('bracketBtn').addEventListener('click', () => {
  if (state.tournament2v2 && state.matchMode === '2v2') {
    renderBracket2v2();
  } else {
    renderBracket();
  }
  showScreen('bracket');
});

// Stats Log button + tabs
document.getElementById('statsLogBtn')?.addEventListener('click', showStatsModal);
document.getElementById('stats-log-close-btn')?.addEventListener('click', () => {
  document.getElementById('stats-log-modal').classList.remove('open');
});
document.getElementById('stats-log-modal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('stats-log-modal'))
    document.getElementById('stats-log-modal').classList.remove('open');
});
document.querySelectorAll('.sc-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    _activeChart = btn.dataset.chart;
    document.querySelectorAll('.sc-tab').forEach(t => t.classList.toggle('sel', t === btn));
    drawStatsChart(_activeChart);
  });
});

// Battle Log button
document.getElementById('battleLogBtn')?.addEventListener('click', showBattleLogModal);
document.getElementById('battle-log-close-btn')?.addEventListener('click', () => {
  document.getElementById('battle-log-modal').classList.remove('open');
});
document.getElementById('battle-log-modal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('battle-log-modal'))
    document.getElementById('battle-log-modal').classList.remove('open');
});

// Live log collapse toggle
document.getElementById('live-log-header')?.addEventListener('click', () => {
  const wrap = document.getElementById('live-log-wrap');
  const toggle = document.getElementById('live-log-toggle');
  wrap.classList.toggle('collapsed');
  if (toggle) toggle.textContent = wrap.classList.contains('collapsed') ? '▼' : '▲';
});

// Tournament button (menu)
document.getElementById('tournamentBtn').addEventListener('click', () => {
  if (!state.tournament) state.tournament = { size: 8 };
  buildTournamentSetup();
  showScreen('tournament');
});

// Tournament size buttons
document.querySelectorAll('[data-size]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-size]').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    if (!state.tournament) state.tournament = {};
    state.tournament.size = parseInt(btn.dataset.size);
    buildTournamentSetup();
  });
});

// Mode toggle buttons (1v1 / 2v2)
document.addEventListener('click', e => {
  if (e.target.dataset.tmode) {
    if (!state.tournament) state.tournament = { size: 16, selectedFighters: [], mode: '1v1' };
    state.tournament.mode = e.target.dataset.tmode;
    document.querySelectorAll('[data-tmode]').forEach(b => b.classList.toggle('sel', b.dataset.tmode === state.tournament.mode));
    buildTournamentSetup();
  }
});

// BO format buttons
document.querySelectorAll('[data-bo]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-bo]').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    if (!state.tournament) state.tournament = {};
    state.tournament.bo = parseInt(btn.dataset.bo);
  });
});

// Tournament start
document.getElementById('tStartBtn').addEventListener('click', () => {
  const roster   = JSON.parse(localStorage.getItem('cgRoster') ?? '[]');
  const t        = state.tournament ?? {};
  const size     = t.size ?? 16;
  const tmode    = t.mode ?? '1v1';
  const selIdx   = t.selectedFighters ?? [];
  // Convert cgRoster entries → fighter objects
  const bo = t.bo ?? 3;   // preserve chosen format before createTournament overwrites state
  const participants = selIdx.map(i => roster[i]).filter(Boolean).map(rosterToFighter);
  if (tmode === '2v2') {
    state.tournament2v2 = createTournament2v2(size, participants);
    state.tournament2v2.bo = bo;
    // Keep tournament reference for menu-back etc but clear 1v1 tournament
    state.tournament = null;
    renderBracket2v2();
  } else {
    state.tournament2v2 = null;
    state.tournament = createTournament(size, participants);
    state.tournament.bo = bo;  // restore bo into new tournament object
    renderBracket();
  }
  showScreen('bracket');
});
document.getElementById('tBackBtn').addEventListener('click', () => {
  state.tournament = null;
  showScreen('menu');
  buildFightersPanel();
});

// Bracket → Next match
document.getElementById('nextMatchBtn').addEventListener('click', () => {
  // 2v2 tournament
  if (state.tournament2v2 && !state.tournament2v2.completed) {
    const match = getNextTournamentMatch2v2();
    if (!match || !match.p1 || !match.p2) return;
    const bo = state.tournament2v2?.bo ?? 3;
    // 4 fighters: team0[0], team0[1], team1[0], team1[1]
    state.fighters  = [...match.p1.fighters, ...match.p2.fighters];
    state.teamIds   = [0, 0, 1, 1];
    state.matchMode = '2v2';
    state.arenaId   = randomArena();
    state.bo3 = {
      wins: [0, 0],
      gameNum: 1,
      fighters: [match.p1, match.p2],  // team objects
      winsNeeded: Math.ceil(bo / 2),
    };
    updateBO3Display();
    showScreen('game');
    startGame();
    return;
  }
  // 1v1 tournament
  const match = getNextTournamentMatch();
  if (!match) return;
  const bo = state.tournament?.bo ?? 3;
  state.fighters  = [match.p1, match.p2];
  state.matchMode = '1v1';
  state.teamIds   = [];
  state.arenaId   = randomArena();
  state.bo3 = { wins: [0, 0], gameNum: 1, fighters: [match.p1, match.p2], winsNeeded: Math.ceil(bo / 2) };
  updateBO3Display();
  showScreen('game');
  startGame();
});
document.getElementById('bracketMenuBtn').addEventListener('click', () => {
  state.tournament = null;
  state.tournament2v2 = null;
  state.bo3 = null;
  showScreen('menu');
  buildFightersPanel();
});

// ============================================================
// INIT
// ============================================================
buildFightersPanel();

// ============================================================
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
  { id:'gnome',     name:'Gnome',           emoji:'🧙', weight:6.5,  subKey:null,          trait:null },
  { id:'human',     name:'Human',           emoji:'👤', weight:6.5,  subKey:null,          trait:null },
  { id:'dwarf',     name:'Dwarf',           emoji:'⛏️', weight:6.5,  subKey:null,          trait:null },
  { id:'skeleton',  name:'Skeleton',        emoji:'💀', weight:5.25, subKey:'boneLineage',  trait:'2 PvP wins → Lich (IQ fixed 8). 4 wins → Lich King (+1 all stats). Immune to AIDS.' },
  { id:'troll',     name:'Troll',           emoji:'🧌', weight:5.25, subKey:'trollType',   trait:null },
  { id:'orc',       name:'Orc',             emoji:'🗡️', weight:5.25, subKey:null,          trait:'Win: +2 lowest stat. Lose: -3 highest stat.' },
  { id:'giant',     name:'Giant',           emoji:'🏔️', weight:4.0,  subKey:null,          trait:'After stat roll: if IQ>STR → +5 IQ/-5 STR; if STR>IQ → +5 STR/-5 IQ; if equal → +3 both.' },
  { id:'dragon',    name:'Dragon',          emoji:'🐉', weight:4.0,  subKey:'dragonType',  trait:null },
  { id:'angel',     name:'Angel',           emoji:'👼', weight:3.5,  subKey:'angelRank',   trait:'Starts with Archetype "Pacifist" (will receive one more Archetype).' },
  { id:'primordial',name:'Primordial Being',emoji:'🌌', weight:3.5,  subKey:'elementalWheel', trait:'Each Combat win → receive Elemental Wheel again.' },
  { id:'demon',     name:'Demon',           emoji:'😈', weight:2.5,  subKey:'demonSin',    trait:null },
  { id:'god',       name:'God',             emoji:'✨', weight:2.5,  subKey:'godGift',     trait:null },
];

const CG_SUBRACES = {
  goblinHorde: [
    { label:'×1',      weight:5,  desc:'-1 all stats. +1 all stats per PvP win.' },
    { label:'×50',     weight:10, desc:'-1 all stats.' },
    { label:'×100',    weight:25, desc:"You're just a Goblin." },
    { label:'×1,000',  weight:20, desc:'+1 Strength.' },
    { label:'×5,000',  weight:15, desc:'+1 Strength, +1 Speed.' },
    { label:'×10,000', weight:15, desc:'+2 Strength, +2 Speed.' },
    { label:'×100,000',weight:10, desc:'+1 all stats, 1 Gear, guaranteed Unique Weapon.' },
  ],
  trollType: [
    { label:'Regular',  weight:42, desc:'Just a Troll.' },
    { label:'Ice',      weight:30, desc:'In combat: enemy -2 Speed.' },
    { label:'Mountain', weight:25, desc:'+3 Durability.' },
    { label:'Lich',     weight:3,  desc:'Gain 1 Power from a dead player after each battle.' },
  ],
  dragonType: [
    { label:'Crimson',  weight:9,  desc:'+2 Base IQ, +1 Base Durability.' },
    { label:'Stone',    weight:9,  desc:'+2 Base Durability.' },
    { label:'Amethyst', weight:9,  desc:'-1 all stats, +4 Powers.' },
    { label:'Ancient',  weight:9,  desc:"In combat: disable opponent's weapon." },
    { label:'Undead',   weight:9,  desc:'1 Summon, +1 Durability.' },
    { label:'Zephyrian',weight:9,  desc:'1 Power, 1 Quirk.' },
    { label:'Tideborn', weight:9,  desc:'+3 Base Strength.' },
    { label:'Thunder',  weight:10, desc:'[PvE] +1 starting point. No penalty on loss.' },
    { label:'Flame',    weight:12, desc:'1 Power, +2 to lowest stat.' },
    { label:'Ice',      weight:10, desc:'+1 Char Dev, +2 to lowest stat.' },
    { label:'Chaos',    weight:5,  desc:'3 Quirks.' },
  ],
  angelRank: [
    { label:'Angels',        weight:40, desc:'Nothing special.' },
    { label:'Archangels',    weight:21, desc:'+2 Speed, +1 Martial Arts.' },
    { label:'Principalities',weight:9,  desc:'After combat: +2 to lowest stat.' },
    { label:'Powers',        weight:8,  desc:'Archetype "Paladin", +2 MA.' },
    { label:'Virtues',       weight:7,  desc:'Cannot be debuffed.' },
    { label:'Dominions',     weight:6,  desc:'2 Powers.' },
    { label:'Ophanim',       weight:5,  desc:'+1 all stats.' },
    { label:'Cherubim',      weight:4,  desc:'+2 all stats.' },
  ],
  elementalWheel: [
    { label:'Air',   weight:25, desc:'Power "Blowing Leaves", +1 Speed, +1 to lowest stat.' },
    { label:'Water', weight:25, desc:'Power "Water Breathing", +1 BIQ, +1 to highest stat.' },
    { label:'Fire',  weight:25, desc:'Power "Fire Control", +1 MA, +1 Power.' },
    { label:'Earth', weight:25, desc:'Power "Earth-Shaking", +1 Strength, +1 Quirk.' },
  ],
  demonSin: [
    { label:'Lucifer',    weight:14.28, desc:'Archetype "Egoist". Power wheel maxes at 4.' },
    { label:'Beelzebub',  weight:14.28, desc:'Quirk "Slow Metabolism". 1 random stat maxes at 10.' },
    { label:'Leviathan',  weight:14.28, desc:'6 players gain Gear "Leviathan\'s Mark". When all die: +6 lowest stat.' },
    { label:'Behemoth',   weight:14.28, desc:'Lose: 1 random stat → 0. Win: 1 random stat +2.' },
    { label:'Mammon',     weight:14.28, desc:'-2 all stats. Win: 2 PvP rewards.' },
    { label:'Belphegor',  weight:14.28, desc:'First 2 rounds: 66% no point on win. +1 starting point.' },
    { label:'Asmodeus',   weight:14.28, desc:'Power "AIDS" (incurable). vs AIDS opponent: +1 starting point.' },
  ],
  godGift: [
    { label:'Cursed Sword',       weight:30, desc:'-1 all stats.' },
    { label:'War',                weight:7,  desc:'+3 Strength.' },
    { label:'Love',               weight:7,  desc:'1 Lover, 50% Archetype "Femboy".' },
    { label:'Time',               weight:7,  desc:'+3 Speed.' },
    { label:'Fortune',            weight:7,  desc:'3× Gear "Golden Coin".' },
    { label:'Secret Evil',        weight:7,  desc:'In combat: +2 to both highest and lowest stats.' },
    { label:'Knowledge',          weight:7,  desc:'+3 IQ.' },
    { label:'Arts & Magic',       weight:7,  desc:'2 Powers.' },
    { label:'Wilderness & Sea',   weight:7,  desc:'1 Summon wheel, 1 Elemental wheel.' },
    { label:'Creation',           weight:7,  desc:"1 Creator's Favor." },
    { label:'Moon',               weight:7,  desc:'Archetype "Pacifist" (+1 more Archetype).' },
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

const STAT_DISPLAY = [
  { key:'strength',  label:'STR', emoji:'💪' },
  { key:'speed',     label:'SPD', emoji:'⚡' },
  { key:'durability',label:'DUR', emoji:'🛡️' },
  { key:'iq',        label:'IQ',  emoji:'🧠' },
  { key:'battleiq',  label:'BIQ', emoji:'⚔️' },
  { key:'ma',        label:'MA',  emoji:'🥋' },
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

// ============================================================
// SPIN WHEEL
// ============================================================
class SpinWheel {
  constructor(canvasEl, items) {
    this.canvas = canvasEl;
    this.ctx = this.canvas.getContext('2d');
    this.items = items.map((it, i) => ({ ...it, color: it.color || wColor(i) }));
    this.rotation = -(Math.PI / 2); // start at top
    this.spinning = false;
    this.total = items.reduce((s, it) => s + it.weight, 0);
    this._draw();
  }
  _draw() {
    const ctx = this.ctx, W = this.canvas.width, cx = W/2, cy = W/2, R = cx - 8;
    ctx.clearRect(0, 0, W, W);
    let a = this.rotation;
    for (const it of this.items) {
      const slice = (it.weight / this.total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a, a + slice); ctx.closePath();
      ctx.fillStyle = it.color; ctx.fill();
      ctx.strokeStyle = '#080818'; ctx.lineWidth = 1.5; ctx.stroke();
      const mid = a + slice / 2, lr = R * 0.68;
      ctx.save();
      ctx.translate(cx + Math.cos(mid)*lr, cy + Math.sin(mid)*lr);
      ctx.rotate(mid + Math.PI/2);
      ctx.fillStyle = '#fff';
      const fs = Math.max(9, Math.min(13, Math.floor(290 / this.items.length)));
      ctx.font = `bold ${fs}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let lbl = it.label.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
      if (lbl.length > 11) lbl = lbl.slice(0,10)+'…';
      ctx.fillText(lbl, 0, 0); ctx.restore();
      a += slice;
    }
    // Hub
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2);
    ctx.fillStyle = '#0a0a1e'; ctx.fill();
    ctx.strokeStyle = '#4488ff'; ctx.lineWidth = 2.5; ctx.stroke();
  }
  spin(onDone) {
    if (this.spinning) return;
    this.spinning = true;
    // Determine winner
    let r = Math.random() * this.total;
    let winner = this.items[0], cumAngle = 0;
    for (const it of this.items) {
      const slice = (it.weight / this.total) * Math.PI * 2;
      r -= it.weight;
      if (r <= 0) { winner = it; break; }
      cumAngle += slice;
    }
    // Recalculate cumAngle for winner
    cumAngle = 0;
    for (const it of this.items) {
      const slice = (it.weight / this.total) * Math.PI * 2;
      if (it === winner) { cumAngle += slice/2; break; }
      cumAngle += slice;
    }
    // Target: winner's midpoint should be at top (-π/2)
    // When rotation = R, first segment starts at R. Top pointer is at -π/2.
    // Segment mid is at R + cumAngle. We want R + cumAngle ≡ -π/2 (mod 2π)
    // So R = -π/2 - cumAngle
    const targetRot = -Math.PI/2 - cumAngle;
    const curNorm = ((this.rotation % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    const tNorm   = ((targetRot % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    let delta = tNorm - curNorm; if (delta <= 0) delta += Math.PI*2;
    const totalSpin = Math.PI*2 * (6 + Math.floor(Math.random()*5)) + delta;
    const dur = 3800 + Math.random()*1200, t0 = performance.now();
    const startRot = this.rotation;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1-t, 4);
      this.rotation = startRot + totalSpin * ease;
      this._draw();
      if (t < 1) { requestAnimationFrame(tick); }
      else { this.spinning = false; onDone(winner, this.items.indexOf(winner)); }
    };
    requestAnimationFrame(tick);
  }
}

// ============================================================
// CHARGEN FLOW
// ============================================================
const CHARGEN_STEPS = ['name','race','subrace','str','spd','dur','iq','biq','ma','hasweapon','weapon','done'];
let cgState = null;
let cgRoster = JSON.parse(localStorage.getItem('cgRoster') || '[]');
let quickCreateMode = false;
let quickCreateName = ''; // custom name from prompt

function initChargen() {
  cgState = {
    step: 'name', name: '', race: null, subrace: null,
    stats: { strength:null, speed:null, durability:null, iq:null, battleiq:null, ma:null },
    hasWeapon: null,  // true = armed, false = unarmed (fists)
    weapon: null
  };
  showScreen('chargen');
  renderCgDots();
  renderCgStep();
}

function renderCgDots() {
  const row = document.getElementById('cgDots');
  const steps = ['name','race','subrace','str','spd','dur','iq','biq','ma','hasweapon','weapon','done'];
  const cur = steps.indexOf(cgState.step);
  row.innerHTML = steps.map((s,i) =>
    `<div class="cg-dot ${i < cur ? 'done' : i === cur ? 'active' : ''}"></div>`
  ).join('');
}

function renderCgStep() {
  renderCgDots();
  const box = document.getElementById('cg-content');
  box.innerHTML = '';
  const s = cgState.step;
  if (s === 'name')    { cgRenderName(box); return; }
  if (s === 'race') {
    cgRenderSpin(box, 'Choose Race', CG_RACES.map((r,i) => ({ label: r.emoji+' '+r.name, weight: r.weight, color: wColor(i) })), (w, idx) => { cgState.race = CG_RACES[idx]; advanceCg(); });
    // Debug: quick-pick buttons
    const dbg = document.createElement('div');
    dbg.style.cssText = 'margin-top:10px;padding:8px 12px;background:#1a1a2e;border:1px dashed #ff6b35;border-radius:8px;';
    dbg.innerHTML = `<div style="font-size:11px;color:#ff6b35;margin-bottom:6px;letter-spacing:1px;">DEBUG — Pick Race</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;">${CG_RACES.map((r,i) =>
        `<button onclick="cgState.race=CG_RACES[${i}];advanceCg();" style="background:#2a2a4a;border:1px solid #444;border-radius:5px;color:#ccc;cursor:pointer;font-size:11px;padding:3px 8px;">${r.emoji} ${r.name}</button>`
      ).join('')}</div>`;
    box.appendChild(dbg);
    return;
  }
  if (s === 'subrace') {
    const sr = CG_SUBRACES[cgState.race.subKey];
    if (!sr) { advanceCg(); return; }
    cgRenderSpin(box, `${cgState.race.emoji} Sub-Race`, sr.map((r,i) => ({ label:r.label, weight:r.weight, color:wColor(i) })), (w,idx) => { cgState.subrace = { ...sr[idx] }; advanceCg(); });
    return;
  }
  const STAT_STEPS = { str:'strength', spd:'speed', dur:'durability', iq:'iq', biq:'battleiq', ma:'ma' };
  if (s === 'iq' && cgState.race?.id === 'skeleton') {
    cgState.stats.iq = 1;
    advanceCg();
    return;
  }
  if (STAT_STEPS[s]) {
    const sk = STAT_STEPS[s];
    const sd = STAT_DISPLAY.find(x => x.key === sk);
    const raceId = (cgState.race.id === 'skeleton' && cgState.subrace?.raceId)
      ? cgState.subrace.raceId
      : cgState.race.id;
    const weights = CG_STAT_WEIGHTS[sk][raceId] || Array(10).fill(10);
    const items = weights.map((w,i) => ({ label: String(i+1), weight: w, color: STAT_COLORS[i] }));
    cgRenderSpin(box, `${sd.emoji} ${sd.label}`, items, (w,idx) => { cgState.stats[sk] = idx+1; advanceCg(); },
      cgState.stats);
    return;
  }
  if (s === 'hasweapon') {
    const items = [
      { label: '⚔️ Armed',   weight: 80, color: '#44ccff' },
      { label: '✊ Unarmed', weight: 20, color: '#ff8844' },
    ];
    cgRenderSpin(box, '🎰 Has Weapon?', items, (_w, idx) => {
      cgState.hasWeapon = (idx === 0);
      if (!cgState.hasWeapon) cgState.weapon = 'fists'; // skip weapon wheel
      advanceCg();
    });
    return;
  }
  if (s === 'weapon') {
    cgRenderSpin(box, '🗡️ Weapon', CG_WEAPONS_ARMED.map((w,i) => ({ label:w.label, weight:1, color:wColor(i) })), (w,idx) => { cgState.weapon = CG_WEAPONS_ARMED[idx].id; advanceCg(); });
    return;
  }
  if (s === 'done') { cgRenderDone(box); }
}

function advanceCg() {
  const order = ['name','race','subrace','str','spd','dur','iq','biq','ma','hasweapon','weapon','done'];
  let next = order.indexOf(cgState.step) + 1;
  // If unarmed (fists already set), skip the weapon spin wheel
  if (order[next] === 'weapon' && cgState.hasWeapon === false) next++;
  cgState.step = order[Math.min(next, order.length - 1)];
  renderCgStep();
}

function cgRenderName(box) {
  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label">Step 1 — Enter Character Name</div>
      <div class="cg-name-row">
        <input class="cg-name-input" id="cgNameInput" placeholder="Enter name..." maxlength="24" value="${cgState.name}" autofocus>
        <button class="cg-random-btn" id="cgRandomName" title="Random hero name">🎲</button>
      </div>
      <div class="cg-nav">
        <button class="cg-btn" id="cgBackMenu">← Back</button>
        <button class="cg-btn primary" id="cgNameNext">Next →</button>
      </div>
    </div>`;
  document.getElementById('cgRandomName').onclick = () => {
    const input = document.getElementById('cgNameInput');
    input.value = getRandomGameName();
    input.style.borderColor = '#3a3a6a';
    input.focus();
  };
  document.getElementById('cgNameNext').onclick = () => {
    const v = document.getElementById('cgNameInput').value.trim();
    if (!v) { document.getElementById('cgNameInput').style.borderColor = '#ff4455'; return; }
    cgState.name = v; advanceCg();
  };
  document.getElementById('cgNameInput').onkeydown = e => { if (e.key === 'Enter') document.getElementById('cgNameNext').click(); };
  document.getElementById('cgBackMenu').onclick = () => { showScreen('menu'); buildFightersPanel(); renderRoster(); };
  // Quick create: auto-fill name (custom or random) and advance
  if (quickCreateMode) {
    document.getElementById('cgNameInput').value = quickCreateName || getRandomGameName();
    setTimeout(() => document.getElementById('cgNameNext').click(), 400);
  }
}

function cgRenderSpin(box, title, items, onResult, currentStats) {
  const hasStats = currentStats && Object.values(currentStats).some(v => v !== null);
  const statsHtml = hasStats ? `<div class="cg-stats-grid">${STAT_DISPLAY.map(sd => {
    const v = currentStats[sd.key];
    const statStep = {strength:'str',speed:'spd',durability:'dur',iq:'iq',battleiq:'biq',ma:'ma'};
    const isActive = cgState.step === statStep[sd.key];
    return `<div class="cg-sc ${isActive?'cg-active':v?'cg-done':''}">
      <div class="cg-sc-lbl">${sd.emoji} ${sd.label}</div>
      <div class="cg-sc-val ${v?'':' cg-pending'}">${v ?? '—'}</div>
    </div>`;
  }).join('')}</div>` : '';

  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label">${title}</div>
      ${statsHtml}
      <div class="spin-wrap">
        <canvas id="spinCanvas" width="360" height="360"></canvas>
        <div class="spin-ptr"></div>
      </div>
      <div id="cgResultBox"></div>
      <div class="cg-nav">
        <button class="spin-btn" id="cgSpinBtn">🎰 SPIN!</button>
      </div>
      <div class="cg-nav" id="cgNextNav" style="display:none">
        <button class="cg-btn primary" id="cgSpinNext">Next →</button>
      </div>
      ${cgState.race ? `<div class="cg-trait">${cgState.race.emoji} <b>${cgState.race.name}</b>${cgState.race.trait ? ' — '+cgState.race.trait : ''}</div>` : ''}
    </div>`;

  const wheel = new SpinWheel(document.getElementById('spinCanvas'), items);
  let lastWinIdx = -1;
  const doSpin = () => {
    document.getElementById('cgSpinBtn').disabled = true;
    document.getElementById('cgNextNav').style.display = 'none';
    wheel.spin((winner, idx) => {
      lastWinIdx = idx;
      document.getElementById('cgResultBox').innerHTML = `<div class="cg-result-box">${winner.label}</div>`;
      document.getElementById('cgNextNav').style.display = 'flex';
      playTone(660, 'sine', 0.4, 0.15, 0.5);
      // Quick create: auto-advance after spin lands
      if (quickCreateMode) setTimeout(() => document.getElementById('cgSpinNext')?.click(), 600);
    });
  };
  document.getElementById('cgSpinBtn').onclick = doSpin;
  document.getElementById('cgSpinNext') && (document.getElementById('cgSpinNext').onclick = () => {
    if (lastWinIdx < 0) return;
    onResult(items[lastWinIdx], lastWinIdx);
  });
  // Quick create: auto-trigger spin after short delay
  if (quickCreateMode) setTimeout(doSpin, 300);
}

function cgRenderDone(box) {
  const r = cgState.race, sr = cgState.subrace, st = cgState.stats;
  const wep = CG_WEAPONS.find(w => w.id === cgState.weapon);
  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label" style="font-size:20px;color:#fff;font-weight:900">${r.emoji} ${cgState.name}</div>
      <div style="color:#7a9ac0;font-size:14px">${r.name}${sr ? ' · '+sr.label : ''}</div>
      <div class="cg-summary">
        <div class="cg-sum-row"><span class="cg-sum-lbl">Weapon</span><span class="cg-sum-val">${wep?.label ?? '—'}</span></div>
        ${sr ? `<div class="cg-sum-row"><span class="cg-sum-lbl">Sub-Race</span><span class="cg-sum-val">${sr.label}</span></div>` : ''}
        ${STAT_DISPLAY.map(sd => `<div class="cg-sum-row"><span class="cg-sum-lbl">${sd.emoji} ${sd.label}</span><span class="cg-sum-val" style="color:${STAT_COLORS[(st[sd.key]||1)-1]}">${st[sd.key] ?? '—'}</span></div>`).join('')}
      </div>
      ${r.trait ? `<div class="cg-trait">${r.trait}</div>` : ''}
      ${sr?.desc ? `<div class="cg-trait">Sub-Race bonus: ${sr.desc}</div>` : ''}
      <div class="cg-nav">
        <button class="cg-btn" id="cgRestart">↺ Restart</button>
        <button class="cg-btn primary" id="cgSave">📜 Add to Radosers</button>
      </div>
    </div>`;
  document.getElementById('cgRestart').onclick = () => initChargen();
  const saveChar = () => {
    const char = {
      id: Date.now() + Math.random(),
      name: cgState.name, race: cgState.race.id, raceName: cgState.race.name,
      raceEmoji: cgState.race.emoji, subrace: cgState.subrace,
      stats: { ...cgState.stats }, weapon: cgState.weapon,
      color: BALL_COLORS[cgRoster.length % BALL_COLORS.length]
    };
    cgRoster.push(char);
    localStorage.setItem('cgRoster', JSON.stringify(cgRoster));
    quickCreateMode = false;
    showScreen('menu'); buildFightersPanel(); renderRoster(); renderHeroShowcase();
  };
  document.getElementById('cgSave').onclick = saveChar;
  // Quick create: auto-save
  if (quickCreateMode) setTimeout(saveChar, 800);
}

// ============================================================
// ROSTER (RADOSERS)
// ============================================================
// RADOSER TITLE GENERATOR
// ============================================================
function getRadoserTitle(stats) {
  const str = stats.strength  ?? 0;
  const spd = stats.speed     ?? 0;
  const dur = stats.durability?? 0;
  const iq  = stats.iq        ?? 0;
  const biq = stats.battleiq  ?? 0;
  const ma  = stats.ma        ?? 0;
  const total  = str + spd + dur + iq + biq + ma;
  const maxStat = Math.max(str, spd, dur, iq, biq, ma);
  const tens   = [str, spd, dur, iq, biq, ma].filter(v => v === 10).length;

  // ── Perfect / Near-perfect ──
  if (total === 60)  return { title: 'GOAT',       icon: '🐐', color: '#ffd700' };
  if (total >= 55)   return { title: 'Legend',     icon: '🌟', color: '#ff88ff' };

  // ── Multiple 10s ──
  if (tens >= 4)     return { title: 'Demigod',    icon: '⚡', color: '#ff6644' };
  if (tens >= 3)     return { title: 'Prodigy',    icon: '🔥', color: '#ff9944' };

  // ── Single stat = 10 ──
  if (spd === 10)    return { title: 'Speedster',  icon: '💨', color: '#44eeff' };
  if (str === 10)    return { title: 'Destroyer',  icon: '💪', color: '#ff4444' };
  if (dur === 10)    return { title: 'Iron Wall',  icon: '🛡️', color: '#88aaff' };
  if (iq  === 10)    return { title: 'Mastermind', icon: '🧠', color: '#cc88ff' };
  if (biq === 10)    return { title: 'Phantom',    icon: '👻', color: '#88ffcc' };
  if (ma  === 10)    return { title: 'Whirlwind',  icon: '🌪️', color: '#aaffaa' };

  // ── Combination builds ──
  if (str >= 8 && dur >= 8)           return { title: 'Tank',         icon: '🏋️', color: '#ff8866' };
  if (spd >= 8 && dur <= 3)           return { title: 'Glass Cannon', icon: '💥', color: '#ffcc44' };
  if (str >= 8 && spd <= 3)           return { title: 'Berserker',    icon: '🐂', color: '#ff6644' };
  if (spd >= 8 && str <= 3)           return { title: 'Trickster',    icon: '🐦', color: '#44ffcc' };
  if (iq  >= 8 && biq >= 8)           return { title: 'Tactician',    icon: '🎯', color: '#aa88ff' };
  if (ma  >= 8)                       return { title: 'Dancer',       icon: '🎭', color: '#88ffaa' };
  if ([str,spd,dur,iq,biq,ma].every(v => v >= 7)) return { title: 'All-Rounder', icon: '⚖️', color: '#ffd700' };
  if ([str,spd,dur,iq,biq,ma].every(v => v >= 5)) return { title: 'Balanced',    icon: '🟢', color: '#88cc88' };
  if (maxStat >= 8 && total <= 25)    return { title: 'One-Trick',    icon: '🎪', color: '#ffaa44' };

  // ── Total stats fallback ──
  if (total >= 45)   return { title: 'Veteran',    icon: '⚔️',  color: '#ffaa44' };
  if (total >= 35)   return { title: 'Warrior',    icon: '🔥',  color: '#ff8844' };
  if (total >= 25)   return { title: 'Average',    icon: '📊',  color: '#8888aa' };
  if (total >= 15)   return { title: 'Mid',        icon: '😐',  color: '#666688' };
  return               { title: 'Rookie',      icon: '🌱',  color: '#44aa66' };
}

// ============================================================
function renderRoster() {
  const grid = document.getElementById('rosterGrid');
  if (!grid) return;
  if (cgRoster.length === 0) {
    grid.innerHTML = '<div class="roster-empty">No characters yet — create one above!</div>'; return;
  }
  const wepLabel = id => CG_WEAPONS.find(w => w.id === id)?.label ?? id;
  grid.innerHTML = cgRoster.map((ch, idx) => {
    const iq  = ch.stats.iq       ?? null;
    const biq = ch.stats.battleiq ?? null;
    const ma  = ch.stats.ma       ?? null;
    const total = Object.values(ch.stats).reduce((sum, v) => sum + (v ?? 0), 0);
    const t = getRadoserTitle(ch.stats);
    return `
    <div class="roster-card" style="border-color:${ch.color}44">
      <button class="rc-del" data-idx="${idx}">✕</button>
      <div class="rc-name" style="color:${ch.color}">${ch.raceEmoji} ${ch.name}</div>
      <div class="rc-race">${ch.raceName}${ch.subrace ? ' · '+ch.subrace.label : ''}</div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <div class="rc-weapon">${wepLabel(ch.weapon)}</div>
        <span class="rc-title-badge" style="color:${t.color};border-color:${t.color}44">${t.title}</span>
      </div>
      <div class="rc-total">
        <span>Total Stats</span>
        <span class="rc-total-val">${total} <span style="font-size:10px;color:#666">/ 60</span></span>
      </div>
      <div class="rc-actions">
        <button class="rc-stats-btn" data-idx="${idx}">📊 Stats</button>
        <button class="rc-add" data-idx="${idx}">➕ Add to Arena</button>
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.rc-add').forEach(btn => {
    btn.onclick = () => {
      const ch = cgRoster[+btn.dataset.idx];
      if (state.fighters.length >= 12) { alert('Max 12 fighters!'); return; }
      state.fighters.push({ weaponId: ch.weapon, color: ch.color, charName: ch.name, charEmoji: ch.raceEmoji, charStats: { ...ch.stats, race: ch.race ?? null, subrace: ch.subrace ?? null } });
      switchToBattleTab();
      sfxShoot();
    };
  });
  grid.querySelectorAll('.rc-del').forEach(btn => {
    btn.onclick = () => {
      cgRoster.splice(+btn.dataset.idx, 1);
      localStorage.setItem('cgRoster', JSON.stringify(cgRoster));
      _heroIdx = 0;
      renderRoster();
      renderHeroShowcase();
    };
  });
  grid.querySelectorAll('.rc-stats-btn').forEach(btn => {
    btn.onclick = () => showCharStats(+btn.dataset.idx);
  });
}

function showCharStats(idx) {
  const ch = cgRoster[idx];
  if (!ch) return;

  const dur = ch.stats.durability ?? 5;
  const spd = ch.stats.speed     ?? 5;
  const str = ch.stats.strength  ?? 1;
  const iq  = ch.stats.iq        ?? null;
  const biq = ch.stats.battleiq  ?? null;
  const ma  = ch.stats.ma        ?? null;
  const wepId  = ch.weapon;
  const wepDef = WEAPON_MAP[wepId];
  const wepName = CG_WEAPONS.find(w => w.id === wepId)?.label ?? wepId;

  // Derived
  const maxHP      = 50 + dur * 10;
  const maxSpd     = 10 + spd * 1.5;
  const launchMin  = spd + 1, launchMax = spd + 3;
  const baseDmg    = wepDef ? wepDef.baseDamage * str : str;
  const critDmg    = +(baseDmg * 1.5).toFixed(2);

  const acMap = { fists: Math.max(2,13-spd), sword: Math.max(2,28-spd),
    dagger: Math.max(2,18-spd), spear: Math.max(2,38-spd),
    scythe: Math.max(2,34-spd), hammer: Math.max(2,48-spd),
    bow: Math.max(5,20-spd), shuriken: Math.max(5,20-spd) };
  const ac     = acMap[wepId] ?? (wepDef?.attackCooldown ?? 20);
  const atkPS  = (60 / ac).toFixed(2);

  const t = getRadoserTitle(ch.stats);
  document.getElementById('smo-name').innerHTML =
    `<span style="color:${ch.color}">${ch.raceEmoji} ${ch.name}</span>
     <span class="rc-title-badge" style="color:${t.color};border-color:${t.color}44;font-size:12px">${t.title}</span>`;
  document.getElementById('smo-race').textContent =
    ch.raceName + (ch.subrace ? ' · ' + ch.subrace.label : '');

  document.getElementById('smo-grid').innerHTML = STAT_DISPLAY.map(sd => `
    <div class="stats-modal-row">
      <div class="stats-modal-lbl">${sd.emoji} ${sd.label}</div>
      <div class="stats-modal-val" style="color:${STAT_COLORS[(ch.stats[sd.key]??1)-1]??'#4d96ff'}">${ch.stats[sd.key] ?? '—'}</div>
    </div>`).join('');

  document.getElementById('smo-weapon').innerHTML =
    `⚔️ Weapon: <b>${wepName}</b>`;

  const row = (lbl, val, color) =>
    `<div class="stats-modal-drow"><span class="stats-modal-dlbl">${lbl}</span><span class="stats-modal-dval" style="color:${color}">${val}</span></div>`;

  const critRate  = iq  !== null ? (iq  * 5).toFixed(0) + '%' : '20%';
  const evadeRate = biq !== null ? (biq * 3).toFixed(0) + '%' : '10%';
  const spinBon   = ma  !== null ? (ma  * 0.003).toFixed(3)   : '0.000';

  document.getElementById('smo-derived').innerHTML =
    row('❤️ Max HP',          maxHP,                          '#ff6b6b') +
    row('💨 Max Speed',       maxSpd,                         '#4d96ff') +
    row('🚀 Launch Speed',    `${launchMin} – ${launchMax}`,  '#ffd700') +
    row('⚔️ Base Damage',     baseDmg,                        '#ff9944') +
    row('⚡ Crit Rate',       critRate,                        '#ffe033') +
    row('💥 Crit Damage',     `×1.5 (${critDmg} dmg)`,        '#ffaa33') +
    row('🌀 Evade Chance',    evadeRate,                       '#44eebb') +
    row('🌪 Spin Bonus',      `+${spinBon}`,                   '#aa88ff') +
    row('⏱️ Attack Cooldown', `${ac} frames`,                  '#aaffcc') +
    row('🔥 Attack Speed',    `${atkPS} / sec`,                '#cc88ff');

  document.getElementById('statsModal').classList.add('open');
}

document.getElementById('statsModalClose').onclick = () =>
  document.getElementById('statsModal').classList.remove('open');
document.getElementById('statsModal').onclick = e => {
  if (e.target === document.getElementById('statsModal'))
    document.getElementById('statsModal').classList.remove('open');
};

// Attach create-char button
document.getElementById('createCharBtn').addEventListener('click', () => { quickCreateMode = false; initChargen(); });

// Quick Create — show name prompt first
document.getElementById('quickCreateBtn').addEventListener('click', () => {
  const modal = document.getElementById('qc-name-modal');
  const input = document.getElementById('qc-name-input');
  input.value = '';
  modal.classList.add('open');
  setTimeout(() => input.focus(), 80);
});
document.getElementById('qc-confirm-btn').addEventListener('click', () => {
  const input = document.getElementById('qc-name-input');
  quickCreateName = input.value.trim();
  document.getElementById('qc-name-modal').classList.remove('open');
  quickCreateMode = true;
  initChargen();
});
document.getElementById('qc-cancel-btn').addEventListener('click', () => {
  document.getElementById('qc-name-modal').classList.remove('open');
});
// Enter key confirms
document.getElementById('qc-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('qc-confirm-btn').click();
  if (e.key === 'Escape') document.getElementById('qc-cancel-btn').click();
});
// Click backdrop to cancel
document.getElementById('qc-name-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('qc-name-modal'))
    document.getElementById('qc-cancel-btn').click();
});

// ── Menu tab switching ──
function switchToTab(tabId) {
  document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.menu-tab-pane').forEach(p => p.classList.remove('active'));
  const btn = document.querySelector(`.menu-tab[data-tab="${tabId}"]`);
  if (btn) btn.classList.add('active');
  const pane = document.getElementById(tabId);
  if (pane) pane.classList.add('active');
  if (tabId === 'tab-battle')   buildFightersPanel();
  if (tabId === 'tab-showcase') renderHeroShowcase();
  // Stop avatar animation when leaving showcase tab
  if (tabId !== 'tab-showcase' && _scAvatarRAF) {
    cancelAnimationFrame(_scAvatarRAF); _scAvatarRAF = null;
  }
}

document.querySelectorAll('.menu-tab').forEach(btn => {
  btn.addEventListener('click', () => switchToTab(btn.dataset.tab));
});

function switchToBattleTab() { switchToTab('tab-battle'); }

// ── Showcase Tab ──
let _heroIdx = 0;
let _heroTimer = null;

function renderHeroShowcase() {
  const wrap = document.getElementById('showcase-card-wrap');
  const nav  = document.getElementById('showcase-nav');
  const dots = document.getElementById('scDots');
  if (!wrap) return;

  if (cgRoster.length === 0) {
    wrap.innerHTML = '<div class="showcase-empty">No Radosers yet — create your first warrior!</div>';
    if (nav) nav.style.display = 'none';
    return;
  }

  _heroIdx = (_heroIdx + cgRoster.length) % cgRoster.length;
  const ch  = cgRoster[_heroIdx];
  const s   = ch.stats ?? {};
  const wepLabel = CG_WEAPONS.find(w => w.id === ch.weapon)?.label ?? ch.weapon ?? 'Fists';
  const subText  = ch.subrace ? ' · ' + ch.subrace.label : '';
  const t        = getRadoserTitle(s);

  // Derived stats
  const dur = s.durability ?? 5;
  const spd = s.speed      ?? 5;
  const str = s.strength   ?? 1;
  const iq  = s.iq         ?? null;
  const biq = s.battleiq   ?? null;
  const ma  = s.ma         ?? null;
  const wepId  = ch.weapon;
  const wepDef = WEAPON_MAP[wepId];
  const maxHP  = 50 + dur * 10;
  const maxSpd = +(10 + spd * 1.5).toFixed(1);
  const baseDmg= wepDef ? +(wepDef.baseDamage * str).toFixed(1) : str;
  const acMap  = { fists:Math.max(2,13-spd), sword:Math.max(2,28-spd), dagger:Math.max(2,18-spd),
                   spear:Math.max(2,38-spd), scythe:Math.max(2,34-spd), hammer:Math.max(2,48-spd),
                   bow:Math.max(5,20-spd), shuriken:Math.max(5,20-spd) };
  const ac     = acMap[wepId] ?? (wepDef?.attackCooldown ?? 20);
  const atkPS  = (60/ac).toFixed(2);
  const critRate  = iq  !== null ? (iq  * 5) + '%' : '20%';
  const evadeRate = biq !== null ? (biq * 3) + '%' : '10%';
  const spinBon   = ma  !== null ? '+' + (ma * 0.003).toFixed(3) : '+0.000';

  const drow = (lbl, val, color) =>
    `<div class="sc-drow"><span class="sc-dlbl">${lbl}</span><span class="sc-dval" style="color:${color}">${val}</span></div>`;

  wrap.innerHTML = `
    <div class="showcase-card" style="border:1px solid ${ch.color}55">
      <div class="sc-banner" style="background:linear-gradient(90deg,${ch.color}cc,${ch.color}22)"></div>
      <div class="sc-main">
        <canvas class="sc-avatar-canvas" id="sc-avatar-canvas" width="160" height="160"></canvas>
        <div class="sc-identity">
          <div class="sc-name" style="color:${ch.color}">${ch.name}</div>
          <div class="sc-race-line">${ch.raceName ?? ''}${subText}</div>
          <div class="sc-title-wrap">
            <span class="rc-title-badge" style="color:${t.color};border-color:${t.color}44">${t.title}</span>
          </div>
        </div>
      </div>
      <div class="sc-stats-section">
        <div class="sc-section-lbl">Base Stats</div>
        <div class="sc-stats-grid">
          ${STAT_DISPLAY.map(sd => {
            const val = s[sd.key] ?? '—';
            const col = STAT_COLORS[(+val - 1)] ?? '#4d96ff';
            return `<div class="sc-stat-box">
              <span class="sc-stat-emoji">${sd.emoji}</span>
              <span class="sc-stat-lbl">${sd.label}</span>
              <span class="sc-stat-val" style="color:${col}">${val}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="sc-divider"></div>
      <div class="sc-weapon-row">${wepLabel}</div>
      <div class="sc-divider"></div>
      <div class="sc-derived-section">
        <div class="sc-section-lbl">Combat Stats</div>
        <div class="sc-derived-grid">
          ${drow('❤️ Max HP',       maxHP,              '#ff6b6b')}
          ${drow('💨 Max Speed',    maxSpd,             '#4d96ff')}
          ${drow('⚔️ Base Damage',  baseDmg,            '#ff9944')}
          ${drow('🔥 Atk Speed',    atkPS + '/s',       '#cc88ff')}
          ${drow('⚡ Crit Rate',    critRate,           '#ffe033')}
          ${drow('💥 Crit Damage',  '×1.5',             '#ffaa33')}
          ${drow('🌀 Evade',        evadeRate,          '#44eebb')}
          ${drow('🌪 Spin Bonus',   spinBon,            '#aa88ff')}
        </div>
      </div>
    </div>`;

  // Nav dots
  if (nav) nav.style.display = cgRoster.length > 1 ? 'flex' : 'none';
  if (dots) {
    dots.innerHTML = cgRoster.map((_, i) =>
      `<div class="sc-dot${i === _heroIdx ? ' active' : ''}" data-i="${i}"></div>`
    ).join('');
    dots.querySelectorAll('.sc-dot').forEach(d => {
      d.onclick = () => { _heroIdx = +d.dataset.i; renderHeroShowcase(); };
    });
  }

  // Start animated avatar canvas
  startShowcaseAvatarAnim(ch);
}

// ── Showcase avatar animation ──────────────────────────────────────────
let _scAvatarRAF = null;

function startShowcaseAvatarAnim(ch) {
  if (_scAvatarRAF) { cancelAnimationFrame(_scAvatarRAF); _scAvatarRAF = null; }

  const canvas = document.getElementById('sc-avatar-canvas');
  if (!canvas) return;
  const ctx2 = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const CX = W / 2, CY = H / 2;
  const R = 38; // ball radius in canvas px

  // Fake ball object — only what drawRaceDecoration needs
  const fakeBall = {
    x: CX, y: CY,
    vx: 0, vy: 0,
    radius: R,
    color: ch.color,
    charRace:    ch.race    ?? null,
    charSubrace: ch.subrace ?? null,
    _deco_fa: 0,
  };

  const t0 = Date.now();

  function frame() {
    const elapsed = (Date.now() - t0) / 1000;
    // Slow rotation so all decorations are visible
    fakeBall._deco_fa = elapsed * 0.55;

    ctx2.clearRect(0, 0, W, H);

    // ── Draw base ball ──────────────────────────────────────────────────
    // Shadow
    ctx2.fillStyle = 'rgba(0,0,0,0.28)';
    ctx2.beginPath();
    ctx2.ellipse(CX, CY + R * 0.88, R * 0.78, R * 0.24, 0, 0, Math.PI * 2);
    ctx2.fill();

    // Ball fill + glow
    const pulse = 0.85 + 0.15 * Math.sin(elapsed * 1.4);
    ctx2.fillStyle = ch.color;
    ctx2.shadowColor = ch.color;
    ctx2.shadowBlur  = 18 * pulse;
    ctx2.beginPath();
    ctx2.arc(CX, CY, R, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.shadowBlur = 0;

    // Outline
    ctx2.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx2.lineWidth = 2;
    ctx2.stroke();

    // Shine highlight
    ctx2.fillStyle = 'rgba(255,255,255,0.22)';
    ctx2.beginPath();
    ctx2.ellipse(CX - R*0.28, CY - R*0.3, R*0.28, R*0.18, -Math.PI*0.3, 0, Math.PI*2);
    ctx2.fill();

    // ── Race decorations ────────────────────────────────────────────────
    drawRaceDecoration(ctx2, fakeBall);

    _scAvatarRAF = requestAnimationFrame(frame);
  }

  frame();
}

function startHeroShowcase() {
  renderHeroShowcase();
  if (_heroTimer) clearInterval(_heroTimer);
  _heroTimer = setInterval(() => {
    if (cgRoster.length > 1) {
      _heroIdx = (_heroIdx + 1) % cgRoster.length;
      renderHeroShowcase();
    }
  }, 3000);
}

document.getElementById('scPrev').onclick = () => { _heroIdx--; renderHeroShowcase(); };
document.getElementById('scNext').onclick = () => { _heroIdx++; renderHeroShowcase(); };

startHeroShowcase();

// ── Fighter Picker Modal ──────────────────────────────────────────────
function showFighterPicker() {
  const list = document.getElementById('fpm-list');
  list.innerHTML = '';

  // ── Radosers section ──
  if (cgRoster.length > 0) {
    const lbl = document.createElement('div');
    lbl.className = 'fpm-section-lbl';
    lbl.textContent = 'Your Radosers';
    list.appendChild(lbl);

    cgRoster.forEach(ch => {
      const wepLabel = CG_WEAPONS.find(w => w.id === ch.weapon)?.label ?? ch.weapon ?? 'Fists';
      const card = document.createElement('div');
      card.className = 'fpm-radoser-card';
      card.style.borderColor = ch.color + '55';
      card.innerHTML = `
        <div class="fpm-dot" style="background:${ch.color};box-shadow:0 0 8px ${ch.color}77"></div>
        <div class="fpm-info">
          <div class="fpm-name" style="color:${ch.color}">${ch.raceEmoji ?? ''} ${ch.name}</div>
          <div class="fpm-meta">${ch.raceName ?? ''}${ch.subrace ? ' · ' + ch.subrace.label : ''} &nbsp;·&nbsp; ${wepLabel}</div>
        </div>
        <span class="fpm-add-tag">ADD</span>`;
      card.addEventListener('click', () => {
        state.fighters.push(rosterToFighter(ch));
        buildFightersPanel();
        closeFighterPicker();
        sfxShoot();
      });
      list.appendChild(card);
    });
  } else {
    const empty = document.createElement('div');
    empty.className = 'fpm-empty';
    empty.textContent = 'No Radosers yet — create some in the Radosers tab!';
    list.appendChild(empty);
  }

  // ── Bot section ──
  const botLbl = document.createElement('div');
  botLbl.className = 'fpm-section-lbl';
  botLbl.style.marginTop = '6px';
  botLbl.textContent = 'or';
  list.appendChild(botLbl);

  const botCard = document.createElement('div');
  botCard.className = 'fpm-bot-card';
  botCard.innerHTML = `<span>🤖</span><span>Add Random Bot</span>`;
  botCard.addEventListener('click', () => {
    const nextColor = BALL_COLORS[state.fighters.length % BALL_COLORS.length];
    state.fighters.push({ weaponId: 'sword', color: nextColor });
    buildFightersPanel();
    closeFighterPicker();
    sfxShoot();
  });
  list.appendChild(botCard);

  document.getElementById('fighter-picker-modal').style.display = 'flex';
}

function closeFighterPicker() {
  document.getElementById('fighter-picker-modal').style.display = 'none';
}

// fpm event listeners are wired via onclick attrs in modal HTML

// ============================================================
// RACE ASSET EDITOR
// ============================================================

window.AE_DATA = {};
window._raceAssetOverrides = {};  // populated from AE_RACE_DEFAULTS after it's defined below

const AE = {
  raceId: 'gnome',
  shapes: [],
  nextId: 1,
  selected: null,
  hoverId: null,
  angle: 0,
  spinning: false,
  dragging: false,
  dragType: null,    // 'body' | 'vertex'
  dragVertexIdx: -1,
  dragStartLx: 0, dragStartLy: 0,
  dragSnapX: 0, dragSnapY: 0,
  dragSnapPoints: null,
  frozenAngle: 0,
  drawMode: null,    // null | 'polygon'
  drawPoints: [],
};

const AE_RACE_DEFAULTS = {
  goblin: [
    { type:'polygon', label:'Ear L',       points:[[-0.15,-0.78],[-0.50,-1.65],[0.45,-1.55]], fill:'#4a7a20', stroke:'#2a4a10', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Ear L Inner', points:[[-0.10,-0.86],[-0.35,-1.45],[0.24,-1.38]], fill:'#ff8888', stroke:null,      sw:1,   opacity:1, visible:true },
    { type:'polygon', label:'Ear R',       points:[[-0.15, 0.78],[-0.50, 1.65],[0.45, 1.55]], fill:'#4a7a20', stroke:'#2a4a10', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Ear R Inner', points:[[-0.10, 0.86],[-0.35, 1.45],[0.24, 1.38]], fill:'#ff8888', stroke:null,      sw:1,   opacity:1, visible:true },
  ],
  gnome: [
    { type:'ellipse', label:'Hat Brim', x:0.05, y:-0.95, rx:0.62, ry:0.18, rot:0, fill:'#773311', stroke:'#552200', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Hat Cone', points:[[-0.55,-0.97],[0.05,-2.25],[0.65,-0.97]],       fill:'#cc6633', stroke:'#883311', sw:1.5, opacity:1, visible:true },
    { type:'ellipse', label:'Hat Band', x:0.05, y:-1.06, rx:0.55, ry:0.15, rot:0, fill:null,   stroke:'#ffcc44', sw:2.2, opacity:1, visible:true },
  ],
  human: [
    { type:'line', label:'Hair 1', points:[[-0.27,-0.88],[-0.50,-1.46]], stroke:'#8B5E3C', sw:3, opacity:1, visible:true },
    { type:'line', label:'Hair 2', points:[[-0.13,-0.88],[-0.24,-1.46]], stroke:'#8B5E3C', sw:3, opacity:1, visible:true },
    { type:'line', label:'Hair 3', points:[[ 0.04,-0.88],[ 0.06,-1.46]], stroke:'#8B5E3C', sw:3, opacity:1, visible:true },
    { type:'line', label:'Hair 4', points:[[ 0.18,-0.88],[ 0.32,-1.46]], stroke:'#8B5E3C', sw:3, opacity:1, visible:true },
    { type:'line', label:'Hair 5', points:[[ 0.31,-0.88],[ 0.56,-1.46]], stroke:'#8B5E3C', sw:3, opacity:1, visible:true },
  ],
  dwarf: [
    { type:'polygon', label:'Beard',   points:[[-0.72,-0.52],[-1.36,-0.44],[-1.73,-0.20],[-1.86,0.15],[-1.75,0.55],[-0.72,0.52],[-0.93,0.29],[-1.01,0],[-0.93,-0.29]], fill:'#cc8833', stroke:'#996622', sw:1.5, opacity:1, visible:true },
    { type:'line',    label:'Braid 1', points:[[-1.10,-0.22],[-1.18, 0.22]], stroke:'#aa6611', sw:1.3, opacity:1, visible:true },
    { type:'line',    label:'Braid 2', points:[[-1.35,-0.22],[-1.43, 0.22]], stroke:'#aa6611', sw:1.3, opacity:1, visible:true },
    { type:'line',    label:'Braid 3', points:[[-1.60,-0.22],[-1.68, 0.22]], stroke:'#aa6611', sw:1.3, opacity:1, visible:true },
    { type:'ellipse', label:'Helmet',  x:0.05, y:-0.93, rx:0.58, ry:0.18, rot:0, fill:'#aaaaaa', stroke:'#666666', sw:1.5, opacity:1, visible:true },
  ],
  skeleton: [
    { type:'ellipse', label:'Socket L', x:0.43, y:-0.27, rx:0.20, ry:0.16, rot:0, fill:'#111111', stroke:null,     sw:1,   opacity:1, visible:true },
    { type:'ellipse', label:'Socket R', x:0.43, y: 0.27, rx:0.20, ry:0.16, rot:0, fill:'#111111', stroke:null,     sw:1,   opacity:1, visible:true },
    { type:'polygon', label:'Nose',     points:[[0.70,0],[0.60,-0.10],[0.60,0.10]], fill:'#111111', stroke:null, sw:1, opacity:1, visible:true },
    { type:'polygon', label:'Tooth 1',  points:[[0.76,-0.32],[0.93,-0.32],[0.93,-0.13],[0.76,-0.13]], fill:'#e8e8d8', stroke:'#666666', sw:1, opacity:1, visible:true },
    { type:'polygon', label:'Tooth 2',  points:[[0.76,-0.10],[0.93,-0.10],[0.93, 0.09],[0.76, 0.09]], fill:'#e8e8d8', stroke:'#666666', sw:1, opacity:1, visible:true },
    { type:'polygon', label:'Tooth 3',  points:[[0.76, 0.12],[0.93, 0.12],[0.93, 0.31],[0.76, 0.31]], fill:'#e8e8d8', stroke:'#666666', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Crack',    points:[[0.22,-0.66],[0.42,-0.46],[0.32,-0.30]], stroke:'rgba(0,0,0,0.5)', sw:1.8, opacity:1, visible:true },
  ],
  troll: [
    { type:'line',    label:'Hair 1', points:[[-0.32,-0.88],[-0.58,-1.74]], stroke:'#556633', sw:3,   opacity:1, visible:true },
    { type:'line',    label:'Hair 2', points:[[-0.15,-0.88],[-0.28,-1.68]], stroke:'#556633', sw:3,   opacity:1, visible:true },
    { type:'line',    label:'Hair 3', points:[[ 0.00,-0.88],[ 0.00,-1.62]], stroke:'#556633', sw:3,   opacity:1, visible:true },
    { type:'line',    label:'Hair 4', points:[[ 0.15,-0.88],[ 0.28,-1.68]], stroke:'#556633', sw:3,   opacity:1, visible:true },
    { type:'line',    label:'Hair 5', points:[[ 0.32,-0.88],[ 0.58,-1.74]], stroke:'#556633', sw:3,   opacity:1, visible:true },
    { type:'polygon', label:'Horn L', points:[[ 0.10,-0.80],[0.35,-1.32],[0.05,-1.58],[-0.10,-1.22],[0.00,-0.86]], fill:'#776644', stroke:'#554422', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Horn R', points:[[ 0.10, 0.80],[0.35, 1.32],[0.05, 1.58],[-0.10, 1.22],[0.00, 0.86]], fill:'#776644', stroke:'#554422', sw:1.5, opacity:1, visible:true },
    { type:'ellipse', label:'Nose',   x:0.86, y:0, rx:0.22, ry:0.17, rot:0, fill:'#5a7a38', stroke:'#3a5520', sw:1.5, opacity:1, visible:true },
  ],
  orc: [
    { type:'polygon', label:'Tusk L', points:[[0.60,-0.18],[1.05,-0.44],[0.90,-0.74],[0.77,-0.50],[0.71,-0.22]], fill:'#eeeebb', stroke:'#aaaa77', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Tusk R', points:[[0.60, 0.18],[1.05, 0.44],[0.90, 0.74],[0.77, 0.50],[0.71, 0.22]], fill:'#eeeebb', stroke:'#aaaa77', sw:1.5, opacity:1, visible:true },
    { type:'line',    label:'Brow L', points:[[0.25,-0.44],[0.62,-0.36]], stroke:'#1a1200', sw:3.5, opacity:1, visible:true },
    { type:'line',    label:'Brow R', points:[[0.25, 0.44],[0.62, 0.36]], stroke:'#1a1200', sw:3.5, opacity:1, visible:true },
  ],
  giant: [
    { type:'line',    label:'Crack 1',  points:[[ 0.10,-0.56],[0.28,-0.18],[0.12, 0.14]], stroke:'rgba(0,0,0,0.3)', sw:2, opacity:1, visible:true },
    { type:'line',    label:'Crack 2',  points:[[-0.30, 0.35],[-0.05,0.65]],              stroke:'rgba(0,0,0,0.3)', sw:2, opacity:1, visible:true },
    { type:'line',    label:'Crack 3',  points:[[ 0.40, 0.16],[0.65, 0.38],[0.82, 0.18]], stroke:'rgba(0,0,0,0.3)', sw:2, opacity:1, visible:true },
    { type:'line',    label:'Crack 4',  points:[[-0.55,-0.30],[-0.77,-0.06]],             stroke:'rgba(0,0,0,0.3)', sw:2, opacity:1, visible:true },
    { type:'ellipse', label:'Pebble 1', x: 0.22, y:-0.38, rx:0.10, ry:0.10, rot:0, fill:'rgba(255,255,255,0.13)', stroke:null, sw:1, opacity:1, visible:true },
    { type:'ellipse', label:'Pebble 2', x:-0.44, y: 0.20, rx:0.08, ry:0.08, rot:0, fill:'rgba(255,255,255,0.13)', stroke:null, sw:1, opacity:1, visible:true },
    { type:'ellipse', label:'Pebble 3', x: 0.55, y: 0.30, rx:0.07, ry:0.07, rot:0, fill:'rgba(255,255,255,0.13)', stroke:null, sw:1, opacity:1, visible:true },
  ],
  dragon: [
    { type:'polygon', label:'Horn L',    points:[[0.15,-0.78],[0.33,-1.28],[0.25,-1.69],[0.00,-1.88],[-0.10,-1.62],[-0.04,-1.23],[0.10,-0.82]], fill:'#cc3300', stroke:'rgba(0,0,0,0.45)', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Horn R',    points:[[0.15, 0.78],[0.33, 1.28],[0.25, 1.69],[0.00, 1.88],[-0.10, 1.62],[-0.04, 1.23],[0.10, 0.82]], fill:'#cc3300', stroke:'rgba(0,0,0,0.45)', sw:1.5, opacity:1, visible:true },
    { type:'line',    label:'Tail',      points:[[-0.85,0],[-1.40,0.16],[-1.92,0.28]], stroke:'#cc3300', sw:3.5, opacity:1, visible:true },
    { type:'polygon', label:'Tail Tip',  points:[[-1.74,0.22],[-2.04,0.32],[-1.82,0.44]], fill:'#cc3300', stroke:null, sw:1, opacity:1, visible:true },
    // Scale arc marks — 5-point approximations of ctx.arc(cx,cy,0.18, PI*0.12, PI*0.88)
    { type:'line', label:'Scale 1', points:[[-0.083,-0.394],[-0.154,-0.308],[-0.250,-0.280],[-0.346,-0.308],[-0.417,-0.394]], stroke:'#cc3300aa', sw:1.3, opacity:1, visible:true },
    { type:'line', label:'Scale 2', points:[[ 0.227,-0.564],[ 0.156,-0.478],[ 0.060,-0.450],[-0.036,-0.478],[-0.107,-0.564]], stroke:'#cc3300aa', sw:1.3, opacity:1, visible:true },
    { type:'line', label:'Scale 3', points:[[-0.083, 0.394],[-0.154, 0.308],[-0.250, 0.280],[-0.346, 0.308],[-0.417, 0.394]], stroke:'#cc3300aa', sw:1.3, opacity:1, visible:true },
    { type:'line', label:'Scale 4', points:[[ 0.227, 0.564],[ 0.156, 0.478],[ 0.060, 0.450],[-0.036, 0.478],[-0.107, 0.564]], stroke:'#cc3300aa', sw:1.3, opacity:1, visible:true },
    { type:'line', label:'Scale 5', points:[[ 0.497, 0.066],[ 0.426, 0.152],[ 0.330, 0.180],[ 0.234, 0.152],[ 0.163, 0.066]], stroke:'#cc3300aa', sw:1.3, opacity:1, visible:true },
  ],
  angel: [
    { type:'polygon', label:'Wing L',      points:[[ 0.35,-0.78],[-0.02,-1.35],[-0.42,-1.46],[-0.66,-1.12],[-0.12,-0.89],[0.30,-0.80]], fill:'rgba(255,255,255,0.92)', stroke:'rgba(200,200,170,0.9)', sw:1.2, opacity:1, visible:true },
    { type:'polygon', label:'Wing R',      points:[[ 0.35, 0.78],[-0.02, 1.35],[-0.42, 1.46],[-0.66, 1.12],[-0.12, 0.89],[0.30, 0.80]], fill:'rgba(255,255,255,0.92)', stroke:'rgba(200,200,170,0.9)', sw:1.2, opacity:1, visible:true },
    { type:'line',    label:'Feather L1',  points:[[ 0.30,-0.86],[-0.06,-1.12]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Feather L2',  points:[[ 0.00,-1.06],[-0.26,-1.32]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Feather L3',  points:[[-0.36,-1.12],[-0.56,-1.30]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Feather R1',  points:[[ 0.30, 0.86],[-0.06, 1.12]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Feather R2',  points:[[ 0.00, 1.06],[-0.26, 1.32]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Feather R3',  points:[[-0.36, 1.12],[-0.56, 1.30]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'ellipse', label:'Halo',        x:0, y:-1.55, rx:0.56, ry:0.17, rot:0, fill:null, stroke:'#ffdd33', sw:3, opacity:1, visible:true },
  ],
  primordial: [
    { type:'ellipse', label:'Swirl Inner', x:0, y:0, rx:0.52, ry:0.52, rot:0, fill:null, stroke:'rgba(110,150,255,0.55)', sw:1.8, opacity:1, visible:true },
    { type:'ellipse', label:'Swirl Outer', x:0, y:0, rx:0.74, ry:0.74, rot:0, fill:null, stroke:'rgba(255,90,190,0.45)',  sw:1.8, opacity:1, visible:true },
    { type:'ellipse', label:'Orb 1',       x: 1.44, y:  0,    rx:0.13, ry:0.13, rot:0, fill:'#6699ff', stroke:null, sw:1, opacity:1, visible:true },
    { type:'ellipse', label:'Orb 2',       x:-0.72, y:  1.25, rx:0.13, ry:0.13, rot:0, fill:'#ff55aa', stroke:null, sw:1, opacity:1, visible:true },
    { type:'ellipse', label:'Orb 3',       x:-0.72, y: -1.25, rx:0.13, ry:0.13, rot:0, fill:'#55ffdd', stroke:null, sw:1, opacity:1, visible:true },
  ],
  demon: [
    { type:'ellipse', label:'Aura',        x:0, y:0, rx:1.18, ry:1.18, rot:0, fill:null, stroke:'rgba(180,0,0,0.28)', sw:6, opacity:1, visible:true },
    { type:'polygon', label:'Horn L',      points:[[0.10,-0.78],[0.28,-1.80],[0.52,-0.84]], fill:'#cc1100', stroke:'#880000', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Horn L Glow', points:[[0.15,-0.82],[0.22,-1.56],[0.33,-0.87]], fill:'#ff3322', stroke:null,     sw:1,   opacity:1, visible:true },
    { type:'polygon', label:'Horn R',      points:[[0.10, 0.78],[0.28, 1.80],[0.52, 0.84]], fill:'#cc1100', stroke:'#880000', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Horn R Glow', points:[[0.15, 0.82],[0.22, 1.56],[0.33, 0.87]], fill:'#ff3322', stroke:null,     sw:1,   opacity:1, visible:true },
    { type:'line',    label:'Tail',        points:[[-0.85,0],[-1.35,0.43],[-1.52,0.88]], stroke:'#cc1100', sw:3, opacity:1, visible:true },
    { type:'polygon', label:'Tail Tip',    points:[[-1.34,0.88],[-1.64,0.76],[-1.57,0.88],[-1.64,1.00]], fill:'#cc1100', stroke:null, sw:1, opacity:1, visible:true },
  ],
  god: [
    { type:'line',    label:'Ray 1',    points:[[ 1.26, 0.00],[ 1.90, 0.00]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 2',    points:[[ 0.89, 0.89],[ 1.34, 1.34]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 3',    points:[[ 0.00, 1.26],[ 0.00, 1.90]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 4',    points:[[-0.89, 0.89],[-1.34, 1.34]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 5',    points:[[-1.26, 0.00],[-1.90, 0.00]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 6',    points:[[-0.89,-0.89],[-1.34,-1.34]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 7',    points:[[ 0.00,-1.26],[ 0.00,-1.90]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 8',    points:[[ 0.89,-0.89],[ 1.34,-1.34]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'ellipse', label:'Halo Ring', x:0, y:0, rx:1.22, ry:1.22, rot:0, fill:null, stroke:'rgba(255,215,0,0.78)', sw:3, opacity:1, visible:true },
  ],
};
// Keep alias for backward compat
const AE_GNOME_DEFAULTS = AE_RACE_DEFAULTS.gnome;

// ── Baked-in race overrides ─────────────────────────────────────────────
// These races use static custom shapes instead of the animated switch case.
// Angel uses the switch case (has golden-glow halo via ctx.shadowBlur).
// Goblin / Gnome / Human / Dwarf / Troll / Giant use the switch case too.
window._raceAssetOverrides = {
  // ── Races with custom static shapes ────────────────────────────────
  skeleton:   AE_RACE_DEFAULTS.skeleton,
  orc:        AE_RACE_DEFAULTS.orc,
  dragon:     AE_RACE_DEFAULTS.dragon.filter(s => s.label !== 'Horn L' && s.label !== 'Horn R'),
  demon:      AE_RACE_DEFAULTS.demon,
  // Angel: key present so switch-case is skipped; halo drawn via special code in override block
  angel:      [],
  // ── Races with NO decoration (empty array = skip switch case too) ──
  goblin: [], gnome: [], human: [], dwarf: [], troll: [], giant: [],
  // primordial & god: NOT listed → fall through to switch case → animated effects preserved
};

function aeNewId() {
  return 's' + (AE.nextId++);
}

function aeLoadRace(raceId) {
  // Save current shapes to AE_DATA
  window.AE_DATA[AE.raceId] = AE.shapes.map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  AE.raceId = raceId;
  AE.selected = null;
  AE.hoverId = null;
  // Load from: in-session cache → saved overrides → hardcoded defaults → empty
  if (window.AE_DATA[raceId]) {
    AE.shapes = window.AE_DATA[raceId].map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else if (window._raceAssetOverrides?.[raceId]?.length > 0) {
    AE.shapes = window._raceAssetOverrides[raceId].map(s => Object.assign({ id: aeNewId() }, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else if (AE_RACE_DEFAULTS[raceId]) {
    AE.shapes = AE_RACE_DEFAULTS[raceId].map(s => Object.assign({ id: aeNewId() }, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else {
    AE.shapes = [];
  }
  aeRenderLayers();
  aeRenderProps();
  if (typeof aeUpdateSaveIndicator === 'function') aeUpdateSaveIndicator();
}

function aeOpen(raceId) {
  const el = document.getElementById('screen-asset-editor');
  el.classList.add('ae-open');
  // Sync race id without saving (first open)
  AE.raceId = raceId || 'gnome';
  document.getElementById('ae-race-select').value = AE.raceId;
  // Load shapes: in-session cache → saved overrides → hardcoded defaults → empty
  if (window.AE_DATA[AE.raceId]) {
    AE.shapes = window.AE_DATA[AE.raceId].map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else if (window._raceAssetOverrides?.[AE.raceId]?.length > 0) {
    AE.shapes = window._raceAssetOverrides[AE.raceId].map(s => Object.assign({ id: aeNewId() }, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else if (AE_RACE_DEFAULTS[AE.raceId]) {
    AE.shapes = AE_RACE_DEFAULTS[AE.raceId].map(s => Object.assign({ id: aeNewId() }, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else {
    AE.shapes = [];
  }
  AE.selected = null;
  AE.hoverId = null;
  AE.drawMode = null;
  AE.drawPoints = [];
  AE.spinning = false;
  document.getElementById('ae-spin-cb').checked = false;
  aeRenderLayers();
  aeRenderProps();
  if (typeof aeUpdateSaveIndicator === 'function') aeUpdateSaveIndicator();
  // Start RAF loop
  if (window._aeRAF) cancelAnimationFrame(window._aeRAF);
  function aeLoop() {
    aeRender();
    window._aeRAF = requestAnimationFrame(aeLoop);
  }
  aeLoop();
}

function aeClose() {
  const el = document.getElementById('screen-asset-editor');
  el.classList.remove('ae-open');
  if (window._aeRAF) { cancelAnimationFrame(window._aeRAF); window._aeRAF = null; }
  // Save
  window.AE_DATA[AE.raceId] = AE.shapes.map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  AE.drawMode = null;
  AE.drawPoints = [];
}

function aeScreenToLocal(e) {
  const canvas = document.getElementById('ae-canvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (e.clientX - rect.left) * scaleX;
  const cy = (e.clientY - rect.top) * scaleY;
  const CX = canvas.width / 2, CY = canvas.height / 2;
  const R = 65;
  const dx = cx - CX, dy = cy - CY;
  const a = AE.dragging ? AE.frozenAngle : AE.angle;
  const cos = Math.cos(-a), sin = Math.sin(-a);
  return {
    lx: +(( dx*cos - dy*sin) / R).toFixed(4),
    ly: +(( dx*sin + dy*cos) / R).toFixed(4),
    cx, cy
  };
}

function aeDistSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx*dx + dy*dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax)*dx + (py - ay)*dy) / len2));
  return Math.hypot(px - (ax + t*dx), py - (ay + t*dy));
}

function aeHitBody(lx, ly, s) {
  switch (s.type) {
    case 'ellipse': {
      const ndx = (lx - s.x) / Math.max(Math.abs(s.rx), 0.05);
      const ndy = (ly - s.y) / Math.max(Math.abs(s.ry), 0.05);
      return ndx*ndx + ndy*ndy <= 1.5;
    }
    case 'polygon': {
      if (!s.points || s.points.length < 3) return false;
      let inside = false;
      for (let i = 0, j = s.points.length - 1; i < s.points.length; j = i++) {
        const xi = s.points[i][0], yi = s.points[i][1];
        const xj = s.points[j][0], yj = s.points[j][1];
        if (((yi > ly) !== (yj > ly)) && (lx < (xj - xi) * (ly - yi) / (yj - yi) + xi)) inside = !inside;
      }
      if (inside) return true;
      for (let i = 0; i < s.points.length; i++) {
        const j = (i + 1) % s.points.length;
        if (aeDistSeg(lx, ly, s.points[i][0], s.points[i][1], s.points[j][0], s.points[j][1]) < 0.2) return true;
      }
      return false;
    }
    case 'line': {
      if (!s.points || s.points.length < 2) return false;
      for (let i = 0; i < s.points.length - 1; i++) {
        if (aeDistSeg(lx, ly, s.points[i][0], s.points[i][1], s.points[i+1][0], s.points[i+1][1]) < 0.25) return true;
      }
      return false;
    }
  }
  return false;
}

function aeGetHandlePoints(s, R) {
  if (s.type === 'ellipse') {
    const cx = s.x * R, cy = s.y * R;
    const rx = Math.abs(s.rx * R), ry = Math.abs(s.ry * R);
    return [[cx-rx,cy-ry],[cx,cy-ry],[cx+rx,cy-ry],[cx+rx,cy],[cx+rx,cy+ry],[cx,cy+ry],[cx-rx,cy+ry],[cx-rx,cy]];
  }
  if (s.points) return s.points.map(([px, py]) => [px * R, py * R]);
  return [];
}

function aeHitTest(lx, ly) {
  // Check vertex handles of selected shape first
  if (AE.selected) {
    const s = AE.shapes.find(x => x.id === AE.selected);
    if (s) {
      const handles = aeGetHandlePoints(s, 1); // in r-units
      for (let i = 0; i < handles.length; i++) {
        const dx = lx - handles[i][0], dy = ly - handles[i][1];
        if (Math.hypot(dx, dy) < 0.2) return { id: s.id, type: 'vertex', idx: i };
      }
    }
  }
  // Body hit test, reverse order
  for (let i = AE.shapes.length - 1; i >= 0; i--) {
    const s = AE.shapes[i];
    if (!s.visible) continue;
    if (aeHitBody(lx, ly, s)) return { id: s.id, type: 'body', idx: -1 };
  }
  return null;
}

function aeDrawShape(ctx, s, R) {
  ctx.save();
  ctx.globalAlpha = s.opacity ?? 1;
  ctx.lineWidth = s.sw ?? 1.5;
  switch (s.type) {
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(s.x * R, s.y * R,
        Math.max(Math.abs(s.rx * R), 0.5),
        Math.max(Math.abs(s.ry * R), 0.5),
        (s.rot || 0) * Math.PI / 180, 0, Math.PI * 2);
      if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
      if (s.stroke) { ctx.strokeStyle = s.stroke; ctx.stroke(); }
      break;
    case 'polygon':
      if (!s.points || s.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0] * R, s.points[0][1] * R);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0] * R, s.points[i][1] * R);
      ctx.closePath();
      if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
      if (s.stroke) { ctx.strokeStyle = s.stroke; ctx.stroke(); }
      break;
    case 'line':
      if (!s.points || s.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0] * R, s.points[0][1] * R);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0] * R, s.points[i][1] * R);
      if (s.stroke) { ctx.strokeStyle = s.stroke; ctx.stroke(); }
      break;
  }
  ctx.restore();
}

function aeStrokeOutline(ctx, s, R) {
  switch (s.type) {
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(s.x * R, s.y * R,
        Math.max(Math.abs(s.rx * R) + 3, 3),
        Math.max(Math.abs(s.ry * R) + 3, 3),
        (s.rot || 0) * Math.PI / 180, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'polygon':
      if (!s.points || s.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0] * R, s.points[0][1] * R);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0] * R, s.points[i][1] * R);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'line':
      if (!s.points || s.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0] * R, s.points[0][1] * R);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0] * R, s.points[i][1] * R);
      ctx.stroke();
      break;
  }
}

function aeRender() {
  const canvas = document.getElementById('ae-canvas');
  if (!canvas || !canvas.offsetParent) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const CX = W / 2, CY = H / 2, R = 65;

  if (AE.spinning && !AE.dragging) AE.angle = Date.now() * 0.0004;

  ctx.clearRect(0, 0, W, H);
  // Background
  ctx.fillStyle = '#080818'; ctx.fillRect(0, 0, W, H);
  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // Center cross
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(CX, 0); ctx.lineTo(CX, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, CY); ctx.lineTo(W, CY); ctx.stroke();
  ctx.setLineDash([]);

  // Ball shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(CX, CY + R*0.88, R*0.78, R*0.24, 0, 0, Math.PI*2); ctx.fill();
  // Ball body
  ctx.fillStyle = '#4488ff'; ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke();
  // Ball highlight
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath(); ctx.ellipse(CX - R*0.28, CY - R*0.3, R*0.28, R*0.18, -0.94, 0, Math.PI*2); ctx.fill();

  // Eyes
  ctx.save(); ctx.translate(CX, CY); ctx.rotate(AE.angle);
  const eyeC = '#44ffaa'; // default preview eye color
  const er = parseInt(eyeC.slice(1,3),16), eg = parseInt(eyeC.slice(3,5),16), eb = parseInt(eyeC.slice(5,7),16);
  for (const ey of [-R*0.20, R*0.20]) {
    const ew = R*0.21, eh = R*0.085, ex = R*0.46;
    ctx.beginPath(); ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI*2);
    const g = ctx.createLinearGradient(ex, ey - eh, ex, ey + eh);
    g.addColorStop(0, `rgba(${Math.min(er+70,255)},${Math.min(eg+70,255)},${Math.min(eb+70,255)},0.9)`);
    g.addColorStop(1, `rgba(${Math.max(er-45,0)},${Math.max(eg-45,0)},${Math.max(eb-45,0)},0.78)`);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = `rgba(${er},${eg},${eb},0.4)`; ctx.lineWidth = 1;
    ctx.shadowColor = eyeC; ctx.shadowBlur = 4; ctx.stroke(); ctx.shadowBlur = 0;
  }
  ctx.restore();

  // Draw all shapes
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(AE.angle);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of AE.shapes) {
    if (!s.visible) continue;
    aeDrawShape(ctx, s, R);
  }
  // Polygon draw mode in-progress
  if (AE.drawMode === 'polygon' && AE.drawPoints.length > 0) {
    ctx.strokeStyle = 'rgba(100,200,255,0.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(AE.drawPoints[0][0] * R, AE.drawPoints[0][1] * R);
    for (let i = 1; i < AE.drawPoints.length; i++) ctx.lineTo(AE.drawPoints[i][0] * R, AE.drawPoints[i][1] * R);
    ctx.stroke(); ctx.setLineDash([]);
    for (const [px, py] of AE.drawPoints) {
      ctx.fillStyle = '#44aaff'; ctx.beginPath(); ctx.arc(px * R, py * R, 5, 0, Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();

  // Selection / hover outlines + vertex handles
  ctx.save(); ctx.translate(CX, CY); ctx.rotate(AE.angle);
  for (const s of AE.shapes) {
    const isSel = s.id === AE.selected;
    const isHov = s.id === AE.hoverId && !isSel;
    if (!isSel && !isHov) continue;
    if (!s.visible) continue;
    ctx.strokeStyle = isSel ? '#44aaff' : 'rgba(200,200,255,0.4)';
    ctx.lineWidth = isSel ? 1.5 : 1;
    ctx.setLineDash([4, 3]);
    aeStrokeOutline(ctx, s, R);
    ctx.setLineDash([]);
    if (isSel) {
      for (const [hx, hy] of aeGetHandlePoints(s, R)) {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#44aaff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function aeRenderLayers() {
  const list = document.getElementById('ae-layers-list');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < AE.shapes.length; i++) {
    const s = AE.shapes[i];
    const row = document.createElement('div');
    row.className = 'ae-layer-row' + (s.id === AE.selected ? ' ae-sel' : '');
    row.dataset.id = s.id;

    // Color dot
    const dot = document.createElement('div');
    dot.className = 'ae-layer-dot';
    const dotColor = s.fill || s.stroke || '#aaaaaa';
    dot.style.background = dotColor;
    row.appendChild(dot);

    // Name (editable on dblclick)
    const name = document.createElement('div');
    name.className = 'ae-layer-name';
    name.textContent = s.label || s.type;
    name.setAttribute('contenteditable', 'false');
    name.title = 'Double-click to rename';
    name.addEventListener('dblclick', e => {
      e.stopPropagation();
      name.setAttribute('contenteditable', 'true');
      name.focus();
      const range = document.createRange();
      range.selectNodeContents(name);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    name.addEventListener('blur', () => {
      name.setAttribute('contenteditable', 'false');
      s.label = name.textContent.trim() || s.type;
    });
    name.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); name.blur(); }
    });
    row.appendChild(name);

    // Visibility toggle
    const vis = document.createElement('button');
    vis.className = 'ae-layer-vis' + (!s.visible ? ' ae-hidden' : '');
    vis.textContent = '👁';
    vis.title = 'Toggle visibility';
    vis.addEventListener('click', e => {
      e.stopPropagation();
      s.visible = !s.visible;
      aeRenderLayers();
    });
    row.appendChild(vis);

    // Delete
    const del = document.createElement('button');
    del.className = 'ae-layer-del';
    del.textContent = '✕';
    del.title = 'Delete shape';
    del.addEventListener('click', e => {
      e.stopPropagation();
      AE.shapes.splice(i, 1);
      if (AE.selected === s.id) { AE.selected = null; aeRenderProps(); }
      aeRenderLayers();
    });
    row.appendChild(del);

    row.addEventListener('click', () => {
      AE.selected = s.id;
      aeRenderLayers();
      aeRenderProps();
    });

    list.appendChild(row);
  }
  if (AE.shapes.length === 0) {
    list.innerHTML = '<div style="font-size:11px;color:#334;text-align:center;padding:14px 0;">No shapes yet</div>';
  }
}

function aeRenderProps() {
  const body = document.getElementById('ae-props-body');
  if (!body) return;
  body.innerHTML = '';
  if (!AE.selected) {
    body.innerHTML = '<div id="ae-props-empty">Select a shape to edit its properties.</div>';
    return;
  }
  const s = AE.shapes.find(x => x.id === AE.selected);
  if (!s) { body.innerHTML = '<div id="ae-props-empty">Select a shape to edit its properties.</div>'; return; }

  const mk = (tag, cls, attrs = {}) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'textContent') el.textContent = v;
      else el.setAttribute(k, v);
    }
    return el;
  };

  // -- General group --
  const genGroup = mk('div', 'ae-prop-group');
  genGroup.appendChild(Object.assign(mk('div', 'ae-prop-group-label'), { textContent: 'General' }));

  // Label
  const labelRow = mk('div', 'ae-prop-row');
  labelRow.appendChild(Object.assign(mk('div', 'ae-prop-lbl'), { textContent: 'Label' }));
  const labelInp = mk('input', 'ae-text-inp');
  labelInp.type = 'text'; labelInp.value = s.label || '';
  labelInp.style.cssText = 'flex:1;min-width:0;';
  labelInp.addEventListener('input', () => { s.label = labelInp.value; aeRenderLayers(); });
  labelRow.appendChild(labelInp);
  genGroup.appendChild(labelRow);

  // Opacity
  const opRow = mk('div', 'ae-prop-row');
  opRow.appendChild(Object.assign(mk('div', 'ae-prop-lbl'), { textContent: 'Opacity' }));
  const opInp = mk('input', 'ae-num-inp');
  opInp.type = 'number'; opInp.step = '0.05'; opInp.min = '0'; opInp.max = '1'; opInp.value = s.opacity ?? 1;
  opInp.addEventListener('input', () => { s.opacity = parseFloat(opInp.value) || 0; });
  opRow.appendChild(opInp);
  genGroup.appendChild(opRow);
  body.appendChild(genGroup);

  // -- Shape-specific group --
  if (s.type === 'ellipse') {
    const shGroup = mk('div', 'ae-prop-group');
    shGroup.appendChild(Object.assign(mk('div', 'ae-prop-group-label'), { textContent: 'Ellipse' }));
    for (const [lbl, key] of [['X', 'x'], ['Y', 'y'], ['RX', 'rx'], ['RY', 'ry'], ['Rot°', 'rot']]) {
      const row = mk('div', 'ae-prop-row');
      row.appendChild(Object.assign(mk('div', 'ae-prop-lbl'), { textContent: lbl }));
      const inp = mk('input', 'ae-num-inp');
      inp.type = 'number'; inp.step = '0.01'; inp.value = s[key] ?? 0;
      inp.addEventListener('input', () => { s[key] = parseFloat(inp.value) || 0; });
      row.appendChild(inp);
      shGroup.appendChild(row);
    }
    body.appendChild(shGroup);
  } else if (s.type === 'polygon' || s.type === 'line') {
    const vtxGroup = mk('div', 'ae-prop-group');
    vtxGroup.appendChild(Object.assign(mk('div', 'ae-prop-group-label'), { textContent: 'Vertices' }));
    const vtxList = mk('div', 'ae-vertices-list');
    const rebuildVtx = () => {
      vtxList.innerHTML = '';
      (s.points || []).forEach((pt, vi) => {
        const row = mk('div', 'ae-vtx-row');
        const idxLbl = mk('div', 'ae-vtx-idx'); idxLbl.textContent = vi;
        const xInp = mk('input', 'ae-num-inp');
        xInp.type = 'number'; xInp.step = '0.01'; xInp.value = pt[0]; xInp.title = 'X';
        xInp.addEventListener('input', () => { pt[0] = parseFloat(xInp.value) || 0; });
        const yInp = mk('input', 'ae-num-inp');
        yInp.type = 'number'; yInp.step = '0.01'; yInp.value = pt[1]; yInp.title = 'Y';
        yInp.addEventListener('input', () => { pt[1] = parseFloat(yInp.value) || 0; });
        const delBtn = mk('button', 'ae-vtx-del'); delBtn.textContent = '✕';
        delBtn.addEventListener('click', () => {
          s.points.splice(vi, 1);
          rebuildVtx();
        });
        row.appendChild(idxLbl); row.appendChild(xInp); row.appendChild(yInp); row.appendChild(delBtn);
        vtxList.appendChild(row);
      });
    };
    rebuildVtx();
    vtxGroup.appendChild(vtxList);
    const addVtxBtn = mk('button', 'ae-add-vtx-btn'); addVtxBtn.textContent = '+ Add Vertex';
    addVtxBtn.addEventListener('click', () => {
      if (!s.points) s.points = [];
      s.points.push([0, 0]);
      rebuildVtx();
    });
    vtxGroup.appendChild(addVtxBtn);
    body.appendChild(vtxGroup);
  }

  // -- Fill group --
  const fillGroup = mk('div', 'ae-prop-group');
  fillGroup.appendChild(Object.assign(mk('div', 'ae-prop-group-label'), { textContent: 'Fill' }));

  const fillRow = mk('div', 'ae-color-row');
  const fillSwatch = mk('div', 'ae-color-swatch');
  fillSwatch.style.background = s.fill || '#000000';
  if (!s.fill) fillSwatch.classList.add('ae-color-swatch-none');
  const fillColorInp = mk('input', 'ae-color-inp');
  fillColorInp.type = 'color'; fillColorInp.value = s.fill || '#ff0000';
  fillColorInp.style.cssText = 'position:absolute;opacity:0;width:0;height:0;pointer-events:none;';
  fillSwatch.appendChild(fillColorInp);
  fillSwatch.addEventListener('click', () => { if (s.fill) fillColorInp.click(); });
  fillColorInp.addEventListener('input', () => {
    s.fill = fillColorInp.value;
    fillSwatch.style.background = s.fill;
    fillSwatch.classList.remove('ae-color-swatch-none');
    aeRenderLayers();
  });

  const noFillCb = mk('input', 'ae-nofill-cb');
  noFillCb.type = 'checkbox'; noFillCb.id = 'ae-nofill-cb'; noFillCb.checked = !s.fill;
  noFillCb.addEventListener('change', () => {
    if (noFillCb.checked) {
      s.fill = null;
      fillSwatch.style.background = '#000';
      fillSwatch.classList.add('ae-color-swatch-none');
    } else {
      s.fill = fillColorInp.value || '#ff0000';
      fillSwatch.style.background = s.fill;
      fillSwatch.classList.remove('ae-color-swatch-none');
    }
    aeRenderLayers();
  });
  const noFillLbl = mk('label', 'ae-nofill-lbl');
  noFillLbl.setAttribute('for', 'ae-nofill-cb'); noFillLbl.textContent = 'No Fill';

  fillRow.appendChild(fillSwatch);
  fillRow.appendChild(noFillCb);
  fillRow.appendChild(noFillLbl);
  fillGroup.appendChild(fillRow);
  body.appendChild(fillGroup);

  // -- Stroke group --
  const strokeGroup = mk('div', 'ae-prop-group');
  strokeGroup.appendChild(Object.assign(mk('div', 'ae-prop-group-label'), { textContent: 'Stroke' }));

  const strokeRow = mk('div', 'ae-color-row');
  const strokeSwatch = mk('div', 'ae-color-swatch');
  strokeSwatch.style.background = s.stroke || '#000000';
  if (!s.stroke) strokeSwatch.classList.add('ae-color-swatch-none');
  const strokeColorInp = mk('input', 'ae-color-inp');
  strokeColorInp.type = 'color'; strokeColorInp.value = s.stroke || '#ffffff';
  strokeColorInp.style.cssText = 'position:absolute;opacity:0;width:0;height:0;pointer-events:none;';
  strokeSwatch.appendChild(strokeColorInp);
  strokeSwatch.addEventListener('click', () => { if (s.stroke) strokeColorInp.click(); });
  strokeColorInp.addEventListener('input', () => {
    s.stroke = strokeColorInp.value;
    strokeSwatch.style.background = s.stroke;
    strokeSwatch.classList.remove('ae-color-swatch-none');
    aeRenderLayers();
  });

  const noStrokeCb = mk('input', 'ae-nofill-cb');
  noStrokeCb.type = 'checkbox'; noStrokeCb.id = 'ae-nostroke-cb'; noStrokeCb.checked = !s.stroke;
  noStrokeCb.addEventListener('change', () => {
    if (noStrokeCb.checked) {
      s.stroke = null;
      strokeSwatch.style.background = '#000';
      strokeSwatch.classList.add('ae-color-swatch-none');
    } else {
      s.stroke = strokeColorInp.value || '#ffffff';
      strokeSwatch.style.background = s.stroke;
      strokeSwatch.classList.remove('ae-color-swatch-none');
    }
    aeRenderLayers();
  });
  const noStrokeLbl = mk('label', 'ae-nofill-lbl');
  noStrokeLbl.setAttribute('for', 'ae-nostroke-cb'); noStrokeLbl.textContent = 'No Stroke';

  strokeRow.appendChild(strokeSwatch);
  strokeRow.appendChild(noStrokeCb);
  strokeRow.appendChild(noStrokeLbl);
  strokeGroup.appendChild(strokeRow);

  const swRow = mk('div', 'ae-prop-row');
  swRow.appendChild(Object.assign(mk('div', 'ae-prop-lbl'), { textContent: 'Width' }));
  const swInp = mk('input', 'ae-num-inp');
  swInp.type = 'number'; swInp.step = '0.1'; swInp.min = '0'; swInp.value = s.sw ?? 1.5;
  swInp.addEventListener('input', () => { s.sw = parseFloat(swInp.value) || 0; });
  swRow.appendChild(swInp);
  strokeGroup.appendChild(swRow);
  body.appendChild(strokeGroup);

  // -- Delete shape button --
  const delBtn = mk('button', 'ae-del-shape-btn'); delBtn.textContent = '🗑 Delete Shape';
  delBtn.addEventListener('click', () => {
    const idx = AE.shapes.findIndex(x => x.id === AE.selected);
    if (idx >= 0) AE.shapes.splice(idx, 1);
    AE.selected = null;
    aeRenderLayers();
    aeRenderProps();
  });
  body.appendChild(delBtn);
}

function aeShapeToCode(s) {
  const fmt = v => {
    const n = parseFloat(v);
    return (n === 0) ? '0' : (Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/\.?0+$/, ''));
  };
  const lines = [];
  if (s.fill || s.stroke || s.sw) {
    const parts = [];
    if (s.fill) parts.push(`ctx.fillStyle='${s.fill}';`);
    if (s.stroke) parts.push(`ctx.strokeStyle='${s.stroke}';`);
    if (s.sw) parts.push(`ctx.lineWidth=${fmt(s.sw)};`);
    lines.push('  ' + parts.join(' '));
  }
  if ((s.opacity ?? 1) !== 1) lines.push(`  ctx.globalAlpha=${fmt(s.opacity)};`);

  switch (s.type) {
    case 'ellipse': {
      const rotRad = ((s.rot || 0) * Math.PI / 180);
      const rotStr = rotRad === 0 ? '0' : fmt(rotRad);
      lines.push(`  ctx.beginPath();`);
      lines.push(`  ctx.ellipse(r*${fmt(s.x)}, r*${fmt(s.y)}, r*${fmt(Math.abs(s.rx))}, r*${fmt(Math.abs(s.ry))}, ${rotStr}, 0, Math.PI*2);`);
      if (s.fill) lines.push(`  ctx.fill();`);
      if (s.stroke) lines.push(`  ctx.stroke();`);
      break;
    }
    case 'polygon': {
      if (!s.points || s.points.length < 2) break;
      lines.push(`  ctx.beginPath();`);
      lines.push(`  ctx.moveTo(r*${fmt(s.points[0][0])}, r*${fmt(s.points[0][1])});`);
      for (let i = 1; i < s.points.length; i++)
        lines.push(`  ctx.lineTo(r*${fmt(s.points[i][0])}, r*${fmt(s.points[i][1])});`);
      lines.push(`  ctx.closePath();`);
      if (s.fill) lines.push(`  ctx.fill();`);
      if (s.stroke) lines.push(`  ctx.stroke();`);
      break;
    }
    case 'line': {
      if (!s.points || s.points.length < 2) break;
      lines.push(`  ctx.beginPath();`);
      lines.push(`  ctx.moveTo(r*${fmt(s.points[0][0])}, r*${fmt(s.points[0][1])});`);
      for (let i = 1; i < s.points.length; i++)
        lines.push(`  ctx.lineTo(r*${fmt(s.points[i][0])}, r*${fmt(s.points[i][1])});`);
      if (s.stroke) lines.push(`  ctx.stroke();`);
      break;
    }
  }
  if ((s.opacity ?? 1) !== 1) lines.push(`  ctx.globalAlpha=1;`);
  return lines.join('\n');
}

function aeGenerateCode() {
  const shapeBlocks = AE.shapes
    .filter(s => s.visible)
    .map(s => aeShapeToCode(s))
    .filter(Boolean)
    .join('\n');
  return `case '${AE.raceId}': {\n  ctx.rotate(fa);\n${shapeBlocks}\n  eyes(); break;\n}`;
}

// ---- Canvas mouse events ----
function aeSetupCanvas() {
  const canvas = document.getElementById('ae-canvas');
  if (!canvas) return;

  let lastClickTime = 0;

  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const { lx, ly } = aeScreenToLocal(e);

    if (AE.drawMode === 'polygon') {
      const now = Date.now();
      if (now - lastClickTime < 350 && AE.drawPoints.length >= 2) {
        // Double-click: close polygon
        const newShape = {
          id: aeNewId(),
          type: 'polygon',
          label: 'Polygon ' + AE.nextId,
          points: AE.drawPoints.map(p => [...p]),
          fill: '#445566',
          stroke: '#aabbcc',
          sw: 1.5,
          opacity: 1,
          visible: true
        };
        AE.shapes.push(newShape);
        AE.selected = newShape.id;
        AE.drawMode = null;
        AE.drawPoints = [];
        document.getElementById('ae-add-polygon-btn').classList.remove('ae-active-mode');
        document.getElementById('ae-mode-hint').textContent = '';
        aeRenderLayers();
        aeRenderProps();
      } else {
        AE.drawPoints.push([lx, ly]);
      }
      lastClickTime = now;
      return;
    }

    // Freeze angle
    AE.frozenAngle = AE.angle;
    const hit = aeHitTest(lx, ly);
    if (!hit) {
      AE.selected = null;
      aeRenderLayers();
      aeRenderProps();
      return;
    }
    if (hit.id !== AE.selected) {
      AE.selected = hit.id;
      aeRenderLayers();
      aeRenderProps();
    }
    const s = AE.shapes.find(x => x.id === hit.id);
    if (!s) return;
    AE.dragging = true;
    AE.dragType = hit.type;
    AE.dragVertexIdx = hit.idx;
    AE.dragStartLx = lx;
    AE.dragStartLy = ly;
    if (s.type === 'ellipse') {
      AE.dragSnapX = s.x;
      AE.dragSnapY = s.y;
    }
    if (s.points) {
      AE.dragSnapPoints = s.points.map(p => [...p]);
    }
    e.preventDefault();
  });

  canvas.addEventListener('mousemove', e => {
    const { lx, ly } = aeScreenToLocal(e);
    if (AE.dragging) {
      const s = AE.shapes.find(x => x.id === AE.selected);
      if (!s) return;
      const dlx = lx - AE.dragStartLx;
      const dly = ly - AE.dragStartLy;
      if (AE.dragType === 'body') {
        if (s.type === 'ellipse') {
          s.x = +(AE.dragSnapX + dlx).toFixed(4);
          s.y = +(AE.dragSnapY + dly).toFixed(4);
          // Sync props panel
          const props = document.getElementById('ae-props-body');
          if (props) {
            const inputs = props.querySelectorAll('input[type="number"]');
            // x and y are first two in ellipse group
          }
        } else if (s.points && AE.dragSnapPoints) {
          for (let i = 0; i < s.points.length; i++) {
            s.points[i][0] = +(AE.dragSnapPoints[i][0] + dlx).toFixed(4);
            s.points[i][1] = +(AE.dragSnapPoints[i][1] + dly).toFixed(4);
          }
        }
      } else if (AE.dragType === 'vertex') {
        const idx = AE.dragVertexIdx;
        if (s.type === 'ellipse') {
          // Vertex handles for ellipse: adjust rx/ry/position based on handle index
          const cx = AE.dragSnapX, cy = AE.dragSnapY;
          const origHandles = [
            // 8 handles: corners and mid-edges
            // lx,ly are already in r-units
          ];
          // For ellipse, just move body on vertex drag for simplicity
          s.x = +(AE.dragSnapX + dlx).toFixed(4);
          s.y = +(AE.dragSnapY + dly).toFixed(4);
        } else if (s.points && AE.dragSnapPoints && idx >= 0 && idx < s.points.length) {
          s.points[idx][0] = +(AE.dragSnapPoints[idx][0] + dlx).toFixed(4);
          s.points[idx][1] = +(AE.dragSnapPoints[idx][1] + dly).toFixed(4);
        }
      }
      // Refresh props for live update
      aeRenderProps();
    } else {
      // Hover
      const hit = aeHitTest(lx, ly);
      const newHover = hit ? hit.id : null;
      if (newHover !== AE.hoverId) {
        AE.hoverId = newHover;
        canvas.style.cursor = newHover ? 'pointer' : (AE.drawMode ? 'crosshair' : 'default');
      }
    }
  });

  canvas.addEventListener('mouseup', () => {
    if (AE.dragging) {
      AE.dragging = false;
      AE.dragType = null;
      AE.dragVertexIdx = -1;
      AE.dragSnapPoints = null;
      aeRenderProps();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    AE.hoverId = null;
    if (AE.dragging) {
      AE.dragging = false;
      AE.dragType = null;
    }
  });
}

// ---- Wire up UI ----
(function aeInit() {
  document.addEventListener('DOMContentLoaded', () => {
    // Open button
    const openBtn = document.getElementById('assetEditorBtn');
    if (openBtn) openBtn.addEventListener('click', () => aeOpen('gnome'));

    // Close button
    const closeBtn = document.getElementById('ae-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', aeClose);

    // Race selector
    const raceSel = document.getElementById('ae-race-select');
    if (raceSel) {
      raceSel.addEventListener('change', () => aeLoadRace(raceSel.value));
    }

    // Spin checkbox
    const spinCb = document.getElementById('ae-spin-cb');
    if (spinCb) spinCb.addEventListener('change', () => { AE.spinning = spinCb.checked; });

    // Add shape buttons
    const addEllipseBtn = document.getElementById('ae-add-ellipse-btn');
    if (addEllipseBtn) addEllipseBtn.addEventListener('click', () => {
      const s = {
        id: aeNewId(), type: 'ellipse', label: 'Ellipse ' + AE.nextId,
        x: 0, y: -1.0, rx: 0.5, ry: 0.2, rot: 0,
        fill: '#445566', stroke: '#aabbcc', sw: 1.5, opacity: 1, visible: true
      };
      AE.shapes.push(s);
      AE.selected = s.id;
      AE.drawMode = null;
      AE.drawPoints = [];
      document.getElementById('ae-add-polygon-btn').classList.remove('ae-active-mode');
      document.getElementById('ae-mode-hint').textContent = '';
      aeRenderLayers();
      aeRenderProps();
    });

    const addPolygonBtn = document.getElementById('ae-add-polygon-btn');
    if (addPolygonBtn) addPolygonBtn.addEventListener('click', () => {
      if (AE.drawMode === 'polygon') {
        // Cancel
        AE.drawMode = null;
        AE.drawPoints = [];
        addPolygonBtn.classList.remove('ae-active-mode');
        document.getElementById('ae-mode-hint').textContent = '';
      } else {
        AE.drawMode = 'polygon';
        AE.drawPoints = [];
        addPolygonBtn.classList.add('ae-active-mode');
        document.getElementById('ae-mode-hint').textContent = 'Click to add vertices • Double-click to finish';
      }
    });

    const addLineBtn = document.getElementById('ae-add-line-btn');
    if (addLineBtn) addLineBtn.addEventListener('click', () => {
      const s = {
        id: aeNewId(), type: 'line', label: 'Line ' + AE.nextId,
        points: [[-0.5, 0], [0.5, 0]],
        fill: null, stroke: '#aabbcc', sw: 1.5, opacity: 1, visible: true
      };
      AE.shapes.push(s);
      AE.selected = s.id;
      AE.drawMode = null;
      AE.drawPoints = [];
      document.getElementById('ae-add-polygon-btn').classList.remove('ae-active-mode');
      document.getElementById('ae-mode-hint').textContent = '';
      aeRenderLayers();
      aeRenderProps();
    });

    // Clear all
    const clearBtn = document.getElementById('ae-clear-btn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      if (!confirm('Clear all shapes for this race?')) return;
      AE.shapes = [];
      AE.selected = null;
      AE.drawMode = null;
      AE.drawPoints = [];
      document.getElementById('ae-add-polygon-btn').classList.remove('ae-active-mode');
      document.getElementById('ae-mode-hint').textContent = '';
      aeRenderLayers();
      aeRenderProps();
    });

    // Save-indicator helper — call whenever race or save state changes
    function aeUpdateSaveIndicator() {
      const hasSave = !!(window._raceAssetOverrides && Object.prototype.hasOwnProperty.call(window._raceAssetOverrides, AE.raceId));
      const btn = document.getElementById('ae-save-btn');
      const ind = document.getElementById('ae-save-indicator');
      if (btn) btn.classList.toggle('has-save', hasSave);
      if (ind) ind.classList.toggle('visible', hasSave);
    }

    // Save — persist to localStorage and apply immediately in drawRaceDecoration
    const saveBtn = document.getElementById('ae-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      const raceId = AE.raceId;
      const snapshots = AE.shapes.map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
      window._raceAssetOverrides = window._raceAssetOverrides || {};
      window._raceAssetOverrides[raceId] = snapshots;
      localStorage.setItem('raceAssets', JSON.stringify(window._raceAssetOverrides));
      saveBtn.textContent = '✓ Saved!';
      setTimeout(() => { saveBtn.textContent = '💾 Save'; }, 1500);
      aeUpdateSaveIndicator();
    });

    // Default — restore hardcoded defaults for current race
    const defaultBtn = document.getElementById('ae-default-btn');
    if (defaultBtn) defaultBtn.addEventListener('click', () => {
      const raceId = AE.raceId;
      const defs = AE_RACE_DEFAULTS[raceId];
      if (defs) {
        AE.shapes = defs.map(s => Object.assign({ id: aeNewId() }, s,
          s.points ? { points: s.points.map(p => [...p]) } : {}));
      } else {
        AE.shapes = [];
      }
      AE.selected = null;
      // Only resets in-memory view — does NOT touch localStorage.
      // To persist, click 💾 Save after resetting.
      window.AE_DATA[raceId] = AE.shapes.map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
      aeRenderLayers();
      aeRenderProps();
      defaultBtn.textContent = '✓ Reset!';
      setTimeout(() => { defaultBtn.textContent = '⚡ Default'; }, 1500);
      // indicator unchanged — Default doesn't touch save state
    });

    // Remove Save — deletes localStorage override, restores built-in animated switch case
    const removeSaveBtn = document.getElementById('ae-remove-save-btn');
    if (removeSaveBtn) removeSaveBtn.addEventListener('click', () => {
      const raceId = AE.raceId;
      if (window._raceAssetOverrides) delete window._raceAssetOverrides[raceId];
      localStorage.setItem('raceAssets', JSON.stringify(window._raceAssetOverrides || {}));
      aeUpdateSaveIndicator();
    });

    // Export (kept for reference, button removed from UI)
    const exportBtn = document.getElementById('ae-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', () => {
      const code = aeGenerateCode();
      document.getElementById('ae-export-code').value = code;
      document.getElementById('ae-export-modal').classList.add('open');
    });

    // Copy
    const copyBtn = document.getElementById('ae-copy-btn');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      const ta = document.getElementById('ae-export-code');
      ta.select();
      try { document.execCommand('copy'); } catch(e) {}
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1500);
    });

    // Export close
    const exportClose = document.getElementById('ae-export-close');
    if (exportClose) exportClose.addEventListener('click', () => {
      document.getElementById('ae-export-modal').classList.remove('open');
    });
    const exportModal = document.getElementById('ae-export-modal');
    if (exportModal) exportModal.addEventListener('click', e => {
      if (e.target === exportModal) exportModal.classList.remove('open');
    });

    // Close editor on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (document.getElementById('ae-export-modal').classList.contains('open')) {
          document.getElementById('ae-export-modal').classList.remove('open');
        } else if (document.getElementById('screen-asset-editor').classList.contains('ae-open')) {
          if (AE.drawMode) {
            AE.drawMode = null;
            AE.drawPoints = [];
            const pb = document.getElementById('ae-add-polygon-btn');
            if (pb) pb.classList.remove('ae-active-mode');
            const hint = document.getElementById('ae-mode-hint');
            if (hint) hint.textContent = '';
          } else {
            aeClose();
          }
        }
      }
    });

    aeSetupCanvas();
  });
})();

// Load roster on start
renderRoster();
