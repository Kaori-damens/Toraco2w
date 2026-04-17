// ============================================================
// UI / SCREENS
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  // Stop the game loop only when leaving the game screen (not when navigating to it)
  if (id !== 'game') stopGame();
}

// Build fighters selection panel (multi-ball)
function buildFightersPanel() {
  const panel = document.getElementById('fighters-panel');
  panel.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'fighters-header';
  header.innerHTML = `<span>Fighters <strong>(${state.fighters.length})</strong></span><span style="color:#444">${state.fighters.length}/12</span>`;
  panel.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'fighters-grid';

  state.fighters.forEach((fighter, i) => {
    const card = document.createElement('div');
    card.className = 'fighter-card';
    card.style.borderColor = fighter.color + '66';

    // Top: dot + name
    const top = document.createElement('div');
    top.className = 'fighter-card-top';
    const dot = document.createElement('div');
    dot.className = 'ball-dot';
    dot.style.background = fighter.color;
    dot.style.color = fighter.color;
    const name = document.createElement('div');
    name.className = 'fighter-name';
    name.style.color = fighter.color;
    if (fighter.charName) {
      const subLabel = fighter.charStats?.subrace?.label ?? '';
      name.innerHTML = `${fighter.charEmoji ?? ''} ${fighter.charName}`
        + (subLabel ? ` <span style="font-size:0.72em;opacity:0.6;font-weight:normal">${subLabel}</span>` : '');
    } else {
      name.textContent = `Ball ${i + 1}`;
    }
    top.appendChild(dot);
    top.appendChild(name);
    card.appendChild(top);

    // Weapon grid (icon-only buttons with tooltip)
    const wgrid = document.createElement('div');
    wgrid.className = 'fighter-card-weapons';
    if (fighter.charName) {
      // Radoser: show fixed weapon, no change allowed
      const fixedWep = WEAPON_DEFS.find(d => d.id === fighter.weaponId);
      const label = document.createElement('div');
      label.style.cssText = 'grid-column:1/-1;font-size:10px;color:#888;text-align:center;padding:2px 0;';
      label.textContent = fixedWep ? `${fixedWep.icon} ${fixedWep.name}` : fighter.weaponId;
      wgrid.appendChild(label);
    } else {
      WEAPON_DEFS.forEach(def => {
        const btn = document.createElement('button');
        btn.className = 'wc-btn' + (def.id === fighter.weaponId ? ' sel' : '');
        btn.textContent = def.icon;
        btn.title = def.name;
        btn.addEventListener('click', () => {
          fighter.weaponId = def.id;
          wgrid.querySelectorAll('.wc-btn').forEach(b => b.classList.remove('sel'));
          btn.classList.add('sel');
          sfxShoot();
        });
        wgrid.appendChild(btn);
      });
    }
    card.appendChild(wgrid);

    // Remove button (only when > 2 fighters)
    if (state.fighters.length > 2) {
      const rem = document.createElement('button');
      rem.className = 'remove-btn';
      rem.textContent = '✕';
      rem.title = 'Remove';
      rem.addEventListener('click', () => {
        state.fighters.splice(i, 1);
        buildFightersPanel();
        sfxShoot();
      });
      card.appendChild(rem);
    }

    grid.appendChild(card);
  });

  // Add fighter card (max 12)
  if (state.fighters.length < 12) {
    const addCard = document.createElement('button');
    addCard.className = 'add-fighter-card';
    addCard.innerHTML = `<span style="font-size:20px">+</span><span>${state.fighters.length}/12</span>`;
    addCard.addEventListener('click', () => {
      showFighterPicker();
    });
    grid.appendChild(addCard);
  }

  panel.appendChild(grid);
  updateStartBtn();
}

// Arena selection
document.querySelectorAll('.a-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.a === 'custom') {
      openArenaBuilder();
      return; // don't select until user saves
    }
    document.querySelectorAll('.a-btn').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    state.arenaId = btn.dataset.a;
  });
});

// Start button — disabled until ≥ 2 fighters
function updateStartBtn() {
  const btn = document.getElementById('startBtn');
  const enough = state.fighters.length >= 2;
  btn.disabled = !enough;
  btn.title = enough ? '' : 'Add at least 2 fighters to start';
}

document.getElementById('startBtn').addEventListener('click', () => {
  if (state.fighters.length < 2) return;
  state.matchMode = '1v1';
  state.teamIds = [];
  state.tournament2v2 = null;
  showScreen('game');
  startGame();
});

updateStartBtn();

// Pause
document.getElementById('pauseBtn').addEventListener('click', () => {
  state.paused = !state.paused;
  document.getElementById('pauseBtn').textContent = state.paused ? '▶ Resume' : '⏸ Pause';
});

// Menu
document.getElementById('menuBtn').addEventListener('click', () => {
  // Clean up PVE state when leaving mid-fight
  if (state.pveMode) {
    state.pveMode = false;
    state.boss    = null;
    const overlay = document.getElementById('pve-result-overlay');
    if (overlay) overlay.style.display = 'none';
  }
  showScreen('menu');
  buildFightersPanel();
});

// Gravity
document.getElementById('gravBtn').addEventListener('click', () => {
  state.gravity = !state.gravity;
  document.getElementById('gravBtn').textContent = `🌍 Gravity: ${state.gravity ? 'On' : 'Off'}`;
});

// Zoom slider (50%–100%)
const zoomWrapper = document.getElementById('game-zoom-wrapper');
document.getElementById('zoomSlider').addEventListener('input', e => {
  const z = e.target.value / 100;
  zoomWrapper.style.transform = `scale(${z})`;
  document.getElementById('zoomLabel').textContent = `${e.target.value}%`;
});

// Speed slider — 7 stops, center (index 3) = 1×, left = slow, right = fast
// Stops: 0.25 / 0.5 / 0.75 / 1 / 2 / 3 / 5
const SPEED_STOPS  = [0.25, 0.5, 0.75, 1, 2, 3, 5];
const SPEED_LABELS = ['¼×', '½×', '¾×', '1×', '2×', '3×', '5×'];
document.getElementById('speedSlider').addEventListener('input', e => {
  const idx = parseInt(e.target.value);
  state.speed = SPEED_STOPS[idx];
  document.getElementById('speedLabel').textContent = SPEED_LABELS[idx];
});

// Spacebar = pause
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && state.running) {
    e.preventDefault();
    state.paused = !state.paused;
    document.getElementById('pauseBtn').textContent = state.paused ? '▶ Resume' : '⏸ Pause';
  }
});

// Result buttons
document.getElementById('rematchBtn').addEventListener('click', () => {
  state.bo3 = null;
  showScreen('game');
  startGame();
});
document.getElementById('menuBtnR').addEventListener('click', () => {
  state.bo3 = null;
  state.tournament = null;
  state.tournament2v2 = null;
  state.matchMode = '1v1';
  state.teamIds = [];
  showScreen('menu');
  buildFightersPanel();
});
document.getElementById('nextGameBtn').addEventListener('click', () => {
  // Continue BO3 — keep same fighters, random arena
  if (state.championship) state.arenaId = randomArenaChampionship(state.fighters?.length ?? 2);
  else if (state.tournament || state.tournament2v2) state.arenaId = randomArena();
  showScreen('game');
  startGame();
});
document.getElementById('bracketBtn').addEventListener('click', () => {
  if (state.championship) {
    renderChampionshipBracket();
  } else if (state.tournament2v2 && state.matchMode === '2v2') {
    renderBracket2v2();
  } else {
    renderBracket();
  }
  showScreen('bracket');
});

// Stats Log button + tabs
document.getElementById('statsLogBtn')?.addEventListener('click', showStatsModal);
document.getElementById('stats-log-close-btn')?.addEventListener('click', () => {
  document.getElementById('stats-log-modal').classList.remove('open');
});
document.getElementById('stats-log-modal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('stats-log-modal'))
    document.getElementById('stats-log-modal').classList.remove('open');
});
document.querySelectorAll('.sc-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    _activeChart = btn.dataset.chart;
    document.querySelectorAll('.sc-tab').forEach(t => t.classList.toggle('sel', t === btn));
    drawStatsChart(_activeChart);
  });
});

// Battle Log button
document.getElementById('battleLogBtn')?.addEventListener('click', showBattleLogModal);
document.getElementById('battle-log-close-btn')?.addEventListener('click', () => {
  document.getElementById('battle-log-modal').classList.remove('open');
});
document.getElementById('battle-log-modal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('battle-log-modal'))
    document.getElementById('battle-log-modal').classList.remove('open');
});

// Live log collapse toggle
document.getElementById('live-log-header')?.addEventListener('click', () => {
  const wrap = document.getElementById('live-log-wrap');
  const toggle = document.getElementById('live-log-toggle');
  wrap.classList.toggle('collapsed');
  if (toggle) toggle.textContent = wrap.classList.contains('collapsed') ? '▼' : '▲';
});

// Tournament button (menu)
document.getElementById('tournamentBtn').addEventListener('click', () => {
  if (!state.tournament) state.tournament = { size: 8 };
  buildTournamentSetup();
  showScreen('tournament');
});

// Tournament size buttons
document.querySelectorAll('[data-size]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-size]').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    if (!state.tournament) state.tournament = {};
    state.tournament.size = parseInt(btn.dataset.size);
    buildTournamentSetup();
  });
});

// Mode toggle buttons (1v1 / 2v2)
document.addEventListener('click', e => {
  if (e.target.dataset.tmode) {
    if (!state.tournament) state.tournament = { size: 16, selectedFighters: [], mode: '1v1' };
    state.tournament.mode = e.target.dataset.tmode;
    document.querySelectorAll('[data-tmode]').forEach(b => b.classList.toggle('sel', b.dataset.tmode === state.tournament.mode));
    buildTournamentSetup();
  }
});

// BO format buttons
document.querySelectorAll('[data-bo]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-bo]').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    if (!state.tournament) state.tournament = {};
    state.tournament.bo = parseInt(btn.dataset.bo);
  });
});

// Tournament start
document.getElementById('tStartBtn').addEventListener('click', () => {
  clearTournamentSave(); // clear any previous save before starting fresh
  const roster   = JSON.parse(localStorage.getItem('cgRoster') ?? '[]');
  const t        = state.tournament ?? {};
  const size     = t.size ?? 16;
  const tmode    = t.mode ?? '1v1';
  const selIdx   = t.selectedFighters ?? [];
  // Convert cgRoster entries → fighter objects
  const bo = t.bo ?? 3;   // preserve chosen format before createTournament overwrites state
  const participants = selIdx.map(i => roster[i]).filter(Boolean).map(rosterToFighter);
  if (tmode === '2v2') {
    state.tournament2v2 = createTournament2v2(size, participants);
    state.tournament2v2.bo = bo;
    // Keep tournament reference for menu-back etc but clear 1v1 tournament
    state.tournament = null;
    renderBracket2v2();
  } else {
    state.tournament2v2 = null;
    state.tournament = createTournament(size, participants);
    state.tournament.bo = bo;  // restore bo into new tournament object
    renderBracket();
  }
  showScreen('bracket');
});
document.getElementById('tBackBtn').addEventListener('click', () => {
  state.tournament = null;
  showScreen('menu');
  buildFightersPanel();
});

// Bracket → Next match
document.getElementById('nextMatchBtn').addEventListener('click', () => {
  // Championship
  if (state.championship && !state.championship.completed) {
    launchNextChampionshipMatch();
    return;
  }
  // 2v2 tournament
  if (state.tournament2v2 && !state.tournament2v2.completed) {
    const match = getNextTournamentMatch2v2();
    if (!match || !match.p1 || !match.p2) return;
    const bo = state.tournament2v2?.bo ?? 3;
    // 4 fighters: team0[0], team0[1], team1[0], team1[1]
    state.fighters  = [...match.p1.fighters, ...match.p2.fighters];
    state.teamIds   = [0, 0, 1, 1];
    state.matchMode = '2v2';
    state.arenaId   = randomArena();
    state.bo3 = {
      wins: [0, 0],
      gameNum: 1,
      fighters: [match.p1, match.p2],  // team objects
      winsNeeded: Math.ceil(bo / 2),
    };
    updateBO3Display();
    showScreen('game');
    startGame();
    return;
  }
  // 1v1 tournament
  const match = getNextTournamentMatch();
  if (!match) return;
  const bo = state.tournament?.bo ?? 3;
  state.fighters  = [match.p1, match.p2];
  state.matchMode = '1v1';
  state.teamIds   = [];
  state.arenaId   = randomArena();
  state.bo3 = { wins: [0, 0], gameNum: 1, fighters: [match.p1, match.p2], winsNeeded: Math.ceil(bo / 2) };
  updateBO3Display();
  showScreen('game');
  startGame();
});
document.getElementById('bracketMenuBtn').addEventListener('click', () => {
  state.tournament = null;
  state.tournament2v2 = null;
  state.championship = null;
  state.bo3 = null;
  showScreen('menu');
  buildFightersPanel();
  _updateTournamentResumeUI();
  _updateChampionshipResumeUI();
});

// Bracket phase navigation
document.getElementById('prevPhaseBtn').addEventListener('click', () => {
  if (state.championship) {
    if (state.championship.viewPhaseIdx > 0) { state.championship.viewPhaseIdx--; renderChampionshipBracket(); }
    return;
  }
  if (state.tournament2v2 && state.matchMode === '2v2') {
    const t = state.tournament2v2;
    if (t && t.viewRound > 0) { t.viewRound--; renderBracket2v2(); }
  } else {
    const t = state.tournament;
    if (t && t.viewRound > 0) { t.viewRound--; renderBracket(); }
  }
});
document.getElementById('nextPhaseBtn').addEventListener('click', () => {
  if (state.championship) {
    const cs = state.championship;
    if (cs.viewPhaseIdx < cs.currentPhaseIdx) { cs.viewPhaseIdx++; renderChampionshipBracket(); }
    return;
  }
  if (state.tournament2v2 && state.matchMode === '2v2') {
    const t = state.tournament2v2;
    if (!t) return;
    const round = t.rounds[t.viewRound ?? 0];
    if (round && round.every(m => m.winner !== null) && t.viewRound < t.rounds.length - 1) {
      t.viewRound = (t.viewRound ?? 0) + 1;
      renderBracket2v2();
    }
  } else {
    const t = state.tournament;
    if (!t) return;
    const round = t.rounds[t.viewRound ?? 0];
    if (round && round.every(m => m.winner !== null) && t.viewRound < t.rounds.length - 1) {
      t.viewRound = (t.viewRound ?? 0) + 1;
      renderBracket();
    }
  }
});

// ── Tournament Resume UI ──────────────────────────────────────────
function _updateTournamentResumeUI() {
  const wrap = document.getElementById('tournament-resume-wrap');
  const info = document.getElementById('tournament-resume-info');
  if (!wrap || !info) return;

  const save = (typeof getTournamentSaveInfo === 'function') ? getTournamentSaveInfo() : null;
  if (!save || save.completed) {
    wrap.style.display = 'none';
    return;
  }

  const date = new Date(save.savedAt);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const boLabel = `BO${save.bo}`;
  const modeLabel = save.mode === '2v2' ? '2v2' : '1v1';
  info.textContent = `${save.size}-player ${modeLabel} ${boLabel} · ${save.doneMatches}/${save.totalMatches} matches done · saved ${dateStr} ${timeStr}`;
  wrap.style.display = 'block';
}

document.getElementById('tournamentResumeBtn').addEventListener('click', () => {
  if (typeof resumeTournament !== 'function') return;
  const ok = resumeTournament();
  if (!ok) { alert('No saved tournament found.'); return; }

  _updateTournamentResumeUI();
  if (state.tournament2v2 && state.matchMode === '2v2') {
    renderBracket2v2();
  } else {
    renderBracket();
  }
  showScreen('bracket');
});

// Show resume button on page load if save exists
_updateTournamentResumeUI();
if (typeof _updateChampionshipResumeUI === 'function') _updateChampionshipResumeUI();

// ── Championship UI handlers ──────────────────────────────────────
document.getElementById('cs-resume-btn').addEventListener('click', () => {
  const ok = resumeChampionship();
  if (!ok) alert('No saved championship found.');
});

document.getElementById('championshipBtn').addEventListener('click', () => {
  state.tournament  = null;
  state.tournament2v2 = null;
  state.bo3 = null;
  // Keep in-memory draft state (size=32, draftRoster exists, no phases)
  const hasDraft = state.championship && !state.championship.phases && state.championship.draftRoster;
  if (!hasDraft) {
    // Reset only if not mid-draft
    if (!state.championship || state.championship.phases) state.championship = {size:128, selectedFighters:[]};
  }
  buildChampionshipSetup();
  showScreen('championship-setup');
});

document.getElementById('csBackBtn').addEventListener('click', () => {
  showScreen('menu');
  buildFightersPanel();
});

document.getElementById('csSelectAllBtn').addEventListener('click', () => {
  const roster = JSON.parse(localStorage.getItem('cgRoster') ?? '[]');
  if (!state.championship || state.championship.phases) state.championship = {size:128, selectedFighters:[]};
  const size = state.championship.size ?? 128;
  state.championship.selectedFighters = roster.map((_,i) => i).slice(0, size);
  buildChampionshipSetup();
});

document.getElementById('csClearBtn').addEventListener('click', () => {
  if (state.championship) state.championship.selectedFighters = [];
  buildChampionshipSetup();
});

document.getElementById('csStartBtn').addEventListener('click', () => {
  const cs   = state.championship;
  const size = cs?.size ?? 128;
  // Size=32 uses draft flow — handled by startChampionship32()
  if (size === 32) { startChampionship32(); return; }
  // Size=64/128/256: old roster-pick flow
  const roster      = JSON.parse(localStorage.getItem('cgRoster') ?? '[]');
  const selIdxs     = cs?.selectedFighters ?? [];
  const selFighters = selIdxs.map(i => roster[i]).filter(Boolean);
  clearChampionshipSave();
  clearTournamentSave();
  state.championship  = createChampionship(size, selFighters);
  state.tournament    = null;
  state.tournament2v2 = null;
  state.bo3           = null;
  saveChampionshipProgress();
  renderChampionshipBracket();
  showScreen('bracket');
});

document.querySelectorAll('[data-cssize]').forEach(btn => {
  btn.addEventListener('click', () => {
    const newSize  = parseInt(btn.dataset.cssize);
    const prevTag  = state.championship?.tag;
    const prevName = state.championship?.name;
    if (!state.championship || state.championship.phases) {
      state.championship = { size: newSize, selectedFighters: [] };
    } else {
      // Switching away from 32: clear draft state to avoid stale data
      if (state.championship.size === 32 && newSize !== 32) {
        state.championship = { size: newSize, selectedFighters: [], tag: prevTag, name: prevName };
      }
      // Switching to 32: reset to fresh draft
      else if (newSize === 32 && state.championship.size !== 32) {
        state.championship = { size: 32, tag: prevTag, name: prevName };
      } else {
        state.championship.size = newSize;
      }
    }
    buildChampionshipSetup();
  });
});

// ============================================================
// ARENA BUILDER
// ============================================================

// Parameter definitions for each arena type
const AB_PARAMS = {
  square: [
    { id:'size',   label:'Size',        min:200, max:1000, step:10, def:600, unit:'px',
      note:'Width = Height — equal sides' }
  ],
  circle: [
    { id:'radius', label:'Radius',      min:80,  max:600,  step:5,  def:220, unit:'px',
      note:'Diameter = radius × 2' }
  ],
  rect: [
    { id:'width',  label:'Width',       min:250, max:1000, step:10, def:600, unit:'px' },
    { id:'height', label:'Height',      min:150, max:1000, step:10, def:400, unit:'px' }
  ],
  cross: [
    { id:'arm',   label:'Arm Length',   min:120, max:500,  step:10, def:240, unit:'px',
      note:'Total span = arm × 2' },
    { id:'thick', label:'Arm Width',    min:80,  max:500,  step:10, def:300, unit:'px' }
  ],
  hole: [
    { id:'size',  label:'Arena Size',   min:300, max:1000, step:10, def:800, unit:'px' },
    { id:'holeR', label:'Hole Radius',  min:30,  max:600,  step:5,  def:70,  unit:'px',
      note:'Void in the center — bounce outward' }
  ],
};

// Current builder state
let _abType   = 'square';
let _abParams = {};  // { type: { paramId: value } }
// Init defaults for all types
for (const [type, defs] of Object.entries(AB_PARAMS)) {
  _abParams[type] = {};
  for (const p of defs) _abParams[type][p.id] = p.def;
}

// Build an arena config object from current type + params
function abBuildConfig(type, params) {
  switch (type) {
    case 'square': {
      const s = params.size;
      return { type:'square', x:(1000-s)/2, y:(1000-s)/2, w:s, h:s };
    }
    case 'circle': {
      return { type:'circle', cx:500, cy:500, r:params.radius };
    }
    case 'rect': {
      const { width:w, height:h } = params;
      return { type:'rect', x:(1000-w)/2, y:(1000-h)/2, w, h };
    }
    case 'cross': {
      return { type:'cross', cx:500, cy:500, arm:params.arm, thick:params.thick };
    }
    case 'hole': {
      const s = params.size;
      return { type:'hole', x:(1000-s)/2, y:(1000-s)/2, w:s, h:s,
               holeCx:500, holeCy:500, holeR:params.holeR };
    }
  }
}

// Draw the arena preview at 260×260, scaled from 800×800
function abRenderPreview() {
  const canvas = document.getElementById('arenaPreviewCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const SCALE = W / 1000;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#05050f';
  ctx.fillRect(0, 0, W, H);

  // Scale down and draw
  ctx.save();
  ctx.scale(SCALE, SCALE);
  const cfg = abBuildConfig(_abType, _abParams[_abType]);
  drawArena(ctx, cfg);
  ctx.restore();
}

// Render parameter sliders for the current type
function abRenderParams() {
  const container = document.getElementById('abParams');
  if (!container) return;
  container.innerHTML = '';

  const defs = AB_PARAMS[_abType] || [];
  if (defs.length === 0) {
    container.innerHTML = '<div style="color:var(--m-text-dim);font-size:13px;">No adjustable parameters.</div>';
    return;
  }

  for (const p of defs) {
    const val = _abParams[_abType][p.id];
    const group = document.createElement('div');
    group.className = 'ab-param-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'ab-param-label';
    labelRow.innerHTML = `<span>${p.label}</span><span class="ab-param-val" id="abVal_${p.id}">${val}${p.unit}</span>`;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'ab-slider';
    slider.min = p.min; slider.max = p.max; slider.step = p.step; slider.value = val;
    slider.addEventListener('input', () => {
      _abParams[_abType][p.id] = +slider.value;
      const valEl = document.getElementById(`abVal_${p.id}`);
      if (valEl) valEl.textContent = slider.value + p.unit;
      abRenderPreview();
    });

    group.appendChild(labelRow);
    group.appendChild(slider);
    if (p.note) {
      const note = document.createElement('div');
      note.className = 'ab-param-note';
      note.textContent = p.note;
      group.appendChild(note);
    }
    container.appendChild(group);
  }
}

// Open / close modal
function openArenaBuilder() {
  // If there's already a saved custom arena, pre-load its type
  if (state.customArena) {
    _abType = state.customArena.type;
  }
  document.querySelectorAll('.ab-type-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === _abType);
  });
  abRenderParams();
  abRenderPreview();
  document.getElementById('arenaBuilderModal').style.display = 'flex';
}

function closeArenaBuilder() {
  document.getElementById('arenaBuilderModal').style.display = 'none';
}

// Type selector buttons
document.querySelectorAll('.ab-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    _abType = btn.dataset.type;
    document.querySelectorAll('.ab-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    abRenderParams();
    abRenderPreview();
  });
});

// Close / cancel
document.getElementById('arenaBuilderClose').addEventListener('click', closeArenaBuilder);
document.getElementById('arenaBuilderCancel').addEventListener('click', closeArenaBuilder);
// Click backdrop to close
document.getElementById('arenaBuilderModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeArenaBuilder();
});

// Save — apply custom arena
document.getElementById('arenaBuilderSave').addEventListener('click', () => {
  state.customArena = abBuildConfig(_abType, _abParams[_abType]);
  state.arenaId     = 'custom';
  // Mark the Custom button as selected
  document.querySelectorAll('.a-btn').forEach(b => b.classList.remove('sel'));
  document.getElementById('arenaCustomBtn').classList.add('sel');
  closeArenaBuilder();
});

// ============================================================
// INIT
// ============================================================
buildFightersPanel();
