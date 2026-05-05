// ============================================================
// CHARACTER DEVELOPMENT — Char Dev wheel (sau bước skillpick)
// ============================================================
// Mỗi entry: id, label, icon, weight, color, desc
// applyCharDevToCgState(id, cgState) → { extraDevs, extraSkills, isekai }
// cgVessels — mảng lưu vessel khi Isekai

const CHARDEV_POOL = [
  { id: 'inversion',      label: 'Inversion',              icon: '🔄', weight: 1.2, color: '#6622aa',
    desc: 'Đảo ngược tất cả base stat (10↔1, 9↔2, 8↔3, 7↔4, 6↔5)' },
  { id: 'isekai',         label: 'Isekai',                 icon: '🌀', weight: 0.8, color: '#2244cc',
    desc: 'Quay lại từ đầu — nhân vật hiện tại trở thành vessel có thể nhập vào sau' },
  { id: 'blessed_chaos',  label: 'Blessed by Chaos',       icon: '🎲', weight: 2.0, color: '#cc4422',
    desc: 'Stat cao nhất −1, nhận thêm 2 Char Dev' },
  { id: 'braindead',      label: 'Braindead',              icon: '🧟', weight: 1.4, color: '#559922',
    desc: '−2 IQ, +2 BIQ' },
  { id: 'madness',        label: 'Madness',                icon: '💢', weight: 1.2, color: '#aa2244',
    desc: 'Mất hết skills, +2 STR / +2 SPD / +2 MA' },
  { id: 'too_horny',      label: 'Too Horny',              icon: '💘', weight: 1.6, color: '#ee4488',
    desc: '+3 STR, +2 DUR, IQ = 0' },
  { id: 'kungfu',         label: 'Kungfu Training',        icon: '🥋', weight: 2.0, color: '#cc8833',
    desc: '+2 DUR, +2 MA' },
  { id: 'lost_arm',       label: 'Lost an Arm',            icon: '🦾', weight: 1.2, color: '#884411',
    desc: '−4 Martial Arts 💀' },
  { id: 'lost_leg',       label: 'Lost a Leg',             icon: '🦿', weight: 1.2, color: '#774422',
    desc: '−4 Speed 💀' },
  { id: 'cultivation',    label: 'Cultivation Technique',  icon: '☯️', weight: 1.8, color: '#22aacc',
    desc: '+2 BIQ, +3 MA' },
  { id: 'become_woke',    label: 'Become Woke',            icon: '📢', weight: 1.8, color: '#99bb00',
    desc: '−3 IQ, +1 STR, +1 DUR' },
  { id: 'old_age',        label: 'Old Age',                icon: '👴', weight: 2.0, color: '#aaaaaa',
    desc: '+2 IQ, +1 BIQ, −1 DUR' },
  { id: 'no_family',      label: 'No More Family',         icon: '💔', weight: 1.2, color: '#cc2244',
    desc: 'Nhận thêm 2 skills' },
  { id: 'fates_trick',    label: "Fate's Trick",           icon: '🎭', weight: 2.0, color: '#886622',
    desc: '50%: nhân đôi stat thấp nhất — 50%: chia đôi stat cao nhất (làm tròn lên)' },
  { id: 'patkinsion',     label: 'Patkinsion',             icon: '🤲', weight: 1.6, color: '#5533aa',
    desc: 'Khi parry / đánh trúng / nảy tường: 20% tự làm rơi vũ khí của mình' },
  { id: 'dungeon_crawler', label: 'Dungeon Crawler',       icon: '🏰', weight: 1.8, color: '#446633',
    desc: 'Không nhận sát thương từ bất kỳ trap nào (pillar / scythe / lightning / bomb)' },
  { id: 'finality',       label: 'Finality',               icon: '☠️', weight: 0.6, color: '#332244',
    desc: 'Race của bạn tuyệt chủng trong mùa championship này (weight = 0)' },
  { id: 'jjk',           label: 'JJK',                    icon: '👁️', weight: 1.5, color: '#1a0033',
    desc: 'Mở vòng quay JJK — nhận 1 Domain hoặc Curse Technique (Domain là unique)' },
  { id: 'jojo',          label: 'JoJo',                   icon: '🎭', weight: 1.5, color: '#331a00',
    desc: 'Mở vòng quay JoJo — nhận 1 Stand (unique) hoặc Support Skill' },
  { id: 'onepiece',      label: 'One Piece',              icon: '🏴‍☠️', weight: 1.5, color: '#003366',
    desc: 'Mở vòng quay One Piece — nhận 1 Haki hoặc 1 Trái Ác Quỷ (unique)' },
  { id: 'summoner',      label: 'Summoner',               icon: '🧿', weight: 1.4, color: '#2e1a4a',
    desc: 'Mở vòng quay Summoner — nhận 1 skill triệu hồi. Summons mạnh hơn (20 HP, thời gian ×1.5) nhưng bản thân −30% sát thương' },
];

// ── Isekai vessel store ────────────────────────────────────────────
// Persist qua các lần initChargen() trong cùng phiên (nhưng clear khi F5)
let cgVessels = [];

// ── Apply effect ────────────────────────────────────────────────────
// Returns: { extraDevs: N, extraSkills: N, isekai: bool }
function applyCharDevToCgState(id, cgState) {
  const SK  = ['strength','speed','durability','iq','battleiq','ma'];
  const st  = cgState.stats;

  const _get  = k => st[k] ?? 5;
  const _set  = (k, v) => { st[k] = Math.max(0, v); };

  switch (id) {

    case 'inversion': {
      // 10↔1, 9↔2, 8↔3, 7↔4, 6↔5 — clamp giữa 1 và 10
      for (const k of SK) {
        if (st[k] !== null && st[k] !== undefined) {
          st[k] = Math.max(1, Math.min(10, 11 - st[k]));
        }
      }
      break;
    }

    case 'isekai':
      return { isekai: true };

    case 'blessed_chaos': {
      const maxKey = SK.reduce((a, b) => _get(a) >= _get(b) ? a : b);
      _set(maxKey, _get(maxKey) - 1);
      return { extraDevs: 2 };
    }

    case 'braindead': {
      _set('iq',       _get('iq')       - 2);
      _set('battleiq', _get('battleiq') + 2);
      break;
    }

    case 'madness': {
      cgState.skills = [];
      _set('strength', _get('strength') + 2);
      _set('speed',    _get('speed')    + 2);
      _set('ma',       _get('ma')       + 2);
      break;
    }

    case 'too_horny': {
      _set('strength',   _get('strength')   + 3);
      _set('durability', _get('durability') + 2);
      st.iq = 0;
      break;
    }

    case 'kungfu': {
      _set('durability', _get('durability') + 2);
      _set('ma',         _get('ma')         + 2);
      break;
    }

    case 'lost_arm': {
      _set('ma', _get('ma') - 4);
      break;
    }

    case 'lost_leg': {
      _set('speed', _get('speed') - 4);
      break;
    }

    case 'cultivation': {
      _set('battleiq', _get('battleiq') + 2);
      _set('ma',       _get('ma')       + 3);
      break;
    }

    case 'become_woke': {
      _set('iq',         _get('iq')         - 3);
      _set('strength',   _get('strength')   + 1);
      _set('durability', _get('durability') + 1);
      break;
    }

    case 'old_age': {
      _set('iq',         _get('iq')         + 2);
      _set('battleiq',   _get('battleiq')   + 1);
      _set('durability', _get('durability') - 1);
      break;
    }

    case 'no_family':
      return { extraSkills: 2 };

    case 'fates_trick': {
      const minKey = SK.reduce((a, b) => _get(a) <= _get(b) ? a : b);
      const maxKey = SK.reduce((a, b) => _get(a) >= _get(b) ? a : b);
      if (Math.random() < 0.5) {
        // Nhân đôi stat thấp nhất
        _set(minKey, _get(minKey) * 2);
      } else {
        // Chia đôi stat cao nhất, làm tròn lên
        _set(maxKey, Math.ceil(_get(maxKey) / 2));
      }
      break;
    }

    case 'patkinsion':
    case 'dungeon_crawler':
    case 'finality':
      // Combat / championship effects — stored in charDevs array, handled elsewhere
      break;

    case 'jjk':
      // Signal chargen to open JJK sub-wheel
      return { jjkPick: true };

    case 'jojo':
      // Signal chargen to open JoJo sub-wheel
      return { jojoPick: true };

    case 'onepiece':
      // Signal chargen to open One Piece sub-wheel
      return { onepiecePick: true };

    case 'summoner':
      // Signal chargen to open Summoner sub-wheel
      return { summonerPick: true };

    default: break;
  }

  return {};
}

// ── Isekai logic ────────────────────────────────────────────────────
function _doIsekai() {
  // Save current cgState as vessel (nếu đã có tên)
  if (typeof cgState !== 'undefined' && cgState?.name) {
    cgVessels.push({
      name:      cgState.name,
      race:      cgState.race,
      subrace:   cgState.subrace,
      stats:     { ...cgState.stats },
      weapon:    cgState.weapon,
      skills:    (cgState.skills || []).map(s => s.id ?? s),
      charDevs:  [...(cgState.charDevs || [])],
      color:     typeof generateRadoserColor === 'function'
                   ? generateRadoserColor(cgVessels.length + (typeof cgRoster !== 'undefined' ? cgRoster.length : 0))
                   : '#ff8844',
    });
  }

  // Nếu đã có vessel → show "Isekai into" choice
  if (cgVessels.length > 1) {
    _showIsekaiIntoChoice();
  } else {
    // First isekai — just restart
    if (typeof initChargen === 'function') initChargen();
  }
}

// ── "Isekai into" UI — hiện ra sau khi đã có vessel ───────────────────
function _showIsekaiIntoChoice() {
  const box = document.getElementById('cg-content');
  if (!box) { if (typeof initChargen === 'function') initChargen(); return; }

  // Render danh sách vessel + "New Start" option
  const vesselBtns = cgVessels.map((v, i) => {
    const raceName = v.race?.name ?? '?';
    const stats = v.stats
      ? `STR ${v.stats.strength ?? '?'} / SPD ${v.stats.speed ?? '?'} / DUR ${v.stats.durability ?? '?'}`
      : '';
    return `<button class="cg-btn" id="isekai-vessel-${i}" style="margin:4px;width:100%;text-align:left;padding:8px 14px;">
      <b>${v.race?.emoji ?? '🎭'} ${v.name}</b>
      <span style="display:block;font-size:11px;color:#aaa;">${raceName} — ${stats}</span>
    </button>`;
  }).join('');

  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label">🌀 Isekai Into…</div>
      <div style="color:#aaa;font-size:12px;margin-bottom:8px;">Chọn để nhập vào vessel hoặc bắt đầu mới.</div>
      <button class="cg-btn" id="isekai-newstart" style="margin:4px;width:100%;">🌱 New Start (Bắt đầu từ đầu)</button>
      ${vesselBtns}
    </div>`;

  document.getElementById('isekai-newstart').onclick = () => {
    if (typeof initChargen === 'function') initChargen();
  };
  cgVessels.forEach((v, i) => {
    document.getElementById(`isekai-vessel-${i}`).onclick = () => _isekaiIntoVessel(v);
  });
}

// ── Isekai into a vessel — copy vessel stats, jump to done ─────────────
function _isekaiIntoVessel(vessel) {
  if (typeof cgState === 'undefined' || !cgState) return;

  cgState.name    = vessel.name;
  cgState.race    = vessel.race;
  cgState.subrace = vessel.subrace;
  cgState.stats   = { ...vessel.stats };
  cgState.weapon  = vessel.weapon;
  cgState.hasWeapon = vessel.weapon !== 'fists';

  // Skills: re-map from ids to SKILL_DEF objects
  cgState.skills = [];
  if (typeof SKILL_DEFS !== 'undefined' && vessel.skills?.length) {
    vessel.skills.forEach(id => {
      const def = SKILL_DEFS.find(s => s.id === id);
      if (def) cgState.skills.push(def);
    });
  }

  cgState.charDevs = [...(vessel.charDevs || [])];
  // Không spin chardev nữa — vessel đã có sẵn
  cgState.charDevRemaining   = 0;
  cgState.charDevExtraSkills = 0;
  cgState.step = 'done';

  if (typeof renderCgStep === 'function') renderCgStep();
  if (typeof cgUpdatePreview === 'function') cgUpdatePreview();
}
