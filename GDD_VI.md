# Ball Battle Arena — Tài Liệu Thiết Kế Game (Tiếng Việt)

> **Phiên bản**: 1.0 | **Engine**: Vanilla HTML5 Canvas + Web Audio API | **Lấy cảm hứng từ**: Weapon Ball Battles (earclack)

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Ý Tưởng Cốt Lõi](#2-ý-tưởng-cốt-lõi)
3. [Luồng Game](#3-luồng-game)
4. [Đấu Trường](#4-đấu-trường)
5. [Ball (Đơn Vị Chiến Đấu)](#5-ball-đơn-vị-chiến-đấu)
6. [Hệ Thống Vật Lý](#6-hệ-thống-vật-lý)
7. [Vũ Khí](#7-vũ-khí)
8. [Cơ Chế Chiến Đấu](#8-cơ-chế-chiến-đấu)
9. [Cơ Chế Đặc Biệt](#9-cơ-chế-đặc-biệt)
10. [Hệ Thống Đạn](#10-hệ-thống-đạn)
11. [Hệ Thống Scaling (Tăng Sức Mạnh)](#11-hệ-thống-scaling-tăng-sức-mạnh)
12. [Phản Hồi Hình Ảnh & Âm Thanh](#12-phản-hồi-hình-ảnh--âm-thanh)
13. [Chế Độ Chơi & Cài Đặt](#13-chế-độ-chơi--cài-đặt)
14. [Thông Số Kỹ Thuật](#14-thông-số-kỹ-thuật)

---

## 1. Tổng Quan

**Ball Battle Arena** là một trò chơi browser chạy hoàn toàn offline (1 file HTML duy nhất), nơi 2–6 quả bóng chiến đấu với nhau bên trong một đấu trường khép kín. Mỗi bóng được trang bị một loại vũ khí và di chuyển hoàn toàn bằng vật lý — nảy tường, va chạm, và lực đẩy từ đòn đánh. Không có người điều khiển; game là một trận mô phỏng vật lý thuần túy với tính giải trí cao khi xem.

| Thuộc tính | Giá trị |
|------------|---------|
| Nền tảng | Trình duyệt web (1 file HTML duy nhất) |
| Người chơi | 0 (xem) — tương lai: 1–2 người |
| Kiểu trận | Free-for-all (bóng cuối cùng còn sống thắng) |
| Số chiến binh | 2–6 bóng mỗi trận |
| Kích thước canvas | 800 × 800 px |

---

## 2. Ý Tưởng Cốt Lõi

> *"Những quả bóng mang vũ khí nảy trong đấu trường. Mỗi lần chạm tường tốc độ tăng lên. Vũ khí mạnh dần theo số lần đánh trúng. Bóng cuối cùng còn sống thắng."*

**Các trụ cột thiết kế:**
- **Di chuyển vật lý thuần túy** — không có AI dẫn đường, chỉ nảy tường và va chạm đối thủ
- **Chiến thuật tự nhiên** — scaling vũ khí khiến những cú kill sớm tạo ra vòng xoáy sức mạnh
- **Chaos dễ đọc** — phản hồi hình ảnh (số damage, hiệu ứng hạt, flash) giúp người xem theo dõi dễ dàng

---

## 3. Luồng Game

```
[MÀN HÌNH MENU]
  → Cài đặt chiến binh (2–6 bóng)
  → Mỗi chiến binh: chọn vũ khí + màu tự động gán
  → Chọn Đấu Trường
  → Nhấn ⚔️ FIGHT!

[MÀN HÌNH TRẬN ĐẤU]
  → Các bóng được bắn ra từ các góc khác nhau về phía trung tâm
  → Mô phỏng vật lý chạy (nảy tường, va chạm, tấn công)
  → Khi chỉ còn 1 bóng sống → trận kết thúc

[MÀN HÌNH KẾT QUẢ]
  → Công bố người chiến thắng
  → Thống kê từng bóng: Tổng sát thương, Số kill, Số parry, Thời gian sống
  → Lựa chọn: Đánh lại | Về Menu
```

**Hành vi xuất phát:**
- Mỗi bóng xuất phát từ góc khác nhau và hướng về trung tâm đấu trường
- Tốc độ xuất phát được random riêng cho từng bóng: **3.0 – 6.0 đơn vị/frame**
- Hiển thị chỉ báo khi bắt đầu trận:
  - Tốc độ < 3.7 → `😴 Bad Start`
  - Tốc độ > 4.8 → `🔥 Great Start!`

---

## 4. Đấu Trường

Có 5 hình dạng đấu trường, mỗi loại ảnh hưởng khác nhau đến cách bóng nảy và bị dồn góc.

| Đấu trường | Loại | Kích thước | Ghi chú |
|------------|------|-----------|---------|
| **Square** | Hình vuông | 800 × 800 | Toàn canvas, nhiều góc chết |
| **Circle** | Hình tròn | bán kính = 220 px | Mượt, không có góc, góc nảy luôn biến đổi |
| **Rectangle** | Hình chữ nhật | 700 × 500 (căn giữa) | Rộng hơn cao, momentum ngang chiếm ưu thế |
| **Cross** | Hình chữ thập (+) | arm = 240, thick = 300 | 4 vùng túi, hình học phức tạp |
| **🕳️ Hole** | Vuông + lỗ tròn | 800 × 800, lỗ r = 70 (giữa) | Vuông có chướng ngại vật tròn ở trung tâm; bóng nảy khỏi viền lỗ |

**Quy tắc nảy tường:** `WALL_BOUNCE = 1.0` (hoàn toàn đàn hồi — không mất năng lượng khi chạm tường).

---

## 5. Ball (Đơn Vị Chiến Đấu)

Mỗi bóng là một chiến binh với bộ chỉ số cơ bản cố định. Chỉ số **không khác nhau** giữa các bóng — sự khác biệt đến từ chọn lựa vũ khí và scaling.

| Chỉ số | Giá trị | Mô tả |
|--------|---------|-------|
| HP tối đa | 100 | Máu khởi đầu và tối đa |
| Bán kính | 24 px | Bán kính va chạm vật lý |
| Khối lượng | 28.8 | Dùng trong tính toán động lượng (radius² × 0.05) |
| Tỉ lệ né | 10% | Xác suất né hoàn toàn một đòn đánh |
| Thời gian né | 60 frame (1 giây) | Miễn nhiễm + hiệu ứng cyan khi né kích hoạt |
| Tỉ lệ chí mạng | 20% | Xác suất **người tấn công** đánh chí mạng |
| Hệ số chí mạng | ×1.5 (150%) | Hệ số nhân sát thương khi chí mạng |
| Frame miễn nhiễm | 18 frame | Cửa sổ vô địch sau khi bị đánh |
| Màu bóng | 6 màu có sẵn | Xanh dương, Đỏ, Xanh lá, Cam, Tím, Hồng |

**Cài đặt nhiều bóng:**
- Tối thiểu 2 chiến binh, tối đa 6 chiến binh mỗi trận
- Màu sắc được gán tuần tự từ danh sách màu có sẵn

---

## 6. Hệ Thống Vật Lý

### 6.1 Di Chuyển

| Thông số | Giá trị |
|----------|---------|
| Ma sát | 0.999 mỗi frame (`vx *= 0.999`) |
| Tốc độ tối đa | 18 đơn vị/frame (kẹp sau khi áp dụng tất cả lực) |
| Trọng lực (tuỳ chọn) | +0.15 vy mỗi frame (bật/tắt qua nút 🌍) |

### 6.2 Nảy Tường

- Va chạm tường phản chiếu vận tốc theo công thức: `v -= dot(v, n) × (1 + WALL_BOUNCE) × n`
- Bóng được snap vào bề mặt tường để tránh xuyên tường
- **Tăng tốc khi nảy tường**: Mỗi lần va tường, tốc độ ×1.1 ngay lập tức
  - `wallBoostFactor` giảm dần ×0.9747 mỗi frame
  - Trở về giá trị gốc sau ~3 giây (180 frames)
  - `bounceCooldown` = 12 frame sau khi nảy tường (ngăn flash nảy lại)

### 6.3 Va Chạm Bóng-với-Bóng

- **Loại**: Va chạm đàn hồi với hệ số **e = 1.85** (hơi siêu đàn hồi)
- **Đẩy vị trí**: `overlap × 0.52` để tách hai bóng đang chồng nhau
- `bounceCooldown` = 20 frame cho cả hai bóng sau va chạm
- Va chạm chỉ được xử lý khi `bounceCooldown == 0` cho cả hai bóng

### 6.4 Hiệu Ứng Squash

Khi bị đánh: `squashX = 1.3, squashY = 0.75`, phục hồi ở tốc độ 0.15/frame (chỉ là hình ảnh)

---

## 7. Vũ Khí

Có 8 loại vũ khí, mỗi loại có hình học tấn công, sát thương, lực đẩy, và hành vi scaling riêng biệt.

### 7.1 Bảng Chỉ Số Vũ Khí

| # | Vũ khí | Emoji | Sát thương cơ bản | Lực đẩy cơ bản | Độ dài vũ khí | Bán kính đánh | Cooldown | Scaling |
|---|--------|-------|-------------------|----------------|---------------|--------------|----------|---------|
| 1 | Nắm đấm | 🥊 | 2 | 2 | 22 px | 11 px | 16 frame | Tốc độ đánh |
| 2 | Kiếm | ⚔️ | 1 | 4 | 50 px | 8 px | 28 frame | Sát thương |
| 3 | Dao găm | 🗡️ | 1 | 2 | 28 px | 8 px | 18 frame | Tốc độ xoay |
| 4 | Giáo | 🔱 | 1 | 5 | 65 px | 8 px | 38 frame | Độ dài + Sát thương |
| 5 | Cung | 🏹 | 0\* | 1 | 38 px | 8 px | 10 frame | Số mũi tên |
| 6 | Hái | 🌙 | 1 | 5 | 48 px | 18 px | 34 frame | Lưỡi kép |
| 7 | Búa | 🔨 | 1 | 12 | 38 px | 14 px | 48 frame | Lực đẩy |
| 8 | Phi tiêu | ⭐ | 0\* | 1 | 30 px | 10 px | 10 frame | Số phi tiêu |

\* Cung và Phi tiêu có sát thương cận chiến = 0 — toàn bộ sát thương đến từ đạn bắn ra.

### 7.2 Mô Tả Từng Vũ Khí

#### 🥊 Nắm Đấm (Fists)
Tốc độ tấn công nhanh nhất trong game. Tầm ngắn nhưng phù hợp với lối chơi hung hăng. Scaling tốc độ đánh — càng đánh nhiều thì cooldown giảm, tạo hiệu ứng cầu vồng sức mạnh theo thời gian.

#### ⚔️ Kiếm (Sword)
Vũ khí cận chiến cân bằng, tầm trung và lực đẩy ổn. Scaling sát thương thuần — mỗi đòn đánh trúng tăng sát thương vĩnh viễn. Đơn giản và đáng tin cậy.

#### 🗡️ Dao Găm (Dagger)
Lưỡi ngắn với tốc độ xoay nhanh. Scaling tốc độ xoay — vũ khí quay nhanh hơn theo từng đòn trúng, tăng cơ hội đánh và khó né hơn.

#### 🔱 Giáo (Spear)
Vũ khí cận chiến có tầm xa nhất. Tấn công chậm nhưng lực đẩy cao. Scaling cả độ dài lẫn sát thương đồng thời — late-game trở thành vũ khí cận chiến tầm xa gần như bất khả xâm phạm.

#### 🏹 Cung (Bow)
Bắn mũi tên mỗi **130 frame**. Tốc độ mũi tên: **7.5 đơn vị/frame**. Bắt đầu với 1 mũi tên mỗi lần bắn; mỗi đòn trúng thêm +1 mũi tên (vô hạn). Ở scaling cao: bắn loạt nhiều mũi tên theo hình rẻ quạt.

#### 🌙 Hái (Scythe)
Tấn công cung rộng (hitRadius 18 px). **Kích hoạt lưỡi kép ở 5 lần đánh trúng** — một lưỡi phía trước, một lưỡi phía sau. Ở scaling cao bao phủ gần 360°.

#### 🔨 Búa (Hammer)
Vũ khí chậm nhất nhưng lực đẩy cơ bản rất lớn (12). Mỗi đòn trúng tăng lực đẩy vĩnh viễn. Búa late-game có thể bắn đối thủ bay qua toàn bộ đấu trường.

#### ⭐ Phi Tiêu (Shuriken)
Bắn ngôi sao mỗi **120 frame**. Tốc độ phi tiêu: **6 đơn vị/frame**, nảy tường tối đa **2 lần**. Bắt đầu với 1 ngôi sao; mỗi đòn trúng thêm +1 (vô hạn). Phi tiêu có thể bị đỡ bởi tiếp xúc vũ khí.

---

## 8. Cơ Chế Chiến Đấu

### 8.1 Công Thức Tính Sát Thương

```
sátThươngCuối = (sátThươngCơBản + sátThươngBonus) × hệSốChíMạng × kiểmTraNé
```

- **hệSốChíMạng** = 1.5 nếu `Math.random() < critChance (0.20)`, ngược lại = 1.0
- **kiểmTraNé**: nếu `Math.random() < evadeChance (0.10)` → sát thương = 0 (né hoàn toàn)
- Né được kiểm tra **trước** chí mạng — không có chí mạng nào vượt qua được né

### 8.2 Lực Đẩy (Knockback)

```
lựcĐẩy = (lựcĐẩyCơBản + lựcĐẩyBonus) × 1.4
```
Áp dụng theo hướng từ người tấn công → người bị tấn công.

### 8.3 Hệ Thống Parry (Đỡ Đòn)

Parry xảy ra khi đầu hai vũ khí gặp nhau với ý định đối lập:

**Điều kiện:**
1. Cả hai bóng có `parryCooldown == 0`
2. Khoảng cách đầu vũ khí < ngưỡng
3. Tích vô hướng của cả hai hướng vũ khí > 0.2 (hai vũ khí nhắm vào nhau)

**Kết quả Parry:**
| Hiệu ứng | Giá trị |
|---------|---------|
| Lực bật lại | 5.5 đơn vị ra ngoài |
| Parry cooldown (cả hai) | 25 frame |
| Bounce cooldown (cả hai) | 22 frame |
| Lệch góc vũ khí | +π × 0.15 rad |
| Âm thanh | Hợp âm hai nốt sóng vuông |
| Hạt | 14 tia lửa vàng |

---

## 9. Cơ Chế Đặc Biệt

### 9.1 Né (Evade)

| Thuộc tính | Giá trị |
|------------|---------|
| Xác suất kích hoạt | 10% mỗi đòn đánh nhận |
| Thời gian | 60 frame (1 giây) |
| Hiệu ứng | Miễn nhiễm hoàn toàn, hào quang cyan |
| Hiển thị | Chữ "EVADE" màu cyan |
| Frame miễn nhiễm | 20 (kéo dài hơn bình thường 18) |

### 9.2 Chí Mạng (Critical Hit)

| Thuộc tính | Giá trị |
|------------|---------|
| Xác suất kích hoạt | 20% mỗi đòn đánh ra |
| Hệ số sát thương | ×1.5 |
| Hiệu ứng hình ảnh | Nhãn ⚡CRIT! + số damage màu vàng |
| Hạt máu | ×2 (12 so với bình thường 6) |

### 9.3 Tăng Tốc Khi Nảy Tường (Wall Speed Boost)

| Thuộc tính | Giá trị |
|------------|---------|
| Kích hoạt | Va chạm tường bất kỳ (tốc độ > 0.5) |
| Tăng tốc ban đầu | ×1.1 tốc độ |
| Tốc độ giảm | ×0.9747 mỗi frame |
| Thời gian giảm hoàn toàn | ~180 frame (3 giây) |
| Tia lửa tạo ra | 6 hạt vàng/cam |

---

## 10. Hệ Thống Đạn

### Mũi Tên (🏹 Cung)
| Thuộc tính | Giá trị |
|------------|---------|
| Tốc độ | 7.5 đơn vị/frame |
| Sát thương | 1 (nhân với số mũi tên/loạt) |
| Khoảng bắn | 130 frame |
| Hành vi tường | Biến mất khi chạm tường |
| Có thể bị đỡ | Có — bởi đầu vũ khí |
| Sau khi bị đỡ | Chủ sở hữu mũi tên chuyển sang bóng đỡ |

### Phi Tiêu / Ngôi Sao (⭐)
| Thuộc tính | Giá trị |
|------------|---------|
| Tốc độ | 6 đơn vị/frame |
| Sát thương | 1 |
| Khoảng bắn | 120 frame |
| Số lần nảy tường | Tối đa 2 lần |
| Có thể bị đỡ | Có — bởi đầu vũ khí |
| Hiệu ứng | Xoay tròn khi bay |

**Đỡ đạn:** Khi đầu vũ khí tiếp xúc với đạn, đạn bị đổi hướng và chủ sở hữu chuyển sang bóng đỡ. Tạo ra 5 tia lửa.

---

## 11. Hệ Thống Scaling (Tăng Sức Mạnh)

Mỗi vũ khí theo dõi **bộ đếm số lần đánh trúng**. Mỗi đòn xác nhận (không bị né) kích hoạt `onHit()` để nâng cấp.

| Vũ khí | Chỉ số Scaling | Mỗi lần đánh | Giới hạn |
|--------|---------------|-------------|---------|
| 🥊 Nắm đấm | Cooldown tấn công | −0.5 frame | Tối thiểu 8 frame |
| ⚔️ Kiếm | Sát thương bonus | +1 | Không giới hạn |
| 🗡️ Dao găm | Tốc độ xoay | +0.012 | Tối đa 0.55 |
| 🔱 Giáo | Độ dài + Sát thương | +4 px / +0.5 | Không giới hạn |
| 🏹 Cung | Số mũi tên | +1 mũi tên | Không giới hạn (∞) |
| 🌙 Hái | Chế độ lưỡi kép | Kích hoạt ở 5 lần | 2 lưỡi |
| 🔨 Búa | Lực đẩy | +0.8 | Không giới hạn |
| ⭐ Phi tiêu | Số ngôi sao | +1 | Không giới hạn (∞) |

**Công thức chỉ số vũ khí:**
```javascript
getSpeed()     = (baseSpeed + spinBonus) × scale
getDamage()    = baseDamage + bonusDamage
getKnockback() = baseKnockback + bonusKnockback
getLength()    = radius + baseLength + bonusLength
```

---

## 12. Phản Hồi Hình Ảnh & Âm Thanh

### 12.1 Hiệu Ứng Hạt (Particles)

| Sự kiện | Số hạt | Màu sắc | Thời gian sống |
|---------|--------|---------|----------------|
| Nảy tường | 6 | Vàng/cam | 20–35 frame |
| Parry | 14 | Vàng | 25–40 frame |
| Đòn thường | 6 máu | Đỏ | 18–28 frame |
| Chí mạng | 12 máu | Đỏ | 18–28 frame |
| Đỡ đạn | 5 | Cyan/trắng | 20 frame |
| Bùng nổ chết | 30 | Nhiều màu | 35–60 frame |

### 12.2 Số Damage Nổi

- Đòn thường: `-[sátThương]` màu trắng
- Chí mạng: `⚡CRIT!` màu vàng + `-[sátThương]` màu vàng (lệch ±4 px)
- Né: `EVADE` màu cyan (`#aaffee`)
- Lên cấp: Hiển thị khi vũ khí đạt mốc scaling

### 12.3 Hiệu Ứng Âm Thanh (Web Audio API)

| Sự kiện | Mô tả |
|---------|-------|
| Đánh trúng | Sawtooth 200 Hz, 0.15s decay |
| Parry | Sóng vuông 880 Hz + 660 Hz, 0.1–0.12s |
| Bắn (cung/phi tiêu) | Sine 440 Hz, 0.08s |
| Chết | Sawtooth 100 Hz + Sóng vuông 60 Hz |
| Lên cấp | Sine 1100 Hz, 0.15s |

---

## 13. Chế Độ Chơi & Cài Đặt

### Điều Khiển Trong Trận

| Nút | Hành động |
|-----|-----------|
| ⏸ Pause | Tạm dừng/tiếp tục mô phỏng |
| ← Menu | Quay về menu (kết thúc trận) |
| 🌍 Gravity: Off/On | Bật/tắt trọng lực (+0.15 vy/frame) |
| 🔍 100% | Chu kỳ zoom: 100% → 85% → 70% → 55% |
| ⚡ Speed: 1x | Chu kỳ tốc độ game: 1× → 2× → 3× → 5× |

### Cài Đặt Trước Trận

| Tuỳ chọn | Phạm vi | Mặc định |
|----------|---------|---------|
| Số chiến binh | 2–6 | 2 |
| Vũ khí mỗi chiến binh | Bất kỳ trong 8 loại | Kiếm |
| Đấu trường | 5 lựa chọn | Square |

---

## 14. Thông Số Kỹ Thuật

### Hằng Số Cốt Lõi

| Hằng số | Giá trị |
|---------|---------|
| `CW / CH` | 800 / 800 px |
| `BALL_R` | 24 px |
| `BASE_HP` | 100 |
| `WALL_BOUNCE` | 1.0 |
| Ma sát | 0.999 / frame |
| Tốc độ tối đa | 18 đơn vị/frame |
| Hệ số đàn hồi (e) | 1.85 |
| Trọng lực | 0.15 vy/frame |
| Tăng tốc tường | ×1.1, giảm 0.9747/frame |
| Phạm vi tốc độ xuất phát | 3.0 – 6.0 |
| Frame rate mục tiêu | 60 fps (requestAnimationFrame) |

### Cấu Trúc File

```
ball-battle/
└── index.html      ← toàn bộ game (self-contained, không phụ thuộc)
```

### Các Đoạn Code Quan Trọng

| Phần | Mô tả |
|------|-------|
| `WEAPON_DEFS` | Mảng 8 object cấu hình vũ khí |
| `ARENAS` | Object map của 5 cấu hình đấu trường |
| `class Ball` | Đơn vị chiến đấu: chỉ số, vật lý, vũ khí, render |
| `clampToBall()` | Va chạm & nảy tường theo từng loại đấu trường |
| `collide()` | Va chạm đàn hồi bóng-với-bóng |
| `_checkWeaponHit()` | Phát hiện đòn đánh cận chiến & gây sát thương |
| `step()` | Vòng lặp game chính: vật lý, chiến đấu, hạt |
| `drawArena()` | Render đấu trường theo từng loại |
| `initGame()` | Khởi tạo trận đấu, sinh bóng |
| `buildFightersPanel()` | Xây dựng UI chọn chiến binh trước trận |
| `buildHUD()` | Tạo thanh HP động |

---

*Ball Battle Arena — GDD v1.0*
