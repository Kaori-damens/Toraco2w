// ============================================================
// PROJECTILE
// ============================================================
// Class đại diện cho một viên đạn / projectile đang bay trong arena.
// Được tạo bởi Ball._fireSingle() hoặc các skill (Soul Orb, Bone Shard...).
// Lưu trong state.projectiles[], update mỗi frame bởi game-loop.
// Va chạm xử lý trong collision.resolveProjectiles().
//
// Các type hiện tại:
//   'arrow'          — Bow / Medusa Bow
//   'shuriken'       — Shuriken (nảy tường 2 lần)
//   'fuma_shuriken'  — Fuma Shuriken (nảy 2 lần, lớn dần sau mỗi bounce)
//   'lightning'      — Mjolnir thunder bolt (nảy tường 2 lần)
//   'sword_beam'     — Excalibur mode beam (không nảy)
//   'gungnir'        — Gungnir thrown spear (homing + không nảy)
//   'soul_orb'       — Demon skill Soul Orb (homing, có lifetimer)
//   'fire_fist'      — Dragon kick fire fist (homing mạnh hơn soul_orb)
//   'bone_shard_proj'— Skeleton bone shard (từ pickup trên sân)
//   'spirit_orb'     — Spirit race orb (nảy 1 lần)
//   'chakram'        — Chakram (bay ra 40f rồi quay lại owner)

class Projectile {
  // ─── constructor ────────────────────────────────────────────
  // Khởi tạo projectile tại vị trí (x,y) với vận tốc (vx,vy).
  // Tham số:
  //   x, y     (number) — tọa độ sinh ra
  //   vx, vy   (number) — vận tốc ban đầu (pixel/frame)
  //   owner    (Ball)   — ball chủ sở hữu (dùng để bỏ qua collision với chính nó)
  //   type     (string) — loại projectile (xem list ở trên)
  //   damage   (number) — dame gây ra khi trúng
  constructor(x, y, vx, vy, owner, type, damage) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.owner = owner;   // ball reference
    this.type = type;     // 'arrow' | 'shuriken' | 'fuma_shuriken' | 'lightning' | 'sword_beam' | 'gungnir'
    this.damage = damage;
    this.alive = true;
    this.bounces = 0;
    // maxBounces — số lần projectile được phép nảy tường trước khi biến mất
    // shuriken/fuma_shuriken/lightning: 2 lần, spirit_orb/chakram: 1 lần, còn lại: 0
    this.maxBounces = (type === 'shuriken' || type === 'fuma_shuriken') ? 2
                    : type === 'lightning' ? 2
                    : type === 'spirit_orb' ? 1
                    : type === 'chakram' ? 1
                    : 0;
    this.immuneFrames = 5;  // brief immunity so it doesn't hit owner instantly
    // immuneFrames: 5 frame đầu không hit owner — tránh tự bắn vào bản thân ngay lúc spawn

    this.lifetimer = -1;    // -1 = no expiry; set after construction for soul_orb etc.
    // lifetimer: đếm ngược frame, =0 thì biến mất (-1 = sống mãi cho đến khi trúng/nảy hết)

    this.angle = Math.atan2(vy, vx); // góc nhìn (radian), cập nhật mỗi frame để rotate sprite

    // r — bán kính hitbox projectile, khác nhau theo type
    this.r = type === 'arrow' ? 5
           : type === 'sword_beam' ? 10
           : type === 'gungnir' ? 8
           : type === 'lightning' ? 4
           : type === 'soul_orb' ? 7
           : type === 'bone_shard_proj' ? 4
           : type === 'spirit_orb' ? 6
           : type === 'fire_fist' ? 9
           : type === 'chakram' ? 8
           : type === 'blood_bolt' ? 6
           : 8; // shuriken / fuma_shuriken
  }

  // ─── update ─────────────────────────────────────────────────
  // Cập nhật vị trí, homing, và va chạm tường mỗi frame.
  // Tham số: arena (object) — config arena hiện tại (từ ARENAS)
  // Trả về: không có — thay đổi trực tiếp this.x/y/vx/vy/alive/bounces
  update(arena) {
    if (!this.alive) return;
    this.x += this.vx; // di chuyển theo vận tốc hiện tại
    this.y += this.vy;
    if (this.immuneFrames > 0) this.immuneFrames--;
    if (this.lifetimer > 0) { this.lifetimer--; if (this.lifetimer === 0) { this.alive = false; return; } }

    // ── Blood bolt: lưu trail vị trí mỗi 3 frame ─────────────
    if (this.type === 'blood_bolt') {
      this._trailTimer = (this._trailTimer || 0) + 1;
      if (this._trailTimer >= 3) {
        this._trailTimer = 0;
        this._trail = this._trail || [];
        this._trail.push({ x: this.x, y: this.y, age: 0 });
        if (this._trail.length > 9) this._trail.shift();
      }
      for (const p of (this._trail || [])) p.age++;
    }

    // ── Homing logic ─────────────────────────────────────────
    // Cơ chế: thêm vector nhỏ hướng về target mỗi frame,
    // sau đó clamp speed về giá trị gốc (tránh accelerate vô hạn).
    // trackStrength khác nhau: fire_fist (0.09) > soul_orb (0.07) > gungnir (0.06)

    // Fire fist tracking (stronger curve than soul orb)
    if (this.type === 'fire_fist' && this.trackTarget?.alive) {
      const dx = this.trackTarget.x - this.x, dy = this.trackTarget.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const spd  = Math.hypot(this.vx, this.vy);
      this.vx += (dx / dist) * spd * 0.09; // nudge 9% speed về phía target
      this.vy += (dy / dist) * spd * 0.09;
      const ns = Math.hypot(this.vx, this.vy);
      if (ns > spd * 1.02) { this.vx = this.vx / ns * spd; this.vy = this.vy / ns * spd; } // clamp speed
    }

    // Soul orb soft tracking
    if (this.type === 'soul_orb' && this.trackTarget?.alive) {
      const dx = this.trackTarget.x - this.x, dy = this.trackTarget.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const spd  = Math.hypot(this.vx, this.vy);
      this.vx += (dx / dist) * spd * 0.07; // nudge 7% — nhẹ hơn fire_fist
      this.vy += (dy / dist) * spd * 0.07;
      const ns = Math.hypot(this.vx, this.vy);
      if (ns > spd * 1.02) { this.vx = this.vx / ns * spd; this.vy = this.vy / ns * spd; }
    }

    // Gungnir soft tracking: nudge toward target each frame
    if (this.type === 'gungnir' && this.tracking && this.trackTarget?.alive) {
      const dx = this.trackTarget.x - this.x, dy = this.trackTarget.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const spd  = Math.hypot(this.vx, this.vy);
      const trackStrength = 0.06; // gentle nudge
      this.vx += (dx / dist) * spd * trackStrength;
      this.vy += (dy / dist) * spd * trackStrength;
      // Re-clamp speed
      const newSpd = Math.hypot(this.vx, this.vy);
      if (newSpd > spd * 1.02) { this.vx = this.vx/newSpd*spd; this.vy = this.vy/newSpd*spd; }
    }

    // ── Chakram: outward 40f then home back to owner ───────
    // Giai đoạn 1: bay ra 40f (boomOutTimer)
    // Giai đoạn 2: returnPhase = true → homing về owner, biến mất khi chạm owner
    if (this.type === 'chakram') {
      if (!this.returnPhase) {
        this.boomOutTimer = (this.boomOutTimer || 0) + 1;
        if (this.boomOutTimer >= 40) this.returnPhase = true; // sau 40f → quay về
      }
      if (this.returnPhase && this.owner) {
        const dx = this.owner.x - this.x, dy = this.owner.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < (this.owner.radius || 15) + 12) { this.alive = false; return; } // caught
        const spd = Math.hypot(this.vx, this.vy);
        this.vx += (dx / dist) * spd * 0.18; // homing mạnh hơn soul_orb khi về
        this.vy += (dy / dist) * spd * 0.18;
        const ns = Math.hypot(this.vx, this.vy);
        if (ns > spd * 1.02) { this.vx = this.vx/ns*spd; this.vy = this.vy/ns*spd; }
      }
    }

    // ── Va chạm tường arena ──────────────────────────────────
    // skipHoles=true: projectile bay qua vùng hố (chỉ ball mới rơi xuống hố)
    // Nếu trúng tường: nảy (flip vx/vy theo normal) hoặc biến mất nếu hết maxBounces
    // Arena collision — skipHoles=true so projectiles fly over inner holes
    const hit = checkArenaWall(this.x, this.y, this.r, arena, true);
    if (hit) {
      if (this.bounces < this.maxBounces) {
        if (hit.nx !== 0) this.vx = -this.vx; // phản chiếu theo trục X
        if (hit.ny !== 0) this.vy = -this.vy; // phản chiếu theo trục Y
        this.bounces++;
        if (this.type === 'shuriken' || this.type === 'fuma_shuriken') sfxShurikenBounce();
        // Fuma Shuriken: grow on each bounce
        if (this.type === 'fuma_shuriken') {
          this.r = Math.min(this.r + 4, 20); // lớn thêm 4px mỗi bounce, tối đa 20px
          this.damage *= 1.6;                // dame ×1.6 mỗi bounce (exponential escalation)
        }
      } else {
        this.alive = false; // hết bounce → biến mất
      }
    }

    // ── Va chạm trụ (pillar) trong PvP map ───────────────────
    // Shuriken/fuma_shuriken: nảy off pillar (tính vào bounce limit)
    // Loại khác (arrow, lightning...): biến mất khi chạm trụ
    // Pillar collision (PvP only) — arrow disappears, shuriken bounces like wall
    if (this.alive && !state.pveMode && state.trapObjects?.length) {
      for (const trap of state.trapObjects) {
        if (trap.kind !== 'pillar') continue;
        const pdx = this.x - trap.x, pdy = this.y - trap.y;
        const pd  = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pd < trap.r + this.r) {
          if (this.type === 'shuriken' || this.type === 'fuma_shuriken') {
            // Shuriken: bounce off pillar (counts toward bounce limit, same as wall)
            if (this.bounces < this.maxBounces) {
              const nx = pdx / (pd || 1), ny = pdy / (pd || 1);
              const dot = this.vx * nx + this.vy * ny; // dot product → component dọc theo normal
              if (dot < 0) { this.vx -= 2 * dot * nx; this.vy -= 2 * dot * ny; } // reflection formula
              this.bounces++;
              if (typeof sfxShurikenBounce === 'function') sfxShurikenBounce();
              if (this.type === 'fuma_shuriken') {
                this.r = Math.min(this.r + 4, 20);
                this.damage *= 1.6;
              }
            } else {
              this.alive = false;
            }
          } else {
            // Arrow, lightning, sword_beam, gungnir → disappear on pillar contact
            this.alive = false;
          }
          break;
        }
      }
    }

    this.angle = Math.atan2(this.vy, this.vx); // cập nhật góc quay sprite
  }

  // ─── draw ───────────────────────────────────────────────────
  // Vẽ projectile lên canvas. Mỗi type có sprite riêng.
  // Tham số: ctx (CanvasRenderingContext2D) — context canvas chính
  // Kỹ thuật: ctx.save() + translate + rotate → vẽ quanh gốc tọa độ → ctx.restore()
  // Điều này giúp mỗi type chỉ cần vẽ relative to (0,0), không cần tính tọa độ tuyệt đối.
  draw(ctx) {
    if (!this.alive) return;

    // ── Blood bolt: vẽ rune trail trong world space ───────────
    if (this.type === 'blood_bolt' && this._trail?.length) {
      const MAX_AGE = 22; // frame trước khi trail point biến mất hoàn toàn
      // Các ký tự rune máu xoay vòng
      const RUNES = ['ᚱ', 'ᚢ', 'ᛏ', 'ᚦ', 'ᛉ', 'ᚲ', 'ᛒ', 'ᚹ', 'ᚾ'];
      for (let i = 0; i < this._trail.length; i++) {
        const pt = this._trail[i];
        const frac  = i / (this._trail.length - 1 || 1); // 0 = cũ nhất, 1 = mới nhất
        const alpha = (1 - pt.age / MAX_AGE) * (0.3 + frac * 0.55);
        if (alpha <= 0.02) continue;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(pt.x, pt.y);
        ctx.shadowColor = '#ff0033';
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = `hsl(350,100%,${50 + frac * 20}%)`;
        ctx.font        = `${Math.round(7 + frac * 5)}px serif`;
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(RUNES[i % RUNES.length], 0, 0);
        ctx.restore();
      }
    }

    const ownerCol = this.owner?.color || '#ffffff'; // màu owner để tint projectile

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.type === 'arrow') {
      // Arrow body — owner color
      ctx.shadowColor = ownerCol;
      ctx.shadowBlur  = 6;
      ctx.fillStyle   = ownerCol;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-12, -2);
      ctx.lineTo(-12, 2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Fletching — slightly darker owner color
      ctx.shadowBlur  = 0;
      ctx.globalAlpha = 0.75;
      ctx.fillStyle   = ownerCol;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-14, -4);
      ctx.lineTo(-8,   0);
      ctx.lineTo(-14,  4);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (this.type === 'sword_beam') {
      // Excalibur sword beam — golden bolt
      ctx.shadowColor = '#ffe84c'; ctx.shadowBlur = 20;
      ctx.fillStyle = '#fffacc';
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-18, -4); ctx.lineTo(-12, 0); ctx.lineTo(-18, 4);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffe84c'; ctx.lineWidth = 1.5; ctx.stroke();
    } else if (this.type === 'lightning') {
      // Mjolnir lightning bolt — jagged blue-white line
      ctx.shadowColor = '#88ccff'; ctx.shadowBlur = 12;
      ctx.strokeStyle = '#cceeFF'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(-2, -4); ctx.lineTo(2, 2); ctx.lineTo(6, -5); ctx.lineTo(10, 0);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(-8, 0); ctx.lineTo(10, 0); ctx.stroke();
    } else if (this.type === 'gungnir') {
      // Gungnir thrown spear — golden spear shape
      ctx.shadowColor = '#ffe84c'; ctx.shadowBlur = 10;
      ctx.strokeStyle = '#cc9930'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(14, 0); ctx.stroke();
      ctx.fillStyle = '#fffacc'; ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(14, 0); ctx.lineTo(7, -5); ctx.lineTo(7, 5); ctx.closePath();
      ctx.fill();
    } else if (this.type === 'fuma_shuriken') {
      // Fuma Shuriken — larger spinning star
      const spin = Date.now() * 0.012;
      const scale = this.r / 8; // grows with bounces
      ctx.shadowColor = '#44eebb'; ctx.shadowBlur = 12 + this.r;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + spin;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a)*this.r*1.1, Math.sin(a)*this.r*1.1);
        ctx.lineTo(Math.cos(a + Math.PI*0.25)*this.r*0.55, Math.sin(a + Math.PI*0.25)*this.r*0.55);
        ctx.closePath();
      }
      ctx.fillStyle = 'rgba(0,30,20,0.7)'; ctx.fill();
      ctx.strokeStyle = '#44eebb'; ctx.lineWidth = 2; ctx.stroke();
    } else if (this.type === 'fire_fist') {
      // Fire fist — glowing knuckle shape
      ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI * 2);
      ctx.fillStyle = '#ff5500'; ctx.fill();
      ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 2; ctx.stroke();
      // Knuckle ridges
      ctx.shadowBlur = 0;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.arc(k * 4, -2, 3, Math.PI, 0);
        ctx.strokeStyle = 'rgba(255,220,80,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      // Flame trail
      const t2 = Date.now() * 0.018;
      ctx.globalAlpha = 0.45;
      for (let f = 0; f < 3; f++) {
        const fa = Math.PI + (f - 1) * 0.35 + Math.sin(t2 + f) * 0.2;
        const fd = 10 + f * 3;
        ctx.beginPath();
        ctx.arc(Math.cos(fa)*fd, Math.sin(fa)*fd, 3 - f * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = f === 0 ? '#ff8800' : '#ff4400'; ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (this.type === 'soul_orb') {
      // Soul orb — glowing purple ghost orb
      ctx.shadowColor = '#cc44ff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180,80,255,0.80)'; ctx.fill();
      ctx.strokeStyle = '#eeccff'; ctx.lineWidth = 1.5; ctx.stroke();
      // Inner glow
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(0, 0, this.r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(240,200,255,0.6)'; ctx.fill();
    } else if (this.type === 'bone_shard_proj') {
      // Bone shard — small pale spike
      ctx.shadowColor = '#eeddcc'; ctx.shadowBlur = 6;
      ctx.fillStyle = '#e8dcc8';
      ctx.beginPath();
      ctx.moveTo(this.r * 1.4, 0);
      ctx.lineTo(-this.r, -this.r * 0.7);
      ctx.lineTo(-this.r * 0.4, 0);
      ctx.lineTo(-this.r, this.r * 0.7);
      ctx.closePath(); ctx.fill();
    } else if (this.type === 'chakram') {
      const returning = !!this.returnPhase;
      ctx.shadowColor = '#cc8844'; ctx.shadowBlur = returning ? 18 : 8;
      ctx.strokeStyle = returning ? '#ffcc88' : '#cc8844';
      ctx.lineWidth = 5; ctx.lineCap = 'round';
      const spin = Date.now() * 0.02;
      ctx.save(); ctx.rotate(spin);
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-3, -11, 14, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.quadraticCurveTo(3, 11, -14, 0); ctx.stroke();
      ctx.restore();
    } else if (this.type === 'blood_bolt') {
      // Blood pierce bolt — đỏ thẫm, nhanh, nhọn
      ctx.shadowColor = '#cc0033'; ctx.shadowBlur = 14;
      ctx.fillStyle   = '#dd0022';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -4); ctx.lineTo(-6, 0); ctx.lineTo(-10, 4);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ff4466'; ctx.lineWidth = 1; ctx.stroke();
    } else if (this.type === 'spirit_orb') {
      // Spirit orb — teal translucent orb with ring
      ctx.shadowColor = '#44ffcc'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(50,220,180,0.70)'; ctx.fill();
      ctx.strokeStyle = '#aafff0'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(0, 0, this.r * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200,255,240,0.5)'; ctx.fill();
    } else {
      // Shuriken — all 4 blades as ONE combined path (1 fill + 1 stroke = 1 shadow pass)
      const spin = Date.now() * 0.015;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + spin;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a)*8, Math.sin(a)*8);
        ctx.lineTo(Math.cos(a + Math.PI*0.25)*4, Math.sin(a + Math.PI*0.25)*4);
        ctx.closePath();
      }
      ctx.fillStyle   = 'rgba(0,0,0,0.6)';
      ctx.shadowColor = ownerCol;
      ctx.shadowBlur  = 10;
      ctx.fill();          // 1 shadow blur pass (was 4)
      ctx.shadowBlur  = 0; // turn off shadow before stroke
      ctx.strokeStyle = ownerCol;
      ctx.lineWidth   = 2;
      ctx.stroke();        // no shadow on outline (was 4 more passes)
    }
    ctx.restore();
  }
}
