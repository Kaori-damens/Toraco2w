// ============================================================
// ANALYTICS — A: Match Tracking | B: Simulation | C: Heuristic
// ============================================================

const ANALYTICS_KEY = 'rng_analytics_v1';
const ANALYTICS_MAX = 500;

// ── A: MATCH TRACKING ──────────────────────────────────────

function _aDB() {
  try { return JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '{"matches":[]}'); }
  catch(e) { return { matches: [] }; }
}

// Called from result.js after every 1v1 / FFA match
function trackMatchAnalytics({ duration, mode, winners, losers }) {
  if (!winners?.length) return;
  const db = _aDB();
  db.matches.unshift({ ts: Date.now(), duration, mode, winners, losers });
  if (db.matches.length > ANALYTICS_MAX) db.matches.length = ANALYTICS_MAX;
  try { localStorage.setItem(ANALYTICS_KEY, JSON.stringify(db)); } catch(e) {}
}

function _extractBallData(ball, isWinner) {
  return {
    name:   ball.charName  || '?',
    race:   ball.charRace  || 'unknown',
    weapon: ball.weaponDef?.id || 'unknown',
    skills: [...(ball.skills || [])],
    stats:  {
      str: ball.charSTR ?? 5, spd: ball.charSPD ?? 5,
      dur: ball.charDUR ?? 5, iq:  ball.charIQ  ?? 5,
      biq: ball.charBIQ ?? 5, ma:  ball.charMA  ?? 5,
    },
    damageDealt: ball.stats?.damageDone  ?? 0,
    damageTaken: ball.stats?.damageTaken ?? 0,
    parries:     ball.stats?.parries     ?? 0,
    hits:        ball.stats?.hits        ?? 0,
    evades:      ball.stats?.evades      ?? 0,
    hpLeft:      isWinner ? Math.max(0, ball.hp) : 0,
    isWinner,
  };
}

// Build match data from current state — call at end of showResult()
function buildAndTrackMatch() {
  if (!state?.players?.length) return;
  const mode = state.matchMode || '1v1';
  const duration = (state.matchTime ?? 0) / 60;

  if (mode === '1v1' || mode === 'ffa') {
    const winners = [], losers = [];
    for (const ball of state.players) {
      const isWin = (ball === state.winner);
      (isWin ? winners : losers).push(_extractBallData(ball, isWin));
    }
    trackMatchAnalytics({ duration, mode, winners, losers });
  }
}

// ── A: AGGREGATE ───────────────────────────────────────────

function _aggregate(db) {
  const race = {}, weapon = {}, skill = {};

  const bump = (map, key, f) => {
    if (!key) return;
    if (!map[key]) map[key] = { wins: 0, losses: 0, total: 0,
                                hpLeftSum: 0, hpLeftCount: 0,
                                parries: 0, hits: 0 };
    map[key].total++;
    map[key].parries += (f.parries ?? 0);
    map[key].hits    += (f.hits    ?? 0);
    if (f.isWinner) {
      map[key].wins++;
      map[key].hpLeftSum   += (f.hpLeft ?? 0);
      map[key].hpLeftCount += 1;
    } else {
      map[key].losses++;
    }
  };

  for (const m of db.matches) {
    const all = [...(m.winners || []), ...(m.losers || [])];
    for (const f of all) {
      bump(race,   f.race,   f);
      bump(weapon, f.weapon, f);
      for (const sk of (f.skills || [])) {
        if (!skill[sk]) skill[sk] = { wins: 0, losses: 0, total: 0 };
        skill[sk].total++;
        if (f.isWinner) skill[sk].wins++; else skill[sk].losses++;
      }
    }
  }
  return { race, weapon, skill };
}

function _winPct(obj) {
  return obj.total ? ((obj.wins / obj.total) * 100).toFixed(1) : '–';
}

function _sortedTable(map) {
  return Object.entries(map)
    .filter(([,v]) => v.total >= 3)
    .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total));
}

// ── B: SIMULATION ──────────────────────────────────────────
// Simplified DPS model — not pixel-perfect but good for relative comparison

const SIM_WEAPON_DPS = {
  // dps = baseDamage × baseSpeed × STR_factor (calibrated from weapons.js values)
  fists:    { dps: 1.8, label: '🥊 Fists'    },
  sword:    { dps: 1.5, label: '⚔️ Sword'    },
  dagger:   { dps: 2.2, label: '🗡️ Dagger'   },
  spear:    { dps: 1.2, label: '🔱 Spear'    },
  bow:      { dps: 1.4, label: '🏹 Bow'      },
  scythe:   { dps: 1.3, label: '🌙 Scythe'   },
  hammer:   { dps: 1.0, label: '🔨 Hammer'   },
  shuriken: { dps: 1.7, label: '⭐ Shuriken' },
};

function _simFighter(cfg) {
  // cfg: { str, spd, dur, iq, biq, ma, weapon, skills }
  const str = Number(cfg.str) || 5;
  const spd = Number(cfg.spd) || 5;
  const dur = Number(cfg.dur) || 5;
  const hp  = 50 + dur * 10;
  const weaponDps = SIM_WEAPON_DPS[cfg.weapon]?.dps ?? 1.5;
  const dps = weaponDps * str * (1 + (spd - 5) * 0.03);
  return { hp, maxHp: hp, dps, shield: 0, phoenixUsed: false,
           dmgDealt: 0, cfg };
}

function _simApplySkills(atk, def, rawDmg) {
  let dmg = rawDmg;
  const sk  = atk.cfg.skills || [];
  const dsk = def.cfg.skills || [];
  const iq  = Number(atk.cfg.iq)  || 5;
  const dbiq = Number(def.cfg.biq) || 5;  // defender's BIQ for adaptation

  if (sk.includes('berserker') && atk.hp / atk.maxHp < 0.30) dmg *= (1.2 + iq * 0.03);
  if (sk.includes('sharp_eye') && Math.random() < 0.10)       dmg *= 2.0;
  if (sk.includes('predator')  && atk.hp > def.hp)             dmg *= 1.15;

  if (dsk.includes('thick_hide'))   dmg *= 0.90;
  if (dsk.includes('adaptation') && Math.random() < (0.15 + dbiq * 0.02))
    dmg *= (1 - (0.15 + dbiq * 0.02));

  return Math.max(0, dmg);
}

// Run one simulated 1v1 match — returns 0 (f1 wins), 1 (f2 wins), -1 (draw/timeout)
function _runOneSim(f1cfg, f2cfg) {
  const f1 = _simFighter(f1cfg);
  const f2 = _simFighter(f2cfg);

  const sk1 = f1cfg.skills || [];
  const sk2 = f2cfg.skills || [];

  if (sk1.includes('fortify')) f1.shield = 10 + (Number(f1cfg.biq) || 5) * 2;
  if (sk2.includes('fortify')) f2.shield = 10 + (Number(f2cfg.biq) || 5) * 2;

  const MAX_TICKS = 5400;
  for (let t = 0; t < MAX_TICKS; t++) {
    const tick1 = f1.dps / 60;
    const tick2 = f2.dps / 60;

    // War Cry: bonus on tick 0 (first hit)
    const wc1 = t === 0 && sk1.includes('war_cry') ? (1.5 + (Number(f1cfg.iq) || 5) * 0.05) : 1;
    const wc2 = t === 0 && sk2.includes('war_cry') ? (1.5 + (Number(f2cfg.iq) || 5) * 0.05) : 1;

    // Compute outgoing damage for both fighters simultaneously from current state
    let out1 = _simApplySkills(f1, f2, tick1 * wc1); // F1 → F2
    let out2 = _simApplySkills(f2, f1, tick2 * wc2); // F2 → F1

    // Shield absorption
    if (f2.shield > 0) { const a = Math.min(f2.shield, out1); f2.shield -= a; out1 -= a; }
    if (f1.shield > 0) { const a = Math.min(f1.shield, out2); f1.shield -= a; out2 -= a; }

    // Apply damage simultaneously
    f1.hp       -= out2;  f1.dmgDealt += out1;
    f2.hp       -= out1;  f2.dmgDealt += out2;

    // Phoenix: survive once
    if (f1.hp <= 0 && sk1.includes('phoenix') && !f1.phoenixUsed) { f1.hp = 1; f1.phoenixUsed = true; }
    if (f2.hp <= 0 && sk2.includes('phoenix') && !f2.phoenixUsed) { f2.hp = 1; f2.phoenixUsed = true; }

    // Vampiric: heal 5% of damage DEALT
    if (sk1.includes('vampiric')) f1.hp = Math.min(f1.maxHp, f1.hp + out1 * 0.05);
    if (sk2.includes('vampiric')) f2.hp = Math.min(f2.maxHp, f2.hp + out2 * 0.05);

    const f1Dead = f1.hp <= 0;
    const f2Dead = f2.hp <= 0;
    if (f1Dead && f2Dead) return -1;
    if (f1Dead) return 1;  // F2 wins
    if (f2Dead) return 0;  // F1 wins
  }
  // Timeout: higher HP wins
  if (Math.abs(f1.hp - f2.hp) < 0.001) return -1;
  return f1.hp > f2.hp ? 0 : 1;
}

// Run N simulations — returns { f1wins, f2wins, draws }
function runSimBatch(f1cfg, f2cfg, n) {
  let f1w = 0, f2w = 0, dr = 0;
  for (let i = 0; i < n; i++) {
    const r = _runOneSim(f1cfg, f2cfg);
    if (r === 0) f1w++;
    else if (r === 1) f2w++;
    else dr++;
  }
  return { f1wins: f1w, f2wins: f2w, draws: dr, total: n };
}

// ── C: HEURISTIC POINT BUDGET ──────────────────────────────
// Scale: ~10 pts = strong passive, ~5 pts = situational, ~15 pts = gamechanging

const SKILL_HEURISTIC = [
  // id, estimated pts, rationale
  ['iron_body',          9,  '+20 HP permanent — solid flat bonus'],
  ['thick_hide',         10, '-10% dmg taken always — reliable damage reduction'],
  ['swift',              7,  '+15% move speed — positioning advantage'],
  ['sharp_eye',          7,  '+10% crit chance — RNG but consistent over time'],
  ['extended_immunity',  5,  'Longer invincibility window — defensive niche'],
  ['heavy_mass',         4,  'Harder knockback — situational, mostly defensive'],
  ['war_cry',            9,  'First hit ×1.55–2.0/round — strong opener burst'],
  ['fortify',            10, 'Shield 12–30 HP/round — scales BIQ, consistent'],
  ['adrenaline',         7,  '+50% speed for 5s/round — strong opener mobility'],
  ['predator',           6,  '+15% dmg when winning HP — snowball effect'],
  ['first_blood',        9,  'Stun 0.4–1.0s first hit — tempo control'],
  ['berserker',          6,  '×1.23–1.5 dmg below 30% HP — comeback mechanic'],
  ['phoenix',            13, 'Survive killing blow once/round — extremely strong'],
  ['counter',            9,  '×1.55–2.0 dmg after parry — skill-expressive'],
  ['vampiric',           5,  '5% lifesteal on hit — low value, sustained'],
  ['parry_tech_1',       5,  'Spin reversal on parry — low impact utility'],
  ['parry_tech_2',       10, 'No knockback + spin boost + counter window on parry'],
  ['parry_tech_3',       8,  'Full weapon body parry + 50% dmg on fists clash'],
  ['momentum',           5,  '+10% SPD per FFA kill — FFA only, conditional'],
  ['shadow_step',        6,  'Teleport on evade — disruption/survival'],
  ['blood_frenzy',       5,  '+25 HP per kill — FFA only, conditional'],
  ['flow_state',         7,  '+MA×1% SPD per hit stack, resets on damage'],
  ['read_react',         8,  'BIQ×3.5% counter chance on being hit — reactive'],
  ['exploit',            7,  '(IQ+BIQ)×1% chance ×1.5–2.0 hit — scales with both'],
  ['deflection',         7,  'MA×2% complete negate — stacks nicely'],
  ['mind_break',         7,  'IQ gap → reduce enemy dmg — scales both stats'],
  ['learning',           5,  '+5% dmg per loss stack — catch-up, limited'],
  ['adaptation',         6,  '-15–35% dmg from killing weapon type on loss'],
  ['survivor',           4,  '+10 max HP on low-HP win — very conditional'],
  ['veteran',            5,  '+1 random stat on win — snowball, low expected'],
  ['mastery',            4,  'MA×3% weapon dmg boost on injured win — niche'],
  ['perfectionist',      5,  '+15% dmg on high-HP win / -10% on injured win'],
  ['blood_mark',         6,  'Loser curses winner to start next match at 80% HP'],
  ['copycat',            5,  'BIQ×5% chance to copy a skill on win — RNG'],
  ['usurp',              14, 'Steal enemy weapon at round start — massive swing'],
  ['shadow_clone',       11, 'First 2 hits absorbed — strong early safety'],
  // Weapon skills
  ['iron_knuckles',      7,  'Fists: stacking dmg per hit per round'],
  ['brawler_rhythm',     8,  'Fists: every 5th hit ×2.5'],
  ['combo_breaker',      6,  'Fists: auto counter at 3+ stacks'],
  ['rage_fists',         7,  'Fists: +35% attack speed below 50% HP'],
  ['guard_stance',       7,  'Sword: dmg reduction on cooldown'],
  ['duel_instinct',      6,  'Sword: +30% dmg last opponent'],
  ['parry_punish',       9,  'Sword: ×2 dmg for 2–4s after parry'],
  ['poison_blade',       6,  'Dagger: 1.5 dmg/3s for 12s every 5th hit'],
  ['flurry_finisher',    8,  'Dagger: every 5th consecutive hit ×2.5'],
  ['shadow_strike',      7,  'Dagger: guaranteed crit every 10s'],
  ['long_reach',         5,  'Spear: +20px reach per round'],
  ['skewer',             8,  'Spear: pin weapon 0.4–1.0s on hit'],
  ['zone_control',       5,  'Spear: 0.5 dmg/s aura within 150px'],
  ['reapers_mark',       9,  'Scythe: +80% dmg below 30% HP — execute'],
  ['soul_harvest',       5,  'Scythe: +10 HP per kill — FFA value'],
  ['grim_presence',      5,  'Scythe: enemy -12% swing speed in 80px'],
  ['seismic_slam',       7,  'Hammer: slow all enemies 120px on hit'],
  ['heavy_momentum',     8,  'Hammer: +20% dmg per consecutive hit (max 3)'],
  ['ground_pound',       6,  'Hammer: wall bounce → nearest weapon locked 25f'],
  ['sniper',             9,  'Bow: ×(1.4+IQ×0.03) on aimed shots'],
  ['volley',             8,  'Bow: ×(1.5+IQ×0.05) on rapid shots'],
];

// ── UI RENDERING ───────────────────────────────────────────

function _makeTable(headers, rows, colClass) {
  const ths = headers.map(h => `<th>${h}</th>`).join('');
  const trs = rows.map(r =>
    '<tr>' + r.map((c, i) => `<td class="${colClass?.[i] || ''}">${c}</td>`).join('') + '</tr>'
  ).join('');
  return `<table class="an-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

function _renderStats() {
  const db  = _aDB();
  const agg = _aggregate(db);
  const n   = db.matches.length;

  // ── Helpers ──
  const wpct = v => v.total ? (v.wins / v.total * 100).toFixed(1) : null;

  const filtered = map => Object.entries(map).filter(([,v]) => v.total >= 3);

  const bestWorst = (map) => {
    const rows = filtered(map).filter(([,v]) => wpct(v) !== null);
    if (!rows.length) return { best: '–', bestPct: '', worst: '–', worstPct: '' };
    rows.sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total));
    const b = rows[0], w = rows[rows.length - 1];
    return {
      best:     b[0], bestPct:  `${wpct(b[1])}%`,
      worst:    w[0], worstPct: `${wpct(w[1])}%`,
    };
  };

  const mostWinsLosses = (map) => {
    const rows = filtered(map);
    if (!rows.length) return { mostWins: '–', mostWinsN: '', mostLosses: '–', mostLossesN: '' };
    const byWins   = [...rows].sort((a, b) => b[1].wins   - a[1].wins);
    const byLosses = [...rows].sort((a, b) => b[1].losses - a[1].losses);
    return {
      mostWins:    byWins[0][0],   mostWinsN:   `${byWins[0][1].wins}W`,
      mostLosses:  byLosses[0][0], mostLossesN: `${byLosses[0][1].losses}L`,
    };
  };

  const avgHpLeft = v => v.hpLeftCount > 0
    ? (v.hpLeftSum / v.hpLeftCount).toFixed(1) : '–';

  // ── Race table ──
  const raceRows = _sortedTable(agg.race).map(([k, v]) =>
    [k, v.wins, v.losses, v.total, `${_winPct(v)}%`, avgHpLeft(v)]);

  // ── Weapon table ──
  const parryRate = v => v.hits > 0 ? (v.parries / v.hits * 100).toFixed(1) : '–';
  const weaponRows = _sortedTable(agg.weapon).map(([k, v]) =>
    [k, v.wins, v.losses, v.total, `${_winPct(v)}%`, avgHpLeft(v), `${parryRate(v)}%`]);

  // ── Skill table ──
  const skillRows = _sortedTable(agg.skill).map(([k, v]) => {
    const def = (typeof SKILL_MAP !== 'undefined') ? SKILL_MAP[k] : null;
    return [def ? def.name : k, v.wins, v.losses, v.total, `${_winPct(v)}%`];
  });

  // ── Highlights ──
  const rBW  = bestWorst(agg.race, 'race');
  const rML  = mostWinsLosses(agg.race);
  const wBW  = bestWorst(agg.weapon, 'weapon');
  const wML  = mostWinsLosses(agg.weapon);
  const wEntries = filtered(agg.weapon);
  const bestParryWeapon = wEntries.length
    ? wEntries.filter(([,v]) => v.hits > 0)
              .sort((a, b) => (b[1].parries / b[1].hits) - (a[1].parries / a[1].hits))[0]?.[0] ?? '–'
    : '–';

  const hl = (label, val, color, sub = '') =>
    `<div class="an-hl"><span class="an-hl-label">${label}</span><span class="an-hl-val" style="color:${color}">${val}${sub ? ` <span class="an-hl-sub">${sub}</span>` : ''}</span></div>`;

  const highlights = `
    <div class="an-highlights">
      <div class="an-hl-group">
        <div class="an-hl-title">🧬 Race</div>
        ${hl('🏆 Best winrate',  rBW.best,       '#44cc88', rBW.bestPct)}
        ${hl('💀 Worst winrate', rBW.worst,      '#ff4455', rBW.worstPct)}
        ${hl('⚔️ Most wins',    rML.mostWins,   '#ffaa22', rML.mostWinsN)}
        ${hl('💔 Most losses',  rML.mostLosses, '#ff7755', rML.mostLossesN)}
      </div>
      <div class="an-hl-group">
        <div class="an-hl-title">🗡️ Weapon</div>
        ${hl('🏆 Best winrate',      wBW.best,           '#44cc88', wBW.bestPct)}
        ${hl('💀 Worst winrate',     wBW.worst,          '#ff4455', wBW.worstPct)}
        ${hl('⚔️ Most wins',        wML.mostWins,       '#ffaa22', wML.mostWinsN)}
        ${hl('💔 Most losses',      wML.mostLosses,     '#ff7755', wML.mostLossesN)}
        ${hl('🛡️ Best parry rate',  bestParryWeapon,    '#aaddff')}
      </div>
    </div>`;

  return `
    <div class="an-header">
      <span>📊 <b>${n}</b> matches recorded (max ${ANALYTICS_MAX})</span>
      <button class="an-btn danger" onclick="clearAnalyticsData()">🗑️ Clear All</button>
    </div>
    ${n < 5 ? '<p class="an-note">⚠️ Need at least 5 matches for meaningful data.</p>' : ''}
    ${n >= 3 ? highlights : ''}
    <div class="an-grid3">
      <div>
        <h3>Race Stats</h3>
        ${_makeTable(['Race','W','L','Total','Win%','Avg HP Left'], raceRows, ['','an-w','an-l','','',''])}
      </div>
      <div>
        <h3>Weapon Stats</h3>
        ${_makeTable(['Weapon','W','L','Total','Win%','Avg HP Left','Parry%'], weaponRows, ['','an-w','an-l','','','',''])}
      </div>
      <div>
        <h3>Skill Win Rate</h3>
        ${_makeTable(['Skill','W','L','Total','Win%'], skillRows, ['','an-w','an-l','',''])}
      </div>
    </div>`;
}

function _renderSim() {
  const raceOpts = (typeof CG_RACES !== 'undefined')
    ? CG_RACES.map(r => `<option value="${r.id}">${r.emoji} ${r.name}</option>`).join('')
    : '';
  const weapOpts = Object.keys(SIM_WEAPON_DPS)
    .map(id => `<option value="${id}">${SIM_WEAPON_DPS[id].label}</option>`).join('');
  const skillOpts = (typeof SKILL_DEFS !== 'undefined')
    ? SKILL_DEFS.filter(s => !s.weapon && !s.unique)
        .map(s => `<option value="${s.id}">${s.name}</option>`).join('')
    : '';

  const statInputs = (prefix) => ['STR','SPD','DUR','IQ','BIQ','MA'].map(s =>
    `<label>${s} <input type="number" class="an-stat" id="${prefix}-${s.toLowerCase()}" value="5" min="1" max="20"></label>`
  ).join(' ');

  return `
    <p class="an-note">⚡ Simplified DPS model — good for relative comparison, not pixel-perfect.</p>
    <div class="an-sim-grid">
      <div class="an-fighter-cfg">
        <h3>Fighter 1</h3>
        <label>Race <select id="sim-r1">${raceOpts}</select></label>
        <label>Weapon <select id="sim-w1">${weapOpts}</select></label>
        <div class="an-stat-row">${statInputs('sim1')}</div>
        <label>Skills (hold Ctrl to multi-select)<br>
          <select id="sim-sk1" multiple size="5" class="an-skill-select">${skillOpts}</select>
        </label>
      </div>
      <div class="an-vs">VS</div>
      <div class="an-fighter-cfg">
        <h3>Fighter 2</h3>
        <label>Race <select id="sim-r2">${raceOpts}</select></label>
        <label>Weapon <select id="sim-w2">${weapOpts}</select></label>
        <div class="an-stat-row">${statInputs('sim2')}</div>
        <label>Skills (hold Ctrl to multi-select)<br>
          <select id="sim-sk2" multiple size="5" class="an-skill-select">${skillOpts}</select>
        </label>
      </div>
    </div>
    <div class="an-sim-ctrl">
      <button class="an-btn" onclick="runSimUI(100)">▶ Run 100</button>
      <button class="an-btn" onclick="runSimUI(1000)">▶▶ Run 1000</button>
    </div>
    <div id="sim-result" class="an-sim-result"></div>`;
}

function _renderHeuristic() {
  const sorted = [...SKILL_HEURISTIC].sort((a, b) => b[1] - a[1]);
  const maxPts = Math.max(...sorted.map(r => r[1]));

  const rows = sorted.map(([id, pts, note]) => {
    const def = (typeof SKILL_MAP !== 'undefined') ? SKILL_MAP[id] : null;
    const name = def ? def.name : id;
    const bar = `<div class="an-bar-bg"><div class="an-bar-fill" style="width:${Math.round(pts/maxPts*100)}%;background:${pts>=10?'#44cc88':pts>=7?'#ffaa22':'#4488ff'}"></div></div>`;
    const tier = pts >= 12 ? '🔴 S' : pts >= 9 ? '🟠 A' : pts >= 7 ? '🟡 B' : pts >= 5 ? '🟢 C' : '⚪ D';
    return [name, `${pts}`, bar, tier, note];
  });

  return `
    <p class="an-note">📋 Heuristic estimate — manual scoring based on effect type & magnitude. Not a simulation.</p>
    <div class="an-tier-legend">
      🔴 S = ≥12 pts (gamechanging) &nbsp;|&nbsp; 🟠 A = 9–11 &nbsp;|&nbsp;
      🟡 B = 7–8 &nbsp;|&nbsp; 🟢 C = 5–6 &nbsp;|&nbsp; ⚪ D = &lt;5
    </div>
    ${_makeTable(['Skill','Pts','Power','Tier','Rationale'], rows, ['','an-pts','an-bar-cell','an-tier','an-note-cell'])}`;
}

// ── PUBLIC API ─────────────────────────────────────────────

function clearAnalyticsData() {
  if (!confirm('Xóa toàn bộ dữ liệu analytics?')) return;
  localStorage.removeItem(ANALYTICS_KEY);
  renderAnalyticsTab('stats');
}

function runSimUI(n) {
  const get = id => parseFloat(document.getElementById(id)?.value) || 5;
  const getSkills = id => {
    const sel = document.getElementById(id);
    if (!sel) return [];
    return Array.from(sel.selectedOptions).map(o => o.value);
  };
  const f1 = { str: get('sim1-str'), spd: get('sim1-spd'), dur: get('sim1-dur'),
                iq: get('sim1-iq'), biq: get('sim1-biq'), ma: get('sim1-ma'),
                weapon: document.getElementById('sim-w1')?.value || 'sword',
                skills: getSkills('sim-sk1') };
  const f2 = { str: get('sim2-str'), spd: get('sim2-spd'), dur: get('sim2-dur'),
                iq: get('sim2-iq'), biq: get('sim2-biq'), ma: get('sim2-ma'),
                weapon: document.getElementById('sim-w2')?.value || 'sword',
                skills: getSkills('sim-sk2') };

  const t0  = performance.now();
  const res = runSimBatch(f1, f2, n);
  const ms  = (performance.now() - t0).toFixed(0);

  const p1  = (res.f1wins / n * 100).toFixed(1);
  const p2  = (res.f2wins / n * 100).toFixed(1);
  const pd  = (res.draws  / n * 100).toFixed(1);
  const col1 = parseFloat(p1) > 50 ? '#44cc88' : parseFloat(p1) < 50 ? '#ff4455' : '#ffaa22';
  const col2 = parseFloat(p2) > 50 ? '#44cc88' : parseFloat(p2) < 50 ? '#ff4455' : '#ffaa22';

  document.getElementById('sim-result').innerHTML = `
    <div class="an-sim-bars">
      <div class="an-sim-bar-wrap">
        <span>F1</span>
        <div class="an-bar-bg wide"><div class="an-bar-fill" style="width:${p1}%;background:${col1}"></div></div>
        <span style="color:${col1};font-weight:bold">${p1}%</span>
      </div>
      <div class="an-sim-bar-wrap">
        <span>F2</span>
        <div class="an-bar-bg wide"><div class="an-bar-fill" style="width:${p2}%;background:${col2}"></div></div>
        <span style="color:${col2};font-weight:bold">${p2}%</span>
      </div>
    </div>
    <p class="an-note">${n} trận | F1: ${res.f1wins}W | F2: ${res.f2wins}W | Draw: ${res.draws} | ${ms}ms</p>`;
}

let _activeATab = 'stats';

function renderAnalyticsTab(tab) {
  if (tab) _activeATab = tab;
  const wrap = document.getElementById('analytics-content');
  if (!wrap) return;

  // Update tab active state
  wrap.querySelectorAll('.a-subtab').forEach(b => {
    b.classList.toggle('active', b.dataset.atab === _activeATab);
  });

  const panel = wrap.querySelector('#a-panel');
  if (!panel) return;

  if (_activeATab === 'stats')     panel.innerHTML = _renderStats();
  if (_activeATab === 'sim')       panel.innerHTML = _renderSim();
  if (_activeATab === 'heuristic') panel.innerHTML = _renderHeuristic();
}

// Init sub-tab clicks
function initAnalytics() {
  document.querySelectorAll('.a-subtab').forEach(btn => {
    btn.addEventListener('click', () => renderAnalyticsTab(btn.dataset.atab));
  });
  renderAnalyticsTab('stats');
}
