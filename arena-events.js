// ============================================================
// ARENA EVENTS — Dynamic arena mechanics
// ============================================================
// Supported event types:
//   spawn_hole     → diamond_rift:     dig circular holes every 30s
//   wind_gust      → tempest_octagon:  push all players every 15s
//   shrink         → shrinking_ring:   reduce circle radius every 22s
//   volcanic_vent  → volcanic_cross:   warning + blast every 12s

// ── Main tick (call each game step during 'playing' phase) ──
function updateArenaEvents() {
  const arena = state.arena;
  if (!arena?.events?.length || state.phase !== 'playing' || state.ended) return;

  if (!arena._eventTimers) arena._eventTimers = new Array(arena.events.length).fill(0);

  arena.events.forEach((ev, i) => {
    arena._eventTimers[i]++;
    if (arena._eventTimers[i] >= ev.interval) {
      arena._eventTimers[i] = 0;
      _fireArenaEvent(arena, ev);
    }
  });

  _tickWindGust(arena);
  _tickVentWarnings();
}

// ── Reset on new game ───────────────────────────────────────
function resetArenaEvents() {
  const arena = state.arena;
  if (arena) {
    delete arena._eventTimers;
    delete arena._windGust;
    arena._shrinkCount  = 0;
    arena.dynamicHoles  = [];
  }
  state.ventWarnings = [];
  state.arenaFx      = {};
}

// ── Fire one event ──────────────────────────────────────────
function _fireArenaEvent(arena, ev) {
  switch (ev.type) {

    case 'spawn_hole': {
      if (!arena.dynamicHoles) arena.dynamicHoles = [];
      if (arena.dynamicHoles.length >= (ev.maxHoles ?? 5)) return;
      const hr    = ev.holeR ?? 55;
      const inner = Math.min(arena.hw ?? arena.r ?? 200, arena.hh ?? arena.r ?? 200) * 0.5;
      let hx = arena.cx, hy = arena.cy;
      for (let t = 0; t < 25; t++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * inner;
        hx = arena.cx + Math.cos(a) * d;
        hy = arena.cy + Math.sin(a) * d;
        if (!arena.dynamicHoles.some(h => Math.hypot(hx - h.cx, hy - h.cy) < h.r + hr + 25)) break;
      }
      arena.dynamicHoles.push({ cx: hx, cy: hy, r: hr });
      if (typeof spawnBigAnnouncement === 'function') spawnBigAnnouncement('💀 HOLE OPENS!', '#ff5533', 120);
      if (typeof spawnSparks         === 'function') spawnSparks(hx, hy, 18, '#ff5533');
      break;
    }

    case 'wind_gust': {
      // 4 diagonal directions (from octagon corners)
      const angles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
      const a      = angles[Math.floor(Math.random() * 4)];
      const power  = ev.power ?? 9;
      arena._windGust = {
        vx: Math.cos(a) * power,
        vy: Math.sin(a) * power,
        frames: ev.duration ?? 90,
        totalFrames: ev.duration ?? 90,
      };
      if (typeof spawnBigAnnouncement === 'function') spawnBigAnnouncement('💨 WIND GUST!', '#aaddff', 90);
      break;
    }

    case 'shrink': {
      arena._shrinkCount = (arena._shrinkCount ?? 0) + 1;
      if (arena._shrinkCount > (ev.maxShrinks ?? 4)) return;
      const oldR = arena.r;
      arena.r = Math.max(arena.r - (ev.shrinkAmt ?? 45), ev.minR ?? 140);
      if (!state.arenaFx) state.arenaFx = {};
      state.arenaFx.shrinkRing = { cx: arena.cx, cy: arena.cy, r: oldR, frames: 90 };
      if (typeof spawnBigAnnouncement === 'function') spawnBigAnnouncement('⚠️ ARENA SHRINKS!', '#ff4444', 130);
      // Push balls now outside the new radius toward center
      for (const b of state.players) {
        if (!b.alive) continue;
        const dx = b.x - arena.cx, dy = b.y - arena.cy;
        const d  = Math.hypot(dx, dy);
        if (d > arena.r - b.radius) {
          b.vx -= (dx / (d || 1)) * 7;
          b.vy -= (dy / (d || 1)) * 7;
        }
      }
      break;
    }

    case 'volcanic_vent': {
      if (!state.ventWarnings) state.ventWarnings = [];
      const cx   = arena.cx, cy = arena.cy;
      const arm  = arena.arm   ?? 300;
      const thick = arena.thick ?? 200;
      for (let i = 0; i < (ev.count ?? 2); i++) {
        // Alternate between horizontal and vertical arm
        let vx, vy;
        if (Math.random() < 0.5) {
          vx = cx + (Math.random() - 0.5) * arm * 1.4;
          vy = cy + (Math.random() - 0.5) * thick * 0.7;
        } else {
          vx = cx + (Math.random() - 0.5) * thick * 0.7;
          vy = cy + (Math.random() - 0.5) * arm * 1.4;
        }
        state.ventWarnings.push({
          cx: vx, cy: vy,
          r:        ev.blastR    ?? 75,
          timer:    ev.warnFrames ?? 120,
          maxTimer: ev.warnFrames ?? 120,
          damage:   ev.damage    ?? 8,
          power:    ev.power     ?? 13,
        });
      }
      break;
    }
  }
}

// ── Per-frame: wind ─────────────────────────────────────────
function _tickWindGust(arena) {
  const g = arena._windGust;
  if (!g || g.frames <= 0) return;
  g.frames--;
  const t = g.frames / g.totalFrames;  // 1→0 fade-out
  for (const b of state.players) {
    if (!b.alive) continue;
    b.vx += g.vx * 0.11 * t;
    b.vy += g.vy * 0.11 * t;
  }
}

// ── Per-frame: volcanic vents ───────────────────────────────
function _tickVentWarnings() {
  if (!state.ventWarnings?.length) return;
  state.ventWarnings = state.ventWarnings.filter(v => {
    v.timer--;
    if (v.timer > 0) return true;
    // ERUPT
    for (const b of state.players) {
      if (!b.alive) continue;
      const d = Math.hypot(b.x - v.cx, b.y - v.cy);
      if (d < v.r + b.radius) {
        const dx = b.x - v.cx, dy = b.y - v.cy;
        const dn = Math.hypot(dx, dy) || 1;
        b.vx += (dx / dn) * v.power;
        b.vy += (dy / dn) * v.power;
        b.takeDamage(v.damage, null);
      }
    }
    if (typeof spawnSparks === 'function') {
      spawnSparks(v.cx, v.cy, 22, '#ff5500');
      spawnSparks(v.cx, v.cy, 12, '#ffaa00');
    }
    return false;
  });
}

// ── Draw visuals (call after drawArena, before balls) ───────
function drawArenaEvents(ctx) {
  const arena = state.arena;

  // ── Dynamic holes (diamond_rift) ──
  if (arena?.dynamicHoles?.length) {
    ctx.save();
    for (const h of arena.dynamicHoles) {
      ctx.fillStyle = '#000008';
      ctx.beginPath(); ctx.arc(h.cx, h.cy, h.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff3300'; ctx.lineWidth = 3;
      ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(h.cx, h.cy, h.r, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  // ── Wind gust arrows (tempest_octagon) ──
  const g = arena?._windGust;
  if (g?.frames > 0) {
    const t   = g.frames / g.totalFrames;
    const cx  = arena.cx ?? (arena.x + arena.w / 2);
    const cy  = arena.cy ?? (arena.y + arena.h / 2);
    const mag = Math.hypot(g.vx, g.vy) || 1;
    const px  = -g.vy / mag, py = g.vx / mag;   // perpendicular unit
    ctx.save();
    ctx.globalAlpha = t * 0.28;
    ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      const ox = px * i * 65, oy = py * i * 65;
      _drawWindArrow(ctx,
        cx + ox - g.vx * 28, cy + oy - g.vy * 28,
        cx + ox + g.vx * 28, cy + oy + g.vy * 28);
    }
    ctx.restore();
  }

  // ── Shrink ring fade (shrinking_ring) ──
  const sr = state.arenaFx?.shrinkRing;
  if (sr) {
    sr.frames--;
    if (sr.frames <= 0) {
      state.arenaFx.shrinkRing = null;
    } else {
      ctx.save();
      ctx.globalAlpha = sr.frames / 90;
      ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]);
      ctx.beginPath(); ctx.arc(sr.cx, sr.cy, sr.r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // ── Vent warnings (volcanic_cross) ──
  if (state.ventWarnings?.length) {
    const f = state.frame ?? 0;
    ctx.save();
    for (const v of state.ventWarnings) {
      const prog  = 1 - v.timer / v.maxTimer;
      const pulse = 0.5 + 0.5 * Math.sin(f * 0.25);
      ctx.globalAlpha = (0.12 + prog * 0.28) * (0.7 + pulse * 0.3);
      ctx.fillStyle = '#ff4400';
      ctx.beginPath(); ctx.arc(v.cx, v.cy, v.r * (0.35 + prog * 0.65), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.7 + prog * 0.25;
      ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 2 + prog * 2;
      ctx.setLineDash([8, 5]);
      ctx.beginPath(); ctx.arc(v.cx, v.cy, v.r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.9;
      ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 8;
      ctx.font = `bold ${15 + prog * 5}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText('🌋', v.cx, v.cy);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}

function _drawWindArrow(ctx, x1, y1, x2, y2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1), L = 10;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - L * Math.cos(a - 0.4), y2 - L * Math.sin(a - 0.4));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - L * Math.cos(a + 0.4), y2 - L * Math.sin(a + 0.4));
  ctx.stroke();
}
