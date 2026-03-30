// ============================================================
// VAEL THE UNTOUCHABLE — Move Set
// ============================================================

const VAEL_MOVES = [

  // ── Dive Bomb (charge straight through) ──────────────
  {
    id: 'charge',          // 'charge' = damping skipped by base physics
    weight: 3, enrageWeight: 1.5,
    windupFrames: 28, activeFrames: 48, recoveryFrames: 36,
    maxRange: 9999,
    trackDuringWindup: true,
    onActivate(boss, players) {
      const target = boss._findTarget(players);
      if (target) {
        const dx = target.x - boss.x, dy = target.y - boss.y;
        const d  = Math.hypot(dx, dy) || 1;
        boss.chargeDirX = dx / d;
        boss.chargeDirY = dy / d;
      } else {
        boss.chargeDirX = Math.cos(boss.angle);
        boss.chargeDirY = Math.sin(boss.angle);
      }
      boss.chargeSpeed = 13; // very fast — harpy trait
      spawnSparks(boss.x, boss.y, 12);
    },
    onActive(boss, players) {
      boss.vx = boss.chargeDirX * boss.chargeSpeed;
      boss.vy = boss.chargeDirY * boss.chargeSpeed;
      boss.damageInRect(players,
        boss.x + boss.chargeDirX * 40,
        boss.y + boss.chargeDirY * 40,
        45, 36, Math.atan2(boss.chargeDirY, boss.chargeDirX),
        26, 10
      );
    },
    drawHint(ctx, boss) {
      const len = 260;
      const cx  = boss.x + boss.chargeDirX * len / 2;
      const cy  = boss.y + boss.chargeDirY * len / 2;
      _bossDrawRect(ctx, cx, cy, len / 2, 38, Math.atan2(boss.chargeDirY, boss.chargeDirX), 'rgba(180,180,255,0.35)');
    },
  },

  // ── Feather Storm (360° burst) ────────────────────────
  {
    id: 'feather_storm',
    weight: 2, enrageWeight: 1.8,
    windupFrames: 22, activeFrames: 1, recoveryFrames: 62,
    onActivate(boss) {
      const count = boss.enraged ? 16 : 12;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        boss.thunderBalls.push({
          x:  boss.x + Math.cos(a) * 50,
          y:  boss.y + Math.sin(a) * 50,
          vx: Math.cos(a) * 5.8,
          vy: Math.sin(a) * 5.8,
          r: 5, life: 100, damage: 16,
          _feather: true,
        });
      }
      spawnSparks(boss.x, boss.y, 20);
    },
    drawHint(ctx, boss) {
      _bossDrawCircle(ctx, boss.x, boss.y, 55, 'rgba(200,200,255,0.40)');
      // Radial line hints
      ctx.save();
      ctx.strokeStyle = 'rgba(200,200,255,0.30)';
      ctx.lineWidth   = 1;
      const count = 12;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(boss.x, boss.y);
        ctx.lineTo(boss.x + Math.cos(a) * 90, boss.y + Math.sin(a) * 90);
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  // ── Talon Rake (forward cone) ─────────────────────────
  {
    id: 'talon_rake',
    weight: 3, enrageWeight: 1.3,
    windupFrames: 30, activeFrames: 22, recoveryFrames: 42,
    maxRange: 200,
    trackDuringWindup: true,
    onActivate(boss, players) {
      boss.damageInCone(players, boss.x, boss.y, boss.angle, Math.PI / 4, 155, 28, 22);
      spawnSparks(boss.x + Math.cos(boss.angle) * 80, boss.y + Math.sin(boss.angle) * 80, 14);
    },
    drawHint(ctx, boss) {
      _bossDrawCone(ctx, boss, Math.PI / 4, 155, 'rgba(200,200,255,0.35)');
    },
  },

  // ── Cyclone (AOE + push) ──────────────────────────────
  {
    id: 'cyclone',
    weight: 2, enrageWeight: 1.5,
    windupFrames: 42, activeFrames: 32, recoveryFrames: 58,
    onStart(boss) {
      boss._cycloneActive = false;
    },
    onActivate(boss, players) {
      boss._cycloneActive = true;
      // Burst damage
      boss.damageInCircle(players, boss.x, boss.y, 165, 24, 28);
      // Knockback push outward
      for (const p of players) {
        if (!p.alive) continue;
        const dx = p.x - boss.x, dy = p.y - boss.y;
        const d  = Math.hypot(dx, dy) || 1;
        if (d < 165 + p.radius) {
          p.vx += (dx / d) * 11;
          p.vy += (dy / d) * 11;
        }
      }
      spawnSparks(boss.x, boss.y, 24);
    },
    onActive(boss, players) {
      // Sustained wind — weaker continuous push + damage
      if (boss.moveTimer % 12 === 0) {
        boss.damageInCircle(players, boss.x, boss.y, 145, 6, 16);
        for (const p of players) {
          if (!p.alive) continue;
          const dx = p.x - boss.x, dy = p.y - boss.y;
          const d  = Math.hypot(dx, dy) || 1;
          if (d < 145 + p.radius) {
            p.vx += (dx / d) * 3.5;
            p.vy += (dy / d) * 3.5;
          }
        }
      }
    },
    onDeactivate(boss) {
      boss._cycloneActive = false;
    },
    drawHint(ctx, boss) {
      _bossDrawCircle(ctx, boss.x, boss.y, 165, 'rgba(180,180,255,0.38)');
      // Swirl lines
      ctx.save();
      ctx.strokeStyle = 'rgba(200,200,255,0.25)';
      ctx.lineWidth   = 1.5;
      for (let i = 0; i < 3; i++) {
        const startA = (i / 3) * Math.PI * 2;
        ctx.beginPath();
        for (let t = 0; t <= 1; t += 0.05) {
          const a = startA + t * Math.PI * 1.5;
          const r = 20 + t * 145;
          const x = boss.x + Math.cos(a) * r;
          const y = boss.y + Math.sin(a) * r;
          if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    },
  },
];
