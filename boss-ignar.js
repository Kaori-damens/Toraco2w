// ============================================================
// IGNAR THE ETERNAL FLAME — Magma Colossus
// Leaves burning Lava Pools wherever it moves.
// Break the Core to stop lava generation.
// Break Fists to disable heavy slam attacks.
// ============================================================

const IGNAR_PART_DEFS = {
  body:  { ox:  0,  oy:  0, r: 70, label: 'Body',   breakable: false, color: '#7a2c0c', strokeColor: '#3a1006' },
  core:  { ox:  0,  oy:  0, r: 30, label: 'Core',   breakable: true,  color: '#ff6020', strokeColor: '#cc3010' },
  lFist: { ox: 62,  oy: -58, r: 28, label: 'L.Fist', breakable: true,  color: '#6a2408', strokeColor: '#3a1004' },
  rFist: { ox: 62,  oy:  58, r: 28, label: 'R.Fist', breakable: true,  color: '#6a2408', strokeColor: '#3a1004' },
};

class BossIgnar extends Boss {
  constructor(config = {}) {
    super({
      ...config,
      partDefs:    IGNAR_PART_DEFS,
      breakThresh: { body: 99999, core: 600, lFist: 420, rFist: 420 },
    });

    this.displayName = 'IGNAR';
    this.movePool  = IGNAR_MOVES;
    this.baseSpeed = 1.5;
    this.speed     = 1.5;
    this.maxSpeed  = this.baseSpeed * 2.4;
    this.acceleration = 0.14;

    const pc    = config.playerCount ?? 1;
    this.maxHp  = 2600 + pc * 650;
    this.hp     = this.maxHp;

    // Lava trail tracking
    this._lavaTimer  = 0;
    this._lastLavaX  = this.x;
    this._lastLavaY  = this.y;

    // Enrage override label
    this._ignarEnraged = false;
  }

  update(players, arena) {
    if (!this.alive) return;
    super.update(players, arena);
    this._dropLavaIfMoved();

    // Enrage label override (Thunderfang's enrage says wrong name)
    if (!this._ignarEnraged && this.enraged) {
      this._ignarEnraged = true;
    }
  }

  _dropLavaIfMoved() {
    if (!this.alive) return;
    if (this.parts.core?.broken) return; // core broken → no more lava generation
    this._lavaTimer++;
    if (this._lavaTimer < 48) return;
    const dx = this.x - this._lastLavaX;
    const dy = this.y - this._lastLavaY;
    if (Math.hypot(dx, dy) < 32) return; // must have moved enough
    this._lavaTimer  = 0;
    this._lastLavaX  = this.x;
    this._lastLavaY  = this.y;
    this._spawnLavaPool(this.x, this.y, 44, 0.22, 540);
  }

  _spawnLavaPool(x, y, r, dmgPerFrame, lifetime) {
    // Cap at 10 active trail pools (excludes geyser/eruption pools)
    const pools = state.terrainObjects.filter(t => t._ignarPool && t._trail);
    if (pools.length >= 10) {
      const oldest = pools[0];
      const idx    = state.terrainObjects.indexOf(oldest);
      if (idx >= 0) state.terrainObjects.splice(idx, 1);
    }
    state.terrainObjects.push({
      type: 'HAZARD_ZONE', id: `ignar_lava_${Date.now()}`,
      shape: 'circle', x, y, r,
      damagePerFrame: dmgPerFrame,
      color:      'rgba(255,80,0,0.18)',
      pulseColor: 'rgba(255,150,0,0.36)',
      _ignarPool: true,
      _trail:     true,
      _spawnFrame: state.frame,
      lifetime,
    });
  }

  // Expose for moves
  spawnLavaPool(x, y, r, dmgPerFrame, lifetime) {
    this._spawnLavaPool(x, y, r, dmgPerFrame, lifetime);
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.hp    = 0;
    this.state = 'dead';
    this.vx = 0; this.vy = 0;
    spawnDeathExplosion(this.x, this.y, '#ff6600');
    setTimeout(() => spawnDeathExplosion(this.x + (Math.random() - 0.5) * 80, this.y + (Math.random() - 0.5) * 60, '#ff4400'), 300);
    setTimeout(() => spawnDeathExplosion(this.x + (Math.random() - 0.5) * 100, this.y + (Math.random() - 0.5) * 80, '#ffaa00'), 700);
    spawnBigAnnouncement('🔥 IGNAR DEFEATED!', '#ff8800');
    setTimeout(() => showPVEResult(true), 2500);
  }

  // ── Drawing ──────────────────────────────────────────────
  draw(ctx) {
    if (!this.alive && this.state !== 'active') return;
    const flashOn    = this.hitFlash > 0 && Math.floor(this.hitFlash / 2) % 2 === 0;
    const enrageGlow = this.enrageFlash > 0;

    // Body first, then fists on top
    this._drawPart(ctx, 'body',  flashOn, enrageGlow);
    this._drawPart(ctx, 'lFist', flashOn, false);
    this._drawPart(ctx, 'rFist', flashOn, false);
    this._drawCore(ctx, flashOn);

    // Lava drip particles around body when core is active
    if (!this.parts.core?.broken) this._drawLavaDrips(ctx);

    // Enrage fire aura
    if (enrageGlow) {
      const t     = Date.now() * 0.014;
      const pulse = 0.35 + 0.25 * Math.sin(t);
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, 88, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff4400';
      ctx.lineWidth   = 10;
      ctx.globalAlpha = pulse;
      ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 22;
      ctx.stroke();
      ctx.restore();
    }

    if (this.state === 'stunned') this._drawStunStars(ctx);
    if ((this.state === 'windup' || this.state === 'active') && this.currentMove?.drawHint) {
      this.currentMove.drawHint(ctx, this);
    }
    this._drawHUD(ctx);
  }

  _drawCore(ctx, flashOn) {
    const p  = this.getPartPos('core');
    if (!p) return;
    const ps = this.parts['core'];
    if (ps.broken) {
      // Broken core — dark, cracked
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle   = '#2a1008';
      ctx.strokeStyle = '#1a0804';
      ctx.lineWidth   = 2;
      ctx.fill(); ctx.stroke();
      ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#663322';
      ctx.fillText('CORE ✗', p.x, p.y);
      ctx.restore();
      return;
    }
    const pct = ps.breakHp / ps.maxBreakHp;
    const t   = Date.now() * 0.006;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle  = flashOn ? '#ffffff' : `hsl(${20 + pct * 10}, 90%, 55%)`;
    ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 18;
    ctx.fill();
    ctx.strokeStyle = '#cc3010'; ctx.lineWidth = 2;
    ctx.stroke();
    // Pulsing inner glow
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (0.5 + 0.18 * Math.sin(t)), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,220,50,0.4)';
    ctx.fill();
    // Break arc
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.strokeStyle = pct > 0.5 ? 'rgba(255,200,100,0.8)' : pct > 0.25 ? 'rgba(255,150,50,0.8)' : 'rgba(255,60,30,0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();
    // HP bar
    const barW = p.r * 2.4, barH = 5;
    const bx   = p.x - barW / 2, by = p.y + p.r + 7;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
    ctx.fillStyle = pct > 0.5 ? '#ff8833' : pct > 0.25 ? '#cc5522' : '#cc2222';
    ctx.fillRect(bx, by, barW * pct, barH);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by, barW, barH);
    ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffaa66';
    ctx.fillText('Core', p.x, by + barH + 2);
    ctx.restore();
  }

  _drawLavaDrips(ctx) {
    const t = Date.now() * 0.003;
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const a    = t + i * (Math.PI * 2 / 5);
      const dist = 72 + 8 * Math.sin(t * 2 + i);
      const dx   = Math.cos(a) * dist;
      const dy   = Math.sin(a) * dist;
      ctx.beginPath();
      ctx.arc(this.x + dx, this.y + dy, 4 + 2 * Math.sin(t + i), 0, Math.PI * 2);
      ctx.fillStyle   = `rgba(255,${60 + Math.floor(40 * Math.sin(t + i))},0,${0.5 + 0.3 * Math.sin(t * 1.5 + i)})`;
      ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 8;
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
    ctx.fillStyle = pct > 0.5 ? '#aa4400' : pct > 0.25 ? '#cc3300' : '#ff1100';
    ctx.fillRect(bx, by, barW * pct, barH);
    ctx.strokeStyle = '#882200'; ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, barW, barH);

    const coreStatus = this.parts.core?.broken ? ' [CORE BROKEN — Lava Stopped]' : '';
    ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffcc88';
    ctx.fillText(`🔥 IGNAR THE ETERNAL FLAME${coreStatus}   HP: ${Math.ceil(this.hp)} / ${this.maxHp}`, CW / 2, by + barH + 8);

    // Part status bars (Core, L.Fist, R.Fist)
    const partInfo = [
      { key: 'core',  icon: '🔥', label: 'Core'   },
      { key: 'lFist', icon: '✊', label: 'L.Fist' },
      { key: 'rFist', icon: '✊', label: 'R.Fist' },
    ];
    const pBarW   = 102, pBarH = 6;
    const pStartX = bx + 10;
    const pStartY = by + barH + 22;

    partInfo.forEach((info, i) => {
      const ps  = this.parts[info.key];
      const rpct = ps.broken ? 0 : ps.breakHp / ps.maxBreakHp;
      const px  = pStartX + i * (pBarW + 14);

      ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
      ctx.fillStyle = ps.broken ? '#444' : '#ddaa66';
      ctx.fillText(`${info.icon} ${info.label}`, px, pStartY);

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(px, pStartY + 11, pBarW, pBarH);
      ctx.fillStyle = ps.broken ? '#222'
        : rpct > 0.5  ? '#ee5500'
        : rpct > 0.25 ? '#cc3300'
        : '#ff1100';
      ctx.fillRect(px, pStartY + 11, pBarW * rpct, pBarH);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 0.5;
      ctx.strokeRect(px, pStartY + 11, pBarW, pBarH);
      if (ps.broken) {
        ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center';
        ctx.fillStyle = '#cc4444';
        ctx.fillText('BROKEN', px + pBarW / 2, pStartY + 19);
      }
    });

    ctx.restore();
  }
}
