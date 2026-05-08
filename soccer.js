// ============================================================
// SOCCER MODE — Bóng đá 1v1
// ============================================================
// Mode chơi mới: 2 radoser thi đấu trên sân bóng.
// Quả bóng ở giữa sân (SoccerBall) — không có HP, va chạm vật lý.
// Ghi bàn = đẩy bóng qua vạch vôi vào khung thành đối thủ.
// Thắng khi ghi 3 bàn HOẶC giết đối thủ (kill vẫn hoạt động bình thường).
//
// API công khai:
//   initSoccerMode(f1, f2) — khởi động mode từ UI
//   soccerStep()           — gọi từ step() trong game-loop.js
//   drawSoccerField(ctx)   — vẽ sân (thay drawArena)
//   drawSoccerBallAndHUD(ctx) — vẽ bóng + score overlay

// ── Kích thước sân ──────────────────────────────────────────────────────────
// Canvas: 1000×1000. Sân nằm giữa, để lề cho goal post ở 2 bên.
const SOCCER_F = {
  x: 100, y: 200,   // góc trên-trái của sân (bên trong vạch trắng)
  w: 800, h: 600,   // chiều rộng × chiều cao sân
  goalH: 190,       // chiều cao khung thành (px)
  goalD: 60,        // độ sâu visual goal post (extends ngoài vạch trái/phải)
  maxGoals: 3,      // số bàn thắng để kết thúc trận
};
// Giá trị tính sẵn
SOCCER_F.cx   = SOCCER_F.x + SOCCER_F.w / 2;  // 500 — trung tâm sân
SOCCER_F.cy   = SOCCER_F.y + SOCCER_F.h / 2;  // 500
SOCCER_F.goalY = SOCCER_F.cy - SOCCER_F.goalH / 2; // y bắt đầu khung thành

// ── SoccerBall ───────────────────────────────────────────────────────────────
// Quả bóng không có HP, không có vũ khí — chỉ có vật lý (vị trí, vận tốc, nảy tường).
class SoccerBall {
  constructor() {
    this.x  = SOCCER_F.cx;
    this.y  = SOCCER_F.cy;
    this.vx = 0;
    this.vy = 0;
    this.r  = 13;         // bán kính
    this.rotation = 0;    // góc xoay visual (tăng theo vx)
    this._justScored = false; // flag tránh trigger goal 2 lần
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    // Ma sát nhẹ — bóng dần dừng lại
    this.vx *= 0.992;
    this.vy *= 0.992;
    // Giới hạn tốc độ tối đa
    const spd = Math.hypot(this.vx, this.vy);
    if (spd > 22) { this.vx = this.vx / spd * 22; this.vy = this.vy / spd * 22; }
    // Visual spin: xoay theo chiều di chuyển ngang
    this.rotation += this.vx * 0.045;
    this._wallBounce();
  }

  // Nảy tường sân — tường trên/dưới luôn cứng; trái/phải mở ở goal zone
  _wallBounce() {
    const { x: FX, y: FY, w: FW, h: FH, goalY, goalH } = SOCCER_F;
    const r = this.r;
    // Tường trên
    if (this.y - r < FY) { this.y = FY + r; this.vy = Math.abs(this.vy) * 0.72; }
    // Tường dưới
    if (this.y + r > FY + FH) { this.y = FY + FH - r; this.vy = -Math.abs(this.vy) * 0.72; }
    // Tường trái — ghi bàn nếu trong goal zone, bounce nếu không
    if (this.x - r < FX) {
      const inGoal = this.y + r > goalY && this.y - r < goalY + goalH;
      if (inGoal) {
        // Bóng vào khung thành trái → P2 (index 1) ghi bàn
        if (!this._justScored && state.soccer && !state.soccer.scoring) {
          this._justScored = true;
          _soccerGoalScored(1);
        }
      } else {
        this.x = FX + r;
        this.vx = Math.abs(this.vx) * 0.72;
      }
    }
    // Tường phải — ghi bàn nếu trong goal zone, bounce nếu không
    if (this.x + r > FX + FW) {
      const inGoal = this.y + r > goalY && this.y - r < goalY + goalH;
      if (inGoal) {
        // Bóng vào khung thành phải → P1 (index 0) ghi bàn
        if (!this._justScored && state.soccer && !state.soccer.scoring) {
          this._justScored = true;
          _soccerGoalScored(0);
        }
      } else {
        this.x = FX + FW - r;
        this.vx = -Math.abs(this.vx) * 0.72;
      }
    }
  }

  // Vẽ quả bóng: hình cầu trắng + hoa văn ngũ giác đen (kiểu bóng đá truyền thống)
  draw(ctx) {
    const x = this.x, y = this.y, r = this.r;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.rotation);
    // Thân bóng
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#cccccc');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Mảnh ngũ giác trung tâm
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * r * 0.36, py = Math.sin(a) * r * 0.36;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#111';
    ctx.fill();
    // 5 mảnh vệ tinh xung quanh
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const cx2 = Math.cos(a) * r * 0.68, cy2 = Math.sin(a) * r * 0.68;
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const b = a + (j / 5) * Math.PI * 2;
        const px = cx2 + Math.cos(b) * r * 0.22, py = cy2 + Math.sin(b) * r * 0.22;
        j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = '#111';
      ctx.fill();
    }
    ctx.restore();
  }
}

// ── Ghi bàn ──────────────────────────────────────────────────────────────────
// scorerIdx: 0 = P1 ghi bàn, 1 = P2 ghi bàn
function _soccerGoalScored(scorerIdx) {
  const sc = state.soccer;
  if (!sc || sc.scoring || state.ended) return;
  sc.score[scorerIdx]++;
  sc.scoring   = true;
  sc.goalFrame = state.frame;
  sc.goalScorer = scorerIdx;
  const name = state.players[scorerIdx]?.name || `P${scorerIdx + 1}`;
  sc.goalMsg = `⚽ GOAL! ${name}`;
  spawnBigAnnouncement('⚽ GOAL!', '#00ff99');
  if (typeof sfxScale === 'function') sfxScale();
  // Kiểm tra thắng: 3 bàn
  if (sc.score[scorerIdx] >= SOCCER_F.maxGoals) {
    setTimeout(() => {
      if (state.ended) return;
      state.ended  = true;
      state.winner = state.players[scorerIdx] || null;
      showResult();
    }, 2200);
  }
}

// ── Reset bóng + vị trí sau bàn thắng ────────────────────────────────────────
function _soccerReset() {
  const sc = state.soccer;
  if (!sc) return;
  sc.scoring  = false;
  sc.goalMsg  = '';
  // Reset bóng về trung tâm
  sc.ball.x = SOCCER_F.cx;
  sc.ball.y = SOCCER_F.cy;
  sc.ball.vx = 0; sc.ball.vy = 0;
  sc.ball.rotation = 0;
  sc.ball._justScored = false;
  // Reset radoser về 2 bên + hồi sinh nếu bị chết trong lúc chờ reset
  const cx = SOCCER_F.cx, cy = SOCCER_F.cy;
  for (let i = 0; i < 2; i++) {
    const p = state.players[i];
    if (!p) continue;
    // Vị trí: P1 bên trái, P2 bên phải
    p.x  = i === 0 ? cx - 180 : cx + 180;
    p.y  = cy;
    // Kick khởi đầu hướng vào nhau để tránh đứng yên
    p.vx = i === 0 ? 3 : -3;
    p.vy = (Math.random() - 0.5) * 2;
    // Hồi sinh nếu đã chết trong lúc scoring delay
    p.alive = true;
    if (p.hp <= 0) p.hp = Math.round((p.maxHp || 100) * 0.5);
    // Xoá stun/freeze để radoser có thể di chuyển ngay
    p.stunTimer        = 0;
    p._parryFrozen     = false;
    p.parryStunReverse = false;
    p.immuneTimer      = 0;
  }
  // Đảm bảo game loop tiếp tục chạy (phòng trường hợp radoser chết trong scoring delay)
  state.ended   = false;
  state.running = true;
}

// ── Va chạm: thân radoser ↔ bóng ─────────────────────────────────────────────
// Khi ball body chạm bóng → đẩy bóng ra, transfer momentum
function _soccerBodyCollision(sball) {
  for (const ball of state.players) {
    if (!ball.alive) continue;
    const dx   = sball.x - ball.x, dy = sball.y - ball.y;
    const dist = Math.hypot(dx, dy);
    const minD = sball.r + ball.radius;
    if (dist < minD && dist > 0.1) {
      const nx = dx / dist, ny = dy / dist;
      // Đẩy bóng ra khỏi overlap
      sball.x += nx * (minD - dist);
      sball.y += ny * (minD - dist);
      // Impulse: tốc độ radoser → bóng + minimum kick
      const relDot = (ball.vx - sball.vx) * nx + (ball.vy - sball.vy) * ny;
      const impulse = Math.max(relDot * 0.65 + 1.8, 1.8);
      sball.vx += nx * impulse;
      sball.vy += ny * impulse;
    }
  }
}

// ── Va chạm: vũ khí ↔ bóng ───────────────────────────────────────────────────
// Khi tip vũ khí chạm bóng → kick bóng mạnh hơn body (tính theo tốc độ quay)
function _soccerWeaponCollision(sball) {
  for (const ball of state.players) {
    if (!ball.alive) continue;
    const wDef = ball.weaponDef;
    if (!wDef?.getHitPoints) continue;
    const pts  = wDef.getHitPoints(ball);
    let   hit  = false;
    for (const pt of pts) {
      if (hit) break;
      const dx   = sball.x - pt.x, dy = sball.y - pt.y;
      const dist = Math.hypot(dx, dy);
      const minD = sball.r + (pt.r || 8);
      if (dist < minD && dist > 0.1) {
        const nx = dx / dist, ny = dy / dist;
        // Tốc độ tip ≈ |angular_vel| × weapon_length (rad/frame × px)
        const angSpd  = Math.abs(ball.getSpeed());
        const wLen    = (wDef.baseLength || 40) + (ball.weapon?.bonusLength || 0);
        const tipSpd  = angSpd * wLen;
        const impulse = Math.min(tipSpd * 0.08 + 5.5, 20);
        sball.vx += nx * impulse;
        sball.vy += ny * impulse;
        sball.x  += nx * (minD - dist);
        sball.y  += ny * (minD - dist);
        spawnSparks(pt.x, pt.y, 5);
        hit = true;
      }
    }
  }
}

// ── Per-frame soccer update (gọi từ step() trong game-loop.js) ───────────────
function soccerStep() {
  const sc = state.soccer;
  if (!sc?.active || state.ended) return;
  // Đang chờ reset sau goal
  if (sc.scoring) {
    const noWin = sc.score[0] < SOCCER_F.maxGoals && sc.score[1] < SOCCER_F.maxGoals;
    if (noWin && state.frame - sc.goalFrame >= 130) _soccerReset();
    return;
  }
  sc.ball.update();
  _soccerBodyCollision(sc.ball);
  _soccerWeaponCollision(sc.ball);
}

// ── Vẽ sân bóng (thay thế drawArena) ─────────────────────────────────────────
function drawSoccerField(ctx) {
  const { x: FX, y: FY, w: FW, h: FH, cx, cy, goalY, goalH, goalD } = SOCCER_F;

  // ── Cỏ nền ──────────────────────────────────────────────────
  ctx.fillStyle = '#1e5e1e';
  ctx.fillRect(FX, FY, FW, FH);

  // Sọc cỏ xen kẽ (dark/light green)
  const stripeW = FW / 10;
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      ctx.fillRect(FX + i * stripeW, FY, stripeW, FH);
    }
  }

  // ── Đường kẻ sân (trắng) ────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth   = 2.5;

  // Viền sân
  ctx.strokeRect(FX + 2, FY + 2, FW - 4, FH - 4);

  // Đường giữa sân
  ctx.beginPath();
  ctx.moveTo(cx, FY + 2); ctx.lineTo(cx, FY + FH - 2);
  ctx.stroke();

  // Vòng tròn giữa
  ctx.beginPath();
  ctx.arc(cx, cy, 85, 0, Math.PI * 2);
  ctx.stroke();
  // Chấm giữa
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();

  // Khu penalty (cấm địa)
  const penW = 150, penH = 300;
  ctx.strokeRect(FX + 2,           cy - penH / 2, penW, penH); // trái
  ctx.strokeRect(FX + FW - penW - 2, cy - penH / 2, penW, penH); // phải

  // Khu gôn nhỏ
  const gkW = 60, gkH = 130;
  ctx.strokeRect(FX + 2,          cy - gkH / 2, gkW, gkH);
  ctx.strokeRect(FX + FW - gkW - 2, cy - gkH / 2, gkW, gkH);

  // Chấm penalty
  ctx.beginPath(); ctx.arc(FX + 120, cy, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(FX + FW - 120, cy, 3.5, 0, Math.PI * 2); ctx.fill();

  // ── Nền goal box (tối) ──────────────────────────────────────
  ctx.fillStyle = '#111';
  ctx.fillRect(FX - goalD, goalY, goalD + 2, goalH); // trái
  ctx.fillRect(FX + FW - 2, goalY, goalD,    goalH); // phải

  // ── Lưới goal ───────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth   = 1;
  const netCols = 5, netRows = 4;
  // Trái
  for (let i = 0; i <= netCols; i++) {
    const nx = FX - goalD + i * (goalD / netCols);
    ctx.beginPath(); ctx.moveTo(nx, goalY); ctx.lineTo(nx, goalY + goalH); ctx.stroke();
  }
  for (let i = 0; i <= netRows; i++) {
    const ny = goalY + i * (goalH / netRows);
    ctx.beginPath(); ctx.moveTo(FX - goalD, ny); ctx.lineTo(FX + 2, ny); ctx.stroke();
  }
  // Phải
  for (let i = 0; i <= netCols; i++) {
    const nx = FX + FW + i * (goalD / netCols);
    ctx.beginPath(); ctx.moveTo(nx, goalY); ctx.lineTo(nx, goalY + goalH); ctx.stroke();
  }
  for (let i = 0; i <= netRows; i++) {
    const ny = goalY + i * (goalH / netRows);
    ctx.beginPath(); ctx.moveTo(FX + FW - 2, ny); ctx.lineTo(FX + FW + goalD, ny); ctx.stroke();
  }

  // ── Khung thành (cột + xà ngang — trắng dày) ────────────────
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 4;
  // Trái: 2 cột dọc + xà ngang
  ctx.strokeRect(FX - goalD, goalY, goalD, goalH);
  // Phải
  ctx.strokeRect(FX + FW, goalY, goalD, goalH);

  // ── Vạch vôi ghi bàn (glowing green) ────────────────────────
  ctx.save();
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur  = 8;
  ctx.strokeStyle = 'rgba(0,255,136,0.55)';
  ctx.lineWidth   = 3;
  ctx.beginPath(); ctx.moveTo(FX, goalY - 3); ctx.lineTo(FX, goalY + goalH + 3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(FX + FW, goalY - 3); ctx.lineTo(FX + FW, goalY + goalH + 3); ctx.stroke();
  ctx.restore();
}

// ── Vẽ bóng + HUD score ─────────────────────────────────────────────────────
function drawSoccerBallAndHUD(ctx) {
  const sc = state.soccer;
  if (!sc?.active) return;

  // ── Bóng ──────────────────────────────────────────────────────
  sc.ball.draw(ctx);

  // ── Score Board ───────────────────────────────────────────────
  const p1 = state.players[0], p2 = state.players[1];
  const p1Name  = p1?.name  || 'P1';
  const p2Name  = p2?.name  || 'P2';
  const p1Color = p1?.color || '#ff5555';
  const p2Color = p2?.color || '#5599ff';

  ctx.save();
  ctx.textBaseline = 'middle';

  // Background pill
  const bx = CW / 2 - 100, by = 142, bw = 200, bh = 44;
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  _soccerRoundRect(ctx, bx, by, bw, bh, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // P1 score
  ctx.font = 'bold 30px monospace';
  ctx.fillStyle = p1Color;
  ctx.textAlign = 'right';
  ctx.fillText(sc.score[0], CW / 2 - 16, by + bh / 2);

  // Separator
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(':', CW / 2, by + bh / 2 + 1);

  // P2 score
  ctx.font = 'bold 30px monospace';
  ctx.fillStyle = p2Color;
  ctx.textAlign = 'left';
  ctx.fillText(sc.score[1], CW / 2 + 16, by + bh / 2);

  // Player names
  ctx.font = 'bold 10px sans-serif';
  ctx.fillStyle = p1Color + 'cc';
  ctx.textAlign = 'center';
  ctx.fillText(p1Name, CW / 2 - 70, by + bh + 10);
  ctx.fillStyle = p2Color + 'cc';
  ctx.fillText(p2Name, CW / 2 + 70, by + bh + 10);

  // Goal dots (⚽ filled = ghi bàn rồi, vòng tròn rỗng = chưa)
  for (let p = 0; p < 2; p++) {
    const col    = p === 0 ? p1Color : p2Color;
    const baseX  = p === 0 ? CW / 2 - 170 : CW / 2 + 110;
    for (let g = 0; g < SOCCER_F.maxGoals; g++) {
      const dotX = baseX + g * 20, dotY = by + bh / 2;
      ctx.beginPath(); ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
      if (g < sc.score[p]) {
        ctx.fillStyle = col; ctx.fill();
        // mini soccer pattern
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.strokeStyle = col + '88'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
  }

  // Goal message
  if (sc.goalMsg) {
    const age   = state.frame - sc.goalFrame;
    const alpha = Math.max(0, 1 - age / 90);
    const scale = 1 + Math.max(0, 0.4 - age * 0.01);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(CW / 2, by - 22);
    ctx.scale(scale, scale);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#00ff99';
    ctx.textAlign  = 'center';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur  = 14;
    ctx.fillText(sc.goalMsg, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

// ── Helper: rounded rect path ────────────────────────────────────────────────
function _soccerRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);   ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);   ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x, y + r);       ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}

// Chuyển cgRoster entry (raw) → format state.fighters (giống roster.js)
function _soccerToFighter(ch) {
  return {
    weaponId:  ch.weapon,
    color:     ch.color,
    charName:  ch.name,
    charEmoji: ch.raceEmoji,
    charStats: { ...ch.stats, race: ch.race ?? null, subrace: ch.subrace ?? null },
    skills:    ch.skills    ?? [],
    charDevs:  ch.charDevs  ?? [],
  };
}

// ── Init soccer mode (gọi từ UI) ─────────────────────────────────────────────
// f1, f2: cgRoster entry (raw) — hàm tự transform sang format state.fighters
function initSoccerMode(f1, f2) {
  state.fighters   = [_soccerToFighter(f1), _soccerToFighter(f2)];
  state.arenaId    = 'soccer';
  state.pveMode    = false;
  state.matchMode  = '1v1';
  state.soccer = {
    active:      true,
    score:       [0, 0],
    ball:        new SoccerBall(),
    scoring:     false,
    goalFrame:   0,
    goalScorer:  -1,
    goalMsg:     '',
  };
  showScreen('game');
  startGame();
}
