1. # Char dev:

Thêm 1 vòng quay tên “Character development” trong bước tạo nhân vật sau skillpick.  
Các giá trị của param này, theo định dạng sau: Tên, trọng số (weight) và descc

| Inversion | 1,2 | Đảo ngược tất cả base stat. (10\<-\>1, 9\<-\>2, 8\<-\>3, 7\<-\>4,6\<-\>5,...) |
| :---: | :---: | :---: |

| Isekai | 1,2 | Quay lại từ đầu từ bước sau khi chọn tên. Các data hiện tại không bị xóa đi, được lưu lại là 1 “vessel”. Khi người thứ 2 quay ra isekai, họ sẽ quay thêm vòng quay “Isekai into” với isekai bình thường (quay lại từ đầu) và isekai vào những vessel có sẵn |
| :---: | :---: | :---: |

| Blessed by Chaos | 1,8 | Kéo base stat của chỉ số cao nhất xuống 1, sau đó nhận thêm 2 Character Development. |
| :---: | :---: | :---: |

| Braindead | 1,4 | Nhận \-2 IQ, 2 BIQ |
| :---: | :---: | :---: |

| Madness | 1,2 | Mất hết tất cả skills, cộng 2 STR, 2 SPD, 2 MA |
| :---: | :---: | :---: |

| Too Horny | 1,6 | Nhận \+3 Strength và \+2 Durability, nhưng Base IQ biến thành 0\. |
| :---: | :---: | :---: |

| Become King Slayer | 2 | (1).Nhận Archetype "Slayer". Nếu bạn đang là một "Slayer", chọn thêm 1 tộc nữa. (2).Trong Combat: Nếu đối thủ có Char Dev "King's Landing", nhận \+1 All Stats. |
| :---: | :---: | :---: |

| Kungfu Training | 2,2 | Nhận \+2 Durability và \+2 Martial Arts |
| :---: | :---: | :---: |

| Lost an Arm | 2 | Nhận \-4 Martial Arts 💀 |
| :---: | :---: | :---: |
| **Lost a Leg** | 2 | Nhận \-4 Speed 💀 |
| **Obtain a Cultivation Technique** | 2 | Nhận \+2 BIQ, \+3 Martial Arts. |

| Become Woke | 1,8 | Nhận \-3 IQ, \+1 Strength và \+1 Durability. |
| :---: | :---: | :---: |

| Old Age | 2 | Nhận \+2 IQ, \+1 BIQ và \-1 DUR |
| :---: | :---: | :---: |

| No more family | 2 | Nhận thêm 2 skills |
| :---: | :---: | :---: |

| Fate's Trick | 2 | Có 50% khả năng nhân đôi Base stat thấp nhất và 50% khả năng chia đôi stat cao nhất. (làm tròn lên) |
| :---: | :---: | :---: |

| Patkinsion | 2 | Khi parry, đánh trúng đối thủ, tường thì có 20% làm rơi vũ khí (như bị disarm, và bị trừ sát thương khi chưa nhặt vũ khí lại) |
| :---: | :---: | :---: |

| Dungeon Crawler  | 2 | Không nhận sát thương từ các trap |
| :---: | :---: | :---: |

| Finality | 1,2 | Race của bạn tuyệt chủng trong mùa championship này. ( Sau khi 1 radoser quay ra char dev này, set weight của race đó về 0\) |
| :---: | :---: | :---: |

| Jojo | 1,2 | Mở vòng quay Jojo và nhận 1 |
| :---: | :---: | :---: |

| Naruto | 1,2 | Mở vòng quay Naruto và nhận 1 |
| :---: | :---: | :---: |

| One piece | 1,2 | Mở vòng quay Onepiece và nhận 1 |
| :---: | :---: | :---: |

| JJK | 1,2 | Mở vòng quay JJK và nhận 1 |
| :---: | :---: | :---: |

2. # New skills:

Thêm các hệ thống skills sau vào vòng quay, nên có catetory riêng biệt. Ví dụ: JJK\_domains, JJK\_cursetechnique,Jojo\_stand, Jojo\_support,OP\_haki, OP\_devilfruit. Mỗi domains, curse technique, stand và devil fruit là unique.

**JJK** skills, sẽ chia thành domain và curse technique. Domain sẽ kích hoạt tại giây 20 và chỉ 1 lần mỗi trận duration sẽ thay đổi khác nhau.Curse technique sẽ có điều kiện trigger như bình thường.  
**Phục ma Ngự trù tử** 

Đây là Domain gây sát thương liên tục lên tất cả kẻ địch trong vùng ảnh hưởng.

* **Cơ chế:** Tạo ra 1 vùng lớn màu đỏ hình tròn (Nếu arena size S sẽ cover cả vùng)  
* **Hiệu ứng:**

Mỗi 1 giây (`60 frames`), tạo 1 ra 1 đường thẳng màu đen (nhát chém) gây 5 sát thương, mỗi giây tiếp theo tăng thêm 1 đường chém

Đối thủ bị giảm 50% né trong domain này (vdu evade chance từ 10% \-\>5%)

Gợi ý logic code: ko có

Vô Lượng Không Xứ 

Domain này tập trung vào việc khống chế và làm tê liệt trí tuệ đối thủ.

* **Cơ chế:** Tạo ra một vùng không gian màu tím đặc trưng.  
* **Hiệu ứng:**

Kẻ địch bước vào vùng này sẽ bị dính trạng thái "Quá tải thông tin": Tốc độ di chuyển (`maxSpd`) giảm 70% và `IQ/BIQ` bị đưa về 1\.

Vũ khí của đối thủ sẽ bị đóng băng (`stunTimer`) lâu hơn khi bị bạn parry.

Đối thủ giảm 50% né khi trong domain này

Khảm Hợp Ám Đình 

Domain này biến sàn đấu thành vũng lầy bóng tối, hỗ trợ di chuyển và triệu hồi.

* **Cơ chế:** Chuyển tạo 1 vùng bóng tối màu đen  
* **Hiệu ứng:**

Bạn có 50% cơ thể ẩn trong bóng tối (tăng 20% `evadeChance`). Visual đổi màu bóng thành màu đen, chỉ còn con mắt sáng lên)

**Triệu hồi:** Cứ mỗi 5 giây, lãnh địa tự động sinh ra 1 con `Shikigami` (dùng logic `_spawnSkillMinions` của `horde_call`) để tấn công đối phương. Shikigami khi bị hit sẽ biến mất, Shikigami sau khi đánh trúng 2 đòn sẽ biến mất.

Curse technique: 

Chú ngôn:  
**Loại**: `in_combat` (Phản xạ khi va chạm)

**Cơ chế**: Khi bạn bị đối thủ trong 1 bán kính nhỏ xung quanh radoser, hét mệnh lệnh: **"Dừng lại\!"**.

**Hiệu ứng**: Đối thủ bị đóng băng hoàn toàn (`stunTimer`) trong 1.5s

Kính kình

**Loại**: `in_combat` (Chỉ dành cho **Fists**)

**Cơ chế**: Một đòn đánh nhưng gây ra nhiều lần sát thương. Khi radoser quay ra skills này sẽ tự động bỏ vũ khí (dùng fists) nếu điều này xảy ra \+1 MA.

**Hiệu ứng**: Sau khi đòn đánh melee **đầu tiên** trúng đích, 0.3s sau sẽ có 80% một vụ nổ chú lực gây thêm sát thương bằng 90% đòn đánh trước. Cú nổ đó có thể lặp lại 1 lần nữa với tỉ lệ giảm nửa (40%) với sát thương bằng 90% cú nổ trước, tương tự cú nổ tiếp theo giảm nửa (20%) và sát thương 90%,.......

### **Bất Nghĩa du hí**

**Loại**: `in_combat` (Hook: `skillOnEvade` hoặc `skillOnParry`)

**Cơ chế**: Tráo đổi vị trí.

**Hiệu ứng**: Khi bạn Parry thành công hoặc né đòn (`Evade`), bạn lập tức hoán đổi tọa độ `x, y` của mình với đối thủ. Đối thủ bị stun 0.5s do bất ngờ. Radoser sở hữu skill này sau khi đổi vị trí sẽ “phóng” vào vị trí của đối thủ thay vì bay hướng bình thường

Xuyên Huyết 

**Loại**: `in_combat` 

**Hiệu ứng**: Sau khi tích tụ đủ 4 đòn đánh, sẽ bắn ra một tia máu tốc độ cực cao, xuyên thấu qua mọi vật cản (`piercing`) aim thẳng vào đối thủ (bay rất nhanh, có thể parry và trigger evade như bình thường) cooldown 11s

Jojo skills:  
Hệ thống Stand (Stand Mechanics) :  Stand là một thực thể chiến đấu song hành **Triệu hồi (Stand Summon)**: Sử dụng Hook pre\_combat. Khi vào trận, một Ball nhỏ hơn (Stand) sẽ xuất hiện cạnh bạn.

**Liên kết linh hồn (Soul Link)**: Stand và Chủ nhân chia sẻ chung một thanh HP. Nếu Stand bị trúng đòn, Chủ nhân cũng mất máu. Stand không thể parry

**Tầm xa (Range)**: Stand chỉ có thể di chuyển trong một bán kính $R$ quanh chủ nhân. Nếu chủ nhân di chuyển, Stand bị kéo theo.

Stand có chỉ số tấn công mặc định (hãy nghĩ ra giúp tớ cho phù hợp), crit chance \= 5%, evade chance \=5%

Các loại stand:

**Star Platinum:** Khi stand va chạm đối thủ có 25% trigger ORA ORA đấm liên tiếp 10 lần liên tiếp vào đối thủ và hét “ORA ORA ORA” mỗi hit gây sát thương nhỏ nhưng knockback liên tục (góc/hướng knockback khác nhau giữa mỗi đòn) . Stand này có giảm 10% sát thương nhận vào (ví dụ: Đánh thăng vào người radoser thì radoser mất 100 máu, nhưng khi đánh vào star platinum thì radoser chỉ mất 90 máu)

**The World:** Ngưng động tất cả trong 10s.Tất cả đối thủ và đạn đều đứng yên, chỉ bạn và Stand có thể di chuyển. Mặc định né tất cả projectile và melee. Cooldown 50s. Trigger tối đa 3 lần 1 trận

**Killer Queen:** Bất kỳ vật gì Stand chạm vào (Ball đối thủ, tường, cột,) sẽ để lại 1 quả bom có bán kính r=. Đối thủ khi va vào boom sẽ nổ và knockback lớn, còn nếu boom trên người đối thủ, khi boom chạm tường, projectile, trap, vũ khí khác (check r của bom) thì sẽ nổ và knockback lớn, nếu boom trên người đối thủ chạm 1 ai khác (không tính stand, có thể tính cả radoser sở hữu Killer Queen thì cả 2 đều nhận sát thương và knockback).

**Gold Experience:** Stand đánh trúng tường sẽ tạo ra một vật thể sống (Minion rùa cắn melee/rắn bắn projectile) gây sát thương cố định 4 dmg 1 lần đánh. Các minions tồn tại 10s, cooldown sau khi tạo 1 minion là 10s đến khi tạo 1 minion tiếp theo

Các skills hỗ trợ stand:   
**Remote Control (Điều khiển từ xa)**:

* **Hiệu ứng**: Tăng bán kính hoạt động của Stand lên gấp đôi (từ 150px lên 300px)  
* **Lợi ích**: Cho phép Stand của bạn truy đuổi đối thủ ở xa trong khi bạn vẫn an toàn ở góc sân. 

**Shared Senses (Đồng bộ hóa)**:

* **Hiệu ứng**: Stand được thừa hưởng 100% chỉ số `Crit Chance` và `Evade Chance` từ chủ nhân.  
* **Lợi ích**: Giúp Stand chiến đấu hiệu quả như một Ball thực thụ.

**Evolution :**

Hiệu ứng: Sau mỗi trận thắng, Stand được tăng 10% kích thước và 5% sát thương giảm 10% sát thương nhận vào (cộng dồn tối đa 5 lần). 

One piece:  
Bao gồm haki và trái ác quỷ (devil fruit)

Haki:  
**Haki Quan Sát (Observation Haki)**:

* **Loại**: `passive`.  
* **Hiệu ứng**: Tăng 10% evade chance(ví dụ base là 5%-\> 15%). Tăng tốc độ quay vũ khí khi đối thủ trong tầm r= (xác định giúp tớ)

**Haki Vũ Trang (Armament Haki)**:

* **Loại**: `in_combat` (Hook: `getDamage` và `takeDamage`).  
* **Hiệu ứng**:

**Tấn công**: Đòn đánh cộng thêm 10% sát thương và tăng mạnh knockback

**Phòng thủ**: Giảm 10% sát thương nhận vào và giảm knockback

**Haki Bá Vương (Conqueror's Haki)**:

* **Loại**: `in_combat`  
* **Hiệu ứng**: Tung ra một luồng áp lực khiến tất cả đối thủ có `BIQ` thấp hơn bạn bị `stun` trong 3 giây. Trigger khi đối thủ trong 1 bán kính R, cooldown 15s  
* **Logic**: So sánh `ball.charBIQ` với đối thủ 

Devil Fruit:

Goro Goro (Sét) : Nhân vật có thể lướt xuyên (dài 1 khoảng cách x px) qua đối thủ mà không bị va chạm vật lý, để lại một vệt sét gây sát thương (`sfxLightning`). 

Tori Tori (Phượng hoàng) : **Passive**: Tự hồi `1 HP` mỗi 2 giây. Khi HP về 0, hồi sinh lại với 30% HP (dùng logic nâng cao của `Phoenix` skill) và tăng tốc độ di chuyển 30%, giảm evade chance đi 10%. Nếu radoser có skills Phoenix và nhận trái ác quỷ này, loại bỏ skills phoenix (hoặc không trigger skills phoenix nữa) và tăng lượng hồi HP thành 1 hp mỗi giây

Mera Mera (Lửa): Các đòn đánh để lại hiệu ứng "Thiêu đốt", gây sát thương trừ dần vào HP đối thủ trong 5 giây (giống `Poison Blade` của Dagger nhưng vô hạn stack)

 Ryu Ryu (Khủng long \- Model: Allosaurus): Sau 20s, **Logic**: Nhân vật to hơn 20%, không thể bị đẩy lùi (`heavy_mass` logic) và sát thương cận chiến tăng 10%

**Hito Hito (Người \- Model: Daibutsu \- Phật khổng lồ)**:

* **Hiệu ứng**: Tạo sóng xung kích vàng.  
* **Logic**: Mỗi lần nảy tường, phát ra một vòng tròn sóng âm gây sát thương diện rộng (AoE) dựa trên chỉ số `MA`.

**Neko Neko (Báo)**:

* **Hiệu ứng**: Tốc độ sát thủ.  
* **Logic**: Tăng `30%` tốc độ di chuyển và `10%` tỉ lệ chí mạng (`critChance`). Đòn đánh từ phía sau lưng đối thủ chắc chắn chí mạng

Pika Pika (Ánh sáng): Khi chạm tường, nhân vật không nảy bình thường mà biến thành tia sáng, di chuyển tức thời đến tường đối diện. Trên đường đi nếu va chạm đổi thủ sẽ gây 1 lượng sát thương \= 70% sát thương của radoser và nảy ngược ra trở thành trái banh như bình thường.

