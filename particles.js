// ============================================================
// PARTICLES
// ============================================================
// File này gộp nhiều hệ thống hiệu ứng hình ảnh và UI log:
//
//   Particles (mảng `particles`):
//     spawnSparks()         — tia lửa vàng khi weapon va chạm
//     spawnBlood()          — vảy máu đỏ khi nhận dame
//     spawnDeathExplosion() — nổ tung khi ball chết
//     spawnDamageNumber()   — số dame nổi lên (floating text)
//     updateParticles()     — cập nhật vị trí + vòng đời mỗi frame
//     drawParticles()       — render lên canvas
//
//   Big Announcements (mảng `bigAnnouncements`):
//     spawnBigAnnouncement()       — chữ lớn giữa màn (Speed Floor, Rage Mode...)
//     updateDrawBigAnnouncements() — update + draw trong 1 pass
//
//   Weapon Scale Helpers:
//     getBallScaleVal()  — giá trị số của weapon scale hiện tại (để vẽ chart)
//     getBallScaleUnit() — đơn vị đo của scale ('+dmg', 'arrows', 'stars'...)
//
//   Stats Log Chart:
//     drawStatsChart(metric) — vẽ biểu đồ speed/spin/dmg/scale lên canvas
//     showStatsModal()       — mở modal chart
//
//   Battle Log:
//     addBattleLog(type, data) — thêm event vào state.battleLog[]
//     getBlogText(e)           — render 1 event thành HTML string
//     updateLiveLog()          — cập nhật HUD live log (8 entry cuối)
//     showBattleLogModal()     — mở modal toàn bộ battle log

// Mảng particles toàn cục — tất cả spark/blood/death/number đang active
const particles = [];

// ─── spawnSparks ────────────────────────────────────────────
// Spawn tia lửa màu vàng/cam khi weapon đánh trúng (parry, hit).
// Tham số: x, y (number) — vị trí va chạm; count (number) — số tia
// Tia bắn ngẫu nhiên mọi hướng (angle 0–2π), speed 2–6, sống 20–35 frame
function spawnSparks(x, y, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 4;
    particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      life: 20 + Math.random()*15, maxLife: 35,
      color: `hsl(${40+Math.random()*20},100%,${60+Math.random()*30}%)`, // vàng-cam
      r: 2 + Math.random()*2, type: 'spark' });
  }
}

// ─── spawnBlood ─────────────────────────────────────────────
// Spawn vảy máu màu đỏ theo hướng knockback.
// Tham số: x, y — vị trí; count — số vảy; dir (radian) — hướng bắn chính
// Góc lệch ±90° (Math.PI) quanh dir → máu bắn hình quạt về phía sau ball
function spawnBlood(x, y, count, dir) {
  for (let i = 0; i < count; i++) {
    const a = dir + (Math.random()-0.5) * Math.PI; // ±90° quanh hướng nhận dame
    const sp = 1.5 + Math.random() * 3;
    particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      life: 18 + Math.random()*10, maxLife: 28,
      color: `hsl(0,90%,${40+Math.random()*20}%)`, // đỏ thẫm–đỏ sáng
      r: 2 + Math.random()*2, type: 'blood' });
  }
}

// ─── spawnDeathExplosion ─────────────────────────────────────
// Nổ 30 mảnh khi ball chết: 15 mảnh màu ball + 15 mảnh màu ngẫu nhiên.
// Tham số: x, y — vị trí chết; color — màu hex của ball
// Sống 35–60 frame, r 3–8px — lớn hơn spark để ấn tượng hơn
function spawnDeathExplosion(x, y, color) {
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 6;
    particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      life: 35 + Math.random()*25, maxLife: 60,
      color: i < 15 ? color : `hsl(${Math.random()*360},80%,60%)`, // nửa màu ball, nửa rainbow
      r: 3 + Math.random()*5, type: 'death' });
  }
}

// ─── Big Announcements ──────────────────────────────────────
// Chữ lớn hiện giữa màn cho các sự kiện quan trọng:
//   "⚡ SPEED FLOOR", "🔥 RAGE MODE", "💀 LICH ASCENSION!" v.v.
// Sống 180 frame (3 giây @ 60fps), trượt lên + fade out cuối.
// Big centre announcement (Speed Floor, Rage Mode, etc.)
const bigAnnouncements = [];

// ─── spawnBigAnnouncement ───────────────────────────────────
// Tham số: text (string) — nội dung hiển thị; color (string hex) — màu glow
// SFX: RAGE → tone thấp 220Hz, khác → 440Hz (sawtooth = âm sắc bén)
function spawnBigAnnouncement(text, color) {
  bigAnnouncements.push({ text, color, life: 180, maxLife: 180 });
  // also SFX
  playTone(text.includes('RAGE') ? 220 : 440, 'sawtooth', 0.35, 0.08, 0.4);
}

// ─── updateDrawBigAnnouncements ─────────────────────────────
// Update vòng đời + draw tất cả announcement đang active.
// Tham số: ctx — canvas context
// Animation: zoom in (0.6→1.0) trong 25% đầu, slide lên 30px, fade out 40f cuối
function updateDrawBigAnnouncements(ctx) {
  for (let i = bigAnnouncements.length - 1; i >= 0; i--) {
    const a = bigAnnouncements[i];
    a.life--;
    if (a.life <= 0) { bigAnnouncements.splice(i, 1); continue; }
    const progress = 1 - a.life / a.maxLife;        // 0.0→1.0 theo thời gian
    const alpha    = a.life < 40 ? a.life / 40 : 1; // fade out khi còn <40f
    const scale    = 0.6 + 0.4 * Math.min(1, progress * 4); // zoom in nhanh trong 25% đầu
    const y        = CH / 2 - 40 - progress * 30;   // trượt lên dần 30px
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.floor(38 * scale)}px 'Segoe UI', sans-serif`;
    // shadow — offset (2,2) để tạo chiều sâu
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

// ─── getBallScaleVal / getBallScaleUnit ─────────────────────
// Đọc giá trị hiện tại của weapon scale để vẽ trên biểu đồ Stats Chart.
// Mỗi weapon scale theo một chỉ số khác nhau:
//   fists   → attackCooldown (giảm = nhanh hơn)
//   sword   → bonusDamage (tăng dần qua scale)
//   dagger  → spinBonus ×100 (dễ đọc hơn)
//   bow     → arrowCount (số mũi mỗi shot)
//   scythe  → hits (đếm đến 5 thì scale)
//   hammer  → bonusKnockback
//   shuriken→ shurikenCount
// Trả về: number (giá trị thô) | string (đơn vị hiển thị trên legend)
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

// ─── Stats Log Chart ────────────────────────────────────────
// Biểu đồ vẽ giá trị speed/spin/dmg/scale của từng ball theo giây.
// state.statsLog[] — snapshot mỗi giây trong game-loop.
// drawStatsChart(metric) — vẽ line chart lên <canvas id="stats-chart-canvas">.
// _activeChart — tab đang chọn (speed | spin | dmg | scale).
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

// ─── Battle Log System ──────────────────────────────────────
// Ghi lại mọi sự kiện chiến đấu vào state.battleLog[].
// Mỗi entry: { time: 'MM:SS', type: string, ...extra data }
// type có thể là: 'hit' | 'crit' | 'evade' | 'parry' | 'parry_fists' |
//   'proj' | 'proj_crit' | 'proj_evade' | 'heal' | 'race_skill' |
//   'lunge_trigger' | 'lunge_hit' | 'iai' | 'skill_trigger' | 'weapon_scale'
//
// Live log HUD: hiện 8 entry cuối (updateLiveLog → #live-log-entries).
// Modal: hiện toàn bộ (showBattleLogModal → #battle-log-scroll).
// ── Battle Log System ──
function getBallLabel(ball) {
  return ball?.charName ?? ball?.weaponDef?.name ?? 'Unknown';
}

// ─── addBattleLog ───────────────────────────────────────────
// Thêm 1 event vào state.battleLog[] với timestamp MM:SS.
// Tham số: type (string) — loại event; data (object) — payload event
// state.matchTime / 60 → giây, rồi format thành MM:SS
function addBattleLog(type, data) {
  if (!state.battleLog) state.battleLog = [];
  const secs = state.matchTime / 60; // frame → giây
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(Math.floor(secs % 60)).padStart(2, '0');
  state.battleLog.push({ time: `${mm}:${ss}`, type, ...data });
  updateLiveLog(); // cập nhật HUD live log ngay lập tức
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
  if (e.type === 'race_skill')
    return `${a} <span style="color:#cc99ff">${e.text ?? ''}</span>`;
  if (e.type === 'lunge_trigger')
    return `<b style="color:${e.aColor ?? '#aaa'}">${e.attacker ?? '?'}</b> 🤺 <span style="color:#aae0ff">Lunge!</span>`;
  if (e.type === 'lunge_hit')
    return `${a} → ${d} 🤺 <span style="color:#aae0ff">Lunge -${(+e.damage).toFixed(1)}</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'iai')
    return `${a} → ${d} ⚔️ <span style="color:#eeeeff">IAI STRIKE -${(+e.damage).toFixed(1)}</span><span style="color:#888"> HP left: ${(+(e.defHp ?? 0)).toFixed(1)}</span>`;
  if (e.type === 'skill_trigger')
    return `<b style="color:${e.aColor ?? '#aaa'}">${e.attacker ?? '?'}</b> <span style="color:#ffdd88">${e.text ?? ''}</span>`;
  if (e.type === 'weapon_scale')
    return `<b style="color:${e.aColor ?? '#aaa'}">${e.attacker ?? '?'}</b> <span style="color:#aaaaff">⬆ ${e.weapon ?? ''}</span> <span style="color:#88ffcc">${e.text ?? ''}</span>`;
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

// ─── spawnDamageNumber ──────────────────────────────────────
// Spawn floating text (số dame, race event, skill trigger...) nổi lên trên arena.
// Tham số: x, y — vị trí spawn; num (number|string) — dame hoặc text tuỳ ý; color — màu text
// Nếu num là number → tự thêm dấu "-" (ví dụ: -25). Nếu là string → dùng nguyên.
// Particle type 'num': không bị gravity, chỉ drift nhẹ và trôi lên (vy=-2)
function spawnDamageNumber(x, y, num, color) {
  const text = typeof num === 'string' ? num : `-${Math.round(num)}`;
  particles.push({ x, y: y-10, vx: (Math.random()-0.5)*1.5, vy: -2,
    life: 55, maxLife: 55,
    text, color, type: 'num', r: 0 });
}

// ─── updateParticles ────────────────────────────────────────
// Cập nhật vật lý tất cả particle mỗi frame:
//   - Vị trí: += vx/vy
//   - Gravity (type != 'num'): vy += 0.08 (rơi xuống nhẹ), vx *= 0.94 (ma sát)
//   - Life: giảm mỗi frame, khi = 0 xóa khỏi mảng (duyệt ngược để safe splice)
function updateParticles() {
  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    p.life--;
    p.x += p.vx; p.y += p.vy;
    if (p.type !== 'num') {
      p.vy += 0.08;  // gravity nhẹ — spark/blood/death rơi xuống
      p.vx *= 0.94;  // ma sát — decelerates horizontally
    }
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ─── drawParticles ──────────────────────────────────────────
// Vẽ tất cả particle lên canvas.
// type 'num': text với outline đen (strokeText trước fillText để dễ đọc)
// type khác: hình tròn (arc) mờ dần theo alpha = life/maxLife
function drawParticles(ctx) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife; // 1.0 lúc mới spawn → 0.0 khi hết life
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
