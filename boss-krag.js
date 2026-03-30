// ============================================================
// KRAG THE UNYIELDING — Golem King
// Boss with 4 orbiting Rune Stones that shield the Core.
// Break all 4 → Berserk phase (full damage, faster, berserk charge).
// ============================================================

const KRAG_PART_DEFS = {
  body:  { ox: 0, oy: 0, r: 76, label: 'Core',     breakable: false, color: '#5a5a48', strokeColor: '#2e2e20' },
  rune1: { ox: 0, oy: 0, r: 20, label: 'Rune I',   breakable: true,  color: '#3366cc', strokeColor: '#1133aa' },
  rune2: { ox: 0, oy: 0, r: 20, label: 'Rune II',  breakable: true,  color: '#3366cc', strokeColor: '#1133aa' },
  rune3: { ox: 0, oy: 0, r: 20, label: 'Rune III', breakable: true,  color: '#3366cc', strokeColor: '#1133aa' },
  rune4: { ox: 0, oy: 0, r: 20, label: 'Rune IV',  breakable: true,  color: '#3366cc', strokeColor: '#1133aa' },
};

class BossKrag extends Boss {
  constructor(config = {}) {
    super({
      ...config,
      partDefs:    KRAG_PART_DEFS,
      breakThresh: { body: 99999, rune1: 400, rune2: 400, rune3: 400, rune4: 400 },
    });

    this.displayName = 'KRAG';
    this.movePool  = KRAG_MOVES;
    this.baseSpeed = 1.1;
    this.speed     = 1.1;
    this.maxSpeed  = 3.5;

    // Scale HP slightly higher (big tanky boss)
    const pc     = config.playerCount ?? 1;
    this.maxHp   = 3200 + pc * 700;
    this.hp      = this.maxHp;

    this._berserk        = false;
    this._runeOrbitAngle = 0;
    this._runeSpinMult   = 1.0;
    this._runePositions  = {};
    // Init rune positions so they exist before first draw
    this._updateRuneOrbit();
  }

  // ── Rune orbit (world-space positions) ──────────────────
  _updateRuneOrbit() {
    const OFFSETS = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
    const KEYS    = ['rune1', 'rune2', 'rune3', 'rune4'];
    const orbitR  = 128;
    const spinSpd = (this._runeSpinMult ?? 1.0) * 0.018;
    this._runeOrbitAngle = (this._runeOrbitAngle ?? 0) + spinSpd;
    KEYS.forEach((key, i) => {
      const a = this._runeOrbitAngle + OFFSETS[i];
      this._runePositions[key] = {
        x: this.x + Math.cos(a) * orbitR,
        y: this.y + Math.sin(a) * orbitR,
      };
    });
  }

  // Override: rune positions are world-space, not angle-rotated
  getPartPos(key) {
    if (key.startsWith('rune') && this._runePositions[key]) {
      return { ...this._runePositions[key], r: this.partDefs[key].r };
    }
    return super.getPartPos(key);
  }

  // Override: 80% damage reduction while any Rune is intact
  // Hitting a Rune directly always does full damage (to incentivize targeting them)
  takeDamage(amount, partKey, opts = {}) {
    const activeRunes = ['rune1', 'rune2', 'rune3', 'rune4'].filter(k => !this.parts[k]?.broken);
    const isRuneHit   = partKey?.startsWith('rune');
    const shieldMult  = (activeRunes.length > 0 && !isRuneHit) ? 0.20 : 1.0;
    return super.takeDamage(amount * shieldMult, partKey, opts);
  }

  // Override: check all runes broken → berserk
  breakPart(key) {
    super.breakPart(key);
    if (key.startsWith('rune')) {
      const allBroken = ['rune1', 'rune2', 'rune3', 'rune4'].every(k => this.parts[k]?.broken);
      if (allBroken && !this._berserk) this._enterBerserk();
    }
  }

  _enterBerserk() {
    this._berserk     = true;
    this.speed        = this.baseSpeed * 1.85;
    this.maxSpeed     = this.speed * 3.0;
    this.acceleration = 0.22;
    this.enrageFlash  = 280;
    spawnBigAnnouncement('🪨 KRAG ENRAGED! ALL RUNES SHATTERED!', '#dd8800');
  }

  // Override: allow requireBerserk moves
  _isMoveAvailable(move) {
    if (move.requireBerserk && !this._berserk) return false;
    return super._isMoveAvailable(move);
  }

  update(players, arena) {
    if (!this.alive) return;
    this._updateRuneOrbit();
    // Keep runeSpinMult at 1 unless shield_spin is active
    if (!(this.state === 'active' && this.currentMove?.id === 'shield_spin')) {
      this._runeSpinMult = 1.0;
    }
    super.update(players, arena);
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.hp    = 0;
    this.state = 'dead';
    this.vx = 0; this.vy = 0;
    spawnDeathExplosion(this.x, this.y, '#aaaaaa');
    setTimeout(() => spawnDeathExplosion(this.x + (Math.random() - 0.5) * 80, this.y + (Math.random() - 0.5) * 60, '#888844'), 300);
    setTimeout(() => spawnDeathExplosion(this.x + (Math.random() - 0.5) * 100, this.y + (Math.random() - 0.5) * 80, '#cccc44'), 700);
    spawnBigAnnouncement('🪨 KRAG DEFEATED!', '#cccc66');
    setTimeout(() => showPVEResult(true), 2500);
  }

  // ── Drawing ─────────────────────────────────────────────
  draw(ctx) {
    if (!this.alive && this.state !== 'active') return;
    const flashOn = this.hitFlash > 0 && Math.floor(this.hitFlash / 2) % 2 === 0;

    // Rune stones behind the body
    for (const key of ['rune1', 'rune2', 'rune3', 'rune4']) {
      if (!this.parts[key]?.broken) this._drawRuneStone(ctx, key, flashOn);
    }

    // Core body
    this._drawKragBody(ctx, flashOn);

    // Low-HP cracks
    this._drawCracks(ctx);

    // Berserk aura
    if (this._berserk) {
      const t     = Date.now() * 0.012;
      const pulse = 0.35 + 0.25 * Math.sin(t);
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, 98, 0, Math.PI * 2);
      ctx.strokeStyle  = '#ff8800';
      ctx.lineWidth    = 10;
      ctx.globalAlpha  = pulse;
      ctx.shadowColor  = '#ff6600';
      ctx.shadowBlur   = 22;
      ctx.stroke();
      ctx.restore();
    }

    // Rock throw projectiles
    for (const tb of this.thunderBalls) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(tb.x, tb.y, tb.r, 0, Math.PI * 2);
      if (tb._rock) {
        ctx.fillStyle   = '#7a6030';
        ctx.strokeStyle = '#3a2010';
        ctx.lineWidth   = 2.5;
      } else {
        ctx.fillStyle   = '#aaddff';
        ctx.strokeStyle = '#44aaff';
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = '#44aaff'; ctx.shadowBlur = 12;
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (this.state === 'stunned') this._drawStunStars(ctx);
    if ((this.state === 'windup' || this.state === 'active') && this.currentMove?.drawHint) {
      this.currentMove.drawHint(ctx, this);
    }
    this._drawHUD(ctx);
  }

  _drawKragBody(ctx, flashOn) {
    const p  = this.getPartPos('body');
    const ps = this.parts['body'];
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);

    // Berserk glows orange, normal is stone grey
    if (this._berserk && !flashOn) {
      ctx.fillStyle  = '#7a5020';
      ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 18;
    } else {
      ctx.fillStyle = flashOn ? '#ffffff' : '#5a5a48';
    }
    ctx.fill();
    ctx.strokeStyle = '#2e2e20'; ctx.lineWidth = 3;
    ctx.stroke();

    // Core glow (when all runes broken)
    if (this._berserk) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 28, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,140,0,${0.5 + 0.3 * Math.sin(Date.now() * 0.015)})`;
      ctx.fill();
    }
    ctx.restore();
  }

  _drawRuneStone(ctx, key, flashOn) {
    const p  = this.getPartPos(key);
    if (!p) return;
    const ps  = this.parts[key];
    const pct = ps.broken ? 0 : ps.breakHp / ps.maxBreakHp;
    const t   = Date.now() * 0.003;

    ctx.save();
    ctx.shadowColor = `rgba(80,140,255,${0.4 + 0.35 * Math.sin(t + p.x * 0.01)})`;
    ctx.shadowBlur  = 14;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle   = flashOn ? '#ffffff' : '#4488ff';
    ctx.strokeStyle = '#1133aa'; ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Break arc
    if (!ps.broken && pct < 1) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.strokeStyle = pct > 0.5 ? 'rgba(100,200,255,0.8)' : pct > 0.25 ? 'rgba(255,200,80,0.8)' : 'rgba(255,80,50,0.8)';
      ctx.lineWidth   = 3;
      ctx.stroke();
    }

    // Rune symbol
    ctx.font          = 'bold 10px Arial';
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.fillStyle     = 'rgba(200,225,255,0.9)';
    ctx.fillText('✦', p.x, p.y);
    ctx.restore();
  }

  _drawCracks(ctx) {
    const pct = this.hp / this.maxHp;
    if (pct > 0.55) return;
    const intensity = 1 - pct / 0.55;
    ctx.save();
    ctx.strokeStyle = `rgba(0,0,0,${0.55 * intensity})`;
    ctx.lineWidth   = 1.5;
    const pattern = [
      [[-10,-22],[12,14],[-6,38]],
      [[ 22,-10],[-16, 5],[2,-36]],
      [[-26, 8],[  2,22],[20, 9]],
      [[ 8, 30],[-14,15],[18,-5]],
    ];
    for (const [a, b, c] of pattern) {
      ctx.beginPath();
      ctx.moveTo(this.x + a[0], this.y + a[1]);
      ctx.lineTo(this.x + b[0], this.y + b[1]);
      ctx.lineTo(this.x + c[0], this.y + c[1]);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawHUD(ctx) {
    const barW = 390, barH = 16;
    const bx   = (CW - barW) / 2, by = 14;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(bx - 6, by - 6, barW + 12, barH + 52);

    const pct = this.hp / this.maxHp;
    ctx.fillStyle = pct > 0.5 ? '#888855' : pct > 0.25 ? '#aa6622' : '#cc3300';
    ctx.fillRect(bx, by, barW * pct, barH);

    ctx.strokeStyle = '#665533'; ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, barW, barH);

    ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = this._berserk ? '#ffaa44' : '#ccccaa';
    ctx.fillText(
      `🪨 KRAG THE UNYIELDING${this._berserk ? '  [BERSERK]' : ''}   HP: ${Math.ceil(this.hp)} / ${this.maxHp}`,
      CW / 2, by + barH + 8
    );

    // 4 rune dots
    const RUNE_KEYS = ['rune1', 'rune2', 'rune3', 'rune4'];
    const dotW      = (barW - 16) / 4;
    RUNE_KEYS.forEach((key, i) => {
      const ps     = this.parts[key];
      const rpct   = ps.broken ? 0 : ps.breakHp / ps.maxBreakHp;
      const dx     = bx + 8 + i * dotW + dotW / 2;
      const dy     = by + barH + 22;
      const pBarW  = dotW - 10;

      ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
      ctx.fillStyle = ps.broken ? '#443322' : '#8899cc';
      ctx.fillText(`Rune ${['I', 'II', 'III', 'IV'][i]}`, dx, dy - 8);

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(dx - pBarW / 2, dy, pBarW, 5);

      ctx.fillStyle = ps.broken ? '#222'
        : rpct > 0.5  ? '#4488ff'
        : rpct > 0.25 ? '#aaaa22'
        : '#cc3333';
      ctx.fillRect(dx - pBarW / 2, dy, pBarW * rpct, 5);

      ctx.strokeStyle = '#333'; ctx.lineWidth = 0.5;
      ctx.strokeRect(dx - pBarW / 2, dy, pBarW, 5);

      if (ps.broken) {
        ctx.font = 'bold 7px Arial'; ctx.fillStyle = '#cc4444';
        ctx.fillText('BROKEN', dx, dy + 13);
      }
    });

    ctx.restore();
  }
}
