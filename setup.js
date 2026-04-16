// ============================================================
// GAME SETUP
// ============================================================
function initGame() {
  const arenaConfig = JSON.parse(JSON.stringify(
    (state.arenaId === 'custom' && state.customArena)
      ? state.customArena
      : (ARENAS[state.arenaId] || ARENAS.med_square)
  ));
  state.arena = arenaConfig;
  const N = state.fighters.length;

  // Determine arena center + spread radius
  let cx, cy, spreadR;
  if (arenaConfig.type === 'circle' || arenaConfig.type === 'hole_ci') {
    cx = arenaConfig.cx; cy = arenaConfig.cy;
    spreadR = arenaConfig.r * 0.45;
  } else if (arenaConfig.type === 'rect' || arenaConfig.type === 'hole_re') {
    cx = arenaConfig.x + arenaConfig.w / 2;
    cy = arenaConfig.y + arenaConfig.h / 2;
    spreadR = Math.min(arenaConfig.w, arenaConfig.h) * 0.33;
  } else if (arenaConfig.type === 'cross') {
    cx = arenaConfig.cx; cy = arenaConfig.cy;
    spreadR = arenaConfig.thick * 0.38;
  } else if (arenaConfig.type === 'hole') {
    cx = arenaConfig.x + arenaConfig.w / 2;
    cy = arenaConfig.y + arenaConfig.h / 2;
    spreadR = Math.min(arenaConfig.w, arenaConfig.h) * 0.34;
  } else { // square / hole_sq fallthrough
    cx = arenaConfig.x + arenaConfig.w / 2;
    cy = arenaConfig.y + arenaConfig.h / 2;
    spreadR = Math.min(arenaConfig.w, arenaConfig.h) * 0.34;
  }

  // Spread N balls evenly in a circle around center
  const positions = [];
  if (state.matchMode === '2v2' && N === 4) {
    // Team 0 on left, Team 1 on right, staggered vertically
    const gap = Math.min(70, spreadR * 0.4);
    positions.push({ x: cx - spreadR, y: cy - gap }); // team0 ball0
    positions.push({ x: cx - spreadR, y: cy + gap }); // team0 ball1
    positions.push({ x: cx + spreadR, y: cy - gap }); // team1 ball0
    positions.push({ x: cx + spreadR, y: cy + gap }); // team1 ball1
  } else if (N === 2) {
    positions.push({ x: cx - spreadR, y: cy });
    positions.push({ x: cx + spreadR, y: cy });
  } else {
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      positions.push({ x: cx + Math.cos(a) * spreadR, y: cy + Math.sin(a) * spreadR });
    }
  }

  const balls = state.fighters.map((fighter, i) => {
    const pos = positions[i];
    const side = i === 0 ? 'left' : 'right';
    const tId  = (state.matchMode === '2v2' && state.teamIds) ? (state.teamIds[i] ?? -1) : -1;

    // Entry animation: spawn outside arena, animate inward during countdown
    const entryAngle  = Math.atan2(pos.y - cy, pos.x - cx);
    const ENTRY_OFFSET = 420;
    const entrySpawnX = pos.x + Math.cos(entryAngle) * ENTRY_OFFSET;
    const entrySpawnY = pos.y + Math.sin(entryAngle) * ENTRY_OFFSET;

    const ball = new Ball(entrySpawnX, entrySpawnY, fighter.color, fighter.weaponId, side, fighter.charStats || null, tId);
    ball._targetX     = pos.x;
    ball._targetY     = pos.y;
    ball._entrySpawnX = entrySpawnX;
    ball._entrySpawnY = entrySpawnY;
    ball.charName  = fighter.charName  || null;
    ball.charEmoji = fighter.charEmoji || '';

    // Skills — copy from fighter data, apply passives
    ball.skills = fighter.skills || [];
    applySkillPassives(ball, fighter);
    initRoundSkillState(ball);
    initRaceSkillState(ball);

    // launchSpeed: nếu có chargen SPD → SPD + random(1~3), không thì 3 + random(0~3)
    const launchAngle = Math.atan2(pos.y - cy, pos.x - cx) + (Math.random() - 0.5) * 0.8;
    let launchSpd;
    if (fighter.charStats?.speed != null) {
      const randPart = 1 + Math.random() * 2;          // 1.0 ~ 3.0
      launchSpd = fighter.charStats.speed + randPart;
      const badThresh  = fighter.charStats.speed + 1.3;
      const goodThresh = fighter.charStats.speed + 2.5;
      if (launchSpd < badThresh)       { ball.speechText = '😴 Bad Start';    ball.speechFrames = 150; }
      else if (launchSpd > goodThresh) { ball.speechText = '🔥 Great Start!'; ball.speechFrames = 150; }
    } else {
      launchSpd = 3 + Math.random() * 3;               // legacy: 3.0 ~ 6.0
      if (launchSpd < 3.7)      { ball.speechText = '😴 Bad Start';    ball.speechFrames = 150; }
      else if (launchSpd > 4.8) { ball.speechText = '🔥 Great Start!'; ball.speechFrames = 150; }
    }
    // Store launch velocity — applied after countdown
    ball._launchVx = Math.cos(launchAngle) * launchSpd;
    ball._launchVy = Math.sin(launchAngle) * launchSpd;
    ball.vx = 0;
    ball.vy = 0;
    ball.weapon.angle = entryAngle + Math.PI; // face inward during entry
    return ball;
  });

  state.players = balls;
  state.projectiles  = [];
  state.trollNets    = [];
  state.smiteEffects = [];
  state.trapObjects  = (typeof initTrapObjects === 'function' && arenaConfig.traps)
    ? initTrapObjects(arenaConfig) : [];
  state.frame = 0;
  state.ended = false;
  state.winner = null;
  state.winTeam    = -1;
  state.speedFloorActive = false;
  state.rageModeActive   = false;
  state.battleLog = [];
  state.statsLog  = [];   // per-second snapshots for charts
  updateLiveLog(); // clear the live panel
  // matchMode is set by caller; default to '1v1' if not set
  if (!state.matchMode) state.matchMode = '1v1';
  state.phase = 'countdown';
  state.countdownFrame = 0;
  state.matchTime = 0;
  particles.length = 0;

  buildHUD();
  updateBO3Display();
  updateTimerDisplay();
}

function startGame() {
  // Arena randomization is handled by callers (nextMatchBtn / nextGameBtn / launchNextChampionshipMatch)
  state.matchMode = state.matchMode ?? '1v1';
  state.teamIds   = state.teamIds ?? [];
  initGame();
  applyArenaFit(state.arena);
  state.running = true;
  state.paused  = false;
  // Reset fixed-timestep accumulator so stale time from menu doesn't cause a frame spike
  _lastRafTime = null;
  _accumulator = 0;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(gameLoop);
}

function stopGame() {
  state.running = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  resetArenaFit();
}

// ── Auto-fit canvas viewport to arena bounding box ─────────────────
const _ARENA_FIT_PAD = 55; // canvas-unit padding around arena

function applyArenaFit(arena) {
  const clip   = document.getElementById('canvas-clip-wrapper');
  const canvas = document.getElementById('gameCanvas');
  if (!arena || !clip || !canvas) return;

  let ax, ay, aw, ah;
  if (arena.type === 'circle' || arena.type === 'hole_ci') {
    ax = arena.cx - arena.r;
    ay = arena.cy - arena.r;
    aw = arena.r * 2;
    ah = arena.r * 2;
  } else {
    // square, rect, hole_sq, hole_re
    ax = arena.x; ay = arena.y; aw = arena.w; ah = arena.h;
  }

  // Add padding, clamp so we never go outside 0-1000
  ax = Math.max(0, ax - _ARENA_FIT_PAD);
  ay = Math.max(0, ay - _ARENA_FIT_PAD);
  const ax2 = Math.min(1000, ax + aw + _ARENA_FIT_PAD * 2);
  const ay2 = Math.min(1000, ay + ah + _ARENA_FIT_PAD * 2);
  aw = ax2 - ax;
  ah = ay2 - ay;

  clip.style.width        = `${aw}px`;
  clip.style.height       = `${ah}px`;
  canvas.style.marginLeft = `-${ax}px`;
  canvas.style.marginTop  = `-${ay}px`;
}

function resetArenaFit() {
  const clip   = document.getElementById('canvas-clip-wrapper');
  const canvas = document.getElementById('gameCanvas');
  if (!clip || !canvas) return;
  clip.style.width        = '';
  clip.style.height       = '';
  canvas.style.marginLeft = '';
  canvas.style.marginTop  = '';
}
