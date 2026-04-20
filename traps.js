// ============================================================
// PVP TRAPS — initTrapObjects, updateTraps, drawTraps
// Trap types: pillar (static solid), scythe (rotating blade),
//             lightning (periodic area strike), bomb (contact explosive)
// ============================================================

// ── Helpers ───────────────────────────────────────────────────────
function _trapArenaCenter(arena) {
  if (arena.type === 'circle') return { cx: arena.cx, cy: arena.cy };
  return { cx: arena.x + arena.w / 2, cy: arena.y + arena.h / 2 };
}

// Returns a random point inside the arena with given margin and min dist from center.
function _randomInArena(arena, minDistFromCenter, margin) {
  minDistFromCenter = minDistFromCenter || 0;
  margin = margin || 70;
  const c = _trapArenaCenter(arena);
  let x, y, tries = 0;
  do {
    if (arena.type === 'circle') {
      const angle = Math.random() * Math.PI * 2;
      const r = (arena.r - margin) * Math.sqrt(Math.random());
      x = arena.cx + Math.cos(angle) * r;
      y = arena.cy + Math.sin(angle) * r;
    } else {
      x = arena.x + margin + Math.random() * (arena.w - margin * 2);
      y = arena.y + margin + Math.random() * (arena.h - margin * 2);
    }
    tries++;
  } while (tries < 40 && Math.hypot(x - c.cx, y - c.cy) < minDistFromCenter);
  return { x, y };
}

// ── INIT ──────────────────────────────────────────────────────────
function initTrapObjects(arena) {
  const cfg = arena.traps || {};
  const objects = [];
  const { cx, cy } = _trapArenaCenter(arena);

  // — Pillars (static solid circles) —
  const placedPillars = [];
  const pillarR = 28;
  for (let i = 0; i < (cfg.pillars || 0); i++) {
    let pos, ok = false, tries = 0;
    do {
      pos = _randomInArena(arena, 130, 80);
      ok = true;
      for (const p of placedPillars) {
        if (Math.hypot(pos.x - p.x, pos.y - p.y) < pillarR * 2 + 40) { ok = false; break; }
      }
      tries++;
    } while (!ok && tries < 60);
    placedPillars.push(pos);
    objects.push({ kind: 'pillar', x: pos.x, y: pos.y, r: pillarR });
  }

  // — Moving Scythe (rotating blade around arena center) —
  if (cfg.scythe) {
    const armLen = arena.type === 'circle'
      ? arena.r * 0.60
      : Math.min(arena.w, arena.h) * 0.32;
    objects.push({ kind: 'scythe', cx, cy, armLen, angle: 0, speed: 0.020, bladeR: 18 });
  }

  // — Lightning Zones (periodic strikes) —
  for (let i = 0; i < (cfg.lightning || 0); i++) {
    objects.push({
      kind: 'lightning',
      arena,
      phase: 'idle',
      idleTimer: 180 + Math.floor(Math.random() * 180) + i * 140,
      warnTimer: 0,
      strikeTimer: 0,
      targetX: cx, targetY: cy,
      strikeR: 65,
    });
  }

  // — Bomb Barrels (contact explosives, respawn after cooldown) —
  const placedBombs = [];
  for (let i = 0; i < (cfg.bombs || 0); i++) {
    let pos, ok = false, tries = 0;
    do {
      pos = _randomInArena(arena, 90, 80);
      ok = true;
      for (const p of placedBombs) {
        if (Math.hypot(pos.x - p.x, pos.y - p.y) < 110) { ok = false; break; }
      }
      tries++;
    } while (!ok && tries < 50);
    placedBombs.push(pos);
    objects.push({
      kind: 'bomb',
      x: pos.x, y: pos.y, r: 18,
      explodeR: 120, damage: 75,
      phase: 'armed',    // 'armed' | 'exploding' | 'cooldown'
      explodeTimer: 0,
      cooldownTimer: 0,
    });
  }

  return objects;
}

// ── UPDATE ────────────────────────────────────────────────────────
function updateTraps(traps, players, frame) {
  for (const trap of traps) {
    switch (trap.kind) {
      case 'pillar':    _updatePillar(trap, players);    break;
      case 'scythe':    _updateScythe(trap, players);    break;
      case 'lightning': _updateLightning(trap, players); break;
      // case 'bomb': disabled for now
    }
  }
}

function _updatePillar(p, players) {
  for (const ball of players) {
    if (!ball.alive) continue;
    const dx = ball.x - p.x, dy = ball.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = p.r + ball.radius;

    // Ball body vs pillar — fully elastic bounce (no damping)
    if (dist < minDist && dist > 0) {
      const nx = dx / dist, ny = dy / dist;
      ball.x = p.x + nx * minDist;
      ball.y = p.y + ny * minDist;
      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        ball.vx -= 2 * dot * nx;
        ball.vy -= 2 * dot * ny;
      }
    }

    // Melee weapon tip vs pillar — parry-like: recoil + cooldown reset, no text/stun
    const wdef = ball.weaponDef;
    if (!wdef || wdef.aiType === 'ranged') continue; // ranged weapons don't get parried by pillars
    if (ball.weapon.cooldown > 0) continue;          // weapon not in attack window — skip
    const pts = wdef.getHitPoints(ball);
    for (const pt of pts) {
      const wdx = pt.x - p.x, wdy = pt.y - p.y;
      if (wdx * wdx + wdy * wdy < (p.r + pt.r) * (p.r + pt.r)) {
        // Push ball away from pillar center
        const repelNx = dist > 0 ? dx / dist : 1;
        const repelNy = dist > 0 ? dy / dist : 0;
        ball.vx += repelNx * 3.5;
        ball.vy += repelNy * 3.5;
        // Treat as parry: lock weapon for full attack cooldown, deflect weapon angle
        ball.weapon.cooldown = ball.weapon.attackCooldown;
        ball.weapon.angle   += Math.PI * 0.15;
        // Small sparks at weapon contact point — no "Parry" text
        spawnSparks(pt.x, pt.y, 6);
        break;
      }
    }
  }
}

function _updateScythe(s, players) {
  s.angle += s.speed;
  const tipX = s.cx + Math.cos(s.angle) * s.armLen;
  const tipY = s.cy + Math.sin(s.angle) * s.armLen;
  for (const ball of players) {
    if (!ball.alive) continue;
    if (!ball._scytheCooldown) ball._scytheCooldown = 0;
    if (ball._scytheCooldown > 0) { ball._scytheCooldown--; continue; }
    const dx = ball.x - tipX, dy = ball.y - tipY;
    if (Math.hypot(dx, dy) < s.bladeR + ball.radius) {
      ball.takeDamage(8, null);
      ball._scytheCooldown = 20;
      spawnDamageNumber(ball.x, ball.y - ball.radius - 10, '⚔️ 8', '#ff8844');
      const nd = Math.hypot(dx, dy) || 1;
      ball.vx += (dx / nd) * 4;
      ball.vy += (dy / nd) * 4;
    }
  }
}

function _updateLightning(lt, players) {
  if (lt.phase === 'idle') {
    lt.idleTimer--;
    if (lt.idleTimer <= 0) {
      const pos = _randomInArena(lt.arena, 0, 80);
      lt.targetX = pos.x;
      lt.targetY = pos.y;
      lt.phase = 'warning';
      lt.warnTimer = 60;
    }
  } else if (lt.phase === 'warning') {
    lt.warnTimer--;
    if (lt.warnTimer <= 0) {
      lt.phase = 'strike';
      lt.strikeTimer = 20;
      for (const ball of players) {
        if (!ball.alive) continue;
        if (Math.hypot(ball.x - lt.targetX, ball.y - lt.targetY) < lt.strikeR + ball.radius) {
          ball.takeDamage(10, null);
          spawnDamageNumber(ball.x, ball.y - ball.radius - 10, '⚡ 10', '#ffff44');
          if (typeof spawnSparks === 'function') spawnSparks(ball.x, ball.y, 14);
        }
      }
    }
  } else if (lt.phase === 'strike') {
    lt.strikeTimer--;
    if (lt.strikeTimer <= 0) {
      lt.phase = 'idle';
      lt.idleTimer = 220 + Math.floor(Math.random() * 200);
    }
  }
}

function _updateBomb(bomb, players) {
  if (bomb.phase === 'armed') {
    for (const ball of players) {
      if (!ball.alive) continue;
      if (Math.hypot(ball.x - bomb.x, ball.y - bomb.y) < bomb.r + ball.radius) {
        bomb.phase = 'exploding';
        bomb.explodeTimer = 25;
        for (const b of players) {
          if (!b.alive) continue;
          const d = Math.hypot(b.x - bomb.x, b.y - bomb.y);
          if (d < bomb.explodeR + b.radius) {
            const falloff = 1 - (d / bomb.explodeR) * 0.5;
            const dmg = Math.round(bomb.damage * Math.max(0.5, falloff));
            b.takeDamage(dmg, null);
            spawnDamageNumber(b.x, b.y - b.radius - 10, `💥 ${dmg}`, '#ff6600');
            const n = d || 1;
            b.vx += ((b.x - bomb.x) / n) * 12;
            b.vy += ((b.y - bomb.y) / n) * 12;
          }
        }
        if (typeof spawnSparks === 'function') spawnSparks(bomb.x, bomb.y, 24);
        break;
      }
    }
  } else if (bomb.phase === 'exploding') {
    bomb.explodeTimer--;
    if (bomb.explodeTimer <= 0) {
      bomb.phase = 'cooldown';
      bomb.cooldownTimer = 300;
    }
  } else if (bomb.phase === 'cooldown') {
    bomb.cooldownTimer--;
    if (bomb.cooldownTimer <= 0) bomb.phase = 'armed';
  }
}

// ── DRAW ──────────────────────────────────────────────────────────
function drawTraps(ctx, traps, frame) {
  const t = frame * 0.05;
  for (const trap of traps) {
    switch (trap.kind) {
      case 'pillar':    _drawPillar(ctx, trap);         break;
      case 'scythe':    _drawScythe(ctx, trap);         break;
      case 'lightning': _drawLightning(ctx, trap, t);   break;
      // case 'bomb': disabled for now
    }
  }
}

function _drawPillar(ctx, p) {
  ctx.save();
  ctx.shadowColor = '#223';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fillStyle = '#1e1e2e';
  ctx.fill();
  ctx.strokeStyle = '#4455aa';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Inner ring detail
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = '#334477';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function _drawScythe(ctx, s) {
  const tipX = s.cx + Math.cos(s.angle) * s.armLen;
  const tipY = s.cy + Math.sin(s.angle) * s.armLen;
  ctx.save();
  // Dashed arm
  ctx.strokeStyle = 'rgba(180,60,60,0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(s.cx, s.cy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.setLineDash([]);
  // Blade at tip
  ctx.translate(tipX, tipY);
  ctx.rotate(s.angle + Math.PI / 2);
  ctx.shadowColor = '#ff4422';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.ellipse(0, 0, s.bladeR, Math.round(s.bladeR * 0.36), 0, 0, Math.PI * 2);
  ctx.fillStyle = '#bb2211';
  ctx.fill();
  ctx.strokeStyle = '#ff6644';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function _drawLightning(ctx, lt, t) {
  if (lt.phase === 'idle') return;
  ctx.save();
  if (lt.phase === 'warning') {
    const pulse = 0.35 + 0.3 * Math.sin(t * 7);
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#ffff33';
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 4]);
    ctx.beginPath();
    ctx.arc(lt.targetX, lt.targetY, lt.strikeR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#ffff55';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = pulse * 1.5;
    ctx.fillText('⚡', lt.targetX, lt.targetY);
  } else if (lt.phase === 'strike') {
    const p = lt.strikeTimer / 20;
    ctx.globalAlpha = p;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 50;
    ctx.fillStyle = `rgba(255,255,180,${p * 0.45})`;
    ctx.beginPath();
    ctx.arc(lt.targetX, lt.targetY, lt.strikeR, 0, Math.PI * 2);
    ctx.fill();
    // Bolt lines (static pattern using fixed offsets for consistency)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const bx = lt.targetX, by = lt.targetY, br = lt.strikeR;
    ctx.moveTo(bx, by - br * 1.5);
    ctx.lineTo(bx + 8,  by - br * 0.6);
    ctx.lineTo(bx - 6,  by);
    ctx.lineTo(bx + 10, by + br * 0.5);
    ctx.lineTo(bx,      by + br * 1.4);
    ctx.stroke();
  }
  ctx.restore();
}

function _drawBomb(ctx, bomb, t) {
  if (bomb.phase === 'cooldown') return;
  ctx.save();
  if (bomb.phase === 'exploding') {
    const p = bomb.explodeTimer / 25;
    ctx.globalAlpha = p;
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 50;
    ctx.beginPath();
    ctx.arc(bomb.x, bomb.y, bomb.explodeR * (1.3 - p), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,120,0,${p * 0.55})`;
    ctx.fill();
  } else {
    // Armed — pulse glow
    const pulse = 0.75 + 0.25 * Math.sin(t * 4);
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 10 * pulse;
    ctx.beginPath();
    ctx.arc(bomb.x, bomb.y, bomb.r, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1008';
    ctx.fill();
    ctx.strokeStyle = `rgba(255,100,0,${pulse})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = `${Math.round(bomb.r * 1.3)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 1;
    ctx.fillText('💣', bomb.x, bomb.y);
  }
  ctx.restore();
}
