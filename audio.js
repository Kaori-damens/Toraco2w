
// ============================================================
// AUDIO (Web Audio API — procedural, no files needed)
// ============================================================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;

function getACtx() {
  if (!actx) actx = new AudioCtx();
  return actx;
}

function playTone(freq, type, duration, vol, decay) {
  try {
    const ctx = getACtx();
    const osc = ctx.createOscillator();
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

function sfxParry()  { playTone(880, 'square', 0.12, 0.25, 0.5); setTimeout(()=>playTone(660,'square',0.1,0.15,0.7),30); }
function sfxHit()    { playTone(200, 'sawtooth', 0.15, 0.3, 0.3); }
function sfxShoot()  { playTone(440, 'sine', 0.08, 0.1, 1.5); }
function sfxDeath()  { playTone(100, 'sawtooth', 0.4, 0.4, 0.2); setTimeout(()=>playTone(60,'square',0.3,0.3,0.5),100); }
function sfxScale()  { playTone(1100, 'sine', 0.15, 0.15, 0.8); }
