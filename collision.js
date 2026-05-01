// ============================================================
// COLLISION DETECTION
// ============================================================
// ─── Module xử lý va chạm giữa các ball và projectile ────────────────────
// Được gọi từ game-loop.js mỗi frame trong hàm step().
// Có 3 loại va chạm chính:
//   1. collidePair(b1, b2)       — 2 ball gặp nhau: bounce thân + parry + weapon hit
//   2. resolveProjectiles(...)   — đạn bay gặp ball: deflect bằng weapon hoặc gây dame
//   3. _checkWeaponHit(a, d)     — kiểm tra vũ khí a có đánh trúng thân d không

// ─── Hàm tiện ích: khoảng cách bình phương ───────────────────────────────
// Dùng dist2 thay vì Math.hypot để tránh sqrt (nhanh hơn khi chỉ cần so sánh)
// Tham số: tọa độ 2 điểm — Trả về: bình phương khoảng cách
function dist2(ax, ay, bx, by) { return (ax-bx)*(ax-bx) + (ay-by)*(ay-by); }

// Snapshot weapon scalable fields before onHit, then log what changed
function _snapWeapon(w) {
  return {
    bonusDamage:    w.bonusDamage    ?? 0,
    bonusLength:    w.bonusLength    ?? 0,
    arrowCount:     w.arrowCount     ?? 1,
    shurikenCount:  w.shurikenCount  ?? 1,
    bonusKnockback: w.bonusKnockback ?? 0,
    spinBonus:      w.spinBonus      ?? 0,
    attackCooldown: w.attackCooldown ?? 999,
    fireInterval:   w.fireInterval   ?? Infinity,
    lanceImpulse:   w.lanceImpulse   ?? 6,
    bonusHeadRadius: w.bonusHeadRadius ?? 0, // Flail: đầu mace lớn dần theo số hit
  };
}
function _logWeaponScaleIfChanged(ball, before) {
  const w = ball.weapon, def = ball.weaponDef;
  if (!def || typeof addBattleLog !== 'function') return;
  const name = getBallLabel(ball);
  const col  = ball.color;
  const wname = def.name;
  const parts = [];
  const bd = (w.bonusDamage ?? 0) - before.bonusDamage;
  if (bd > 0.001)                                  parts.push(`+${bd.toFixed(1)} dmg`);
  const bl = (w.bonusLength ?? 0) - before.bonusLength;
  if (bl > 0.001)                                  parts.push(`+${bl.toFixed(0)} reach`);
  const ac = (w.arrowCount ?? 1) - before.arrowCount;
  if (ac > 0)                                      parts.push(`+${ac} arrow (${w.arrowCount} total)`);
  const sc = (w.shurikenCount ?? 1) - before.shurikenCount;
  if (sc > 0)                                      parts.push(`+${sc} star (${w.shurikenCount} total)`);
  const bk = (w.bonusKnockback ?? 0) - before.bonusKnockback;
  if (bk > 0.001)                                  parts.push(`+${bk.toFixed(1)} knockback`);
  const sb = (w.spinBonus ?? 0) - before.spinBonus;
  if (sb > 0.0001)                                 parts.push(`+spin`);
  const cdDiff = before.attackCooldown - (w.attackCooldown ?? 999);
  if (cdDiff > 0.5)                                parts.push(`−${cdDiff.toFixed(0)} CD`);
  const fiDiff = before.fireInterval - (w.fireInterval ?? Infinity);
  if (fiDiff > 0.5)                                parts.push(`−${fiDiff.toFixed(0)} throw CD`);
  const li = (w.lanceImpulse ?? 6) - (before.lanceImpulse ?? 6);
  if (li > 0.05)                                   parts.push(`+${li.toFixed(1)} dash`);
  if ((def.id === 'scythe' || def.baseWeapon === 'scythe') && w.hits === 15) parts.push('DUAL BLADE!');
  if (parts.length > 0) {
    addBattleLog('weapon_scale', { attacker: name, aColor: col, weapon: wname, text: parts.join(', ') });
    if (typeof spawnDamageNumber === 'function')
      spawnDamageNumber(ball.x, ball.y - ball.radius - 22, `${def.icon} ${parts.join(' ')}`, def.color || '#ffffff');
  }
}

// Parry Technique III: generate dense hit points along the full weapon length
function getFullWeaponHitPoints(ball) {
  const stdPts = ball.weaponDef.getHitPoints(ball);
  if (!stdPts || stdPts.length === 0) return stdPts;
  // Find the outermost point from ball center
  let maxDist = 0, farthest = stdPts[0];
  for (const p of stdPts) {
    const d = Math.sqrt((p.x - ball.x) * (p.x - ball.x) + (p.y - ball.y) * (p.y - ball.y));
    if (d > maxDist) { maxDist = d; farthest = p; }
  }
  const pts = [];
  const steps = Math.max(2, Math.ceil(maxDist / 8));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({ x: ball.x + (farthest.x - ball.x) * t, y: ball.y + (farthest.y - ball.y) * t, r: 5 });
  }
  return pts;
}

// ─── Xử lý va chạm giữa 2 ball cụ thể ───────────────────────────────────
// Được gọi từ game-loop.js cho mọi cặp (b1, b2) còn sống mỗi frame.
// 3 bước theo thứ tự:
//   1. Body bounce (va chạm đàn hồi)  — luôn xảy ra nếu 2 thân chồng nhau
//   2. Parry check (kiểm tra chặn)    — skip nếu cùng team
//   3. Weapon hit (đánh trúng)         — skip nếu parry xảy ra
// Nếu parry → cả 2 bị stun, hàm kết thúc (return sớm), không damage.
// collidePair: body bounce + parry + weapon hits for two specific balls
function collidePair(b1, b2) {
  if (!b1.alive || !b2.alive) return;

  // ── Bước 1: Va chạm thân đàn hồi ───────────────────────────
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

  // ── Bước 2: Kiểm tra parry (chặn) ──────────────────────────
  // 2. Parry check and weapon hits — skip for teammates (no friendly fire)
  // Parry = 2 đầu weapon chồng nhau VÀ cả 2 weapon đều hướng về phía nhau (dot product > 0)
  // Nếu parry: cả 2 bị stun 15f, return luôn — không có weapon damage bước 3
  if (b1.teamId >= 0 && b1.teamId === b2.teamId) return; // body bounce still happened above
  const b1Stuck = (b1.rs_weaponStuck > 0);
  const b2Stuck = (b2.rs_weaponStuck > 0);
  if (b1.weapon.parryCooldown === 0 && b2.weapon.parryCooldown === 0 && !b1Stuck && !b2Stuck) {
    const pts1 = b1.skills?.includes('parry_tech_3') ? getFullWeaponHitPoints(b1) : b1.weaponDef.getHitPoints(b1);
    const pts2 = b2.skills?.includes('parry_tech_3') ? getFullWeaponHitPoints(b2) : b2.weaponDef.getHitPoints(b2);
    let parryOccurred = false;
    const parryBonus1 = b1.rs_forgeParryBonus || 0;
    const parryBonus2 = b2.rs_forgeParryBonus || 0;
    for (const p1 of pts1) {
      for (const p2 of pts2) {
        const threshold = p1.r + p2.r + parryBonus1 + parryBonus2; // exact visual overlap only
        if (dist2(p1.x, p1.y, p2.x, p2.y) < threshold*threshold) {
          const d12x = p2.x - p1.x, d12y = p2.y - p1.y;
          const d12len = Math.sqrt(d12x*d12x + d12y*d12y);
          if (d12len < 0.001) continue;
          const wDir1x = Math.cos(b1.weapon.angle), wDir1y = Math.sin(b1.weapon.angle);
          const dot1 = wDir1x*(d12x/d12len) + wDir1y*(d12y/d12len);
          const wDir2x = Math.cos(b2.weapon.angle), wDir2y = Math.sin(b2.weapon.angle);
          const dot2 = wDir2x*(-d12x/d12len) + wDir2y*(-d12y/d12len);
          if (dot1 > 0.05 && dot2 > 0.05) parryOccurred = true; // ~87° — parry at nearly any angle
        }
      }
    }
    if (parryOccurred) {
      const midX = (b1.x + b2.x) / 2, midY = (b1.y + b2.y) / 2;
      spawnSparks(midX, midY, 14);
      sfxParry();

      const b1Fists = b1.weaponDef.id === 'fists';
      const b2Fists = b2.weaponDef.id === 'fists';

      if (b1Fists && b2Fists) {
        // Fists vs Fists: both take damage (parry_tech_3 = 50% reduction)
        const dmgTo1 = b2.getDamage() * (b1.skills?.includes('parry_tech_3') ? 0.5 : 1);
        const dmgTo2 = b1.getDamage() * (b2.skills?.includes('parry_tech_3') ? 0.5 : 1);
        b1.takeDamage(dmgTo1, b2.x, b2.y, false, b2);
        b2.takeDamage(dmgTo2, b1.x, b1.y, false, b1);
        addBattleLog('parry_fists', { attacker: getBallLabel(b1), defender: getBallLabel(b2), damage: b2.getDamage(), aColor: b1.color, dColor: b2.color, defHp: +Math.max(0, b1.hp).toFixed(1) });
      } else if (b1Fists || b2Fists) {
        // Fists vs melee: fists takes damage (parry_tech_3 = 50% reduction)
        const [fistsB, otherB] = b1Fists ? [b1, b2] : [b2, b1];
        const fistsDmgMult = fistsB.skills?.includes('parry_tech_3') ? 0.5 : 1;
        fistsB.takeDamage(otherB.getDamage() * fistsDmgMult, otherB.x, otherB.y, false, otherB);
        addBattleLog('parry_fists', { attacker: getBallLabel(fistsB), defender: getBallLabel(otherB), damage: otherB.getDamage(), aColor: fistsB.color, dColor: otherB.color, defHp: +Math.max(0, fistsB.hp).toFixed(1) });
      } else {
        addBattleLog('parry', { attacker: getBallLabel(b1), defender: getBallLabel(b2), aColor: b1.color, dColor: b2.color });
        // ~40% chance audience reacts to the clash
        if (Math.random() < 0.40 && typeof audienceReact === 'function')
          audienceReact('double_parry');
      }

      // Fully separate bodies before freezing (prevent overlap during freeze causing visual jitter)
      const sepDx = b2.x - b1.x, sepDy = b2.y - b1.y;
      const sepD = Math.sqrt(sepDx*sepDx + sepDy*sepDy) || 1;
      const sepNx = sepDx/sepD, sepNy = sepDy/sepD;
      const sepMin = b1.radius + b2.radius + 4;
      if (sepD < sepMin) {
        const sepPush = (sepMin - sepD) * 0.5;
        b1.x -= sepNx * sepPush; b1.y -= sepNy * sepPush;
        b2.x += sepNx * sepPush; b2.y += sepNy * sepPush;
      }
      // Stun both balls: freeze movement + lock weapon for 15f, reverse spin on release
      b1.parryStun(15);
      b2.parryStun(15);
      // parryCooldown is set when stun expires (in skills.js)

      b1.stats.parries++;
      b2.stats.parries++;
      // Spear parried by melee → extra spin debuff 60f (on top of stun)
      const applySpearParry = (spearBall, otherBall) => {
        if (spearBall.weaponDef.id === 'spear' && otherBall.weaponDef.aiType === 'melee') {
          spearBall.weapon.spinDebuffTimer = 60;
        }
      };
      applySpearParry(b1, b2);
      applySpearParry(b2, b1);
      skillOnParry(b1, b2);
      return;
    }
  }

  // ── Bước 3: Weapon đánh trúng thân ─────────────────────────
  // 3. Weapon-to-body damage
  // Check b1→b2 first; only check b2→b1 if b2 survived b1's hit (prevents simultaneous mutual kills)
  // Kiểm tra b1 đánh b2 trước; chỉ check chiều ngược lại nếu b2 vẫn còn sống
  // (tránh 2 cái chết đồng thời gây bug kết quả)
  _checkWeaponHit(b1, b2);
  if (b1.alive && b2.alive) _checkWeaponHit(b2, b1);
}

// ─── Xử lý đạn bay va chạm với ball ─────────────────────────────────────
// Gọi mỗi frame sau collidePair. Duyệt qua tất cả projectile × tất cả player.
// Với mỗi cặp (proj, target) thứ tự check:
//   1. Bỏ qua owner của đạn (không tự bắn mình)
//   2. Bỏ qua đồng đội (friendly fire off)
//   3. Kiểm tra weapon deflect — đầu weapon target chạm vào đạn → đổi owner, văng ra
//   4. Kiểm tra body hit — đạn chạm vào thân target → dame + knockback + onHit
// Piercing arrow: không tắt sau hit, tiếp tục check target tiếp theo
// resolveProjectiles: projectiles vs all alive balls (any non-owner is a valid target)
function resolveProjectiles(players, projectiles) {
  // ── Projectile vs Projectile ───────────────────────────────
  // Shuriken vs Shuriken → cả hai hủy nhau
  // Arrow vs Arrow       → arrow có owner STR lớn hơn sống sót, còn lại bị hủy
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const a = projectiles[i];
    if (!a.alive) continue;
    for (let j = i - 1; j >= 0; j--) {
      const b = projectiles[j];
      if (!b.alive) continue;
      // Chỉ xét va chạm giữa 2 projectile của 2 owner khác nhau
      if (a.owner === b.owner) continue;
      // Kiểm tra va chạm
      if (dist2(a.x, a.y, b.x, b.y) >= (a.r + b.r) * (a.r + b.r)) continue;

      const aType = a.type; // 'arrow' | 'shuriken' | etc.
      const bType = b.type;

      const aIsShuriken = aType === 'shuriken' || aType === 'fuma_shuriken';
      const bIsShuriken = bType === 'shuriken' || bType === 'fuma_shuriken';

      if (aIsShuriken && bIsShuriken) {
        // Cả hai hủy nhau
        a.alive = false; b.alive = false;
        spawnSparks((a.x + b.x) / 2, (a.y + b.y) / 2, 8);
      } else if (!aIsShuriken && !bIsShuriken && aType === 'arrow' && bType === 'arrow') {
        // STR lớn hơn thắng; bằng nhau → cả hai hủy
        const aStr = a.owner?.charSTR ?? 5;
        const bStr = b.owner?.charSTR ?? 5;
        if (aStr > bStr)      { b.alive = false; spawnSparks(b.x, b.y, 6); }
        else if (bStr > aStr) { a.alive = false; spawnSparks(a.x, a.y, 6); }
        else                  { a.alive = false; b.alive = false; spawnSparks((a.x+b.x)/2, (a.y+b.y)/2, 8); }
      }
      // Các loại khác (arrow vs shuriken) không tương tác
    }
  }

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

      // ── Weapon deflect: đầu vũ khí target chạm vào đạn → deflect ──────
      // Void Grip: vũ khí bị kẹt → không thể deflect (attacker đã bị ghim)
      if (target.rs_weaponStuck <= 0) {
        const tpts = target.weaponDef.getHitPoints(target);
        let deflected = false;
        for (const tp of tpts) {
          if (dist2(proj.x, proj.y, tp.x, tp.y) < (tp.r + proj.r) * (tp.r + proj.r)) {
            deflected = true; break;
          }
        }
        if (deflected) {
          // Đạn bật ra theo hướng từ tâm target ra ngoài (ngược chiều đi vào)
          // ×1.05 speed: deflect nhẹ tăng tốc để đạn bật đi nhanh hơn
          const da = Math.atan2(proj.y - target.y, proj.x - target.x);
          const spd = Math.sqrt(proj.vx*proj.vx + proj.vy*proj.vy);
          proj.vx = Math.cos(da) * spd * 1.05;
          proj.vy = Math.sin(da) * spd * 1.05;
          proj.owner = target; // đổi owner → đạn giờ thuộc target, có thể tự bắn người cũ
          // Fists: immuneFrames 20f (dài hơn) vì fists parry ranged tốn đến 50% HP
          // Weapon khác: 8f để tránh double-hit cùng frame
          proj.immuneFrames = target.weaponDef.id === 'fists' ? 20 : 8;
          if (target.weaponDef.id === 'fists') {
            // Fists parry ranged: nhận 50% dame đạn (trừ Blessed by Shiva — Martial God miễn)
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

      // ── Body hit: đạn chạm vào thân target ─────────────────────────
      if (dist2(proj.x, proj.y, target.x, target.y) < (proj.r + target.radius) * (proj.r + target.radius)) {
        const isCrit = Math.random() < proj.owner.critChance;
        // rageMult đã được bake vào proj.damage lúc bắn (trong _fireSingle → getDamage())
        // không nhân rageMult thêm lần nữa ở đây
        const baseProjDmg = proj.damage;
        // Predator: proj cũng được hưởng bonus nếu target HP < attacker HP
        const predMult = proj.owner.skillState?.predatorActive ? window.SKILL_FORMULAS.predator.mult : 1;
        // wSkillProjMult: nhân dồn tất cả weapon skill bonus cho đạn này
        let wSkillProjMult = 1;
        if (proj.sniperBoost) {
          // Sniper: đạn bắn từ khoảng cách > 300px → ×(1.4 + IQ×0.03)
          const sniperMult = window.SKILL_FORMULAS.sniper.baseMult + (proj.owner?.charIQ || 5) * window.SKILL_FORMULAS.sniper.iqScaling;
          wSkillProjMult *= sniperMult;
          spawnDamageNumber(target.x, target.y - target.radius - 18, `🎯 SNIPE! ×${sniperMult.toFixed(2)}`, '#ffdd44');
          if (typeof flashSkillHUD === 'function') flashSkillHUD(proj.owner, SKILL_MAP['sniper']);
        }
        if (proj.volleyBoost) {
          // Volley: 3 mũi đầu tiên mỗi round → ×(1.5 + IQ×0.05)
          const volleyMult = window.SKILL_FORMULAS.volley.baseMult + (proj.owner?.charIQ || 5) * window.SKILL_FORMULAS.volley.iqScaling;
          wSkillProjMult *= volleyMult;
          spawnDamageNumber(target.x, target.y - target.radius - 18, `🏹 VOLLEY! ×${volleyMult.toFixed(2)}`, '#ffaa33');
          if (typeof flashSkillHUD === 'function') flashSkillHUD(proj.owner, SKILL_MAP['volley']);
        }
        if (proj.type === 'shuriken' && (proj.bounces || 0) > 0) {
          // Bounce Damage: mỗi lần nảy tường +15% dame (tối đa 3 lần = +45%)
          if (proj.owner?.skills?.includes('bounce_damage')) {
            wSkillProjMult *= (1 + proj.bounces * window.SKILL_FORMULAS.bounce_damage.perBounce);
          }
          // Ricochet Kill: nảy ≥2 lần → ×2 dame (phải HIT SAU khi đã đủ bounce)
          if (proj.owner?.skills?.includes('ricochet_kill') && proj.bounces >= window.SKILL_FORMULAS.ricochet_kill.minBounces) {
            wSkillProjMult *= window.SKILL_FORMULAS.ricochet_kill.mult;
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
            if (typeof audienceReact === 'function') audienceReact('crit');
          } else {
            addBattleLog('proj', { attacker: getBallLabel(proj.owner), defender: getBallLabel(target), damage: dmg, aColor: proj.owner.color, dColor: target.color, defHp: target.hp });
          }
          if (typeof audienceReact === 'function' && dmg > target.maxHp * 0.30)
            audienceReact('big_damage');
          proj.owner.stats.hits++;
          proj.owner.stats.damageDone += dmg;
          sfxHit(proj.owner?.weaponDef?.id);
          const ka = Math.atan2(target.y - proj.y, target.x - proj.x);
          // Cancel inward velocity first (same as melee knockback) so knockback
          // always pushes the target away — prevents speed drop when target runs into the projectile
          const kbInward = target.vx * -Math.cos(ka) + target.vy * -Math.sin(ka);
          if (kbInward > 0) {
            target.vx += Math.cos(ka) * kbInward;
            target.vy += Math.sin(ka) * kbInward;
          }
          target.vx += Math.cos(ka) * 4.5;
          target.vy += Math.sin(ka) * 4.5;
          target.bounceCooldown = 14;
          { const _wpre = _snapWeapon(proj.owner.weapon); proj.owner.weaponDef.onHit(proj.owner.weapon); _logWeaponScaleIfChanged(proj.owner, _wpre); }
          skillOnHit(proj.owner, target, dmg);
          // Medusa Bow: mỗi mũi tên slow -1 maxSpd, tích đủ 5 stack → petrify 2s
          // medusaPetrify: được xử lý trong ball.update() — freeze weapon rotation
          if (proj.medusaArrow) {
            target.medusaSlowStacks = (target.medusaSlowStacks || 0) + 1;
            target.maxSpd  = Math.max(2, target.maxSpd  - 1.0); // min speed = 2
            target.baseMaxSpd = Math.max(2, target.baseMaxSpd - 1.0);
            spawnDamageNumber(target.x, target.y - target.radius - 14,
              `🐍 SLOW ×${target.medusaSlowStacks}`, '#44cc88');
            if (target.medusaSlowStacks >= 5 && !target.medusaPetrify) {
              target.medusaPetrify = 120; // 2s = 120f → weapon bị freeze
              spawnDamageNumber(target.x, target.y - target.radius - 24, '🐍 PETRIFIED!', '#44cc88');
              if (typeof target.shout === 'function') target.shout('🐍 PETRIFIED!', 200, '#44cc88');
            }
          }
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

// ─── Kiểm tra weapon của attacker có đánh trúng thân defender không ─────
// Đây là nơi xảy ra damage thực sự trong melee combat.
// Luồng xử lý khi hit:
//   1. Tính dame: getDamage() × crit × exploit × reaperMult
//   2. Gọi defender.takeDamage() — nếu trả về true thì dame thực sự áp dụng
//   3. Set weapon cooldown cho attacker
//   4. Apply knockback cho defender
//   5. Gọi def.onHit() để scale weapon + _logWeaponScaleIfChanged
//   6. Gọi skillOnHit() cho attacker
// Tham số: attacker, defender (cả 2 là Ball objects)
function _checkWeaponHit(attacker, defender) {
  // Skip if either ball is already dead
  if (!attacker.alive || !defender.alive) return;
  // No friendly fire in team matches
  if (attacker.teamId >= 0 && attacker.teamId === defender.teamId) return;
  if (attacker.weapon.cooldown > 0) return; // weapon đang trong cooldown → chưa thể tấn công
  if (defender.immunityFrames > 0) return;  // defender đang bất khả xâm phạm
  // No hits while either party is parry-frozen (both are frozen → attacker can't swing, defender is invulnerable)
  if (attacker.stunTimer > 0 && attacker.parryStunReverse) return;
  if (defender.stunTimer > 0 && defender.parryStunReverse) return;
  const def = attacker.weaponDef;
  if (def.aiType === 'ranged') return; // ranged weapons don't melee-hit

  const pts = def.getHitPoints(attacker);
  const forgeSizeBonus = attacker.rs_forgeSizeBonus || 0; // Dwarf: Bigger Blade
  for (const p of pts) {
    const threshold = p.r + forgeSizeBonus + defender.radius;
    if (dist2(p.x, p.y, defender.x, defender.y) < threshold*threshold) {
      // Shadow Strike (Dagger / Shadowfang): guaranteed crit override
      const isShadowCrit = attacker.skills?.includes('shadow_strike') && (def.id === 'dagger' || def.baseWeapon === 'dagger') && attacker.skillState?.shadowStrikeCrit;
      // Shadowfang: auto-crit when attacking from behind (attacker is behind defender's weapon)
      let isShadowfangBehind = false;
      if (def.id === 'shadowfang') {
        // "behind" = attacker is on the opposite side of defender's weapon angle
        const toAttacker = Math.atan2(attacker.y - defender.y, attacker.x - defender.x);
        let angleDiff = toAttacker - defender.weapon.angle;
        while (angleDiff >  Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        isShadowfangBehind = Math.abs(angleDiff) > 2.2; // ~126° — behind defender's weapon
      }
      const isCrit = isShadowCrit || isShadowfangBehind || Math.random() < attacker.critChance;
      if (isShadowfangBehind && !isShadowCrit) {
        spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 18, '🌑 BACKSTAB!', '#aa44ff');
      }
      const isHammer = def.id === 'hammer' || def.baseWeapon === 'hammer';
      // Hammer / Mjolnir: final damage += knockback / 2
      const kbBonus = isHammer
        ? (def.baseKnockback + (attacker.weapon.bonusKnockback||0)) / 2
        : 0;
      const baseDmgNoCrit = (attacker.getDamage() + kbBonus) * (p.damageMult ?? 1); // damageMult < 1 cho dây xích flail
      // Skill: Predator — bonus damage when target has less HP
      const predMult = attacker.skillState?.predatorActive ? window.SKILL_FORMULAS.predator.mult : 1;
      // Skill: Exploit — (IQ+BIQ) × chancePerCombinedStat
      const exploitChance = attacker.skills?.includes('exploit')
        ? ((attacker.charIQ || 0) + (attacker.charBIQ || 0)) * window.SKILL_FORMULAS.exploit.chancePerCombinedStat : 0;
      const isExploit = exploitChance > 0 && Math.random() < exploitChance;
      // Reaper's Mark (Scythe): bonus dmg vs enemies below HP threshold
      const reaperMult = (attacker.skills?.includes('reapers_mark') && def.id === 'scythe'
        && defender.hp / defender.maxHp < window.SKILL_FORMULAS.reapers_mark.hpThreshold) ? window.SKILL_FORMULAS.reapers_mark.mult : 1.0;
      if (reaperMult > 1) {
        spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 18, '💀 EXECUTE! ×1.8', '#ff2222');
        if (typeof flashSkillHUD === 'function') flashSkillHUD(attacker, SKILL_MAP['reapers_mark']);
      }
      const exploitMult = isExploit ? (window.SKILL_FORMULAS.exploit.baseMult + (attacker.charIQ || 5) * window.SKILL_FORMULAS.exploit.iqScaling) : 1;
      const dmg = baseDmgNoCrit * (isCrit ? attacker.critMult : 1) * predMult * exploitMult * reaperMult;
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
        sfxHit(attacker.weaponDef?.id);
        // Battle log: hit or crit (with special types for lunge/iai)
        if (attacker.weapon?.iaiHit) {
          addBattleLog('iai', { attacker: getBallLabel(attacker), defender: getBallLabel(defender), damage: dmg, aColor: attacker.color, dColor: defender.color, defHp: +Math.max(0, defender.hp).toFixed(1) });
          attacker.weapon.iaiHit = false;
        } else if (attacker.weapon?.lungeHit) {
          addBattleLog('lunge_hit', { attacker: getBallLabel(attacker), defender: getBallLabel(defender), damage: dmg, aColor: attacker.color, dColor: defender.color, defHp: +Math.max(0, defender.hp).toFixed(1) });
          attacker.weapon.lungeHit = false;
        } else if (isCrit) {
          addBattleLog('crit', { attacker: getBallLabel(attacker), defender: getBallLabel(defender), damage: dmg, baseDmg: +baseDmgNoCrit.toFixed(2), critMult: attacker.critMult, aColor: attacker.color, dColor: defender.color, defHp: +Math.max(0, defender.hp).toFixed(1) });
          if (typeof audienceReact === 'function') audienceReact('crit');
        } else {
          addBattleLog('hit', { attacker: getBallLabel(attacker), defender: getBallLabel(defender), damage: dmg, aColor: attacker.color, dColor: defender.color, defHp: +Math.max(0, defender.hp).toFixed(1) });
        }
        if (typeof audienceReact === 'function' && dmg > defender.maxHp * 0.30)
          audienceReact('big_damage');
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
        // Shadowfang: every melee hit applies poison (Virtues immune)
        if (def.id === 'shadowfang') {
          if (defender.charRace === 'angel' && defender.charSubrace?.label === 'Virtues') {
            spawnDamageNumber(defender.x, defender.y - defender.radius - 14, '👼 Virtues — immune!', '#aaccff');
          } else {
            defender.sk_poisonDuration = 12 * 60;
            defender.sk_poisonTick     = 0;
            defender.sk_poisonDmg      = 2.0;
            defender.sk_poisonOwner    = attacker;
            spawnDamageNumber(defender.x, defender.y - defender.radius - 14, '🌑 VENOM!', '#9933ff');
          }
        }
        // ── Scale weapon on-hit ──────────────────────────────────
        // Pattern: snap before → gọi onHit (có thể thay đổi weapon state) → log nếu có thay đổi
        // _snapWeapon chụp lại các field scalable trước khi onHit chạy
        // _logWeaponScaleIfChanged so sánh trước/sau → hiển thị floating number + battle log
        { const _wpre = _snapWeapon(attacker.weapon); def.onHit(attacker.weapon); _logWeaponScaleIfChanged(attacker, _wpre); }
        // Lance: stun defender on hit
        if (def.id === 'lance') {
          defender.stunTimer = Math.max(defender.stunTimer || 0, 80);
          spawnDamageNumber(defender.x, defender.y - defender.radius - 16, '🏇 JOUSTED!', '#cc9966');
        }
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

// ─── Melee weapon vs skill minions ───────────────────────────────────────
// Cho phép melee weapon (không phải ranged) đánh trúng minion trong state.skillMinions.
// Logic đơn giản hơn _checkWeaponHit — không có crit/evade/skillOnHit, chỉ damage thẳng.
// Dùng cùng weapon.cooldown nên sau khi hit minion, weapon vẫn phải chờ cooldown.
// Tham số: players — array Ball đang alive
// Trả về: không có
function resolveMeleeVsMinions(players) {
  if (!state.skillMinions?.length) return;
  for (const attacker of players) {
    if (!attacker.alive) continue;
    if (attacker.weapon.cooldown > 0) continue;
    const def = attacker.weaponDef;
    if (!def || def.aiType === 'ranged') continue; // chỉ melee mới đánh được minion
    if (attacker.stunTimer > 0 && attacker.parryStunReverse) continue;

    const pts = def.getHitPoints(attacker);
    const forgeSizeBonus = attacker.rs_forgeSizeBonus || 0;

    for (let i = state.skillMinions.length - 1; i >= 0; i--) {
      const m = state.skillMinions[i];
      if (!m.alive) continue;
      // Không đánh minion của chính mình hoặc đồng đội
      if (m.owner === attacker) continue;
      if (attacker.teamId >= 0 && m.teamId === attacker.teamId) continue;

      let hit = false;
      for (const p of pts) {
        const threshold = p.r + forgeSizeBonus + m.r;
        if (dist2(p.x, p.y, m.x, m.y) < threshold * threshold) {
          hit = true;
          break;
        }
      }
      if (!hit) continue;

      // Damage = attacker getDamage (không có crit, không có knockback, không có exploit)
      const dmg = attacker.getDamage();
      m.hp -= dmg;
      // Set weapon cooldown — cùng tốc độ như đánh ball thường
      const rageCDMult = (state.matchTime >= 80 * 60) ? 0.7 : 1.0;
      attacker.weapon.cooldown = Math.max(1, Math.floor(attacker.weapon.attackCooldown * rageCDMult));
      attacker.stats.hits++;
      attacker.stats.damageDone += dmg;
      sfxHit(def?.id);
      spawnDamageNumber(m.x, m.y - m.r - 10, `-${dmg.toFixed(1)}`, '#ffddaa');
      if (m.hp <= 0) {
        m.alive = false;
        spawnDamageNumber(m.x, m.y - m.r - 20, '💀', '#aaffaa');
      }
      break; // một lần hit per frame per attacker
    }
  }
}
