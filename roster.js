// ROSTER (RADOSERS)
// ============================================================
// RADOSER TITLE GENERATOR
// ============================================================
function getRadoserTitle(stats) {
  const str = stats.strength  ?? 0;
  const spd = stats.speed     ?? 0;
  const dur = stats.durability?? 0;
  const iq  = stats.iq        ?? 0;
  const biq = stats.battleiq  ?? 0;
  const ma  = stats.ma        ?? 0;
  const total  = str + spd + dur + iq + biq + ma;
  const maxStat = Math.max(str, spd, dur, iq, biq, ma);
  const tens   = [str, spd, dur, iq, biq, ma].filter(v => v === 10).length;

  // ── Perfect / Near-perfect ──
  if (total === 60)  return { title: 'GOAT',       icon: '🐐', color: '#ffd700' };
  if (total >= 55)   return { title: 'Legend',     icon: '🌟', color: '#ff88ff' };

  // ── Multiple 10s ──
  if (tens >= 4)     return { title: 'Demigod',    icon: '⚡', color: '#ff6644' };
  if (tens >= 3)     return { title: 'Prodigy',    icon: '🔥', color: '#ff9944' };

  // ── Single stat = 10 ──
  if (spd === 10)    return { title: 'Speedster',  icon: '💨', color: '#44eeff' };
  if (str === 10)    return { title: 'Destroyer',  icon: '💪', color: '#ff4444' };
  if (dur === 10)    return { title: 'Iron Wall',  icon: '🛡️', color: '#88aaff' };
  if (iq  === 10)    return { title: 'Mastermind', icon: '🧠', color: '#cc88ff' };
  if (biq === 10)    return { title: 'Phantom',    icon: '👻', color: '#88ffcc' };
  if (ma  === 10)    return { title: 'Whirlwind',  icon: '🌪️', color: '#aaffaa' };

  // ── Combination builds ──
  if (str >= 8 && dur >= 8)           return { title: 'Tank',         icon: '🏋️', color: '#ff8866' };
  if (spd >= 8 && dur <= 3)           return { title: 'Glass Cannon', icon: '💥', color: '#ffcc44' };
  if (str >= 8 && spd <= 3)           return { title: 'Berserker',    icon: '🐂', color: '#ff6644' };
  if (spd >= 8 && str <= 3)           return { title: 'Trickster',    icon: '🐦', color: '#44ffcc' };
  if (iq  >= 8 && biq >= 8)           return { title: 'Tactician',    icon: '🎯', color: '#aa88ff' };
  if (ma  >= 8)                       return { title: 'Dancer',       icon: '🎭', color: '#88ffaa' };
  if ([str,spd,dur,iq,biq,ma].every(v => v >= 7)) return { title: 'All-Rounder', icon: '⚖️', color: '#ffd700' };
  if ([str,spd,dur,iq,biq,ma].every(v => v >= 5)) return { title: 'Balanced',    icon: '🟢', color: '#88cc88' };
  if (maxStat >= 8 && total <= 25)    return { title: 'One-Trick',    icon: '🎪', color: '#ffaa44' };

  // ── Total stats fallback ──
  if (total >= 45)   return { title: 'Veteran',    icon: '⚔️',  color: '#ffaa44' };
  if (total >= 35)   return { title: 'Warrior',    icon: '🔥',  color: '#ff8844' };
  if (total >= 25)   return { title: 'Average',    icon: '📊',  color: '#8888aa' };
  if (total >= 15)   return { title: 'Mid',        icon: '😐',  color: '#666688' };
  return               { title: 'Rookie',      icon: '🌱',  color: '#44aa66' };
}

// ============================================================
function renderRoster() {
  const grid = document.getElementById('rosterGrid');
  if (!grid) return;
  if (cgRoster.length === 0) {
    grid.innerHTML = '<div class="roster-empty">No characters yet — create one above!</div>'; return;
  }
  const wepLabel = id => CG_WEAPONS.find(w => w.id === id)?.label ?? id;
  grid.innerHTML = cgRoster.map((ch, idx) => {
    const iq  = ch.stats.iq       ?? null;
    const biq = ch.stats.battleiq ?? null;
    const ma  = ch.stats.ma       ?? null;
    const total = Object.values(ch.stats).reduce((sum, v) => sum + (v ?? 0), 0);
    const t = getRadoserTitle(ch.stats);
    return `
    <div class="roster-card" style="border-color:${ch.color}44">
      <button class="rc-del" data-idx="${idx}">✕</button>
      <div class="rc-name" style="color:${ch.color}">${ch.raceEmoji} ${ch.name}</div>
      <div class="rc-race">${ch.raceName}${ch.subrace ? ' · '+ch.subrace.label : ''}</div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <div class="rc-weapon">${wepLabel(ch.weapon)}</div>
        <span class="rc-title-badge" style="color:${t.color};border-color:${t.color}44">${t.title}</span>
      </div>
      <div class="rc-total">
        <span>Total Stats</span>
        <span class="rc-total-val">${total} <span style="font-size:10px;color:#666">/ 60</span></span>
      </div>
      <div class="rc-actions">
        <button class="rc-stats-btn" data-idx="${idx}">📊 Stats</button>
        <button class="rc-add" data-idx="${idx}">➕ Add to Arena</button>
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.rc-add').forEach(btn => {
    btn.onclick = () => {
      const ch = cgRoster[+btn.dataset.idx];
      if (state.fighters.length >= 12) { alert('Max 12 fighters!'); return; }
      state.fighters.push({ weaponId: ch.weapon, color: ch.color, charName: ch.name, charEmoji: ch.raceEmoji, charStats: { ...ch.stats, race: ch.race ?? null, subrace: ch.subrace ?? null }, skills: ch.skills ?? [] });
      switchToBattleTab();
      sfxShoot();
    };
  });
  grid.querySelectorAll('.rc-del').forEach(btn => {
    btn.onclick = () => {
      cgRoster.splice(+btn.dataset.idx, 1);
      localStorage.setItem('cgRoster', JSON.stringify(cgRoster));
      _heroIdx = 0;
      renderRoster();
      renderHeroShowcase();
    };
  });
  grid.querySelectorAll('.rc-stats-btn').forEach(btn => {
    btn.onclick = () => showCharStats(+btn.dataset.idx);
  });
}

function showCharStats(idx) {
  const ch = cgRoster[idx];
  if (!ch) return;

  const dur = ch.stats.durability ?? 5;
  const spd = ch.stats.speed     ?? 5;
  const str = ch.stats.strength  ?? 1;
  const iq  = ch.stats.iq        ?? null;
  const biq = ch.stats.battleiq  ?? null;
  const ma  = ch.stats.ma        ?? null;
  const wepId  = ch.weapon;
  const wepDef = WEAPON_MAP[wepId];
  const wepName = CG_WEAPONS.find(w => w.id === wepId)?.label ?? wepId;

  // Derived
  const maxHP      = 50 + dur * 10;
  const maxSpd     = 10 + spd * 1.5;
  const launchMin  = spd + 1, launchMax = spd + 3;
  const baseDmg    = wepDef ? wepDef.baseDamage * str : str;
  const critDmg    = +(baseDmg * 1.5).toFixed(2);

  const acMap = { fists: Math.max(2,13-spd), sword: Math.max(2,28-spd),
    dagger: Math.max(2,18-spd), spear: Math.max(2,38-spd),
    scythe: Math.max(2,34-spd), hammer: Math.max(2,48-spd),
    bow: Math.max(5,20-spd), shuriken: Math.max(5,20-spd) };
  const ac     = acMap[wepId] ?? (wepDef?.attackCooldown ?? 20);
  const atkPS  = (60 / ac).toFixed(2);

  const t = getRadoserTitle(ch.stats);
  document.getElementById('smo-name').innerHTML =
    `<span style="color:${ch.color}">${ch.raceEmoji} ${ch.name}</span>
     <span class="rc-title-badge" style="color:${t.color};border-color:${t.color}44;font-size:12px">${t.title}</span>`;
  document.getElementById('smo-race').textContent =
    ch.raceName + (ch.subrace ? ' · ' + ch.subrace.label : '');

  document.getElementById('smo-grid').innerHTML = STAT_DISPLAY.map(sd => `
    <div class="stats-modal-row">
      <div class="stats-modal-lbl">${sd.emoji} ${sd.label}</div>
      <div class="stats-modal-val" style="color:${STAT_COLORS[(ch.stats[sd.key]??1)-1]??'#4d96ff'}">${ch.stats[sd.key] ?? '—'}</div>
    </div>`).join('');

  const wepNameClean = wepName.replace(/^\S+\s*/, '');
  document.getElementById('smo-weapon').innerHTML =
    `Weapon: <b>${wepNameClean}</b>`;

  const row = (lbl, val, color) =>
    `<div class="stats-modal-drow"><span class="stats-modal-dlbl">${lbl}</span><span class="stats-modal-dval" style="color:${color}">${val}</span></div>`;

  const critRate  = iq  !== null ? (iq  * 5).toFixed(0) + '%' : '20%';
  const evadeRate = biq !== null ? (biq * 3).toFixed(0) + '%' : '10%';
  const spinBon   = ma  !== null ? (ma  * 0.003).toFixed(3)   : '0.000';

  const derivedEl     = document.getElementById('smo-derived');
  const derivedToggle = document.getElementById('smo-derived-toggle');

  derivedEl.innerHTML =
    row('❤️ Max HP',       maxHP,                          '#ff6b6b') +
    row('🚀 Launch Speed', `${launchMin} – ${launchMax}`,  '#ffd700') +
    row('⚔️ Base Damage',  baseDmg,                        '#ff9944') +
    row('⚡ Crit Rate',    critRate,                        '#ffe033') +
    row('💥 Crit Damage',  `×1.5 (${critDmg} dmg)`,        '#ffaa33') +
    row('🌀 Evade Chance', evadeRate,                       '#44eebb') +
    row('🔥 Attack Speed', `${atkPS} / sec`,                '#cc88ff');

  // Reset Stats toggle to open state each time modal opens
  derivedEl.style.display = '';
  derivedToggle.querySelector('.smo-arrow').textContent = '▾';
  derivedToggle.onclick = () => {
    const open = derivedEl.style.display !== 'none';
    derivedEl.style.display = open ? 'none' : '';
    derivedToggle.querySelector('.smo-arrow').textContent = open ? '▸' : '▾';
  };

  // ── Skills section ──
  const skillsEl = document.getElementById('smo-skills');
  if (skillsEl) {
    const ids = ch.skills ?? [];
    if (ids.length > 0) {
      const TC = { passive:'#e8c87a', pre_combat:'#c9902a', in_combat:'#cc3333', post_combat:'#6aaa44' };
      const TL = { passive:'Passive', pre_combat:'Pre-Combat', in_combat:'In-Combat', post_combat:'Post-Combat' };
      let cardsHtml = '';
      ids.forEach(sid => {
        const def = typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === sid) : null;
        if (def) {
          const col = TC[def.type] ?? '#8899bb';
          const lbl = TL[def.type] ?? def.type;
          cardsHtml += `
            <div class="smo-skill-card" style="--sc:${col}">
              <div class="smo-skill-top">
                <span class="smo-skill-name">${def.icon ?? '✦'} ${def.name}</span>
                <span class="smo-skill-type">${lbl}</span>
              </div>
              ${def.desc ? `<div class="smo-skill-desc">${def.desc}</div>` : ''}
            </div>`;
        } else {
          cardsHtml += `<div class="smo-skill-card"><span class="smo-skill-name">🔮 ${sid}</span></div>`;
        }
      });
      skillsEl.innerHTML = `
        <div class="smo-collapse-header smo-skills-toggle">
          ✦ Skills (${ids.length}) <span class="smo-arrow">▾</span>
        </div>
        <div class="smo-skills-body">${cardsHtml}</div>`;
      skillsEl.style.display = '';

      // Skills toggle
      const skillToggle = skillsEl.querySelector('.smo-skills-toggle');
      const skillBody   = skillsEl.querySelector('.smo-skills-body');
      skillToggle.onclick = () => {
        const open = skillBody.style.display !== 'none';
        skillBody.style.display = open ? 'none' : '';
        skillToggle.querySelector('.smo-arrow').textContent = open ? '▸' : '▾';
      };
    } else {
      skillsEl.style.display = 'none';
    }
  }

  document.getElementById('statsModal').classList.add('open');
}

document.getElementById('statsModalClose').onclick = () =>
  document.getElementById('statsModal').classList.remove('open');
document.getElementById('statsModal').onclick = e => {
  if (e.target === document.getElementById('statsModal'))
    document.getElementById('statsModal').classList.remove('open');
};

// ── Export ──────────────────────────────────────────────────
document.getElementById('exportRosterBtn').addEventListener('click', () => {
  if (cgRoster.length === 0) { alert('No Radosers to export!'); return; }
  const payload = {
    version: 1,
    app: 'AutoRPNG Battle',
    exported: new Date().toISOString().slice(0, 10),
    count: cgRoster.length,
    radosers: cgRoster,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `radosers_${payload.exported}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── Import ──────────────────────────────────────────────────
let _importParsed = null; // holds validated array before user confirms

function openImportModal() {
  _importParsed = null;
  document.getElementById('importFileInput').value = '';
  document.getElementById('importFileLabelText').textContent = '📂 Choose JSON file…';
  document.getElementById('importPreview').style.display   = 'none';
  document.getElementById('importActions').style.display   = 'none';
  document.getElementById('importError').style.display     = 'none';
  document.getElementById('importModal').style.display     = 'flex';
}
function closeImportModal() {
  document.getElementById('importModal').style.display = 'none';
}

function _applyImport(mode) {
  if (!_importParsed?.length) return;
  if (mode === 'replace') cgRoster.length = 0;
  // Avoid exact duplicates (same id)
  const existingIds = new Set(cgRoster.map(c => c.id));
  let added = 0;
  for (const ch of _importParsed) {
    if (!existingIds.has(ch.id)) { cgRoster.push(ch); added++; }
  }
  localStorage.setItem('cgRoster', JSON.stringify(cgRoster));
  closeImportModal();
  renderRoster();
  renderHeroShowcase();
  const msg = mode === 'replace'
    ? `Imported ${added} Radosers.`
    : `Merged ${added} new Radosers (${_importParsed.length - added} skipped — already exist).`;
  alert(msg);
}

document.getElementById('importRosterBtn').addEventListener('click', openImportModal);
document.getElementById('importModalClose').addEventListener('click', closeImportModal);
document.getElementById('importModal').addEventListener('click', e => {
  if (e.target === document.getElementById('importModal')) closeImportModal();
});

document.getElementById('importFileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('importFileLabelText').textContent = '📄 ' + file.name;
  document.getElementById('importError').style.display = 'none';

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      // Accept both { radosers: [...] } wrapper and plain array
      const arr = Array.isArray(data) ? data : (Array.isArray(data.radosers) ? data.radosers : null);
      if (!arr || arr.length === 0) throw new Error('No radosers found in file.');
      // Basic validation — each entry needs at minimum a name + stats
      for (const ch of arr) {
        if (!ch.name || !ch.stats) throw new Error(`Invalid entry: missing name or stats.`);
      }
      _importParsed = arr;
      document.getElementById('importPreviewText').textContent =
        `✅ Found ${arr.length} Radoser${arr.length > 1 ? 's' : ''} — choose import mode:`;
      document.getElementById('importPreview').style.display = 'block';
      document.getElementById('importActions').style.display = 'flex';
    } catch (err) {
      _importParsed = null;
      document.getElementById('importPreview').style.display  = 'none';
      document.getElementById('importActions').style.display  = 'none';
      const errEl = document.getElementById('importError');
      errEl.textContent = '❌ ' + err.message;
      errEl.style.display = 'block';
    }
  };
  reader.readAsText(file);
});

document.getElementById('importMergeBtn').addEventListener('click',   () => _applyImport('merge'));
document.getElementById('importReplaceBtn').addEventListener('click',  () => _applyImport('replace'));

// Attach create-char button
document.getElementById('createCharBtn').addEventListener('click', () => { quickCreateMode = false; initChargen(); });

// Quick Create — show name prompt first
document.getElementById('quickCreateBtn').addEventListener('click', () => {
  const modal = document.getElementById('qc-name-modal');
  const input = document.getElementById('qc-name-input');
  input.value = '';
  modal.classList.add('open');
  setTimeout(() => input.focus(), 80);
});
document.getElementById('qc-confirm-btn').addEventListener('click', () => {
  const input = document.getElementById('qc-name-input');
  quickCreateName = input.value.trim();
  document.getElementById('qc-name-modal').classList.remove('open');
  quickCreateMode = true;
  initChargen();
});
document.getElementById('qc-cancel-btn').addEventListener('click', () => {
  document.getElementById('qc-name-modal').classList.remove('open');
});
// Enter key confirms
document.getElementById('qc-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('qc-confirm-btn').click();
  if (e.key === 'Escape') document.getElementById('qc-cancel-btn').click();
});
// Click backdrop to cancel
document.getElementById('qc-name-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('qc-name-modal'))
    document.getElementById('qc-cancel-btn').click();
});

// ── Menu tab switching ──
function switchToTab(tabId) {
  document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.menu-tab-pane').forEach(p => p.classList.remove('active'));
  const btn = document.querySelector(`.menu-tab[data-tab="${tabId}"]`);
  if (btn) btn.classList.add('active');
  const pane = document.getElementById(tabId);
  if (pane) pane.classList.add('active');
  if (tabId === 'tab-battle')   buildFightersPanel();
  if (tabId === 'tab-showcase') renderHeroShowcase();
  // Stop avatar animation when leaving showcase tab
  if (tabId !== 'tab-showcase' && _scAvatarRAF) {
    cancelAnimationFrame(_scAvatarRAF); _scAvatarRAF = null;
  }
}

document.querySelectorAll('.menu-tab').forEach(btn => {
  btn.addEventListener('click', () => switchToTab(btn.dataset.tab));
});

function switchToBattleTab() { switchToTab('tab-battle'); }

// ── Showcase Tab ──
let _heroIdx = 0;
let _heroTimer = null;

function renderHeroShowcase() {
  const wrap = document.getElementById('showcase-card-wrap');
  const nav  = document.getElementById('showcase-nav');
  const dots = document.getElementById('scDots');
  if (!wrap) return;

  if (cgRoster.length === 0) {
    wrap.innerHTML = '<div class="showcase-empty">No Radosers yet — create your first warrior!</div>';
    if (nav) nav.style.display = 'none';
    return;
  }

  _heroIdx = (_heroIdx + cgRoster.length) % cgRoster.length;
  const ch  = cgRoster[_heroIdx];
  const s   = ch.stats ?? {};
  const wepLabel = CG_WEAPONS.find(w => w.id === ch.weapon)?.label ?? ch.weapon ?? 'Fists';
  const subText  = ch.subrace ? ' · ' + ch.subrace.label : '';
  const t        = getRadoserTitle(s);

  // Derived stats
  const dur = s.durability ?? 5;
  const spd = s.speed      ?? 5;
  const str = s.strength   ?? 1;
  const iq  = s.iq         ?? null;
  const biq = s.battleiq   ?? null;
  const ma  = s.ma         ?? null;
  const wepId  = ch.weapon;
  const wepDef = WEAPON_MAP[wepId];
  const maxHP  = 50 + dur * 10;
  const maxSpd = +(10 + spd * 1.5).toFixed(1);
  const baseDmg= wepDef ? +(wepDef.baseDamage * str).toFixed(1) : str;
  const acMap  = { fists:Math.max(2,13-spd), sword:Math.max(2,28-spd), dagger:Math.max(2,18-spd),
                   spear:Math.max(2,38-spd), scythe:Math.max(2,34-spd), hammer:Math.max(2,48-spd),
                   bow:Math.max(5,20-spd), shuriken:Math.max(5,20-spd) };
  const ac     = acMap[wepId] ?? (wepDef?.attackCooldown ?? 20);
  const atkPS  = (60/ac).toFixed(2);
  const critRate  = iq  !== null ? (iq  * 5) + '%' : '20%';
  const evadeRate = biq !== null ? (biq * 3) + '%' : '10%';
  const spinBon   = ma  !== null ? '+' + (ma * 0.003).toFixed(3) : '+0.000';

  const drow = (lbl, val, color) =>
    `<div class="sc-drow"><span class="sc-dlbl">${lbl}</span><span class="sc-dval" style="color:${color}">${val}</span></div>`;

  wrap.innerHTML = `
    <div class="showcase-card" style="border:1px solid ${ch.color}55">
      <div class="sc-banner" style="background:linear-gradient(90deg,${ch.color}cc,${ch.color}22)"></div>
      <div class="sc-main">
        <canvas class="sc-avatar-canvas" id="sc-avatar-canvas" width="160" height="160"></canvas>
        <div class="sc-identity">
          <div class="sc-name" style="color:${ch.color}">${ch.name}</div>
          <div class="sc-race-line">${ch.raceName ?? ''}${subText}</div>
          <div class="sc-title-wrap">
            <span class="rc-title-badge" style="color:${t.color};border-color:${t.color}44">${t.title}</span>
          </div>
        </div>
      </div>
      <div class="sc-stats-section">
        <div class="sc-section-lbl">Base Stats</div>
        <div class="sc-stats-grid">
          ${STAT_DISPLAY.map(sd => {
            const val = s[sd.key] ?? '—';
            const col = STAT_COLORS[(+val - 1)] ?? '#4d96ff';
            return `<div class="sc-stat-box">
              <span class="sc-stat-emoji">${sd.emoji}</span>
              <span class="sc-stat-lbl">${sd.label}</span>
              <span class="sc-stat-val" style="color:${col}">${val}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="sc-divider"></div>
      <div class="sc-weapon-row">${wepLabel}</div>
      <div class="sc-divider"></div>
      <div class="sc-derived-section">
        <div class="sc-section-lbl">Combat Stats</div>
        <div class="sc-derived-grid">
          ${drow('❤️ Max HP',       maxHP,              '#ff6b6b')}
          ${drow('⚔️ Base Damage',  baseDmg,            '#ff9944')}
          ${drow('🔥 Atk Speed',    atkPS + '/s',       '#cc88ff')}
          ${drow('⚡ Crit Rate',    critRate,           '#ffe033')}
          ${drow('💥 Crit Damage',  '×1.5',             '#ffaa33')}
          ${drow('🌀 Evade',        evadeRate,          '#44eebb')}
        </div>
      </div>
    </div>`;

  // Nav dots
  if (nav) nav.style.display = cgRoster.length > 1 ? 'flex' : 'none';
  if (dots) {
    dots.innerHTML = cgRoster.map((_, i) =>
      `<div class="sc-dot${i === _heroIdx ? ' active' : ''}" data-i="${i}"></div>`
    ).join('');
    dots.querySelectorAll('.sc-dot').forEach(d => {
      d.onclick = () => { _heroIdx = +d.dataset.i; renderHeroShowcase(); };
    });
  }

  // Start animated avatar canvas
  startShowcaseAvatarAnim(ch);
}

// ── Showcase avatar animation ──────────────────────────────────────────
let _scAvatarRAF = null;

function startShowcaseAvatarAnim(ch) {
  if (_scAvatarRAF) { cancelAnimationFrame(_scAvatarRAF); _scAvatarRAF = null; }

  const canvas = document.getElementById('sc-avatar-canvas');
  if (!canvas) return;
  const ctx2 = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const CX = W / 2, CY = H / 2;
  const R = 38; // ball radius in canvas px

  // Fake ball object — only what drawRaceDecoration needs
  const fakeBall = {
    x: CX, y: CY,
    vx: 0, vy: 0,
    radius: R,
    color: ch.color,
    charRace:    ch.race    ?? null,
    charSubrace: ch.subrace ?? null,
    _deco_fa: 0,
  };

  const t0 = Date.now();

  function frame() {
    const elapsed = (Date.now() - t0) / 1000;
    // Slow rotation so all decorations are visible
    fakeBall._deco_fa = elapsed * 0.55;

    ctx2.clearRect(0, 0, W, H);

    // ── Draw base ball ──────────────────────────────────────────────────
    // Shadow
    ctx2.fillStyle = 'rgba(0,0,0,0.28)';
    ctx2.beginPath();
    ctx2.ellipse(CX, CY + R * 0.88, R * 0.78, R * 0.24, 0, 0, Math.PI * 2);
    ctx2.fill();

    // Ball fill + glow
    const pulse = 0.85 + 0.15 * Math.sin(elapsed * 1.4);
    ctx2.fillStyle = ch.color;
    ctx2.shadowColor = ch.color;
    ctx2.shadowBlur  = 18 * pulse;
    ctx2.beginPath();
    ctx2.arc(CX, CY, R, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.shadowBlur = 0;

    // Outline
    ctx2.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx2.lineWidth = 2;
    ctx2.stroke();

    // Shine highlight
    ctx2.fillStyle = 'rgba(255,255,255,0.22)';
    ctx2.beginPath();
    ctx2.ellipse(CX - R*0.28, CY - R*0.3, R*0.28, R*0.18, -Math.PI*0.3, 0, Math.PI*2);
    ctx2.fill();

    // ── Race decorations ────────────────────────────────────────────────
    drawRaceDecoration(ctx2, fakeBall);

    _scAvatarRAF = requestAnimationFrame(frame);
  }

  frame();
}

function startHeroShowcase() {
  if (cgRoster.length > 0) _heroIdx = Math.floor(Math.random() * cgRoster.length);
  renderHeroShowcase();
  if (_heroTimer) clearInterval(_heroTimer);
  _heroTimer = setInterval(() => {
    if (cgRoster.length > 1) {
      _heroIdx = (_heroIdx + 1) % cgRoster.length;
      renderHeroShowcase();
    }
  }, 7000);
}

document.getElementById('scPrev').onclick = () => { _heroIdx--; renderHeroShowcase(); };
document.getElementById('scNext').onclick = () => { _heroIdx++; renderHeroShowcase(); };

startHeroShowcase();

// ── Fighter Picker Modal ──────────────────────────────────────────────
function showFighterPicker() {
  const list = document.getElementById('fpm-list');
  list.innerHTML = '';

  // ── Radosers section ──
  if (cgRoster.length > 0) {
    const lbl = document.createElement('div');
    lbl.className = 'fpm-section-lbl';
    lbl.textContent = 'Your Radosers';
    list.appendChild(lbl);

    cgRoster.forEach(ch => {
      const wepLabel = CG_WEAPONS.find(w => w.id === ch.weapon)?.label ?? ch.weapon ?? 'Fists';
      const card = document.createElement('div');
      card.className = 'fpm-radoser-card';
      card.style.borderColor = ch.color + '55';
      card.innerHTML = `
        <div class="fpm-dot" style="background:${ch.color};box-shadow:0 0 8px ${ch.color}77"></div>
        <div class="fpm-info">
          <div class="fpm-name" style="color:${ch.color}">${ch.raceEmoji ?? ''} ${ch.name}</div>
          <div class="fpm-meta">${ch.raceName ?? ''}${ch.subrace ? ' · ' + ch.subrace.label : ''} &nbsp;·&nbsp; ${wepLabel}</div>
        </div>
        <span class="fpm-add-tag">ADD</span>`;
      card.addEventListener('click', () => {
        state.fighters.push(rosterToFighter(ch));
        buildFightersPanel();
        closeFighterPicker();
        sfxShoot();
      });
      list.appendChild(card);
    });
  } else {
    const empty = document.createElement('div');
    empty.className = 'fpm-empty';
    empty.textContent = 'No Radosers yet — create some in the Radosers tab!';
    list.appendChild(empty);
  }

  // ── Bot section ──
  const botLbl = document.createElement('div');
  botLbl.className = 'fpm-section-lbl';
  botLbl.style.marginTop = '6px';
  botLbl.textContent = 'or';
  list.appendChild(botLbl);

  const botCard = document.createElement('div');
  botCard.className = 'fpm-bot-card';
  botCard.innerHTML = `<span>🤖</span><span>Add Random Bot</span>`;
  botCard.addEventListener('click', () => {
    const nextColor = BALL_COLORS[state.fighters.length % BALL_COLORS.length];
    state.fighters.push({ weaponId: 'sword', color: nextColor });
    buildFightersPanel();
    closeFighterPicker();
    sfxShoot();
  });
  list.appendChild(botCard);

  document.getElementById('fighter-picker-modal').style.display = 'flex';
}

function closeFighterPicker() {
  document.getElementById('fighter-picker-modal').style.display = 'none';
}

// fpm event listeners are wired via onclick attrs in modal HTML
