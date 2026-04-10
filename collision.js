// ============================================================
// COLLISION DETECTION
// ============================================================
function dist2(ax, ay, bx, by) { return (ax-bx)*(ax-bx) + (ay-by)*(ay-by); }

// collidePair: body bounce + parry + weapon hits for two specific balls
function collidePair(b1, b2) {
  if (!b1.alive || !b2.alive) return;

  // 1. Body-body bounce — proper elastic collision
  const dx = b2.x - b1.x, dy = b2.y - b1.y;
  const d = Math.sqrt(dx*dx + dy*dy);
  const minDist = b1.radius + b2.radius;
  if (d < minDist && d > 0) {
    const nx = dx/d, ny = dy/d;
    const overlap = minDist - d;
    const push = overlap * 0.52;
    b1.x -= nx * push;
    b1.y -= ny * push;
    b2.x += nx * push;
    b2.y += ny * push;
    const relVx = b2.vx - b1.vx, relVy = b2.vy - b1.vy;
    const dot = relVx*nx + relVy*ny;
    if (dot < 0) {
      const totalMass = b1.mass + b2.mass;
      const e = 1.85;
      const impulse = (e * dot) / totalMass;
      b1.vx += impulse * b2.mass * nx;
      b1.vy += impulse * b2.mass * ny;
      b2.vx -= impulse * b1.mass * nx;
      b2.vy -= impulse * b1.mass * ny;
      b1.bounceCooldown = 20;
      b2.bounceCooldown = 20;
    }
  }

  // 2. Parry check and weapon hits — skip for teammates (no friendly fire)
  if (b1.teamId >= 0 && b1.teamId === b2.teamId) return; // body bounce still happened above
  const b1Stuck = (b1.rs_weaponStuck > 0);
  const b2Stuck = (b2.rs_weaponStuck > 0);
  if (b1.weapon.parryCooldown === 0 && b2.weapon.parryCooldown === 0 && !b1Stuck && !b2Stuck) {
    const pts1 = b1.weaponDef.getHitPoints(b1);
    const pts2 = b2.weaponDef.getHitPoints(b2);
    let parryOccurred = false;
    const parryBonus1 = b1.rs_forgeParryBonus || 0;
    const parryBonus2 = b2.rs_forgeParryBonus || 0;
    for (const p1 of pts1) {
      for (const p2 of pts2) {
        const threshold = p1.r + p2.r + 6 + parryBonus1 + parryBonus2; // Dwarf: Tempered Edge
        if (dist2(p1.x, p1.y, p2.x, p2.y) < threshold*threshold) {
          const d12x = p2.x - p1.x, d12y = p2.y - p1.y;
          const d12len = Math.sqrt(d12x*d12x + d12y*d12y);
          if (d12len < 0.001) continue;
          const wDir1x = Math.cos(b1.weapon.angle), wDir1y = Math.sin(b1.weapon.angle);
          const dot1 = wDir1x*(d12x/d12len) + wDir1y*(d12y/d12len);
          const wDir2x = Math.cos(b2.weapon.angle), wDir2y = Math.sin(b2.weapon.angle);
          const dot2 = wDir2x*(-d12x/d12len) + wDir2y*(-d12y/d12len);
          if (dot1 > 0.2 && dot2 > 0.2) parryOccurred = true;
        }
      }
    }
    if (parryOccurred) {
      const midX = (b1.x + b2.x) / 2, midY = (b1.y + b2.y) / 2;
      spawnSparks(midX, midY, 14);
      sfxParry();
      const recoil = 5.5;
      const pnx = b1.x - b2.x, pny = b1.y - b2.y;
      const pnl = Math.sqrt(pnx*pnx + pny*pny);
      const b1Fists = b1.weaponDef.id === 'fists';
      const b2Fists = b2.weaponDef.id === 'fists';

      if (b1Fists && b2Fists) {
        // Fists vs Fists: both take damage + normal recoil
        if (pnl > 0) {
          b1.vx += (pnx/pnl)*recoil; b1.vy += (pny/pnl)*recoil;
          b2.vx -= (pnx/pnl)*recoil; b2.vy -= (pny/pnl)*recoil;
        }
        b1.takeDamage(b2.getDamage(), b2.x, b2.y, false, b2);
        b2.takeDamage(b1.getDamage(), b1.x, b1.y, false, b1);
        addBattleLog('parry_fists', { attacker: getBallLabel(b1), defender: getBallLabel(b2), damage: b2.getDamage(), aColor: b1.color, dColor: b2.color, defHp: +Math.max(0, b1.hp).toFixed(1) });
      } else if (b1Fists || b2Fists) {
        // Fists vs melee: fists takes damage (no knockback), other gets recoil only
        const [fistsB, otherB] = b1Fists ? [b1, b2] : [b2, b1];
        const nx = fistsB.x - otherB.x, ny = fistsB.y - otherB.y;
        const nl = Math.sqrt(nx*nx + ny*ny);
        if (nl > 0) { otherB.vx -= (nx/nl)*recoil; otherB.vy -= (ny/nl)*recoil; }
        fistsB.takeDamage(otherB.getDamage(), otherB.x, otherB.y, false, otherB);
        addBattleLog('parry_fists', { attacker: getBallLabel(fistsB), defender: getBallLabel(otherB), damage: otherB.getDamage(), aColor: fistsB.color, dColor: otherB.color, defHp: +Math.max(0, fistsB.hp).toFixed(1) });
      } else {
        // Normal parry: recoil both — Parry Master holders keep their direction
        if (pnl > 0) {
          if (!b1.skills?.includes('parry_master')) { b1.vx += (pnx/pnl)*recoil; b1.vy += (pny/pnl)*recoil; }
          if (!b2.skills?.includes('parry_master')) { b2.vx -= (pnx/pnl)*recoil; b2.vy -= (pny/pnl)*recoil; }
        }
        addBattleLog('parry', { attacker: getBallLabel(b1), defender: getBallLabel(b2), aColor: b1.color, dColor: b2.color });
      }
      b1.weapon.parryCooldown = 25;
      b2.weapon.parryCooldown = 25;
      b1.bounceCooldown = 22;
      b2.bounceCooldown = 22;
      b1.weapon.angle += Math.PI * 0.15;
      b2.weapon.angle += Math.PI * 0.15;
      b1.stats.parries++;
      b2.stats.parries++;
      // Spear parried by melee → reverse spin + 10% debuff for 60 frames
      const applySpearParry = (spearBall, otherBall) => {
        if (spearBall.weaponDef.id === 'spear' && otherBall.weaponDef.aiType === 'melee') {
          spearBall.weapon.spinDir *= -1;
          spearBall.weapon.spinDebuffTimer = 60;
        }
      };
      applySpearParry(b1, b2);
      applySpearParry(b2, b1);
      skillOnParry(b1, b2);
      return;
    }
  }

  // 3. Weapon-to-body damage
  _checkWeaponHit(b1, b2);
  _checkWeaponHit(b2, b1);
}

// resolveProjectiles: projectiles vs all alive balls (any non-owner is a valid target)
function resolveProjectiles(players, projectiles) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    if (!proj.alive || proj.immuneFrames > 0) continue;

    for (const target of players) {
      if (target === proj.owner || !target.alive) continue;
      if (proj.owner && proj.owner.teamId >= 0 && proj.owner.teamId === target.teamId) continue;

      // Blessed by Raijin: projectile evasion when momentum stacks ≥ 10
      if (target.charRace === 'god' && target.charSubrace?.label === 'Blessed by Raijin' && (target.rs_speedStacks || 0) >= 10) {
        const stacks = target.rs_speedStacks;
        // stack10=50%, stack15=75%, stack20+=100% (capped at 95 to keep fairness)
        const evadeChance = Math.min(0.95, 0.50 + (stacks - 10) * 0.05);
        if (Math.random() < evadeChance) {
          spawnDamageNumber(target.x, target.y - target.radius - 12, '⚡ TOO FAST!', '#44ccff');
          proj.alive = false;
          break;
        }
      }

      // Check weapon deflect — skip if target's weapon is stuck (Void Grip)
      if (target.rs_weaponStuck <= 0) {
        const tpts = target.weaponDef.getHitPoints(target);
        let deflected = false;
        for (const tp of tpts) {
          if (dist2(proj.x, proj.y, tp.x, tp.y) < (tp.r + proj.r) * (tp.r + proj.r)) {
            deflected = true; break;
          }
        }
        if (deflected) {
          const da = Math.atan2(proj.y - target.y, proj.x - target.x);
          const spd = Math.sqrt(proj.vx*proj.vx + proj.vy*proj.vy);
          proj.vx = Math.cos(da) * spd * 1.05;
          proj.vy = Math.sin(da) * spd * 1.05;
          proj.owner = target;
          proj.immuneFrames = target.weaponDef.id === 'fists' ? 20 : 8;
          if (target.weaponDef.id === 'fists') {
            // Fists parry ranged: take 50% damage — unless Blessed by Shiva (Martial God: no damage on parry)
            const isGodMA = target.charRace === 'god' && target.charSubrace?.label === 'Blessed by Shiva' && target.rs_maTransformed;
            if (!isGodMA) {
              target.takeDamage(proj.damage * 0.5, proj.x, proj.y, false, proj.owner, false, true);
            } else {
              spawnDamageNumber(target.x, target.y - target.radius - 12, '🥋 NO DMG!', '#ff88ff');
            }
          }
          spawnSparks(proj.x, proj.y, 5);
          sfxParry();
          break;
        }
      }

      // Check body hit
      if (dist2(proj.x, proj.y, target.x, target.y) < (proj.r + target.radius) * (proj.r + target.radius)) {
        const isCrit = Math.random() < proj.owner.critChance;
        const rageMult = (state.matchTime >= 80 * 60) ? 1.5 : 1.0;
        const baseProjDmg = proj.damage * rageMult;
        // Skill: Predator — +15% if target has less HP
        const predMult = proj.owner.skillState?.predatorActive ? 1.15 : 1;
        // Weapon skills: projectile damage multipliers
        let wSkillProjMult = 1;
        if (proj.sniperBoost) {
          wSkillProjMult *= 1.55;
          spawnDamageNumber(target.x, target.y - target.radius - 18, '🎯 SNIPE! ×1.55', '#ffdd44');
          if (typeof flashSkillHUD === 'function') flashSkillHUD(proj.owner, SKILL_MAP['sniper']);
        }
        if (proj.volleyBoost) {
          wSkillProjMult *= 2.0;
          spawnDamageNumber(target.x, target.y - target.radius - 18, '🏹 VOLLEY! ×2', '#ffaa33');
          if (typeof flashSkillHUD === 'function') flashSkillHUD(proj.owner, SKILL_MAP['volley']);
        }
        if (proj.type === 'shuriken' && (proj.bounces || 0) > 0) {
          // Bounce Damage: +15% per bounce
          if (proj.owner?.skills?.includes('bounce_damage')) {
            wSkillProjMult *= (1 + proj.bounces * 0.15);
          }
          // Ricochet Kill: +100% after 2+ bounces
          if (proj.owner?.skills?.includes('ricochet_kill') && proj.bounces >= 2) {
            wSkillProjMult *= 2.0;
            spawnDamageNumber(target.x, target.y - target.radius - 18, '⭐ RICOCHET! ×2', '#ffdd44');
            if (typeof flashSkillHUD === 'function') flashSkillHUD(proj.owner, SKILL_MAP['ricochet_kill']);
          }
        }
        const dmg = baseProjDmg * (isCrit ? proj.owner.critMult : 1) * predMult * wSkillProjMult;
        const projHit = target.takeDamage(dmg, proj.x, proj.y, isCrit, proj.owner, false, true);
        if (projHit) {
          // log
          if (isCrit) {
            addBattleLog('proj_crit', { attacker: getBallLabel(proj.owner), defender: getBallLabel(target), damage: dmg, baseDmg: +baseProjDmg.toFixed(2), critMult: proj.owner.critMult, aColor: proj.owner.color, dColor: target.color, defHp: target.hp });
          } else {
            addBattleLog('proj', { attacker: getBallLabel(proj.owner), defender: getBallLabel(target), damage: dmg, aColor: proj.owner.color, dColor: target.color, defHp: target.hp });
          }
          proj.owner.stats.hits++;
          proj.owner.stats.damageDone += dmg;
          sfxHit();
          const ka = Math.atan2(target.y - proj.y, target.x - proj.x);
          target.vx += Math.cos(ka) * 4.5;
          target.vy += Math.sin(ka) * 4.5;
          target.bounceCooldown = 14;
          proj.owner.weaponDef.onHit(proj.owner.weapon);
          skillOnHit(proj.owner, target, dmg);
        } else {
          addBattleLog('proj_evade', { attacker: getBallLabel(proj.owner), defender: getBallLabel(target), aColor: proj.owner.color, dColor: target.color });
        }
        // Piercing Shot: don't kill arrow, give target brief immunity, continue to next target
        if (proj.piercing) {
          target.projImmunityFrames = 6; // prevent double-hit same frame
          continue;
        }
        proj.alive = false;
        break;
      }
    }
  }
}

function _checkWeaponHit(attacker, defender) {
  // No friendly fire in team matches
  if (attacker.teamId >= 0 && attacker.teamId === defender.teamId) return;
  if (attacker.weapon.cooldown > 0) return;
  if (defender.immunityFrames > 0) return;
  const def = attacker.weaponDef;
  if (def.aiType === 'ranged') return; // ranged weapons don't melee-hit

  const pts = def.getHitPoints(attacker);
  const forgeSizeBonus = attacker.rs_forgeSizeBonus || 0; // Dwarf: Bigger Blade
  for (const p of pts) {
    const threshold = p.r + forgeSizeBonus + defender.radius;
    if (dist2(p.x, p.y, defender.x, defender.y) < threshold*threshold) {
      // Shadow Strike (Dagger): guaranteed crit override
      const isShadowCrit = attacker.skills?.includes('shadow_strike') && def.id === 'dagger' && attacker.skillState?.shadowStrikeCrit;
      const isCrit = isShadowCrit || Math.random() < attacker.critChance;
      const isHammer = def.id === 'hammer';
      // Hammer: final damage += knockback / 2
      const kbBonus = isHammer
        ? (def.baseKnockback + (attacker.weapon.bonusKnockback||0)) / 2
        : 0;
      const baseDmgNoCrit = attacker.getDamage() + kbBonus;
      // Skill: Predator — +15% damage when target has less HP
      const predMult = attacker.skillState?.predatorActive ? 1.15 : 1;
      // Skill: Exploit — (IQ+BIQ)×1% chance to deal double damage
      const exploitChance = attacker.skills?.includes('exploit')
        ? ((attacker.charIQ || 0) + (attacker.charBIQ || 0)) * 0.01 : 0;
      const isExploit = exploitChance > 0 && Math.random() < exploitChance;
      // Reaper's Mark (Scythe): +80% dmg vs enemies below 30% HP
      const reaperMult = (attacker.skills?.includes('reapers_mark') && def.id === 'scythe'
        && defender.hp / defender.maxHp < 0.30) ? 1.80 : 1.0;
      if (reaperMult > 1) {
        spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 18, '💀 EXECUTE! ×1.8', '#ff2222');
        if (typeof flashSkillHUD === 'function') flashSkillHUD(attacker, SKILL_MAP['reapers_mark']);
      }
      const dmg = baseDmgNoCrit * (isCrit ? attacker.critMult : 1) * predMult * (isExploit ? 2 : 1) * reaperMult;
      const hitResult = defender.takeDamage(dmg, attacker.x, attacker.y, isCrit, attacker);
      if (hitResult) {
        const rageCDMult     = (state.matchTime >= 80 * 60) ? 0.7 : 1.0;
        // Rage Fists: below 50% HP → 35% faster attacks (cooldown × 0.65)
        const rageFistsMult  = (attacker.skills?.includes('rage_fists') && def.id === 'fists'
          && attacker.hp / attacker.maxHp < 0.50) ? 0.65 : 1.0;
        // Grim Presence: within 80px of a scythe-grim-presence user → 12% longer cooldown
        const grimSlowMult   = (attacker.sk_grimAura || 0) > 0 ? 1.12 : 1.0;
        attacker.weapon.cooldown = Math.max(1, Math.floor(attacker.weapon.attackCooldown * rageCDMult * rageFistsMult * grimSlowMult));
        attacker.stats.hits++;
        attacker.stats.damageDone += dmg;
        sfxHit();
        // Battle log: hit or crit (with special types for lunge/iai)
        if (attacker.weapon?.iaiHit) {
          addBattleLog('iai', { attacker: getBallLabel(attacker), defender: getBallLabel(defender), damage: dmg, aColor: attacker.color, dColor: defender.color, defHp: +Math.max(0, defender.hp).toFixed(1) });
          attacker.weapon.iaiHit = false;
        } else if (attacker.weapon?.lungeHit) {
          addBattleLog('lunge_hit', { attacker: getBallLabel(attacker), defender: getBallLabel(defender), damage: dmg, aColor: attacker.color, dColor: defender.color, defHp: +Math.max(0, defender.hp).toFixed(1) });
          attacker.weapon.lungeHit = false;
        } else if (isCrit) {
          addBattleLog('crit', { attacker: getBallLabel(attacker), defender: getBallLabel(defender), damage: dmg, baseDmg: +baseDmgNoCrit.toFixed(2), critMult: attacker.critMult, aColor: attacker.color, dColor: defender.color, defHp: +Math.max(0, defender.hp).toFixed(1) });
        } else {
          addBattleLog('hit', { attacker: getBallLabel(attacker), defender: getBallLabel(defender), damage: dmg, aColor: attacker.color, dColor: defender.color, defHp: +Math.max(0, defender.hp).toFixed(1) });
        }
        // Exploit: flash badge + text
        if (isExploit) {
          spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 20, '💡 EXPLOIT! ×2', '#ffdd00');
          if (typeof flashSkillHUD === 'function') flashSkillHUD(attacker, SKILL_MAP['exploit']);
        }
        // Hammer slow: -30% spin speed for 1.5s (90 frames)
        if (isHammer) {
          defender.weapon.spinSlowTimer = 90;
          spawnDamageNumber(defender.x, defender.y - defender.radius - 18, 'SLOW', '#ff9933');
        }
        // Knockback — cancel defender's current velocity toward attacker first
        const ka = Math.atan2(defender.y - attacker.y, defender.x - attacker.x);
        const kb = attacker.getKnockback();
        // Remove inward velocity so knockback always sends them flying outward
        const inward = defender.vx * -Math.cos(ka) + defender.vy * -Math.sin(ka);
        if (inward > 0) { defender.vx += Math.cos(ka)*inward; defender.vy += Math.sin(ka)*inward; }
        defender.vx += Math.cos(ka) * kb * 1.4;
        defender.vy += Math.sin(ka) * kb * 1.4;
        defender.bounceCooldown = 18;   // defender AI backs off after being hit
        // Scaling
        def.onHit(attacker.weapon);
        skillOnHit(attacker, defender, dmg);
        // Blessed by Athena: Combo Chain — BIQ×5% chance to instantly reset attack cooldown
        if (attacker.charRace === 'god' && attacker.charSubrace?.label === 'Blessed by Athena') {
          const biq = attacker.charBIQ ?? 5;
          if (Math.random() < biq * 0.05) {
            attacker.weapon.cooldown = 0;
            spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 18, '⚔️ CHAIN!', '#aaffaa');
          }
        }
        // Blessed by Raijin: landing a melee hit resets momentum stacks
        if (attacker.charRace === 'god' && attacker.charSubrace?.label === 'Blessed by Raijin' && (attacker.rs_speedStacks || 0) > 0) {
          attacker.rs_speedStacks = 0;
          attacker.maxSpd = attacker.baseMaxSpd;
        }
      } else {
        // Evaded
        addBattleLog('evade', { attacker: getBallLabel(attacker), defender: getBallLabel(defender), aColor: attacker.color, dColor: defender.color });
      }
      return;
    }
  }
}
