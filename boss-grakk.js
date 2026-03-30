// ============================================================
// WARBOSS GRAKK — Goblin Horde
// Commands a swarm of goblins. Kill the Shaman → goblins stop
// healing and lose rush buffs. Kill Grakk to win.
// ============================================================

const GRAKK_PART_DEFS = {
  body:   { ox:  0,  oy:  0, r: 65, label: 'Body',   breakable: false, color: '#3a6612', strokeColor: '#1e3a08' },
  head:   { ox: 78,  oy:  0, r: 38, label: 'Head',   breakable: false, color: '#4a7818', strokeColor: '#28420c' },
  shaman: { ox:-88,  oy: -52, r: 24, label: 'Shaman', breakable: true,  color: '#cc8822', strokeColor: '#885500' },
  lArm:   { ox: 52,  oy:-62, r: 24, label: 'L.Arm',  breakable: true,  color: '#336611', strokeColor: '#1c3808' },
  rArm:   { ox: 52,  oy: 62, r: 24, label: 'R.Arm',  breakable: true,  color: '#336611', strokeColor: '#1c3808' },
};

// ── Goblin constants ─────────────────────────────────────
const GOBLIN_R        = 14;
const GOBLIN_SPEED    = 1.8;
const GOBLIN_DMG      = 6;
const GOBLIN_DMG_CD   = 45; // frames between melee hits
const GOBLIN_COUNT    = 8;

class BossGrakk extends Boss {
  constructor(config = {}) {
    super({
      ...config,
      partDefs:    GRAKK_PART_DEFS,
      breakThresh: { body: 99999, head: 99999, shaman: 480, lArm: 380, rArm: 380 },
    });

    this.displayName = 'GRAKK';
    this.movePool  = GRAKK_MOVES;
    this.baseSpeed = 1.4;
    this.speed     = 1.4;
    this.maxSpeed  = this.baseSpeed * 2.2;

    const pc    = config.playerCount ?? 1;
    this.maxHp  = 2500 + pc * 600;
    this.hp     = this.maxHp;

    // Goblin swarm
    this.goblins = [];
    this._spawnGoblins();

    // Shaman heal timer
    this._shamanHealTimer = 0;
  }

  _spawnGoblins() {
    for (let i = 0; i < GOBLIN_COUNT; i++) {
      const a   = (i / GOBLIN_COUNT) * Math.PI * 2;
      const d   = 160 + Math.random() * 80;
      this.goblins.push({
        x: this.x + Math.cos(a) * d,
        y: this.y + Math.sin(a) * d,
        vx: 0, vy: 0,
        hp: 60, maxHp: 60,
        alive: true,
        hitCooldowns: new Map(),  // player → cooldown frames
        // rush state
        rushing:    false,
        rushTarget: null,
        rushFrames: 0,
      });
    }
  }

  // ── Shaman break → announces; both arms → Grakk enrages ─
  breakPart(key) {
    super.breakPart(key);
    if (key === 'shaman') {
      spawnBigAnnouncement('🧙 SHAMAN SLAIN! Goblins lose buffs!', '#ffaa22');
      // Kill all goblins' rush buff immediately
      for (const g of this.goblins) {
        g.rushing    = false;
        g.rushTarget = null;
        g.rushFrames = 0;
      }
    } else if (key === 'lArm' || key === 'rArm') {
      const both = this.parts.lArm?.broken && this.parts.rArm?.broken;
      if (both) spawnBigAnnouncement('💪 BOTH ARMS BROKEN! Grakk rages!', '#88cc22');
    }
  }

  // ── Move availability ────────────────────────────────────
  _isMoveAvailable(move) {
    if (move.requireShaman && this.parts.shaman?.broken) return false;
    return super._isMoveAvailable(move);
  }

  // ── Goblin updates (called from pve.js step) ─────────────
  updateGoblins(players) {
    const shamanAlive = !this.parts.shaman?.broken;

    // Shaman heal: restores a little of Grakk's HP periodically
    if (shamanAlive) {
      this._shamanHealTimer++;
      if (this._shamanHealTimer >= 300) {
        this._shamanHealTimer = 0;
        const heal = 8;
        this.hp = Math.min(this.maxHp, this.hp + heal);
      }
    }

    for (const g of this.goblins) {
      if (!g.alive) continue;

      // Countdown rush
      if (g.rushing && g.rushFrames > 0) {
        g.rushFrames--;
        if (g.rushFrames <= 0) {
          g.rushing    = false;
          g.rushTarget = null;
        }
      }

      // Tick hit cooldowns
      for (const [k, v] of g.hitCooldowns) {
        if (v <= 1) g.hitCooldowns.delete(k);
        else g.hitCooldowns.set(k, v - 1);
      }

      // Movement — pursue a player
      const target = g.rushing && g.rushTarget?.alive
        ? g.rushTarget
        : players.find(p => p.alive);
      if (!target) continue;

      const dx  = target.x - g.x;
      const dy  = target.y - g.y;
      const d   = Math.hypot(dx, dy) || 1;
      const spd = g.rushing ? GOBLIN_SPEED * 1.9 : GOBLIN_SPEED;
      g.vx += (dx / d) * spd * 0.12;
      g.vy += (dy / d) * spd * 0.12;
      // Clamp velocity
      const vs = Math.hypot(g.vx, g.vy);
      if (vs > spd) { g.vx = g.vx / vs * spd; g.vy = g.vy / vs * spd; }
      g.x += g.vx;
      g.y += g.vy;
      // Damping
      g.vx *= 0.88; g.vy *= 0.88;

      // Melee damage on player overlap
      for (const p of players) {
        if (!p.alive) continue;
        if ((g.hitCooldowns.get(p) ?? 0) > 0) continue;
        const pd = Math.hypot(p.x - g.x, p.y - g.y);
        if (pd < GOBLIN_R + (p.radius ?? p.r ?? 18)) {
          p.hp = Math.max(0, p.hp - GOBLIN_DMG);
          g.hitCooldowns.set(p, GOBLIN_DMG_CD);
          if (p.hp <= 0 && p.alive) {
            p.alive = false;
            if (typeof spawnDeathExplosion === 'function') spawnDeathExplosion(p.x, p.y, '#ff4444');
          }
        }
      }
    }
  }

  // ── Projectile hit on goblins ────────────────────────────
  resolveProjectileHitsOnGoblins(projectiles) {
    for (const g of this.goblins) {
      if (!g.alive) continue;
      for (const proj of projectiles) {
        if (!proj.alive) continue;
        const d = Math.hypot(proj.x - g.x, proj.y - g.y);
        if (d < GOBLIN_R + proj.r) {
          g.hp -= proj.damage ?? 10;
          proj.alive = false;
          spawnSparks(g.x, g.y, 6);
          if (g.hp <= 0) {
            g.alive = false;
            spawnSparks(g.x, g.y, 12);
          }
        }
      }
    }
  }

  update(players, arena) {
    if (!this.alive) return;
    super.update(players, arena);
  }

  die() {
    if (!this.alive) return;
    this.alive = false; this.hp = 0; this.state = 'dead';
    this.vx = 0; this.vy = 0;
    // Kill all goblins
    for (const g of this.goblins) g.alive = false;
    spawnDeathExplosion(this.x, this.y, '#66cc22');
    setTimeout(() => spawnDeathExplosion(this.x + (Math.random()-0.5)*80, this.y + (Math.random()-0.5)*60, '#44aa11'), 300);
    setTimeout(() => spawnDeathExplosion(this.x + (Math.random()-0.5)*100, this.y + (Math.random()-0.5)*80, '#88ee33'), 700);
    spawnBigAnnouncement('👹 WARBOSS GRAKK DEFEATED!', '#88ee44');
    setTimeout(() => showPVEResult(true), 2500);
  }

  // ── Drawing ──────────────────────────────────────────────
  draw(ctx) {
    if (!this.alive && this.state !== 'active') return;
    const flashOn = this.hitFlash > 0 && Math.floor(this.hitFlash / 2) % 2 === 0;
    const enrGlow = this.enrageFlash > 0;

    // Draw goblins below boss
    this._drawGoblins(ctx);

    // Draw shaman (floats behind)
    this._drawShamanPart(ctx, flashOn);

    // Arms, body, head
    this._drawPart(ctx, 'lArm',  flashOn, false);
    this._drawPart(ctx, 'rArm',  flashOn, false);
    this._drawPart(ctx, 'body',  flashOn, enrGlow);
    this._drawPart(ctx, 'head',  flashOn, false);

    // Enrage war-aura
    if (enrGlow) {
      const t = Date.now() * 0.012;
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, 82, 0, Math.PI * 2);
      ctx.strokeStyle = '#88cc22';
      ctx.lineWidth   = 10;
      ctx.globalAlpha = 0.3 + 0.25 * Math.sin(t);
      ctx.shadowColor = '#aaf022'; ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.restore();
    }

    // Hex orbs / projectiles
    for (const tb of this.thunderBalls) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(tb.x, tb.y, tb.r, 0, Math.PI * 2);
      ctx.fillStyle   = tb._hex ? '#44dd88' : '#aaddff';
      ctx.strokeStyle = tb._hex ? '#228844' : '#44aaff';
      ctx.lineWidth   = 1.5;
      if (tb._hex) { ctx.shadowColor = '#44ff88'; ctx.shadowBlur = 8; }
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    if (this.state === 'stunned') this._drawStunStars(ctx);
    if ((this.state === 'windup' || this.state === 'active') && this.currentMove?.drawHint) {
      this.currentMove.drawHint(ctx, this);
    }
    this._drawHUD(ctx);
  }

  _drawGoblins(ctx) {
    for (const g of this.goblins) {
      if (!g.alive) continue;
      ctx.save();
      ctx.beginPath();
      ctx.arc(g.x, g.y, GOBLIN_R, 0, Math.PI * 2);
      ctx.fillStyle   = g.rushing ? '#aaff44' : '#66aa22';
      ctx.strokeStyle = '#2a5a08';
      ctx.lineWidth   = 1.5;
      ctx.fill(); ctx.stroke();
      // Eyes
      ctx.beginPath();
      ctx.arc(g.x + 3, g.y - 3, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffaa00'; ctx.fill();
      ctx.beginPath();
      ctx.arc(g.x - 3, g.y - 3, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffaa00'; ctx.fill();
      // Mini HP bar
      const hpPct = g.hp / g.maxHp;
      const bw    = GOBLIN_R * 2, bh = 3;
      const bx    = g.x - GOBLIN_R, by = g.y + GOBLIN_R + 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = hpPct > 0.5 ? '#44cc22' : '#cc4422';
      ctx.fillRect(bx, by, bw * hpPct, bh);
      ctx.restore();
    }
  }

  _drawShamanPart(ctx, flashOn) {
    const pos = this.getPartPos('shaman');
    if (!pos) return;
    const ps  = this.parts['shaman'];
    const pct = ps.broken ? 0 : ps.breakHp / ps.maxBreakHp;
    const t   = Date.now() * 0.006;
    ctx.save();
    if (ps.broken) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.r * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(40,20,0,0.55)'; ctx.fill();
      ctx.font = 'bold 6px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#884400';
      ctx.fillText('✗', pos.x, pos.y);
      ctx.restore();
      return;
    }
    // Shaman float bob
    const bob = Math.sin(t * 0.8) * 5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y + bob, pos.r, 0, Math.PI * 2);
    ctx.fillStyle   = flashOn ? '#ffffff' : (pct > 0.5 ? '#cc8822' : pct > 0.25 ? '#ffaa44' : '#ff6622');
    ctx.strokeStyle = '#885500'; ctx.lineWidth = 2;
    ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 12;
    ctx.fill(); ctx.stroke();
    // Rune glow ring
    ctx.beginPath();
    ctx.arc(pos.x, pos.y + bob, pos.r + 6 + 3 * Math.sin(t), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,180,0,0.35)';
    ctx.lineWidth   = 2; ctx.stroke();
    // Break arc
    ctx.beginPath();
    ctx.arc(pos.x, pos.y + bob, pos.r + 4, -Math.PI/2, -Math.PI/2 + Math.PI*2*pct);
    ctx.strokeStyle = pct > 0.5 ? 'rgba(255,180,60,0.8)' : 'rgba(255,80,40,0.85)';
    ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }

  _drawHUD(ctx) {
    const barW = 390, barH = 16;
    const bx   = (CW - barW) / 2, by = 14;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(bx - 6, by - 6, barW + 12, barH + 52);

    const pct = this.hp / this.maxHp;
    ctx.fillStyle = pct > 0.5 ? '#448822' : pct > 0.25 ? '#88aa22' : '#cc3322';
    ctx.fillRect(bx, by, barW * pct, barH);
    ctx.strokeStyle = '#226611'; ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, barW, barH);

    const aliveGoblins  = this.goblins.filter(g => g.alive).length;
    const shamanStatus  = this.parts.shaman?.broken ? ' [SHAMAN DEAD]' : '';
    ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = '#aaddaa';
    ctx.fillText(`👹 WARBOSS GRAKK${shamanStatus}   Goblins: ${aliveGoblins}/${GOBLIN_COUNT}   HP: ${Math.ceil(this.hp)} / ${this.maxHp}`, CW/2, by + barH + 8);

    // Part bars
    const partInfo = [
      { key: 'shaman', icon: '🧙', label: 'Shaman' },
      { key: 'lArm',   icon: '💪', label: 'L.Arm'  },
      { key: 'rArm',   icon: '💪', label: 'R.Arm'  },
    ];
    const pBarW   = 102, pBarH = 6;
    const pStartX = bx + 10;
    const pStartY = by + barH + 22;

    partInfo.forEach((info, i) => {
      const ps   = this.parts[info.key];
      const rpct = ps.broken ? 0 : ps.breakHp / ps.maxBreakHp;
      const px   = pStartX + i * (pBarW + 14);

      ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
      ctx.fillStyle = ps.broken ? '#444' : '#aaddaa';
      ctx.fillText(`${info.icon} ${info.label}`, px, pStartY);

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(px, pStartY + 11, pBarW, pBarH);
      ctx.fillStyle = ps.broken ? '#222'
        : rpct > 0.5  ? '#44aa22'
        : rpct > 0.25 ? '#aaaa22'
        : '#cc3322';
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
