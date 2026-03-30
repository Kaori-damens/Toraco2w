// ============================================================
// IGNAR THE ETERNAL FLAME — Move Set
// ============================================================

const IGNAR_MOVES = [

  // ── Eruption (AOE + ring of lava pools) ───────────────
  {
    id: 'eruption',
    weight: 3, enrageWeight: 1.5,
    windupFrames: 55, activeFrames: 28, recoveryFrames: 62,
    maxRange: 180,
    onActivate(boss, players) {
      // Slam AOE
      boss.damageInCircle(players, boss.x, boss.y, 128, 42, 20);
      spawnSparks(boss.x, boss.y, 30);
      // Ring of 6 lava pools around impact
      for (let i = 0; i < 6; i++) {
        const a  = (i / 6) * Math.PI * 2;
        const px = boss.x + Math.cos(a) * 125;
        const py = boss.y + Math.sin(a) * 125;
        state.terrainObjects.push({
          type: 'HAZARD_ZONE', id: `ignar_erupt_${Date.now()}_${i}`,
          shape: 'circle', x: px, y: py, r: 42,
          damagePerFrame: 0.30,
          color:      'rgba(255,80,0,0.20)',
          pulseColor: 'rgba(255,160,0,0.42)',
          _ignarPool: true,
          _spawnFrame: state.frame,
          lifetime:    500,
        });
        spawnSparks(px, py, 10);
      }
    },
    onActive(boss, players) {
      if (boss.moveTimer % 10 === 0) {
        boss.damageInCircle(players, boss.x, boss.y, 145, 8, 14);
      }
    },
    drawHint(ctx, boss) {
      _bossDrawCircle(ctx, boss.x, boss.y, 128, 'rgba(255,100,0,0.42)');
      // Hint the 6 pool spots
      ctx.save();
      ctx.fillStyle = 'rgba(255,80,0,0.22)';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(boss.x + Math.cos(a) * 125, boss.y + Math.sin(a) * 125, 42, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  },

  // ── Magma Charge ──────────────────────────────────────
  {
    id: 'charge',          // 'charge' id = physics damping skipped
    weight: 3, enrageWeight: 1.6,
    windupFrames: 32, activeFrames: 52, recoveryFrames: 46,
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
      boss.chargeSpeed = 9;
      // Drop a lava pool at start position
      state.terrainObjects.push({
        type: 'HAZARD_ZONE', id: `ignar_charge_${Date.now()}`,
        shape: 'circle', x: boss.x, y: boss.y, r: 52,
        damagePerFrame: 0.28,
        color:      'rgba(255,80,0,0.18)',
        pulseColor: 'rgba(255,150,0,0.38)',
        _ignarPool: true,
        _spawnFrame: state.frame,
        lifetime:    420,
      });
      spawnSparks(boss.x, boss.y, 14);
    },
    onActive(boss, players) {
      boss.vx = boss.chargeDirX * boss.chargeSpeed;
      boss.vy = boss.chargeDirY * boss.chargeSpeed;
      boss.damageInRect(players,
        boss.x + boss.chargeDirX * 60,
        boss.y + boss.chargeDirY * 60,
        65, 58, Math.atan2(boss.chargeDirY, boss.chargeDirX),
        38, 10
      );
      // Leave lava trail every 14 frames
      if (boss.moveTimer % 14 === 0) {
        state.terrainObjects.push({
          type: 'HAZARD_ZONE', id: `ignar_trail_${Date.now()}`,
          shape: 'circle', x: boss.x, y: boss.y, r: 36,
          damagePerFrame: 0.22,
          color:      'rgba(255,80,0,0.16)',
          pulseColor: 'rgba(255,140,0,0.32)',
          _ignarPool: true,
          _spawnFrame: state.frame,
          lifetime:    360,
        });
      }
    },
    drawHint(ctx, boss) {
      const len = 240;
      const cx  = boss.x + boss.chargeDirX * len / 2;
      const cy  = boss.y + boss.chargeDirY * len / 2;
      _bossDrawRect(ctx, cx, cy, len / 2, 60, Math.atan2(boss.chargeDirY, boss.chargeDirX), 'rgba(255,100,0,0.35)');
    },
  },

  // ── Lava Geyser (ranged trap at target position) ──────
  {
    id: 'lava_geyser',
    weight: 2, enrageWeight: 1.4,
    windupFrames: 48, activeFrames: 1, recoveryFrames: 72,
    ranged: true,
    onActivate(boss, players) {
      const target = boss._findTarget(players);
      if (!target) return;
      // Warn with sparks at target location
      spawnSparks(target.x, target.y, 18);
      // Short delay via setTimeout is tricky in game loop; spawn immediately
      state.terrainObjects.push({
        type: 'HAZARD_ZONE', id: `ignar_geyser_${Date.now()}`,
        shape: 'circle', x: target.x, y: target.y, r: 58,
        damagePerFrame: 0.55, // more intense than trail
        color:      'rgba(255,100,0,0.28)',
        pulseColor: 'rgba(255,200,0,0.55)',
        label: 'Geyser',
        _ignarPool: true,
        _spawnFrame: state.frame,
        lifetime:    320,
      });
    },
    drawHint(ctx, boss) {
      // Pulsing aim indicator at current target
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = 'rgba(255,120,0,0.50)';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.lineTo(boss.x + Math.cos(boss.angle) * 320, boss.y + Math.sin(boss.angle) * 320);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },
  },

  // ── Flame Slam (heavy melee AOE) ──────────────────────
  {
    id: 'flame_slam',
    weight: 2, enrageWeight: 1.3,
    windupFrames: 36, activeFrames: 18, recoveryFrames: 52,
    maxRange: 170,
    onActivate(boss, players) {
      boss.damageInCircle(players, boss.x, boss.y, 150, 52, 18);
      // Push outward
      for (const p of players) {
        if (!p.alive) continue;
        const dx = p.x - boss.x, dy = p.y - boss.y;
        const d  = Math.hypot(dx, dy) || 1;
        if (d < 150 + p.radius) {
          p.vx += (dx / d) * 8;
          p.vy += (dy / d) * 8;
        }
      }
      spawnSparks(boss.x, boss.y, 26);
    },
    drawHint(ctx, boss) {
      _bossDrawCircle(ctx, boss.x, boss.y, 150, 'rgba(255,100,0,0.42)');
    },
  },
];
