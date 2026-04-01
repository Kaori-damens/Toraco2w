// ============================================================
// PROJECTILE
// ============================================================
class Projectile {
  constructor(x, y, vx, vy, owner, type, damage) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.owner = owner;   // ball reference
    this.type = type;     // 'arrow' | 'shuriken'
    this.damage = damage;
    this.alive = true;
    this.bounces = 0;
    this.maxBounces = type === 'shuriken' ? 2 : 0;
    this.immuneFrames = 5;  // brief immunity so it doesn't hit owner instantly
    this.angle = Math.atan2(vy, vx);
    this.r = type === 'arrow' ? 5 : 8;
  }

  update(arena) {
    if (!this.alive) return;
    this.x += this.vx;
    this.y += this.vy;
    if (this.immuneFrames > 0) this.immuneFrames--;

    // Arena collision
    const hit = checkArenaWall(this.x, this.y, this.r, arena);
    if (hit) {
      if (this.bounces < this.maxBounces) {
        if (hit.nx !== 0) this.vx = -this.vx;
        if (hit.ny !== 0) this.vy = -this.vy;
        this.bounces++;
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
