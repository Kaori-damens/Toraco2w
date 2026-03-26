# 🎮 Game Design Document: Ball Auto-Battle Arena

## 1. Tổng quan dự án (Project Overview)
* **Tên dự án:** Ball Battle (Working Title)
* **Thể loại:** Auto-Battle / Physics-based Combat / Simulation.
* **Cảm hứng:** Weapon Ball Battles (Earclacks).
* **Mô tả:** Trận đấu tự động giữa các khối tròn (Balls) trang bị vũ khí. Người chơi thiết lập chỉ số và vũ khí, sau đó quan sát hệ thống vật lý và AI quyết định thắng bại.

---

## 2. Đối tượng nhân vật (The Ball)
Nhân vật chính là một khối tròn (Circle) với các thuộc tính vật lý và chỉ số chiến đấu.

### 📊 Chỉ số cơ bản (Base Stats)
| Chỉ số | Ý nghĩa | Tác động |
| :--- | :--- | :--- |
| **HP** | Máu | Khi về 0, Ball bị tiêu diệt và thua cuộc. |
| **Attack** | Sức mạnh | Sát thương cộng thêm vào đòn đánh của vũ khí. |
| **Mana** | Năng lượng | Dùng để thực hiện các kỹ năng đặc biệt (Lướt, Gồng...). |
| **Mana Regen** | Hồi năng lượng | Tốc độ hồi Mana mỗi giây. |
| **Move Speed** | Tốc độ | Tốc độ di chuyển và lực đẩy khi áp sát đối phương. |

---

## 3. Hệ thống Vũ khí (Weapons System)
Vũ khí được gắn vào Ball và xoay quanh thân theo vật lý. Mỗi vũ khí có kiểu va chạm (Hitbox) và **cơ chế Scaling** riêng — khi đánh trúng hoặc parry, vũ khí sẽ tiến hóa mạnh hơn trong trận.

### ⚔️ Danh sách vũ khí

#### 1. 🥊 Tay không (Fists)
- **Hiển thị:** 2 nắm đấm nhỏ ở hai bên.
- **Cơ chế:** Đòn chém (Slash) tầm cực ngắn, tốc độ ra đòn nhanh nhất.
- **Scaling:** Không có scaling đặc biệt — bù lại tốc độ tấn công cao nhất.

#### 2. ⚔️ Kiếm (Sword)
- **Hiển thị:** Thanh kiếm dài trung bình, xoay quanh Ball.
- **Cơ chế:** Đòn chém (Slash) theo hình vòng cung, vùng ảnh hưởng rộng.
- **Scaling:** **+1 sát thương mỗi lần đánh trúng.** Càng đánh nhiều, damage càng tăng.

#### 3. 🗡️ Dao găm (Dagger)
- **Hiển thị:** Lưỡi dao ngắn, gắn chặt vào thân.
- **Cơ chế:** Đòn đâm nhanh, tầm ngắn.
- **Scaling:** **+tốc độ xoay mỗi lần đánh trúng.** Càng lâu trận, Ball xoay cực nhanh tạo sát thương liên tục. Super: kích thước dao nhân ×5.

#### 4. 🔱 Giáo (Spear)
- **Hiển thị:** Một cây giáo dài.
- **Cơ chế:** Đòn đâm (Thrust) theo đường thẳng, tầm đánh xa nhất trong cận chiến.
- **Scaling:** **+0.5 chiều dài & +0.5 sát thương mỗi lần đánh trúng.** Giáo ngày càng dài hơn.

#### 5. 🏹 Cung (Bow)
- **Hiển thị:** Cánh cung và mũi tên.
- **Cơ chế:** Tầm xa, bắn Projectile (mũi tên). Mũi tên có thể bị Parry nếu chạm vào vũ khí đối phương.
- **Scaling:** **+1 số lượng mũi tên bắn ra mỗi lần đánh trúng.** Bắn ngày càng nhiều tên hơn.

#### 6. 🌙 Lưỡi hái (Scythe)
- **Hiển thị:** Lưỡi hái cong lớn.
- **Cơ chế:** Đòn chém vòng cung rộng, sát thương cao hơn kiếm nhưng chậm hơn.
- **Scaling:** **Super:** Thêm 1 lưỡi hái ở phía đối diện, tấn công cả 2 hướng.

#### 7. 🛡️ Khiên (Shield)
- **Hiển thị:** Tấm khiên tròn hoặc chữ nhật gắn vào thân.
- **Cơ chế:** **Phòng thủ** — chặn/deflect các đòn tấn công và Projectile từ đối phương. Khi deflect thành công, gây Knockback nhẹ cho đối thủ.
- **Scaling:** **Khiên rộng hơn mỗi lần Parry thành công.** Đặc biệt: **có thể sao chép ability của đối thủ** bằng cách deflect đòn của họ.

#### 8. 🔮 Quyền trượng (Scepter)
- **Hiển thị:** Gậy phép có đầu phát sáng, xoay quanh Ball.
- **Cơ chế:** Tấn công ma thuật, sát thương phụ thuộc vào **tốc độ xoay hiện tại**.
- **Scaling:** **+1 tốc độ xoay tối đa mỗi lần đánh trúng.** Tự gia tốc đến max, không đổi hướng khi bị Parry/Parrying.

#### 9. 🪃 Phi tiêu (Shuriken)
- **Hiển thị:** Ngôi sao ninja quay tròn.
- **Cơ chế:** Bắn phi tiêu xoay theo hướng ngẫu nhiên. Tầm trung, có thể bắn liên tục.
- **Scaling:** **+1 phi tiêu mỗi lần đánh trúng**, phi tiêu xoay nhanh hơn và khó đoán hơn.

#### 10. 🔨 Búa (Hammer)
- **Hiển thị:** Búa lớn nặng nề.
- **Cơ chế:** Đòn đập (Smash) gây **Knockback mạnh nhất** trong game. Tốc độ chậm, sát thương mỗi đòn cao.
- **Scaling:** **Knockback tăng mỗi lần đánh trúng.** Cuối trận có thể văng đối thủ ra khỏi màn hình.

#### 11. 🔧 Cờ lê (Wrench)
- **Hiển thị:** Cờ lê cơ khí.
- **Cơ chế:** Đòn chém trung bình. Đặc biệt: **có thể "sửa" (heal) Ball bản thân** khi không bị tấn công trong X giây.
- **Scaling:** **Lượng HP hồi tăng mỗi lần đánh trúng.**

#### 12. 🗾 Katana (Katana)
- **Hiển thị:** Lưỡi kiếm mỏng, dài.
- **Cơ chế:** Ra đòn theo **chuỗi chém (Slash Combo)** — mỗi lần tấn công hoặc Parry thành công, **+1 nhát chém** vào chuỗi kế tiếp. Mỗi nhát gây sát thương theo thời gian (DoT) mỗi 0.2 giây.
- **Scaling:** Chuỗi chém ngày càng dài hơn, tạo sát thương DoT chồng chất.

#### 13. 🧪 Bình thuốc (Flask)
- **Hiển thị:** Bình thủy tinh nhỏ.
- **Cơ chế:** Ném bình tạo **vũng hóa chất (Spill)** trên sàn. Đối thủ đứng trên vũng bị hao HP liên tục (DPS).
- **Scaling:** **DPS của vũng tăng mỗi khi đối thủ đứng trong vũng.** Vũng có thể chồng lên nhau.

#### 14. 📖 Pháp thư (Grimoire)
- **Hiển thị:** Cuốn sách phép bay xung quanh Ball.
- **Cơ chế:** Khi đánh trúng đối thủ, **sao chép** vũ khí và chỉ số của đối thủ đó để tạo ra **Minion**. Minion chiến đấu tự động bên cạnh chủ.
- **Scaling:** **HP của Minion +1 mỗi lần đánh trúng.** Minion có cùng vũ khí và scaling với đối thủ gốc.

#### 15. 🪄 Gậy phép (Staff)
- **Hiển thị:** Cây gậy dài có ngôi sao trên đỉnh.
- **Cơ chế:** Bắn Projectile phép thuật (homing hoặc thẳng). Sát thương ổn định, tầm xa.
- **Scaling:** **+kích thước projectile và +sát thương mỗi lần đánh trúng.**

#### 16. 🏇 Thương kỵ mã (Lance)
- **Hiển thị:** Giáo dài của kỵ sĩ.
- **Cơ chế:** Tấn công bình thường yếu. Mỗi 3 giây, **Joust** (xung kích): Ball lao thẳng vào đối thủ với **tốc độ cao, sát thương lớn, bất tử tạm thời** nhưng độ chính xác thấp. Không bị trọng lực ảnh hưởng khi Joust.
- **Scaling:** **+2 sát thương Joust mỗi lần đánh trúng.**

---

## 4. Hệ thống Scaling (Weapon Scaling System)
> **Đây là cơ chế cốt lõi của game, phân biệt với các game battle thông thường.**

Mỗi vũ khí có một **chỉ số Scaling** riêng tích lũy trong trận:

| Vũ khí | Trigger | Hiệu ứng Scaling |
| :--- | :--- | :--- |
| Kiếm | Đánh trúng | +1 Attack mỗi hit |
| Dao găm | Đánh trúng | +tốc độ xoay |
| Giáo | Đánh trúng | +0.5 tầm & +0.5 damage |
| Cung | Đánh trúng | +1 số mũi tên |
| Scythe | Super | Thêm lưỡi đối diện |
| Khiên | Parry | +kích thước khiên, copy ability |
| Quyền trượng | Đánh trúng | +1 max tốc độ xoay |
| Phi tiêu | Đánh trúng | +1 phi tiêu bắn ra |
| Búa | Đánh trúng | +Knockback force |
| Cờ lê | Đánh trúng | +HP hồi |
| Katana | Hit/Parry | +1 nhát trong chuỗi combo |
| Bình thuốc | Đối thủ trong vũng | +DPS vũng |
| Pháp thư | Đánh trúng | +1 HP Minion |
| Gậy phép | Đánh trúng | +kích thước & damage projectile |
| Lance | Đánh trúng | +2 damage Joust |

---

## 5. Đấu trường (Arenas)
Sàn đấu có biên giới vật lý (Collider walls) để các nhân vật va đập bên trong.

* **Square (Hình vuông):** Có 4 góc, dễ bị dồn ép vào góc chết.
* **Circle (Hình tròn):** Trơn tru, giúp các nhân vật dễ dàng trượt đi khi bị va chạm mạnh.
* **Rectangle (Hình chữ nhật):** Tạo khoảng cách lớn theo chiều ngang, ưu thế cho vũ khí tầm xa.
* **Cross (Hình thập):** Nhiều ngóc ngách, thích hợp cho vũ khí tầm gần phục kích.
* **Open Field (Sân trống lớn):** Không có tường, Ball bị loại khi ra ngoài biên. Ưu thế tuyệt đối cho Búa (Knockback).

---

## 6. Cơ chế chiến đấu (Combat Mechanics)

### 💥 Quy tắc va chạm (Collision Logic)
Game vận hành dựa trên việc kiểm tra va chạm giữa các lớp (Layers) vật lý:

| Va chạm giữa | Kết quả | Hiệu ứng |
| :--- | :--- | :--- |
| **Vũ khí A + Thân Ball B** | **Gây sát thương** | Ball B mất HP, bị đẩy lùi (Knockback) dựa trên lực va chạm. |
| **Vũ khí A + Vũ khí B** | **Parry (Đỡ đòn)** | Không ai mất HP. Cả 2 bị đẩy văng ra xa nhau (Recoil force). |
| **Thân Ball A + Thân Ball B** | **Va chạm vật lý** | Hai nhân vật nảy ra nhau (như bóng bi-a). |
| **Projectile + Vũ khí** | **Parry đạn** | Đạn bị tiêu hủy/bật ngược, không gây sát thương. |
| **Projectile + Thân Ball** | **Gây sát thương** | Mất HP theo sát thương đạn. |
| **Vũ khí + Khiên** | **Block** | Không mất HP, Knockback nhẹ cho kẻ tấn công, khiên to hơn. |

### ⚡ Cơ chế đặc biệt
- **Knockback Physics:** Lực đẩy lùi phụ thuộc vào vũ khí, tốc độ va chạm và mass của Ball.
- **Chain Parry:** Liên tiếp Parry trong 1 giây tạo hiệu ứng **Counter** gây thêm Knockback.
- **Death Explosion:** Khi Ball chết, nổ tung thành mảnh nhỏ (có thể gây sát thương nhỏ lên kẻ gần).

---

## 7. Trí tuệ nhân tạo (AI Behavior)
Vì là game **Auto-Battle**, mỗi Ball sẽ có một tập lệnh AI đơn giản:

### 🤺 AI Cận chiến (Kiếm, Giáo, Tay không, Búa, Dao găm, Katana, Lance)
- Luôn hướng về phía đối thủ.
- Tăng tốc khi ở ngoài tầm đánh (Chasing).
- Tự động kích hoạt hoạt ảnh tấn công khi đối thủ trong tầm (Range).
- **Lance:** AI kích hoạt Joust theo cooldown 3 giây khi đối thủ trong tầm thẳng.

### 🏹 AI Tầm xa (Cung, Phi tiêu, Staff, Quyền trượng)
- **Kiting:** Luôn cố gắng giữ một khoảng cách an toàn với đối thủ.
- Nếu đối thủ tiến quá gần, AI sẽ di chuyển lùi hoặc đi ngang.
- Tự động bắn khi có đường đạn thông thoáng.

### 🛡️ AI Phòng thủ (Khiên, Cờ lê)
- Ưu tiên hướng khiên về phía đòn tấn công sắp tới.
- **Khiên:** Tiến về đối thủ nhưng luôn xoay vũ khí chặn trước.
- **Cờ lê:** Tấn công nhanh rồi rút lùi để hồi HP khi không bị tấn công.

### 🧪 AI Gian tiếp (Bình thuốc, Pháp thư)
- **Bình thuốc:** Ném bình để tạo vũng, cố gắng dẫn dụ đối thủ đứng vào vũng.
- **Pháp thư:** Tiếp cận đủ gần để đánh trúng 1 lần, sau đó để Minion chiến đấu trong khi rút lui.

---

## 8. Các chế độ chơi (Game Modes)

### ⚔️ 1v1 Classic
- 2 Balls chiến đấu trong Arena. Bên nào về 0 HP trước thì thua.
- **Tùy chọn:** Cho phép người chơi chọn vũ khí và chỉnh stats.

### 👑 Battle Royale (Nhiều Ball)
- Từ 4 đến 16 Balls cùng lúc trong Arena rộng hơn.
- Balls bị loại khi về 0 HP.
- Ball cuối cùng còn sống thắng.
- **Tùy chọn random weapon:** Mỗi Ball nhận vũ khí ngẫu nhiên.

### 🔵🔴 Team Fight (Đánh đội)
- Chia 2 đội (mỗi đội 2–4 Balls). Đội nào còn Ball cuối cùng thắng.
- Đồng đội không gây sát thương lẫn nhau.
- **Chiến lược đội:** Các vũ khí hỗ trợ (Cờ lê heal, Pháp thư minion) phát huy mạnh trong mode này.

### 💀 Boss Raid
- Một Boss Ball với HP cực lớn (×5 đến ×10 HP thường), kích thước lớn hơn và stats cao hơn.
- Nhiều Balls người chơi (2–8) phải hợp sức tiêu diệt Boss.
- Boss có AI mạnh hơn và có thể có **Giai đoạn 2 (Phase 2)**: đổi vũ khí hoặc tăng tốc khi HP < 50%.

### 🌀 Super Weapons Mode
- Tất cả Balls bắt đầu trận với vũ khí đã ở trạng thái **đã Scaling tối đa**.
- Trận đấu diễn ra nhanh và hỗn loạn hơn.

---

## 9. Luồng vận hành (Game Loop)
1. **Giai đoạn chuẩn bị:** Thiết lập vũ khí và chỉ số cho các Balls tham chiến.
2. **Giai đoạn chiến đấu:**
   - Hệ thống thả các Balls vào vị trí xuất phát trong Arena.
   - AI bắt đầu tính toán di chuyển và tấn công.
   - Vật lý tính toán các pha Parry và Va chạm.
   - **Weapon Scaling** cập nhật theo thời gian thực khi hit/parry xảy ra.
3. **Kết thúc:** Trận đấu dừng lại khi một bên cạn HP. Hiển thị thống kê (Số lần Parry, Sát thương gây ra, Số lần Joust, Scaling đạt được...).

---

## 10. Hiệu ứng hình ảnh & Âm thanh (VFX/SFX)
* **Parry:** Hiệu ứng tóe lửa (Sparks) và tiếng kim loại va chạm ("Clang").
* **Hit:** Hiệu ứng rung màn hình nhẹ và tia máu/hạt (particles) bắn ra.
* **Death:** Ball nổ tung thành các mảnh nhỏ.
* **Scaling Up:** Hiệu ứng ánh sáng/glow nhẹ trên vũ khí khi Scaling tăng.
* **Joust (Lance):** Hiệu ứng vệt sáng tốc độ cao khi Ball lao về phía trước.
* **Spill (Flask):** Vũng hóa chất màu sắc trên sàn, sáng dần khi DPS tăng.
* **Minion Spawn (Grimoire):** Hiệu ứng khói/ma thuật khi Minion xuất hiện.
* **Shield Copy:** Hiệu ứng flash màu khi Khiên sao chép ability mới.
