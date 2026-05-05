// ============================================================
// ONE PIECE SKILL SYSTEM
// ============================================================
// 3 Haki skills + 7 Devil Fruits
//
// Hooks vào game:
//   opOnPreCombat(ball)               — gọi từ skillOnPreCombat
//   opOnHit(att, def, dmg)            — gọi từ skillOnHit
//   opOnPostCombat(ball, won)         — gọi từ skillOnPostCombat
//   opOnWallBounce(ball, hitX, hitY)  — gọi từ ball.js update()
//   opOnBallContact(ball, other)      — gọi từ collision.js collidePair (body + parry)
//   opToriRevive(ball)                — gọi từ ball.js takeDamage (death check)
//   opGetDamageMods(ball, dmg)        — gọi từ ball.js getDamage()
//   opArmamentDefense(ball, dmg)      — gọi từ ball.js takeDamage (after reductions)
//   opArmamentKB(ball, kb)            — gọi từ ball.js getKnockback()
//   opUpdateAll(state)                — gọi từ game-loop step()
//   opDrawEffects(ctx, state)         — gọi từ game-loop render()

// ── Constants ─────────────────────────────────────────────────
const OP_OBS_RANGE          = 200;   // px — Observation Haki weapon boost range
const OP_OBS_SPIN_BONUS     = 0.025; // extra rad/frame khi có enemy trong tầm
const OP_CONQ_RANGE         = 220;   // px — Conqueror's Haki trigger range
const OP_CONQ_STUN          = 180;   // 3s
const OP_CONQ_CD            = 900;   // 15s

const OP_GORO_DMG           = 5;     // Flat dmg khi xuyên qua enemy trong lightning mode
const OP_GORO_DURATION      = 90;    // 1.5s (90 frames) lightning mode

const OP_PIKA_CD            = 120;   // 2s cooldown giữa các lần kích hoạt
const OP_PIKA_BEAM_SPD      = 30;    // px/frame tốc độ beam ánh sáng

const OP_TORI_REGEN_INTERVAL = 120;  // 2s — 1 HP regen tick
const OP_TORI_REGEN_FAST     = 60;   // 1s nếu có cả Phoenix
const OP_TORI_REVIVE_HP_PCT  = 0.30;
const OP_TORI_SPD_BONUS      = 0.30;

const OP_MERA_DMG           = 2;     // dmg mỗi burn tick
const OP_MERA_TICK_INTERVAL = 120;   // 2s giữa mỗi tick
const OP_MERA_DURATION      = 300;   // 5s tổng

const OP_RYU_TRIGGER        = 1200;  // giây 20 (1200 frames)
const OP_RYU_SCALE          = 1.20;  // +20% size
const OP_RYU_DMG_BONUS      = 0.10;  // +10% melee dmg

const OP_HITO_SHOCKWAVE_SPD = 4;     // px/frame mở rộng
const OP_HITO_MAX_R         = 160;   // px — bán kính tối đa

const OP_NEKO_SPD_BONUS     = 0.30;  // +30% speed
const OP_NEKO_CRIT_BONUS    = 0.10;  // +10% crit chance
const OP_NEKO_BACK_ANGLE    = 110;   // degrees — ngưỡng "phía sau"

// ─────────────────────────────────────────────────────────────
// PRE-COMBAT
// ─────────────────────────────────────────────────────────────
function opOnPreCombat(ball) {
  if (!ball.skills?.length) return;

  // Observation Haki: +10% evade
  if (ball.skills.includes('op_haki_obs') && !ball._opObsApplied) {
    ball.evadeChance = (ball.evadeChance || 0) + 0.10;
    ball._opObsApplied = true;
  }

  // Neko Neko: +30% speed, +10% crit
  if (ball.skills.includes('op_fruit_neko') && !ball._opNekoApplied) {
    ball.maxSpd     = (ball.maxSpd     || 10) * (1 + OP_NEKO_SPD_BONUS);
    ball.baseMaxSpd = (ball.baseMaxSpd || 10) * (1 + OP_NEKO_SPD_BONUS);
    ball.critChance = Math.min(0.95, (ball.critChance || 0) + OP_NEKO_CRIT_BONUS);
    ball._opNekoApplied = true;
  }

  // Tori Tori: check Phoenix conflict
  if (ball.skills.includes('op_fruit_tori')) {
    ball._opToriRegenTimer  = 0;
    ball._opToriRevived     = false;
    ball._opToriFastRegen   = ball.skills.includes('phoenix');
    if (ball._opToriFastRegen) {
      // Disable Phoenix skill (flag only — Phoenix check in takeDamage won't fire)
      ball._opPhoenixDisabled = true;
      spawnDamageNumber(ball.x, ball.y - ball.radius - 20, '🐦 Phoenix → Tori Tori (regen ×2)', '#ff9900');
    }
    ball._opToriReviveHp = Math.round(ball.maxHp * OP_TORI_REVIVE_HP_PCT);
  }

  // Goro Goro: lightning mode timer init
  if (ball.skills.includes('op_fruit_goro')) {
    ball._opGoroTimer = 0;
  }

  // Pika Pika: cooldown + beam state init
  if (ball.skills.includes('op_fruit_pika')) {
    ball._opPikaCd   = 0;
    ball._opPikaBeam = null;
  }

  // Ryu Ryu: init transform flag
  if (ball.skills.includes('op_fruit_ryu')) {
    ball._opRyuTransformed = false;
  }

  // Conqueror's Haki: init cooldown
  if (ball.skills.includes('op_haki_conq')) {
    ball._opConqCd = 0;
  }
}

// ─────────────────────────────────────────────────────────────
// DAMAGE HOOKS (gọi từ ball.js)
// ─────────────────────────────────────────────────────────────

// Armament Haki: +10% offense
function opGetDamageMods(ball, dmg) {
  if (ball.skills?.includes('op_haki_arm')) dmg *= 1.10;
  if (ball._opRyuTransformed && ball.weaponDef && !ball.weaponDef.isRanged) dmg *= (1 + OP_RYU_DMG_BONUS);
  // Tori Tori: -10% dmg trước khi hoá phượng hoàng, giải sau khi revive
  if (ball.skills?.includes('op_fruit_tori') && !ball._opToriRevived) dmg *= 0.90;
  return dmg;
}

// Armament Haki: -10% defense
function opArmamentDefense(ball, dmg) {
  if (ball.skills?.includes('op_haki_arm')) dmg *= 0.90;
  return dmg;
}

// Armament Haki: +30% knockback delivered
function opArmamentKB(ball, kb) {
  if (ball.skills?.includes('op_haki_arm')) return kb * 1.30;
  return kb;
}

// ─────────────────────────────────────────────────────────────
// TORI TORI REVIVE (gọi từ ball.js takeDamage khi HP <= 0)
// ─────────────────────────────────────────────────────────────
function opToriRevive(ball) {
  if (!ball.skills?.includes('op_fruit_tori')) return false;
  if (ball._opToriRevived) return false; // chỉ 1 lần
  ball._opToriRevived = true;
  ball.hp = ball._opToriReviveHp || Math.round(ball.maxHp * OP_TORI_REVIVE_HP_PCT);
  ball.maxSpd     = (ball.baseMaxSpd || ball.maxSpd) * (1 + OP_TORI_SPD_BONUS);
  ball.evadeChance = Math.max(0, (ball.evadeChance || 0) - 0.10);
  ball.immunityFrames = 60; // 1s invincibility on revive
  if (typeof spawnDamageNumber === 'function') {
    spawnDamageNumber(ball.x, ball.y - ball.radius - 26, '🐦 TORI TORI REVIVE!', '#ff9900');
    spawnDamageNumber(ball.x, ball.y - ball.radius - 46, '🔥 Debuff cleared! +Full DMG', '#ffcc44');
  }
  if (typeof spawnSparks === 'function') spawnSparks(ball.x, ball.y, 20);
  if (typeof addBattleLog === 'function')
    addBattleLog('skill_trigger', { attacker: typeof getBallLabel === 'function' ? getBallLabel(ball) : '?',
      aColor: ball.color, text: '🐦 Tori Tori — Revival! +30% speed, -10% DMG debuff removed' });
  return true; // prevent death
}

// ─────────────────────────────────────────────────────────────
// WALL BOUNCE (gọi từ ball.js update sau khi phát hiện bounce)
// ─────────────────────────────────────────────────────────────
function opOnWallBounce(ball, wallHitX, wallHitY) {
  if (!ball.skills?.length || typeof state === 'undefined') return;

  const _CW = typeof CW !== 'undefined' ? CW : 900;
  const _CH = typeof CH !== 'undefined' ? CH : 600;

  // ── Hito Hito: shockwave trên mỗi lần nảy tường ──────────────
  if (ball.skills.includes('op_fruit_hito')) {
    state.opShockwaves = state.opShockwaves || [];
    const ma  = ball.charMA ?? 5;
    state.opShockwaves.push({
      x: ball.x, y: ball.y,
      r: ball.radius + 4,
      maxR: OP_HITO_MAX_R,
      dmg: Math.round(ma * 2),
      owner: ball,
      hit: new Set(), // balls already hit by this wave
      life: Math.round(OP_HITO_MAX_R / OP_HITO_SHOCKWAVE_SPD) + 10,
    });
    if (typeof addBattleLog === 'function')
      addBattleLog('skill_trigger', { attacker: getBallLabel(ball), aColor: ball.color,
        text: `👊 Hito Hito — shockwave! ${Math.round(ball.charMA*2)} dmg` });
  }

  // ── Pika Pika: bắt đầu beam phase ───────────────────────────
  if (ball.skills.includes('op_fruit_pika') && (ball._opPikaCd || 0) <= 0 && !ball._opPikaBeam) {
    _opPikaStartBeam(ball, wallHitX, wallHitY, _CW, _CH);
    ball._opPikaCd = OP_PIKA_CD;
  }
}

function _opPikaStartBeam(ball, wallHitX, wallHitY, _CW, _CH) {
  if (typeof state === 'undefined') return;
  const fromX = ball.x, fromY = ball.y;

  // Tính điểm đến: tường đối diện
  let toX = ball.x, toY = ball.y;
  if (wallHitX) toX = ball.x < _CW / 2 ? _CW - ball.radius - 6 : ball.radius + 6;
  if (wallHitY) toY = ball.y < _CH / 2 ? _CH - ball.radius - 6 : ball.radius + 6;

  const dx = toX - fromX, dy = toY - fromY;
  const dist = Math.hypot(dx, dy) || 1;

  // Set velocity về phía tường đối diện với tốc độ beam
  ball.vx = (dx / dist) * OP_PIKA_BEAM_SPD;
  ball.vy = (dy / dist) * OP_PIKA_BEAM_SPD;

  ball._opPikaBeam = {
    fromX, fromY, toX, toY,
    trail: [{ x: fromX, y: fromY }],
    maxFrames: Math.ceil(dist / OP_PIKA_BEAM_SPD) + 8,
    frame: 0,
    hitSet: new Set(),
  };

  if (typeof spawnDamageNumber === 'function')
    spawnDamageNumber(fromX, fromY - ball.radius - 16, '✨ Light Speed!', '#ffee44');
  if (typeof addBattleLog === 'function')
    addBattleLog('skill_trigger', { attacker: getBallLabel(ball), aColor: ball.color,
      text: '✨ Pika Pika — Light beam! Passes through enemies' });
}

// ─────────────────────────────────────────────────────────────
// ON BALL CONTACT — body va chạm hoặc parry (gọi từ collision.js)
// ─────────────────────────────────────────────────────────────
function opOnBallContact(ball, other) {
  if (!ball.skills?.includes('op_fruit_goro')) return;
  if ((ball._opGoroTimer || 0) > 0) return; // đang trong lightning mode rồi
  if (Math.random() < 0.5) {
    ball._opGoroTimer = OP_GORO_DURATION;
    if (typeof sfxLightning === 'function') sfxLightning();
    if (typeof spawnDamageNumber === 'function')
      spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '⚡ Goro!', '#ffff44');
    if (typeof addBattleLog === 'function')
      addBattleLog('skill_trigger', { attacker: getBallLabel(ball), aColor: ball.color,
        text: '⚡ Goro Goro — lightning mode! Xuyên qua kẻ thù 1.5s' });
  }
}

// ─────────────────────────────────────────────────────────────
// ON HIT (gọi từ skillOnHit)
// ─────────────────────────────────────────────────────────────
function opOnHit(attacker, defender, dmg) {
  // ── Mera Mera: apply burning stack ───────────────────────────
  if (attacker.skills?.includes('op_fruit_mera') && defender.alive) {
    defender._opMeraBurns = defender._opMeraBurns || [];
    defender._opMeraBurns.push({ timer: OP_MERA_DURATION, tickTimer: OP_MERA_TICK_INTERVAL });
    if (typeof spawnDamageNumber === 'function')
      spawnDamageNumber(defender.x, defender.y - defender.radius - 10, '🔥 Burn!', '#ff6600');
    if (typeof flashSkillHUD === 'function' && typeof SKILL_MAP !== 'undefined')
      flashSkillHUD(attacker, SKILL_MAP['op_fruit_mera']);
  }

  // ── Neko Neko: backstab → bonus dmg nếu đánh từ phía sau ────
  if (attacker.skills?.includes('op_fruit_neko') && defender.alive) {
    if (_opIsBackstab(attacker, defender)) {
      // Guarantee crit bonus: extra damage = (critMult - 1) × dmg nếu chưa crit
      const bonusDmg = Math.round(dmg * ((attacker.critMult || 2.0) - 1) * 0.5);
      if (bonusDmg > 0 && defender.takeDamage) {
        defender.takeDamage(bonusDmg, attacker.x, attacker.y, true, attacker, true);
        if (typeof spawnDamageNumber === 'function')
          spawnDamageNumber(defender.x, defender.y - defender.radius - 16, `🐆 STAB! +${bonusDmg}`, '#ffaa44');
      }
      if (typeof flashSkillHUD === 'function' && typeof SKILL_MAP !== 'undefined')
        flashSkillHUD(attacker, SKILL_MAP['op_fruit_neko']);
    }
  }
}

// Kiểm tra attacker đánh từ phía sau defender
function _opIsBackstab(attacker, defender) {
  // Phía sau = attacker ở sau lưng so với hướng di chuyển của defender
  const dvx = defender.vx, dvy = defender.vy;
  if (Math.hypot(dvx, dvy) < 0.5) return false; // defender đứng yên → không tính
  // Vector từ defender → attacker
  const dx = attacker.x - defender.x, dy = attacker.y - defender.y;
  const d  = Math.hypot(dx, dy) || 1;
  // Tính góc giữa hướng di chuyển defender và hướng tới attacker
  const dot = (dvx * dx + dvy * dy) / (Math.hypot(dvx, dvy) * d);
  const angleDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
  return angleDeg > OP_NEKO_BACK_ANGLE;
}

// ─────────────────────────────────────────────────────────────
// POST COMBAT
// ─────────────────────────────────────────────────────────────
function opOnPostCombat(ball, won) {
  // Reset per-round flags
  ball._opObsApplied  = false;
  ball._opNekoApplied = false;
  // Tori Tori revive resets each round
  ball._opToriRevived = false;
  if (ball.skills?.includes('op_fruit_tori')) {
    ball._opToriRegenTimer = 0;
  }
  // Ryu Ryu: reset transform (transform again next round at 20s)
  if (ball.skills?.includes('op_fruit_ryu') && ball._opRyuTransformed) {
    // Revert size (scale/radius were modified)
    ball.radius = Math.round(ball.radius / OP_RYU_SCALE);
    ball.scale  = (ball.scale || 1) / OP_RYU_SCALE;
    ball._opRyuTransformed = false;
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN UPDATE (60fps, gọi từ game-loop)
// ─────────────────────────────────────────────────────────────
function opUpdateAll(state) {
  state.opShockwaves = state.opShockwaves || [];

  for (const ball of (state.players || [])) {
    if (!ball.alive || !ball.skills?.length) continue;

    // ── Observation Haki: spin boost khi enemy gần ─────────────
    if (ball.skills.includes('op_haki_obs') && ball.weapon) {
      const enemies = (state.players || []).filter(p => p.alive && p !== ball);
      const nearEnemy = enemies.some(p =>
        Math.hypot(p.x - ball.x, p.y - ball.y) < OP_OBS_RANGE);
      if (nearEnemy) {
        ball.weapon.angle = (ball.weapon.angle || 0) + OP_OBS_SPIN_BONUS * (ball.weapon.speed > 0 ? 1 : -1);
      }
    }

    // ── Conqueror's Haki: stun weaker-BIQ enemies ──────────────
    if (ball.skills.includes('op_haki_conq')) {
      ball._opConqCd = (ball._opConqCd || 0);
      if (ball._opConqCd > 0) { ball._opConqCd--; }
      else {
        let triggered = false;
        for (const p of (state.players || [])) {
          if (!p.alive || p === ball) continue;
          if (Math.hypot(p.x - ball.x, p.y - ball.y) > OP_CONQ_RANGE) continue;
          if ((p.charBIQ ?? 5) < (ball.charBIQ ?? 5)) {
            if (typeof p.parryStun === 'function') p.parryStun(OP_CONQ_STUN);
            if (typeof spawnDamageNumber === 'function')
              spawnDamageNumber(p.x, p.y - p.radius - 16, '👑 CONQUEROR!', '#ffdd22');
            triggered = true;
          }
        }
        if (triggered) {
          ball._opConqCd = OP_CONQ_CD;
          if (typeof ball.shout === 'function') ball.shout('👑 Haki Bá Vương!', 150, '#ffdd22');
          if (typeof addBattleLog === 'function')
            addBattleLog('skill_trigger', { attacker: getBallLabel(ball), aColor: ball.color,
              text: '👑 Conqueror\'s Haki — weaker enemies stunned!' });
          // Spawn shockwave visual
          state.opShockwaves.push({
            x: ball.x, y: ball.y,
            r: ball.radius + 4, maxR: OP_CONQ_RANGE,
            dmg: 0, // visual only
            owner: ball, hit: new Set(),
            life: Math.round(OP_CONQ_RANGE / OP_HITO_SHOCKWAVE_SPD) + 10,
            isConq: true,
          });
        }
      }
    }

    // ── Tori Tori: HP regen ────────────────────────────────────
    if (ball.skills.includes('op_fruit_tori')) {
      ball._opToriRegenTimer = (ball._opToriRegenTimer || 0) + 1;
      const interval = ball._opToriFastRegen ? OP_TORI_REGEN_FAST : OP_TORI_REGEN_INTERVAL;
      if (ball._opToriRegenTimer >= interval) {
        ball._opToriRegenTimer = 0;
        if (ball.hp < ball.maxHp) {
          ball.hp = Math.min(ball.maxHp, ball.hp + 1);
          if (typeof spawnDamageNumber === 'function')
            spawnDamageNumber(ball.x, ball.y - ball.radius - 10, '+1 🐦', '#ff9900');
        }
      }
    }

    // ── Mera Mera: tick burns on this ball ─────────────────────
    if ((ball._opMeraBurns || []).length > 0) {
      for (let i = ball._opMeraBurns.length - 1; i >= 0; i--) {
        const burn = ball._opMeraBurns[i];
        burn.timer--;
        burn.tickTimer--;
        if (burn.tickTimer <= 0) {
          burn.tickTimer = OP_MERA_TICK_INTERVAL;
          // Find owner to credit damage
          ball.hp = Math.max(0, ball.hp - OP_MERA_DMG);
          ball.stats && (ball.stats.damageTaken = (ball.stats.damageTaken || 0) + OP_MERA_DMG);
          if (typeof spawnDamageNumber === 'function')
            spawnDamageNumber(ball.x + (Math.random()-0.5)*10, ball.y - ball.radius - 8, `🔥 -${OP_MERA_DMG}`, '#ff6600');
          if (ball.hp <= 0 && ball.alive) {
            ball.alive = false;
            ball.hp = 0;
            if (typeof spawnDeathExplosion === 'function') spawnDeathExplosion(ball.x, ball.y, ball.color);
            if (typeof sfxDeath === 'function') sfxDeath();
          }
        }
        if (burn.timer <= 0) ball._opMeraBurns.splice(i, 1);
      }
    }

    // ── Ryu Ryu: transform after 20s ──────────────────────────
    if (ball.skills.includes('op_fruit_ryu') && !ball._opRyuTransformed
        && typeof state !== 'undefined' && state.matchTime >= OP_RYU_TRIGGER) {
      ball._opRyuTransformed = true;
      ball.radius = Math.round(ball.radius * OP_RYU_SCALE);
      ball.scale  = (ball.scale || 1) * OP_RYU_SCALE;
      ball.immunityFrames = 30;
      if (typeof ball.shout === 'function') ball.shout('🦕 ALLOSAURUS!', 160, '#886600');
      if (typeof spawnSparks === 'function') spawnSparks(ball.x, ball.y, 16);
      if (typeof addBattleLog === 'function')
        addBattleLog('skill_trigger', { attacker: getBallLabel(ball), aColor: ball.color,
          text: '🦕 Ryu Ryu — Allosaurus! +20% size, +10% melee dmg, di chuyển chậm hơn' });
    }

    // ── Goro Goro: tick lightning mode timer + trail ──────────
    if (ball.skills.includes('op_fruit_goro')) {
      if ((ball._opGoroTimer || 0) > 0) {
        ball._opGoroTimer--;
        // Tích luỹ trail mỗi frame
        ball._goroTrail = ball._goroTrail || [];
        ball._goroTrail.push({ x: ball.x, y: ball.y });
        if (ball._goroTrail.length > 18) ball._goroTrail.shift();
      } else {
        ball._goroTrail = []; // xoá trail khi hết mode
      }
    }

    // ── Pika Pika: tick cooldown + manage beam ────────────────
    if (ball.skills.includes('op_fruit_pika')) {
      if ((ball._opPikaCd || 0) > 0) ball._opPikaCd--;

      if (ball._opPikaBeam) {
        const beam = ball._opPikaBeam;
        beam.frame++;

        // Tích luỹ trail
        beam.trail.push({ x: ball.x, y: ball.y });
        if (beam.trail.length > 28) beam.trail.shift();

        // Steer về phía đích (giữ velocity đúng hướng)
        const bdx = beam.toX - ball.x, bdy = beam.toY - ball.y;
        const bdist = Math.hypot(bdx, bdy);
        if (bdist > OP_PIKA_BEAM_SPD) {
          ball.vx = (bdx / bdist) * OP_PIKA_BEAM_SPD;
          ball.vy = (bdy / bdist) * OP_PIKA_BEAM_SPD;
        }

        // Check va chạm enemy — xuyên qua và gây dmg
        for (const p of (state.players || [])) {
          if (!p.alive || p === ball || beam.hitSet.has(p)) continue;
          if (ball.teamId >= 0 && ball.teamId === p.teamId) continue;
          if (Math.hypot(p.x - ball.x, p.y - ball.y) < ball.radius + p.radius + 4) {
            beam.hitSet.add(p);
            const dmg = ball.getDamage ? Math.round(ball.getDamage() * 0.70) : 5;
            if (p.takeDamage) p.takeDamage(dmg, ball.x, ball.y, false, ball, false, false);
            if (typeof spawnDamageNumber === 'function')
              spawnDamageNumber(p.x, p.y - p.radius - 16, `✨ ${dmg}`, '#ffee44');
            if (typeof spawnSparks === 'function') spawnSparks(ball.x, ball.y, 8);
            // Hoá lại thành ball ngay khi chạm enemy
            ball._opPikaBeam = null;
            // Bounce ngược lại từ enemy
            const en = (Math.hypot(ball.x - p.x, ball.y - p.y) || 1);
            ball.vx = ((ball.x - p.x) / en) * 7;
            ball.vy = ((ball.y - p.y) / en) * 7;
            break;
          }
        }

        // Kết thúc beam khi đến đích hoặc hết timer
        if (ball._opPikaBeam && (bdist <= OP_PIKA_BEAM_SPD + 6 || beam.frame >= beam.maxFrames)) {
          ball._opPikaBeam = null;
          if (typeof spawnSparks === 'function') spawnSparks(ball.x, ball.y, 10);
        }
      }
    }
  }

  // ── Hito Hito shockwaves + Conqueror visual ─────────────────
  for (let i = state.opShockwaves.length - 1; i >= 0; i--) {
    const sw = state.opShockwaves[i];
    sw.r  += OP_HITO_SHOCKWAVE_SPD;
    sw.life--;
    if (sw.life <= 0 || sw.r > sw.maxR) { state.opShockwaves.splice(i, 1); continue; }

    // Damage enemies when wave reaches them (not for Conqueror visuals)
    if (!sw.isConq && sw.dmg > 0) {
      for (const p of (state.players || [])) {
        if (!p.alive || p === sw.owner || sw.hit.has(p)) continue;
        const dist = Math.hypot(p.x - sw.x, p.y - sw.y);
        if (dist < sw.r + p.radius && dist > sw.r - OP_HITO_SHOCKWAVE_SPD * 2 - p.radius) {
          sw.hit.add(p);
          if (p.takeDamage) p.takeDamage(sw.dmg, sw.x, sw.y, false, sw.owner);
          // Knockback away from center
          const nx = (p.x - sw.x) / (dist || 1);
          const ny = (p.y - sw.y) / (dist || 1);
          p.vx += nx * 5; p.vy += ny * 5;
          if (typeof spawnDamageNumber === 'function')
            spawnDamageNumber(p.x, p.y - p.radius - 10, `👊 -${sw.dmg}`, '#ffdd44');
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// DRAW
// ─────────────────────────────────────────────────────────────
function opDrawEffects(ctx, state) {
  // Shockwaves (Hito Hito + Conqueror visual)
  for (const sw of (state.opShockwaves || [])) {
    ctx.save();
    const alpha = Math.max(0, (1 - sw.r / sw.maxR) * 0.55);
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
    ctx.strokeStyle = sw.isConq
      ? `rgba(255,221,34,${alpha})`
      : `rgba(255,200,80,${alpha})`;
    ctx.lineWidth   = sw.isConq ? 3 : 2.5;
    ctx.shadowColor = sw.isConq ? '#ffdd22' : '#ffcc44';
    ctx.shadowBlur  = 8;
    ctx.stroke();
    ctx.restore();
  }

  // Ryu Ryu: transform glow
  for (const ball of (state.players || [])) {
    if (!ball.alive || !ball._opRyuTransformed) continue;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(140,100,0,${0.4 + 0.2 * Math.sin(Date.now() * 0.005)})`;
    ctx.lineWidth   = 3;
    ctx.stroke();
    ctx.restore();
  }

  // Tori Tori: phoenix aura
  for (const ball of (state.players || [])) {
    if (!ball.alive || !ball.skills?.includes('op_fruit_tori')) continue;
    ctx.save();
    const pulse = 0.20 + 0.12 * Math.sin(Date.now() * 0.007);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,140,0,${pulse})`;
    ctx.lineWidth   = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  // Mera Mera: burning ring on targets
  for (const ball of (state.players || [])) {
    if (!ball.alive || !(ball._opMeraBurns?.length)) continue;
    ctx.save();
    const stacks = ball._opMeraBurns.length;
    const pulse  = 0.35 + 0.25 * Math.sin(Date.now() * 0.01);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius + 3 + stacks * 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,80,0,${Math.min(0.9, pulse + stacks * 0.08)})`;
    ctx.lineWidth   = 2;
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur  = 8;
    ctx.stroke();
    ctx.fillStyle   = `rgba(255,80,0,0.06)`;
    ctx.fill();
    ctx.restore();
  }

  // Armament Haki: dark steel aura
  for (const ball of (state.players || [])) {
    if (!ball.alive || !ball.skills?.includes('op_haki_arm')) continue;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(40,40,60,0.60)';
    ctx.lineWidth   = 3;
    ctx.stroke();
    ctx.restore();
  }

  // Pika Pika: beam trail + glow
  for (const ball of (state.players || [])) {
    if (!ball.alive || !ball._opPikaBeam) continue;
    const beam = ball._opPikaBeam;
    const trail = beam.trail;

    // ── Beam streak từ điểm xuất phát đến vị trí hiện tại ────
    if (trail.length > 1) {
      ctx.save();
      for (let i = 1; i < trail.length; i++) {
        const frac  = i / trail.length; // 0 = đuôi, 1 = đầu
        const alpha = frac * frac * 0.85;
        ctx.globalAlpha    = alpha;
        ctx.strokeStyle    = `hsl(${48 + frac * 12}, 100%, ${75 + frac * 20}%)`;
        ctx.lineWidth      = ball.radius * 1.6 * frac;
        ctx.lineCap        = 'round';
        ctx.shadowColor    = '#ffdd00';
        ctx.shadowBlur     = 18;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x,     trail[i].y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ── Static beam line từ fromX,fromY đến toX,toY (mờ) ─────
    ctx.save();
    ctx.globalAlpha    = 0.18;
    ctx.strokeStyle    = '#ffee88';
    ctx.lineWidth      = 3;
    ctx.setLineDash([8, 6]);
    ctx.shadowColor    = '#ffdd00';
    ctx.shadowBlur     = 10;
    ctx.beginPath();
    ctx.moveTo(beam.fromX, beam.fromY);
    ctx.lineTo(beam.toX,   beam.toY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── Glow trên ball khi đang beam ──────────────────────────
    ctx.save();
    const flicker = 0.7 + 0.3 * Math.sin(Date.now() * 0.06);
    ctx.globalAlpha = flicker * 0.75;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius + 8, 0, Math.PI * 2);
    ctx.fillStyle   = 'rgba(255, 240, 120, 1)';
    ctx.shadowColor = '#ffdd00';
    ctx.shadowBlur  = 30;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Goro Goro: lightning mode visual
  for (const ball of (state.players || [])) {
    if (!ball.alive || !(ball._opGoroTimer > 0)) continue;
    const t       = ball._opGoroTimer / OP_GORO_DURATION; // 1→0
    const now     = Date.now();
    const flicker = 0.6 + 0.4 * Math.sin(now * 0.05);
    const r       = ball.radius;

    ctx.save();

    // ── 1. Motion streak — fading trail phía sau ball ────────
    const trail = ball._goroTrail || [];
    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        const frac  = i / trail.length; // 0=đuôi cũ, 1=đầu mới
        const alpha = frac * frac * t * 0.75;
        if (alpha < 0.02) continue;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x,     trail[i].y);
        ctx.strokeStyle = `hsl(${200 + frac * 40}, 100%, ${70 + frac * 20}%)`;
        ctx.lineWidth   = r * 1.8 * frac;
        ctx.lineCap     = 'round';
        ctx.shadowColor = '#88eeff';
        ctx.shadowBlur  = 14;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // ── 2. Blue-white electric fill over ball ─────────────────
    ctx.globalAlpha = t * flicker * 0.55;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r + 3, 0, Math.PI * 2);
    ctx.fillStyle   = 'rgba(160, 230, 255, 1)';
    ctx.shadowColor = '#44ccff';
    ctx.shadowBlur  = 28;
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── 3. Electric arc lines xoay quanh ball ────────────────
    ctx.globalAlpha = t * flicker * 0.9;
    ctx.strokeStyle = 'rgba(255, 255, 220, 0.95)';
    ctx.lineWidth   = 1.8;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur  = 8;
    const spin = now * 0.008;
    for (let l = 0; l < 4; l++) {
      const baseAng = spin + (l / 4) * Math.PI * 2;
      const x0 = ball.x + Math.cos(baseAng) * r * 0.85;
      const y0 = ball.y + Math.sin(baseAng) * r * 0.85;
      const midAng = baseAng + 0.7 + Math.sin(now * 0.012 + l) * 0.4;
      const mx = ball.x + Math.cos(midAng) * r * 0.4;
      const my = ball.y + Math.sin(midAng) * r * 0.4;
      const x1 = ball.x + Math.cos(baseAng + Math.PI * 0.9) * r * 0.75;
      const y1 = ball.y + Math.sin(baseAng + Math.PI * 0.9) * r * 0.75;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(mx, my);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    // ── 4. Outer electric halo ────────────────────────────────
    ctx.globalAlpha = t * flicker * 0.5;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r + 9, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(150, 220, 255, 1)';
    ctx.lineWidth   = 3;
    ctx.shadowColor = '#aaddff';
    ctx.shadowBlur  = 20;
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
