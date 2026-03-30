// ============================================================
// SYVARA THE UNRAVELED — Move Set
// Teleport requires anchors; Staff break disables Void Hole.
// ============================================================

const SYVARA_MOVES = [

  // ── Void Slash (fast forward cone) ───────────────────
  {
    id: 'void_slash',
    weight: 3, enrageWeight: 1.4,
    windupFrames: 28, activeFrames: 18, recoveryFrames: 40,
    maxRange: 195,
    trackDuringWindup: true,
    onActivate(boss, players) {
      boss.damageInCone(players, boss.x, boss.y, boss.angle, Math.PI / 3.5, 175, 30, 22);
      spawnSparks(boss.x + Math.cos(boss.angle) * 85, boss.y + Math.sin(boss.angle) * 85, 14);
    },
    drawHint(ctx, boss) {
      _bossDrawCone(ctx, boss, Math.PI / 3.5, 175, 'rgba(160,0,255,0.38)');
    },
  },

  // ── Blink Teleport (instant reposition) ──────────────
  {
    id: 'teleport',
    weight: 3, enrageWeight: 1.6,
    requireParts: ['staff'],      // disabled when staff is broken
    windupFrames: 38, activeFrames: 30, recoveryFrames: 36,
    onStart(boss) {
      boss._tpTarget   = null;
      boss._tpProgress = 0;
      boss._tpDone     = false;
    },
    onActivate(boss) {
      // Pick a random active anchor as teleport destination
      const anchors = state.terrainObjects.filter(t => t.type === 'VOID_ANCHOR' && !t.destroyed);
      if (anchors.length > 0) {
        const a = anchors[Math.floor(Math.random() * anchors.length)];
        boss._tpTarget = { x: a.x, y: a.y };
      } else {
        // No anchors — random spot in arena
        boss._tpTarget = {
          x: 160 + Math.random() * (CW - 320),
          y: 160 + Math.random() * (CH - 320),
        };
      }
      boss._tpProgress = 0;
      boss._tpDone     = false;
    },
    onActive(boss) {
      // Progress 0→1 over activeFrames
      boss._tpProgress = 1 - (boss.moveTimer / boss.currentMove.activeFrames);
      if (boss._tpProgress >= 0.5 && !boss._tpDone) {
        boss._tpDone = true;
        boss.x  = boss._tpTarget.x;
        boss.y  = boss._tpTarget.y;
        boss.vx = 0; boss.vy = 0;
        spawnSparks(boss.x, boss.y, 24);
      }
    },
    onDeactivate(boss) {
      boss._tpProgress = null;
      boss._tpTarget   = null;
      boss._tpDone     = false;
    },
    drawHint(ctx, boss) {
      if (!boss._tpTarget) return;
      ctx.save();
      ctx.setLineDash([8, 5]);
      ctx.strokeStyle = 'rgba(200,80,255,0.45)';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.lineTo(boss._tpTarget.x, boss._tpTarget.y);
      ctx.stroke();
      ctx.setLineDash([]);
      // Target circle
      ctx.beginPath();
      ctx.arc(boss._tpTarget.x, boss._tpTarget.y, 28, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200,80,255,0.55)';
      ctx.lineWidth   = 2.5;
      ctx.stroke();
      ctx.restore();
    },
  },

  // ── Void Pull (suck all players toward boss) ─────────
  {
    id: 'void_pull',
    weight: 2, enrageWeight: 1.5,
    windupFrames: 42, activeFrames: 22, recoveryFrames: 50,
    onActivate(boss, players) {
      for (const p of players) {
        if (!p.alive) continue;
        const dx = boss.x - p.x, dy = boss.y - p.y;
        const d  = Math.hypot(dx, dy) || 1;
        p.vx += (dx / d) * 12;
        p.vy += (dy / d) * 12;
      }
      // Damage on arrival
      boss.damageInCircle(players, boss.x, boss.y, 80, 22, 20);
      spawnSparks(boss.x, boss.y, 20);
    },
    drawHint(ctx, boss) {
      // Inward arrows
      ctx.save();
      const R = 180;
      for (let i = 0; i < 8; i++) {
        const a  = (i / 8) * Math.PI * 2;
        const x1 = boss.x + Math.cos(a) * R;
        const y1 = boss.y + Math.sin(a) * R;
        const x2 = boss.x + Math.cos(a) * 60;
        const y2 = boss.y + Math.sin(a) * 60;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(180,60,255,0.35)';
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  // ── Void Hole (spawn damaging terrain at player) ──────
  {
    id: 'void_hole',
    weight: 2, enrageWeight: 1.8,
    requireParts: ['staff'],       // disabled when staff is broken
    ranged: true,
    windupFrames: 50, activeFrames: 1, recoveryFrames: 65,
    onActivate(boss, players) {
      const target = boss._findTarget(players);
      if (!target) return;
      spawnSparks(target.x, target.y, 20);
      state.terrainObjects.push({
        type: 'HAZARD_ZONE', id: `syvara_void_${Date.now()}`,
        shape: 'circle', x: target.x, y: target.y, r: 48,
        damagePerFrame: 0.60,
        color:      'rgba(120,0,220,0.22)',
        pulseColor: 'rgba(200,60,255,0.50)',
        label: 'Void',
        _spawnFrame: state.frame,
        lifetime:    360,
      });
    },
    drawHint(ctx, boss) {
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(200,60,255,0.45)';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.lineTo(boss.x + Math.cos(boss.angle) * 320, boss.y + Math.sin(boss.angle) * 320);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },
  },

  // ── Anchor Barrage (fires orbs from each active anchor) ─
  {
    id: 'anchor_barrage',
    weight: 2, enrageWeight: 1.6,
    windupFrames: 45, activeFrames: 1, recoveryFrames: 60,
    ranged: true,
    onActivate(boss, players) {
      const target = boss._findTarget(players);
      if (!target) return;
      const anchors = state.terrainObjects.filter(t => t.type === 'VOID_ANCHOR' && !t.destroyed);
      for (const anchor of anchors) {
        const dx = target.x - anchor.x, dy = target.y - anchor.y;
        const d  = Math.hypot(dx, dy) || 1;
        boss.thunderBalls.push({
          x:  anchor.x + (dx / d) * 35,
          y:  anchor.y + (dy / d) * 35,
          vx: (dx / d) * 6.5,
          vy: (dy / d) * 6.5,
          r: 10, life: 120, damage: 22,
          _void: true,
        });
        spawnSparks(anchor.x, anchor.y, 8);
      }
    },
    drawHint(ctx, boss) {
      const anchors = state.terrainObjects?.filter(t => t.type === 'VOID_ANCHOR' && !t.destroyed) ?? [];
      ctx.save();
      ctx.strokeStyle = 'rgba(180,60,255,0.40)';
      ctx.lineWidth = 2;
      for (const anchor of anchors) {
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, 22, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    },
  },
];
