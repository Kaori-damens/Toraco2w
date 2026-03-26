// ============================================================
// RACE ASSET EDITOR
// ============================================================

window.AE_DATA = {};
window._raceAssetOverrides = {};  // populated from AE_RACE_DEFAULTS after it's defined below

const AE = {
  raceId: 'gnome',
  shapes: [],
  nextId: 1,
  selected: null,
  hoverId: null,
  angle: 0,
  spinning: false,
  dragging: false,
  dragType: null,    // 'body' | 'vertex'
  dragVertexIdx: -1,
  dragStartLx: 0, dragStartLy: 0,
  dragSnapX: 0, dragSnapY: 0,
  dragSnapPoints: null,
  frozenAngle: 0,
  drawMode: null,    // null | 'polygon'
  drawPoints: [],
};

const AE_RACE_DEFAULTS = {
  goblin: [
    { type:'polygon', label:'Ear L',       points:[[-0.15,-0.78],[-0.50,-1.65],[0.45,-1.55]], fill:'#4a7a20', stroke:'#2a4a10', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Ear L Inner', points:[[-0.10,-0.86],[-0.35,-1.45],[0.24,-1.38]], fill:'#ff8888', stroke:null,      sw:1,   opacity:1, visible:true },
    { type:'polygon', label:'Ear R',       points:[[-0.15, 0.78],[-0.50, 1.65],[0.45, 1.55]], fill:'#4a7a20', stroke:'#2a4a10', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Ear R Inner', points:[[-0.10, 0.86],[-0.35, 1.45],[0.24, 1.38]], fill:'#ff8888', stroke:null,      sw:1,   opacity:1, visible:true },
  ],
  gnome: [
    { type:'ellipse', label:'Hat Brim', x:0.05, y:-0.95, rx:0.62, ry:0.18, rot:0, fill:'#773311', stroke:'#552200', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Hat Cone', points:[[-0.55,-0.97],[0.05,-2.25],[0.65,-0.97]],       fill:'#cc6633', stroke:'#883311', sw:1.5, opacity:1, visible:true },
    { type:'ellipse', label:'Hat Band', x:0.05, y:-1.06, rx:0.55, ry:0.15, rot:0, fill:null,   stroke:'#ffcc44', sw:2.2, opacity:1, visible:true },
  ],
  human: [
    { type:'line', label:'Hair 1', points:[[-0.27,-0.88],[-0.50,-1.46]], stroke:'#8B5E3C', sw:3, opacity:1, visible:true },
    { type:'line', label:'Hair 2', points:[[-0.13,-0.88],[-0.24,-1.46]], stroke:'#8B5E3C', sw:3, opacity:1, visible:true },
    { type:'line', label:'Hair 3', points:[[ 0.04,-0.88],[ 0.06,-1.46]], stroke:'#8B5E3C', sw:3, opacity:1, visible:true },
    { type:'line', label:'Hair 4', points:[[ 0.18,-0.88],[ 0.32,-1.46]], stroke:'#8B5E3C', sw:3, opacity:1, visible:true },
    { type:'line', label:'Hair 5', points:[[ 0.31,-0.88],[ 0.56,-1.46]], stroke:'#8B5E3C', sw:3, opacity:1, visible:true },
  ],
  dwarf: [
    { type:'polygon', label:'Beard',   points:[[-0.72,-0.52],[-1.36,-0.44],[-1.73,-0.20],[-1.86,0.15],[-1.75,0.55],[-0.72,0.52],[-0.93,0.29],[-1.01,0],[-0.93,-0.29]], fill:'#cc8833', stroke:'#996622', sw:1.5, opacity:1, visible:true },
    { type:'line',    label:'Braid 1', points:[[-1.10,-0.22],[-1.18, 0.22]], stroke:'#aa6611', sw:1.3, opacity:1, visible:true },
    { type:'line',    label:'Braid 2', points:[[-1.35,-0.22],[-1.43, 0.22]], stroke:'#aa6611', sw:1.3, opacity:1, visible:true },
    { type:'line',    label:'Braid 3', points:[[-1.60,-0.22],[-1.68, 0.22]], stroke:'#aa6611', sw:1.3, opacity:1, visible:true },
    { type:'ellipse', label:'Helmet',  x:0.05, y:-0.93, rx:0.58, ry:0.18, rot:0, fill:'#aaaaaa', stroke:'#666666', sw:1.5, opacity:1, visible:true },
  ],
  skeleton: [
    { type:'ellipse', label:'Socket L', x:0.43, y:-0.27, rx:0.20, ry:0.16, rot:0, fill:'#111111', stroke:null,     sw:1,   opacity:1, visible:true },
    { type:'ellipse', label:'Socket R', x:0.43, y: 0.27, rx:0.20, ry:0.16, rot:0, fill:'#111111', stroke:null,     sw:1,   opacity:1, visible:true },
    { type:'polygon', label:'Nose',     points:[[0.70,0],[0.60,-0.10],[0.60,0.10]], fill:'#111111', stroke:null, sw:1, opacity:1, visible:true },
    { type:'polygon', label:'Tooth 1',  points:[[0.76,-0.32],[0.93,-0.32],[0.93,-0.13],[0.76,-0.13]], fill:'#e8e8d8', stroke:'#666666', sw:1, opacity:1, visible:true },
    { type:'polygon', label:'Tooth 2',  points:[[0.76,-0.10],[0.93,-0.10],[0.93, 0.09],[0.76, 0.09]], fill:'#e8e8d8', stroke:'#666666', sw:1, opacity:1, visible:true },
    { type:'polygon', label:'Tooth 3',  points:[[0.76, 0.12],[0.93, 0.12],[0.93, 0.31],[0.76, 0.31]], fill:'#e8e8d8', stroke:'#666666', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Crack',    points:[[0.22,-0.66],[0.42,-0.46],[0.32,-0.30]], stroke:'rgba(0,0,0,0.5)', sw:1.8, opacity:1, visible:true },
  ],
  troll: [
    { type:'line',    label:'Hair 1', points:[[-0.32,-0.88],[-0.58,-1.74]], stroke:'#556633', sw:3,   opacity:1, visible:true },
    { type:'line',    label:'Hair 2', points:[[-0.15,-0.88],[-0.28,-1.68]], stroke:'#556633', sw:3,   opacity:1, visible:true },
    { type:'line',    label:'Hair 3', points:[[ 0.00,-0.88],[ 0.00,-1.62]], stroke:'#556633', sw:3,   opacity:1, visible:true },
    { type:'line',    label:'Hair 4', points:[[ 0.15,-0.88],[ 0.28,-1.68]], stroke:'#556633', sw:3,   opacity:1, visible:true },
    { type:'line',    label:'Hair 5', points:[[ 0.32,-0.88],[ 0.58,-1.74]], stroke:'#556633', sw:3,   opacity:1, visible:true },
    { type:'polygon', label:'Horn L', points:[[ 0.10,-0.80],[0.35,-1.32],[0.05,-1.58],[-0.10,-1.22],[0.00,-0.86]], fill:'#776644', stroke:'#554422', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Horn R', points:[[ 0.10, 0.80],[0.35, 1.32],[0.05, 1.58],[-0.10, 1.22],[0.00, 0.86]], fill:'#776644', stroke:'#554422', sw:1.5, opacity:1, visible:true },
    { type:'ellipse', label:'Nose',   x:0.86, y:0, rx:0.22, ry:0.17, rot:0, fill:'#5a7a38', stroke:'#3a5520', sw:1.5, opacity:1, visible:true },
  ],
  orc: [
    { type:'polygon', label:'Tusk L', points:[[0.60,-0.18],[1.05,-0.44],[0.90,-0.74],[0.77,-0.50],[0.71,-0.22]], fill:'#eeeebb', stroke:'#aaaa77', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Tusk R', points:[[0.60, 0.18],[1.05, 0.44],[0.90, 0.74],[0.77, 0.50],[0.71, 0.22]], fill:'#eeeebb', stroke:'#aaaa77', sw:1.5, opacity:1, visible:true },
    { type:'line',    label:'Brow L', points:[[0.25,-0.44],[0.62,-0.36]], stroke:'#1a1200', sw:3.5, opacity:1, visible:true },
    { type:'line',    label:'Brow R', points:[[0.25, 0.44],[0.62, 0.36]], stroke:'#1a1200', sw:3.5, opacity:1, visible:true },
  ],
  giant: [
    { type:'line',    label:'Crack 1',  points:[[ 0.10,-0.56],[0.28,-0.18],[0.12, 0.14]], stroke:'rgba(0,0,0,0.3)', sw:2, opacity:1, visible:true },
    { type:'line',    label:'Crack 2',  points:[[-0.30, 0.35],[-0.05,0.65]],              stroke:'rgba(0,0,0,0.3)', sw:2, opacity:1, visible:true },
    { type:'line',    label:'Crack 3',  points:[[ 0.40, 0.16],[0.65, 0.38],[0.82, 0.18]], stroke:'rgba(0,0,0,0.3)', sw:2, opacity:1, visible:true },
    { type:'line',    label:'Crack 4',  points:[[-0.55,-0.30],[-0.77,-0.06]],             stroke:'rgba(0,0,0,0.3)', sw:2, opacity:1, visible:true },
    { type:'ellipse', label:'Pebble 1', x: 0.22, y:-0.38, rx:0.10, ry:0.10, rot:0, fill:'rgba(255,255,255,0.13)', stroke:null, sw:1, opacity:1, visible:true },
    { type:'ellipse', label:'Pebble 2', x:-0.44, y: 0.20, rx:0.08, ry:0.08, rot:0, fill:'rgba(255,255,255,0.13)', stroke:null, sw:1, opacity:1, visible:true },
    { type:'ellipse', label:'Pebble 3', x: 0.55, y: 0.30, rx:0.07, ry:0.07, rot:0, fill:'rgba(255,255,255,0.13)', stroke:null, sw:1, opacity:1, visible:true },
  ],
  dragon: [
    { type:'polygon', label:'Horn L',    points:[[0.15,-0.78],[0.33,-1.28],[0.25,-1.69],[0.00,-1.88],[-0.10,-1.62],[-0.04,-1.23],[0.10,-0.82]], fill:'#cc3300', stroke:'rgba(0,0,0,0.45)', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Horn R',    points:[[0.15, 0.78],[0.33, 1.28],[0.25, 1.69],[0.00, 1.88],[-0.10, 1.62],[-0.04, 1.23],[0.10, 0.82]], fill:'#cc3300', stroke:'rgba(0,0,0,0.45)', sw:1.5, opacity:1, visible:true },
    { type:'line',    label:'Tail',      points:[[-0.85,0],[-1.40,0.16],[-1.92,0.28]], stroke:'#cc3300', sw:3.5, opacity:1, visible:true },
    { type:'polygon', label:'Tail Tip',  points:[[-1.74,0.22],[-2.04,0.32],[-1.82,0.44]], fill:'#cc3300', stroke:null, sw:1, opacity:1, visible:true },
    // Scale arc marks — 5-point approximations of ctx.arc(cx,cy,0.18, PI*0.12, PI*0.88)
    { type:'line', label:'Scale 1', points:[[-0.083,-0.394],[-0.154,-0.308],[-0.250,-0.280],[-0.346,-0.308],[-0.417,-0.394]], stroke:'#cc3300aa', sw:1.3, opacity:1, visible:true },
    { type:'line', label:'Scale 2', points:[[ 0.227,-0.564],[ 0.156,-0.478],[ 0.060,-0.450],[-0.036,-0.478],[-0.107,-0.564]], stroke:'#cc3300aa', sw:1.3, opacity:1, visible:true },
    { type:'line', label:'Scale 3', points:[[-0.083, 0.394],[-0.154, 0.308],[-0.250, 0.280],[-0.346, 0.308],[-0.417, 0.394]], stroke:'#cc3300aa', sw:1.3, opacity:1, visible:true },
    { type:'line', label:'Scale 4', points:[[ 0.227, 0.564],[ 0.156, 0.478],[ 0.060, 0.450],[-0.036, 0.478],[-0.107, 0.564]], stroke:'#cc3300aa', sw:1.3, opacity:1, visible:true },
    { type:'line', label:'Scale 5', points:[[ 0.497, 0.066],[ 0.426, 0.152],[ 0.330, 0.180],[ 0.234, 0.152],[ 0.163, 0.066]], stroke:'#cc3300aa', sw:1.3, opacity:1, visible:true },
  ],
  angel: [
    { type:'polygon', label:'Wing L',      points:[[ 0.35,-0.78],[-0.02,-1.35],[-0.42,-1.46],[-0.66,-1.12],[-0.12,-0.89],[0.30,-0.80]], fill:'rgba(255,255,255,0.92)', stroke:'rgba(200,200,170,0.9)', sw:1.2, opacity:1, visible:true },
    { type:'polygon', label:'Wing R',      points:[[ 0.35, 0.78],[-0.02, 1.35],[-0.42, 1.46],[-0.66, 1.12],[-0.12, 0.89],[0.30, 0.80]], fill:'rgba(255,255,255,0.92)', stroke:'rgba(200,200,170,0.9)', sw:1.2, opacity:1, visible:true },
    { type:'line',    label:'Feather L1',  points:[[ 0.30,-0.86],[-0.06,-1.12]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Feather L2',  points:[[ 0.00,-1.06],[-0.26,-1.32]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Feather L3',  points:[[-0.36,-1.12],[-0.56,-1.30]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Feather R1',  points:[[ 0.30, 0.86],[-0.06, 1.12]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Feather R2',  points:[[ 0.00, 1.06],[-0.26, 1.32]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'line',    label:'Feather R3',  points:[[-0.36, 1.12],[-0.56, 1.30]], stroke:'rgba(180,180,160,0.55)', sw:1, opacity:1, visible:true },
    { type:'ellipse', label:'Halo',        x:0, y:-1.55, rx:0.56, ry:0.17, rot:0, fill:null, stroke:'#ffdd33', sw:3, opacity:1, visible:true },
  ],
  primordial: [
    { type:'ellipse', label:'Swirl Inner', x:0, y:0, rx:0.52, ry:0.52, rot:0, fill:null, stroke:'rgba(110,150,255,0.55)', sw:1.8, opacity:1, visible:true },
    { type:'ellipse', label:'Swirl Outer', x:0, y:0, rx:0.74, ry:0.74, rot:0, fill:null, stroke:'rgba(255,90,190,0.45)',  sw:1.8, opacity:1, visible:true },
    { type:'ellipse', label:'Orb 1',       x: 1.44, y:  0,    rx:0.13, ry:0.13, rot:0, fill:'#6699ff', stroke:null, sw:1, opacity:1, visible:true },
    { type:'ellipse', label:'Orb 2',       x:-0.72, y:  1.25, rx:0.13, ry:0.13, rot:0, fill:'#ff55aa', stroke:null, sw:1, opacity:1, visible:true },
    { type:'ellipse', label:'Orb 3',       x:-0.72, y: -1.25, rx:0.13, ry:0.13, rot:0, fill:'#55ffdd', stroke:null, sw:1, opacity:1, visible:true },
  ],
  demon: [
    { type:'ellipse', label:'Aura',        x:0, y:0, rx:1.18, ry:1.18, rot:0, fill:null, stroke:'rgba(180,0,0,0.28)', sw:6, opacity:1, visible:true },
    { type:'polygon', label:'Horn L',      points:[[0.10,-0.78],[0.28,-1.80],[0.52,-0.84]], fill:'#cc1100', stroke:'#880000', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Horn L Glow', points:[[0.15,-0.82],[0.22,-1.56],[0.33,-0.87]], fill:'#ff3322', stroke:null,     sw:1,   opacity:1, visible:true },
    { type:'polygon', label:'Horn R',      points:[[0.10, 0.78],[0.28, 1.80],[0.52, 0.84]], fill:'#cc1100', stroke:'#880000', sw:1.5, opacity:1, visible:true },
    { type:'polygon', label:'Horn R Glow', points:[[0.15, 0.82],[0.22, 1.56],[0.33, 0.87]], fill:'#ff3322', stroke:null,     sw:1,   opacity:1, visible:true },
    { type:'line',    label:'Tail',        points:[[-0.85,0],[-1.35,0.43],[-1.52,0.88]], stroke:'#cc1100', sw:3, opacity:1, visible:true },
    { type:'polygon', label:'Tail Tip',    points:[[-1.34,0.88],[-1.64,0.76],[-1.57,0.88],[-1.64,1.00]], fill:'#cc1100', stroke:null, sw:1, opacity:1, visible:true },
  ],
  god: [
    { type:'line',    label:'Ray 1',    points:[[ 1.26, 0.00],[ 1.90, 0.00]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 2',    points:[[ 0.89, 0.89],[ 1.34, 1.34]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 3',    points:[[ 0.00, 1.26],[ 0.00, 1.90]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 4',    points:[[-0.89, 0.89],[-1.34, 1.34]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 5',    points:[[-1.26, 0.00],[-1.90, 0.00]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 6',    points:[[-0.89,-0.89],[-1.34,-1.34]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 7',    points:[[ 0.00,-1.26],[ 0.00,-1.90]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'line',    label:'Ray 8',    points:[[ 0.89,-0.89],[ 1.34,-1.34]], stroke:'rgba(255,215,0,0.70)', sw:2.2, opacity:1, visible:true },
    { type:'ellipse', label:'Halo Ring', x:0, y:0, rx:1.22, ry:1.22, rot:0, fill:null, stroke:'rgba(255,215,0,0.78)', sw:3, opacity:1, visible:true },
  ],
};
// Keep alias for backward compat
const AE_GNOME_DEFAULTS = AE_RACE_DEFAULTS.gnome;

// ── Baked-in race overrides ─────────────────────────────────────────────
// These races use static custom shapes instead of the animated switch case.
// Angel uses the switch case (has golden-glow halo via ctx.shadowBlur).
// Goblin / Gnome / Human / Dwarf / Troll / Giant use the switch case too.
window._raceAssetOverrides = {
  // ── Races with custom static shapes ────────────────────────────────
  skeleton:   AE_RACE_DEFAULTS.skeleton,
  orc:        AE_RACE_DEFAULTS.orc,
  dragon:     AE_RACE_DEFAULTS.dragon.filter(s => s.label !== 'Horn L' && s.label !== 'Horn R'),
  demon:      AE_RACE_DEFAULTS.demon,
  // Angel: key present so switch-case is skipped; halo drawn via special code in override block
  angel:      [],
  // ── Races with NO decoration (empty array = skip switch case too) ──
  goblin: [], gnome: [], human: [], dwarf: [], troll: [], giant: [],
  // primordial & god: NOT listed → fall through to switch case → animated effects preserved
};

function aeNewId() {
  return 's' + (AE.nextId++);
}

function aeLoadRace(raceId) {
  // Save current shapes to AE_DATA
  window.AE_DATA[AE.raceId] = AE.shapes.map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  AE.raceId = raceId;
  AE.selected = null;
  AE.hoverId = null;
  // Load from: in-session cache → saved overrides → hardcoded defaults → empty
  if (window.AE_DATA[raceId]) {
    AE.shapes = window.AE_DATA[raceId].map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else if (window._raceAssetOverrides?.[raceId]?.length > 0) {
    AE.shapes = window._raceAssetOverrides[raceId].map(s => Object.assign({ id: aeNewId() }, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else if (AE_RACE_DEFAULTS[raceId]) {
    AE.shapes = AE_RACE_DEFAULTS[raceId].map(s => Object.assign({ id: aeNewId() }, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else {
    AE.shapes = [];
  }
  aeRenderLayers();
  aeRenderProps();
  if (typeof aeUpdateSaveIndicator === 'function') aeUpdateSaveIndicator();
}

function aeOpen(raceId) {
  const el = document.getElementById('screen-asset-editor');
  el.classList.add('ae-open');
  // Sync race id without saving (first open)
  AE.raceId = raceId || 'gnome';
  document.getElementById('ae-race-select').value = AE.raceId;
  // Load shapes: in-session cache → saved overrides → hardcoded defaults → empty
  if (window.AE_DATA[AE.raceId]) {
    AE.shapes = window.AE_DATA[AE.raceId].map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else if (window._raceAssetOverrides?.[AE.raceId]?.length > 0) {
    AE.shapes = window._raceAssetOverrides[AE.raceId].map(s => Object.assign({ id: aeNewId() }, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else if (AE_RACE_DEFAULTS[AE.raceId]) {
    AE.shapes = AE_RACE_DEFAULTS[AE.raceId].map(s => Object.assign({ id: aeNewId() }, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  } else {
    AE.shapes = [];
  }
  AE.selected = null;
  AE.hoverId = null;
  AE.drawMode = null;
  AE.drawPoints = [];
  AE.spinning = false;
  document.getElementById('ae-spin-cb').checked = false;
  aeRenderLayers();
  aeRenderProps();
  if (typeof aeUpdateSaveIndicator === 'function') aeUpdateSaveIndicator();
  // Start RAF loop
  if (window._aeRAF) cancelAnimationFrame(window._aeRAF);
  function aeLoop() {
    aeRender();
    window._aeRAF = requestAnimationFrame(aeLoop);
  }
  aeLoop();
}

function aeClose() {
  const el = document.getElementById('screen-asset-editor');
  el.classList.remove('ae-open');
  if (window._aeRAF) { cancelAnimationFrame(window._aeRAF); window._aeRAF = null; }
  // Save
  window.AE_DATA[AE.raceId] = AE.shapes.map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
  AE.drawMode = null;
  AE.drawPoints = [];
}

function aeScreenToLocal(e) {
  const canvas = document.getElementById('ae-canvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (e.clientX - rect.left) * scaleX;
  const cy = (e.clientY - rect.top) * scaleY;
  const CX = canvas.width / 2, CY = canvas.height / 2;
  const R = 65;
  const dx = cx - CX, dy = cy - CY;
  const a = AE.dragging ? AE.frozenAngle : AE.angle;
  const cos = Math.cos(-a), sin = Math.sin(-a);
  return {
    lx: +(( dx*cos - dy*sin) / R).toFixed(4),
    ly: +(( dx*sin + dy*cos) / R).toFixed(4),
    cx, cy
  };
}

function aeDistSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx*dx + dy*dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax)*dx + (py - ay)*dy) / len2));
  return Math.hypot(px - (ax + t*dx), py - (ay + t*dy));
}

function aeHitBody(lx, ly, s) {
  switch (s.type) {
    case 'ellipse': {
      const ndx = (lx - s.x) / Math.max(Math.abs(s.rx), 0.05);
      const ndy = (ly - s.y) / Math.max(Math.abs(s.ry), 0.05);
      return ndx*ndx + ndy*ndy <= 1.5;
    }
    case 'polygon': {
      if (!s.points || s.points.length < 3) return false;
      let inside = false;
      for (let i = 0, j = s.points.length - 1; i < s.points.length; j = i++) {
        const xi = s.points[i][0], yi = s.points[i][1];
        const xj = s.points[j][0], yj = s.points[j][1];
        if (((yi > ly) !== (yj > ly)) && (lx < (xj - xi) * (ly - yi) / (yj - yi) + xi)) inside = !inside;
      }
      if (inside) return true;
      for (let i = 0; i < s.points.length; i++) {
        const j = (i + 1) % s.points.length;
        if (aeDistSeg(lx, ly, s.points[i][0], s.points[i][1], s.points[j][0], s.points[j][1]) < 0.2) return true;
      }
      return false;
    }
    case 'line': {
      if (!s.points || s.points.length < 2) return false;
      for (let i = 0; i < s.points.length - 1; i++) {
        if (aeDistSeg(lx, ly, s.points[i][0], s.points[i][1], s.points[i+1][0], s.points[i+1][1]) < 0.25) return true;
      }
      return false;
    }
  }
  return false;
}

function aeGetHandlePoints(s, R) {
  if (s.type === 'ellipse') {
    const cx = s.x * R, cy = s.y * R;
    const rx = Math.abs(s.rx * R), ry = Math.abs(s.ry * R);
    return [[cx-rx,cy-ry],[cx,cy-ry],[cx+rx,cy-ry],[cx+rx,cy],[cx+rx,cy+ry],[cx,cy+ry],[cx-rx,cy+ry],[cx-rx,cy]];
  }
  if (s.points) return s.points.map(([px, py]) => [px * R, py * R]);
  return [];
}

function aeHitTest(lx, ly) {
  // Check vertex handles of selected shape first
  if (AE.selected) {
    const s = AE.shapes.find(x => x.id === AE.selected);
    if (s) {
      const handles = aeGetHandlePoints(s, 1); // in r-units
      for (let i = 0; i < handles.length; i++) {
        const dx = lx - handles[i][0], dy = ly - handles[i][1];
        if (Math.hypot(dx, dy) < 0.2) return { id: s.id, type: 'vertex', idx: i };
      }
    }
  }
  // Body hit test, reverse order
  for (let i = AE.shapes.length - 1; i >= 0; i--) {
    const s = AE.shapes[i];
    if (!s.visible) continue;
    if (aeHitBody(lx, ly, s)) return { id: s.id, type: 'body', idx: -1 };
  }
  return null;
}

function aeDrawShape(ctx, s, R) {
  ctx.save();
  ctx.globalAlpha = s.opacity ?? 1;
  ctx.lineWidth = s.sw ?? 1.5;
  switch (s.type) {
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(s.x * R, s.y * R,
        Math.max(Math.abs(s.rx * R), 0.5),
        Math.max(Math.abs(s.ry * R), 0.5),
        (s.rot || 0) * Math.PI / 180, 0, Math.PI * 2);
      if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
      if (s.stroke) { ctx.strokeStyle = s.stroke; ctx.stroke(); }
      break;
    case 'polygon':
      if (!s.points || s.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0] * R, s.points[0][1] * R);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0] * R, s.points[i][1] * R);
      ctx.closePath();
      if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
      if (s.stroke) { ctx.strokeStyle = s.stroke; ctx.stroke(); }
      break;
    case 'line':
      if (!s.points || s.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0] * R, s.points[0][1] * R);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0] * R, s.points[i][1] * R);
      if (s.stroke) { ctx.strokeStyle = s.stroke; ctx.stroke(); }
      break;
  }
  ctx.restore();
}

function aeStrokeOutline(ctx, s, R) {
  switch (s.type) {
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(s.x * R, s.y * R,
        Math.max(Math.abs(s.rx * R) + 3, 3),
        Math.max(Math.abs(s.ry * R) + 3, 3),
        (s.rot || 0) * Math.PI / 180, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'polygon':
      if (!s.points || s.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0] * R, s.points[0][1] * R);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0] * R, s.points[i][1] * R);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'line':
      if (!s.points || s.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0] * R, s.points[0][1] * R);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0] * R, s.points[i][1] * R);
      ctx.stroke();
      break;
  }
}

function aeRender() {
  const canvas = document.getElementById('ae-canvas');
  if (!canvas || !canvas.offsetParent) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const CX = W / 2, CY = H / 2, R = 65;

  if (AE.spinning && !AE.dragging) AE.angle = Date.now() * 0.0004;

  ctx.clearRect(0, 0, W, H);
  // Background
  ctx.fillStyle = '#080818'; ctx.fillRect(0, 0, W, H);
  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // Center cross
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(CX, 0); ctx.lineTo(CX, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, CY); ctx.lineTo(W, CY); ctx.stroke();
  ctx.setLineDash([]);

  // Ball shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(CX, CY + R*0.88, R*0.78, R*0.24, 0, 0, Math.PI*2); ctx.fill();
  // Ball body
  ctx.fillStyle = '#4488ff'; ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke();
  // Ball highlight
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath(); ctx.ellipse(CX - R*0.28, CY - R*0.3, R*0.28, R*0.18, -0.94, 0, Math.PI*2); ctx.fill();

  // Eyes
  ctx.save(); ctx.translate(CX, CY); ctx.rotate(AE.angle);
  const eyeC = '#44ffaa'; // default preview eye color
  const er = parseInt(eyeC.slice(1,3),16), eg = parseInt(eyeC.slice(3,5),16), eb = parseInt(eyeC.slice(5,7),16);
  for (const ey of [-R*0.20, R*0.20]) {
    const ew = R*0.21, eh = R*0.085, ex = R*0.46;
    ctx.beginPath(); ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI*2);
    const g = ctx.createLinearGradient(ex, ey - eh, ex, ey + eh);
    g.addColorStop(0, `rgba(${Math.min(er+70,255)},${Math.min(eg+70,255)},${Math.min(eb+70,255)},0.9)`);
    g.addColorStop(1, `rgba(${Math.max(er-45,0)},${Math.max(eg-45,0)},${Math.max(eb-45,0)},0.78)`);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = `rgba(${er},${eg},${eb},0.4)`; ctx.lineWidth = 1;
    ctx.shadowColor = eyeC; ctx.shadowBlur = 4; ctx.stroke(); ctx.shadowBlur = 0;
  }
  ctx.restore();

  // Draw all shapes
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(AE.angle);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of AE.shapes) {
    if (!s.visible) continue;
    aeDrawShape(ctx, s, R);
  }
  // Polygon draw mode in-progress
  if (AE.drawMode === 'polygon' && AE.drawPoints.length > 0) {
    ctx.strokeStyle = 'rgba(100,200,255,0.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(AE.drawPoints[0][0] * R, AE.drawPoints[0][1] * R);
    for (let i = 1; i < AE.drawPoints.length; i++) ctx.lineTo(AE.drawPoints[i][0] * R, AE.drawPoints[i][1] * R);
    ctx.stroke(); ctx.setLineDash([]);
    for (const [px, py] of AE.drawPoints) {
      ctx.fillStyle = '#44aaff'; ctx.beginPath(); ctx.arc(px * R, py * R, 5, 0, Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();

  // Selection / hover outlines + vertex handles
  ctx.save(); ctx.translate(CX, CY); ctx.rotate(AE.angle);
  for (const s of AE.shapes) {
    const isSel = s.id === AE.selected;
    const isHov = s.id === AE.hoverId && !isSel;
    if (!isSel && !isHov) continue;
    if (!s.visible) continue;
    ctx.strokeStyle = isSel ? '#44aaff' : 'rgba(200,200,255,0.4)';
    ctx.lineWidth = isSel ? 1.5 : 1;
    ctx.setLineDash([4, 3]);
    aeStrokeOutline(ctx, s, R);
    ctx.setLineDash([]);
    if (isSel) {
      for (const [hx, hy] of aeGetHandlePoints(s, R)) {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#44aaff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function aeRenderLayers() {
  const list = document.getElementById('ae-layers-list');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < AE.shapes.length; i++) {
    const s = AE.shapes[i];
    const row = document.createElement('div');
    row.className = 'ae-layer-row' + (s.id === AE.selected ? ' ae-sel' : '');
    row.dataset.id = s.id;

    // Color dot
    const dot = document.createElement('div');
    dot.className = 'ae-layer-dot';
    const dotColor = s.fill || s.stroke || '#aaaaaa';
    dot.style.background = dotColor;
    row.appendChild(dot);

    // Name (editable on dblclick)
    const name = document.createElement('div');
    name.className = 'ae-layer-name';
    name.textContent = s.label || s.type;
    name.setAttribute('contenteditable', 'false');
    name.title = 'Double-click to rename';
    name.addEventListener('dblclick', e => {
      e.stopPropagation();
      name.setAttribute('contenteditable', 'true');
      name.focus();
      const range = document.createRange();
      range.selectNodeContents(name);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    name.addEventListener('blur', () => {
      name.setAttribute('contenteditable', 'false');
      s.label = name.textContent.trim() || s.type;
    });
    name.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); name.blur(); }
    });
    row.appendChild(name);

    // Visibility toggle
    const vis = document.createElement('button');
    vis.className = 'ae-layer-vis' + (!s.visible ? ' ae-hidden' : '');
    vis.textContent = '👁';
    vis.title = 'Toggle visibility';
    vis.addEventListener('click', e => {
      e.stopPropagation();
      s.visible = !s.visible;
      aeRenderLayers();
    });
    row.appendChild(vis);

    // Delete
    const del = document.createElement('button');
    del.className = 'ae-layer-del';
    del.textContent = '✕';
    del.title = 'Delete shape';
    del.addEventListener('click', e => {
      e.stopPropagation();
      AE.shapes.splice(i, 1);
      if (AE.selected === s.id) { AE.selected = null; aeRenderProps(); }
      aeRenderLayers();
    });
    row.appendChild(del);

    row.addEventListener('click', () => {
      AE.selected = s.id;
      aeRenderLayers();
      aeRenderProps();
    });

    list.appendChild(row);
  }
  if (AE.shapes.length === 0) {
    list.innerHTML = '<div style="font-size:11px;color:#334;text-align:center;padding:14px 0;">No shapes yet</div>';
  }
}

function aeRenderProps() {
  const body = document.getElementById('ae-props-body');
  if (!body) return;
  body.innerHTML = '';
  if (!AE.selected) {
    body.innerHTML = '<div id="ae-props-empty">Select a shape to edit its properties.</div>';
    return;
  }
  const s = AE.shapes.find(x => x.id === AE.selected);
  if (!s) { body.innerHTML = '<div id="ae-props-empty">Select a shape to edit its properties.</div>'; return; }

  const mk = (tag, cls, attrs = {}) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'textContent') el.textContent = v;
      else el.setAttribute(k, v);
    }
    return el;
  };

  // -- General group --
  const genGroup = mk('div', 'ae-prop-group');
  genGroup.appendChild(Object.assign(mk('div', 'ae-prop-group-label'), { textContent: 'General' }));

  // Label
  const labelRow = mk('div', 'ae-prop-row');
  labelRow.appendChild(Object.assign(mk('div', 'ae-prop-lbl'), { textContent: 'Label' }));
  const labelInp = mk('input', 'ae-text-inp');
  labelInp.type = 'text'; labelInp.value = s.label || '';
  labelInp.style.cssText = 'flex:1;min-width:0;';
  labelInp.addEventListener('input', () => { s.label = labelInp.value; aeRenderLayers(); });
  labelRow.appendChild(labelInp);
  genGroup.appendChild(labelRow);

  // Opacity
  const opRow = mk('div', 'ae-prop-row');
  opRow.appendChild(Object.assign(mk('div', 'ae-prop-lbl'), { textContent: 'Opacity' }));
  const opInp = mk('input', 'ae-num-inp');
  opInp.type = 'number'; opInp.step = '0.05'; opInp.min = '0'; opInp.max = '1'; opInp.value = s.opacity ?? 1;
  opInp.addEventListener('input', () => { s.opacity = parseFloat(opInp.value) || 0; });
  opRow.appendChild(opInp);
  genGroup.appendChild(opRow);
  body.appendChild(genGroup);

  // -- Shape-specific group --
  if (s.type === 'ellipse') {
    const shGroup = mk('div', 'ae-prop-group');
    shGroup.appendChild(Object.assign(mk('div', 'ae-prop-group-label'), { textContent: 'Ellipse' }));
    for (const [lbl, key] of [['X', 'x'], ['Y', 'y'], ['RX', 'rx'], ['RY', 'ry'], ['Rot°', 'rot']]) {
      const row = mk('div', 'ae-prop-row');
      row.appendChild(Object.assign(mk('div', 'ae-prop-lbl'), { textContent: lbl }));
      const inp = mk('input', 'ae-num-inp');
      inp.type = 'number'; inp.step = '0.01'; inp.value = s[key] ?? 0;
      inp.addEventListener('input', () => { s[key] = parseFloat(inp.value) || 0; });
      row.appendChild(inp);
      shGroup.appendChild(row);
    }
    body.appendChild(shGroup);
  } else if (s.type === 'polygon' || s.type === 'line') {
    const vtxGroup = mk('div', 'ae-prop-group');
    vtxGroup.appendChild(Object.assign(mk('div', 'ae-prop-group-label'), { textContent: 'Vertices' }));
    const vtxList = mk('div', 'ae-vertices-list');
    const rebuildVtx = () => {
      vtxList.innerHTML = '';
      (s.points || []).forEach((pt, vi) => {
        const row = mk('div', 'ae-vtx-row');
        const idxLbl = mk('div', 'ae-vtx-idx'); idxLbl.textContent = vi;
        const xInp = mk('input', 'ae-num-inp');
        xInp.type = 'number'; xInp.step = '0.01'; xInp.value = pt[0]; xInp.title = 'X';
        xInp.addEventListener('input', () => { pt[0] = parseFloat(xInp.value) || 0; });
        const yInp = mk('input', 'ae-num-inp');
        yInp.type = 'number'; yInp.step = '0.01'; yInp.value = pt[1]; yInp.title = 'Y';
        yInp.addEventListener('input', () => { pt[1] = parseFloat(yInp.value) || 0; });
        const delBtn = mk('button', 'ae-vtx-del'); delBtn.textContent = '✕';
        delBtn.addEventListener('click', () => {
          s.points.splice(vi, 1);
          rebuildVtx();
        });
        row.appendChild(idxLbl); row.appendChild(xInp); row.appendChild(yInp); row.appendChild(delBtn);
        vtxList.appendChild(row);
      });
    };
    rebuildVtx();
    vtxGroup.appendChild(vtxList);
    const addVtxBtn = mk('button', 'ae-add-vtx-btn'); addVtxBtn.textContent = '+ Add Vertex';
    addVtxBtn.addEventListener('click', () => {
      if (!s.points) s.points = [];
      s.points.push([0, 0]);
      rebuildVtx();
    });
    vtxGroup.appendChild(addVtxBtn);
    body.appendChild(vtxGroup);
  }

  // -- Fill group --
  const fillGroup = mk('div', 'ae-prop-group');
  fillGroup.appendChild(Object.assign(mk('div', 'ae-prop-group-label'), { textContent: 'Fill' }));

  const fillRow = mk('div', 'ae-color-row');
  const fillSwatch = mk('div', 'ae-color-swatch');
  fillSwatch.style.background = s.fill || '#000000';
  if (!s.fill) fillSwatch.classList.add('ae-color-swatch-none');
  const fillColorInp = mk('input', 'ae-color-inp');
  fillColorInp.type = 'color'; fillColorInp.value = s.fill || '#ff0000';
  fillColorInp.style.cssText = 'position:absolute;opacity:0;width:0;height:0;pointer-events:none;';
  fillSwatch.appendChild(fillColorInp);
  fillSwatch.addEventListener('click', () => { if (s.fill) fillColorInp.click(); });
  fillColorInp.addEventListener('input', () => {
    s.fill = fillColorInp.value;
    fillSwatch.style.background = s.fill;
    fillSwatch.classList.remove('ae-color-swatch-none');
    aeRenderLayers();
  });

  const noFillCb = mk('input', 'ae-nofill-cb');
  noFillCb.type = 'checkbox'; noFillCb.id = 'ae-nofill-cb'; noFillCb.checked = !s.fill;
  noFillCb.addEventListener('change', () => {
    if (noFillCb.checked) {
      s.fill = null;
      fillSwatch.style.background = '#000';
      fillSwatch.classList.add('ae-color-swatch-none');
    } else {
      s.fill = fillColorInp.value || '#ff0000';
      fillSwatch.style.background = s.fill;
      fillSwatch.classList.remove('ae-color-swatch-none');
    }
    aeRenderLayers();
  });
  const noFillLbl = mk('label', 'ae-nofill-lbl');
  noFillLbl.setAttribute('for', 'ae-nofill-cb'); noFillLbl.textContent = 'No Fill';

  fillRow.appendChild(fillSwatch);
  fillRow.appendChild(noFillCb);
  fillRow.appendChild(noFillLbl);
  fillGroup.appendChild(fillRow);
  body.appendChild(fillGroup);

  // -- Stroke group --
  const strokeGroup = mk('div', 'ae-prop-group');
  strokeGroup.appendChild(Object.assign(mk('div', 'ae-prop-group-label'), { textContent: 'Stroke' }));

  const strokeRow = mk('div', 'ae-color-row');
  const strokeSwatch = mk('div', 'ae-color-swatch');
  strokeSwatch.style.background = s.stroke || '#000000';
  if (!s.stroke) strokeSwatch.classList.add('ae-color-swatch-none');
  const strokeColorInp = mk('input', 'ae-color-inp');
  strokeColorInp.type = 'color'; strokeColorInp.value = s.stroke || '#ffffff';
  strokeColorInp.style.cssText = 'position:absolute;opacity:0;width:0;height:0;pointer-events:none;';
  strokeSwatch.appendChild(strokeColorInp);
  strokeSwatch.addEventListener('click', () => { if (s.stroke) strokeColorInp.click(); });
  strokeColorInp.addEventListener('input', () => {
    s.stroke = strokeColorInp.value;
    strokeSwatch.style.background = s.stroke;
    strokeSwatch.classList.remove('ae-color-swatch-none');
    aeRenderLayers();
  });

  const noStrokeCb = mk('input', 'ae-nofill-cb');
  noStrokeCb.type = 'checkbox'; noStrokeCb.id = 'ae-nostroke-cb'; noStrokeCb.checked = !s.stroke;
  noStrokeCb.addEventListener('change', () => {
    if (noStrokeCb.checked) {
      s.stroke = null;
      strokeSwatch.style.background = '#000';
      strokeSwatch.classList.add('ae-color-swatch-none');
    } else {
      s.stroke = strokeColorInp.value || '#ffffff';
      strokeSwatch.style.background = s.stroke;
      strokeSwatch.classList.remove('ae-color-swatch-none');
    }
    aeRenderLayers();
  });
  const noStrokeLbl = mk('label', 'ae-nofill-lbl');
  noStrokeLbl.setAttribute('for', 'ae-nostroke-cb'); noStrokeLbl.textContent = 'No Stroke';

  strokeRow.appendChild(strokeSwatch);
  strokeRow.appendChild(noStrokeCb);
  strokeRow.appendChild(noStrokeLbl);
  strokeGroup.appendChild(strokeRow);

  const swRow = mk('div', 'ae-prop-row');
  swRow.appendChild(Object.assign(mk('div', 'ae-prop-lbl'), { textContent: 'Width' }));
  const swInp = mk('input', 'ae-num-inp');
  swInp.type = 'number'; swInp.step = '0.1'; swInp.min = '0'; swInp.value = s.sw ?? 1.5;
  swInp.addEventListener('input', () => { s.sw = parseFloat(swInp.value) || 0; });
  swRow.appendChild(swInp);
  strokeGroup.appendChild(swRow);
  body.appendChild(strokeGroup);

  // -- Delete shape button --
  const delBtn = mk('button', 'ae-del-shape-btn'); delBtn.textContent = '🗑 Delete Shape';
  delBtn.addEventListener('click', () => {
    const idx = AE.shapes.findIndex(x => x.id === AE.selected);
    if (idx >= 0) AE.shapes.splice(idx, 1);
    AE.selected = null;
    aeRenderLayers();
    aeRenderProps();
  });
  body.appendChild(delBtn);
}

function aeShapeToCode(s) {
  const fmt = v => {
    const n = parseFloat(v);
    return (n === 0) ? '0' : (Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/\.?0+$/, ''));
  };
  const lines = [];
  if (s.fill || s.stroke || s.sw) {
    const parts = [];
    if (s.fill) parts.push(`ctx.fillStyle='${s.fill}';`);
    if (s.stroke) parts.push(`ctx.strokeStyle='${s.stroke}';`);
    if (s.sw) parts.push(`ctx.lineWidth=${fmt(s.sw)};`);
    lines.push('  ' + parts.join(' '));
  }
  if ((s.opacity ?? 1) !== 1) lines.push(`  ctx.globalAlpha=${fmt(s.opacity)};`);

  switch (s.type) {
    case 'ellipse': {
      const rotRad = ((s.rot || 0) * Math.PI / 180);
      const rotStr = rotRad === 0 ? '0' : fmt(rotRad);
      lines.push(`  ctx.beginPath();`);
      lines.push(`  ctx.ellipse(r*${fmt(s.x)}, r*${fmt(s.y)}, r*${fmt(Math.abs(s.rx))}, r*${fmt(Math.abs(s.ry))}, ${rotStr}, 0, Math.PI*2);`);
      if (s.fill) lines.push(`  ctx.fill();`);
      if (s.stroke) lines.push(`  ctx.stroke();`);
      break;
    }
    case 'polygon': {
      if (!s.points || s.points.length < 2) break;
      lines.push(`  ctx.beginPath();`);
      lines.push(`  ctx.moveTo(r*${fmt(s.points[0][0])}, r*${fmt(s.points[0][1])});`);
      for (let i = 1; i < s.points.length; i++)
        lines.push(`  ctx.lineTo(r*${fmt(s.points[i][0])}, r*${fmt(s.points[i][1])});`);
      lines.push(`  ctx.closePath();`);
      if (s.fill) lines.push(`  ctx.fill();`);
      if (s.stroke) lines.push(`  ctx.stroke();`);
      break;
    }
    case 'line': {
      if (!s.points || s.points.length < 2) break;
      lines.push(`  ctx.beginPath();`);
      lines.push(`  ctx.moveTo(r*${fmt(s.points[0][0])}, r*${fmt(s.points[0][1])});`);
      for (let i = 1; i < s.points.length; i++)
        lines.push(`  ctx.lineTo(r*${fmt(s.points[i][0])}, r*${fmt(s.points[i][1])});`);
      if (s.stroke) lines.push(`  ctx.stroke();`);
      break;
    }
  }
  if ((s.opacity ?? 1) !== 1) lines.push(`  ctx.globalAlpha=1;`);
  return lines.join('\n');
}

function aeGenerateCode() {
  const shapeBlocks = AE.shapes
    .filter(s => s.visible)
    .map(s => aeShapeToCode(s))
    .filter(Boolean)
    .join('\n');
  return `case '${AE.raceId}': {\n  ctx.rotate(fa);\n${shapeBlocks}\n  eyes(); break;\n}`;
}

// ---- Canvas mouse events ----
function aeSetupCanvas() {
  const canvas = document.getElementById('ae-canvas');
  if (!canvas) return;

  let lastClickTime = 0;

  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const { lx, ly } = aeScreenToLocal(e);

    if (AE.drawMode === 'polygon') {
      const now = Date.now();
      if (now - lastClickTime < 350 && AE.drawPoints.length >= 2) {
        // Double-click: close polygon
        const newShape = {
          id: aeNewId(),
          type: 'polygon',
          label: 'Polygon ' + AE.nextId,
          points: AE.drawPoints.map(p => [...p]),
          fill: '#445566',
          stroke: '#aabbcc',
          sw: 1.5,
          opacity: 1,
          visible: true
        };
        AE.shapes.push(newShape);
        AE.selected = newShape.id;
        AE.drawMode = null;
        AE.drawPoints = [];
        document.getElementById('ae-add-polygon-btn').classList.remove('ae-active-mode');
        document.getElementById('ae-mode-hint').textContent = '';
        aeRenderLayers();
        aeRenderProps();
      } else {
        AE.drawPoints.push([lx, ly]);
      }
      lastClickTime = now;
      return;
    }

    // Freeze angle
    AE.frozenAngle = AE.angle;
    const hit = aeHitTest(lx, ly);
    if (!hit) {
      AE.selected = null;
      aeRenderLayers();
      aeRenderProps();
      return;
    }
    if (hit.id !== AE.selected) {
      AE.selected = hit.id;
      aeRenderLayers();
      aeRenderProps();
    }
    const s = AE.shapes.find(x => x.id === hit.id);
    if (!s) return;
    AE.dragging = true;
    AE.dragType = hit.type;
    AE.dragVertexIdx = hit.idx;
    AE.dragStartLx = lx;
    AE.dragStartLy = ly;
    if (s.type === 'ellipse') {
      AE.dragSnapX = s.x;
      AE.dragSnapY = s.y;
    }
    if (s.points) {
      AE.dragSnapPoints = s.points.map(p => [...p]);
    }
    e.preventDefault();
  });

  canvas.addEventListener('mousemove', e => {
    const { lx, ly } = aeScreenToLocal(e);
    if (AE.dragging) {
      const s = AE.shapes.find(x => x.id === AE.selected);
      if (!s) return;
      const dlx = lx - AE.dragStartLx;
      const dly = ly - AE.dragStartLy;
      if (AE.dragType === 'body') {
        if (s.type === 'ellipse') {
          s.x = +(AE.dragSnapX + dlx).toFixed(4);
          s.y = +(AE.dragSnapY + dly).toFixed(4);
          // Sync props panel
          const props = document.getElementById('ae-props-body');
          if (props) {
            const inputs = props.querySelectorAll('input[type="number"]');
            // x and y are first two in ellipse group
          }
        } else if (s.points && AE.dragSnapPoints) {
          for (let i = 0; i < s.points.length; i++) {
            s.points[i][0] = +(AE.dragSnapPoints[i][0] + dlx).toFixed(4);
            s.points[i][1] = +(AE.dragSnapPoints[i][1] + dly).toFixed(4);
          }
        }
      } else if (AE.dragType === 'vertex') {
        const idx = AE.dragVertexIdx;
        if (s.type === 'ellipse') {
          // Vertex handles for ellipse: adjust rx/ry/position based on handle index
          const cx = AE.dragSnapX, cy = AE.dragSnapY;
          const origHandles = [
            // 8 handles: corners and mid-edges
            // lx,ly are already in r-units
          ];
          // For ellipse, just move body on vertex drag for simplicity
          s.x = +(AE.dragSnapX + dlx).toFixed(4);
          s.y = +(AE.dragSnapY + dly).toFixed(4);
        } else if (s.points && AE.dragSnapPoints && idx >= 0 && idx < s.points.length) {
          s.points[idx][0] = +(AE.dragSnapPoints[idx][0] + dlx).toFixed(4);
          s.points[idx][1] = +(AE.dragSnapPoints[idx][1] + dly).toFixed(4);
        }
      }
      // Refresh props for live update
      aeRenderProps();
    } else {
      // Hover
      const hit = aeHitTest(lx, ly);
      const newHover = hit ? hit.id : null;
      if (newHover !== AE.hoverId) {
        AE.hoverId = newHover;
        canvas.style.cursor = newHover ? 'pointer' : (AE.drawMode ? 'crosshair' : 'default');
      }
    }
  });

  canvas.addEventListener('mouseup', () => {
    if (AE.dragging) {
      AE.dragging = false;
      AE.dragType = null;
      AE.dragVertexIdx = -1;
      AE.dragSnapPoints = null;
      aeRenderProps();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    AE.hoverId = null;
    if (AE.dragging) {
      AE.dragging = false;
      AE.dragType = null;
    }
  });
}

// ---- Wire up UI ----
(function aeInit() {
  document.addEventListener('DOMContentLoaded', () => {
    // Open button
    const openBtn = document.getElementById('assetEditorBtn');
    if (openBtn) openBtn.addEventListener('click', () => aeOpen('gnome'));

    // Close button
    const closeBtn = document.getElementById('ae-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', aeClose);

    // Race selector
    const raceSel = document.getElementById('ae-race-select');
    if (raceSel) {
      raceSel.addEventListener('change', () => aeLoadRace(raceSel.value));
    }

    // Spin checkbox
    const spinCb = document.getElementById('ae-spin-cb');
    if (spinCb) spinCb.addEventListener('change', () => { AE.spinning = spinCb.checked; });

    // Add shape buttons
    const addEllipseBtn = document.getElementById('ae-add-ellipse-btn');
    if (addEllipseBtn) addEllipseBtn.addEventListener('click', () => {
      const s = {
        id: aeNewId(), type: 'ellipse', label: 'Ellipse ' + AE.nextId,
        x: 0, y: -1.0, rx: 0.5, ry: 0.2, rot: 0,
        fill: '#445566', stroke: '#aabbcc', sw: 1.5, opacity: 1, visible: true
      };
      AE.shapes.push(s);
      AE.selected = s.id;
      AE.drawMode = null;
      AE.drawPoints = [];
      document.getElementById('ae-add-polygon-btn').classList.remove('ae-active-mode');
      document.getElementById('ae-mode-hint').textContent = '';
      aeRenderLayers();
      aeRenderProps();
    });

    const addPolygonBtn = document.getElementById('ae-add-polygon-btn');
    if (addPolygonBtn) addPolygonBtn.addEventListener('click', () => {
      if (AE.drawMode === 'polygon') {
        // Cancel
        AE.drawMode = null;
        AE.drawPoints = [];
        addPolygonBtn.classList.remove('ae-active-mode');
        document.getElementById('ae-mode-hint').textContent = '';
      } else {
        AE.drawMode = 'polygon';
        AE.drawPoints = [];
        addPolygonBtn.classList.add('ae-active-mode');
        document.getElementById('ae-mode-hint').textContent = 'Click to add vertices • Double-click to finish';
      }
    });

    const addLineBtn = document.getElementById('ae-add-line-btn');
    if (addLineBtn) addLineBtn.addEventListener('click', () => {
      const s = {
        id: aeNewId(), type: 'line', label: 'Line ' + AE.nextId,
        points: [[-0.5, 0], [0.5, 0]],
        fill: null, stroke: '#aabbcc', sw: 1.5, opacity: 1, visible: true
      };
      AE.shapes.push(s);
      AE.selected = s.id;
      AE.drawMode = null;
      AE.drawPoints = [];
      document.getElementById('ae-add-polygon-btn').classList.remove('ae-active-mode');
      document.getElementById('ae-mode-hint').textContent = '';
      aeRenderLayers();
      aeRenderProps();
    });

    // Clear all
    const clearBtn = document.getElementById('ae-clear-btn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      if (!confirm('Clear all shapes for this race?')) return;
      AE.shapes = [];
      AE.selected = null;
      AE.drawMode = null;
      AE.drawPoints = [];
      document.getElementById('ae-add-polygon-btn').classList.remove('ae-active-mode');
      document.getElementById('ae-mode-hint').textContent = '';
      aeRenderLayers();
      aeRenderProps();
    });

    // Save-indicator helper — call whenever race or save state changes
    function aeUpdateSaveIndicator() {
      const hasSave = !!(window._raceAssetOverrides && Object.prototype.hasOwnProperty.call(window._raceAssetOverrides, AE.raceId));
      const btn = document.getElementById('ae-save-btn');
      const ind = document.getElementById('ae-save-indicator');
      if (btn) btn.classList.toggle('has-save', hasSave);
      if (ind) ind.classList.toggle('visible', hasSave);
    }

    // Save — persist to localStorage and apply immediately in drawRaceDecoration
    const saveBtn = document.getElementById('ae-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      const raceId = AE.raceId;
      const snapshots = AE.shapes.map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
      window._raceAssetOverrides = window._raceAssetOverrides || {};
      window._raceAssetOverrides[raceId] = snapshots;
      localStorage.setItem('raceAssets', JSON.stringify(window._raceAssetOverrides));
      saveBtn.textContent = '✓ Saved!';
      setTimeout(() => { saveBtn.textContent = '💾 Save'; }, 1500);
      aeUpdateSaveIndicator();
    });

    // Default — restore hardcoded defaults for current race
    const defaultBtn = document.getElementById('ae-default-btn');
    if (defaultBtn) defaultBtn.addEventListener('click', () => {
      const raceId = AE.raceId;
      const defs = AE_RACE_DEFAULTS[raceId];
      if (defs) {
        AE.shapes = defs.map(s => Object.assign({ id: aeNewId() }, s,
          s.points ? { points: s.points.map(p => [...p]) } : {}));
      } else {
        AE.shapes = [];
      }
      AE.selected = null;
      // Only resets in-memory view — does NOT touch localStorage.
      // To persist, click 💾 Save after resetting.
      window.AE_DATA[raceId] = AE.shapes.map(s => Object.assign({}, s, s.points ? { points: s.points.map(p => [...p]) } : {}));
      aeRenderLayers();
      aeRenderProps();
      defaultBtn.textContent = '✓ Reset!';
      setTimeout(() => { defaultBtn.textContent = '⚡ Default'; }, 1500);
      // indicator unchanged — Default doesn't touch save state
    });

    // Remove Save — deletes localStorage override, restores built-in animated switch case
    const removeSaveBtn = document.getElementById('ae-remove-save-btn');
    if (removeSaveBtn) removeSaveBtn.addEventListener('click', () => {
      const raceId = AE.raceId;
      if (window._raceAssetOverrides) delete window._raceAssetOverrides[raceId];
      localStorage.setItem('raceAssets', JSON.stringify(window._raceAssetOverrides || {}));
      aeUpdateSaveIndicator();
    });

    // Export (kept for reference, button removed from UI)
    const exportBtn = document.getElementById('ae-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', () => {
      const code = aeGenerateCode();
      document.getElementById('ae-export-code').value = code;
      document.getElementById('ae-export-modal').classList.add('open');
    });

    // Copy
    const copyBtn = document.getElementById('ae-copy-btn');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      const ta = document.getElementById('ae-export-code');
      ta.select();
      try { document.execCommand('copy'); } catch(e) {}
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1500);
    });

    // Export close
    const exportClose = document.getElementById('ae-export-close');
    if (exportClose) exportClose.addEventListener('click', () => {
      document.getElementById('ae-export-modal').classList.remove('open');
    });
    const exportModal = document.getElementById('ae-export-modal');
    if (exportModal) exportModal.addEventListener('click', e => {
      if (e.target === exportModal) exportModal.classList.remove('open');
    });

    // Close editor on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (document.getElementById('ae-export-modal').classList.contains('open')) {
          document.getElementById('ae-export-modal').classList.remove('open');
        } else if (document.getElementById('screen-asset-editor').classList.contains('ae-open')) {
          if (AE.drawMode) {
            AE.drawMode = null;
            AE.drawPoints = [];
            const pb = document.getElementById('ae-add-polygon-btn');
            if (pb) pb.classList.remove('ae-active-mode');
            const hint = document.getElementById('ae-mode-hint');
            if (hint) hint.textContent = '';
          } else {
            aeClose();
          }
        }
      }
    });

    aeSetupCanvas();
  });
})();

// Load roster on start
renderRoster();
