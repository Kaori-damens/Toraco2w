// ============================================================
// RESULT SCREEN
// ============================================================
// File này chứa một hàm duy nhất: showResult().
// Được gọi từ game-loop.js khi round kết thúc (win/draw/timeout).
//
// showResult() thực hiện theo thứ tự:
//   1. Capture stats vào tournament aggregate (nếu có)
//   2. Render tiêu đề kết quả (winner / draw / 2v2 team win)
//   3. Render bảng stats từng ball (hits, parries, damage, scaling)
//   4. Trigger audience reaction (quick_kill nếu <15s, long_match nếu >90s)
//   5. Xử lý BO3: cập nhật wins, check match winner, hiện nút tiếp theo
//   6. Xử lý Championship 1v1 BO1 và FFA phase (riêng nhau)
//   7. Gọi skillOnPostCombat() cho tất cả ball (Learning, Adaptation...)
//   8. Race trait Orc: thắng → +2 stat thấp nhất, thua → -3 stat cao nhất
//   9. Race trait Demon subrace: Beelzebub/Behemoth/Belphegor/Lucifer permanent changes
//  10. Race trait Goblin ×1: thắng game → +2 × 3 stat random
//  11. Race trait Skeleton: 2 lần thắng series → Lich Ascension (IQ ≥8)
//  12. Analytics tracking
//  13. showScreen('result') — chuyển sang màn hình kết quả

// ─── showResult ─────────────────────────────────────────────
// Hiển thị màn hình kết quả sau khi round kết thúc.
// Xử lý tất cả post-combat logic: BO3, Championship, race traits, skill hooks.
// Không có tham số — đọc trực tiếp từ state.
function showResult() {
  // Capture per-game stats into tournament aggregate before anything else
  if (state.tournament && typeof updateTournamentAggregateStats === 'function') {
    updateTournamentAggregateStats(); // ghi hits/dame/parries của game này vào aggregate
  }

  const titleEl  = document.getElementById('rTitle');
  const statsEl  = document.getElementById('rStats');
  const bo3Panel = document.getElementById('bo3-result-panel');
  const rematch  = document.getElementById('rematchBtn');
  const nextGame = document.getElementById('nextGameBtn');
  const bracketB = document.getElementById('bracketBtn');

  // ballLabel — tạo HTML label cho một ball: emoji + tên + icon vũ khí
  // Nếu có charName: hiện tên + weapon (nhỏ); nếu không: chỉ hiện weapon
  const ballLabel = b => b.charName
    ? `${b.charEmoji ?? ''} ${b.charName} <span style="color:#888;font-size:.8em">(${b.weaponDef.icon} ${b.weaponDef.name})</span>`
    : `${b.weaponDef.icon} ${b.weaponDef.name}`;

  // ── Tiêu đề kết quả — 3 trường hợp ──────────────────────────
  if (state.winner === 'draw' || (state.matchMode === '2v2' && state.winTeam === -1)) {
    // Hòa: state.winner = 'draw' hoặc 2v2 không có team nào thắng
    titleEl.textContent = t('result_draw');
    titleEl.className = 'r-title draw';
  } else if (state.matchMode === '2v2' && state.winTeam >= 0) {
    // 2v2: hiện màu team thắng (xanh cho team 0, cam cho team 1)
    const TC = ['#00ddff', '#ff8833'];
    const tc = TC[state.winTeam];
    const teamName = state.bo3?.fighters?.[state.winTeam]?.charName ?? `Team ${state.winTeam + 1}`;
    titleEl.innerHTML = `<span style="color:${tc};text-shadow:0 0 25px ${tc}">⚔️ ${teamName} WINS!</span>`;
    titleEl.className = 'r-title';
  } else {
    // 1v1 / FFA: hiện màu ball thắng
    const w = state.winner;
    titleEl.innerHTML = `<span style="color:${w.color};text-shadow:0 0 25px ${w.color}">● ${ballLabel(w)} WINS!</span>`;
    titleEl.className = 'r-title';
  }

  // ── Bảng stats từng ball ──────────────────────────────────
  // state.matchTime đơn vị frame, chia 60 → giây
  const lines = state.players.map(ball => {
    const isWinner = ball === state.winner;
    return `<strong style="color:${ball.color}">● ${ballLabel(ball)}</strong>${isWinner ? ' 🏆' : ''}<br>
    ${t('result_hits')}: ${ball.stats.hits} &nbsp;|&nbsp; ${t('result_parries')}: ${ball.stats.parries} &nbsp;|&nbsp; ${t('result_damage')}: ${ball.stats.damageDone.toFixed(0)}<br>
    ${t('result_scaling')}: ${ball.getScaleLabel()}`;
  });
  statsEl.innerHTML = lines.join('<br><br>') + `<br><br><em style="color:#555">${t('result_duration') || 'Duration'}: ${(state.matchTime / 60).toFixed(1)}s</em>`;

  // Audience reaction based on match duration
  if (typeof audienceReact === 'function') {
    const secs = state.matchTime / 60;
    if (secs < 15)      setTimeout(() => audienceReact('quick_kill'),  600);
    else if (secs > 90) setTimeout(() => audienceReact('long_match'),  600);
  }

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
    if (state.championship) {
      syncChampionshipBo3Wins(bo3.wins);
    } else if (state.tournament2v2 && state.matchMode === '2v2') {
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
      // Record in championship
      if (state.championship && state.championship.phases) {
        recordChampionshipMatchResult(mw);
        if (state.championship.completed) bracketB.textContent = '🏆 Championship Over';
      } else if (state.tournament2v2 && state.matchMode === '2v2') {
        recordTournamentMatchResult2v2(mw);
        if (state.tournament2v2.completed) bracketB.textContent = '🏆 Final Results';
      } else if (state.tournament) {
        recordTournamentMatchResult(mw);
        if (state.tournament.completed) bracketB.textContent = '🏆 Final Results';
      }
      // ── PVP Reward Wheel (tournament matches only) ──
      if (typeof showPVPRewardWheel === 'function' && (state.tournament || state.tournament2v2 || state.championship)) {
        const _pvpShow = () => showPVPRewardWheel(mw);
        if (mw?.charStats?.race === 'primordial' && typeof showPrimordialElementalWheel === 'function') {
          // Elemental Wheel là reward duy nhất cho Primordial — không chain sang PVP wheel.
          // _csCommitAllPending được gọi bên trong _ewOnLand nên history vẫn commit đúng lúc.
          setTimeout(() => showPrimordialElementalWheel(mw, null), 500);
        } else if (mw?.charStats?.subrace?.label === 'Principalities' && typeof showAngelBlessing === 'function') {
          const _abCs = mw.charStats, _abSK = ['strength','speed','durability','iq','battleiq','ma'];
          const _abK = _abSK.reduce((a, b) => (_abCs[a]??0) < (_abCs[b]??0) ? a : b);
          _abCs[_abK] = (_abCs[_abK]??0) + 2;
          if (typeof csAddHistoryChange === 'function' && state?.championship) {
            const _abSH = { strength:'STR', speed:'SPD', durability:'DUR', iq:'IQ', battleiq:'BIQ', ma:'MA' };
            csAddHistoryChange(mw, `👼 +2 ${_abSH[_abK] ?? _abK.toUpperCase()} (Angel Blessing)`);
          }
          if (typeof saveChampionshipProgress==='function' && typeof state!=='undefined' && state?.championship) saveChampionshipProgress();
          setTimeout(() => showAngelBlessing(mw, _abK, _pvpShow), 500);
        } else {
          setTimeout(_pvpShow, 500);
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

  // ── Championship 1v1 BO1 phase handling (no bo3 object) ──
  if (state.championship && state.championship.phases && state.matchMode === '1v1' && !state.bo3) {
    rematch.style.display = 'none';
    if (menuBtnR) menuBtnR.style.display = 'none';
    bracketB.style.display = '';
    bracketB.textContent = '🏆 View Bracket';
    const winner = state.winner && state.winner !== 'draw' ? state.winner : null;
    if (winner) {
      const winnerIdx = state.players.indexOf(winner);
      const mw = state.fighters[winnerIdx] ?? null;
      if (mw) {
        recordChampionshipMatchResult(mw);
        if (state.championship.completed) bracketB.textContent = '🏆 Championship Over';
        if (typeof showPVPRewardWheel === 'function') {
          const _pvpShowBO1 = () => showPVPRewardWheel(mw);
          if (mw?.charStats?.race === 'primordial' && typeof showPrimordialElementalWheel === 'function') {
            setTimeout(() => showPrimordialElementalWheel(mw, null), 500);
          } else if (mw?.charStats?.subrace?.label === 'Principalities' && typeof showAngelBlessing === 'function') {
            const _abCs2 = mw.charStats, _abSK2 = ['strength','speed','durability','iq','battleiq','ma'];
            const _abK2 = _abSK2.reduce((a, b) => (_abCs2[a]??0) < (_abCs2[b]??0) ? a : b);
            _abCs2[_abK2] = (_abCs2[_abK2]??0) + 2;
            if (typeof csAddHistoryChange === 'function' && state?.championship) {
              const _abSH2 = { strength:'STR', speed:'SPD', durability:'DUR', iq:'IQ', battleiq:'BIQ', ma:'MA' };
              csAddHistoryChange(mw, `👼 +2 ${_abSH2[_abK2] ?? _abK2.toUpperCase()} (Angel Blessing)`);
            }
            if (typeof saveChampionshipProgress==='function' && typeof state!=='undefined' && state?.championship) saveChampionshipProgress();
            setTimeout(() => showAngelBlessing(mw, _abK2, _pvpShowBO1), 500);
          } else {
            setTimeout(_pvpShowBO1, 500);
          }
        }
      }
    }
  }

  // ── Championship FFA phase handling ──
  if (state.championship && state.championship.phases && state.matchMode === 'ffa' && !state.bo3) {
    rematch.style.display = 'none';
    if (menuBtnR) menuBtnR.style.display = 'none';
    bracketB.style.display = '';
    bracketB.textContent = '🏆 View Bracket';
    const winner = state.winner && state.winner !== 'draw' ? state.winner : null;
    if (winner) {
      // Map ball winner back to fighter object
      const winnerIdx = state.players.indexOf(winner);
      const winnerFighter = state.fighters[winnerIdx] ?? null;
      if (winnerFighter) {
        recordChampionshipFfaResult(winnerFighter);
        if (typeof showPVPRewardWheel === 'function') {
          const _pvpShowFfa = () => showPVPRewardWheel(winnerFighter);
          if (winnerFighter?.charStats?.race === 'primordial' && typeof showPrimordialElementalWheel === 'function') {
            setTimeout(() => showPrimordialElementalWheel(winnerFighter, null), 500);
          } else if (winnerFighter?.charStats?.subrace?.label === 'Principalities' && typeof showAngelBlessing === 'function') {
            const _abCs3 = winnerFighter.charStats, _abSK3 = ['strength','speed','durability','iq','battleiq','ma'];
            const _abK3 = _abSK3.reduce((a, b) => (_abCs3[a]??0) < (_abCs3[b]??0) ? a : b);
            _abCs3[_abK3] = (_abCs3[_abK3]??0) + 2;
            if (typeof csAddHistoryChange === 'function' && state?.championship) {
              const _abSH3 = { strength:'STR', speed:'SPD', durability:'DUR', iq:'IQ', battleiq:'BIQ', ma:'MA' };
              csAddHistoryChange(winnerFighter, `👼 +2 ${_abSH3[_abK3] ?? _abK3.toUpperCase()} (Angel Blessing)`);
            }
            if (typeof saveChampionshipProgress==='function' && typeof state!=='undefined' && state?.championship) saveChampionshipProgress();
            setTimeout(() => showAngelBlessing(winnerFighter, _abK3, _pvpShowFfa), 500);
          } else {
            setTimeout(_pvpShowFfa, 500);
          }
        }
      }
      if (state.championship.completed) bracketB.textContent = '🏆 Championship Over';
    }
  }

  // ── Post-combat skill hooks ───────────────────────────────
  // Gọi skillOnPostCombat() cho mỗi ball: Learning (+1 stat), Adaptation (lưu reduction)...
  // won = true nếu ball này là người thắng (hoặc team thắng trong 2v2)
  // Post-combat skill hooks (Learning, Adaptation)
  state.players.forEach((ball, i) => {
    const fi = state.fighters[i];
    if (!fi) return;
    const won = state.matchMode === '2v2'
      ? (ball.teamId === state.winTeam)
      : (ball === state.winner);
    skillOnPostCombat(ball, won, fi);
  });

  // ── Race trait: Orc (Win: +2 lowest stat / Lose: -3 highest stat) ──
  // Tournament/championship only. Applied once per MATCH, not per BO3 game.
  // BO1 → apply now (this game IS the match).
  // BO3 → apply only when match winner is decided (someone reaches winsNeeded).
  //
  // _orcMatchDone: cờ kiểm tra series đã quyết định chưa
  //   BO1: luôn true (game = match)
  //   BO3: true khi ai đó đạt winsNeeded (mặc định 2)
  const _inTournament = !!(state.tournament || state.tournament2v2 || state.championship);
  const _isDraw       = state.winner === 'draw' || (state.matchMode === '2v2' && state.winTeam === -1);
  let _orcMatchDone   = !state.bo3; // BO1: yes; BO3: check wins
  if (state.bo3) {
    const _wn = state.bo3.winsNeeded ?? 2;
    _orcMatchDone = state.bo3.wins[0] >= _wn || state.bo3.wins[1] >= _wn;
  }
  if (_inTournament && _orcMatchDone && !_isDraw) {
    const _OS = ['strength','speed','durability','iq','battleiq','ma'];
    const _SH = { strength:'STR', speed:'SPD', durability:'DUR', iq:'IQ', battleiq:'BIQ', ma:'MA' };
    state.players.forEach((ball, i) => {
      if (ball.charRace !== 'orc') return;
      const fi = state.fighters?.[i];
      if (!fi?.charStats) return;
      const cs = fi.charStats;
      let won;
      if (state.bo3) {
        // Use match wins to determine winner, not the last game's state.winner
        const _wn2 = state.bo3.winsNeeded ?? 2;
        const _mwi = state.bo3.wins[0] >= _wn2 ? 0 : 1; // match winner index in state.players
        won = (state.matchMode === '2v2') ? (ball.teamId === state.winTeam) : (i === _mwi);
      } else {
        won = (state.matchMode === '2v2') ? (ball.teamId === state.winTeam) : (ball === state.winner);
      }
      if (won) {
        const k = _OS.reduce((a, b) => (cs[b] ?? 0) < (cs[a] ?? 0) ? b : a);
        cs[k] = (cs[k] ?? 0) + 2;
        spawnDamageNumber(ball.x, ball.y - ball.radius - 18, `🗡️ ORC +2 ${_SH[k]}!`, '#ff7733');
        if (state.championship && typeof csAddHistoryChange === 'function')
          csAddHistoryChange(fi, `+2 ${_SH[k]} (Orc — Win)`);
      } else {
        const k = _OS.reduce((a, b) => (cs[b] ?? 0) > (cs[a] ?? 0) ? b : a);
        cs[k] = Math.max(0, (cs[k] ?? 0) - 3);
        spawnDamageNumber(ball.x, ball.y - ball.radius - 18, `🗡️ ORC -3 ${_SH[k]}!`, '#995522');
        if (state.championship && typeof csAddHistoryChange === 'function')
          csAddHistoryChange(fi, `-3 ${_SH[k]} (Orc — Loss)`);
      }
    });
  }

  // ── Race trait: Demon subraces (permanent stat changes) ──────────────
  // Mỗi subrace có effect khác nhau, áp dụng vĩnh viễn lên charStats:
  //   Beelzebub (Gluttony): game win → +1 stat ngẫu nhiên
  //   Behemoth  (Wrath):    mọi game → -1 DUR (dù win hay lose)
  //   Belphegor (Sloth):    game win → +1 DUR
  //   Lucifer   (Pride):    series loss → -1 TẤT CẢ stat
  // Per-game effects (Beelzebub win, Behemoth any, Belphegor win): fire every game.
  // Per-series effects (Lucifer loss): fire only when series is decided.
  const _DS = ['strength','speed','durability','iq','battleiq','ma'];
  const _DSH = { strength:'STR', speed:'SPD', durability:'DUR', iq:'IQ', battleiq:'BIQ', ma:'MA' };
  state.players.forEach((ball, i) => {
    if (ball.charRace !== 'demon') return;
    const fi = state.fighters?.[i];
    if (!fi?.charStats) return;
    const cs  = fi.charStats;
    const srl = ball.charSubrace?.label;
    const gameWon = state.matchMode === '2v2'
      ? (ball.teamId === state.winTeam)
      : (ball === state.winner);
    const isDraw = state.winner === 'draw' || (state.matchMode === '2v2' && state.winTeam === -1);

    // Beelzebub: each game WIN → +1 random stat permanent
    if (srl === 'Beelzebub' && gameWon && !isDraw) {
      const k = _DS[Math.floor(Math.random() * _DS.length)];
      cs[k] = (cs[k] ?? 0) + 1;
      spawnDamageNumber(ball.x, ball.y - ball.radius - 18, `😈 GLUTTONY +1 ${_DSH[k]}!`, '#ff8800');
      if (state.championship && typeof csAddHistoryChange === 'function')
        csAddHistoryChange(fi, `+1 ${_DSH[k]} (Beelzebub — Gluttony)`);
    }

    // Behemoth: after each game (win OR lose) → −1 DUR permanent
    if (srl === 'Behemoth') {
      cs.durability = Math.max(0, (cs.durability ?? 0) - 1);
      spawnDamageNumber(ball.x, ball.y - ball.radius - 18, '😈 WRATH −1 DUR', '#cc4400');
      if (state.championship && typeof csAddHistoryChange === 'function')
        csAddHistoryChange(fi, '-1 DUR (Behemoth — Wrath)');
    }

    // Belphegor: each game WIN (survive) → +1 DUR permanent
    if (srl === 'Belphegor' && gameWon && !isDraw) {
      cs.durability = (cs.durability ?? 0) + 1;
      spawnDamageNumber(ball.x, ball.y - ball.radius - 18, '😈 SLOTH +1 DUR', '#4488cc');
      if (state.championship && typeof csAddHistoryChange === 'function')
        csAddHistoryChange(fi, '+1 DUR (Belphegor — Sloth)');
    }

    // Lucifer: series LOSS → −1 all stats permanent (only when match is decided)
    if (srl === 'Lucifer' && _orcMatchDone && !_isDraw) {
      let seriesLost;
      if (state.bo3) {
        const wn3 = state.bo3.winsNeeded ?? 2;
        const mwi = state.bo3.wins[0] >= wn3 ? 0 : 1;
        seriesLost = state.matchMode === '2v2' ? (ball.teamId !== state.winTeam) : (i !== mwi);
      } else {
        seriesLost = !gameWon;
      }
      if (seriesLost) {
        for (const k of _DS) cs[k] = Math.max(0, (cs[k] ?? 0) - 1);
        spawnDamageNumber(ball.x, ball.y - ball.radius - 18, '😈 PRIDE −1 ALL!', '#9900cc');
        if (state.championship && typeof csAddHistoryChange === 'function')
          csAddHistoryChange(fi, '-1 All Stats (Lucifer — Pride)');
      }
    }
  });

  // ── Race trait: Goblin ×1 (each game win → +2 to 3 random stats, can repeat) ──
  // Khác Orc (chỉ khi match kết thúc): Goblin ×1 fire mỗi game win — không cần series xong.
  // Loop 3 lần, mỗi lần pick 1 stat random trong _G1S, +2. Cùng stat có thể tích.
  // Ví dụ: 3 lần pick STR → +6 STR. Hiếm nhưng xảy ra được.
  if (_inTournament) {
    const _G1S  = ['strength','speed','durability','iq','battleiq','ma'];
    const _G1SH = { strength:'STR', speed:'SPD', durability:'DUR', iq:'IQ', battleiq:'BIQ', ma:'MA' };
    state.players.forEach((ball, i) => {
      if (ball.charRace !== 'goblin' || ball.charSubrace?.label !== '×1') return;
      const fi = state.fighters?.[i];
      if (!fi?.charStats) return;
      const cs = fi.charStats;
      const gameWon = state.matchMode === '2v2'
        ? (ball.teamId === state.winTeam)
        : (ball === state.winner);
      const isDraw = state.winner === 'draw' || (state.matchMode === '2v2' && state.winTeam === -1);
      if (!gameWon || isDraw) return;
      const gained = {};
      for (let r = 0; r < 3; r++) {
        const k = _G1S[Math.floor(Math.random() * _G1S.length)];
        cs[k] = (cs[k] ?? 0) + 2;
        gained[k] = (gained[k] || 0) + 2;
      }
      const msg = Object.entries(gained).map(([k, v]) => `+${v} ${_G1SH[k]}`).join(' ');
      spawnDamageNumber(ball.x, ball.y - ball.radius - 20, `👺 ×1 ${msg}`, '#88ff44');
      if (state.championship && typeof csAddHistoryChange === 'function')
        csAddHistoryChange(fi, `${msg} (Goblin ×1 — Win)`);
    });
  }

  // ── Race trait: Skeleton (win counter → Lich at 2 wins) ──
  // Đếm số lần thắng series (cs.skeletonWins), khi đạt 2:
  //   cs.isLich = true, IQ nâng lên tối thiểu 8 (Skeleton thường có IQ=1)
  //   Lý do: Lich là undead cao cấp → có intelligence (cái xương thường thì không)
  // Only when a full match/series is decided (same guard as Orc).
  if (_inTournament && _orcMatchDone && !_isDraw) {
    const _SKS = ['strength','speed','durability','iq','battleiq','ma'];
    state.players.forEach((ball, i) => {
      if (ball.charRace !== 'skeleton') return;
      const fi = state.fighters?.[i];
      if (!fi?.charStats) return;
      const cs = fi.charStats;
      // Determine series winner
      let seriesWon;
      if (state.bo3) {
        const wn3 = state.bo3.winsNeeded ?? 2;
        const mwi = state.bo3.wins[0] >= wn3 ? 0 : 1;
        seriesWon = state.matchMode === '2v2' ? (ball.teamId === state.winTeam) : (i === mwi);
      } else {
        seriesWon = ball === state.winner;
      }
      if (!seriesWon) return;
      cs.skeletonWins = (cs.skeletonWins || 0) + 1;
      // At 2 wins: become Lich → IQ raised to minimum 8
      if (cs.skeletonWins === 2 && !cs.isLich) {
        cs.isLich = true;
        const oldIQ = cs.iq ?? 0;
        cs.iq = Math.max(oldIQ, 8);
        spawnDamageNumber(ball.x, ball.y - ball.radius - 24, '💀 LICH ASCENSION!', '#8844ff');
        spawnBigAnnouncement?.('💀 SKELETON → LICH!', '#8844ff');
        if (state.championship && typeof csAddHistoryChange === 'function')
          csAddHistoryChange(fi, `💀 Lich Ascension — IQ → ${cs.iq} (Skeleton — 2nd Win)`);
      }
    });
  }

  // Analytics tracking — A: record match data for win-rate stats
  if (typeof buildAndTrackMatch === 'function') buildAndTrackMatch();

  showScreen('result');

  // Championship auto mode — skip result screen and continue automatically
  if (state.championship && state.champAuto && typeof champAutoTick === 'function') {
    champAutoTick();
  }
}
