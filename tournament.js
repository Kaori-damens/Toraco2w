// ============================================================
// TOURNAMENT
// ============================================================

// ── Tournament Persistence ────────────────────────────────────────
const _TOURNEY_SAVE_KEY = 'cgTournamentSave';

function _serializeTournament(t) {
  if (!t) return null;
  return {
    ...t,
    rounds: t.rounds.map(round =>
      round.map(match => ({
        p1:         match.p1   ?? null,
        p2:         match.p2   ?? null,
        winnerSlot: match.winner === null ? null
                  : match.winner === match.p1 ? 0 : 1,
        bo3Wins:    match.bo3Wins ?? [0, 0],
      }))
    ),
  };
}

function _deserializeTournament(data) {
  if (!data) return null;
  return {
    ...data,
    rounds: data.rounds.map(round =>
      round.map(match => {
        const m = {
          p1:      match.p1 ?? null,
          p2:      match.p2 ?? null,
          winner:  null,
          bo3Wins: match.bo3Wins ?? [0, 0],
        };
        if (match.winnerSlot === 0) m.winner = m.p1;
        if (match.winnerSlot === 1) m.winner = m.p2;
        return m;
      })
    ),
  };
}

function saveTournamentProgress() {
  try {
    const t  = state.tournament;
    const t2 = state.tournament2v2;
    if (!t && !t2) return;
    localStorage.setItem(_TOURNEY_SAVE_KEY, JSON.stringify({
      matchMode:     state.matchMode ?? '1v1',
      tournament:    _serializeTournament(t),
      tournament2v2: _serializeTournament(t2),
      savedAt:       Date.now(),
    }));
  } catch(e) { console.warn('Tournament save failed:', e); }
}

function clearTournamentSave() {
  localStorage.removeItem(_TOURNEY_SAVE_KEY);
}

function getTournamentSaveInfo() {
  try {
    const raw = localStorage.getItem(_TOURNEY_SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    const t = save.tournament ?? save.tournament2v2;
    if (!t) return null;
    const totalMatches = t.rounds.reduce((s, r) => s + r.length, 0);
    const doneMatches  = t.rounds.reduce((s, r) => s + r.filter(m => m.winnerSlot !== null && m.winnerSlot !== undefined).length, 0);
    return {
      mode:        save.matchMode ?? '1v1',
      size:        t.size,
      bo:          t.bo ?? 3,
      completed:   t.completed,
      doneMatches, totalMatches,
      savedAt:     save.savedAt,
    };
  } catch(e) { return null; }
}

function resumeTournament() {
  try {
    const raw = localStorage.getItem(_TOURNEY_SAVE_KEY);
    if (!raw) return false;
    const save = JSON.parse(raw);
    state.matchMode     = save.matchMode ?? '1v1';
    state.tournament    = _deserializeTournament(save.tournament);
    state.tournament2v2 = _deserializeTournament(save.tournament2v2);
    return true;
  } catch(e) { console.warn('Tournament resume failed:', e); return false; }
}

// ── Fighter Card popup ────────────────────────────────────────────
let _fcardAnimId = null;

function _fcardFighterHTML(f, uid) {
  if (!f) return '';
  const cs   = f.charStats ?? {};
  const base = f.baseStats ?? {};

  const wepDef      = (typeof WEAPON_MAP !== 'undefined') ? WEAPON_MAP[f.weaponId] : null;
  const wep         = (typeof CG_WEAPONS !== 'undefined' ? CG_WEAPONS : []).find(w => w.id === f.weaponId);
  const rawLabel    = wep ? wep.label.replace(/^\S+\s*/, '') : (f.weaponId ?? '?');
  const wLabel      = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
  const wIcon       = wepDef?.icon ?? '⚔️';
  const isUnique    = wepDef?.unique === true;
  const isForbidden = wepDef?.forbidden === true;
  // Weapon changed mid-tournament? (forbidden / unique reward)
  const weaponChanged = !f.isBot && f.baseWeaponId && f.baseWeaponId !== f.weaponId;

  const raceName = cs.race ? (cs.race.charAt(0).toUpperCase() + cs.race.slice(1)) : '';
  const subName  = cs.subrace?.label ? ` · ${cs.subrace.label}` : '';
  const bot      = f.isBot ? ' 🤖' : '';

  // ── Stats with diff ──
  const STAT_KEYS = [
    ['STR', 'strength'], ['SPD', 'speed'], ['DUR', 'durability'],
    ['IQ', 'iq'], ['BIQ', 'battleiq'], ['MA', 'ma'],
  ];
  const statsHTML = STAT_KEYS.map(([label, key]) => {
    const cur  = cs[key];
    const orig = base[key];
    let valHTML;
    if (cur == null) {
      valHTML = '<span class="fcard-sv">—</span>';
    } else if (!f.isBot && orig != null && cur !== orig) {
      const diff = cur - orig;
      const cls  = diff > 0 ? 'fcard-diff-pos' : 'fcard-diff-neg';
      const sign = diff > 0 ? '+' : '';
      valHTML = `<span class="fcard-sv">${orig}</span><span class="${cls}">${sign}${diff}</span>`;
    } else {
      valHTML = `<span class="fcard-sv">${cur}</span>`;
    }
    return `<div class="fcard-stat"><span class="fcard-stat-key">${label}</span><div class="fcard-stat-val-wrap">${valHTML}</div></div>`;
  }).join('');

  // ── Skills with new/lost diff ──
  const curSkills  = f.skills     ?? [];
  const baseSkills = f.baseSkills ?? curSkills;
  const lostSkills = baseSkills.filter(id => !curSkills.includes(id));

  const toSkillSpan = (id, extraClass = '') => {
    const sk       = (typeof SKILL_MAP !== 'undefined') ? SKILL_MAP[id] : null;
    const label    = sk ? sk.name : id;
    const descAttr = sk?.desc ? ` data-desc="${sk.desc.replace(/"/g, '&quot;')}"` : '';
    const typeAttr = sk?.type ? ` data-type="${sk.type}"` : '';
    return `<span class="fcard-skill fcard-skill-tip${extraClass}"${descAttr}${typeAttr}>${label}</span>`;
  };

  const skillsHTML = [
    ...curSkills.map(id => toSkillSpan(id, !baseSkills.includes(id) ? ' fcard-skill-new' : '')),
    ...lostSkills.map(id => {
      const sk       = (typeof SKILL_MAP !== 'undefined') ? SKILL_MAP[id] : null;
      const label    = sk ? sk.name : id;
      const descAttr = sk?.desc ? ` data-desc="${sk.desc.replace(/"/g, '&quot;')}"` : '';
      const typeAttr = sk?.type ? ` data-type="${sk.type}"` : '';
      return `<span class="fcard-skill fcard-skill-tip fcard-skill-lost"${descAttr}${typeAttr}>${label} <span class="fcard-lost-tag">${t('skill_lost_tag')}</span></span>`;
    }),
  ].join('');

  const hasSkills = curSkills.length > 0 || lostSkills.length > 0;

  // ── Char Devs ──
  const charDevIds = f.charDevs ?? [];
  const charDevsHTML = charDevIds.length > 0 && typeof CHARDEV_POOL !== 'undefined'
    ? charDevIds.map(id => {
        const cd = CHARDEV_POOL.find(c => c.id === id);
        if (!cd) return '';
        const descAttr = ` data-desc="${cd.desc.replace(/"/g, '&quot;')}"`;
        return `<span class="fcard-skill fcard-skill-tip fcard-chardev-badge"${descAttr} style="border-color:${cd.color}88;color:${cd.color}">${cd.icon} ${cd.label}</span>`;
      }).join('')
    : '';
  const hasCharDevs = charDevsHTML.trim() !== '';

  // ── Match history ──
  const history = f.matchHistory ?? [];
  const historyHTML = history.length === 0 ? '' : `
    <div class="fcard-history-section">
      <div class="fcard-history-title">📋 Match History</div>
      ${history.map(entry => {
        // opponents được lưu là array of strings (tên), không phải object
        const vs = (entry.opponents ?? []).map(o => typeof o === 'string' ? o : (o.charName ?? '?')).join(', ') || '?';
        const wonBadge = entry.won === true
          ? '<span class="fcard-history-won">W</span>'
          : entry.won === false
            ? '<span class="fcard-history-lost">L</span>'
            : '';
        const changesHTML = (entry.changes ?? []).map(c => {
          const isPos = /^\+/.test(c);
          const isNeg = /^[-−]/.test(c);
          const cls = isPos ? 'fcard-history-tag-pos' : isNeg ? 'fcard-history-tag-neg' : 'fcard-history-tag-neu';
          return `<span class="fcard-history-tag ${cls}">${c}</span>`;
        }).join('');
        return `<div class="fcard-history-row">
          <span class="fcard-history-label">${entry.label ?? '?'}</span>
          ${wonBadge}
          <span class="fcard-history-vs">vs ${vs}</span>
          <span class="fcard-history-changes">${changesHTML || '<span class="fcard-history-tag fcard-history-tag-neu">No changes</span>'}</span>
        </div>`;
      }).join('')}
    </div>`;

  return `
    <div class="fcard2-top">
      <canvas id="fcard-ball-${uid}" class="fcard2-ball-canvas" width="120" height="120"></canvas>
      <div class="fcard2-info">
        <div class="fcard2-name" style="color:${f.color ?? '#eee'}">${f.charEmoji ?? ''} ${f.charName ?? '?'}${bot}</div>
        <div class="fcard2-race">${raceName}${subName}</div>
        <div class="fcard-stats">${statsHTML}</div>
      </div>
    </div>
    <div class="fcard2-weapon-section">
      <div class="fcard2-weapon-label">
        <span class="fcard2-wep-icon-name">${wIcon} ${wLabel}</span>
        ${isUnique    ? '<span class="fcard2-unique-tag">[Unique]</span>'    : ''}
        ${isForbidden ? '<span class="fcard2-forbidden-tag">[Forbidden]</span>' : ''}
        ${weaponChanged ? `<span class="fcard-skill-new fcard-wep-changed-tag">🔀 Changed</span>` : ''}
      </div>
      <canvas id="fcard-wep-${uid}" class="fcard2-wep-canvas" width="220" height="70"></canvas>
    </div>
    ${hasSkills
      ? `<div class="fcard2-skills-section">
           <div class="fcard2-skills-label">${t('fighter_card_skills_label')}</div>
           <div class="fcard-skills-wrap">${skillsHTML}</div>
         </div>`
      : `<div class="fcard-no-skills">${t('fighter_card_no_skills')}</div>`}
    ${hasCharDevs
      ? `<div class="fcard2-skills-section">
           <div class="fcard2-skills-label">🌀 Char Dev</div>
           <div class="fcard-skills-wrap">${charDevsHTML}</div>
         </div>`
      : ''}
    ${historyHTML}
  `;
}

function _fcardDrawBall(f, uid) {
  const canvas = document.getElementById(`fcard-ball-${uid}`);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cs  = f.charStats ?? {};
  const CX = 60, CY = 60, R = 32;
  const fakeBall = {
    x: CX, y: CY, radius: R,
    color: f.color ?? '#4d96ff',
    charRace: cs.race ?? '',
    charSubrace: cs.subrace ?? null,
    _deco_fa: 0, team: -1,
  };
  const loop = () => {
    _fcardAnimId = requestAnimationFrame(loop);
    ctx.clearRect(0, 0, 120, 120);
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.fillStyle = fakeBall.color;
    ctx.shadowColor = fakeBall.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    if (typeof drawRaceDecoration === 'function') drawRaceDecoration(ctx, fakeBall);
    fakeBall._deco_fa += 0.018;
  };
  loop();
}

function _fcardDrawWeapon(f, uid) {
  const canvas = document.getElementById(`fcard-wep-${uid}`);
  const wepDef = (typeof WEAPON_MAP !== 'undefined') ? WEAPON_MAP[f.weaponId] : null;
  if (!canvas || !wepDef?.draw) return;
  const ctx = canvas.getContext('2d');
  const cs  = f.charStats ?? {};
  ctx.clearRect(0, 0, 220, 70);
  const CW = 220, CH = 70, R = 14;
  const isFists  = wepDef.id === 'fists' || wepDef.id === 'iron_fist';
  const isRanged = wepDef.aiType === 'ranged';
  const bLen     = wepDef.baseLength ?? 40;
  // Center weapon midpoint on canvas: fists → ball at center; ranged → bow/star visual at center; melee → weapon midpoint at center
  const bx = isFists  ? CW / 2
           : isRanged ? CW / 2 - R - 6
           : Math.max(R + 4, CW / 2 - R - bLen / 2);
  const fakeBall = {
    x: bx, y: CH / 2, radius: R,
    color: f.color ?? '#4d96ff',
    charRace: cs.race ?? '', charSubrace: cs.subrace ?? null,
    vx: 0, vy: 0,
    weapon: {
      angle: 0, hits: 0,
      attackCooldown: wepDef.attackCooldown ?? 20,
      bonusDamage: 0, bonusLength: 0, spinBonus: 0, bonusKnockback: 0,
      whirlTimer: 0, excaliburTransformTimer: 0, gungnirThrowTimer: 120,
      fireTimer: 0, fireInterval: wepDef.fireInterval ?? 120,
      arrowCount: 1, shurikenCount: 1,
      emberStacks: 0, soulShards: 0,
      caliburnStacks: 0, caliburnSpeedTimer: 0,
      muramasaFrenzy: 0, momentumStacks: 0, iaiReady: false,
      riposteWindow: 0, riposteStacks: 0,
    },
  };
  try { wepDef.draw(ctx, fakeBall); } catch (e) {}
}

function _fcardWireSkillTooltips(container) {
  const tip = document.getElementById('fcard-skill-tooltip');
  if (!tip) return;
  const TL = { passive: 'Passive', pre_combat: 'Pre-Combat', in_combat: 'In-Combat', post_combat: 'Post-Combat' };
  const TC = { passive: '#e8c87a', pre_combat: '#c9902a', in_combat: '#cc3333', post_combat: '#6aaa44' };
  container.querySelectorAll('.fcard-skill-tip').forEach(el => {
    el.addEventListener('mouseenter', e => {
      const desc = el.dataset.desc;
      if (!desc) return;
      const type = el.dataset.type ?? '';
      tip.innerHTML = (type ? `<div class="fcard-tip-type" style="color:${TC[type] ?? '#aaa'}">${TL[type] ?? type}</div>` : '')
        + `<div class="fcard-tip-desc">${desc}</div>`;
      tip.style.display = 'block';
      _fcardMoveTip(e);
    });
    el.addEventListener('mousemove', _fcardMoveTip);
    el.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  });
}

function _fcardMoveTip(e) {
  const tip = document.getElementById('fcard-skill-tooltip');
  if (!tip || tip.style.display === 'none') return;
  const M = 12;
  let x = e.clientX + M, y = e.clientY + M;
  if (x + tip.offsetWidth  > window.innerWidth  - M) x = e.clientX - tip.offsetWidth  - M;
  if (y + tip.offsetHeight > window.innerHeight - M) y = e.clientY - tip.offsetHeight - M;
  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
}

function showFighterCard(data) {
  if (_fcardAnimId) { cancelAnimationFrame(_fcardAnimId); _fcardAnimId = null; }
  const modal   = document.getElementById('fighter-card-modal');
  const content = document.getElementById('fighter-card-content');
  if (!modal || !content || !data) return;

  const uid = Date.now();
  if (data.fighters) {
    const uid2 = uid + 1;
    content.innerHTML =
      `<div class="fcard-team-title">Team</div>` +
      _fcardFighterHTML(data.fighters[0], uid) +
      '<hr class="fcard-divider">' +
      _fcardFighterHTML(data.fighters[1], uid2);
    _fcardDrawBall(data.fighters[0], uid);
    _fcardDrawWeapon(data.fighters[0], uid);
    _fcardDrawBall(data.fighters[1], uid2);
    _fcardDrawWeapon(data.fighters[1], uid2);
  } else {
    content.innerHTML = _fcardFighterHTML(data, uid);
    _fcardDrawBall(data, uid);
    _fcardDrawWeapon(data, uid);
  }
  _fcardWireSkillTooltips(content);
  modal.style.display = 'flex';
}

function closeFighterCard() {
  if (_fcardAnimId) { cancelAnimationFrame(_fcardAnimId); _fcardAnimId = null; }
  const tip = document.getElementById('fcard-skill-tooltip');
  if (tip) tip.style.display = 'none';
  const m = document.getElementById('fighter-card-modal');
  if (m) m.style.display = 'none';
}
// Convert a cgRoster entry → fighter object (used by state.fighters / bracket)
function rosterToFighter(ch) {
  return {
    weaponId:     ch.weapon,
    baseWeaponId: ch.weapon,              // snapshot for diff display in Fighter Card
    color:        ch.color,
    charName:     ch.name,
    charEmoji:    ch.raceEmoji ?? '',
    charStats:    { ...ch.stats, race: ch.race ?? null, subrace: ch.subrace ?? null },
    baseStats:    { ...ch.stats },        // snapshot for diff display in Fighter Card
    skills:       [...(ch.skills ?? [])],
    baseSkills:   [...(ch.skills ?? [])], // snapshot for diff display in Fighter Card
    charDevs:     [...(ch.charDevs ?? [])],
  };
}

function randomArena() {
  const keys = Object.keys(ARENAS);
  return keys[Math.floor(Math.random() * keys.length)];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeBotFighter(idx) {
  const color = BALL_COLORS[idx % BALL_COLORS.length];
  const wpId  = WEAPON_DEFS[Math.floor(Math.random() * WEAPON_DEFS.length)].id;
  const stats = {
    strength:   Math.ceil(Math.random() * 7) + 1,
    speed:      Math.ceil(Math.random() * 7) + 1,
    durability: Math.ceil(Math.random() * 7) + 1,
    iq:         Math.ceil(Math.random() * 5) + 1,
    biq:        Math.ceil(Math.random() * 5) + 1,
    ma:         Math.ceil(Math.random() * 5) + 1,
  };
  return { weaponId: wpId, color, charName: `Bot ${idx + 1}`, charEmoji: '🤖', charStats: stats, isBot: true };
}

function createTournament(size, roster) {
  const participants = [...roster];
  // Pad with bots up to tournament size
  while (participants.length < size) {
    participants.push(makeBotFighter(participants.length));
  }
  // Assign unique IDs for aggregate stats tracking
  const ts = Date.now();
  participants.forEach((f, i) => {
    if (!f._uid) f._uid = `f${i}_${ts}_${Math.random().toString(36).slice(2,5)}`;
  });
  shuffle(participants);

  // Build all rounds (single-elimination)
  const rounds = [];
  let prev = participants;
  while (prev.length > 1) {
    const round = [];
    for (let i = 0; i < prev.length; i += 2) {
      round.push({ p1: prev[i], p2: prev[i + 1], winner: null, bo3Wins: [0, 0] });
    }
    rounds.push(round);
    prev = new Array(round.length).fill(null); // placeholders for next round
  }

  return { size, rounds, currentRound: 0, currentMatch: 0, completed: false, agg: {} };
}

// ── Aggregate stats (called after every game in a tournament) ─────
function updateTournamentAggregateStats() {
  const t = state.tournament;
  if (!t || !state.players) return;
  if (!t.agg) t.agg = {};

  state.players.forEach((ball, i) => {
    if (!ball) return;
    const f = state.fighters?.[i];
    if (!f) return;

    const uid = f._uid || (f.charName + '_' + (f.weaponId || '?'));
    if (!t.agg[uid]) {
      const cs = f.charStats || {};
      t.agg[uid] = {
        name:        f.charName     || '?',
        race:        cs.race        || '?',
        weapon:      f.weaponId     || '?',
        color:       f.color        || '#888',
        skills:      [...(f.skills  || [])],
        charStats:   { ...cs },
        totalDamage: 0,
        wins:        0,
        games:       0,
      };
    }
    const e = t.agg[uid];
    e.totalDamage += ball.stats?.damageDone || 0;
    e.games++;
    const won = state.matchMode === '2v2'
      ? ball.teamId === state.winTeam
      : ball === state.winner;
    if (won) e.wins++;
    // Merge any newly learned skills
    (f.skills || []).forEach(sid => { if (!e.skills.includes(sid)) e.skills.push(sid); });
  });
}

function recordTournamentMatchResult(matchWinner) {
  const t = state.tournament;
  if (!t) return;
  const round = t.rounds[t.currentRound];
  const match = round[t.currentMatch];
  match.winner = matchWinner;

  // Place winner into next round if exists
  if (t.currentRound + 1 < t.rounds.length) {
    const nextRound    = t.rounds[t.currentRound + 1];
    const nextMatchIdx = Math.floor(t.currentMatch / 2);
    const slot = t.currentMatch % 2 === 0 ? 'p1' : 'p2';
    nextRound[nextMatchIdx][slot] = matchWinner;
  }

  // Advance pointer
  t.currentMatch++;
  if (t.currentMatch >= round.length) {
    t.currentRound++;
    t.currentMatch = 0;
    if (t.currentRound >= t.rounds.length) {
      t.completed = true;
      clearTournamentSave();   // tournament over — wipe save
    } else {
      // Auto-follow: move view to the newly active round
      t.viewRound = t.currentRound;
    }
  }
  saveTournamentProgress();
  renderBracket();
}

function getNextTournamentMatch() {
  const t = state.tournament;
  if (!t || t.completed) return null;
  return t.rounds[t.currentRound]?.[t.currentMatch] ?? null;
}

function renderBracket() {
  const t = state.tournament;
  const container = document.getElementById('bracket-content');
  const titleEl   = document.getElementById('bracket-title');
  if (!container || !t) return;

  // Init viewRound
  if (t.viewRound == null) t.viewRound = 0;
  const vr = Math.max(0, Math.min(t.viewRound, t.rounds.length - 1));
  t.viewRound = vr;

  const totalRounds = t.rounds.length;
  const ROUND_NAMES = ['Round 1','Round 2','Quarter-Finals','Semi-Finals','Final'];
  const labelIdx  = totalRounds - 1 - vr;
  const roundName = ROUND_NAMES[Math.min(labelIdx, ROUND_NAMES.length - 1)] ?? `Round ${vr + 1}`;
  const round     = t.rounds[vr];
  const matchCount = round.length;
  const roundDone  = round.every(m => m.winner !== null);

  // ── Title & phase info ──
  titleEl.textContent = t.completed ? '🏆 Tournament Complete!' : `🏆 ${roundName}`;
  const phaseInfo = document.getElementById('bracket-phase-info');
  if (phaseInfo) {
    const playerCount = matchCount * 2;
    phaseInfo.textContent = `Phase ${vr + 1} / ${totalRounds}  ·  ${matchCount} match${matchCount > 1 ? 'es' : ''} (${playerCount} fighters)`;
  }

  // ── Phase nav buttons ──
  const prevBtn = document.getElementById('prevPhaseBtn');
  const nextBtn = document.getElementById('nextPhaseBtn');
  if (prevBtn) prevBtn.disabled = vr <= 0;
  if (nextBtn) nextBtn.disabled = !roundDone || vr >= totalRounds - 1;

  // ── Build match grid ──
  container.innerHTML = '';

  if (t.completed) {
    // Champion screen
    const lastRound = t.rounds[t.rounds.length - 1];
    const champion  = lastRound[0]?.winner;
    if (champion) {
      const champWrap = document.createElement('div');
      champWrap.className = 'bracket-champ-wrap';
      champWrap.innerHTML = `
        <div class="bracket-champ-trophy">🏆</div>
        <div class="bracket-champ-label">Champion</div>
        <div class="bracket-match current bracket-champ-card" style="border-color:${champion.color};box-shadow:0 0 32px ${champion.color}55">
          <div class="bracket-player winner clickable" style="font-size:15px;padding:10px 12px"
               data-champ="1">
            <span class="bp-dot" style="background:${champion.color};width:14px;height:14px"></span>
            <span style="color:${champion.color}">${champion.charEmoji ?? ''} ${champion.charName ?? champion.weaponId}</span>
          </div>
        </div>`;
      champWrap.querySelector('[data-champ]').addEventListener('click', () => showFighterCard(champion));
      container.appendChild(champWrap);
    }
  }

  // Grid of matches (show even when completed, as the final round)
  const grid = document.createElement('div');
  grid.className = 'bracket-grid';
  const cols = matchCount >= 16 ? 4 : matchCount >= 4 ? 2 : 1;
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  round.forEach((match, mi) => {
    const isCurrent = vr === t.currentRound && mi === t.currentMatch && !t.completed;
    const isDone    = match.winner !== null;
    const card = document.createElement('div');
    card.className = 'bracket-match' + (isCurrent ? ' current' : '') + (isDone ? ' done' : '');

    // Match number badge
    const badge = document.createElement('div');
    badge.className = 'bracket-match-num';
    badge.textContent = `#${vr === 0 ? mi + 1 : mi + 1}`;
    card.appendChild(badge);

    [match.p1, match.p2].forEach(p => {
      const row = document.createElement('div');
      row.className = 'bracket-player' + (p && match.winner === p ? ' winner' : '') + (p ? ' clickable' : '');
      const dot = document.createElement('span');
      dot.className = 'bp-dot';
      dot.style.background = p?.color ?? '#333';
      const name = document.createElement('span');
      name.className = 'bp-name';
      name.textContent = p ? (p.charName ?? p.weaponId ?? '?') : '—';
      row.appendChild(dot);
      row.appendChild(name);
      if (p) row.addEventListener('click', e => { e.stopPropagation(); showFighterCard(p); });
      card.appendChild(row);
    });

    if (isDone && match.bo3Wins) {
      const sc = document.createElement('div');
      sc.className = 'bracket-score';
      sc.textContent = `${match.bo3Wins[0]} – ${match.bo3Wins[1]}`;
      card.appendChild(sc);
    }

    grid.appendChild(card);
  });

  container.appendChild(grid);

  // ── Fight button ──
  const nextMatchBtn = document.getElementById('nextMatchBtn');
  if (nextMatchBtn) {
    if (t.completed) {
      nextMatchBtn.disabled = true;
      nextMatchBtn.textContent = '🏆 Tournament Over';
    } else {
      nextMatchBtn.disabled = false;
      nextMatchBtn.textContent = '⚔️ Fight Next Match';
    }
  }

  // ── Stats button (only when tournament is done) ──
  const statsBtn = document.getElementById('tournamentStatsBtn');
  if (statsBtn) {
    statsBtn.style.display = t.completed ? '' : 'none';
    statsBtn.onclick = () => { if (typeof showTournamentStatsModal === 'function') showTournamentStatsModal(); };
  }
}

function buildTournamentSetup() {
  if (!state.tournament) state.tournament = { size: 16, selectedFighters: [], mode: '1v1' };
  const t       = state.tournament;
  const size    = t.size ?? 16;
  const tmode   = t.mode ?? '1v1';
  const is2v2   = tmode === '2v2';
  // In 2v2 mode, size = number of TEAMS, so actual fighter slots = size * 2
  const slotCount = is2v2 ? size * 2 : size;
  if (!t.selectedFighters) t.selectedFighters = [];

  // Sync tmode button visual state
  document.querySelectorAll('[data-tmode]').forEach(b => b.classList.toggle('sel', b.dataset.tmode === tmode));

  const roster   = JSON.parse(localStorage.getItem('cgRoster') ?? '[]');
  const selected = t.selectedFighters;  // array of roster indices
  const selCount = selected.length;
  const full     = selCount >= slotCount;

  // ── Header counter ──
  const slotInfo = document.getElementById('t-slot-info');
  if (slotInfo) {
    const bots = Math.max(0, slotCount - selCount);
    slotInfo.textContent = `(${selCount} / ${slotCount} selected${bots > 0 ? ` · ${bots} bot${bots>1?'s':''}` : ''}${is2v2 ? ' · 2v2 mode' : ''})`;
    slotInfo.style.color = selCount >= slotCount ? '#44bb77' : '#556';
  }

  // ── Roster cards ──
  const list = document.getElementById('t-roster-list');
  list.innerHTML = '';

  if (roster.length === 0) {
    const empty = document.createElement('div');
    empty.className = 't-roster-empty';
    empty.textContent = 'No Radosers yet — create some first!';
    list.appendChild(empty);
  } else {
    roster.forEach((r, i) => {
      const isSel    = selected.includes(i);
      const isLocked = !isSel && full;
      const card = document.createElement('div');
      card.className = 't-roster-card' +
        (isSel ? ' selected' : '') +
        (isLocked ? ' full-not-selected' : '');

      const wIcon = WEAPON_DEFS.find(d => d.id === r.weapon)?.icon ?? '';
      card.innerHTML = `
        <span class="t-slot-dot" style="background:${r.color ?? '#888'}"></span>
        <span class="t-card-name" style="color:${r.color ?? '#aac'}">${r.raceEmoji ?? ''} ${r.name ?? `Fighter ${i+1}`}</span>
        <span style="font-size:12px;color:#8899aa">${wIcon} ${r.weapon ?? ''}</span>
        <span class="t-card-check">${isSel ? '✓' : ''}</span>
      `;

      if (!isLocked) {
        card.addEventListener('click', () => {
          if (isSel) {
            const idx = selected.indexOf(i);
            if (idx >= 0) selected.splice(idx, 1);
          } else {
            selected.push(i);
          }
          buildTournamentSetup();
        });
      }
      list.appendChild(card);
    });
  }

  // ── Lineup preview (selected + bots) ──
  const summary = document.getElementById('t-slot-summary');
  if (summary) {
    summary.innerHTML = '';
    // Selected Radosers dots
    selected.forEach(idx => {
      const r = roster[idx];
      if (!r) return;
      const dot = document.createElement('span');
      dot.className = 't-summary-dot';
      dot.style.cssText = `background:${r.color ?? '#888'};box-shadow:0 0 4px ${r.color ?? '#888'}88`;
      dot.title = r.name ?? `Fighter ${idx+1}`;
      summary.appendChild(dot);
    });
    // Bot slots
    const bots = Math.max(0, slotCount - selCount);
    if (bots > 0) {
      const botLabel = document.createElement('span');
      botLabel.className = 't-summary-bot';
      botLabel.textContent = `+ ${bots} bot${bots > 1 ? 's' : ''}`;
      summary.appendChild(botLabel);
    }
  }

  // ── Start button ──
  const startBtn = document.getElementById('tStartBtn');
  if (startBtn) startBtn.disabled = false;
}

// ── 2v2 Tournament ──
function createTournament2v2(numTeams, roster) {
  // Pair fighters into teams of 2
  const fighters = [...roster];
  while (fighters.length < numTeams * 2) fighters.push(makeBotFighter(fighters.length));
  shuffle(fighters);

  // Build teams
  const TC = ['#00ddff','#ff8833','#44ff88','#ff44aa','#ffdd00','#aa44ff','#ff6644','#44aaff'];
  const teams = [];
  for (let i = 0; i < numTeams; i++) {
    const f0 = fighters[i * 2], f1 = fighters[i * 2 + 1];
    teams.push({
      charName: `${f0.charName ?? 'Bot'} & ${f1.charName ?? 'Bot'}`,
      color: TC[i % TC.length],
      fighters: [f0, f1],
      isTeam: true,
    });
  }
  shuffle(teams);

  // Build bracket
  const rounds = [];
  let prev = teams;
  while (prev.length > 1) {
    const round = [];
    for (let i = 0; i < prev.length; i += 2) {
      round.push({ p1: prev[i], p2: prev[i + 1], winner: null, bo3Wins: [0, 0] });
    }
    rounds.push(round);
    prev = new Array(round.length).fill(null);
  }
  return { numTeams, rounds, currentRound: 0, currentMatch: 0, completed: false };
}

function getNextTournamentMatch2v2() {
  const t = state.tournament2v2;
  if (!t || t.completed) return null;
  return t.rounds[t.currentRound]?.[t.currentMatch] ?? null;
}

function recordTournamentMatchResult2v2(winTeamObj) {
  const t = state.tournament2v2;
  if (!t) return;
  const round = t.rounds[t.currentRound];
  const match = round[t.currentMatch];
  match.winner = winTeamObj;

  if (t.currentRound + 1 < t.rounds.length) {
    const nextRound = t.rounds[t.currentRound + 1];
    const nextIdx   = Math.floor(t.currentMatch / 2);
    const slot      = t.currentMatch % 2 === 0 ? 'p1' : 'p2';
    nextRound[nextIdx][slot] = winTeamObj;
  }

  t.currentMatch++;
  if (t.currentMatch >= round.length) {
    t.currentRound++;
    t.currentMatch = 0;
    if (t.currentRound >= t.rounds.length) {
      t.completed = true;
      clearTournamentSave();
    } else {
      t.viewRound = t.currentRound;
    }
  }
  saveTournamentProgress();
  renderBracket2v2();
}

function renderBracket2v2() {
  const t = state.tournament2v2;
  const container = document.getElementById('bracket-content');
  const titleEl   = document.getElementById('bracket-title');
  if (!container || !t) return;

  if (t.viewRound == null) t.viewRound = 0;
  const vr = Math.max(0, Math.min(t.viewRound, t.rounds.length - 1));
  t.viewRound = vr;

  const totalRounds = t.rounds.length;
  const ROUND_NAMES = ['Round 1','Round 2','Quarter-Finals','Semi-Finals','Final'];
  const labelIdx  = totalRounds - 1 - vr;
  const roundName = ROUND_NAMES[Math.min(labelIdx, ROUND_NAMES.length - 1)] ?? `Round ${vr + 1}`;
  const round     = t.rounds[vr];
  const matchCount = round.length;
  const roundDone  = round.every(m => m.winner !== null);

  titleEl.textContent = t.completed ? '🏆 2v2 Tournament Complete!' : `🏆 2v2 ${roundName}`;

  const phaseInfo = document.getElementById('bracket-phase-info');
  if (phaseInfo) {
    phaseInfo.textContent = `Phase ${vr + 1} / ${totalRounds}  ·  ${matchCount} match${matchCount > 1 ? 'es' : ''} (${matchCount * 4} fighters)`;
  }

  const prevBtn = document.getElementById('prevPhaseBtn');
  const nextBtn = document.getElementById('nextPhaseBtn');
  if (prevBtn) prevBtn.disabled = vr <= 0;
  if (nextBtn) nextBtn.disabled = !roundDone || vr >= totalRounds - 1;

  container.innerHTML = '';

  if (t.completed) {
    const champion = t.rounds[t.rounds.length - 1][0]?.winner;
    if (champion) {
      const champWrap = document.createElement('div');
      champWrap.className = 'bracket-champ-wrap';
      champWrap.innerHTML = `
        <div class="bracket-champ-trophy">🏆</div>
        <div class="bracket-champ-label">Champions</div>
        <div class="bracket-match current bracket-champ-card" style="border-color:${champion.color};box-shadow:0 0 32px ${champion.color}55">
          <div class="bracket-player winner" style="font-size:14px;padding:10px 12px">
            <span class="bp-dot" style="background:${champion.color};width:14px;height:14px"></span>
            <span style="color:${champion.color}">${champion.charName ?? '?'}</span>
          </div>
        </div>`;
      container.appendChild(champWrap);
    }
  }

  const grid = document.createElement('div');
  grid.className = 'bracket-grid';
  const cols = matchCount >= 16 ? 4 : matchCount >= 4 ? 2 : 1;
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  round.forEach((match, mi) => {
    const isCurrent = vr === t.currentRound && mi === t.currentMatch && !t.completed;
    const isDone    = match.winner !== null;
    const card = document.createElement('div');
    card.className = 'bracket-match' + (isCurrent ? ' current' : '') + (isDone ? ' done' : '');

    const badge = document.createElement('div');
    badge.className = 'bracket-match-num';
    badge.textContent = `#${mi + 1}`;
    card.appendChild(badge);

    [match.p1, match.p2].forEach(team => {
      const row = document.createElement('div');
      row.className = 'bracket-player' + (team && match.winner === team ? ' winner' : '') + (team ? ' clickable' : '');
      if (team) {
        const tc = team.color ?? '#888';
        row.innerHTML = `<span class="bp-dot" style="background:${tc}"></span>
          <span class="bp-name" style="color:${tc};font-weight:900">${team.charName ?? '?'}</span>`;
        if (team.fighters) {
          const sub = document.createElement('div');
          sub.style.cssText = 'font-size:12px;color:#99aacc;padding-left:16px;line-height:1.5';
          sub.textContent = team.fighters.map(f => f.charName ?? '?').join(' + ');
          row.appendChild(sub);
        }
        row.addEventListener('click', e => { e.stopPropagation(); showFighterCard(team); });
      } else {
        row.innerHTML = '<span class="bp-dot" style="background:#333"></span><span class="bp-name">—</span>';
      }
      card.appendChild(row);
    });

    if (isDone && match.bo3Wins) {
      const sc = document.createElement('div');
      sc.className = 'bracket-score';
      sc.textContent = `${match.bo3Wins[0]} – ${match.bo3Wins[1]}`;
      card.appendChild(sc);
    }
    grid.appendChild(card);
  });

  container.appendChild(grid);

  const nextMatchBtn = document.getElementById('nextMatchBtn');
  if (nextMatchBtn) {
    if (t.completed) {
      nextMatchBtn.disabled = true;
      nextMatchBtn.textContent = '🏆 Tournament Over';
    } else {
      nextMatchBtn.disabled = false;
      nextMatchBtn.textContent = '⚔️ Fight Next Match';
    }
  }
}

// Select-all / clear buttons
document.addEventListener('click', e => {
  if (e.target.id === 'tSelectAllBtn') {
    if (!state.tournament) state.tournament = { size: 16, selectedFighters: [], mode: '1v1' };
    const roster = JSON.parse(localStorage.getItem('cgRoster') ?? '[]');
    const size   = state.tournament.size ?? 16;
    const tmode  = state.tournament.mode ?? '1v1';
    const slotCount = tmode === '2v2' ? size * 2 : size;
    // Select as many as possible up to slotCount
    state.tournament.selectedFighters = roster.slice(0, slotCount).map((_, i) => i);
    buildTournamentSetup();
  }
  if (e.target.id === 'tClearBtn') {
    if (state.tournament) state.tournament.selectedFighters = [];
    buildTournamentSetup();
  }
});
