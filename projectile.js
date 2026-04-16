// ============================================================
// PROJECTILE
// ============================================================
class Projectile {
  constructor(x, y, vx, vy, owner, type, damage) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.owner = owner;   // ball reference
    this.type = type;     // 'arrow' | 'shuriken' | 'fuma_shuriken' | 'lightning' | 'sword_beam' | 'gungnir'
    this.damage = damage;
    this.alive = true;
    this.bounces = 0;
    this.maxBounces = (type === 'shuriken' || type === 'fuma_shuriken') ? 2
                    : type === 'lightning' ? 2
                    : 0;
    this.immuneFrames = 5;  // brief immunity so it doesn't hit owner instantly
    this.angle = Math.atan2(vy, vx);
    this.r = type === 'arrow' ? 5
           : type === 'sword_beam' ? 10
           : type === 'gungnir' ? 8
           : type === 'lightning' ? 4
           : 8; // shuriken / fuma_shuriken
  }

  update(arena) {
    if (!this.alive) return;
    this.x += this.vx;
    this.y += this.vy;
    if (this.immuneFrames > 0) this.immuneFrames--;

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

    // Arena collision
    const hit = checkArenaWall(this.x, this.y, this.r, arena);
    if (hit) {
      if (this.bounces < this.maxBounces) {
        if (hit.nx !== 0) this.vx = -this.vx;
        if (hit.ny !== 0) this.vy = -this.vy;
        this.bounces++;
        // Fuma Shuriken: grow on each bounce
        if (this.type === 'fuma_shuriken') {
          this.r = Math.min(this.r + 4, 20);
          this.damage *= 1.6;
        }
      } else {
        this.alive = false;
      }
    }
    this.angle = Math.atan2(this.vy, this.vx);
  }

  draw(ctx) {
    if (!this.alive) return;
    const ownerCol = this.owner?.color || '#ffffff';

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
