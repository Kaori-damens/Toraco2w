// ============================================================
// SPIN WHEEL
// ============================================================
// Options (optional 3rd arg to constructor):
//   mysteryCategory {string}   — discovery category key
//   mysteryKeys     {string[]} — key per item index (parallel to items[])
//   revealDelay     {number}   — ms to wait after stop before onDone (default 1300)
// ============================================================
class SpinWheel {
  constructor(canvasEl, items, opts = {}) {
    this.canvas   = canvasEl;
    this.ctx      = this.canvas.getContext('2d');
    this.items    = items.map((it, i) => ({ ...it, color: it.color || wColor(i) }));
    this.rotation = -(Math.PI / 2);
    this.spinning = false;
    this.total    = items.reduce((s, it) => s + it.weight, 0);

    // Mystery / fog-of-war config
    this.mysteryCategory = opts.mysteryCategory || null;
    this.mysteryKeys     = opts.mysteryKeys     || [];
    this.revealDelay     = opts.revealDelay     ?? 1300;

    // Reveal animation state
    this._revealIdx      = -1;   // index of slice being revealed
    this._revealT        = 0;    // 0→1 progress
    this._revealRafId    = null;
    this._revealStart    = null;

    this._draw();
  }

  // ── Helpers ───────────────────────────────────────────────

  _isMysteryItem(idx) {
    if (!this.mysteryCategory) return false;
    const key = this.mysteryKeys[idx];
    if (key == null) return false;
    return !isDiscovered(this.mysteryCategory, key);
  }

  _sliceAngles() {
    // Returns [{start, end, mid}] for each item at current rotation
    const angles = [];
    let a = this.rotation;
    for (const it of this.items) {
      const slice = (it.weight / this.total) * Math.PI * 2;
      angles.push({ start: a, end: a + slice, mid: a + slice / 2 });
      a += slice;
    }
    return angles;
  }

  // ── Draw ──────────────────────────────────────────────────

  _draw(revealIdx = -1, revealT = 0) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const cx  = W / 2, cy = W / 2, R = cx - 8;
    ctx.clearRect(0, 0, W, W);

    let a = this.rotation;
    this.items.forEach((it, idx) => {
      const slice   = (it.weight / this.total) * Math.PI * 2;
      const isMyst  = this._isMysteryItem(idx);
      const isReveal= (idx === revealIdx);

      // ── Slice fill ───────────────────────────────────────
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a, a + slice);
      ctx.closePath();

      if (isReveal) {
        // Animate: mystery dark → real color
        const from = [26, 26, 46];    // #1a1a2e
        const toC  = _hexToRgb(it.color) || [68, 136, 255];
        const r2   = Math.round(from[0] + (toC[0] - from[0]) * revealT);
        const g2   = Math.round(from[1] + (toC[1] - from[1]) * revealT);
        const b2   = Math.round(from[2] + (toC[2] - from[2]) * revealT);
        ctx.fillStyle = `rgb(${r2},${g2},${b2})`;

        // Gold glow on the slice while revealing
        if (revealT < 0.85) {
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur  = 18 * Math.sin(revealT * Math.PI);
        }
      } else if (isMyst) {
        ctx.fillStyle = '#1a1a2e';
      } else {
        ctx.fillStyle = it.color;
      }

      ctx.fill();
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = '#080818';
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      // ── Label ────────────────────────────────────────────
      if (it.weight > 0) {
        const mid = a + slice / 2;
        const lr  = R * 0.60;
        ctx.save();
        ctx.translate(cx + Math.cos(mid) * lr, cy + Math.sin(mid) * lr);
        const normMid = ((mid % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const flip    = normMid > Math.PI / 2 && normMid < 3 * Math.PI / 2;
        ctx.rotate(mid + (flip ? Math.PI : 0));

        const fs = Math.max(8, Math.min(11, Math.floor(290 / this.items.length)));
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        if (isReveal) {
          // Phase 1 (0→0.35): show "???" fading out
          // Phase 2 (0.50→1): show real label fading in
          if (revealT < 0.42) {
            const alpha = 1 - revealT / 0.42;
            ctx.font      = `bold ${fs}px Arial`;
            ctx.fillStyle = `rgba(150,150,180,${alpha * 0.7})`;
            ctx.fillText('???', 0, 0);
          } else {
            const alpha = Math.min(1, (revealT - 0.50) / 0.50);
            ctx.font      = `bold ${fs}px Arial`;
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            let lbl = it.label.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
            if (lbl.length > 20) lbl = lbl.slice(0, 19) + '…';
            ctx.fillText(lbl, 0, 0);
          }
        } else if (isMyst) {
          ctx.font      = `bold ${fs}px Arial`;
          ctx.fillStyle = 'rgba(150,150,180,0.55)';
          ctx.fillText('???', 0, 0);
        } else {
          ctx.font      = `bold ${fs}px Arial`;
          ctx.fillStyle = '#fff';
          let lbl = it.label.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
          if (lbl.length > 20) lbl = lbl.slice(0, 19) + '…';
          ctx.fillText(lbl, 0, 0);
        }

        ctx.restore();
      }

      a += slice;
    });

    // ── Reveal burst particles ────────────────────────────
    if (revealIdx >= 0 && revealT > 0.35 && revealT < 0.75) {
      const angles   = this._sliceAngles();
      const sliceAng = angles[revealIdx];
      if (sliceAng) {
        const burstR = R * 0.62;
        const bx = cx + Math.cos(sliceAng.mid) * burstR;
        const by = cy + Math.sin(sliceAng.mid) * burstR;
        const pt = (revealT - 0.35) / 0.40; // 0→1
        const sparkAlpha = Math.sin(pt * Math.PI);
        for (let i = 0; i < 6; i++) {
          const sa   = sliceAng.mid + (i / 6) * Math.PI * 2;
          const dist = 14 * pt;
          ctx.beginPath();
          ctx.arc(
            bx + Math.cos(sa) * dist,
            by + Math.sin(sa) * dist,
            2.5 * (1 - pt * 0.6), 0, Math.PI * 2
          );
          ctx.fillStyle = `rgba(255,215,0,${sparkAlpha * 0.85})`;
          ctx.fill();
        }
      }
    }

    // ── Hub ──────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fillStyle  = '#0a0a1e';
    ctx.fill();
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth  = 2.5;
    ctx.stroke();
  }

  // ── Reveal animation ──────────────────────────────────────

  _playReveal(winnerIdx, onDone) {
    const dur = this.revealDelay; // total ms for the reveal
    this._revealIdx   = winnerIdx;
    this._revealStart = null;

    const tick = (now) => {
      if (!this._revealStart) this._revealStart = now;
      const t = Math.min(1, (now - this._revealStart) / dur);
      this._revealT = t;
      this._draw(winnerIdx, t);
      if (t < 1) {
        this._revealRafId = requestAnimationFrame(tick);
      } else {
        this._revealIdx   = -1;
        this._revealRafId = null;
        onDone();
      }
    };
    this._revealRafId = requestAnimationFrame(tick);
  }

  // ── Spin ──────────────────────────────────────────────────

  spin(onDone) {
    if (this.spinning) return;
    this.spinning = true;

    // Determine winner
    let r      = Math.random() * this.total;
    let winner = this.items[0];
    for (const it of this.items) {
      r -= it.weight;
      if (r <= 0) { winner = it; break; }
    }

    // Recalculate cumAngle — land at a random position within the winning slice (15%–85%)
    let cumAngle = 0;
    for (const it of this.items) {
      const slice = (it.weight / this.total) * Math.PI * 2;
      if (it === winner) { cumAngle += slice * (0.15 + Math.random() * 0.70); break; }
      cumAngle += slice;
    }

    const winnerIdx  = this.items.indexOf(winner);
    const targetRot  = -Math.PI / 2 - cumAngle;
    const curNorm    = ((this.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const tNorm      = ((targetRot  % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let   delta      = tNorm - curNorm;
    if (delta <= 0) delta += Math.PI * 2;
    const totalSpin  = Math.PI * 2 * (6 + Math.floor(Math.random() * 5)) + delta;
    const dur        = 3800 + Math.random() * 1200;
    const t0         = performance.now();
    const startRot   = this.rotation;

    const tick = (now) => {
      const t    = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1 - t, 4);
      this.rotation = startRot + totalSpin * ease;
      this._draw();
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        // Wheel stopped — check if this is a mystery item
        const needsReveal = this._isMysteryItem(winnerIdx) && this.mysteryCategory;
        if (needsReveal) {
          // Mark discovered then play reveal animation
          markDiscovered(this.mysteryCategory, this.mysteryKeys[winnerIdx]);
          this._playReveal(winnerIdx, () => {
            this.spinning = false;
            onDone(winner, winnerIdx);
          });
        } else {
          this.spinning = false;
          onDone(winner, winnerIdx);
        }
      }
    };
    requestAnimationFrame(tick);
  }
}

// ── Utility ───────────────────────────────────────────────────
function _hexToRgb(hex) {
  if (!hex) return null;
  const h = hex.replace('#', '');
  if (h.length < 6) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
