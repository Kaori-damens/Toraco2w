// ============================================================
// BALL CLASS
// ============================================================
class Ball {
  constructor(x, y, color, weaponId, side, charStats = null, teamId = -1) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.radius = BALL_R;
    this.color = color;
    this.side = side;  // 'left' | 'right'
    this.teamId = teamId; // -1 = FFA, 0 or 1 = team match

    // Chargen stat mapping
    const cs = charStats || {};
    const dur = cs.durability ?? null;
    const spd = cs.speed      ?? null;
    const iq  = cs.iq         ?? null;
    const biq = cs.battleiq   ?? null;
    const ma  = cs.ma         ?? null;
    this.charSTR     = cs.strength ?? null;  // used in getDamage()
    this.charSPD     = spd;                  // used in initGame launchSpeed
    this.charMA      = ma;                   // used in _initWeapon spinBonus + Flow State/Deflection
    this.charIQ      = iq  !== null ? iq  : 5;  // used in crit, Exploit, Mind Break
    this.charBIQ     = biq !== null ? biq : 5;  // used in evade, Read & React
    this.charRace    = cs.race    ?? null;   // used in drawRaceDecoration
    this.charSubrace = cs.subrace ?? null;   // used in drawRaceDecoration

    this.maxHp = dur !== null ? (50 + dur * 10) : BASE_HP;
    this.hp    = this.maxHp;
    this.maxSpd     = spd !== null ? (10 + spd * 1.5) : 18;
    this.baseMaxSpd = this.maxSpd; // Speed Floor reference
    this.alive = true;
    this.mass = this.radius * this.radius * 0.05;

    this.immunityFrames = 0;
    this.hitFlash = 0;
    this.squashX = 1; this.squashY = 1;
    this.scale = 1;
    this.bounceCooldown = 0;   // frames after a collision where AI backs off
    this.wallBoostFactor = 1.0; // speed multiplier from wall boost (decays back to 1.0)
    this.evadeChance   = biq !== null ? biq * 0.03 : 0.10;  // BIQ×0.03, default 10%
    this.deflectChance = ma  !== null ? ma  * 0.02 : 0;     // MA×0.02, Deflection skill
    this.mindBreakDebuff = 0;  // % outgoing damage reduction (set by opponent's Mind Break)
    this.evadeFrames = 0;

    this.critChance  = iq  !== null ? iq  * 0.05 : 0.20;  // IQ×0.05,  default 20%
    this.critMult    = 1.5;

    this.weapon = this._initWeapon(weaponId);
    this.weaponDef = WEAPON_MAP[weaponId];

    this.stats = { hits: 0, parries: 0, damageDone: 0 };
    this.speechText = null;
    this.speechFrames = 0;

    // Skill system — populated by setup.js after construction
    this.skills          = [];
    this.skillState      = {};
    this.skillLearningMult = 1;   // from Learning (cross-round)
    this.adaptResist     = null;  // weapon id to resist (from Adaptation)
    this.adrenalineUntil = -1;    // matchTime frame when Adrenaline expires
    this._killedBy       = null;  // attacker ball reference (for Adaptation)
  }

  _initWeapon(id) {
    const def = WEAPON_MAP[id];
    const spd = this.charSPD ?? 5;
    // Per-ball attackCooldown based on SPD
    let ac = def.attackCooldown;
    if      (def.id === 'fists')   ac = Math.max(2, 13 - spd);
    else if (def.id === 'sword')   ac = Math.max(2, 28 - spd);
    else if (def.id === 'dagger')  ac = Math.max(2, 18 - spd);
    else if (def.id === 'spear')   ac = Math.max(2, 38 - spd);
    else if (def.id === 'scythe')  ac = Math.max(2, 34 - spd);
    else if (def.id === 'hammer')  ac = Math.max(2, 48 - spd);
    // Ranged: fireInterval overridden per-ball via weapon.fireInterval
    let fi = def.fireInterval || null;
    if (def.id === 'bow')      fi = Math.max(5, 140 - spd * 2);
    else if (def.id === 'shuriken') fi = Math.max(5, 250 - spd * 2);
    return {
      id,
      angle: 0,
      hits: 0,
      cooldown: 0,
      attackCooldown: ac,
      fireInterval: fi,
      bonusDamage: 0,
      bonusLength: 0,
      bonusKnockback: 0,
      spinBonus: (this.charMA !== null ? this.charMA * 0.003 : 0),  // MA×0.003 base spin
      spinDir: 1,           // 1 = forward, -1 = reversed (spear parry effect)
      spinDebuffTimer: 0,   // frames remaining for 10% spin reduction (spear parry)
      spinSlowTimer: 0,     // frames remaining for 30% spin reduction (hammer slow)
      spinBoostTimer: 0,    // frames remaining for +100% spin boost (Parry Master)
      arrowCount: 1,
      shurikenCount: 1,
      fireTimer: 0,
      burstQueue: 0,
      burstTimer: 0,
      parried: false,
      parryCooldown: 0
    };
  }

  getSpeed() {
    const def    = this.weaponDef;
    const spearDebuff  = this.weapon.spinDebuffTimer > 0 ? 0.9 : 1.0;  // -10% from spear parry
    const hammerDebuff = this.weapon.spinSlowTimer   > 0 ? 0.7 : 1.0;  // -30% from hammer slow
    const parryBoost   = this.weapon.spinBoostTimer  > 0 ? 2.0 : 1.0;  // +100% from Parry Master
    return (def.baseSpeed + this.weapon.spinBonus) * this.scale * this.weapon.spinDir * spearDebuff * hammerDebuff * parryBoost;
  }

  getDamage() {
    const def = this.weaponDef;
    const str = this.charSTR ?? 1;
    const rageMult = (state.matchTime >= 80 * 60) ? 1.5 : 1.0;
    let dmg = (def.baseDamage * str + this.weapon.bonusDamage) * rageMult;
    // Skills that modify outgoing damage
    if (this.skills.includes('berserker') && this.hp / this.maxHp < 0.30) dmg *= 1.5;
    if (this.skillState?.warCryReady)  dmg *= 2;
    if (this.skillState?.counterActive) dmg *= 2;
    if (this.skillLearningMult > 1)    dmg *= this.skillLearningMult;
    // Mind Break debuff: opponent reduced this ball's outgoing damage at round start
    if (this.mindBreakDebuff > 0)      dmg *= (1 - this.mindBreakDebuff);
    return dmg;
  }

  getKnockback() {
    const def = this.weaponDef;
    const rageMult = (state.matchTime >= 80 * 60) ? 1.5 : 1.0;
    return (def.baseKnockback + this.weapon.bonusKnockback) * rageMult;
  }

  getWeaponLength() {
    const def = this.weaponDef;
    return this.radius + def.baseLength + this.weapon.bonusLength;
  }

  update(arena, opponent, projectiles, gravity) {
    if (!this.alive) return;

    // No AI steering — pure physics only

    // Physics — friction: ~99% after 1s, ~91% after 10s, ~84% after 20s
    if (gravity) this.vy += 0.15;
    this.vx *= 0.99985;
    this.vy *= 0.99985;

    // Limit max speed (per-ball, influenced by chargen SPD stat)
    let effectiveMaxSpd = this.maxSpd;
    if (this.skills.includes('adrenaline') && state.matchTime < this.adrenalineUntil) {
      effectiveMaxSpd *= 1.5;
    }
    // Flow State: +MA×1% speed cap per consecutive hit stack
    if (this.skills.includes('flow_state') && this.skillState?.flowStateStacks > 0) {
      effectiveMaxSpd *= (1 + this.skillState.flowStateStacks * (this.charMA || 0) * 0.01);
    }
    const spd = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
    if (spd > effectiveMaxSpd) { this.vx = this.vx/spd*effectiveMaxSpd; this.vy = this.vy/spd*effectiveMaxSpd; }

    const preX = this.x, preY = this.y;
    this.x += this.vx;
    this.y += this.vy;

    // Arena walls — detect bounce for sparks + speed boost
    clampToBall(this, arena);
    const wallHitX = Math.abs(this.x - preX - this.vx) > 1;
    const wallHitY = Math.abs(this.y - preY - this.vy) > 1;
    if ((wallHitX || wallHitY) && spd > 0.5) {
      spawnSparks(this.x, this.y, 6);
      this.bounceCooldown = 12;
      // +20% speed boost, refresh mỗi lần chạm tường
      this.vx *= 1.1;
      this.vy *= 1.1;
      this.wallBoostFactor = 1.1;
    }
    if (this.bounceCooldown > 0) this.bounceCooldown--;

    // Decay wall boost về 1.0 trong 3 giây (180 frames)
    // 0.9747^180 ≈ 0.01 → boost gần như tan hết sau 3s
    if (this.wallBoostFactor > 1.0005) {
      const prev = this.wallBoostFactor;
      this.wallBoostFactor = 1.0 + (prev - 1.0) * 0.9747;
      const ratio = this.wallBoostFactor / prev;  // hệ số giảm tốc frame này
      this.vx *= ratio;
      this.vy *= ratio;
    } else {
      this.wallBoostFactor = 1.0;
    }

    // Weapon rotation
    this.weapon.angle += this.getSpeed();
    if (this.weapon.spinDebuffTimer > 0) this.weapon.spinDebuffTimer--;
    if (this.weapon.spinSlowTimer   > 0) this.weapon.spinSlowTimer--;
    if (this.weapon.spinBoostTimer  > 0) this.weapon.spinBoostTimer--;
    if (this.weapon.cooldown > 0) this.weapon.cooldown--;
    if (this.weapon.parryCooldown > 0) this.weapon.parryCooldown--;
    if (this.immunityFrames > 0) this.immunityFrames--;
    if (this.hitFlash > 0) this.hitFlash--;
    if (this.evadeFrames > 0) this.evadeFrames--;

    // Squash recovery
    this.squashX += (1 - this.squashX) * 0.15;
    this.squashY += (1 - this.squashY) * 0.15;

    // Projectile firing — burst system
    const def = this.weaponDef;
    if (def.aiType === 'ranged') {
      const BURST_DELAY = 4;
      if (this.weapon.burstQueue > 0) {
        // Mid-burst: fire one shot every BURST_DELAY frames
        this.weapon.burstTimer--;
        if (this.weapon.burstTimer <= 0) {
          this.weapon.burstQueue--;
          this.weapon.burstTimer = BURST_DELAY;
          this._fireSingle(projectiles);
          // Last shot fired → reset cooldown timer NOW
          if (this.weapon.burstQueue === 0) {
            this.weapon.fireTimer = 0;
          }
        }
      } else {
        // Between bursts: count cooldown, then queue next burst
        if (opponent && opponent.alive) {
          this.weapon.fireTimer++;
          const interval = this.weapon.fireInterval ?? def.fireInterval ?? 120;
          if (this.weapon.fireTimer >= interval) {
            const count = def.id === 'bow'
              ? (this.weapon.arrowCount || 1)
              : (this.weapon.shurikenCount || 1);
            this.weapon.burstQueue = count;
            this.weapon.burstTimer = 0; // fire first shot immediately
          }
        }
      }
    }

    // Speech
    if (this.speechFrames > 0) this.speechFrames--;
    else this.speechText = null;
  }

  // AI removed — movement is purely physics-driven

  // Fire a single projectile in the direction the weapon is currently pointing
  _fireSingle(projectiles) {
    const def = this.weaponDef;
    const a = this.weapon.angle; // current weapon spin angle — changes each frame naturally
    sfxShoot();
    if (def.id === 'bow') {
      const spd = def.arrowSpeed + (this.weapon.arrowSpeedBonus || 0);
      projectiles.push(new Projectile(
        this.x + Math.cos(a) * this.radius,
        this.y + Math.sin(a) * this.radius,
        Math.cos(a) * spd, Math.sin(a) * spd,
        this, 'arrow', (this.charSTR ?? 1)
      ));
    } else if (def.id === 'shuriken') {
      const spd = def.shurikenSpeed;
      projectiles.push(new Projectile(
        this.x + Math.cos(a) * this.radius,
        this.y + Math.sin(a) * this.radius,
        Math.cos(a) * spd, Math.sin(a) * spd,
        this, 'shuriken', (this.charSTR ?? 1)
      ));
    }
  }

  takeDamage(dmg, fromX, fromY, isCrit = false, attacker = null, isReactCounter = false) {
    if (this.immunityFrames > 0) return false;

    // Evade roll
    if (Math.random() < this.evadeChance) {
      this.evadeFrames = 60;
      this.immunityFrames = 20;
      spawnDamageNumber(this.x, this.y - this.radius, 'EVADE', '#aaffee');
      skillOnEvade(this);
      return false;
    }

    // Skill: Fortify Shield — absorb one hit entirely
    if (this.skillState?.fortifyShield) {
      this.skillState.fortifyShield = false;
      this.immunityFrames = 10;
      spawnSparks(this.x, this.y, 10);
      spawnDamageNumber(this.x, this.y - this.radius, 'BLOCKED!', '#ffffaa');
      return false;
    }

    // Skill: Deflection — MA×2% chance to negate a hit entirely
    if (this.skills.includes('deflection') && Math.random() < this.deflectChance) {
      this.immunityFrames = 10;
      spawnSparks(this.x, this.y, 8);
      spawnDamageNumber(this.x, this.y - this.radius, 'DEFLECT!', '#aaddff');
      if (typeof flashSkillHUD === 'function') flashSkillHUD(this, SKILL_MAP['deflection']);
      return false;
    }

    // Skill: Thick Hide — -10% damage received
    if (this.skills.includes('thick_hide')) dmg *= 0.9;
    // Skill: Adaptation — -20% from the specific weapon type that killed you before
    if (this.adaptResist && attacker?.weaponDef?.id === this.adaptResist) dmg *= 0.8;

    this.hp -= dmg;

    // Flow State: reset stacks when hit
    if (this.skillState?.flowStateStacks > 0) {
      this.skillState.flowStateStacks = 0;
    }

    // Skill: Extended Immunity — 30 frames instead of 18
    this.immunityFrames = this.skills.includes('extended_immunity') ? 30 : 18;
    this.hitFlash = 8;
    const angle = Math.atan2(this.y - fromY, this.x - fromX);
    spawnBlood(this.x, this.y, isCrit ? 12 : 6, angle + Math.PI);
    if (isCrit) {
      spawnDamageNumber(this.x,     this.y - this.radius - 18, 'CRIT!', '#ffe033');
      spawnDamageNumber(this.x + 4, this.y - this.radius,       dmg,    '#ffcc00');
    } else {
      spawnDamageNumber(this.x, this.y - this.radius, dmg, this.color);
    }
    this.squashX = 1.3;
    this.squashY = 0.75;

    // Skill: Read & React — BIQ×3% chance to instantly counter-attack after being hit
    if (!isReactCounter && this.skills.includes('read_react') && attacker?.alive) {
      if (Math.random() < this.charBIQ * 0.03) {
        spawnDamageNumber(this.x, this.y - this.radius - 16, '⚡ REACT!', '#ffdd44');
        if (typeof flashSkillHUD === 'function') flashSkillHUD(this, SKILL_MAP['read_react']);
        attacker.takeDamage(this.getDamage(), this.x, this.y, false, this, true);
      }
    }

    // Skill: Phoenix — survive lethal hit with 1 HP (once per round)
    if (this.hp <= 0 && this.skills.includes('phoenix') && !this.skillState?.phoenixUsed) {
      this.hp = 1;
      this.skillState.phoenixUsed = true;
      spawnDamageNumber(this.x, this.y - this.radius - 24, '🔥 PHOENIX!', '#ff9900');
      return true;
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this._killedBy = attacker;
      sfxDeath();
      spawnDeathExplosion(this.x, this.y, this.color);
      this.speechText = ['RIP', 'Ouch!', '💀', 'GG'][Math.floor(Math.random()*4)];
      this.speechFrames = 120;
      skillOnKill(attacker, this);
    }
    return true;
  }

  draw(ctx) {
    // ── Overtime death: draw as gray ghost ──
    if (!this.alive && this.diedByOvertime) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.translate(this.x, this.y);
      // Gray body
      ctx.fillStyle = '#555';
      ctx.shadowColor = '#333';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      // Dark outline
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Skull-like X cross
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      const s = this.radius * 0.38;
      ctx.beginPath(); ctx.moveTo(-s, -s); ctx.lineTo(s, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s, -s); ctx.lineTo(-s, s); ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.squashX, this.squashY);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius*0.9, this.radius*0.8, this.radius*0.25, 0, 0, Math.PI*2);
    ctx.fill();

    // Immunity shimmer
    if (this.immunityFrames > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${this.immunityFrames/18 * 0.5})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 4, 0, Math.PI*2);
      ctx.stroke();
    }

    // Evade blur effect — ball mờ đi và có vòng cyan nhấp nháy
    if (this.evadeFrames > 0) {
      const t = this.evadeFrames / 60;          // 1.0 → 0.0
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.02); // nhấp nháy
      // Vòng tròn cyan nhấp nháy
      ctx.strokeStyle = `rgba(100, 255, 220, ${t * 0.9 * pulse})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#44ffcc';
      ctx.shadowBlur = 15 + pulse * 12;
      ctx.beginPath(); ctx.arc(0, 0, this.radius + 7, 0, Math.PI * 2); ctx.stroke();
      // Vòng thứ 2 lớn hơn mờ hơn
      ctx.strokeStyle = `rgba(100, 255, 220, ${t * 0.4})`;
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      // Làm mờ ball (globalAlpha thấp)
      ctx.globalAlpha = 0.35 + t * 0.35;
    }

    // Wall boost glow — vòng sáng cam khi đang tăng tốc
    if (this.wallBoostFactor > 1.005) {
      const boostAlpha = (this.wallBoostFactor - 1.0) / 0.2; // 0→1
      ctx.strokeStyle = `rgba(255, 160, 30, ${boostAlpha * 0.85})`;
      ctx.lineWidth = 3 + boostAlpha * 4;
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 12 + boostAlpha * 20;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Hit flash
    const baseColor = this.hitFlash > 0 ? '#ffffff' : this.color;
    ctx.fillStyle = baseColor;
    ctx.shadowColor = this.wallBoostFactor > 1.005 ? '#ff8800' : this.color;
    ctx.shadowBlur = this.alive ? (this.wallBoostFactor > 1.005 ? 18 : 10) : 0;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI*2);
    ctx.fill();

    // Ball outline
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(-this.radius*0.28, -this.radius*0.3, this.radius*0.28, this.radius*0.18, -Math.PI*0.3, 0, Math.PI*2);
    ctx.fill();

    // Team indicator ring
    if (this.teamId >= 0) {
      const TC = ['#00ddff', '#ff8833'];
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = TC[this.teamId] ?? '#fff';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Race decoration (cosmetic only, no hitbox change)
    if (this.alive) drawRaceDecoration(ctx, this);

    // Speech bubble
    if (this.speechText) {
      ctx.save();
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      const alpha = Math.min(1, this.speechFrames / 20);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(this.speechText, this.x, this.y - this.radius - 10);
      ctx.fillText(this.speechText, this.x, this.y - this.radius - 10);
      ctx.restore();
    }
  }

  drawWeapon(ctx) {
    if (!this.alive) return;
    ctx.save();
    // Scale glow
    if (this.weapon.hits > 0) {
      ctx.shadowColor = this.weaponDef.color;
      ctx.shadowBlur = Math.min(20, this.weapon.hits * 3);
    }
    this.weaponDef.draw(ctx, this);
    ctx.restore();
  }

  getScaleLabel() {
    const def = this.weaponDef;
    const w = this.weapon;
    if (def.id === 'fists')    return `⚡ CD: ${w.attackCooldown.toFixed(0)}`;
    if (def.id === 'sword')    return `⚔ Dmg: ${def.baseDamage + (w.bonusDamage||0)}`;
    if (def.id === 'dagger')   return `💨 Spin: ${(def.baseSpeed + (w.spinBonus||0)).toFixed(3)}`;
    if (def.id === 'spear')    return `📏 Len+${(w.bonusLength||0).toFixed(0)} Dmg+${(w.bonusDamage||0).toFixed(1)}`;
    if (def.id === 'bow')      return `🏹 Arrows: ${w.arrowCount||1}  Spd: ${(def.arrowSpeed + (w.arrowSpeedBonus||0)).toFixed(1)}`;
    if (def.id === 'scythe')   return w.hits >= 5 ? '🌙 DUAL BLADES' : `🌙 Hits: ${w.hits}/5`;
    if (def.id === 'hammer')   return `💥 KB: ${(def.baseKnockback + (w.bonusKnockback||0)).toFixed(1)}`;
    if (def.id === 'shuriken') return `⭐ Stars: ${w.shurikenCount||1}`;
    return '';
  }
}
