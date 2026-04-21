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
      // Only reduce if current cooldown is above the floor (avoids jumping UP for high-SPD balls)
      if (w.attackCooldown > this.scaling.min) {
        w.attackCooldown = Math.max(this.scaling.min, w.attackCooldown + this.scaling.amount);
      }
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
      const mid  = ball.radius + this.baseLength * 0.65;
      const near = ball.radius + this.baseLength * 0.35;
      return [
        { x: ball.x + Math.cos(w.angle)*len,  y: ball.y + Math.sin(w.angle)*len,  r: 8 },
        { x: ball.x + Math.cos(w.angle)*mid,  y: ball.y + Math.sin(w.angle)*mid,  r: 6 },
        { x: ball.x + Math.cos(w.angle)*near, y: ball.y + Math.sin(w.angle)*near, r: 6 },
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
      const tipX = ball.x + Math.cos(w.angle) * len;
      const tipY = ball.y + Math.sin(w.angle) * len;
      const perpAngle = w.angle + Math.PI / 2;
      return [
        { x: tipX, y: tipY, r: 8 },
        { x: tipX + Math.cos(perpAngle)*8, y: tipY + Math.sin(perpAngle)*8, r: 6 },
        { x: tipX - Math.cos(perpAngle)*8, y: tipY - Math.sin(perpAngle)*8, r: 6 },
      ];
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
    desc: '5h: +dmg/hit | 10h: faster | 15h: dual blades | 20h: +reach',
    aiType: 'melee',
    baseLength: 48, baseSpeed: 0.045, baseDamage: 1, baseKnockback: 5,
    hitRadius: 18, attackCooldown: 34,
    scaling: { type: 'multi', thresholds: [5, 10, 15, 20] },
    scalingLabel: 'Hits→Power',
    draw(ctx, ball) {
      const w = ball.weapon;
      this._drawBlade(ctx, ball, w.angle, w.hits >= 15);
      if (w.hits >= 15) {
        this._drawBlade(ctx, ball, w.angle + Math.PI, false);
      }
    },
    _drawBlade(ctx, ball, angle, glow) {
      const len = ball.radius + this.baseLength + (ball.weapon.bonusLength || 0);
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
      const len = ball.radius + this.baseLength + (w.bonusLength || 0);
      const pts = [];
      // primary blade arc sweep points
      for (let i = -2; i <= 2; i++) {
        const a = w.angle + i * 0.25;
        pts.push({ x: ball.x + Math.cos(a)*(len-8), y: ball.y + Math.sin(a)*(len-8), r: 16 });
      }
      // dual blade at 15 hits
      if (w.hits >= 15) {
        for (let i = -2; i <= 2; i++) {
          const a = w.angle + Math.PI + i * 0.25;
          pts.push({ x: ball.x + Math.cos(a)*(len-8), y: ball.y + Math.sin(a)*(len-8), r: 16 });
        }
      }
      return pts;
    },
    onHit(w) {
      w.hits++;
      // Milestone 5: +0.3 bonus damage mỗi hit từ đây trở đi
      if (w.hits >= 5) {
        w.bonusDamage = (w.bonusDamage || 0) + 0.3;
        if (w.hits === 5) sfxScale();
      }
      // Milestone 10: swing nhanh hơn (−6 cooldown, floor 14)
      if (w.hits === 10) {
        w.attackCooldown = Math.max(14, w.attackCooldown - 6);
        sfxScale();
      }
      // Milestone 15: dual blades
      if (w.hits === 15) sfxScale();
      // Milestone 20: +12px blade reach
      if (w.hits === 20) {
        w.bonusLength = (w.bonusLength || 0) + 12;
        sfxScale();
      }
    }
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
      w.shurikenCount = Math.min((w.shurikenCount||1) + this.scaling.amount, this.scaling.max);
      sfxScale();
    }
  },

  // ─── FORBIDDEN WEAPONS ──────────────────────────────────────────────────────
  {
    id: 'rapier', name: 'Rapier', icon: '🤺', color: '#aae0ff',
    desc: 'Riposte',
    aiType: 'melee',
    baseLength: 40, baseSpeed: 0.072, baseDamage: 0.8,
    baseKnockback: 2, hitRadius: 6, attackCooldown: 18,
    reverseOnHit: true,
    scaling: { type: 'riposte' }, scalingLabel: 'Riposte Dmg',
    draw(ctx, ball) {
      const w   = ball.weapon;
      const len = ball.radius + this.baseLength;
      const bx  = ball.x + Math.cos(w.angle) * ball.radius;
      const by  = ball.y + Math.sin(w.angle) * ball.radius;
      const ex  = ball.x + Math.cos(w.angle) * len;
      const ey  = ball.y + Math.sin(w.angle) * len;
      const riposteActive = w.riposteWindow > 0;
      ctx.save();
      // Blade: thin silver-blue
      ctx.strokeStyle = riposteActive ? '#ffe066' : '#aae0ff';
      ctx.lineWidth = riposteActive ? 3 : 2;
      ctx.lineCap = 'round';
      if (riposteActive) {
        ctx.shadowColor = '#ffe066';
        ctx.shadowBlur = 10;
      }
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // Spine highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // Tip glow when riposte window open
      if (riposteActive) {
        ctx.shadowColor = '#ffe066';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#ffe066';
        ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#ddeeff';
        ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill();
      }
      // Guard — small crossbar
      const guardDist = ball.radius + 6;
      const gx = ball.x + Math.cos(w.angle) * guardDist;
      const gy = ball.y + Math.sin(w.angle) * guardDist;
      const perp = w.angle + Math.PI / 2;
      ctx.strokeStyle = '#88bbdd';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(gx + Math.cos(perp)*8, gy + Math.sin(perp)*8);
      ctx.lineTo(gx - Math.cos(perp)*8, gy - Math.sin(perp)*8);
      ctx.stroke();
      ctx.restore();
    },
    getHitPoints(ball) {
      const w   = ball.weapon;
      const len = ball.radius + this.baseLength;
      return [{ x: ball.x + Math.cos(w.angle) * len, y: ball.y + Math.sin(w.angle) * len, r: 6 }];
    },
    onHit(w) {
      w.hits++;
      if (w.riposteWindow > 0) {
        w.riposteWindow  = 0; // consumed — multiplier already applied in getDamage
        w.riposteStacks  = 0; // reset parry stacks after lunge fires
      }
    }
  },
  {
    id: 'katana', name: 'Katana', icon: '⚔️', color: '#e8e8ff',
    desc: 'Momentum',
    aiType: 'melee',
    baseLength: 62, baseSpeed: 0.038, baseDamage: 1.5,
    baseKnockback: 7, hitRadius: 8, attackCooldown: 42,
    reverseOnHit: true,
    scaling: { type: 'momentum', max: 5 }, scalingLabel: 'Momentum',
    draw(ctx, ball) {
      const w     = ball.weapon;
      const stacks = w.momentumStacks || 0;
      const iai   = !!w.iaiReady;
      const len   = ball.radius + this.baseLength;
      const bx    = ball.x + Math.cos(w.angle) * ball.radius;
      const by    = ball.y + Math.sin(w.angle) * ball.radius;
      const ex    = ball.x + Math.cos(w.angle) * len;
      const ey    = ball.y + Math.sin(w.angle) * len;
      ctx.save();
      // Aura rings for each momentum stack
      for (let i = 0; i < stacks; i++) {
        const ringR = ball.radius + 4 + i * 5;
        ctx.strokeStyle = iai ? `rgba(255,255,200,${0.5 - i * 0.05})` : `rgba(200,200,255,${0.35 - i * 0.04})`;
        ctx.lineWidth = iai ? 2.5 : 1.5;
        ctx.shadowColor = iai ? '#ffffaa' : '#aaaaff';
        ctx.shadowBlur = iai ? 8 : 4;
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ringR, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.shadowBlur = 0;
      // Blade: long, white-bright
      const bladeColor = iai ? '#ffffee' : '#e8e8ff';
      ctx.strokeStyle = bladeColor;
      ctx.lineWidth = iai ? 4 : 3;
      ctx.lineCap = 'round';
      if (iai) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 14; }
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // Spine fuller (center groove line) — subtle darker streak
      ctx.strokeStyle = 'rgba(160,160,220,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.restore();
    },
    getHitPoints(ball) {
      const w   = ball.weapon;
      const mid = ball.radius + this.baseLength * 0.6;
      const tip = ball.radius + this.baseLength;
      return [
        { x: ball.x + Math.cos(w.angle) * tip, y: ball.y + Math.sin(w.angle) * tip, r: 8 },
        { x: ball.x + Math.cos(w.angle) * mid, y: ball.y + Math.sin(w.angle) * mid, r: 7 },
      ];
    },
    onHit(w) {
      w.hits++;
      if (w.iaiReady) {
        // IAI STRIKE: multiplier already applied in getDamage; reset here
        w.momentumStacks = 0;
        w.iaiReady = false;
        w.momentumTimer = 0;
      } else {
        w.momentumStacks = Math.min(5, (w.momentumStacks || 0) + 1);
        w.momentumTimer = 180;
        if (w.momentumStacks >= 5) w.iaiReady = true;
      }
    }
  },

  // ══════════════════════════════════════════════════════════
  // ★ UNIQUE WEAPONS (Championship only — removed from pool once rolled)
  // ══════════════════════════════════════════════════════════
  {
    id: 'jingubang', name: 'Jingubang 如意棒', icon: '🪄', color: '#ffd700',
    unique: true, baseWeapon: 'spear',
    desc: "Sun Wukong's legendary staff. Grows longer faster than any spear. Every 6 hits: WHIRL — spins 360° around itself for 4s, dealing damage to all nearby enemies.",
    aiType: 'melee',
    baseLength: 52, baseSpeed: 0.032, baseDamage: 1.2, baseKnockback: 6,
    hitRadius: 11, attackCooldown: 34,
    scaling: { type: 'length_damage', lengthAmt: 7, damageAmt: 0.45 },
    scalingLabel: 'Length+Dmg',
    _getLen(w) { return this.baseLength + (w.bonusLength || 0); },
    // Helper: draw one rectangular band cap perpendicular to staff angle
    _drawBand(ctx, px, py, angle, bw, bh, fillColor) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = fillColor;
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1;
      ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
      ctx.restore();
    },
    draw(ctx, ball) {
      const w        = ball.weapon;
      const whirl    = w.whirlTimer > 0;
      const staffLen = this._getLen(w);
      const a        = w.angle;

      const frontDist = ball.radius + staffLen;
      const backDist  = ball.radius + staffLen * 0.38;
      const tipX  = ball.x + Math.cos(a) * frontDist;
      const tipY  = ball.y + Math.sin(a) * frontDist;
      const backX = ball.x + Math.cos(a + Math.PI) * backDist;
      const backY = ball.y + Math.sin(a + Math.PI) * backDist;

      ctx.save();

      // Whirl mode: pulsing danger-zone ring
      if (whirl) {
        const pulse = 0.12 + Math.sin(w.whirlTimer * 0.25) * 0.07;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, frontDist, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,210,0,${pulse})`;
        ctx.lineWidth = 5; ctx.stroke();
        // inner ring
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, backDist, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,100,0,${pulse * 0.6})`;
        ctx.lineWidth = 2; ctx.stroke();
      }

      ctx.shadowColor = whirl ? '#ffee00' : '#ffd700';
      ctx.shadowBlur  = whirl ? 18 + Math.sin(w.whirlTimer * 0.2) * 6 : 5 + (w.hits || 0) * 0.6;

      // === Shaft (flat butt ends — not rounded like spear) ===
      const shaftW = whirl ? 9 : 6;
      ctx.beginPath();
      ctx.moveTo(backX, backY); ctx.lineTo(tipX, tipY);
      ctx.strokeStyle = whirl ? '#cc9900' : '#996611';
      ctx.lineWidth = shaftW; ctx.lineCap = 'butt'; ctx.stroke();

      // Shimmer line
      ctx.beginPath();
      ctx.moveTo(backX, backY); ctx.lineTo(tipX, tipY);
      ctx.strokeStyle = whirl ? '#fff0aa' : '#ffcc44';
      ctx.lineWidth = whirl ? 3 : 2; ctx.lineCap = 'butt'; ctx.stroke();

      // === Rectangular end caps (no triangle — flat rectangular) ===
      const bw = whirl ? 18 : 12;
      const bh = whirl ? 10 : 7;
      this._drawBand(ctx, tipX,  tipY,  a, bw,       bh,       whirl ? '#ffcc00' : '#cc8800');
      this._drawBand(ctx, backX, backY, a, bw * 0.8, bh * 0.8, whirl ? '#ffcc00' : '#cc8800');
      // Decorative mid-band
      const midX = ball.x + Math.cos(a) * (ball.radius + staffLen * 0.5);
      const midY = ball.y + Math.sin(a) * (ball.radius + staffLen * 0.5);
      this._drawBand(ctx, midX, midY, a, bw * 0.65, bh * 0.55, '#995500');

      ctx.restore();
    },
    getHitPoints(ball) {
      const w        = ball.weapon;
      const staffLen = this._getLen(w);

      // Whirl: full 360° coverage at sweep radius
      if (w.whirlTimer > 0) {
        const pts = [];
        const sweepR = ball.radius + staffLen;
        const N = 14;
        for (let i = 0; i < N; i++) {
          const a = (i / N) * Math.PI * 2;
          pts.push({ x: ball.x + Math.cos(a) * sweepR, y: ball.y + Math.sin(a) * sweepR, r: 13 });
        }
        return pts;
      }

      // Normal: shaft hitpoints
      const pts = [];
      const shaftStart = ball.radius;
      for (let i = 1; i <= 7; i++) {
        const d = shaftStart + (i / 7) * staffLen;
        pts.push({ x: ball.x + Math.cos(w.angle) * d, y: ball.y + Math.sin(w.angle) * d, r: 11 });
      }
      return pts;
    },
    onHit(w) {
      w.hits++;
      w.bonusLength = (w.bonusLength || 0) + this.scaling.lengthAmt;
      w.bonusDamage = (w.bonusDamage || 0) + this.scaling.damageAmt;
      if (w.hits % 6 === 0) {
        // Activate WHIRL every 6 hits
        w.whirlTimer = 240; // 4 seconds @ 60fps
        w.whirlJustActivated = true;
        sfxScale(); sfxScale();
      } else {
        sfxScale();
      }
    },
  },

  // ══════════════════════════════════════════════════════════
  // ★★ BRAINSTORMED UNIQUE WEAPONS — 10 weapons, one per base
  // ══════════════════════════════════════════════════════════

  // ⚔️ Excalibur — Unique Sword
  {
    id: 'excalibur', name: 'Excalibur', icon: '🌟', color: '#fff5aa',
    unique: true, baseWeapon: 'sword',
    desc: 'The Sword of Kings. Scales damage on hit. When HP drops to ≤30% → Last Stand: 20s Transform Mode, firing a Sword Beam every 2s (piercing, high damage).',
    aiType: 'melee',
    baseLength: 55, baseSpeed: 0.058, baseDamage: 1.2, baseKnockback: 4,
    hitRadius: 8, attackCooldown: 28,
    scaling: { type: 'damage', amount: 1 },
    scalingLabel: 'Damage',
    draw(ctx, ball) {
      const w = ball.weapon;
      const transformed = (w.excaliburTransformTimer || 0) > 0;
      const pulse = transformed ? (0.6 + 0.4 * Math.sin(Date.now() * 0.008)) : 1;
      const lenBonus = transformed ? 30 : 0;
      const len = ball.radius + this.baseLength + lenBonus;
      const ex = ball.x + Math.cos(w.angle) * len;
      const ey = ball.y + Math.sin(w.angle) * len;
      const bx = ball.x + Math.cos(w.angle) * ball.radius;
      const by = ball.y + Math.sin(w.angle) * ball.radius;
      ctx.save();
      // Aura glow
      ctx.strokeStyle = transformed ? `rgba(255,230,100,${0.4 * pulse})` : 'rgba(255,255,170,0.12)';
      ctx.lineWidth = transformed ? 16 * pulse : 8;
      ctx.lineCap = 'round';
      ctx.shadowColor = transformed ? '#ffe44c' : '#fff5aa';
      ctx.shadowBlur = transformed ? 24 * pulse : 6;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // Blade
      ctx.strokeStyle = transformed ? '#fff8c0' : '#e8e0a0';
      ctx.lineWidth = transformed ? 10 : 5;
      ctx.shadowBlur = transformed ? 14 : 4;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // White highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = transformed ? 3 : 1.5;
      ctx.shadowBlur = 0;
      const perp = w.angle + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(perp)*1.5, by + Math.sin(perp)*1.5);
      ctx.lineTo(ex + Math.cos(perp)*1.5, ey + Math.sin(perp)*1.5);
      ctx.stroke();
      // Guard
      const gx = ball.x + Math.cos(w.angle) * (ball.radius + 6);
      const gy = ball.y + Math.sin(w.angle) * (ball.radius + 6);
      ctx.strokeStyle = '#d4aa00';
      ctx.lineWidth = transformed ? 14 : 8; ctx.lineCap = 'round'; ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(gx + Math.cos(perp)*(transformed?22:14), gy + Math.sin(perp)*(transformed?22:14));
      ctx.lineTo(gx - Math.cos(perp)*(transformed?22:14), gy - Math.sin(perp)*(transformed?22:14));
      ctx.stroke();
      // Transform timer arc (20s countdown ring)
      if ((w.excaliburTransformTimer || 0) > 0) {
        const frac = w.excaliburTransformTimer / (20 * 60);
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius + 8, -Math.PI/2, -Math.PI/2 + frac * Math.PI * 2);
        ctx.strokeStyle = `rgba(255,230,80,${0.5 + 0.5 * pulse})`;
        ctx.lineWidth = 3; ctx.shadowColor = '#ffe44c'; ctx.shadowBlur = 8;
        ctx.stroke();
      }
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon;
      const transformed = (w.excaliburTransformTimer || 0) > 0;
      const lenBonus = transformed ? 30 : 0;
      const rBonus   = transformed ? 4  : 0;
      const totalLen = ball.radius + this.baseLength + lenBonus;
      const mid  = ball.radius + (this.baseLength + lenBonus) * 0.65;
      const near = ball.radius + (this.baseLength + lenBonus) * 0.35;
      return [
        { x: ball.x + Math.cos(w.angle)*totalLen, y: ball.y + Math.sin(w.angle)*totalLen, r: 8 + rBonus },
        { x: ball.x + Math.cos(w.angle)*mid,      y: ball.y + Math.sin(w.angle)*mid,      r: 7 + rBonus },
        { x: ball.x + Math.cos(w.angle)*near,     y: ball.y + Math.sin(w.angle)*near,     r: 6 + rBonus },
      ];
    },
    onHit(w) {
      w.hits++;
      w.bonusDamage = (w.bonusDamage || 0) + this.scaling.amount;
      sfxScale();
    }
  },

  // 🔨 Mjolnir — Unique Hammer
  {
    id: 'mjolnir', name: 'Mjolnir', icon: '⚡', color: '#88ccff',
    unique: true, baseWeapon: 'hammer',
    desc: 'The Thunder God\'s Hammer. On hit or wall-bounce: 35% chance to spawn a lightning bolt that bounces twice.',
    aiType: 'melee',
    baseLength: 38, baseSpeed: 0.030, baseDamage: 1.2, baseKnockback: 14,
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
      const kb = (w.bonusKnockback || 0);
      ctx.save();
      ctx.shadowColor = '#88ccff'; ctx.shadowBlur = 8 + kb;
      // Handle
      ctx.strokeStyle = '#886633'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // Head (blue electric)
      ctx.translate(ex, ey); ctx.rotate(w.angle);
      const hw = 14 + Math.min(kb * 0.5, 8);
      const hh = 20 + Math.min(kb, 10);
      ctx.fillStyle = '#2244aa'; ctx.strokeStyle = '#44aaff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-hw/2, -hh/2, hw, hh, 3); ctx.fill(); ctx.stroke();
      // Electric arcs on head
      ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const t = (Date.now() * 0.005 + i * 0.8) % 1;
        ctx.beginPath();
        ctx.moveTo(-hw/2 + hw*t*0.5, -hh/2 + i * hh/3);
        ctx.lineTo(-hw/2 + hw*(t*0.5+0.25), -hh/4 + i * hh/3);
        ctx.lineTo(-hw/2 + hw*(t*0.5+0.5), -hh/2 + i * hh/3);
        ctx.stroke();
      }
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon, len = ball.radius + this.baseLength;
      return [{ x: ball.x + Math.cos(w.angle)*len, y: ball.y + Math.sin(w.angle)*len, r: 14 }];
    },
    onHit(w) {
      w.hits++;
      w.bonusKnockback = (w.bonusKnockback || 0) + this.scaling.amount;
      if (Math.random() < 0.35) w.lightningPending = true;
      sfxScale();
    }
  },

  // 👊 Iron Fist — Unique Fists
  {
    id: 'iron_fist', name: 'Iron Fist', icon: '🔥', color: '#ff6622',
    unique: true, baseWeapon: 'fists',
    desc: 'Ember-charged fists. Each hit stacks 1 Ember (max 5). At 5 Embers: Combustion AOE burst (100px radius).',
    aiType: 'melee',
    baseLength: 22, baseSpeed: 0.24, baseDamage: 2.5, baseKnockback: 2,
    hitRadius: 11, attackCooldown: 16,
    scaling: { type: 'cooldown', amount: -0.5, min: 8 },
    scalingLabel: 'Speed',
    draw(ctx, ball) {
      const w = ball.weapon;
      const embers = w.emberStacks || 0;
      for (let s = 0; s <= 1; s++) {
        const a = w.angle + s * Math.PI;
        const r = (ball.radius + this.baseLength) * (s === 0 ? 1 : 0.72);
        const px = ball.x + Math.cos(a) * r;
        const py = ball.y + Math.sin(a) * r;
        const rad = s === 0 ? 11 : 9;
        ctx.save();
        ctx.shadowColor = embers > 0 ? `rgba(255,${Math.max(50, 150-embers*20)},0,1)` : '#ff9944';
        ctx.shadowBlur = 6 + embers * 4;
        ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI*2);
        ctx.fillStyle = embers >= 4 ? '#ff2200' : embers >= 2 ? '#ff6600' : '#ff9944';
        ctx.fill();
        ctx.strokeStyle = '#330'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        // Ember pips above fist
        if (s === 0) {
          for (let e = 0; e < embers; e++) {
            const ex2 = px + Math.cos(a + Math.PI/2) * (e - 2) * 5;
            const ey2 = py + Math.sin(a + Math.PI/2) * (e - 2) * 5 - 18;
            ctx.beginPath(); ctx.arc(ex2, ey2, 3, 0, Math.PI*2);
            ctx.fillStyle = '#ffaa00'; ctx.fill();
          }
        }
      }
    },
    getHitPoints(ball) {
      const w = ball.weapon;
      const bladeStart = ball.radius, bladeEnd = ball.radius + this.baseLength;
      const N = 5; const pts = [];
      for (let i = 0; i <= N; i++) {
        const d = bladeStart + (i / N) * (bladeEnd - bladeStart);
        pts.push({ x: ball.x + Math.cos(w.angle)*d, y: ball.y + Math.sin(w.angle)*d, r: 9 });
      }
      return pts;
    },
    onHit(w) {
      w.hits++;
      if (w.attackCooldown > this.scaling.min) {
        w.attackCooldown = Math.max(this.scaling.min, w.attackCooldown + this.scaling.amount);
      }
      w.emberStacks = (w.emberStacks || 0) + 1;
      if (w.emberStacks >= 5) {
        w.combustionPending = true;
        w.emberStacks = 0;
      }
      sfxScale();
    }
  },

  // 🗡️ Shadowfang — Unique Dagger
  {
    id: 'shadowfang', name: 'Shadowfang', icon: '🌑', color: '#aa44ff',
    unique: true, baseWeapon: 'dagger',
    desc: 'Dark dagger. Every hit poisons the target. Hitting from behind = automatic critical strike.',
    aiType: 'melee',
    baseLength: 30, baseSpeed: 0.17, baseDamage: 1.2, baseKnockback: 2,
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
      ctx.save();
      ctx.shadowColor = '#9933ff'; ctx.shadowBlur = 8 + w.hits * 1.5;
      ctx.strokeStyle = '#9933dd'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#cc88ff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // Dark tip
      const tipA = w.angle;
      ctx.fillStyle = '#220044';
      ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(tipA + Math.PI*0.85)*7, ey + Math.sin(tipA + Math.PI*0.85)*7);
      ctx.lineTo(ex + Math.cos(tipA - Math.PI*0.85)*7, ey + Math.sin(tipA - Math.PI*0.85)*7);
      ctx.closePath(); ctx.fill();
      // Shadow wisp particles
      const t = Date.now() * 0.003;
      for (let i = 0; i < 3; i++) {
        const pd = ball.radius + (i + 1) * (this.baseLength / 4);
        const px2 = ball.x + Math.cos(w.angle)*pd + Math.sin(t + i)*4;
        const py2 = ball.y + Math.sin(w.angle)*pd + Math.cos(t + i)*4;
        ctx.beginPath(); ctx.arc(px2, py2, 2.5, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(170,0,255,0.5)'; ctx.shadowBlur = 6; ctx.fill();
      }
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon, len = ball.radius + this.baseLength;
      const tipX = ball.x + Math.cos(w.angle) * len;
      const tipY = ball.y + Math.sin(w.angle) * len;
      const perpAngle = w.angle + Math.PI / 2;
      return [
        { x: tipX, y: tipY, r: 8 },
        { x: tipX + Math.cos(perpAngle)*8, y: tipY + Math.sin(perpAngle)*8, r: 6 },
        { x: tipX - Math.cos(perpAngle)*8, y: tipY - Math.sin(perpAngle)*8, r: 6 },
      ];
    },
    onHit(w) {
      w.hits++;
      w.spinBonus = Math.min(this.scaling.max, (w.spinBonus || 0) + this.scaling.amount);
      sfxScale();
    }
  },

  // 🔱 Gungnir — Unique Spear
  {
    id: 'gungnir', name: 'Gungnir', icon: '✨', color: '#ffdd66',
    unique: true, baseWeapon: 'spear',
    desc: 'Odin\'s divine spear. Every 120 frames auto-throws a rune spear at the nearest enemy. Weapon tracks aggressively.',
    aiType: 'melee',
    baseLength: 68, baseSpeed: 0.034, baseDamage: 1.2, baseKnockback: 5,
    hitRadius: 8, attackCooldown: 38,
    scaling: { type: 'length_damage', lengthAmt: 4, damageAmt: 0.5 },
    scalingLabel: 'Length+Dmg',
    draw(ctx, ball) {
      const w = ball.weapon;
      const bonusLen = (w.bonusLength || 0);
      const len = ball.radius + this.baseLength + bonusLen;
      const ex = ball.x + Math.cos(w.angle) * len;
      const ey = ball.y + Math.sin(w.angle) * len;
      const bx = ball.x + Math.cos(w.angle) * (ball.radius - 5);
      const by = ball.y + Math.sin(w.angle) * (ball.radius - 5);
      const tailx = ball.x - Math.cos(w.angle) * (ball.radius + 10);
      const taily = ball.y - Math.sin(w.angle) * (ball.radius + 10);
      ctx.save();
      ctx.shadowColor = '#ffdd66'; ctx.shadowBlur = 8 + bonusLen * 0.3;
      // Golden shaft
      ctx.strokeStyle = '#cc9930'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tailx, taily); ctx.lineTo(bx, by); ctx.stroke();
      // Rune glow on shaft
      ctx.strokeStyle = '#ffe070'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // Tip
      ctx.fillStyle = '#fffacc';
      ctx.shadowColor = '#ffe84c'; ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(w.angle + Math.PI*0.8)*12, ey + Math.sin(w.angle + Math.PI*0.8)*12);
      ctx.lineTo(ex + Math.cos(w.angle - Math.PI*0.8)*12, ey + Math.sin(w.angle - Math.PI*0.8)*12);
      ctx.closePath(); ctx.fill();
      // Rune symbols floating along shaft
      const t = Date.now() * 0.002;
      for (let i = 0; i < 3; i++) {
        const rd = ball.radius + bonusLen + (i + 1) * (this.baseLength / 4) + Math.sin(t + i) * 4;
        const rx2 = ball.x + Math.cos(w.angle)*rd;
        const ry2 = ball.y + Math.sin(w.angle)*rd;
        ctx.beginPath(); ctx.arc(rx2, ry2, 2, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,230,80,0.7)'; ctx.shadowBlur = 6; ctx.fill();
      }
      // Throw cooldown arc
      const throwTimer = w.gungnirThrowTimer || 0;
      const throwMax = 120;
      if (throwTimer < throwMax) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius + 6, w.angle - Math.PI*0.5, w.angle - Math.PI*0.5 + (throwTimer / throwMax) * Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,220,50,0.4)'; ctx.lineWidth = 3; ctx.shadowBlur = 0;
        ctx.stroke();
      }
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon;
      const shaftStart = ball.radius - 5;
      const shaftEnd   = ball.radius + this.baseLength + (w.bonusLength || 0);
      const shaftLen   = shaftEnd - shaftStart;
      const N = Math.max(4, Math.ceil(shaftLen / 13));
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const d = shaftStart + (i / N) * shaftLen;
        pts.push({ x: ball.x + Math.cos(w.angle)*d, y: ball.y + Math.sin(w.angle)*d, r: 7 });
      }
      return pts;
    },
    onHit(w) {
      w.hits++;
      w.bonusLength  = (w.bonusLength  || 0) + this.scaling.lengthAmt;
      w.bonusDamage  = (w.bonusDamage  || 0) + this.scaling.damageAmt;
      sfxScale();
    }
  },

  // ☠️ Harvester — Unique Scythe
  {
    id: 'harvester', name: 'Harvester', icon: '💀', color: '#cc44ff',
    unique: true, baseWeapon: 'scythe',
    desc: 'Soul Scythe. Each hit collects a Soul Shard (max 5). At 5: Soul Burst AOE (80px) for 3× base damage.',
    aiType: 'melee',
    baseLength: 50, baseSpeed: 0.048, baseDamage: 1.2, baseKnockback: 5,
    hitRadius: 18, attackCooldown: 34,
    scaling: { type: 'dual', threshold: 5 },
    scalingLabel: 'Hits→Dual',
    draw(ctx, ball) {
      const w = ball.weapon;
      const shards = w.soulShards || 0;
      this._drawBlade(ctx, ball, w.angle, w.hits >= 5, shards);
      if (w.hits >= 5) this._drawBlade(ctx, ball, w.angle + Math.PI, false, 0);
      // Soul orbs orbiting
      const t = Date.now() * 0.004;
      for (let i = 0; i < shards; i++) {
        const oa = t + (i / Math.max(shards, 1)) * Math.PI * 2;
        const ox = ball.x + Math.cos(oa) * (ball.radius + 14);
        const oy = ball.y + Math.sin(oa) * (ball.radius + 14);
        ctx.save();
        ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI*2);
        ctx.fillStyle = '#cc44ff'; ctx.shadowColor = '#ff44ff'; ctx.shadowBlur = 8; ctx.fill();
        ctx.restore();
      }
    },
    _drawBlade(ctx, ball, angle, glow, shards) {
      const len = ball.radius + this.baseLength;
      const cx = ball.x + Math.cos(angle) * (ball.radius + 10);
      const cy = ball.y + Math.sin(angle) * (ball.radius + 10);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
      if (glow || shards >= 3) {
        ctx.shadowColor = shards >= 5 ? '#ff88ff' : '#cc44ff';
        ctx.shadowBlur = shards >= 5 ? 20 : 10;
      }
      ctx.strokeStyle = '#553366'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(len - ball.radius - 10, 0); ctx.stroke();
      ctx.strokeStyle = shards >= 3 ? '#ff88ff' : '#dd77ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(28, 0, 22, -Math.PI*0.8, Math.PI*0.3); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(28, -1, 21, -Math.PI*0.75, Math.PI*0.2); ctx.stroke();
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon;
      const len = ball.radius + this.baseLength;
      const pts = [];
      for (let i = -2; i <= 2; i++) {
        const a = w.angle + i * 0.25;
        pts.push({ x: ball.x + Math.cos(a)*(len-8), y: ball.y + Math.sin(a)*(len-8), r: 16 });
      }
      if (w.hits >= 5) {
        for (let i = -2; i <= 2; i++) {
          const a = w.angle + Math.PI + i * 0.25;
          pts.push({ x: ball.x + Math.cos(a)*(len-8), y: ball.y + Math.sin(a)*(len-8), r: 16 });
        }
      }
      return pts;
    },
    onHit(w) {
      w.hits++;
      w.soulShards = (w.soulShards || 0) + 1;
      if (w.soulShards >= 5) {
        w.soulBurstPending = true;
        w.soulShards = 0;
      }
      if (w.hits === 5) sfxScale();
    }
  },

  // 🤺 Caliburn — Unique Rapier
  {
    id: 'caliburn', name: 'Caliburn', icon: '⚡', color: '#ccf0ff',
    unique: true, baseWeapon: 'rapier',
    desc: 'Rapier of Champions. Each parry: +1 Caliburn stack. At 3: 5s speed boost ×1.4 + next hit guaranteed crit.',
    aiType: 'melee',
    baseLength: 42, baseSpeed: 0.075, baseDamage: 1.0, baseKnockback: 2,
    hitRadius: 6, attackCooldown: 18,
    reverseOnHit: true,
    scaling: { type: 'riposte' }, scalingLabel: 'Riposte Dmg',
    draw(ctx, ball) {
      const w = ball.weapon;
      const len = ball.radius + this.baseLength;
      const bx  = ball.x + Math.cos(w.angle) * ball.radius;
      const by  = ball.y + Math.sin(w.angle) * ball.radius;
      const ex  = ball.x + Math.cos(w.angle) * len;
      const ey  = ball.y + Math.sin(w.angle) * len;
      const stacks = w.caliburnStacks || 0;
      const boosted = (w.caliburnSpeedTimer || 0) > 0;
      ctx.save();
      ctx.strokeStyle = boosted ? '#ffeeaa' : stacks > 0 ? '#ccf0ff' : '#aae0ff';
      ctx.lineWidth = boosted ? 3 : 2;
      ctx.lineCap = 'round';
      if (boosted) { ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 14; }
      else if (stacks > 0) { ctx.shadowColor = '#88ddff'; ctx.shadowBlur = 6 + stacks * 3; }
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // Tip dot
      ctx.fillStyle = boosted ? '#ffe066' : '#ddeeff';
      ctx.shadowColor = boosted ? '#ffe066' : '#ccf0ff'; ctx.shadowBlur = boosted ? 16 : 6;
      ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill();
      // Stack pips near guard
      const guardDist = ball.radius + 6;
      const gx = ball.x + Math.cos(w.angle) * guardDist;
      const gy = ball.y + Math.sin(w.angle) * guardDist;
      const perp = w.angle + Math.PI / 2;
      ctx.strokeStyle = '#88bbdd'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(gx + Math.cos(perp)*9, gy + Math.sin(perp)*9);
      ctx.lineTo(gx - Math.cos(perp)*9, gy - Math.sin(perp)*9);
      ctx.stroke();
      for (let i = 0; i < stacks; i++) {
        const sx = gx + Math.cos(perp) * (i * 6 - 6);
        const sy = gy + Math.sin(perp) * (i * 6 - 6);
        ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI*2);
        ctx.fillStyle = '#ffee44'; ctx.shadowColor = '#ffee44'; ctx.shadowBlur = 8; ctx.fill();
      }
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon, len = ball.radius + this.baseLength;
      return [{ x: ball.x + Math.cos(w.angle) * len, y: ball.y + Math.sin(w.angle) * len, r: 6 }];
    },
    onHit(w) {
      w.hits++;
      if (w.riposteWindow > 0) {
        w.riposteWindow = 0;
        w.riposteStacks = 0;
      }
    }
  },

  // 🏹 Medusa Bow — Unique Bow
  {
    id: 'medusa_bow', name: 'Medusa Bow', icon: '🐍', color: '#44cc88',
    unique: true, baseWeapon: 'bow',
    desc: 'Serpent Bow. Each arrow hit: -1 target maxSpd. After 5 stacks: Petrify (2s weapon freeze).',
    aiType: 'ranged',
    baseLength: 38, baseSpeed: 0.04, baseDamage: 0, baseKnockback: 1,
    hitRadius: 8, attackCooldown: 10,
    arrowDamage: 1.2, arrowSpeed: 7.5, fireInterval: 130,
    scaling: { type: 'arrows', amount: 1, max: Infinity },
    scalingLabel: 'Arrows',
    draw(ctx, ball) {
      const w = ball.weapon;
      const cx = ball.x + Math.cos(w.angle) * (ball.radius + 6);
      const cy = ball.y + Math.sin(w.angle) * (ball.radius + 6);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(w.angle);
      // Serpent-style bow arc
      ctx.strokeStyle = '#226633'; ctx.lineWidth = 3;
      ctx.shadowColor = '#44cc88'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, 0, 22, -Math.PI*0.55, Math.PI*0.55); ctx.stroke();
      // Snake scales texture marks on bow
      ctx.strokeStyle = '#44cc88'; ctx.lineWidth = 1;
      for (let s = -1; s <= 1; s++) {
        const sa = s * 0.35;
        const sx = Math.cos(sa) * 22, sy = Math.sin(sa) * 22;
        ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI*2); ctx.stroke();
      }
      // String
      const tautness = w.fireTimer > 0 ? Math.min(8, w.fireTimer * 0.06) : 0;
      ctx.strokeStyle = '#88ffaa'; ctx.lineWidth = 1.5; ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(22*Math.cos(-Math.PI*0.55), 22*Math.sin(-Math.PI*0.55));
      ctx.lineTo(-tautness, 0);
      ctx.lineTo(22*Math.cos(Math.PI*0.55), 22*Math.sin(Math.PI*0.55));
      ctx.stroke();
      // Green arrow nocked
      if (w.fireTimer < w.fireInterval) {
        ctx.strokeStyle = '#44aa66'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-tautness, 0); ctx.lineTo(22, 0); ctx.stroke();
        ctx.fillStyle = '#66ffaa';
        ctx.beginPath(); ctx.moveTo(22,0); ctx.lineTo(16,-4); ctx.lineTo(16,4); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon;
      const cx = ball.x + Math.cos(w.angle) * (ball.radius + 6);
      const cy = ball.y + Math.sin(w.angle) * (ball.radius + 6);
      return [{ x: cx, y: cy, r: 16 }];
    },
    onHit(w) {
      w.hits++;
      w.arrowCount = Math.min((w.arrowCount||1) + this.scaling.amount, this.scaling.max);
      w.arrowSpeedBonus = (w.arrowSpeedBonus||0) + 0.3;
      sfxScale();
    }
  },

  // 🌀 Fuma Shuriken — Unique Shuriken
  {
    id: 'fuma_shuriken', name: 'Fuma Shuriken', icon: '🌀', color: '#44eebb',
    unique: true, baseWeapon: 'shuriken',
    desc: 'Giant throwing star. Each wall bounce: star grows (+4 radius) and damage ×1.6. Max 3 bounces.',
    aiType: 'ranged',
    baseLength: 30, baseSpeed: 0.04, baseDamage: 0, baseKnockback: 1,
    hitRadius: 10, attackCooldown: 10,
    shurikenDamage: 1.2, shurikenSpeed: 3.5, fireInterval: 120, maxBounces: 3,
    scaling: { type: 'count', amount: 1, max: Infinity },
    scalingLabel: 'Count',
    draw(ctx, ball) {
      const w = ball.weapon;
      const cx = ball.x + Math.cos(w.angle) * (ball.radius + 4);
      const cy = ball.y + Math.sin(w.angle) * (ball.radius + 4);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(w.angle + Date.now() * 0.01);
      ctx.strokeStyle = '#44eebb'; ctx.fillStyle = '#001122'; ctx.lineWidth = 2;
      ctx.shadowColor = '#44eebb'; ctx.shadowBlur = 10;
      // Larger 4-pointed star
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a)*20, Math.sin(a)*20);
        ctx.lineTo(Math.cos(a + Math.PI*0.25)*9, Math.sin(a + Math.PI*0.25)*9);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    },
    getHitPoints(ball) {
      const w = ball.weapon;
      const cx = ball.x + Math.cos(w.angle) * (ball.radius + 4);
      const cy = ball.y + Math.sin(w.angle) * (ball.radius + 4);
      return [{ x: cx, y: cy, r: 16 }];
    },
    onHit(w) {
      w.hits++;
      w.shurikenCount = Math.min((w.shurikenCount||1) + this.scaling.amount, this.scaling.max);
      sfxScale();
    }
  },

  // 🩸 Muramasa — Unique Katana
  {
    id: 'muramasa', name: 'Muramasa', icon: '🩸', color: '#ff2244',
    unique: true, baseWeapon: 'katana',
    desc: 'Blood Katana. Each hit: +1 Frenzy stack (max 3, -3 cooldown/stack). IAI Strike: costs 8% HP, deals 4× damage.',
    aiType: 'melee',
    baseLength: 64, baseSpeed: 0.040, baseDamage: 1.7,
    baseKnockback: 7, hitRadius: 8, attackCooldown: 42,
    reverseOnHit: true,
    scaling: { type: 'momentum', max: 5 }, scalingLabel: 'Momentum',
    draw(ctx, ball) {
      const w    = ball.weapon;
      const stacks = w.momentumStacks || 0;
      const frenzy = w.muramasaFrenzy || 0;
      const iai  = !!w.iaiReady;
      const len  = ball.radius + this.baseLength;
      const bx   = ball.x + Math.cos(w.angle) * ball.radius;
      const by   = ball.y + Math.sin(w.angle) * ball.radius;
      const ex   = ball.x + Math.cos(w.angle) * len;
      const ey   = ball.y + Math.sin(w.angle) * len;
      ctx.save();
      // Momentum aura rings — red for Muramasa
      for (let i = 0; i < stacks; i++) {
        const ringR = ball.radius + 4 + i * 5;
        ctx.strokeStyle = iai ? `rgba(255,200,200,${0.5 - i*0.05})` : `rgba(255,50,70,${0.35 - i*0.04})`;
        ctx.lineWidth = iai ? 2.5 : 1.5;
        ctx.shadowColor = iai ? '#ff8888' : '#ff2244'; ctx.shadowBlur = iai ? 8 : 4;
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ringR, 0, Math.PI*2); ctx.stroke();
      }
      // Frenzy stack indicator
      for (let f = 0; f < frenzy; f++) {
        const fa = w.angle + Math.PI/2 + (f - 1) * 0.5;
        const fx = ball.x + Math.cos(fa) * (ball.radius + 8);
        const fy = ball.y + Math.sin(fa) * (ball.radius + 8);
        ctx.beginPath(); ctx.arc(fx, fy, 4, 0, Math.PI*2);
        ctx.fillStyle = '#ff2244'; ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 10; ctx.fill();
      }
      ctx.shadowBlur = 0;
      // Blood-red blade
      const bladeColor = iai ? '#ffcccc' : '#ff4466';
      ctx.strokeStyle = bladeColor; ctx.lineWidth = iai ? 4 : 3; ctx.lineCap = 'round';
      if (iai) { ctx.shadowColor = '#ff2244'; ctx.shadowBlur = 18; }
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      // Blood drip effect
      const t = Date.now() * 0.002;
      ctx.strokeStyle = `rgba(200,0,30,${0.5 + Math.sin(t)*0.3})`; ctx.lineWidth = 1; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.restore();
    },
    getHitPoints(ball) {
      const w   = ball.weapon;
      const mid = ball.radius + this.baseLength * 0.6;
      const tip = ball.radius + this.baseLength;
      return [
        { x: ball.x + Math.cos(w.angle) * tip, y: ball.y + Math.sin(w.angle) * tip, r: 8 },
        { x: ball.x + Math.cos(w.angle) * mid, y: ball.y + Math.sin(w.angle) * mid, r: 7 },
      ];
    },
    onHit(w) {
      w.hits++;
      // Frenzy stack
      w.muramasaFrenzy = Math.min(3, (w.muramasaFrenzy || 0) + 1);
      w.muramasaFrenzyTimer = 300; // 5s decay timer
      if (w.iaiReady) {
        w.momentumStacks = 0;
        w.iaiReady = false;
        w.momentumTimer = 0;
      } else {
        w.momentumStacks = Math.min(5, (w.momentumStacks || 0) + 1);
        w.momentumTimer = 180;
        if (w.momentumStacks >= 5) w.iaiReady = true;
      }
    }
  },
];
const WEAPON_MAP = {};
WEAPON_DEFS.forEach(d => WEAPON_MAP[d.id] = d);
