// ============================================================
// TOURNAMENT
// ============================================================

// ── Tournament Persistence ────────────────────────────────────────
const _TOURNEY_SAVE_KEY = 'cgTournamentSave';

function _serializeTournament(t) {
  if (!t) return null;
  return {
    ...t,
    rounds: t.rounds.map(round =>
      round.map(match => ({
        p1:         match.p1   ?? null,
        p2:         match.p2   ?? null,
        winnerSlot: match.winner === null ? null
                  : match.winner === match.p1 ? 0 : 1,
        bo3Wins:    match.bo3Wins ?? [0, 0],
      }))
    ),
  };
}

function _deserializeTournament(data) {
  if (!data) return null;
  return {
    ...data,
    rounds: data.rounds.map(round =>
      round.map(match => {
        const m = {
          p1:      match.p1 ?? null,
          p2:      match.p2 ?? null,
          winner:  null,
          bo3Wins: match.bo3Wins ?? [0, 0],
        };
        if (match.winnerSlot === 0) m.winner = m.p1;
        if (match.winnerSlot === 1) m.winner = m.p2;
        return m;
      })
    ),
  };
}

function saveTournamentProgress() {
  try {
    const t  = state.tournament;
    const t2 = state.tournament2v2;
    if (!t && !t2) return;
    localStorage.setItem(_TOURNEY_SAVE_KEY, JSON.stringify({
      matchMode:     state.matchMode ?? '1v1',
      tournament:    _serializeTournament(t),
      tournament2v2: _serializeTournament(t2),
      savedAt:       Date.now(),
    }));
  } catch(e) { console.warn('Tournament save failed:', e); }
}

function clearTournamentSave() {
  localStorage.removeItem(_TOURNEY_SAVE_KEY);
}

function getTournamentSaveInfo() {
  try {
    const raw = localStorage.getItem(_TOURNEY_SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    const t = save.tournament ?? save.tournament2v2;
    if (!t) return null;
    const totalMatches = t.rounds.reduce((s, r) => s + r.length, 0);
    const doneMatches  = t.rounds.reduce((s, r) => s + r.filter(m => m.winnerSlot !== null && m.winnerSlot !== undefined).length, 0);
    return {
      mode:        save.matchMode ?? '1v1',
      size:        t.size,
      bo:          t.bo ?? 3,
      completed:   t.completed,
      doneMatches, totalMatches,
      savedAt:     save.savedAt,
    };
  } catch(e) { return null; }
}

function resumeTournament() {
  try {
    const raw = localStorage.getItem(_TOURNEY_SAVE_KEY);
    if (!raw) return false;
    const save = JSON.parse(raw);
    state.matchMode     = save.matchMode ?? '1v1';
    state.tournament    = _deserializeTournament(save.tournament);
    state.tournament2v2 = _deserializeTournament(save.tournament2v2);
    return true;
  } catch(e) { console.warn('Tournament resume failed:', e); return false; }
}

// ── Fighter Card popup ────────────────────────────────────────────
function _fcardFighterHTML(f) {
  if (!f) return '';
  const cs   = f.charStats ?? {};
  const base = f.baseStats ?? {};
  const wep  = (typeof CG_WEAPONS !== 'undefined' ? CG_WEAPONS : []).find(w => w.id === f.weaponId);
  const wLabel   = wep ? wep.label : (f.weaponId ?? '?');
  const raceName = cs.race ? (cs.race.charAt(0).toUpperCase() + cs.race.slice(1)) : '';
  const subName  = cs.subrace?.label ? ` · ${cs.subrace.label}` : '';
  const bot      = f.isBot ? ' 🤖' : '';

  // ── Stats with diff ──
  const STAT_KEYS = [
    ['STR', 'strength'], ['SPD', 'speed'], ['DUR', 'durability'],
    ['IQ', 'iq'], ['BIQ', 'battleiq'], ['MA', 'ma'],
  ];
  const statsHTML = STAT_KEYS.map(([label, key]) => {
    const cur  = cs[key];
    const orig = base[key];
    let valHTML;
    if (cur == null) {
      valHTML = '<span class="fcard-sv">—</span>';
    } else if (!f.isBot && orig != null && cur !== orig) {
      const diff  = cur - orig;
      const cls   = diff > 0 ? 'fcard-diff-pos' : 'fcard-diff-neg';
      const sign  = diff > 0 ? '+' : '';
      valHTML = `<span class="fcard-sv">${orig}</span><span class="${cls}">${sign}${diff}</span>`;
    } else {
      valHTML = `<span class="fcard-sv">${cur}</span>`;
    }
    return `<div class="fcard-stat"><span class="fcard-stat-key">${label}</span><div class="fcard-stat-val-wrap">${valHTML}</div></div>`;
  }).join('');

  // ── Skills with new/lost diff ──
  const curSkills  = f.skills      ?? [];
  const baseSkills = f.baseSkills  ?? curSkills;
  const lostSkills = baseSkills.filter(id => !curSkills.includes(id));

  const skillsHTML = [
    ...curSkills.map(id => {
      const sk    = (typeof SKILL_MAP !== 'undefined') ? SKILL_MAP[id] : null;
      const label = sk ? `${sk.icon} ${sk.name}` : id;
      const isNew = !baseSkills.includes(id);
      return `<span class="fcard-skill${isNew ? ' fcard-skill-new' : ''}">${label}</span>`;
    }),
    ...lostSkills.map(id => {
      const sk    = (typeof SKILL_MAP !== 'undefined') ? SKILL_MAP[id] : null;
      const label = sk ? `${sk.icon} ${sk.name}` : id;
      return `<span class="fcard-skill fcard-skill-lost">${label} <span class="fcard-lost-tag">lost</span></span>`;
    }),
  ].join('');

  return `
    <div class="fcard-header" style="border-left:4px solid ${f.color ?? '#888'}">
      <span class="fcard-dot" style="background:${f.color ?? '#888'}"></span>
      <span class="fcard-name">${f.charEmoji ?? ''} ${f.charName ?? '?'}</span>
    </div>
    <div class="fcard-meta">${wLabel} · ${raceName}${subName}${bot}</div>
    <div class="fcard-stats">${statsHTML}</div>
    ${skillsHTML ? `<div class="fcard-skills-wrap">${skillsHTML}</div>`
                 : '<div class="fcard-no-skills">No skills</div>'}
  `;
}

function showFighterCard(data) {
  const modal   = document.getElementById('fighter-card-modal');
  const content = document.getElementById('fighter-card-content');
  if (!modal || !content || !data) return;
  if (data.fighters) {
    // 2v2 team
    content.innerHTML = `<div class="fcard-team-title">Team</div>` +
      data.fighters.map(_fcardFighterHTML).join('<hr class="fcard-divider">');
  } else {
    content.innerHTML = _fcardFighterHTML(data);
  }
  modal.style.display = 'flex';
}

function closeFighterCard() {
  const m = document.getElementById('fighter-card-modal');
  if (m) m.style.display = 'none';
}
// Convert a cgRoster entry → fighter object (used by state.fighters / bracket)
function rosterToFighter(ch) {
  return {
    weaponId:   ch.weapon,
    color:      ch.color,
    charName:   ch.name,
    charEmoji:  ch.raceEmoji ?? '',
    charStats:  { ...ch.stats, race: ch.race ?? null, subrace: ch.subrace ?? null },
    baseStats:  { ...ch.stats },          // snapshot for diff display in Fighter Card
    skills:     [...(ch.skills ?? [])],
    baseSkills: [...(ch.skills ?? [])],   // snapshot for diff display in Fighter Card
  };
}

function randomArena() {
  const keys = Object.keys(ARENAS);
  return keys[Math.floor(Math.random() * keys.length)];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeBotFighter(idx) {
  const color = BALL_COLORS[idx % BALL_COLORS.length];
  const wpId  = WEAPON_DEFS[Math.floor(Math.random() * WEAPON_DEFS.length)].id;
  const stats = {
    strength:   Math.ceil(Math.random() * 7) + 1,
    speed:      Math.ceil(Math.random() * 7) + 1,
    durability: Math.ceil(Math.random() * 7) + 1,
    iq:         Math.ceil(Math.random() * 5) + 1,
    biq:        Math.ceil(Math.random() * 5) + 1,
    ma:         Math.ceil(Math.random() * 5) + 1,
  };
  return { weaponId: wpId, color, charName: `Bot ${idx + 1}`, charEmoji: '🤖', charStats: stats, isBot: true };
}

function createTournament(size, roster) {
  const participants = [...roster];
  // Pad with bots up to tournament size
  while (participants.length < size) {
    participants.push(makeBotFighter(participants.length));
  }
  shuffle(participants);

  // Build all rounds (single-elimination)
  const rounds = [];
  let prev = participants;
  while (prev.length > 1) {
    const round = [];
    for (let i = 0; i < prev.length; i += 2) {
      round.push({ p1: prev[i], p2: prev[i + 1], winner: null, bo3Wins: [0, 0] });
    }
    rounds.push(round);
    prev = new Array(round.length).fill(null); // placeholders for next round
  }

  return { size, rounds, currentRound: 0, currentMatch: 0, completed: false };
}

function recordTournamentMatchResult(matchWinner) {
  const t = state.tournament;
  if (!t) return;
  const round = t.rounds[t.currentRound];
  const match = round[t.currentMatch];
  match.winner = matchWinner;

  // Place winner into next round if exists
  if (t.currentRound + 1 < t.rounds.length) {
    const nextRound    = t.rounds[t.currentRound + 1];
    const nextMatchIdx = Math.floor(t.currentMatch / 2);
    const slot = t.currentMatch % 2 === 0 ? 'p1' : 'p2';
    nextRound[nextMatchIdx][slot] = matchWinner;
  }

  // Advance pointer
  t.currentMatch++;
  if (t.currentMatch >= round.length) {
    t.currentRound++;
    t.currentMatch = 0;
    if (t.currentRound >= t.rounds.length) {
      t.completed = true;
      clearTournamentSave();   // tournament over — wipe save
    } else {
      // Auto-follow: move view to the newly active round
      t.viewRound = t.currentRound;
    }
  }
  saveTournamentProgress();
  renderBracket();
}

function getNextTournamentMatch() {
  const t = state.tournament;
  if (!t || t.completed) return null;
  return t.rounds[t.currentRound]?.[t.currentMatch] ?? null;
}

function renderBracket() {
  const t = state.tournament;
  const container = document.getElementById('bracket-content');
  const titleEl   = document.getElementById('bracket-title');
  if (!container || !t) return;

  // Init viewRound
  if (t.viewRound == null) t.viewRound = 0;
  const vr = Math.max(0, Math.min(t.viewRound, t.rounds.length - 1));
  t.viewRound = vr;

  const totalRounds = t.rounds.length;
  const ROUND_NAMES = ['Round 1','Round 2','Quarter-Finals','Semi-Finals','Final'];
  const labelIdx  = totalRounds - 1 - vr;
  const roundName = ROUND_NAMES[Math.min(labelIdx, ROUND_NAMES.length - 1)] ?? `Round ${vr + 1}`;
  const round     = t.rounds[vr];
  const matchCount = round.length;
  const roundDone  = round.every(m => m.winner !== null);

  // ── Title & phase info ──
  titleEl.textContent = t.completed ? '🏆 Tournament Complete!' : `🏆 ${roundName}`;
  const phaseInfo = document.getElementById('bracket-phase-info');
  if (phaseInfo) {
    const playerCount = matchCount * 2;
    phaseInfo.textContent = `Phase ${vr + 1} / ${totalRounds}  ·  ${matchCount} match${matchCount > 1 ? 'es' : ''} (${playerCount} fighters)`;
  }

  // ── Phase nav buttons ──
  const prevBtn = document.getElementById('prevPhaseBtn');
  const nextBtn = document.getElementById('nextPhaseBtn');
  if (prevBtn) prevBtn.disabled = vr <= 0;
  if (nextBtn) nextBtn.disabled = !roundDone || vr >= totalRounds - 1;

  // ── Build match grid ──
  container.innerHTML = '';

  if (t.completed) {
    // Champion screen
    const lastRound = t.rounds[t.rounds.length - 1];
    const champion  = lastRound[0]?.winner;
    if (champion) {
      const champWrap = document.createElement('div');
      champWrap.className = 'bracket-champ-wrap';
      champWrap.innerHTML = `
        <div class="bracket-champ-trophy">🏆</div>
        <div class="bracket-champ-label">Champion</div>
        <div class="bracket-match current bracket-champ-card" style="border-color:${champion.color};box-shadow:0 0 32px ${champion.color}55">
          <div class="bracket-player winner clickable" style="font-size:15px;padding:10px 12px"
               data-champ="1">
            <span class="bp-dot" style="background:${champion.color};width:14px;height:14px"></span>
            <span style="color:${champion.color}">${champion.charEmoji ?? ''} ${champion.charName ?? champion.weaponId}</span>
          </div>
        </div>`;
      champWrap.querySelector('[data-champ]').addEventListener('click', () => showFighterCard(champion));
      container.appendChild(champWrap);
    }
  }

  // Grid of matches (show even when completed, as the final round)
  const grid = document.createElement('div');
  grid.className = 'bracket-grid';
  const cols = matchCount >= 16 ? 4 : matchCount >= 4 ? 2 : 1;
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  round.forEach((match, mi) => {
    const isCurrent = vr === t.currentRound && mi === t.currentMatch && !t.completed;
    const isDone    = match.winner !== null;
    const card = document.createElement('div');
    card.className = 'bracket-match' + (isCurrent ? ' current' : '') + (isDone ? ' done' : '');

    // Match number badge
    const badge = document.createElement('div');
    badge.className = 'bracket-match-num';
    badge.textContent = `#${vr === 0 ? mi + 1 : mi + 1}`;
    card.appendChild(badge);

    [match.p1, match.p2].forEach(p => {
      const row = document.createElement('div');
      row.className = 'bracket-player' + (p && match.winner === p ? ' winner' : '') + (p ? ' clickable' : '');
      const dot = document.createElement('span');
      dot.className = 'bp-dot';
      dot.style.background = p?.color ?? '#333';
      const name = document.createElement('span');
      name.className = 'bp-name';
      name.textContent = p ? (p.charName ?? p.weaponId ?? '?') : '—';
      row.appendChild(dot);
      row.appendChild(name);
      if (p) row.addEventListener('click', e => { e.stopPropagation(); showFighterCard(p); });
      card.appendChild(row);
    });

    if (isDone && match.bo3Wins) {
      const sc = document.createElement('div');
      sc.className = 'bracket-score';
      sc.textContent = `${match.bo3Wins[0]} – ${match.bo3Wins[1]}`;
      card.appendChild(sc);
    }

    grid.appendChild(card);
  });

  container.appendChild(grid);

  // ── Fight button ──
  const nextMatchBtn = document.getElementById('nextMatchBtn');
  if (nextMatchBtn) {
    if (t.completed) {
      nextMatchBtn.disabled = true;
      nextMatchBtn.textContent = '🏆 Tournament Over';
    } else {
      nextMatchBtn.disabled = false;
      nextMatchBtn.textContent = '⚔️ Fight Next Match';
    }
  }
}

function buildTournamentSetup() {
  if (!state.tournament) state.tournament = { size: 16, selectedFighters: [], mode: '1v1' };
  const t       = state.tournament;
  const size    = t.size ?? 16;
  const tmode   = t.mode ?? '1v1';
  const is2v2   = tmode === '2v2';
  // In 2v2 mode, size = number of TEAMS, so actual fighter slots = size * 2
  const slotCount = is2v2 ? size * 2 : size;
  if (!t.selectedFighters) t.selectedFighters = [];

  // Sync tmode button visual state
  document.querySelectorAll('[data-tmode]').forEach(b => b.classList.toggle('sel', b.dataset.tmode === tmode));

  const roster   = JSON.parse(localStorage.getItem('cgRoster') ?? '[]');
  const selected = t.selectedFighters;  // array of roster indices
  const selCount = selected.length;
  const full     = selCount >= slotCount;

  // ── Header counter ──
  const slotInfo = document.getElementById('t-slot-info');
  if (slotInfo) {
    const bots = Math.max(0, slotCount - selCount);
    slotInfo.textContent = `(${selCount} / ${slotCount} selected${bots > 0 ? ` · ${bots} bot${bots>1?'s':''}` : ''}${is2v2 ? ' · 2v2 mode' : ''})`;
    slotInfo.style.color = selCount >= slotCount ? '#44bb77' : '#556';
  }

  // ── Roster cards ──
  const list = document.getElementById('t-roster-list');
  list.innerHTML = '';

  if (roster.length === 0) {
    const empty = document.createElement('div');
    empty.className = 't-roster-empty';
    empty.textContent = 'No Radosers yet — create some first!';
    list.appendChild(empty);
  } else {
    roster.forEach((r, i) => {
      const isSel    = selected.includes(i);
      const isLocked = !isSel && full;
      const card = document.createElement('div');
      card.className = 't-roster-card' +
        (isSel ? ' selected' : '') +
        (isLocked ? ' full-not-selected' : '');

      const wIcon = WEAPON_DEFS.find(d => d.id === r.weapon)?.icon ?? '';
      card.innerHTML = `
        <span class="t-slot-dot" style="background:${r.color ?? '#888'}"></span>
        <span class="t-card-name" style="color:${r.color ?? '#aac'}">${r.raceEmoji ?? ''} ${r.name ?? `Fighter ${i+1}`}</span>
        <span style="font-size:10px;color:#556">${wIcon} ${r.weapon ?? ''}</span>
        <span class="t-card-check">${isSel ? '✓' : ''}</span>
      `;

      if (!isLocked) {
        card.addEventListener('click', () => {
          if (isSel) {
            const idx = selected.indexOf(i);
            if (idx >= 0) selected.splice(idx, 1);
          } else {
            selected.push(i);
          }
          buildTournamentSetup();
        });
      }
      list.appendChild(card);
    });
  }

  // ── Lineup preview (selected + bots) ──
  const summary = document.getElementById('t-slot-summary');
  if (summary) {
    summary.innerHTML = '';
    // Selected Radosers dots
    selected.forEach(idx => {
      const r = roster[idx];
      if (!r) return;
      const dot = document.createElement('span');
      dot.className = 't-summary-dot';
      dot.style.cssText = `background:${r.color ?? '#888'};box-shadow:0 0 4px ${r.color ?? '#888'}88`;
      dot.title = r.name ?? `Fighter ${idx+1}`;
      summary.appendChild(dot);
    });
    // Bot slots
    const bots = Math.max(0, slotCount - selCount);
    if (bots > 0) {
      const botLabel = document.createElement('span');
      botLabel.className = 't-summary-bot';
      botLabel.textContent = `+ ${bots} bot${bots > 1 ? 's' : ''}`;
      summary.appendChild(botLabel);
    }
  }

  // ── Start button ──
  const startBtn = document.getElementById('tStartBtn');
  if (startBtn) startBtn.disabled = false;
}

// ── 2v2 Tournament ──
function createTournament2v2(numTeams, roster) {
  // Pair fighters into teams of 2
  const fighters = [...roster];
  while (fighters.length < numTeams * 2) fighters.push(makeBotFighter(fighters.length));
  shuffle(fighters);

  // Build teams
  const TC = ['#00ddff','#ff8833','#44ff88','#ff44aa','#ffdd00','#aa44ff','#ff6644','#44aaff'];
  const teams = [];
  for (let i = 0; i < numTeams; i++) {
    const f0 = fighters[i * 2], f1 = fighters[i * 2 + 1];
    teams.push({
      charName: `${f0.charName ?? 'Bot'} & ${f1.charName ?? 'Bot'}`,
      color: TC[i % TC.length],
      fighters: [f0, f1],
      isTeam: true,
    });
  }
  shuffle(teams);

  // Build bracket
  const rounds = [];
  let prev = teams;
  while (prev.length > 1) {
    const round = [];
    for (let i = 0; i < prev.length; i += 2) {
      round.push({ p1: prev[i], p2: prev[i + 1], winner: null, bo3Wins: [0, 0] });
    }
    rounds.push(round);
    prev = new Array(round.length).fill(null);
  }
  return { numTeams, rounds, currentRound: 0, currentMatch: 0, completed: false };
}

function getNextTournamentMatch2v2() {
  const t = state.tournament2v2;
  if (!t || t.completed) return null;
  return t.rounds[t.currentRound]?.[t.currentMatch] ?? null;
}

function recordTournamentMatchResult2v2(winTeamObj) {
  const t = state.tournament2v2;
  if (!t) return;
  const round = t.rounds[t.currentRound];
  const match = round[t.currentMatch];
  match.winner = winTeamObj;

  if (t.currentRound + 1 < t.rounds.length) {
    const nextRound = t.rounds[t.currentRound + 1];
    const nextIdx   = Math.floor(t.currentMatch / 2);
    const slot      = t.currentMatch % 2 === 0 ? 'p1' : 'p2';
    nextRound[nextIdx][slot] = winTeamObj;
  }

  t.currentMatch++;
  if (t.currentMatch >= round.length) {
    t.currentRound++;
    t.currentMatch = 0;
    if (t.currentRound >= t.rounds.length) {
      t.completed = true;
      clearTournamentSave();
    } else {
      t.viewRound = t.currentRound;
    }
  }
  saveTournamentProgress();
  renderBracket2v2();
}

function renderBracket2v2() {
  const t = state.tournament2v2;
  const container = document.getElementById('bracket-content');
  const titleEl   = document.getElementById('bracket-title');
  if (!container || !t) return;

  if (t.viewRound == null) t.viewRound = 0;
  const vr = Math.max(0, Math.min(t.viewRound, t.rounds.length - 1));
  t.viewRound = vr;

  const totalRounds = t.rounds.length;
  const ROUND_NAMES = ['Round 1','Round 2','Quarter-Finals','Semi-Finals','Final'];
  const labelIdx  = totalRounds - 1 - vr;
  const roundName = ROUND_NAMES[Math.min(labelIdx, ROUND_NAMES.length - 1)] ?? `Round ${vr + 1}`;
  const round     = t.rounds[vr];
  const matchCount = round.length;
  const roundDone  = round.every(m => m.winner !== null);

  titleEl.textContent = t.completed ? '🏆 2v2 Tournament Complete!' : `🏆 2v2 ${roundName}`;

  const phaseInfo = document.getElementById('bracket-phase-info');
  if (phaseInfo) {
    phaseInfo.textContent = `Phase ${vr + 1} / ${totalRounds}  ·  ${matchCount} match${matchCount > 1 ? 'es' : ''} (${matchCount * 4} fighters)`;
  }

  const prevBtn = document.getElementById('prevPhaseBtn');
  const nextBtn = document.getElementById('nextPhaseBtn');
  if (prevBtn) prevBtn.disabled = vr <= 0;
  if (nextBtn) nextBtn.disabled = !roundDone || vr >= totalRounds - 1;

  container.innerHTML = '';

  if (t.completed) {
    const champion = t.rounds[t.rounds.length - 1][0]?.winner;
    if (champion) {
      const champWrap = document.createElement('div');
      champWrap.className = 'bracket-champ-wrap';
      champWrap.innerHTML = `
        <div class="bracket-champ-trophy">🏆</div>
        <div class="bracket-champ-label">Champions</div>
        <div class="bracket-match current bracket-champ-card" style="border-color:${champion.color};box-shadow:0 0 32px ${champion.color}55">
          <div class="bracket-player winner" style="font-size:14px;padding:10px 12px">
            <span class="bp-dot" style="background:${champion.color};width:14px;height:14px"></span>
            <span style="color:${champion.color}">${champion.charName ?? '?'}</span>
          </div>
        </div>`;
      container.appendChild(champWrap);
    }
  }

  const grid = document.createElement('div');
  grid.className = 'bracket-grid';
  const cols = matchCount >= 16 ? 4 : matchCount >= 4 ? 2 : 1;
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  round.forEach((match, mi) => {
    const isCurrent = vr === t.currentRound && mi === t.currentMatch && !t.completed;
    const isDone    = match.winner !== null;
    const card = document.createElement('div');
    card.className = 'bracket-match' + (isCurrent ? ' current' : '') + (isDone ? ' done' : '');

    const badge = document.createElement('div');
    badge.className = 'bracket-match-num';
    badge.textContent = `#${mi + 1}`;
    card.appendChild(badge);

    [match.p1, match.p2].forEach(team => {
      const row = document.createElement('div');
      row.className = 'bracket-player' + (team && match.winner === team ? ' winner' : '') + (team ? ' clickable' : '');
      if (team) {
        const tc = team.color ?? '#888';
        row.innerHTML = `<span class="bp-dot" style="background:${tc}"></span>
          <span class="bp-name" style="color:${tc};font-weight:900">${team.charName ?? '?'}</span>`;
        if (team.fighters) {
          const sub = document.createElement('div');
          sub.style.cssText = 'font-size:9px;color:#556;padding-left:16px;line-height:1.5';
          sub.textContent = team.fighters.map(f => f.charName ?? '?').join(' + ');
          row.appendChild(sub);
        }
        row.addEventListener('click', e => { e.stopPropagation(); showFighterCard(team); });
      } else {
        row.innerHTML = '<span class="bp-dot" style="background:#333"></span><span class="bp-name">—</span>';
      }
      card.appendChild(row);
    });

    if (isDone && match.bo3Wins) {
      const sc = document.createElement('div');
      sc.className = 'bracket-score';
      sc.textContent = `${match.bo3Wins[0]} – ${match.bo3Wins[1]}`;
      card.appendChild(sc);
    }
    grid.appendChild(card);
  });

  container.appendChild(grid);

  const nextMatchBtn = document.getElementById('nextMatchBtn');
  if (nextMatchBtn) {
    if (t.completed) {
      nextMatchBtn.disabled = true;
      nextMatchBtn.textContent = '🏆 Tournament Over';
    } else {
      nextMatchBtn.disabled = false;
      nextMatchBtn.textContent = '⚔️ Fight Next Match';
    }
  }
}

// Select-all / clear buttons
document.addEventListener('click', e => {
  if (e.target.id === 'tSelectAllBtn') {
    if (!state.tournament) state.tournament = { size: 16, selectedFighters: [], mode: '1v1' };
    const roster = JSON.parse(localStorage.getItem('cgRoster') ?? '[]');
    const size   = state.tournament.size ?? 16;
    const tmode  = state.tournament.mode ?? '1v1';
    const slotCount = tmode === '2v2' ? size * 2 : size;
    // Select as many as possible up to slotCount
    state.tournament.selectedFighters = roster.slice(0, slotCount).map((_, i) => i);
    buildTournamentSetup();
  }
  if (e.target.id === 'tClearBtn') {
    if (state.tournament) state.tournament.selectedFighters = [];
    buildTournamentSetup();
  }
});
