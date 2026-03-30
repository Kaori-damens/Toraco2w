// ============================================================
// KRAG THE UNYIELDING — Move Set
// ============================================================

const KRAG_MOVES = [

  // ── Ground Slam ─────────────────────────────────────────
  {
    id: 'ground_slam',
    weight: 3, enrageWeight: 1.6,
    windupFrames: 48, activeFrames: 22, recoveryFrames: 58,
    maxRange: 210,
    trackDuringWindup: false,
    onStart(boss) {
      boss._slamWave = 0;
    },
    onActivate(boss, players) {
      boss.damageInCircle(players, boss.x, boss.y, 165, 38, 22);
      spawnSparks(boss.x, boss.y, 28);
      // Extra ring wave
      boss._slamWave = 2;
    },
    onActive(boss, players) {
      if (boss._slamWave > 0) {
        boss._slamWave--;
        if (boss.moveTimer % 9 === 0) {
          boss.damageInCircle(players, boss.x, boss.y, 195, 9, 14);
        }
      }
    },
    drawHint(ctx, boss) {
      _bossDrawCircle(ctx, boss.x, boss.y, 165, 'rgba(160,130,60,0.45)');
      _bossDrawCircle(ctx, boss.x, boss.y, 195, 'rgba(160,130,60,0.22)');
    },
  },

  // ── Rock Throw ─────────────────────────────────────────
  {
    id: 'rock_throw',
    weight: 2, enrageWeight: 1.4,
    windupFrames: 52, activeFrames: 1, recoveryFrames: 68,
    ranged: true,
    onActivate(boss, players) {
      const target = boss._findTarget(players);
      if (!target) return;
      const dx = target.x - boss.x, dy = target.y - boss.y;
      const d  = Math.hypot(dx, dy) || 1;
      const spd = 6.5;
      boss.thunderBalls.push({
        x:  boss.x + (dx / d) * 90,
        y:  boss.y + (dy / d) * 90,
        vx: (dx / d) * spd,
        vy: (dy / d) * spd,
        r: 22, life: 130, damage: 48,
        _rock: true,
      });
    },
    drawHint(ctx, boss) {
      // Aim line toward nearest player
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'rgba(180,140,70,0.5)';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      const angle = boss.angle;
      ctx.lineTo(boss.x + Math.cos(angle) * 300, boss.y + Math.sin(angle) * 300);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },
  },

  // ── Shield Spin ────────────────────────────────────────
  {
    id: 'shield_spin',
    weight: 2, enrageWeight: 1.2,
    windupFrames: 28, activeFrames: 72, recoveryFrames: 48,
    onStart(boss) {
      boss._runeSpinMult = 1.0;
    },
    onActivate(boss) {
      boss._runeSpinMult = 4.5; // runes orbit fast
    },
    onActive(boss, players) {
      boss._runeSpinMult = 4.5;
      // Damage anyone caught inside the orbit radius
      if (boss.moveTimer % 10 === 0) {
        boss.damageInCircle(players, boss.x, boss.y, 148, 14, 18);
      }
    },
    onDeactivate(boss) {
      boss._runeSpinMult = 1.0;
    },
    drawHint(ctx, boss) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, 145, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100,160,255,0.5)';
      ctx.lineWidth   = 28;
      ctx.globalAlpha = 0.18;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, 145, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100,160,255,0.55)';
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.restore();
    },
  },

  // ── Berserk Charge (only after all runes broken) ───────
  {
    id: 'charge',          // 'charge' id = base physics skips damping automatically
    weight: 0,             // never selected normally — only available in berserk
    enrageWeight: 3,
    requireBerserk: true,  // custom flag checked by BossKrag._isMoveAvailable
    windupFrames: 18, activeFrames: 52, recoveryFrames: 38,
    maxRange: 9999,
    onActivate(boss, players) {
      const target = boss._findTarget(players);
      if (!target) {
        boss.chargeDirX = Math.cos(boss.angle);
        boss.chargeDirY = Math.sin(boss.angle);
      } else {
        const dx = target.x - boss.x, dy = target.y - boss.y;
        const d  = Math.hypot(dx, dy) || 1;
        boss.chargeDirX = dx / d;
        boss.chargeDirY = dy / d;
      }
      boss.chargeSpeed = 11;
      spawnSparks(boss.x, boss.y, 16);
    },
    onActive(boss, players) {
      boss.vx = boss.chargeDirX * boss.chargeSpeed;
      boss.vy = boss.chargeDirY * boss.chargeSpeed;
      boss.damageInRect(players,
        boss.x + boss.chargeDirX * 55,
        boss.y + boss.chargeDirY * 55,
        60, 52, Math.atan2(boss.chargeDirY, boss.chargeDirX),
        32, 12
      );
    },
    drawHint(ctx, boss) {
      const len = 220;
      const cx  = boss.x + boss.chargeDirX * len / 2;
      const cy  = boss.y + boss.chargeDirY * len / 2;
      _bossDrawRect(ctx, cx, cy, len / 2, 55, Math.atan2(boss.chargeDirY, boss.chargeDirX), 'rgba(255,140,0,0.35)');
    },
  },
];
