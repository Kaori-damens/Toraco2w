// ============================================================
// BOSS MOVES — Thunderfang
// ============================================================
// Each move: { id, label, requireParts, weight, enrageWeight,
//   ranged, maxRange, trackDuringWindup,
//   windupFrames, activeFrames, recoveryFrames,
//   onStart?, onActivate?, onActive, onDeactivate?, drawHint? }

const BOSS_MOVES = [

  // ── 1. Bite (single) ──────────────────────────────────────
  {
    id: 'bite_single', label: 'Fangs',
    requireParts: null,               // always usable
    weight: 3, enrageWeight: 1.2,
    ranged: false, maxRange: 220,
    trackDuringWindup: true,
    windupFrames: 40, activeFrames: 15, recoveryFrames: 28,
    onActive(boss, players) {
      const hp = boss.getPartPos('head');
      boss.damageInCone(players, hp.x, hp.y, boss.angle, Math.PI * 0.42, 140, 22, 30);
    },
    drawHint(ctx, boss) {
      const hp = boss.getPartPos('head');
      _bossDrawCone(ctx, hp.x, hp.y, boss.angle, Math.PI * 0.42, 140, boss.state === 'active');
    },
  },

  // ── 2. Rapid Bite (6 snaps) ──────────────────────────────
  {
    id: 'bite_rapid', label: 'Frenzy Bite',
    requireParts: ['head'],           // disabled when head broken
    weight: 2, enrageWeight: 1.6,
    ranged: false, maxRange: 200,
    trackDuringWindup: true,
    windupFrames: 25, activeFrames: 72, recoveryFrames: 42,
    onStart(boss)  { boss._rapidFrame = 0; },
    onActive(boss, players) {
      boss._rapidFrame++;
      if (boss._rapidFrame % 12 === 0) { // 6 pulses in 72 frames
        boss.hitCooldowns.clear();        // each pulse can re-hit
        const hp = boss.getPartPos('head');
        boss.damageInCone(players, hp.x, hp.y, boss.angle, Math.PI * 0.35, 115, 14, 12);
        spawnSparks(
          hp.x + Math.cos(boss.angle) * 95,
          hp.y + Math.sin(boss.angle) * 95, 5);
      }
    },
    drawHint(ctx, boss) {
      const hp = boss.getPartPos('head');
      _bossDrawCone(ctx, hp.x, hp.y, boss.angle, Math.PI * 0.35, 115, boss.state === 'active');
    },
  },

  // ── 3. Left Claw Slam ────────────────────────────────────
  {
    id: 'punch_left', label: 'Left Slam',
    requireParts: ['lClaw'],
    weight: 2, enrageWeight: 1.2,
    ranged: false, maxRange: 240,
    trackDuringWindup: true,
    windupFrames: 32, activeFrames: 18, recoveryFrames: 30,
    onActive(boss, players) {
      const cp = boss.getPartPos('lClaw');
      const sx = cp.x + Math.cos(boss.angle) * 40;
      const sy = cp.y + Math.sin(boss.angle) * 40;
      boss.damageInCircle(players, sx, sy, 90, 28, 30);
    },
    drawHint(ctx, boss) {
      const cp = boss.getPartPos('lClaw');
      const sx = cp.x + Math.cos(boss.angle) * 40;
      const sy = cp.y + Math.sin(boss.angle) * 40;
      _bossDrawCircle(ctx, sx, sy, 90, boss.state === 'active');
    },
  },

  // ── 4. Right Claw Slam ───────────────────────────────────
  {
    id: 'punch_right', label: 'Right Slam',
    requireParts: ['rClaw'],
    weight: 2, enrageWeight: 1.2,
    ranged: false, maxRange: 240,
    trackDuringWindup: true,
    windupFrames: 32, activeFrames: 18, recoveryFrames: 30,
    onActive(boss, players) {
      const cp = boss.getPartPos('rClaw');
      const sx = cp.x + Math.cos(boss.angle) * 40;
      const sy = cp.y + Math.sin(boss.angle) * 40;
      boss.damageInCircle(players, sx, sy, 90, 28, 30);
    },
    drawHint(ctx, boss) {
      const cp = boss.getPartPos('rClaw');
      const sx = cp.x + Math.cos(boss.angle) * 40;
      const sy = cp.y + Math.sin(boss.angle) * 40;
      _bossDrawCircle(ctx, sx, sy, 90, boss.state === 'active');
    },
  },

  // ── 5. Double Sweep (both claws) ─────────────────────────
  {
    id: 'sweep', label: 'Thunder Sweep',
    requireParts: ['lClaw', 'rClaw'],  // disabled if either claw broken
    weight: 2, enrageWeight: 1.3,
    ranged: false, maxRange: 260,
    trackDuringWindup: false,
    windupFrames: 48, activeFrames: 26, recoveryFrames: 38,
    onActive(boss, players) {
      // Wide rectangle perpendicular to facing direction
      const perp = boss.angle + Math.PI / 2;
      boss.damageInRect(players, boss.x, boss.y, 240, 80, perp, 18, 30);
    },
    drawHint(ctx, boss) {
      const perp = boss.angle + Math.PI / 2;
      _bossDrawRect(ctx, boss.x, boss.y, 240, 80, perp, boss.state === 'active');
    },
  },

  // ── 6. Forward Charge ────────────────────────────────────
  {
    id: 'charge', label: 'Charge!',
    requireParts: null,
    weight: 2, enrageWeight: 1.5,
    ranged: false, maxRange: 9999,
    trackDuringWindup: true,
    windupFrames: 40, activeFrames: 75, recoveryFrames: 25,
    onStart(boss) { boss._chargeHit = new Set(); },
    onActivate(boss) {
      boss.chargeDirX  = Math.cos(boss.angle);
      boss.chargeDirY  = Math.sin(boss.angle);
      boss.chargeSpeed = boss.enraged ? 10 : 7.5;
    },
    onActive(boss, players) {
      boss.vx = boss.chargeDirX * boss.chargeSpeed;
      boss.vy = boss.chargeDirY * boss.chargeSpeed;
      // Hit any player in the path
      const cx = boss.x + boss.chargeDirX * 65;
      const cy = boss.y + boss.chargeDirY * 65;
      for (const p of players) {
        if (!p.alive || boss._chargeHit.has(p)) continue;
        if (Math.hypot(p.x - cx, p.y - cy) < 88 + p.radius) {
          boss._hitPlayer(p, 38, 60);
          p.vx += boss.chargeDirX * 13;
          p.vy += boss.chargeDirY * 13;
          boss._chargeHit.add(p);
        }
      }
    },
    onDeactivate(boss) { boss.vx = 0; boss.vy = 0; boss.chargeSpeed = 0; },
    drawHint(ctx, boss) {
      if (boss.state !== 'windup') return;
      const len = 220;
      const ex  = boss.x + Math.cos(boss.angle) * len;
      const ey  = boss.y + Math.sin(boss.angle) * len;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = 'rgba(255,140,0,0.45)';
      ctx.lineWidth = 70; ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    },
  },

  // ── 7. Tail Laser (electric beam) ────────────────────────
  {
    id: 'tail_laser', label: 'Thunder Beam',
    requireParts: ['tail1'],           // disabled when tail cut off
    weight: 2, enrageWeight: 1.5,
    ranged: true, maxRange: 9999,
    trackDuringWindup: false,
    windupFrames: 60, activeFrames: 120, recoveryFrames: 52,
    onStart(boss) {
      boss.laserAngle    = boss.angle + Math.PI;
      boss.laserSweepDir = Math.random() < 0.5 ? 1 : -1;
    },
    onActivate(boss) {},
    onActive(boss, players) {
      // Sweep angle over 120 frames (total ~180°)
      boss.laserAngle += boss.laserSweepDir * (Math.PI * 1.5 / 120);

      const tp     = boss.getPartPos('tail1');
      const laserL = 360;
      const ex     = tp.x + Math.cos(boss.laserAngle) * laserL;
      const ey     = tp.y + Math.sin(boss.laserAngle) * laserL;

      boss.damageOnLine(players, tp.x, tp.y, ex, ey, 18, 3, 8);

      // Spark effect
      if (state.frame % 4 === 0) {
        const t  = Math.random();
        spawnSparks(tp.x + (ex - tp.x) * t, tp.y + (ey - tp.y) * t, 2);
      }

      boss._laserStart = { x: tp.x, y: tp.y };
      boss._laserEnd   = { x: ex,   y: ey   };
    },
    onDeactivate(boss) {
      boss._laserStart = null;
      boss._laserEnd   = null;
    },
    drawHint(ctx, boss) {
      if (boss.state === 'windup') {
        // Telegraph glow on tail
        const tp = boss.getPartPos('tail1');
        ctx.save();
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 28, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100,200,255,0.30)';
        ctx.fill();
        ctx.restore();
        return;
      }
      if (boss.state === 'active' && boss._laserStart) {
        ctx.save();
        // Outer glow
        ctx.beginPath();
        ctx.moveTo(boss._laserStart.x, boss._laserStart.y);
        ctx.lineTo(boss._laserEnd.x, boss._laserEnd.y);
        ctx.strokeStyle = 'rgba(68,170,255,0.5)';
        ctx.lineWidth = 24; ctx.lineCap = 'round';
        ctx.stroke();
        // Core beam
        ctx.beginPath();
        ctx.moveTo(boss._laserStart.x, boss._laserStart.y);
        ctx.lineTo(boss._laserEnd.x, boss._laserEnd.y);
        ctx.strokeStyle = '#aaddff';
        ctx.lineWidth = 8;
        ctx.shadowColor = '#44aaff'; ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    },
  },

  // ── 8. Thunder Barrage (8-way spread) ────────────────────
  {
    id: 'thunder_balls', label: 'Thunder Barrage',
    requireParts: null,
    weight: 2, enrageWeight: 1.7,
    ranged: true, maxRange: 9999,
    trackDuringWindup: true,
    windupFrames: 52, activeFrames: 5, recoveryFrames: 75,
    onActivate(boss) {},
    onActive(boss, players) {
      // Spawn on very first active frame
      if (boss.moveTimer === boss.currentMove.activeFrames) {
        const count = boss.enraged ? 12 : 8;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          boss.thunderBalls.push({
            x: boss.x, y: boss.y,
            vx: Math.cos(a) * 4.5, vy: Math.sin(a) * 4.5,
            r: 10, damage: 20, life: 170,
          });
        }
        spawnSparks(boss.x, boss.y, 22);
      }
    },
    drawHint(ctx, boss) {
      if (boss.state !== 'windup') return;
      const prog = 1 - boss.moveTimer / boss.currentMove.windupFrames;
      const r    = 15 + prog * 50;
      ctx.save();
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100,200,255,${0.2 + prog * 0.4})`;
      ctx.lineWidth   = 3;
      ctx.stroke();
      ctx.restore();
    },
  },

  // ── 9. Wall Charge (charge to wall → stun) ───────────────
  {
    id: 'wall_charge', label: 'Crash!',
    requireParts: null,
    weight: 1, enrageWeight: 0.8,
    ranged: false, maxRange: 9999,
    trackDuringWindup: false,
    windupFrames: 32, activeFrames: 160, recoveryFrames: 0, // recovery = stun
    onStart(boss) {
      boss._wcHit     = false;
      boss._wcHitSet  = new Set();
    },
    onActivate(boss) {
      // Pick direction toward nearest wall
      const toL = boss.x - 80, toR = CW - 80 - boss.x;
      const toT = boss.y - 80, toB = CH - 80 - boss.y;
      const min = Math.min(toL, toR, toT, toB);
      if      (min === toL) { boss.chargeDirX = -1; boss.chargeDirY =  0; }
      else if (min === toR) { boss.chargeDirX =  1; boss.chargeDirY =  0; }
      else if (min === toT) { boss.chargeDirX =  0; boss.chargeDirY = -1; }
      else                  { boss.chargeDirX =  0; boss.chargeDirY =  1; }
      boss.chargeSpeed = 9;
      // Face that direction
      boss.angle = Math.atan2(boss.chargeDirY, boss.chargeDirX);
    },
    onActive(boss, players) {
      if (boss._wcHit) return;
      boss.vx = boss.chargeDirX * boss.chargeSpeed;
      boss.vy = boss.chargeDirY * boss.chargeSpeed;

      // Damage players in path
      for (const p of players) {
        if (!p.alive || boss._wcHitSet.has(p)) continue;
        if (Math.hypot(p.x - boss.x, p.y - boss.y) < 115 + p.radius) {
          boss._hitPlayer(p, 35, 60);
          p.vx += boss.chargeDirX * 15;
          p.vy += boss.chargeDirY * 15;
          boss._wcHitSet.add(p);
        }
      }

      // Detect wall hit (same margin as physics wall bounce in boss.js)
      const hitWall = boss.x <= 116 || boss.x >= CW - 116 ||
                      boss.y <= 116 || boss.y >= CH - 116;
      if (hitWall) {
        boss._wcHit      = true;
        boss.vx          = 0; boss.vy = 0;
        boss.state       = 'stunned';
        boss.stunTimer   = 120;
        boss.moveTimer   = 0;
        spawnBigAnnouncement('💫 STUNNED!', '#88ccff');
        spawnSparks(boss.x, boss.y, 28);
      }
    },
    onDeactivate(boss) { boss.vx = 0; boss.vy = 0; },
    drawHint(ctx, boss) {
      if (boss.state !== 'windup') return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.lineTo(boss.x + boss.chargeDirX * 190, boss.y + boss.chargeDirY * 190);
      ctx.strokeStyle = 'rgba(180,80,255,0.45)';
      ctx.lineWidth   = 60; ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    },
  },
];

// ── Hint drawing helpers ──────────────────────────────────────

function _bossDrawCone(ctx, apexX, apexY, angle, halfAngle, length, isActive) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(apexX, apexY);
  ctx.arc(apexX, apexY, length, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle   = isActive ? 'rgba(255,90,20,0.33)' : 'rgba(255,200,50,0.16)';
  ctx.strokeStyle = isActive ? 'rgba(255,70,0,0.65)'  : 'rgba(255,200,50,0.40)';
  ctx.lineWidth   = 2;
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function _bossDrawCircle(ctx, cx, cy, r, isActive) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle   = isActive ? 'rgba(255,90,20,0.33)' : 'rgba(255,200,50,0.16)';
  ctx.strokeStyle = isActive ? 'rgba(255,70,0,0.65)'  : 'rgba(255,200,50,0.40)';
  ctx.lineWidth   = 2;
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function _bossDrawRect(ctx, cx, cy, hw, hh, angle, isActive) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(angle);
  ctx.beginPath();
  ctx.rect(-hw, -hh, hw * 2, hh * 2);
  ctx.fillStyle   = isActive ? 'rgba(255,90,20,0.33)' : 'rgba(255,200,50,0.16)';
  ctx.strokeStyle = isActive ? 'rgba(255,70,0,0.65)'  : 'rgba(255,200,50,0.40)';
  ctx.lineWidth   = 2;
  ctx.fill(); ctx.stroke();
  ctx.restore();
}
