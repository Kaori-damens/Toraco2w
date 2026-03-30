// ============================================================
// MOLTHREX THE FESTERING — Move Set
// Heads fire acid independently each move; more heads = more projectiles.
// ============================================================

const MOLTHREX_MOVES = [

  // ── Acid Spit (each alive head fires a projectile) ────
  {
    id: 'acid_spit',
    weight: 4, enrageWeight: 1.5,
    windupFrames: 28, activeFrames: 1, recoveryFrames: 52,
    ranged: true,
    onActivate(boss, players) {
      const target = boss._findTarget(players);
      if (!target) return;
      const aliveHeads = boss.heads.filter(h => !h.broken && h.alive);
      for (const head of aliveHeads) {
        const pos = boss.getPartPos(head.id);
        if (!pos) continue;
        const dx = target.x - pos.x, dy = target.y - pos.y;
        const d  = Math.hypot(dx, dy) || 1;
        // Slight spread per head generation
        const spread = (Math.random() - 0.5) * 0.18 * (head.gen + 1);
        const ang    = Math.atan2(dy, dx) + spread;
        boss.thunderBalls.push({
          x: pos.x + Math.cos(ang) * 44,
          y: pos.y + Math.sin(ang) * 44,
          vx: Math.cos(ang) * 5.2,
          vy: Math.sin(ang) * 5.2,
          r: 7, life: 110, damage: 14,
          _acid: true,
        });
      }
    },
    drawHint(ctx, boss) {
      // Draw aim line from each alive head
      const target = boss._findTarget(boss._lastPlayers ?? []);
      if (!target) return;
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = 'rgba(80,200,50,0.35)';
      ctx.lineWidth   = 1.5;
      for (const head of boss.heads.filter(h => !h.broken)) {
        const pos = boss.getPartPos(head.id);
        if (!pos) continue;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    },
  },

  // ── Chomp (wide cone from boss center — one big lunge) ─
  {
    id: 'chomp',
    weight: 3, enrageWeight: 1.4,
    windupFrames: 36, activeFrames: 20, recoveryFrames: 48,
    maxRange: 200,
    trackDuringWindup: true,
    onActivate(boss, players) {
      boss.damageInCone(players, boss.x, boss.y, boss.angle, Math.PI / 3, 185, 32, 22);
      spawnSparks(boss.x + Math.cos(boss.angle) * 90, boss.y + Math.sin(boss.angle) * 90, 16);
    },
    onActive(boss, players) {
      if (boss.moveTimer % 8 === 0) {
        boss.damageInCone(players, boss.x, boss.y, boss.angle, Math.PI / 3.5, 170, 8, 14);
      }
    },
    drawHint(ctx, boss) {
      _bossDrawCone(ctx, boss, Math.PI / 3, 185, 'rgba(80,200,50,0.35)');
    },
  },

  // ── Constrict (circle AOE + slow) ─────────────────────
  {
    id: 'constrict',
    weight: 2, enrageWeight: 1.2,
    windupFrames: 45, activeFrames: 28, recoveryFrames: 55,
    maxRange: 150,
    onActivate(boss, players) {
      boss.damageInCircle(players, boss.x, boss.y, 148, 28, 24);
      // Slow all players in range
      for (const p of players) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - boss.x, p.y - boss.y) < 148 + p.radius) {
          p._constrictSlow = 80; // frames of slow
        }
      }
      spawnSparks(boss.x, boss.y, 22);
    },
    onActive(boss, players) {
      if (boss.moveTimer % 10 === 0) {
        boss.damageInCircle(players, boss.x, boss.y, 160, 6, 16);
      }
    },
    drawHint(ctx, boss) {
      _bossDrawCircle(ctx, boss.x, boss.y, 148, 'rgba(80,200,50,0.35)');
    },
  },

  // ── Plague Nova (only at low HP — burst from all heads) ─
  {
    id: 'plague_nova',
    weight: 0, enrageWeight: 5,
    windupFrames: 55, activeFrames: 2, recoveryFrames: 80,
    requireLowHp: true, // checked by BossMolthrex._isMoveAvailable
    onActivate(boss, players) {
      const aliveHeads = boss.heads.filter(h => !h.broken && h.alive);
      for (const head of aliveHeads) {
        const pos = boss.getPartPos(head.id);
        if (!pos) continue;
        // Spray 8 projectiles from this head
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          boss.thunderBalls.push({
            x:  pos.x + Math.cos(a) * 30,
            y:  pos.y + Math.sin(a) * 30,
            vx: Math.cos(a) * 4.8,
            vy: Math.sin(a) * 4.8,
            r: 6, life: 100, damage: 12,
            _acid: true,
          });
        }
        spawnSparks(pos.x, pos.y, 14);
      }
    },
    drawHint(ctx, boss) {
      for (const head of boss.heads.filter(h => !h.broken)) {
        const pos = boss.getPartPos(head.id);
        if (!pos) continue;
        _bossDrawCircle(ctx, pos.x, pos.y, 55, 'rgba(80,220,60,0.30)');
      }
    },
  },
];
