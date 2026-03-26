// ============================================================
// GAME STATE
// ============================================================
let state = {
  running: false,
  paused: false,
  ended: false,
  players: [],
  projectiles: [],
  arena: null,
  gravity: false,
  speed: 1,
  frame: 0,
  fighters: [],
  arenaId: 'square',
  winner: null,
  // Countdown + timer
  phase: 'menu',       // 'countdown' | 'playing'
  countdownFrame: 0,
  matchTime: 0,
  // BO3 (set by tournament)
  bo3: null,           // { wins:[0,0], gameNum:1, fighters:[f0,f1] } or null
  // Tournament
  tournament: null,    // { size, rounds, currentRound, currentMatch, ... } or null
  tournament2v2: null, // 2v2 tournament state or null
  matchMode: '1v1',    // '1v1' | '2v2'
  teamIds: [],         // array of teamId per fighter index
  winTeam: -1,         // winning team index in 2v2
};
