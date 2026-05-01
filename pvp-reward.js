// ============================================================
// PVP REWARD WHEEL — spins after each tournament match win
// ============================================================

const STAT_KEYS_PVP  = ['strength', 'speed', 'durability', 'iq', 'battleiq', 'ma'];
const STAT_SHORT_PVP = { strength:'STR', speed:'SPD', durability:'DUR', iq:'IQ', battleiq:'BIQ', ma:'MA' };

// ── PVP_REWARDS — data-driven, tự động apply qua _pvpApplyReward ────
// Semantic fields (bất kỳ field nào không có = không trigger tính năng đó):
//   stat         {string}  — key trong charStats để cộng vào (dùng với amount)
//   allStats     {true}    — cộng amount vào TẤT CẢ 6 stats
//   lowestStat   {true}    — cộng amount vào stat thấp nhất
//   highestStat  {true}    — cộng amount vào stat cao nhất
//   amount       {number}  — số cộng vào (dùng với stat/allStats/lowestStat/highestStat)
//   skillCount   {number}  — số skill được chọn qua PVP Skill Wheel
//   statSpins    {number}  — số lần quay stat wheel (+2 mỗi lần)
//   statAmount   {number}  — amount mỗi lần spin stat wheel (default 2)
//   forbiddenWeapon {true} — mở Forbidden Weapon Wheel
//   statBlock    {true}    — Leviathan block reward này
//   skillBlock   {true}    — Belphegor block reward này
//
// Để thêm reward mới, chỉ cần thêm object vào array — không cần sửa code apply.
// Ví dụ: { id:'spd2', label:'+2 SPD', stat:'speed', amount:2, statBlock:true, icon:'⚡', weight:3, color:'#2266dd' }
const PVP_REWARDS = [
<<<<<<< HEAD
  { id:'str1',  label:'+1 STR',           stat:'strength',   amount:1, statBlock:true,  icon:'💪', weight:10,   color:'#bb3311' },
  { id:'spd1',  label:'+1 SPD',           stat:'speed',      amount:1, statBlock:true,  icon:'⚡', weight:10,   color:'#1155bb' },
  { id:'dur1',  label:'+1 DUR',           stat:'durability', amount:1, statBlock:true,  icon:'🛡', weight:10,   color:'#117733' },
  { id:'iq1',   label:'+1 IQ',            stat:'iq',         amount:1, statBlock:true,  icon:'🧠', weight:10,   color:'#997711' },
  { id:'biq1',  label:'+1 BIQ',           stat:'battleiq',   amount:1, statBlock:true,  icon:'🎯', weight:10,   color:'#771199' },
  { id:'ma1',   label:'+1 MA',            stat:'ma',         amount:1, statBlock:true,  icon:'🥋', weight:10,   color:'#992211' },
  { id:'low2',  label:'+2 Lowest',  lowestStat:true,  amount:2, statBlock:true,         icon:'📉', weight:6,    color:'#224466' },
  { id:'high2', label:'+2 Highest', highestStat:true, amount:2, statBlock:true,         icon:'📈', weight:6,    color:'#664422' },
  { id:'pow1',  label:'1 Power',    skillCount:1,            skillBlock:true,            icon:'✨', weight:6,    color:'#116688' },
  { id:'pow2',  label:'2 Powers',   skillCount:2,            skillBlock:true,            icon:'🌟', weight:2,    color:'#bb7700' },
  { id:'pow3',  label:'3 Powers',   skillCount:3,            skillBlock:true,            icon:'💫', weight:1,    color:'#aa1166' },
  { id:'rnd3',  label:'+2 Rand×3',  statSpins:3, statAmount:2, statBlock:true,          icon:'🎲', weight:0.64, color:'#115566' },
  { id:'rnd6',  label:'+2 Rand×6',  statSpins:6, statAmount:2, statBlock:true,          icon:'🎰', weight:0.36, color:'#661188' },
  { id:'all1',  label:'+1 All',     allStats:true, amount:1, statBlock:true,            icon:'⭐', weight:4,    color:'#998800' },
  { id:'forbidden', label:'🚫 Forbidden Weapon', forbiddenWeapon:true,                  icon:'🚫', weight:4,    color:'#8800cc' },
=======
  { id:'str1',  label:'+1 STR',     desc:'Strength +1',             icon:'💪', weight:10,   color:'#bb3311' },
  { id:'spd1',  label:'+1 SPD',     desc:'Speed +1',                icon:'⚡', weight:10,   color:'#1155bb' },
  { id:'dur1',  label:'+1 DUR',     desc:'Durability +1',           icon:'🛡', weight:10,   color:'#117733' },
  { id:'iq1',   label:'+1 IQ',      desc:'IQ +1',                   icon:'🧠', weight:10,   color:'#997711' },
  { id:'biq1',  label:'+1 BIQ',     desc:'Battle IQ +1',            icon:'🎯', weight:10,   color:'#771199' },
  { id:'ma1',   label:'+1 MA',      desc:'Martial Arts +1',         icon:'🥋', weight:10,   color:'#992211' },
  { id:'low2',  label:'+2 Lowest',  desc:'+2 to your lowest stat',  icon:'📉', weight:6,    color:'#224466' },
  { id:'high2', label:'+2 Highest', desc:'+2 to your highest stat', icon:'📈', weight:6,    color:'#664422' },
  { id:'pow1',  label:'1 Power',    desc:'Gain 1 random skill',     icon:'✨', weight:6,    color:'#116688' },
  { id:'pow2',  label:'2 Powers',   desc:'Gain 2 random skills',    icon:'🌟', weight:2,    color:'#bb7700' },
  { id:'pow3',  label:'3 Powers',   desc:'Gain 3 random skills',    icon:'💫', weight:1,    color:'#aa1166' },
  { id:'rnd3',  label:'+2 Rand×3',  desc:'+2 to 3 random stats',    icon:'🎲', weight:0.64, color:'#115566' },
  { id:'rnd6',  label:'+2 Rand×6',  desc:'+2 to 6 random stats',    icon:'🎰', weight:0.36, color:'#661188' },
  { id:'all1',      label:'+1 All',           desc:'All stats +1',            icon:'⭐', weight:4,    color:'#998800' },
  { id:'forbidden', label:'Forbidden Weapon', desc:'Equip a Forbidden Weapon', icon:'🚫', weight:4,    color:'#8800cc' },
>>>>>>> 824de0f1885f15e32d77f296b4ce15b81b8206fd
];

// ── Weighted pick ──────────────────────────────────────────────────
function _pvpPickReward() {
  const total = PVP_REWARDS.reduce((s, r) => s + r.weight, 0);
  let r = Math.random() * total;
  for (const rw of PVP_REWARDS) { r -= rw.weight; if (r <= 0) return rw; }
  return PVP_REWARDS[PVP_REWARDS.length - 1];
}

// ── Add N random skills to fighter (not already owned) ────────────
function _pvpAddPowers(fighter, count) {
  if (typeof SKILL_DEFS === 'undefined') return [];
  const has  = new Set(fighter.skills || []);
  const pool = SKILL_DEFS.filter(s =>
    !has.has(s.id) &&
    !s.unique &&
    !(s.weapon && s.weapon !== fighter.weaponId)  // lọc skill weapon-specific không phù hợp
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const toAdd = pool.slice(0, count);
  if (!fighter.skills) fighter.skills = [];
  toAdd.forEach(s => fighter.skills.push(s.id));
  return toAdd;
}

// ── Apply reward — data-driven, đọc semantic fields từ reward object ──
// Wheel-based rewards (skillCount / statSpins / forbiddenWeapon) bình thường bị
// intercepted trong _pvpOnLand và không gọi tới đây.
// Hàm này vẫn xử lý chúng như fallback (nếu modal wheel không tồn tại).
function _pvpApplyReward(fighter, reward) {
  const cs = fighter.charStats;
<<<<<<< HEAD

  // +N vào 1 stat cụ thể
  if (reward.stat && reward.amount) {
    const o = cs[reward.stat] || 0;
    cs[reward.stat] = o + reward.amount;
    const sh = STAT_SHORT_PVP[reward.stat] ?? reward.stat.toUpperCase();
    return `${sh}: ${o} → ${o + reward.amount}`;
=======
  switch (reward.id) {
    case 'str1':  { const o=cs.strength   ||0; cs.strength   =o+1; return `STR: ${o} → ${o+1}`; }
    case 'spd1':  { const o=cs.speed      ||0; cs.speed      =o+1; return `SPD: ${o} → ${o+1}`; }
    case 'dur1':  { const o=cs.durability ||0; cs.durability =o+1; return `DUR: ${o} → ${o+1}`; }
    case 'iq1':   { const o=cs.iq         ||0; cs.iq         =o+1; return `IQ: ${o} → ${o+1}`;  }
    case 'biq1':  { const o=cs.battleiq   ||0; cs.battleiq   =o+1; return `BIQ: ${o} → ${o+1}`; }
    case 'ma1':   { const o=cs.ma         ||0; cs.ma         =o+1; return `MA: ${o} → ${o+1}`;  }
    case 'low2': {
      const st = STAT_KEYS_PVP.reduce((a,k) => (cs[k]||0) < (cs[a]||0) ? k : a, STAT_KEYS_PVP[0]);
      const o = cs[st]||0; cs[st] = o+2;
      return `${STAT_SHORT_PVP[st]} (lowest): ${o} → ${o+2}`;
    }
    case 'high2': {
      const st = STAT_KEYS_PVP.reduce((a,k) => (cs[k]||0) > (cs[a]||0) ? k : a, STAT_KEYS_PVP[0]);
      const o = cs[st]||0; cs[st] = o+2;
      return `${STAT_SHORT_PVP[st]} (highest): ${o} → ${o+2}`;
    }
    case 'pow1': case 'pow2': case 'pow3': {
      const n     = reward.id === 'pow1' ? 1 : reward.id === 'pow2' ? 2 : 3;
      const added = _pvpAddPowers(fighter, n);
      return added.length ? 'Gained: ' + added.map(s => s.name).join(', ')
                           : 'No skills available';
    }
    case 'rnd3': case 'rnd6': {
      const n = reward.id === 'rnd3' ? 3 : 6;
      const gained = {};
      for (let i = 0; i < n; i++) {
        const k = STAT_KEYS_PVP[Math.floor(Math.random() * 6)];
        cs[k] = (cs[k]||0) + 2; gained[k] = (gained[k]||0) + 2;
      }
      return Object.entries(gained).map(([k,v]) => `${STAT_SHORT_PVP[k]} +${v}`).join('  ');
    }
    case 'all1':
      STAT_KEYS_PVP.forEach(k => cs[k] = (cs[k]||0) + 1);
      return 'STR SPD DUR IQ BIQ MA — all +1';
    case 'forbidden': {
      const weapons = ['rapier', 'katana', 'flail','lance','chakram']
      const pick = weapons[Math.floor(Math.random() * weapons.length)];
      const def  = (typeof WEAPON_MAP !== 'undefined') ? WEAPON_MAP[pick] : null;
      fighter.weaponId = pick;
      const wName = def ? `${def.icon} ${def.name}` : pick;
      return `Forbidden: ${wName} equipped!`;
    }
    default:
      return reward.desc;
>>>>>>> 824de0f1885f15e32d77f296b4ce15b81b8206fd
  }

  // +N vào tất cả stats
  if (reward.allStats && reward.amount) {
    STAT_KEYS_PVP.forEach(k => cs[k] = (cs[k] || 0) + reward.amount);
    const sign = reward.amount > 0 ? '+' : '';
    return `STR SPD DUR IQ BIQ MA — all ${sign}${reward.amount}`;
  }

  // +N vào stat thấp nhất
  if (reward.lowestStat && reward.amount) {
    const st = STAT_KEYS_PVP.reduce((a, k) => (cs[k]||0) < (cs[a]||0) ? k : a, STAT_KEYS_PVP[0]);
    const o  = cs[st] || 0; cs[st] = o + reward.amount;
    return `${STAT_SHORT_PVP[st]} (lowest): ${o} → ${o + reward.amount}`;
  }

  // +N vào stat cao nhất
  if (reward.highestStat && reward.amount) {
    const st = STAT_KEYS_PVP.reduce((a, k) => (cs[k]||0) > (cs[a]||0) ? k : a, STAT_KEYS_PVP[0]);
    const o  = cs[st] || 0; cs[st] = o + reward.amount;
    return `${STAT_SHORT_PVP[st]} (highest): ${o} → ${o + reward.amount}`;
  }

  // Skill wheel fallback (bình thường intercepted trước)
  if (reward.skillCount) {
    const added = _pvpAddPowers(fighter, reward.skillCount);
    return added.length ? 'Gained: ' + added.map(s => s.name).join(', ') : 'No skills available';
  }

  // Stat spin fallback (bình thường intercepted trước)
  if (reward.statSpins && reward.statAmount) {
    const gained = {};
    for (let i = 0; i < reward.statSpins; i++) {
      const k = STAT_KEYS_PVP[Math.floor(Math.random() * STAT_KEYS_PVP.length)];
      cs[k] = (cs[k] || 0) + reward.statAmount;
      gained[k] = (gained[k] || 0) + reward.statAmount;
    }
    return Object.entries(gained).map(([k, v]) => `${STAT_SHORT_PVP[k]} +${v}`).join('  ');
  }

  // Forbidden weapon wheel fallback (bình thường intercepted trước)
  if (reward.forbiddenWeapon) {
    const wdefs    = (typeof WEAPON_DEFS !== 'undefined') ? WEAPON_DEFS : [];
    const pool     = wdefs.filter(w => w.forbidden);
    const pick     = pool[Math.floor(Math.random() * pool.length)];
    if (pick) { fighter.weaponId = pick.id; return `🚫 Forbidden: ${pick.icon} ${pick.name} equipped!`; }
    return reward.desc ?? '';
  }

  return reward.desc ?? '';
}

// ── Wheel canvas state ─────────────────────────────────────────────
const _PW = 320, _PH = 320, _PR = 132, _PCX = 160, _PCY = 160;
let _pvpCtx        = null;
let _pvpRotation   = 0;
let _pvpSpinTarget = 0;
let _pvpStartTime  = null;
const _pvpSpinDur  = 4000; // ms
let _pvpReward     = null;
let _pvpFighter    = null;
let _pvpSpinning   = false;
let _pvpApplied    = false;

// Mystery reveal state
let _pvpRevealId   = null;  // reward.id being revealed
let _pvpRevealT    = 0;     // 0→1 progress
let _pvpRevealRaf  = null;

function _pvpEase(t) { return 1 - Math.pow(1 - t, 4); }

function _pvpDrawWheel(rot, revealId, revealT) {
  if (!_pvpCtx) return;
  const ctx   = _pvpCtx;
  const total = PVP_REWARDS.reduce((s, r) => s + r.weight, 0);
  ctx.clearRect(0, 0, _PW, _PH);

  let angle = rot;
  for (const rw of PVP_REWARDS) {
    const sweep     = (rw.weight / total) * Math.PI * 2;
    const isMyst    = !isDiscovered('pvp_reward', rw.id);
    const isReveal  = (revealId === rw.id && revealT != null);

    // Segment fill
    ctx.beginPath();
    ctx.moveTo(_PCX, _PCY);
    ctx.arc(_PCX, _PCY, _PR, angle, angle + sweep);
    ctx.closePath();

    if (isReveal) {
      const from = [26, 26, 46];
      const toC  = _hexToRgb(rw.color) || [100, 100, 200];
      const rv   = revealT ?? 0;
      const r2   = Math.round(from[0] + (toC[0] - from[0]) * rv);
      const g2   = Math.round(from[1] + (toC[1] - from[1]) * rv);
      const b2   = Math.round(from[2] + (toC[2] - from[2]) * rv);
      ctx.fillStyle = `rgb(${r2},${g2},${b2})`;
      if (rv < 0.85) {
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur  = 20 * Math.sin(rv * Math.PI);
      }
    } else if (isMyst) {
      ctx.fillStyle = '#1a1a2e';
    } else {
      ctx.fillStyle = rw.color;
    }

    ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.strokeStyle = '#07071a';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Label (only if segment is wide enough to fit text)
    if (sweep > 0.13) {
      const mid = angle + sweep / 2;
      ctx.save();
      ctx.translate(_PCX + Math.cos(mid) * _PR * 0.65,
                    _PCY + Math.sin(mid) * _PR * 0.65);
      const normMid = ((mid % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const flip = normMid > Math.PI / 2 && normMid < 3 * Math.PI / 2;
      ctx.rotate(mid + (flip ? Math.PI : 0));
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor  = '#000';
      ctx.shadowBlur   = 4;

      if (isReveal) {
        const rv = revealT ?? 0;
        if (rv < 0.42) {
          ctx.font      = 'bold 8px Arial';
          ctx.fillStyle = `rgba(150,150,180,${(1 - rv / 0.42) * 0.7})`;
          ctx.fillText('???', 0, 0);
        } else {
          const alpha = Math.min(1, (rv - 0.50) / 0.50);
          ctx.font      = 'bold 8px Arial';
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          const lbl = rw.label.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
          ctx.fillText(lbl.length > 14 ? lbl.slice(0, 13) + '…' : lbl, 0, 0);
        }
      } else if (isMyst) {
        ctx.font      = 'bold 8px Arial';
        ctx.fillStyle = 'rgba(150,150,180,0.55)';
        ctx.fillText('???', 0, 0);
      } else {
        ctx.font      = 'bold 8px Arial';
        ctx.fillStyle = '#fff';
        const lbl = rw.label.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
        ctx.fillText(lbl.length > 14 ? lbl.slice(0, 13) + '…' : lbl, 0, 0);
      }

      ctx.restore();
    }

    // Burst sparks during reveal
    if (isReveal && revealT > 0.35 && revealT < 0.75) {
      const mid  = angle + sweep / 2;
      const bx   = _PCX + Math.cos(mid) * _PR * 0.65;
      const by   = _PCY + Math.sin(mid) * _PR * 0.65;
      const pt   = (revealT - 0.35) / 0.40;
      const salpha = Math.sin(pt * Math.PI);
      for (let i = 0; i < 6; i++) {
        const sa   = mid + (i / 6) * Math.PI * 2;
        const dist = 14 * pt;
        ctx.beginPath();
        ctx.arc(bx + Math.cos(sa) * dist, by + Math.sin(sa) * dist, 2.5 * (1 - pt * 0.6), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,215,0,${salpha * 0.85})`;
        ctx.fill();
      }
    }

    angle += sweep;
  }

  // Outer ring
  ctx.beginPath();
  ctx.arc(_PCX, _PCY, _PR, 0, Math.PI * 2);
  ctx.strokeStyle = '#2a2a5a';
  ctx.lineWidth   = 5;
  ctx.stroke();

  // Center cap
  const grad = ctx.createRadialGradient(_PCX, _PCY, 2, _PCX, _PCY, 18);
  grad.addColorStop(0, '#3a3a7a');
  grad.addColorStop(1, '#09091a');
  ctx.beginPath();
  ctx.arc(_PCX, _PCY, 18, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#4a4a9a';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Pointer triangle (top, pointing into wheel)
  ctx.save();
  ctx.shadowColor = '#ff5555';
  ctx.shadowBlur  = 10;
  ctx.fillStyle   = '#ff3333';
  ctx.strokeStyle = '#ffaaaa';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(_PCX,       _PCY - _PR + 16);
  ctx.lineTo(_PCX - 12,  _PCY - _PR - 14);
  ctx.lineTo(_PCX + 12,  _PCY - _PR - 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function _pvpAnimateSpin(ts) {
  if (!_pvpStartTime) _pvpStartTime = ts;
  const t = Math.min((ts - _pvpStartTime) / _pvpSpinDur, 1);
  _pvpRotation = _pvpEase(t) * _pvpSpinTarget;
  _pvpDrawWheel(_pvpRotation);
  if (t < 1) {
    requestAnimationFrame(_pvpAnimateSpin);
  } else {
    _pvpSpinning = false;
    _pvpDrawWheel(_pvpSpinTarget);
    // Mystery reveal: if this reward hasn't been seen before, play reveal animation
    const needsReveal = _pvpReward && !isDiscovered('pvp_reward', _pvpReward.id);
    if (needsReveal) {
      markDiscovered('pvp_reward', _pvpReward.id);
      _pvpPlayReveal(_pvpReward.id, () => _pvpOnLand());
    } else {
      _pvpOnLand();
    }
  }
}

function _pvpPlayReveal(rewardId, onDone) {
  const dur   = 1300;
  let   start = null;
  const tick  = (ts) => {
    if (!start) start = ts;
    const rv = Math.min(1, (ts - start) / dur);
    _pvpDrawWheel(_pvpSpinTarget, rewardId, rv);
    if (rv < 1) {
      _pvpRevealRaf = requestAnimationFrame(tick);
    } else {
      _pvpRevealRaf = null;
      _pvpDrawWheel(_pvpSpinTarget); // final draw without overlay
      onDone();
    }
  };
  _pvpRevealRaf = requestAnimationFrame(tick);
}

function _pvpOnLand() {
  if (_pvpApplied || !_pvpReward || !_pvpFighter) return;
  _pvpApplied = true;

  // Demon subrace reward filters — đọc từ semantic fields, không hardcode ID list
  const _demonSrl   = _pvpFighter.charStats?.subrace?.label;
  const _isStatRwd  = !!_pvpReward.statBlock;   // Leviathan blocks these
  const _isSkillRwd = !!_pvpReward.skillBlock;  // Belphegor blocks these

  // ── Rewards that use interactive spin wheels ──────────────────
  // Skill wheel: bất kỳ reward nào có skillCount (pow1/pow2/pow3...)
  if (_pvpReward.skillCount && _demonSrl !== 'Belphegor') {
    showPVPSkillWheel(_pvpFighter, _pvpReward.skillCount, (gained) => {
      const names = gained.map(s => s?.name).filter(Boolean).join(', ');
      // Note: csAddHistoryChange is already called per-skill inside _skwDoSpin
      _pvpFinishRewardDisplay(gained.length ? 'Gained: ' + names : 'No skills available');
    });
    return;
  }

  // Forbidden weapon wheel: bất kỳ reward nào có forbiddenWeapon:true
  if (_pvpReward.forbiddenWeapon) {
    showPVPForbiddenWheel(_pvpFighter, (gained) => {
      const wName = gained[0] ? `${gained[0].icon} ${gained[0].name}` : '?';
      // Note: csAddHistoryChange is already called inside _skwDoSpin (weapon mode)
      _pvpFinishRewardDisplay(`🚫 Forbidden: ${wName} equipped!`);
    });
    return;
  }

  // Stat wheel: bất kỳ reward nào có statSpins (rnd3/rnd6...)
  // Leviathan blocks stat rewards → skip wheel, show block message
  if (_pvpReward.statSpins) {
    if (_demonSrl === 'Leviathan') {
      const blocked = t('pvp_leviathan_block');
      if (typeof csAddHistoryChange === 'function' && _pvpFighter)
        csAddHistoryChange(_pvpFighter, `${blocked} (PVP Reward)`);
      _pvpFinishRewardDisplay(blocked);
      return;
    }
    showPVPStatWheel(_pvpFighter, _pvpReward.statSpins, (gained) => {
      const accum   = gained.reduce((acc, g) => { acc[g.short] = (acc[g.short] ?? 0) + g.amount; return acc; }, {});
      const summary = Object.entries(accum).map(([k, v]) => `${k} +${v}`).join('  ');
      if (typeof csAddHistoryChange === 'function' && _pvpFighter)
        csAddHistoryChange(_pvpFighter, `${summary} (PVP Reward)`);
      _pvpFinishRewardDisplay(summary || 'Stats boosted!');
    });
    return;
  }

  // ── Non-wheel rewards: apply immediately (data-driven) ───────
  let outcome;
  if (_demonSrl === 'Leviathan' && _isStatRwd) {
    outcome = t('pvp_leviathan_block');
  } else if (_demonSrl === 'Belphegor' && _isSkillRwd) {
    outcome = t('pvp_belphegor_block');
  } else {
    // _pvpApplyReward đọc semantic fields → không cần sửa khi thêm reward mới
    outcome = _pvpApplyReward(_pvpFighter, _pvpReward);
  }

  // Log vào match history (stat / non-skill rewards)
  if (typeof csAddHistoryChange === 'function' && _pvpFighter) {
    csAddHistoryChange(_pvpFighter, `${outcome} (PVP Reward)`);
  }

  _pvpFinishRewardDisplay(outcome);
}

// Shared helper: save + show result panel (used by both wheel callbacks and direct rewards)
function _pvpFinishRewardDisplay(outcomeText) {
  // Persist championship state AFTER reward is applied (not before — recordChampionshipMatchResult
  // saves earlier, before this runs, so skills/stats gained here would be lost on page reload)
  if (typeof state !== 'undefined' && state?.championship && typeof saveChampionshipProgress === 'function') {
    saveChampionshipProgress();
  }

  // Commit match history ngay tại đây — tất cả csAddHistoryChange đã chạy xong ở các bước trước.
  // Giúp fighter card hiển thị history ngay khi trận kết thúc (kể cả trận cuối phase/championship).
  if (typeof _csCommitAllPending === 'function' && typeof state !== 'undefined' && state?.championship) {
    _csCommitAllPending();
  }

  document.getElementById('pvp-reward-res-label').textContent   = _pvpReward?.label ?? '';
  document.getElementById('pvp-reward-res-outcome').textContent = outcomeText;
  document.getElementById('pvp-reward-result').style.display    = '';
}

// ── Public API (called from result.js) ────────────────────────────
function showPVPRewardWheel(fighter) {
  _pvpFighter   = fighter;
  _pvpReward    = _pvpPickReward();
  _pvpRotation  = 0;
  _pvpStartTime = null;
  _pvpSpinning  = false;
  _pvpApplied   = false;

  if (!fighter.charStats) fighter.charStats = {};
  if (!fighter.skills)    fighter.skills    = [];

  // Calculate landing rotation so pointer (top = 3π/2) lands on chosen reward's center
  const total    = PVP_REWARDS.reduce((s, r) => s + r.weight, 0);
  const idx      = PVP_REWARDS.indexOf(_pvpReward);
  let segStart   = 0;
  for (let i = 0; i < idx; i++) segStart += (PVP_REWARDS[i].weight / total) * Math.PI * 2;
  const segCenter = segStart + (PVP_REWARDS[idx].weight / total) * Math.PI;

  // rotation needed: segCenter + rotation = 3π/2  →  rotation = 3π/2 - segCenter
  let land = 3 * Math.PI / 2 - segCenter;
  while (land < 0) land += Math.PI * 2;
  land += 6 * Math.PI * 2; // 6 extra full spins for visual effect
  // Small random jitter within segment (±40% of half-sweep)
  land += (Math.random() - 0.5) * (PVP_REWARDS[idx].weight / total) * Math.PI * 0.8;
  _pvpSpinTarget = land;

  // Update winner label
  const nameEl = document.getElementById('pvp-reward-winner');
  if (nameEl) nameEl.textContent = `${fighter.charEmoji ?? '⚔️'} ${fighter.charName ?? t('pvp_default_winner')} ${t('pvp_winner_wins')}`;

  // Reset UI
  document.getElementById('pvp-reward-result').style.display = 'none';
  const spinBtn = document.getElementById('pvp-spin-btn');
  if (spinBtn) { spinBtn.disabled = false; spinBtn.textContent = t('pvp_spin_btn'); }

  // Show modal
  document.getElementById('pvp-reward-modal').style.display = 'flex';

  // Draw initial wheel
  _pvpCtx = document.getElementById('pvp-reward-wheel').getContext('2d');
  _pvpDrawWheel(0);
}

// ── On-close callback (used by auto mode) ─────────────────────────
let _pvpOnCloseCallback = null;
function pvpRewardSetOnClose(fn) { _pvpOnCloseCallback = fn; }
function _pvpClose() {
  document.getElementById('pvp-reward-modal').style.display = 'none';
  const cb = _pvpOnCloseCallback;
  _pvpOnCloseCallback = null;
  if (cb) { setTimeout(cb, 200); return; }

  // Mammon (Greed): spin a second reward wheel if not already done
  if (_pvpFighter?.charStats?.subrace?.label === 'Mammon' && !_pvpFighter._mammonBonusSpun) {
    _pvpFighter._mammonBonusSpun = true;
    const ftr = _pvpFighter;
    setTimeout(() => {
      showPVPRewardWheel(ftr);
      // After bonus spin closes, clear flag and show Copycat if pending
      pvpRewardSetOnClose(() => {
        delete ftr._mammonBonusSpun;
        if (ftr._copycatWheel) {
          const wheel = ftr._copycatWheel;
          ftr._copycatWheel = null;
          setTimeout(() => showCopycatWheel(ftr, wheel), 200);
        }
      });
    }, 200);
    return;
  }
  delete _pvpFighter?._mammonBonusSpun;

  // If winner has Copycat pending → show Copycat Wheel next
  if (_pvpFighter?._copycatWheel) {
    const wheel = _pvpFighter._copycatWheel;
    _pvpFighter._copycatWheel = null;
    setTimeout(() => showCopycatWheel(_pvpFighter, wheel), 200);
  }
}

// ── Button event bindings ─────────────────────────────────────────
// (scripts run after DOM is parsed since they're at bottom of body)
document.getElementById('pvp-spin-btn')?.addEventListener('click', () => {
  if (_pvpSpinning || _pvpApplied) return;
  _pvpSpinning  = true;
  _pvpStartTime = null;
  const btn = document.getElementById('pvp-spin-btn');
  btn.disabled    = true;
  btn.textContent = t('wheel_spinning');
  requestAnimationFrame(_pvpAnimateSpin);
});

document.getElementById('pvp-reward-continue')?.addEventListener('click', _pvpClose);

// ============================================================
// COPYCAT WHEEL — spins after PVP reward when winner has Copycat
// ============================================================
const _CCW = 260, _CCH = 260, _CCR = 108, _CCCX = 130, _CCCY = 130;
let _ccCtx = null, _ccSpinning = false, _ccApplied = false;
let _ccFighter = null, _ccWheel = null;
let _ccRotation = 0, _ccSpinTarget = 0, _ccStartTime = null;
const _ccSpinDur = 3200;

const _CC_MISS = { id: 'miss', label: 'MISS', icon: '❌', color: '#333355' };

function _ccEase(t) { return 1 - Math.pow(1 - t, 4); }

function _ccBuildSegments(candidates) {
  const segs = candidates.map(id => {
    const def = (typeof SKILL_MAP !== 'undefined' && SKILL_MAP[id]) || { name: id, icon: '✦' };
    return { id, label: def.name, icon: def.icon ?? '✦', color: '#224466' };
  });
  segs.push(_CC_MISS);
  return segs;
}

function _ccDraw(rot, segs) {
  if (!_ccCtx) return;
  const ctx = _ccCtx;
  const sweep = (Math.PI * 2) / segs.length;
  ctx.clearRect(0, 0, _CCW, _CCH);

  const COLORS = ['#1a3a5c','#2a1a5c','#1a4a2c','#4a1a1a','#3a2a1a','#1a3a4a'];
  segs.forEach((seg, i) => {
    const start = rot + i * sweep;
    ctx.beginPath();
    ctx.moveTo(_CCCX, _CCCY);
    ctx.arc(_CCCX, _CCCY, _CCR, start, start + sweep);
    ctx.closePath();
    ctx.fillStyle = seg.id === 'miss' ? '#221122' : COLORS[i % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = '#07071a'; ctx.lineWidth = 1.5; ctx.stroke();

    // Label
    const mid = start + sweep / 2;
    ctx.save();
    ctx.translate(_CCCX + Math.cos(mid) * _CCR * 0.62, _CCCY + Math.sin(mid) * _CCR * 0.62);
    // Radial orientation with left-half flip
    const normMid = ((mid % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const flip = normMid > Math.PI / 2 && normMid < 3 * Math.PI / 2;
    ctx.rotate(mid + (flip ? Math.PI : 0));
    ctx.fillStyle = seg.id === 'miss' ? '#aa4444' : '#cceeff';
    ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
    const ccLbl = (seg.icon + ' ' + seg.label).replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
    ctx.fillText(ccLbl.length > 12 ? ccLbl.slice(0, 11) + '…' : ccLbl, 0, 0);
    ctx.restore();
  });

  // Outer ring
  ctx.beginPath(); ctx.arc(_CCCX, _CCCY, _CCR, 0, Math.PI * 2);
  ctx.strokeStyle = '#2a2a5a'; ctx.lineWidth = 5; ctx.stroke();
  // Center
  ctx.beginPath(); ctx.arc(_CCCX, _CCCY, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#09091a'; ctx.fill();
  ctx.strokeStyle = '#4a4a9a'; ctx.lineWidth = 2; ctx.stroke();
  // Pointer
  ctx.save();
  ctx.shadowColor = '#cc55ff'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#aa22ff'; ctx.strokeStyle = '#ddaaff'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(_CCCX, _CCCY - _CCR + 14);
  ctx.lineTo(_CCCX - 10, _CCCY - _CCR - 12);
  ctx.lineTo(_CCCX + 10, _CCCY - _CCR - 12);
  ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}

function _ccAnimate(ts) {
  if (!_ccStartTime) _ccStartTime = ts;
  const t = Math.min((ts - _ccStartTime) / _ccSpinDur, 1);
  _ccRotation = _ccEase(t) * _ccSpinTarget;
  _ccDraw(_ccRotation, _ccWheel.segs);
  if (t < 1) { requestAnimationFrame(_ccAnimate); }
  else {
    _ccSpinning = false;
    _ccDraw(_ccSpinTarget, _ccWheel.segs);
    _ccOnLand();
  }
}

function _ccOnLand() {
  if (_ccApplied) return;
  _ccApplied = true;
  const result = _ccWheel.result;
  const resLabel = document.getElementById('cc-res-label');
  const resOut   = document.getElementById('cc-res-outcome');
  if (result) {
    const def = (typeof SKILL_MAP !== 'undefined' && SKILL_MAP[result]) || { name: result, icon: '✦' };
    if (resLabel)  resLabel.textContent  = `${def.name} — Copied!`;
    if (resOut)    resOut.textContent    = 'Skill will be available next round.';
    _ccFighter.copycatSkill = result;
  } else {
    if (resLabel)  resLabel.textContent  = '❌ MISS — No copy this time.';
    if (resOut)    resOut.textContent    = '';
  }
  if (typeof state !== 'undefined' && state?.championship && typeof saveChampionshipProgress === 'function') {
    saveChampionshipProgress();
  }
  document.getElementById('cc-result').style.display = '';
  document.getElementById('cc-continue-btn').style.display = '';
  document.getElementById('cc-spin-btn').style.display = 'none';
}

function showCopycatWheel(fighter, wheelData) {
  _ccFighter  = fighter;
  _ccApplied  = false;
  _ccSpinning = false;
  _ccStartTime = null;
  _ccRotation  = 0;

  const segs   = _ccBuildSegments(wheelData.candidates);
  const result = wheelData.result;   // null = miss, else skill id
  _ccWheel = { segs, result };

  // Find landing segment index
  const targetId  = result ?? 'miss';
  const targetIdx = segs.findIndex(s => s.id === targetId);
  const sweep     = (Math.PI * 2) / segs.length;
  const segCenter = targetIdx * sweep + sweep / 2;
  let land = (3 * Math.PI / 2) - segCenter;
  while (land < 0) land += Math.PI * 2;
  land += 5 * Math.PI * 2;
  land += (Math.random() - 0.5) * sweep * 0.6;
  _ccSpinTarget = land;

  // Winner label
  const nameEl = document.getElementById('cc-winner-label');
  if (nameEl) nameEl.textContent = `${fighter.charEmoji ?? '🎭'} ${fighter.charName ?? t('pvp_default_winner')} — ${t('cc_label')}`;

  // Reset UI
  document.getElementById('cc-result').style.display = 'none';
  document.getElementById('cc-spin-btn').style.display = '';
  document.getElementById('cc-spin-btn').disabled = false;
  document.getElementById('cc-spin-btn').textContent = t('cc_spin_btn');
  document.getElementById('cc-continue-btn').style.display = 'none';

  // Show modal & draw
  document.getElementById('copycat-modal').style.display = 'flex';
  _ccCtx = document.getElementById('copycat-wheel').getContext('2d');
  _ccDraw(0, segs);
}

document.getElementById('cc-spin-btn')?.addEventListener('click', () => {
  if (_ccSpinning || _ccApplied) return;
  _ccSpinning = true; _ccStartTime = null;
  const btn = document.getElementById('cc-spin-btn');
  btn.disabled = true; btn.textContent = t('wheel_spinning');
  requestAnimationFrame(_ccAnimate);
});

document.getElementById('cc-continue-btn')?.addEventListener('click', () => {
  document.getElementById('copycat-modal').style.display = 'none';
});

// ============================================================
// PVP CHOICE WHEEL — generic: skills (pow1/2/3), forbidden weapon, stats (rnd3/rnd6)
// ============================================================
let _skwFighter   = null;
let _skwMode      = 'skill';  // 'skill' | 'weapon' | 'stat'
let _skwRemaining = 0;
let _skwWheel     = null;
let _skwGained    = [];  // skill: SkillDef[] | weapon: WeaponDef[] | stat: {key,short,amount}[]
let _skwOnDone    = null;

// ── Item pool builders ────────────────────────────────────────
function _skwBuildSkillPool(fighter) {
  const has = new Set(fighter.skills || []);
  // Loại skill đã có, unique-only, hoặc weapon-specific không phù hợp vũ khí hiện tại
  return (typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS : []).filter(s =>
    !has.has(s.id) &&
    !s.unique &&
    !(s.weapon && s.weapon !== fighter.weaponId)
  );
}

function _skwBuildForbiddenItems() {
  const wdefs = (typeof WEAPON_DEFS !== 'undefined') ? WEAPON_DEFS : [];
  return wdefs
    .filter(w => w.forbidden)
    .map((w, i) => ({ label: `${w.icon} ${w.name}`, weight: 1, color: w.color ?? wColor(i), _def: w }));
}

function _skwBuildStatItems() {
  // Đọc statAmount từ reward hiện tại (default 2 nếu không có)
  const amt = _pvpReward?.statAmount ?? 2;
  const s   = amt > 0 ? `+${amt}` : `${amt}`;
  return [
    { label: `${s} STR`, weight: 1, color: '#bb3311', _key: 'strength',   _short: 'STR', _amt: amt },
    { label: `${s} SPD`, weight: 1, color: '#1155bb', _key: 'speed',      _short: 'SPD', _amt: amt },
    { label: `${s} DUR`, weight: 1, color: '#117733', _key: 'durability', _short: 'DUR', _amt: amt },
    { label: `${s} IQ`,  weight: 1, color: '#997711', _key: 'iq',         _short: 'IQ',  _amt: amt },
    { label: `${s} BIQ`, weight: 1, color: '#771199', _key: 'battleiq',   _short: 'BIQ', _amt: amt },
    { label: `${s} MA`,  weight: 1, color: '#992211', _key: 'ma',         _short: 'MA',  _amt: amt },
  ];
}

function _skwGetItems() {
  if (_skwMode === 'weapon') return _skwBuildForbiddenItems();
  if (_skwMode === 'stat')   return _skwBuildStatItems();
  return _skwBuildSkillPool(_skwFighter).map((s, i) => ({
    label: s.name, weight: 1, color: wColor(i), _def: s,
  }));
}

// ── Public entry points ───────────────────────────────────────
function showPVPSkillWheel(fighter, count, onDone) {
  _skwMode = 'skill';
  _skwFighter = fighter; _skwRemaining = count; _skwGained = []; _skwOnDone = onDone;
  _skwOpenNext();
}

function showPVPForbiddenWheel(fighter, onDone) {
  _skwMode = 'weapon';
  _skwFighter = fighter; _skwRemaining = 1; _skwGained = []; _skwOnDone = onDone;
  _skwOpenNext();
}

function showPVPStatWheel(fighter, count, onDone) {
  _skwMode = 'stat';
  _skwFighter = fighter; _skwRemaining = count; _skwGained = []; _skwOnDone = onDone;
  _skwOpenNext();
}

// ── Open next spin ────────────────────────────────────────────
function _skwOpenNext() {
  const modal  = document.getElementById('pvp-skill-modal');
  const canvas = document.getElementById('pvp-skill-wheel');
  if (!modal || !canvas) { _skwFinish(); return; }

  const items = _skwGetItems();
  if (items.length === 0) {
    _skwGained.push(null);
    _skwRemaining--;
    if (_skwRemaining > 0) { _skwOpenNext(); return; }
    _skwFinish(); return;
  }

  _skwWheel = new SpinWheel(canvas, items);

  // Modal title
  const titles = { skill: '✨ Power Up!', weapon: '🚫 Forbidden Weapon!', stat: '📈 Stat Boost!' };
  const titleEl = modal.querySelector('.pvp-rw-title');
  if (titleEl) titleEl.textContent = titles[_skwMode] ?? '🎰 Choose!';

  // Counter label
  const total   = _skwGained.length + _skwRemaining;
  const current = _skwGained.length + 1;
  const ctrEl   = document.getElementById('pvp-skill-counter');
  if (ctrEl) {
    if (_skwMode === 'weapon') {
      ctrEl.textContent = '🚫 Choose a Forbidden Weapon';
    } else {
      const word = _skwMode === 'stat' ? 'Stat' : 'Skill';
      ctrEl.textContent = total > 1 ? `${word} ${current} of ${total}` : `Choose a ${word}`;
    }
  }

  // Winner name
  const nameEl = document.getElementById('pvp-skill-winner');
  if (nameEl) nameEl.textContent = `${_skwFighter.charEmoji ?? '⚔️'} ${_skwFighter.charName ?? 'Winner'}`;

  // Reset UI
  document.getElementById('pvp-skill-result').style.display = 'none';
  const spinBtn = document.getElementById('pvp-skill-spin-btn');
  const contBtn = document.getElementById('pvp-skill-continue');
  if (spinBtn) { spinBtn.style.display = ''; spinBtn.disabled = false; spinBtn.textContent = '🎰 SPIN!'; }
  if (contBtn) contBtn.style.display = 'none';

  modal.style.display = 'flex';
}

// ── Spin handler ──────────────────────────────────────────────
function _skwDoSpin() {
  if (!_skwWheel || _skwWheel.spinning) return;
  const spinBtn = document.getElementById('pvp-skill-spin-btn');
  if (spinBtn) { spinBtn.disabled = true; spinBtn.textContent = '⏳ Spinning…'; }

  _skwWheel.spin((winner) => {
    let resLabel = '', resDesc = '';

    if (_skwMode === 'skill') {
      const def = winner._def;
      if (!_skwFighter.skills) _skwFighter.skills = [];
      _skwFighter.skills.push(def.id);
      _skwGained.push(def);
      if (typeof csAddHistoryChange === 'function')
        csAddHistoryChange(_skwFighter, `+${def.name} (PVP Reward)`);
      resLabel = `✨ ${def.name}`;
      resDesc  = def.desc ?? '';

    } else if (_skwMode === 'weapon') {
      const def = winner._def;
      _skwFighter.weaponId = def.id;
      _skwGained.push(def);
      if (typeof csAddHistoryChange === 'function')
        csAddHistoryChange(_skwFighter, `🚫 Forbidden: ${def.icon} ${def.name} (PVP Reward)`);
      resLabel = `🚫 ${def.icon} ${def.name}`;
      resDesc  = def.desc ?? '';

    } else if (_skwMode === 'stat') {
      const key   = winner._key;
      const short = winner._short;
      const amt   = winner._amt ?? 2;  // đọc từ item, default 2
      const old   = _skwFighter.charStats?.[key] ?? 0;
      if (_skwFighter.charStats) _skwFighter.charStats[key] = old + amt;
      _skwGained.push({ key, short, amount: amt });
      resLabel = `📈 ${short}: ${old} → ${old + amt}`;
      resDesc  = '';
      // stat history sẽ được log tổng 1 lần sau khi xong hết spins (trong callback _pvpOnLand)
    }

    // Show result
    const resLabelEl = document.getElementById('pvp-skill-res-label');
    const resDescEl  = document.getElementById('pvp-skill-res-desc');
    if (resLabelEl) resLabelEl.textContent = resLabel;
    if (resDescEl)  resDescEl.textContent  = resDesc;
    document.getElementById('pvp-skill-result').style.display = '';

    _skwRemaining--;
    if (spinBtn) spinBtn.style.display = 'none';
    const contBtn = document.getElementById('pvp-skill-continue');
    if (contBtn) {
      contBtn.textContent = _skwRemaining > 0
        ? `▶ Next (${_skwRemaining} remaining)`
        : '✓ Accept & Continue';
      contBtn.style.display = '';
    }
  });
}

// ── Continue / Finish ─────────────────────────────────────────
function _skwContinue() {
  if (_skwRemaining > 0) { _skwOpenNext(); } else { _skwFinish(); }
}

function _skwFinish() {
  const modal = document.getElementById('pvp-skill-modal');
  if (modal) modal.style.display = 'none';
  const cb = _skwOnDone;
  _skwOnDone = null; _skwFighter = null; _skwWheel = null;
  if (cb) cb(_skwGained.filter(Boolean));
}

document.getElementById('pvp-skill-spin-btn')?.addEventListener('click', _skwDoSpin);
document.getElementById('pvp-skill-continue')?.addEventListener('click', _skwContinue);

// ============================================================
// ANGEL BLESSING — Principalities: +2 lowest stat before PVP reward
// ============================================================
function showAngelBlessing(fighter, statKey, onClose) {
  const SHORT = { strength:'STR', speed:'SPD', durability:'DUR', iq:'IQ', battleiq:'BIQ', ma:'MA' };
  const modal = document.getElementById('angel-blessing-modal');
  if (!modal) { if (onClose) onClose(); return; }

  const nameEl = document.getElementById('ab-winner-name');
  if (nameEl) nameEl.textContent =
    `${fighter.charEmoji ?? '👼'} ${fighter.charName ?? 'Angel'} — Principalities`;
  const statEl = document.getElementById('ab-stat-gained');
  if (statEl) statEl.textContent = `+2 ${SHORT[statKey] ?? statKey.toUpperCase()}`;

  modal.style.display = 'flex';

  const btn = document.getElementById('ab-continue-btn');
  if (btn) {
    btn.onclick = () => {
      modal.style.display = 'none';
      if (onClose) setTimeout(onClose, 200);
    };
  }
}

// ============================================================
// PRIMORDIAL ELEMENTAL WHEEL — fires before PVP reward for Primordial winners
// ============================================================
const ELEM_ENTRIES = [
  { label:'Air',   emoji:'💨', color:'#3366bb', weight:25, desc:'+1 stat thấp nhất' },
  { label:'Water', emoji:'💧', color:'#1144aa', weight:25, desc:'+1 stat cao nhất'  },
  { label:'Fire',  emoji:'🔥', color:'#bb3311', weight:25, desc:'+1 Skill ngẫu nhiên' },
  { label:'Earth', emoji:'🌍', color:'#664422', weight:25, desc:'+1 DUR, +1 STR'    },
];
const _EW = 280, _EH = 280, _ER = 115, _ECX = 140, _ECY = 140;
let _ewCtx = null, _ewSpinning = false, _ewApplied = false;
let _ewFighter = null, _ewChosen = null, _ewOnClose = null;
let _ewRotation = 0, _ewSpinTarget = 0, _ewStartTime = null;
const _ewSpinDur = 3500;

function _ewEase(t) { return 1 - Math.pow(1 - t, 4); }

function _ewDraw(rot) {
  if (!_ewCtx) return;
  const ctx   = _ewCtx;
  const sweep = (Math.PI * 2) / ELEM_ENTRIES.length; // 4 equal sectors
  ctx.clearRect(0, 0, _EW, _EH);
  ELEM_ENTRIES.forEach((e, idx) => {
    const start = rot + idx * sweep;
    ctx.beginPath();
    ctx.moveTo(_ECX, _ECY);
    ctx.arc(_ECX, _ECY, _ER, start, start + sweep);
    ctx.closePath();
    ctx.fillStyle = e.color;
    ctx.fill();
    ctx.strokeStyle = '#07071a'; ctx.lineWidth = 1.5; ctx.stroke();
    // Label
    const mid = start + sweep / 2;
    ctx.save();
    ctx.translate(_ECX + Math.cos(mid) * _ER * 0.62, _ECY + Math.sin(mid) * _ER * 0.62);
    const normMid = ((mid % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const flip = normMid > Math.PI / 2 && normMid < 3 * Math.PI / 2;
    ctx.rotate(mid + (flip ? Math.PI : 0));
    ctx.fillStyle = '#fff';
    ctx.font      = 'bold 12px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
    ctx.fillText(e.label, 0, 0);
    ctx.restore();
  });
  // Outer ring
  ctx.beginPath(); ctx.arc(_ECX, _ECY, _ER, 0, Math.PI * 2);
  ctx.strokeStyle = '#2a2a5a'; ctx.lineWidth = 5; ctx.stroke();
  // Center cap
  const grad = ctx.createRadialGradient(_ECX, _ECY, 2, _ECX, _ECY, 18);
  grad.addColorStop(0, '#3a3a7a'); grad.addColorStop(1, '#09091a');
  ctx.beginPath(); ctx.arc(_ECX, _ECY, 18, 0, Math.PI * 2);
  ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = '#4a4a9a'; ctx.lineWidth = 2; ctx.stroke();
  // Pointer (green tint for Primordial)
  ctx.save();
  ctx.shadowColor = '#44ffaa'; ctx.shadowBlur = 10;
  ctx.fillStyle   = '#22cc88'; ctx.strokeStyle = '#aaffcc'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(_ECX,      _ECY - _ER + 16);
  ctx.lineTo(_ECX - 12, _ECY - _ER - 14);
  ctx.lineTo(_ECX + 12, _ECY - _ER - 14);
  ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}

function _ewAnimate(ts) {
  if (!_ewStartTime) _ewStartTime = ts;
  const t = Math.min((ts - _ewStartTime) / _ewSpinDur, 1);
  _ewRotation = _ewEase(t) * _ewSpinTarget;
  _ewDraw(_ewRotation);
  if (t < 1) { requestAnimationFrame(_ewAnimate); }
  else {
    _ewSpinning = false;
    _ewDraw(_ewSpinTarget);
    _ewOnLand();
  }
}

function _ewOnLand() {
  if (_ewApplied || !_ewChosen || !_ewFighter) return;
  _ewApplied = true;
  const cs = _ewFighter.charStats;
  const SK = ['strength','speed','durability','iq','battleiq','ma'];
  let resultText = '';
  switch (_ewChosen.label) {
    case 'Air': {
      const k = SK.reduce((a, b) => (cs[a] ?? 0) < (cs[b] ?? 0) ? a : b);
      cs[k] = (cs[k] ?? 0) + 1;
      resultText = t('ew_result_air').replace('{stat}', k.toUpperCase());
      break;
    }
    case 'Water': {
      const k = SK.reduce((a, b) => (cs[a] ?? 0) > (cs[b] ?? 0) ? a : b);
      cs[k] = (cs[k] ?? 0) + 1;
      resultText = t('ew_result_water').replace('{stat}', k.toUpperCase());
      break;
    }
    case 'Fire': {
      const has  = new Set(_ewFighter.skills || []);
      const pool = (typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS : [])
        .filter(s => !s.unique && !has.has(s.id));
      if (pool.length > 0) {
        const sk = pool[Math.floor(Math.random() * pool.length)];
        if (!_ewFighter.skills) _ewFighter.skills = [];
        _ewFighter.skills.push(sk.id);
        resultText = t('ew_result_fire').replace('{skill}', sk.name);
      } else {
        resultText = t('ew_result_fire_empty');
      }
      break;
    }
    case 'Earth': {
      cs.durability = (cs.durability ?? 0) + 1;
      cs.strength   = (cs.strength   ?? 0) + 1;
      resultText = t('ew_result_earth');
      break;
    }
  }
  // Log elemental wheel result to match history
  if (typeof csAddHistoryChange === 'function' && _ewFighter) {
    csAddHistoryChange(_ewFighter, `🌌 Elemental: ${_ewChosen.emoji} ${_ewChosen.label} — ${resultText}`);
  }
  if (typeof saveChampionshipProgress === 'function' && typeof state !== 'undefined' && state?.championship) {
    saveChampionshipProgress();
  }
  document.getElementById('ew-result-label').textContent   = `${_ewChosen.emoji} ${_ewChosen.label}`;
  document.getElementById('ew-result-outcome').textContent = resultText;
  document.getElementById('ew-result').style.display       = '';
  document.getElementById('ew-spin-btn').style.display     = 'none';
  document.getElementById('ew-continue-btn').style.display = '';
}

function showPrimordialElementalWheel(fighter, onClose) {
  _ewFighter   = fighter;
  _ewOnClose   = onClose;
  _ewApplied   = false;
  _ewSpinning  = false;
  _ewStartTime = null;
  _ewRotation  = 0;

  // Pre-pick element (equal weight — just pick randomly)
  const idx   = Math.floor(Math.random() * ELEM_ENTRIES.length);
  _ewChosen   = ELEM_ENTRIES[idx];

  // Calculate spin target so pointer (top = 3π/2) lands on chosen sector center
  const sweep     = (Math.PI * 2) / ELEM_ENTRIES.length;
  const segCenter = idx * sweep + sweep / 2;
  let land = (3 * Math.PI / 2) - segCenter;
  while (land < 0) land += Math.PI * 2;
  land += 5 * Math.PI * 2; // extra full spins for drama
  land += (Math.random() - 0.5) * sweep * 0.6; // small jitter within sector
  _ewSpinTarget = land;

  // Winner label
  const nameEl = document.getElementById('ew-winner-name');
  if (nameEl) nameEl.textContent =
    `🌌 ${fighter.charEmoji ?? '🌌'} ${fighter.charName ?? t('ew_default_name')} — ${t('ew_label')}`;

  // Reset UI
  document.getElementById('ew-result').style.display       = 'none';
  const spinBtn = document.getElementById('ew-spin-btn');
  spinBtn.style.display = ''; spinBtn.disabled = false; spinBtn.textContent = t('ew_spin_btn');
  document.getElementById('ew-continue-btn').style.display = 'none';

  // Show modal & draw initial wheel
  document.getElementById('elemental-wheel-modal').style.display = 'flex';
  _ewCtx = document.getElementById('elemental-wheel-canvas').getContext('2d');
  _ewDraw(0);
}

document.getElementById('ew-spin-btn')?.addEventListener('click', () => {
  if (_ewSpinning || _ewApplied) return;
  _ewSpinning = true; _ewStartTime = null;
  const btn = document.getElementById('ew-spin-btn');
  btn.disabled = true; btn.textContent = t('ew_spinning');
  requestAnimationFrame(_ewAnimate);
});

document.getElementById('ew-continue-btn')?.addEventListener('click', () => {
  document.getElementById('elemental-wheel-modal').style.display = 'none';
  const cb = _ewOnClose;
  _ewOnClose = null;
  if (cb) setTimeout(cb, 200);
});
