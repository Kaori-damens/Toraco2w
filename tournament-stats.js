// ============================================================
// TOURNAMENT STATS MODAL
// ============================================================

const _TS_COLORS = [
  '#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#c77dff',
  '#ff9e40','#00d2d3','#ff85a1','#a8dadc','#e9c46a',
  '#f4a261','#2a9d8f','#e76f51','#a8c8e8','#d4a373',
];

function showTournamentStatsModal() {
  const t = state.tournament;
  if (!t || !t.agg) return;

  const entries = Object.values(t.agg);
  if (!entries.length) { alert('Không có dữ liệu thống kê.'); return; }

  // ── Helpers ──────────────────────────────────────────────────────
  const totalStats = e => {
    const cs = e.charStats || {};
    return (cs.strength || 0) + (cs.speed || 0) + (cs.durability || 0)
         + (cs.iq || 0) + (cs.battleiq || 0) + (cs.ma || 0);
  };

  const weaponLabel = wid => {
    if (typeof CG_WEAPONS !== 'undefined') {
      const w = CG_WEAPONS.find(w => w.id === wid);
      if (w) return `${w.icon} ${w.label}`;
    }
    return wid || '?';
  };

  const raceCap = r => r ? (r.charAt(0).toUpperCase() + r.slice(1)) : '?';

  // ── Fact computations ─────────────────────────────────────────────
  const topDmgEntry = entries.reduce((a, b) => b.totalDamage > a.totalDamage ? b : a);

  const dmgByWeapon = {};
  entries.forEach(e => {
    dmgByWeapon[e.weapon] = (dmgByWeapon[e.weapon] || 0) + e.totalDamage;
  });
  const topWeaponId  = Object.entries(dmgByWeapon).reduce((a, b) => b[1] > a[1] ? b : a)[0];
  const topWeaponDmg = dmgByWeapon[topWeaponId];

  const topSkillEntry = entries.reduce((a, b) => b.skills.length > a.skills.length ? b : a);
  const topStatsEntry = entries.reduce((a, b) => totalStats(b) > totalStats(a) ? b : a);
  const botStatsEntry = entries.reduce((a, b) => totalStats(b) < totalStats(a) ? b : a);

  // ── Aggregate by race/weapon for charts ───────────────────────────
  const raceCount = {}, raceWins = {}, raceGames = {};
  const weaponCount = {}, weaponWins = {}, weaponGames = {};
  entries.forEach(e => {
    const r = e.race || '?';
    raceCount[r]  = (raceCount[r]  || 0) + 1;
    raceWins[r]   = (raceWins[r]   || 0) + e.wins;
    raceGames[r]  = (raceGames[r]  || 0) + e.games;
    const w = e.weapon || '?';
    weaponCount[w] = (weaponCount[w] || 0) + 1;
    weaponWins[w]  = (weaponWins[w]  || 0) + e.wins;
    weaponGames[w] = (weaponGames[w] || 0) + e.games;
  });

  // ── Render fact cards ─────────────────────────────────────────────
  const factsEl = document.getElementById('ts-facts');
  if (factsEl) {
    factsEl.innerHTML = `
      <div class="ts-fact-card" style="border-top-color:${topDmgEntry.color}">
        <div class="ts-fact-icon">💥</div>
        <div class="ts-fact-label">Sát thương cao nhất</div>
        <div class="ts-fact-value" style="color:${topDmgEntry.color}">${topDmgEntry.name}</div>
        <div class="ts-fact-sub">${topDmgEntry.totalDamage.toFixed(0)} DMG tổng</div>
      </div>
      <div class="ts-fact-card">
        <div class="ts-fact-icon">⚔️</div>
        <div class="ts-fact-label">Vũ khí mạnh nhất</div>
        <div class="ts-fact-value">${weaponLabel(topWeaponId)}</div>
        <div class="ts-fact-sub">${topWeaponDmg.toFixed(0)} DMG tổng</div>
      </div>
      <div class="ts-fact-card" style="border-top-color:${topSkillEntry.color}">
        <div class="ts-fact-icon">🎓</div>
        <div class="ts-fact-label">Nhiều skill nhất</div>
        <div class="ts-fact-value" style="color:${topSkillEntry.color}">${topSkillEntry.name}</div>
        <div class="ts-fact-sub">${topSkillEntry.skills.length} skill${topSkillEntry.skills.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="ts-fact-card" style="border-top-color:${topStatsEntry.color}">
        <div class="ts-fact-icon">📈</div>
        <div class="ts-fact-label">Tổng stats cao nhất</div>
        <div class="ts-fact-value" style="color:${topStatsEntry.color}">${topStatsEntry.name}</div>
        <div class="ts-fact-sub">${totalStats(topStatsEntry)} pts</div>
      </div>
      <div class="ts-fact-card" style="border-top-color:${botStatsEntry.color}">
        <div class="ts-fact-icon">📉</div>
        <div class="ts-fact-label">Tổng stats thấp nhất</div>
        <div class="ts-fact-value" style="color:${botStatsEntry.color}">${botStatsEntry.name}</div>
        <div class="ts-fact-sub">${totalStats(botStatsEntry)} pts</div>
      </div>
    `;
  }

  // ── Draw charts ───────────────────────────────────────────────────
  _tsDrawPie('ts-race-pie',   raceCount,   raceCap);
  _tsDrawPie('ts-weapon-pie', weaponCount, weaponLabel);
  _tsDrawBar('ts-race-bar',   raceWins,   raceGames,   raceCap);
  _tsDrawBar('ts-weapon-bar', weaponWins, weaponGames, weaponLabel);

  document.getElementById('tournament-stats-modal').style.display = 'flex';
}

// ── Pie chart (count distribution) ───────────────────────────────────
function _tsDrawPie(canvasId, countMap, labelFn) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const keys = Object.keys(countMap);
  const total = keys.reduce((s, k) => s + countMap[k], 0);
  if (!total) return;

  // Sort by count desc so biggest slices come first
  keys.sort((a, b) => countMap[b] - countMap[a]);

  const legendRows   = Math.ceil(keys.length / 2);
  const legendH      = legendRows * 18 + 6;
  const cy           = (H - legendH) / 2;
  const r            = Math.min(W / 2, cy) - 8;
  const cx           = W / 2;

  let angle = -Math.PI / 2;
  keys.forEach((k, i) => {
    const frac  = countMap[k] / total;
    const sweep = frac * Math.PI * 2;
    const color = _TS_COLORS[i % _TS_COLORS.length];

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#0d0a1a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Percentage label inside slice
    if (frac > 0.07) {
      const mid = angle + sweep / 2;
      const lx  = cx + Math.cos(mid) * (r * 0.62);
      const ly  = cy + Math.sin(mid) * (r * 0.62);
      ctx.fillStyle    = '#fff';
      ctx.font         = 'bold 11px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(frac * 100)}%`, lx, ly);
    }
    angle += sweep;
  });

  // Legend below pie
  const legendStartY = cy + r + 10;
  const colW = Math.floor(W / 2);
  keys.forEach((k, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const lx  = col * colW + 8;
    const ly  = legendStartY + row * 18;
    ctx.fillStyle = _TS_COLORS[i % _TS_COLORS.length];
    ctx.fillRect(lx, ly + 3, 10, 10);
    ctx.fillStyle    = '#ccc';
    ctx.font         = '10px sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    const lbl = labelFn(k);
    const txt = `${lbl} (${countMap[k]})`;
    ctx.fillText(txt.length > 18 ? txt.slice(0, 17) + '…' : txt, lx + 14, ly + 8);
  });
}

// ── Bar chart (winrate by group) ──────────────────────────────────────
function _tsDrawBar(canvasId, winsMap, gamesMap, labelFn) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const keys = Object.keys(gamesMap).filter(k => gamesMap[k] > 0);
  if (!keys.length) return;

  // Sort by winrate desc
  keys.sort((a, b) => {
    const wa = (winsMap[a] || 0) / gamesMap[a];
    const wb = (winsMap[b] || 0) / gamesMap[b];
    return wb - wa;
  });

  const PAD_L = 42, PAD_R = 8, PAD_T = 22, PAD_B = 52;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const barW   = Math.max(12, Math.min(44, (chartW / keys.length) - 6));
  const gap    = (chartW - barW * keys.length) / (keys.length + 1);

  // Gridlines + Y axis
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(v => {
    const y = PAD_T + chartH - v * chartH;
    // Gridline
    ctx.strokeStyle = v === 0 ? '#555' : '#252525';
    ctx.beginPath();
    ctx.moveTo(PAD_L, y);
    ctx.lineTo(PAD_L + chartW, y);
    ctx.stroke();
    // Label
    ctx.fillStyle    = '#666';
    ctx.font         = '9px sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(v * 100)}%`, PAD_L - 4, y);
  });

  // Y axis line
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_L, PAD_T);
  ctx.lineTo(PAD_L, PAD_T + chartH);
  ctx.stroke();

  // Bars
  keys.forEach((k, i) => {
    const wr    = (winsMap[k] || 0) / gamesMap[k];
    const bx    = PAD_L + gap + i * (barW + gap);
    const bh    = Math.max(2, wr * chartH);
    const by    = PAD_T + chartH - bh;
    const color = _TS_COLORS[i % _TS_COLORS.length];

    // Bar fill with subtle gradient
    const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '88');
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, barW, bh);

    // Winrate label above bar
    ctx.fillStyle    = '#eee';
    ctx.font         = 'bold 9px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${Math.round(wr * 100)}%`, bx + barW / 2, by - 2);

    // X label (rotated)
    ctx.save();
    ctx.translate(bx + barW / 2, PAD_T + chartH + 5);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle    = '#aaa';
    ctx.font         = '9px sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    const lbl = labelFn(k);
    ctx.fillText(lbl.length > 12 ? lbl.slice(0, 11) + '…' : lbl, 0, 0);
    ctx.restore();
  });
}
