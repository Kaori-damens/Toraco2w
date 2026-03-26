// ============================================================
// SPIN WHEEL
// ============================================================
class SpinWheel {
  constructor(canvasEl, items) {
    this.canvas = canvasEl;
    this.ctx = this.canvas.getContext('2d');
    this.items = items.map((it, i) => ({ ...it, color: it.color || wColor(i) }));
    this.rotation = -(Math.PI / 2); // start at top
    this.spinning = false;
    this.total = items.reduce((s, it) => s + it.weight, 0);
    this._draw();
  }
  _draw() {
    const ctx = this.ctx, W = this.canvas.width, cx = W/2, cy = W/2, R = cx - 8;
    ctx.clearRect(0, 0, W, W);
    let a = this.rotation;
    for (const it of this.items) {
      const slice = (it.weight / this.total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a, a + slice); ctx.closePath();
      ctx.fillStyle = it.color; ctx.fill();
      ctx.strokeStyle = '#080818'; ctx.lineWidth = 1.5; ctx.stroke();
      const mid = a + slice / 2, lr = R * 0.68;
      ctx.save();
      ctx.translate(cx + Math.cos(mid)*lr, cy + Math.sin(mid)*lr);
      ctx.rotate(mid + Math.PI/2);
      ctx.fillStyle = '#fff';
      const fs = Math.max(9, Math.min(13, Math.floor(290 / this.items.length)));
      ctx.font = `bold ${fs}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let lbl = it.label.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
      if (lbl.length > 11) lbl = lbl.slice(0,10)+'…';
      ctx.fillText(lbl, 0, 0); ctx.restore();
      a += slice;
    }
    // Hub
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2);
    ctx.fillStyle = '#0a0a1e'; ctx.fill();
    ctx.strokeStyle = '#4488ff'; ctx.lineWidth = 2.5; ctx.stroke();
  }
  spin(onDone) {
    if (this.spinning) return;
    this.spinning = true;
    // Determine winner
    let r = Math.random() * this.total;
    let winner = this.items[0], cumAngle = 0;
    for (const it of this.items) {
      const slice = (it.weight / this.total) * Math.PI * 2;
      r -= it.weight;
      if (r <= 0) { winner = it; break; }
      cumAngle += slice;
    }
    // Recalculate cumAngle for winner
    cumAngle = 0;
    for (const it of this.items) {
      const slice = (it.weight / this.total) * Math.PI * 2;
      if (it === winner) { cumAngle += slice/2; break; }
      cumAngle += slice;
    }
    // Target: winner's midpoint should be at top (-π/2)
    // When rotation = R, first segment starts at R. Top pointer is at -π/2.
    // Segment mid is at R + cumAngle. We want R + cumAngle ≡ -π/2 (mod 2π)
    // So R = -π/2 - cumAngle
    const targetRot = -Math.PI/2 - cumAngle;
    const curNorm = ((this.rotation % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    const tNorm   = ((targetRot % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    let delta = tNorm - curNorm; if (delta <= 0) delta += Math.PI*2;
    const totalSpin = Math.PI*2 * (6 + Math.floor(Math.random()*5)) + delta;
    const dur = 3800 + Math.random()*1200, t0 = performance.now();
    const startRot = this.rotation;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1-t, 4);
      this.rotation = startRot + totalSpin * ease;
      this._draw();
      if (t < 1) { requestAnimationFrame(tick); }
      else { this.spinning = false; onDone(winner, this.items.indexOf(winner)); }
    };
    requestAnimationFrame(tick);
  }
}
