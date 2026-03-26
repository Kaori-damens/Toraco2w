// ============================================================
// RESULT SCREEN
// ============================================================
function showResult() {
  const titleEl  = document.getElementById('rTitle');
  const statsEl  = document.getElementById('rStats');
  const bo3Panel = document.getElementById('bo3-result-panel');
  const rematch  = document.getElementById('rematchBtn');
  const nextGame = document.getElementById('nextGameBtn');
  const bracketB = document.getElementById('bracketBtn');

  const ballLabel = b => b.charName
    ? `${b.charEmoji ?? ''} ${b.charName} <span style="color:#888;font-size:.8em">(${b.weaponDef.icon} ${b.weaponDef.name})</span>`
    : `${b.weaponDef.icon} ${b.weaponDef.name}`;

  if (state.winner === 'draw' || (state.matchMode === '2v2' && state.winTeam === -1)) {
    titleEl.textContent = '🤝 DRAW!';
    titleEl.className = 'r-title draw';
  } else if (state.matchMode === '2v2' && state.winTeam >= 0) {
    const TC = ['#00ddff', '#ff8833'];
    const tc = TC[state.winTeam];
    const teamName = state.bo3?.fighters?.[state.winTeam]?.charName ?? `Team ${state.winTeam + 1}`;
    titleEl.innerHTML = `<span style="color:${tc};text-shadow:0 0 25px ${tc}">⚔️ ${teamName} WINS!</span>`;
    titleEl.className = 'r-title';
  } else {
    const w = state.winner;
    titleEl.innerHTML = `<span style="color:${w.color};text-shadow:0 0 25px ${w.color}">● ${ballLabel(w)} WINS!</span>`;
    titleEl.className = 'r-title';
  }

  const lines = state.players.map(ball => {
    const isWinner = ball === state.winner;
    return `<strong style="color:${ball.color}">● ${ballLabel(ball)}</strong>${isWinner ? ' 🏆' : ''}<br>
    Hits: ${ball.stats.hits} &nbsp;|&nbsp; Parries: ${ball.stats.parries} &nbsp;|&nbsp; Damage: ${ball.stats.damageDone.toFixed(0)}<br>
    Scaling: ${ball.getScaleLabel()}`;
  });
  statsEl.innerHTML = lines.join('<br><br>') + `<br><br><em style="color:#555">Duration: ${(state.matchTime / 60).toFixed(1)}s</em>`;

  // ── BO3 handling ──
  rematch.style.display  = '';
  nextGame.style.display = 'none';
  bracketB.style.display = 'none';
  bo3Panel.style.display = 'none';
  const menuBtnR = document.getElementById('menuBtnR');
  const blogBtn  = document.getElementById('battleLogBtn');
  const statsBtn = document.getElementById('statsLogBtn');
  if (menuBtnR) menuBtnR.style.display = '';
  if (blogBtn)  blogBtn.style.display  = (state.battleLog?.length > 0) ? '' : 'none';
  if (statsBtn) statsBtn.style.display = (state.statsLog?.length > 1) ? '' : 'none';

  if (state.bo3) {
    const bo3 = state.bo3;
    bo3Panel.style.display = '';
    rematch.style.display  = 'none';
    if (menuBtnR) menuBtnR.style.display = 'none';

    // Record game result
    if (state.winner !== 'draw') {
      const winIdx = state.matchMode === '2v2' ? state.winTeam : state.players.indexOf(state.winner);
      if (winIdx >= 0) bo3.wins[winIdx]++;
    }
    bo3.gameNum++;

    // Update BO3 result panel
    const f0 = bo3.fighters[0], f1 = bo3.fighters[1];
    document.getElementById('bo3-r-f1').textContent = f0?.charName ?? f0?.weaponId ?? '—';
    document.getElementById('bo3-r-f2').textContent = f1?.charName ?? f1?.weaponId ?? '—';
    document.getElementById('bo3-r-score').textContent = `${bo3.wins[0]} : ${bo3.wins[1]}`;

    // Sync wins back to bracket match record
    if (state.tournament2v2 && state.matchMode === '2v2') {
      const t  = state.tournament2v2;
      const m  = t.rounds[t.currentRound]?.[t.currentMatch];
      if (m) m.bo3Wins = [...bo3.wins];
    } else if (state.tournament) {
      const t  = state.tournament;
      const m  = t.rounds[t.currentRound]?.[t.currentMatch];
      if (m) m.bo3Wins = [...bo3.wins];
    }

    const winsNeeded = bo3.winsNeeded ?? 2;
    const matchWinner = bo3.wins[0] >= winsNeeded ? 0 : bo3.wins[1] >= winsNeeded ? 1 : -1;
    if (matchWinner >= 0) {
      const mw = bo3.fighters[matchWinner];
      document.getElementById('bo3-game-label').textContent =
        `Match over — ${mw.charName ?? mw.weaponId} advances!`;
      bracketB.style.display = '';
      // Record in tournament bracket
      if (state.tournament2v2 && state.matchMode === '2v2') {
        recordTournamentMatchResult2v2(mw);
        if (state.tournament2v2.completed) bracketB.textContent = '🏆 Final Results';
      } else if (state.tournament) {
        recordTournamentMatchResult(mw);
        if (state.tournament.completed) {
          bracketB.textContent = '🏆 Final Results';
        }
      }
    } else {
      const gameNum = bo3.gameNum;
      const totalGames = (winsNeeded * 2) - 1;
      document.getElementById('bo3-game-label').textContent =
        `Game ${gameNum - 1} done · Next: Game ${gameNum} of ${totalGames}`;
      nextGame.style.display = '';
    }
  }

  // Post-combat skill hooks (Learning, Adaptation)
  state.players.forEach((ball, i) => {
    const fi = state.fighters[i];
    if (!fi) return;
    const won = state.matchMode === '2v2'
      ? (ball.teamId === state.winTeam)
      : (ball === state.winner);
    skillOnPostCombat(ball, won, fi);
  });

  showScreen('result');
}
