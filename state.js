// ============================================================
// GAME STATE
// ============================================================
// Đây là object trạng thái toàn cục DUY NHẤT của game.
// Mọi hệ thống (game-loop, collision, skills, render...) đều đọc/ghi vào đây.
// Không có state nào được giữ riêng trong từng module — tất cả tập trung ở đây.
//
// QUAN TRỌNG: state.players[] và state.fighters[] là hai thứ khác nhau:
//   - state.fighters[] — mảng charDef (dữ liệu nhân vật thô: stats, race, weapon, skills)
//   - state.players[]  — mảng Ball instance (entity sống trong arena, cập nhật mỗi frame)
let state = {
  // ── Trạng thái vòng lặp chính ──────────────────────────────
  running: false,     // true = game đang chạy (RAF đang gọi gameLoop)
  paused:  false,     // true = đang pause (RAF dừng, không update)
  ended:   false,     // true = round đã kết thúc, đang show result screen
  speed:   1,         // nhân tốc độ: 1 = bình thường, 2 = fast-forward (debug)
  frame:   0,         // frame counter tăng mỗi step (≈60fps), dùng cho timing cooldown

  // ── Entities sống trong arena ──────────────────────────────
  players:     [],    // Ball[] — các ball đang đấu (cập nhật physics mỗi frame)
  projectiles: [],    // Projectile[] — mũi tên/shuriken/etc. đang bay
  fighters:    [],    // charDef[] — data nguồn của từng người chơi (từ Chargen)

  // ── Arena ──────────────────────────────────────────────────
  arena:       null,  // object config hiện tại (từ ARENAS hoặc customArena)
  arenaId:     'med_square', // key trong ARENAS — dùng để rebuild arena khi reset
  customArena: null,  // saved from Arena Builder — ghi đè arenaId nếu khác null
  gravity:     false, // bật = ball bị kéo xuống theo trục Y (arena đặc biệt)

  // ── Phase & thời gian ──────────────────────────────────────
  winner:         null,   // Ball | null — người thắng round (null nếu tie/ongoing)
  phase:          'menu', // 'countdown' | 'playing' — dùng trong game-loop để phân nhánh
  countdownFrame: 0,      // đếm lên từ 0, mỗi frame +1 trong phase 'countdown'
  matchTime:      0,      // giây đã trôi qua trong round (tăng mỗi step)

  // ── BO3 (best-of-3) ────────────────────────────────────────
  // Được set bởi tournament khi cần BO3. null = không dùng BO3.
  bo3: null,  // { wins:[0,0], gameNum:1, fighters:[f0,f1] } hoặc null

  // ── Tournament (giải đấu PVP) ──────────────────────────────
  tournament:    null, // { size, rounds, currentRound, currentMatch, ... } hoặc null
  tournament2v2: null, // Trạng thái giải 2v2 hoặc null
  matchMode: '1v1',    // '1v1' | '2v2' — ảnh hưởng collision và win condition
  teamIds:   [],       // teamId (số) cho từng index fighter trong 2v2
  winTeam:   -1,       // team thắng trong 2v2 (-1 = chưa có)

  // ── Hiệu ứng race skill ────────────────────────────────────
  trollNets:    [], // TrollNet[] — lưới của Troll race, cản ball
  smiteEffects: [], // SmiteEffect[] — tia sét Paladin (Angel), vẽ và damage riêng

  // ── PVE (Player vs Environment) ────────────────────────────
  pveMode:        false, // true = đang ở chế độ PVE (1 player vs boss)
  boss:           null,  // Boss instance đang hoạt động (null ngoài PVE)
  bossId:         null,  // 'thunderfang' | 'krag' | ... — key để load boss class
  mapId:          null,  // 'thunderstorm_peak' | ... — key trong PVE_MAPS
  mapDef:         null,  // reference trực tiếp đến PVE_MAPS[mapId]
  terrainObjects: [],    // Mảng phẳng các vật thể địa hình (boss push lava/walls vào đây)
  healOrbs:       [],    // HealOrb[] — viên hồi máu spawn trong PVE

  // ── Soccer Mode ───────────────────────────────────────────────────
  // null = không ở soccer mode. Khi active: { active, score, ball, scoring, goalFrame, goalMsg }
  soccer: null,

  // ── Trap objects (PVP) ─────────────────────────────────────
  trapObjects:    [],    // TrapObject[] — pillars, scythes, lightning, bombs

  // ── Bone Shards & Skill Minions ────────────────────────────
  boneShards:   undefined, // BoneShard[] — mảnh xương Skeleton race rơi xuống arena
  skillMinions: undefined, // SkillMinion[] — minion triệu hồi bởi skill (vd: mirror clone)
  droppedWeapons: undefined, // DroppedWeapon[] — vũ khí rơi ra sau khi ball chết

  // ── Championship ───────────────────────────────────────────
  // { size, phases, currentPhaseIdx, completed, champion, viewPhaseIdx } hoặc null
  championship: null,
};
