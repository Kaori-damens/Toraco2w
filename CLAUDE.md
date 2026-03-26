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
