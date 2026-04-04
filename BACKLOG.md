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

## 📋 Ghi chú

- Cả 2 vũ khí đều dùng `reverseOnHit: true` (xem thảo luận ngày 2 Apr 2026)
- Rapier lấp khoảng trống **fast finesse counter**, Katana lấp **slow momentum bruiser**
- Tham khảo reference tại: `weapon_ball_battles__ultra_edition/weapons/rapier.js` và `katana.js` (reference rất đơn giản, design trên là hoàn toàn mới)
