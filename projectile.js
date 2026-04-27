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
                    : type === 'spirit_orb' ? 1
                    : 0;
    this.immuneFrames = 5;  // brief immunity so it doesn't hit owner instantly
    this.lifetimer = -1;    // -1 = no expiry; set after construction for soul_orb etc.
    this.angle = Math.atan2(vy, vx);
    this.r = type === 'arrow' ? 5
           : type === 'sword_beam' ? 10
           : type === 'gungnir' ? 8
           : type === 'lightning' ? 4
           : type === 'soul_orb' ? 7
           : type === 'bone_shard_proj' ? 4
           : type === 'spirit_orb' ? 6
           : type === 'fire_fist' ? 9
           : 8; // shuriken / fuma_shuriken
  }

  update(arena) {
    if (!this.alive) return;
    this.x += this.vx;
    this.y += this.vy;
    if (this.immuneFrames > 0) this.immuneFrames--;
    if (this.lifetimer > 0) { this.lifetimer--; if (this.lifetimer === 0) { this.alive = false; return; } }

    // Fire fist tracking (stronger curve than soul orb)
    if (this.type === 'fire_fist' && this.trackTarget?.alive) {
      const dx = this.trackTarget.x - this.x, dy = this.trackTarget.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const spd  = Math.hypot(this.vx, this.vy);
      this.vx += (dx / dist) * spd * 0.09;
      this.vy += (dy / dist) * spd * 0.09;
      const ns = Math.hypot(this.vx, this.vy);
      if (ns > spd * 1.02) { this.vx = this.vx / ns * spd; this.vy = this.vy / ns * spd; }
    }

    // Soul orb soft tracking
    if (this.type === 'soul_orb' && this.trackTarget?.alive) {
      const dx = this.trackTarget.x - this.x, dy = this.trackTarget.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const spd  = Math.hypot(this.vx, this.vy);
      this.vx += (dx / dist) * spd * 0.07;
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

    // Arena collision — skipHoles=true so projectiles fly over inner holes
    const hit = checkArenaWall(this.x, this.y, this.r, arena, true);
    if (hit) {
      if (this.bounces < this.maxBounces) {
        if (hit.nx !== 0) this.vx = -this.vx;
        if (hit.ny !== 0) this.vy = -this.vy;
        this.bounces++;
        if (this.type === 'shuriken' || this.type === 'fuma_shuriken') sfxShurikenBounce();
        // Fuma Shuriken: grow on each bounce
        if (this.type === 'fuma_shuriken') {
          this.r = Math.min(this.r + 4, 20);
          this.damage *= 1.6;
        }
      } else {
        this.alive = false;
      }
    }

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
              const dot = this.vx * nx + this.vy * ny;
              if (dot < 0) { this.vx -= 2 * dot * nx; this.vy -= 2 * dot * ny; }
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
