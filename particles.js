// ============================================================
// PARTICLES
// ============================================================
const particles = [];

function spawnSparks(x, y, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 4;
    particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      life: 20 + Math.random()*15, maxLife: 35,
      color: `hsl(${40+Math.random()*20},100%,${60+Math.random()*30}%)`,
      r: 2 + Math.random()*2, type: 'spark' });
  }
}

function spawnBlood(x, y, count, dir) {
  for (let i = 0; i < count; i++) {
    const a = dir + (Math.random()-0.5) * Math.PI;
    const sp = 1.5 + Math.random() * 3;
    particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      life: 18 + Math.random()*10, maxLife: 28,
      color: `hsl(0,90%,${40+Math.random()*20}%)`,
      r: 2 + Math.random()*2, type: 'blood' });
  }
}

function spawnDeathExplosion(x, y, color) {
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 6;
    particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      life: 35 + Math.random()*25, maxLife: 60,
      color: i < 15 ? color : `hsl(${Math.random()*360},80%,60%)`,
      r: 3 + Math.random()*5, type: 'death' });
  }
}

// Big centre announcement (Speed Floor, Rage Mode, etc.)
const bigAnnouncements = [];
function spawnBigAnnouncement(text, color) {
  bigAnnouncements.push({ text, color, life: 180, maxLife: 180 });
  // also SFX
  playTone(text.includes('RAGE') ? 220 : 440, 'sawtooth', 0.35, 0.08, 0.4);
}
function updateDrawBigAnnouncements(ctx) {
  for (let i = bigAnnouncements.length - 1; i >= 0; i--) {
    const a = bigAnnouncements[i];
    a.life--;
    if (a.life <= 0) { bigAnnouncements.splice(i, 1); continue; }
    const progress = 1 - a.life / a.maxLife;
    const alpha    = a.life < 40 ? a.life / 40 : 1;
    const scale    = 0.6 + 0.4 * Math.min(1, progress * 4);
    const y        = CH / 2 - 40 - progress * 30;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.floor(38 * scale)}px 'Segoe UI', sans-serif`;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(a.text, CW / 2 + 2, y + 2);
    // glow
    ctx.shadowColor = a.color;
    ctx.shadowBlur  = 18;
    ctx.fillStyle   = a.color;
    ctx.fillText(a.text, CW / 2, y);
    ctx.restore();
  }
}

// ── Weapon scale numeric value (for chart) ──
function getBallScaleVal(ball) {
  const def = ball.weaponDef, w = ball.weapon;
  if (!def || !w) return 0;
  switch (def.id) {
    case 'fists':    return +(w.attackCooldown ?? def.attackCooldown);
    case 'sword':    return +(w.bonusDamage    || 0);
    case 'dagger':   return +((w.spinBonus     || 0) * 100).toFixed(3); // ×100 for readability
    case 'spear':    return +(w.bonusDamage    || 0);
    case 'bow':      return +(w.arrowCount     || 1);
    case 'scythe':   return +(w.hits           || 0);
    case 'hammer':   return +(w.bonusKnockback || 0);
    case 'shuriken': return +(w.shurikenCount  || 1);
    default:         return 0;
  }
}
function getBallScaleUnit(ball) {
  const def = ball.weaponDef;
  if (!def) return '';
  switch (def.id) {
    case 'fists':    return 'CD';
    case 'sword':    return '+dmg';
    case 'dagger':   return 'spin×100';
    case 'spear':    return '+dmg';
    case 'bow':      return 'arrows';
    case 'scythe':   return 'hits(→5)';
    case 'hammer':   return '+kb';
    case 'shuriken': return 'stars';
    default:         return '';
  }
}

// ── Stats Log (per-second charts) ──
let _activeChart = 'speed';

function drawStatsChart(metric) {
  const canvas = document.getElementById('stats-chart-canvas');
  const legendEl = document.getElementById('stats-chart-legend');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 28, right: 18, bottom: 34, left: 52 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#080816';
  ctx.fillRect(0, 0, W, H);

  const data = state.statsLog ?? [];
  if (data.length < 2) {
    ctx.fillStyle = '#445'; ctx.textAlign = 'center';
    ctx.font = '13px sans-serif';
    ctx.fillText('Not enough data', W/2, H/2);
    return;
  }

  // For 'scale' metric, read scaleVal field instead of metric key
  const metricKey = metric === 'scale' ? 'scaleVal' : metric;

  // Collect all values to find max
  let maxVal = 0;
  data.forEach(s => s.balls.forEach(b => { maxVal = Math.max(maxVal, b[metricKey] ?? 0); }));
  maxVal = (maxVal * 1.15) || 1;

  const nSnaps = data.length;
  const xScale = cW / Math.max(1, nSnaps - 1);
  const yScale = cH / maxVal;

  // Grid + Y labels
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + cH - (i / gridLines) * cH;
    const val = (maxVal * i / gridLines);
    ctx.strokeStyle = '#12122a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
    ctx.fillStyle = '#445'; ctx.font = '9px monospace'; ctx.textAlign = 'right';
    ctx.fillText(val >= 1 ? val.toFixed(1) : val.toFixed(3), pad.left - 4, y + 3);
  }

  // X axis + labels
  const tickEvery = Math.max(1, Math.ceil(nSnaps / 10));
  ctx.fillStyle = '#445'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
  data.forEach((s, i) => {
    if (i % tickEvery === 0 || i === nSnaps - 1) {
      const x = pad.left + i * xScale;
      const mm = String(Math.floor(s.second / 60)).padStart(2,'0');
      const ss = String(s.second % 60).padStart(2,'0');
      ctx.fillText(`${mm}:${ss}`, x, H - 4);
      ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + cH); ctx.stroke();
    }
  });

  // Chart title
  const titles = { speed: 'Ball Speed (units/frame)', spin: 'Spin Speed (rad/frame)', dmg: 'Damage Dealt / second', scale: 'Weapon Scale Progress' };
  ctx.fillStyle = '#667'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(titles[metric] ?? metric, W/2, 16);

  // Lines per ball
  const nBalls = data[0]?.balls?.length ?? 0;
  for (let bi = 0; bi < nBalls; bi++) {
    const col = data[0].balls[bi]?.color ?? '#fff';
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.shadowColor = col; ctx.shadowBlur = 4;
    ctx.beginPath();
    let started = false;
    data.forEach((s, i) => {
      const val = s.balls[bi]?.[metricKey] ?? 0;
      const x = pad.left + i * xScale;
      const y = pad.top + cH - val * yScale;
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw dots at each data point
    data.forEach((s, i) => {
      const val = s.balls[bi]?.[metricKey] ?? 0;
      const x = pad.left + i * xScale;
      const y = pad.top + cH - val * yScale;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2); ctx.fill();
    });
  }

  // Axes
  ctx.strokeStyle = '#2a2a4a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + cH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top + cH); ctx.lineTo(pad.left + cW, pad.top + cH); ctx.stroke();

  // Legend
  if (legendEl) {
    legendEl.innerHTML = '';
    for (let bi = 0; bi < nBalls; bi++) {
      const b = data[0].balls[bi];
      if (!b) continue;
      const item = document.createElement('div');
      item.className = 'sc-legend-item';
      const unitSuffix = (metric === 'scale' && b.scaleUnit) ? ` <span style="color:#445">(${b.scaleUnit})</span>` : '';
      item.innerHTML = `<div class="sc-legend-dot" style="background:${b.color}"></div><span>${b.name}${unitSuffix}</span>`;
      legendEl.appendChild(item);
    }
  }
}

function showStatsModal() {
  const modal = document.getElementById('stats-log-modal');
  if (!modal) return;
  modal.classList.add('open');
  _activeChart = 'speed';
  document.querySelectorAll('.sc-tab').forEach(t => t.classList.toggle('sel', t.dataset.chart === _activeChart));
  setTimeout(() => drawStatsChart(_activeChart), 30);
}

// ── Battle Log System ──
function getBallLabel(ball) {
  return ball?.charName ?? ball?.weaponDef?.name ?? 'Unknown';
}

function addBattleLog(type, data) {
  if (!state.battleLog) state.battleLog = [];
  const secs = state.matchTime / 60;
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(Math.floor(secs % 60)).padStart(2, '0');
  state.battleLog.push({ time: `${mm}:${ss}`, type, ...data });
  updateLiveLog();
}

function getBlogText(e) {
  const a = `<b style="color:${e.aColor ?? '#aaa'}">${e.attacker ?? '?'}</b>`;
  const d = `<b style="color:${e.dColor ?? '#aaa'}">${e.defender ?? '?'}</b>`;
  if (e.type === 'hit')
    return `${a} → ${d} <span style="color:#ff8866">-${(+e.damage).toFixed(1)}</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'crit')
    return `${a} → ${d} <span style="color:#ffcc00">CRIT -${(+e.damage).toFixed(1)}</span> <span style="color:#888">(${(+e.baseDmg).toFixed(1)}×${e.critMult})</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'evade')
    return `${a} → ${d} <span style="color:#44ffaa">EVADE</span>`;
  if (e.type === 'parry')
    return `${a} ⚔ ${d} <span style="color:#88aaff">parry</span>`;
  if (e.type === 'parry_fists')
    return `${a} <span style="color:#ff8844">(Fists) parried — took -${(+e.damage).toFixed(1)}</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'proj')
    return `${a} → ${d} <span style="color:#dd88ff">-${(+e.damage).toFixed(1)}</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'proj_crit')
    return `${a} → ${d} <span style="color:#ffcc00">CRIT -${(+e.damage).toFixed(1)}</span> <span style="color:#888">(${(+e.baseDmg).toFixed(1)}×${e.critMult})</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'proj_evade')
    return `${a} → ${d} <span style="color:#44ffaa">EVADE</span>`;
  if (e.type === 'heal')
    return `${a} <span style="color:#55ee88">♥ +${(+e.heal).toFixed(1)} HP</span><span style="color:#667"> [${e.source ?? 'heal'}]</span><span style="color:#888"> HP left: ${(+(e.hpAfter ?? 0)).toFixed(1)}</span>`;
  return '';
}

function updateLiveLog() {
  const el = document.getElementById('live-log-entries');
  if (!el) return;
  const log = state.battleLog ?? [];
  const recent = log.slice(-8); // show last 8 entries
  el.innerHTML = recent.map(e =>
    `<div class="log-line type-${e.type}"><span class="log-time">${e.time}</span>${getBlogText(e)}</div>`
  ).join('');
}

function showBattleLogModal() {
  const modal = document.getElementById('battle-log-modal');
  const scroll = document.getElementById('battle-log-scroll');
  if (!modal || !scroll) return;
  const log = state.battleLog ?? [];
  if (log.length === 0) {
    scroll.innerHTML = '<div style="color:#445;padding:12px">No events recorded.</div>';
  } else {
    scroll.innerHTML = log.map(e =>
      `<div class="blog-line type-${e.type}">
        <span class="blog-time">${e.time}</span>
        <span class="blog-text">${getBlogText(e)}</span>
      </div>`
    ).join('');
  }
  modal.classList.add('open');
  // Scroll to bottom
  setTimeout(() => { scroll.scrollTop = scroll.scrollHeight; }, 50);
}

function spawnDamageNumber(x, y, num, color) {
  const text = typeof num === 'string' ? num : `-${Math.round(num)}`;
  particles.push({ x, y: y-10, vx: (Math.random()-0.5)*1.5, vy: -2,
    life: 55, maxLife: 55,
    text, color, type: 'num', r: 0 });
}

function updateParticles() {
  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    p.life--;
    p.x += p.vx; p.y += p.vy;
    if (p.type !== 'num') {
      p.vy += 0.08;
      p.vx *= 0.94;
    }
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles(ctx) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    if (p.type === 'num') {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold 14px Arial Black`;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }
}
