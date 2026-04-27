// ============================================================
// PVE MODE — Setup, Hit Resolution, Result
// ============================================================

// ── UI Init ──────────────────────────────────────────────────

function initPVEUI() {
  const panel = document.getElementById('pve-fighters-panel');
  if (!panel) return;
  panel.innerHTML = '';

  if (cgRoster.length === 0) {
    panel.innerHTML = '<div class="pve-empty">No Radosers yet — create some first!</div>';
    return;
  }

  cgRoster.forEach((ch, i) => {
    const btn = document.createElement('button');
    btn.className    = 'pve-fighter-btn';
    btn.dataset.idx  = i;
    btn.style.borderColor = ch.color + '88';

    const dot = document.createElement('span');
    dot.className = 'pve-fighter-dot';
    dot.style.background = ch.color;

    const label = document.createElement('span');
    label.textContent = `${ch.raceEmoji ?? '⚪'} ${ch.name}`;

    btn.appendChild(dot);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      const alreadySel = document.querySelectorAll('.pve-fighter-btn.sel').length;
      if (!btn.classList.contains('sel') && alreadySel >= 8) return; // max 8
      btn.classList.toggle('sel');
      _updatePVECount();
    });
    panel.appendChild(btn);
  });

  _updatePVECount();
}

function _updatePVECount() {
  const sel  = document.querySelectorAll('.pve-fighter-btn.sel').length;
  const info = document.getElementById('pve-fighter-count');
  if (info) info.textContent = `${sel} / 8 selected`;
  const btn  = document.getElementById('pveStartBtn');
  if (btn) btn.disabled = (sel === 0);
}

// ── Start PVE ────────────────────────────────────────────────

function startPVE() {
  const selectedBtns = document.querySelectorAll('.pve-fighter-btn.sel');
  if (selectedBtns.length === 0) return;

  // Build fighters list from selected roster entries
  const fighters = [];
  selectedBtns.forEach(btn => {
    const idx = parseInt(btn.dataset.idx);
    fighters.push(rosterToFighter(cgRoster[idx]));
  });

  // Read boss & map selection
  const bossId = document.getElementById('pve-boss-select')?.value ?? 'thunderfang';
  const mapId  = document.getElementById('pve-map-select')?.value  ?? 'thunderstorm_peak';
  const mapDef = (typeof PVE_MAPS !== 'undefined' && PVE_MAPS[mapId]) ? PVE_MAPS[mapId] : null;

  // Configure state for PVE
  state.pveMode        = true;
  state.fighters       = fighters;
  state.matchMode      = 'pve';
  state.teamIds        = [];
  state.bo3            = null;
  state.tournament     = null;
  state.bossId         = bossId;
  state.mapId          = mapId;
  state.mapDef         = mapDef;
  // Deep-clone terrain so runtime mutations don't corrupt the template
  state.terrainObjects = mapDef
    ? JSON.parse(JSON.stringify(mapDef.terrain))
    : [];
  state.healOrbs = [];

  // Use large_square so applyArenaFit clips canvas to ~930×930 (covers full boss range)
  // Terrain is handled by maps.js, not by arena collision
  state.arenaId = 'large_square';

  // Create balls (don't use startGame — it would start the loop before boss is ready)
  initGame();
  applyArenaFit(state.arena);   // ← fit canvas so HUD panels can center properly

  // No friendly fire: all players same team
  for (const b of state.players) b.teamId = 0;

  // Spawn boss
  state.boss = _createBoss(bossId, fighters.length);

  // Redirect launch velocity toward boss
  for (const b of state.players) {
    const dx = state.boss.x - b.x;
    const dy = state.boss.y - b.y;
    const d  = Math.hypot(dx, dy) || 1;
    b._launchVx = (dx / d) * 3;
    b._launchVy = (dy / d) * 3;
  }

  // Show game screen + start loop
  showScreen('game');
  state.running = true;
  state.paused  = false;
  if (typeof rafId !== 'undefined' && rafId) cancelAnimationFrame(rafId);
  requestAnimationFrame(gameLoop);
}

// Boss factory — returns the right boss instance based on bossId
function _createBoss(bossId, playerCount) {
  const cfg = { playerCount };
  switch (bossId) {
    case 'krag':   return new BossKrag(cfg);
    case 'vael':   return new BossVael(cfg);
    case 'ignar':    return new BossIgnar(cfg);
    case 'syvara':   return new BossSyvara(cfg);
    case 'molthrex': return new BossMolthrex(cfg);
    case 'maddox':   return new BossMaddox(cfg);
    case 'grakk':    return new BossGrakk(cfg);
    default:
      return new Boss(cfg); // Thunderfang
  }
}

// ── Damage Resolution ─────────────────────────────────────────

// Call this every step after resolveProjectiles()
function resolveBossProjectileHits(boss, projectiles) {
  if (!boss || !boss.alive) return;

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    if (!proj.alive) continue;

    const partKey = boss.checkHit(proj.x, proj.y, proj.r ?? 4);
    if (!partKey) continue;

    // Roll crit + apply rage multiplier (same as resolveProjectiles)
    const owner     = proj.owner;
    const isCrit    = owner ? (Math.random() < (owner.critChance ?? 0)) : false;
    const rageMult  = (state.matchTime >= 80 * 60) ? 1.5 : 1.0;
    const baseDmg   = (proj.damage ?? 10) * rageMult;

    const result = boss.takeDamage(baseDmg, partKey, { crit: isCrit });
    const pp     = boss.getPartPos(partKey);

    spawnDamageNumber(
      pp.x, pp.y - pp.r - 8,
      Math.round(result.finalAmount),
      result.crit ? '#ffff44' : '#ffffff'
    );

    if (owner) {
      owner.stats             = owner.stats || {};
      owner.stats.hits        = (owner.stats.hits ?? 0) + 1;
      owner.stats.damageDone  = (owner.stats.damageDone ?? 0) + result.finalAmount;
      // Trigger weapon scaling (same as resolveProjectiles line 181)
      owner.weaponDef?.onHit?.(owner.weapon);
    }

    proj.alive = false;
    spawnSparks(proj.x, proj.y, 5);
    sfxHit?.();
  }
}

// Call this every step — melee weapon hit points vs boss parts
function resolveBossMeleeHits(boss, players) {
  if (!boss || !boss.alive) return;

  for (const ball of players) {
    if (!ball.alive) continue;

    // Use the weapon's own cooldown (same gate as _checkWeaponHit in collision.js)
    if ((ball.weapon?.cooldown ?? 0) > 0) continue;

    // Ranged weapons don't melee-hit
    if (ball.weaponDef?.aiType === 'ranged') continue;

    const hitPts = ball.weaponDef?.getHitPoints?.(ball) ?? [];
    if (!hitPts.length) continue;

    for (const pt of hitPts) {
      const partKey = boss.checkHit(pt.x, pt.y, pt.r ?? 5);
      if (!partKey) continue;

      // Crit roll (same as _checkWeaponHit)
      const isCrit  = Math.random() < (ball.critChance ?? 0);
      // Base damage without crit — boss.takeDamage applies crit multiplier
      const baseDmg = ball.getDamage?.() ?? 10;
      const result  = boss.takeDamage(baseDmg, partKey, { crit: isCrit });
      const pp      = boss.getPartPos(partKey);

      spawnDamageNumber(
        pp.x, pp.y - pp.r - 8,
        Math.round(result.finalAmount),
        result.crit ? '#ffff44' : '#aaddff'
      );

      ball.stats             = ball.stats || {};
      ball.stats.hits        = (ball.stats.hits ?? 0) + 1;
      ball.stats.damageDone  = (ball.stats.damageDone ?? 0) + result.finalAmount;

      // Set weapon attack cooldown — prevents spam, enables weapon scaling timing
      const rageCDMult = (state.matchTime >= 80 * 60) ? 0.7 : 1.0;
      ball.weapon.cooldown = Math.max(1, Math.floor((ball.weapon.attackCooldown ?? 20) * rageCDMult));

      // Trigger weapon scaling callback (shuriken stacks, scythe stacks, etc.)
      ball.weaponDef?.onHit?.(ball.weapon);

      sfxHit?.();
      spawnSparks(pt.x, pt.y, 4);
      break; // one part per ball per frame
    }
  }
}

// Ball ↔ boss body collision — push balls out of boss parts + bounce
function resolveBossBodyCollision(boss, players) {
  if (!boss || !boss.alive) return;

  for (const ball of players) {
    if (!ball.alive) continue;

    // Find the boss part with the deepest penetration into this ball
    let deepestKey = null, deepestPen = 0;
    for (const key of boss.getAllHitParts()) {
      const p   = boss.getPartPos(key);
      const pen = ball.radius + p.r - Math.hypot(ball.x - p.x, ball.y - p.y);
      if (pen > 0 && pen > deepestPen) { deepestPen = pen; deepestKey = key; }
    }
    if (!deepestKey) continue;

    const p    = boss.getPartPos(deepestKey);
    const dx   = ball.x - p.x;
    const dy   = ball.y - p.y;
    const dist = Math.hypot(dx, dy) || 0.01;
    const nx   = dx / dist;
    const ny   = dy / dist;

    // Separate the ball out of the boss part (push 60% on ball, 40% on boss)
    ball.x += nx * deepestPen * 0.6;
    ball.y += ny * deepestPen * 0.6;
    boss.x -= nx * deepestPen * 0.4;
    boss.y -= ny * deepestPen * 0.4;

    // Elastic bounce — reflect ball velocity along collision normal
    const dot = ball.vx * nx + ball.vy * ny;
    if (dot < 0) {
      const e = 1.5; // restitution
      ball.vx -= e * dot * nx;
      ball.vy -= e * dot * ny;
    }

    // Transfer a little momentum to boss (boss is heavy)
    const mass = 0.3;
    boss.vx += nx * Math.abs(dot) * mass;
    boss.vy += ny * Math.abs(dot) * mass;
  }
}

// ── Grakk: update goblin swarm each step ────────────────────
function resolveGoblinAttacks(boss, players) {
  if (!boss || !(boss instanceof BossGrakk) || !boss.alive) return;
  boss.updateGoblins(players);
}

// ── Grakk: projectile hits on goblins ────────────────────────
function resolveGoblinHits(boss, projectiles) {
  if (!boss || !(boss instanceof BossGrakk) || !boss.alive) return;
  boss.resolveProjectileHitsOnGoblins(projectiles);
}

// ── Syvara: player projectiles hit void anchors ──────────────
function resolveAnchorHits(boss, projectiles) {
  if (!boss || !boss.alive) return;
  const anchors = state.terrainObjects.filter(t => t.type === 'VOID_ANCHOR' && !t.destroyed);
  if (!anchors.length) return;
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    if (!proj.alive) continue;
    for (const anchor of anchors) {
      const d = Math.hypot(proj.x - anchor.x, proj.y - anchor.y);
      if (d < anchor.r + (proj.r ?? 4)) {
        anchor.hp = (anchor.hp ?? 100) - (proj.damage ?? 10);
        proj.alive = false;
        spawnSparks(anchor.x, anchor.y, 8);
        if (anchor.hp <= 0) {
          anchor.destroyed = true;
          spawnSparks(anchor.x, anchor.y, 20);
          spawnBigAnnouncement('🌀 VOID ANCHOR DESTROYED!', '#cc44ff');
        }
        break;
      }
    }
  }
}

// ── Result ───────────────────────────────────────────────────

function _calcPVERating(won, timeSec, survivorsCount, totalPlayers, totalDmg) {
  if (!won) return { grade: 'D', color: '#cc4444', label: 'Defeated' };
  if (survivorsCount === totalPlayers && timeSec < 90)  return { grade: 'S', color: '#ffdd00', label: 'Flawless' };
  if (survivorsCount >= Math.ceil(totalPlayers * 0.75) && timeSec < 180) return { grade: 'A', color: '#88ff44', label: 'Excellent' };
  if (survivorsCount > 0 && timeSec < 300) return { grade: 'B', color: '#44aaff', label: 'Good' };
  if (won && timeSec < 480)               return { grade: 'C', color: '#ffaa44', label: 'Clear' };
  return { grade: 'C', color: '#ffaa44', label: 'Barely' };
}

function showPVEResult(won) {
  if (state.ended) return;
  state.ended   = true;
  state.running = false;

  const overlay = document.getElementById('pve-result-overlay');
  if (!overlay) return;

  const bossName = (typeof BOSS_DISPLAY_NAMES !== 'undefined' && BOSS_DISPLAY_NAMES[state.bossId])
    ? BOSS_DISPLAY_NAMES[state.bossId]
    : 'The Boss';

  // ── Stats calculation ──
  const timeSec        = Math.floor((state.matchTime || 0) / 60);
  const minutes        = Math.floor(timeSec / 60);
  const seconds        = timeSec % 60;
  const timeStr        = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const totalPlayers   = state.players.length;
  const survivors      = state.players.filter(p => p.alive);
  const totalDmg       = state.players.reduce((s, p) => s + (p.stats?.damageDone ?? 0), 0);
  const rating         = _calcPVERating(won, timeSec, survivors.length, totalPlayers, totalDmg);

  // ── Build player rows ──
  const playerRowsHtml = state.players.map(p => {
    const dmg  = Math.round(p.stats?.damageDone ?? 0);
    const name = p.charName ? `${p.charEmoji ?? ''} ${p.charName}` : (p.weaponDef?.name ?? 'Fighter');
    const icon = p.alive ? '✅' : '💀';
    return `<tr>
      <td>${icon} <span style="color:${p.color ?? '#fff'}">${name}</span></td>
      <td>${dmg.toLocaleString()}</td>
      <td style="color:${p.alive ? '#88ff88' : '#ff6666'}">${p.alive ? 'Alive' : 'Fallen'}</td>
    </tr>`;
  }).join('');

  // ── Fill overlay ──
  overlay.querySelector('#pve-result-title').textContent = won ? '⚡ VICTORY!' : '💀 DEFEATED';
  overlay.querySelector('#pve-result-title').style.color  = won ? '#ffcc00' : '#cc4444';
  overlay.querySelector('#pve-result-sub').textContent    = won
    ? `${bossName} has been slain! The realm is safe… for now.`
    : `Your party has been wiped out. ${bossName} lives on.`;

  const statsEl = document.getElementById('pve-result-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="pve-stat-rating" style="color:${rating.color}">
        <span class="pve-stat-grade">${rating.grade}</span>
        <span class="pve-stat-grade-label">${rating.label}</span>
      </div>
      <div class="pve-stat-row"><span>🕐 Time</span><span>${timeStr}</span></div>
      <div class="pve-stat-row"><span>👥 Survivors</span><span>${survivors.length} / ${totalPlayers}</span></div>
      <div class="pve-stat-row"><span>💥 Total Damage</span><span>${Math.round(totalDmg).toLocaleString()}</span></div>
      <table class="pve-stat-table">
        <thead><tr><th>Fighter</th><th>Damage</th><th>Status</th></tr></thead>
        <tbody>${playerRowsHtml}</tbody>
      </table>
    `;
  }

  overlay.style.display = 'flex';
}

function closePVEResult() {
  const overlay = document.getElementById('pve-result-overlay');
  if (overlay) overlay.style.display = 'none';

  state.boss           = null;
  state.pveMode        = false;
  state.bossId         = null;
  state.mapId          = null;
  state.mapDef         = null;
  state.terrainObjects = [];
  state.healOrbs       = [];

  showScreen('menu');
  // Switch to Battle tab
  document.querySelector('[data-tab="tab-battle"]')?.click();
}

// ── Boss preview updater ──────────────────────────────────────
function _updatePVEBossPreview() {
  const sel = document.getElementById('pve-boss-select');
  const box = document.getElementById('pve-boss-preview');
  if (!sel || !box) return;
  const info = (typeof BOSS_PREVIEW_INFO !== 'undefined') ? BOSS_PREVIEW_INFO[sel.value] : null;
  if (!info) { box.innerHTML = ''; return; }

  const tagsHtml = info.tags.map(t =>
    `<span class="pve-boss-tag">${t}</span>`
  ).join('');

  box.innerHTML = `
    <div class="pve-boss-name">${info.name}
      <span class="pve-boss-diff">${info.difficulty}</span>
    </div>
    <div class="pve-boss-tags">${tagsHtml}</div>
    <div class="pve-boss-desc">${info.desc}</div>
  `;
}

// Wire up close button (safe: runs after DOM is ready)
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pveResultCloseBtn')?.addEventListener('click', closePVEResult);
  document.getElementById('pveStartBtn')?.addEventListener('click', startPVE);

  // Boss & map selector — update preview on change
  document.getElementById('pve-boss-select')?.addEventListener('change', _updatePVEBossPreview);
  // Init preview once on load
  _updatePVEBossPreview();

  document.getElementById('pveCardOpenBtn')?.addEventListener('click', () => {
    initPVEUI();
    document.getElementById('pve-roster-area').style.display = 'block';
    document.getElementById('pveCardOpenBtn').style.display = 'none';
    document.getElementById('pveCardCloseBtn').style.display = 'inline-block';
  });
  document.getElementById('pveCardCloseBtn')?.addEventListener('click', () => {
    document.getElementById('pve-roster-area').style.display = 'none';
    document.getElementById('pveCardOpenBtn').style.display = 'inline-block';
    document.getElementById('pveCardCloseBtn').style.display = 'none';
  });
});
