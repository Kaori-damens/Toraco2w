// ============================================================
// ARENA HELPERS
// ============================================================
function checkArenaWall(x, y, r, arena) {
  if (arena.type === 'circle') {
    const dx = x - arena.cx, dy = y - arena.cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist + r > arena.r) {
      const nx = dx/dist, ny = dy/dist;
      return { nx, ny };
    }
  } else if (arena.type === 'square' || arena.type === 'rect') {
    if (x - r < arena.x) return { nx: -1, ny: 0 };
    if (x + r > arena.x + arena.w) return { nx: 1, ny: 0 };
    if (y - r < arena.y) return { nx: 0, ny: -1 };
    if (y + r > arena.y + arena.h) return { nx: 0, ny: 1 };
  } else if (arena.type === 'cross') {
    // Cross: center rect + horizontal arm + vertical arm
    const cx = arena.cx, cy = arena.cy;
    const arm = arena.arm, thick = arena.thick;
    const inH = (x >= cx-arm && x <= cx+arm && y >= cy-thick/2 && y <= cy+thick/2);
    const inV = (x >= cx-thick/2 && x <= cx+thick/2 && y >= cy-arm && y <= cy+arm);
    if (!inH && !inV) {
      // Push toward nearest valid area
      const clampedX = Math.max(cx-arm, Math.min(cx+arm, x));
      const clampedY = Math.max(cy-thick/2, Math.min(cy+thick/2, y));
      const dx = x - clampedX, dy = y - clampedY;
      const dist = Math.sqrt(dx*dx+dy*dy);
      if (dist > 0) return { nx: -dx/dist, ny: -dy/dist };
    }
    // Wall checks for cross arms
    if (inH) {
      if (x - r < cx-arm) return { nx: -1, ny: 0 };
      if (x + r > cx+arm) return { nx: 1, ny: 0 };
      if (y - r < cy-thick/2) return { nx: 0, ny: -1 };
      if (y + r > cy+thick/2) return { nx: 0, ny: 1 };
    }
    if (inV) {
      if (x - r < cx-thick/2) return { nx: -1, ny: 0 };
      if (x + r > cx+thick/2) return { nx: 1, ny: 0 };
      if (y - r < cy-arm) return { nx: 0, ny: -1 };
      if (y + r > cy+arm) return { nx: 0, ny: 1 };
    }
  } else if (arena.type === 'hole') {
    // Outer square walls
    if (x - r < arena.x) return { nx: -1, ny: 0 };
    if (x + r > arena.x + arena.w) return { nx: 1, ny: 0 };
    if (y - r < arena.y) return { nx: 0, ny: -1 };
    if (y + r > arena.y + arena.h) return { nx: 0, ny: 1 };
    // Inner circular hole — ball bounces outward
    const hdx = x - arena.holeCx, hdy = y - arena.holeCy;
    const hdist = Math.sqrt(hdx*hdx + hdy*hdy);
    if (hdist < arena.holeR + r && hdist > 0) {
      return { nx: hdx/hdist, ny: hdy/hdist };
    }
  }
  return null;
}

// How much speed is kept after bouncing off a wall (1.0 = elastic, 0 = inelastic)
const WALL_BOUNCE = 1.0;

function clampToBall(ball, arena) {
  const r = ball.radius;
  if (arena.type === 'circle') {
    const dx = ball.x - arena.cx, dy = ball.y - arena.cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const maxDist = arena.r - r;
    if (dist > maxDist) {
      const nx = dx/dist, ny = dy/dist;
      // Snap ball to wall surface
      ball.x = arena.cx + nx * maxDist;
      ball.y = arena.cy + ny * maxDist;
      // Reflect velocity: remove outward component, add (1+restitution)×it back inward
      const dot = ball.vx*nx + ball.vy*ny;
      if (dot > 0) {
        ball.vx -= dot * nx * (1 + WALL_BOUNCE);
        ball.vy -= dot * ny * (1 + WALL_BOUNCE);
      }
    }
  } else if (arena.type === 'square' || arena.type === 'rect') {
    if (ball.x - r < arena.x)           { ball.x = arena.x + r;             ball.vx =  Math.abs(ball.vx) * WALL_BOUNCE; }
    if (ball.x + r > arena.x + arena.w) { ball.x = arena.x + arena.w - r;   ball.vx = -Math.abs(ball.vx) * WALL_BOUNCE; }
    if (ball.y - r < arena.y)           { ball.y = arena.y + r;             ball.vy =  Math.abs(ball.vy) * WALL_BOUNCE; }
    if (ball.y + r > arena.y + arena.h) { ball.y = arena.y + arena.h - r;   ball.vy = -Math.abs(ball.vy) * WALL_BOUNCE; }
  } else if (arena.type === 'cross') {
    const cx = arena.cx, cy = arena.cy, arm = arena.arm, thick = arena.thick;
    // Outer bounds
    if (ball.x < cx-arm+r) { ball.x = cx-arm+r; ball.vx =  Math.abs(ball.vx)*WALL_BOUNCE; }
    if (ball.x > cx+arm-r) { ball.x = cx+arm-r; ball.vx = -Math.abs(ball.vx)*WALL_BOUNCE; }
    if (ball.y < cy-arm+r) { ball.y = cy-arm+r; ball.vy =  Math.abs(ball.vy)*WALL_BOUNCE; }
    if (ball.y > cy+arm-r) { ball.y = cy+arm-r; ball.vy = -Math.abs(ball.vy)*WALL_BOUNCE; }
    // Keep inside cross shape
    const inH = (ball.y > cy-thick/2+r && ball.y < cy+thick/2-r);
    const inV = (ball.x > cx-thick/2+r && ball.x < cx+thick/2-r);
    if (!inH && !inV) {
      ball.vx += (cx - ball.x) * 0.07;
      ball.vy += (cy - ball.y) * 0.07;
    }
  } else if (arena.type === 'hole') {
    // Outer square walls
    if (ball.x - r < arena.x)           { ball.x = arena.x + r;           ball.vx =  Math.abs(ball.vx) * WALL_BOUNCE; }
    if (ball.x + r > arena.x + arena.w) { ball.x = arena.x + arena.w - r; ball.vx = -Math.abs(ball.vx) * WALL_BOUNCE; }
    if (ball.y - r < arena.y)           { ball.y = arena.y + r;           ball.vy =  Math.abs(ball.vy) * WALL_BOUNCE; }
    if (ball.y + r > arena.y + arena.h) { ball.y = arena.y + arena.h - r; ball.vy = -Math.abs(ball.vy) * WALL_BOUNCE; }
    // Inner circular hole — bounce outward
    const hdx = ball.x - arena.holeCx, hdy = ball.y - arena.holeCy;
    const hdist = Math.sqrt(hdx*hdx + hdy*hdy);
    const minHoleDist = arena.holeR + r;
    if (hdist < minHoleDist && hdist > 0) {
      const hnx = hdx/hdist, hny = hdy/hdist;
      ball.x = arena.holeCx + hnx * minHoleDist;
      ball.y = arena.holeCy + hny * minHoleDist;
      const dot = ball.vx*hnx + ball.vy*hny;
      if (dot < 0) {
        ball.vx -= dot * hnx * (1 + WALL_BOUNCE);
        ball.vy -= dot * hny * (1 + WALL_BOUNCE);
      }
    }
  }
}

// Returns a consistent eye color for a ball, hashed from its color string
function getEyeColor(ball) {
  const EYE_PALETTE = [
    '#44ffaa', '#ff4455', '#44aaff', '#ffdd22', '#cc44ff',
    '#ff8822', '#22ddff', '#ff44cc', '#88ff33', '#ff6666',
    '#33ffee', '#ffaa44', '#aaffdd', '#ff88ff', '#aaff44',
  ];
  const hex = ball.color || '#ffffff';
  let h = 0;
  for (let i = 0; i < hex.length; i++) h = (h * 31 + hex.charCodeAt(i)) & 0xffff;
  return EYE_PALETTE[h % EYE_PALETTE.length];
}

// ═══════════════════════════════════════════════════════════════
// RACE DECORATION RENDERER
// Draws cosmetic decorations around ball based on race.
// Hitbox (ball.radius circle) is NEVER changed here.
// Coordinate system after ctx.rotate(fa):
//   +X = forward (movement direction)   -X = back (tail)
//   ±Y = sides (horns, ears, wings)     -Y = above-head (hat, halo)
// ═══════════════════════════════════════════════════════════════
function drawRaceDecoration(ctx, ball) {
  if (!ball.charRace) return;
  const raceId = typeof ball.charRace === 'object' ? ball.charRace.id : ball.charRace;
  if (!raceId) return;

  const r  = ball.radius;
  const spd = Math.hypot(ball.vx, ball.vy);
  const fa  = spd > 0.3 ? Math.atan2(ball.vy, ball.vx) : (ball._deco_fa ?? 0);
  if (spd > 0.3) ball._deco_fa = fa;

  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  // Helper: draw two minimalist anime-style eyes facing +X
  // Elongated horizontal oval, gradient dark→light, no pupil/iris detail
  function eyes(_, __, glowCol) {
    const eyeC = getEyeColor(ball);

    // Parse hex → rgb for gradient construction
    const hex = eyeC.replace('#','');
    const er = parseInt(hex.slice(0,2),16), eg = parseInt(hex.slice(2,4),16), eb = parseInt(hex.slice(4,6),16);
    const lighten = (v,a) => Math.min(255, v+a);
    const darken  = (v,a) => Math.max(0,   v-a);

    const ew = r * 0.21;  // half-width  (landscape oval, wide)
    const eh = r * 0.085; // half-height (flat)
    const ex = r * 0.46;  // forward position on face

    for (const eyY of [-r*0.20, r*0.20]) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, eyY, ew, eh, 0, 0, Math.PI*2);

      // Vertical gradient: lighter top → darker bottom (light from above)
      const grad = ctx.createLinearGradient(ex, eyY - eh, ex, eyY + eh);
      grad.addColorStop(0,   `rgba(${lighten(er,70)},${lighten(eg,70)},${lighten(eb,70)},0.90)`);
      grad.addColorStop(0.45,`rgba(${er},${eg},${eb},0.88)`);
      grad.addColorStop(1,   `rgba(${darken(er,45)},${darken(eg,45)},${darken(eb,45)},0.78)`);

      ctx.fillStyle = grad;
      ctx.fill();

      // Thin blurred border — gives the "hazy anime" outline
      ctx.shadowColor = glowCol || eyeC;
      ctx.shadowBlur  = glowCol ? 8 : 4;
      ctx.strokeStyle = `rgba(${er},${eg},${eb},0.45)`;
      ctx.lineWidth   = 1.0;
      ctx.stroke();

      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  // ── Override check: key present in _raceAssetOverrides → use it (even if empty = no deco) ──
  if (window._raceAssetOverrides && Object.prototype.hasOwnProperty.call(window._raceAssetOverrides, raceId)) {
    const _overrideShapes = window._raceAssetOverrides[raceId];

    // Angel special: golden glowing halo (world-space, shadowBlur not supported in aeDrawShape)
    if (raceId === 'angel') {
      ctx.strokeStyle = '#ffdd33'; ctx.lineWidth = 3;
      ctx.shadowColor = '#ffee55'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.ellipse(0, -r*1.55, r*0.56, r*0.17, 0, 0, Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.rotate(fa); eyes(); ctx.restore(); return;
    }

    ctx.rotate(fa);
    for (const _s of (_overrideShapes || [])) {
      if (_s.visible === false) continue;
      aeDrawShape(ctx, _s, r);
    }
    if (raceId !== 'skeleton') eyes();  // skeleton has custom sockets — no anime eyes
    ctx.restore();
    return;
  }

  switch (raceId) {

    // ── GOBLIN ──────────────────────────────────────────────────────────
    case 'goblin': {
      ctx.rotate(fa);
      ctx.fillStyle = '#4a7a20'; ctx.strokeStyle = '#2a4a10'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        // Big pointy ear
        ctx.beginPath();
        ctx.moveTo(-r*0.15, s*r*0.78);
        ctx.lineTo(-r*0.50, s*r*1.65);
        ctx.lineTo( r*0.45, s*r*1.55);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Inner ear pink flush
        ctx.fillStyle = '#ff8888';
        ctx.beginPath();
        ctx.moveTo(-r*0.10, s*r*0.86);
        ctx.lineTo(-r*0.35, s*r*1.45);
        ctx.lineTo( r*0.24, s*r*1.38);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4a7a20'; ctx.strokeStyle = '#2a4a10'; ctx.lineWidth = 1.5;
      }
      eyes('#ffdd00', '#000');
      break;
    }

    // ── GNOME ────────────────────────────────────────────────────────────
    case 'gnome': {
      ctx.rotate(fa);
      // Hat brim
      ctx.fillStyle = '#773311'; ctx.strokeStyle = '#552200'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(r*0.05, -r*0.95, r*0.62, r*0.18, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      // Hat cone
      ctx.fillStyle = '#cc6633'; ctx.strokeStyle = '#883311'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r*0.55, -r*0.97);
      ctx.lineTo( r*0.05, -r*2.25);
      ctx.lineTo( r*0.65, -r*0.97);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Hat band
      ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(r*0.05, -r*1.06, r*0.55, r*0.15, 0, 0, Math.PI*2); ctx.stroke();
      eyes('#fff', '#3366ff');
      break;
    }

    // ── HUMAN ────────────────────────────────────────────────────────────
    case 'human': {
      ctx.rotate(fa);
      // Hair strands above (-Y)
      ctx.strokeStyle = '#8B5E3C'; ctx.lineWidth = 3;
      [-r*0.42, -r*0.2, r*0.06, r*0.28, r*0.48].forEach((hy, i) => {
        ctx.beginPath();
        ctx.moveTo(hy * 0.65, -r*0.88);
        ctx.quadraticCurveTo(hy + r*0.04*(i-2), -r*1.22, hy + r*0.06*(i-2), -r*1.46);
        ctx.stroke();
      });
      eyes('#fff', '#553311');
      break;
    }

    // ── DWARF ────────────────────────────────────────────────────────────
    case 'dwarf': {
      ctx.rotate(fa);
      // Thick beard at back (-X)
      ctx.fillStyle = '#cc8833'; ctx.strokeStyle = '#996622'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r*0.72, -r*0.52);
      ctx.bezierCurveTo(-r*1.75, -r*0.55, -r*2.05,  r*0.0, -r*1.75,  r*0.55);
      ctx.lineTo(-r*0.72,  r*0.52);
      ctx.bezierCurveTo(-r*1.1, r*0.28, -r*1.1, -r*0.28, -r*0.72, -r*0.52);
      ctx.fill(); ctx.stroke();
      // Braid lines
      ctx.strokeStyle = '#aa6611'; ctx.lineWidth = 1.3;
      [-r*1.1, -r*1.35, -r*1.6].forEach(bx => {
        ctx.beginPath(); ctx.moveTo(bx, -r*0.22); ctx.lineTo(bx - r*0.08, r*0.22); ctx.stroke();
      });
      // Metal helmet ridge
      ctx.fillStyle = '#aaaaaa'; ctx.strokeStyle = '#666'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(r*0.05, -r*0.93, r*0.58, r*0.18, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      eyes('#fff', '#224488');
      break;
    }

    // ── SKELETON ─────────────────────────────────────────────────────────
    case 'skeleton': {
      ctx.rotate(fa);
      // Eye sockets
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(r*0.43, -r*0.27, r*0.20, r*0.16, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r*0.43,  r*0.27, r*0.20, r*0.16, 0, 0, Math.PI*2); ctx.fill();
      // Nose triangle
      ctx.beginPath();
      ctx.moveTo(r*0.70,  0);
      ctx.lineTo(r*0.60, -r*0.10);
      ctx.lineTo(r*0.60,  r*0.10);
      ctx.closePath(); ctx.fill();
      // Teeth
      ctx.fillStyle = '#e8e8d8'; ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
      for (let t = -1; t <= 1; t++) {
        ctx.beginPath();
        ctx.rect(r*0.76, t*r*0.22 - r*0.10, r*0.17, r*0.19);
        ctx.fill(); ctx.stroke();
      }
      // Forehead crack
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(r*0.22, -r*0.66);
      ctx.lineTo(r*0.42, -r*0.46);
      ctx.lineTo(r*0.32, -r*0.30);
      ctx.stroke();
      break;
    }

    // ── TROLL ────────────────────────────────────────────────────────────
    case 'troll': {
      ctx.rotate(fa);
      // Messy spiky hair above (-Y)
      ctx.strokeStyle = '#556633'; ctx.lineWidth = 3;
      [-r*0.46, -r*0.22, 0, r*0.22, r*0.46].forEach((hy, i) => {
        const bend = (i - 2) * r * 0.12;
        ctx.beginPath();
        ctx.moveTo(hy * 0.7, -r*0.88);
        ctx.quadraticCurveTo(hy + bend, -r*1.32, hy + bend*0.5, -r*1.62 - Math.abs(i-2)*r*0.06);
        ctx.stroke();
      });
      // Small blunt horns on sides (±Y)
      ctx.fillStyle = '#776644'; ctx.strokeStyle = '#554422'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(r*0.10, s*r*0.80);
        ctx.quadraticCurveTo(r*0.35, s*r*1.32, r*0.05, s*r*1.58);
        ctx.quadraticCurveTo(-r*0.10, s*r*1.22, r*0.00, s*r*0.86);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // Bulbous nose front (+X)
      ctx.fillStyle = '#5a7a38'; ctx.strokeStyle = '#3a5520'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(r*0.86, 0, r*0.22, r*0.17, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      eyes('#ffcc00', '#000');
      break;
    }

    // ── ORC ──────────────────────────────────────────────────────────────
    case 'orc': {
      ctx.rotate(fa);
      // Upward tusks (±Y, front-ish)
      ctx.fillStyle = '#eeeebb'; ctx.strokeStyle = '#aaaa77'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(r*0.60,  s*r*0.18);
        ctx.quadraticCurveTo(r*1.05, s*r*0.44, r*0.90, s*r*0.74);
        ctx.quadraticCurveTo(r*0.77, s*r*0.50, r*0.71, s*r*0.22);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // Heavy brow ridges
      ctx.strokeStyle = '#1a1200'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(r*0.25, -r*0.44); ctx.lineTo(r*0.62, -r*0.36); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r*0.25,  r*0.44); ctx.lineTo(r*0.62,  r*0.36); ctx.stroke();
      eyes('#ff2200', '#000');
      break;
    }

    // ── GIANT ────────────────────────────────────────────────────────────
    case 'giant': {
      // Stone crack texture — world-space (no rotation with movement)
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
      [ [[ 0.10,-0.56],[ 0.28,-0.18],[ 0.12, 0.14]],
        [[-0.30, 0.35],[-0.05, 0.65]],
        [[ 0.40, 0.16],[ 0.65, 0.38],[ 0.82, 0.18]],
        [[-0.55,-0.30],[-0.77,-0.06]] ].forEach(c => {
        ctx.beginPath(); ctx.moveTo(c[0][0]*r, c[0][1]*r);
        for (let i=1;i<c.length;i++) ctx.lineTo(c[i][0]*r, c[i][1]*r);
        ctx.stroke();
      });
      // Stone pebble highlights
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      [[0.22,-0.38,0.10],[-0.44,0.20,0.08],[0.55,0.30,0.07]].forEach(([x,y,s]) => {
        ctx.beginPath(); ctx.arc(x*r, y*r, s*r, 0, Math.PI*2); ctx.fill();
      });
      // Eyes face movement direction
      ctx.save(); ctx.rotate(fa); eyes('#ff9922', '#000'); ctx.restore();
      break;
    }

    // ── DRAGON ───────────────────────────────────────────────────────────
    case 'dragon': {
      ctx.rotate(fa);
      const srLabel = typeof ball.charSubrace === 'object' ? ball.charSubrace?.label : ball.charSubrace;
      const dc = ({ Crimson:'#dd2200',Stone:'#888',Amethyst:'#9922bb',Ancient:'#887722',
                    Undead:'#558855',Zephyrian:'#33aacc',Tideborn:'#1155bb',Thunder:'#cccc00',
                    Flame:'#ff5500',Ice:'#99ddff',Chaos:'#ee22ee' })[srLabel] ?? '#cc3300';
      // Curved horns on sides (±Y)
      ctx.fillStyle = dc; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo( r*0.15, s*r*0.78);
        ctx.bezierCurveTo(r*0.50, s*r*1.30, r*0.30, s*r*1.82, r*0.00, s*r*1.88);
        ctx.bezierCurveTo(-r*0.20, s*r*1.70, -r*0.05, s*r*1.22, r*0.10, s*r*0.82);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // Wagging tail at back (-X)
      const wag = Math.sin(Date.now()*0.004) * r*0.32;
      ctx.strokeStyle = dc; ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-r*0.85, 0);
      ctx.quadraticCurveTo(-r*1.55, wag, -r*1.92, wag*0.55);
      ctx.stroke();
      // Arrow tail tip
      ctx.fillStyle = dc;
      ctx.save();
      ctx.translate(-r*1.92, wag*0.55);
      ctx.rotate(Math.atan2(wag*0.55, -r*0.37));
      ctx.beginPath(); ctx.moveTo(r*0.18,0); ctx.lineTo(-r*0.10,-r*0.13); ctx.lineTo(-r*0.10,r*0.13); ctx.closePath(); ctx.fill();
      ctx.restore();
      // Scale arc marks
      ctx.strokeStyle = dc+'aa'; ctx.lineWidth = 1.3;
      [[-0.25,-0.46],[0.06,-0.63],[-0.25,0.46],[0.06,0.63],[0.33,0.0]].forEach(([x,y]) => {
        ctx.beginPath(); ctx.arc(x*r, y*r, r*0.18, Math.PI*0.12, Math.PI*0.88); ctx.stroke();
      });
      eyes('#ffaa00', '#000');
      break;
    }

    // ── ANGEL ────────────────────────────────────────────────────────────
    case 'angel': {
      ctx.rotate(fa);
      // Wings on sides (±Y)
      for (const s of [-1, 1]) {
        ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle = 'rgba(200,200,170,0.9)'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo( r*0.35, s*r*0.78);
        ctx.bezierCurveTo(r*0.05, s*r*1.58, -r*0.55, s*r*1.68, -r*0.66, s*r*1.12);
        ctx.bezierCurveTo(-r*0.30, s*r*0.90,  r*0.10, s*r*0.84,  r*0.30, s*r*0.80);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Feather detail
        ctx.strokeStyle = 'rgba(180,180,160,0.55)'; ctx.lineWidth = 1;
        [[0.30,0.86,-0.06,1.12],[0.00,1.06,-0.26,1.32],[-0.36,1.12,-0.56,1.30]].forEach(([x1,y1,x2,y2]) => {
          ctx.beginPath(); ctx.moveTo(x1*r, s*y1*r); ctx.lineTo(x2*r, s*y2*r); ctx.stroke();
        });
      }
      // Halo — always screen-up, world-space
      ctx.restore(); ctx.save(); ctx.translate(ball.x, ball.y);
      ctx.strokeStyle = '#ffdd33'; ctx.lineWidth = 3;
      ctx.shadowColor = '#ffee55'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.ellipse(0, -r*1.55, r*0.56, r*0.17, 0, 0, Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.rotate(fa); eyes('#ccddff', '#336699');
      break;
    }

    // ── PRIMORDIAL BEING ─────────────────────────────────────────────────
    case 'primordial': {
      // Orbiting cosmic dots — world-space
      const t = Date.now() * 0.0012;
      ['#6699ff','#ff55aa','#55ffdd'].forEach((c, i) => {
        const a = t*(1.4 + i*0.35) + i*(Math.PI*2/3);
        ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(Math.cos(a)*r*1.44, Math.sin(a)*r*1.44, r*0.13, 0, Math.PI*2); ctx.fill();
      });
      ctx.shadowBlur = 0;
      // Swirl arcs
      const t2 = Date.now() * 0.0008;
      ctx.strokeStyle = 'rgba(110,150,255,0.55)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(0, 0, r*0.52, t2*2, t2*2 + Math.PI*1.3); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,90,190,0.45)';
      ctx.beginPath(); ctx.arc(0, 0, r*0.74, -t2*1.5, -t2*1.5 + Math.PI*1.5); ctx.stroke();
      // Eyes (face direction)
      ctx.save(); ctx.rotate(fa); eyes('#bbddff', '#334499', '#8899ff'); ctx.restore();
      break;
    }

    // ── DEMON ────────────────────────────────────────────────────────────
    case 'demon': {
      ctx.rotate(fa);
      // Dark aura ring
      ctx.strokeStyle = 'rgba(180,0,0,0.28)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, r*1.18, 0, Math.PI*2); ctx.stroke();
      // Sharp tall horns on sides (±Y)
      ctx.fillStyle = '#cc1100'; ctx.strokeStyle = '#880000'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(r*0.10, s*r*0.78);
        ctx.lineTo(r*0.28, s*r*1.80);
        ctx.lineTo(r*0.52, s*r*0.84);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Horn highlight edge
        ctx.fillStyle = '#ff3322';
        ctx.beginPath();
        ctx.moveTo(r*0.15, s*r*0.82);
        ctx.lineTo(r*0.22, s*r*1.56);
        ctx.lineTo(r*0.33, s*r*0.87);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#cc1100'; ctx.strokeStyle = '#880000'; ctx.lineWidth = 1.5;
      }
      // Swinging devil tail at back (-X)
      const sw = Math.sin(Date.now()*0.005) * r*0.42;
      ctx.strokeStyle = '#cc1100'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-r*0.85, 0);
      ctx.quadraticCurveTo(-r*1.52, sw, -r*1.52, sw + r*0.88);
      ctx.stroke();
      // Diamond arrowhead
      ctx.fillStyle = '#cc1100';
      ctx.save();
      ctx.translate(-r*1.52, sw + r*0.88);
      ctx.rotate(Math.PI * 0.22);
      ctx.beginPath(); ctx.moveTo(r*0.18,0); ctx.lineTo(-r*0.12,-r*0.12); ctx.lineTo(-r*0.05,0); ctx.lineTo(-r*0.12,r*0.12); ctx.closePath(); ctx.fill();
      ctx.restore();
      eyes('#ff1100', '#ffcc00', '#ff0000');
      break;
    }

    // ── GOD ──────────────────────────────────────────────────────────────
    case 'god': {
      // Pulsing golden rays — world-space, always rotating
      const tg = Date.now() * 0.0009;
      for (let i=0; i<8; i++) {
        const a = (i/8)*Math.PI*2 + tg;
        const pulse = 0.55 + 0.45*Math.sin(tg*3 + i*1.1);
        ctx.strokeStyle = `rgba(255,215,0,${0.70*pulse})`;
        ctx.lineWidth = 1.6 + pulse*1.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*r*1.26, Math.sin(a)*r*1.26);
        ctx.lineTo(Math.cos(a)*r*(1.74 + pulse*0.24), Math.sin(a)*r*(1.74 + pulse*0.24));
        ctx.stroke();
      }
      // Golden halo ring
      ctx.strokeStyle = 'rgba(255,215,0,0.78)'; ctx.lineWidth = 3;
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(0, 0, r*1.22, 0, Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
      // Eyes face movement direction
      ctx.save(); ctx.rotate(fa); eyes('#fff8cc', '#ff9900', '#ffee44'); ctx.restore();
      break;
    }

  } // end switch

  ctx.restore();
}

function drawArena(ctx, arena) {
  ctx.save();
  ctx.fillStyle = '#0e0e22';
  if (arena.type === 'circle') {
    ctx.beginPath();
    ctx.arc(arena.cx, arena.cy, arena.r, 0, Math.PI*2);
    ctx.fill();
    // border
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 3;
    ctx.stroke();
    // grid dots
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      for (let d = 50; d < arena.r; d += 50) {
        ctx.beginPath(); ctx.arc(arena.cx+Math.cos(a)*d, arena.cy+Math.sin(a)*d, 2, 0, Math.PI*2); ctx.fill();
      }
    }
  } else if (arena.type === 'square' || arena.type === 'rect') {
    ctx.roundRect(arena.x, arena.y, arena.w, arena.h, arena.type === 'square' ? 8 : 4);
    ctx.fill();
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 3;
    ctx.roundRect(arena.x, arena.y, arena.w, arena.h, arena.type === 'square' ? 8 : 4);
    ctx.stroke();
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let gx = arena.x + 50; gx < arena.x+arena.w; gx += 50) {
      ctx.beginPath(); ctx.moveTo(gx, arena.y); ctx.lineTo(gx, arena.y+arena.h); ctx.stroke();
    }
    for (let gy = arena.y + 50; gy < arena.y+arena.h; gy += 50) {
      ctx.beginPath(); ctx.moveTo(arena.x, gy); ctx.lineTo(arena.x+arena.w, gy); ctx.stroke();
    }
  } else if (arena.type === 'cross') {
    const cx = arena.cx, cy = arena.cy, arm = arena.arm, thick = arena.thick;
    ctx.beginPath();
    ctx.rect(cx-arm, cy-thick/2, arm*2, thick);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(cx-thick/2, cy-arm, thick, arm*2);
    ctx.fill();
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(cx-arm, cy-thick/2, arm*2, thick);
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(cx-thick/2, cy-arm, thick, arm*2);
    ctx.stroke();
  } else if (arena.type === 'hole') {
    // Fill square minus circular hole (even-odd rule)
    ctx.save();
    ctx.fillRule = 'evenodd';
    ctx.beginPath();
    ctx.rect(arena.x, arena.y, arena.w, arena.h);
    ctx.arc(arena.holeCx, arena.holeCy, arena.holeR, 0, Math.PI*2, true);
    ctx.fill('evenodd');
    // Outer border
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 3;
    ctx.strokeRect(arena.x, arena.y, arena.w, arena.h);
    // Inner hole border — glowing edge
    ctx.strokeStyle = '#4a2a6a';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#8844ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(arena.holeCx, arena.holeCy, arena.holeR, 0, Math.PI*2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Grid (clipped to arena minus hole)
    ctx.beginPath();
    ctx.rect(arena.x, arena.y, arena.w, arena.h);
    ctx.arc(arena.holeCx, arena.holeCy, arena.holeR, 0, Math.PI*2, true);
    ctx.clip('evenodd');
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let gx = arena.x + 50; gx < arena.x+arena.w; gx += 50) {
      ctx.beginPath(); ctx.moveTo(gx, arena.y); ctx.lineTo(gx, arena.y+arena.h); ctx.stroke();
    }
    for (let gy = arena.y + 50; gy < arena.y+arena.h; gy += 50) {
      ctx.beginPath(); ctx.moveTo(arena.x, gy); ctx.lineTo(arena.x+arena.w, gy); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}
