// ============================================================
// CONFIG LOADER
// Snapshots taken at parse time (after constants.js + chargen-data.js load).
// ============================================================

// ── Defaults snapshot ─────────────────────────────────────
const _RACE_DEFAULTS    = JSON.stringify(
  CG_RACES.map(r => ({ id: r.id, name: r.name, emoji: r.emoji, weight: r.weight }))
);
const _STAT_DEFAULTS    = JSON.stringify(window.STAT_FORMULAS);
const _COMBAT_DEFAULTS  = JSON.stringify(window.COMBAT_FORMULAS);
const _SKILL_DEFAULTS   = JSON.stringify(window.SKILL_FORMULAS);
const _RACE_FM_DEFAULTS = JSON.stringify(window.RACE_FORMULAS);

// ── Validate helpers ──────────────────────────────────────
function _validateRace(data) {
  const races = Array.isArray(data) ? data : data.races;
  if (!Array.isArray(races)) throw new Error('"races" phải là một mảng');
  races.forEach((r, i) => {
    if (!r.id)   throw new Error(`Race[${i}]: thiếu "id"`);
    if (!r.name) throw new Error(`Race[${i}]: thiếu "name"`);
    if (!r.emoji) throw new Error(`Race[${i}]: thiếu "emoji"`);
    if (typeof r.weight !== 'number' || r.weight < 0)
      throw new Error(`Race[${i}]: "weight" phải là số >= 0`);
  });
  return races;
}

function _validateStats(data) {
  const allowed = { hp:['base','perDur'], speed:['base','perSpd'],
    crit:['chancePerIQ','baseMult','extraPerIQAbove10'],
    evade:['perBIQ'], deflect:['perMA'] };
  Object.keys(data).forEach(section => {
    if (!allowed[section]) throw new Error(`Không nhận ra section stats."${section}"`);
    Object.keys(data[section]).forEach(key => {
      if (!allowed[section].includes(key))
        throw new Error(`stats.${section}: không nhận ra key "${key}"`);
      if (typeof data[section][key] !== 'number')
        throw new Error(`stats.${section}.${key} phải là số`);
    });
  });
}

function _validateCombat(data) {
  const allowed = ['rageMult','rageThresholdSec','strMult','daggerMAScaling','fistsMAFlat'];
  Object.keys(data).forEach(key => {
    if (!allowed.includes(key))        throw new Error(`formula.combat: không nhận ra key "${key}"`);
    if (typeof data[key] !== 'number') throw new Error(`formula.combat.${key} phải là số`);
  });
}

function _validateSkillFormulas(data) {
  const knownSkills = Object.keys(window.SKILL_FORMULAS);
  Object.keys(data).forEach(skillId => {
    if (!knownSkills.includes(skillId))
      throw new Error(`formula.skills: không nhận ra skill "${skillId}"`);
    const params = data[skillId];
    const knownKeys = Object.keys(window.SKILL_FORMULAS[skillId]);
    Object.keys(params).forEach(k => {
      if (!knownKeys.includes(k))
        throw new Error(`formula.skills.${skillId}: không nhận ra key "${k}"`);
      if (typeof params[k] !== 'number')
        throw new Error(`formula.skills.${skillId}.${k} phải là số`);
    });
  });
}

function _validateRaceFormulas(data) {
  const knownRaces = Object.keys(window.RACE_FORMULAS);
  Object.keys(data).forEach(raceId => {
    if (!knownRaces.includes(raceId))
      throw new Error(`formula.races: không nhận ra race "${raceId}"`);
    // Deep merge check — just ensure all leaves are numbers
    const checkNums = (obj, path) => {
      Object.keys(obj).forEach(k => {
        const val = obj[k];
        if (typeof val === 'object') checkNums(val, `${path}.${k}`);
        else if (typeof val !== 'number')
          throw new Error(`formula.races.${path}.${k} phải là số`);
      });
    };
    checkNums(data[raceId], raceId);
  });
}

// ── Apply functions ───────────────────────────────────────
function applyRaceConfig(data) {
  const races = _validateRace(data);
  races.forEach(incoming => {
    const orig = CG_RACES.find(r => r.id === incoming.id);
    if (orig) { orig.name = incoming.name; orig.emoji = incoming.emoji; orig.weight = incoming.weight; }
  });
}

function applyStatConfig(data) {
  _validateStats(data);
  const SF = window.STAT_FORMULAS;
  ['hp','speed','crit','evade','deflect'].forEach(s => {
    if (data[s]) Object.assign(SF[s], data[s]);
  });
}

function applyFormulaConfig(data) {
  // Supports a combined { combat:{}, skills:{}, races:{} } or a bare combat object
  const hasSections = data.combat || data.skills || data.races;
  const combat = hasSections ? (data.combat || {}) : data;
  const skills = data.skills || {};
  const races  = data.races  || {};

  if (Object.keys(combat).length) { _validateCombat(combat);       Object.assign(window.COMBAT_FORMULAS, combat); }
  if (Object.keys(skills).length) { _validateSkillFormulas(skills); _deepMerge(window.SKILL_FORMULAS, skills); }
  if (Object.keys(races).length)  { _validateRaceFormulas(races);   _deepMerge(window.RACE_FORMULAS,  races);  }
}

function _deepMerge(target, source) {
  Object.keys(source).forEach(k => {
    if (typeof source[k] === 'object' && !Array.isArray(source[k]) && target[k]) {
      _deepMerge(target[k], source[k]);
    } else {
      target[k] = source[k];
    }
  });
}

function resetAllConfigs() {
  // Race wheel
  JSON.parse(_RACE_DEFAULTS).forEach(d => {
    const orig = CG_RACES.find(r => r.id === d.id);
    if (orig) { orig.name = d.name; orig.emoji = d.emoji; orig.weight = d.weight; }
  });
  // Stat formulas
  const SF = window.STAT_FORMULAS;
  const statDef = JSON.parse(_STAT_DEFAULTS);
  Object.keys(statDef).forEach(s => Object.assign(SF[s], statDef[s]));
  // Combat formulas
  Object.assign(window.COMBAT_FORMULAS, JSON.parse(_COMBAT_DEFAULTS));
  // Skill formulas
  _deepMerge(window.SKILL_FORMULAS, JSON.parse(_SKILL_DEFAULTS));
  // Race formulas
  _deepMerge(window.RACE_FORMULAS,  JSON.parse(_RACE_FM_DEFAULTS));
}

// ── Sample JSON generators (current live values) ──────────
function _clCurrentRaceJSON() {
  return JSON.stringify({
    races: CG_RACES.map(r => ({ id: r.id, name: r.name, emoji: r.emoji, weight: r.weight }))
  }, null, 2);
}
function _clCurrentStatJSON() { return JSON.stringify(window.STAT_FORMULAS, null, 2); }
function _clCurrentFormulaJSON() {
  return JSON.stringify({
    combat: window.COMBAT_FORMULAS,
    skills: window.SKILL_FORMULAS,
    races:  window.RACE_FORMULAS,
  }, null, 2);
}

// ── UI ────────────────────────────────────────────────────
function openConfigLoader() {
  document.getElementById('config-loader-modal').style.display = 'flex';
  _clSwitchTab('race');
}

function closeConfigLoader() {
  document.getElementById('config-loader-modal').style.display = 'none';
}

function _clSwitchTab(tab) {
  ['race','stats','formula'].forEach(t => {
    document.getElementById(`cl-tab-${t}`).classList.toggle('cl-tab-active', t === tab);
    document.getElementById(`cl-pane-${t}`).style.display = t === tab ? 'flex' : 'none';
  });
  const generators = { race: _clCurrentRaceJSON, stats: _clCurrentStatJSON, formula: _clCurrentFormulaJSON };
  const ta = document.getElementById(`cl-textarea-${tab}`);
  if (ta && !ta.dataset.dirty) ta.value = generators[tab]();
}

function _clApply(tab) {
  const ta = document.getElementById(`cl-textarea-${tab}`);
  let data;
  try {
    data = JSON.parse(ta.value);
  } catch(e) {
    _clSetStatus(tab, '❌ JSON không hợp lệ: ' + e.message, 'error'); return;
  }
  try {
    if (tab === 'race')    applyRaceConfig(data);
    if (tab === 'stats')   applyStatConfig(data);
    if (tab === 'formula') applyFormulaConfig(data);
    ta.dataset.dirty = '';
    _clSetStatus(tab, '✅ Áp dụng thành công!', 'ok');
  } catch(e) {
    _clSetStatus(tab, '❌ ' + e.message, 'error');
  }
}

function _clDownload(tab) {
  const generators = { race: _clCurrentRaceJSON, stats: _clCurrentStatJSON, formula: _clCurrentFormulaJSON };
  const filenames  = { race: 'race.json', stats: 'stats.json', formula: 'formula.json' };
  const blob = new Blob([generators[tab]()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filenames[tab];
  a.click();
}

function _clUpload(tab) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json';
  inp.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const ta = document.getElementById(`cl-textarea-${tab}`);
      ta.value = ev.target.result;
      ta.dataset.dirty = '1';
      _clSetStatus(tab, `📄 Đã load "${file.name}" — nhấn Apply để áp dụng`, 'info');
    };
    reader.readAsText(file);
  };
  inp.click();
}

function _clResetAll() {
  if (!confirm('Khôi phục tất cả config về cài đặt gốc?')) return;
  resetAllConfigs();
  ['race','stats','formula'].forEach(t => {
    const ta = document.getElementById(`cl-textarea-${t}`);
    if (ta) delete ta.dataset.dirty;
    _clSetStatus(t, '🔄 Đã khôi phục về mặc định', 'ok');
  });
  const activeTab = document.querySelector('.cl-tab-active')?.dataset.tab || 'race';
  _clSwitchTab(activeTab);
}

function _clSetStatus(tab, msg, type) {
  const el = document.getElementById(`cl-status-${tab}`);
  if (!el) return;
  el.textContent = msg;
  el.className = 'cl-status cl-status-' + type;
}
