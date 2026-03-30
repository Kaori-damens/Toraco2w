// ============================================================
// BOSS — Thunderfang (Zinogre-inspired)
// ============================================================

const BOSS_PART_DEFS = {
  body:  { ox:   0, oy:   0, r: 62, label: 'Body',        breakable: false, color: '#b89038', strokeColor: '#7a5c1a' },
  head:  { ox:  98, oy:   0, r: 40, label: 'Head',        breakable: true,  color: '#d4a848', strokeColor: '#8a6818' },
  lClaw: { ox:  56, oy: -74, r: 28, label: 'Left Claw',   breakable: true,  color: '#9a6220', strokeColor: '#6a4010' },
  rClaw: { ox:  56, oy:  74, r: 28, label: 'Right Claw',  breakable: true,  color: '#9a6220', strokeColor: '#6a4010' },
  tail1: { ox: -92, oy:   0, r: 24, label: 'Tail',        breakable: true,  color: '#886018', strokeColor: '#563c0c' },
  tail2: { ox:-148, oy:   0, r: 18, label:  null,         breakable: false, color: '#805618', strokeColor: '#4e3408' },
  tail3: { ox:-194, oy:   0, r: 13, label:  null,         breakable: false, color: '#784c12', strokeColor: '#462e06' },
};

class Boss {
  constructor(config = {}) {
    this.x = config.x ?? CW / 2;
    this.y = config.y ?? CH / 2 - 60;
    this.angle = Math.PI; // facing left at start (toward players)

    // HP (scales with player count for balance)
    const pc = config.playerCount ?? 1;
    this.maxHp = 2000 + pc * 600;
    this.hp    = this.maxHp;

    // Parts — break tracking
    this.partDefs = config.partDefs ?? BOSS_PART_DEFS;
    const breakThresh = config.breakThresh ?? { body: 99999, head: 700, lClaw: 500, rClaw: 500, tail1: 420, tail2: 99999, tail3: 99999 };
    this.parts = {};
    for (const key of Object.keys(this.partDefs)) {
      const t = breakThresh[key] ?? 99999;
      this.parts[key] = { broken: false, breakHp: t, maxBreakHp: t };
    }

    // AI state machine
    this.state       = 'idle';   // idle | approaching | windup | active | recovering | stunned | dead
    this.idleTimer   = 90;
    this.currentMove = null;
    this.pendingMove = null;
    this.moveTimer   = 0;
    this.stunTimer   = 0;
    this.hitCooldowns = new Map(); // player → frames before next hit

    // Movement — physics-based
    this.baseSpeed    = 1.7;
    this.speed        = this.baseSpeed;
    this.acceleration = 0.13;   // px/frame² toward target
    this.maxSpeed     = this.baseSpeed * 2.5; // velocity cap during normal movement
    this.vx = 0; this.vy = 0;

    // Charge direction
    this.chargeDirX = 0; this.chargeDirY = 0;
    this.chargeSpeed = 0;

    // Tail laser
    this.laserAngle  = 0;
    this._laserStart = null;
    this._laserEnd   = null;

    // Thunder balls (owned by boss)
    this.thunderBalls = [];

    // Enrage
    this.enraged     = false;
    this.enrageFlash = 0;

    // Phase transitions (at 50% and 15% HP)
    this._phase2Done    = false;
    this._finalDone     = false;

    // Display name for announcements — subclasses set this in their constructor
    this.displayName = config.displayName ?? 'THUNDERFANG';

    // Visual
    this.hitFlash = 0;
    this.alive    = true;
  }

  // ── Geometry ──────────────────────────────────────────────

  getPartPos(key) {
    const def = this.partDefs[key];
    if (!def) return null;
    const cos = Math.cos(this.angle), sin = Math.sin(this.angle);
    return {
      x: this.x + def.ox * cos - def.oy * sin,
      y: this.y + def.ox * sin + def.oy * cos,
      r: def.r,
    };
  }

  // Returns all hittable part keys — subclasses override for dynamic parts
  getAllHitParts() {
    return Object.keys(this.partDefs);
  }

  // Returns the partKey of the closest overlapping part, or null
  checkHit(px, py, pr = 4) {
    let best = null, bestDepth = 0;
    for (const key of this.getAllHitParts()) {
      const p = this.getPartPos(key);
      const depth = p.r + pr - Math.hypot(px - p.x, py - p.y);
      if (depth > 0 && depth > bestDepth) { bestDepth = depth; best = key; }
    }
    return best;
  }

  // ── Damage ────────────────────────────────────────────────

  takeDamage(amount, partKey, { crit = false } = {}) {
    if (!this.alive) return { finalAmount: 0, crit: false };
    const partState = this.parts[partKey];
    const def       = this.partDefs[partKey];
    let final = amount;

    // Broken part bonus (+20% dmg + forced crit)
    if (partState?.broken) { final *= 1.2; crit = true; }
    // Stunned = guaranteed crit
    if (this.state === 'stunned') crit = true;
    if (crit) final *= 1.5;

    this.hp = Math.max(0, this.hp - final);
    this.hitFlash = 6;

    // Break tracking (only for breakable parts that aren't broken yet)
    if (def?.breakable && partState && !partState.broken) {
      partState.breakHp -= final;
      if (partState.breakHp <= 0) this.breakPart(partKey);
    }

    if (this.hp <= 0) this.die();
    return { finalAmount: final, crit };
  }

  breakPart(key) {
    const ps  = this.parts[key];
    if (ps.broken) return;
    ps.broken = true;
    // Breaking tail1 visually breaks all tail segments
    if (key === 'tail1') {
      this.parts.tail2.broken = true;
      this.parts.tail3.broken = true;
    }
    const def = this.partDefs[key];
    if (def.label) spawnBigAnnouncement(`💥 ${def.label.toUpperCase()} BROKEN!`, '#ffaa00');
    const pp = this.getPartPos(key);
    spawnSparks(pp.x, pp.y, 20);
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.hp    = 0;
    this.state = 'dead';
    this.vx = 0; this.vy = 0;
    spawnDeathExplosion(this.x, this.y, '#ffcc00');
    setTimeout(() => spawnDeathExplosion(this.x + (Math.random()-0.5)*80, this.y + (Math.random()-0.5)*60, '#ff6600'), 300);
    setTimeout(() => spawnDeathExplosion(this.x + (Math.random()-0.5)*100, this.y + (Math.random()-0.5)*80, '#ffaa00'), 700);
    spawnBigAnnouncement('⚡ THUNDERFANG DEFEATED!', '#ffcc00');
    setTimeout(() => showPVEResult(true), 2500);
  }

  // ── Update ────────────────────────────────────────────────

  update(players, arena) {
    if (!this.alive) return;

    // Tick hit cooldowns
    for (const [p, v] of this.hitCooldowns) {
      if (v <= 1) this.hitCooldowns.delete(p);
      else this.hitCooldowns.set(p, v - 1);
    }

    // ── Phase transitions ─────────────────────────────────────
    // Phase 2: 50% HP — speed boost + announcement
    if (!this._phase2Done && this.hp < this.maxHp * 0.50) {
      this._phase2Done  = true;
      this.speed        = this.baseSpeed * 1.20;
      this.maxSpeed     = this.speed * 2.5;
      this.enrageFlash  = 120;
      spawnBigAnnouncement(`⚡ ${this.displayName} — PHASE 2!`, '#ff8800');
    }
    // Final Phase: 15% HP — major boost
    if (!this._finalDone && this.hp < this.maxHp * 0.15) {
      this._finalDone   = true;
      this.speed        = this.baseSpeed * 1.55;
      this.maxSpeed     = this.speed * 2.8;
      this.acceleration = 0.20;
      this.enrageFlash  = 240;
      spawnBigAnnouncement(`💀 ${this.displayName} — FINAL PHASE!`, '#ff0000');
    }
    // Enrage at 30% HP (sets enraged flag for move weight boosts)
    if (!this.enraged && this.hp < this.maxHp * 0.3) {
      this.enraged      = true;
      this.enrageFlash  = Math.max(this.enrageFlash, 180);
    }
    if (this.enrageFlash > 0) this.enrageFlash--;
    if (this.hitFlash    > 0) this.hitFlash--;

    this._updateThunderBalls(players);

    const target = this._findTarget(players);

    switch (this.state) {
      case 'idle':
        this.idleTimer--;
        if (target) this._rotateToward(target, 0.04);
        if (this.idleTimer <= 0) this._selectMove(target, players);
        break;

      case 'approaching':
        if (!target) { this.state = 'idle'; this.idleTimer = 30; break; }
        this._rotateToward(target, 0.06);
        this._accelerateToward(target.x, target.y);
        this.moveTimer--;
        if (Math.hypot(this.x - target.x, this.y - target.y) < (this.pendingMove?.maxRange ?? 250) || this.moveTimer <= 0) {
          this._startMove(this.pendingMove, players);
        }
        break;

      case 'windup':
        this.moveTimer--;
        if (target && this.currentMove?.trackDuringWindup) this._rotateToward(target, 0.03);
        if (this.moveTimer <= 0) {
          this.state     = 'active';
          this.moveTimer = this.currentMove.activeFrames;
          this.currentMove.onActivate?.(this, players, arena);
        }
        break;

      case 'active':
        this.moveTimer--;
        this.currentMove.onActive?.(this, players, arena);
        if (this.moveTimer <= 0) {
          this.currentMove.onDeactivate?.(this, players, arena);
          this.state     = 'recovering';
          this.moveTimer = this.currentMove.recoveryFrames;
        }
        break;

      case 'recovering':
        this.moveTimer--;
        if (this.moveTimer <= 0) {
          this.state     = 'idle';
          this.idleTimer = this.enraged ? 20 : 50;
        }
        break;

      case 'stunned':
        this.stunTimer--;
        if (this.stunTimer <= 0) { this.state = 'idle'; this.idleTimer = 30; }
        break;
    }

    // ── Physics ───────────────────────────────────────────────
    // Charge moves set vx/vy themselves every frame — skip damping so they aren't cancelled
    const isChargingActive = this.state === 'active' &&
      (this.currentMove?.id === 'charge' || this.currentMove?.id === 'wall_charge');
    if (!isChargingActive) {
      this.vx *= 0.88;
      this.vy *= 0.88;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Wall bounce (elastic-ish, with damping on impact)
    const margin = 115;
    if (this.x < margin)      { this.x = margin;      this.vx =  Math.abs(this.vx) * 0.65; }
    if (this.x > CW - margin) { this.x = CW - margin; this.vx = -Math.abs(this.vx) * 0.65; }
    if (this.y < margin)      { this.y = margin;       this.vy =  Math.abs(this.vy) * 0.65; }
    if (this.y > CH - margin) { this.y = CH - margin;  this.vy = -Math.abs(this.vy) * 0.65; }
  }

  _findTarget(players) {
    let best = null, bestD = Infinity;
    for (const p of players) {
      if (!p.alive) continue;
      const d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  _rotateToward(target, speed = 0.05) {
    const desired = Math.atan2(target.y - this.y, target.x - this.x);
    let diff = desired - this.angle;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.angle += Math.sign(diff) * Math.min(Math.abs(diff), speed);
  }

  _moveToward(tx, ty, spd) {
    const dx = tx - this.x, dy = ty - this.y;
    const d  = Math.hypot(dx, dy);
    if (d < 1) return;
    this.x += (dx / d) * spd;
    this.y += (dy / d) * spd;
  }

  // Physics-based movement: accelerate toward (tx,ty), capped at maxSpeed
  _accelerateToward(tx, ty) {
    const dx = tx - this.x, dy = ty - this.y;
    const d  = Math.hypot(dx, dy);
    if (d < 1) return;
    this.vx += (dx / d) * this.acceleration;
    this.vy += (dy / d) * this.acceleration;
    // Cap velocity at maxSpeed
    const spd = Math.hypot(this.vx, this.vy);
    if (spd > this.maxSpeed) {
      this.vx = (this.vx / spd) * this.maxSpeed;
      this.vy = (this.vy / spd) * this.maxSpeed;
    }
  }

  _selectMove(target, players) {
    const dist      = target ? Math.hypot(this.x - target.x, this.y - target.y) : 999;
    const available = (this.movePool ?? BOSS_MOVES).filter(m => this._isMoveAvailable(m));
    if (!available.length) { this.state = 'idle'; this.idleTimer = 60; return; }

    // Weighted random
    const weights = available.map(m => {
      let w = m.weight ?? 1;
      if (this.enraged) w *= (m.enrageWeight ?? 1);
      if (dist > 300 && m.ranged)  w *= 2.5;
      if (dist < 180 && !m.ranged) w *= 2.0;
      return w;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r    = Math.random() * total;
    let move = available[available.length - 1];
    for (let i = 0; i < available.length; i++) {
      r -= weights[i];
      if (r <= 0) { move = available[i]; break; }
    }

    this.pendingMove = move;
    if (dist > (move.maxRange ?? 9999) && !move.ranged) {
      this.state     = 'approaching';
      this.moveTimer = 200; // max approach time
    } else {
      this._startMove(move, players);
    }
  }

  _startMove(move, players) {
    this.currentMove = move;
    this.state       = 'windup';
    this.moveTimer   = move.windupFrames;
    this.hitCooldowns.clear();
    move.onStart?.(this, players);
  }

  _isMoveAvailable(move) {
    if (!move.requireParts) return true;
    for (const key of move.requireParts) {
      if (this.parts[key]?.broken) return false;
    }
    return true;
  }

  // ── Damage helpers ────────────────────────────────────────

  damageInCone(players, apexX, apexY, angle, halfAngle, length, damage, hitCooldown = 30) {
    for (const p of players) {
      if (!p.alive || (this.hitCooldowns.get(p) ?? 0) > 0) continue;
      const dx = p.x - apexX, dy = p.y - apexY;
      if (Math.hypot(dx, dy) > length + p.radius) continue;
      let diff = Math.atan2(dy, dx) - angle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) <= halfAngle) this._hitPlayer(p, damage, hitCooldown);
    }
  }

  damageInCircle(players, cx, cy, r, damage, hitCooldown = 30) {
    for (const p of players) {
      if (!p.alive || (this.hitCooldowns.get(p) ?? 0) > 0) continue;
      if (Math.hypot(p.x - cx, p.y - cy) < r + p.radius) this._hitPlayer(p, damage, hitCooldown);
    }
  }

  damageInRect(players, cx, cy, hw, hh, angle, damage, hitCooldown = 30) {
    const cos = Math.cos(-angle), sin = Math.sin(-angle);
    for (const p of players) {
      if (!p.alive || (this.hitCooldowns.get(p) ?? 0) > 0) continue;
      const dx = p.x - cx, dy = p.y - cy;
      const lx = dx*cos - dy*sin, ly = dx*sin + dy*cos;
      if (Math.abs(lx) < hw + p.radius && Math.abs(ly) < hh + p.radius)
        this._hitPlayer(p, damage, hitCooldown);
    }
  }

  damageOnLine(players, x1, y1, x2, y2, width, damage, hitCooldown = 10) {
    for (const p of players) {
      if (!p.alive || (this.hitCooldowns.get(p) ?? 0) > 0) continue;
      if (_bossDistToSeg(p.x, p.y, x1, y1, x2, y2) < width + p.radius)
        this._hitPlayer(p, damage, hitCooldown);
    }
  }

  _hitPlayer(player, damage, hitCooldown) {
    player.hp = Math.max(0, player.hp - damage);
    this.hitCooldowns.set(player, hitCooldown);
    spawnDamageNumber(player.x, player.y - player.radius - 10, Math.round(damage), '#ff5533');
    spawnBlood(player.x, player.y, 4, Math.atan2(player.y - this.y, player.x - this.x));
    if (player.hp <= 0) { player.hp = 0; player.alive = false; }
  }

  _updateThunderBalls(players) {
    for (let i = this.thunderBalls.length - 1; i >= 0; i--) {
      const tb = this.thunderBalls[i];
      tb.x += tb.vx; tb.y += tb.vy;
      tb.life--;

      // Wall bounce
      if (tb.x < 60 || tb.x > CW - 60) tb.vx = -tb.vx;
      if (tb.y < 60 || tb.y > CH - 60) tb.vy = -tb.vy;

      // Hit player
      for (const p of players) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - tb.x, p.y - tb.y) < p.radius + tb.r) {
          this._hitPlayer(p, tb.damage, 20);
          spawnSparks(tb.x, tb.y, 8);
          tb.life = 0; break;
        }
      }

      if (tb.life <= 0) this.thunderBalls.splice(i, 1);
    }
  }

  // ── Drawing ───────────────────────────────────────────────

  draw(ctx) {
    if (!this.alive && this.state !== 'active') return;

    const flashOn   = this.hitFlash > 0 && Math.floor(this.hitFlash / 2) % 2 === 0;
    const enrageGlow = this.enrageFlash > 0;

    // Draw order: tail back → claws → body → head front
    for (const key of ['tail3', 'tail2', 'tail1', 'lClaw', 'rClaw', 'body', 'head']) {
      this._drawPart(ctx, key, flashOn, enrageGlow);
    }

    // Active move telegraph / hitbox visual
    if ((this.state === 'windup' || this.state === 'active') && this.currentMove?.drawHint) {
      this.currentMove.drawHint(ctx, this);
    }

    // Thunder balls
    for (const tb of this.thunderBalls) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(tb.x, tb.y, tb.r, 0, Math.PI * 2);
      ctx.fillStyle = '#aaddff';
      ctx.shadowColor = '#44aaff'; ctx.shadowBlur = 16;
      ctx.fill();
      // Inner white core
      ctx.beginPath();
      ctx.arc(tb.x, tb.y, tb.r * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }

    // Stun stars
    if (this.state === 'stunned') this._drawStunStars(ctx);

    // Boss HP bar (drawn on canvas, top-center)
    this._drawHUD(ctx);
  }

  _drawPart(ctx, key, flashOn, enrageGlow) {
    const def = this.partDefs[key];
    const ps  = this.parts[key];
    const p   = this.getPartPos(key);

    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);

    let fill = ps.broken ? '#3a3a3a' : def.color;
    if (flashOn) fill = '#ffffff';
    ctx.fillStyle = fill;

    if (enrageGlow && !ps.broken) { ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 20; }
    ctx.fill();

    ctx.strokeStyle = ps.broken ? '#222' : def.strokeColor;
    ctx.lineWidth   = 2.5;
    ctx.stroke();

    // Break-HP arc (yellow ring around part, shows break progress)
    if (def.breakable && def.label) {
      const pct = ps.broken ? 0 : (ps.breakHp / ps.maxBreakHp);
      if (!ps.broken) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        ctx.strokeStyle = pct > 0.5 ? 'rgba(100,255,80,0.75)'
                        : pct > 0.25 ? 'rgba(255,220,50,0.75)'
                        : 'rgba(255,80,50,0.85)';
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }

      // Small HP bar below the part circle
      const barW = p.r * 2.4;
      const barH = 5;
      const bx   = p.x - barW / 2;
      const by   = p.y + p.r + 7;

      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);

      // HP fill
      if (ps.broken) {
        ctx.fillStyle = '#2a2a2a';
      } else {
        ctx.fillStyle = pct > 0.5 ? '#44cc44'
                      : pct > 0.25 ? '#cccc22'
                      : '#cc3333';
      }
      ctx.fillRect(bx, by, barW * (ps.broken ? 0 : pct), barH);

      // Border
      ctx.strokeStyle = '#111'; ctx.lineWidth = 0.5;
      ctx.strokeRect(bx, by, barW, barH);

      // Part label
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = ps.broken ? '#555' : '#ddd';
      ctx.fillText(ps.broken ? `${def.label} ✗` : def.label, p.x, by + barH + 2);
    }

    ctx.restore();
  }

  _drawStunStars(ctx) {
    const t = Date.now() / 360;
    for (let i = 0; i < 3; i++) {
      const a  = t + (i / 3) * Math.PI * 2;
      const sx = this.x + Math.cos(a) * 80;
      const sy = this.y - 80 + Math.sin(a * 1.8) * 10;
      ctx.save();
      ctx.font = '22px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⭐', sx, sy);
      ctx.restore();
    }
  }

  _drawHUD(ctx) {
    const barW = 390, barH = 16;
    const bx   = (CW - barW) / 2;
    const by   = 14;

    ctx.save();

    // Dark background panel (tall enough for boss bar + part bars)
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bx - 6, by - 6, barW + 12, barH + 50);

    // HP fill
    const pct  = this.hp / this.maxHp;
    ctx.fillStyle = pct > 0.5 ? '#cc7700' : pct > 0.25 ? '#cc3300' : '#ff1100';
    ctx.fillRect(bx, by, barW * pct, barH);

    // HP border
    ctx.strokeStyle = '#aa7722'; ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, barW, barH);

    // Boss name + HP text (between main bar and part bars)
    ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffddaa';
    ctx.fillText(`⚡ THUNDERFANG   HP: ${Math.ceil(this.hp)} / ${this.maxHp}`, CW / 2, by + barH + 8);

    // Part HP bars (4 breakable parts, displayed in HUD)
    const partInfo = [
      { key: 'head',  icon: '💀', label: 'Head'    },
      { key: 'lClaw', icon: '✊', label: 'L.Claw'   },
      { key: 'rClaw', icon: '✊', label: 'R.Claw'   },
      { key: 'tail1', icon: '⚡', label: 'Tail'    },
    ];
    const pBarW   = 78, pBarH = 6;
    const pStartX = bx + 10;
    const pStartY = by + barH + 10;

    partInfo.forEach((info, i) => {
      const ps  = this.parts[info.key];
      const pct = ps.broken ? 0 : (ps.breakHp / ps.maxBreakHp);
      const px  = pStartX + i * (pBarW + 8);

      // Part label + icon
      ctx.font      = 'bold 9px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = ps.broken ? '#444' : '#ccaa55';
      ctx.fillText(`${info.icon} ${info.label}`, px, pStartY);

      // Background bar
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(px, pStartY + 11, pBarW, pBarH);

      // HP fill
      ctx.fillStyle = ps.broken ? '#222'
        : pct > 0.5  ? '#44aa44'
        : pct > 0.25 ? '#aaaa22'
        : '#cc3333';
      ctx.fillRect(px, pStartY + 11, pBarW * pct, pBarH);

      // Bar border
      ctx.strokeStyle = '#333'; ctx.lineWidth = 0.5;
      ctx.strokeRect(px, pStartY + 11, pBarW, pBarH);

      // BROKEN label
      if (ps.broken) {
        ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center';
        ctx.fillStyle = '#cc4444';
        ctx.fillText('BROKEN', px + pBarW / 2, pStartY + 19);
      }
    });

    ctx.restore();
  }
}

// ── Utility ───────────────────────────────────────────────────

function _bossDistToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx*dx + dy*dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px-x1)*dx + (py-y1)*dy) / lenSq));
  return Math.hypot(px - (x1 + t*dx), py - (y1 + t*dy));
}
