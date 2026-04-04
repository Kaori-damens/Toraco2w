// ============================================================
// SKILL SYSTEM
// ============================================================
const SKILL_DEFS = [
  // ── PASSIVE (always active) ──────────────────────────────
  { id: 'iron_body',          name: 'Iron Body',          icon: '🛡️', type: 'passive',    desc: '+20 max HP' },
  { id: 'thick_hide',         name: 'Thick Hide',         icon: '🦏', type: 'passive',    desc: '-10% damage received' },
  { id: 'swift',              name: 'Swift',              icon: '💨', type: 'passive',    desc: '+15% movement speed cap' },
  { id: 'sharp_eye',          name: 'Sharp Eye',          icon: '👁️', type: 'passive',    desc: '+10% crit chance' },
  { id: 'extended_immunity',  name: 'Extended Immunity',  icon: '✨', type: 'passive',    desc: 'Hit immunity: 18 → 30 frames' },
  { id: 'heavy_mass',         name: 'Heavy Mass',         icon: '⚓', type: 'passive',    desc: '+30% mass (less knockback)' },
  // ── PRE-COMBAT (triggers once at round start) ────────────
  { id: 'war_cry',    name: 'War Cry',    icon: '📢', type: 'pre_combat', desc: 'First hit this round deals 2× damage' },
  { id: 'fortify',    name: 'Fortify',    icon: '🏰', type: 'pre_combat', desc: 'Start with a 1-hit absorption shield' },
  { id: 'adrenaline', name: 'Adrenaline', icon: '⚡', type: 'pre_combat', desc: 'First 5s: +50% movement speed' },
  { id: 'predator',   name: 'Predator',   icon: '🦅', type: 'pre_combat', desc: '+15% damage when target has less HP' },
  { id: 'first_blood',name: 'First Blood',icon: '🩸', type: 'pre_combat', desc: 'First hit of round stuns opponent 30 frames' },
  // ── IN-COMBAT (reactive event hooks) ────────────────────
  { id: 'berserker',   name: 'Berserker',   icon: '😤', type: 'in_combat', desc: '+50% damage while HP < 30%' },
  { id: 'phoenix',     name: 'Phoenix',     icon: '🔥', type: 'in_combat', desc: 'Survive one lethal hit with 1 HP (once/round)' },
  { id: 'counter',     name: 'Counter',     icon: '↩️', type: 'in_combat', desc: 'After being parried: next hit deals 2× damage' },
  { id: 'vampiric',    name: 'Vampiric',    icon: '🧛', type: 'in_combat', desc: 'On hit: heal 5% of damage dealt' },
  { id: 'parry_master',name: 'Parry Master',icon: '🗡️', type: 'in_combat', desc: 'On parry: no knockback + weapon spin ×2 for 1.5s' },
  { id: 'momentum',    name: 'Momentum',    icon: '🌀', type: 'in_combat', desc: 'On kill (FFA): +10% speed stack (max 5×)' },
  { id: 'shadow_step', name: 'Shadow Step', icon: '👻', type: 'in_combat', desc: 'On evade: teleport to a random safe spot' },
  { id: 'blood_frenzy',name: 'Blood Frenzy',icon: '💉', type: 'in_combat', desc: 'On kill: heal 25 HP' },
  { id: 'flow_state',  name: 'Flow State',  icon: '🌊', type: 'in_combat', desc: 'On hit: +MA×1% speed per stack (reset when hit)' },
  { id: 'read_react',  name: 'Read & React',icon: '⚡', type: 'in_combat', desc: 'On being hit: BIQ×3% chance to instantly counter-attack' },
  { id: 'exploit',     name: 'Exploit',     icon: '💡', type: 'in_combat', desc: 'On hit: (IQ+BIQ)×1% chance double damage' },
  { id: 'deflection',  name: 'Deflection',  icon: '🪞', type: 'passive',   desc: 'MA×2% chance to completely negate a hit' },
  { id: 'mind_break',  name: 'Mind Break',  icon: '🧿', type: 'pre_combat', desc: 'If IQ > target: -(IQ gap × 3%) to their final damage' },
  // ── POST-COMBAT (triggers after round ends) ──────────────
  { id: 'learning',      name: 'Learning',      icon: '📚', type: 'post_combat', desc: 'Thua: +5% damage round sau' },
  { id: 'adaptation',    name: 'Adaptation',    icon: '🧬', type: 'post_combat', desc: 'Thua: +20% resist với weapon type đã giết mình' },
  { id: 'survivor',     name: 'Survivor',     icon: '🩹', type: 'post_combat', desc: 'Thắng với HP<20%: +10 max HP vĩnh viễn' },
  { id: 'veteran',      name: 'Veteran',      icon: '🏅', type: 'post_combat', desc: 'Thắng: +1 stat ngẫu nhiên (không giới hạn)' },
  { id: 'mastery',      name: 'Mastery',      icon: '🌙', type: 'post_combat', desc: 'Thắng HP<50%: MA×3% chance +1 dmg/proj vũ khí' },
  { id: 'perfectionist',name: 'Perfectionist',icon: '💎', type: 'post_combat', desc: 'Thắng >80% HP: +15% dmg. Thắng ≤80% HP: -10% dmg' },
  { id: 'blood_mark',   name: 'Blood Mark',   icon: '🩸', type: 'post_combat', desc: 'Thua: gắn debuff lên đối thủ — trận sau họ ra sân với 80% HP' },
  { id: 'copycat',      name: 'Copycat',      icon: '🎭', type: 'post_combat', desc: 'Thắng: BIQ×3.5% chance học 1 skill ngẫu nhiên của đối thủ' },
];

const SKILL_MAP = Object.fromEntries(SKILL_DEFS.map(s => [s.id, s]));

// ── Apply permanent stat mods from passive skills ──────────
// Call once per game right after Ball is constructed.
function applySkillPassives(ball, fighter) {
  const sk = ball.skills;
  if (!sk || sk.length === 0) return;

  if (sk.includes('iron_body'))   { ball.maxHp += 20; ball.hp = ball.maxHp; }
  if (sk.includes('swift'))       { ball.maxSpd *= 1.15; ball.baseMaxSpd = ball.maxSpd; }
  if (sk.includes('sharp_eye'))   { ball.critChance += 0.10; }
  if (sk.includes('heavy_mass'))  { ball.mass *= 1.30; }

  // Cross-round bonuses from previous rounds (Learning + Perfectionist stacked)
  ball.skillLearningMult  = 1 + (fighter.learningBonus || 0);
  ball.skillLearningMult *= (fighter.perfMult || 1);
  fighter.perfMult        = 1;  // consumed — reset for next round
  ball.adaptResist        = fighter.adaptResist || null;

  // Survivor: permanent max HP bonus accumulated over rounds
  if (fighter.survivorHPBonus) {
    ball.maxHp += fighter.survivorHPBonus;
    ball.hp     = ball.maxHp;
  }

  // Veteran: permanent stat bonuses
  if (fighter.veteranStats) {
    const vs = fighter.veteranStats;
    if (vs.STR) { ball.charSTR = (ball.charSTR || 5) + vs.STR; }
    if (vs.IQ)  { ball.charIQ  = (ball.charIQ  || 5) + vs.IQ;  }
    if (vs.BIQ) { ball.charBIQ = (ball.charBIQ || 5) + vs.BIQ; }
    if (vs.MA)  { ball.charMA  = (ball.charMA  || 5) + vs.MA;  }
    if (vs.SPD) {
      ball.charSPD = (ball.charSPD || 5) + vs.SPD;
      // maxSpd formula: 10 + charSPD * 1.5  →  each +1 SPD = +1.5 maxSpd
      ball.maxSpd     += vs.SPD * 1.5;
      ball.baseMaxSpd += vs.SPD * 1.5;
    }
  }

  // Blood Mark: opponent was marked by a loser — start round with 80% HP
  if (fighter.bloodMarked) {
    ball.hp = ball.maxHp * 0.80;
    fighter.bloodMarked = false; // consumed
    spawnDamageNumber(ball.x, ball.y - ball.radius - 18, '🩸 BLOOD MARKED', '#cc0000');
  }

  // Mastery: persistent weapon bonus from previous win(s)
  if (fighter.masteryDmgBonus) {
    ball.weapon.bonusDamage = (ball.weapon.bonusDamage || 0) + fighter.masteryDmgBonus;
  }
  if (fighter.masteryProjBonus && ball.weapon.shurikenCount !== undefined) {
    // Ranged (shuriken): add extra starting shurikens
    ball.weapon.shurikenCount = (ball.weapon.shurikenCount || 1) + fighter.masteryProjBonus;
  }

  // Copycat: add the learned skill for this round (if not already owned)
  if (fighter.copycatSkill && !ball.skills.includes(fighter.copycatSkill)) {
    ball.skills.push(fighter.copycatSkill);
    fighter.copycatSkill = null; // consumed
  }
}

// ── Init per-round reactive skill state ────────────────────
// Called once per game (balls are recreated each round).
function initRoundSkillState(ball) {
  ball.skillState = {
    warCryReady:     ball.skills.includes('war_cry'),
    fortifyShield:   ball.skills.includes('fortify'),
    firstBloodReady: ball.skills.includes('first_blood'),
    phoenixUsed:     false,
    counterActive:   false,
    momentumStacks:  0,
    flowStateStacks: 0,
    predatorActive:  false,  // set at round start in skillOnPreCombat
  };
}

// ── PRE-COMBAT hook ────────────────────────────────────────
// Called for each ball when the countdown ends → playing begins.
function skillOnPreCombat(ball) {
  if (!ball.skills || ball.skills.length === 0) return;

  // Passive skills: handled by .always-active CSS class set in buildHUD() — no flash needed here.

  // Flash pre-combat skills (they arm themselves at round start)
  const preCombats = ['war_cry','fortify','adrenaline','predator','first_blood'];
  for (const pid of preCombats) {
    if (ball.skills.includes(pid) && SKILL_MAP[pid]) flashSkillHUD(ball, SKILL_MAP[pid]);
  }

  if (ball.skills.includes('adrenaline')) {
    ball.adrenalineUntil = (state.matchTime || 0) + 300; // 5 s × 60 fps
    spawnDamageNumber(ball.x, ball.y - ball.radius - 12, '⚡ ADRENA!', '#ffee44');
  }

  // Troll Ice: -2 SPD (= -3 maxSpd) to all opponents at round start
  if (ball.charRace === 'troll' && ball.charSubrace?.label === 'Ice Troll') {
    for (const other of state.players) {
      if (other === ball || !other.alive) continue;
      other.maxSpd     = Math.max(2, other.maxSpd - 3);
      other.baseMaxSpd = Math.max(2, other.baseMaxSpd - 3);
      spawnDamageNumber(other.x, other.y - other.radius - 14, '🧊 -2 SPD', '#88ccff');
    }
  }

  // Predator: check HP once at round start — lock in for entire round
  if (ball.skills.includes('predator')) {
    const enemies = state.players.filter(p => p !== ball && p.alive);
    const anyWeaker = enemies.some(e => e.hp < ball.hp);
    ball.skillState.predatorActive = anyWeaker;
    if (anyWeaker) {
      spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '🦅 PREDATOR!', '#ffaa33');
      flashSkillHUD(ball, SKILL_MAP['predator']);
    }
  }

  // Mind Break: if IQ > opponent's IQ → they deal less final damage this round
  if (ball.skills.includes('mind_break')) {
    for (const other of state.players) {
      if (other === ball || !other.alive) continue;
      if (ball.teamId >= 0 && ball.teamId === other.teamId) continue;
      const myIQ = ball.charIQ || 1;
      const theirIQ = other.charIQ || 1;
      if (myIQ > theirIQ) {
        const gap = myIQ - theirIQ;
        const debuff = gap * 0.03;
        other.mindBreakDebuff = Math.min((other.mindBreakDebuff || 0) + debuff, 0.60);
        spawnDamageNumber(other.x, other.y - other.radius - 14,
          `🧿 MIND BREAK -${(debuff * 100).toFixed(0)}%`, '#cc88ff');
        flashSkillHUD(ball, SKILL_MAP['mind_break']);
      }
    }
  }
}

// ── ON-HIT hook ────────────────────────────────────────────
// Called from _checkWeaponHit and resolveProjectiles when a hit lands.
function skillOnHit(attacker, defender, dmg) {
  const sk = attacker.skillState;
  if (!sk) return;

  // War Cry: consume after first successful hit
  if (sk.warCryReady) {
    sk.warCryReady = false;
    flashSkillHUD(attacker, SKILL_MAP['war_cry']);
  }

  // First Blood: stun defender on first hit
  if (sk.firstBloodReady) {
    sk.firstBloodReady = false;
    defender.weapon.spinSlowTimer = Math.max(defender.weapon.spinSlowTimer, 30);
    spawnDamageNumber(defender.x, defender.y - defender.radius - 18, 'STUNNED!', '#ff6633');
    flashSkillHUD(attacker, SKILL_MAP['first_blood']);
  }

  // Counter: consume after use (2× damage already applied in getDamage)
  if (sk.counterActive) {
    sk.counterActive = false;
    flashSkillHUD(attacker, SKILL_MAP['counter']);
  }

  // Flow State: +MA×1% max speed per consecutive hit (reset on being hit)
  if (attacker.skills.includes('flow_state')) {
    const stacks = (attacker.skillState.flowStateStacks || 0) + 1;
    attacker.skillState.flowStateStacks = stacks;
    const ma = attacker.charMA || 0;
    spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 14,
      `🌊 FLOW ×${stacks} (+${(ma * stacks).toFixed(0)}%)`, '#44ddff');
    flashSkillHUD(attacker, SKILL_MAP['flow_state']);
  }

  // Vampiric: heal 5% of damage dealt, minimum 1 HP per hit
  if (attacker.skills.includes('vampiric')) {
    const heal = Math.max(1, dmg * 0.05);
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    spawnDamageNumber(attacker.x, attacker.y - attacker.radius, '+' + heal.toFixed(1), '#88ff88');
    addBattleLog('heal', { attacker: getBallLabel(attacker), aColor: attacker.color, heal, hpAfter: +attacker.hp.toFixed(1), source: 'Vampiric' });
    flashSkillHUD(attacker, SKILL_MAP['vampiric']);
  }

  // ── Race: Human Limit Break stack + burst knockback ─────────────
  if (attacker.charRace === 'human' && attacker.rs_active) {
    attacker.rs_stacks = (attacker.rs_stacks || 0) + 1;
    // Show counter on first hit, then every 2 hits after
    if (attacker.rs_stacks <= 2 || attacker.rs_stacks % 2 === 0) {
      spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 14,
        `⚡ ×${attacker.rs_stacks}`, '#ffdd00');
    }
    // Burst knockback: launch enemy hard, then attacker backs off
    if (defender && defender.alive) {
      const dx = defender.x - attacker.x, dy = defender.y - attacker.y;
      const dist = Math.hypot(dx, dy) || 1;
      const force = 11;   // strong punch-through knockback
      defender.vx += (dx / dist) * force;
      defender.vy += (dy / dist) * force;
      spawnSparks(defender.x, defender.y, 10);
    }
    attacker.rs_lbBackoffTimer = 30;  // ~0.5s backoff before next charge
  }

  // ── Race: Orc Blood Price burst consume ──────────────────────
  if (attacker.charRace === 'orc' && attacker.raceSkillDef && attacker.rs_burstReady) {
    attacker.rs_burstReady = false;
    const healAmt = Math.round((attacker.charDUR ?? 5) * 1.2);
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
    spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 26, `🩸 BURST! +${healAmt}HP`, '#ff3333');
    spawnSparks(attacker.x, attacker.y, 10);
    addBattleLog('race_skill', { attacker: getBallLabel(attacker), aColor: attacker.color, text: `🩸 Blood Price burst!` });
  }

  // ── Race: Primordial Void Grip ────────────────────────────────
  if (typeof raceSkillOnHitDefending === 'function') raceSkillOnHitDefending(attacker, defender);
}

// ── ON-PARRY hook ──────────────────────────────────────────
// Called after a parry is resolved (collidePair).
// Both balls are passed; each may have Counter or Parry Master.
function skillOnParry(b1, b2) {
  for (const [ball, opp] of [[b1, b2], [b2, b1]]) {
    // Counter: arm the next attack for 2× damage
    if (ball.skillState && ball.skills?.includes('counter') && !ball.skillState.counterActive) {
      ball.skillState.counterActive = true;
      spawnDamageNumber(ball.x, ball.y - ball.radius, 'COUNTER!', '#ff8833');
      flashSkillHUD(ball, SKILL_MAP['counter']);
    }
    // Parry Master: no knockback for self + weapon spin ×2 for 90 frames
    if (ball.skills?.includes('parry_master')) {
      ball.weapon.spinBoostTimer = 90;
      spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '⚡ SPIN UP!', '#cc88ff');
      flashSkillHUD(ball, SKILL_MAP['parry_master']);
    }
  }
}

// ── ON-EVADE hook ──────────────────────────────────────────
// Called from takeDamage when evade roll succeeds.
function skillOnEvade(ball) {
  if (!ball.skills?.includes('shadow_step')) return;
  const a = state.arena;
  let cx, cy, r;
  if (a.type === 'circle') {
    cx = a.cx; cy = a.cy; r = a.r * 0.65;
  } else {
    cx = (a.x || 0) + (a.w || 800) / 2;
    cy = (a.y || 0) + (a.h || 800) / 2;
    r  = Math.min(a.w || 800, a.h || 800) * 0.33;
  }
  const angle = Math.random() * Math.PI * 2;
  const dist  = r * (0.2 + Math.random() * 0.8);
  ball.x = cx + Math.cos(angle) * dist;
  ball.y = cy + Math.sin(angle) * dist;
  ball.vx *= 0.3;
  ball.vy *= 0.3;
  spawnSparks(ball.x, ball.y, 14);
  spawnDamageNumber(ball.x, ball.y - ball.radius, 'SHADOW STEP!', '#cc88ff');
  flashSkillHUD(ball, SKILL_MAP['shadow_step']);
}

// ── ON-KILL hook ───────────────────────────────────────────
// Called from takeDamage when a ball's HP drops to 0.
function skillOnKill(killer, victim) {
  if (!killer || !killer.skillState) return;

  // Blood Frenzy: heal 25 HP
  if (killer.skills?.includes('blood_frenzy')) {
    killer.hp = Math.min(killer.maxHp, killer.hp + 25);
    spawnDamageNumber(killer.x, killer.y - killer.radius, '+25 HP', '#ff4466');
    addBattleLog('heal', { attacker: getBallLabel(killer), aColor: killer.color, heal: 25, hpAfter: +killer.hp.toFixed(1), source: 'Blood Frenzy' });
    flashSkillHUD(killer, SKILL_MAP['blood_frenzy']);
  }

  // Momentum: +10% speed per kill (FFA only, max 5 stacks)
  if (killer.skills?.includes('momentum') && killer.teamId < 0) {
    const stacks = killer.skillState.momentumStacks || 0;
    if (stacks < 5) {
      killer.skillState.momentumStacks = stacks + 1;
      killer.maxSpd = killer.baseMaxSpd * (1 + killer.skillState.momentumStacks * 0.10);
      spawnDamageNumber(
        killer.x, killer.y - killer.radius - 16,
        `MOMENTUM ×${killer.skillState.momentumStacks}`, '#00ddff'
      );
      flashSkillHUD(killer, SKILL_MAP['momentum']);
    }
  }
}

// ── POST-COMBAT hook ───────────────────────────────────────
// Called from showResult() for each player.
// fighter = state.fighters[i] — persists across BO3 rounds.
function skillOnPostCombat(ball, won, fighter) {
  if (!ball.skills || ball.skills.length === 0) return;

  // ── LOSER skills ───────────────────────────────────────
  if (!won) {
    // Learning: +5% damage multiplier next round
    if (ball.skills.includes('learning')) {
      fighter.learningBonus = (fighter.learningBonus || 0) + 0.05;
      spawnDamageNumber(ball.x, ball.y - ball.radius, 'LEARNING +5%', '#88aaff');
      flashSkillHUD(ball, SKILL_MAP['learning']);
    }

    // Adaptation: 20% resistance to the weapon that killed you
    if (ball.skills.includes('adaptation') && ball._killedBy?.weaponDef) {
      fighter.adaptResist = ball._killedBy.weaponDef.id;
      flashSkillHUD(ball, SKILL_MAP['adaptation']);
    }

    // Blood Mark: debuff opponents — next round they start with 80% HP
    if (ball.skills.includes('blood_mark')) {
      const ballIdx = state.players.indexOf(ball);
      state.players.forEach((other, j) => {
        if (j === ballIdx) return;
        const otherFi = state.fighters[j];
        if (!otherFi) return;
        const isOpponent = ball.teamId < 0 || ball.teamId !== other.teamId;
        if (isOpponent) {
          otherFi.bloodMarked = true;
          spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '🩸 BLOOD MARK!', '#cc0000');
          flashSkillHUD(ball, SKILL_MAP['blood_mark']);
        }
      });
    }
  }

  // ── WINNER skills ──────────────────────────────────────
  if (won) {
    const hpPct = ball.hp / ball.maxHp;

    // Survivor: win with < 20% HP → +10 max HP permanently
    if (ball.skills.includes('survivor') && hpPct < 0.20) {
      fighter.survivorHPBonus = (fighter.survivorHPBonus || 0) + 10;
      spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '🩹 +10 MAX HP!', '#ff6688');
      flashSkillHUD(ball, SKILL_MAP['survivor']);
    }

    // Veteran: win → +1 random stat (no cap)
    if (ball.skills.includes('veteran')) {
      const stats = ['STR', 'SPD', 'IQ', 'BIQ', 'MA'];
      const chosen = stats[Math.floor(Math.random() * stats.length)];
      fighter.veteranStats = fighter.veteranStats || {};
      fighter.veteranStats[chosen] = (fighter.veteranStats[chosen] || 0) + 1;
      spawnDamageNumber(ball.x, ball.y - ball.radius - 14, `🏅 +1 ${chosen}!`, '#ffcc44');
      flashSkillHUD(ball, SKILL_MAP['veteran']);
    }

    // Mastery: win with < 50% HP → MA×3% chance +1 dmg (melee) or +1 proj start (ranged)
    if (ball.skills.includes('mastery') && hpPct < 0.50) {
      const chance = (ball.charMA ?? 5) * 0.03;
      if (Math.random() < chance) {
        const isRanged = ball.weaponDef?.aiType === 'ranged';
        if (isRanged) {
          fighter.masteryProjBonus = (fighter.masteryProjBonus || 0) + 1;
          spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '🌙 +1 PROJ!', '#cc88ff');
        } else {
          fighter.masteryDmgBonus = (fighter.masteryDmgBonus || 0) + 1;
          spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '🌙 +1 DMG!', '#cc88ff');
        }
        flashSkillHUD(ball, SKILL_MAP['mastery']);
      }
    }

    // Perfectionist: >80% HP → next round +15% dmg; ≤80% HP → -10% dmg
    if (ball.skills.includes('perfectionist')) {
      fighter.perfMult = hpPct > 0.80 ? 1.15 : 0.90;
      const label = hpPct > 0.80 ? '💎 PERFECT +15%!' : '💎 NOT PERF -10%';
      const col   = hpPct > 0.80 ? '#aaffcc' : '#ff8866';
      spawnDamageNumber(ball.x, ball.y - ball.radius - 14, label, col);
      flashSkillHUD(ball, SKILL_MAP['perfectionist']);
    }

    // Copycat: BIQ×3.5% chance to learn 1 random skill from an opponent
    if (ball.skills.includes('copycat')) {
      const chance = (ball.charBIQ ?? 5) * 0.035;
      const candidateSkills = [...new Set(
        state.players.flatMap(other => {
          if (other === ball) return [];
          const isOpponent = ball.teamId < 0 || ball.teamId !== other.teamId;
          if (!isOpponent || !other.skills) return [];
          return other.skills.filter(sid => !ball.skills.includes(sid));
        })
      )];
      if (candidateSkills.length > 0) {
        const success = Math.random() < chance;
        const learned = success
          ? candidateSkills[Math.floor(Math.random() * candidateSkills.length)]
          : null;
        const inTournament = state.tournament || state.tournament2v2 || state.championship;
        if (inTournament) {
          // Store for Copycat Wheel — applied after wheel spin
          fighter._copycatWheel = { candidates: candidateSkills, result: learned };
        } else if (learned) {
          // Non-tournament: apply directly
          fighter.copycatSkill = learned;
          spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '🎭 COPYCAT!', '#ffaaff');
          flashSkillHUD(ball, SKILL_MAP['copycat']);
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// RACE SKILLS — unique active abilities, auto-assigned by race
// ═══════════════════════════════════════════════════════════════════

const RACE_SKILL_DEFS = {
  dragon:     { id:'race_flame_breath', name:'Flame Breath', icon:'🔥',
                desc:'Breathes a wide fire cone for 3s. Damage scales with STR, cone width with MA, cooldown reduced by SPD.' },
  troll:      { id:'race_net_throw',    name:'Net Throw',    icon:'🕸️',
                desc:'Hurls a net at the nearest foe. Cooldown 6–10s by SPD (miss = 70% cooldown). Trap duration 2–3.5s scales with BIQ.' },
  primordial: { id:'race_void_grip',    name:'Void Grip',    icon:'🌌',
                desc:'Melee weapons that strike this Primordial may get stuck in the void. Chance scales with BIQ, duration with MA.' },
  human:      { id:'race_limit_break',  name:'Limit Break',  icon:'⚡',
                desc:'Triggers once when HP drops below 80%. Lasts until end of match. Each hit stacks +15% damage. Charge mode — no retreat.' },
  angel:      { id:'race_smite',        name:'Smite',        icon:'✨',
                desc:'Calls divine lightning on the nearest foe every 15s. Deals damage + stuns. Scales with IQ & MA.' },
  dwarf:      { id:'race_master_forge', name:'FORGE!', icon:'⚒️',
                desc:'Passive: every 10s, weapon is forged with a random upgrade. Upgrades stack across rounds. Forge speed scales with DUR.' },
  orc:        { id:'race_blood_price',  name:'Blood Price', icon:'🩸',
                desc:'Passive: each hit taken adds 1 Bloodlust stack (max 5). At 5 stacks, next attack bursts for bonus damage and heals. Burst damage scales with STR, heal with DUR.' },
  giant:      { id:'race_quake',        name:'Quake', icon:'🌍',
                desc:'Every ~25s, stomps the ground — shockwave pushes ALL enemies away with massive knockback. Close enemies also take damage. Force and damage scale with STR, cooldown reduced by DUR.' },
};

function getRaceSkillDef(race) { return RACE_SKILL_DEFS[race] ?? null; }

// Called from setup.js after Ball is constructed
function initRaceSkillState(ball) {
  const race = ball.charRace;
  ball.raceSkillDef = RACE_SKILL_DEFS[race] ?? null;
  if (!ball.raceSkillDef) return;
  const spd = ball.charSPD ?? 5;
  const str = ball.charSTR ?? 5;
  const ma  = ball.charMA  ?? 5;
  const biq = ball.charBIQ ?? 5;
  const iq  = ball.charIQ  ?? 5;

  if (race === 'dragon') {
    ball.rs_maxCooldown = Math.max(600, 1800 - spd * 40);
    ball.rs_cooldown    = 0;                              // start ready
    ball.rs_active      = false;
    ball.rs_timer       = 0;
    ball.rs_duration    = Math.round((120 + ma * 12) * 1.12); // +12% duration
    ball.rs_dmgPerFrame = 0.05 + str * 0.02;
    ball.rs_halfCone    = Math.PI / 6 + ma * 0.012;      // wider with MA
    // Sweep: amplitude ±35°(MA1) → ±50°(MA10), freq scales with IQ
    ball.rs_sweepAmp    = (35 + ma * 1.5) * (Math.PI / 180);
    ball.rs_sweepFreq   = 0.045 + iq * 0.003;            // IQ1→~2.2s/cycle, IQ10→~1.4s/cycle
    ball.rs_sweepBase   = 0;                              // locked at activation
  }
  if (race === 'troll') {
    // Cooldown: SPD=5→600f(10s), SPD=10→360f(6s) — floor 360f
    ball.rs_maxCooldown = Math.max(360, 840 - spd * 48);
    ball.rs_cooldown    = 0;
    // Trap duration: BIQ=5→120f(2s), BIQ=10→210f(3.5s) — floor 60f
    ball.rs_trapDur     = Math.max(60, 30 + biq * 18);
  }
  if (race === 'primordial') {
    ball.rs_stuckChance = Math.min(0.60, biq * 0.06);
    ball.rs_stuckDur    = 60 + ma * 15;
    ball.rs_maxCooldown = 0; // passive — no cooldown bar
  }
  if (race === 'human') {
    // Threshold trigger: fires once when HP < 20%, lasts until match end
    ball.rs_active         = false;
    ball.rs_triggered      = false;  // one-time flag — can never re-trigger
    ball.rs_stacks         = 0;
    ball.rs_maxCooldown    = 0;      // no cooldown bar; HP-threshold based
    ball.rs_lbBackoffTimer = 0;      // frames remaining in post-hit backoff phase
  }
  if (race === 'angel') {
    ball.rs_maxCooldown = Math.max(600, 900 - spd * 40);
    ball.rs_cooldown    = 0;
    ball.rs_smiteDmg    = 8 + iq * 2;
    ball.rs_smiteStun   = 60 + ma * 12;
  }
  if (race === 'orc') {
    ball.rs_stacks     = 0;       // bloodlust stacks (0–5)
    ball.rs_burstReady = false;   // true when 5 stacks reached
    ball.rs_maxCooldown = 0;      // passive — no cooldown bar
  }
  if (race === 'giant') {
    // Cooldown: STR5,DUR5→1400f(~23s); STR10,DUR10→1200f(20s)
    ball.rs_maxCooldown  = Math.max(1200, 1800 - str * 50 - (ball.charDUR ?? 5) * 30);
    ball.rs_cooldown     = ball.rs_maxCooldown; // starts on full cooldown
    ball.rs_quakeForce   = 6 + str * 1.5;      // STR5→13.5, STR10→21
    ball.rs_quakeDmg     = Math.round(str * 2); // close-range damage
    ball.rs_quakeActive  = false;
    ball.rs_quakeTimer   = 0;
    ball.rs_quakeWaveR   = 0;
  }
  if (race === 'dwarf') {
    // Forge interval: DUR5→600f(10s), DUR10→480f(8s)
    ball.rs_maxCooldown       = Math.max(420, 720 - (ball.charDUR ?? 5) * 24);
    ball.rs_cooldown          = ball.rs_maxCooldown; // start counting down immediately
    ball.rs_forgeLevel        = 0;   // total upgrades across rounds
    ball.rs_forgeSizeBonus    = 0;   // melee: extra hit threshold radius
    ball.rs_forgeParryBonus   = 0;   // melee: extra parry detection radius
    ball.rs_forgeSharpness    = 0;   // both: +5% dmg per stack
    ball.rs_forgeProjSizeBonus  = 0; // ranged: extra projectile radius
    ball.rs_forgeProjSpeedBonus = 0; // ranged: extra projectile speed
    ball.rs_forgeFlash        = 0;   // visual flash timer after each forge
  }
}

// Called every frame for ALL alive balls (regardless of race skill).
// Must run outside updateRaceSkills so non-race-skill balls (goblin, human…)
// are also processed — updateRaceSkills early-returns for them.
function updateVoidGripPhysics(ball) {
  if (!ball.alive || !(ball.rs_weaponStuck > 0)) return;

  ball.rs_weaponStuck--;
  const tgt = ball.rs_stuckTarget;

  if (tgt && tgt.alive) {
    // Prevent stuck attacker from dealing damage — keep weapon on permanent cooldown
    ball.weapon.cooldown = ball.weapon.attackCooldown || 30;

    // World position of the stuck point (moves rigidly with Primordial)
    const wpx = tgt.x + ball.rs_stuckLocalX;
    const wpy = tgt.y + ball.rs_stuckLocalY;

    // Lock attacker position: stay at weaponLength from stuck point, original direction
    ball.x = wpx + Math.cos(ball.rs_stuckBallAngle) * ball.rs_stuckWeaponLen;
    ball.y = wpy + Math.sin(ball.rs_stuckBallAngle) * ball.rs_stuckWeaponLen;

    // Clamp stuck ball to arena bounds so it never gets dragged out-of-bounds
    if (state.arena) clampToBall(ball, state.arena);

    // Lock weapon angle to point from ball → stuck point (re-compute after clamp)
    ball.weapon.angle = Math.atan2(wpy - ball.y, wpx - ball.x);

    // Zero attacker velocity (completely pinned — dragged by Primordial, not own physics)
    ball.vx = 0; ball.vy = 0;
  }

  // Release when timer expires OR Primordial died
  if (ball.rs_weaponStuck === 0 || !tgt?.alive) {
    ball.rs_weaponStuck = 0;
    if (ball.rs_savedMaxSpd != null) {
      ball.maxSpd = ball.rs_savedMaxSpd;
      ball.rs_savedMaxSpd = null;
    }
    ball.rs_stuckTarget = null;
    // Launch-away impulse on release so it doesn't just freeze in place
    const ang = Math.random() * Math.PI * 2;
    ball.vx = Math.cos(ang) * 4;
    ball.vy = Math.sin(ang) * 4;
  }
}

// ── Dwarf: apply one random forge upgrade ─────────────────────
function _dwarfForge(ball) {
  const isRanged = ball.weaponDef?.aiType === 'ranged';
  let upgradeName, upgradeIcon;

  if (isRanged) {
    const roll = Math.random();
    if (roll < 0.25) {
      ball.rs_forgeProjSizeBonus = (ball.rs_forgeProjSizeBonus || 0) + 2;
      upgradeName = 'Heavy Ammo'; upgradeIcon = '🏹';
    } else if (roll < 0.50) {
      ball.rs_forgeSharpness = (ball.rs_forgeSharpness || 0) + 1;
      upgradeName = 'Sharp Tip'; upgradeIcon = '✨';
    } else if (roll < 0.75) {
      ball.rs_forgeProjSpeedBonus = (ball.rs_forgeProjSpeedBonus || 0) + 0.8;
      upgradeName = 'Swift Flight'; upgradeIcon = '💨';
    } else {
      ball.critChance = Math.min(0.85, (ball.critChance || 0) + 0.03);
      upgradeName = 'Keen Eye'; upgradeIcon = '🎯';
    }
  } else {
    const roll = Math.random();
    if (roll < 0.34) {
      ball.rs_forgeSizeBonus = (ball.rs_forgeSizeBonus || 0) + 4;
      upgradeName = 'Bigger Blade'; upgradeIcon = '⚔️';
    } else if (roll < 0.67) {
      ball.rs_forgeSharpness = (ball.rs_forgeSharpness || 0) + 1;
      upgradeName = 'Sharpness'; upgradeIcon = '✨';
    } else {
      ball.rs_forgeParryBonus = (ball.rs_forgeParryBonus || 0) + 6;
      upgradeName = 'Tempered Edge'; upgradeIcon = '🛡️';
    }
  }

  ball.rs_forgeLevel = (ball.rs_forgeLevel || 0) + 1;
  ball.rs_forgeFlash = 55;
  spawnDamageNumber(ball.x, ball.y - ball.radius - 22,
    `${upgradeIcon} ${upgradeName}!`, '#f0c040');
  addBattleLog('race_skill', { attacker: getBallLabel(ball), aColor: ball.color,
    text: `⚒️ Forge Lv.${ball.rs_forgeLevel}: ${upgradeIcon} ${upgradeName}` });
}

// Called every frame from game-loop step() for each ball
function updateRaceSkills(ball, players, rstate) {
  if (!ball.alive) return;
  const speedMul = (typeof state !== 'undefined' && state.speed > 0) ? state.speed : 1;

  // These effects can be applied to ANY ball by other races' skills — must run regardless of own raceSkillDef
  if (ball.netTrapped > 0) {
    // Decrement by state.speed so trap lasts the same real-time regardless of game speed
    ball.netTrapped = Math.max(0, ball.netTrapped - speedMul);
    // Cap speed to near-zero (don't multiply-to-zero — ball needs some residual velocity to escape when released)
    const netSpd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (netSpd > 0.25) { ball.vx = ball.vx / netSpd * 0.25; ball.vy = ball.vy / netSpd * 0.25; }
    // Release impulse when trap just expired — ball has no AI steering so needs a kick to start moving
    if (ball.netTrapped === 0) {
      const ang = Math.random() * Math.PI * 2;
      const relSpd = (ball.maxSpd || 3) * 0.55;
      ball.vx = Math.cos(ang) * relSpd;
      ball.vy = Math.sin(ang) * relSpd;
    }
  }
  if (ball.stunTimer  > 0) ball.stunTimer--;

  if (!ball.raceSkillDef) return;
  const race = ball.charRace;

  // Tick race-specific cooldown
  if (ball.rs_cooldown > 0) ball.rs_cooldown--;

  // Tick Quake wall-slam window
  if (ball.quakeSlamFrames > 0) ball.quakeSlamFrames--;

  // Human Limit Break trigger is in takeDamage() (ball.js) — fires mid-frame when HP crosses 80%

  const enemies = players.filter(p => p !== ball && p.alive);
  if (!enemies.length) return;
  const nearest = enemies.reduce((a,b) =>
    Math.hypot(ball.x-a.x,ball.y-a.y) < Math.hypot(ball.x-b.x,ball.y-b.y) ? a : b);

  // ── DRAGON: Flame Breath ─────────────────────────────────────
  if (race === 'dragon') {
    if (ball.rs_active) {
      ball.rs_timer--;
      ball.rs_flameTick = (ball.rs_flameTick || 0) + 1;
      // Sweep free: oscillate around locked mouth direction
      const coneAng = ball.rs_sweepBase
        + Math.sin(ball.rs_flameTick * ball.rs_sweepFreq) * ball.rs_sweepAmp;
      const coneLen = 80 + ball.rs_duration * 0.25;

      // Deal damage every 20 frames (≈0.33s per tick), using separate flameImmunity
      if (ball.rs_flameTick % 20 === 0) {
        const flameDmg = (ball.charSTR ?? 5) * 3;   // STR5 → 15 per tick, STR10 → 30
        for (const en of enemies) {
          if (!en.alive) continue;
          if ((en.flameImmunity || 0) > 0) continue; // separate from weapon immunityFrames
          const dx = en.x - ball.x, dy = en.y - ball.y;
          if (Math.hypot(dx, dy) > coneLen + en.radius) continue;
          let diff = Math.atan2(dy, dx) - coneAng;
          while (diff >  Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          if (Math.abs(diff) < ball.rs_halfCone + 0.15) {
            en.hp = Math.max(0, en.hp - flameDmg);
            en.flameImmunity = 18;   // per-enemy, doesn't block regular weapon hits
            en.hitFlash = 6;
            ball.stats.damageDone += flameDmg;
            spawnDamageNumber(en.x, en.y - en.radius - 14, `-${flameDmg} 🔥`, '#ff8800');
            addBattleLog('hit', {
              attacker: getBallLabel(ball), aColor: ball.color,
              defender: getBallLabel(en),  dColor: en.color,
              dmg: flameDmg, weapon: 'Flame Breath', isCrit: false
            });
            if (en.hp <= 0 && en.alive) { en.alive = false; skillOnKill(ball, en); }
          }
        }
      }
      // Tick down per-enemy flame immunity (separate from weapon immunityFrames)
      for (const en of enemies) {
        if ((en.flameImmunity || 0) > 0) en.flameImmunity--;
      }

      if (ball.rs_timer <= 0) {
        ball.rs_active    = false;
        ball.rs_flameTick = 0;
        ball.rs_cooldown  = ball.rs_maxCooldown;
      }
    } else if (ball.rs_cooldown === 0) {
      ball.rs_active    = true;
      ball.rs_timer     = ball.rs_duration;
      ball.rs_flameTick = 0;
      ball.rs_sweepBase = ball.weapon.angle; // lock facing direction at activation
      spawnDamageNumber(ball.x, ball.y - ball.radius - 22, '🔥 FLAME BREATH!', '#ff6600');
      addBattleLog('race_skill', { attacker: getBallLabel(ball), aColor: ball.color, text: '🔥 Flame Breath!' });
    }
  }

  // ── HUMAN: Limit Break AI movement (runs every frame while active) ──
  if (race === 'human' && ball.rs_active && nearest) {
    const dx   = nearest.x - ball.x;
    const dy   = nearest.y - ball.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx   = dx / dist;
    const ny   = dy / dist;
    const isRanged = ball.weaponDef?.id === 'bow' || ball.weaponDef?.id === 'shuriken';

    if (!isRanged) {
      // Decrement backoff timer
      if (ball.rs_lbBackoffTimer > 0) ball.rs_lbBackoffTimer--;

      if (ball.rs_lbBackoffTimer > 0) {
        // Backoff phase: dash AWAY from enemy after landing a hit
        ball.vx = -nx * ball.maxSpd * 1.8;
        ball.vy = -ny * ball.maxSpd * 1.8;
      } else {
        // Charge phase: full-speed lunge at enemy
        ball.vx = nx * ball.maxSpd * 2.5;
        ball.vy = ny * ball.maxSpd * 2.5;
      }
      // Soft-aim: nudge weapon toward enemy in both phases
      const targetAngle = Math.atan2(dy, dx);
      let aimDiff = targetAngle - ball.weapon.angle;
      while (aimDiff >  Math.PI) aimDiff -= Math.PI * 2;
      while (aimDiff < -Math.PI) aimDiff += Math.PI * 2;
      ball.weapon.angle += Math.sign(aimDiff) * Math.min(Math.abs(aimDiff), 0.09);
    } else {
      // Ranged: kite at ideal 250px, snap aim on target
      const idealDist = 250, deadZone = 60;
      const kiteSpd   = ball.maxSpd * 1.2;
      let targetVx = 0, targetVy = 0;
      if (dist > idealDist + deadZone)       { targetVx =  nx * kiteSpd; targetVy =  ny * kiteSpd; }
      else if (dist < idealDist - deadZone)  { targetVx = -nx * kiteSpd; targetVy = -ny * kiteSpd; }
      ball.vx += (targetVx - ball.vx) * 0.07;
      ball.vy += (targetVy - ball.vy) * 0.07;
      ball.weapon.angle = Math.atan2(dy, dx);
    }
  }

  // ── GIANT: Quake ─────────────────────────────────────────────
  if (race === 'giant') {
    if (ball.rs_quakeTimer > 0) {
      ball.rs_quakeTimer--;
      ball.rs_quakeWaveR = (1 - ball.rs_quakeTimer / 30) * 360; // expand 0→360
    }
    if (ball.rs_cooldown === 0) {
      ball.rs_quakeActive = true;
      ball.rs_quakeTimer  = 30;
      ball.rs_quakeWaveR  = 0;
      ball.rs_cooldown    = ball.rs_maxCooldown;
      spawnDamageNumber(ball.x, ball.y - ball.radius - 22, '🌍 QUAKE!', '#cc9944');
      addBattleLog('race_skill', { attacker: getBallLabel(ball), aColor: ball.color, text: '🌍 Quake!' });
      // Apply shockwave to all enemies
      for (const en of players) {
        if (!en.alive || en === ball) continue;
        const dx   = en.x - ball.x, dy = en.y - ball.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx   = dx / dist, ny = dy / dist;
        const falloff = Math.max(0.1, 1 - dist / 380);
        const force   = ball.rs_quakeForce * falloff;
        en.vx += nx * force;
        en.vy += ny * force;
        // Close-range damage (within 160px)
        if (dist < 160) {
          en.takeDamage(ball.rs_quakeDmg, ball.x, ball.y, false, ball);
          spawnDamageNumber(en.x, en.y - en.radius - 14, `🌍 -${ball.rs_quakeDmg}`, '#bb8833');
        }
        // Tag for wall slam (60 frame window ~1s)
        en.quakeSlamFrames = 60;
        en.quakeSlamGiant  = ball;
      }
      spawnSparks(ball.x, ball.y, 20);
    }
    if (ball.rs_quakeTimer <= 0) ball.rs_quakeActive = false;
  }

  // ── DWARF: Master Forge ───────────────────────────────────────
  if (race === 'dwarf' && ball.raceSkillDef) {
    if (ball.rs_forgeFlash > 0) ball.rs_forgeFlash -= speedMul;
    if (ball.rs_cooldown <= 0) {
      _dwarfForge(ball);
      ball.rs_cooldown = ball.rs_maxCooldown;
    }
  }

  // ── ANGEL: Smite ─────────────────────────────────────────────
  if (race === 'angel' && ball.rs_cooldown === 0) {
    ball.rs_cooldown = ball.rs_maxCooldown;
    rstate.smiteEffects = rstate.smiteEffects || [];
    rstate.smiteEffects.push({
      castX: nearest.x, castY: nearest.y,   // locked cast-time coords (visual origin reference)
      target: nearest,
      timer: 60, maxTimer: 60,
      dmg: ball.rs_smiteDmg, stunDur: ball.rs_smiteStun,
      caster: ball, hit: false,
    });
    spawnDamageNumber(nearest.x, nearest.y - nearest.radius - 22, '✨ SMITE!', '#ffffaa');
    addBattleLog('race_skill', { attacker: getBallLabel(ball), aColor: ball.color,
      text: `✨ Smite → ${getBallLabel(nearest)}` });
  }
}

// Called once per step() to update troll nets + smite effects
function updateRaceSkillProjectiles(rstate) {
  const players = rstate.players;

  // ── Troll Nets ────────────────────────────────────────────────
  rstate.trollNets = rstate.trollNets || [];

  // Spawn new nets
  for (const ball of players) {
    if (!ball.alive || ball.charRace !== 'troll' || !ball.raceSkillDef) continue;
    if (ball.rs_cooldown > 0) continue;
    const enemies = players.filter(p => p !== ball && p.alive);
    if (!enemies.length) continue;
    const target = enemies.reduce((a,b) =>
      Math.hypot(ball.x-a.x,ball.y-a.y) < Math.hypot(ball.x-b.x,ball.y-b.y) ? a : b);
    const dx = target.x - ball.x, dy = target.y - ball.y;
    const dist = Math.hypot(dx,dy) || 1;
    rstate.trollNets.push({
      x: ball.x, y: ball.y,
      startX: ball.x, startY: ball.y,
      vx: (dx/dist)*7, vy: (dy/dist)*7,
      caster: ball, trapDur: ball.rs_trapDur,
      life: 160, r: 10, angle: 0,
    });
    ball.rs_cooldown = ball.rs_maxCooldown;
    addBattleLog('race_skill', { attacker: getBallLabel(ball), aColor: ball.color, text: '🕸️ Net thrown!' });
  }

  // Move + hit-check nets
  for (let i = rstate.trollNets.length - 1; i >= 0; i--) {
    const net = rstate.trollNets[i];
    net.x += net.vx; net.y += net.vy; net.life--;
    // Grow hitbox + visual as it travels — farther = bigger net
    const traveled = Math.hypot(net.x - net.startX, net.y - net.startY);
    net.r = 10 + traveled * 0.032;   // ~10px at origin → ~30px at 600px range
    net.angle = (net.angle || 0) + 0.08; // slow spin for visual flair
    let hit = false;
    for (const p of players) {
      if (!p.alive || p === net.caster) continue;
      if (Math.hypot(p.x - net.x, p.y - net.y) < p.radius + net.r) {
        p.netTrapped = net.trapDur;
        spawnDamageNumber(p.x, p.y - p.radius - 22, '🕸️ TRAPPED!', '#ccaa55');
        spawnSparks(p.x, p.y, 8);
        addBattleLog('race_skill', { attacker: getBallLabel(net.caster), aColor: net.caster.color,
          text: `🕸️ Net trapped ${getBallLabel(p)}!` });
        hit = true; break;
      }
    }
    if (hit || net.life <= 0) {
      // Miss penalty: only 70% of full cooldown (minus flight time already elapsed)
      if (!hit && net.caster.alive) {
        const missCD = Math.max(0, Math.round(net.caster.rs_maxCooldown * 0.70) - 120);
        net.caster.rs_cooldown = missCD;
        addBattleLog('race_skill', { attacker: getBallLabel(net.caster), aColor: net.caster.color,
          text: '🕸️ Net missed!' });
      }
      rstate.trollNets.splice(i, 1);
    }
  }

  // ── Smite Effects ─────────────────────────────────────────────
  rstate.smiteEffects = rstate.smiteEffects || [];
  for (let i = rstate.smiteEffects.length - 1; i >= 0; i--) {
    const s = rstate.smiteEffects[i];
    s.timer--;
    if (!s.hit && s.timer <= Math.floor(s.maxTimer * 0.45)) {
      s.hit = true;
      if (s.target.alive) {
        // Distance check: if target moved more than 2.5× their radius from cast point → miss
        const ex = s.target.x, ey = s.target.y;
        const driftDx = ex - s.castX, driftDy = ey - s.castY;
        const drift = Math.sqrt(driftDx*driftDx + driftDy*driftDy);
        const missThreshold = s.target.radius * 2.5 + 30;
        if (drift > missThreshold) {
          // Bolt fizzles — show miss visual at current target pos
          spawnDamageNumber(ex, ey - s.target.radius - 16, '✨ miss!', '#aaaaaa');
          spawnSparks(ex, ey, 5);
          addBattleLog('race_skill', { attacker: getBallLabel(s.caster), aColor: s.caster.color,
            text: `✨ Smite missed ${getBallLabel(s.target)} (dodged)` });
        } else {
          s.target.hp = Math.max(0, s.target.hp - s.dmg);
          s.target.stunTimer = s.stunDur;
          s.target.hitFlash  = 20;
          s.caster.stats.damageDone += s.dmg;
          spawnDamageNumber(ex, ey - s.target.radius - 16,
            `⚡ -${s.dmg.toFixed(0)}`, '#ffffaa');
          spawnSparks(ex, ey, 14);
          addBattleLog('race_skill', { attacker: getBallLabel(s.caster), aColor: s.caster.color,
            text: `✨ Smite hit ${getBallLabel(s.target)} for ${s.dmg.toFixed(0)}!` });
          if (s.target.hp <= 0 && s.target.alive) {
            s.target.alive = false; skillOnKill(s.caster, s.target);
          }
        }
      }
    }
    if (s.timer <= 0) rstate.smiteEffects.splice(i, 1);
  }
}

// Called from skillOnHit when a melee weapon hits a Primordial
function raceSkillOnHitDefending(attacker, defender) {
  if (defender.charRace !== 'primordial' || !defender.raceSkillDef) return;
  const melee = ['fists','sword','dagger','spear','scythe','hammer'];
  if (!melee.includes(attacker.weapon?.id)) return;
  if (attacker.rs_weaponStuck > 0) return; // already stuck

  // Guard: verify weapon tip is physically near the Primordial
  // Filters out projectile hits (skillOnHit fires for both melee + projectile)
  const L    = attacker.getWeaponLength ? attacker.getWeaponLength() : (attacker.radius + 30);
  const tipX = attacker.x + Math.cos(attacker.weapon.angle) * L;
  const tipY = attacker.y + Math.sin(attacker.weapon.angle) * L;
  if (Math.hypot(tipX - defender.x, tipY - defender.y) > defender.radius + 18) return;

  if (Math.random() < (defender.rs_stuckChance || 0)) {
    // Calculate weapon tip position at moment of contact
    const L = attacker.getWeaponLength ? attacker.getWeaponLength()
                                       : (attacker.radius + 30);
    const tipX = attacker.x + Math.cos(attacker.weapon.angle) * L;
    const tipY = attacker.y + Math.sin(attacker.weapon.angle) * L;

    attacker.rs_weaponStuck    = defender.rs_stuckDur || 90;
    attacker.rs_stuckTarget    = defender;
    // Offset from Primordial center → contact point (rigid, moves with Primordial)
    attacker.rs_stuckLocalX    = tipX - defender.x;
    attacker.rs_stuckLocalY    = tipY - defender.y;
    // Weapon length (distance ball → tip)
    attacker.rs_stuckWeaponLen = L;
    // Angle from tip → ball (opposite of weapon.angle, used to reposition ball)
    attacker.rs_stuckBallAngle = Math.atan2(attacker.y - tipY, attacker.x - tipX);
    // Save and cap max speed
    attacker.rs_savedMaxSpd    = attacker.maxSpd;
    attacker.maxSpd            = 0;  // completely pinned

    spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 22,
      '🌌 WEAPON STUCK!', '#cc88ff');
    addBattleLog('race_skill', { attacker: getBallLabel(defender), aColor: defender.color,
      text: `🌌 Void Grip: ${getBallLabel(attacker)} weapon stuck!` });
  }
}

// ── Draw global race skill effects on canvas ──────────────────
function drawRaceSkillEffects(ctx, rstate) {
  const t = rstate.matchTime || 0;

  // Troll nets in flight
  (rstate.trollNets || []).forEach(net => {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = '#ccaa55';
    ctx.lineWidth = Math.max(1.2, net.r * 0.10); // line dày dần theo size
    ctx.beginPath();
    ctx.arc(net.x, net.y, net.r, 0, Math.PI*2);
    ctx.stroke();
    for (let a = 0; a < Math.PI; a += Math.PI/3) {
      const ra = a + (net.angle || 0);
      ctx.beginPath();
      ctx.moveTo(net.x + Math.cos(ra)*net.r, net.y + Math.sin(ra)*net.r);
      ctx.lineTo(net.x - Math.cos(ra)*net.r, net.y - Math.sin(ra)*net.r);
      ctx.stroke();
    }
    ctx.restore();
  });

  // Giant Quake: expanding shockwave ring from each giant ball
  for (const ball of (rstate.players || [])) {
    if (ball.charRace !== 'giant' || !ball.rs_quakeActive || ball.rs_quakeTimer <= 0) continue;
    const waveR = ball.rs_quakeWaveR || 0;
    if (waveR <= 0) continue;
    const alpha = (ball.rs_quakeTimer / 30) * 0.7;   // fades as timer counts down
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#cc9944'; ctx.shadowBlur = 18;
    ctx.strokeStyle = '#ddbb44'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, waveR, 0, Math.PI * 2); ctx.stroke();
    // Second fainter outer ring
    ctx.globalAlpha = alpha * 0.35;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, waveR + 12, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Smite: telegraph warning ring + lightning bolt (tracks target)
  (rstate.smiteEffects || []).forEach(s => {
    const progress  = 1 - s.timer / s.maxTimer;           // 0→1 over lifetime
    const tx = s.target.alive ? s.target.x : s.castX;    // track live target pos
    const ty = s.target.alive ? s.target.y : s.castY;
    const tr = s.target.radius;

    // ── Phase 1: windup telegraph (0%–55%) ─────────────────────
    // Pulsing warning ring + crosshair on target so player knows bolt is coming
    if (progress < 0.55) {
      const windupT = progress / 0.55;                    // 0→1 within windup
      const pulse   = Math.sin(progress * Math.PI * 8);  // fast pulse, more urgent near strike
      const ringR   = tr + 10 + pulse * 6;
      const ringA   = 0.35 + windupT * 0.45;             // grows more opaque toward strike

      ctx.save();
      // Outer warning ring
      ctx.globalAlpha = ringA;
      ctx.shadowColor  = '#ffffaa';
      ctx.shadowBlur   = 10 + windupT * 14;
      ctx.strokeStyle  = `hsl(50, 100%, ${55 + windupT * 30}%)`;
      ctx.lineWidth    = 1.5 + windupT * 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(tx, ty, ringR, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);

      // Crosshair lines (converging toward target center)
      const crossLen = 10 + (1 - windupT) * 14;         // shrinks as strike approaches
      ctx.lineWidth = 1.2; ctx.shadowBlur = 6;
      [0, Math.PI/2, Math.PI, Math.PI*1.5].forEach(ang => {
        const ox = tx + Math.cos(ang) * (ringR + crossLen);
        const oy = ty + Math.sin(ang) * (ringR + crossLen);
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(tx + Math.cos(ang) * ringR, ty + Math.sin(ang) * ringR);
        ctx.stroke();
      });
      ctx.restore();
    }

    // ── Phase 2: lightning strike (45%–100%) ───────────────────
    if (progress >= 0.45) {
      let alpha = progress < 0.5
        ? (progress - 0.45) / 0.05        // fast fade-in over 5%
        : (1 - progress) / 0.5;           // fade-out over remaining 50%
      alpha = Math.max(0, Math.min(1, alpha));
      if (alpha < 0.01) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = '#ffffaa'; ctx.shadowBlur = 24;
      ctx.strokeStyle = '#ffffee'; ctx.lineWidth = 3 + Math.random() * 2;
      ctx.beginPath();
      const segs = 8;
      ctx.moveTo(tx, 0);
      for (let k = 1; k < segs; k++) {
        const frac = k / segs;
        ctx.lineTo(tx + (Math.random()-0.5) * 30 * (1 - frac), ty * frac);
      }
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // Inner white core
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx, ty); ctx.stroke();

      // Impact circle
      if (progress > 0.45) {
        const ir = 28 * (progress - 0.45) / 0.55;
        ctx.globalAlpha = alpha * 0.28;
        ctx.fillStyle = '#ffffaa';
        ctx.beginPath(); ctx.arc(tx, ty, ir, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  });
}

// ── Draw per-ball overlays (auras, cooldown arc, net, stuck) ──
function drawRaceSkillUI(ctx, ball) {
  if (!ball.raceSkillDef || !ball.alive) return;
  const race = ball.charRace;
  const t    = state.matchTime || 0;
  const cx = ball.x, cy = ball.y, r = ball.radius;

  // Net-trapped: crosshatch overlay on ball
  if (ball.netTrapped > 0) {
    ctx.save();
    ctx.strokeStyle = '#ccaa55'; ctx.lineWidth = 2;
    ctx.setLineDash([3,4]); ctx.globalAlpha = 0.7;
    for (let a = 0; a < Math.PI; a += Math.PI/3) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r);
      ctx.lineTo(cx - Math.cos(a)*r, cy - Math.sin(a)*r);
      ctx.stroke();
    }
    ctx.setLineDash([]); ctx.restore();
  }

  // Weapon-stuck: violet pulsing ring
  if (ball.rs_weaponStuck > 0) {
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3*Math.sin(t*0.4);
    ctx.strokeStyle = '#cc88ff'; ctx.lineWidth = 2.5;
    ctx.shadowColor = '#cc88ff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(cx, cy, r+5, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  // Primordial: permanent swirling void aura
  if (race === 'primordial') {
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.08*Math.sin(t*0.05);
    ctx.strokeStyle = '#aa88ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r+7, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  // Dragon: fire cone + pulsing glow while breathing
  if (race === 'dragon' && ball.rs_active) {
    const coneAng = ball.rs_sweepBase
      + Math.sin((ball.rs_flameTick || 0) * (ball.rs_sweepFreq || 0.06))
        * (ball.rs_sweepAmp || (40 * Math.PI / 180));
    const coneLen = 80 + ball.rs_duration * 0.25;
    const halfC   = ball.rs_halfCone || (Math.PI / 6);

    ctx.save();

    // Layer 1: wide outer haze — bleeds past cone edges, kills hard-edge feel
    const hazeG = ctx.createRadialGradient(cx, cy, r, cx, cy, coneLen * 1.08);
    hazeG.addColorStop(0,    `rgba(255, 80,  0, ${0.22 + 0.06*Math.sin(t*0.5)})`);
    hazeG.addColorStop(0.55, 'rgba(200, 40,  0, 0.10)');
    hazeG.addColorStop(1,    'rgba(100, 10,  0, 0)');
    ctx.fillStyle = hazeG;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, coneLen * 1.08, coneAng - halfC * 1.65, coneAng + halfC * 1.65);
    ctx.closePath();
    ctx.fill();

    // Layer 2: main fire body with organic (sin-perturbed) tip — no straight edges
    const grad = ctx.createRadialGradient(cx, cy, r, cx, cy, coneLen);
    grad.addColorStop(0,    `rgba(255,200, 60, ${0.78 + 0.14*Math.sin(t*0.6)})`);
    grad.addColorStop(0.35, `rgba(255,100,  0, ${0.55 + 0.10*Math.sin(t*0.5)})`);
    grad.addColorStop(0.72, 'rgba(180,  40,  0, 0.26)');
    grad.addColorStop(1,    'rgba(100,  10,  0, 0)');
    ctx.fillStyle = grad;
    const STEPS = 22;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let si = 0; si <= STEPS; si++) {
      const ang = (coneAng - halfC) + (si / STEPS) * halfC * 2;
      const wobble = 1.0
        + 0.10 * Math.sin(si * 2.3 + t * 0.07)
        + 0.05 * Math.sin(si * 5.1 + t * 0.12);
      ctx.lineTo(cx + Math.cos(ang) * coneLen * wobble,
                 cy + Math.sin(ang) * coneLen * wobble);
    }
    ctx.closePath();
    ctx.fill();

    // Layer 3: bright hot core (narrow, fades quickly — gives depth at mouth)
    const coreG = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, coneLen * 0.52);
    coreG.addColorStop(0,   `rgba(255,240,150, ${0.65 + 0.18*Math.sin(t*0.7)})`);
    coreG.addColorStop(0.5, 'rgba(255,160,  30, 0.28)');
    coreG.addColorStop(1,   'rgba(255, 60,   0, 0)');
    ctx.fillStyle = coreG;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, coneLen * 0.52, coneAng - halfC * 0.5, coneAng + halfC * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // ── Animated flame particles layer (on top of cone) ──────────
    // Clip drawing to the cone shape so particles don't bleed outside
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, coneLen + 6, coneAng - halfC, coneAng + halfC);
    ctx.closePath();
    ctx.clip();

    const NUM_FLAME = 14;
    for (let fi = 0; fi < NUM_FLAME; fi++) {
      // Each particle has its own phase so they're never in sync
      const phase    = (fi / NUM_FLAME) * Math.PI * 2;
      const tf       = t * 0.09 + phase;                          // time seed
      // Distance along cone axis — start at ball edge (r), spread to tip
      const baseDist = r + (fi / NUM_FLAME) * (coneLen - r) * 0.92;
      const dist     = baseDist + Math.sin(tf * 1.4 + fi) * 9;
      // Angular wobble — stays within ±85% of halfCone so particles clip cleanly
      const angWobble = Math.sin(tf * 1.1 + fi * 0.8) * halfC * 0.80;
      const px = cx + Math.cos(coneAng + angWobble) * dist;
      const py = cy + Math.sin(coneAng + angWobble) * dist;
      // Size: larger near mouth, smaller at tip; pulses
      const tRatio = (dist - r) / Math.max(1, coneLen - r);      // 0=near edge 1=far tip
      const sz = (6 - tRatio * 3.5) + Math.sin(tf * 2.1 + fi) * 2;
      // Alpha: fade at far end + pulse
      const alpha = (0.55 + 0.35 * Math.sin(tf * 1.7 + fi)) * (1 - tRatio * 0.6);
      // Color: yellow-white near ball → orange → deep red at tip
      const gCh = Math.floor(220 - tRatio * 190);               // 220 → 30
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.shadowColor = `rgb(255,${gCh},20)`;
      ctx.shadowBlur  = sz * 2.5;
      ctx.fillStyle   = `rgb(255,${gCh},20)`;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1, sz), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore(); // end clip

    // Ball glow
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.2*Math.sin(t*0.5);
    ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 28;
    ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r+6, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  // Orc: bloodlust stack badge + burst-ready crimson ring
  if (race === 'orc') {
    if (ball.rs_burstReady) {
      // Pulsing crimson ring — burst armed
      const pulse = 0.4 + 0.35 * Math.sin(t * 0.7);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.shadowColor = '#cc2222'; ctx.shadowBlur = 22;
      ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = pulse * 0.35;
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(cx, cy, r + 12, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    const stacks = ball.rs_stacks || 0;
    if (stacks > 0 || ball.rs_burstReady) {
      ctx.save();
      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = ball.rs_burstReady ? '#ff4444' : '#cc8888';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(ball.rs_burstReady ? '🩸 BURST' : `🩸×${stacks}`, cx, cy - r - 4);
      ctx.restore();
    }
  }

  // Giant: ready glow when quake cooldown is 0
  if (race === 'giant' && ball.rs_cooldown === 0 && ball.rs_maxCooldown > 0) {
    const pulse = 0.3 + 0.25 * Math.sin(t * 0.5);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.shadowColor = '#cc9944'; ctx.shadowBlur = 20;
    ctx.strokeStyle = '#ddbb55'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = pulse * 0.3;
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(cx, cy, r + 13, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#ddbb55';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('🌍 READY', cx, cy - r - 4);
    ctx.restore();
  }

  // Human: golden limit break glow + stack counter
  if (race === 'human' && ball.rs_active) {
    const pulse = 0.3 + 0.25 * Math.sin(t * 0.65);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 28;
    ctx.strokeStyle = '#ffee44'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.stroke();
    // Second outer ring, softer
    ctx.globalAlpha = pulse * 0.4;
    ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, r + 11, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    if (ball.rs_stacks > 0) {
      ctx.save();
      ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#ffee44';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(`⚡×${ball.rs_stacks}`, cx, cy - r - 4);
      ctx.restore();
    }
  }

  // Cooldown arc (thin arc sweeping around the ball)
  if (ball.rs_maxCooldown > 0 && ball.rs_cooldown > 0) {
    const pct = 1 - ball.rs_cooldown / ball.rs_maxCooldown;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = ball.rs_active ? '#44ff88' : '#888888';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r+3, -Math.PI/2, -Math.PI/2 + pct*Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  // Dwarf: forge flash (golden ring burst when upgrade fires) + persistent level badge
  if (race === 'dwarf') {
    if (ball.rs_forgeFlash > 0) {
      const flashAlpha = Math.min(1, ball.rs_forgeFlash / 20) * 0.9;
      ctx.save();
      ctx.globalAlpha = flashAlpha;
      ctx.strokeStyle = '#f0c040'; ctx.lineWidth = 3.5;
      ctx.shadowColor = '#f0c040'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = flashAlpha * 0.4;
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(cx, cy, r + 14, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    if ((ball.rs_forgeLevel || 0) > 0) {
      ctx.save();
      ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#f0c040';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(`⚒️×${ball.rs_forgeLevel}`, cx, cy - r - 4);
      ctx.restore();
    }
  }

  // Stun indicator
  if (ball.stunTimer > 0) {
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3*Math.sin(t*0.6);
    ctx.strokeStyle = '#ffffaa'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r+5, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }
}
