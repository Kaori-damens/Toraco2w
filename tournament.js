// ============================================================
// TOURNAMENT
// ============================================================
// Convert a cgRoster entry → fighter object (used by state.fighters / bracket)
function rosterToFighter(ch) {
  return {
    weaponId:   ch.weapon,
    color:      ch.color,
    charName:   ch.name,
    charEmoji:  ch.raceEmoji ?? '',
    charStats:  { ...ch.stats, race: ch.race ?? null, subrace: ch.subrace ?? null },
    skills:     ch.skills ?? [],
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
    const nextRound   = t.rounds[t.currentRound + 1];
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
    }
  }
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

  const roundNames = ['Round 1','Round 2','Quarter-Finals','Semi-Finals','Final'];
  const totalRounds = t.rounds.length;

  titleEl.textContent = t.completed ? '🏆 Tournament Complete!' : '🏆 Tournament Bracket';

  container.innerHTML = '';
  t.rounds.forEach((round, ri) => {
    const col = document.createElement('div');
    col.className = 'bracket-round';
    const label = document.createElement('div');
    label.className = 'bracket-round-label';
    const labelIdx = totalRounds - 1 - ri;
    label.textContent = roundNames[Math.min(labelIdx, roundNames.length - 1)] ??
                        `Round ${ri + 1}`;
    col.appendChild(label);

    round.forEach((match, mi) => {
      const isCurrent = ri === t.currentRound && mi === t.currentMatch && !t.completed;
      const isDone    = match.winner !== null;
      const div = document.createElement('div');
      div.className = 'bracket-match' + (isCurrent ? ' current' : '') + (isDone ? ' done' : '');

      const players = [match.p1, match.p2];
      players.forEach(p => {
        const row = document.createElement('div');
        row.className = 'bracket-player' + (p && match.winner === p ? ' winner' : '');
        const dot = document.createElement('span');
        dot.className = 'bp-dot';
        dot.style.background = p?.color ?? '#333';
        const name = document.createElement('span');
        name.textContent = p ? (p.charName ?? p.weaponId ?? '?') : '—';
        row.appendChild(dot);
        row.appendChild(name);
        div.appendChild(row);
      });

      if (isDone && match.bo3Wins) {
        const sc = document.createElement('div');
        sc.className = 'bracket-score';
        sc.textContent = `${match.bo3Wins[0]} – ${match.bo3Wins[1]}`;
        div.appendChild(sc);
      }
      col.appendChild(div);
    });
    container.appendChild(col);
  });

  // Champion display
  if (t.completed) {
    const lastRound = t.rounds[t.rounds.length - 1];
    const champion  = lastRound[0]?.winner;
    if (champion) {
      const champDiv = document.createElement('div');
      champDiv.className = 'bracket-round';
      champDiv.innerHTML = `
        <div class="bracket-round-label">Champion</div>
        <div class="bracket-match current">
          <div class="bracket-player winner" style="color:${champion.color};font-size:14px;font-weight:900;padding:8px 4px">
            <span class="bp-dot" style="background:${champion.color}"></span>
            ${champion.charName ?? champion.weaponId}
          </div>
        </div>`;
      container.appendChild(champDiv);
    }
    document.getElementById('nextMatchBtn').disabled = true;
    document.getElementById('nextMatchBtn').textContent = 'Tournament Over';
  } else {
    document.getElementById('nextMatchBtn').disabled = false;
    document.getElementById('nextMatchBtn').textContent = '⚔️ Fight Next Match';
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
    if (t.currentRound >= t.rounds.length) t.completed = true;
  }
  renderBracket2v2();
}

function renderBracket2v2() {
  const t = state.tournament2v2;
  const container = document.getElementById('bracket-content');
  const titleEl   = document.getElementById('bracket-title');
  if (!container || !t) return;

  titleEl.textContent = t.completed ? '🏆 2v2 Tournament Complete!' : '🏆 2v2 Tournament Bracket';
  container.innerHTML = '';

  const roundNames = ['Round 1','Round 2','Quarter-Finals','Semi-Finals','Final'];
  const totalRounds = t.rounds.length;

  t.rounds.forEach((round, ri) => {
    const col = document.createElement('div');
    col.className = 'bracket-round';
    const label = document.createElement('div');
    label.className = 'bracket-round-label';
    const labelIdx = totalRounds - 1 - ri;
    label.textContent = roundNames[Math.min(labelIdx, roundNames.length - 1)] ?? `Round ${ri + 1}`;
    col.appendChild(label);

    round.forEach((match, mi) => {
      const isCurrent = ri === t.currentRound && mi === t.currentMatch && !t.completed;
      const isDone    = match.winner !== null;
      const div = document.createElement('div');
      div.className = 'bracket-match' + (isCurrent ? ' current' : '') + (isDone ? ' done' : '');

      [match.p1, match.p2].forEach(team => {
        const row = document.createElement('div');
        row.className = 'bracket-player' + (team && match.winner === team ? ' winner' : '');
        if (team) {
          const tc = team.color ?? '#888';
          row.innerHTML = `
            <span class="bp-dot" style="background:${tc}"></span>
            <span style="font-size:11px;font-weight:900;color:${tc}">${team.charName ?? '?'}</span>`;
          if (team.fighters) {
            const sub = document.createElement('div');
            sub.style.cssText = 'font-size:9px;color:#556;padding-left:16px;line-height:1.5';
            sub.textContent = team.fighters.map(f => f.charName ?? f.weaponId ?? '?').join(' + ');
            row.appendChild(sub);
          }
        } else {
          row.innerHTML = '<span class="bp-dot" style="background:#333"></span><span>—</span>';
        }
        div.appendChild(row);
      });

      if (isDone && match.bo3Wins) {
        const sc = document.createElement('div');
        sc.className = 'bracket-score';
        sc.textContent = `${match.bo3Wins[0]} – ${match.bo3Wins[1]}`;
        div.appendChild(sc);
      }
      col.appendChild(div);
    });
    container.appendChild(col);
  });

  if (t.completed) {
    const champion = t.rounds[t.rounds.length - 1][0]?.winner;
    if (champion) {
      const champDiv = document.createElement('div');
      champDiv.className = 'bracket-round';
      champDiv.innerHTML = `
        <div class="bracket-round-label">Champions</div>
        <div class="bracket-match current">
          <div class="bracket-player winner" style="color:${champion.color};font-size:13px;font-weight:900;padding:8px 4px">
            <span class="bp-dot" style="background:${champion.color}"></span>
            ${champion.charName ?? '?'}
          </div>
        </div>`;
      container.appendChild(champDiv);
    }
    document.getElementById('nextMatchBtn').disabled = true;
    document.getElementById('nextMatchBtn').textContent = 'Tournament Over';
  } else {
    document.getElementById('nextMatchBtn').disabled = false;
    document.getElementById('nextMatchBtn').textContent = '⚔️ Fight Next Match';
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
