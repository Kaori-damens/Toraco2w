// ============================================================
// AUDIENCE STAND — Radosers from the current season cheer
// ============================================================
// ─── Tổng quan hệ thống khán đài ────────────────────────────
// Khán đài hiển thị 1–16 Radoser từ season hiện tại ngồi xem trận.
// Mỗi khán giả là 1 mini ball (canvas 48×50px) + tên bên dưới.
// Hai loại chat:
//   • Chatter tự động — ngẫu nhiên từ AUDIENCE_LINES, mỗi 2.2–4.8s
//   • Triggered reaction — từ _AUD_REACT, kích hoạt khi có event chiến đấu
//     (crit, parry, evade, phoenix, comeback, rage mode, v.v.)
// API công khai:
//   initAudience()             — gọi mỗi round, xây khán đài + chọn spectators
//   startAudienceChatter()     — bật auto-chat (gọi khi countdown bắt đầu)
//   stopAudienceChatter()      — tắt auto-chat (gọi khi round kết thúc)
//   audienceReact(trigger, data) — trigger 1 reaction cụ thể từ sự kiện chiến đấu

// ✏️  Sửa AUDIENCE_LINES để thay đổi câu khán giả tự động nói:
const AUDIENCE_LINES = [
  "Look at the move!",
  "What was that?!",
  "L + ratio",
  "bro is cooked",
  "GG EZ no re",
  "skill issue tbh",
  "chat is this real??",
  "LETS GOOO 🎉",
  "nah he's DONE done",
  "my grandma plays better",
  "this is cinema ",
  "he's built different fr",
  "no way that just happened",
  "they're so cooked rn",
  "I've seen enough, I'm satisfied",
  "peak fiction 📖",
  "gg wp ez clap 👏",
];
// ============================================================

const _AUD_BUBBLE_MS = 3200; // ms bubble hiện trên màn hình trước khi ẩn
const _AUD_DELAY_MIN = 3200; // khoảng cách tối thiểu giữa hai lần tự chat (ms)
const _AUD_DELAY_MAX = 5800; // khoảng cách tối đa (random trong [min, max])

// ── Triggered reaction lines ─────────────────────────────────
// Mỗi key là 1 trigger event, value là mảng câu nói (hoặc function trả mảng).
// audienceReact(trigger) chọn ngẫu nhiên 1 câu từ pool tương ứng.
// ✏️  Thêm câu vào bất kỳ array nào để khán giả có thêm phản ứng:
const _AUD_REACT = {
  double_parry: [
    'Damn 😤', 'CLASH!!', 'both parried??', 'bro they both blocked 💀',
    'CLANG 🔔', 'no way', 'both on point fr', 'that was clean',
    'BOTH blocked??', 'OMG CLASH', 'parry check passed 💀', 'bro same time??',
  ],
  crit: [
    "CRIT!! 💥", "bro got DELETED", "that hit different 😬",
    "ouch 💀", "no way that crit", "critical damage?!",
    "OHHH", "felt that from here", "he's in trouble fr",
  ],
  big_damage: [
    "ONE SHOT?? 😱", "that hurt fr", "bro got folded",
    "MASSIVE hit", "he's cooked after that", "half HP gone??",
    "nah that's too much damage", "send help 💀", "bro is on fumes",
  ],
  evade: [
    "DODGE!! 💨", "Matrix moment 🕶️", "how did he dodge that??",
    "bro said no thanks", "clean evade fr", "NIMBLE",
    "he felt it coming", "too slippery", "untouchable rn",
  ],
  proj_kill: [
    "HEADSHOT 🎯", "sniped lmao", "finished from range??",
    "bow diff","shuriken diff","long range execution", "he never even got close",
    "bro died to a projectile 💀", "didn't even touch him",
  ],
  disarm_react: [
    "they dropped it?? 😱", "no weapon rip", "dropped the weapon bruh",
    "fists only mode activated", "bro is weaponless 💀",
    "DISARMED?!", "pick it up pick it up", "oh no oh no oh no",
  ],
  phoenix_react: [
    "BRO REVIVED?? 😱", "no way Phoenix", "he came back from the dead??",
    "PHOENIX RISING 🔥", "that should've been the end", "undying fr",
    "how is he still alive", "second chance activated","Gojo ahh momment",
  ],
  low_hp: [
    "jj", "almost cooked", "one more hit and he's done",
    "he's BARELY alive", "critical condition", "come on come on",
    "survive it", "this might be it", "bro has like 1 HP left",
  ],
  comeback: [
    "COMEBACK!! 🏆", "DOWN BAD → WINNER 🔥", "I KNEW IT I KNEW IT",
    "from the brink!!", "REDEMPTION ARC", "bro was literally dying",
    "HOW?!", "greatest comeback ever", "never count him out fr",
    "clutch factor: INFINITE", "down bad but WON", "what a match!!",
  ],
  rage_mode: [
    "OVERTIME??", "RAGE MODE IS ACTIVED", "they're not done??", 
    "still going??? 💀", "nobody is dying in here",
    "this match is never ending", "bro it's rage mode already",
    "they're both built different", "chaos mode: ON",
  ],
  quick_kill: [
    "that was fast?? 😂", "blink and miss", "match lasted 10 seconds??",
    "speed run diff", "he didn't even try", "one-sided 💀",
    "rematch needed", "did I miss the whole thing??", "TOO FAST",
  ],
  long_match: [
    "they're still going?? 😭", "longest match ever", "I aged watching this",
    "just END IT", "nobody wins here", "certified chess match",
    "I went to get food and they're still fighting", "endurance arc","ragebait derby?"
  ],
  same_weapon: [
    "mirror match lol", "same weapon diff skill", "weapon diff decide this",
    "bro they copied each other", "clone wars fr",
    "who has the better build tho",
  ],
  same_race: [
    "civil war fr 💀", "they're fighting their own kind",
    "family dispute", "race mirror match", "bro vs bro",
    "which one is stronger tho", "same DNA different energy",
  ],
  unique_weapon: name => [
    `Is that a ${name}?! 👀`, `wait... is that a ${name}??`,
    `${name}??? 😱`, `omg a ${name}`, `they brought a ${name}???`,
    `nah is that actually a ${name}`, `bro I see a ${name} 🔥`,
    `${name} spotted 👀`, `${name}?? real??`,
  ],
};

// Lưu timestamp lần cuối mỗi trigger được dùng → kiểm tra cooldown
const _audReactCD = {};

// Hằng số vẽ ball mini trong canvas 48×50px
const _AUD_BALL_R  = 13;    // bán kính ball mini (px)
const _AUD_BALL_CX = 24;    // tâm X trong canvas
const _AUD_BALL_CY = 32;    // tâm Y dịch xuống để nhường chỗ cho hat/halo phía trên

let _audTimer      = null;          // setTimeout handle của auto-chatter tick
let _audSpectators = [];            // mảng khán giả hiện tại: { charName, color, race, subrace }[]

// ─── _getSeasonPool ──────────────────────────────────────────
// Trả về danh sách tất cả fighter trong season hiện tại, theo thứ tự ưu tiên:
//   ① Championship draftRoster (nếu đang chạy championship)
//   ② Tournament bracket (1v1 hoặc 2v2, flatten tất cả round)
//   ③ cgRoster đầy đủ (fallback cho quick match)
// Kết quả được normalize về format { charName, color, race, subrace }.
// _getSeasonPool() được gọi từ initAudience() và lọc ra những người đang đấu.
// Tham số: không có (đọc state)
// Trả về: object[] — danh sách spectator đã normalize
function _getSeasonPool() {
  // ① Championship: draftRoster entries use { name, raceEmoji, race, color, subrace }
  if (state?.championship?.draftRoster?.length) {
    return state.championship.draftRoster.map(ch => ({
      charName: ch.name      ?? '???',
      color:    ch.color     ?? '#4d96ff',
      race:     ch.race      ?? '',
      subrace:  ch.subrace   ?? null,
    }));
  }

  // ② Tournament 1v1 / 2v2: flatten p1/p2 across all rounds
  // bracket fighters already have charName, color, charRace, charSubrace
  const t = state?.tournament || state?.tournament2v2;
  if (t?.rounds?.length) {
    const seen = new Set();
    const list = [];
    for (const round of t.rounds) {
      for (const match of round) {
        for (const f of [match.p1, match.p2]) {
          if (f?.charName && !seen.has(f.charName)) {
            seen.add(f.charName);
            list.push({
              charName: f.charName,
              color:    f.color        ?? '#4d96ff',
              race:     f.charRace     ?? '',
              subrace:  f.charSubrace  ?? null,
            });
          }
        }
      }
    }
    if (list.length) return list;
  }

  // ③ Quick match fallback: full cgRoster
  return (typeof cgRoster !== 'undefined' ? cgRoster : []).map(ch => ({
    charName: ch.name    ?? '???',
    color:    ch.color   ?? '#4d96ff',
    race:     ch.race    ?? '',
    subrace:  ch.subrace ?? null,
  }));
}

// ─── initAudience ────────────────────────────────────────────
// Khởi tạo khán đài cho mỗi round:
//   1. Chọn ngẫu nhiên 1–16 spectators từ season pool (loại trừ fighters đang đấu)
//   2. Render HTML (2 hàng: back row + front row)
//   3. Vẽ mini ball mỗi spectator lên canvas
//   4. Schedule same_weapon / same_race / unique_weapon reaction sau 2–5s
// Gọi từ initGame() trong setup.js trước khi bắt đầu countdown.
// Tham số: không có
// Trả về: không có
function initAudience() {
  // Chọn ngẫu nhiên số chỗ ngồi 1–16
  const slots = 1 + Math.floor(Math.random() * 16);

  // Loại fighters đang đấu ra khỏi khán đài (losers vòng trước vẫn được ngồi xem)
  const inArena = new Set(
    (state.fighters || []).map(f => f?.charName).filter(Boolean)
  );

  const pool     = _getSeasonPool().filter(f => !inArena.has(f.charName));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  _audSpectators = shuffled.slice(0, slots);

  // Nếu pool quá nhỏ (mới tạo ít nhân vật), bổ sung khán giả ẩn danh để đủ tối thiểu 3
  while (_audSpectators.length < Math.min(3, slots)) {
    _audSpectators.push({
      charName: '???', color: '#888899', race: 'human', subrace: null,
    });
  }

  _renderStand();
  requestAnimationFrame(_drawAllBalls);

  // Same weapon / same race reactions — fires 2–3s in
  if (state.fighters?.length >= 2 && _audSpectators.length >= 1) {
    const [f0, f1] = state.fighters;
    const sameBase = f0?.weaponId && f1?.weaponId &&
      (WEAPON_MAP?.[f0.weaponId]?.baseWeapon ?? f0.weaponId) ===
      (WEAPON_MAP?.[f1.weaponId]?.baseWeapon ?? f1.weaponId);
    const sameRace = f0?.charStats?.race && f0.charStats.race === f1?.charStats?.race;
    const reDelay = 2000 + Math.random() * 1200;
    if (sameBase) setTimeout(() => audienceReact('same_weapon'), reDelay);
    else if (sameRace) setTimeout(() => audienceReact('same_race'), reDelay);
  }

  // Unique weapon reaction — fires 3–5s into the match
  const uniqueWeapons = (state.fighters || [])
    .map(f => f?.weaponId ? WEAPON_MAP?.[f.weaponId] : null)
    .filter(w => w?.unique);
  if (uniqueWeapons.length && _audSpectators.length >= 2) {
    const delay = 3000 + Math.random() * 2000;
    setTimeout(() => {
      uniqueWeapons.forEach((w, i) => {
        setTimeout(() => audienceReact('unique_weapon', { weaponName: w.name }),
          i * 1200);
      });
    }, delay);
  }
}

// ─── _renderStand ────────────────────────────────────────────
// Tạo HTML cho khán đài: chia spectators thành 2 hàng (back + front).
// Mỗi spectator là 1 <div.aud-spec> gồm: bubble (chat), canvas (ball), tên.
// Tham số: không có (đọc _audSpectators)
// Trả về: không có — inject innerHTML vào #audience-stand
function _renderStand() {
  const stand = document.getElementById('audience-stand');
  if (!stand) return;

  const mid      = Math.ceil(_audSpectators.length / 2);
  const backRow  = _audSpectators.slice(0, mid);
  const frontRow = _audSpectators.slice(mid);

  stand.innerHTML = `
    <div class="aud-label">🏟️ Khán đài</div>
    <div class="aud-rows">
      <div class="aud-row aud-row-back">
        ${backRow.map((f, i)  => _specHTML(f, i)).join('')}
      </div>
      <div class="aud-row aud-row-front">
        ${frontRow.map((f, i) => _specHTML(f, i + mid)).join('')}
      </div>
    </div>`;
}

// ─── _specHTML ───────────────────────────────────────────────
// Tạo HTML string cho 1 spectator slot.
// delay: phase lệch nhau giữa các ball để chúng bob không đồng bộ (hiệu ứng nhún nhảy).
// Tham số: f (spectator object), idx (số thứ tự slot)
// Trả về: string HTML
function _specHTML(f, idx) {
  const name  = (f.charName || '???').slice(0, 10); // cắt tên dài > 10 ký tự
  const delay = ((idx * 0.37) % 2).toFixed(2);      // phase lệch cho CSS bob animation
  return `
    <div class="aud-spec" id="aud-spec-${idx}">
      <div class="aud-bubble" id="aud-bubble-${idx}"></div>
      <canvas class="aud-ball-canvas" id="aud-canvas-${idx}"
              width="48" height="50"
              style="animation-delay:${delay}s"></canvas>
      <div class="aud-name">${name}</div>
    </div>`;
}

// ─── _drawAllBalls / _drawOneBall ────────────────────────────
// Vẽ mini ball preview cho tất cả / từng spectator lên canvas 48×50px.
// _drawOneBall vẽ: drop shadow + body (glow + fill) + shine + race decoration.
// Race decoration dùng drawRaceDecoration() từ ball.js bằng cách truyền
// "fakeBall" object giả lập đủ fields mà function đó cần (cx, cy, radius, race...).
// Tham số: (f: spectator, idx: số thứ tự)
// Trả về: không có — vẽ thẳng lên canvas element
function _drawAllBalls() {
  _audSpectators.forEach((f, idx) => _drawOneBall(f, idx));
}

function _drawOneBall(f, idx) {
  const canvas = document.getElementById(`aud-canvas-${idx}`);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = _AUD_BALL_CX, cy = _AUD_BALL_CY, r = _AUD_BALL_R;
  const color = f.color || '#4d96ff';

  ctx.clearRect(0, 0, W, H);

  // ── Body ─────────────────────────────────────────────────
  ctx.save();
  ctx.translate(cx, cy);

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.88, r * 0.78, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glow + fill
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Outline
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.28, -r * 0.3, r * 0.28, r * 0.17, -Math.PI * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // ── Race decoration ──────────────────────────────────────
  // Tạo "fakeBall" tối thiểu để gọi drawRaceDecoration() — chỉ cần đủ fields
  // mà function đó đọc (x, y, radius, charRace, charSubrace, vx, vy, color…)
  if (typeof drawRaceDecoration === 'function' && f.race) {
    const fakeBall = {
      x: cx, y: cy,
      radius: r,
      vx: 0, vy: -1,         // facing up → toward the arena
      color,
      charRace:    f.race,
      charSubrace: f.subrace ?? null,
      _deco_fa:    0,
      alive: true,
      // Unused by drawRaceDecoration but harmless to have:
      hitFlash: 0, wallBoostFactor: 1, evadeFrames: 0,
      immunityFrames: 0, projImmunityFrames: 0,
    };
    drawRaceDecoration(ctx, fakeBall);
  }
}

// ── Triggered reactions ──────────────────────────────────────
// Cooldown mỗi trigger (ms). 0 = event one-shot, không cần cooldown.
// Nếu > 0: chỉ trigger lại sau khi qua đủ thời gian → tránh spam chat.
const _AUD_REACT_CDS = {
  double_parry:  8000,
  crit:          6000,
  big_damage:    5000,
  evade:         10000,
  proj_kill:     0,
  disarm_react:  0,
  phoenix_react: 0,
  low_hp:        0,
  comeback:      0,
  rage_mode:     0,
  quick_kill:    0,
  long_match:    0,
  same_weapon:   0,
  same_race:     0,
  unique_weapon: 0,
};

// ─── audienceReact ───────────────────────────────────────────
// Kích hoạt phản ứng của khán giả với một sự kiện chiến đấu cụ thể.
// Flow: kiểm tra cooldown → lấy pool câu → chọn 1–3 spectators ngẫu nhiên
//       → hiển thị bubble với stagger (mỗi người nói cách nhau 450ms).
// Hype events (comeback, phoenix, unique_weapon…) cho 2–3 người nói cùng lúc.
// Combat events thường chỉ 1 người bình luận.
// Tham số: trigger (string) — key từ _AUD_REACT
//          data (object) — dữ liệu thêm, vd: { weaponName } cho unique_weapon
// Trả về: không có
function audienceReact(trigger, data = {}) {
  if (!_audSpectators.length) return;

  // Cooldown gate
  const cd = _AUD_REACT_CDS[trigger] ?? 5000;
  const now = Date.now();
  if (cd > 0 && _audReactCD[trigger] && now - _audReactCD[trigger] < cd) return;
  _audReactCD[trigger] = now;

  // Resolve line pool
  const entry = _AUD_REACT[trigger];
  if (!entry) return;
  const pool = typeof entry === 'function' ? entry(data.weaponName ?? 'that weapon') : entry;
  if (!pool?.length) return;

  // 2–3 spectators for hype events, 1 for combat events
  const bigEvents = ['comeback', 'phoenix_react', 'unique_weapon', 'rage_mode', 'quick_kill'];
  const count = bigEvents.includes(trigger)
    ? 2 + Math.floor(Math.random() * 2)
    : 1;

  const indices = [...Array(_audSpectators.length).keys()]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(count, _audSpectators.length));

  indices.forEach((idx, i) => {
    setTimeout(() => {
      const bubble = document.getElementById(`aud-bubble-${idx}`);
      if (!bubble || bubble.classList.contains('show')) return;
      bubble.textContent = pool[Math.floor(Math.random() * pool.length)];
      bubble.classList.add('show');
      setTimeout(() => bubble.classList.remove('show'), _AUD_BUBBLE_MS);
    }, i * 450);
  });
}

// ─── startAudienceChatter / stopAudienceChatter ──────────────
// Bật/tắt vòng lặp auto-chat.
// startAudienceChatter(): dùng setTimeout đệ quy — mỗi tick gọi _popBubble()
//   rồi lên lịch tick tiếp sau [2.2s, 4.8s] ngẫu nhiên.
//   Bubble đầu tiên xuất hiện sau 1.8–3.3s (delay nhẹ để không spam ngay khi round bắt đầu).
// stopAudienceChatter(): xóa timer + ẩn tất cả bubble đang hiện.
// Tham số: không có
// Trả về: không có
function startAudienceChatter() {
  stopAudienceChatter();
  function _tick() {
    _popBubble();
    const next = _AUD_DELAY_MIN + Math.random() * (_AUD_DELAY_MAX - _AUD_DELAY_MIN);
    _audTimer = setTimeout(_tick, next);
  }
  // Bubble đầu tiên xuất hiện sau 1.8–3.3s để tránh spam ngay khi bắt đầu
  _audTimer = setTimeout(_tick, 1800 + Math.random() * 1500);
}

function stopAudienceChatter() {
  if (_audTimer) { clearTimeout(_audTimer); _audTimer = null; }
  document.querySelectorAll('.aud-bubble.show').forEach(b => b.classList.remove('show'));
}

// ─── _popBubble ──────────────────────────────────────────────
// Hiện bubble chat ngẫu nhiên cho 1 spectator (28% chance thêm 1 người thứ 2).
// Câu nói lấy ngẫu nhiên từ AUDIENCE_LINES (general chatter).
// Tham số: không có
// Trả về: không có
function _popBubble() {
  if (!_audSpectators.length) return;
  // 28% chance thêm 1 người thứ 2 bình luận cùng lúc
  const count   = Math.random() < 0.28 ? 2 : 1;
  const indices = [...Array(_audSpectators.length).keys()]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  indices.forEach(idx => {
    const bubble = document.getElementById(`aud-bubble-${idx}`);
    if (!bubble || bubble.classList.contains('show')) return;
    bubble.textContent = AUDIENCE_LINES[Math.floor(Math.random() * AUDIENCE_LINES.length)];
    bubble.classList.add('show');
    setTimeout(() => bubble.classList.remove('show'), _AUD_BUBBLE_MS);
  });
}
