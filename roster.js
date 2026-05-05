// ROSTER (RADOSERS)
// ============================================================
// RADOSER TITLE GENERATOR
// ============================================================
// ── Title system temporarily disabled — pending redesign ──
// To re-enable: remove the early return and uncomment the logic below.
function getRadoserTitle(stats) {
  return null;

  /* --- OLD TITLE LOGIC (outdate) ---
  const str = stats.strength  ?? 0;
  const spd = stats.speed     ?? 0;
  const dur = stats.durability?? 0;
  const iq  = stats.iq        ?? 0;
  const biq = stats.battleiq  ?? 0;
  const ma  = stats.ma        ?? 0;
  const total  = str + spd + dur + iq + biq + ma;
  const maxStat = Math.max(str, spd, dur, iq, biq, ma);
  const tens   = [str, spd, dur, iq, biq, ma].filter(v => v === 10).length;

  if (total === 60)  return { title: 'GOAT',       icon: '🐐', color: '#ffd700' };
  if (total >= 55)   return { title: 'Legend',     icon: '🌟', color: '#ff88ff' };
  if (tens >= 4)     return { title: 'Demigod',    icon: '⚡', color: '#ff6644' };
  if (tens >= 3)     return { title: 'Prodigy',    icon: '🔥', color: '#ff9944' };
  if (spd === 10)    return { title: 'Speedster',  icon: '💨', color: '#44eeff' };
  if (str === 10)    return { title: 'Destroyer',  icon: '💪', color: '#ff4444' };
  if (dur === 10)    return { title: 'Iron Wall',  icon: '🛡️', color: '#88aaff' };
  if (iq  === 10)    return { title: 'Mastermind', icon: '🧠', color: '#cc88ff' };
  if (biq === 10)    return { title: 'Phantom',    icon: '👻', color: '#88ffcc' };
  if (ma  === 10)    return { title: 'Whirlwind',  icon: '🌪️', color: '#aaffaa' };
  if (str >= 8 && dur >= 8)           return { title: 'Tank',         icon: '🏋️', color: '#ff8866' };
  if (spd >= 8 && dur <= 3)           return { title: 'Glass Cannon', icon: '💥', color: '#ffcc44' };
  if (str >= 8 && spd <= 3)           return { title: 'Berserker',    icon: '🐂', color: '#ff6644' };
  if (spd >= 8 && str <= 3)           return { title: 'Trickster',    icon: '🐦', color: '#44ffcc' };
  if (iq  >= 8 && biq >= 8)           return { title: 'Tactician',    icon: '🎯', color: '#aa88ff' };
  if (ma  >= 8)                       return { title: 'Dancer',       icon: '🎭', color: '#88ffaa' };
  if ([str,spd,dur,iq,biq,ma].every(v => v >= 7)) return { title: 'All-Rounder', icon: '⚖️', color: '#ffd700' };
  if ([str,spd,dur,iq,biq,ma].every(v => v >= 5)) return { title: 'Balanced',    icon: '🟢', color: '#88cc88' };
  if (maxStat >= 8 && total <= 25)    return { title: 'One-Trick',    icon: '🎪', color: '#ffaa44' };
  if (total >= 45)   return { title: 'Veteran',    icon: '⚔️',  color: '#ffaa44' };
  if (total >= 35)   return { title: 'Warrior',    icon: '🔥',  color: '#ff8844' };
  if (total >= 25)   return { title: 'Average',    icon: '📊',  color: '#8888aa' };
  if (total >= 15)   return { title: 'Mid',        icon: '😐',  color: '#666688' };
  return               { title: 'Rookie',      icon: '🌱',  color: '#44aa66' };
  --- END OLD LOGIC --- */
}

// ── Roster filter state ──────────────────────────────────────
window._rosterFilter = window._rosterFilter || { q: '', race: '', weapon: '' };

// ── Smart query parser ───────────────────────────────────────
const _ROSTER_FIELD_MAP = {
  str: 'strength', strength: 'strength',
  spd: 'speed',    speed: 'speed',
  dur: 'durability', durability: 'durability',
  iq:  'iq',
  biq: 'battleiq', battleiq: 'battleiq',
  ma:  'ma',
  total: '__total__',
  race: '__race__',    r:   '__race__',
  weapon: '__weapon__', w:  '__weapon__', wep: '__weapon__',
  name: '__name__',    n:   '__name__',
  subrace: '__subrace__',
  skill:   '__skill__',
};
const _TOKEN_RE = /^(\w+)\s*(>=|<=|!=|>|<|=)\s*(.+)$/;

function parseRosterQuery(raw) {
  if (!raw.trim()) return { terms: [], nameQ: '' };
  const terms = [], nameParts = [];
  for (const part of raw.split(',').map(s => s.trim()).filter(Boolean)) {
    const m = part.match(_TOKEN_RE);
    if (m && _ROSTER_FIELD_MAP[m[1].toLowerCase()]) {
      terms.push({ field: _ROSTER_FIELD_MAP[m[1].toLowerCase()], op: m[2], val: m[3].trim().toLowerCase() });
    } else {
      nameParts.push(part.toLowerCase());
    }
  }
  return { terms, nameQ: nameParts.join(' ').trim() };
}

function matchesRosterQuery(ch, { terms, nameQ }) {
  // Plain text → search name + raceName
  if (nameQ) {
    const inName = ch.name.toLowerCase().includes(nameQ);
    const inRace = (ch.raceName || '').toLowerCase().includes(nameQ);
    if (!inName && !inRace) return false;
  }
  if (!terms.length) return true;

  const statTotal = Object.values(ch.stats).reduce((s, v) => s + (v ?? 0), 0);

  for (const { field, op, val } of terms) {
    // ── String fields ──
    if (field === '__race__') {
      const hay = (ch.race || '').toLowerCase() + ' ' + (ch.raceName || '').toLowerCase();
      const hit = hay.includes(val);
      if (op === '=' && !hit) return false;
      if (op === '!=' && hit) return false;
      continue;
    }
    if (field === '__weapon__') {
      const wLabel = (CG_WEAPONS.find(w => w.id === ch.weapon)?.label || '').toLowerCase();
      const hay = (ch.weapon || '').toLowerCase() + ' ' + wLabel;
      const hit = hay.includes(val);
      if (op === '=' && !hit) return false;
      if (op === '!=' && hit) return false;
      continue;
    }
    if (field === '__name__') {
      const hit = ch.name.toLowerCase().includes(val);
      if (op === '=' && !hit) return false;
      if (op === '!=' && hit) return false;
      continue;
    }
    if (field === '__subrace__') {
      const sr = (ch.subrace?.label || ch.subrace?.id || '').toLowerCase();
      const hit = sr.includes(val);
      if (op === '=' && !hit) return false;
      if (op === '!=' && hit) return false;
      continue;
    }
    if (field === '__skill__') {
      const skills = (ch.skills || []).map(s => s.toLowerCase());
      const hit = skills.some(s => s.includes(val));
      if (op === '=' && !hit) return false;
      if (op === '!=' && hit) return false;
      continue;
    }

    // ── Numeric fields ──
    const numVal = parseFloat(val);
    if (isNaN(numVal)) continue;
    const actual = field === '__total__' ? statTotal : (ch.stats[field] ?? 0);
    if (op === '='  && !(actual === numVal)) return false;
    if (op === '>'  && !(actual >  numVal))  return false;
    if (op === '<'  && !(actual <  numVal))  return false;
    if (op === '>=' && !(actual >= numVal))  return false;
    if (op === '<=' && !(actual <= numVal))  return false;
    if (op === '!=' && !(actual !== numVal)) return false;
  }
  return true;
}

// ============================================================
function renderRoster() {
  const grid = document.getElementById('rosterGrid');
  if (!grid) return;
  if (cgRoster.length === 0) {
    grid.innerHTML = `<div class="roster-empty">${t('roster_empty')}</div>`; return;
  }

  // Apply smart filter
  const f = window._rosterFilter;
  const parsed = parseRosterQuery(f.q || '');
  const filtered = cgRoster
    .map((ch, origIdx) => ({ ch, origIdx }))
    .filter(({ ch }) => {
      if (!matchesRosterQuery(ch, parsed)) return false;
      if (f.race   && ch.race   !== f.race)   return false;
      if (f.weapon && ch.weapon !== f.weapon) return false;
      return true;
    });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="roster-empty">${t('roster_no_match')}</div>`; return;
  }

  const wepLabel = id => CG_WEAPONS.find(w => w.id === id)?.label ?? id;
  grid.innerHTML = filtered.map(({ ch, origIdx: idx }) => {
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
        ${t ? `<span class="rc-title-badge" style="color:${t.color};border-color:${t.color}44">${t.title}</span>` : ''}
        ${ch.championshipTag ? `<span class="rc-guild-tag" title="${ch.championshipName||''}">[${ch.championshipTag}]</span>` : ''}
        ${(ch.charDevs ?? []).map(id => {
          const cd = typeof CHARDEV_POOL !== 'undefined' ? CHARDEV_POOL.find(c => c.id === id) : null;
          return cd ? `<span class="rc-chardev-icon" title="${cd.label}: ${cd.desc}" style="color:${cd.color}">${cd.icon}</span>` : '';
        }).join('')}
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
      state.fighters.push({ weaponId: ch.weapon, color: ch.color, charName: ch.name, charEmoji: ch.raceEmoji, charStats: { ...ch.stats, race: ch.race ?? null, subrace: ch.subrace ?? null }, skills: ch.skills ?? [], charDevs: ch.charDevs ?? [] });
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
     ${t ? `<span class="rc-title-badge" style="color:${t.color};border-color:${t.color}44;font-size:12px">${t.title}</span>` : ''}
     ${ch.championshipTag ? `<span class="rc-guild-tag" title="${ch.championshipName||''}">[${ch.championshipTag}]</span>` : ''}`;
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
                <span class="smo-skill-name">${def.name}</span>
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

  // ── Char Devs section ──
  const charDevsEl = document.getElementById('smo-chardevs');
  if (charDevsEl) {
    const devIds = ch.charDevs ?? [];
    if (devIds.length > 0 && typeof CHARDEV_POOL !== 'undefined') {
      const cardsHtml = devIds.map(id => {
        const cd = CHARDEV_POOL.find(c => c.id === id);
        if (!cd) return '';
        return `<div class="smo-skill-card" style="--sc:${cd.color}">
          <div class="smo-skill-top">
            <span class="smo-skill-name">${cd.icon} ${cd.label}</span>
          </div>
          ${cd.desc ? `<div class="smo-skill-desc">${cd.desc}</div>` : ''}
        </div>`;
      }).join('');
      charDevsEl.innerHTML = `
        <div class="smo-collapse-header smo-chardevs-toggle">
          🌀 Char Dev (${devIds.length}) <span class="smo-arrow">▾</span>
        </div>
        <div class="smo-chardevs-body">${cardsHtml}</div>`;
      charDevsEl.style.display = '';
      const toggle = charDevsEl.querySelector('.smo-chardevs-toggle');
      const body   = charDevsEl.querySelector('.smo-chardevs-body');
      toggle.onclick = () => {
        const open = body.style.display !== 'none';
        body.style.display = open ? 'none' : '';
        toggle.querySelector('.smo-arrow').textContent = open ? '▸' : '▾';
      };
    } else {
      charDevsEl.style.display = 'none';
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

  // Clear roster sau khi export
  cgRoster.length = 0;
  localStorage.setItem('cgRoster', JSON.stringify(cgRoster));
  _heroIdx = 0;
  renderRoster();
  renderHeroShowcase();
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
            ${t ? `<span class="rc-title-badge" style="color:${t.color};border-color:${t.color}44">${t.title}</span>` : ''}
            ${ch.championshipTag ? `<span class="rc-guild-tag" title="${ch.championshipName||''}">[${ch.championshipTag}]</span>` : ''}
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
      ${(() => {
        const devIds = ch.charDevs ?? [];
        if (!devIds.length || typeof CHARDEV_POOL === 'undefined') return '';
        const badges = devIds.map(id => {
          const cd = CHARDEV_POOL.find(c => c.id === id);
          if (!cd) return '';
          return `<span class="sc-chardev-badge" style="border-color:${cd.color}88;color:${cd.color}" title="${cd.desc}">${cd.icon} ${cd.label}</span>`;
        }).join('');
        return `<div class="sc-divider"></div>
          <div class="sc-derived-section">
            <div class="sc-section-lbl">🌀 Char Dev</div>
            <div class="sc-chardev-wrap">${badges}</div>
          </div>`;
      })()}
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
      const fpmDevBadges = (ch.charDevs ?? []).map(id => {
        const cd = typeof CHARDEV_POOL !== 'undefined' ? CHARDEV_POOL.find(c => c.id === id) : null;
        return cd ? `<span class="fpm-chardev-badge" style="color:${cd.color}" title="${cd.desc}">${cd.icon}</span>` : '';
      }).join('');
      card.innerHTML = `
        <div class="fpm-dot" style="background:${ch.color};box-shadow:0 0 8px ${ch.color}77"></div>
        <div class="fpm-info">
          <div class="fpm-name" style="color:${ch.color}">${ch.raceEmoji ?? ''} ${ch.name}${fpmDevBadges ? ' ' + fpmDevBadges : ''}</div>
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

// ── Changelog collapse (CSP-safe, no inline onclick) ──
document.querySelectorAll('[data-changelog-toggle]').forEach(header => {
  header.addEventListener('click', () => {
    header.closest('.changelog-patch').classList.toggle('collapsed');
  });
});

// ── Wiki section collapse ──
document.querySelectorAll('[data-wiki-toggle]').forEach(header => {
  header.addEventListener('click', () => {
    header.closest('.wiki-section').classList.toggle('collapsed');
  });
});

// ── Roster Search + Filter init ─────────────────────────────
function initRosterFilter() {
  const searchInput  = document.getElementById('rosterSearchInput');
  const searchClear  = document.getElementById('rosterSearchClear');
  const filterBtn    = document.getElementById('rosterFilterBtn');
  const filterPanel  = document.getElementById('rosterFilterPanel');
  const filterBadge  = document.getElementById('rosterFilterBadge');
  const raceChips    = document.getElementById('rfpRaceChips');
  const weaponChips  = document.getElementById('rfpWeaponChips');
  const searchHint   = document.getElementById('rosterSearchHint');
  if (!searchInput || !filterBtn || !filterPanel) return;

  // Build race chips
  const allRaceChip = document.createElement('button');
  allRaceChip.className = 'rfp-chip active';
  allRaceChip.dataset.race = '';
  allRaceChip.textContent = 'All';
  raceChips.appendChild(allRaceChip);

  CG_RACES.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'rfp-chip';
    btn.dataset.race = r.id;
    btn.textContent = r.emoji + ' ' + r.name;
    raceChips.appendChild(btn);
  });

  // Build weapon chips
  const allWepChip = document.createElement('button');
  allWepChip.className = 'rfp-chip active';
  allWepChip.dataset.weapon = '';
  allWepChip.textContent = 'All';
  weaponChips.appendChild(allWepChip);

  CG_WEAPONS.forEach(w => {
    const btn = document.createElement('button');
    btn.className = 'rfp-chip';
    btn.dataset.weapon = w.id;
    btn.textContent = w.label;
    weaponChips.appendChild(btn);
  });

  // Helper: update badge
  function updateBadge() {
    const active = (window._rosterFilter.race ? 1 : 0) + (window._rosterFilter.weapon ? 1 : 0);
    filterBadge.textContent = active;
    filterBadge.style.display = active > 0 ? '' : 'none';
    filterBtn.classList.toggle('active', active > 0);
  }

  // Helper: update clear button
  function updateClear() {
    searchClear.style.display = searchInput.value ? '' : 'none';
  }

  // Helper: show/hide syntax hint
  function showHint(on) {
    searchHint?.classList.toggle('visible', on);
  }

  // Search input
  searchInput.addEventListener('input', () => {
    window._rosterFilter.q = searchInput.value;
    updateClear();
    renderRoster();
  });
  searchInput.addEventListener('focus', () => showHint(true));
  searchInput.addEventListener('blur',  () => { if (!searchInput.value) showHint(false); });

  // Clear search
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    window._rosterFilter.q = '';
    updateClear();
    showHint(false);
    renderRoster();
    searchInput.focus();
  });

  // Toggle filter panel
  filterBtn.addEventListener('click', () => {
    const isOpen = filterPanel.classList.toggle('open');
    filterBtn.classList.toggle('open', isOpen);
  });

  // Race chip clicks (single-select)
  raceChips.addEventListener('click', e => {
    const chip = e.target.closest('.rfp-chip');
    if (!chip) return;
    raceChips.querySelectorAll('.rfp-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    window._rosterFilter.race = chip.dataset.race;
    updateBadge();
    renderRoster();
  });

  // Weapon chip clicks (single-select)
  weaponChips.addEventListener('click', e => {
    const chip = e.target.closest('.rfp-chip');
    if (!chip) return;
    weaponChips.querySelectorAll('.rfp-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    window._rosterFilter.weapon = chip.dataset.weapon;
    updateBadge();
    renderRoster();
  });

  updateClear();
  updateBadge();
}

initRosterFilter();

// ============================================================
// BULK CREATE — headless multi-radoser generator
// ============================================================

function _wcRandIdx(weights) {
  let total = 0;
  for (const w of weights) total += w;
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function bulkCreateOne() {
  const statKeys = ['strength', 'speed', 'durability', 'iq', 'battleiq', 'ma'];

  // 1. Name
  const name = getRandomGameName();

  // 2. Race (weighted)
  const raceIdx = _wcRandIdx(CG_RACES.map(r => r.weight));
  const race = CG_RACES[raceIdx];

  // 3. Subrace (weighted, or null)
  let subrace = null;
  if (race.subKey && CG_SUBRACES[race.subKey]) {
    let sr = CG_SUBRACES[race.subKey];
    // Demon: filter to available sins from championship sin pool
    if (race.id === 'demon' && state.championship?.demonSinPool !== undefined) {
      const pool = state.championship.demonSinPool;
      sr = (pool && pool.size > 0) ? sr.filter(s => pool.has(s.label)) : [];
    }
    if (sr.length > 0) {
      subrace = { ...sr[_wcRandIdx(sr.map(s => s.weight))] };
      // Claim the sin from the pool so no other fill character can take it
      if (race.id === 'demon' && subrace?.label && typeof claimDemonSin === 'function') {
        claimDemonSin(subrace.label);
      }
    }
    // sr.length === 0 → subrace stays null (sinless demon)
  }

  const raceId  = race.id;
  const srLabel = subrace?.label || '';

  // 4. Flat stat deltas — mirrors getSubraceStatDeltas()
  const deltas  = {};
  const allD    = v => statKeys.forEach(k => { deltas[k] = (deltas[k] || 0) + v; });
  if (raceId === 'goblin') {
    if      (srLabel === '×1' || srLabel === '×50')  allD(-1);
    else if (srLabel === '×1,000')   { deltas.strength = (deltas.strength || 0) + 1; }
    else if (srLabel === '×5,000')   { deltas.strength = (deltas.strength || 0) + 1; deltas.speed = (deltas.speed || 0) + 1; }
    else if (srLabel === '×10,000')  { deltas.strength = (deltas.strength || 0) + 2; deltas.speed = (deltas.speed || 0) + 2; }
    else if (srLabel === '×100,000') allD(1);
  }
  if (raceId === 'troll' && srLabel === 'Mountain Troll')
    deltas.durability = (deltas.durability || 0) + 3;
  if (raceId === 'dragon') {
    if      (srLabel === 'Crimson')  { deltas.iq = (deltas.iq || 0) + 2; deltas.durability = (deltas.durability || 0) + 1; }
    else if (srLabel === 'Stone')    deltas.durability = (deltas.durability || 0) + 2;
    else if (srLabel === 'Tideborn') deltas.strength   = (deltas.strength   || 0) + 3;
    else if (srLabel === 'Amethyst') allD(-1);
  }
  if (raceId === 'primordial' && srLabel === 'Earth') {
    deltas.durability = (deltas.durability || 0) + 1;
    deltas.strength   = (deltas.strength   || 0) + 1;
  }
  if (raceId === 'angel') {
    if      (srLabel === 'Archangels') { deltas.speed = (deltas.speed || 0) + 2; deltas.ma = (deltas.ma || 0) + 1; }
    else if (srLabel === 'Powers')     { deltas.ma = (deltas.ma || 0) + 1; }
    else if (srLabel === 'Ophanim')    allD(1);
    else if (srLabel === 'Cherubim')   allD(2);
  }
  if (raceId === 'demon') {
    if      (srLabel === 'Lucifer')   allD(2);
    else if (srLabel === 'Mammon')    allD(-2);
    else if (srLabel === 'Asmodeus')  allD(-1);
    else if (srLabel === 'Belphegor') deltas.speed = (deltas.speed || 0) - 4;
  }

  // 5. Roll each stat
  const statRaceId = (raceId === 'skeleton' && subrace?.raceId) ? subrace.raceId : raceId;
  const stats = {};
  for (const sk of statKeys) {
    // Skeleton: IQ always 1
    if (raceId === 'skeleton' && sk === 'iq') { stats[sk] = 1; continue; }
    let w = [...(CG_STAT_WEIGHTS[sk][statRaceId] || Array(10).fill(10))];
    // Constraints
    if (raceId === 'human' && srLabel === 'Vàng' && sk === 'iq')
      for (let i = 0; i < 4; i++) w[i] = 0;
    if (raceId === 'human' && srLabel === 'Đen'  && sk === 'durability')
      for (let i = 0; i < 4; i++) w[i] = 0;
    const raw = _wcRandIdx(w) + 1;
    stats[sk] = Math.max(1, raw + (deltas[sk] || 0));
  }

  // Giant: IQ vs STR swap (applied after IQ roll, mirrors chargen)
  if (raceId === 'giant') {
    const iiq = stats.iq, istr = stats.strength;
    if      (iiq  > istr) { stats.iq = iiq + 5; stats.strength = Math.max(1, istr - 5); }
    else if (istr > iiq)  { stats.strength = istr + 5; stats.iq = Math.max(1, iiq - 5); }
    else                  { stats.iq += 3; stats.strength += 3; }
  }
  // Dragon Flame: +2 lowest stat (applied after MA roll)
  if (raceId === 'dragon' && srLabel === 'Flame') {
    const lo = statKeys.reduce((a, b) => stats[a] <= stats[b] ? a : b);
    stats[lo] += 2;
  }
  // Primordial Air: +1 lowest
  if (raceId === 'primordial' && srLabel === 'Air') {
    const lo = statKeys.reduce((a, b) => stats[a] <= stats[b] ? a : b);
    stats[lo] += 1;
  }
  // Primordial Water: +1 highest
  if (raceId === 'primordial' && srLabel === 'Water') {
    const hi = statKeys.reduce((a, b) => stats[a] >= stats[b] ? a : b);
    stats[hi] += 1;
  }

  // 6. Has weapon (80/20, certain subraces guaranteed)
  const guaranteedArmed = (raceId === 'human' && srLabel === 'Trắng') ||
                          (raceId === 'goblin' && srLabel === '×100,000');
  const hasWeapon = guaranteedArmed || (Math.random() < 0.8);

  // 7. Weapon — nếu championship unique pool còn hàng, 30% cơ hội nhận unique weapon
  let weapon;
  if (hasWeapon) {
    const uniquePool = state.championship?.uniquePool;
    const availableUniques = (typeof WEAPON_DEFS !== 'undefined')
      ? WEAPON_DEFS.filter(w => w.unique && uniquePool?.has?.(w.id))
      : [];
    if (availableUniques.length > 0 && Math.random() < 0.30) {
      // Chọn ngẫu nhiên 1 unique weapon còn trong pool
      const picked = availableUniques[Math.floor(Math.random() * availableUniques.length)];
      weapon = picked.id;
      if (typeof claimUnique === 'function') claimUnique(weapon);
    } else {
      weapon = CG_WEAPONS_ARMED[Math.floor(Math.random() * CG_WEAPONS_ARMED.length)].id;
    }
  } else {
    weapon = 'fists';
  }

  // 8. Skill count (weighted per race)
  const scWeights = CG_SKILL_COUNT_WEIGHTS[raceId] || Array(5).fill(20);
  let skillCount = _wcRandIdx(scWeights);
  // Subrace skill bonus — mirrors getSubraceSkillBonus()
  if (raceId === 'dragon'     && srLabel === 'Flame')     skillCount += 1;
  if (raceId === 'dragon'     && srLabel === 'Amethyst')  skillCount += 4;
  if (raceId === 'primordial' && srLabel === 'Fire')      skillCount += 1;
  if (raceId === 'angel'      && srLabel === 'Powers')    skillCount += 1;
  if (raceId === 'angel'      && srLabel === 'Dominions') skillCount += 3;
  // Demon Beelzebub: always 0 skills
  if (raceId === 'demon'      && srLabel === 'Beelzebub') skillCount = 0;

  // 8.5 Char Dev — mỗi fill character nhận 1 chardev spin (giống normal chargen)
  // blessed_chaos cho thêm 2 devs; isekai bị loại hoàn toàn
  const pickedDevIds  = [];   // ids sẽ lưu vào charDevs[]
  const specialSkills = [];   // skills từ jjk/jojo/onepiece/summoner
  let extraSkillsFromDev = 0;
  let madnessActive      = false;

  const _bulkApplyDev = (devPool) => {
    const filtered = devPool.filter(d => d.id !== 'isekai');
    if (!filtered.length) return;
    const picked = filtered[_wcRandIdx(filtered.map(d => d.weight))];
    pickedDevIds.push(picked.id);

    const _SK  = ['strength','speed','durability','iq','battleiq','ma'];
    const _get = k => stats[k] ?? 5;
    const _set = (k, v) => { stats[k] = Math.max(0, v); };

    switch (picked.id) {
      case 'inversion':
        for (const k of _SK) stats[k] = Math.max(1, Math.min(10, 11 - stats[k]));
        break;

      case 'blessed_chaos': {
        const maxKey = _SK.reduce((a, b) => _get(a) >= _get(b) ? a : b);
        _set(maxKey, _get(maxKey) - 1);
        // +2 extra devs — exclude blessed_chaos itself to avoid loop
        const poolNoBC = devPool.filter(d => d.id !== 'isekai' && d.id !== 'blessed_chaos');
        _bulkApplyDev(poolNoBC);
        _bulkApplyDev(poolNoBC);
        break;
      }

      case 'braindead':
        _set('iq',       _get('iq')       - 2);
        _set('battleiq', _get('battleiq') + 2);
        break;

      case 'madness':
        madnessActive = true;
        _set('strength', _get('strength') + 2);
        _set('speed',    _get('speed')    + 2);
        _set('ma',       _get('ma')       + 2);
        break;

      case 'too_horny':
        _set('strength',   _get('strength')   + 3);
        _set('durability', _get('durability') + 2);
        stats.iq = 0;
        break;

      case 'kungfu':
        _set('durability', _get('durability') + 2);
        _set('ma',         _get('ma')         + 2);
        break;

      case 'lost_arm':  _set('ma',    _get('ma')    - 4); break;
      case 'lost_leg':  _set('speed', _get('speed') - 4); break;

      case 'cultivation':
        _set('battleiq', _get('battleiq') + 2);
        _set('ma',       _get('ma')       + 3);
        break;

      case 'become_woke':
        _set('iq',         _get('iq')         - 3);
        _set('strength',   _get('strength')   + 1);
        _set('durability', _get('durability') + 1);
        break;

      case 'old_age':
        _set('iq',         _get('iq')         + 2);
        _set('battleiq',   _get('battleiq')   + 1);
        _set('durability', _get('durability') - 1);
        break;

      case 'no_family':
        extraSkillsFromDev += 2;
        break;

      case 'fates_trick': {
        const minKey = _SK.reduce((a, b) => _get(a) <= _get(b) ? a : b);
        const maxKey = _SK.reduce((a, b) => _get(a) >= _get(b) ? a : b);
        if (Math.random() < 0.5) _set(minKey, _get(minKey) * 2);
        else                     _set(maxKey, Math.ceil(_get(maxKey) / 2));
        break;
      }

      case 'patkinsion':
      case 'dungeon_crawler':
        // Handled at runtime via ball.charDevs — no stat effect
        break;

      case 'finality':
        if (typeof CG_RACES !== 'undefined') {
          const raceEntry = CG_RACES.find(r => r.id === raceId);
          if (raceEntry) raceEntry.weight = 0;
        }
        break;

      case 'jjk': {
        const JJK_IDS = [
          'jjk_domain_malevolent', 'jjk_domain_unlimited', 'jjk_domain_chimera',
          'jjk_ct_command', 'jjk_ct_blackflash', 'jjk_ct_swap', 'jjk_ct_blood',
        ];
        const avail = JJK_IDS.filter(id => {
          const def = typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === id) : null;
          if (!def) return false;
          if (def.category === 'jjk_domain')
            return typeof isUniqueAvailable === 'function' ? isUniqueAvailable(id) : true;
          return true;
        });
        if (avail.length > 0) {
          const pickedId = avail[Math.floor(Math.random() * avail.length)];
          const def = typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === pickedId) : null;
          if (def) {
            specialSkills.push(pickedId);
            if (def.category === 'jjk_domain' && typeof claimUniqueItem === 'function')
              claimUniqueItem(pickedId);
            // Blackflash forces fists + +1 MA
            if (pickedId === 'jjk_ct_blackflash') {
              weapon = 'fists';
              _set('ma', _get('ma') + 1);
            }
          }
        }
        break;
      }

      case 'jojo': {
        const JOJO_STANDS   = ['jojo_stand_star','jojo_stand_world','jojo_stand_kq','jojo_stand_ge'];
        const JOJO_SUPPORTS = ['jojo_support_remote','jojo_support_senses','jojo_support_evolution'];
        const avail = [...JOJO_STANDS, ...JOJO_SUPPORTS].filter(id => {
          const def = typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === id) : null;
          if (!def) return false;
          if (def.category === 'jojo_stand')
            return typeof isUniqueAvailable === 'function' ? isUniqueAvailable(id) : true;
          return true;
        });
        if (avail.length > 0) {
          const pickedId = avail[Math.floor(Math.random() * avail.length)];
          const def = typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === pickedId) : null;
          if (def) {
            specialSkills.push(pickedId);
            if (def.category === 'jojo_stand' && typeof claimUniqueItem === 'function')
              claimUniqueItem(pickedId);
          }
        }
        break;
      }

      case 'onepiece': {
        const OP_HAKIS  = ['op_haki_obs', 'op_haki_arm', 'op_haki_conq'];
        const OP_FRUITS = ['op_fruit_goro','op_fruit_tori','op_fruit_mera','op_fruit_ryu',
                           'op_fruit_hito','op_fruit_neko','op_fruit_pika'];
        const avail = [...OP_HAKIS, ...OP_FRUITS].filter(id => {
          const def = typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === id) : null;
          if (!def) return false;
          if (def.category === 'op_fruit')
            return typeof isUniqueAvailable === 'function' ? isUniqueAvailable(id) : true;
          return true;
        });
        if (avail.length > 0) {
          const pickedId = avail[Math.floor(Math.random() * avail.length)];
          const def = typeof SKILL_DEFS !== 'undefined' ? SKILL_DEFS.find(s => s.id === pickedId) : null;
          if (def) {
            specialSkills.push(pickedId);
            if (def.category === 'op_fruit' && typeof claimUniqueItem === 'function')
              claimUniqueItem(pickedId);
          }
        }
        break;
      }

      case 'summoner': {
        const avail = typeof SKILL_DEFS !== 'undefined'
          ? SKILL_DEFS.filter(s => s.category === 'summon').map(s => s.id)
          : [];
        if (avail.length > 0)
          specialSkills.push(avail[Math.floor(Math.random() * avail.length)]);
        break;
      }
    }
  };

  // 1 chardev spin per fill character (mirrors normal chargen)
  _bulkApplyDev(CHARDEV_POOL);

  // Apply chardev effects on skill count
  if (madnessActive) skillCount = 0;
  else               skillCount += extraSkillsFromDev;

  // 9. Pick skills (Fisher-Yates shuffle, no replacement)
  const skills = [];
  if (skillCount > 0 && typeof SKILL_DEFS !== 'undefined') {
    const effectiveWeapon = (typeof WEAPON_MAP !== 'undefined' && WEAPON_MAP[weapon]?.baseWeapon) || weapon;
    const pool = SKILL_DEFS
      .filter(s => !s.unique && (!s.weapon || s.weapon === effectiveWeapon))
      .map(s => s.id);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    for (let i = 0; i < Math.min(skillCount, pool.length); i++) skills.push(pool[i]);
  }

  // Merge special skills from chardev (jjk/jojo/onepiece/summoner) — no duplicates
  for (const sid of specialSkills) {
    if (!skills.includes(sid)) skills.push(sid);
  }

  return {
    id: Date.now() + Math.random(),
    name, race: race.id, raceName: race.name, raceEmoji: race.emoji,
    subrace, stats, weapon,
    color: generateRadoserColor(cgRoster.length),
    skills,
    charDevs: pickedDevIds,
  };
}

// ── Modal helpers ────────────────────────────────────────────
function _bulkUpdateHint() {
  const n = Math.min(128, Math.max(1, parseInt(document.getElementById('bulkCountInput')?.value) || 0));
  const el = document.getElementById('bulkCounterHint');
  if (!el) return;
  el.textContent = `${n} Radoser sẽ được thêm (roster: ${cgRoster.length} → ${cgRoster.length + n})`;
  el.className = 'bulk-hint' + (n > 0 ? ' ready' : '');
}

function openBulkCreate() {
  const modal = document.getElementById('bulkCreateModal');
  const input = document.getElementById('bulkCountInput');
  document.getElementById('bulkResult').innerHTML = '';
  input.value = 10;
  _bulkUpdateHint();
  modal.style.display = 'flex';
  setTimeout(() => input.select(), 80);
}

function closeBulkCreate() {
  document.getElementById('bulkCreateModal').style.display = 'none';
}

function confirmBulkCreate() {
  const count = Math.min(128, Math.max(1, parseInt(document.getElementById('bulkCountInput').value) || 0));
  if (count < 1) return;

  const btn = document.getElementById('bulkConfirmBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Creating…';

  // Synchronous — fast enough for 128 entries
  const created = [];
  for (let i = 0; i < count; i++) {
    const char = bulkCreateOne();
    cgRoster.push(char);
    created.push(char);
  }
  localStorage.setItem('cgRoster', JSON.stringify(cgRoster));
  renderRoster();
  renderHeroShowcase();
  buildFightersPanel();

  // Race breakdown summary
  const raceCounts = {};
  for (const c of created) {
    const key = c.raceEmoji + ' ' + c.raceName;
    raceCounts[key] = (raceCounts[key] || 0) + 1;
  }
  const raceStr = Object.entries(raceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([r, n]) => `${r} ×${n}`)
    .join('  ·  ');

  document.getElementById('bulkResult').innerHTML =
    `<div class="bulk-done">✅ Đã tạo <b>${count}</b> Radosers<br>
     <span class="bulk-race-summary">${raceStr}</span></div>`;

  btn.disabled = false;
  btn.textContent = '⚡ Tạo thêm';
  _bulkUpdateHint();
}

// ── Wire events ──────────────────────────────────────────────
document.getElementById('bulkCreateBtn').addEventListener('click', openBulkCreate);
document.getElementById('bulkCloseBtn').addEventListener('click', closeBulkCreate);
document.getElementById('bulkCancelBtn').addEventListener('click', closeBulkCreate);
document.getElementById('bulkConfirmBtn').addEventListener('click', confirmBulkCreate);
document.getElementById('bulkCreateModal').addEventListener('click', e => {
  if (e.target === document.getElementById('bulkCreateModal')) closeBulkCreate();
});
document.getElementById('bulkCountInput').addEventListener('input', _bulkUpdateHint);
document.getElementById('bulkCountInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') confirmBulkCreate();
  if (e.key === 'Escape') closeBulkCreate();
});
