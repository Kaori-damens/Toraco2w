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
    if (state.countdownFrame >= 240) {
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

  render();
  updateHUD();
  updateTimerDisplay();
}

function step() {
  state.frame++;
  const players = state.players;

  // Update each ball — pass nearest alive enemy for targeting/firing
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

  // Projectiles vs all balls
  resolveProjectiles(players, state.projectiles);

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


  // Check game end
  const alive = players.filter(b => b.alive);
  if (!state.ended && players.length > 1) {
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
  // Background
  ctx.fillStyle = '#080818';
  ctx.fillRect(0, 0, CW, CH);

  drawArena(ctx, state.arena);

  // Draw weapons behind balls
  for (const b of state.players) b.drawWeapon(ctx);

  // Draw projectiles
  for (const p of state.projectiles) p.draw(ctx);

  // Draw balls
  for (const b of state.players) b.draw(ctx);

  drawParticles(ctx);

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
    const name   = ball.charName
      ? `${ball.charEmoji ?? ''} ${ball.charName}`
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

    // Skill badges — dim by default, glow on trigger via flashSkillHUD()
    const skillsEl = document.createElement('div');
    skillsEl.className = 'hud-skills';
    skillsEl.id = `hud-skills-${i}`;
    if (ball.skills?.length && typeof SKILL_DEFS !== 'undefined') {
      ball.skills.forEach(sid => {
        const def = SKILL_DEFS.find(s => s.id === sid);
        if (!def) return;
        const badge = document.createElement('span');
        badge.className = 'hud-skill-badge' + (def.type === 'passive' ? ' always-active' : '');
        badge.dataset.skillId = sid;
        badge.style.setProperty('--skill-color', _skillTriggerColor(def.type));
        badge.title = def.desc || '';
        badge.textContent = `${def.icon ?? '✦'} ${def.name}`;
        skillsEl.appendChild(badge);
      });
    }
    card.appendChild(skillsEl);

    // In 2v2: team0 (idx 0,1) → left; team1 (idx 2,3) → right
    // In 1v1/FFA: even → left, odd → right
    const goLeft = state.matchMode === '2v2' ? (ball.teamId === 0 || i < 2) : (i % 2 === 0);
    (goLeft ? leftEl : rightEl).appendChild(card);
  });
}
