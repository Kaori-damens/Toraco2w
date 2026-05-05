// ============================================================
// JJK — Jujutsu Kaisen: Domains & Curse Techniques
// ============================================================
// Domains (unique per type, 1 per match): trigger at second 20, once per player
//   Phục ma Ngự trù tử  (jjk_domain_malevolent) — đỏ, mưa chém
//   Vô Lượng Không Xứ   (jjk_domain_unlimited)  — tím, làm chậm + quá tải
//   Khảm Hợp Ám Đình    (jjk_domain_chimera)    — bóng tối, né + triệu hồi Shikigami
//
// Curse Techniques (non-unique, có điều kiện trigger):
//   Chú Ngôn        (jjk_ct_command)    — đóng băng khi đối thủ vào tầm gần
//   Kính Kình       (jjk_ct_blackflash) — Fists, nổ liên hoàn sau đòn đánh
//   Bất Nghĩa Du Hí (jjk_ct_swap)      — đổi vị trí khi parry/né
//   Xuyên Huyết     (jjk_ct_blood)      — sau 4 đòn, bắn tia máu xuyên thấu
//
// Hooks được gọi bởi các module khác:
//   jjkUpdateAll(state)          — step() trong game-loop.js
//   jjkDrawDomains(ctx, state)   — render() TRƯỚC khi vẽ ball
//   jjkDrawOverlays(ctx, state)  — render() SAU khi vẽ ball
//   jjkOnHit(att, def, dmg)     — skillOnHit trong skills.js
//   jjkOnParry(b1, b2)          — skillOnParry trong skills.js
//   jjkOnEvade(ball)            — skillOnEvade trong skills.js
// ============================================================

const JJK_DOMAIN_R         = 300;  // radius domain
const JJK_DOMAIN_TRIGGER   = 1200; // matchTime = giây 20
const JJK_DOMAIN_DURATIONS = { malevolent: 3600, unlimited: 3600, chimera: 3600 }; // 60s
const JJK_DOMAIN_NAMES = {
  malevolent: 'Phục ma Ngự trù tử',
  unlimited:  'Vô Lượng Không Xứ',
  chimera:    'Khảm Hợp Ám Đình',
};
const JJK_DOMAIN_COLORS = {
  malevolent: '#cc0000',
  unlimited:  '#6600cc',
  chimera:    '#334466',
};

// ── Helper: tính tâm arena ───────────────────────────────────
function _jjkArenaCenter(arena) {
  if (arena.cx !== undefined) return { cx: arena.cx, cy: arena.cy };
  return {
    cx: (arena.x || 0) + (arena.w || 1000) / 2,
    cy: (arena.y || 0) + (arena.h || 1000) / 2,
  };
}

// ── Evade debuff helpers ─────────────────────────────────────
// Domains gọi _jjkClearEvadeDebuffs() đầu frame, rồi re-apply cho ball bên trong.
function _jjkClearEvadeDebuffs(state) {
  for (const ball of state.players) {
    if (ball._jjkEvadeHalved) {
      ball.evadeChance = ball._jjkOrigEvade ?? ball.evadeChance;
      ball._jjkEvadeHalved = false;
      delete ball._jjkOrigEvade;
    }
  }
}
function _jjkApplyEvadeDebuff(ball) {
  if (!ball._jjkEvadeHalved) {
    ball._jjkOrigEvade  = ball.evadeChance;
    ball.evadeChance    = ball.evadeChance * 0.5;
    ball._jjkEvadeHalved = true;
  }
}

// ── Domain activation ─────────────────────────────────────────
function _jjkActivateDomain(ball, state) {
  const domainMap = {
    'jjk_domain_malevolent': 'malevolent',
    'jjk_domain_unlimited':  'unlimited',
    'jjk_domain_chimera':    'chimera',
  };
  for (const [skillId, domType] of Object.entries(domainMap)) {
    if (!ball.skills?.includes(skillId)) continue;
    if (ball._jjkDomainUsed) return;
    // Không mở nếu cùng loại domain đang active
    if (state.jjkDomains.some(d => d.type === domType)) return;

    ball._jjkDomainUsed = true;
    const name = JJK_DOMAIN_NAMES[domType];

    const domain = {
      type:          domType,
      owner:         ball,
      cx:            ball.x,
      cy:            ball.y,
      r:             JJK_DOMAIN_R,
      timer:         JJK_DOMAIN_DURATIONS[domType],
      _startupCd:    120,          // 2s cooldown ẩn khi domain mới mở — chưa slash/debuff
      _slashTimer:   120,          // random 2–4s giữa các wave
      _slashCount:   1,
      _slashScaleTimer: 0,         // tăng mỗi 120 frames khi _slashCount >= 10
      _slashEffects: [],
      _slashQueue:   [],           // nhát chém chờ hiện dần (stagger)
      _slashQueueTimer: 0,
      _shikiTimer:   60,  // spawn đầu tiên sau 1s
      _debuffed:     new Set(),
    };
    state.jjkDomains.push(domain);

    if (typeof ball.shout === 'function') ball.shout(`🔮 DOMAIN EXPANSION!\n${name}`, 280, JJK_DOMAIN_COLORS[domType]);
    if (typeof flashSkillHUD === 'function' && typeof SKILL_MAP !== 'undefined')
      flashSkillHUD(ball, SKILL_MAP[skillId]);
    if (typeof addBattleLog === 'function')
      addBattleLog('skill_trigger', { attacker: getBallLabel(ball), aColor: ball.color,
        text: `🔮 Domain Expand: ${name}!` });

    // Chimera: tăng evade owner ngay lập tức
    if (domType === 'chimera') {
      ball.evadeChance = (ball.evadeChance || 0) + 0.20;
      domain._ownerEvadeBoosted = true;
    }
    return;
  }
}

// ── Domain expiry ─────────────────────────────────────────────
function _jjkExpireDomain(domain) {
  if (domain.type === 'chimera' && domain._ownerEvadeBoosted && domain.owner?.alive) {
    domain.owner.evadeChance = Math.max(0, (domain.owner.evadeChance || 0) - 0.20);
    domain._ownerEvadeBoosted = false;
  }
  for (const ball of (domain._debuffed ?? [])) {
    ball._jjkVoidDebuff = false;
  }
  if (typeof spawnDamageNumber === 'function')
    spawnDamageNumber(domain.cx, domain.cy - 20, '🔮 Domain Closed', '#888888');
}

// ── Domain ticks ─────────────────────────────────────────────

function _jjkTickMalevolent(domain, state) {
  // ── Slow scale: khi _slashCount >= 10, tăng 1 nhát mỗi 2s (120 frames) ──
  if (domain._slashCount >= 10) {
    domain._slashScaleTimer++;
    if (domain._slashScaleTimer >= 120) {
      domain._slashScaleTimer = 0;
      domain._slashCount++;
    }
  }

  // ── Wave timer: random 2–4s giữa các đợt chém ────────────────
  domain._slashTimer--;
  if (domain._slashTimer <= 0) {
    // Reset timer ngẫu nhiên 2–4s (120–240 frames)
    domain._slashTimer = 120 + Math.floor(Math.random() * 121);

    const enemies = state.players.filter(p =>
      p.alive && p !== domain.owner &&
      Math.hypot(p.x - domain.cx, p.y - domain.cy) < domain.r + p.radius);

    // Gây sát thương cho enemy bên trong (bypass immunity — phép thuật domain)
    for (let i = 0; i < domain._slashCount; i++) {
      if (!enemies.length) break;
      const target = enemies[Math.floor(Math.random() * enemies.length)];
      if (target?.takeDamage) {
        target.immunityFrames = 0;
        target.projImmunityFrames = 0;
        target.takeDamage(5, target.x, target.y, false, domain.owner);
      }
      if (typeof spawnDamageNumber === 'function')
        spawnDamageNumber(target.x, target.y - target.radius - 10, '🩸 5', '#cc0000');
    }

    // Visual slash luôn hiện — kể cả khi không có enemy trong domain
    const _rndInDomain = () => {
      const a = Math.random() * Math.PI * 2;
      const r = domain.r * Math.sqrt(Math.random());
      return { x: domain.cx + Math.cos(a) * r, y: domain.cy + Math.sin(a) * r };
    };
    for (let i = 0; i < domain._slashCount; i++) {
      const p1 = _rndInDomain(), p2 = _rndInDomain();
      domain._slashQueue.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    }
    domain._slashQueueTimer = 0;
    // Tăng nhát chém: waves 1–9 tăng 1 mỗi wave; >= 10 chỉ tăng qua _slashScaleTimer (2s)
    if (domain._slashCount < 10) {
      domain._slashCount++;
    }
  }

  // ── Pop 1 nhát từ queue mỗi 4 frames (≈67ms) ─────────────────
  if (domain._slashQueue.length > 0) {
    if (--domain._slashQueueTimer <= 0) {
      const sl = domain._slashQueue.shift();
      domain._slashEffects.push({ ...sl, life: 40 });
      domain._slashQueueTimer = 4;
    }
  }

  // Decay slash visuals
  for (let i = domain._slashEffects.length - 1; i >= 0; i--) {
    if (--domain._slashEffects[i].life <= 0) domain._slashEffects.splice(i, 1);
  }

  // Evade -50% cho enemy bên trong
  for (const ball of state.players) {
    if (!ball.alive || ball === domain.owner) continue;
    if (Math.hypot(ball.x - domain.cx, ball.y - domain.cy) < domain.r) {
      _jjkApplyEvadeDebuff(ball);
    }
  }
}

function _jjkTickUnlimited(domain, state) {
  const prevDebuffed = new Set(domain._debuffed);
  domain._debuffed.clear();

  for (const ball of state.players) {
    if (!ball.alive || ball === domain.owner) continue;
    const inside = Math.hypot(ball.x - domain.cx, ball.y - domain.cy) < domain.r;
    if (inside) {
      domain._debuffed.add(ball);
      // Giới hạn speed 30%
      const maxSlowed = (ball.baseMaxSpd || 4) * 0.30;
      const spd = Math.hypot(ball.vx, ball.vy);
      if (spd > maxSlowed) {
        ball.vx = ball.vx / spd * maxSlowed;
        ball.vy = ball.vy / spd * maxSlowed;
      }
      // Evade -50%
      _jjkApplyEvadeDebuff(ball);
      ball._jjkVoidDebuff = true;
      // Thông báo khi vừa vào
      if (!prevDebuffed.has(ball) && typeof ball.shout === 'function')
        ball.shout('💜 OVERLOADED!', 90, '#9900cc');
    } else {
      ball._jjkVoidDebuff = false;
    }
  }
}

function _jjkTickChimera(domain, state) {
  // Evade -50% cho enemy bên trong
  for (const ball of state.players) {
    if (!ball.alive || ball === domain.owner) continue;
    if (Math.hypot(ball.x - domain.cx, ball.y - domain.cy) < domain.r) {
      _jjkApplyEvadeDebuff(ball);
    }
  }
  // Spawn Shikigami mỗi 5s (300f)
  domain._shikiTimer--;
  if (domain._shikiTimer <= 0) {
    domain._shikiTimer = 300;
    _jjkSpawnShikigami(domain.owner, state, domain);
  }
}

// ── Shikigami spawn ───────────────────────────────────────────
function _jjkSpawnShikigami(owner, state, domain) {
  if (typeof state === 'undefined') return;
  state.skillMinions = state.skillMinions || [];
  const ang = Math.random() * Math.PI * 2;
  const off = 35 + Math.random() * 15;
  state.skillMinions.push({
    x:            owner.x + Math.cos(ang) * off,
    y:            owner.y + Math.sin(ang) * off,
    vx: 0, vy: 0,
    hp: 10, maxHp: 10,
    r:            12,
    color:        '#99ccff',   // xanh sáng dễ thấy trên nền tối
    owner,
    teamId:       owner.teamId,
    damage:       4,
    attackRange:  28,
    attackCd:     0,
    attackCdMax:  60,
    alive:        true,
    type:         'shikigami',
    hitsDealt:    0,           // biến mất sau 2 đòn đánh trúng
    killOnHit:    true,        // biến mất khi nhận bất kỳ đòn projectile
    lifetime:     0,
    _age:         0,
    jjkDomain:    domain,      // tham chiếu domain để clamp boundary
  });
  if (typeof spawnSparks === 'function')        spawnSparks(owner.x, owner.y, 8);
  if (typeof spawnDamageNumber === 'function') spawnDamageNumber(owner.x, owner.y - 30, '👁️ Shikigami!', '#8899aa');
}

// ── Main update (gọi mỗi frame từ game-loop step()) ──────────
function jjkUpdateAll(state) {
  if (!state.jjkDomains) state.jjkDomains = [];
  if (!state.jjkChains)  state.jjkChains  = [];

  // 1. Clear evade debuffs — domains sẽ re-apply ngay frame này
  _jjkClearEvadeDebuffs(state);

  // 2. Kích hoạt domain khi matchTime >= giây 20
  if (state.matchTime >= JJK_DOMAIN_TRIGGER) {
    for (const ball of state.players) {
      if (!ball.alive || ball._jjkDomainUsed) continue;
      _jjkActivateDomain(ball, state);
    }
  }

  // 3. Tick từng domain đang active
  for (let i = state.jjkDomains.length - 1; i >= 0; i--) {
    const domain = state.jjkDomains[i];
    if (!domain.owner.alive) {
      _jjkExpireDomain(domain);
      state.jjkDomains.splice(i, 1);
      continue;
    }
    domain.timer--;
    if (domain.timer <= 0) {
      _jjkExpireDomain(domain);
      state.jjkDomains.splice(i, 1);
      continue;
    }
    // Startup cooldown 2s — domain hiện diện nhưng chưa slash/debuff
    if (domain._startupCd > 0) { domain._startupCd--; continue; }
    if      (domain.type === 'malevolent') _jjkTickMalevolent(domain, state);
    else if (domain.type === 'unlimited')  _jjkTickUnlimited(domain, state);
    else if (domain.type === 'chimera')    _jjkTickChimera(domain, state);
  }

  // 4. Shikigami boundary — clamp trong domain, kill khi domain hết
  for (const m of (state.skillMinions || [])) {
    if (!m.alive || m.type !== 'shikigami' || !m.jjkDomain) continue;
    const dom = m.jjkDomain;
    // Domain đã hết → kill shikigami
    if (!state.jjkDomains.includes(dom)) { m.alive = false; continue; }
    // Đẩy về trong domain nếu đi ra ngoài
    const dist = Math.hypot(m.x - dom.cx, m.y - dom.cy);
    if (dist > dom.r - m.r) {
      const nx = (m.x - dom.cx) / (dist || 1);
      const ny = (m.y - dom.cy) / (dist || 1);
      m.x = dom.cx + nx * (dom.r - m.r);
      m.y = dom.cy + ny * (dom.r - m.r);
      // Reflect velocity vào trong
      const dot = m.vx * nx + m.vy * ny;
      if (dot > 0) { m.vx -= 2 * dot * nx; m.vy -= 2 * dot * ny; }
    }
  }

  // 5. Kính Kình — chain explosion queue
  for (let i = state.jjkChains.length - 1; i >= 0; i--) {
    const chain = state.jjkChains[i];
    if (--chain.delay > 0) continue;
    state.jjkChains.splice(i, 1);
    if (!chain.target.alive) continue;
    if (Math.random() < chain.chance) {
      const dmg = Math.round(chain.dmg);
      chain.target.takeDamage(dmg, chain.target.x, chain.target.y, false, chain.attacker);
      if (typeof spawnSparks === 'function') spawnSparks(chain.target.x, chain.target.y, 12);
      if (typeof spawnDamageNumber === 'function')
        spawnDamageNumber(chain.target.x, chain.target.y - chain.target.radius - 10,
          `⚡ ${dmg}`, '#cc44ff');
      // Nổ tiếp theo — xác suất giảm ½, sát thương × 0.9
      const nextChance = chain.chance * 0.5;
      if (nextChance >= 0.05 && chain.depth < 8) {
        state.jjkChains.push({
          target:   chain.target,
          attacker: chain.attacker,
          dmg:      chain.dmg * 0.9,
          delay:    18,
          chance:   nextChance,
          depth:    chain.depth + 1,
        });
      }
    }
  }

  // 5. Chú Ngôn — proximity freeze (check mỗi frame)
  for (const ball of state.players) {
    if (!ball.alive || !ball.skills?.includes('jjk_ct_command')) continue;
    const now = state.matchTime;
    ball._jjkCommandCd = ball._jjkCommandCd ?? -9999;
    if (now - ball._jjkCommandCd < 1200) continue; // 20s cooldown

    for (const other of state.players) {
      if (!other.alive || other === ball) continue;
      if (Math.hypot(ball.x - other.x, ball.y - other.y) > 80) continue;
      // Đóng băng!
      ball._jjkCommandCd = now;
      if (typeof other.parryStun === 'function') other.parryStun(90); // 1.5s
      if (typeof ball.shout === 'function')   ball.shout('🛑 Dừng lại!', 150, '#ff4400');
      if (typeof spawnDamageNumber === 'function')
        spawnDamageNumber(other.x, other.y - other.radius - 18, '🛑 FROZEN 1.5s!', '#ff4400');
      if (typeof flashSkillHUD === 'function' && typeof SKILL_MAP !== 'undefined')
        flashSkillHUD(ball, SKILL_MAP['jjk_ct_command']);
      if (typeof addBattleLog === 'function')
        addBattleLog('skill_trigger', { attacker: getBallLabel(ball), aColor: ball.color,
          text: `🛑 Chú Ngôn — frozen ${getBallLabel(other)} for 1.5s!` });
      break; // chỉ freeze 1 enemy mỗi lần trigger
    }
  }
}

// ── Draw: domain backgrounds (TRƯỚC khi vẽ ball) ─────────────
function jjkDrawDomains(ctx, state) {
  if (!state?.jjkDomains?.length) return;
  for (const domain of state.jjkDomains) {
    const maxT  = JJK_DOMAIN_DURATIONS[domain.type];
    const alpha = Math.min(1, domain.timer / 60); // fade out giây cuối

    ctx.save();

    if (domain.type === 'malevolent') {
      // Vòng tròn đỏ pulsing
      const pulse = 0.12 + 0.04 * Math.sin(Date.now() * 0.003);
      ctx.beginPath();
      ctx.arc(domain.cx, domain.cy, domain.r, 0, Math.PI * 2);
      ctx.fillStyle   = `rgba(180,0,0,${pulse * alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(220,20,0,${0.8 * alpha})`;
      ctx.lineWidth   = 3;
      ctx.setLineDash([10, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Tĩnh mạch
      ctx.strokeStyle = `rgba(255,0,0,${0.25 * alpha})`;
      ctx.lineWidth   = 1;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + Date.now() * 0.0005;
        ctx.beginPath();
        ctx.moveTo(domain.cx, domain.cy);
        ctx.lineTo(domain.cx + Math.cos(a) * domain.r, domain.cy + Math.sin(a) * domain.r);
        ctx.stroke();
      }
      // Slash effects
      ctx.lineCap = 'round';
      for (const sl of domain._slashEffects) {
        const sA = (sl.life / 30) * alpha;
        ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 8;
        ctx.strokeStyle = `rgba(200,0,0,${sA})`;
        ctx.lineWidth   = 2.5;
        ctx.beginPath();
        ctx.moveTo(sl.x1, sl.y1);
        ctx.lineTo(sl.x2, sl.y2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

    } else if (domain.type === 'unlimited') {
      // Vùng tím hư không
      const pulse = 0.15 + 0.06 * Math.sin(Date.now() * 0.002);
      ctx.beginPath();
      ctx.arc(domain.cx, domain.cy, domain.r, 0, Math.PI * 2);
      ctx.fillStyle   = `rgba(80,0,140,${pulse * alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(160,60,255,${0.85 * alpha})`;
      ctx.lineWidth   = 3;
      ctx.stroke();
      // Xoắn ốc
      ctx.strokeStyle = `rgba(200,100,255,${0.22 * alpha})`;
      ctx.lineWidth   = 1;
      for (let k = 0; k < 3; k++) {
        const rot = Date.now() * 0.001 + (k * Math.PI * 2 / 3);
        ctx.save();
        ctx.translate(domain.cx, domain.cy);
        ctx.rotate(rot);
        ctx.beginPath();
        for (let t2 = 0; t2 < Math.PI * 4; t2 += 0.12) {
          const r2 = t2 * domain.r / (Math.PI * 4);
          t2 < 0.01 ? ctx.moveTo(Math.cos(t2)*r2, Math.sin(t2)*r2)
                     : ctx.lineTo(Math.cos(t2)*r2, Math.sin(t2)*r2);
        }
        ctx.stroke();
        ctx.restore();
      }

    } else if (domain.type === 'chimera') {
      // Bóng tối
      const pulse = 0.22 + 0.07 * Math.sin(Date.now() * 0.002);
      ctx.beginPath();
      ctx.arc(domain.cx, domain.cy, domain.r, 0, Math.PI * 2);
      ctx.fillStyle   = `rgba(5,5,15,${pulse * alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(50,70,110,${0.7 * alpha})`;
      ctx.lineWidth   = 3;
      ctx.stroke();
      // Tua/xúc tu bóng tối
      ctx.lineWidth = 2;
      for (let k = 0; k < 12; k++) {
        const a  = (k / 12) * Math.PI * 2 + Date.now() * 0.0004;
        const r2 = domain.r * (0.3 + 0.5 * Math.abs(Math.sin(Date.now() * 0.002 + k)));
        ctx.strokeStyle = `rgba(30,50,90,${0.4 * alpha})`;
        ctx.beginPath();
        ctx.moveTo(domain.cx, domain.cy);
        ctx.lineTo(domain.cx + Math.cos(a) * r2, domain.cy + Math.sin(a) * r2);
        ctx.stroke();
      }
    }

    // Timer arc (cung tròn quanh edge)
    const timerPct = domain.timer / maxT;
    ctx.beginPath();
    ctx.arc(domain.cx, domain.cy, domain.r + 6, -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * timerPct);
    ctx.strokeStyle = `rgba(255,255,255,${0.55 * alpha})`;
    ctx.lineWidth   = 2;
    ctx.setLineDash([]);
    ctx.stroke();

    ctx.restore();
  }
}

// ── Draw: overlays lên trên ball (AFTER ball draw) ───────────
// Chimera: chủ nhân hiện như bóng tối với mắt phát sáng
function jjkDrawOverlays(ctx, state) {
  if (!state?.jjkDomains?.length) return;
  for (const domain of state.jjkDomains) {
    if (domain.type !== 'chimera') continue;
    const ball = domain.owner;
    if (!ball?.alive) continue;
    const alpha = Math.min(1, domain.timer / 60);

    ctx.save();
    // Bóng đen phủ lên ball
    ctx.globalAlpha = 0.82 * alpha;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = '#05050f';
    ctx.fill();
    // Mắt phát sáng
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#6699ff';
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = '#88aaff';
    ctx.beginPath();
    ctx.ellipse(ball.x, ball.y, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.restore();
  }
}

// ── Curse Tech hooks ──────────────────────────────────────────
// Gọi từ skillOnHit (skills.js)
function jjkOnHit(attacker, defender, dmg) {
  // ── Kính Kình: chain explosion sau đòn Fists đầu tiên
  if (attacker.skills?.includes('jjk_ct_blackflash')
      && attacker.weaponDef?.id === 'fists'
      && typeof state !== 'undefined') {
    state.jjkChains = state.jjkChains || [];
    state.jjkChains.push({
      target:   defender,
      attacker: attacker,
      dmg:      dmg * 0.9,
      delay:    18,     // 0.3s
      chance:   0.80,
      depth:    0,
    });
    if (typeof flashSkillHUD === 'function' && typeof SKILL_MAP !== 'undefined')
      flashSkillHUD(attacker, SKILL_MAP['jjk_ct_blackflash']);
  }

  // ── Xuyên Huyết: sau 4 đòn bắn tia máu xuyên thấu (cooldown 11s)
  if (attacker.skills?.includes('jjk_ct_blood') && typeof state !== 'undefined') {
    const now = state.matchTime || 0;
    attacker._jjkBloodHits = (attacker._jjkBloodHits || 0) + 1;
    attacker._jjkBloodCd   = attacker._jjkBloodCd ?? -9999;
    if (attacker._jjkBloodHits >= 4 && now - attacker._jjkBloodCd >= 660) {
      attacker._jjkBloodHits = 0;
      attacker._jjkBloodCd   = now;
      // Tìm enemy gần nhất
      const enemies = state.players.filter(p => p.alive && p !== attacker);
      if (enemies.length > 0) {
        const target = enemies.reduce((a, b) =>
          Math.hypot(b.x - attacker.x, b.y - attacker.y) <
          Math.hypot(a.x - attacker.x, a.y - attacker.y) ? b : a);
        const dx = target.x - attacker.x, dy = target.y - attacker.y;
        const dist = Math.hypot(dx, dy) || 1;
        const bolt = new Projectile(
          attacker.x, attacker.y,
          (dx / dist) * 22, (dy / dist) * 22,
          attacker, 'blood_bolt',
          Math.round((attacker.charSTR ?? 5) * 1.5 + 8));
        bolt.piercing  = true;
        bolt.lifetimer = 90; // tự biến mất sau 1.5s
        bolt.maxBounces = 0;
        state.projectiles.push(bolt);
        if (typeof attacker.shout === 'function')
          attacker.shout('💉 Xuyên Huyết!', 180, '#cc0044');
        if (typeof flashSkillHUD === 'function' && typeof SKILL_MAP !== 'undefined')
          flashSkillHUD(attacker, SKILL_MAP['jjk_ct_blood']);
        if (typeof addBattleLog === 'function')
          addBattleLog('skill_trigger', { attacker: getBallLabel(attacker), aColor: attacker.color,
            text: '💉 Xuyên Huyết — blood pierce bolt!' });
      }
    }
  }
}

// Gọi từ skillOnParry (skills.js)
function jjkOnParry(b1, b2) {
  if (typeof state === 'undefined') return;
  for (const [ball, opp] of [[b1, b2], [b2, b1]]) {
    // ── Bất Nghĩa Du Hí: đổi vị trí khi parry (15s cd)
    if (ball.skills?.includes('jjk_ct_swap')) {
      ball._jjkSwapCd      = ball._jjkSwapCd      ?? -9999;
      ball._jjkSwapCooldown = ball._jjkSwapCooldown ?? 420; // bắt đầu 7s, giảm 1s mỗi lần
      if (state.matchTime - ball._jjkSwapCd >= ball._jjkSwapCooldown) {
        ball._jjkSwapCd = state.matchTime;
        ball._jjkSwapCooldown = Math.max(60, ball._jjkSwapCooldown - 60); // min 1s
        _jjkSwapPositions(ball, opp);
      }
    }
    // ── Unlimited Void: nhân đôi parry stun nếu owner có domain active
    if (state.jjkDomains?.some(d => d.type === 'unlimited' && d.owner === ball)) {
      if (opp.stunTimer > 0) opp.stunTimer = Math.min(opp.stunTimer * 2, 180);
    }
  }
}

// Gọi từ skillOnEvade (skills.js)
function jjkOnEvade(ball) {
  if (!ball.skills?.includes('jjk_ct_swap') || typeof state === 'undefined') return;
  ball._jjkSwapCd       = ball._jjkSwapCd       ?? -9999;
  ball._jjkSwapCooldown = ball._jjkSwapCooldown ?? 420;
  if (state.matchTime - ball._jjkSwapCd < ball._jjkSwapCooldown) return;
  // Enemy gần nhất
  const enemies = state.players.filter(p => p.alive && p !== ball);
  if (!enemies.length) return;
  const opp = enemies.reduce((a, b) =>
    Math.hypot(b.x - ball.x, b.y - ball.y) <
    Math.hypot(a.x - ball.x, a.y - ball.y) ? b : a);
  ball._jjkSwapCd = state.matchTime;
  ball._jjkSwapCooldown = Math.max(60, ball._jjkSwapCooldown - 60); // giảm 1s, min 1s
  _jjkSwapPositions(ball, opp);
}

// ── Swap positions helper ─────────────────────────────────────
function _jjkSwapPositions(ball, opp) {
  const tx = opp.x, ty = opp.y;
  opp.x  = ball.x; opp.y  = ball.y;
  ball.x = tx;     ball.y = ty;
  // Ball phóng về phía vị trí của opp (trước khi đổi = tx,ty)
  const spd = Math.max(6, Math.hypot(ball.vx, ball.vy));
  const dx  = tx - opp.x, dy = ty - opp.y;
  const dist = Math.hypot(dx, dy) || 1;
  ball.vx = dx / dist * spd;
  ball.vy = dy / dist * spd;
  // Opp stun 0.5s (30 frames)
  if (typeof opp.parryStun === 'function') opp.parryStun(30);
  if (typeof spawnSparks === 'function') {
    spawnSparks(ball.x, ball.y, 10);
    spawnSparks(opp.x,  opp.y,  10);
  }
  if (typeof ball.shout === 'function')  ball.shout('🔀 Bất Nghĩa Du Hí!', 160, '#33ccff');
  if (typeof spawnDamageNumber === 'function')
    spawnDamageNumber(opp.x, opp.y - opp.radius - 18, '🔀 SWAPPED!', '#33ccff');
  if (typeof flashSkillHUD === 'function' && typeof SKILL_MAP !== 'undefined')
    flashSkillHUD(ball, SKILL_MAP['jjk_ct_swap']);
  if (typeof addBattleLog === 'function')
    addBattleLog('skill_trigger', { attacker: getBallLabel(ball), aColor: ball.color,
      text: `🔀 Bất Nghĩa Du Hí — swapped with ${getBallLabel(opp)}!` });
}
