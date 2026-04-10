// ============================================================
// GAME LOOP
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let rafId = null;

function gameLoop() {
  if (!state.running) return;
  rafId = requestAnimationFrame(gameLoop);

  if (state.phase === 'countdown') {
    state.countdownFrame++;
    // 4 phases × 60f: "3" (0–59), "2" (60–119), "1" (120–179), "FIGHT!" (180–239)
    const cf = state.countdownFrame;
    const ENTRY_FRAMES = 180; // balls travel during "3","2","1", then freeze at "FIGHT!"

    // Animate entry: ease-out (sin curve)
    for (const b of state.players) {
      if (b._targetX == null) continue;
      if (cf <= ENTRY_FRAMES) {
        const t = Math.sin((cf / ENTRY_FRAMES) * Math.PI / 2); // 0→1 ease-out
        b.x = b._entrySpawnX + (b._targetX - b._entrySpawnX) * t;
        b.y = b._entrySpawnY + (b._targetY - b._entrySpawnY) * t;
      } else {
        b.x = b._targetX;
        b.y = b._targetY;
      }
    }

    if (cf >= 240) {
      state.phase = 'playing';
      for (const b of state.players) {
        if (b._targetX != null) { b.x = b._targetX; b.y = b._targetY; }
        b.vx = b._launchVx || 0;
        b.vy = b._launchVy || 0;
        skillOnPreCombat(b);
      }
    }
  } else if (!state.paused && !state.ended) {
    for (let s = 0; s < state.speed; s++) step();
    state.matchTime += state.speed;
  }

  render();
  updateHUD();
  updateTimerDisplay();
}

function step() {
  state.frame++;
  const players = state.players;

  // Update each ball — pass nearest alive enemy for targeting/firing
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

  // Update projectiles
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    state.projectiles[i].update(state.arena);
    if (!state.projectiles[i].alive) state.projectiles.splice(i, 1);
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

  updateParticles();

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

  // ── Speed Floor: after 60s → +5% maxSpd every 10s ──
  if (state.matchTime >= 60 * 60) {
    const steps = Math.floor((state.matchTime - 60 * 60) / (10 * 60));
    const mult  = 1 + steps * 0.05;
    for (const b of players) b.maxSpd = b.baseMaxSpd * mult;
  }

  // ── Milestone announcements (one-shot) ──
  if (!state.speedFloorActive && state.matchTime >= 60 * 60) {
    state.speedFloorActive = true;
    spawnBigAnnouncement('SPEED UP!', '#ffcc00');
  }
  if (!state.rageModeActive && state.matchTime >= 80 * 60) {
    state.rageModeActive = true;
    spawnBigAnnouncement('RAGE MODE!', '#ff4400');
  }

  // ── God Time Loss: after 1m46s (6360 frames), god auto-loses vs non-demon/non-god ──
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


  // Check game end
  const alive = players.filter(b => b.alive);

  if (state.pveMode) {
    // PVE lose: all players dead (boss win is triggered by Boss.die())
    if (!state.ended && alive.length === 0) {
      state.ended   = true;
      state.running = false;
      setTimeout(() => showPVEResult(false), 1200);
    }
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
        setTimeout(() => showResult(), 1200);
      }
    }
  }
}

function render() {
  ctx.clearRect(0, 0, CW, CH);
  // Background — use map bg color in PVE
  ctx.fillStyle = (state.pveMode && state.mapDef?.bgColor) ? state.mapDef.bgColor : '#080818';
  ctx.fillRect(0, 0, CW, CH);

  drawArena(ctx, state.arena);

  // PvP traps — drawn below balls
  if (!state.pveMode && state.trapObjects?.length) {
    drawTraps(ctx, state.trapObjects, state.frame);
  }

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

  // Draw heal orbs (PVE)
  if (state.pveMode) drawHealOrbs(ctx);

  // Draw boss (PVE)
  if (state.boss) state.boss.draw(ctx);

  // PVE terrain — hazard/slow overlays above everything
  if (state.pveMode && state.terrainObjects?.length) {
    drawTerrainAbove(ctx, state.terrainObjects, state.frame);
  }

  drawParticles(ctx);

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
  if (state.matchTime >= 80 * 60 && !state.ended) {
    const a = 0.04 + 0.03 * Math.sin(state.matchTime * 0.15);
    ctx.save(); ctx.fillStyle = `rgba(255,50,0,${a})`; ctx.fillRect(0,0,CW,CH); ctx.restore();
  }
  // Big announcements
  updateDrawBigAnnouncements(ctx);
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
        badge.textContent = `${def.icon ?? '✦'} ${def.name}`;
        item.appendChild(badge);
        if (def.desc) {
          const desc = document.createElement('div');
          desc.className = 'hud-skill-desc' + (isRace ? ' hud-skill-desc-race' : '');
          desc.textContent = def.desc;
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
