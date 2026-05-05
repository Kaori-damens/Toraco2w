// ============================================================
// GAME LOOP
// ============================================================
// ─── Tổng quan ───────────────────────────────────────────────
// game-loop.js chứa vòng lặp chính của game (60fps cố định):
//   gameLoop(now) — RAF callback, tích lũy time rồi drain theo bước 16.667ms
//   step()        — 1 logic tick: update balls, collisions, traps, win check
//   render()      — vẽ toàn bộ frame: arena → weapons → balls → particles → overlays
//   getOvertimeHealMult() — helper cho heal suppression Overtime
//
// Fixed Timestep pattern:
//   • RAF chạy theo Hz màn hình (60/120/144Hz)
//   • _accumulator += elapsed ms → drain mỗi 16.667ms = 1 game step
//   • MAX_CATCHUP = 5 steps/frame → tránh spiral-of-death khi tab focus regain
//
// Timeline sự kiện đặc biệt trong step():
//   60s  → Speed Floor: maxSpd tăng 5% mỗi 10s
//   80s  → Rage Mode: heal fade bắt đầu, red overlay
//   2:00 → Sudden Death: heal = 0, -1 HP/s, magenta overlay
//   1:46 → God Time Loss: God tự thua nếu đối thủ không phải demon/god

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let rafId = null;

// Fixed timestep: game logic chạy đúng 60 steps/giây bất kể refresh rate màn hình.
// rAF fires at monitor refresh rate (60/120/144Hz) — accumulate real time,
// drain in 16.667ms chunks so 120Hz screen doesn't run the game 2× faster.
const GAME_STEP_MS  = 1000 / 60;   // 16.667 ms per logic step
const MAX_CATCHUP   = 5;            // max steps per rAF frame (prevents spiral-of-death on tab focus regain)
let   _lastRafTime  = null;
let   _accumulator  = 0;

// Page Visibility API — reset frame timer when tab regains focus
// so the game doesn't get a huge elapsed delta and freeze/jump on resume.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    _lastRafTime = null;          // force bootstrap on next frame
    if (state.running) {
      cancelAnimationFrame(rafId); // cancel stale pending frame (if any)
      rafId = requestAnimationFrame(gameLoop);
    }
  }
});

// ─── gameLoop ────────────────────────────────────────────────
// RAF callback chính. Tích lũy elapsed time rồi drain từng 16.667ms = 1 step.
// Phase 'countdown': xử lý cannon animation (frame 0–239).
// Phase 'playing': gọi step() × state.speed lần/frame (1x, 2x, 3x...).
// Sau khi drain xong: render() + updateHUD() + updateTimerDisplay().
function gameLoop(now) {
  if (!state.running) return;
  rafId = requestAnimationFrame(gameLoop);

  // Bootstrap frame đầu tiên hoặc sau tab-resume
  if (_lastRafTime === null) { _lastRafTime = now; }
  let elapsed = now - _lastRafTime;
  _lastRafTime = now;

  // Cap elapsed: tránh jump lớn sau tab-switch (vd: tab mất 500ms → chỉ xử lý 200ms)
  if (elapsed > 200) elapsed = 200;
  _accumulator += elapsed;

  // Drain accumulator: mỗi 16.667ms = 1 game tick logic
  let stepsThisFrame = 0;
  while (_accumulator >= GAME_STEP_MS && stepsThisFrame < MAX_CATCHUP * state.speed) {
    _accumulator -= GAME_STEP_MS;

    if (state.phase === 'countdown' && !state.paused) {
      state.countdownFrame++;
      // 4 phases × 60f: "3" (0–59), "2" (60–119), "1" (120–179), "FIGHT!" (180–239)
      const cf = state.countdownFrame;

      // Countdown 4 phase × 60f: "3"(0–59), "2"(60–119), "1"(120–179), "FIGHT!"(180–239)
      // FIGHT! (frame 180): bắn cannon — mỗi ball vxt vào arena với speed 10
      if (cf === 180) {
        const ENTRY_SPEED = 10;
        for (const b of state.players) {
          if (!b._cannonEntry) continue;
          b.vx = Math.cos(b._cannonAngle) * ENTRY_SPEED;
          b.vy = Math.sin(b._cannonAngle) * ENTRY_SPEED;
          spawnSparks(b._entrySpawnX, b._entrySpawnY, 18);
          sfxWallBounce();
        }
      }

      // Cannon ball physics (frames 181–239: in-flight inside arena)
      if (cf > 180) {
        for (const b of state.players) {
          if (!b._cannonEntry) continue;
          b.x += b.vx;
          b.y += b.vy;
          b._entryFlightFrames++;
          // Grace period: skip wall clamp first 25 frames — ball passes through wall
          if (b._entryFlightFrames >= 25) {
            const snapX = b.x, snapY = b.y;
            clampToBall(b, state.arena);
            if (Math.abs(b.x - snapX) > 0.5 || Math.abs(b.y - snapY) > 0.5) {
              spawnSparks(b.x, b.y, 5);
              sfxWallBounce();
            }
          }
          b.vx *= 0.988;
          b.vy *= 0.988;
        }

        // Soft ball–ball collision during entry (elastic, no damage, no skills)
        const entryBalls = state.players.filter(b => b._cannonEntry);
        for (let i = 0; i < entryBalls.length - 1; i++) {
          for (let j = i + 1; j < entryBalls.length; j++) {
            const a = entryBalls[i], b = entryBalls[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);
            const minD = a.radius + b.radius;
            if (dist >= minD || dist < 0.01) continue;
            // Separate positions
            const nx = dx / dist, ny = dy / dist;
            const push = (minD - dist) * 0.5;
            a.x -= nx * push; a.y -= ny * push;
            b.x += nx * push; b.y += ny * push;
            // Elastic velocity exchange along collision normal (equal mass)
            const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
            const dot = dvx * nx + dvy * ny;
            if (dot > 0) {
              a.vx -= dot * nx; a.vy -= dot * ny;
              b.vx += dot * nx; b.vy += dot * ny;
            }
            spawnSparks((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, 8);
          }
        }
      }

      if (cf >= 240) {
        state.phase = 'playing';
        for (const b of state.players) {
          b.vx = b._launchVx || 0;
          b.vy = b._launchVy || 0;
          skillOnPreCombat(b);
        }
      }
    } else if (!state.paused && !state.ended) {
      for (let s = 0; s < state.speed; s++) step();
      state.matchTime += state.speed;
    }

    stepsThisFrame++;
  } // end while accumulator

  render();
  updateHUD();
  updateTimerDisplay();
}

// ─── step ────────────────────────────────────────────────────
// 1 logic tick (1/60s). Thứ tự xử lý QUAN TRỌNG — không đổi thứ tự:
//   1. Ball.update() — vật lý, vũ khí, AI firing (PVE dùng bossProxy)
//   2. Race skill updates — VoidGrip, updateRaceSkills, race projectiles
//   3. Projectile.update() — di chuyển, bounce, homing, lifetime
//   4. collidePair() — body bounce + parry + weapon hit (O(N²))
//   5. Boss/terrain collision (PVE only)
//   6. resolveProjectiles() — đạn vs tất cả ball
//   7. Traps update (PvP) / terrain (PVE)
//   8. Particles + skill minions + per-frame skill timers
//   9. Per-second stats snapshot
//  10. Milestone announcements (Speed Floor 60s, Rage Mode 80s, Sudden Death 2:00)
//  11. God Time Loss check (1:46)
//  12. Win condition check
// Tham số: không có (đọc/ghi state trực tiếp)
// Trả về: không có
function step() {
  state.frame++;
  const players = state.players;

  // 1. Update mỗi ball — truyền nearest enemy để ball AI biết đích nhắm/bắn
  if (state.pveMode && state.boss) {
    // PVE: all balls target the boss as their nearest enemy
    const bossProxy = state.boss.alive
      ? { x: state.boss.x, y: state.boss.y, alive: true,
          teamId: -99, radius: 80, hp: state.boss.hp, maxHp: state.boss.maxHp,
          vx: 0, vy: 0, getScaleLabel: () => '', getSpeed: () => 0 }
      : null;
    for (const ball of players) {
      if (!ball.alive) continue;
      ball.update(state.arena, bossProxy, state.projectiles, state.gravity);
    }
    // Boss AI update
    state.boss.update(players, state.arena);
  } else {
    for (const ball of players) {
      let nearest = null, nearestD = Infinity;
      for (const other of players) {
        if (other === ball || !other.alive) continue;
        // Skip teammates in team matches
        if (ball.teamId >= 0 && ball.teamId === other.teamId) continue;
        const d = Math.hypot(ball.x - other.x, ball.y - other.y);
        if (d < nearestD) { nearestD = d; nearest = other; }
      }
      ball.update(state.arena, nearest, state.projectiles, state.gravity);
    }
  }

  // Race skill updates (per-ball + global projectiles)
  if (state.phase === 'playing') {
    // Void Grip physics runs for ALL balls — non-race-skill races (goblin, human…)
    // are skipped by updateRaceSkills' early return, so this must be separate.
    for (const ball of players) updateVoidGripPhysics(ball);
    for (const ball of players) updateRaceSkills(ball, players, state);
    updateRaceSkillProjectiles(state);
  }

  // Update projectiles (skip if frozen by The World)
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const _proj = state.projectiles[i];
    if (_proj._jojoFrozen) continue; // The World: projectile đứng yên
    _proj.update(state.arena);
    if (!_proj.alive) state.projectiles.splice(i, 1);
  }

  // All-pairs body/weapon collision
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      collidePair(players[i], players[j]);
    }
  }

  // PVE: push balls out of boss body (solid collision — no xuyên boss)
  if (state.pveMode && state.boss) {
    resolveBossBodyCollision(state.boss, players);
  }

  // PVE: terrain collision (balls bounce off solid, take hazard damage, slow in mud)
  if (state.pveMode && state.terrainObjects?.length) {
    resolveTerrainCollision(players, state.terrainObjects);
    resolveBossTerrainCollision(state.boss, state.terrainObjects);
    // Expire timed terrain objects (e.g. Ignar lava pools)
    state.terrainObjects = state.terrainObjects.filter(
      t => !t.lifetime || (state.frame - (t._spawnFrame ?? 0)) < t.lifetime
    );
    // Lightning rod sparks (Thunderstorm Peak ambient effect)
    if (typeof updateRodSparks === 'function') updateRodSparks(state.terrainObjects, state.frame);
  }

  // Apply slow zone speed modifier (set by resolveTerrainCollision, consumed here)
  for (const ball of players) {
    if (ball._inSlowZone != null) {
      const orig = ball._baseSlow_maxSpd ?? ball.maxSpd;
      ball.maxSpd = orig * ball._inSlowZone;
      ball._baseSlow_maxSpd = orig;
      ball._inSlowZone = null;
    } else if (ball._baseSlow_maxSpd != null) {
      ball.maxSpd = ball._baseSlow_maxSpd;
      ball._baseSlow_maxSpd = null;
    }
  }

  // Projectiles vs all balls
  resolveProjectiles(players, state.projectiles);

  // Melee weapons vs skill minions (necromancer_pact, horde_call…)
  if (typeof resolveMeleeVsMinions === 'function') resolveMeleeVsMinions(players);

  // PVE: heal orb spawning + pickup
  if (state.pveMode && state.boss?.alive) {
    updateHealOrbs(players);
  }

  // PVE: projectile & melee hits on boss
  if (state.pveMode && state.boss) {
    resolveBossProjectileHits(state.boss, state.projectiles);
    resolveBossMeleeHits(state.boss, players);
    // Grakk: update goblin swarm + goblin projectile hits
    resolveGoblinAttacks(state.boss, players);
    resolveGoblinHits(state.boss, state.projectiles);
    // Syvara: player projectiles hit void anchors
    resolveAnchorHits(state.boss, state.projectiles);
  }

  // PvP traps (pillars, scythes, lightning, bombs)
  if (!state.pveMode && state.trapObjects?.length) {
    updateTraps(state.trapObjects, players, state.frame);
  }

  // Dynamic arena events (diamond holes, wind, shrink, vents)
  if (typeof updateArenaEvents === 'function') updateArenaEvents();

  updateParticles();

  // Skill minions (necromancer_pact, horde_call, mirror_clone, chimera shikigami)
  if (typeof updateSkillMinions === 'function') updateSkillMinions();

  // JJK — domain ticks + curse technique per-frame logic
  if (state.phase === 'playing' && typeof jjkUpdateAll === 'function') jjkUpdateAll(state);
  // JoJo — stand update (movement, attacks, The World freeze, KQ bombs, GE minions)
  if (state.phase === 'playing' && typeof jojoUpdateAll === 'function') jojoUpdateAll(state);
  // One Piece — Haki ticks, shockwaves, Tori regen, Mera burns, Ryu transform, Goro CD
  if (state.phase === 'playing' && typeof opUpdateAll === 'function') opUpdateAll(state);
  // Per-frame skill timers (war_banner, horde_call, plague)
  if (state.phase === 'playing') {
    for (const b of players) { if (b.alive && typeof skillPerFrameUpdate === 'function') skillPerFrameUpdate(b); }
  }

  // ── Per-second stats snapshot ──
  if (state.phase === 'playing' && state.matchTime % 60 === 0) {
    const snap = {
      second: Math.floor(state.matchTime / 60),
      balls: players.map(b => {
        const spd  = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
        const spin = Math.abs(b.getSpeed ? b.getSpeed() : 0);
        const dmgDelta = b.stats.damageDone - (b._lastDmgSnap ?? 0);
        b._lastDmgSnap = b.stats.damageDone;
        return { name: getBallLabel(b), color: b.color,
          speed:    +spd.toFixed(2),
          spin:     +spin.toFixed(4),
          dmg:      +dmgDelta.toFixed(2),
          scaleVal: getBallScaleVal(b),
          scaleUnit: getBallScaleUnit(b),
        };
      })
    };
    state.statsLog.push(snap);
  }

  // ── Speed Floor: sau 60s → +5% maxSpd mỗi 10s (cộng dồn không giới hạn) ──
  // steps = số lần 10s đã trôi qua từ 60s → mult tăng dần theo thời gian
  if (state.matchTime >= 60 * 60) {
    const steps = Math.floor((state.matchTime - 60 * 60) / (10 * 60));
    const mult  = 1 + steps * 0.05; // 60s: ×1.0, 70s: ×1.05, 80s: ×1.10...
    for (const b of players) b.maxSpd = b.baseMaxSpd * mult;
  }

  // ── One-shot milestone announcements ──────────────────────────
  // Dùng flag state.xxxActive để chỉ trigger 1 lần, không spam mỗi frame
  if (!state.speedFloorActive && state.matchTime >= 60 * 60) {
    state.speedFloorActive = true;
    spawnBigAnnouncement('SPEED UP!', '#ffcc00');
  }
  if (!state.rageModeActive && state.matchTime >= 80 * 60) {
    state.rageModeActive = true;
    spawnBigAnnouncement('RAGE MODE!', '#ff4400');
    if (typeof audienceReact === 'function') audienceReact('rage_mode');
  }

  if (!state.suddenDeathActive && state.matchTime >= 120 * 60 && !state.pveMode) {
    state.suddenDeathActive = true;
    spawnBigAnnouncement('SUDDEN DEATH!', '#ff0066');
  }
  // HP drain: 1 HP/s per player after Sudden Death
  if (state.suddenDeathActive && !state.pveMode && state.matchTime % 60 === 0) {
    for (const b of players) {
      if (!b.alive || b.isMirrorClone) continue;
      b.hp -= 1;
      spawnDamageNumber(b.x, b.y - b.radius - 16, '−1 ☠', '#ff0066');
      if (b.hp <= 0) { b.hp = 0; b.alive = false; spawnDeathExplosion(b.x, b.y, b.color); }
    }
  }

  // ── God Time Loss: sau 1:46 (106s) — God tự thua nếu đối thủ không phải demon/god ──
  // Lý do: God quá mạnh late game, rule này ép kết thúc sớm
  // Miễn trừ: demon và god (chỉ thuần human/orc/... mới trigger được rule này)
  if (!state.godTimeLoss && state.matchTime >= 106 * 60 && !state.pveMode) {
    state.godTimeLoss = true;
    let godFell = false;
    for (const godBall of players) {
      if (!godBall.alive || godBall.charRace !== 'god') continue;
      const opponents = state.matchMode === '2v2'
        ? players.filter(b => b.alive && b.teamId !== godBall.teamId)
        : players.filter(b => b.alive && b !== godBall);
      const hasNonExempt = opponents.some(b => b.charRace !== 'demon' && b.charRace !== 'god');
      if (!hasNonExempt) continue;
      godBall.alive = false;
      godBall.hp    = 0;
      spawnDamageNumber(godBall.x, godBall.y - godBall.radius - 28, '⏱️ Fell from grace!', '#ccaaff');
      godFell = true;
    }
    if (godFell) spawnBigAnnouncement('GOD FALLS!', '#ccaaff');
  }


  // ── Win condition check ──────────────────────────────────────
  // Mirror clone KHÔNG tính là contestant — loại khỏi alive list trước khi check
  const alive = players.filter(b => b.alive && !b.isMirrorClone);

  if (state.pveMode) {
    // PVE lose: all players dead (boss win is triggered by Boss.die())
    if (!state.ended && alive.length === 0) {
      state.ended   = true;
      state.running = false;
      setTimeout(() => showPVEResult(false), 1200);
    }
  } else if (state.matchMode === 'mob') {
    // Mob encounter — delegated to mob-encounter.js
    if (typeof mobEncounterCheckWin === 'function') mobEncounterCheckWin(alive);
  } else if (!state.ended && players.length > 1) {
    if (state.matchMode === '2v2') {
      const t0 = alive.filter(b => b.teamId === 0).length;
      const t1 = alive.filter(b => b.teamId === 1).length;
      if (t0 === 0 || t1 === 0) {
        state.ended = true;
        state.winTeam = (t0 > 0) ? 0 : (t1 > 0) ? 1 : -1;
        state.winner  = state.winTeam >= 0
          ? alive.find(b => b.teamId === state.winTeam) ?? null
          : 'draw';
        setTimeout(() => showResult(), 1200);
      }
    } else {
      if (alive.length <= 1) {
        state.ended = true;
        state.winner = alive.length === 0 ? 'draw' : alive[0];
        if (state.winner && state.winner !== 'draw' && state.winner._wasLowHp
            && typeof audienceReact === 'function')
          audienceReact('comeback');
        setTimeout(() => showResult(), 1200);
      }
    }
  }
}

// ─── render ──────────────────────────────────────────────────
// Vẽ toàn bộ 1 frame lên canvas. Thứ tự layering từ dưới lên trên:
//   1. Background + Arena shape
//   2. Arena events (holes, wind arrows, vent warnings)
//   3. Entry cannons (chỉ trong countdown)
//   4. PvP traps / PVE terrain (below balls)
//   5. Weapons (behind balls — drawWeapon)
//   6. Projectiles
//   7. Balls (draw)
//   8. Boss (PVE) / Heal orbs (PVE)
//   9. PVE terrain above (hazard/slow overlays)
//  10. Particles + skill minions + race skill effects
//  11. Overlays: game ended darkening, countdown text, Speed/Rage/SuddenDeath pulse, announcements
// Tham số: không có (đọc state và ctx global)
// Trả về: không có
function render() {
  ctx.clearRect(0, 0, CW, CH);
  // Background: PVE dùng màu từ mapDef, PvP luôn là dark navy
  ctx.fillStyle = (state.pveMode && state.mapDef?.bgColor) ? state.mapDef.bgColor : '#080818';
  ctx.fillRect(0, 0, CW, CH);

  drawArena(ctx, state.arena);

  // Dynamic arena event visuals (holes, wind arrows, vent warnings, shrink ring)
  if (typeof drawArenaEvents === 'function') drawArenaEvents(ctx);

  // Entry cannons — drawn above arena, below balls
  if (state.phase === 'countdown') drawEntryCannons(ctx);

  // PvP traps — drawn below balls
  if (!state.pveMode && state.trapObjects?.length) {
    drawTraps(ctx, state.trapObjects, state.frame);
  }

  // JJK domain backgrounds (drawn below balls)
  if (typeof jjkDrawDomains === 'function') jjkDrawDomains(ctx, state);
  // JoJo Stands (drawn below balls — body + tether + range circle)
  if (typeof jojoDrawStands === 'function') jojoDrawStands(ctx, state);

  // PVE terrain — solid objects below balls (pillars, walls, crates)
  if (state.pveMode && state.terrainObjects?.length) {
    drawTerrainBelow(ctx, state.terrainObjects);
  }

  // Draw weapons behind balls
  for (const b of state.players) b.drawWeapon(ctx);

  // Draw projectiles
  for (const p of state.projectiles) p.draw(ctx);

  // Draw balls
  for (const b of state.players) b.draw(ctx);

  // JJK domain overlays (drawn above balls — Chimera shadow effect)
  if (typeof jjkDrawOverlays === 'function') jjkDrawOverlays(ctx, state);
  // JoJo overlays (The World freeze overlay, KQ bombs)
  if (typeof jojoDrawOverlays === 'function') jojoDrawOverlays(ctx, state);
  // One Piece effects (shockwave rings, Ryu glow, Tori aura, Mera burn, Armament outline)
  if (typeof opDrawEffects === 'function') opDrawEffects(ctx, state);

  // Draw heal orbs (PVE)
  if (state.pveMode) drawHealOrbs(ctx);

  // Draw boss (PVE)
  if (state.boss) state.boss.draw(ctx);

  // PVE terrain — hazard/slow overlays above everything
  if (state.pveMode && state.terrainObjects?.length) {
    drawTerrainAbove(ctx, state.terrainObjects, state.frame);
  }

  drawParticles(ctx);

  // Skill minions
  if (typeof drawSkillMinions === 'function') drawSkillMinions(ctx);

  // Race skill effects (global: lightning, nets)
  drawRaceSkillEffects(ctx, state);
  // Race skill per-ball UI (auras, cooldown arcs, trapped overlay)
  for (const b of state.players) drawRaceSkillUI(ctx, b);

  // Game ended overlay
  if (state.ended) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.restore();
  }

  // Countdown overlay
  if (state.phase === 'countdown') renderCountdown();

  // Speed Floor overlay — subtle yellow pulse after 60s
  if (state.matchTime >= 60 * 60 && state.matchTime < 80 * 60 && !state.ended) {
    const a = 0.025 + 0.015 * Math.sin(state.matchTime * 0.08);
    ctx.save(); ctx.fillStyle = `rgba(255,210,0,${a})`; ctx.fillRect(0,0,CW,CH); ctx.restore();
  }
  // Rage Mode overlay — red pulse after 80s (overrides yellow)
  if (state.matchTime >= 80 * 60 && state.matchTime < 120 * 60 && !state.ended) {
    const a = 0.04 + 0.03 * Math.sin(state.matchTime * 0.15);
    ctx.save(); ctx.fillStyle = `rgba(255,50,0,${a})`; ctx.fillRect(0,0,CW,CH); ctx.restore();
  }
  // Sudden Death overlay — deep magenta pulse after 2:00
  if (state.matchTime >= 120 * 60 && !state.ended) {
    const a = 0.06 + 0.04 * Math.sin(state.matchTime * 0.20);
    ctx.save(); ctx.fillStyle = `rgba(220,0,100,${a})`; ctx.fillRect(0,0,CW,CH); ctx.restore();
  }
  // Big announcements
  updateDrawBigAnnouncements(ctx);
}

// ─── getOvertimeHealMult ─────────────────────────────────────
// Trả về hệ số nhân cho mọi nguồn heal (Vampiric, Bone Scatter, Demon absorb…).
// Mục đích: ngăn trận kéo dài vô hạn do heal vượt DPS (vd: 2 skeleton + shuriken STR=1).
//   t < 80s  → 1.0 (heal bình thường)
//   80s–2:00 → fade tuyến tính từ 1.0 → 0.0
//   t ≥ 2:00 → 0.0 (không hồi máu nữa, Sudden Death kích hoạt cùng lúc)
// Không áp dụng cho PVE (boss fight không cần rule này).
// Tham số: không có (đọc state.matchTime)
// Trả về: number (0.0 – 1.0)
function getOvertimeHealMult() {
  if (!state || state.pveMode) return 1;
  const t = state.matchTime ?? 0;
  if (t < 80 * 60)  return 1;
  if (t >= 120 * 60) return 0;
  return 1 - (t - 80 * 60) / (40 * 60);
}

// ── Entry Cannon Visual ──────────────────────────────────────────────────────
function drawEntryCannons(ctx) {
  const cf = state.countdownFrame;
  for (const b of state.players) {
    if (!b._cannonEntry) continue;
    const bx = b._entrySpawnX, by = b._entrySpawnY;
    const angle = b._cannonAngle;
    const fired  = cf >= 180;
    const charge = Math.min(1, cf / 179); // 0→1 during "3","2","1"

    // Hide cannon body a few frames after firing (ball has left)
    if (fired && b._entryFlightFrames > 6) continue;

    ctx.save();
    ctx.translate(bx, by);

    // Charging glow
    if (!fired && charge > 0.05) {
      ctx.shadowColor = b.color;
      ctx.shadowBlur  = 6 + charge * 22;
    }

    // Barrel (rectangle pointing toward arena)
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = '#3a4455';
    ctx.beginPath();
    ctx.roundRect(4, -8, 34, 16, 4);
    ctx.fill();
    ctx.strokeStyle = '#6688aa';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Barrel ring at mouth
    ctx.beginPath();
    ctx.arc(38, 0, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#99bbcc';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Wheel base (circle)
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fillStyle = '#1e2235';
    ctx.fill();
    ctx.strokeStyle = '#445566';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Spokes
    for (let s = 0; s < 4; s++) {
      const a = s * Math.PI / 4;
      ctx.strokeStyle = '#445566';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * -13, Math.sin(a) * -13);
      ctx.lineTo(Math.cos(a) *  13, Math.sin(a) *  13);
      ctx.stroke();
    }

    // Ball sitting in barrel during 3-2-1 (pulsing)
    if (!fired) {
      const pulse = 0.88 + 0.12 * Math.sin(cf * 0.35);
      const bpx   = Math.cos(angle) * (10 + charge * 14);
      const bpy   = Math.sin(angle) * (10 + charge * 14);
      ctx.beginPath();
      ctx.arc(bpx, bpy, b.radius * (0.55 + charge * 0.25) * pulse, 0, Math.PI * 2);
      ctx.fillStyle   = b.color;
      ctx.globalAlpha = 0.55 + charge * 0.45;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Muzzle flash burst at fire moment (frames 180-184)
    if (fired && b._entryFlightFrames <= 4) {
      const t     = b._entryFlightFrames;
      const alpha = Math.max(0, 1 - t * 0.28);
      const len   = 28 + t * 14;
      const mx    = bx + Math.cos(angle) * 42;
      const my    = by + Math.sin(angle) * 42;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ffff99';
      ctx.lineWidth   = Math.max(1, 10 - t * 2.5);
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + Math.cos(angle) * len, my + Math.sin(angle) * len);
      ctx.stroke();
      // Side sparks
      const perpA = angle + Math.PI / 2;
      ctx.lineWidth = Math.max(1, 4 - t);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(angle + side * 0.5) * (len * 0.6),
                   my + Math.sin(angle + side * 0.5) * (len * 0.6));
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function renderCountdown() {
  const f = state.countdownFrame;
  const phase = Math.floor(f / 60);
  const labels = ['3', '2', '1', 'FIGHT!'];
  const colors = ['#ff6666', '#ffaa44', '#ffff44', '#66ff99'];
  if (phase >= labels.length) return;

  const frameInPhase = f % 60;
  const scale = 1 + Math.max(0, 0.55 * (1 - frameInPhase / 25));
  const alpha = frameInPhase < 8 ? frameInPhase / 8 :
                frameInPhase > 50 ? 1 - (frameInPhase - 50) / 10 : 1;

  ctx.save();
  if (phase < 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, 0, CW, CH);
  }
  const fontSize = phase === 3 ? 78 : 108;
  ctx.font = `900 ${Math.round(fontSize * scale)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.shadowColor = colors[phase];
  ctx.shadowBlur = 50;
  ctx.fillStyle = colors[phase];
  ctx.fillText(labels[phase], CW / 2, CH / 2);
  ctx.restore();
}

function updateHUD() {
  state.players.forEach((ball, i) => {
    const curHp = Math.max(0, Math.round(ball.hp));
    const maxHp = Math.round(ball.maxHp);
    const pct   = Math.max(0, curHp / maxHp * 100);
    const fill  = document.getElementById(`hud-hp-fill-${i}`);
    const val   = document.getElementById(`hud-hp-val-${i}`);
    const scale = document.getElementById(`hud-scale-${i}`);
    if (fill)  fill.style.width = pct + '%';
    if (val)   val.textContent  = `${curHp} / ${maxHp}`;
    if (scale) scale.textContent = ball.getScaleLabel();
  });
}

function updateTimerDisplay() {
  const el = document.getElementById('match-timer');
  const ov = document.getElementById('overtime-label');
  if (!el) return;
  const secs = Math.floor(state.matchTime / 60);
  const m    = Math.floor(secs / 60);
  const s    = String(secs % 60).padStart(2, '0');
  el.textContent = `${m}:${s}`;
  // Mode badge
  if (state.matchTime >= 80 * 60) {
    el.className = 'overtime'; // reuse red pulse style
    if (ov) { ov.textContent = 'RAGE'; ov.style.color = '#ff4400'; ov.style.display = ''; }
  } else if (state.matchTime >= 60 * 60) {
    el.className = '';
    if (ov) { ov.textContent = 'SPEED UP'; ov.style.color = '#ffcc00'; ov.style.display = ''; }
  } else {
    el.className = '';
    if (ov) ov.style.display = 'none';
  }
}

function updateBO3Display() {
  const bar = document.getElementById('bo3-score-bar');
  if (!bar) return;
  if (!state.bo3) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  const { wins, fighters, winsNeeded } = state.bo3;
  const needed = winsNeeded ?? 2;
  const f1 = fighters[0], f2 = fighters[1];
  document.getElementById('bo3-f1-name').textContent = f1?.charName ?? f1?.weaponId ?? '—';
  document.getElementById('bo3-f2-name').textContent = f2?.charName ?? f2?.weaponId ?? '—';
  document.getElementById('bo3-score').textContent = `${wins[0]} : ${wins[1]}`;
  // Win pips — dynamically render correct count based on winsNeeded
  ['bo3-pips','bo3-pips-r'].forEach((id, fi) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < needed; i++) {
      const span = document.createElement('span');
      if (i < wins[fi]) span.classList.add('won');
      el.appendChild(span);
    }
  });
}

// ── Skill trigger color by type ── (matches SKILL_DEFS .type values)
function _skillTriggerColor(type) {
  return { passive:'#e8c87a', pre_combat:'#c9902a', in_combat:'#cc3333', post_combat:'#6aaa44' }[type] ?? '#b8a070';
}

// ── Flash a skill badge on the fighter's HUD card ──
// Adds .glowing class to the badge → animation runs 1.5s → fades back to dim.
// Re-triggering before timeout = animation restarts (forceReflow trick).
// Call: flashSkillHUD(ball, skillDef)
function flashSkillHUD(ball, skillDef) {
  const idx = state.players.indexOf(ball);
  if (idx < 0) return;
  const container = document.getElementById(`hud-skills-${idx}`);
  if (!container) return;
  const badge = container.querySelector(`[data-skill-id="${skillDef.id}"]`);
  if (!badge) return;

  // Restart animation on re-trigger
  badge.classList.remove('glowing');
  void badge.offsetWidth; // force reflow so browser sees class was removed
  badge.classList.add('glowing');

  // Clear old timer, set new one (matches animation duration)
  if (badge._glowTimer) clearTimeout(badge._glowTimer);
  badge._glowTimer = setTimeout(() => {
    badge.classList.remove('glowing');
    badge._glowTimer = null;
  }, 1500);
}

function buildHUD() {
  const leftEl  = document.getElementById('hud-left');
  const rightEl = document.getElementById('hud-right');
  leftEl.innerHTML  = '';
  rightEl.innerHTML = '';

  state.players.forEach((ball, i) => {
    const def    = ball.weaponDef;
    const subLabel = ball.charSubrace?.label ?? '';
    const name   = ball.charName
      ? `${ball.charEmoji ?? ''} ${ball.charName}`
        + (subLabel ? ` <span style="font-size:0.72em;opacity:0.55;font-weight:normal">${subLabel}</span>` : '')
      : def.name;
    const wepSub = ball.charName ? `${def.icon} ${def.name}` : '';
    const maxHp  = Math.round(ball.maxHp);

    const card = document.createElement('div');
    card.className = 'hud-card';
    card.style.color = ball.color;
    card.innerHTML = `
      <div class="hud-card-top">
        <div class="hud-card-name" style="color:${ball.color}">
          ${name}
          ${wepSub ? `<span class="wep-sub">${wepSub}</span>` : ''}
        </div>
        <span class="hp-fraction" id="hud-hp-val-${i}">${maxHp} / ${maxHp}</span>
      </div>
      <div class="hp-track">
        <div class="hp-fill" id="hud-hp-fill-${i}"
             style="width:100%;background:${ball.color};box-shadow:0 0 6px ${ball.color}88;"></div>
      </div>
      <span class="hud-scale-tag" id="hud-scale-${i}">${ball.getScaleLabel()}</span>
    `;

    // ── Base stats row ──
    if (ball.charSTR !== null || ball.charSPD !== null) {
      const statsEl = document.createElement('div');
      statsEl.className = 'hud-stats-row';
      const statPairs = [
        ['STR', ball.charSTR], ['SPD', ball.charSPD], ['DUR', ball.charDUR],
        ['IQ',  ball.charIQ],  ['BIQ', ball.charBIQ], ['MA',  ball.charMA],
      ];
      statPairs.forEach(([k, v]) => {
        const cell = document.createElement('div');
        cell.className = 'hud-stat-cell';
        cell.innerHTML = `<span class="hud-sk">${k}</span><span class="hud-sv">${v ?? '—'}</span>`;
        statsEl.appendChild(cell);
      });
      card.appendChild(statsEl);
    }

    // ── Skill list — each skill on its own row with description ──
    const skillsEl = document.createElement('div');
    skillsEl.className = 'hud-skills';
    skillsEl.id = `hud-skills-${i}`;
    // Race skill first, then regular skills
    const raceSkillId = ball.raceSkillDef?.id ?? null;
    const regularIds  = (ball.skills ?? []).filter(sid => sid !== raceSkillId);
    const orderedIds  = raceSkillId ? [raceSkillId, ...regularIds] : regularIds;

    if (orderedIds.length && typeof SKILL_DEFS !== 'undefined') {
      orderedIds.forEach(sid => {
        const isRace = sid === raceSkillId;
        // Look up in SKILL_DEFS first, then RACE_SKILL_DEFS
        const def = SKILL_DEFS.find(s => s.id === sid)
          ?? (typeof RACE_SKILL_DEFS !== 'undefined'
              ? Object.values(RACE_SKILL_DEFS).find(s => s.id === sid)
              : null);
        if (!def) return;
        const item = document.createElement('div');
        item.className = 'hud-skill-item' + (isRace ? ' hud-skill-item-race' : '');
        const badge = document.createElement('span');
        badge.className = 'hud-skill-badge' + (isRace ? ' hud-skill-race' : (def.type === 'passive' ? ' always-active' : ''));
        badge.dataset.skillId = sid;
        if (!isRace) badge.style.setProperty('--skill-color', _skillTriggerColor(def.type));
        badge.textContent = def.name;
        item.appendChild(badge);
        if (def.desc) {
          const desc = document.createElement('div');
          desc.className = 'hud-skill-desc' + (isRace ? ' hud-skill-desc-race' : '');
          // God Gift: hiển thị desc riêng theo subrace thay vì toàn bộ danh sách
          const subLabel = ball.charSubrace?.label;
          desc.textContent = (isRace && def.descBySubrace && subLabel && def.descBySubrace[subLabel])
            ? def.descBySubrace[subLabel]
            : def.desc;
          item.appendChild(desc);
        }
        skillsEl.appendChild(item);
      });
    }
    card.appendChild(skillsEl);

    // In 2v2: team0 (idx 0,1) → left; team1 (idx 2,3) → right
    // In 1v1/FFA: even → left, odd → right
    const goLeft = state.matchMode === '2v2' ? (ball.teamId === 0 || i < 2) : (i % 2 === 0);
    (goLeft ? leftEl : rightEl).appendChild(card);
  });
}

// ============================================================
// HEAL ORBS — PVE healing pickups
// ============================================================

const HEAL_ORB_INTERVAL   = 1080; // frames between spawns (~18s)
const HEAL_ORB_MAX        = 3;    // max orbs on field at once
const HEAL_ORB_R          = 12;
const HEAL_ORB_HEAL_PCT   = 0.30; // restore 30% maxHp on pickup
let   _healOrbTimer       = 0;

function updateHealOrbs(players) {
  const orbs = state.healOrbs;

  // Spawn timer
  _healOrbTimer++;
  if (_healOrbTimer >= HEAL_ORB_INTERVAL && orbs.length < HEAL_ORB_MAX) {
    _healOrbTimer = 0;
    // Random position inside arena, avoiding center boss area
    let ox, oy, tries = 0;
    do {
      ox = 120 + Math.random() * (CW - 240);
      oy = 120 + Math.random() * (CH - 240);
      tries++;
    } while (Math.hypot(ox - CW/2, oy - CH/2) < 140 && tries < 20);
    orbs.push({ x: ox, y: oy, r: HEAL_ORB_R, life: 600 }); // 10s lifetime
  }

  // Age + pickup check
  for (let i = orbs.length - 1; i >= 0; i--) {
    const orb = orbs[i];
    orb.life--;
    if (orb.life <= 0) { orbs.splice(i, 1); continue; }

    for (const p of players) {
      if (!p.alive) continue;
      if (Math.hypot(p.x - orb.x, p.y - orb.y) < p.radius + orb.r) {
        const healed = p.maxHp * HEAL_ORB_HEAL_PCT;
        p.hp = Math.min(p.maxHp, p.hp + healed);
        spawnDamageNumber(orb.x, orb.y - 12, `+${Math.round(healed)}`, '#44ff88');
        spawnSparks(orb.x, orb.y, 10);
        orbs.splice(i, 1);
        break;
      }
    }
  }
}

function drawHealOrbs(ctx) {
  const orbs = state.healOrbs;
  if (!orbs.length) return;
  const t = Date.now() * 0.004;
  for (const orb of orbs) {
    const pulse  = 0.5 + 0.5 * Math.sin(t + orb.x * 0.01);
    const fadeIn = Math.min(1, (600 - orb.life < 30) ? (600 - orb.life) / 30 : 1);
    const fadeOut = orb.life < 60 ? orb.life / 60 : 1;
    const alpha  = fadeIn * fadeOut;
    ctx.save();
    ctx.globalAlpha = alpha;
    // Glow
    ctx.shadowColor = '#44ff88';
    ctx.shadowBlur  = 14 + 8 * pulse;
    // Outer ring
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r + 4 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(80,255,140,0.45)';
    ctx.lineWidth   = 2;
    ctx.stroke();
    // Core
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${60 + Math.floor(pulse * 40)},255,${120 + Math.floor(pulse * 60)},0.92)`;
    ctx.fill();
    ctx.shadowBlur = 0;
    // Cross icon
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(orb.x, orb.y - 5); ctx.lineTo(orb.x, orb.y + 5);
    ctx.moveTo(orb.x - 5, orb.y); ctx.lineTo(orb.x + 5, orb.y);
    ctx.stroke();
    ctx.restore();
  }
}
