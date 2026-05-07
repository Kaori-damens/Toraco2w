// ============================================================
// CHARGEN FLOW
// ============================================================
// ─── Tổng quan ───────────────────────────────────────────────
// Hệ thống tạo nhân vật dạng "spin wheel từng bước":
//   14 bước: name → race → subrace → str → spd → dur → iq → biq → ma
//            → hasweapon → weapon → skillcount → skillpick → done
//
// cgState: object lưu kết quả từng bước trong phiên tạo hiện tại
// cgRoster: mảng nhân vật đã tạo, persist vào localStorage
//
// Flow chính:
//   initChargen()  → reset cgState, show màn chargen, gọi renderCgStep()
//   renderCgStep() → render UI cho bước hiện tại (spin wheel hoặc text input)
//   advanceCg()    → move đến bước tiếp theo, gọi lại renderCgStep()
//
// Một số bước bị skip tự động:
//   • subrace: skip nếu race không có subKey
//   • iq:      auto set = 1 nếu race = skeleton
//   • hasweapon: skip nếu subrace đảm bảo có vũ khí (Goblin ×100k, Human Trắng…)
//
// Mode đặc biệt:
//   quickCreateMode — tạo nhanh với tên preset, skip màn name
//   cgDraftMode     — tạo cho championship draft, lọc demon sins đã claim

const CHARGEN_STEPS = ['name','race','subrace','str','spd','dur','iq','biq','ma','hasweapon','weapon','skillcount','skillpick','chardev','done'];
let cgState = null;
let cgRoster = JSON.parse(localStorage.getItem('cgRoster') || '[]'); // persist qua localStorage
let quickCreateMode = false;
let quickCreateName = ''; // tên tùy chỉnh cho quick create
let cgDraftMode = false;  // true khi tạo nhân vật cho championship draft
let _cgpAnimId = null;    // rAF handle cho preview ball animation (cancel khi initChargen)

// ── DEBUG HELPER ─────────────────────────────────────────────
// Appends a debug quick-pick panel below any chargen spin wheel.
// items: [{label, onClick}]
function _cgDebug(box, title, items) {
  if (!window.debugMode) return;
  const dbg = document.createElement('div');
  dbg.style.cssText = 'margin-top:10px;padding:8px 12px;background:#1a1a2e;border:1px dashed #ff6b35;border-radius:8px;';
  const btns = items.map((it, i) => {
    const id = `_cgdbg_${Date.now()}_${i}`;
    return { html: `<button id="${id}" style="background:#2a2a4a;border:1px solid #444;border-radius:5px;color:#ccc;cursor:pointer;font-size:11px;padding:3px 8px;">${it.label}</button>`, id, cb: it.onClick };
  });
  dbg.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:11px;color:#ff6b35;letter-spacing:1px;">DEBUG — ${title}</span><button id="_cgdbg_reroll" style="background:#2a2a4a;border:1px solid #ff6b35;border-radius:5px;color:#ff6b35;cursor:pointer;font-size:11px;padding:2px 8px;">🔄 Roll Again</button></div><div style="display:flex;flex-wrap:wrap;gap:5px;">${btns.map(b=>b.html).join('')}</div>`;
  box.appendChild(dbg);
  btns.forEach(b => { const el = dbg.querySelector('#'+b.id); if (el) el.onclick = b.cb; });
  const reroll = dbg.querySelector('#_cgdbg_reroll');
  if (reroll) reroll.onclick = () => renderCgStep();
}

// ─── initChargen ─────────────────────────────────────────────
// Reset hoàn toàn cgState và bắt đầu flow từ bước 'name'.
// Gọi từ nút "Tạo nhân vật mới" hoặc khi bắt đầu quick/draft create.
// Tham số: không có
// Trả về: không có
function initChargen() {
  if (_cgpAnimId) { cancelAnimationFrame(_cgpAnimId); _cgpAnimId = null; } // dừng animation preview cũ
  // Remove done-step layout modifier if present
  document.querySelector('.cg-layout')?.classList.remove('cg-layout-done');
  cgState = {
    step: 'name', name: '', race: null, subrace: null,
    stats: { strength:null, speed:null, durability:null, iq:null, battleiq:null, ma:null },
    hasWeapon: null,      // true = armed, false = unarmed (fists)
    isUniqueWeapon: null, // true = unique weapon roll (championship only), false = normal
    weapon: null,
    skillCount: 0,    // how many skills to roll
    skills: [],       // array of SKILL_DEF objects picked
    // Char Dev step
    charDevs:           [],  // ids of char devs received
    charDevRemaining:   1,   // spins left (Blessed by Chaos adds 2)
    charDevExtraSkills: 0,   // extra skill spins granted by No More Family
  };
  showScreen('chargen');
  renderCgDots();
  renderCgStep();
  // Clear preview panel on fresh start
  const panel = document.getElementById('cg-preview');
  if (panel) panel.innerHTML = '';
}

function renderCgDots() {
  const row = document.getElementById('cgDots');
  const steps = ['name','race','subrace','str','spd','dur','iq','biq','ma','hasweapon','weapon','skillcount','skillpick','chardev','done'];
  const cur = steps.indexOf(cgState.step);
  row.innerHTML = steps.map((s,i) =>
    `<div class="cg-dot ${i < cur ? 'done' : i === cur ? 'active' : ''}"></div>`
  ).join('');
}

// ─── renderCgStep ────────────────────────────────────────────
// Render UI cho bước hiện tại (cgState.step) vào div#cg-content.
// Mỗi bước gọi hàm render riêng: cgRenderName / cgRenderSpin / cgRenderDone…
// Debug mode: thêm quick-pick buttons bên dưới wheel qua _cgDebug().
// Tham số: không có (đọc cgState.step)
// Trả về: không có
function renderCgStep() {
  renderCgDots();
  const box = document.getElementById('cg-content');
  box.innerHTML = '';
  const s = cgState.step;
  if (s === 'name')    { cgRenderName(box); return; }
  if (s === 'race') {
    cgRenderSpin(box, t('chargen_choose_race'), CG_RACES.map((r,i) => ({ label: r.emoji+' '+r.name, weight: r.weight, color: wColor(i) })), (w, idx) => { cgState.race = CG_RACES[idx]; advanceCg(); },
      null, null, null,
      { category: 'race', keys: CG_RACES.map(r => r.id) });
    if (window.debugMode) {
      // Debug: quick-pick buttons
      const dbg = document.createElement('div');
      dbg.style.cssText = 'margin-top:10px;padding:8px 12px;background:#1a1a2e;border:1px dashed #ff6b35;border-radius:8px;';
      dbg.innerHTML = `<div style="font-size:11px;color:#ff6b35;margin-bottom:6px;letter-spacing:1px;">DEBUG — Pick Race</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;">${CG_RACES.map((r,i) =>
          `<button onclick="cgState.race=CG_RACES[${i}];advanceCg();" style="background:#2a2a4a;border:1px solid #444;border-radius:5px;color:#ccc;cursor:pointer;font-size:11px;padding:3px 8px;">${r.emoji} ${r.name}</button>`
        ).join('')}</div>`;
      box.appendChild(dbg);
    }
    return;
  }
  if (s === 'subrace') {
    const srAll = CG_SUBRACES[cgState.race.subKey];
    if (!srAll) { advanceCg(); return; }

    // Championship draft: Demon chỉ được roll các sin chưa ai dùng trong draft
    // Mỗi sin (Lucifer, Mammon…) là unique — đã claim thì không ai roll được nữa
    let sr = srAll;
    if (cgState.race.id === 'demon' && cgDraftMode && typeof getAvailableDemonSins === 'function') {
      sr = getAvailableDemonSins();
      if (sr.length === 0) {
        // All sins claimed → sinless demon, skip subrace step
        cgState.subrace = null;
        advanceCg();
        return;
      }
    }

    const onPick = (idx) => {
      cgState.subrace = { ...sr[idx] };
      // Claim sin from pool when in championship draft
      if (cgState.race.id === 'demon' && cgDraftMode && typeof claimDemonSin === 'function') {
        claimDemonSin(cgState.subrace.label);
      }
      advanceCg();
    };

    cgRenderSpin(box, `${cgState.race.emoji} ${t('chargen_subrace_section').replace('⬡ ','')}`,
      sr.map((r,i) => ({ label:r.label, weight:r.weight, color:wColor(i) })),
      (w, idx) => onPick(idx),
      null, `${cgState.race.emoji} ${cgState.race.name}`, null,
      { category: 'subrace', keys: sr.map(r => `${cgState.race.id}:${r.label}`) });
    _cgDebug(box, 'Pick Sub-Race', sr.map((r, i) => ({
      label: r.label,
      onClick: () => onPick(i),
    })));
    return;
  }
  const STAT_STEPS = { str:'strength', spd:'speed', dur:'durability', iq:'iq', biq:'battleiq', ma:'ma' };
  if (s === 'iq' && cgState.race?.id === 'skeleton') {
    cgState.stats.iq = 1;
    advanceCg();
    return;
  }
  if (STAT_STEPS[s]) {
    const sk = STAT_STEPS[s];
    const sd = STAT_DISPLAY.find(x => x.key === sk);
    const raceId = (cgState.race.id === 'skeleton' && cgState.subrace?.raceId)
      ? cgState.subrace.raceId
      : cgState.race.id;
    let weights = [...(CG_STAT_WEIGHTS[sk][raceId] || Array(10).fill(10))];
    // God sub-race override: each sub-race has its own stat distribution
    if (raceId === 'god' && cgState.subrace?.label) {
      const godProfile = (typeof CG_GOD_SUBRACE_WEIGHTS !== 'undefined')
        ? CG_GOD_SUBRACE_WEIGHTS[cgState.subrace.label]
        : null;
      if (godProfile && godProfile[sk]) weights = [...godProfile[sk]];
    }
    // Human Vàng: IQ cannot be below 5 → zero out weights 1-4
    if (cgState.race.id === 'human' && cgState.subrace?.label === 'Vàng' && sk === 'iq') {
      for (let i = 0; i < 4; i++) weights[i] = 0;
    }
    // Human Đen: DUR cannot be below 5 → zero out weights 1-4
    if (cgState.race.id === 'human' && cgState.subrace?.label === 'Đen' && sk === 'durability') {
      for (let i = 0; i < 4; i++) weights[i] = 0;
    }
    const items = weights.map((w,i) => ({ label: String(i+1), weight: w, color: STAT_COLORS[i] }));
    const deltas = getSubraceStatDeltas();
    const delta  = deltas[sk] || 0;
    const race    = cgState.race?.id;
    const srLabel = cgState.subrace?.label || '';
    const ABBR    = {strength:'STR', speed:'SPD', durability:'DUR', iq:'IQ', battleiq:'BIQ', ma:'MA'};
    const statKeys = ['strength','speed','durability','iq','battleiq','ma'];

    // Constraint hint in title (Human Vàng IQ min5, Đen DUR min5)
    let constraintNote = '';
    if (race === 'human' && srLabel === 'Vàng' && sk === 'iq')
      constraintNote = ' <span style="opacity:0.55;font-size:0.75em">(min 5)</span>';
    if (race === 'human' && srLabel === 'Đen' && sk === 'durability')
      constraintNote = ' <span style="opacity:0.55;font-size:0.75em">(min 5)</span>';

    // statTransform: function biến đổi label hiển thị khi wheel đang quay
    //   nhận (weight, idx) → trả string HTML hiện ở giữa wheel
    //   delta ≠ 0: hiển thị "adj (rolled raw, ±delta subrace)"
    // onStatResult: callback khi wheel dừng — lưu giá trị cuối vào cgState.stats[sk]
    let statTransform = delta !== 0 ? (_w, idx) => {
      const raw = idx + 1;
      const adj = Math.max(1, raw + delta);
      const sign = delta > 0 ? `+${delta}` : `${delta}`;
      return `${adj} <span style="opacity:0.6;font-size:0.8em">(rolled ${raw}, ${sign} ${srLabel})</span>`;
    } : null;
    let onStatResult = (_w, idx) => { cgState.stats[sk] = Math.max(1, idx + 1 + delta); advanceCg(); };

    // ── GIANT TRAIT: so sánh STR vs IQ khi IQ vừa roll xong ──
    // Giant trait: stat cao hơn +5, stat thấp hơn -5 | bằng nhau: cả hai +3
    if (sk === 'iq' && race === 'giant') {
      statTransform = (_w, idx) => {
        const rawIQ  = Math.max(1, idx + 1 + delta);
        const rawSTR = cgState.stats.strength ?? rawIQ; // fallback if STR not yet set
        let finalIQ, finalSTR, note;
        if (rawIQ > rawSTR) {
          finalIQ  = rawIQ + 5;
          finalSTR = Math.max(1, rawSTR - 5);
          note = `🏔️ Giant: IQ>${rawSTR} → IQ+5 (${rawIQ}→${finalIQ}), STR: ${rawSTR}→${finalSTR}`;
        } else if (rawSTR > rawIQ) {
          finalSTR = rawSTR + 5;
          finalIQ  = Math.max(1, rawIQ - 5);
          note = `🏔️ Giant: STR>${rawIQ} → STR: ${rawSTR}→${finalSTR}, IQ: ${rawIQ}→${finalIQ}`;
        } else {
          finalIQ  = rawIQ + 3;
          finalSTR = rawSTR + 3;
          note = `🏔️ Giant: Equal → IQ+3 (→${finalIQ}), STR+3 (→${finalSTR})`;
        }
        return `${finalIQ} <span style="opacity:0.6;font-size:0.8em">${note}</span>`;
      };
      onStatResult = (_w, idx) => {
        const rawIQ  = Math.max(1, idx + 1 + delta);
        const rawSTR = cgState.stats.strength ?? rawIQ;
        if (rawIQ > rawSTR) {
          cgState.stats.iq = rawIQ + 5;
          cgState.stats.strength = Math.max(1, rawSTR - 5);
        } else if (rawSTR > rawIQ) {
          cgState.stats.strength = rawSTR + 5;
          cgState.stats.iq = Math.max(1, rawIQ - 5);
        } else {
          cgState.stats.iq = rawIQ + 3;
          cgState.stats.strength = rawSTR + 3;
        }
        advanceCg();
      };
    }

    // ── GOD SUBRACE OVERRIDES: mỗi God subrace đảm bảo 1 stat ≥10, roll 10 → ×2 ──
    // Áp dụng từng stat khi bước đó đến: Surtr=STR, Raijin=SPD, Thoth=IQ, Athena=BIQ, Shiva=MA, Atlas=DUR
    if (sk === 'strength' && race === 'god' && srLabel === 'Blessed by Surtr') {
      statTransform = (_w, idx) => {
        const raw = idx + 1;
        if (raw >= 10) return `20 <span style="opacity:0.6;font-size:0.8em">(rolled ${raw} ⚡ DOUBLED!)</span>`;
        return `10 <span style="opacity:0.6;font-size:0.8em">(rolled ${raw}, ✨ God's Gift)</span>`;
      };
      onStatResult = (_w, idx) => { cgState.stats.strength = (idx + 1 >= 10) ? 20 : 10; advanceCg(); };
    }

    // ── GOD OF SPEED: SPD guaranteed ≥10; roll 10 → SPD doubled (→20) ──
    if (sk === 'speed' && race === 'god' && srLabel === 'Blessed by Raijin') {
      statTransform = (_w, idx) => {
        const raw = idx + 1;
        if (raw >= 10) return `20 <span style="opacity:0.6;font-size:0.8em">(rolled ${raw} ⚡ DOUBLED!)</span>`;
        return `10 <span style="opacity:0.6;font-size:0.8em">(rolled ${raw}, ✨ God's Gift)</span>`;
      };
      onStatResult = (_w, idx) => { cgState.stats.speed = (idx + 1 >= 10) ? 20 : 10; advanceCg(); };
    }

    // ── GOD OF IQ: IQ guaranteed ≥10; roll 10 → IQ doubled (→20) ──
    if (sk === 'iq' && race === 'god' && srLabel === 'Blessed by Thoth') {
      statTransform = (_w, idx) => {
        const raw = idx + 1;
        if (raw >= 10) return `20 <span style="opacity:0.6;font-size:0.8em">(rolled ${raw} ⚡ DOUBLED!)</span>`;
        return `10 <span style="opacity:0.6;font-size:0.8em">(rolled ${raw}, ✨ God's Gift)</span>`;
      };
      onStatResult = (_w, idx) => { cgState.stats.iq = (idx + 1 >= 10) ? 20 : 10; advanceCg(); };
    }

    // ── GOD OF BIQ: BIQ guaranteed ≥10; roll 10 → BIQ doubled (→20) ──
    if (sk === 'battleiq' && race === 'god' && srLabel === 'Blessed by Athena') {
      statTransform = (_w, idx) => {
        const raw = idx + 1;
        if (raw >= 10) return `20 <span style="opacity:0.6;font-size:0.8em">(rolled ${raw} ⚡ DOUBLED!)</span>`;
        return `10 <span style="opacity:0.6;font-size:0.8em">(rolled ${raw}, ✨ God's Gift)</span>`;
      };
      onStatResult = (_w, idx) => { cgState.stats.battleiq = (idx + 1 >= 10) ? 20 : 10; advanceCg(); };
    }

    // ── GOD OF MA: MA guaranteed ≥10; roll 10 → MA doubled (→20) ──
    if (sk === 'ma' && race === 'god' && srLabel === 'Blessed by Shiva') {
      statTransform = (_w, idx) => {
        const raw = idx + 1;
        if (raw >= 10) return `20 <span style="opacity:0.6;font-size:0.8em">(rolled ${raw} ⚡ DOUBLED!)</span>`;
        return `10 <span style="opacity:0.6;font-size:0.8em">(rolled ${raw}, ✨ God's Gift)</span>`;
      };
      onStatResult = (_w, idx) => { cgState.stats.ma = (idx + 1 >= 10) ? 20 : 10; advanceCg(); };
    }

    // ── GOD OF DUR: DUR guaranteed ≥10; roll 10 → DUR doubled (→20) ──
    if (sk === 'durability' && race === 'god' && srLabel === 'Blessed by Atlas') {
      statTransform = (_w, idx) => {
        const raw = idx + 1;
        if (raw >= 10) return `20 <span style="opacity:0.6;font-size:0.8em">(rolled ${raw} ⚡ DOUBLED!)</span>`;
        return `10 <span style="opacity:0.6;font-size:0.8em">(rolled ${raw}, ✨ God's Gift)</span>`;
      };
      onStatResult = (_w, idx) => { cgState.stats.durability = (idx + 1 >= 10) ? 20 : 10; advanceCg(); };
    }

    // ── LAST-STAT EFFECTS: Dragon Flame / Primordial Air/Water áp dụng khi roll MA ──
    // MA là stat cuối cùng → lúc này đã biết toàn bộ stats → tính effect dựa trên min/max stat
    // Dragon Flame: +2 vào stat thấp nhất | Primordial Air: +1 stat thấp nhất | Water: +1 stat cao nhất
    if (sk === 'ma') {
      const hasLastEffect = (race === 'dragon' && srLabel === 'Flame') ||
                            (race === 'primordial' && (srLabel === 'Air' || srLabel === 'Water'));
      if (hasLastEffect) {
        const computeLastEffect = (rawMA) => {
          const tempStats = { ...cgState.stats, ma: rawMA };
          const lowestKey  = statKeys.reduce((a,b) => tempStats[a] <= tempStats[b] ? a : b);
          const highestKey = statKeys.reduce((a,b) => tempStats[a] >= tempStats[b] ? a : b);
          const finalStats = { ...tempStats };
          let note = '';
          if (race === 'dragon' && srLabel === 'Flame') {
            finalStats[lowestKey] += 2;
            note = `🔥 Flame: +2 ${ABBR[lowestKey]} (${tempStats[lowestKey]}→${finalStats[lowestKey]})`;
          } else if (srLabel === 'Air') {
            finalStats[lowestKey] += 1;
            note = `💨 Air: +1 ${ABBR[lowestKey]} (${tempStats[lowestKey]}→${finalStats[lowestKey]})`;
          } else if (srLabel === 'Water') {
            finalStats[highestKey] += 1;
            note = `💧 Water: +1 ${ABBR[highestKey]} (${tempStats[highestKey]}→${finalStats[highestKey]})`;
          }
          return { finalStats, note };
        };
        statTransform = (_w, idx) => {
          const rawMA = Math.max(1, idx + 1 + delta);
          const { finalStats, note } = computeLastEffect(rawMA);
          const flatAnnot = delta !== 0
            ? ` <span style="opacity:0.6;font-size:0.8em">(rolled ${idx+1}, ${delta>0?'+':''}${delta} ${srLabel})</span>`
            : '';
          return `${finalStats.ma}${flatAnnot} <span style="opacity:0.6;font-size:0.8em">${note}</span>`;
        };
        onStatResult = (_w, idx) => {
          const rawMA = Math.max(1, idx + 1 + delta);
          const { finalStats } = computeLastEffect(rawMA);
          Object.assign(cgState.stats, finalStats);
          advanceCg();
        };
      }
    }

    cgRenderSpin(box, `${sd.emoji} ${sd.label}${constraintNote}`, items, onStatResult, null, null, statTransform);
    // Debug: pick value 1-10 directly (applies onStatResult logic including giant/god transforms)
    _cgDebug(box, `Pick ${ABBR[sk]}`, Array.from({length:10}, (_,i) => ({
      label: String(i+1),
      onClick: () => onStatResult(null, i)
    })));
    return;
  }
  if (s === 'uniqueweapon') {
    // Championship only: 13% chance to roll a unique weapon, 87% normal
    const availableUniques = WEAPON_DEFS.filter(w => w.unique && isUniqueAvailable(w.id));
    if (availableUniques.length === 0) {
      // No uniques left in pool → go straight to normal weapons
      cgState.isUniqueWeapon = false;
      advanceCg();
      return;
    }
    const items = [
      { label: t('chargen_unique_weapon_yes'), weight: 13, color: '#ffd700' },
      { label: t('chargen_unique_weapon_no'),  weight: 87, color: '#44ccff' },
    ];
    cgRenderSpin(box, t('chargen_unique_weapon_title'), items, (_w, idx) => {
      cgState.isUniqueWeapon = (idx === 0);
      advanceCg();
    }, null, null, null,
    { category: 'has_weapon', keys: ['unique', 'normal'] });
    _cgDebug(box, 'Unique Weapon?', [
      { label: '✨ Unique', onClick: () => { cgState.isUniqueWeapon = true;  advanceCg(); } },
      { label: '⚔️ Normal', onClick: () => { cgState.isUniqueWeapon = false; advanceCg(); } },
    ]);
    return;
  }
  if (s === 'hasweapon') {
    // Guaranteed weapon from certain subraces — skip wheel
    const sr = cgState.subrace?.label;
    const rid = cgState.race?.id;
    // Blessed by Athena: always armed (Weapon Mastery — masters all weapons)
    if (rid === 'god' && sr === 'Blessed by Athena') {
      cgState.hasWeapon = true;
      box.innerHTML = `<div class="cg-card">
        <div class="cg-label">⚔️ Armed!</div>
        <div class="cg-result-box" style="margin:16px auto">⚔️ Armed</div>
        <div class="cg-trait">✨ Blessed by Athena — Weapon Mastery: always armed</div>
      </div>`;
      playTone(660, 'sine', 0.4, 0.15, 0.5);
      setTimeout(() => advanceCg(), quickCreateMode ? 0 : 1200);
      return;
    }
    if ((rid === 'human' && sr === 'Trắng') || (rid === 'goblin' && sr === '×100,000') || rid === 'dwarf') {
      cgState.hasWeapon = true;
      box.innerHTML = `<div class="cg-card">
        <div class="cg-label">⚔️ Armed!</div>
        <div class="cg-result-box" style="margin:16px auto">⚔️ Armed</div>
        <div class="cg-trait">${cgState.race.emoji} ${sr} — guaranteed weapon</div>
      </div>`;
      playTone(660, 'sine', 0.4, 0.15, 0.5);
      setTimeout(() => advanceCg(), quickCreateMode ? 0 : 1200);
      return;
    }
    const items = [
      { label: t('chargen_armed_label'),   weight: 80, color: '#44ccff' },
      { label: t('chargen_unarmed_label'), weight: 20, color: '#ff8844' },
    ];
    cgRenderSpin(box, t('chargen_has_weapon_title'), items, (_w, idx) => {
      cgState.hasWeapon = (idx === 0);
      if (!cgState.hasWeapon) cgState.weapon = 'fists'; // skip weapon wheel
      advanceCg();
    }, null, null, null,
    { category: 'has_weapon', keys: ['armed', 'unarmed'] });
    _cgDebug(box, 'Pick Has Weapon?', [
      { label: '⚔️ Armed',   onClick: () => { cgState.hasWeapon = true;  advanceCg(); } },
      { label: '✊ Unarmed', onClick: () => { cgState.hasWeapon = false; cgState.weapon = 'fists'; advanceCg(); } },
    ]);
    return;
  }
  if (s === 'weapon') {
    let allWeaponOptions;
    if (cgDraftMode && cgState.isUniqueWeapon) {
      // Unique weapon wheel — only available uniques, equal weight each
      allWeaponOptions = WEAPON_DEFS.filter(w => w.unique && isUniqueAvailable(w.id));
    } else {
      // Normal weapon wheel — no uniques
      allWeaponOptions = [...CG_WEAPONS_ARMED];
    }
    const weaponItems = allWeaponOptions.map((w, i) => ({
      label: (w.icon ? w.icon + ' ' : '') + (w.label || w.name),
      weight: 1,
      color: w.unique ? '#ffd700' : wColor(i),
      _isUnique: !!w.unique,
      _id: w.id,
    }));
    const title = (cgDraftMode && cgState.isUniqueWeapon) ? t('chargen_unique_weapon_heading') : t('chargen_weapon_title');
    cgRenderSpin(box, title, weaponItems, (_w, idx) => {
      const chosen = allWeaponOptions[idx];
      cgState.weapon = chosen.id || chosen;
      if (cgDraftMode && chosen.unique) claimUnique(chosen.id);
      advanceCg();
    }, null, null, null,
    { category: 'weapon', keys: allWeaponOptions.map(w => w.id) });
    _cgDebug(box, 'Pick Weapon', allWeaponOptions.map(w => ({
      label: (w.icon ? w.icon + ' ' : '') + (w.label || w.name),
      onClick: () => {
        cgState.weapon = w.id;
        if (cgDraftMode && w.unique) claimUnique(w.id);
        advanceCg();
      }
    })));
    return;
  }
  if (s === 'skillcount') {
    // Beelzebub: always 0 skills — skip wheel entirely
    if (cgState.race?.id === 'demon' && cgState.subrace?.label === 'Beelzebub') {
      cgState.skillCount = 0;
      box.innerHTML = `<div class="cg-card">
        <div class="cg-label">Skill Mastery</div>
        <div class="cg-result-box" style="margin:16px auto">0 Skills</div>
        <div class="cg-trait">😈 Beelzebub (Gluttony) — Không có kỹ năng khởi đầu. Win → +1 stat random mỗi trận.</div>
      </div>`;
      playTone(220, 'sawtooth', 0.4, 0.12, 0.6);
      setTimeout(() => advanceCg(), quickCreateMode ? 0 : 1400);
      return;
    }
    // Blessed by Thoth: skip skill wheel, grant ceil(IQ × 1.7) skills (capped at pool size)
    if (cgState.race?.id === 'god' && cgState.subrace?.label === 'Blessed by Thoth') {
      const iq = cgState.stats.iq ?? 10;
      // Cap by filtered pool (skills matching this character's weapon), not total SKILL_DEFS
      const charWeapon = cgState.weapon || null;
      const effectiveWeaponBless = (charWeapon && WEAPON_MAP[charWeapon]?.baseWeapon) || charWeapon;
      const poolSize = SKILL_DEFS.filter(s => !s.weapon || s.weapon === effectiveWeaponBless).length;
      const count = Math.min(Math.ceil(iq * 1.7), poolSize);
      cgState.skillCount = count;
      box.innerHTML = `<div class="cg-card">
        <div class="cg-label">${t('chargen_skill_mastery_label')}</div>
        <div class="cg-result-box" style="margin:16px auto">${count} ${t('chargen_skill_count_label')}</div>
        <div class="cg-trait">✨ Blessed by Thoth — IQ ${iq} × 1.7 = ${count} ${t('chargen_skill_count_label').toLowerCase()} (no wheel)</div>
      </div>`;
      playTone(880, 'sine', 0.5, 0.12, 0.6);
      setTimeout(() => advanceCg(), quickCreateMode ? 0 : 1400);
      return;
    }
    const raceId = cgState.race?.id || 'human';
    const weights = CG_SKILL_COUNT_WEIGHTS[raceId] || [20, 20, 20, 20, 20];
    const items = weights.map((w, i) => ({
      label: i === 0 ? '0 Skills' : `${i} Skill${i > 1 ? 's' : ''}`,
      weight: w,
      color: wColor(i + 4),
    }));
    const skillBonus = getSubraceSkillBonus();
    const skillTransform = skillBonus > 0 ? (_w, idx) => {
      const raw = idx;
      const adj = raw + skillBonus;
      const adjLabel = adj === 0 ? '0 Skills' : `${adj} Skill${adj !== 1 ? 's' : ''}`;
      return `${adjLabel} <span style="opacity:0.6;font-size:0.8em">(${raw} +${skillBonus} ${cgState.subrace?.label})</span>`;
    } : null;
    cgRenderSpin(box, `${cgState.race.emoji} ${t('chargen_skill_count_label')}`, items, (_w, idx) => {
      cgState.skillCount = idx + skillBonus;
      advanceCg();
    }, null, null, skillTransform,
    { category: 'skill_count', keys: items.map((_, i) => String(i)) });
    _cgDebug(box, 'Pick Skill Count', Array.from({length: items.length}, (_, i) => ({
      label: i === 0 ? '0 Skills' : `${i + skillBonus} Skill${(i + skillBonus) !== 1 ? 's' : ''}`,
      onClick: () => { cgState.skillCount = i + skillBonus; advanceCg(); }
    })));
    return;
  }
  if (s === 'skillpick') { cgRenderSkillPick(box); return; }
  if (s === 'chardev')   { cgRenderCharDev(box);   return; }
  if (s === 'done') { cgRenderDone(box); }
}

function advanceCg() {
  const order = ['name','race','subrace','str','spd','dur','iq','biq','ma','hasweapon','uniqueweapon','weapon','skillcount','skillpick','chardev','done'];
  let next = order.indexOf(cgState.step) + 1;
  // Skip uniqueweapon if not in championship draft OR not armed
  if (order[next] === 'uniqueweapon' && (!cgDraftMode || cgState.hasWeapon === false)) next++;
  // If unarmed, skip weapon wheel
  if (order[next] === 'weapon' && cgState.hasWeapon === false) next++;
  // If 0 skills rolled, skip the skill-pick wheel
  if (order[next] === 'skillpick' && cgState.skillCount === 0) next++;
  // Skip chardev in quickCreateMode (no spins for auto-create)
  if (order[next] === 'chardev' && quickCreateMode) next++;
  // Skip chardev if already fully resolved (returning from extra-skill re-entry)
  if (order[next] === 'chardev' && cgState.charDevRemaining === 0) next++;
  cgState.step = order[Math.min(next, order.length - 1)];
  renderCgStep();
  cgUpdatePreview();
}

// ── LIVE PREVIEW PANEL ────────────────────────────────────────
// Renders the progressive character card in #cg-preview.
// Called after every advanceCg() so the panel stays in sync
// with whatever has been committed in cgState.
function cgUpdatePreview() {
  const panel = document.getElementById('cg-preview');
  if (!panel || !cgState) return;

  // Cancel any running preview ball animation
  if (_cgpAnimId) { cancelAnimationFrame(_cgpAnimId); _cgpAnimId = null; }

  // Nothing to show yet (name step, name still empty)
  if (!cgState.name) {
    panel.innerHTML = '';
    return;
  }

  const s = cgState;
  const previewColor = generateRadoserColor(cgDraftMode
    ? (state.championship?.draftRoster?.length ?? 0)
    : cgRoster.length);

  let html = `<div class="cg-preview-card">`;

  // ── Name ───────────────────────────────────────────────────
  html += `<div class="cgp-name">${s.race?.emoji ?? '🎲'} ${s.name}</div>`;

  // ── Ball + Race ─────────────────────────────────────────────
  const isDone = s.step === 'done';
  if (s.race) {
    const ballSz = isDone ? 140 : 120;
    html += `<canvas id="cgp-ball-canvas" class="cgp-ball-canvas" width="${ballSz}" height="${ballSz}"></canvas>`;
    html += `<div class="cgp-race">${s.race.name}${s.subrace ? ' · ' + s.subrace.label : ''}</div>`;

    // Race skill
    const raceSk = (typeof RACE_SKILL_DEFS !== 'undefined') ? RACE_SKILL_DEFS[s.race.id] : null;
    if (raceSk) {
      const descAttr = raceSk.desc ? ` data-desc="${raceSk.desc.replace(/"/g,'&quot;')}"` : '';
      html += `<div class="cgp-section-label">👑 Race Skill</div>
               <div class="cgp-skill-badge fcard-skill-tip"${descAttr}>${raceSk.name}</div>`;
    }

    // Subrace trait
    if (s.subrace?.desc) {
      html += `<div class="cgp-section-label">⬡ Sub-Race</div>
               <div class="cgp-trait">${s.subrace.desc}</div>`;
    }
  }

  // ── Stats grid ──────────────────────────────────────────────
  const STAT_STEP_IDS = ['str','spd','dur','iq','biq','ma'];
  const isOnStatStep = STAT_STEP_IDS.includes(s.step);
  const hasAnyStats  = s.stats && Object.values(s.stats).some(v => v !== null);
  if (hasAnyStats || isOnStatStep) {
    const statStepMap = { strength:'str', speed:'spd', durability:'dur', iq:'iq', battleiq:'biq', ma:'ma' };
    html += `<div class="cgp-section-label">📊 Stats</div>
             <div class="cg-stats-grid">`;
    STAT_DISPLAY.forEach(sd => {
      const v = s.stats[sd.key];
      const isActive = s.step === statStepMap[sd.key];
      html += `<div class="cg-sc ${isActive ? 'cg-active' : v !== null ? 'cg-done' : ''}">
        <div class="cg-sc-lbl">${sd.emoji} ${sd.label}</div>
        <div class="cg-sc-val${v === null ? ' cg-pending' : ''}">${v !== null ? v : '—'}</div>
      </div>`;
    });
    html += `</div>`;
  }

  // ── Weapon ──────────────────────────────────────────────────
  if (s.weapon && s.weapon !== 'fists') {
    const wepDef = (typeof WEAPON_MAP !== 'undefined') ? WEAPON_MAP[s.weapon] : null;
    const isUnique = wepDef?.unique === true;
    html += `<div class="cgp-section-label">⚔️ Weapon</div>
             <div class="cgp-weapon-name">${wepDef?.icon ?? '⚔️'} ${wepDef?.name ?? s.weapon}${isUnique ? ' <span class="unique-badge">★ UNIQUE</span>' : ''}</div>
             <canvas id="cgp-wep-canvas" class="cgp-wep-canvas" width="200" height="60"></canvas>`;
  } else if (s.weapon === 'fists' || s.hasWeapon === false) {
    html += `<div class="cgp-section-label">⚔️ Weapon</div>
             <div class="cgp-weapon-name">👊 Fists (Unarmed)</div>`;
  }

  // ── Skills ──────────────────────────────────────────────────
  if (s.skills?.length > 0) {
    html += `<div class="cgp-section-label">${t('fighter_card_skills_label')}</div><div class="cgp-skills">`;
    s.skills.forEach(sk => {
      const descAttr = sk.desc ? ` data-desc="${sk.desc.replace(/"/g,'&quot;')}"` : '';
      const typeAttr = sk.type ? ` data-type="${sk.type}"` : '';
      html += `<div class="cgp-skill-badge fcard-skill-tip${sk.unique ? ' cgp-skill-unique' : ''}"${descAttr}${typeAttr}>${getSkillName(sk)}${sk.unique ? ' <span style="font-size:10px">★</span>' : ''}</div>`;
    });
    html += `</div>`;
  }

  // ── Char Devs ────────────────────────────────────────────────
  if (s.charDevs?.length > 0 && typeof CHARDEV_POOL !== 'undefined') {
    html += `<div class="cgp-section-label">🌀 Char Dev</div><div class="cgp-skills">`;
    s.charDevs.forEach(id => {
      const cd = CHARDEV_POOL.find(c => c.id === id);
      if (cd) {
        const descAttr = ` data-desc="${cd.desc.replace(/"/g,'&quot;')}"`;
        html += `<div class="cgp-skill-badge fcard-skill-tip"${descAttr}>${cd.icon} ${cd.label}</div>`;
      }
    });
    html += `</div>`;
  }

  // ── Empty placeholder (very first render after name) ────────
  if (!s.race && !hasAnyStats && !isOnStatStep && !s.weapon) {
    html += `<div class="cgp-empty">— Spin to reveal —</div>`;
  }

  html += `</div>`;
  panel.innerHTML = html;

  // ── Skill tooltips (reuse fighter-card tooltip infrastructure) ──
  if (typeof _fcardWireSkillTooltips === 'function') _fcardWireSkillTooltips(panel);

  // ── Animated ball canvas ────────────────────────────────────
  if (s.race) {
    const canvas = document.getElementById('cgp-ball-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const SZ = canvas.width;
      const CX = SZ / 2, CY = SZ / 2, R = Math.round(SZ * 0.3);
      const fakeBall = {
        x: CX, y: CY, radius: R,
        color: previewColor,
        charRace: s.race.id,
        charSubrace: s.subrace ?? null,
        _deco_fa: 0,
        vx: 0, vy: 0,
        alive: true, hitFlash: 0,
        squashX: 1, squashY: 1, scale: 1,
        immunityFrames: 0, projImmunityFrames: 0,
        evadeFrames: 0, wallBoostFactor: 1.0,
        teamId: -1, speechText: null,
      };
      const loop = () => {
        _cgpAnimId = requestAnimationFrame(loop);
        ctx.clearRect(0, 0, SZ, SZ);
        // Draw simple ball body
        ctx.beginPath();
        ctx.arc(CX, CY, R, 0, Math.PI * 2);
        ctx.fillStyle = previewColor;
        ctx.shadowColor = previewColor;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.ellipse(CX - R*0.28, CY - R*0.3, R*0.28, R*0.18, -Math.PI*0.3, 0, Math.PI*2);
        ctx.fill();
        // Race decoration
        if (typeof drawRaceDecoration === 'function') drawRaceDecoration(ctx, fakeBall);
        fakeBall._deco_fa += 0.018;
      };
      loop();
    }
  }

  // ── Weapon canvas ───────────────────────────────────────────
  if (s.weapon && s.weapon !== 'fists') {
    const wCanvas = document.getElementById('cgp-wep-canvas');
    const wepDef  = (typeof WEAPON_MAP !== 'undefined') ? WEAPON_MAP[s.weapon] : null;
    if (wCanvas && wepDef?.draw) {
      const ctx = wCanvas.getContext('2d');
      ctx.clearRect(0, 0, 200, 60);
      const CW = 200, CH = 60, R = 12;
      const isFists  = false;
      const isRanged = wepDef.aiType === 'ranged';
      const bLen     = wepDef.baseLength ?? 40;
      const bx = isRanged ? CW / 2 - R - 6
               : Math.max(R + 4, CW / 2 - R - bLen / 2);
      const fakeBallW = {
        x: bx, y: CH / 2, radius: R,
        color: previewColor,
        charRace: s.race?.id ?? '', charSubrace: s.subrace ?? null,
        vx: 0, vy: 0,
        weapon: {
          angle: Math.PI * 0.1, hits: 0,
          length: wepDef.baseLength ?? 40,
          tipX: 0, tipY: 0, midX: 0, midY: 0,
          cd: 0, maxCd: 30, spinDir: 1, spinSpeed: 0.06,
          projCd: 0, projMaxCd: 30,
          reachAngle: Math.PI * 0.6,
        },
        weaponDef: wepDef,
        alive: true, hitFlash: 0,
        stunTimer: 0, _parryFrozen: false,
        squashX: 1, squashY: 1,
        immunityFrames: 0,
      };
      // Compute tip position from angle
      const ang = fakeBallW.weapon.angle;
      const len = fakeBallW.weapon.length;
      fakeBallW.weapon.tipX = bx + Math.cos(ang) * (R + len);
      fakeBallW.weapon.tipY = CH / 2 + Math.sin(ang) * (R + len);
      fakeBallW.weapon.midX = bx + Math.cos(ang) * (R + len * 0.5);
      fakeBallW.weapon.midY = CH / 2 + Math.sin(ang) * (R + len * 0.5);
      try { wepDef.draw(ctx, fakeBallW); } catch(e) { /* silent */ }
    }
  }
}

function cgRenderName(box) {
  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label">${t('chargen_step1_label')}</div>
      <div class="cg-name-row">
        <input class="cg-name-input" id="cgNameInput" placeholder="${t('chargen_name_placeholder')}" maxlength="24" value="${cgState.name}" autofocus>
        <button class="cg-random-btn" id="cgRandomName" title="Random hero name">${t('chargen_btn_random_name')}</button>
      </div>
      <div class="cg-nav">
        <button class="cg-btn" id="cgBackMenu">${t('chargen_btn_back')}</button>
        <button class="cg-btn primary" id="cgNameNext">${t('chargen_btn_next')}</button>
      </div>
    </div>`;
  document.getElementById('cgRandomName').onclick = () => {
    const input = document.getElementById('cgNameInput');
    input.value = getRandomGameName();
    input.style.borderColor = '#3a3a6a';
    input.focus();
  };
  document.getElementById('cgNameNext').onclick = () => {
    const v = document.getElementById('cgNameInput').value.trim();
    if (!v) { document.getElementById('cgNameInput').style.borderColor = '#ff4455'; return; }
    cgState.name = v; advanceCg();
  };
  document.getElementById('cgNameInput').onkeydown = e => { if (e.key === 'Enter') document.getElementById('cgNameNext').click(); };
  document.getElementById('cgBackMenu').onclick = () => {
    if (cgDraftMode) { cgDraftMode = false; showScreen('championship-setup'); buildChampionshipSetup(); }
    else { showScreen('menu'); buildFightersPanel(); renderRoster(); }
  };
  // Quick create: auto-fill name (custom or random) and advance
  if (quickCreateMode) {
    document.getElementById('cgNameInput').value = quickCreateName || getRandomGameName();
    setTimeout(() => document.getElementById('cgNameNext').click(), 400);
  }
}

// Returns per-stat delta map for inline display (flat bonuses only).
// Effects that depend on final stat comparison (lowest/highest, Giant) stay in applySubraceEffects.
function getSubraceStatDeltas() {
  const race    = cgState.race?.id || '';
  const srLabel = cgState.subrace?.label || '';
  const d = {};
  const all = (v) => ['strength','speed','durability','iq','battleiq','ma'].forEach(k => { d[k] = (d[k]||0) + v; });
  if (race === 'goblin') {
    if (srLabel === '×1' || srLabel === '×50')  all(-1);
    else if (srLabel === '×1,000')              { d.strength = (d.strength||0)+1; }
    else if (srLabel === '×5,000')              { d.strength = (d.strength||0)+1; d.speed = (d.speed||0)+1; }
    else if (srLabel === '×10,000')             { d.strength = (d.strength||0)+2; d.speed = (d.speed||0)+2; }
    else if (srLabel === '×100,000')            all(1);
  }
  if (race === 'troll'  && srLabel === 'Mountain Troll') d.durability = (d.durability||0)+3;
  if (race === 'dragon') {
    if      (srLabel === 'Crimson')  { d.iq = (d.iq||0)+2; d.durability = (d.durability||0)+1; }
    else if (srLabel === 'Stone')    { d.durability = (d.durability||0)+2; }
    else if (srLabel === 'Tideborn') { d.strength = (d.strength||0)+3; }
    else if (srLabel === 'Amethyst') all(-1);
  }
  if (race === 'primordial' && srLabel === 'Earth') {
    d.durability = (d.durability||0)+1; d.strength = (d.strength||0)+1;
  }
  if (race === 'angel') {
    if      (srLabel === 'Archangels') { d.speed = (d.speed||0)+2; d.ma = (d.ma||0)+1; }
    else if (srLabel === 'Powers')     { d.ma = (d.ma||0)+1; }
    else if (srLabel === 'Ophanim')    all(1);
    else if (srLabel === 'Cherubim')   all(2);
  }
  if (race === 'demon') {
    if      (srLabel === 'Lucifer')   all(2);
    else if (srLabel === 'Mammon')    all(-2);
    else if (srLabel === 'Asmodeus')  all(-1);
    else if (srLabel === 'Belphegor') d.speed = (d.speed||0) - 4;
  }
  return d;
}

// Returns extra skill count bonus (added to skillCount spin result inline).
function getSubraceSkillBonus() {
  const race    = cgState.race?.id || '';
  const srLabel = cgState.subrace?.label || '';
  if (race === 'dragon'    && srLabel === 'Flame')      return 1;
  if (race === 'dragon'    && srLabel === 'Amethyst')   return 4;
  if (race === 'primordial'&& srLabel === 'Fire')       return 1;
  if (race === 'angel'     && srLabel === 'Powers')     return 1;
  if (race === 'angel'     && srLabel === 'Dominions')  return 3;
  return 0;
}

// mysteryOpts: { category: string, keys: string[] } — optional, enables fog-of-war on this wheel
function cgRenderSpin(box, title, items, onResult, currentStats, resultPrefix, resultTransform, mysteryOpts) {
  const hasStats = currentStats && Object.values(currentStats).some(v => v !== null);
  const statsHtml = hasStats ? `<div class="cg-stats-grid">${STAT_DISPLAY.map(sd => {
    const v = currentStats[sd.key];
    const statStep = {strength:'str',speed:'spd',durability:'dur',iq:'iq',battleiq:'biq',ma:'ma'};
    const isActive = cgState.step === statStep[sd.key];
    return `<div class="cg-sc ${isActive?'cg-active':v?'cg-done':''}">
      <div class="cg-sc-lbl">${sd.emoji} ${sd.label}</div>
      <div class="cg-sc-val ${v?'':' cg-pending'}">${v ?? '—'}</div>
    </div>`;
  }).join('')}</div>` : '';

  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label">${title}</div>
      ${statsHtml}
      <div class="spin-wrap">
        <canvas id="spinCanvas" width="360" height="360"></canvas>
        <div class="spin-ptr"></div>
      </div>
      <div id="cgResultBox"></div>
      <div class="cg-nav">
        <button class="spin-btn" id="cgSpinBtn">${t('chargen_spin_btn')}</button>
      </div>
      ${cgState.race ? `<div class="cg-trait">${cgState.race.emoji} <b>${cgState.race.name}</b>${cgState.race.trait ? ' — '+cgState.race.trait : ''}</div>` : ''}
    </div>`;

  // Mystery opts: skip in quickCreateMode (no animation delay needed)
  const wheelOpts = (!quickCreateMode && mysteryOpts)
    ? { mysteryCategory: mysteryOpts.category, mysteryKeys: mysteryOpts.keys }
    : {};
  const wheel = new SpinWheel(document.getElementById('spinCanvas'), items, wheelOpts);
  let lastWinIdx = -1;
  const doSpin = () => {
    const btn = document.getElementById('cgSpinBtn');
    btn.disabled = true;
    wheel.spin((winner, idx) => {
      lastWinIdx = idx;
      const displayLabel = resultTransform ? resultTransform(winner, idx) : winner.label;
      document.getElementById('cgResultBox').innerHTML = `<div class="cg-result-box">${resultPrefix ? `<span style="opacity:0.65;font-size:0.75em">${resultPrefix}: </span>` : ''}${displayLabel}</div>`;
      playTone(660, 'sine', 0.4, 0.15, 0.5);
      // Morph Spin button → Next button
      btn.textContent = t('chargen_btn_next');
      btn.className = 'cg-btn primary';
      btn.disabled = false;
      let _spinAdvanced = false;
      const doAdvance = () => {
        if (_spinAdvanced) return;
        _spinAdvanced = true;
        try { onResult(items[lastWinIdx], lastWinIdx); }
        catch(e) { console.error('[CG] spin advance error:', e); _spinAdvanced = false; }
      };
      btn.onclick = doAdvance;
      if (quickCreateMode) setTimeout(doAdvance, 600);
    });
  };
  document.getElementById('cgSpinBtn').onclick = doSpin;
  if (quickCreateMode) setTimeout(doSpin, 300);
}

function cgRenderSkillPick(box) {
  const total    = cgState.skillCount;
  const picked   = cgState.skills;
  const pickedIds = new Set(picked.map(s => s.id));
  // Universal skills + skills matching this weapon + unique skills if in draft mode and available
  const charWeapon = cgState.weapon || null;
  // For unique weapons, use their baseWeapon for skill pool matching
  const effectiveWeapon = (charWeapon && WEAPON_MAP[charWeapon]?.baseWeapon) || charWeapon;
  const available = SKILL_DEFS.filter(s => {
    if (pickedIds.has(s.id)) return false;
    if (s.weapon && s.weapon !== effectiveWeapon) return false;
    if (s.unique) return cgDraftMode && isUniqueAvailable(s.id);
    return true;
  });
  const spinNum  = picked.length + 1;

  const pickedHtml = picked.length > 0
    ? `<div class="cg-skills-picked">${picked.map(s =>
        `<span class="cg-skill-tag" title="${s.desc}">${getSkillName(s)}</span>`
      ).join('')}</div>`
    : '';

  const items = available.map((s, i) => ({
    label: getSkillName(s),
    weight: s.weight ?? 1,  // dùng weight từ SKILL_DEFS nếu có, fallback về 1
    color: wColor(i),
  }));

  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label">${t('chargen_skill_of_total').replace('{n}', spinNum).replace('{total}', total)}</div>
      ${pickedHtml}
      <div class="spin-wrap">
        <canvas id="spinCanvas" width="360" height="360"></canvas>
        <div class="spin-ptr"></div>
      </div>
      <div id="cgResultBox"></div>
      <div class="cg-nav">
        <button class="spin-btn" id="cgSpinBtn">${t('chargen_spin_btn')}</button>
      </div>
      ${cgState.race ? `<div class="cg-trait">${cgState.race.emoji} <b>${cgState.race.name}</b></div>` : ''}
    </div>`;

  const skillWheelOpts = !quickCreateMode
    ? { mysteryCategory: 'skill', mysteryKeys: available.map(s => s.id) }
    : {};
  const wheel = new SpinWheel(document.getElementById('spinCanvas'), items, skillWheelOpts);
  let pickedSkill = null;

  const doSpin = () => {
    const btn = document.getElementById('cgSpinBtn');
    btn.disabled = true;
    wheel.spin((winner, idx) => {
      pickedSkill = available[idx];
      document.getElementById('cgResultBox').innerHTML =
        `<div class="cg-result-box">${winner.label}<br><span style="color:#888;font-size:12px">${pickedSkill.desc}</span></div>`;
      playTone(660, 'sine', 0.4, 0.15, 0.5);
      // Morph Spin button → Next/Done button
      btn.textContent = spinNum < total ? t('chargen_btn_next_skill') : t('chargen_btn_done');
      btn.className = 'cg-btn primary';
      btn.disabled = false;
      let _skillAdvanced = false;
      const doSkillAdvance = () => {
        if (_skillAdvanced) return;
        _skillAdvanced = true;
        try {
          if (!pickedSkill) { _skillAdvanced = false; return; }
          if (cgDraftMode && pickedSkill.unique) claimUnique(pickedSkill.id);
          cgState.skills.push(pickedSkill);
          if (cgState.skills.length >= total) { advanceCg(); }
          else { renderCgStep(); cgUpdatePreview(); }
        } catch(e) { console.error('[CG] skill advance error:', e); _skillAdvanced = false; }
      };
      btn.onclick = doSkillAdvance;
      if (quickCreateMode) setTimeout(doSkillAdvance, 600);
    });
  };

  document.getElementById('cgSpinBtn').onclick = doSpin;
  if (quickCreateMode) setTimeout(doSpin, 300);

  // Debug: pick any available skill directly
  _cgDebug(box, `Pick Skill ${spinNum}/${total}`, available.map(sk => ({
    label: getSkillName(sk),
    onClick: () => {
      if (cgDraftMode && sk.unique) claimUnique(sk.id);
      cgState.skills.push(sk);
      if (cgState.skills.length >= total) { advanceCg(); }
      else { renderCgStep(); cgUpdatePreview(); }
    }
  })));
}

// All subrace effects are now applied inline during chargen spins.
// Giant → IQ step, Dragon Flame / Primordial Air/Water → MA step.
function applySubraceEffects(_cgState) { /* no-op */ }

function cgRenderDone(box) {
  // On the done step, expand the preview panel to be the main info display
  const layout = document.querySelector('.cg-layout');
  if (layout) layout.classList.add('cg-layout-done');

  box.innerHTML = `
    <div class="cg-card cg-done-action-card">
      <div class="cg-done-banner">
        <span class="cg-done-check">✅</span>
        <span class="cg-done-title">${t('chargen_done_banner')}</span>
      </div>
      <div class="cg-nav">
        <button class="cg-btn" id="cgRestart">${t('chargen_btn_restart')}</button>
        <button class="cg-btn primary" id="cgSave">${cgDraftMode ? t('chargen_btn_add_draft') : t('chargen_btn_add_roster')}</button>
      </div>
    </div>`;
  document.getElementById('cgRestart').onclick = () => initChargen();
  const saveChar = () => {
    document.querySelector('.cg-layout')?.classList.remove('cg-layout-done');
    const char = {
      id: Date.now() + Math.random(),
      name: cgState.name, race: cgState.race.id, raceName: cgState.race.name,
      raceEmoji: cgState.race.emoji, subrace: cgState.subrace,
      stats: { ...cgState.stats }, weapon: cgState.weapon,
      color: generateRadoserColor(cgDraftMode
        ? (state.championship?.draftRoster?.length ?? 0)
        : cgRoster.length),
      skills:   (cgState.skills || []).map(s => s.id),
      charDevs: [...(cgState.charDevs || [])],
    };
    // Finality (championship only): mark race as extinct
    if (cgDraftMode && char.charDevs.includes('finality') && typeof CG_RACES !== 'undefined') {
      const raceEntry = CG_RACES.find(r => r.id === char.race);
      if (raceEntry) raceEntry.weight = 0;
    }
    quickCreateMode = false;
    if (cgDraftMode) {
      // Tag with championship identity
      char.championshipTag  = state.championship?.tag  ?? null;
      char.championshipName = state.championship?.name ?? null;
      // Copy to global roster (persists with tag badge)
      cgRoster.push(char);
      localStorage.setItem('cgRoster', JSON.stringify(cgRoster));
      cgDraftMode = false;
      onDraftPlayerCreated(char);
    } else {
      cgRoster.push(char);
      localStorage.setItem('cgRoster', JSON.stringify(cgRoster));
      showScreen('menu'); buildFightersPanel(); renderRoster(); renderHeroShowcase();
    }
  };
  document.getElementById('cgSave').onclick = saveChar;
  // Quick create: auto-save
  if (quickCreateMode) setTimeout(saveChar, 800);
}


// ============================================================
// CHARDEV STEP — spin wheel sau skillpick
// ============================================================
function cgRenderCharDev(box) {
  if (typeof CHARDEV_POOL === 'undefined') { advanceCg(); return; }

  const spinNum   = (cgState.charDevs?.length ?? 0) + 1;
  const spinTotal = (cgState.charDevs?.length ?? 0) + (cgState.charDevRemaining ?? 1);

  const items = CHARDEV_POOL.map(cd => ({
    label:  cd.label,
    weight: cd.weight,
    color:  cd.color,
  }));

  // Show previously received char devs
  const pickedHtml = cgState.charDevs?.length > 0
    ? `<div class="cg-skills-picked">${cgState.charDevs.map(id => {
        const cd = CHARDEV_POOL.find(c => c.id === id) || { icon: '?', label: id };
        return `<span class="cg-skill-tag">${cd.icon} ${cd.label}</span>`;
      }).join('')}</div>`
    : '';

  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label">🌀 Character Development${spinTotal > 1 ? ` (${spinNum} / ${spinTotal})` : ''}</div>
      ${pickedHtml}
      <div class="spin-wrap">
        <canvas id="spinCanvas" width="360" height="360"></canvas>
        <div class="spin-ptr"></div>
      </div>
      <div id="cgResultBox"></div>
      <div class="cg-nav">
        <button class="spin-btn" id="cgSpinBtn">${t('chargen_spin_btn')}</button>
      </div>
    </div>`;

  const wheelOpts = !quickCreateMode
    ? { mysteryCategory: 'chardev', mysteryKeys: CHARDEV_POOL.map(cd => cd.id) }
    : {};
  const wheel = new SpinWheel(document.getElementById('spinCanvas'), items, wheelOpts);

  const _doCharDevAdvance = (picked) => {
    // Apply to cgState
    const result = applyCharDevToCgState(picked.id, cgState);
    if (!cgState.charDevs) cgState.charDevs = [];
    cgState.charDevs.push(picked.id);
    cgState.charDevRemaining = Math.max(0, (cgState.charDevRemaining ?? 1) - 1);
    if (result.extraDevs)   cgState.charDevRemaining   += result.extraDevs;
    if (result.extraSkills) cgState.charDevExtraSkills  = (cgState.charDevExtraSkills || 0) + result.extraSkills;
    cgUpdatePreview();

    // Show result card
    const resEl = document.getElementById('cgResultBox');
    if (resEl) resEl.innerHTML =
      `<div class="cg-result-box">
        ${picked.icon} <b>${picked.label}</b>
        <br><span style="color:#aaa;font-size:12px">${picked.desc}</span>
      </div>`;

    playTone(660, 'sine', 0.4, 0.15, 0.5);

    // Isekai
    if (result.isekai) {
      const btn = document.getElementById('cgSpinBtn');
      if (btn) {
        btn.textContent = '🌀 Isekai!';
        btn.className   = 'cg-btn primary';
        btn.disabled    = false;
        let _adv = false;
        btn.onclick = () => { if (_adv) return; _adv = true; _doIsekai(); };
        if (quickCreateMode) setTimeout(() => { if (!_adv) { _adv = true; _doIsekai(); } }, 700);
      }
      return;
    }

    // One Piece sub-wheel
    if (result.onepiecePick) {
      const moreDevsOp   = cgState.charDevRemaining > 0;
      const moreSkillsOp = (cgState.charDevExtraSkills || 0) > 0;
      const btnOp = document.getElementById('cgSpinBtn');
      if (btnOp) {
        btnOp.textContent = '🏴‍☠️ Spin One Piece Wheel';
        btnOp.className   = 'cg-btn primary';
        btnOp.disabled    = false;
        let _opAdv = false;
        const _openOp = () => {
          if (_opAdv) return; _opAdv = true;
          _cgShowOpSubWheel(box, () => {
            if (moreDevsOp) { renderCgStep(); cgUpdatePreview(); }
            else if (moreSkillsOp) {
              cgState.skillCount += cgState.charDevExtraSkills;
              cgState.charDevExtraSkills = 0;
              cgState.step = 'skillpick';
              renderCgStep(); cgUpdatePreview();
            } else { advanceCg(); }
          });
        };
        btnOp.onclick = _openOp;
        if (quickCreateMode) setTimeout(_openOp, 700);
      }
      return;
    }

    // JoJo sub-wheel
    if (result.jojoPick) {
      const moreDevsJojo   = cgState.charDevRemaining > 0;
      const moreSkillsJojo = (cgState.charDevExtraSkills || 0) > 0;
      const btnJojo = document.getElementById('cgSpinBtn');
      if (btnJojo) {
        btnJojo.textContent = '🎭 Spin JoJo Wheel';
        btnJojo.className   = 'cg-btn primary';
        btnJojo.disabled    = false;
        let _jojoAdv = false;
        const _openJojo = () => {
          if (_jojoAdv) return; _jojoAdv = true;
          _cgShowJojoSubWheel(box, () => {
            if (moreDevsJojo) { renderCgStep(); cgUpdatePreview(); }
            else if (moreSkillsJojo) {
              cgState.skillCount += cgState.charDevExtraSkills;
              cgState.charDevExtraSkills = 0;
              cgState.step = 'skillpick';
              renderCgStep(); cgUpdatePreview();
            } else { advanceCg(); }
          });
        };
        btnJojo.onclick = _openJojo;
        if (quickCreateMode) setTimeout(_openJojo, 700);
      }
      return;
    }

    // JJK sub-wheel
    if (result.jjkPick) {
      const moreDevsJjk   = cgState.charDevRemaining > 0;
      const moreSkillsJjk = (cgState.charDevExtraSkills || 0) > 0;
      const btnJjk = document.getElementById('cgSpinBtn');
      if (btnJjk) {
        btnJjk.textContent = '👁️ Spin JJK Wheel';
        btnJjk.className   = 'cg-btn primary';
        btnJjk.disabled    = false;
        let _jjkAdv = false;
        const _openJjk = () => {
          if (_jjkAdv) return; _jjkAdv = true;
          _cgShowJjkSubWheel(box, () => {
            if (moreDevsJjk) { renderCgStep(); cgUpdatePreview(); }
            else if (moreSkillsJjk) {
              cgState.skillCount += cgState.charDevExtraSkills;
              cgState.charDevExtraSkills = 0;
              cgState.step = 'skillpick';
              renderCgStep(); cgUpdatePreview();
            } else { advanceCg(); }
          });
        };
        btnJjk.onclick = _openJjk;
        if (quickCreateMode) setTimeout(_openJjk, 700);
      }
      return;
    }

    // Summoner sub-wheel
    if (result.summonerPick) {
      const moreDevsSm   = cgState.charDevRemaining > 0;
      const moreSkillsSm = (cgState.charDevExtraSkills || 0) > 0;
      const btnSm = document.getElementById('cgSpinBtn');
      if (btnSm) {
        btnSm.textContent = '🧿 Spin Summoner Wheel';
        btnSm.className   = 'cg-btn primary';
        btnSm.disabled    = false;
        let _smAdv = false;
        const _openSm = () => {
          if (_smAdv) return; _smAdv = true;
          _cgShowSummonerSubWheel(box, () => {
            if (moreDevsSm) { renderCgStep(); cgUpdatePreview(); }
            else if (moreSkillsSm) {
              cgState.skillCount += cgState.charDevExtraSkills;
              cgState.charDevExtraSkills = 0;
              cgState.step = 'skillpick';
              renderCgStep(); cgUpdatePreview();
            } else { advanceCg(); }
          });
        };
        btnSm.onclick = _openSm;
        if (quickCreateMode) setTimeout(_openSm, 700);
      }
      return;
    }

    // Determine next action
    const moreDevs   = cgState.charDevRemaining > 0;
    const moreSkills = (cgState.charDevExtraSkills || 0) > 0;
    const btn = document.getElementById('cgSpinBtn');
    if (!btn) return;
    btn.className = 'cg-btn primary';
    btn.disabled  = false;
    let _adv = false;

    if (moreDevs) {
      btn.textContent = `🎲 Next Dev (${cgState.charDevRemaining} remaining)`;
      btn.onclick = () => { if (_adv) return; _adv = true; renderCgStep(); cgUpdatePreview(); };
      if (quickCreateMode) setTimeout(() => { if (!_adv) { _adv = true; renderCgStep(); cgUpdatePreview(); } }, 700);
    } else if (moreSkills) {
      const n = cgState.charDevExtraSkills;
      btn.textContent = `✨ Pick ${n} More Skill${n > 1 ? 's' : ''}`;
      btn.onclick = () => {
        if (_adv) return; _adv = true;
        cgState.skillCount += cgState.charDevExtraSkills;
        cgState.charDevExtraSkills = 0;
        cgState.step = 'skillpick';
        renderCgStep(); cgUpdatePreview();
      };
      if (quickCreateMode) setTimeout(() => {
        if (_adv) return; _adv = true;
        cgState.skillCount += cgState.charDevExtraSkills;
        cgState.charDevExtraSkills = 0;
        cgState.step = 'skillpick';
        renderCgStep(); cgUpdatePreview();
      }, 700);
    } else {
      btn.textContent = t('chargen_btn_next');
      btn.onclick = () => { if (_adv) return; _adv = true; advanceCg(); };
      if (quickCreateMode) setTimeout(() => { if (!_adv) { _adv = true; advanceCg(); } }, 700);
    }
  };

  const doSpin = () => {
    const btn = document.getElementById('cgSpinBtn');
    if (btn) btn.disabled = true;
    wheel.spin((_winner, idx) => _doCharDevAdvance(CHARDEV_POOL[idx]));
  };

  document.getElementById('cgSpinBtn').onclick = doSpin;
  if (quickCreateMode) setTimeout(doSpin, 300);

  // Debug quick-pick
  _cgDebug(box, 'Char Dev', CHARDEV_POOL.map(cd => ({
    label: `${cd.icon} ${cd.label}`,
    onClick: () => _doCharDevAdvance(cd),
  })));
}

// ─── _cgShowJjkSubWheel ──────────────────────────────────────
// Hiện vòng quay JJK thứ cấp sau khi chardev 'jjk' được roll.
// onDone() được gọi sau khi user chọn xong 1 JJK skill.
function _cgShowJjkSubWheel(box, onDone) {
  const JJK_IDS = [
    'jjk_domain_malevolent', 'jjk_domain_unlimited', 'jjk_domain_chimera',
    'jjk_ct_command', 'jjk_ct_blackflash', 'jjk_ct_swap', 'jjk_ct_blood',
  ];
  // Lọc domain unique đã bị claim (championship mode)
  const available = JJK_IDS.filter(id => {
    const def = typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === id) : null;
    if (!def) return false;
    if (def.category === 'jjk_domain' && cgDraftMode) {
      return typeof isUniqueAvailable === 'function' ? isUniqueAvailable(id) : true;
    }
    return true;
  });

  if (available.length === 0) { onDone(); return; }

  const items = available.map(id => {
    const def = (typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === id) : null) || { name: id, icon: '?' };
    return { label: `${def.icon} ${def.name}`, weight: 1, color: '#1a0033' };
  });

  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label">👁️ JJK — Domain / Curse Technique</div>
      <div style="color:#aaa;font-size:12px;margin-bottom:8px;">Chọn 1 skill từ hệ thống JJK (Domain là unique)</div>
      <div class="spin-wrap">
        <canvas id="spinCanvas" width="360" height="360"></canvas>
        <div class="spin-ptr"></div>
      </div>
      <div id="cgResultBox"></div>
      <div class="cg-nav">
        <button class="spin-btn" id="cgSpinBtn">${t('chargen_spin_btn')}</button>
      </div>
    </div>`;

  const wheelOpts = !quickCreateMode
    ? { mysteryCategory: 'skill', mysteryKeys: available }
    : {};
  const wheel = new SpinWheel(document.getElementById('spinCanvas'), items, wheelOpts);

  const _onPick = (idx) => {
    const pickedId = available[idx];
    const def = typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === pickedId) : null;
    if (def) {
      cgState.skills = cgState.skills || [];
      if (!cgState.skills.find(s => s.id === def.id)) cgState.skills.push(def);
      // Claim unique domain (championship)
      if (def.category === 'jjk_domain' && cgDraftMode && typeof claimUniqueItem === 'function')
        claimUniqueItem(pickedId);
      // Kính Kình: đổi sang fists + +1 MA
      if (pickedId === 'jjk_ct_blackflash' && cgState.weapon !== 'fists') {
        cgState.weapon   = 'fists';
        cgState.hasWeapon = false;
        if (cgState.stats) cgState.stats.ma = (cgState.stats.ma || 0) + 1;
      }
    }
    const resEl = document.getElementById('cgResultBox');
    if (resEl && def) resEl.innerHTML = `<div class="cg-result-box">${def.icon} <b>${def.name}</b><br><span style="color:#aaa;font-size:12px">${def.desc}</span></div>`;
    playTone(660, 'sine', 0.4, 0.15, 0.5);
    cgUpdatePreview();

    const btn = document.getElementById('cgSpinBtn');
    if (btn) {
      btn.textContent = t('chargen_btn_next');
      btn.className   = 'cg-btn primary';
      btn.disabled    = false;
      let _adv = false;
      btn.onclick = () => { if (_adv) return; _adv = true; onDone(); };
      if (quickCreateMode) setTimeout(() => { if (!_adv) { _adv = true; onDone(); } }, 700);
    }
  };

  const doSpin = () => {
    document.getElementById('cgSpinBtn').disabled = true;
    wheel.spin((_w, idx) => _onPick(idx));
  };
  document.getElementById('cgSpinBtn').onclick = doSpin;
  if (quickCreateMode) setTimeout(doSpin, 300);

  // Debug quick-pick
  _cgDebug(box, 'JJK Skill', available.map((id, i) => {
    const def = (typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === id) : null) || { icon: '?', name: id };
    return { label: `${def.icon} ${def.name}`, onClick: () => _onPick(i) };
  }));
}

// ─── _cgShowJojoSubWheel ─────────────────────────────────────
// Hiện vòng quay JoJo thứ cấp sau khi chardev 'jojo' được roll.
// 4 Stand (unique) + 3 Support (không unique). onDone() sau khi chọn xong.
function _cgShowJojoSubWheel(box, onDone) {
  const JOJO_STAND_IDS   = ['jojo_stand_star','jojo_stand_world','jojo_stand_kq','jojo_stand_ge'];
  const JOJO_SUPPORT_IDS = ['jojo_support_remote','jojo_support_senses','jojo_support_evolution'];
  const ALL_IDS = [...JOJO_STAND_IDS, ...JOJO_SUPPORT_IDS];

  // Lọc stands unique đã claim (championship)
  const available = ALL_IDS.filter(id => {
    const def = typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === id) : null;
    if (!def) return false;
    if (def.category === 'jojo_stand' && cgDraftMode) {
      return typeof isUniqueAvailable === 'function' ? isUniqueAvailable(id) : true;
    }
    return true;
  });

  if (available.length === 0) { onDone(); return; }

  const STAND_COLOR = '#331a00';
  const items = available.map(id => {
    const def = (typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === id) : null) || { name: id, icon: '?' };
    const isSupport = JOJO_SUPPORT_IDS.includes(id);
    return { label: `${def.icon} ${def.name}`, weight: 1, color: isSupport ? '#2a1a00' : STAND_COLOR };
  });

  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label">🎭 JoJo — Stand / Support</div>
      <div style="color:#aaa;font-size:12px;margin-bottom:8px;">Chọn 1 skill từ hệ thống JoJo (Stand là unique)</div>
      <div class="spin-wrap">
        <canvas id="spinCanvas" width="360" height="360"></canvas>
        <div class="spin-ptr"></div>
      </div>
      <div id="cgResultBox"></div>
      <div class="cg-nav">
        <button class="spin-btn" id="cgSpinBtn">${t('chargen_spin_btn')}</button>
      </div>
    </div>`;

  const wheelOpts = !quickCreateMode
    ? { mysteryCategory: 'skill', mysteryKeys: available }
    : {};
  const wheel = new SpinWheel(document.getElementById('spinCanvas'), items, wheelOpts);

  const _onPick = (idx) => {
    const pickedId = available[idx];
    const def = typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === pickedId) : null;
    if (def) {
      cgState.skills = cgState.skills || [];
      if (!cgState.skills.find(s => s.id === def.id)) cgState.skills.push(def);
      // Claim unique stand (championship)
      if (def.category === 'jojo_stand' && cgDraftMode && typeof claimUniqueItem === 'function')
        claimUniqueItem(pickedId);
    }
    const resEl = document.getElementById('cgResultBox');
    if (resEl && def) resEl.innerHTML = `<div class="cg-result-box">${def.icon} <b>${def.name}</b><br><span style="color:#aaa;font-size:12px">${def.desc}</span></div>`;
    playTone(660, 'sine', 0.4, 0.15, 0.5);
    cgUpdatePreview();

    const btn = document.getElementById('cgSpinBtn');
    if (btn) {
      btn.textContent = t('chargen_btn_next');
      btn.className   = 'cg-btn primary';
      btn.disabled    = false;
      let _adv = false;
      btn.onclick = () => { if (_adv) return; _adv = true; onDone(); };
      if (quickCreateMode) setTimeout(() => { if (!_adv) { _adv = true; onDone(); } }, 700);
    }
  };

  const doSpin = () => {
    document.getElementById('cgSpinBtn').disabled = true;
    wheel.spin((_w, idx) => _onPick(idx));
  };
  document.getElementById('cgSpinBtn').onclick = doSpin;
  if (quickCreateMode) setTimeout(doSpin, 300);

  // Debug quick-pick
  _cgDebug(box, 'JoJo Skill', available.map((id, i) => {
    const def = (typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === id) : null) || { icon: '?', name: id };
    return { label: `${def.icon} ${def.name}`, onClick: () => _onPick(i) };
  }));
}

// ─── _cgShowOpSubWheel ───────────────────────────────────────
// Hiện vòng quay One Piece thứ cấp sau khi chardev 'onepiece' được roll.
// 3 Haki (không unique) + 7 Trái Ác Quỷ (unique). onDone() sau khi chọn xong.
function _cgShowOpSubWheel(box, onDone) {
  const OP_HAKI_IDS  = ['op_haki_obs', 'op_haki_arm', 'op_haki_conq'];
  const OP_FRUIT_IDS = ['op_fruit_goro','op_fruit_tori','op_fruit_mera','op_fruit_ryu',
                         'op_fruit_hito','op_fruit_neko','op_fruit_pika'];
  const ALL_IDS = [...OP_HAKI_IDS, ...OP_FRUIT_IDS];

  // Lọc fruits unique đã claim (championship)
  const available = ALL_IDS.filter(id => {
    const def = typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === id) : null;
    if (!def) return false;
    if (def.category === 'op_fruit' && cgDraftMode) {
      return typeof isUniqueAvailable === 'function' ? isUniqueAvailable(id) : true;
    }
    return true;
  });

  if (available.length === 0) { onDone(); return; }

  const HAKI_COLOR  = '#001a33';
  const FRUIT_COLOR = '#003366';
  const items = available.map(id => {
    const def = (typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === id) : null) || { name: id, icon: '?' };
    const isFruit = OP_FRUIT_IDS.includes(id);
    return { label: `${def.icon} ${def.name}`, weight: 1, color: isFruit ? FRUIT_COLOR : HAKI_COLOR };
  });

  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label">🏴‍☠️ One Piece — Haki / Trái Ác Quỷ</div>
      <div style="color:#aaa;font-size:12px;margin-bottom:8px;">Chọn 1 skill (Trái Ác Quỷ là unique)</div>
      <div class="spin-wrap">
        <canvas id="spinCanvas" width="360" height="360"></canvas>
        <div class="spin-ptr"></div>
      </div>
      <div id="cgResultBox"></div>
      <div class="cg-nav">
        <button class="spin-btn" id="cgSpinBtn">${t('chargen_spin_btn')}</button>
      </div>
    </div>`;

  const wheelOpts = !quickCreateMode
    ? { mysteryCategory: 'skill', mysteryKeys: available }
    : {};
  const wheel = new SpinWheel(document.getElementById('spinCanvas'), items, wheelOpts);

  const _onPick = (idx) => {
    const pickedId = available[idx];
    const def = typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === pickedId) : null;
    if (def) {
      cgState.skills = cgState.skills || [];
      if (!cgState.skills.find(s => s.id === def.id)) cgState.skills.push(def);
      // Claim unique fruit (championship)
      if (def.category === 'op_fruit' && cgDraftMode && typeof claimUniqueItem === 'function')
        claimUniqueItem(pickedId);
    }
    const resEl = document.getElementById('cgResultBox');
    if (resEl && def) resEl.innerHTML = `<div class="cg-result-box">${def.icon} <b>${def.name}</b><br><span style="color:#aaa;font-size:12px">${def.desc}</span></div>`;
    playTone(660, 'sine', 0.4, 0.15, 0.5);
    cgUpdatePreview();

    const btn = document.getElementById('cgSpinBtn');
    if (btn) {
      btn.textContent = t('chargen_btn_next');
      btn.className   = 'cg-btn primary';
      btn.disabled    = false;
      let _adv = false;
      btn.onclick = () => { if (_adv) return; _adv = true; onDone(); };
      if (quickCreateMode) setTimeout(() => { if (!_adv) { _adv = true; onDone(); } }, 700);
    }
  };

  const doSpin = () => {
    document.getElementById('cgSpinBtn').disabled = true;
    wheel.spin((_w, idx) => _onPick(idx));
  };
  document.getElementById('cgSpinBtn').onclick = doSpin;
  if (quickCreateMode) setTimeout(doSpin, 300);

  // Debug quick-pick
  _cgDebug(box, 'One Piece Skill', available.map((id, i) => {
    const def = (typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === id) : null) || { icon: '?', name: id };
    return { label: `${def.icon} ${def.name}`, onClick: () => _onPick(i) };
  }));
}

// ─── _cgShowSummonerSubWheel ──────────────────────────────────
// Hiện vòng quay Summoner thứ cấp sau khi chardev 'summoner' được roll.
// 3 skill triệu hồi: Necromancer's Pact, Horde Call, Mirror Clone.
function _cgShowSummonerSubWheel(box, onDone) {
  // Tự động lấy tất cả skill có category: 'summon' — không cần hardcode IDs
  const available = (typeof SKILL_DEFS !== 'undefined'
    ? SKILL_DEFS.filter(s => s.category === 'summon').map(s => s.id)
    : []);

  if (available.length === 0) { onDone(); return; }

  const SUMMON_COLOR = '#2e1a4a';
  const items = available.map(id => {
    const def = (typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === id) : null) || { name: id, icon: '🧿' };
    return { label: `${def.icon} ${def.name}`, weight: 1, color: SUMMON_COLOR };
  });

  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label">🧿 Summoner — Chọn Skill Triệu Hồi</div>
      <div style="color:#aaa;font-size:12px;margin-bottom:8px;">Summons của bạn sẽ có 20 HP và tồn tại lâu hơn ×1.5 — nhưng bản thân −30% sát thương</div>
      <div class="spin-wrap">
        <canvas id="spinCanvas" width="360" height="360"></canvas>
        <div class="spin-ptr"></div>
      </div>
      <div id="cgResultBox"></div>
      <div class="cg-nav">
        <button class="spin-btn" id="cgSpinBtn">${t('chargen_spin_btn')}</button>
      </div>
    </div>`;

  const wheelOpts = !quickCreateMode
    ? { mysteryCategory: 'skill', mysteryKeys: available }
    : {};
  const wheel = new SpinWheel(document.getElementById('spinCanvas'), items, wheelOpts);

  const _onPick = (idx) => {
    const pickedId = available[idx];
    const def = typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === pickedId) : null;
    if (def) {
      cgState.skills = cgState.skills || [];
      if (!cgState.skills.find(s => s.id === def.id)) cgState.skills.push(def);
    }
    const resEl = document.getElementById('cgResultBox');
    if (resEl && def) resEl.innerHTML = `<div class="cg-result-box">${def.icon} <b>${def.name}</b><br><span style="color:#aaa;font-size:12px">${def.desc}</span></div>`;
    playTone(660, 'sine', 0.4, 0.15, 0.5);
    cgUpdatePreview();

    const btn = document.getElementById('cgSpinBtn');
    if (btn) {
      btn.textContent = t('chargen_btn_next');
      btn.className   = 'cg-btn primary';
      btn.disabled    = false;
      let _adv = false;
      btn.onclick = () => { if (_adv) return; _adv = true; onDone(); };
      if (quickCreateMode) setTimeout(() => { if (!_adv) { _adv = true; onDone(); } }, 700);
    }
  };

  const doSpin = () => {
    document.getElementById('cgSpinBtn').disabled = true;
    wheel.spin((_w, idx) => _onPick(idx));
  };
  document.getElementById('cgSpinBtn').onclick = doSpin;
  if (quickCreateMode) setTimeout(doSpin, 300);

  // Debug quick-pick
  _cgDebug(box, 'Summon Skill', available.map((id, i) => {
    const def = (typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === id) : null) || { icon: '🧿', name: id };
    return { label: `${def.icon} ${def.name}`, onClick: () => _onPick(i) };
  }));
}

// ============================================================
// DEBUG RADOSER — instant creation without spin wheels
// ============================================================
const DBG_STATS = [
  { key:'strength',    label:'STR' },
  { key:'speed',       label:'SPD' },
  { key:'durability',  label:'DUR' },
  { key:'iq',          label:'IQ'  },
  { key:'battleiq',    label:'BIQ' },
  { key:'ma',          label:'MA'  },
];

function openDebugRadoser() {
  const modal = document.getElementById('debug-radoser-modal');
  if (!modal) return;

  // Populate race dropdown
  const raceEl = document.getElementById('dbg-race');
  raceEl.innerHTML = CG_RACES.map(r => `<option value="${r.id}">${r.emoji} ${r.name}</option>`).join('');
  dbgUpdateSubrace();

  // Populate stat inputs
  const statsEl = document.getElementById('dbg-stats');
  statsEl.innerHTML = DBG_STATS.map(s => `
    <div style="display:flex;flex-direction:column;gap:3px;">
      <label style="font-size:11px;color:#888;text-align:center;">${s.label}</label>
      <input id="dbg-stat-${s.key}" type="number" min="1" max="10" value="5"
        style="background:#1a1030;border:1px solid #444;border-radius:6px;color:#fff;
               padding:5px;font-size:14px;text-align:center;width:100%;">
    </div>`).join('');

  // Populate weapon dropdown
  const weaponEl = document.getElementById('dbg-weapon');
  const uniqueWeapons = WEAPON_DEFS.filter(w => w.unique).map(w => ({
    id: w.id, label: `${w.icon} ${w.name} [UNIQUE]`,
  }));
  const allWeapons = [
    ...CG_WEAPONS_ARMED,
    { id:'fists',  label:'✊ Fists (Unarmed)' },
    { id:'rapier',    label:'🤺 Rapier [FORBIDDEN]' },
    { id:'katana',    label:'⚔️ Katana [FORBIDDEN]' },
    { id:'lance',     label:'🏇 Lance [FORBIDDEN]' },
    { id:'chakram', label:'🥏 Chakram [FORBIDDEN]' },
    { id:'flail',     label:'⛓️ Flail [FORBIDDEN]' },
    ...uniqueWeapons,
  ];
  weaponEl.innerHTML = allWeapons.map(w => `<option value="${w.id}">${w.label}</option>`).join('');

  // Populate skills checkboxes — unique skills get gold styling + [UNIQUE] tag
  const skillsEl = document.getElementById('dbg-skills');
  skillsEl.innerHTML = SKILL_DEFS.map(s => {
    const isUnique = !!s.unique;
    const bg      = isUnique ? '#1a1200' : '#1a1030';
    const border  = isUnique ? '#886600' : '#333';
    const tag     = isUnique ? ' <span style="font-size:9px;color:#ffd700;background:#2a1a00;border:1px solid #886600;border-radius:3px;padding:0 3px;vertical-align:middle;">UNIQUE</span>' : '';
    return `
    <label style="display:flex;align-items:center;gap:5px;background:${bg};border:1px solid ${border};
                  border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px;user-select:none;">
      <input type="checkbox" value="${s.id}" style="accent-color:${isUnique ? '#ffaa00' : '#9933ff'};" onchange="dbgLimitSkills()">
      ${s.name}${tag}
    </label>`;
  }).join('');

  document.getElementById('dbg-name').value = getRandomGameName();
  modal.style.display = 'block';
}

function closeDebugRadoser() {
  document.getElementById('debug-radoser-modal').style.display = 'none';
}

function dbgUpdateSubrace() {
  const raceId   = document.getElementById('dbg-race').value;
  const race     = CG_RACES.find(r => r.id === raceId);
  const subEl    = document.getElementById('dbg-subrace');
  const subraces = race?.subKey ? (CG_SUBRACES[race.subKey] || []) : [];
  subEl.innerHTML = subraces.length === 0
    ? '<option value="">— None —</option>'
    : '<option value="">— Random —</option>' + subraces.map(sr => `<option value="${sr.id}">${sr.label}</option>`).join('');
}

function dbgLimitSkills() {
  const checkboxes = [...document.querySelectorAll('#dbg-skills input[type=checkbox]')];
  const checked = checkboxes.filter(c => c.checked);
  if (checked.length > 4) checked[checked.length - 1].checked = false;
}

function debugSaveRadoser() {
  const name   = document.getElementById('dbg-name').value.trim() || getRandomGameName();
  const raceId = document.getElementById('dbg-race').value;
  const race   = CG_RACES.find(r => r.id === raceId);
  if (!race) return;

  // Subrace
  const subVal   = document.getElementById('dbg-subrace').value;
  const subraces = race.subKey ? (CG_SUBRACES[race.subKey] || []) : [];
  let subrace    = null;
  if (subVal) {
    subrace = subraces.find(sr => sr.id === subVal) || null;
  } else if (subraces.length > 0) {
    subrace = subraces[Math.floor(Math.random() * subraces.length)];
  }

  // Stats
  const stats = {};
  DBG_STATS.forEach(s => {
    const val = parseInt(document.getElementById(`dbg-stat-${s.key}`)?.value) || 5;
    stats[s.key] = Math.min(10, Math.max(1, val));
  });

  // Weapon + Skills
  const weapon = document.getElementById('dbg-weapon').value || 'fists';
  const skills = [...document.querySelectorAll('#dbg-skills input[type=checkbox]:checked')]
    .map(c => c.value).slice(0, 4);

  const char = {
    id: Date.now() + Math.random(),
    name, race: race.id, raceName: race.name, raceEmoji: race.emoji,
    subrace, stats, weapon,
    color: generateRadoserColor(cgRoster.length),
    skills,
  };
  cgRoster.push(char);
  localStorage.setItem('cgRoster', JSON.stringify(cgRoster));
  renderRoster(); renderHeroShowcase(); buildFightersPanel();
  closeDebugRadoser();
}

document.getElementById('debugRadoserBtn')?.addEventListener('click', openDebugRadoser);

// ── Championship Draft Mode Entry Points ──────────────────────
function initChargenDraft() {
  cgDraftMode = true;
  quickCreateMode = false;
  quickCreateName = '';
  initChargen();
}

function quickCreateDraft() {
  cgDraftMode = true;
  quickCreateMode = true;
  quickCreateName = '';
  initChargen();
}
