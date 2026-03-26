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
    name.textContent = fighter.charName
      ? `${fighter.charEmoji ?? ''} ${fighter.charName}`
      : `Ball ${i + 1}`;
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
  showScreen('menu');
  buildFightersPanel();
});

// Gravity
document.getElementById('gravBtn').addEventListener('click', () => {
  state.gravity = !state.gravity;
  document.getElementById('gravBtn').textContent = `🌍 Gravity: ${state.gravity ? 'On' : 'Off'}`;
});

// Zoom
const ZOOM_LEVELS = [1.0, 0.85, 0.70, 0.55];
let zoomIdx = 0;
const zoomWrapper = document.getElementById('game-zoom-wrapper');
document.getElementById('zoomBtn').addEventListener('click', () => {
  zoomIdx = (zoomIdx + 1) % ZOOM_LEVELS.length;
  const z = ZOOM_LEVELS[zoomIdx];
  zoomWrapper.style.transform = `scale(${z})`;
  document.getElementById('zoomBtn').textContent = `🔍 ${Math.round(z * 100)}%`;
});

// Speed
const speeds = [1, 2, 3, 5];
let speedIdx = 0;
document.getElementById('speedBtn').addEventListener('click', () => {
  speedIdx = (speedIdx + 1) % speeds.length;
  state.speed = speeds[speedIdx];
  document.getElementById('speedBtn').textContent = `⚡ Speed: ${state.speed}x`;
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
  // Continue BO3 — keep same fighters, random arena if tournament
  if (state.tournament || state.tournament2v2) state.arenaId = randomArena();
  showScreen('game');
  startGame();
});
document.getElementById('bracketBtn').addEventListener('click', () => {
  if (state.tournament2v2 && state.matchMode === '2v2') {
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
  state.bo3 = null;
  showScreen('menu');
  buildFightersPanel();
});

// ============================================================
// INIT
// ============================================================
buildFightersPanel();
