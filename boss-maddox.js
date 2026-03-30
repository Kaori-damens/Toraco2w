// ============================================================
// MADDOX THE MAD — The Jester
// Randomises his move pool every 20 seconds (4-6 moves from 8).
// Shows a fake HP bar (±15% trick offset). Fast and erratic.
// ============================================================

const MADDOX_PART_DEFS = {
  body:   { ox:  0, oy:  0, r: 44, label: 'Body',   breakable: false, color: '#cc2266', strokeColor: '#880040' },
  head:   { ox: 58, oy:  0, r: 26, label: 'Head',   breakable: false, color: '#dd3377', strokeColor: '#991155' },
  lHand:  { ox: 28, oy:-52, r: 20, label: 'L.Hand', breakable: true,  color: '#aa1155', strokeColor: '#660033' },
  rHand:  { ox: 28, oy: 52, r: 20, label: 'R.Hand', breakable: true,  color: '#aa1155', strokeColor: '#660033' },
  hat:    { ox: 70, oy:-32, r: 18, label: 'Hat',    breakable: true,  color: '#550088', strokeColor: '#330055' },
};

class BossMaddox extends Boss {
  constructor(config = {}) {
    super({
      ...config,
      partDefs:    MADDOX_PART_DEFS,
      breakThresh: { body: 99999, head: 99999, lHand: 360, rHand: 360, hat: 300 },
    });

    this.displayName = 'MADDOX';
    this.baseSpeed = 2.1;
    this.speed     = 2.1;
    this.maxSpeed  = this.baseSpeed * 2.8;

    const pc    = config.playerCount ?? 1;
    this.maxHp  = 1800 + pc * 480;
    this.hp     = this.maxHp;

    // Move shuffle
    this._shuffleMovePool();
    this._shuffleTimer  = 0;
    this._shuffleEvery  = 1200; // ~20 seconds at 60fps

    // Trick HP display — fake bar offset
    this._trickOffset   = 0;
    this._trickRefresh  = 0;
    this._refreshTrick();

    // Hat-broken flag for no-hold-back
    this._hatBroken = false;
  }

  _shuffleMovePool() {
    const count = 4 + Math.floor(Math.random() * 3); // 4, 5, or 6
    const pool  = [...MADDOX_ALL_MOVES];
    // Fisher-Yates
    for (let i = pool.length - 1; i > 0; i--) {
      const j   = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.movePool = pool.slice(0, count);
  }

  _refreshTrick() {
    // ±15% offset, refreshed periodically
    this._trickOffset  = (Math.random() * 0.30 - 0.15); // -0.15 to +0.15
    this._trickRefresh = 480; // refresh every ~8 seconds
  }

  breakPart(key) {
    super.breakPart(key);
    if (key === 'hat') {
      this._hatBroken = true;
      // Hat break → immediately shuffle with max moves + speed boost
      this.movePool  = [...MADDOX_ALL_MOVES]; // all 8 moves
      this.baseSpeed = 2.5;
      this.speed     = 2.5;
      this.maxSpeed  = this.baseSpeed * 3.0;
      spawnBigAnnouncement('🎩 HAT KNOCKED OFF! Maddox goes berserk!', '#ff44cc');
    } else if (key === 'lHand' || key === 'rHand') {
      const both = this.parts.lHand?.broken && this.parts.rHand?.broken;
      if (both) spawnBigAnnouncement('🤡 BOTH HANDS BROKEN! Card tosses weakened!', '#ff88cc');
    }
  }

  update(players, arena) {
    if (!this.alive) return;

    // Shuffle timer
    this._shuffleTimer++;
    if (this._shuffleTimer >= this._shuffleEvery) {
      this._shuffleTimer = 0;
      this._shuffleMovePool();
      spawnBigAnnouncement('🃏 MADDOX RESHUFFLES!', '#ff88cc');
    }

    // Trick HP refresh
    this._trickRefresh--;
    if (this._trickRefresh <= 0) this._refreshTrick();

    super.update(players, arena);
  }

  die() {
    if (!this.alive) return;
    this.alive = false; this.hp = 0; this.state = 'dead';
    this.vx = 0; this.vy = 0;
    spawnDeathExplosion(this.x, this.y, '#ff44cc');
    setTimeout(() => spawnDeathExplosion(this.x + (Math.random()-0.5)*80, this.y + (Math.random()-0.5)*60, '#ff0088'), 300);
    setTimeout(() => spawnDeathExplosion(this.x + (Math.random()-0.5)*100, this.y + (Math.random()-0.5)*80, '#ff88ff'), 700);
    spawnBigAnnouncement('🤡 MADDOX THE MAD DEFEATED!', '#ff88cc');
    setTimeout(() => showPVEResult(true), 2500);
  }

  // ── Drawing ──────────────────────────────────────────────
  draw(ctx) {
    if (!this.alive && this.state !== 'active') return;
    const flashOn = this.hitFlash > 0 && Math.floor(this.hitFlash / 2) % 2 === 0;
    const enrGlow = this.enrageFlash > 0;

    // Jester trail (wavy motion)
    const t = Date.now() * 0.008;
    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(this.x - Math.cos(this.angle) * i * 14, this.y - Math.sin(this.angle) * i * 14, 44 - i * 8, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${320 + i * 20}, 80%, 55%)`;
      ctx.fill();
    }
    ctx.restore();

    // Hands
    this._drawPart(ctx, 'lHand', flashOn, false);
    this._drawPart(ctx, 'rHand', flashOn, false);
    // Hat (rotates slightly)
    this._drawHatPart(ctx, flashOn);
    // Body + head
    this._drawPart(ctx, 'body', flashOn, enrGlow);
    this._drawPart(ctx, 'head', flashOn, false);

    // Enrage confetti aura
    if (enrGlow) {
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const a2   = t * 2 + (i / 6) * Math.PI * 2;
        const dist = 58 + 8 * Math.sin(t + i);
        ctx.beginPath();
        ctx.arc(this.x + Math.cos(a2) * dist, this.y + Math.sin(a2) * dist, 4, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${(i * 60 + t * 60) % 360}, 100%, 65%)`;
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t + i);
        ctx.fill();
      }
      ctx.restore();
    }

    // Card / confetti projectiles
    for (const tb of this.thunderBalls) {
      ctx.save();
      if (tb._card) {
        // Draw as spinning diamond
        const a2 = Date.now() * 0.01 + tb.x * 0.1;
        ctx.translate(tb.x, tb.y);
        ctx.rotate(a2);
        ctx.fillStyle   = `hsl(${(tb.x + tb.y) % 360}, 90%, 65%)`;
        ctx.strokeStyle = '#440022';
        ctx.lineWidth   = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, -tb.r * 1.4);
        ctx.lineTo(tb.r, 0);
        ctx.lineTo(0,  tb.r * 1.4);
        ctx.lineTo(-tb.r, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(tb.x, tb.y, tb.r, 0, Math.PI * 2);
        ctx.fillStyle   = '#ffaadd';
        ctx.strokeStyle = '#cc44aa';
        ctx.lineWidth   = 1.5;
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }

    if (this.state === 'stunned') this._drawStunStars(ctx);
    if ((this.state === 'windup' || this.state === 'active') && this.currentMove?.drawHint) {
      this.currentMove.drawHint(ctx, this);
    }
    this._drawHUD(ctx);
  }

  _drawHatPart(ctx, flashOn) {
    const pos = this.getPartPos('hat');
    if (!pos) return;
    const ps  = this.parts['hat'];
    if (ps.broken) {
      // Broken hat — just a crumpled shape
      ctx.save();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ps.broken ? pos.r * 0.4 : pos.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(30,0,50,0.5)'; ctx.fill();
      ctx.restore();
      return;
    }
    const pct = ps.breakHp / ps.maxBreakHp;
    const t   = Date.now() * 0.003;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
    ctx.fillStyle   = flashOn ? '#ffffff' : (pct > 0.5 ? '#550088' : pct > 0.25 ? '#8822cc' : '#cc2244');
    ctx.strokeStyle = '#330055'; ctx.lineWidth = 2;
    ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 10;
    ctx.fill(); ctx.stroke();
    // Star on hat
    ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,220,100,0.8)';
    ctx.fillText('★', pos.x, pos.y);
    // Break arc
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pos.r + 4, -Math.PI/2, -Math.PI/2 + Math.PI*2*pct);
    ctx.strokeStyle = pct > 0.5 ? 'rgba(160,80,255,0.75)' : 'rgba(255,60,180,0.85)';
    ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }

  _drawHUD(ctx) {
    const barW = 390, barH = 16;
    const bx   = (CW - barW) / 2, by = 14;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(bx - 6, by - 6, barW + 12, barH + 52);

    // Fake HP display (trick offset)
    const realPct  = this.hp / this.maxHp;
    const fakePct  = Math.max(0.02, Math.min(0.99, realPct + this._trickOffset));
    ctx.fillStyle  = `hsl(${320 + fakePct * 40}, 80%, 50%)`;
    ctx.fillRect(bx, by, barW * fakePct, barH);
    ctx.strokeStyle = '#880044'; ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, barW, barH);

    // Show a "?" for HP number to keep the trickery
    const moveCount = this.movePool?.length ?? 0;
    const hatStatus = this.parts.hat?.broken ? ' [HAT OFF!]' : '';
    ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffaadd';
    ctx.fillText(`🤡 MADDOX THE MAD${hatStatus}   Moves: ${moveCount}/8   HP: ??? / ${this.maxHp}`, CW/2, by + barH + 8);

    // Part bars
    const partInfo = [
      { key: 'hat',   icon: '🎩', label: 'Hat'    },
      { key: 'lHand', icon: '🃏', label: 'L.Hand' },
      { key: 'rHand', icon: '🃏', label: 'R.Hand' },
    ];
    const pBarW   = 102, pBarH = 6;
    const pStartX = bx + 10;
    const pStartY = by + barH + 22;

    partInfo.forEach((info, i) => {
      const ps   = this.parts[info.key];
      const rpct = ps.broken ? 0 : ps.breakHp / ps.maxBreakHp;
      const px   = pStartX + i * (pBarW + 14);

      ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
      ctx.fillStyle = ps.broken ? '#444' : '#ffaadd';
      ctx.fillText(`${info.icon} ${info.label}`, px, pStartY);

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(px, pStartY + 11, pBarW, pBarH);
      ctx.fillStyle = ps.broken ? '#222'
        : rpct > 0.5  ? '#cc2266'
        : rpct > 0.25 ? '#ee4488'
        : '#ff1166';
      ctx.fillRect(px, pStartY + 11, pBarW * rpct, pBarH);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 0.5;
      ctx.strokeRect(px, pStartY + 11, pBarW, pBarH);
      if (ps.broken) {
        ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center';
        ctx.fillStyle = '#cc4466';
        ctx.fillText('BROKEN', px + pBarW / 2, pStartY + 19);
      }
    });

    ctx.restore();
  }
}
