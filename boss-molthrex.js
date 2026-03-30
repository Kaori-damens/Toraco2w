// ============================================================
// MOLTHREX THE FESTERING — Plague Hydra
// Starts with 1 head. Break a head → 2 smaller heads spawn.
// Max 5 heads total. More heads = more acid per move.
// ============================================================

const MOLTHREX_PART_DEFS = {
  body: { ox: 0, oy: 0, r: 55, label: 'Body', breakable: false, color: '#1a3a10', strokeColor: '#0a1808' },
};

class BossMolthrex extends Boss {
  constructor(config = {}) {
    super({
      ...config,
      partDefs:    MOLTHREX_PART_DEFS,
      breakThresh: { body: 99999 },
    });

    this.displayName = 'MOLTHREX';
    this.movePool  = MOLTHREX_MOVES;
    this.baseSpeed = 1.6;
    this.speed     = 1.6;
    this.maxSpeed  = this.baseSpeed * 2.4;

    const pc    = config.playerCount ?? 1;
    this.maxHp  = 2400 + pc * 600;
    this.hp     = this.maxHp;

    this._maxHeads = 5;

    // Initial single head facing boss direction
    this.heads = [
      { id: 'head0', angle: 0, dist: 105, r: 38,
        hp: 550, maxHp: 550, alive: true, broken: false, gen: 0 },
    ];

    this._constrictSlowTimer = 0;
  }

  // ── Part position: heads use angle+dist in world space ─
  getPartPos(key) {
    if (key && key !== 'body') {
      const head = this.heads.find(h => h.id === key);
      if (head) {
        const a = head.angle; // world-space angle (updated each frame)
        return {
          x: this.x + Math.cos(a) * head.dist,
          y: this.y + Math.sin(a) * head.dist,
          r: head.r,
        };
      }
    }
    return super.getPartPos(key);
  }

  // ── All hittable parts: body + alive heads ─────────────
  getAllHitParts() {
    return [
      'body',
      ...this.heads.filter(h => !h.broken && h.alive).map(h => h.id),
    ];
  }

  // ── Hit detection includes heads ───────────────────────
  checkHit(px, py, pr = 4) {
    let best = null, bestDepth = 0;
    for (const key of this.getAllHitParts()) {
      const p = this.getPartPos(key);
      if (!p) continue;
      const depth = p.r + pr - Math.hypot(px - p.x, py - p.y);
      if (depth > 0 && depth > bestDepth) { bestDepth = depth; best = key; }
    }
    return best;
  }

  // ── Damage: head hits handled separately ───────────────
  takeDamage(amount, partKey, opts = {}) {
    if (!this.alive) return { finalAmount: 0, crit: false };

    const head = partKey && partKey !== 'body'
      ? this.heads.find(h => h.id === partKey && !h.broken)
      : null;

    if (head) {
      let crit  = opts.crit ?? false;
      if (this.state === 'stunned') crit = true;
      let final = amount * (crit ? 1.5 : 1);

      this.hp        = Math.max(0, this.hp - final);
      head.hp       -= final;
      this.hitFlash  = 6;

      if (head.hp <= 0) this._splitHead(partKey);
      if (this.hp <= 0) this.die();
      return { finalAmount: final, crit };
    }
    return super.takeDamage(amount, partKey, opts);
  }

  // ── Head splitting ──────────────────────────────────────
  _splitHead(headId) {
    const head = this.heads.find(h => h.id === headId);
    if (!head || head.broken) return;
    head.broken = true;

    const pos = this.getPartPos(headId);
    spawnSparks(pos?.x ?? this.x, pos?.y ?? this.y, 18);

    const aliveCount = this.heads.filter(h => !h.broken).length;
    if (this.heads.length >= this._maxHeads) {
      spawnBigAnnouncement(`💀 HEAD DESTROYED! (${aliveCount} remain)`, '#55cc33');
      return;
    }

    const spread = 0.32 + head.gen * 0.08;
    const newR   = Math.max(18, head.r - 9);
    const newHp  = Math.round(head.maxHp * 0.50);
    const newDist = head.dist * 1.06;

    for (let i = 0; i < 2; i++) {
      const newAngle = head.angle + (i === 0 ? -spread : spread);
      this.heads.push({
        id:     `head_${Date.now()}_${i}`,
        angle:  newAngle,
        dist:   newDist,
        r:      newR,
        hp:     newHp, maxHp: newHp,
        alive:  true, broken: false,
        gen:    head.gen + 1,
      });
    }
    const totalActive = this.heads.filter(h => !h.broken).length;
    spawnBigAnnouncement(`🐍 HEAD SPLIT! (${totalActive} heads active)`, '#55cc33');
  }

  // ── Override isMoveAvailable for requireLowHp ──────────
  _isMoveAvailable(move) {
    if (move.requireLowHp && this.hp > this.maxHp * 0.45) return false;
    return super._isMoveAvailable(move);
  }

  update(players, arena) {
    if (!this.alive) return;
    // Update head angles to slowly face toward nearest player
    const target = this._findTarget(players);
    if (target) {
      const baseAngle = Math.atan2(target.y - this.y, target.x - this.x);
      for (const head of this.heads.filter(h => !h.broken)) {
        let diff = baseAngle - head.angle;
        while (diff >  Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        head.angle += Math.sign(diff) * Math.min(Math.abs(diff), 0.025);
      }
    }
    // Apply constrict slow
    for (const p of players) {
      if (!p.alive) continue;
      if ((p._constrictSlow ?? 0) > 0) {
        p._constrictSlow--;
        p.maxSpd = (p.baseMaxSpd ?? p.maxSpd) * 0.45;
      } else if (p._constrictSlow === 0 && p.baseMaxSpd) {
        p.maxSpd = p.baseMaxSpd;
        p._constrictSlow = -1;
      }
    }
    // Store players reference for drawHint
    this._lastPlayers = players;
    super.update(players, arena);
  }

  die() {
    if (!this.alive) return;
    this.alive = false; this.hp = 0; this.state = 'dead';
    this.vx = 0; this.vy = 0;
    spawnDeathExplosion(this.x, this.y, '#44cc22');
    setTimeout(() => spawnDeathExplosion(this.x + (Math.random()-0.5)*80, this.y + (Math.random()-0.5)*60, '#22aa11'), 300);
    setTimeout(() => spawnDeathExplosion(this.x + (Math.random()-0.5)*100, this.y + (Math.random()-0.5)*80, '#88ee44'), 700);
    spawnBigAnnouncement('🐍 MOLTHREX DEFEATED!', '#88ee44');
    setTimeout(() => showPVEResult(true), 2500);
  }

  // ── Drawing ──────────────────────────────────────────────
  draw(ctx) {
    if (!this.alive && this.state !== 'active') return;
    const flashOn = this.hitFlash > 0 && Math.floor(this.hitFlash / 2) % 2 === 0;

    // Neck lines from body to each head
    for (const head of this.heads.filter(h => !h.broken)) {
      const pos = this.getPartPos(head.id);
      if (!pos) continue;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = head.broken ? '#1a2a10' : `rgba(30,80,20,${0.5 + (1 - head.hp / head.maxHp) * 0.3})`;
      ctx.lineWidth   = head.r * 0.55;
      ctx.stroke();
      ctx.restore();
    }

    // Body
    this._drawPart(ctx, 'body', flashOn, this.enrageFlash > 0);

    // Alive heads
    for (const head of this.heads.filter(h => !h.broken)) {
      this._drawHead(ctx, head, flashOn);
    }

    // Acid / dead head aura
    for (const head of this.heads.filter(h => h.broken)) {
      const pos = this.getPartPos(head.id);
      if (!pos) continue;
      // Lingering dead head (grey mound)
      ctx.save();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, head.r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(40,60,30,0.5)';
      ctx.fill();
      ctx.restore();
    }

    // Acid projectiles
    for (const tb of this.thunderBalls) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(tb.x, tb.y, tb.r, 0, Math.PI * 2);
      ctx.fillStyle   = tb._acid ? '#55dd22' : '#aaddff';
      ctx.strokeStyle = tb._acid ? '#228811' : '#44aaff';
      ctx.lineWidth   = 1.5;
      if (tb._acid) { ctx.shadowColor = '#44cc22'; ctx.shadowBlur = 8; }
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    if (this.state === 'stunned') this._drawStunStars(ctx);
    if ((this.state === 'windup' || this.state === 'active') && this.currentMove?.drawHint) {
      this.currentMove.drawHint(ctx, this);
    }
    this._drawHUD(ctx);
  }

  _drawHead(ctx, head, flashOn) {
    const pos = this.getPartPos(head.id);
    if (!pos) return;
    const pct = head.hp / head.maxHp;
    const t   = Date.now() * 0.004 + head.angle;

    ctx.save();
    // Glow
    ctx.shadowColor = 'rgba(80,200,50,0.5)';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
    ctx.fillStyle   = flashOn ? '#ffffff' : (pct > 0.5 ? '#2a6a15' : pct > 0.25 ? '#4a8a20' : '#cc4422');
    ctx.strokeStyle = '#0a2808'; ctx.lineWidth = 2;
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur  = 0;

    // Eyes (2 small white dots)
    const eyeAngle = head.angle;
    const eyeOff   = pos.r * 0.38;
    for (let i = -1; i <= 1; i += 2) {
      const ex = pos.x + Math.cos(eyeAngle) * eyeOff * 0.7 + Math.cos(eyeAngle + Math.PI/2) * i * eyeOff * 0.45;
      const ey = pos.y + Math.sin(eyeAngle) * eyeOff * 0.7 + Math.sin(eyeAngle + Math.PI/2) * i * eyeOff * 0.45;
      ctx.beginPath();
      ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4400';
      ctx.fill();
    }

    // Break-arc HP indicator
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pos.r + 5, -Math.PI/2, -Math.PI/2 + Math.PI*2*pct);
    ctx.strokeStyle = pct > 0.5 ? 'rgba(80,220,60,0.7)' : pct > 0.25 ? 'rgba(220,200,60,0.7)' : 'rgba(220,60,40,0.8)';
    ctx.lineWidth   = 3; ctx.stroke();

    // Generation label (tiny)
    if (head.gen > 0) {
      ctx.font = '7px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(200,255,180,0.7)';
      ctx.fillText('G' + head.gen, pos.x, pos.y + pos.r + 9);
    }
    ctx.restore();
  }

  _drawHUD(ctx) {
    const barW = 390, barH = 16;
    const bx   = (CW - barW) / 2, by = 14;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(bx - 6, by - 6, barW + 12, barH + 36);
    const pct = this.hp / this.maxHp;
    ctx.fillStyle = pct > 0.5 ? '#44aa22' : pct > 0.25 ? '#88aa22' : '#cc3322';
    ctx.fillRect(bx, by, barW * pct, barH);
    ctx.strokeStyle = '#226611'; ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, barW, barH);
    const aliveHeads = this.heads.filter(h => !h.broken).length;
    ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#aaddaa';
    ctx.fillText(`🐍 MOLTHREX THE FESTERING   Heads: ${aliveHeads}/${this._maxHeads}   HP: ${Math.ceil(this.hp)} / ${this.maxHp}`, CW/2, by + barH + 8);
    // Mini head HP bars
    const alive = this.heads.filter(h => !h.broken);
    const hw    = Math.min(72, (barW - 8) / Math.max(alive.length, 1));
    alive.forEach((head, i) => {
      const px   = bx + 4 + i * (hw + 4);
      const py   = by + barH + 18;
      const rpct = head.hp / head.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(px, py, hw, 5);
      ctx.fillStyle = rpct > 0.5 ? '#44aa22' : rpct > 0.25 ? '#aaaa22' : '#cc3333';
      ctx.fillRect(px, py, hw * rpct, 5);
      ctx.strokeStyle = '#222'; ctx.lineWidth = 0.5;
      ctx.strokeRect(px, py, hw, 5);
    });
    ctx.restore();
  }
}
