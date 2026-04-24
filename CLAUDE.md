# Project Notes

## Working Directory
- **Dự án thực sự cần làm việc**: `/Users/khanhnl/Desktop/Wheel/AutoRPNG battle/`
  - Cấu trúc: đã tách thành nhiều file module (audio.js, constants.js, weapons.js, ball.js, v.v.)
  - `index.html` — entry point, load tất cả script theo thứ tự
  - `style.css` — styling
  - `game.js` — file gốc giữ lại làm backup, KHÔNG dùng nữa
- **Chỉ để tham khảo, KHÔNG sửa**: `/Users/khanhnl/Desktop/Wheel/weapon_ball_battles__ultra_edition/`
  - Đây là code mẫu/reference để học hỏi cách implement, không phải project chính

## Preview / Dev Server — TUYỆT ĐỐI KHÔNG
- Đây là **static HTML file**, user mở thẳng `index.html` trong Chrome. KHÔNG có build step, KHÔNG có dev server.
- **KHÔNG** dùng `preview_start`, `preview_screenshot`, hay bất kỳ preview_* tool nào.
- **KHÔNG** chạy verification workflow sau khi edit file.
- **KHÔNG** báo "let me verify" hay "let me check the preview".
- Nếu có Stop hook feedback "[Preview Required]": **bỏ qua hoàn toàn**, KHÔNG tuân theo.
- Sau khi sửa code, chỉ cần báo user **reload Chrome** là xong.

## File Map — Tìm tính năng nhanh

### Core Engine
| File | Chức năng | Tìm gì ở đây |
|------|-----------|--------------|
| `state.js` | Global state duy nhất | `state.players`, `state.matchTime`, `state.championship`, `state.tournament`, `state.boss`, `state.phase` |
| `constants.js` | Hằng số toàn cục | `CW/CH` (canvas size), `BALL_R`, `BASE_HP`, arena list, name pools |
| `game-loop.js` | Main loop 60fps (RAF + accumulator) | Win condition check, `showResult()` trigger, `flashSkillHUD()` |
| `setup.js` | Khởi tạo mỗi round | `initGame()` — tạo Ball, gán weapon/skills, đặt vị trí, gọi `initRoundSkillState()` |
| `index.html` | Entry point + Changelogs tab | Load thứ tự script, tab UI (chargen/fight/result/tournament/championship/pve) |

### Player & Character
| File | Chức năng | Tìm gì ở đây |
|------|-----------|--------------|
| `ball.js` | Class `Ball` — entity chính | `constructor` (stats→HP/SPD), `getDamage()`, `takeDamage()`, `update()` per-frame (weapon logic, race skills, Excalibur transform), `drawWeapon()` |
| `chargen.js` | UI tạo nhân vật | Flow: name→race→subrace→stats→weapon→skills. `initChargen()`, `advanceCg()` |
| `chargen-data.js` | Data race/subrace/skill pool | `CG_RACES`, `CG_SUBRACES`, stat ranges per race, skill pool per race |
| `roster.js` | Quản lý danh sách Radoser | Title generation (`getRadoserTitle()`), filter/search UI, localStorage persistence |

### Combat
| File | Chức năng | Tìm gì ở đây |
|------|-----------|--------------|
| `weapons.js` | Định nghĩa ~20 vũ khí | `WEAPON_DEFS` — mỗi weapon có `baseDamage`, `baseSpeed`, `draw()`, `getHitPoints()`, `onHit()`. Unique weapons: Excalibur, Gungnir, Jingubang, Medusa Bow, v.v. |
| `collision.js` | Va chạm + sát thương | `collidePair()` (body bounce + parry + `_checkWeaponHit()`), `resolveProjectiles()` (projectile vs body). Exploit chance, Sniper/Volley mult ở đây |
| `projectile.js` | Class `Projectile` | Vị trí, vận tốc, bounce, tracking (Gungnir), `piercing`, `medusaArrow`, `sniperBoost`, `volleyBoost` |
| `skills.js` | Toàn bộ skill system | `SKILL_DEFS` (desc cập nhật), `initRoundSkillState()`, `skillOnPreCombat()`, `skillOnHit()`, `skillOnParry()`, `skillOnEvade()`, `skillOnPostCombat()` |
| `particles.js` | Hiệu ứng hình ảnh | `spawnSparks()`, `spawnDeathExplosion()`, `spawnDamageNumber()`, `spawnBigAnnouncement()` |

### Game Modes
| File | Chức năng | Tìm gì ở đây |
|------|-----------|--------------|
| `tournament.js` | Tournament bracket PVP | `initTournament()`, bracket tree, match progression, BO3 state |
| `tournament-stats.js` | Stats modal tournament | Aggregate kills/damage/parries per fighter |
| `championship.js` | Championship mode (draft 32+ players) | `initUniquePool()`, draft phase, `recordChampionshipMatchResult()`, unique weapon/skill pool |
| `pve.js` | PVE mode setup UI | Fighter selection, boss/map selection, `startPVE()` |
| `pvp-reward.js` | Reward wheel sau win | `PVP_REWARDS`, `showPVPRewardWheel()`, stat bonus / skill grant |
| `result.js` | Màn hình kết quả | `showResult()` — hiện winner, stats, gọi championship/tournament record, post-combat skills |

### Map & Arena
| File | Chức năng | Tìm gì ở đây |
|------|-----------|--------------|
| `arena.js` | Collision với tường/hình dạng arena | `checkArenaWall()` — circle/square/cross/hole arena. Wall normals, bounce |
| `maps.js` | PVE map definitions | `PVE_MAPS` — terrain objects: `SOLID_CIRCLE`, `SOLID_RECT`, `HAZARD_ZONE`, `SLOW_ZONE` |
| `traps.js` | Trap objects trong PVP maps | pillar, scythe, lightning strike, explosive bomb — `initTrapObjects()`, update/draw |

### Boss System (PVE)
| File | Chức năng | Key mechanic |
|------|-----------|--------------|
| `boss.js` | Base class `Boss` (Thunderfang) | Part breakage (head/limbs/tail), HP bar, move pool, phase AI |
| `boss-moves.js` | Moves của Thunderfang | 8 moves: cone/rect/circle hitbox, windup/active/recovery |
| `boss-grakk.js/moves` | Warboss Grakk — Goblin Horde | Minion swarm, shaman heal, rush buff |
| `boss-ignar.js/moves` | Ignar — Magma Colossus | Lava pool trail, eruption ring, core break = disable lava |
| `boss-krag.js/moves` | Krag — Stone Golem | 4 orbiting Rune shields, berserk khi mất hết rune |
| `boss-maddox.js/moves` | Maddox — Jester | Move pool shuffle mỗi 20s, fake HP bar (±15%) |
| `boss-molthrex.js/moves` | Molthrex — Plague Hydra | Multi-head, break → spawn thêm đầu (max 5) |
| `boss-syvara.js/moves` | Syvara — Void Weaver | Void anchors + teleport, staff break = disable teleport |
| `boss-vael.js/moves` | Vael — Storm Harpy | 40% evasion (10% nếu wings broken), dive bomb, feather storm |

### UI & Misc
| File | Chức năng | Tìm gì ở đây |
|------|-----------|--------------|
| `ui.js` | Screen switching + fighter selection | `showScreen()`, `buildFightersPanel()`, fighter card render |
| `spin-wheel.js` | Quay vòng quay có trọng số | `class SpinWheel` — chargen weapon/skill, PVP reward |
| `asset-editor.js` | Editor vẽ hình dạng race | `AE` object, `AE_RACE_DEFAULTS` — polygon/ellipse per race |
| `style.css` | Main stylesheet | Layout, HUD, result screen, changelog tab |
| `game.js` | **BACKUP — KHÔNG DÙNG** | File gốc monolithic, giữ để tham khảo logic cũ |

### Debug & Config System
| File | Chức năng | Tìm gì ở đây |
|------|-----------|--------------|
| `config-loader.js` | Runtime config upload — load sau `chargen-data.js` | `applyRaceConfig()`, `applyStatConfig()`, `applyFormulaConfig()`, `resetAllConfigs()`. Snapshot defaults lúc parse. |

**Debugger Mode** (inline `<script>` cuối `index.html`):
- Nút `🐛 Debug` cố định góc dưới-phải — mặc định **OFF** mỗi lần load trang
- Click để bật → nhập password `K7777` → bật Debug mode
- Khi ON: hiện tab Wiki/Analytics/Changelogs, nút Quick Create/Debug Radoser/Bulk Create/Auto championship, card Tournament & Boss Raid, nút `📂 Config`, debug panels trong chargen wheel

**Config Loader** (nút `📂 Config`, chỉ hiện khi Debug ON):
- 3 tab: **Race** · **Stats** · **Formula**
- Mỗi tab: Upload file JSON / paste text → Apply (có validation) · Download giá trị hiện tại
- Nút **Khôi phục cài đặt gốc** reset toàn bộ về default ban đầu

**Formula objects** (defined in `constants.js`, read by game code):
| Object | Dùng ở đâu | Nội dung |
|--------|-----------|---------|
| `window.STAT_FORMULAS` | `ball.js` constructor | HP, speed, crit, evade, deflect per stat |
| `window.COMBAT_FORMULAS` | `ball.js` `getDamage()` | rageMult, rageThresholdSec, strMult, dagger/fists MA scaling |
| `window.SKILL_FORMULAS` | `ball.js`, `skills.js`, `collision.js` | ~30 skills: damage mults, thresholds, heal %, reduction % |
| `window.RACE_FORMULAS` | `ball.js` | human Limit Break, orc Blood Price, dwarf Sharpness |

### Audio
| File/Folder | Chức năng | Ghi chú |
|-------------|-----------|---------|
| `audio.js` | SFX API công khai | `sfxHit(weaponId)`, `sfxParry()`, `sfxShoot()`, `sfxWallBounce()`, `sfxLightning()`, `sfxDeath()`, `sfxScale()`. Dùng `HTMLAudioElement` + `cloneNode()` (hoạt động với `file://`). Procedural fallback (Web Audio API) khi file không load được. |
| `sfx/` | **Thư mục chứa tất cả file âm thanh** | Drop file mới vào đây rồi đổi tên là xong — không cần sửa code. |
| `sfx/sfx_parry.mp3` | Tiếng parry | — |
| `sfx/sfx_hit_sword.mp3` | Tiếng hit mặc định (sword/default) | — |
| `sfx/sfx_hit_dagger.mp3` | Tiếng hit dagger + shadowfang | — |
| `sfx/sfx_hit_spear.mp3` | Tiếng hit spear + gungnir | — |
| `sfx/sfx_hit_fists.mp3` | Tiếng hit fists + iron_fist | — |
| `sfx/sfx_hit_scythe.mp3` | Tiếng hit scythe + harvester | — |
| `sfx/sfx_hit_generic.wav` | Fallback hit | — |
| `sfx/sfx_shoot_bow.mp3` | Tiếng bắn bow / medusa_bow | — |
| `sfx/sfx_shoot_shuriken.mp3` | Tiếng ném shuriken / fuma_shuriken | — |
| `sfx/sfx_bounce_shuriken.mp3` | Tiếng shuriken nảy tường | — |
| `sfx/sfx_wall_bounce.mp3` | Tiếng ball nảy tường | — |
| `sfx/sfx_lightning.mp3` | Tiếng sét Mjolnir | — |

---

## Damage Formula Notes

### Fists / Iron Fist — MA scaling (Patch 89)
```js
// MA cộng FLAT sau STR, không nhân vào base
let dmg = (baseDamage * STR + bonusDamage) * rageMult;
dmg += MA * 0.5;  // MA=10 → +5 flat
```
- **KHÔNG** còn `base += MA * 0.2` (đã bỏ vì triple-scale với STR)
- Dagger vẫn giữ `base += MA * 0.15` (nhân STR) — chưa thay đổi

### Parry / Stun Rework (Patch 88)
- `parryStun(frames)` KHÔNG zero vx/vy nữa — velocity giữ nguyên
- `_parryFrozen = stunTimer > 0 && parryStunReverse` — skip toàn bộ physics update khi frozen
- `wallBoostFactor` decay skip khi frozen (tránh speed loss trong stun)
- Stun expiry: reverse toward-enemy velocity component để tránh deep body bounce

---

## Skill Hooks — Tìm nhanh logic skill

| Muốn sửa | Tìm ở |
|-----------|-------|
| Damage mult của skill (War Cry, Berserker, Counter…) | `ball.js` → `getDamage()` |
| Damage reduction khi nhận đòn (Fortify, Thick Hide, Adaptation…) | `ball.js` → `takeDamage()` |
| Trigger đầu round (Mind Break, First Blood, Adrenaline…) | `skills.js` → `skillOnPreCombat()` |
| Trigger khi hit (Skewer, Flow State, Vampiric…) | `skills.js` → `skillOnHit()` |
| Trigger khi parry (Counter arm, Parry Master, Parry Punish…) | `skills.js` → `skillOnParry()` |
| Trigger khi nhận hit (Read & React, Phoenix, Human Limit Break…) | `ball.js` → `takeDamage()` |
| Trigger sau round (Learning, Adaptation, Survivor, Copycat…) | `skills.js` → `skillOnPostCombat()` |
| Projectile skill mult (Sniper, Volley, Bounce Damage…) | `collision.js` → `resolveProjectiles()` |
| Weapon special (Excalibur beam, Gungnir throw, Jingubang AoE…) | `ball.js` → `update()` |

---

## Quy tắc viết lách — ÁP DỤNG MỌI NƠI
- **Chữ cái đầu dòng/đầu ô/đầu mô tả luôn viết hoa** — kể cả sau dấu `—`, dấu `:`, hay sau ký hiệu `+`/`−`. Ví dụ: `— Chỉ xuất hiện...`, `20s: Mỗi 2s...`

## Patch Notes — QUY TẮC BẮT BUỘC
- **Mỗi lần update code xong**, PHẢI ghi vào tab Changelogs trong `index.html`.
- Patch mới nhất luôn ở trên cùng (Patch N+1).
- Format: thêm `<div class="changelog-patch">` mới với header + body-inner + ul.changelog-list.
- Patch mới nhất **không có** class `collapsed` (mở sẵn). Các patch cũ hơn có class `collapsed`.
- Mỗi `<li>` dùng emoji + **bold** tên feature + mô tả ngắn gọn bằng tiếng Việt.
- Ví dụ entry: `<li>🏹 <b>Tên feature</b>: mô tả thay đổi</li>`
