// ============================================================
// VAEL THE UNTOUCHABLE — Storm Harpy
// Very fast boss with 40% evasion on every incoming hit.
// Break wings to reduce evasion to 10% and disable Dive Bomb.
// ============================================================

const VAEL_PART_DEFS = {
  body:  { ox:  0,  oy:  0, r: 44, label: 'Body',   breakable: false, color: '#c8c8e8', strokeColor: '#8888aa' },
  head:  { ox: 52,  oy:  0, r: 26, label: 'Head',   breakable: false, color: '#d4d4f4', strokeColor: '#9090bb' },
  lWing: { ox: -5,  oy: -72, r: 26, label: 'L.Wing', breakable: true,  color: '#aaaacc', strokeColor: '#6666aa' },
  rWing: { ox: -5,  oy:  72, r: 26, label: 'R.Wing', breakable: true,  color: '#aaaacc', strokeColor: '#6666aa' },
};

class BossVael extends Boss {
  constructor(config = {}) {
    super({
      ...config,
      partDefs:    VAEL_PART_DEFS,
      breakThresh: { body: 99999, head: 99999, lWing: 480, rWing: 480 },
    });

    this.displayName = 'VAEL';
    this.movePool  = VAEL_MOVES;
    this.baseSpeed = 3.5;
    this.speed     = 3.5;
    this.maxSpeed  = this.baseSpeed * 2.6;
    this.acceleration = 0.20;

    const pc    = config.playerCount ?? 1;
    this.maxHp  = 1800 + pc * 480;
    this.hp     = this.maxHp;

    this._bobOffset = 0; // vertical hover bob
  }

  // Override: 40% evasion (10% when both wings broken)
  takeDamage(amount, partKey, opts = {}) {
    const lBroken   = this.parts.lWing?.broken;
    const rBroken   = this.parts.rWing?.broken;
    const evasion   = (lBroken && rBroken) ? 0.10 : 0.40;
    if (Math.random() < evasion) {
      // Miss — show floater at hit location
      const pp = this.getPartPos(partKey) ?? { x: this.x, y: this.y - 50, r: 20 };
      spawnDamageNumber(pp.x, pp.y - pp.r - 8, 0, '#aaaaff');
      spawnSparks(pp.x, pp.y, 3);
      return { finalAmount: 0, crit: false };
    }
    return super.takeDamage(amount, partKey, opts);
  }

  update(players, arena) {
    if (!this.alive) return;
    this._bobOffset = Math.sin(state.frame * 0.048) * 5;
    super.update(players, arena);
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.hp    = 0;
    this.state = 'dead';
    this.vx = 0; this.vy = 0;
    spawnDeathExplosion(this.x, this.y, '#ccccff');
    setTimeout(() => spawnDeathExplosion(this.x + (Math.random() - 0.5) * 80, this.y + (Math.random() - 0.5) * 60, '#aaaadd'), 300);
    setTimeout(() => spawnDeathExplosion(this.x + (Math.random() - 0.5) * 100, this.y + (Math.random() - 0.5) * 80, '#ffffff'), 700);
    spawnBigAnnouncement('🌪️ VAEL DEFEATED!', '#ccccff');
    setTimeout(() => showPVEResult(true), 2500);
  }

  // ── Drawing ──────────────────────────────────────────────
  draw(ctx) {
    if (!this.alive && this.state !== 'active') return;

    const flashOn = this.hitFlash > 0 && Math.floor(this.hitFlash / 2) % 2 === 0;
    const bob     = this._bobOffset ?? 0;

    // Wings behind body
    for (const key of ['lWing', 'rWing']) this._drawVaelPart(ctx, key, flashOn, bob);
    // Body + head
    for (const key of ['body', 'head']) this._drawVaelPart(ctx, key, flashOn, bob);

    // Wing-tip feather wisps
    if (!this.parts.lWing?.broken) this._drawWingWisps(ctx, 'lWing', bob);
    if (!this.parts.rWing?.broken) this._drawWingWisps(ctx, 'rWing', bob);

    // Speed trail
    if (this.state === 'active' && this.currentMove?.id === 'charge') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x - this.vx * 3, this.y + bob - this.vy * 3, 30, 0, Math.PI * 2);
      ctx.fillStyle  = 'rgba(200,200,255,0.12)';
      ctx.fill();
      ctx.restore();
    }

    // Feather projectiles
    for (const tb of this.thunderBalls) {
      ctx.save();
      if (tb._feather) {
        ctx.beginPath();
        const fLen = 14, fHalf = 3.5;
        const angle = Math.atan2(tb.vy, tb.vx);
        ctx.save();
        ctx.translate(tb.x, tb.y);
        ctx.rotate(angle);
        ctx.moveTo(-fLen, 0);
        ctx.lineTo(0, fHalf);
        ctx.lineTo(fLen, 0);
        ctx.lineTo(0, -fHalf);
        ctx.closePath();
        ctx.fillStyle   = '#ddddff';
        ctx.shadowColor = '#aaaaff'; ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(tb.x, tb.y, tb.r, 0, Math.PI * 2);
        ctx.fillStyle = '#ccccff';
        ctx.fill();
      }
      ctx.restore();
    }

    if (this.state === 'stunned') this._drawStunStars(ctx);
    if ((this.state === 'windup' || this.state === 'active') && this.currentMove?.drawHint) {
      this.currentMove.drawHint(ctx, this);
    }
    this._drawHUD(ctx);
  }

  _drawVaelPart(ctx, key, flashOn, bob) {
    const def = this.partDefs[key];
    if (!def) return;
    const ps  = this.parts[key];
    // Compute position with bob applied to y
    const rawP = super.getPartPos(key);
    if (!rawP) return;
    const p = { x: rawP.x, y: rawP.y + bob, r: rawP.r };

    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle   = flashOn ? '#ffffff' : (ps.broken ? '#3a3a4a' : def.color);
    ctx.strokeStyle = ps.broken ? '#222' : def.strokeColor;
    ctx.lineWidth   = 2;
    ctx.fill(); ctx.stroke();

    // Wing break arc
    if (def.breakable && def.label) {
      const pct = ps.broken ? 0 : ps.breakHp / ps.maxBreakHp;
      if (!ps.broken) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        ctx.strokeStyle = pct > 0.5 ? 'rgba(200,200,255,0.75)' : pct > 0.25 ? 'rgba(255,220,80,0.75)' : 'rgba(255,80,80,0.85)';
        ctx.lineWidth   = 3;
        ctx.stroke();
      }
      // Small HP bar below part
      const barW = p.r * 2.4, barH = 5;
      const bx = p.x - barW / 2, by = p.y + p.r + 7;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
      ctx.fillStyle = ps.broken ? '#2a2a2a'
        : pct > 0.5  ? '#6688cc'
        : pct > 0.25 ? '#cccc22'
        : '#cc3333';
      ctx.fillRect(bx, by, barW * (ps.broken ? 0 : pct), barH);
      ctx.strokeStyle = '#111'; ctx.lineWidth = 0.5;
      ctx.strokeRect(bx, by, barW, barH);
      ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = ps.broken ? '#555' : '#ddd';
      ctx.fillText(ps.broken ? `${def.label} ✗` : def.label, p.x, by + barH + 2);
    }
    ctx.restore();
  }

  _drawWingWisps(ctx, key, bob) {
    const rawP = super.getPartPos(key);
    if (!rawP) return;
    const p = { x: rawP.x, y: rawP.y + bob };
    const t = Date.now() * 0.004;
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const a     = t + i * 1.2;
      const wx    = p.x + Math.cos(a) * 18;
      const wy    = p.y + Math.sin(a) * 10;
      ctx.beginPath();
      ctx.arc(wx, wy, 3, 0, Math.PI * 2);
      ctx.fillStyle  = `rgba(200,200,255,${0.4 + 0.3 * Math.sin(a * 2)})`;
      ctx.shadowColor = '#aaaaff'; ctx.shadowBlur = 6;
      ctx.fill();
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
    ctx.fillStyle = pct > 0.5 ? '#6688aa' : pct > 0.25 ? '#887788' : '#cc3355';
    ctx.fillRect(bx, by, barW * pct, barH);
    ctx.strokeStyle = '#445577'; ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, barW, barH);

    const lBroken = this.parts.lWing?.broken;
    const rBroken = this.parts.rWing?.broken;
    const evasion = (lBroken && rBroken) ? '10%' : '40%';
    ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ddddff';
    ctx.fillText(`🌪️ VAEL THE UNTOUCHABLE   Evasion: ${evasion}   HP: ${Math.ceil(this.hp)} / ${this.maxHp}`, CW / 2, by + barH + 8);

    // Wing status bars
    const parts = [
      { key: 'lWing', icon: '🪶', label: 'L.Wing' },
      { key: 'rWing', icon: '🪶', label: 'R.Wing' },
    ];
    const pBarW = 160, pBarH = 6;
    parts.forEach((info, i) => {
      const ps   = this.parts[info.key];
      const rpct = ps.broken ? 0 : ps.breakHp / ps.maxBreakHp;
      const px   = bx + 10 + i * (pBarW + 20);
      const py   = by + barH + 22;

      ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
      ctx.fillStyle = ps.broken ? '#444' : '#aabbdd';
      ctx.fillText(`${info.icon} ${info.label}`, px, py);

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(px, py + 11, pBarW, pBarH);
      ctx.fillStyle = ps.broken ? '#222'
        : rpct > 0.5  ? '#6688bb'
        : rpct > 0.25 ? '#aaaa22'
        : '#cc3333';
      ctx.fillRect(px, py + 11, pBarW * rpct, pBarH);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 0.5;
      ctx.strokeRect(px, py + 11, pBarW, pBarH);
      if (ps.broken) {
        ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center';
        ctx.fillStyle = '#cc4444';
        ctx.fillText('BROKEN', px + pBarW / 2, py + 19);
      }
    });

    ctx.restore();
  }
}
