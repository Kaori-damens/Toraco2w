// ============================================================
// MOB ENCOUNTER — Wave controller, spawn logic, modal UI
// ============================================================

// ── State ────────────────────────────────────────────────────
let _mobEnc = null;   // active encounter runtime state
let _mobSelFighters  = [];   // party selected in modal
let _mobSelEncounterId = null;

// ─────────────────────────────────────────────────────────────
// MODAL UI
// ─────────────────────────────────────────────────────────────

function showMobModal() {
  _mobSelFighters    = [];
  _mobSelEncounterId = null;
  _buildPartyGrid();
  _showMobStep(1);
  document.getElementById('mob-modal').style.display = 'flex';
}

function closeMobModal() {
  document.getElementById('mob-modal').style.display = 'none';
}

function _showMobStep(n) {
  document.getElementById('mob-step-1').style.display = n === 1 ? '' : 'none';
  document.getElementById('mob-step-2').style.display = n === 2 ? '' : 'none';
}

// ── Step 1: Party grid ────────────────────────────────────────
function _buildPartyGrid() {
  const grid = document.getElementById('mob-party-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!cgRoster.length) {
    grid.innerHTML = '<div class="mob-empty">No Radosers yet — create some first!</div>';
    return;
  }

  cgRoster.forEach((ch, i) => {
    const card = document.createElement('div');
    card.className  = 'mob-fighter-card';
    card.dataset.idx = i;
    card.style.setProperty('--fc', ch.color);

    // Mini ball canvas
    const canvas = document.createElement('canvas');
    canvas.width  = 48;
    canvas.height = 50;
    card.appendChild(canvas);

    const name = document.createElement('div');
    name.className   = 'mob-fc-name';
    name.textContent = (ch.name || '???').slice(0, 10);
    card.appendChild(name);

    card.addEventListener('click', () => {
      if (card.classList.contains('sel')) {
        card.classList.remove('sel');
      } else {
        if (_mobSelFighters.length >= 4) return; // max 4
        card.classList.add('sel');
      }
      _mobSelFighters = [...document.querySelectorAll('#mob-party-grid .mob-fighter-card.sel')]
        .map(c => rosterToFighter(cgRoster[+c.dataset.idx]));
      _updatePartyCount();
    });

    grid.appendChild(card);

    // Draw ball after DOM is painted
    requestAnimationFrame(() => _drawMobFighterBall(canvas, ch));
  });

  _updatePartyCount();
}

function _drawMobFighterBall(canvas, ch) {
  const ctx = canvas.getContext('2d');
  const cx = 24, cy = 32, r = 13;
  const color = ch.color || '#4d96ff';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save(); ctx.translate(cx, cy);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, r*0.9, r*0.78, r*0.24, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath(); ctx.ellipse(-r*0.28, -r*0.3, r*0.28, r*0.17, -Math.PI*0.3, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  if (typeof drawRaceDecoration === 'function' && ch.race) {
    const fake = {
      x: cx, y: cy, radius: r, vx: 0, vy: -1, color,
      charRace: ch.race, charSubrace: ch.subrace ?? null,
      _deco_fa: 0, alive: true,
      hitFlash:0, wallBoostFactor:1, evadeFrames:0, immunityFrames:0, projImmunityFrames:0,
    };
    drawRaceDecoration(ctx, fake);
  }
}

function _updatePartyCount() {
  const cnt = _mobSelFighters.length;
  const el  = document.getElementById('mob-party-count');
  if (el) el.textContent = `${cnt} / 4 selected`;
  const btn = document.getElementById('mob-next-btn');
  if (btn) btn.disabled = (cnt === 0);
}

// ── Step 2: Encounter grid ────────────────────────────────────
function _buildEncounterGrid() {
  const grid = document.getElementById('mob-encounter-grid');
  if (!grid) return;
  grid.innerHTML = '';
  _mobSelEncounterId = null;
  _renderEncounterDetail(null); // reset detail panel

  Object.values(ENCOUNTER_DEFS).forEach(enc => {
    const card = document.createElement('div');
    card.className     = 'mob-enc-card';
    card.dataset.encId = enc.id;

    const stars = '★'.repeat(enc.difficulty) + '☆'.repeat(5 - enc.difficulty);
    const waveLabel = enc.waves.length > 1 ? `${enc.waves.length} waves` : '1 phase';
    const mobTotal  = enc.waves.reduce((s, w) => s + w.mobs.reduce((ss, m) => ss + m.count, 0), 0);

    card.innerHTML = `
      <div class="mob-enc-icon">${enc.icon}</div>
      <div class="mob-enc-name">${enc.name}</div>
      <div class="mob-enc-diff">${stars}</div>
      <div class="mob-enc-desc">${enc.desc}</div>
      <div class="mob-enc-meta">${waveLabel} · ${mobTotal} enemies</div>`;

    card.addEventListener('click', () => {
      document.querySelectorAll('.mob-enc-card').forEach(c => c.classList.remove('sel'));
      card.classList.add('sel');
      _mobSelEncounterId = enc.id;
      const btn = document.getElementById('mob-fight-btn');
      if (btn) btn.disabled = false;
      _renderEncounterDetail(enc);
    });

    grid.appendChild(card);
  });

  const btn = document.getElementById('mob-fight-btn');
  if (btn) btn.disabled = true;
}

// ── Encounter detail panel ────────────────────────────────────
function _renderEncounterDetail(enc) {
  const el = document.getElementById('mob-enc-detail');
  if (!el) return;
  if (!enc) { el.style.display = 'none'; el.innerHTML = ''; return; }

  const toDrawList = []; // { cid, tpl }
  let cvCount = 0;

  function _mobMiniCard(templateKey, count) {
    const tpl = MOB_TEMPLATES[templateKey];
    if (!tpl) return '';
    const cid  = `mob-det-cv-${cvCount++}`;
    toDrawList.push({ cid, tpl });

    const wDisplay = tpl.weaponPool
      ? tpl.weaponPool.join(' / ')
      : (tpl.weaponId || 'fists');
    const s = tpl.charStats;
    const skillBadges = (tpl.skills || [])
      .map(sk => `<span class="mob-det-skill">${sk}</span>`).join('');

    // Phase Transition rows (Ishin only)
    let ptHtml = '';
    if (tpl.ptThresholds) {
      ptHtml = `<div class="mob-det-pt">
        <div class="mob-det-pt-title">⚡ Phase Transitions</div>
        <div class="mob-det-pt-row"><span class="mob-det-pt-pct">75%</span> Speed ×1.65 (6 giây)</div>
        <div class="mob-det-pt-row"><span class="mob-det-pt-pct">50%</span> Weapon cooldown ×0.6</div>
        <div class="mob-det-pt-row"><span class="mob-det-pt-pct">25%</span> Kích hoạt Berserker</div>
      </div>`;
    }

    return `<div class="mob-det-card">
      <div class="mob-det-card-head">
        <canvas id="${cid}" width="48" height="50" class="mob-det-canvas"></canvas>
        <div class="mob-det-card-info">
          <div class="mob-det-name">${tpl.displayName}${count > 1 ? `<span class="mob-det-count"> ×${count}</span>` : ''}</div>
          <div class="mob-det-weapon">🗡️ ${wDisplay}</div>
          ${skillBadges ? `<div class="mob-det-skills">${skillBadges}</div>` : ''}
        </div>
      </div>
      <div class="mob-det-stats">
        <div class="mob-det-stat"><span class="mob-det-slbl">STR</span><span class="mob-det-sval">${s.strength}</span></div>
        <div class="mob-det-stat"><span class="mob-det-slbl">SPD</span><span class="mob-det-sval">${s.speed}</span></div>
        <div class="mob-det-stat"><span class="mob-det-slbl">DUR</span><span class="mob-det-sval">${s.durability}</span></div>
        <div class="mob-det-stat"><span class="mob-det-slbl">IQ</span><span class="mob-det-sval">${s.iq}</span></div>
        <div class="mob-det-stat"><span class="mob-det-slbl">BIQ</span><span class="mob-det-sval">${s.battleiq}</span></div>
        <div class="mob-det-stat"><span class="mob-det-slbl">MA</span><span class="mob-det-sval">${s.ma}</span></div>
      </div>
      ${ptHtml}
    </div>`;
  }

  // Single boss (1 wave, 1 mob type, count 1) → dạng boss card đầy đủ
  const isSingleBoss = enc.waves.length === 1 &&
    enc.waves[0].mobs.length === 1 &&
    enc.waves[0].mobs[0].count === 1;

  let html = `<div class="mob-det-header">📋 Enemy Info</div>`;

  if (isSingleBoss) {
    const spec = enc.waves[0].mobs[0];
    html += _mobMiniCard(spec.template, 1);
  } else {
    for (const wave of enc.waves) {
      html += `<div class="mob-det-wave-label">${wave.label}</div>
               <div class="mob-det-wave-row">`;
      for (const spec of wave.mobs) {
        html += _mobMiniCard(spec.template, spec.count);
      }
      html += `</div>`;
    }
  }

  el.innerHTML = html;
  el.style.display = '';

  // Draw mini balls after DOM is painted
  requestAnimationFrame(() => {
    for (const { cid, tpl } of toDrawList) {
      const cv = document.getElementById(cid);
      if (cv) _drawMobFighterBall(cv, { color: tpl.color, race: tpl.race, subrace: null });
    }
  });
}

// ── Wire modal buttons (called once on DOMContentLoaded) ──────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mob-open-btn')
    ?.addEventListener('click', showMobModal);

  document.getElementById('mob-modal-x')
    ?.addEventListener('click', closeMobModal);

  document.getElementById('mob-cancel-btn')
    ?.addEventListener('click', closeMobModal);

  document.getElementById('mob-next-btn')?.addEventListener('click', () => {
    if (!_mobSelFighters.length) return;
    _buildEncounterGrid();
    _showMobStep(2);
  });

  document.getElementById('mob-back-btn')
    ?.addEventListener('click', () => _showMobStep(1));

  document.getElementById('mob-fight-btn')?.addEventListener('click', () => {
    if (!_mobSelEncounterId || !_mobSelFighters.length) return;
    closeMobModal();
    startMobEncounter(_mobSelEncounterId, _mobSelFighters);
  });

  document.getElementById('mob-result-menu-btn')
    ?.addEventListener('click', () => {
      document.getElementById('mob-result-overlay').style.display = 'none';
      showScreen('menu');
    });
});

// ─────────────────────────────────────────────────────────────
// GAME LOGIC
// ─────────────────────────────────────────────────────────────

function startMobEncounter(encounterId, partyFighters) {
  const def = ENCOUNTER_DEFS[encounterId];
  if (!def) return;

  // ── Configure state ───────────────────────────────────────
  state.matchMode    = 'mob';
  state.pveMode      = false;
  state.boss         = null;
  state.tournament   = null;
  state.tournament2v2 = null;
  state.championship = null;
  state.bo3          = null;
  state.teamIds      = [];
  state.fighters     = partyFighters;
  state.arenaId      = _pickMobArena();

  // ── Init game (creates radoser Ball instances) ────────────
  initGame();
  applyArenaFit(state.arena);

  // Tag player balls + assign team 0
  for (const b of state.players) {
    b.isPlayer = true;
    b.teamId   = 0;
  }

  // ── Encounter runtime state ───────────────────────────────
  _mobEnc = state.mobEncounter = {
    id:               encounterId,
    waveIdx:          0,
    currentWaveBalls: [],
    playerBalls:      [...state.players],
    _waveTransition:  false,
  };

  // ── Spawn wave 0 (during countdown — mobs wait in position) ──
  _spawnWave(def.waves[0]);

  // ── Start loop ────────────────────────────────────────────
  showScreen('game');
  state.running = true;
  state.paused  = false;
  _lastRafTime  = null;
  _accumulator  = 0;
  if (typeof rafId !== 'undefined' && rafId) cancelAnimationFrame(rafId);
  requestAnimationFrame(gameLoop);

  if (typeof initAudience        === 'function') initAudience();
  if (typeof startAudienceChatter === 'function') startAudienceChatter();
}

// ── Arena picker ──────────────────────────────────────────────
function _pickMobArena() {
  const pool = ['med_square','sm_square','lg_square','med_circle','sm_circle'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Wave spawning ─────────────────────────────────────────────
function _spawnWave(waveDef) {
  const enc   = _mobEnc;
  const arena = state.arena;
  const totalMobs = waveDef.mobs.reduce((s, m) => s + m.count, 0);
  const positions = _mobSpawnPositions(totalMobs, arena);

  const newBalls = [];
  let posIdx = 0;

  for (const spec of waveDef.mobs) {
    const tpl = MOB_TEMPLATES[spec.template];
    if (!tpl) continue;

    for (let i = 0; i < spec.count; i++) {
      const pos = positions[posIdx++] ?? positions[0];

      // Weapon
      let wId = tpl.weaponId;
      if (!wId && tpl.weaponPool) {
        wId = tpl.weaponPool[Math.floor(Math.random() * tpl.weaponPool.length)];
      }

      // charStats — full object Ball expects
      const charStats = {
        race:     tpl.race,
        subrace:  null,
        strength:   tpl.charStats.strength,
        speed:      tpl.charStats.speed,
        durability: tpl.charStats.durability,
        iq:         tpl.charStats.iq,
        battleiq:   tpl.charStats.battleiq,
        ma:         tpl.charStats.ma,
      };

      const color = _varyColor(tpl.color, posIdx * 23);
      const ball  = new Ball(pos.x, pos.y, color, wId, 'right', charStats, 1 /*teamId*/);

      ball.isMob    = true;
      ball.teamId   = 1;
      ball.radius   = tpl.radius;
      ball.skills   = [...tpl.skills];
      ball.charName = tpl.displayName;
      ball.charEmoji = tpl.race === 'goblin' ? '👺' : '🧑';

      // Ishin PT state
      if (spec.template === 'ishin') {
        ball._ptTriggered = [false, false, false];
        ball._isMobIshin  = true;
      }

      // Apply passive skills & init round skill state
      if (typeof applySkillPassives   === 'function') applySkillPassives(ball, { charStats, skills: ball.skills });
      if (typeof initRoundSkillState  === 'function') initRoundSkillState(ball);
      if (typeof initRaceSkillState   === 'function') initRaceSkillState(ball);

      // If wave is spawning mid-fight (wave > 0), fire pre-combat skills
      if (enc.waveIdx > 0 && typeof skillOnPreCombat === 'function') skillOnPreCombat(ball);

      // Launch toward arena center
      const cx = _arenaCenter(arena).x;
      const cy = _arenaCenter(arena).y;
      const angle = Math.atan2(cy - pos.y, cx - pos.x) + (Math.random() - 0.5) * 0.8;
      ball.vx = Math.cos(angle) * (3 + Math.random() * 2);
      ball.vy = Math.sin(angle) * (3 + Math.random() * 2);
      // For cannon entry during countdown, set launch vectors too
      ball._cannonEntry = false; // mobs don't use cannon cinematic
      ball._launchVx    = ball.vx;
      ball._launchVy    = ball.vy;

      state.players.push(ball);
      newBalls.push(ball);
    }
  }

  enc.currentWaveBalls = newBalls;

  // Wave announcement (mid-fight waves only)
  if (enc.waveIdx > 0) _waveAnnounce(waveDef.label);
}

function _mobSpawnPositions(count, arena) {
  const { x: ax, y: ay, w: aw, h: ah } = _arenaRect(arena);
  // Spawn on the right 25% band, spread vertically
  const spawnX = ax + aw * 0.72;
  const topY   = ay + ah * 0.18;
  const botY   = ay + ah * 0.82;
  const positions = [];
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0.5;
    positions.push({
      x: spawnX + (Math.random() - 0.5) * 55,
      y: topY + t * (botY - topY) + (Math.random() - 0.5) * 28,
    });
  }
  return positions;
}

function _arenaCenter(arena) {
  if (arena.cx !== undefined) return { x: arena.cx, y: arena.cy };
  return { x: arena.x + arena.w / 2, y: arena.y + arena.h / 2 };
}

function _arenaRect(arena) {
  if (arena.type === 'circle' || arena.type === 'hole_ci') {
    return { x: arena.cx - arena.r, y: arena.cy - arena.r, w: arena.r*2, h: arena.r*2 };
  }
  return { x: arena.x, y: arena.y, w: arena.w, h: arena.h };
}

function _varyColor(hex, seed) {
  let h = 0;
  for (let i = 0; i < hex.length; i++) h = (h * 31 + hex.charCodeAt(i) * (seed + 1)) & 0xffff;
  const delta = (h % 18) - 9;
  const clamp = v => Math.max(0, Math.min(255, v + delta));
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return '#' + [clamp(r),clamp(g),clamp(b)].map(v => v.toString(16).padStart(2,'0')).join('');
}

function _waveAnnounce(label) {
  // Use in-canvas big text if available
  if (typeof spawnBigAnnouncement === 'function') {
    spawnBigAnnouncement(label, '#ff8844', 180);
  }
}

// ── Win condition check — called from game-loop.js each step ──
function mobEncounterCheckWin(alive) {
  const enc = state.mobEncounter;
  if (!enc || state.ended || enc._waveTransition) return;

  const playerAlive = alive.filter(b => b.isPlayer);
  const mobAlive    = alive.filter(b => b.isMob);

  // PT skill checks for Ishin
  for (const mob of enc.currentWaveBalls) {
    if (mob._isMobIshin && mob.alive) _checkIshinPT(mob);
  }

  // Defeat: all radosers dead
  if (playerAlive.length === 0) {
    state.ended  = true;
    state.running = false;
    if (typeof stopAudienceChatter === 'function') stopAudienceChatter();
    setTimeout(() => _showMobResult(false), 1300);
    return;
  }

  // Wave cleared
  if (mobAlive.length === 0 && enc.currentWaveBalls.length > 0) {
    enc._waveTransition = true;
    const def      = ENCOUNTER_DEFS[enc.id];
    const nextIdx  = enc.waveIdx + 1;

    if (nextIdx >= def.waves.length) {
      // All waves done — VICTORY
      state.ended  = true;
      state.running = false;
      if (typeof stopAudienceChatter === 'function') stopAudienceChatter();
      setTimeout(() => _showMobResult(true), 1500);
    } else {
      // Spawn next wave after a short breather
      setTimeout(() => {
        enc.waveIdx = nextIdx;
        enc._waveTransition = false;
        _spawnWave(def.waves[nextIdx]);
      }, 2500);
    }
  }
}

// ── Ishin Phase Transitions ───────────────────────────────────
function _checkIshinPT(ball) {
  const pct = ball.hp / ball.maxHp;
  const thr = MOB_TEMPLATES.ishin.ptThresholds;

  if (!ball._ptTriggered[0] && pct <= thr[0]) {
    ball._ptTriggered[0] = true;
    ball.speechText   = 'First stance...';
    ball.speechFrames = 130;
    // PT1 — Speed burst (6 s)
    const origMax = ball.maxSpeed ?? 20;
    ball.maxSpeed = origMax * 1.65;
    setTimeout(() => { ball.maxSpeed = origMax; }, 6000);
  }

  if (!ball._ptTriggered[1] && pct <= thr[1]) {
    ball._ptTriggered[1] = true;
    ball.speechText   = 'Second stance...';
    ball.speechFrames = 130;
    // PT2 — Weapon cooldown cut
    if (ball.weapon) ball.weapon.cooldown = Math.floor((ball.weapon.cooldown ?? 30) * 0.6);
  }

  if (!ball._ptTriggered[2] && pct <= thr[2]) {
    ball._ptTriggered[2] = true;
    ball.speechText   = 'This ends now.';
    ball.speechFrames = 160;
    // PT3 — Add berserker
    if (!ball.skills.includes('berserker')) {
      ball.skills.push('berserker');
      if (typeof initRoundSkillState === 'function') initRoundSkillState(ball);
    }
  }
}

// ── Result overlay ────────────────────────────────────────────
function _showMobResult(victory) {
  const enc = state.mobEncounter;
  const def = enc ? ENCOUNTER_DEFS[enc.id] : null;

  stopGame();
  showScreen('result'); // go to result screen but...
  // Actually use our own overlay for mob results
  showScreen('menu');

  const overlay = document.getElementById('mob-result-overlay');
  const titleEl = document.getElementById('mob-result-title');
  const descEl  = document.getElementById('mob-result-desc');
  if (!overlay) return;

  if (victory) {
    titleEl.textContent = '✅ Encounter Cleared!';
    titleEl.style.color = '#44ff88';
    descEl.textContent  = def ? `You defeated: ${def.name}` : 'All enemies defeated!';
  } else {
    titleEl.textContent = '💀 Defeated...';
    titleEl.style.color = '#ff4455';
    descEl.textContent  = def ? `You were overwhelmed by: ${def.name}` : 'All Radosers fell.';
  }

  overlay.style.display = 'flex';
  state.mobEncounter = null;
  _mobEnc = null;
}
