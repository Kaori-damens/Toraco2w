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
    this.charDUR     = dur;                  // stored for HUD display
    this.charMA      = ma;                   // used in _initWeapon spinBonus + Flow State/Deflection
    this.charIQ      = iq  !== null ? iq  : 5;  // used in crit, Exploit, Mind Break
    this.charBIQ     = biq !== null ? biq : 5;  // used in evade, Read & React
    this.charRace    = cs.race    ?? null;   // used in drawRaceDecoration
    this.charSubrace = cs.subrace ?? null;   // used in drawRaceDecoration

    this.maxHp = dur !== null ? (50 + dur * 10) : BASE_HP;
    this.hp    = this.maxHp;
    this.maxSpd     = spd !== null ? (7 + spd * 1.5) : 15;
    this.baseMaxSpd = this.maxSpd; // Speed Floor reference
    this.alive = true;
    this.mass = this.radius * this.radius * 0.05;

    this.immunityFrames = 0;
    this.projImmunityFrames = 0;  // separate counter for projectile hits
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

    // Race skill state (rs_* props added dynamically by initRaceSkillState)
    this.netTrapped   = 0;    // frames frozen by Troll Net
    this.stunTimer    = 0;    // frames stunned by Angel Smite (weapon locked)
    this.raceSkillDef = null;
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
    else if (def.id === 'rapier')  ac = Math.max(2, 18 - spd);
    else if (def.id === 'katana')  ac = Math.max(2, 42 - spd);
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
      parryCooldown: 0,
      // Rapier — Riposte + Lunge + Parry stacks
      riposteWindow: 0,
      riposteStacks: 0,
      lungeFired: false,
      lungeHit: false,
      // Katana — Momentum
      momentumStacks: 0,
      momentumTimer: 0,
      iaiReady: false,
      iaiHit: false,
    };
  }

  getSpeed() {
    const def    = this.weaponDef;
    const spearDebuff  = this.weapon.spinDebuffTimer > 0 ? 0.9 : 1.0;  // -10% from spear parry
    const hammerDebuff = this.weapon.spinSlowTimer   > 0 ? 0.7 : 1.0;  // -30% from hammer slow
    const parryBoost   = this.weapon.spinBoostTimer  > 0 ? 2.0 : 1.0;  // +100% from Parry Master
    const netDebuff    = this.netTrapped > 0 ? 0.70 : 1.0;              // -30% from Troll Net
    const stuckDebuff  = (this.rs_weaponStuck > 0 || this.stunTimer > 0) ? 0 : 1; // Void Grip / Smite stun
    return (def.baseSpeed + this.weapon.spinBonus) * this.scale * this.weapon.spinDir * spearDebuff * hammerDebuff * parryBoost * netDebuff * stuckDebuff;
  }

  getDamage() {
    const def = this.weaponDef;
    const str = this.charSTR ?? 1;
    const ma  = this.charMA  ?? 0;
    const rageMult = (state.matchTime >= 80 * 60) ? 1.5 : 1.0;
    let base = def.baseDamage;
    if (def.id === 'fists')  base += ma * 0.2;   // MA=10 → +2 base (×STR)
    if (def.id === 'dagger') base += ma * 0.15;  // MA=10 → +1.5 base (×STR)
    let dmg = (base * str + this.weapon.bonusDamage) * rageMult;
    // Skills that modify outgoing damage
    if (this.skills.includes('berserker') && this.hp / this.maxHp < 0.30) dmg *= 1.5;
    if (this.skillState?.warCryReady)  dmg *= 2;
    if (this.skillState?.counterActive) dmg *= 2;
    if (this.skillLearningMult > 1)    dmg *= this.skillLearningMult;
    // Mind Break debuff: opponent reduced this ball's outgoing damage at round start
    if (this.mindBreakDebuff > 0)      dmg *= (1 - this.mindBreakDebuff);
    // Human Limit Break: each hit stacks +15% damage (no expiry)
    if (this.charRace === 'human' && this.rs_active) dmg *= (1 + (this.rs_stacks || 0) * 0.15);
    // Dwarf Master Forge: Sharpness stacks +5% dmg each
    if (this.rs_forgeSharpness > 0) dmg *= (1 + this.rs_forgeSharpness * 0.05);
    // Orc Blood Price: burst hit deals bonus damage (STR-scaled)
    if (this.charRace === 'orc' && this.rs_burstReady) dmg *= (1 + (this.charSTR ?? 5) * 0.15);
    // Rapier — Riposte multiplier (IQ-scaled + parry stacks)
    // Base: ×(1.5 + IQ×0.15), each parry stack adds ×0.5
    if (def.id === 'rapier' && this.weapon.riposteWindow > 0) {
      const iq     = this.charIQ ?? 0;
      const stacks = this.weapon.riposteStacks || 0;
      dmg *= (1.5 + iq * 0.15 + stacks * 0.5);
      spawnDamageNumber(this.x, this.y - this.radius - 20, '⚡ RIPOSTE!', '#ffdd00');
    }
    // Katana — Iai Strike multiplier ×3
    if (def.id === 'katana' && this.weapon.iaiReady) {
      dmg *= 3.0;
      this.weapon.iaiHit = true; // flag for collision.js battle log
      spawnDamageNumber(this.x, this.y - this.radius - 20, '⚡ IAI STRIKE!', '#ffffff');
    }
    // ── Weapon skill outgoing modifiers ───────────────────────
    // Duel Instinct (Sword): +30% when only 1 enemy alive
    if (this.skills.includes('duel_instinct') && def.id === 'sword' && typeof state !== 'undefined') {
      const enemiesAlive = state.players.filter(p => p !== this && p.alive);
      if (enemiesAlive.length <= 1) dmg *= 1.30;
    }
    // Parry Punish (Sword): ×2 for 3s after parry
    if (this.skillState?.parryPunishActive && def.id === 'sword') dmg *= 2.0;
    // Brawler's Rhythm (Fists): every 5th hit ×2.5
    if (this.skillState?.brawlerReady && def.id === 'fists') dmg *= 2.5;
    // Flurry Finisher (Dagger): every 5th consecutive hit ×2.5
    if (this.skillState?.flurryReady && def.id === 'dagger') dmg *= 2.5;
    // Heavy Momentum (Hammer): +20% per same-target stack (max 3 = +60%)
    if (this.skills.includes('heavy_momentum') && def.id === 'hammer' && (this.skillState?.hammerStacks || 0) > 0) {
      dmg *= (1 + this.skillState.hammerStacks * 0.20);
    }
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
    // Human Limit Break: +50% speed cap while active
    if (this.charRace === 'human' && this.rs_active) effectiveMaxSpd *= 1.5;
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

      // Ground Pound (Hammer): wall bounce → lock nearest enemy weapon for 25 frames
      if (this.skills.includes('ground_pound') && this.weaponDef?.id === 'hammer' && typeof state !== 'undefined') {
        const enemies = state.players.filter(p => p !== this && p.alive);
        if (enemies.length > 0) {
          const target = enemies.reduce((a, b) =>
            Math.hypot(b.x-this.x, b.y-this.y) < Math.hypot(a.x-this.x, a.y-this.y) ? b : a);
          target.stunTimer = Math.max(target.stunTimer || 0, 25);
          spawnDamageNumber(target.x, target.y - target.radius - 16, '🔨 STUNNED!', '#ff9933');
          if (typeof flashSkillHUD === 'function') flashSkillHUD(this, SKILL_MAP['ground_pound']);
        }
      }
      // God of Speed: each wall bounce adds a permanent momentum stack
      if (this.charRace === 'god' && this.charSubrace?.label === 'God of Speed') {
        this.rs_speedStacks = (this.rs_speedStacks || 0) + 1;
        // Raise speed cap so stacks persist beyond normal maxSpd
        this.maxSpd = this.baseMaxSpd * (1 + this.rs_speedStacks * 0.10);
      }

      // Quake wall slam: nếu bị Giant Quake đẩy và đang còn trong window → deal wall damage
      if (this.quakeSlamFrames > 0 && spd >= 4) {
        const wallDmg = Math.round(spd * 1.8);
        const src = this.quakeSlamGiant;
        this.takeDamage(wallDmg, this.x + (wallHitX ? (this.vx > 0 ? -10 : 10) : 0),
                                  this.y + (wallHitY ? (this.vy > 0 ? -10 : 10) : 0),
                                  false, src);
        spawnDamageNumber(this.x, this.y - this.radius - 18, `🌍 SLAM! -${wallDmg}`, '#cc9944');
        if (typeof addBattleLog === 'function' && src) {
          addBattleLog('race_skill', { attacker: getBallLabel(src), aColor: src.color,
            text: `🌍 Wall slam! -${wallDmg} on ${getBallLabel(this)}` });
        }
        this.quakeSlamFrames = 0; // one slam per quake only
      }
    }
    if (this.bounceCooldown > 0) this.bounceCooldown--;

    // Decay wall boost về 1.0 trong 3 giây (180 frames)
    // 0.9747^180 ≈ 0.01 → boost gần như tan hết sau 3s
    // God of Speed: skip decay — momentum is permanent until hit/parried
    const isGodSpeed = this.charRace === 'god' && this.charSubrace?.label === 'God of Speed';
    if (!isGodSpeed && this.wallBoostFactor > 1.0005) {
      const prev = this.wallBoostFactor;
      this.wallBoostFactor = 1.0 + (prev - 1.0) * 0.9747;
      const ratio = this.wallBoostFactor / prev;  // hệ số giảm tốc frame này
      this.vx *= ratio;
      this.vy *= ratio;
    } else if (!isGodSpeed) {
      this.wallBoostFactor = 1.0;
    }

    // Weapon rotation
    this.weapon.angle += this.getSpeed();

    // Bow soft aim: gently nudge weapon angle toward opponent (MA scales tracking speed)
    // MA 1 → barely noticeable pull; MA 10 → clear but not snap-aim
    if (this.weaponDef.id === 'bow' && opponent && opponent.alive) {
      const dx = opponent.x - this.x, dy = opponent.y - this.y;
      let diff = Math.atan2(dy, dx) - this.weapon.angle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const trackSpeed = (this.charMA ?? 1) * 0.003; // MA1→0.003, MA10→0.03 rad/frame
      this.weapon.angle += Math.sign(diff) * Math.min(Math.abs(diff), trackSpeed);
    }

    if (this.weapon.spinDebuffTimer > 0) this.weapon.spinDebuffTimer--;
    if (this.weapon.spinSlowTimer   > 0) this.weapon.spinSlowTimer--;
    if (this.weapon.spinBoostTimer  > 0) this.weapon.spinBoostTimer--;
    if (this.weapon.cooldown > 0) this.weapon.cooldown--;
    if (this.weapon.parryCooldown > 0) this.weapon.parryCooldown--;
    // Rapier: tick down riposte window; reset flags when window closes
    if (this.weapon.riposteWindow > 0) {
      this.weapon.riposteWindow--;
      if (this.weapon.riposteWindow === 0) {
        this.weapon.lungeFired = false;
        this.weapon.lungeHit   = false;
      }
    }
    // Rapier Lunge: riposte window open + weapon angle facing enemy + in range + not yet fired
    if (this.weaponDef?.id === 'rapier' && this.weapon.riposteWindow > 0
        && !this.weapon.lungeFired
        && typeof state !== 'undefined' && state.players) {
      const enemies = state.players.filter(b => b.alive && b !== this &&
        (state.matchMode === '2v2' ? b.teamId !== this.teamId : true));
      if (enemies.length > 0) {
        const target = enemies.reduce((best, b) =>
          Math.hypot(b.x - this.x, b.y - this.y) < Math.hypot(best.x - this.x, best.y - this.y) ? b : best);
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        const LUNGE_RANGE = 220;
        const ANGLE_TOL   = 0.35; // ~20°
        const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
        let angleDiff = this.weapon.angle - angleToTarget;
        while (angleDiff >  Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (dist <= LUNGE_RANGE && Math.abs(angleDiff) <= ANGLE_TOL) {
          // LUNGE — fire once per riposte window
          this.vx += Math.cos(angleToTarget) * 13;
          this.vy += Math.sin(angleToTarget) * 13;
          this.weapon.lungeFired = true;
          this.weapon.lungeHit   = true; // flag for collision.js battle log
          addBattleLog('lunge_trigger', { attacker: this.charName ?? 'Unknown', aColor: this.color });
          spawnDamageNumber(this.x, this.y - this.radius - 16, '🤺 Lunge!', '#aae0ff');
        }
      }
    }
    // Katana: tick down momentum decay timer; lose stacks if expired
    if (this.weapon.momentumTimer > 0) {
      this.weapon.momentumTimer--;
    } else if (this.weapon.momentumStacks > 0 && !this.weapon.iaiReady) {
      this.weapon.momentumStacks = 0;
    }
    if (this.immunityFrames     > 0) this.immunityFrames--;
    if (this.projImmunityFrames > 0) this.projImmunityFrames--;
    if (this.hitFlash > 0) this.hitFlash--;
    if (this.evadeFrames > 0) this.evadeFrames--;

    // Squash recovery
    this.squashX += (1 - this.squashX) * 0.15;
    this.squashY += (1 - this.squashY) * 0.15;

    // ── Weapon skill per-frame ticks ───────────────────────────
    // Shadow Strike (Dagger): 10s timer → guaranteed crit
    if (this.skills.includes('shadow_strike') && this.weaponDef?.id === 'dagger' && this.skillState) {
      if (!this.skillState.shadowStrikeCrit) {
        this.skillState.sk_shadowTimer = (this.skillState.sk_shadowTimer || 0) + 1;
        if (this.skillState.sk_shadowTimer >= 600) {
          this.skillState.shadowStrikeCrit = true;
          this.skillState.sk_shadowTimer   = 0;
          spawnDamageNumber(this.x, this.y - this.radius - 14, '🌑 SHADOW READY', '#aa44ff');
          if (typeof flashSkillHUD === 'function') flashSkillHUD(this, SKILL_MAP['shadow_strike']);
        }
      }
    }
    // Parry Punish (Sword): tick down active window
    if ((this.skillState?.parryPunishTimer || 0) > 0) {
      this.skillState.parryPunishTimer--;
      if (this.skillState.parryPunishTimer <= 0) {
        this.skillState.parryPunishActive = false;
      }
    }
    // Zone Control (Spear): deal 0.5 dmg to enemies within 150px every 30 frames
    if (this.skills.includes('zone_control') && this.weaponDef?.id === 'spear' && this.skillState && typeof state !== 'undefined') {
      this.skillState.sk_zoneTimer = (this.skillState.sk_zoneTimer || 0) + 1;
      if (this.skillState.sk_zoneTimer >= 30) {
        this.skillState.sk_zoneTimer = 0;
        for (const en of state.players) {
          if (en === this || !en.alive) continue;
          if (Math.hypot(en.x - this.x, en.y - this.y) < 150) {
            en.takeDamage(0.5, this.x, this.y, false, this, false, true);
            spawnDamageNumber(en.x, en.y - en.radius - 10, '💫 -0.5', '#9966ff');
          }
        }
      }
    }
    // Grim Presence (Scythe): mark nearby enemies with aura debuff (refreshed each frame)
    if (this.skills.includes('grim_presence') && this.weaponDef?.id === 'scythe' && typeof state !== 'undefined') {
      for (const en of state.players) {
        if (en === this || !en.alive) continue;
        if (Math.hypot(en.x - this.x, en.y - this.y) < 80) {
          en.sk_grimAura = 3; // refresh each frame while in aura range
        }
      }
    }
    if ((this.sk_grimAura || 0) > 0) this.sk_grimAura--;
    // Poison tick (from Poison Blade)
    if ((this.sk_poisonDuration || 0) > 0) {
      this.sk_poisonDuration--;
      this.sk_poisonTick = (this.sk_poisonTick || 0) + 1;
      if (this.sk_poisonTick >= 180) { // 3 seconds
        this.sk_poisonTick = 0;
        const poisonDmg = this.sk_poisonDmg || 1.5;
        this.takeDamage(poisonDmg, this.x, this.y, false, this.sk_poisonOwner || null, false, true);
        spawnDamageNumber(this.x, this.y - this.radius - 12, `🐍 -${poisonDmg}`, '#44cc44');
      }
    }

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
            // Bow aim cone: only fire when opponent is within ±coneHalf of weapon angle
            // Cone width scales with IQ — IQ1→±24°, IQ5→±40°, IQ10→±60°
            let inCone = true;
            if (def.id === 'bow' && opponent && opponent.alive) {
              const dx = opponent.x - this.x, dy = opponent.y - this.y;
              let diff = Math.atan2(dy, dx) - this.weapon.angle;
              while (diff >  Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              const coneHalf = (20 + (this.charIQ ?? 1) * 4) * Math.PI / 180;
              inCone = Math.abs(diff) <= coneHalf;
            }

            if (inCone) {
              const count = def.id === 'bow'
                ? (this.weapon.arrowCount || 1)
                : (this.weapon.shurikenCount || 1);
              if (def.id === 'bow') {
                // Multi-stream: MA>=5 → 2 streams, MA>=10 → 3 streams
                const ma = this.charMA ?? 0;
                const streams = ma >= 10 ? 3 : ma >= 5 ? 2 : 1;
                this.weapon._bowStreams = streams;
                this.weapon._arrowsLeft = count;
                this.weapon.burstQueue = Math.ceil(count / streams);
              } else {
                this.weapon.burstQueue = count;
              }
              this.weapon.burstTimer = 0; // fire first shot immediately
            }
            // If NOT inCone: timer stays charged (≥interval), retries next frame
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
    const def     = this.weaponDef;
    const a       = this.weapon.angle; // current weapon spin angle — changes each frame naturally
    const spdStat = this.charSPD ?? 5;
    const iqStat  = this.charIQ  ?? 5;
    // God of BIQ: auto-aim helper — returns auto-aimed vx/vy if triggered, else null
    const godBiqAutoAim = (origVx, origVy) => {
      if (this.charRace !== 'god' || this.charSubrace?.label !== 'God of BIQ') return null;
      const biq = this.charBIQ ?? 5;
      const chance = 0.20 + biq * 0.02; // BIQ10=40%, BIQ20=60%
      if (Math.random() >= chance) return null;
      const allBalls = typeof state !== 'undefined' ? state.players : [];
      const enemies = allBalls.filter(b => b !== this && b.alive);
      if (!enemies.length) return null;
      const target = enemies.reduce((a,b) => Math.hypot(this.x-a.x,this.y-a.y) < Math.hypot(this.x-b.x,this.y-b.y) ? a : b);
      const dx = target.x - this.x, dy = target.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = Math.sqrt(origVx*origVx + origVy*origVy);
      return { vx: (dx/dist)*speed, vy: (dy/dist)*speed };
    };
    sfxShoot();
    if (def.id === 'bow') {
      // Arrow speed scales with SPD (arm strength) and IQ (technique)
      const baseSpd = def.arrowSpeed + (this.weapon.arrowSpeedBonus || 0)
                    + spdStat * 0.25 + iqStat * 0.15
                    + (this.rs_forgeProjSpeedBonus || 0); // Dwarf: Swift Flight

      // Multi-stream spread: MA>=5 → 2 streams ±5°, MA>=10 → 3 streams ±10°
      const streams    = this.weapon._bowStreams || 1;
      const arrowsLeft = this.weapon._arrowsLeft != null ? this.weapon._arrowsLeft : streams;
      const toFire     = Math.min(streams, arrowsLeft);
      if (this.weapon._arrowsLeft != null) this.weapon._arrowsLeft -= toFire;

      const SPREAD = 10 * Math.PI / 180; // 10 degrees between streams
      const offsets = toFire === 1 ? [0]
                    : toFire === 2 ? [-SPREAD / 2, SPREAD / 2]
                    : [-SPREAD, 0, SPREAD];

      for (const offset of offsets) {
        const ang = a + offset;
        const arrow = new Projectile(
          this.x + Math.cos(ang) * this.radius,
          this.y + Math.sin(ang) * this.radius,
          Math.cos(ang) * baseSpd, Math.sin(ang) * baseSpd,
          this, 'arrow', (this.charSTR ?? 1)
        );
        if (this.rs_forgeProjSizeBonus) arrow.r += this.rs_forgeProjSizeBonus; // Dwarf: Heavy Ammo
        // God of BIQ: auto-aim this arrow
        const aaArrow = godBiqAutoAim(arrow.vx, arrow.vy);
        if (aaArrow) { arrow.vx = aaArrow.vx; arrow.vy = aaArrow.vy; }
        // Sniper: tag arrow if nearest enemy is > 300px away
        if (this.skills.includes('sniper') && this.skillState && typeof state !== 'undefined') {
          const sniperEnemies = state.players.filter(b => b !== this && b.alive);
          if (sniperEnemies.length > 0) {
            const nearest = sniperEnemies.reduce((best, cur) =>
              Math.hypot(this.x-best.x, this.y-best.y) < Math.hypot(this.x-cur.x, this.y-cur.y) ? best : cur);
            if (Math.hypot(nearest.x - this.x, nearest.y - this.y) > 300) {
              arrow.sniperBoost = true;
            }
          }
        }
        // Volley: first 3 arrows ×2
        if (this.skillState && (this.skillState.sk_volleyCount || 0) > 0) {
          arrow.volleyBoost = true;
          this.skillState.sk_volleyCount--;
        }
        // Piercing Shot: every 8th arrow pierces
        if (this.skills.includes('piercing_shot') && this.skillState) {
          this.skillState.sk_bowShotCount = (this.skillState.sk_bowShotCount || 0) + 1;
          if (this.skillState.sk_bowShotCount % 8 === 0) {
            arrow.piercing = true;
            spawnDamageNumber(this.x, this.y - this.radius - 16, '💥 PIERCE!', '#ffdd44');
          }
        }
        projectiles.push(arrow);
      }
    } else if (def.id === 'shuriken') {
      // Shuriken speed scales more aggressively (low base, needs stats to be viable)
      const spd = def.shurikenSpeed + spdStat * 0.4 + iqStat * 0.25
                + (this.rs_forgeProjSpeedBonus || 0); // Dwarf: Swift Flight
      const star = new Projectile(
        this.x + Math.cos(a) * this.radius,
        this.y + Math.sin(a) * this.radius,
        Math.cos(a) * spd, Math.sin(a) * spd,
        this, 'shuriken', (this.charSTR ?? 1)
      );
      if (this.rs_forgeProjSizeBonus) star.r += this.rs_forgeProjSizeBonus; // Dwarf: Heavy Ammo
      // God of BIQ: auto-aim this shuriken
      const aaStar = godBiqAutoAim(star.vx, star.vy);
      if (aaStar) { star.vx = aaStar.vx; star.vy = aaStar.vy; }
      projectiles.push(star);
      // Fan Throw: every 5th throw → fire 2 extra shurikens at ±20°
      if (this.skills.includes('fan_throw') && this.skillState) {
        this.skillState.sk_fanCount = (this.skillState.sk_fanCount || 0) + 1;
        if (this.skillState.sk_fanCount % 5 === 0) {
          const fanAngles = [-20 * Math.PI / 180, 20 * Math.PI / 180];
          for (const offset of fanAngles) {
            const fa = a + offset;
            const extra = new Projectile(
              this.x + Math.cos(fa) * this.radius,
              this.y + Math.sin(fa) * this.radius,
              Math.cos(fa) * spd, Math.sin(fa) * spd,
              this, 'shuriken', (this.charSTR ?? 1)
            );
            projectiles.push(extra);
          }
          spawnDamageNumber(this.x, this.y - this.radius - 16, '🌟 FAN THROW!', '#ffdd44');
          if (typeof flashSkillHUD === 'function') flashSkillHUD(this, SKILL_MAP['fan_throw']);
        }
      }
    }
  }

  takeDamage(dmg, fromX, fromY, isCrit = false, attacker = null, isReactCounter = false, isProjectile = false) {
    // Projectile and melee use separate immunity counters
    if (isProjectile ? this.projImmunityFrames > 0 : this.immunityFrames > 0) return false;

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
    // Guard Stance (Sword): during cooldown → BIQ×3% dmg reduction (max 30%)
    if (this.skills.includes('guard_stance') && this.weaponDef?.id === 'sword' && this.weapon.cooldown > 0) {
      const reduction = Math.min(0.30, (this.charBIQ || 0) * 0.03);
      dmg *= (1 - reduction);
    }

    const hpBefore = this.hp;
    this.hp -= dmg;

    // Flow State: reset stacks when hit
    if (this.skillState?.flowStateStacks > 0) {
      this.skillState.flowStateStacks = 0;
    }
    // Rapier: taking damage opens the Riposte window (BIQ-scaled frames)
    if (this.weaponDef?.id === 'rapier') {
      const biq = this.charBIQ ?? 0;
      this.weapon.riposteWindow = Math.max(40, 10 + biq * 6);
    }
    // Katana: taking damage loses stacks (IAI READY → -1; otherwise → -2)
    if (this.weaponDef?.id === 'katana' && this.weapon.momentumStacks > 0) {
      const loss = this.weapon.iaiReady ? 1 : 2;
      this.weapon.momentumStacks = Math.max(0, this.weapon.momentumStacks - loss);
      if (this.weapon.momentumStacks < 5) this.weapon.iaiReady = false;
    }
    // God of Speed: taking a hit resets momentum stacks + restores base max speed
    if (this.charRace === 'god' && this.charSubrace?.label === 'God of Speed' && (this.rs_speedStacks || 0) > 0) {
      this.rs_speedStacks = 0;
      this.maxSpd = this.baseMaxSpd;
    }

    // Race: Orc Blood Price — accumulate stacks each time hit; at 5 stacks, arm burst
    if (this.charRace === 'orc' && this.raceSkillDef && !this.rs_burstReady) {
      this.rs_stacks = (this.rs_stacks || 0) + 1;
      if (this.rs_stacks >= 5) {
        this.rs_stacks = 0; this.rs_burstReady = true;
        spawnDamageNumber(this.x, this.y - this.radius - 20, '🩸 BLOODLUST!', '#cc2222');
      }
    }

    // Race: Human Limit Break — triggers when HP crosses below 20% (last stand)
    if (this.charRace === 'human' && this.raceSkillDef &&
        !this.rs_triggered && hpBefore >= this.maxHp * 0.20 && this.hp < this.maxHp * 0.20 && this.hp > 0) {
      this.rs_active    = true;
      this.rs_triggered = true;
      this.rs_stacks    = 0;
      spawnDamageNumber(this.x, this.y - this.radius - 26, '⚡ LIMIT BREAK!', '#ffdd00');
      if (typeof spawnSparks === 'function') spawnSparks(this.x, this.y, 16);
      if (typeof addBattleLog === 'function') addBattleLog('race_skill', {
        attacker: typeof getBallLabel === 'function' ? getBallLabel(this) : (this.charName || '?'),
        aColor: this.color, text: '⚡ Limit Break — no turning back!'
      });
    }

    // Immunity after hit — melee: 4 frames, projectile: 0 frames (no immunity between arrows)
    const hasExtImmune = this.skills.includes('extended_immunity');
    if (isProjectile) {
      this.projImmunityFrames = 0;
    } else {
      this.immunityFrames = hasExtImmune ? 30 : 4;
    }
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

    // Weapon skill: chain resets on taking damage
    if (this.skillState) {
      if (this.weaponDef?.id === 'fists') {
        this.skillState.brawlerChain = 0;
        this.skillState.brawlerReady = false;
      }
      if (this.weaponDef?.id === 'dagger') {
        this.skillState.flurryChain = 0;
        this.skillState.flurryReady = false;
      }
    }
    // Combo Breaker (Fists): hit while chain ≥ 3 → auto counter-attack
    if (!isReactCounter && this.skills.includes('combo_breaker') && this.weaponDef?.id === 'fists' && attacker?.alive) {
      const chain = this.skillState?.brawlerChain || 0;
      if (chain >= 3) {
        const str = this.charSTR ?? 5;
        const cbDmg = 1.5 + str * 0.3;
        attacker.takeDamage(cbDmg, this.x, this.y, false, this, true);
        spawnDamageNumber(this.x, this.y - this.radius - 18, '💢 COMBO BREAK!', '#ff4400');
        if (typeof flashSkillHUD === 'function') flashSkillHUD(this, SKILL_MAP['combo_breaker']);
      }
    }

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

    // Immunity shimmer — show when either immunity counter is active
    const shimmerF = Math.max(this.immunityFrames, this.projImmunityFrames);
    if (shimmerF > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${shimmerF / 18 * 0.5})`;
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
