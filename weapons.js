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
