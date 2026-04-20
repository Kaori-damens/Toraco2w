// ============================================================
// TORACO CHAMPIONSHIP — 128 / 256 player multi-phase
// ============================================================

const CS_SAVE_KEY = 'cgChampionshipSave';

// Weighted arena random for championship — size depends on player count
// 4 players (FFA): 60% L / 35% M / 5% S
// 2 players (1v1): 10% L / 70% M / 20% S
function randomArenaChampionship(playerCount) {
  // Step 1: pick size by player count
  const sizeRoll = Math.random() * 100;
  let targetSize;
  if (playerCount >= 4) {
    targetSize = sizeRoll < 60 ? 'large' : sizeRoll < 95 ? 'medium' : 'small';
  } else {
    targetSize = sizeRoll < 5 ? 'large' : sizeRoll < 80 ? 'medium' : 'small';
  }

  // Step 2: split arenas of that size into plain vs object (trap/hole)
  const sizePool  = Object.keys(ARENAS).filter(k => ARENAS[k].size === targetSize);
  const plain     = sizePool.filter(k => !ARENAS[k].traps && !ARENAS[k].holes);
  const withObj   = sizePool.filter(k =>  ARENAS[k].traps ||  ARENAS[k].holes);

  // Step 3: 30% plain, 70% with objects (fall back to other group if one is empty)
  const useObj = withObj.length > 0 && (plain.length === 0 || Math.random() < 0.70);
  const pool   = useObj ? withObj : plain;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Unique pool management ─────────────────────────────────────
function initUniquePool() {
  const weaponIds = WEAPON_DEFS.filter(w => w.unique).map(w => w.id);
  const skillIds  = SKILL_DEFS.filter(s => s.unique).map(s => s.id);
  state.championship.uniquePool = new Set([...weaponIds, ...skillIds]);
}

function claimUnique(id) {
  state.championship?.uniquePool?.delete(id);
}

function isUniqueAvailable(id) {
  if (!state.championship?.uniquePool) return false;
  return state.championship.uniquePool.has(id);
}

// ── Demon Sin Pool ─────────────────────────────────────────────
// Each of the 7 deadly sins can only be claimed once per championship draft.
// When pool is exhausted, new demons roll without a subrace (sinless demon).
function initDemonSinPool() {
  state.championship.demonSinPool = new Set(
    (CG_SUBRACES?.demonSin || []).map(s => s.label)
  );
}

function claimDemonSin(label) {
  state.championship?.demonSinPool?.delete(label);
}

function returnDemonSin(label) {
  if ((CG_SUBRACES?.demonSin || []).some(s => s.label === label)) {
    state.championship?.demonSinPool?.add(label);
  }
}

// Returns sin entries still available in the pool.
// If no pool exists (not in draft context), returns all 7 sins.
function getAvailableDemonSins() {
  const pool = state.championship?.demonSinPool;
  const all  = CG_SUBRACES?.demonSin || [];
  if (!pool) return all;
  return all.filter(s => pool.has(s.label));
}

// ── Draft phase callbacks ──────────────────────────────────────
function onDraftPlayerCreated(char) {
  const cs = state.championship;
  if (!cs || !Array.isArray(cs.draftRoster)) return;
  cs.draftRoster.push(char);
  saveDraftProgress();   // persist draft so Resume works
  showScreen('championship-setup');
  buildChampionshipSetup();
}

function removeDraftPlayer(idx) {
  const cs = state.championship;
  if (!cs || !cs.draftRoster) return;
  const ch = cs.draftRoster[idx];
  if (!ch) return;
  // Return unique weapon to pool
  if (ch.weapon && cs.uniquePool) {
    const wDef = WEAPON_DEFS.find(w => w.id === ch.weapon);
    if (wDef?.unique) cs.uniquePool.add(ch.weapon);
  }
  // Return unique skills to pool
  for (const sid of (ch.skills || [])) {
    const sDef = SKILL_DEFS.find(s => s.id === sid);
    if (sDef?.unique && cs.uniquePool) cs.uniquePool.add(sid);
  }
  // Return demon sin to pool
  if (ch.race === 'demon' && ch.subrace?.label) returnDemonSin(ch.subrace.label);
  cs.draftRoster.splice(idx, 1);
  saveDraftProgress();   // persist after removal
  buildChampionshipSetup();
}

// Save draft-phase state (size=32/64/128, no phases yet) to localStorage
function saveDraftProgress() {
  const cs = state.championship;
  if (!cs || cs.phases) return; // only for draft phase
  try {
    // Sets must be serialized as Arrays for JSON
    const toSave = {
      ...cs,
      uniquePool:    cs.uniquePool    ? [...cs.uniquePool]    : null,
      demonSinPool:  cs.demonSinPool  ? [...cs.demonSinPool]  : null,
    };
    localStorage.setItem(CS_SAVE_KEY, JSON.stringify(toSave));
  } catch(e) {}
}

function fillRemainingDraftSlots() {
  const cs = state.championship;
  if (!cs || !cs.draftRoster) return;
  const needed = cs.size - cs.draftRoster.length;
  if (needed <= 0) return;
  // Headless create without unique pool access
  const savedPool = cs.uniquePool;
  cs.uniquePool = null;
  for (let i = 0; i < needed; i++) {
    const char = bulkCreateOne();
    // Tag with championship identity
    char.championshipTag  = cs.tag  ?? null;
    char.championshipName = cs.name ?? null;
    cs.draftRoster.push(char);
    cgRoster.push(char);
  }
  localStorage.setItem('cgRoster', JSON.stringify(cgRoster));
  cs.uniquePool = savedPool;
  saveDraftProgress();   // persist after fill
  buildChampionshipSetup();
}

function startChampionshipDraft() {
  const cs = state.championship;
  if (!cs || !cs.draftRoster || cs.draftRoster.length < cs.size) return;
  // Build championship from draftRoster, then replace state.championship
  state.championship = Object.assign(createChampionship(cs.size, cs.draftRoster), { name: cs.name, tag: cs.tag });
  saveChampionshipProgress();
  showScreen('bracket');
  renderChampionshipBracket();
}

function _csShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function _csMatch(p1=null, p2=null) { return {p1,p2,winner:null,loser:null,bo3Wins:[0,0]}; }
function _csPad(fighters, n) {
  const r=[...fighters]; let bi=0;
  while(r.length<n) r.push(makeBotFighter(bi++)); return r;
}

// ── Double-Elimination 8 ──────────────────────────────────────
function _buildDe8(players, bo) {
  const p = players;
  const ub = {
    r1: [_csMatch(p[0],p[7]),_csMatch(p[1],p[6]),_csMatch(p[2],p[5]),_csMatch(p[3],p[4])],
    r2: Array.from({length:2},()=>_csMatch()),
    f:  [_csMatch()],
  };
  const lb = {
    r1: Array.from({length:2},()=>_csMatch()),
    r2: Array.from({length:2},()=>_csMatch()),
    sf: [_csMatch()],
    f:  [_csMatch()],
  };
  const gf = _csMatch();
  const seq = [
    ...[0,1,2,3].map(i=>({b:'ub',r:'r1',i})),
    ...[0,1].map(i=>({b:'lb',r:'r1',i})),
    ...[0,1].map(i=>({b:'ub',r:'r2',i})),
    ...[0,1].map(i=>({b:'lb',r:'r2',i})),
    {b:'ub',r:'f',i:0},{b:'lb',r:'sf',i:0},{b:'lb',r:'f',i:0},{b:'gf',r:'gf',i:0},
  ];
  return {type:'de',n:8,bo,ub,lb,gf,seq,currentSeqIdx:0,done:false,champion:null};
}

function _deAdvance8(de, winner, loser) {
  const {b,r,i} = de.seq[de.currentSeqIdx];
  if (b==='gf') {
    de.gf.winner=winner; de.gf.loser=loser; de.done=true; de.champion=winner; de.currentSeqIdx++; return;
  }
  const m = de[b][r][i]; m.winner=winner; m.loser=loser;
  if (b==='ub') {
    if      (r==='r1') { de.ub.r2[Math.floor(i/2)][i%2===0?'p1':'p2']=winner; de.lb.r1[Math.floor(i/2)][i%2===0?'p1':'p2']=loser; }
    else if (r==='r2') { de.ub.f[0][i===0?'p1':'p2']=winner; de.lb.r2[i].p2=loser; }
    else if (r==='f')  { de.gf.p1=winner; de.lb.f[0].p1=loser; }
  } else if (b==='lb') {
    if      (r==='r1') de.lb.r2[i].p1=winner;
    else if (r==='r2') de.lb.sf[0][i===0?'p1':'p2']=winner;
    else if (r==='sf') de.lb.f[0].p2=winner;
    else if (r==='f')  de.gf.p2=winner;
  }
  de.currentSeqIdx++;
}

// ── Double-Elimination 16 ─────────────────────────────────────
function _buildDe16(players, bo) {
  const p = players;
  const ub = {
    r1: [_csMatch(p[0],p[15]),_csMatch(p[7],p[8]),_csMatch(p[3],p[12]),_csMatch(p[4],p[11]),
         _csMatch(p[1],p[14]),_csMatch(p[6],p[9]),_csMatch(p[2],p[13]),_csMatch(p[5],p[10])],
    r2: Array.from({length:4},()=>_csMatch()),
    sf: Array.from({length:2},()=>_csMatch()),
    f:  [_csMatch()],
  };
  const lb = {
    r1: Array.from({length:4},()=>_csMatch()),
    r2: Array.from({length:4},()=>_csMatch()),
    r3: Array.from({length:2},()=>_csMatch()),
    r4: Array.from({length:2},()=>_csMatch()),
    sf: [_csMatch()],
    f:  [_csMatch()],
  };
  const gf = _csMatch();
  const seq = [
    ...[0,1,2,3,4,5,6,7].map(i=>({b:'ub',r:'r1',i})),
    ...[0,1,2,3].map(i=>({b:'lb',r:'r1',i})),
    ...[0,1,2,3].map(i=>({b:'ub',r:'r2',i})),
    ...[0,1,2,3].map(i=>({b:'lb',r:'r2',i})),
    ...[0,1].map(i=>({b:'ub',r:'sf',i})),
    ...[0,1].map(i=>({b:'lb',r:'r3',i})),
    ...[0,1].map(i=>({b:'lb',r:'r4',i})),
    {b:'ub',r:'f',i:0},{b:'lb',r:'sf',i:0},{b:'lb',r:'f',i:0},{b:'gf',r:'gf',i:0},
  ];
  return {type:'de',n:16,bo,ub,lb,gf,seq,currentSeqIdx:0,done:false,champion:null};
}

function _deAdvance16(de, winner, loser) {
  const {b,r,i} = de.seq[de.currentSeqIdx];
  if (b==='gf') {
    de.gf.winner=winner; de.gf.loser=loser; de.done=true; de.champion=winner; de.currentSeqIdx++; return;
  }
  const m = de[b][r][i]; m.winner=winner; m.loser=loser;
  if (b==='ub') {
    if      (r==='r1') { de.ub.r2[Math.floor(i/2)][i%2===0?'p1':'p2']=winner; de.lb.r1[Math.floor(i/2)][i%2===0?'p1':'p2']=loser; }
    else if (r==='r2') { de.ub.sf[Math.floor(i/2)][i%2===0?'p1':'p2']=winner; de.lb.r2[i].p2=loser; }
    else if (r==='sf') { de.ub.f[0][i===0?'p1':'p2']=winner; de.lb.r4[i].p2=loser; }
    else if (r==='f')  { de.gf.p1=winner; de.lb.f[0].p1=loser; }
  } else if (b==='lb') {
    if      (r==='r1') de.lb.r2[i].p1=winner;
    else if (r==='r2') de.lb.r3[Math.floor(i/2)][i%2===0?'p1':'p2']=winner;
    else if (r==='r3') de.lb.r4[i].p1=winner;
    else if (r==='r4') de.lb.sf[0][i===0?'p1':'p2']=winner;
    else if (r==='sf') de.lb.f[0].p2=winner;
    else if (r==='f')  de.gf.p2=winner;
  }
  de.currentSeqIdx++;
}

// ── Create Championship ───────────────────────────────────────
function createChampionship(size, roster) {
  const fighters = _csShuffle(_csPad(roster.map(rosterToFighter), size));
  const phases = [];

  if (size === 32) {
    // Phase 1: BO1 32→16 (no FFA — initialize matches immediately)
    const p1matches = [];
    const s1 = _csShuffle(fighters);
    for (let i=0; i<s1.length; i+=2) p1matches.push(_csMatch(s1[i], s1[i+1]));
    phases.push(
      {type:'1v1', bo:1, label:'Phase 1 — Last Stand  BO1  (32 → 16)', matches:p1matches, currentMatch:0, done:false},
      {type:'1v1', bo:3, label:'Phase 2 — Playoff  BO3  (16 → 8)',      matches:[], currentMatch:0, done:false},
      {type:'de',  bo:3, label:'Phase 3 — Double Elimination  BO3',     done:false, n:8}
    );
  } else if (size === 64) {
    // Phase 1: FFA 64→16 (16 groups of 4)
    const ffaGroups = [];
    for (let i=0; i<fighters.length; i+=4)
      ffaGroups.push({fighters:fighters.slice(i,i+4), winner:null, done:false});
    phases.push(
      {type:'ffa', label:'Phase 1 — Battle Royale  (64 → 16)', groups:ffaGroups, currentGroup:0, done:false},
      {type:'1v1', bo:3, label:'Phase 2 — Playoff  BO3  (16 → 8)',      matches:[], currentMatch:0, done:false},
      {type:'de',  bo:3, label:'Phase 3 — Double Elimination  BO3',     done:false, n:8}
    );
  } else if (size === 128) {
    const ffaGroups = [];
    for (let i=0; i<fighters.length; i+=4)
      ffaGroups.push({fighters:fighters.slice(i,i+4), winner:null, done:false});
    phases.push(
      {type:'ffa', label:'Phase 1 — Battle Royale  (128 → 32)', groups:ffaGroups, currentGroup:0, done:false},
      {type:'1v1', bo:1, label:'Phase 2 — Last Stand  BO1  (32 → 16)', matches:[], currentMatch:0, done:false},
      {type:'1v1', bo:3, label:'Phase 3 — Playoff  BO3  (16 → 8)',     matches:[], currentMatch:0, done:false},
      {type:'de',  bo:3, label:'Phase 4 — Double Elimination  BO3',    done:false, n:8}
    );
  } else { // 256
    const ffaGroups = [];
    for (let i=0; i<fighters.length; i+=4)
      ffaGroups.push({fighters:fighters.slice(i,i+4), winner:null, done:false});
    phases.push(
      {type:'ffa', label:'Phase 1 — Battle Royale  (256 → 64)', groups:ffaGroups, currentGroup:0, done:false},
      {type:'1v1', bo:1, label:'Phase 2 — Last Stand  BO1  (64 → 32)', matches:[], currentMatch:0, done:false},
      {type:'1v1', bo:3, label:'Phase 3 — Playoff  BO3  (32 → 16)',    matches:[], currentMatch:0, done:false},
      {type:'de',  bo:3, label:'Phase 4 — Double Elimination  BO3',    done:false, n:16}
    );
  }
  return {size, phases, currentPhaseIdx:0, completed:false, champion:null, viewPhaseIdx:0};
}

function _csNextPhase(cs, survivors) {
  cs.currentPhaseIdx++;
  if (cs.currentPhaseIdx >= cs.phases.length) { cs.completed=true; return; }
  const phase = cs.phases[cs.currentPhaseIdx];
  cs.viewPhaseIdx = cs.currentPhaseIdx;
  if (phase.type==='1v1') {
    const s = _csShuffle(survivors); phase.matches=[];
    for (let i=0; i<s.length; i+=2) phase.matches.push(_csMatch(s[i], s[i+1]));
    phase.currentMatch=0; phase.done=false;
  } else if (phase.type==='de') {
    const deN = phase.n || 16;
    Object.assign(phase, deN === 8 ? _buildDe8(_csShuffle(survivors), phase.bo)
                                   : _buildDe16(_csShuffle(survivors), phase.bo));
  }
}

// ── Get / Record ──────────────────────────────────────────────
function getNextChampionshipMatch() {
  const cs = state.championship; if (!cs||cs.completed) return null;
  const phase = cs.phases[cs.currentPhaseIdx];
  if (phase.type==='ffa') {
    const g = phase.groups[phase.currentGroup];
    return g ? {type:'ffa', fighters:g.fighters} : null;
  }
  if (phase.type==='1v1') {
    const m = phase.matches[phase.currentMatch];
    return m ? {type:'1v1', fighters:[m.p1,m.p2], p1:m.p1, p2:m.p2, bo:phase.bo} : null;
  }
  if (phase.type==='de') {
    if (!phase.seq || phase.currentSeqIdx>=phase.seq.length) return null;
    const {b,r,i} = phase.seq[phase.currentSeqIdx];
    const m = b==='gf' ? phase.gf : phase[b][r][i];
    if (!m.p1||!m.p2) return null;
    return {type:'1v1', fighters:[m.p1,m.p2], p1:m.p1, p2:m.p2, bo:phase.bo, isDE:true};
  }
  return null;
}

function recordChampionshipFfaResult(winnerFighter) {
  const cs=state.championship, phase=cs.phases[cs.currentPhaseIdx];
  if (phase.type!=='ffa') return;
  const g=phase.groups[phase.currentGroup]; g.winner=winnerFighter; g.done=true; phase.currentGroup++;
  if (phase.currentGroup>=phase.groups.length) {
    phase.done=true;
    _csNextPhase(cs, phase.groups.map(g=>g.winner).filter(Boolean));
  }
  cs.viewPhaseIdx=cs.currentPhaseIdx; saveChampionshipProgress();
}

function recordChampionshipMatchResult(matchWinner) {
  const cs=state.championship, phase=cs.phases[cs.currentPhaseIdx];
  if (phase.type==='1v1') {
    const m=phase.matches[phase.currentMatch]; m.winner=matchWinner; phase.currentMatch++;
    if (phase.currentMatch>=phase.matches.length) {
      phase.done=true; _csNextPhase(cs, phase.matches.map(m=>m.winner));
    }
  } else if (phase.type==='de') {
    const {b,r,i} = phase.seq[phase.currentSeqIdx];
    const m = b==='gf' ? phase.gf : phase[b][r][i];
    const matchLoser = m.p1 === matchWinner ? m.p2 : m.p1;
    const advanceFn = phase.n === 8 ? _deAdvance8 : _deAdvance16;
    advanceFn(phase, matchWinner, matchLoser);
    // Skeleton: first UB loss → entering losers bracket → +1 all stats
    if (b === 'ub' && matchLoser?.charStats?.race === 'skeleton' && !matchLoser.charStats._skeletonLbBonus) {
      matchLoser.charStats._skeletonLbBonus = true;
      ['strength','speed','durability','iq','battleiq','ma'].forEach(k => {
        matchLoser.charStats[k] = (matchLoser.charStats[k] ?? 0) + 1;
      });
    }
    if (phase.done) { cs.completed=true; cs.champion=phase.champion; clearChampionshipSave(); }
  }
  cs.viewPhaseIdx=cs.currentPhaseIdx; saveChampionshipProgress();
}

function syncChampionshipBo3Wins(wins) {
  const cs=state.championship; if (!cs) return;
  const phase=cs.phases[cs.currentPhaseIdx];
  if (phase.type==='1v1') {
    const m=phase.matches[phase.currentMatch]; if (m) m.bo3Wins=[...wins];
  } else if (phase.type==='de' && phase.seq && phase.currentSeqIdx<phase.seq.length) {
    const {b,r,i}=phase.seq[phase.currentSeqIdx];
    const m=b==='gf'?phase.gf:phase[b][r][i]; if (m) m.bo3Wins=[...wins];
  }
}

// ── Save / Resume ─────────────────────────────────────────────
function saveChampionshipProgress() {
  try { localStorage.setItem(CS_SAVE_KEY, JSON.stringify(state.championship)); } catch(e) {}
}
function clearChampionshipSave() { localStorage.removeItem(CS_SAVE_KEY); }
function getChampionshipSaveInfo() {
  try {
    const raw=localStorage.getItem(CS_SAVE_KEY); if (!raw) return null;
    const cs=JSON.parse(raw);
    // Draft phase (size=32, no phases yet)
    if (!cs.phases && cs.draftRoster) {
      return { size: cs.size, isDraft: true, draftCount: cs.draftRoster.length, completed: false };
    }
    return {size:cs.size, currentPhase:cs.currentPhaseIdx+1, totalPhases:cs.phases.length, completed:cs.completed};
  } catch(e) { return null; }
}
function resumeChampionship() {
  try {
    const raw=localStorage.getItem(CS_SAVE_KEY); if (!raw) return false;
    const cs=JSON.parse(raw);
    // Draft phase restore — uniquePool was serialized as Array, restore to Set
    if (!cs.phases && cs.draftRoster) {
      if (Array.isArray(cs.uniquePool))   cs.uniquePool   = new Set(cs.uniquePool);
      if (Array.isArray(cs.demonSinPool)) cs.demonSinPool = new Set(cs.demonSinPool);
      state.championship = cs;
      buildChampionshipSetup();
      showScreen('championship-setup');
      return true;
    }
    state.championship=cs; showScreen('bracket'); renderChampionshipBracket(); return true;
  } catch(e) { return false; }
}

// ── Championship Auto Mode ────────────────────────────────────
function _isNextMatchGrandFinal() {
  const cs = state.championship; if (!cs || cs.completed) return false;
  const phase = cs.phases[cs.currentPhaseIdx];
  if (!phase || phase.type !== 'de') return false;
  if (!phase.seq || phase.currentSeqIdx >= phase.seq.length) return false;
  return phase.seq[phase.currentSeqIdx].b === 'gf';
}

function toggleChampAuto() {
  state.champAuto = !state.champAuto;
  const btn = document.getElementById('champAutoBtn');
  if (btn) {
    btn.textContent = state.champAuto ? '⏹ Stop Auto' : '⚡ Auto';
    btn.classList.toggle('active', state.champAuto);
  }
  _syncChampAutoStopBtn();
  // If just turned on, start immediately
  if (state.champAuto) _champAutoLaunch();
}

function _syncChampAutoStopBtn() {
  const stopBtn = document.getElementById('champAutoStopBtn');
  if (!stopBtn) return;
  stopBtn.style.display = state.champAuto ? '' : 'none';
}

// Called from result.js after showResult() records the match
function champAutoTick() {
  if (!state.champAuto || !state.championship) return;

  const cs = state.championship;

  // Championship is fully done
  if (cs.completed) {
    state.champAuto = false;
    _updateChampAutoBtn();
    return;
  }

  // Shared: go-to-bracket-and-launch logic
  const _proceed = () => {
    if (!state.champAuto) return;
    renderChampionshipBracket();
    showScreen('bracket');
    if (_isNextMatchGrandFinal()) {
      state.champAuto = false;
      _updateChampAutoBtn();
      const btn = document.getElementById('nextMatchBtn');
      if (btn) { btn.textContent = '🏆 Fight Grand Final'; btn.style.animation = 'pulse 0.8s infinite alternate'; }
      return;
    }
    setTimeout(() => { if (state.champAuto) _champAutoLaunch(); }, 600);
  };

  // Mid-BO3 (no match winner yet, no reward wheel) → play next game immediately
  if (state.bo3) {
    const wn = state.bo3.winsNeeded ?? 2;
    if (state.bo3.wins[0] < wn && state.bo3.wins[1] < wn) {
      setTimeout(() => {
        if (!state.champAuto) return;
        if (state.championship) state.arenaId = randomArenaChampionship(state.fighters?.length ?? 2);
        showScreen('game');
        startGame();
      }, 1200);
      return;
    }
  }

  // Match fully decided — reward wheel will show at +500ms
  // Register close callback so manual OR auto-close both trigger _proceed
  if (typeof pvpRewardSetOnClose === 'function') pvpRewardSetOnClose(_proceed);

  // Auto-spin after wheel has appeared (500ms delay + 300ms buffer = 800ms)
  setTimeout(() => {
    if (!state.champAuto) return;
    const modal   = document.getElementById('pvp-reward-modal');
    const spinBtn = document.getElementById('pvp-spin-btn');
    if (modal?.style.display !== 'none' && spinBtn && !spinBtn.disabled) {
      spinBtn.click();
      // Auto-click Continue after 4000ms spin + 600ms buffer
      setTimeout(() => {
        if (!state.champAuto) return;
        document.getElementById('pvp-reward-continue')?.click();
      }, 4600);
    } else {
      // Wheel didn't appear (e.g. draw) → clear callback and proceed directly
      if (typeof pvpRewardSetOnClose === 'function') pvpRewardSetOnClose(null);
      setTimeout(_proceed, 500);
    }
  }, 800);
}

function _champAutoLaunch() {
  const cs = state.championship;
  if (!cs || cs.completed || !state.champAuto) return;
  if (_isNextMatchGrandFinal()) {
    state.champAuto = false;
    _updateChampAutoBtn();
    return;
  }
  if (!getNextChampionshipMatch()) { state.champAuto = false; _updateChampAutoBtn(); return; }
  launchNextChampionshipMatch();
}

function _updateChampAutoBtn() {
  const btn = document.getElementById('champAutoBtn');
  if (btn) {
    btn.textContent = '⚡ Auto';
    btn.classList.remove('active');
  }
  const nmBtn = document.getElementById('nextMatchBtn');
  if (nmBtn) nmBtn.style.animation = '';
  _syncChampAutoStopBtn();
}

// ── Launch next match from bracket screen ─────────────────────
function launchNextChampionshipMatch() {
  const cs=state.championship; if (!cs||cs.completed) return;
  const info=getNextChampionshipMatch(); if (!info) return;
  const champPlayerCount = info.type === 'ffa' ? (info.fighters?.length ?? 4) : 2;
  state.arenaId=randomArenaChampionship(champPlayerCount); state.teamIds=[];
  if (info.type==='ffa') {
    state.fighters=info.fighters; state.matchMode='ffa'; state.bo3=null;
  } else {
    state.fighters=[info.p1,info.p2]; state.matchMode='1v1';
    const bo=info.bo??1;
    state.bo3 = bo>1 ? {wins:[0,0],gameNum:1,fighters:[info.p1,info.p2],winsNeeded:Math.ceil(bo/2),bo} : null;
    if (typeof applyAsmodeusBo3Bonus === 'function') applyAsmodeusBo3Bonus();
  }
  updateBO3Display(); _syncChampAutoStopBtn(); showScreen('game'); startGame();
}

// ── Rendering ─────────────────────────────────────────────────
// Compare fighters by identity-safe key (survives JSON round-trip)
function _sameF(a, b) { return a && b && a.charName === b.charName && a.color === b.color; }

function renderChampionshipBracket() {
  const cs=state.championship; if (!cs) return;
  const titleEl=document.getElementById('bracket-title');
  if (titleEl) titleEl.textContent='🏆 Toraco Championship '+cs.size;
  const phase=cs.phases[cs.viewPhaseIdx];
  const piEl=document.getElementById('bracket-phase-info');
  if (piEl) piEl.textContent=phase?phase.label:'';
  const prevBtn=document.getElementById('prevPhaseBtn');
  const nextBtn=document.getElementById('nextPhaseBtn');
  if (prevBtn) prevBtn.disabled=cs.viewPhaseIdx<=0;
  if (nextBtn) nextBtn.disabled=cs.viewPhaseIdx>=cs.currentPhaseIdx;
  const nmBtn=document.getElementById('nextMatchBtn');
  if (nmBtn) {
    if (cs.completed) { nmBtn.disabled=true; nmBtn.textContent='🏆 Championship Over'; }
    else {
      const hasNext = !!getNextChampionshipMatch();
      nmBtn.disabled = !hasNext;
      nmBtn.style.animation = '';
      if (hasNext && _isNextMatchGrandFinal()) nmBtn.textContent = '🏆 Fight Grand Final';
      else nmBtn.textContent = '⚔️ Fight Next Match';
    }
  }
  // Show Auto button only in championship, hide when completed or at GF
  const autoBtn = document.getElementById('champAutoBtn');
  if (autoBtn) {
    const showAuto = !cs.completed && !!getNextChampionshipMatch() && !_isNextMatchGrandFinal();
    autoBtn.style.display = showAuto ? '' : 'none';
    autoBtn.textContent = state.champAuto ? '⏹ Stop Auto' : '⚡ Auto';
    autoBtn.classList.toggle('active', !!state.champAuto);
  }
  const content=document.getElementById('bracket-content'); if (!content) return;
  content.innerHTML='';
  // Champion banner — shown only on the final phase view, then falls through to render the bracket too
  if (cs.completed && cs.champion && cs.viewPhaseIdx === cs.currentPhaseIdx) {
    const champ=cs.champion;
    const w=document.createElement('div'); w.className='bracket-champ-wrap';
    const trophy=document.createElement('div'); trophy.className='bracket-champ-trophy'; trophy.textContent='🏆'; w.appendChild(trophy);
    const lbl=document.createElement('div'); lbl.className='bracket-champ-label'; lbl.textContent=cs.name || ('Toraco Champion '+cs.size); w.appendChild(lbl);
    const card=document.createElement('div');
    card.className='bracket-match current bracket-champ-card';
    card.style.cssText='border-color:'+champ.color+';box-shadow:0 0 32px '+champ.color+'55';
    const prow=document.createElement('div');
    prow.className='bracket-player winner clickable';
    prow.style.cssText='font-size:15px;padding:10px 12px';
    const dot=document.createElement('span'); dot.className='bp-dot'; dot.style.cssText='background:'+champ.color+';width:14px;height:14px'; prow.appendChild(dot);
    const nm=document.createElement('span'); nm.style.color=champ.color; nm.textContent=(champ.charEmoji||'')+' '+(champ.charName||'???'); prow.appendChild(nm);
    prow.addEventListener('click',()=>showFighterCard(champ));
    card.appendChild(prow); w.appendChild(card); content.appendChild(w);
    // Fall through — render the completed bracket below the champion card
  }
  if (!phase) return;
  // isActive = true only when viewing the current live phase AND championship is still running
  const isActive = !cs.completed && cs.currentPhaseIdx === cs.viewPhaseIdx;
  if (phase.type==='ffa') _renderCsFfa(content,phase,isActive);
  if (phase.type==='1v1') _renderCs1v1(content,phase,isActive);
  if (phase.type==='de')  _renderCsDe(content,phase,isActive);
}

function _renderCsFfa(content, phase, isActive) {
  const grid=document.createElement('div'); grid.className='cs-ffa-grid';
  phase.groups.forEach((g,gi)=>{
    const isCur=isActive&&gi===phase.currentGroup&&!g.done;
    const card=document.createElement('div');
    card.className='cs-group-card'+(isCur?' current':'')+(g.done?' done':'');
    const badge=document.createElement('div'); badge.className='cs-group-badge';
    badge.textContent='Group '+(gi+1); card.appendChild(badge);
    g.fighters.forEach(f=>{
      const isW=g.done&&_sameF(g.winner,f);
      const row=document.createElement('div');
      row.className='cs-fighter-row'+(isW?' winner':'')+' clickable';
      const dot=document.createElement('span'); dot.className='cs-dot'; dot.style.background=f.color; row.appendChild(dot);
      const nm=document.createElement('span'); nm.className='cs-fname'; nm.textContent=(f.charEmoji||'')+' '+f.charName; row.appendChild(nm);
      if (isW) { const ck=document.createElement('span'); ck.className='cs-win-mark'; ck.textContent='✓'; row.appendChild(ck); }
      row.addEventListener('click',e=>{e.stopPropagation();showFighterCard(f);});
      card.appendChild(row);
    });
    grid.appendChild(card);
  });
  content.appendChild(grid);
}

function _renderCs1v1(content, phase, isActive) {
  const grid=document.createElement('div'); grid.className='bracket-grid';
  const mc=(phase.matches||[]).length;
  grid.style.gridTemplateColumns='repeat('+(mc>=16?4:mc>=4?2:1)+', 1fr)';
  (phase.matches||[]).forEach((m,mi)=>{
    const isCur=isActive&&mi===phase.currentMatch&&!m.winner;
    const card=document.createElement('div');
    card.className='bracket-match'+(isCur?' current':'')+(m.winner?' done':'');
    const badge=document.createElement('div'); badge.className='bracket-match-num';
    badge.textContent='#'+(mi+1); card.appendChild(badge);
    [m.p1,m.p2].forEach(f=>{
      if (!f) return;
      const row=document.createElement('div');
      row.className='bracket-player'+(_sameF(m.winner,f)?' winner':'')+' clickable';
      const dot=document.createElement('span'); dot.className='bp-dot'; dot.style.background=f.color;
      const nm=document.createElement('span'); nm.className='bp-name'; nm.textContent=(f.charEmoji||'')+' '+f.charName;
      row.appendChild(dot); row.appendChild(nm);
      row.addEventListener('click',e=>{e.stopPropagation();showFighterCard(f);});
      card.appendChild(row);
    });
    if (m.winner&&m.bo3Wins) {
      const sc=document.createElement('div'); sc.className='bracket-score';
      sc.textContent=m.bo3Wins[0]+' – '+m.bo3Wins[1]; card.appendChild(sc);
    }
    grid.appendChild(card);
  });
  content.appendChild(grid);
}

function _renderCsDe(content, phase, isActive) {
  if (!phase.ub) {
    const p=document.createElement('div'); p.className='cs-de-pending';
    p.textContent='⏳ Waiting for previous phase to complete…'; content.appendChild(p); return;
  }
  const wrap=document.createElement('div'); wrap.className='cs-de-wrapper';
  function mkSec(title) {
    const el=document.createElement('div'); el.className='cs-de-section';
    if (title) { const h=document.createElement('div'); h.className='cs-de-section-title'; h.textContent=title; el.appendChild(h); }
    return el;
  }
  function mkRound(lbl, matches) {
    const el=document.createElement('div'); el.className='cs-de-round';
    if (lbl) { const l=document.createElement('div'); l.className='cs-de-round-label'; l.textContent=lbl; el.appendChild(l); }
    const row=document.createElement('div'); row.className='cs-de-match-row';
    matches.forEach(m=>row.appendChild(_csDeCard(m,phase,isActive))); el.appendChild(row); return el;
  }
  const ubSec=mkSec('⬆ Winners Bracket');
  [{l:'Round 1',m:phase.ub.r1},{l:'Round 2',m:phase.ub.r2},{l:'Semi',m:phase.ub.sf},{l:'Final',m:phase.ub.f}]
    .filter(({m})=>!!m)
    .forEach(({l,m})=>ubSec.appendChild(mkRound(l,m)));
  wrap.appendChild(ubSec);
  const lbSec=mkSec('⬇ Losers Bracket');
  [{l:'R1',m:phase.lb.r1},{l:'R2',m:phase.lb.r2},{l:'R3',m:phase.lb.r3},{l:'R4',m:phase.lb.r4},{l:'Semi',m:phase.lb.sf},{l:'Final',m:phase.lb.f}]
    .filter(({m})=>!!m)
    .forEach(({l,m})=>lbSec.appendChild(mkRound(l,m)));
  wrap.appendChild(lbSec);
  const gfSec=mkSec('🏆 Grand Final'); gfSec.appendChild(mkRound('',[phase.gf]));
  wrap.appendChild(gfSec); content.appendChild(wrap);
}

function _csDeCard(m, phase, isActive) {
  let isCur=false;
  if (isActive&&phase.seq&&phase.currentSeqIdx<phase.seq.length) {
    const {b,r,i}=phase.seq[phase.currentSeqIdx]; isCur=(m===(b==='gf'?phase.gf:phase[b][r][i]));
  }
  const card=document.createElement('div');
  card.className='bracket-match cs-de-match'+(isCur?' current':'')+(m.winner?' done':'');
  [m.p1,m.p2].forEach(f=>{
    const row=document.createElement('div');
    if (!f) {
      row.className='bracket-player';
      const dot=document.createElement('span'); dot.className='bp-dot'; dot.style.background='#333'; row.appendChild(dot);
      const nm=document.createElement('span'); nm.className='bp-name'; nm.style.color='#444'; nm.textContent='TBD'; row.appendChild(nm);
    } else {
      row.className='bracket-player'+(_sameF(m.winner,f)?' winner':'')+' clickable';
      const dot=document.createElement('span'); dot.className='bp-dot'; dot.style.background=f.color;
      const nm=document.createElement('span'); nm.className='bp-name'; nm.textContent=(f.charEmoji||'')+' '+f.charName;
      row.appendChild(dot); row.appendChild(nm);
      row.addEventListener('click',e=>{e.stopPropagation();showFighterCard(f);});
    }
    card.appendChild(row);
  });
  if (m.winner&&m.bo3Wins) {
    const sc=document.createElement('div'); sc.className='bracket-score';
    sc.textContent=m.bo3Wins[0]+' – '+m.bo3Wins[1]; card.appendChild(sc);
  }
  return card;
}

// ── Setup screen ──────────────────────────────────────────────
function buildChampionshipSetup() {
  // Init state if entering fresh
  if (!state.championship || state.championship.phases) {
    state.championship = { size: 128, selectedFighters: [] };
  }
  const cs   = state.championship;
  const size = cs.size || 128;

  document.querySelectorAll('[data-cssize]').forEach(b =>
    b.classList.toggle('sel', parseInt(b.dataset.cssize) === size));

  // Show name/tag form if not yet set
  if (!cs.tag) {
    _buildChampionshipTagForm(cs);
    return;
  }

  // Update page title with championship identity
  const titleEl = document.querySelector('#championship-setup .game-title');
  if (titleEl) titleEl.innerHTML = `🏆 ${cs.name} <span style="font-family:monospace;font-size:0.6em;color:#88aaff;vertical-align:middle;opacity:0.85"> [${cs.tag}]</span>`;

  if (size === 32 || size === 64 || size === 128) {
    _buildChampionshipDraft(cs);
  } else {
    _buildChampionshipRosterPick(cs, size);
  }
}

// ── Championship Name/Tag Setup Form ──────────────────────────
function _buildChampionshipTagForm(cs) {
  const listEl = document.getElementById('cs-roster-list');
  if (!listEl) return;
  document.getElementById('csSelectAllBtn').style.display = 'none';
  document.getElementById('csClearBtn').style.display    = 'none';
  document.getElementById('csStartBtn').disabled = true;
  const si = document.getElementById('cs-slot-info');
  if (si) si.textContent = '';

  listEl.innerHTML = `
    <div class="cs-tag-form">
      <div class="cs-tag-form-title">⚔️ Name Your Championship</div>
      <div class="cs-tag-form-row">
        <label class="cs-tag-label">Championship Name <span style="color:#445">(1–16 chars)</span></label>
        <input id="csChampName" maxlength="16" placeholder="e.g. Sunohana" class="cg-name-input" style="width:220px">
      </div>
      <div class="cs-tag-form-row">
        <label class="cs-tag-label">Tag <span style="color:#445">(exactly 3 chars, like Discord)</span></label>
        <input id="csChampTag" maxlength="3" placeholder="SHN" class="cg-name-input cs-tag-input">
      </div>
      <button class="cg-btn primary" id="csTagSubmit" style="margin-top:14px;width:100%;max-width:320px">✓ Set & Continue →</button>
      <div id="csTagError" style="color:#ff4455;font-size:12px;margin-top:6px;display:none"></div>
    </div>`;

  const tagInput  = document.getElementById('csChampTag');
  const nameInput = document.getElementById('csChampName');

  tagInput.addEventListener('input', () => {
    tagInput.value = tagInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  const submit = () => {
    const name  = nameInput.value.trim();
    const tag   = tagInput.value.trim();
    const errEl = document.getElementById('csTagError');
    if (!name)           { errEl.textContent = 'Championship name cannot be empty.'; errEl.style.display = ''; return; }
    if (tag.length !== 3){ errEl.textContent = 'Tag must be exactly 3 characters.';  errEl.style.display = ''; return; }
    cs.name = name;
    cs.tag  = tag;
    saveDraftProgress();   // persist name/tag immediately
    buildChampionshipSetup();
  };

  document.getElementById('csTagSubmit').addEventListener('click', submit);
  [nameInput, tagInput].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); }));
}

// ── Size=32/64/128: Draft Phase UI ────────────────────────────
function _buildChampionshipDraft(cs) {
  // Ensure draft state exists
  if (!cs.draftRoster) {
    cs.draftRoster = [];
    initUniquePool();
    initDemonSinPool();
    saveDraftProgress();   // persist initial empty draft
  }
  const draft = cs.draftRoster;
  const size  = cs.size;
  const full  = draft.length >= size;

  // Slot info
  const si = document.getElementById('cs-slot-info');
  if (si) {
    si.textContent = `(${draft.length} / ${size} in draft)`;
    si.style.color = full ? '#44bb77' : '#556';
  }

  // Show/hide Select All / Clear buttons (not relevant for draft)
  const selAllBtn = document.getElementById('csSelectAllBtn');
  const clrBtn    = document.getElementById('csClearBtn');
  if (selAllBtn) selAllBtn.style.display = 'none';
  if (clrBtn)    clrBtn.style.display    = 'none';

  // Render draft roster list
  const listEl = document.getElementById('cs-roster-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  // Action buttons row
  const actRow = document.createElement('div');
  actRow.className = 'cs-draft-actions';
  if (!full) {
    actRow.innerHTML = `
      <button class="t-sel-btn cs-draft-btn" onclick="initChargenDraft()">⚗️ Create Player</button>
      <button class="t-sel-btn cs-draft-btn" onclick="quickCreateDraft()">⚡ Quick Create</button>
      <button class="t-sel-btn cs-draft-btn cs-fill-btn" onclick="fillRemainingDraftSlots()">⚡ Fill ${size - draft.length} Remaining</button>`;
  } else {
    actRow.innerHTML = `<div class="cs-draft-ready">✅ Draft complete! ${size} players ready.</div>`;
  }
  listEl.appendChild(actRow);

  // Unique pool indicator
  if (cs.uniquePool) {
    const totalUniques = WEAPON_DEFS.filter(w => w.unique).length + SKILL_DEFS.filter(s => s.unique).length;
    const remaining    = cs.uniquePool.size;
    const poolEl = document.createElement('div');
    poolEl.className = 'cs-unique-pool-info';
    poolEl.innerHTML = `★ Unique pool: <b>${remaining}</b> / ${totalUniques} available`;
    listEl.appendChild(poolEl);
  }

  // Demon sin pool indicator
  if (cs.demonSinPool) {
    const totalSins = CG_SUBRACES?.demonSin?.length ?? 7;
    const sinLeft   = cs.demonSinPool.size;
    const sinEl = document.createElement('div');
    sinEl.className = 'cs-unique-pool-info';
    sinEl.style.color = sinLeft > 0 ? '#cc88ff' : '#666';
    sinEl.innerHTML = `😈 Demon sins: <b>${sinLeft}</b> / ${totalSins} available${sinLeft === 0 ? ' — sinless only' : ''}`;
    listEl.appendChild(sinEl);
  }

  // Separator
  if (draft.length > 0) {
    const sep = document.createElement('div');
    sep.className = 't-section-label';
    sep.style.cssText = 'margin-top:10px;margin-bottom:4px';
    sep.textContent = 'Draft Roster';
    listEl.appendChild(sep);
  }

  // Draft player cards
  if (draft.length === 0) {
    const empty = document.createElement('div');
    empty.className = 't-roster-empty';
    empty.textContent = 'No players yet — start creating!';
    listEl.appendChild(empty);
  } else {
    draft.forEach((ch, idx) => {
      const wDef = WEAPON_DEFS.find(w => w.id === ch.weapon);
      const wIcon = wDef?.icon ?? '';
      const uniqueWBadge = wDef?.unique ? ' <span class="unique-badge">★ UNIQUE</span>' : '';
      const uniqueSkillCount = (ch.skills || []).filter(sid => SKILL_DEFS.find(s => s.id === sid)?.unique).length;
      const uniqueSBadge = uniqueSkillCount > 0 ? ` <span class="unique-badge">★ ${uniqueSkillCount} unique</span>` : '';
      const srText = ch.subrace?.label ? ` <span style="color:#6688aa;font-size:11px">· ${ch.subrace.label}</span>` : '';

      const card = document.createElement('div');
      card.className = 't-roster-card selected';
      card.innerHTML = `
        <span class="t-slot-dot" style="background:${ch.color||'#888'}"></span>
        <span class="t-card-name" style="color:${ch.color||'#aac'}">${ch.raceEmoji||''} ${ch.name||'?'}${srText}</span>
        <span style="font-size:12px;color:#8899aa">${wIcon} ${ch.weapon||''}${uniqueWBadge}${uniqueSBadge}</span>
        <button onclick="removeDraftPlayer(${idx})" class="cs-draft-remove" title="Remove from draft">✕</button>`;
      listEl.appendChild(card);
    });
  }

  // Dot preview
  const sumEl = document.getElementById('cs-slot-summary');
  if (sumEl) {
    sumEl.innerHTML = '';
    draft.forEach(ch => {
      const dot = document.createElement('span'); dot.className = 't-summary-dot';
      dot.style.cssText = `background:${ch.color||'#888'};box-shadow:0 0 4px ${ch.color||'#888'}88`;
      dot.title = ch.name || '?'; sumEl.appendChild(dot);
    });
    const empty = size - draft.length;
    for (let i = 0; i < Math.min(empty, 20); i++) {
      const dot = document.createElement('span'); dot.className = 't-summary-dot';
      dot.style.cssText = 'background:#222;opacity:0.25;'; dot.title = 'Empty slot';
      sumEl.appendChild(dot);
    }
    if (empty > 20) {
      const more = document.createElement('span');
      more.style.cssText = 'color:#334;font-size:10px';
      more.textContent = `+${empty - 20} more slots`;
      sumEl.appendChild(more);
    }
  }

  // Start button
  const sb = document.getElementById('csStartBtn');
  if (sb) sb.disabled = !full;
}

// ── Size=64/128/256: Old roster-pick UI ───────────────────────
function _buildChampionshipRosterPick(cs, size) {
  const roster = JSON.parse(localStorage.getItem('cgRoster') || '[]');
  if (!cs.selectedFighters) cs.selectedFighters = [];
  const sel  = cs.selectedFighters;
  const full = sel.length >= size;

  // Restore Select All / Clear buttons
  const selAllBtn = document.getElementById('csSelectAllBtn');
  const clrBtn    = document.getElementById('csClearBtn');
  if (selAllBtn) selAllBtn.style.display = '';
  if (clrBtn)    clrBtn.style.display    = '';

  const si = document.getElementById('cs-slot-info');
  if (si) {
    const bots = Math.max(0, size - sel.length);
    si.textContent = '(' + sel.length + ' / ' + size + ' selected' + (bots > 0 ? ' · ' + bots + ' bot' + (bots > 1 ? 's' : '') : '') + ')';
    si.style.color = sel.length >= size ? '#44bb77' : '#556';
  }

  const listEl = document.getElementById('cs-roster-list'); if (!listEl) return;
  listEl.innerHTML = '';
  if (roster.length === 0) {
    const empty = document.createElement('div'); empty.className = 't-roster-empty';
    empty.textContent = 'No Radosers yet — create some first!'; listEl.appendChild(empty);
  } else {
    roster.forEach((ch, idx) => {
      const isSel = sel.includes(idx); const isLocked = !isSel && full;
      const card = document.createElement('div');
      card.className = 't-roster-card' + (isSel ? ' selected' : '') + (isLocked ? ' full-not-selected' : '');
      const wIcon = WEAPON_DEFS.find(d => d.id === ch.weapon)?.icon ?? '';
      card.innerHTML = '<span class="t-slot-dot" style="background:' + (ch.color || '#888') + '"></span>'
        + '<span class="t-card-name" style="color:' + (ch.color || '#aac') + '">' + (ch.raceEmoji || '') + ' ' + (ch.name || '?') + '</span>'
        + '<span style="font-size:12px;color:#8899aa">' + wIcon + ' ' + (ch.weapon || '') + '</span>'
        + '<span class="t-card-check">' + (isSel ? '✓' : '') + '</span>';
      if (!isLocked) {
        card.addEventListener('click', () => {
          const cur = state.championship.selectedFighters || []; const pos = cur.indexOf(idx);
          if (pos >= 0) cur.splice(pos, 1);
          else if (cur.length < size) cur.push(idx);
          state.championship.selectedFighters = cur; buildChampionshipSetup();
        });
      }
      listEl.appendChild(card);
    });
  }

  const sb = document.getElementById('csStartBtn');
  if (sb) {
    sb.disabled = roster.length === 0;
    sb.onclick = null; // standard start handled elsewhere
  }

  const sumEl = document.getElementById('cs-slot-summary');
  if (sumEl) {
    sumEl.innerHTML = '';
    sel.forEach(idx => {
      const ch = roster[idx]; if (!ch) return;
      const dot = document.createElement('span'); dot.className = 't-summary-dot';
      dot.style.cssText = 'background:' + (ch.color || '#888') + ';box-shadow:0 0 4px ' + (ch.color || '#888') + '88';
      dot.title = ch.name || '?'; sumEl.appendChild(dot);
    });
    const bots = Math.max(0, size - sel.length);
    for (let i = 0; i < Math.min(bots, 20); i++) {
      const dot = document.createElement('span'); dot.className = 't-summary-dot';
      dot.style.cssText = 'background:#444;opacity:0.4'; dot.title = 'Bot'; sumEl.appendChild(dot);
    }
    if (bots > 20) {
      const more = document.createElement('span'); more.style.cssText = 'color:#445;font-size:10px';
      more.textContent = '+' + (bots - 20) + ' bots'; sumEl.appendChild(more);
    }
  }
}

function _updateChampionshipResumeUI() {
  const info=getChampionshipSaveInfo(); const el=document.getElementById('cs-resume-btn'); if (!el) return;
  if (!info || info.completed) { el.style.display='none'; return; }
  if (info.isDraft) {
    el.style.display=''; el.textContent=`▶ Resume Draft ${info.size} (${info.draftCount}/${info.size} players)`;
  } else {
    el.style.display=''; el.textContent='▶ Resume Championship '+info.size+' (Phase '+info.currentPhase+'/'+info.totalPhases+')';
  }
}
