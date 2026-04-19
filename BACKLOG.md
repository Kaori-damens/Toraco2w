# BACKLOG — Ý tưởng chờ implement

---

## 🗡️ Vũ khí mới: Rapier — "Finesse & Riposte"

**Identity**: Vũ khí nhanh nhất melee, damage thấp nhưng thưởng nặng cho timing phản đòn.

### Stats scaling
| Stat | Ảnh hưởng |
|---|---|
| SPD | Tăng tốc quay → cooldown ngắn hơn |
| BIQ | Kéo dài cửa sổ Riposte (mặc định 40f, BIQ10 → 70f) |
| IQ | Nhân damage Riposte (IQ5 → ×2.0, IQ10 → ×3.0) |

### Cơ chế — Riposte Window
- Khi Rapier bị vũ khí enemy chạm → mở cửa sổ "Riposte" (mũi kiếm sáng vàng)
- Nếu trong cửa sổ đó đánh trúng lại → deal IQ-scaled multiplier (2–3×)
- Nếu bỏ lỡ → cửa sổ tắt, chờ lần bị đánh tiếp theo

### Base stats đề xuất
```
baseLength: 40   baseSpeed: 0.072
baseDamage: 0.8  attackCooldown: 18
baseKnockback: 2
reverseOnHit: true
scaling: { type: 'riposte' }
scalingLabel: 'Riposte Dmg'
```

### Visual
Lưỡi mảnh bạc xanh. Mũi kiếm bùng sáng vàng khi cửa sổ riposte đang mở.

---

## ⚔️ Vũ khí mới: Katana — "Momentum & Iai Strike"

**Identity**: Chậm nhưng đau, reward cho người duy trì chuỗi tấn công liên tục.

### Stats scaling
| Stat | Ảnh hưởng |
|---|---|
| STR | Damage base + damage Iai Strike |
| SPD | Rút ngắn thời gian giữ stack (dễ không mất combo) |
| MA | Sau Iai Strike, bắn thêm spectral slash xuyên địch (+60px reach) |

### Cơ chế — Momentum Stacks + Iai Strike
- Mỗi hit tích 1 stack Momentum (max 5), hiện như aura rings quanh ball
- Stack mất nếu > 3s không đánh trúng
- Đủ 5 stack + đánh trúng → **IAI STRIKE**: damage ×3, flash trắng, reset về 0
- MA ≥ 7: Iai Strike phóng thêm spectral blade theo hướng vũ khí

### Base stats đề xuất
```
baseLength: 62   baseSpeed: 0.038
baseDamage: 1.5  attackCooldown: 42
baseKnockback: 7
reverseOnHit: true
scaling: { type: 'momentum', max: 5 }
scalingLabel: 'Stack N/5' → 'IAI READY!'
```

### Visual
Lưỡi dài trắng sáng. Mỗi Momentum stack thêm 1 vòng aura trắng. Iai Strike: flash trắng + blade trail.

---

## ⚖️ Championship DE8/DE16 — LB Consolation Bonus

**Câu hỏi gốc**: LB players có cần PvP reward riêng để catch-up với WB không?

### Phân tích reward count thực tế

| Con đường đến Grand Final | Rewards trước GF |
|---|---|
| WB Finalist (win UB R1 → R2 → F) | **3** |
| LB Finalist từ UB R1/R2 drop | **4** (nhiều hơn!) |
| LB Finalist từ UB F drop | **3** (bằng) |

→ LB về reward count đã cân bằng hoặc nhỉnh hơn WB. Không cần catch-up về rewards.

### Vấn đề thực tế
WB players có lợi thế "chất lượng" — undefeated → build/stats gốc mạnh hơn. LB players yếu hơn về stats ban đầu dù có nhiều rewards.

### Idea: Consolation Bonus khi Drop vào LB (Narrative, không phải Balance)
- Khi bị rớt WB → LB: nhận ngay **+2 stat thấp nhất** (guaranteed, không spin wheel)
- Hiển thị: `"⚔️ Battle-Scarred: +2 [STAT]"`
- Áp dụng cả DE8 lẫn DE16

**Files cần sửa nếu implement:**
- `championship.js` — `_deAdvance8` / `_deAdvance16`: mark `loser.droppedToLb = true` khi drop WB→LB
- `result.js` — Sau `recordChampionshipMatchResult()`: nếu loser có flag, apply +2 lowest stat + show damage number

---

## 🗡️ Vũ khí mới tiềm năng — từ reference weapon_ball_battles__ultra_edition

*Khảo sát ngày 8 Apr 2026. Chưa implement, chỉ lưu ý tưởng.*

### 🩸 Axe — Bleed (DOT)
- Hit damage thấp, nhưng gây **Bleed**: mỗi 30f mất 1 HP trong 180f (6 giây)
- Mechanic DOT hoàn toàn mới, chưa có weapon nào trong game
- Scale: STR → bleed damage, DUR → bleed duration
- Dễ implement, dễ balance → **ưu tiên cao**

### 🏇 Lance — Charge & Stun
- Khi hit: **bắn attacker thẳng về phía trước** (jousting impulse), **stun defender 80f**
- Cảm giác hoàn toàn khác melee thông thường — rất visual trong auto-battle
- Scale: STR → damage, SPD → charge speed, BIQ → stun duration
- **Ưu tiên cao**

### 🪃 Boomerang — Returning Projectile
- Phóng ra rồi **tự quay về owner** sau 40f bay, homing khi về
- Có thể hit enemy lúc bay ra VÀ lúc bay về → 2 hit opportunities per throw
- Scale: BIQ → tầm bay / tốc độ homing, STR → damage
- Niche độc, khác hoàn toàn Bow/Shuriken

### ⛓️ Flail — Chain Physics
- Quả cầu gai trên dây xích dài ~90px, hit radius 14px
- Feel khác melee hiện tại — không phải lưỡi thẳng
- Scale: STR → damage, MA → chain length

### 🔥 Flamethrower — Cone AoE
- Phun lửa hình nón liên tục mỗi 6f, spread 0.6 rad
- Damage thấp nhưng continuous, không phải điểm hit
- Hoàn toàn khác ranged hiện tại (Bow/Shuriken)
- Scale: MA → cone width, STR → damage per particle
- Phức tạp hơn nhưng mechanic độc đáo

### 💣 Bomb — Gravity + AoE
- Ném bom bị ảnh hưởng gravity (rơi xuống), nổ sau 240f hoặc khi chạm đất
- **Kill radius** nhỏ (instant), **blast radius** lớn hơn (falloff damage)
- Rủi ro cao — tự chết nếu đứng gần
- Scale: STR → blast damage, IQ → timing/range

---

## 💫 Skills mở rộng theo Weapon (1v1 / FFA)

*Khảo sát ngày 8 Apr 2026. Mỗi vũ khí thêm 2-4 skills liên quan.*

### 🥊 Fists
- **Iron Knuckles**: Mỗi hit tích +0.1 base dmg vĩnh viễn trong trận (max +STR×0.1) | Scale: STR
- **Brawler's Rhythm**: Sau 4 hit liên tiếp không bị đánh → hit thứ 5 deal ×2, reset chain | Scale: MA
- **Combo Breaker**: Khi bị hit trong lúc đang có chain → tự động phản đòn ngay 1 cái | Scale: STR
- **Rage Fists**: HP < 50% → attack speed +25% | Scale: SPD

### ⚔️ Sword
- **Guard Stance**: Khi đang cooldown (không swing) → giảm damage nhận vào BIQ×2% | Scale: BIQ
- **Duel Instinct**: Chỉ còn 1 enemy sống → +20% damage (1v1 specialist) | —
- **Extended Blade**: Mỗi 5 hit tăng sword length +3px vĩnh viễn trong trận (max +15px) | Scale: STR
- **Last Stand Slash**: HP < 20% → sword spin speed ×1.5 | Scale: SPD
- **Parry Punish**: Sau parry thành công → +100% damage cho 3 giây tiếp theo | Scale: BIQ

### 🗡️ Dagger
- **Poison Blade**: Cứ 5 hit apply poison: 1 dmg/3s trong 15s | Scale: MA
- **Flurry Finisher**: Hit thứ 5 liên tiếp deal ×3 và reset chain | Scale: SPD
- **Backstab**: Hit enemy đang quay lưng (góc >120°) → +40% damage | Scale: BIQ
- **Shadow Strike**: Cứ mỗi 10s, hit tiếp theo guaranteed crit | Scale: IQ
- **Bleed Out**: Target đang có poison → mỗi hit refresh duration + thêm 1 stack | Scale: MA

### 🔱 Spear
- **Long Reach**: Khởi đầu trận với +15px spear length ngay | Scale: STR
- **Skewer**: On hit: pin enemy 20 frame không di chuyển được | Scale: STR
- **Zone Control**: Enemy trong 150px của spear tip chịu 0.3 dmg/s chỉ vì đứng gần | Scale: MA
- **Javelin**: Cứ 15s throw spear như projectile 1 lần, bay thẳng xuyên arena | Scale: STR

### 🌙 Scythe
- **Reaper's Mark**: Enemy HP < 30% → Scythe deal +60% damage | Scale: MA
- **Soul Harvest**: On kill: hồi +10 HP (stack, không giới hạn) | —
- **Blood Moon**: Sau khi đạt dual blade (hit 5): mỗi hit tiếp theo heal 2 HP | Scale: MA
- **Grim Presence**: Enemy trong 80px mất 8% attack speed (aura debuff thụ động) | Scale: MA
- **Death's Embrace**: HP < 40% → scythe spin đổi chiều sau mỗi hit (khó predict) | Scale: MA

### 🔨 Hammer
- **Seismic Slam**: On hit: shockwave slow tất cả enemy gần 100px thêm 20f | Scale: STR
- **Forge Temper**: Cứ 3 hit tăng +0.2 base damage vĩnh viễn trong trận | Scale: STR
- **Thunderstrike**: Khi rage mode (>80s): hit có 25% chance AoE thêm 2 enemy gần nhất | Scale: MA
- **Ground Pound**: Bounce off wall → stun enemy gần nhất 15f | Scale: STR
- **Heavy Momentum**: Hit liên tiếp cùng 1 enemy → +15% dmg/hit (max 3 stacks, reset nếu đổi target) | Scale: STR

### 🏹 Bow
- **Sniper**: Target cách >300px → arrow deal +40% damage | Scale: IQ
- **Volley**: 3 arrow đầu mỗi trận deal ×2 damage | Scale: BIQ
- **Arrow Rain**: Cứ mỗi 10 arrow bắn ra → arrow đó split thành 3 khi bay | Scale: MA
- **Piercing Shot**: Cứ mỗi 8 arrow → arrow đó xuyên qua target, có thể hit enemy sau lưng | Scale: IQ
- **Poison Arrow**: Cứ mỗi 6 arrow → gây poison 1 dmg/3s trong 10s | Scale: MA

### 🌟 Shuriken
- **Bounce Damage**: Mỗi lần wall bounce, shuriken +10% damage cho lần hit tiếp | Scale: SPD
- **Fan Throw**: Cứ mỗi 5 lần throw → bắn 3 shuriken fan spread thay vì 1 | Scale: MA
- **Ninja Arts**: +10% evade chance | Scale: BIQ
- **Ricochet Kill**: Shuriken hit sau 2+ bounce → +80% damage | Scale: BIQ
- **Mirror Throw**: Cứ mỗi 20s, trong 3s throw ra 2 shuriken thay vì 1 theo 2 góc lệch nhau | Scale: MA

### 🤺 Rapier
- **En Garde**: +15% parry chance bổ sung | Scale: BIQ
- **Fleche**: Lunge distance +60px, velocity +5 | Scale: SPD
- **Touché**: Sau riposte thành công: nhận immunity frames = riposteWindow còn lại | Scale: BIQ
- **Blade Waltz**: Mỗi lần evade thành công → riposte window tự mở (không cần bị hit) | Scale: BIQ
- **Precision Form**: Riposte không scale IQ mà scale STR×BIQ (alternative build path) | Scale: STR+BIQ

### ⚔️ Katana
- **Iaijutsu**: IAI Strike kích hoạt ở 4 stack thay vì 5 | Scale: BIQ
- **Zanshin**: Momentum decay timer: 3s → 5s (khó mất stack hơn) | Scale: MA
- **Tameshigiri**: Sau IAI Strike: hit tiếp theo deal ×2 damage | Scale: STR
- **Warrior's Focus**: Không bị hit trong 5s → IAI Strike tiếp theo ×4 thay vì ×3 | Scale: BIQ
- **Momentum Burst**: Khi đạt 5 stack IAI Ready → tự động dash về phía enemy 1 lần | Scale: SPD

---

## 🎬 Death Cam & Replay — Xem lại trận đấu

*Khảo sát ngày 19 Apr 2026. Tạm hoãn — lưu backlog.*

### Death Cam (10 giây trước kill)

**Approach:** Ring Buffer Snapshots — mỗi frame clone toàn bộ state, giữ 600 frames cuối (~3.6 MB). Khi có death, playback từ frame -600.

| Hạng mục | Ước tính |
|---------|---------|
| Bộ nhớ | ~3.6 MB (600f × 5KB/f) |
| Độ khó | Medium |
| Thời gian | 2–3 ngày |

**Thách thức:**
- `structuredClone()` mỗi frame → tốn ~0.3–1ms, cộng dồn 60fps là đáng lo
- Phải capture **đủ** toàn bộ state (miss bất kỳ property nào → visual bug khi playback)
- Particles không cần capture (ephemeral), nhưng cần spawn lại khi replay

**Files cần sửa nếu implement:**
- `game-loop.js` — thêm ring buffer `_deathCamBuffer[]` update mỗi frame trong `step()`
- `ball.js` — `snapshotState()` helper: clone toàn bộ props của Ball + weapon
- `result.js` — khi death detected, trigger playback mode từ buffer

---

### Full Match Replay

**Hai hướng khả thi:**

#### Hướng 1: Canvas Video Recording (MediaRecorder API) — Dễ
```js
const stream = canvas.captureStream(60);
const recorder = new MediaRecorder(stream);
// record → Blob → <video src=objectURL>
```
- ✅ Implement ~1 ngày, pixel-perfect, có thể download/share
- ❌ Chỉ xem như video, không tua vật lý được, file lớn (~50–200 MB/10 phút)

#### Hướng 2: Physics State Replay — Khó
- Cần **Custom Seeded RNG** thay thế `Math.random()` toàn game (refactor lớn)
- Vì: crit, evade, skill procs, Dragon sweep... đều dùng `Math.random()` — không re-seed được natively
- Sau khi có custom RNG: record seed + initial state → re-simulate chính xác 100%
- Hoặc: snapshot mỗi 10 frame (6fps) + interpolate → ~18 MB cho trận 10 phút

**Files cần sửa nếu implement Hướng 2:**
- Toàn game: thay `Math.random()` bằng `seededRandom()` (custom LCG/Xorshift)
- `state.js` — thêm `rngSeed`, `rngState`, `replayBuffer[]`
- `game-loop.js` — record mode vs playback mode

---

## 📋 Ghi chú

- Cả 2 vũ khí đều dùng `reverseOnHit: true` (xem thảo luận ngày 2 Apr 2026)
- Rapier lấp khoảng trống **fast finesse counter**, Katana lấp **slow momentum bruiser**
- Tham khảo reference tại: `weapon_ball_battles__ultra_edition/weapons/rapier.js` và `katana.js` (reference rất đơn giản, design trên là hoàn toàn mới)
- Tất cả skills trên chỉ focus vào 1v1 hoặc FFA (không có mechanic teammate)
