
// ============================================================
// AUDIO — HTMLAudioElement (works with file:// protocol)
//         + Web Audio procedural fallback
// ============================================================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;

function getACtx() {
  if (!actx) actx = new AudioCtx();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

// ── File-based playback (HTMLAudioElement) ───────────────────
const _audios = {};

function _loadAudio(key, path) {
  const a = new Audio(path);
  a.preload = 'auto';
  _audios[key] = a;
}

// Preload all SFX files immediately (no fetch, works on file://)
_loadAudio('parry',           'sfx/sfx_parry.mp3');
_loadAudio('hit_sword',       'sfx/sfx_hit_sword.mp3');
_loadAudio('hit_dagger',      'sfx/sfx_hit_dagger.mp3');
_loadAudio('hit_spear',       'sfx/sfx_hit_spear.mp3');
_loadAudio('hit_fists',       'sfx/sfx_hit_fists.mp3');
_loadAudio('hit_scythe',      'sfx/sfx_hit_scythe.mp3');
_loadAudio('hit_generic',     'sfx/sfx_hit_generic.wav');
_loadAudio('shoot_bow',       'sfx/sfx_shoot_bow.mp3');
_loadAudio('shoot_shuriken',  'sfx/sfx_shoot_shuriken.mp3');
_loadAudio('bounce_shuriken', 'sfx/sfx_bounce_shuriken.mp3');
_loadAudio('wall_bounce',     'sfx/sfx_wall_bounce.mp3');
_loadAudio('lightning',       'sfx/sfx_lightning.mp3');

function _play(key, vol = 0.3) {
  const a = _audios[key];
  if (!a) return false;
  try {
    const clone = a.cloneNode();
    clone.volume = Math.min(1, Math.max(0, vol));
    clone.play().catch(() => {});
    return true;
  } catch(e) { return false; }
}

// ── Procedural fallback ──────────────────────────────────────
function _tone(freq, type, duration, vol, decay) {
  try {
    const ctx  = getACtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * decay, ctx.currentTime + duration);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

// ── Public SFX API ───────────────────────────────────────────

function sfxParry() {
  if (_play('parry', 0.18)) return;
  _tone(880, 'square', 0.12, 0.25, 0.5);
  setTimeout(() => _tone(660, 'square', 0.1, 0.15, 0.7), 30);
}

const _HIT_WEAPON_MAP = {
  dagger:     ['hit_dagger', 0.30],
  shadowfang: ['hit_dagger', 0.30],
  spear:      ['hit_spear',  0.28],
  gungnir:    ['hit_spear',  0.28],
  fists:      ['hit_fists',  0.30],
  iron_fist:  ['hit_fists',  0.30],
  scythe:     ['hit_scythe', 0.45],
};
function sfxHit(weaponId) {
  const entry = _HIT_WEAPON_MAP[weaponId];
  if (entry && _play(entry[0], entry[1])) return;
  if (_play('hit_sword',   0.22)) return;
  if (_play('hit_generic', 0.25)) return;
  _tone(200, 'sawtooth', 0.15, 0.3, 0.3);
}

function sfxShoot(weaponId) {
  if (weaponId === 'shuriken' || weaponId === 'fuma_shuriken') {
    if (_play('shoot_shuriken', 0.28)) return;
  } else {
    if (_play('shoot_bow', 0.25)) return;
  }
  _tone(440, 'sine', 0.08, 0.1, 1.5);
}

function sfxShurikenBounce() {
  _play('bounce_shuriken', 0.10);
}

function sfxWallBounce() {
  _play('wall_bounce', 0.18);
}

function sfxLightning() {
  if (_play('lightning', 0.35)) return;
  _tone(120, 'sawtooth', 0.2, 0.3, 0.1);
}

function sfxDeath() {
  _tone(100, 'sawtooth', 0.4, 0.4, 0.2);
  setTimeout(() => _tone(60, 'square', 0.3, 0.3, 0.5), 100);
}

function sfxScale() {
  _tone(1100, 'sine', 0.15, 0.15, 0.8);
}

// ── Legacy alias (used by chargen.js + particles.js) ─────────
function playTone(freq, type, duration, vol, decay) {
  _tone(freq, type, duration, vol, decay);
}
