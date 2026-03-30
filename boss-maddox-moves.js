// ============================================================
// MADDOX THE MAD — Full Move Pool (8 moves)
// Each shuffle picks 4-6 of these randomly.
// ============================================================

const MADDOX_ALL_MOVES = [

  // ── Card Toss (fast triple projectile) ───────────────
  {
    id: 'card_toss',
    weight: 3,
    windupFrames: 22, activeFrames: 1, recoveryFrames: 50,
    ranged: true,
    onActivate(boss, players) {
      const target = boss._findTarget(players);
      if (!target) return;
      const dx = target.x - boss.x, dy = target.y - boss.y;
      const d  = Math.hypot(dx, dy) || 1;
      for (let i = -1; i <= 1; i++) {
        const spread = i * 0.15;
        const a      = Math.atan2(dy, dx) + spread;
        boss.thunderBalls.push({
          x:  boss.x + Math.cos(a) * 55,
          y:  boss.y + Math.sin(a) * 55,
          vx: Math.cos(a) * 8.5,
          vy: Math.sin(a) * 8.5,
          r: 6, life: 100, damage: 16,
          _card: true,
        });
      }
    },
    drawHint(ctx, boss) {
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(255,100,200,0.45)';
      ctx.lineWidth   = 1.5;
      for (let i = -1; i <= 1; i++) {
        const a = boss.angle + i * 0.15;
        ctx.beginPath();
        ctx.moveTo(boss.x, boss.y);
        ctx.lineTo(boss.x + Math.cos(a) * 250, boss.y + Math.sin(a) * 250);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    },
  },

  // ── Confetti Burst (20-shot 360° spray) ──────────────
  {
    id: 'confetti_burst',
    weight: 2,
    windupFrames: 25, activeFrames: 1, recoveryFrames: 60,
    onActivate(boss) {
      const count = 20;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        boss.thunderBalls.push({
          x:  boss.x + Math.cos(a) * 50,
          y:  boss.y + Math.sin(a) * 50,
          vx: Math.cos(a) * (4 + Math.random() * 2.5),
          vy: Math.sin(a) * (4 + Math.random() * 2.5),
          r: 5, life: 90, damage: 10,
          _card: true,
        });
      }
      spawnSparks(boss.x, boss.y, 22);
    },
    drawHint(ctx, boss) {
      _bossDrawCircle(ctx, boss.x, boss.y, 55, 'rgba(255,100,200,0.35)');
    },
  },

  // ── Ground Pound (big AOE stomp) ─────────────────────
  {
    id: 'ground_pound',
    weight: 3,
    windupFrames: 48, activeFrames: 22, recoveryFrames: 56,
    maxRange: 200,
    onActivate(boss, players) {
      boss.damageInCircle(players, boss.x, boss.y, 160, 38, 22);
      spawnSparks(boss.x, boss.y, 26);
    },
    onActive(boss, players) {
      if (boss.moveTimer % 9 === 0) {
        boss.damageInCircle(players, boss.x, boss.y, 185, 8, 14);
      }
    },
    drawHint(ctx, boss) {
      _bossDrawCircle(ctx, boss.x, boss.y, 160, 'rgba(255,100,200,0.40)');
    },
  },

  // ── Dive Bomb (fast straight charge) ─────────────────
  {
    id: 'charge',
    weight: 2,
    windupFrames: 26, activeFrames: 44, recoveryFrames: 36,
    maxRange: 9999,
    trackDuringWindup: true,
    onActivate(boss, players) {
      const target = boss._findTarget(players);
      if (target) {
        const dx = target.x - boss.x, dy = target.y - boss.y;
        const d  = Math.hypot(dx, dy) || 1;
        boss.chargeDirX = dx / d; boss.chargeDirY = dy / d;
      } else {
        boss.chargeDirX = Math.cos(boss.angle);
        boss.chargeDirY = Math.sin(boss.angle);
      }
      boss.chargeSpeed = 12;
      spawnSparks(boss.x, boss.y, 14);
    },
    onActive(boss, players) {
      boss.vx = boss.chargeDirX * boss.chargeSpeed;
      boss.vy = boss.chargeDirY * boss.chargeSpeed;
      boss.damageInRect(players,
        boss.x + boss.chargeDirX * 45, boss.y + boss.chargeDirY * 45,
        45, 36, Math.atan2(boss.chargeDirY, boss.chargeDirX), 26, 10
      );
    },
    drawHint(ctx, boss) {
      const len = 240;
      const cx  = boss.x + boss.chargeDirX * len / 2;
      const cy  = boss.y + boss.chargeDirY * len / 2;
      _bossDrawRect(ctx, cx, cy, len / 2, 38, Math.atan2(boss.chargeDirY, boss.chargeDirX), 'rgba(255,100,200,0.35)');
    },
  },

  // ── Banana Peel (SLOW_ZONE trap at target's feet) ─────
  {
    id: 'banana_peel',
    weight: 2,
    windupFrames: 30, activeFrames: 1, recoveryFrames: 58,
    ranged: true,
    onActivate(boss, players) {
      const target = boss._findTarget(players);
      if (!target) return;
      spawnSparks(target.x, target.y, 10);
      state.terrainObjects.push({
        type: 'SLOW_ZONE', id: `maddox_banana_${Date.now()}`,
        shape: 'circle', x: target.x, y: target.y, r: 48,
        speedMult:   0.35,
        color:      'rgba(200,200,0,0.35)',
        strokeColor:'rgba(255,255,0,0.55)',
        label: '🍌 Slip!',
        _spawnFrame: state.frame,
        lifetime:    420,
      });
    },
    drawHint(ctx, boss) {
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(255,220,0,0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.lineTo(boss.x + Math.cos(boss.angle) * 300, boss.y + Math.sin(boss.angle) * 300);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },
  },

  // ── Talon Swipe (wide slashing cone) ─────────────────
  {
    id: 'talon_swipe',
    weight: 3,
    windupFrames: 30, activeFrames: 20, recoveryFrames: 44,
    maxRange: 190,
    trackDuringWindup: true,
    onActivate(boss, players) {
      boss.damageInCone(players, boss.x, boss.y, boss.angle, Math.PI / 3, 160, 28, 22);
      spawnSparks(boss.x + Math.cos(boss.angle) * 80, boss.y + Math.sin(boss.angle) * 80, 14);
    },
    drawHint(ctx, boss) {
      _bossDrawCone(ctx, boss, Math.PI / 3, 160, 'rgba(255,100,200,0.35)');
    },
  },

  // ── Chaos Barrage (6 random-direction fast balls) ─────
  {
    id: 'chaos_barrage',
    weight: 2,
    windupFrames: 20, activeFrames: 1, recoveryFrames: 55,
    onActivate(boss) {
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 5 + Math.random() * 4;
        boss.thunderBalls.push({
          x:  boss.x + Math.cos(a) * 50,
          y:  boss.y + Math.sin(a) * 50,
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          r: 8, life: 110, damage: 18,
          _card: true,
        });
      }
    },
    drawHint(ctx, boss) {
      _bossDrawCircle(ctx, boss.x, boss.y, 55, 'rgba(255,100,200,0.28)');
    },
  },

  // ── Pratfall (fake big windup → tiny damage + boss stumbles) ─
  {
    id: 'pratfall',
    weight: 1,
    windupFrames: 65, // looks like a HUGE charge-up...
    activeFrames: 5,
    recoveryFrames: 80,
    maxRange: 9999,
    onActivate(boss, players) {
      // Tiny damage (the joke is the long windup for almost nothing)
      boss.damageInCircle(players, boss.x, boss.y, 55, 5, 20);
      spawnSparks(boss.x, boss.y, 8);
      // Boss briefly stuns himself (funny stumble)
      boss.stunTimer = 45;
      boss.state = 'stunned';
      spawnBigAnnouncement('🤡 PRATFALL!', '#ff88cc');
    },
    drawHint(ctx, boss) {
      // HUGE telegraph circle that implies massive damage
      _bossDrawCircle(ctx, boss.x, boss.y, 280, 'rgba(255,100,200,0.45)');
      ctx.save();
      ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,80,200,0.6)';
      ctx.fillText('!!!', boss.x, boss.y - 90);
      ctx.restore();
    },
  },
];
