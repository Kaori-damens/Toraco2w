// ============================================================
// SYVARA THE UNRAVELED — Void Weaver
// Teleports between Void Anchors. Staff break disables teleport
// and Void Hole. Places Anchors around the arena at start.
// ============================================================

const SYVARA_PART_DEFS = {
  body:  { ox:  0, oy:  0, r: 48, label: 'Body',  breakable: false, color: '#2a0a4a', strokeColor: '#140528' },
  head:  { ox: 60, oy:  0, r: 28, label: 'Head',  breakable: false, color: '#3a1060', strokeColor: '#1e0832' },
  staff: { ox: 32, oy:-62, r: 22, label: 'Staff', breakable: true,  color: '#7722cc', strokeColor: '#4a1488' },
  lOrb:  { ox:-48, oy:-40, r: 16, label: 'L.Orb', breakable: true,  color: '#aa44ff', strokeColor: '#6622aa' },
  rOrb:  { ox:-48, oy: 40, r: 16, label: 'R.Orb', breakable: true,  color: '#aa44ff', strokeColor: '#6622aa' },
};

class BossSyvara extends Boss {
  constructor(config = {}) {
    super({
      ...config,
      partDefs:    SYVARA_PART_DEFS,
      breakThresh: { body: 99999, head: 99999, staff: 580, lOrb: 340, rOrb: 340 },
    });

    this.displayName = 'SYVARA';
    this.movePool  = SYVARA_MOVES;
    this.baseSpeed = 1.6;
    this.speed     = 1.6;
    this.maxSpeed  = this.baseSpeed * 2.2;

    const pc    = config.playerCount ?? 1;
    this.maxHp  = 2200 + pc * 580;
    this.hp     = this.maxHp;

    // Teleport state (used by moves)
    this._tpTarget   = null;
    this._tpProgress = null;
    this._tpDone     = false;

    // Place void anchors in the arena at spawn time
    this._anchorIds = [];
    this._spawnAnchors();
  }

  _spawnAnchors() {
    const positions = [
      { x: 180, y: 170 }, { x: CW - 180, y: 170 },
      { x: 180, y: CH - 170 }, { x: CW - 180, y: CH - 170 },
    ];
    for (const pos of positions) {
      const id = `void_anchor_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      this._anchorIds.push(id);
      state.terrainObjects.push({
        type: 'VOID_ANCHOR', id,
        shape: 'circle', x: pos.x, y: pos.y, r: 26,
        color: 'rgba(140,0,220,0.20)',
        pulseColor: 'rgba(200,80,255,0.45)',
        _syvara: true,
        destroyed: false,
      });
    }
  }

  // ── Move availability ────────────────────────────────────
  _isMoveAvailable(move) {
    if (move.requireParts) {
      for (const pk of move.requireParts) {
        if (this.parts[pk]?.broken) return false;
      }
    }
    return super._isMoveAvailable(move);
  }

  // ── Custom damage for orb burst flash ───────────────────
  takeDamage(amount, partKey, opts = {}) {
    const result = super.takeDamage(amount, partKey, opts);
    // When an orb breaks, spawn sparks at its position
    if (partKey && (partKey === 'lOrb' || partKey === 'rOrb')) {
      if (this.parts[partKey]?.broken) {
        const pos = this.getPartPos(partKey);
        if (pos) spawnSparks(pos.x, pos.y, 18);
      }
    }
    return result;
  }

  breakPart(key) {
    super.breakPart(key);
    if (key === 'staff') {
      spawnBigAnnouncement('🔮 STAFF SHATTERED! Teleport disabled!', '#cc44ff');
    } else if (key === 'lOrb' || key === 'rOrb') {
      const bothBroken = this.parts.lOrb?.broken && this.parts.rOrb?.broken;
      if (bothBroken) {
        spawnBigAnnouncement('💀 BOTH ORBS BROKEN! Barrage weakened!', '#aa44ff');
      }
    }
  }

  update(players, arena) {
    if (!this.alive) return;
    // Teleport alpha fade (draw references _tpProgress)
    super.update(players, arena);
  }

  die() {
    if (!this.alive) return;
    this.alive = false; this.hp = 0; this.state = 'dead';
    this.vx = 0; this.vy = 0;
    // Destroy anchors on death
    for (const id of this._anchorIds) {
      const obj = state.terrainObjects.find(t => t.id === id);
      if (obj) obj.destroyed = true;
    }
    spawnDeathExplosion(this.x, this.y, '#9922ff');
    setTimeout(() => spawnDeathExplosion(this.x + (Math.random()-0.5)*80, this.y + (Math.random()-0.5)*60, '#cc44ff'), 300);
    setTimeout(() => spawnDeathExplosion(this.x + (Math.random()-0.5)*100, this.y + (Math.random()-0.5)*80, '#6600cc'), 700);
    spawnBigAnnouncement('🌀 SYVARA DEFEATED!', '#cc88ff');
    setTimeout(() => showPVEResult(true), 2500);
  }

  // ── Drawing ──────────────────────────────────────────────
  draw(ctx) {
    if (!this.alive && this.state !== 'active') return;
    const flashOn  = this.hitFlash > 0 && Math.floor(this.hitFlash / 2) % 2 === 0;
    const enrGlow  = this.enrageFlash > 0;

    // Teleport alpha fade
    let alpha = 1;
    if (this._tpProgress !== null && this._tpProgress !== undefined) {
      if (this._tpProgress < 0.5) {
        alpha = 1 - this._tpProgress * 2;
      } else {
        alpha = (this._tpProgress - 0.5) * 2;
      }
      alpha = Math.max(0, Math.min(1, alpha));
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    // Void aura
    if (!this.parts.staff?.broken) {
      const t = Date.now() * 0.004;
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, 60 + 6 * Math.sin(t), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(140,0,220,0.28)';
      ctx.lineWidth   = 8;
      ctx.shadowColor = '#aa00ff';
      ctx.shadowBlur  = 18;
      ctx.stroke();
      ctx.restore();
    }

    // Enrage aura
    if (enrGlow) {
      const t = Date.now() * 0.012;
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, 70, 0, Math.PI * 2);
      ctx.strokeStyle = '#cc00ff';
      ctx.lineWidth   = 10;
      ctx.globalAlpha = alpha * (0.3 + 0.25 * Math.sin(t));
      ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.restore();
    }

    // Orbs
    this._drawOrbPart(ctx, 'lOrb', flashOn);
    this._drawOrbPart(ctx, 'rOrb', flashOn);
    // Staff
    this._drawStaffPart(ctx, flashOn);
    // Body + Head
    this._drawPart(ctx, 'body', flashOn, enrGlow);
    this._drawPart(ctx, 'head', flashOn, false);

    // Void projectiles
    for (const tb of this.thunderBalls) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(tb.x, tb.y, tb.r, 0, Math.PI * 2);
      ctx.fillStyle   = tb._void ? 'rgba(160,0,255,0.85)' : '#aaddff';
      ctx.strokeStyle = tb._void ? '#8800cc' : '#44aaff';
      ctx.lineWidth   = 1.5;
      if (tb._void)   { ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 10; }
      if (tb._hex)    {
        ctx.fillStyle   = 'rgba(60,200,100,0.85)';
        ctx.strokeStyle = '#228844';
        ctx.shadowColor = '#44ff88'; ctx.shadowBlur = 8;
      }
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // end globalAlpha

    if (this.state === 'stunned') this._drawStunStars(ctx);
    if ((this.state === 'windup' || this.state === 'active') && this.currentMove?.drawHint) {
      this.currentMove.drawHint(ctx, this);
    }
    this._drawHUD(ctx);
  }

  _drawOrbPart(ctx, key, flashOn) {
    const pos = this.getPartPos(key);
    if (!pos) return;
    const ps  = this.parts[key];
    if (ps.broken) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(40,0,60,0.55)';
      ctx.fill();
      ctx.restore();
      return;
    }
    const pct = ps.breakHp / ps.maxBreakHp;
    const t   = Date.now() * 0.005;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
    ctx.fillStyle   = flashOn ? '#ffffff' : (pct > 0.5 ? '#aa44ff' : pct > 0.25 ? '#dd66ff' : '#ff4488');
    ctx.strokeStyle = '#6622aa'; ctx.lineWidth = 2;
    ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 12;
    ctx.fill(); ctx.stroke();
    // Pulse inner
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pos.r * (0.4 + 0.15 * Math.sin(t + (key === 'lOrb' ? 0 : Math.PI))), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,200,255,0.3)';
    ctx.fill();
    // Break arc
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pos.r + 4, -Math.PI/2, -Math.PI/2 + Math.PI*2*pct);
    ctx.strokeStyle = pct > 0.5 ? 'rgba(180,80,255,0.75)' : 'rgba(255,60,120,0.85)';
    ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }

  _drawStaffPart(ctx, flashOn) {
    const pos = this.getPartPos('staff');
    if (!pos) return;
    const ps  = this.parts['staff'];
    const pct = ps.broken ? 0 : ps.breakHp / ps.maxBreakHp;
    const t   = Date.now() * 0.008;
    ctx.save();
    if (ps.broken) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#220033'; ctx.fill();
      ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#660088';
      ctx.fillText('BROKEN', pos.x, pos.y);
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
    ctx.fillStyle   = flashOn ? '#ffffff' : `hsl(${270 + pct * 20}, 80%, 55%)`;
    ctx.strokeStyle = '#4a1488'; ctx.lineWidth = 2;
    ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 16;
    ctx.fill(); ctx.stroke();
    // Rotating inner star
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pos.r * (0.5 + 0.2 * Math.sin(t)), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,200,255,0.25)'; ctx.fill();
    // Break arc
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pos.r + 5, -Math.PI/2, -Math.PI/2 + Math.PI*2*pct);
    ctx.strokeStyle = pct > 0.5 ? 'rgba(200,100,255,0.8)' : 'rgba(255,60,180,0.85)';
    ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }

  _drawHUD(ctx) {
    const barW = 390, barH = 16;
    const bx   = (CW - barW) / 2, by = 14;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(bx - 6, by - 6, barW + 12, barH + 52);

    const pct = this.hp / this.maxHp;
    ctx.fillStyle = pct > 0.5 ? '#6600cc' : pct > 0.25 ? '#9922cc' : '#cc2244';
    ctx.fillRect(bx, by, barW * pct, barH);
    ctx.strokeStyle = '#440088'; ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, barW, barH);

    const anchorsLeft = state.terrainObjects.filter(t => t._syvara && !t.destroyed).length;
    const staffStatus = this.parts.staff?.broken ? ' [STAFF BROKEN]' : '';
    ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = '#cc88ff';
    ctx.fillText(`🌀 SYVARA THE UNRAVELED${staffStatus}   Anchors: ${anchorsLeft}   HP: ${Math.ceil(this.hp)} / ${this.maxHp}`, CW/2, by + barH + 8);

    // Part bars
    const partInfo = [
      { key: 'staff', icon: '🔮', label: 'Staff' },
      { key: 'lOrb',  icon: '💜', label: 'L.Orb' },
      { key: 'rOrb',  icon: '💜', label: 'R.Orb' },
    ];
    const pBarW   = 102, pBarH = 6;
    const pStartX = bx + 10;
    const pStartY = by + barH + 22;

    partInfo.forEach((info, i) => {
      const ps   = this.parts[info.key];
      const rpct = ps.broken ? 0 : ps.breakHp / ps.maxBreakHp;
      const px   = pStartX + i * (pBarW + 14);

      ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
      ctx.fillStyle = ps.broken ? '#444' : '#cc88ff';
      ctx.fillText(`${info.icon} ${info.label}`, px, pStartY);

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(px, pStartY + 11, pBarW, pBarH);
      ctx.fillStyle = ps.broken ? '#222'
        : rpct > 0.5  ? '#8822cc'
        : rpct > 0.25 ? '#aa44ff'
        : '#ff2288';
      ctx.fillRect(px, pStartY + 11, pBarW * rpct, pBarH);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 0.5;
      ctx.strokeRect(px, pStartY + 11, pBarW, pBarH);
      if (ps.broken) {
        ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center';
        ctx.fillStyle = '#cc4488';
        ctx.fillText('BROKEN', px + pBarW / 2, pStartY + 19);
      }
    });

    ctx.restore();
  }
}
