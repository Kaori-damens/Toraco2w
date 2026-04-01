// ============================================================
// PVP REWARD WHEEL — spins after each tournament match win
// ============================================================

const STAT_KEYS_PVP = ['strength', 'speed', 'durability', 'iq', 'biq', 'ma'];
const STAT_SHORT_PVP = { strength:'STR', speed:'SPD', durability:'DUR', iq:'IQ', biq:'BIQ', ma:'MA' };

const PVP_REWARDS = [
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
  { id:'all1',  label:'+1 All',     desc:'All stats +1',            icon:'⭐', weight:4,    color:'#998800' },
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
  const pool = SKILL_DEFS.filter(s => !has.has(s.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const toAdd = pool.slice(0, count);
  if (!fighter.skills) fighter.skills = [];
  toAdd.forEach(s => fighter.skills.push(s.id));
  return toAdd;
}

// ── Apply reward → returns human-readable outcome string ──────────
function _pvpApplyReward(fighter, reward) {
  const cs = fighter.charStats;
  switch (reward.id) {
    case 'str1':  { const o=cs.strength   ||0; cs.strength   =o+1; return `STR: ${o} → ${o+1}`; }
    case 'spd1':  { const o=cs.speed      ||0; cs.speed      =o+1; return `SPD: ${o} → ${o+1}`; }
    case 'dur1':  { const o=cs.durability ||0; cs.durability =o+1; return `DUR: ${o} → ${o+1}`; }
    case 'iq1':   { const o=cs.iq         ||0; cs.iq         =o+1; return `IQ: ${o} → ${o+1}`;  }
    case 'biq1':  { const o=cs.biq        ||0; cs.biq        =o+1; return `BIQ: ${o} → ${o+1}`; }
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
      return added.length ? 'Gained: ' + added.map(s => `${s.icon??'✦'} ${s.name}`).join(', ')
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
    default:
      return reward.desc;
  }
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

function _pvpEase(t) { return 1 - Math.pow(1 - t, 4); }

function _pvpDrawWheel(rot) {
  if (!_pvpCtx) return;
  const ctx   = _pvpCtx;
  const total = PVP_REWARDS.reduce((s, r) => s + r.weight, 0);
  ctx.clearRect(0, 0, _PW, _PH);

  let angle = rot;
  for (const rw of PVP_REWARDS) {
    const sweep = (rw.weight / total) * Math.PI * 2;

    // Segment fill
    ctx.beginPath();
    ctx.moveTo(_PCX, _PCY);
    ctx.arc(_PCX, _PCY, _PR, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = rw.color;
    ctx.fill();
    ctx.strokeStyle = '#07071a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label (only if segment is wide enough to fit text)
    if (sweep > 0.13) {
      const mid = angle + sweep / 2;
      ctx.save();
      ctx.translate(_PCX + Math.cos(mid) * _PR * 0.70,
                    _PCY + Math.sin(mid) * _PR * 0.70);
      ctx.rotate(mid + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8.5px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000';
      ctx.shadowBlur  = 4;
      ctx.fillText(rw.label, 0, 0);
      ctx.restore();
    }

    // Icon (only if segment is wide enough)
    if (sweep > 0.30) {
      const mid = angle + sweep / 2;
      ctx.save();
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rw.icon,
        _PCX + Math.cos(mid) * _PR * 0.46,
        _PCY + Math.sin(mid) * _PR * 0.46);
      ctx.restore();
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
    _pvpOnLand();
  }
}

function _pvpOnLand() {
  if (_pvpApplied || !_pvpReward || !_pvpFighter) return;
  _pvpApplied = true;

  // Apply reward + get outcome string (in-tournament only, does NOT sync to roster)
  const outcome = _pvpApplyReward(_pvpFighter, _pvpReward);

  // Show result panel
  document.getElementById('pvp-reward-res-icon').textContent    = _pvpReward.icon;
  document.getElementById('pvp-reward-res-label').textContent   = _pvpReward.label;
  document.getElementById('pvp-reward-res-outcome').textContent = outcome;
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
  if (nameEl) nameEl.textContent = `${fighter.charEmoji ?? '⚔️'} ${fighter.charName ?? 'Winner'} wins!`;

  // Reset UI
  document.getElementById('pvp-reward-result').style.display = 'none';
  const spinBtn = document.getElementById('pvp-spin-btn');
  if (spinBtn) { spinBtn.disabled = false; spinBtn.textContent = '🎰 SPIN!'; }

  // Show modal
  document.getElementById('pvp-reward-modal').style.display = 'flex';

  // Draw initial wheel
  _pvpCtx = document.getElementById('pvp-reward-wheel').getContext('2d');
  _pvpDrawWheel(0);
}

// ── Button event bindings ─────────────────────────────────────────
// (scripts run after DOM is parsed since they're at bottom of body)
document.getElementById('pvp-spin-btn')?.addEventListener('click', () => {
  if (_pvpSpinning || _pvpApplied) return;
  _pvpSpinning  = true;
  _pvpStartTime = null;
  const btn = document.getElementById('pvp-spin-btn');
  btn.disabled    = true;
  btn.textContent = '🎡 Spinning…';
  requestAnimationFrame(_pvpAnimateSpin);
});

document.getElementById('pvp-reward-continue')?.addEventListener('click', () => {
  document.getElementById('pvp-reward-modal').style.display = 'none';
  // Proceed to bracket view
  const bracketBtn = document.getElementById('bracketBtn');
  if (bracketBtn && bracketBtn.style.display !== 'none') bracketBtn.click();
});
