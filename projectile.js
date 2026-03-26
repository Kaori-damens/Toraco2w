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
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    if (this.type === 'arrow') {
      ctx.fillStyle = '#cc9944';
      ctx.strokeStyle = '#886622';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-12, -2);
      ctx.lineTo(-12, 2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // fletching
      ctx.fillStyle = '#88bb44';
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-14, -4);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-14, 4);
      ctx.closePath(); ctx.fill();
    } else {
      // shuriken
      ctx.strokeStyle = '#44eebb';
      ctx.fillStyle = '#003322';
      ctx.lineWidth = 2;
      const spin = Date.now() * 0.015;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + spin;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a)*8, Math.sin(a)*8);
        ctx.lineTo(Math.cos(a+Math.PI*0.25)*4, Math.sin(a+Math.PI*0.25)*4);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
  }
}
