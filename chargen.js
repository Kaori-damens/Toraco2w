// ============================================================
// CHARGEN FLOW
// ============================================================
const CHARGEN_STEPS = ['name','race','subrace','str','spd','dur','iq','biq','ma','hasweapon','weapon','skillcount','skillpick','done'];
let cgState = null;
let cgRoster = JSON.parse(localStorage.getItem('cgRoster') || '[]');
let quickCreateMode = false;
let quickCreateName = ''; // custom name from prompt
let cgDraftMode = false;  // true when creating for championship draft

// ── DEBUG HELPER ─────────────────────────────────────────────
// Appends a debug quick-pick panel below any chargen spin wheel.
// items: [{label, onClick}]
function _cgDebug(box, title, items) {
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

function initChargen() {
  cgState = {
    step: 'name', name: '', race: null, subrace: null,
    stats: { strength:null, speed:null, durability:null, iq:null, battleiq:null, ma:null },
    hasWeapon: null,      // true = armed, false = unarmed (fists)
    isUniqueWeapon: null, // true = unique weapon roll (championship only), false = normal
    weapon: null,
    skillCount: 0,    // how many skills to roll
    skills: [],       // array of SKILL_DEF objects picked
  };
  showScreen('chargen');
  renderCgDots();
  renderCgStep();
}

function renderCgDots() {
  const row = document.getElementById('cgDots');
  const steps = ['name','race','subrace','str','spd','dur','iq','biq','ma','hasweapon','weapon','skillcount','skillpick','done'];
  const cur = steps.indexOf(cgState.step);
  row.innerHTML = steps.map((s,i) =>
    `<div class="cg-dot ${i < cur ? 'done' : i === cur ? 'active' : ''}"></div>`
  ).join('');
}

function renderCgStep() {
  renderCgDots();
  const box = document.getElementById('cg-content');
  box.innerHTML = '';
  const s = cgState.step;
  if (s === 'name')    { cgRenderName(box); return; }
  if (s === 'race') {
    cgRenderSpin(box, 'Choose Race', CG_RACES.map((r,i) => ({ label: r.emoji+' '+r.name, weight: r.weight, color: wColor(i) })), (w, idx) => { cgState.race = CG_RACES[idx]; advanceCg(); });
    // Debug: quick-pick buttons
    const dbg = document.createElement('div');
    dbg.style.cssText = 'margin-top:10px;padding:8px 12px;background:#1a1a2e;border:1px dashed #ff6b35;border-radius:8px;';
    dbg.innerHTML = `<div style="font-size:11px;color:#ff6b35;margin-bottom:6px;letter-spacing:1px;">DEBUG — Pick Race</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;">${CG_RACES.map((r,i) =>
        `<button onclick="cgState.race=CG_RACES[${i}];advanceCg();" style="background:#2a2a4a;border:1px solid #444;border-radius:5px;color:#ccc;cursor:pointer;font-size:11px;padding:3px 8px;">${r.emoji} ${r.name}</button>`
      ).join('')}</div>`;
    box.appendChild(dbg);
    return;
  }
  if (s === 'subrace') {
    const srAll = CG_SUBRACES[cgState.race.subKey];
    if (!srAll) { advanceCg(); return; }

    // Demon in championship draft: filter wheel to available sins only
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

    cgRenderSpin(box, `${cgState.race.emoji} Sub-Race`,
      sr.map((r,i) => ({ label:r.label, weight:r.weight, color:wColor(i) })),
      (w, idx) => onPick(idx),
      null, `${cgState.race.emoji} ${cgState.race.name}`);
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

    // Default flat-delta transform and onResult
    let statTransform = delta !== 0 ? (_w, idx) => {
      const raw = idx + 1;
      const adj = Math.max(1, raw + delta);
      const sign = delta > 0 ? `+${delta}` : `${delta}`;
      return `${adj} <span style="opacity:0.6;font-size:0.8em">(rolled ${raw}, ${sign} ${srLabel})</span>`;
    } : null;
    let onStatResult = (_w, idx) => { cgState.stats[sk] = Math.max(1, idx + 1 + delta); advanceCg(); };

    // ── GIANT TRAIT: compare STR vs IQ right when IQ lands ──
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

    // ── GOD OF STRENGTH: STR guaranteed ≥10; roll 10 → STR doubled (→20) ──
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

    // ── LAST-STAT EFFECTS: Dragon Flame / Primordial Air/Water applied at MA ──
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

    cgRenderSpin(box, `${sd.emoji} ${sd.label}${constraintNote}`, items, onStatResult, cgState.stats, null, statTransform);
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
      { label: '✨ Unique Weapon!', weight: 13, color: '#ffd700' },
      { label: '⚔️ Normal Weapon',  weight: 87, color: '#44ccff' },
    ];
    cgRenderSpin(box, '🎰 Unique Weapon?', items, (_w, idx) => {
      cgState.isUniqueWeapon = (idx === 0);
      advanceCg();
    });
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
      { label: '⚔️ Armed',   weight: 80, color: '#44ccff' },
      { label: '✊ Unarmed', weight: 20, color: '#ff8844' },
    ];
    cgRenderSpin(box, '🎰 Has Weapon?', items, (_w, idx) => {
      cgState.hasWeapon = (idx === 0);
      if (!cgState.hasWeapon) cgState.weapon = 'fists'; // skip weapon wheel
      advanceCg();
    });
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
    const title = (cgDraftMode && cgState.isUniqueWeapon) ? '✨ Unique Weapon' : '🗡️ Weapon';
    cgRenderSpin(box, title, weaponItems, (_w, idx) => {
      const chosen = allWeaponOptions[idx];
      cgState.weapon = chosen.id || chosen;
      if (cgDraftMode && chosen.unique) claimUnique(chosen.id);
      advanceCg();
    });
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
        <div class="cg-label">🧠 Skill Mastery</div>
        <div class="cg-result-box" style="margin:16px auto">${count} Skills</div>
        <div class="cg-trait">✨ Blessed by Thoth — IQ ${iq} × 1.7 = ${count} skills (no wheel)</div>
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
    cgRenderSpin(box, `${cgState.race.emoji} How many Skills?`, items, (_w, idx) => {
      cgState.skillCount = idx + skillBonus;
      advanceCg();
    }, null, null, skillTransform);
    _cgDebug(box, 'Pick Skill Count', Array.from({length: items.length}, (_, i) => ({
      label: i === 0 ? '0 Skills' : `${i + skillBonus} Skill${(i + skillBonus) !== 1 ? 's' : ''}`,
      onClick: () => { cgState.skillCount = i + skillBonus; advanceCg(); }
    })));
    return;
  }
  if (s === 'skillpick') { cgRenderSkillPick(box); return; }
  if (s === 'done') { cgRenderDone(box); }
}

function advanceCg() {
  const order = ['name','race','subrace','str','spd','dur','iq','biq','ma','hasweapon','uniqueweapon','weapon','skillcount','skillpick','done'];
  let next = order.indexOf(cgState.step) + 1;
  // Skip uniqueweapon if not in championship draft OR not armed
  if (order[next] === 'uniqueweapon' && (!cgDraftMode || cgState.hasWeapon === false)) next++;
  // If unarmed, skip weapon wheel
  if (order[next] === 'weapon' && cgState.hasWeapon === false) next++;
  // If 0 skills rolled, skip the skill-pick wheel
  if (order[next] === 'skillpick' && cgState.skillCount === 0) next++;
  cgState.step = order[Math.min(next, order.length - 1)];
  renderCgStep();
}

function cgRenderName(box) {
  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label">Step 1 — Enter Character Name</div>
      <div class="cg-name-row">
        <input class="cg-name-input" id="cgNameInput" placeholder="Enter name..." maxlength="24" value="${cgState.name}" autofocus>
        <button class="cg-random-btn" id="cgRandomName" title="Random hero name">🎲</button>
      </div>
      <div class="cg-nav">
        <button class="cg-btn" id="cgBackMenu">← Back</button>
        <button class="cg-btn primary" id="cgNameNext">Next →</button>
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

function cgRenderSpin(box, title, items, onResult, currentStats, resultPrefix, resultTransform) {
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
        <button class="spin-btn" id="cgSpinBtn">🎰 SPIN!</button>
      </div>
      ${cgState.race ? `<div class="cg-trait">${cgState.race.emoji} <b>${cgState.race.name}</b>${cgState.race.trait ? ' — '+cgState.race.trait : ''}</div>` : ''}
    </div>`;

  const wheel = new SpinWheel(document.getElementById('spinCanvas'), items);
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
      btn.textContent = 'Next →';
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
        `<span class="cg-skill-tag" title="${s.desc}">${s.icon} ${s.name}</span>`
      ).join('')}</div>`
    : '';

  const items = available.map((s, i) => ({
    label: s.icon + ' ' + s.name,
    weight: 1,
    color: wColor(i),
  }));

  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label">🌀 Skill ${spinNum} of ${total}</div>
      ${pickedHtml}
      <div class="spin-wrap">
        <canvas id="spinCanvas" width="360" height="360"></canvas>
        <div class="spin-ptr"></div>
      </div>
      <div id="cgResultBox"></div>
      <div class="cg-nav">
        <button class="spin-btn" id="cgSpinBtn">🎰 SPIN!</button>
      </div>
      ${cgState.race ? `<div class="cg-trait">${cgState.race.emoji} <b>${cgState.race.name}</b></div>` : ''}
    </div>`;

  const wheel = new SpinWheel(document.getElementById('spinCanvas'), items);
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
      btn.textContent = spinNum < total ? 'Next Skill →' : 'Done ✓';
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
          else { renderCgStep(); }
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
    label: sk.icon + ' ' + sk.name,
    onClick: () => {
      if (cgDraftMode && sk.unique) claimUnique(sk.id);
      cgState.skills.push(sk);
      if (cgState.skills.length >= total) { advanceCg(); }
      else { renderCgStep(); }
    }
  })));
}

// All subrace effects are now applied inline during chargen spins.
// Giant → IQ step, Dragon Flame / Primordial Air/Water → MA step.
function applySubraceEffects(_cgState) { /* no-op */ }

function cgRenderDone(box) {
  const r = cgState.race, sr = cgState.subrace, st = cgState.stats;
  const wep = CG_WEAPONS.find(w => w.id === cgState.weapon)
           ?? WEAPON_DEFS.find(w => w.id === cgState.weapon);
  const raceSk = (typeof RACE_SKILL_DEFS !== 'undefined') ? RACE_SKILL_DEFS[r.id] : null;
  box.innerHTML = `
    <div class="cg-card">
      <div class="cg-label" style="font-size:20px;color:#fff;font-weight:900">${r.emoji} ${cgState.name}</div>
      <div style="color:#7a9ac0;font-size:14px">${r.name}${sr ? ' · '+sr.label : ''}</div>
      <div class="cg-summary">
        <div class="cg-sum-row"><span class="cg-sum-lbl">Weapon</span><span class="cg-sum-val">${(wep?.icon ? wep.icon + ' ' : '') + (wep?.name ?? wep?.label ?? '—')}${wep?.unique ? ' <span class="unique-badge">★ UNIQUE</span>' : ''}</span></div>
        ${sr ? `<div class="cg-sum-row"><span class="cg-sum-lbl">Sub-Race</span><span class="cg-sum-val">${sr.label}</span></div>` : ''}
        ${STAT_DISPLAY.map(sd => `<div class="cg-sum-row"><span class="cg-sum-lbl">${sd.emoji} ${sd.label}</span><span class="cg-sum-val" style="color:${STAT_COLORS[(st[sd.key]||1)-1]}">${st[sd.key] ?? '—'}</span></div>`).join('')}
      ${cgState.skills?.length > 0 ? cgState.skills.map(s => `<div class="cg-sum-row"><span class="cg-sum-lbl">Skill</span><span class="cg-sum-val">${s.icon} ${s.name}${s.unique ? ' <span class="unique-badge">★ UNIQUE</span>' : ''}</span></div>`).join('') : '<div class="cg-sum-row"><span class="cg-sum-lbl">Skills</span><span class="cg-sum-val" style="color:#555">None</span></div>'}
      </div>
      ${raceSk ? `
      <div class="cg-race-skill-box">
        <div class="cg-race-skill-header">
          <span class="cg-race-skill-crown">👑</span>
          <span class="cg-race-skill-title">Race Skill</span>
        </div>
        <div class="cg-race-skill-body">
          <span class="cg-race-skill-icon">${raceSk.icon}</span>
          <div>
            <div class="cg-race-skill-name">${raceSk.name}</div>
            <div class="cg-race-skill-desc">${raceSk.desc}</div>
          </div>
        </div>
      </div>` : ''}
      ${r.trait ? `<div class="cg-trait">${r.trait}</div>` : ''}
      ${sr?.desc ? `<div class="cg-trait">Sub-Race bonus: ${sr.desc}</div>` : ''}
      <div class="cg-nav">
        <button class="cg-btn" id="cgRestart">↺ Restart</button>
        <button class="cg-btn primary" id="cgSave">${cgDraftMode ? '⚔️ Add to Draft' : '📜 Add to Radosers'}</button>
      </div>
    </div>`;
  document.getElementById('cgRestart').onclick = () => initChargen();
  const saveChar = () => {
    const char = {
      id: Date.now() + Math.random(),
      name: cgState.name, race: cgState.race.id, raceName: cgState.race.name,
      raceEmoji: cgState.race.emoji, subrace: cgState.subrace,
      stats: { ...cgState.stats }, weapon: cgState.weapon,
      color: generateRadoserColor(cgDraftMode
        ? (state.championship?.draftRoster?.length ?? 0)
        : cgRoster.length),
      skills: (cgState.skills || []).map(s => s.id),
    };
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
    { id:'rapier', label:'🤺 Rapier [FORBIDDEN]' },
    { id:'katana', label:'⚔️ Katana [FORBIDDEN]' },
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
      ${s.icon} ${s.name}${tag}
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
