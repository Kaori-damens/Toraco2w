// ============================================================
// WARBOSS GRAKK — Move Set
// Some moves need the Shaman alive (requireShaman: true).
// ============================================================

const GRAKK_MOVES = [

  // ── Warboss Charge (heavy body charge) ───────────────
  {
    id: 'charge',
    weight: 3, enrageWeight: 1.5,
    windupFrames: 30, activeFrames: 45, recoveryFrames: 44,
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
      boss.chargeSpeed = 8;
      spawnSparks(boss.x, boss.y, 14);
    },
    onActive(boss, players) {
      boss.vx = boss.chargeDirX * boss.chargeSpeed;
      boss.vy = boss.chargeDirY * boss.chargeSpeed;
      boss.damageInRect(players,
        boss.x + boss.chargeDirX * 50,
        boss.y + boss.chargeDirY * 50,
        55, 45, Math.atan2(boss.chargeDirY, boss.chargeDirX),
        30, 12
      );
    },
    drawHint(ctx, boss) {
      const len = 220;
      const cx  = boss.x + boss.chargeDirX * len / 2;
      const cy  = boss.y + boss.chargeDirY * len / 2;
      _bossDrawRect(ctx, cx, cy, len / 2, 48, Math.atan2(boss.chargeDirY, boss.chargeDirX), 'rgba(80,160,30,0.35)');
    },
  },

  // ── Ground Slam (stomp) ───────────────────────────────
  {
    id: 'ground_slam',
    weight: 3, enrageWeight: 1.3,
    windupFrames: 42, activeFrames: 20, recoveryFrames: 52,
    maxRange: 200,
    onActivate(boss, players) {
      boss.damageInCircle(players, boss.x, boss.y, 155, 35, 22);
      spawnSparks(boss.x, boss.y, 24);
    },
    onActive(boss, players) {
      if (boss.moveTimer % 10 === 0) {
        boss.damageInCircle(players, boss.x, boss.y, 175, 8, 14);
      }
    },
    drawHint(ctx, boss) {
      _bossDrawCircle(ctx, boss.x, boss.y, 155, 'rgba(80,160,30,0.38)');
    },
  },

  // ── Goblin Rush (commands swarm to all rush one target) ─
  {
    id: 'goblin_rush',
    weight: 2, enrageWeight: 1.8,
    requireShaman: true,  // shaman must be alive
    windupFrames: 35, activeFrames: 5, recoveryFrames: 50,
    onActivate(boss, players) {
      const target = boss._findTarget(players);
      if (!target) return;
      // Mark all goblins with a rush target + speed boost
      for (const g of boss.goblins) {
        if (!g.alive) continue;
        g.rushing    = true;
        g.rushTarget = target;
        g.rushFrames = 120; // 2 seconds of boosted speed
      }
      spawnBigAnnouncement('👹 GOBLIN RUSH!', '#88cc22');
    },
    drawHint(ctx, boss) {
      const shamanPos = boss.getPartPos('shaman');
      if (!shamanPos) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(shamanPos.x, shamanPos.y, shamanPos.r + 12, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(80,200,30,0.55)';
      ctx.lineWidth   = 3;
      ctx.stroke();
      ctx.restore();
    },
  },

  // ── Shaman Hex (curses nearest player — slows them) ───
  {
    id: 'shaman_hex',
    weight: 2, enrageWeight: 1.4,
    requireShaman: true,
    ranged: true,
    windupFrames: 40, activeFrames: 1, recoveryFrames: 60,
    onActivate(boss, players) {
      const target = boss._findTarget(players);
      if (!target) return;
      const shamanPos = boss.getPartPos('shaman');
      if (!shamanPos) return;
      // Fire a hex orb from shaman position
      const dx = target.x - shamanPos.x, dy = target.y - shamanPos.y;
      const d  = Math.hypot(dx, dy) || 1;
      boss.thunderBalls.push({
        x:  shamanPos.x + (dx / d) * 38,
        y:  shamanPos.y + (dy / d) * 38,
        vx: (dx / d) * 5.0,
        vy: (dy / d) * 5.0,
        r: 9, life: 120, damage: 8,
        _hex: true,   // applies slow on hit (handled in resolveBossProjectileHits via boss callback)
      });
      spawnSparks(shamanPos.x, shamanPos.y, 12);
    },
    drawHint(ctx, boss) {
      const shamanPos = boss.getPartPos('shaman');
      if (!shamanPos) return;
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(80,200,30,0.40)';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(shamanPos.x, shamanPos.y);
      ctx.lineTo(shamanPos.x + Math.cos(boss.angle) * 260, shamanPos.y + Math.sin(boss.angle) * 260);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },
  },
];
