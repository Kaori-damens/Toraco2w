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
  { id: 'learning',   name: 'Learning',   icon: '📚', type: 'post_combat', desc: 'Losing a round: +5% damage next round' },
  { id: 'adaptation', name: 'Adaptation', icon: '🧬', type: 'post_combat', desc: 'Losing: gain 20% resist to killer\'s weapon type' },
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

  // Cross-round bonuses from previous rounds
  ball.skillLearningMult = 1 + (fighter.learningBonus || 0);
  ball.adaptResist       = fighter.adaptResist || null;
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
  if (won) return; // only losers get post-combat bonuses

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
}
