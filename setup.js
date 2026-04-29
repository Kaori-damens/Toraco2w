// ============================================================
// GAME SETUP
// ============================================================
// ─── Tổng quan ───────────────────────────────────────────────
// setup.js chứa 3 function chính:
//   initGame()    — khởi tạo hoàn toàn 1 round: tạo Ball, đặt vị trí, gán skills
//   startGame()   — gọi initGame() rồi bật RAF game loop
//   stopGame()    — dừng RAF, reset arena fit, tắt audience
// Arena fit (applyArenaFit / resetArenaFit): zoom canvas cho vừa arena,
// cắt phần thừa để arena luôn full màn hình không bị lãng phí chỗ trống.

// ─── initGame ────────────────────────────────────────────────
// Khởi tạo hoàn toàn một round:
//   1. Load arena config từ ARENAS[state.arenaId]
//   2. Tính tâm + spread radius để đặt ball (theo loại arena)
//   3. Tạo từng Ball với "cannon entry" — spawn bên ngoài tường, bắn vào trong
//   4. Gán skills, gọi applySkillPassives + initRoundSkillState + initRaceSkillState
//   5. Reset tất cả state arrays (projectiles, traps, particles…)
//   6. Đặt phase = 'countdown', frame = 0
// Tham số: không có (đọc state.fighters, state.arenaId)
// Trả về: không có
function initGame() {
  // Deep clone arena config để không bị mutate khi dynamic events thay đổi nó mid-game
  const arenaConfig = JSON.parse(JSON.stringify(
    (state.arenaId === 'custom' && state.customArena)
      ? state.customArena
      : (ARENAS[state.arenaId] || ARENAS.med_square)
  ));
  state.arena = arenaConfig;
  const N = state.fighters.length;

  // ── Tính tâm arena (cx, cy) + spreadR: bán kính đặt ball quanh tâm ──
  // spreadR ~ 33–45% bán kính arena → balls không spawn quá gần tâm hay tường
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
  } else if (arenaConfig.type === 'diamond') {
    cx = arenaConfig.cx; cy = arenaConfig.cy;
    spreadR = Math.min(arenaConfig.hw, arenaConfig.hh) * 0.38;
  } else if (arenaConfig.type === 'octagon') {
    cx = arenaConfig.cx; cy = arenaConfig.cy;
    spreadR = arenaConfig.r * 0.42;
  } else if (arenaConfig.type === 'hole') {
    cx = arenaConfig.x + arenaConfig.w / 2;
    cy = arenaConfig.y + arenaConfig.h / 2;
    spreadR = Math.min(arenaConfig.w, arenaConfig.h) * 0.34;
  } else { // square / hole_sq fallthrough
    cx = arenaConfig.x + arenaConfig.w / 2;
    cy = arenaConfig.y + arenaConfig.h / 2;
    spreadR = Math.min(arenaConfig.w, arenaConfig.h) * 0.34;
  }

  // ── Tính vị trí spawn cho từng ball ──────────────────────────
  // 1v1: trái/phải đối xứng | 2v2: team0 trái, team1 phải | FFA: vòng tròn đều
  const positions = [];
  if (state.matchMode === '2v2' && N === 4) {
    // 2v2: team0 bên trái, team1 bên phải, lệch dọc để không chồng lên nhau
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

    // ── Cannon Entry: spawn ball bên ngoài tường, bắn vào trong ──
    // Góc spawn = góc từ tâm arena ra vị trí target của ball
    // Ball spawn NGOÀI tường (_arenaEdge + 60px), khi FIGHT! thì bắn vào trong với speed 10
    // _entryFlightFrames grace period 25f: ball xuyên tường để vào trong không bị clamp sớm
    const entryAngle = Math.atan2(pos.y - cy, pos.x - cx);
    // Tính edge distance theo loại arena (circle dùng .r, cross dùng .arm, rect dùng w/h)
    let _arenaEdge;
    if (arenaConfig.r)        _arenaEdge = arenaConfig.r;
    else if (arenaConfig.arm) _arenaEdge = arenaConfig.arm;
    else if (arenaConfig.hw)  _arenaEdge = Math.min(arenaConfig.hw, arenaConfig.hh ?? arenaConfig.hw);
    else _arenaEdge = Math.min(arenaConfig.w ?? 400, arenaConfig.h ?? 400) / 2;
    const CANNON_CLEARANCE = 60; // px outside arena wall
    const entrySpawnX = cx + Math.cos(entryAngle) * (_arenaEdge + CANNON_CLEARANCE);
    const entrySpawnY = cy + Math.sin(entryAngle) * (_arenaEdge + CANNON_CLEARANCE);

    const ball = new Ball(entrySpawnX, entrySpawnY, fighter.color, fighter.weaponId, side, fighter.charStats || null, tId);
    ball._entrySpawnX = entrySpawnX;
    ball._entrySpawnY = entrySpawnY;
    ball.charName  = fighter.charName  || null;
    ball.charEmoji = fighter.charEmoji || '';

    // Skills — copy from fighter data, apply passives
    ball.skills = fighter.skills || [];
    applySkillPassives(ball, fighter);
    initRoundSkillState(ball);
    initRaceSkillState(ball);

    // ── Launch velocity: áp dụng sau khi countdown kết thúc (frame 240) ──
    // launchSpd phụ thuộc charSPD: tốt/xấu so với threshold → hiện speech bubble
    // _launchVx/_launchVy được set ở đây, apply ở gameLoop khi phase = 'playing'
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

    // Cannon angle: toward arena center at ±30° diagonal — fired at FIGHT! (frame 180)
    const dirToCenter  = Math.atan2(cy - entrySpawnY, cx - entrySpawnX);
    const cannonOffset = (Math.PI / 6) * (Math.random() < 0.5 ? 1 : -1); // ±30°
    const cannonAngle  = dirToCenter + cannonOffset;
    ball.vx = 0;
    ball.vy = 0;
    ball._cannonEntry       = true;
    ball._cannonAngle       = cannonAngle;
    ball._entryFlightFrames = 0;    // frames in-flight (wall-pass grace period)
    ball.weapon.angle = cannonAngle; // face direction of travel
    return ball;
  });

  state.players = balls;
  state.projectiles  = [];
  state.trollNets    = [];
  state.smiteEffects = [];
  state.boneShards      = [];
  state.skillMinions    = [];
  state.droppedWeapons  = [];
  state.trapObjects  = (typeof initTrapObjects === 'function' && arenaConfig.traps)
    ? initTrapObjects(arenaConfig) : [];
  state.frame = 0;
  state.ended = false;
  if (typeof resetArenaEvents === 'function') resetArenaEvents();
  state.winner = null;
  state.winTeam    = -1;
  state.speedFloorActive  = false;
  state.rageModeActive    = false;
  state.suddenDeathActive = false; // reset Sudden Death giữa các trận
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

// ─── startGame ───────────────────────────────────────────────
// Gọi initGame() rồi bật RAF game loop.
// Arena đã được set bởi caller (ui.js, championship.js) trước khi gọi hàm này.
// Reset _lastRafTime + _accumulator để tránh spike frame sau khi từ menu vào game.
// Tham số: không có
// Trả về: không có
function startGame() {
  // Arena đã được chọn bởi caller (nextMatchBtn / nextGameBtn / launchNextChampionshipMatch)
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
  // Audience stand
  if (typeof initAudience === 'function') initAudience();
  if (typeof startAudienceChatter === 'function') startAudienceChatter();
}

// ─── stopGame ────────────────────────────────────────────────
// Dừng RAF, reset canvas về kích thước gốc, tắt audience chatter.
// Gọi từ showResult() và các nơi cần dừng game sạch.
function stopGame() {
  state.running = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  resetArenaFit();
  if (typeof stopAudienceChatter === 'function') stopAudienceChatter();
}

// ─── applyArenaFit ───────────────────────────────────────────
// Zoom canvas CSS để arena vừa khít khung nhìn, không có dead space.
// Cách hoạt động:
//   1. Tính bounding box của arena (ax, ay, aw, ah) theo từng loại
//   2. Add padding _ARENA_FIT_PAD = 55px xung quanh
//   3. Canvas 1000×1000 game units được thu nhỏ/dịch chuyển qua CSS
//   4. clip-wrapper shrinks để không tốn layout space
// _arenaZoom: 0.5–1.0, điều chỉnh bởi zoom slider trong UI.
// Gọi từ startGame() sau initGame().
const _ARENA_FIT_PAD = 55; // padding canvas-unit quanh arena
let   _arenaZoom     = 0.85;  // hệ số zoom mặc định 85%, điều chỉnh bởi zoom slider

function applyArenaFit(arena) {
  const clip   = document.getElementById('canvas-clip-wrapper');
  const canvas = document.getElementById('gameCanvas');
  if (!arena || !clip || !canvas) return;

  let ax, ay, aw, ah;
  if (arena.type === 'circle' || arena.type === 'hole_ci' || arena.type === 'shrinking_ring') {
    ax = arena.cx - arena.r;
    ay = arena.cy - arena.r;
    aw = arena.r * 2;
    ah = arena.r * 2;
  } else if (arena.type === 'diamond') {
    ax = arena.cx - arena.hw;
    ay = arena.cy - arena.hh;
    aw = arena.hw * 2;
    ah = arena.hh * 2;
  } else if (arena.type === 'octagon') {
    // Use circumradius (R = r / cos(π/8) ≈ 1.082·r) for bounding box
    const R = arena.r / Math.cos(Math.PI / 8);
    ax = arena.cx - R;
    ay = arena.cy - R;
    aw = R * 2;
    ah = R * 2;
  } else {
    // square, rect, hole_sq, hole_re, cross
    ax = arena.x ?? (arena.cx - (arena.arm ?? 300));
    ay = arena.y ?? (arena.cy - (arena.arm ?? 300));
    aw = arena.w ?? (arena.arm ?? 300) * 2;
    ah = arena.h ?? (arena.arm ?? 300) * 2;
  }

  // Add padding, clamp so we never go outside 0-1000
  ax = Math.max(0, ax - _ARENA_FIT_PAD);
  ay = Math.max(0, ay - _ARENA_FIT_PAD);
  const ax2 = Math.min(1000, ax + aw + _ARENA_FIT_PAD * 2);
  const ay2 = Math.min(1000, ay + ah + _ARENA_FIT_PAD * 2);
  aw = ax2 - ax;
  ah = ay2 - ay;

  // Store base (unzoomed) arena dimensions for zoom re-application
  clip._arenaBaseW  = aw;
  clip._arenaBaseH  = ah;
  clip._arenaBaseAX = ax;
  clip._arenaBaseAY = ay;

  _applyArenaZoom(clip, canvas);
}

// Apply _arenaZoom to the clip-wrapper/canvas CSS sizes (no layout dead-space)
function _applyArenaZoom(clip, canvas) {
  clip   = clip   || document.getElementById('canvas-clip-wrapper');
  canvas = canvas || document.getElementById('gameCanvas');
  if (!clip || !canvas || !clip._arenaBaseW) return;

  const z  = _arenaZoom;
  const aw = clip._arenaBaseW;
  const ah = clip._arenaBaseH;
  const ax = clip._arenaBaseAX;
  const ay = clip._arenaBaseAY;

  // Scale the canvas CSS display size (canvas attribute = 1000×1000, CSS can differ)
  canvas.style.width      = `${1000 * z}px`;
  canvas.style.height     = `${1000 * z}px`;
  canvas.style.marginLeft = `-${ax * z}px`;
  canvas.style.marginTop  = `-${ay * z}px`;
  // Clip-wrapper shrinks with the canvas so no dead layout space
  clip.style.width        = `${aw * z}px`;
  clip.style.height       = `${ah * z}px`;
}

function resetArenaFit() {
  const clip   = document.getElementById('canvas-clip-wrapper');
  const canvas = document.getElementById('gameCanvas');
  if (!clip || !canvas) return;
  clip.style.width        = '';
  clip.style.height       = '';
  canvas.style.width      = '';
  canvas.style.height     = '';
  canvas.style.marginLeft = '';
  canvas.style.marginTop  = '';
}
