
// ============================================================
// AUDIO — HTMLAudioElement (works with file:// protocol)
//         + Web Audio procedural fallback
// ============================================================
// ─── Tổng quan hệ thống âm thanh ────────────────────────────
// Game chạy từ file:// nên không dùng fetch/XHR được.
// Giải pháp: HTMLAudioElement + cloneNode() — hoạt động tốt với file://.
// Flow khi phát âm thanh:
//   1. _play(key) thử phát file mp3/wav đã preload
//   2. Nếu file không load được → fallback _tone() dùng Web Audio API
//      để tổng hợp âm thanh procedurally (oscillator + gain envelope)
// API công khai (gọi từ collision.js, ball.js, traps.js...):
//   sfxHit(weaponId)   — tiếng đánh trúng (chọn file theo loại vũ khí)
//   sfxParry()         — tiếng parry (clash kim loại)
//   sfxShoot(weaponId) — tiếng bắn bow / shuriken
//   sfxWallBounce()    — tiếng ball nảy tường
//   sfxLightning()     — tiếng sét (Mjolnir, Angel Smite)
//   sfxDeath()         — tiếng ball chết (procedural only)
//   sfxScale()         — tiếng ding khi weapon scale up

const AudioCtx = window.AudioContext || window.webkitAudioContext; // cross-browser
let actx = null; // Web Audio Context, khởi tạo lazy (chỉ tạo khi cần)

// ─── getACtx ─────────────────────────────────────────────────
// Trả về AudioContext đang active. Tạo mới nếu chưa có.
// Resume nếu bị suspend (trình duyệt tự suspend khi không có user gesture).
function getACtx() {
  if (!actx) actx = new AudioCtx();
  if (actx.state === 'suspended') actx.resume(); // cần resume sau user gesture đầu tiên
  return actx;
}

// ── File-based playback (HTMLAudioElement) ───────────────────
const _audios = {}; // { key: HTMLAudioElement } — cache các file đã load

// ─── _loadAudio ──────────────────────────────────────────────
// Tạo HTMLAudioElement, preload và lưu vào _audios[key].
// Gọi ngay khi script load — không dùng fetch nên hoạt động với file://.
// Tham số: key (string) — tên tra cứu, path (string) — đường dẫn file sfx/
function _loadAudio(key, path) {
  const a = new Audio(path);
  a.preload = 'auto'; // bảo trình duyệt load ngay vào bộ nhớ
  _audios[key] = a;
}

// Preload toàn bộ SFX ngay khi script load (không fetch, dùng được file://)
_loadAudio('parry',           'sfx/sfx_parry.mp3');
_loadAudio('hit_sword',       'sfx/sfx_hit_sword.mp3');
_loadAudio('hit_dagger',      'sfx/sfx_hit_dagger.mp3');
_loadAudio('hit_spear',       'sfx/sfx_hit_spear.mp3');
_loadAudio('hit_fists',       'sfx/sfx_hit_fists.mp3');
_loadAudio('hit_scythe',      'sfx/sfx_hit_scythe.mp3');
_loadAudio('hit_hammer',      'sfx/sfx_hit_hammer.mp3');
_loadAudio('hit_generic',     'sfx/sfx_hit_generic.wav');
_loadAudio('shoot_bow',       'sfx/sfx_shoot_bow.mp3');
_loadAudio('shoot_shuriken',  'sfx/sfx_shoot_shuriken.mp3');
_loadAudio('bounce_shuriken', 'sfx/sfx_bounce_shuriken.mp3');
_loadAudio('wall_bounce',     'sfx/sfx_wall_bounce.mp3');
_loadAudio('lightning',       'sfx/sfx_lightning.mp3');

// ─── _play ───────────────────────────────────────────────────
// Phát 1 SFX đã preload. Dùng cloneNode() để nhiều âm thanh cùng loại
// có thể chồng lên nhau (vd: nhiều hit liên tiếp không bị cắt ngang).
// Tham số: key (string), vol (number 0–1, default 0.3)
// Trả về: true nếu phát được, false nếu file không có / lỗi → caller dùng fallback
function _play(key, vol = 0.3) {
  const a = _audios[key];
  if (!a) return false;
  try {
    const clone = a.cloneNode();          // clone để nhiều âm thanh cùng lúc không bị block
    clone.volume = Math.min(1, Math.max(0, vol)); // clamp vol vào [0, 1]
    clone.play().catch(() => {});         // bắt lỗi auto-play policy (Chrome)
    return true;
  } catch(e) { return false; }
}

// ── Procedural fallback ──────────────────────────────────────
// ─── _tone ───────────────────────────────────────────────────
// Tổng hợp âm thanh procedurally bằng Web Audio API.
// Dùng khi file sfx không load được (ví dụ: file bị xóa, trình duyệt block).
// Mô hình: OscillatorNode → GainNode → destination
//   freq     — tần số ban đầu (Hz): cao = âm cao (parry ~880Hz), thấp = âm trầm (death ~100Hz)
//   type     — dạng sóng: 'sine' (mượt), 'square' (pixel-y), 'sawtooth' (harsh)
//   duration — thời gian (giây)
//   vol      — âm lượng ban đầu (0–1)
//   decay    — hệ số pitch decay: freq cuối = freq × decay (< 1 = pitch giảm dần)
// Tham số: freq, type, duration, vol, decay (tất cả number/string)
// Trả về: không có
function _tone(freq, type, duration, vol, decay) {
  try {
    const ctx  = getACtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    // Pitch sweep từ freq → freq×decay trong khoảng duration
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * decay, ctx.currentTime + duration);
    // Volume envelope: vol → gần 0 (fade out)
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

// ── Public SFX API ───────────────────────────────────────────
// Tất cả function bên dưới đều theo pattern:
//   1. Thử _play(file) trước
//   2. Nếu fail → fallback _tone() procedural
// ✏️  Muốn thêm file sfx mới: drop file vào sfx/, gọi _loadAudio(), thêm case vào đây.

// ─── sfxParry ────────────────────────────────────────────────
// Tiếng "clash" khi 2 vũ khí parry nhau. Gọi từ collidePair().
function sfxParry() {
  if (_play('parry', 0.18)) return;
  // Fallback: 2 tone square chồng lên nhau (880Hz → 660Hz) = kim loại chạm
  _tone(880, 'square', 0.12, 0.25, 0.5);
  setTimeout(() => _tone(660, 'square', 0.1, 0.15, 0.7), 30);
}

// _HIT_WEAPON_MAP: map weaponId → [sfx key, volume]
// Unique weapons không có entry riêng — sfxHit() fallback xuống hit_sword
const _HIT_WEAPON_MAP = {
  dagger:     ['hit_dagger', 0.30],
  shadowfang: ['hit_dagger', 0.30], // shadowfang = dagger skin
  spear:      ['hit_spear',  0.28],
  gungnir:    ['hit_spear',  0.28], // gungnir = spear skin
  fists:      ['hit_fists',  0.30],
  iron_fist:  ['hit_fists',  0.30], // iron_fist = fists skin
  hammer:     ['hit_hammer', 0.40],
  scythe:     ['hit_scythe', 0.45],
};

// ─── sfxHit ──────────────────────────────────────────────────
// Tiếng vũ khí đánh trúng. Gọi từ _checkWeaponHit() trong collision.js.
// Tham số: weaponId (string) — id vũ khí của attacker
function sfxHit(weaponId) {
  const entry = _HIT_WEAPON_MAP[weaponId];
  if (entry && _play(entry[0], entry[1])) return;  // weapon có file riêng
  if (_play('hit_sword',   0.22)) return;           // default: sword sound
  if (_play('hit_generic', 0.25)) return;           // last resort file
  _tone(200, 'sawtooth', 0.15, 0.3, 0.3);          // procedural fallback
}

// ─── sfxShoot ────────────────────────────────────────────────
// Tiếng bắn projectile. Gọi từ _fireSingle() / _fireBurst() trong ball.js.
// Tham số: weaponId (string) — phân biệt shuriken vs bow
function sfxShoot(weaponId) {
  if (weaponId === 'shuriken' || weaponId === 'fuma_shuriken') {
    if (_play('shoot_shuriken', 0.28)) return;
  } else {
    if (_play('shoot_bow', 0.25)) return;
  }
  _tone(440, 'sine', 0.08, 0.1, 1.5); // fallback: pitch-up ting
}

// ─── sfxShurikenBounce ───────────────────────────────────────
// Tiếng shuriken nảy tường. Gọi từ projectile.js khi proj bounce wall.
function sfxShurikenBounce() {
  _play('bounce_shuriken', 0.10);
}

// ─── sfxWallBounce ───────────────────────────────────────────
// Tiếng ball nảy tường arena. Gọi từ arena.js / ball.js.
function sfxWallBounce() {
  _play('wall_bounce', 0.18);
}

// ─── sfxLightning ────────────────────────────────────────────
// Tiếng sét — Mjolnir strike hoặc Angel Smite. Gọi từ traps.js / skills.js.
function sfxLightning() {
  if (_play('lightning', 0.35)) return;
  _tone(120, 'sawtooth', 0.2, 0.3, 0.1); // fallback: pitch-down rumble
}

// ─── sfxDeath ────────────────────────────────────────────────
// Tiếng ball chết — luôn dùng procedural (chủ ý, không có file).
// 2 tone chồng nhau: sawtooth trầm + square rất trầm sau 100ms
function sfxDeath() {
  _tone(100, 'sawtooth', 0.4, 0.4, 0.2);
  setTimeout(() => _tone(60, 'square', 0.3, 0.3, 0.5), 100);
}

// ─── sfxScale ────────────────────────────────────────────────
// Tiếng "ding" khi weapon scale up (floating number hiện trên màn).
// Gọi từ _logWeaponScaleIfChanged() trong collision.js.
function sfxScale() {
  _tone(1100, 'sine', 0.15, 0.15, 0.8); // high-pitched sine = ding
}

// ── Legacy alias (dùng bởi chargen.js + particles.js) ────────
// playTone() là tên cũ — giữ alias để không cần sửa các file đã dùng
function playTone(freq, type, duration, vol, decay) {
  _tone(freq, type, duration, vol, decay);
}
