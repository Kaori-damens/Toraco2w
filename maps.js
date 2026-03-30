// ============================================================
// PVE MAPS — Terrain definitions, collision, draw
// ============================================================

// ── Map Definitions ──────────────────────────────────────────
//
// Terrain object types:
//   SOLID_CIRCLE : balls + boss bounce off (circle shape, fields: x, y, r)
//   SOLID_RECT   : balls + boss bounce off (rect shape, fields: x, y, w, h)
//                  optional: breakable, hp, maxHp
//   HAZARD_ZONE  : deal damage/frame to balls standing inside
//                  fields: shape ('circle'|'rect'), x, y, r OR w/h,
//                          damagePerFrame, color, pulseColor
//   SLOW_ZONE    : reduce ball maxSpd while inside
//                  fields: shape ('circle'|'rect'), x, y, r OR w/h,
//                          speedMult, color, strokeColor
// ─────────────────────────────────────────────────────────────

const PVE_MAPS = {

  // ── 1. Thunderstorm Peak ────────────────────────────────────
  thunderstorm_peak: {
    id:          'thunderstorm_peak',
    label:       'Thunderstorm Peak',
    emoji:       '⚡',
    bgColor:     '#06061a',
    borderColor: '#3a4a6a',
    defaultBoss: 'thunderfang',
    tags:        ['⚡ Electric', '🪨 Pillars', '🌩️ Storm'],
    terrain: [
      // Lightning rod pillars — 4 corners
      { type: 'SOLID_CIRCLE', id: 'rod1', x: 205, y: 205, r: 18,
        color: '#445566', strokeColor: '#7799bb', label: null, _rod: true },
      { type: 'SOLID_CIRCLE', id: 'rod2', x: 595, y: 205, r: 18,
        color: '#445566', strokeColor: '#7799bb', label: null, _rod: true },
      { type: 'SOLID_CIRCLE', id: 'rod3', x: 205, y: 595, r: 18,
        color: '#445566', strokeColor: '#7799bb', label: null, _rod: true },
      { type: 'SOLID_CIRCLE', id: 'rod4', x: 595, y: 595, r: 18,
        color: '#445566', strokeColor: '#7799bb', label: null, _rod: true },
      // Elevated stone platforms
      { type: 'SOLID_RECT', id: 'plat1', x: 340, y: 182, w: 120, h: 26,
        color: '#1e2a3a', strokeColor: '#3a5070' },
      { type: 'SOLID_RECT', id: 'plat2', x: 340, y: 592, w: 120, h: 26,
        color: '#1e2a3a', strokeColor: '#3a5070' },
    ],
  },

  // ── 2. Ancient Ruins ───────────────────────────────────────
  ancient_ruins: {
    id:          'ancient_ruins',
    label:       'Ancient Ruins',
    emoji:       '🏛️',
    bgColor:     '#100d06',
    borderColor: '#5a4a2a',
    defaultBoss: 'krag',
    tags:        ['🪨 Pillars', '🏚️ Walls', '⚗️ Mystical'],
    terrain: [
      // Stone pillars — symmetrical quad
      { type: 'SOLID_CIRCLE', id: 'pillar1', x: 230, y: 230, r: 28,
        color: '#3a2a18', strokeColor: '#6a5030' },
      { type: 'SOLID_CIRCLE', id: 'pillar2', x: 570, y: 230, r: 28,
        color: '#3a2a18', strokeColor: '#6a5030' },
      { type: 'SOLID_CIRCLE', id: 'pillar3', x: 230, y: 570, r: 28,
        color: '#3a2a18', strokeColor: '#6a5030' },
      { type: 'SOLID_CIRCLE', id: 'pillar4', x: 570, y: 570, r: 28,
        color: '#3a2a18', strokeColor: '#6a5030' },
      // Crumbling walls — top & bottom (breakable: boss charge destroys them)
      { type: 'SOLID_RECT', id: 'wall_top', x: 310, y: 138, w: 180, h: 22,
        color: '#2e2010', strokeColor: '#5a4020',
        breakable: true, hp: 220, maxHp: 220 },
      { type: 'SOLID_RECT', id: 'wall_bot', x: 310, y: 640, w: 180, h: 22,
        color: '#2e2010', strokeColor: '#5a4020',
        breakable: true, hp: 220, maxHp: 220 },
    ],
  },

  // ── 3. Volcanic Crater ────────────────────────────────────
  volcanic_crater: {
    id:          'volcanic_crater',
    label:       'Volcanic Crater',
    emoji:       '🌋',
    bgColor:     '#120606',
    borderColor: '#6a2a0a',
    defaultBoss: 'ignar',
    tags:        ['🔥 Lava', '🪨 Rocks', '🌋 Hazard'],
    terrain: [
      // Central lava pit — always active hazard
      { type: 'HAZARD_ZONE', id: 'lava_center', shape: 'circle',
        x: 400, y: 400, r: 55,
        damagePerFrame: 0.28,
        color:      'rgba(255,80,0,0.18)',
        pulseColor: 'rgba(255,160,0,0.38)',
        label: 'Lava' },
      // Rock formations — 4 corners
      { type: 'SOLID_CIRCLE', id: 'rock1', x: 195, y: 280, r: 30,
        color: '#2e1004', strokeColor: '#5a2808' },
      { type: 'SOLID_CIRCLE', id: 'rock2', x: 605, y: 280, r: 30,
        color: '#2e1004', strokeColor: '#5a2808' },
      { type: 'SOLID_CIRCLE', id: 'rock3', x: 195, y: 520, r: 30,
        color: '#2e1004', strokeColor: '#5a2808' },
      { type: 'SOLID_CIRCLE', id: 'rock4', x: 605, y: 520, r: 30,
        color: '#2e1004', strokeColor: '#5a2808' },
    ],
  },

  // ── 4. Goblin Warrens ────────────────────────────────────
  goblin_warrens: {
    id:          'goblin_warrens',
    label:       'Goblin Warrens',
    emoji:       '🕳️',
    bgColor:     '#080b06',
    borderColor: '#2a3a1a',
    defaultBoss: 'grakk',
    tags:        ['🧱 Corridors', '🕳️ Mud', '📦 Crates'],
    terrain: [
      // Corridor walls — create chokepoints (top & bottom pairs)
      { type: 'SOLID_RECT', id: 'cwall_tl', x: 236, y: 88,  w: 22, h: 170,
        color: '#1e2a12', strokeColor: '#3a4a22' },
      { type: 'SOLID_RECT', id: 'cwall_bl', x: 236, y: 542, w: 22, h: 170,
        color: '#1e2a12', strokeColor: '#3a4a22' },
      { type: 'SOLID_RECT', id: 'cwall_tr', x: 542, y: 88,  w: 22, h: 170,
        color: '#1e2a12', strokeColor: '#3a4a22' },
      { type: 'SOLID_RECT', id: 'cwall_br', x: 542, y: 542, w: 22, h: 170,
        color: '#1e2a12', strokeColor: '#3a4a22' },
      // Crates (solid obstacles near side edges)
      { type: 'SOLID_RECT', id: 'crate1', x: 126, y: 384, w: 36, h: 36,
        color: '#3a2a12', strokeColor: '#6a5224', _crate: true },
      { type: 'SOLID_RECT', id: 'crate2', x: 638, y: 384, w: 36, h: 36,
        color: '#3a2a12', strokeColor: '#6a5224', _crate: true },
      // Mud pit — center (SLOW_ZONE)
      { type: 'SLOW_ZONE', id: 'mud', shape: 'rect',
        x: 322, y: 346, w: 156, h: 108,
        speedMult:   0.42,
        color:      'rgba(55,44,18,0.55)',
        strokeColor:'rgba(110,90,36,0.7)',
        label: 'Mud' },
    ],
  },

  // ── 5. Void Sanctum ───────────────────────────────────────
  void_sanctum: {
    id:          'void_sanctum',
    label:       'Void Sanctum',
    emoji:       '🌀',
    bgColor:     '#040010',
    borderColor: '#330066',
    defaultBoss: 'syvara',
    tags:        ['🌀 Void', '💀 Hazard', '🔮 Mystic'],
    terrain: [
      // Central void maelstrom — permanent damage zone
      { type: 'HAZARD_ZONE', id: 'void_core', shape: 'circle',
        x: 400, y: 400, r: 62,
        damagePerFrame: 0.35,
        color:      'rgba(100,0,180,0.20)',
        pulseColor: 'rgba(200,60,255,0.55)',
        label: '☠️ Void' },
      // 4 corner rift hazards — smaller, chip damage
      { type: 'HAZARD_ZONE', id: 'rift_tl', shape: 'circle',
        x: 190, y: 190, r: 36,
        damagePerFrame: 0.18,
        color:      'rgba(80,0,140,0.15)',
        pulseColor: 'rgba(160,40,255,0.40)',
        label: 'Rift' },
      { type: 'HAZARD_ZONE', id: 'rift_tr', shape: 'circle',
        x: 610, y: 190, r: 36,
        damagePerFrame: 0.18,
        color:      'rgba(80,0,140,0.15)',
        pulseColor: 'rgba(160,40,255,0.40)',
        label: 'Rift' },
      { type: 'HAZARD_ZONE', id: 'rift_bl', shape: 'circle',
        x: 190, y: 610, r: 36,
        damagePerFrame: 0.18,
        color:      'rgba(80,0,140,0.15)',
        pulseColor: 'rgba(160,40,255,0.40)',
        label: 'Rift' },
      { type: 'HAZARD_ZONE', id: 'rift_br', shape: 'circle',
        x: 610, y: 610, r: 36,
        damagePerFrame: 0.18,
        color:      'rgba(80,0,140,0.15)',
        pulseColor: 'rgba(160,40,255,0.40)',
        label: 'Rift' },
      // Obsidian pillars — mid-ring, block movement
      { type: 'SOLID_CIRCLE', id: 'obs1', x: 280, y: 310, r: 22,
        color: '#1a0030', strokeColor: '#440066' },
      { type: 'SOLID_CIRCLE', id: 'obs2', x: 520, y: 310, r: 22,
        color: '#1a0030', strokeColor: '#440066' },
      { type: 'SOLID_CIRCLE', id: 'obs3', x: 280, y: 490, r: 22,
        color: '#1a0030', strokeColor: '#440066' },
      { type: 'SOLID_CIRCLE', id: 'obs4', x: 520, y: 490, r: 22,
        color: '#1a0030', strokeColor: '#440066' },
    ],
  },
};

// ── Boss display names (used in PVE result screen) ───────────
const BOSS_DISPLAY_NAMES = {
  thunderfang: '⚡ Thunderfang',
  krag:        '🪨 Krag the Unyielding',
  syvara:      '🌀 Syvara the Unraveled',
  molthrex:    '🐍 Molthrex the Festering',
  vael:        '🌪️ Vael the Untouchable',
  ignar:       '🔥 Ignar the Eternal Flame',
  maddox:      '🃏 Maddox the Mad',
  grakk:       '👹 Warboss Grakk',
};

// Boss preview info (for UI card)
const BOSS_PREVIEW_INFO = {
  thunderfang: {
    name: '⚡ Thunderfang', difficulty: '⭐⭐', available: true,
    tags: ['💀 Head', '✊ Claws ×2', '⚡ Tail', '9 Moves'],
    desc: 'A Zinogre-inspired thunder beast. Break its parts to weaken its attacks.',
  },
  krag: {
    name: '🪨 Krag the Unyielding', difficulty: '⭐⭐⭐', available: true,
    tags: ['🔵 Rune Shields', '🪨 Colossal', '⚡ Berserk'],
    desc: 'Massive golem protected by orbiting Rune Stones. Destroy them all to expose its Core.',
  },
  syvara: {
    name: '🌀 Syvara the Unraveled', difficulty: '⭐⭐⭐⭐', available: true,
    tags: ['🌀 Teleport', '🕳️ Void Holes', '⚓ Anchors'],
    desc: 'A teleporting sorceress tied to Void Anchors. Destroy anchors to cut off her escape routes.',
  },
  molthrex: {
    name: '🐍 Molthrex the Festering', difficulty: '⭐⭐⭐⭐⭐', available: true,
    tags: ['🐍 Multi-Head', '☠️ Acid', '🔀 Splits'],
    desc: 'Break one head and two more grow. Survive the acid storm as the serpent multiplies.',
  },
  vael: {
    name: '🌪️ Vael the Untouchable', difficulty: '⭐⭐⭐', available: true,
    tags: ['👁️ 40% Evasion', '💨 Fast', '🪶 Wings'],
    desc: 'Blindingly fast harpy with innate evasion. Break her wings to slow her down.',
  },
  ignar: {
    name: '🔥 Ignar the Eternal Flame', difficulty: '⭐⭐⭐⭐', available: true,
    tags: ['🌋 Lava Pools', '🔥 Hazard Trail', '💥 Eruption'],
    desc: 'Leaves burning lava wherever it walks. The arena shrinks with every movement.',
  },
  maddox: {
    name: '🃏 Maddox the Mad', difficulty: '⭐⭐⭐⭐', available: true,
    tags: ['🃏 Random Moves', '❓ Trick HP', '😂 Chaos'],
    desc: 'Changes its entire move set every 20 seconds. Even its HP bar lies to your face.',
  },
  grakk: {
    name: '👹 Warboss Grakk', difficulty: '⭐⭐⭐', available: true,
    tags: ['👹 Goblin Swarm', '🧙 Shaman', '☠️ Horde'],
    desc: 'Kill the Shaman to stop reinforcements and heals. Ignore it at your absolute peril.',
  },
};

// ── Terrain Helpers ──────────────────────────────────────────

function _ballInTerrain(ball, obj) {
  if (obj.shape === 'circle' || obj.type === 'SOLID_CIRCLE') {
    return Math.hypot(ball.x - obj.x, ball.y - obj.y) < obj.r + ball.radius;
  }
  // rect
  const cx = obj.x + (obj.w ?? 0) / 2;
  const cy = obj.y + (obj.h ?? 0) / 2;
  return Math.abs(ball.x - cx) < (obj.w / 2 + ball.radius) &&
         Math.abs(ball.y - cy) < (obj.h / 2 + ball.radius);
}

// ── Terrain Collision ────────────────────────────────────────

function resolveTerrainCollision(players, terrainObjects) {
  for (const ball of players) {
    if (!ball.alive) continue;
    for (const obj of terrainObjects) {
      if (obj.destroyed) continue;

      switch (obj.type) {
        case 'SOLID_CIRCLE': {
          const dx = ball.x - obj.x, dy = ball.y - obj.y;
          const dist = Math.hypot(dx, dy) || 0.01;
          const pen  = ball.radius + obj.r - dist;
          if (pen > 0) {
            const nx = dx / dist, ny = dy / dist;
            ball.x += nx * pen;
            ball.y += ny * pen;
            const dot = ball.vx * nx + ball.vy * ny;
            if (dot < 0) {
              ball.vx -= 1.8 * dot * nx;
              ball.vy -= 1.8 * dot * ny;
            }
          }
          break;
        }
        case 'SOLID_RECT': {
          const cx  = obj.x + obj.w / 2, cy = obj.y + obj.h / 2;
          const dx  = ball.x - cx,        dy = ball.y - cy;
          const oxl = ball.radius + obj.w / 2 - Math.abs(dx);
          const oyl = ball.radius + obj.h / 2 - Math.abs(dy);
          if (oxl > 0 && oyl > 0) {
            if (oxl < oyl) {
              const nx = Math.sign(dx);
              ball.x += nx * oxl;
              if (ball.vx * nx < 0) ball.vx = -ball.vx * 0.80;
            } else {
              const ny = Math.sign(dy);
              ball.y += ny * oyl;
              if (ball.vy * ny < 0) ball.vy = -ball.vy * 0.80;
            }
          }
          break;
        }
        case 'HAZARD_ZONE': {
          if (_ballInTerrain(ball, obj)) {
            ball.hp = Math.max(0, ball.hp - obj.damagePerFrame);
            if (ball.hp <= 0) { ball.hp = 0; ball.alive = false; }
          }
          break;
        }
        case 'SLOW_ZONE': {
          if (_ballInTerrain(ball, obj)) {
            ball._inSlowZone = obj.speedMult;
          }
          break;
        }
      }
    }
  }
}

// Boss bounces off solid terrain (walls/pillars)
function resolveBossTerrainCollision(boss, terrainObjects) {
  if (!boss || !boss.alive) return;
  for (const obj of terrainObjects) {
    if (obj.destroyed) continue;
    if (obj.type !== 'SOLID_CIRCLE' && obj.type !== 'SOLID_RECT') continue;

    if (obj.type === 'SOLID_CIRCLE') {
      const dx = boss.x - obj.x, dy = boss.y - obj.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const pen  = 80 + obj.r - dist; // 80 = boss body radius approx
      if (pen > 0) {
        const nx = dx / dist, ny = dy / dist;
        // Breakable wall: boss charge destroys it
        if (obj.breakable) {
          obj.hp = (obj.hp ?? obj.maxHp ?? 100) - 15;
          if (obj.hp <= 0) { obj.destroyed = true; spawnSparks(obj.x, obj.y, 18); }
          continue;
        }
        boss.x += nx * pen * 0.7;
        boss.y += ny * pen * 0.7;
        const dot = boss.vx * nx + boss.vy * ny;
        if (dot < 0) { boss.vx -= 1.2 * dot * nx; boss.vy -= 1.2 * dot * ny; }
      }
    } else {
      const cx  = obj.x + obj.w / 2, cy = obj.y + obj.h / 2;
      const dx  = boss.x - cx,        dy = boss.y - cy;
      const oxl = 80 + obj.w / 2 - Math.abs(dx);
      const oyl = 80 + obj.h / 2 - Math.abs(dy);
      if (oxl > 0 && oyl > 0) {
        if (obj.breakable) {
          obj.hp = (obj.hp ?? obj.maxHp ?? 100) - 15;
          if (obj.hp <= 0) {
            obj.destroyed = true;
            spawnSparks(obj.x + obj.w / 2, obj.y + obj.h / 2, 18);
            spawnBigAnnouncement('💥 WALL DESTROYED!', '#cc9944');
          }
          continue;
        }
        if (oxl < oyl) {
          boss.x += Math.sign(dx) * oxl * 0.7;
          const dot = boss.vx * Math.sign(dx);
          if (dot < 0) boss.vx = -boss.vx * 0.60;
        } else {
          boss.y += Math.sign(dy) * oyl * 0.7;
          const dot = boss.vy * Math.sign(dy);
          if (dot < 0) boss.vy = -boss.vy * 0.60;
        }
      }
    }
  }
}

// ── Draw Terrain ─────────────────────────────────────────────

// Drawn BELOW balls (solid objects)
function drawTerrainBelow(ctx, objects) {
  for (const obj of objects) {
    if (obj.destroyed) continue;
    if (obj.type !== 'SOLID_CIRCLE' && obj.type !== 'SOLID_RECT') continue;

    ctx.save();

    if (obj.type === 'SOLID_CIRCLE') {
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
      ctx.fillStyle   = obj.color   ?? '#333';
      ctx.strokeStyle = obj.strokeColor ?? '#555';
      ctx.lineWidth   = 2;
      ctx.fill();
      ctx.stroke();

      // Special: lightning rod — glowing tip
      if (obj._rod) {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#aaddff';
        ctx.shadowColor = '#66aaff'; ctx.shadowBlur = 12;
        ctx.fill();
      }

      // Special: crate emoji
      if (obj._crate) {
        ctx.font = '16px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('📦', obj.x, obj.y);
      }

    } else { // SOLID_RECT
      ctx.fillStyle   = obj.color   ?? '#333';
      ctx.strokeStyle = obj.strokeColor ?? '#555';
      ctx.lineWidth   = 2;
      ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
      ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

      // HP bar if breakable and damaged
      if (obj.breakable && obj.hp != null && obj.hp < obj.maxHp) {
        const pct = obj.hp / obj.maxHp;
        const bx = obj.x, by = obj.y - 8, bw = obj.w, bh = 5;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = pct > 0.5 ? '#44cc44' : pct > 0.25 ? '#cccc22' : '#cc3333';
        ctx.fillRect(bx, by, bw * pct, bh);
        ctx.strokeStyle = '#111'; ctx.lineWidth = 0.5;
        ctx.strokeRect(bx, by, bw, bh);
      }
    }

    ctx.restore();
  }
}

// Drawn ABOVE everything (hazard + slow zone overlays with pulse)
function drawTerrainAbove(ctx, objects, frame) {
  for (const obj of objects) {
    if (obj.destroyed) continue;

    // Void Anchor — drawn above terrain, glowing portal marker
    if (obj.type === 'VOID_ANCHOR') {
      const pulse = 0.5 + 0.5 * Math.sin(frame * 0.07);
      ctx.save();
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(120,0,200,${0.15 + pulse * 0.15})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, obj.r * (0.8 + pulse * 0.3), 0, Math.PI * 2);
      ctx.strokeStyle = obj.pulseColor ?? 'rgba(200,80,255,0.55)';
      ctx.lineWidth   = 2;
      ctx.globalAlpha = 0.5 + pulse * 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Inner star
      ctx.font = '12px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.6 + pulse * 0.35;
      ctx.fillStyle = '#cc88ff';
      ctx.fillText('✦', obj.x, obj.y);
      ctx.globalAlpha = 1;
      // HP bar if damaged
      if (obj.hp != null && obj.hp < 100) {
        const pct = Math.max(0, obj.hp / 100);
        const bx = obj.x - obj.r, by = obj.y + obj.r + 3, bw = obj.r * 2, bh = 4;
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = pct > 0.5 ? '#aa44ff' : pct > 0.25 ? '#ff44aa' : '#ff2244';
        ctx.fillRect(bx, by, bw * pct, bh);
      }
      ctx.restore();
      continue;
    }

    if (obj.type !== 'HAZARD_ZONE' && obj.type !== 'SLOW_ZONE') continue;

    ctx.save();

    if (obj.type === 'HAZARD_ZONE') {
      const pulse = 0.5 + 0.5 * Math.sin(frame * 0.06);
      const alpha = 0.12 + pulse * 0.18;

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      if (obj.shape === 'circle') {
        ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
      } else {
        ctx.rect(obj.x, obj.y, obj.w, obj.h);
      }
      ctx.fillStyle = obj.color ?? 'rgba(255,80,0,0.3)';
      ctx.fill();
      ctx.globalAlpha = 1;

      // Animated expanding ring
      const baseR = obj.shape === 'circle' ? obj.r : Math.max(obj.w, obj.h) / 2;
      const ringR = baseR * (0.75 + pulse * 0.4);
      ctx.beginPath();
      if (obj.shape === 'circle') {
        ctx.arc(obj.x, obj.y, ringR, 0, Math.PI * 2);
      } else {
        const cx = obj.x + obj.w / 2, cy = obj.y + obj.h / 2;
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      }
      ctx.globalAlpha = 0.35 + pulse * 0.25;
      ctx.strokeStyle = obj.pulseColor ?? 'rgba(255,140,0,0.7)';
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Label
      if (obj.label) {
        const cx = obj.shape === 'circle' ? obj.x : obj.x + obj.w / 2;
        const cy = obj.shape === 'circle' ? obj.y : obj.y + obj.h / 2;
        ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
        ctx.fillStyle = '#ffaa44';
        ctx.fillText(obj.label, cx, cy + (obj.shape === 'circle' ? obj.r : obj.h / 2) + 12);
      }

    } else { // SLOW_ZONE
      ctx.globalAlpha = 0.30;
      ctx.fillStyle   = obj.color ?? 'rgba(80,60,20,0.5)';
      ctx.beginPath();
      if (obj.shape === 'circle') {
        ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
      } else {
        ctx.rect(obj.x, obj.y, obj.w, obj.h);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = obj.strokeColor ?? 'rgba(140,110,50,0.6)';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      if (obj.shape === 'circle') {
        ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
      } else {
        ctx.rect(obj.x, obj.y, obj.w, obj.h);
      }
      ctx.stroke();

      // Label
      if (obj.label) {
        const cx = obj.shape === 'circle' ? obj.x : obj.x + obj.w / 2;
        const cy = obj.shape === 'circle' ? obj.y : obj.y + obj.h / 2;
        ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
        ctx.fillStyle = '#aaaa66';
        ctx.fillText(obj.label, cx, cy);
      }
    }

    ctx.restore();
  }
}

// ── Lightning rod ambient spark effect ───────────────────────
let _rodSparkTimer = 0;
function updateRodSparks(terrainObjects, frame) {
  if (!terrainObjects) return;
  _rodSparkTimer--;
  if (_rodSparkTimer > 0) return;
  _rodSparkTimer = 80 + Math.floor(Math.random() * 60);
  const rods = terrainObjects.filter(t => t._rod && !t.destroyed);
  if (rods.length < 2) return;
  // Pick two random rods and spawn sparks at each
  const a = rods[Math.floor(Math.random() * rods.length)];
  const b = rods[Math.floor(Math.random() * rods.length)];
  if (a !== b) {
    spawnSparks(a.x, a.y, 6);
    spawnSparks(b.x, b.y, 6);
  }
}
