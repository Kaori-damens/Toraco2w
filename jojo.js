// ============================================================
// JOJO STAND SYSTEM
// ============================================================
// state.jojoStands[] — active stands per round
// jojoUpdateAll(state)          — gọi từ game-loop step()
// jojoDrawStands(ctx, state)    — gọi TRƯỚC ball draw
// jojoDrawOverlays(ctx, state)  — gọi SAU ball draw
// jojoOnPreCombat(ball)         — spawn stand (từ skillOnPreCombat)
// jojoOnPostCombat(ball, won)   — Evolution tracking (từ skillOnPostCombat)
// jojoStandDmgReduction(ball, dmg) — Star Platinum 10% dmg reduce (từ ball.js)

// ── Constants ─────────────────────────────────────────────────
const JOJO_STAND_RANGE      = 150;  // px — tether radius mặc định
const JOJO_STAND_SPEED      = 3.5;  // px/frame — tốc độ di chuyển Stand
const JOJO_STAND_ATTACK_CD  = 50;   // frames giữa các đòn đánh Stand
const JOJO_STAND_BASE_MULT  = 0.5;  // damage = ownerSTR × này + 2

const JOJO_ORA_HITS         = 10;   // số đòn ORA ORA
const JOJO_ORA_INTERVAL     = 4;    // frames/đòn
const JOJO_ORA_DMG          = 3;    // dmg mỗi đòn ORA
const JOJO_ORA_KB           = 4;    // knockback mỗi đòn ORA
const JOJO_ORA_CHANCE       = 0.25; // 25% trigger khi chạm
const JOJO_ORA_CD           = 210;  // 3.5s cooldown giữa các lần ORA

const JOJO_WORLD_DURATION   = 600;  // 10s freeze
const JOJO_WORLD_COOLDOWN   = 3000; // 50s cooldown
const JOJO_WORLD_MAX_USES   = 3;
const JOJO_WORLD_TRIGGER_R  = 80;   // px — trigger khi enemy vào tầm

const JOJO_KQ_BOMB_R        = 20;   // bán kính bom
const JOJO_KQ_MAX_BOMBS     = 5;
const JOJO_KQ_BOMB_DMG      = 20;
const JOJO_KQ_BOMB_KB       = 13;
const JOJO_KQ_TOUCH_CD      = 70;   // frames giữa mỗi lần đặt bom

const JOJO_GE_LIFE          = 600;  // 10s tuổi thọ minion
const JOJO_GE_COOLDOWN      = 600;  // 10s giữa mỗi lần spawn
const JOJO_GE_DMG           = 4;    // dmg cố định

const JOJO_STAND_COLORS = {
  star_platinum:   '#ddbb22',
  the_world:       '#336622',
  killer_queen:    '#cc44bb',
  gold_experience: '#44bb55',
};

const JOJO_STAND_ICONS = {
  star_platinum:   '⭐',
  the_world:       '🌍',
  killer_queen:    '💀',
  gold_experience: '🌿',
};

// ── Pre-combat: spawn Stand ───────────────────────────────────
function jojoOnPreCombat(ball) {
  if (typeof state === 'undefined') return;
  state.jojoStands = state.jojoStands || [];

  // Xóa stand cũ của ball này (nếu round mới)
  const oldIdx = state.jojoStands.findIndex(s => s.owner === ball);
  if (oldIdx >= 0) state.jojoStands.splice(oldIdx, 1);

  const skillMap = {
    'jojo_stand_star':  'star_platinum',
    'jojo_stand_world': 'the_world',
    'jojo_stand_kq':    'killer_queen',
    'jojo_stand_ge':    'gold_experience',
  };

  for (const [skillId, standType] of Object.entries(skillMap)) {
    if (!ball.skills?.includes(skillId)) continue;

    const hasSenses = ball.skills?.includes('jojo_support_senses');
    const hasRemote = ball.skills?.includes('jojo_support_remote');
    const evo       = ball._jojoEvolution || { size: 0, dmgMult: 1, dmgReduce: 0 };

    const _initAng = Math.random() * Math.PI * 2;
    const stand = {
      owner:         ball,
      type:          standType,
      x:             ball.x + 30,
      y:             ball.y - 20,
      vx: Math.cos(_initAng) * JOJO_STAND_SPEED,
      vy: Math.sin(_initAng) * JOJO_STAND_SPEED,
      r:             Math.round(ball.radius * 0.75 * (1 + evo.size * 0.10)),
      color:         JOJO_STAND_COLORS[standType] || '#ffdd44',
      alive:         true,
      _attackCd:     0,
      _range:        hasRemote ? JOJO_STAND_RANGE * 2 : JOJO_STAND_RANGE,
      _critChance:   hasSenses ? (ball.critChance || 0) : 0.05,
      _evadeChance:  hasSenses ? (ball.evadeChance || 0) : 0.05,
      _evoDmgMult:   evo.dmgMult,
      _evoDmgReduce: evo.dmgReduce,
      // Star Platinum
      _oraActive:    false,
      _oraTarget:    null,
      _oraTimer:     0,
      _oraCd:        0,
      _oraHitsDone:  0,
      // The World
      _worldActive:  false,
      _worldTimer:   0,
      _worldCd:      0,
      _worldUses:    0,
      _frozenBalls:  [],
      _frozenProjs:  [],
      // Killer Queen
      _kqBombs:      [],
      _kqTouchCd:    0,
      // Gold Experience
      _geCd:         0,
      // Startup cooldown — 2s ẩn khi bắt đầu trận, tránh trigger ngay lập tức
      _startupCd:    120,
    };

    state.jojoStands.push(stand);
    if (typeof addBattleLog === 'function')
      addBattleLog('skill_trigger', { attacker: getBallLabel(ball), aColor: ball.color,
        text: `🎭 Stand: ${JOJO_STAND_ICONS[standType]} ${standType.replace(/_/g,' ')} summoned!` });
    break;
  }
}

// ── Post-combat: Evolution stacks ────────────────────────────
function jojoOnPostCombat(ball, won) {
  if (!won || !ball.skills?.includes('jojo_support_evolution')) return;
  ball._jojoEvolution = ball._jojoEvolution || { size: 0, dmgMult: 1, dmgReduce: 0, stacks: 0 };
  const evo = ball._jojoEvolution;
  if (evo.stacks >= 5) return;
  evo.stacks++;
  evo.size      += 1;                                      // +10% size per stack
  evo.dmgMult    = parseFloat((evo.dmgMult * 1.05).toFixed(4));  // +5% dmg
  evo.dmgReduce  = parseFloat(Math.min(0.50, evo.dmgReduce + 0.10).toFixed(2)); // -10% dmg taken, cap 50%
  if (typeof addBattleLog === 'function')
    addBattleLog('post_combat', { attacker: getBallLabel(ball), aColor: ball.color,
      text: `📈 Evolution Lv.${evo.stacks}: Stand +10% size, +5% dmg, -10% dmg received!` });
}

// ── Main update (60fps) ───────────────────────────────────────
function jojoUpdateAll(state) {
  state.jojoStands = state.jojoStands || [];

  // The World freeze: chạy mọi frame trước mọi thứ khác
  for (const stand of state.jojoStands) {
    if (stand.type === 'the_world' && stand._worldActive) {
      _jojoTickWorldFreeze(stand, state);
    }
  }

  for (let i = state.jojoStands.length - 1; i >= 0; i--) {
    const stand = state.jojoStands[i];
    if (!stand.owner.alive) { stand.alive = false; }
    if (!stand.alive) { state.jojoStands.splice(i, 1); continue; }

    // Cooldown tick
    if (stand._startupCd > 0) stand._startupCd--;
    if (stand._attackCd  > 0) stand._attackCd--;
    if (stand._oraCd     > 0) stand._oraCd--;
    if (stand._worldCd   > 0) stand._worldCd--;
    if (stand._geCd      > 0) stand._geCd--;
    if (stand._kqTouchCd > 0) stand._kqTouchCd--;

    // Stand projectile collision → Soul Link (proj hits stand → owner takes dmg)
    _jojoCheckProjHitStand(stand, state);

    // Move (luôn chạy, kể cả trong startup cooldown)
    if (!stand._oraActive && !(stand.type === 'the_world' && stand._worldActive)) {
      _jojoMoveStand(stand, state);
    }

    // Startup cooldown: chưa kích hoạt ability trong 2s đầu
    if (stand._startupCd > 0) continue;

    switch (stand.type) {
      case 'star_platinum':   _updateStarPlatinum(stand, state);   break;
      case 'the_world':       _updateTheWorld(stand, state);        break;
      case 'killer_queen':    _updateKillerQueen(stand, state);     break;
      case 'gold_experience': _updateGoldExperience(stand, state);  break;
    }
  }
}

// ── Stand movement — 2 wall: vòng tròn quanh owner + arena ───
// Stand di chuyển tự do ở tốc độ cố định JOJO_STAND_SPEED.
// Wall 1: arena — nảy thông thường.
// Wall 2: vòng tròn bán kính _range quanh owner — khi stand
//         chạm viền phản chiếu velocity theo pháp tuyến vòng tròn.
// Cuối frame normalize lại speed về đúng JOJO_STAND_SPEED.
function _jojoMoveStand(stand, state) {
  const owner = stand.owner;
  const _CW   = typeof CW !== 'undefined' ? CW : 900;
  const _CH   = typeof CH !== 'undefined' ? CH : 600;

  // Di chuyển tự do
  stand.x += stand.vx;
  stand.y += stand.vy;

  // ── Wall 1: Arena ─────────────────────────────────────────────
  if (stand.x - stand.r < 0)     { stand.x = stand.r;       stand.vx =  Math.abs(stand.vx); }
  if (stand.x + stand.r > _CW)   { stand.x = _CW - stand.r; stand.vx = -Math.abs(stand.vx); }
  if (stand.y - stand.r < 0)     { stand.y = stand.r;        stand.vy =  Math.abs(stand.vy); }
  if (stand.y + stand.r > _CH)   { stand.y = _CH - stand.r;  stand.vy = -Math.abs(stand.vy); }

  // ── Wall 2: Vòng tròn tether quanh owner ──────────────────────
  const dx = stand.x - owner.x;
  const dy = stand.y - owner.y;
  const d  = Math.hypot(dx, dy) || 0.001;
  if (d > stand._range) {
    // Pháp tuyến hướng ra ngoài (owner → stand)
    const nx = dx / d, ny = dy / d;
    // Phản chiếu velocity: chỉ đảo thành phần đi ra ngoài
    const dot = stand.vx * nx + stand.vy * ny;
    if (dot > 0) {
      stand.vx -= 2 * dot * nx;
      stand.vy -= 2 * dot * ny;
    }
    // Đẩy stand về đúng viền vòng tròn
    stand.x = owner.x + nx * stand._range;
    stand.y = owner.y + ny * stand._range;
  }

  // ── Giữ tốc độ luôn cố định ───────────────────────────────────
  const spd = Math.hypot(stand.vx, stand.vy);
  if (spd > 0.01) {
    stand.vx = (stand.vx / spd) * JOJO_STAND_SPEED;
    stand.vy = (stand.vy / spd) * JOJO_STAND_SPEED;
  }
}

// ── Soul Link: projectile hits Stand → owner takes damage ─────
function _jojoCheckProjHitStand(stand, state) {
  for (let i = (state.projectiles || []).length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    if (!proj || proj.owner === stand.owner) continue;
    if (Math.hypot(proj.x - stand.x, proj.y - stand.y) < stand.r + (proj.r || 5)) {
      // Evade check cho stand
      if (Math.random() < stand._evadeChance) continue;
      let dmg = proj.damage;
      dmg *= (1 - (stand._evoDmgReduce || 0));
      if (stand.owner.takeDamage) stand.owner.takeDamage(dmg, proj.x, proj.y, false, proj.owner, false, true);
      state.projectiles.splice(i, 1);
    }
  }
}

// ── Generic stand melee attack ────────────────────────────────
function _jojoStandMeleeAttack(stand, state) {
  if (stand._attackCd > 0) return false;
  const base = Math.round((stand.owner.charSTR ?? 5) * JOJO_STAND_BASE_MULT) + 2;
  const dmg  = Math.round(base * (stand._evoDmgMult || 1));
  for (const p of (state.players || [])) {
    if (!p.alive || p === stand.owner) continue;
    if (Math.hypot(p.x - stand.x, p.y - stand.y) < stand.r + p.radius + 2) {
      if (p.takeDamage) p.takeDamage(dmg, stand.x, stand.y, Math.random() < stand._critChance, stand.owner);
      if (stand.owner.stats) stand.owner.stats.damageDone = (stand.owner.stats.damageDone || 0) + dmg;
      stand._attackCd = JOJO_STAND_ATTACK_CD;
      return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────
// STAR PLATINUM
// ─────────────────────────────────────────────────────────────
function _updateStarPlatinum(stand, state) {
  // ORA ORA sequence đang chạy
  if (stand._oraActive) {
    stand._oraTimer--;
    if (stand._oraTimer <= 0 && stand._oraHitsDone < JOJO_ORA_HITS) {
      const target = stand._oraTarget;
      if (target?.alive) {
        // Random knockback direction
        const ang = Math.random() * Math.PI * 2;
        target.vx += Math.cos(ang) * JOJO_ORA_KB;
        target.vy += Math.sin(ang) * JOJO_ORA_KB;
        target.hp = Math.max(0, (target.hp || 0) - JOJO_ORA_DMG);
        if (stand.owner.stats) stand.owner.stats.damageDone = (stand.owner.stats.damageDone || 0) + JOJO_ORA_DMG;
        if (typeof spawnDamageNumber === 'function')
          spawnDamageNumber(
            target.x + (Math.random() - 0.5) * 20,
            target.y - target.radius - 8,
            `ORA! ${JOJO_ORA_DMG}`, '#ffdd22'
          );
        // Stand vibrates trên target
        stand.x = target.x + (Math.random() - 0.5) * 14;
        stand.y = target.y + (Math.random() - 0.5) * 14;
        stand._oraHitsDone++;
        stand._oraTimer = JOJO_ORA_INTERVAL;
      } else {
        stand._oraActive = false; // target died mid-combo
      }
    }
    if (stand._oraHitsDone >= JOJO_ORA_HITS) {
      stand._oraActive   = false;
      stand._oraHitsDone = 0;
      stand._oraCd       = JOJO_ORA_CD;
      if (typeof addBattleLog === 'function')
        addBattleLog('skill_trigger', { attacker: getBallLabel(stand.owner), aColor: stand.owner.color,
          text: `⭐ Star Platinum — ORA ORA ORA! (${JOJO_ORA_HITS} hits)` });
    }
    return;
  }

  // Kiểm tra trigger ORA
  for (const p of (state.players || [])) {
    if (!p.alive || p === stand.owner) continue;
    if (Math.hypot(p.x - stand.x, p.y - stand.y) < stand.r + p.radius + 2) {
      if (stand._oraCd <= 0 && Math.random() < JOJO_ORA_CHANCE) {
        stand._oraActive   = true;
        stand._oraTarget   = p;
        stand._oraTimer    = JOJO_ORA_INTERVAL;
        stand._oraHitsDone = 0;
        stand._attackCd    = JOJO_ORA_HITS * JOJO_ORA_INTERVAL + 20;
        if (typeof stand.owner.shout === 'function')
          stand.owner.shout('⭐ ORA ORA ORA!!!', 130, '#ffdd22');
        return;
      }
    }
  }
  _jojoStandMeleeAttack(stand, state);
}

// Star Platinum damage reduction — gọi từ ball.js
function jojoStandDmgReduction(ball, dmg) {
  if (ball.skills?.includes('jojo_stand_star')) {
    // Check if stand is alive
    if (typeof state !== 'undefined' && state.jojoStands) {
      const stand = state.jojoStands.find(s => s.owner === ball && s.type === 'star_platinum');
      if (stand) return dmg * 0.9;
    }
  }
  return dmg;
}

// ─────────────────────────────────────────────────────────────
// THE WORLD
// ─────────────────────────────────────────────────────────────
function _updateTheWorld(stand, state) {
  if (stand._worldActive) return; // handled by _jojoTickWorldFreeze
  if (stand._worldUses >= JOJO_WORLD_MAX_USES) {
    _jojoStandMeleeAttack(stand, state);
    return;
  }
  if (stand._worldCd > 0) {
    _jojoStandMeleeAttack(stand, state);
    return;
  }

  // Trigger: stand hoặc owner gần enemy
  const owner = stand.owner;
  for (const p of (state.players || [])) {
    if (!p.alive || p === owner) continue;
    const dStand = Math.hypot(p.x - stand.x, p.y - stand.y);
    const dOwner = Math.hypot(p.x - owner.x, p.y - owner.y);
    if (dStand < JOJO_WORLD_TRIGGER_R + stand.r || dOwner < JOJO_WORLD_TRIGGER_R) {
      _jojoActivateWorldFreeze(stand, state);
      return;
    }
  }
  _jojoStandMeleeAttack(stand, state);
}

function _jojoActivateWorldFreeze(stand, state) {
  stand._worldActive = true;
  stand._worldTimer  = JOJO_WORLD_DURATION;
  stand._worldCd     = JOJO_WORLD_COOLDOWN;
  stand._worldUses++;

  // Snapshot + flag enemies
  stand._frozenBalls = [];
  for (const p of (state.players || [])) {
    if (!p.alive || p === stand.owner) continue;
    stand._frozenBalls.push({ ball: p, savedVx: p.vx, savedVy: p.vy });
    p._jojoFrozen = true;
  }
  // Snapshot + flag projectiles (của đối thủ)
  stand._frozenProjs = [];
  for (const proj of (state.projectiles || [])) {
    if (proj.owner === stand.owner) continue;
    stand._frozenProjs.push({ proj, savedVx: proj.vx, savedVy: proj.vy });
    proj._jojoFrozen = true;
  }
  // Owner evades everything during freeze
  stand.owner._jojoWorldEvade = true;

  if (typeof stand.owner.shout === 'function') stand.owner.shout('🌍 ZA WARUDO!⏸️', 220, '#336622');
  if (typeof addBattleLog === 'function')
    addBattleLog('skill_trigger', { attacker: getBallLabel(stand.owner), aColor: stand.owner.color,
      text: `🌍 The World — Time Stop! 10s (use ${stand._worldUses}/${JOJO_WORLD_MAX_USES})` });
}

function _jojoTickWorldFreeze(stand, state) {
  stand._worldTimer--;
  // Giữ enemies frozen mỗi frame
  for (const fb of stand._frozenBalls) {
    if (!fb.ball.alive) continue;
    fb.ball.vx = 0; fb.ball.vy = 0;
    fb.ball._jojoFrozen = true;
  }
  // Giữ projectiles frozen
  for (const fp of stand._frozenProjs) {
    const stillInState = (state.projectiles || []).includes(fp.proj);
    if (!stillInState) continue;
    fp.proj.vx = 0; fp.proj.vy = 0;
    fp.proj._jojoFrozen = true;
  }

  // Owner đạt max speed ngay lập tức + không bị friction
  const owner = stand.owner;
  const ownerSpd = Math.hypot(owner.vx, owner.vy);
  if (ownerSpd > 0.5) {
    // Có hướng: luôn giữ đúng max speed mỗi frame (triệt tiêu micro-friction 0.99985)
    owner.vx = (owner.vx / ownerSpd) * owner.maxSpd;
    owner.vy = (owner.vy / ownerSpd) * owner.maxSpd;
  } else {
    // Đứng yên: chọn hướng ngẫu nhiên và bắt đầu chạy max speed
    const ang = Math.random() * Math.PI * 2;
    owner.vx = Math.cos(ang) * owner.maxSpd;
    owner.vy = Math.sin(ang) * owner.maxSpd;
  }
  // Giữ wallBoostFactor ≥ 1.0 để không mất speed sau wall bounce
  if ((owner.wallBoostFactor || 1) < 1.0) owner.wallBoostFactor = 1.0;

  if (stand._worldTimer <= 0) _jojoEndWorldFreeze(stand, state);
}

function _jojoEndWorldFreeze(stand, state) {
  stand._worldActive = false;
  // Restore velocities
  for (const fb of stand._frozenBalls) {
    if (!fb.ball.alive) continue;
    fb.ball.vx = fb.savedVx; fb.ball.vy = fb.savedVy;
    fb.ball._jojoFrozen = false;
  }
  for (const fp of stand._frozenProjs) {
    const stillInState = (state.projectiles || []).includes(fp.proj);
    if (stillInState) { fp.proj.vx = fp.savedVx; fp.proj.vy = fp.savedVy; }
    if (fp.proj._jojoFrozen !== undefined) fp.proj._jojoFrozen = false;
  }
  stand._frozenBalls = [];
  stand._frozenProjs = [];
  stand.owner._jojoWorldEvade = false;
  if (typeof stand.owner.shout === 'function') stand.owner.shout('⏯️ Toki wo tomare!', 80, '#336622');
}

// The World: owner evades all hits during freeze
function jojoWorldEvadeCheck(ball) {
  return !!ball._jojoWorldEvade;
}

// Frozen entity skip check
function jojoIsFrozen(ball) {
  return !!ball._jojoFrozen;
}

// ─────────────────────────────────────────────────────────────
// KILLER QUEEN
// ─────────────────────────────────────────────────────────────
function _updateKillerQueen(stand, state) {
  const owner = stand.owner;
  const bombs = stand._kqBombs;
  const _CW   = typeof CW !== 'undefined' ? CW : 900;
  const _CH   = typeof CH !== 'undefined' ? CH : 600;

  // Tick bom + kiểm tra kích nổ
  for (let i = bombs.length - 1; i >= 0; i--) {
    const bomb = bombs[i];
    bomb.life = (bomb.life || 0) - 1;
    if (bomb.life <= 0) { bombs.splice(i, 1); continue; }

    // Bom theo target ball
    if (bomb.onBall && bomb.target?.alive) {
      bomb.x = bomb.target.x;
      bomb.y = bomb.target.y - bomb.target.radius - JOJO_KQ_BOMB_R * 0.5;
    }

    let detonate = false;

    if (bomb.onBall && bomb.target?.alive) {
      const b = bomb.target;
      // Detonate: carrier chạm tường
      const hitWall = b.x - b.radius <= 4 || b.x + b.radius >= _CW - 4 ||
                      b.y - b.radius <= 4 || b.y + b.radius >= _CH - 4;
      if (hitWall) detonate = true;

      // Detonate: projectile chạm vùng bom
      if (!detonate) {
        for (const proj of (state.projectiles || [])) {
          if (Math.hypot(proj.x - bomb.x, proj.y - bomb.y) < JOJO_KQ_BOMB_R + (proj.r || 5)) {
            detonate = true; break;
          }
        }
      }

      // Detonate: carrier chạm ball khác → cả 2 nhận damage
      if (!detonate) {
        for (const other of (state.players || [])) {
          if (!other.alive || other === b || other === owner) continue;
          if (Math.hypot(other.x - b.x, other.y - b.y) < other.radius + b.radius + 4) {
            if (other.takeDamage) other.takeDamage(JOJO_KQ_BOMB_DMG, bomb.x, bomb.y, false, owner);
            if (b.takeDamage)     b.takeDamage(Math.round(JOJO_KQ_BOMB_DMG * 0.5), bomb.x, bomb.y, false, owner);
            detonate = true; break;
          }
        }
      }
    } else if (!bomb.onBall) {
      // Bom tĩnh: kích nổ khi enemy chạm
      for (const p of (state.players || [])) {
        if (!p.alive || p === owner) continue;
        if (Math.hypot(p.x - bomb.x, p.y - bomb.y) < p.radius + JOJO_KQ_BOMB_R) {
          detonate = true; break;
        }
      }
    }

    if (detonate) {
      _jojoKQExplode(bomb, stand, state);
      bombs.splice(i, 1);
    }
  }

  // Đặt bom khi Stand chạm enemy hoặc tường (có cooldown + giới hạn số bom)
  if (stand._kqTouchCd <= 0 && bombs.length < JOJO_KQ_MAX_BOMBS) {
    let placed = false;
    // Chạm enemy → bom trên người
    for (const p of (state.players || [])) {
      if (!p.alive || p === owner) continue;
      if (Math.hypot(p.x - stand.x, p.y - stand.y) < stand.r + p.radius + 2) {
        if (!bombs.some(b => b.target === p)) {
          bombs.push({ x: p.x, y: p.y - p.radius, target: p, onBall: true, life: 600 });
          if (typeof spawnDamageNumber === 'function')
            spawnDamageNumber(p.x, p.y - p.radius - 18, '💥 BOMB!', '#cc44bb');
          if (typeof addBattleLog === 'function')
            addBattleLog('skill_trigger', { attacker: getBallLabel(owner), aColor: owner.color,
              text: `💥 Killer Queen — bomb placed on ${getBallLabel(p)}!` });
          stand._kqTouchCd = JOJO_KQ_TOUCH_CD;
          placed = true;
          break;
        }
      }
    }
    // Chạm cột (pillar) → bom tĩnh trên cột
    if (!placed && state.trapObjects?.length) {
      for (const trap of state.trapObjects) {
        if (trap.kind === 'pillar') {
          if (Math.hypot(stand.x - trap.x, stand.y - trap.y) < stand.r + trap.r + 4) {
            // Đặt bom tại mép pillar, hướng về phía enemy gần nhất (không phải tâm pillar)
            let bx = trap.x, by = trap.y;
            const nearestEnemy = (state.players || []).reduce((best, p) => {
              if (!p.alive || p === owner) return best;
              if (!best) return p;
              return Math.hypot(p.x - trap.x, p.y - trap.y) < Math.hypot(best.x - trap.x, best.y - trap.y) ? p : best;
            }, null);
            if (nearestEnemy) {
              const ed = Math.hypot(nearestEnemy.x - trap.x, nearestEnemy.y - trap.y) || 1;
              bx = trap.x + (nearestEnemy.x - trap.x) / ed * trap.r;
              by = trap.y + (nearestEnemy.y - trap.y) / ed * trap.r;
            }
            bombs.push({ x: bx, y: by, target: null, onBall: false, life: 360 });
            stand._kqTouchCd = JOJO_KQ_TOUCH_CD;
            if (typeof spawnDamageNumber === 'function')
              spawnDamageNumber(trap.x, trap.y - 20, '💥 PILLAR BOMB!', '#cc44bb');
            placed = true;
            break;
          }
        }
        if (!placed && trap.kind === 'scythe') {
          // Đặt bom tại đầu lưỡi scythe
          const tipX = trap.cx + Math.cos(trap.angle) * trap.armLen;
          const tipY = trap.cy + Math.sin(trap.angle) * trap.armLen;
          if (Math.hypot(stand.x - tipX, stand.y - tipY) < stand.r + trap.bladeR + 6) {
            bombs.push({ x: tipX, y: tipY, target: null, onBall: false, life: 360 });
            stand._kqTouchCd = JOJO_KQ_TOUCH_CD;
            if (typeof spawnDamageNumber === 'function')
              spawnDamageNumber(tipX, tipY - 20, '💥 TRAP BOMB!', '#cc44bb');
            placed = true;
          }
        }
      }
    }
  }

  _jojoStandMeleeAttack(stand, state);
}

function _jojoKQExplode(bomb, stand, state) {
  if (typeof spawnSparks === 'function') spawnSparks(bomb.x, bomb.y, 22);
  if (typeof spawnDamageNumber === 'function')
    spawnDamageNumber(bomb.x, bomb.y - 24, `💥 BOOM! ${JOJO_KQ_BOMB_DMG}`, '#ffaa00');

  const owner = stand.owner;
  if (bomb.onBall && bomb.target?.alive) {
    const p = bomb.target;
    if (p.takeDamage) p.takeDamage(JOJO_KQ_BOMB_DMG, bomb.x, bomb.y, false, owner);
    const ang = Math.random() * Math.PI * 2;
    p.vx += Math.cos(ang) * JOJO_KQ_BOMB_KB;
    p.vy += Math.sin(ang) * JOJO_KQ_BOMB_KB;
  }
  // AoE splash cho balls gần
  for (const p of (state.players || [])) {
    if (!p.alive || p === owner || p === bomb.target) continue;
    const d = Math.hypot(p.x - bomb.x, p.y - bomb.y);
    if (d < JOJO_KQ_BOMB_R * 2.5) {
      if (p.takeDamage) p.takeDamage(Math.round(JOJO_KQ_BOMB_DMG * 0.5), bomb.x, bomb.y, false, owner);
      const nx = (p.x - bomb.x) / (d || 1);
      const ny = (p.y - bomb.y) / (d || 1);
      p.vx += nx * JOJO_KQ_BOMB_KB * 0.6;
      p.vy += ny * JOJO_KQ_BOMB_KB * 0.6;
    }
  }

  if (typeof addBattleLog === 'function')
    addBattleLog('skill_trigger', { attacker: getBallLabel(owner), aColor: owner.color,
      text: `💥 Killer Queen — EXPLOSION! ${JOJO_KQ_BOMB_DMG} dmg` });
}

// ─────────────────────────────────────────────────────────────
// GOLD EXPERIENCE
// ─────────────────────────────────────────────────────────────
function _updateGoldExperience(stand, state) {
  _jojoStandMeleeAttack(stand, state);
}

// Gọi từ ball.js khi owner nảy tường — trigger GE spawn + KQ bomb
function jojoOnWallBounce(ball) {
  if (typeof state === 'undefined') return;

  // ── Gold Experience: spawn rùa/rắn ───────────────────────────
  if (ball.skills?.includes('jojo_stand_ge')) {
    const stand = state.jojoStands?.find(s => s.owner === ball && s.type === 'gold_experience' && s.alive);
    if (stand && stand._geCd <= 0 && (stand._startupCd || 0) <= 0) {
      const isSnake = Math.random() < 0.40;
      _jojoSpawnGEMinion(ball, state, isSnake);
      stand._geCd = JOJO_GE_COOLDOWN;
      if (typeof spawnDamageNumber === 'function')
        spawnDamageNumber(ball.x, ball.y - ball.radius - 20,
          isSnake ? '🐍 Snake!' : '🐢 Turtle!', '#44bb55');
      if (typeof addBattleLog === 'function')
        addBattleLog('skill_trigger', { attacker: getBallLabel(ball), aColor: ball.color,
          text: `🌿 Gold Experience — ${isSnake ? '🐍 Snake' : '🐢 Turtle'} spawned!` });
    }
  }

  // ── Killer Queen: đặt bom tĩnh tại điểm nảy tường ───────────
  if (ball.skills?.includes('jojo_stand_kq')) {
    const stand = state.jojoStands?.find(s => s.owner === ball && s.type === 'killer_queen' && s.alive);
    if (stand && stand._kqTouchCd <= 0 && (stand._startupCd || 0) <= 0
        && stand._kqBombs.length < JOJO_KQ_MAX_BOMBS) {
      stand._kqBombs.push({ x: ball.x, y: ball.y, target: null, onBall: false, life: 360 });
      stand._kqTouchCd = JOJO_KQ_TOUCH_CD;
      if (typeof spawnDamageNumber === 'function')
        spawnDamageNumber(ball.x, ball.y - ball.radius - 18, '💥 WALL BOMB!', '#cc44bb');
      if (typeof addBattleLog === 'function')
        addBattleLog('skill_trigger', { attacker: getBallLabel(ball), aColor: ball.color,
          text: '💥 Killer Queen — wall bomb placed!' });
    }
  }
}

function _jojoSpawnGEMinion(owner, state, isSnake) {
  state.skillMinions = state.skillMinions || [];
  const ang = Math.random() * Math.PI * 2;
  const off = 40 + Math.random() * 15;
  state.skillMinions.push({
    x:           owner.x + Math.cos(ang) * off,
    y:           owner.y + Math.sin(ang) * off,
    vx: 0, vy: 0,
    hp:          isSnake ? 12 : 20,
    maxHp:       isSnake ? 12 : 20,
    r:           isSnake ? 9  : 13,
    color:       isSnake ? '#33aa55' : '#557733',
    owner,
    teamId:      owner.teamId,
    damage:      JOJO_GE_DMG,
    attackRange: isSnake ? 220 : 30,
    attackCd:    0,
    attackCdMax: isSnake ? 80 : 55,
    alive:       true,
    type:        isSnake ? 'jojo_snake' : 'jojo_turtle',
    isRanged:    isSnake,
    lifetime:    JOJO_GE_LIFE,
    _age:        0,
  });
}

// ─────────────────────────────────────────────────────────────
// DRAW — Before balls
// ─────────────────────────────────────────────────────────────
function jojoDrawStands(ctx, state) {
  if (!state?.jojoStands?.length) return;
  for (const stand of state.jojoStands) {
    if (!stand.alive || !stand.owner.alive) continue;
    ctx.save();

    // Dây nối owner → stand
    ctx.beginPath();
    ctx.moveTo(stand.owner.x, stand.owner.y);
    ctx.lineTo(stand.x, stand.y);
    ctx.strokeStyle = `rgba(255,220,100,0.20)`;
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([4, 7]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Stand body glow
    ctx.shadowColor = stand.color;
    ctx.shadowBlur  = 12;
    ctx.beginPath();
    ctx.arc(stand.x, stand.y, stand.r, 0, Math.PI * 2);
    ctx.fillStyle   = stand.color;
    ctx.globalAlpha = 0.80;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.70)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Icon
    ctx.font          = `${Math.round(stand.r * 1.15)}px serif`;
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.globalAlpha   = 0.92;
    ctx.fillStyle     = '#ffffff';
    ctx.fillText(JOJO_STAND_ICONS[stand.type] || '?', stand.x, stand.y);
    ctx.globalAlpha   = 1;

    // ORA ORA flash ring
    if (stand._oraActive) {
      ctx.beginPath();
      ctx.arc(stand.x, stand.y, stand.r + 7, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,220,34,${0.4 + 0.4 * Math.sin(Date.now() * 0.025)})`;
      ctx.lineWidth   = 3;
      ctx.stroke();
    }

    // The World frozen indicator ring
    if (stand.type === 'the_world' && stand._worldActive) {
      const pct   = stand._worldTimer / JOJO_WORLD_DURATION;
      ctx.beginPath();
      ctx.arc(stand.x, stand.y, stand.r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.strokeStyle = 'rgba(80,220,100,0.80)';
      ctx.lineWidth   = 3;
      ctx.stroke();
    }

    // Range circle (faint)
    ctx.beginPath();
    ctx.arc(stand.owner.x, stand.owner.y, stand._range, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,220,100,0.07)`;
    ctx.lineWidth   = 1;
    ctx.stroke();

    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────
// DRAW — After balls (overlays)
// ─────────────────────────────────────────────────────────────
function jojoDrawOverlays(ctx, state) {
  if (!state?.jojoStands?.length) return;
  const _CW = typeof CW !== 'undefined' ? CW : 900;
  const _CH = typeof CH !== 'undefined' ? CH : 600;

  for (const stand of state.jojoStands) {
    if (!stand.alive || !stand.owner.alive) continue;

    // THE WORLD: màn xanh nhẹ + frozen ring trên enemy
    if (stand.type === 'the_world' && stand._worldActive) {
      ctx.save();
      const fade  = Math.min(1, stand._worldTimer / 60);
      ctx.fillStyle = `rgba(30,60,20,${0.16 * fade})`;
      ctx.fillRect(0, 0, _CW, _CH);
      // Vòng sáng đóng băng quanh frozen balls
      for (const fb of stand._frozenBalls) {
        if (!fb.ball.alive) continue;
        ctx.beginPath();
        ctx.arc(fb.ball.x, fb.ball.y, fb.ball.radius + 7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(80,220,100,${0.55 * fade})`;
        ctx.lineWidth   = 3;
        ctx.stroke();
        // "frozen" label
        ctx.font         = '10px Arial';
        ctx.textAlign    = 'center';
        ctx.fillStyle    = `rgba(80,220,100,${0.9 * fade})`;
        ctx.fillText('⏸️', fb.ball.x, fb.ball.y - fb.ball.radius - 14);
      }
      ctx.restore();
    }

    // KILLER QUEEN: vẽ bom
    if (stand.type === 'killer_queen') {
      for (const bomb of stand._kqBombs) {
        ctx.save();
        const pulse = 0.75 + 0.25 * Math.sin(Date.now() * 0.006);
        ctx.beginPath();
        ctx.arc(bomb.x, bomb.y, JOJO_KQ_BOMB_R * pulse, 0, Math.PI * 2);
        ctx.fillStyle   = `rgba(220,60,180,0.22)`;
        ctx.fill();
        ctx.strokeStyle = '#cc44bb';
        ctx.lineWidth   = 2;
        ctx.stroke();
        ctx.font         = '13px serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = '#ffaaee';
        ctx.fillText('💥', bomb.x, bomb.y);
        ctx.restore();
      }
    }
  }
}
