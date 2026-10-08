/**
 * Canvas renderer for Impossible Scale (background, objects, scale bar, ruler).
 * Pure drawing from the mutable simulation state; no React here.
 */
import { OBJECTS } from "./objects";
import { DOT, DRAW, FONTS } from "./draw";
import { CHECKPOINTS, FOCUS_Z, LOG, formatLength, gateZ, layout, sup, unitHint } from "./scale";
import { clamp, rng } from "@/lib/random";

const C = { bg: "#0b0d1f", ink: "#eef0ff", accent: "#9b7bff", accent2: "#5ef2d6" };

export const pxPerDecade = (h: number) => clamp(h / 8.5, 46, 96);

export const RULER_W = 78;
/** Ruler strip width for a given stage width (narrower on phones). */
export const rulerWidth = (w: number) => (w > 520 ? RULER_W : 60);
export const REVEAL_SECONDS = 1.5;
export const REVEAL_HOLD = 1.1;
export const START_Z = FOCUS_Z[0];

export type Phase = "explore" | "guess" | "reveal" | "done";

export interface Sim {
  z: number;
  target: number;
  vel: number;
  t: number;
  w: number;
  h: number;
  dpr: number;
  phase: Phase;
  next: number; // index into CHECKPOINTS of the next unanswered checkpoint
  reveal: number[]; // per object 0..1 (only meaningful for checkpoints)
  revealTimer: number;
  doneTimer: number;
  hold: number; // -1 zoom in, +1 zoom out (buttons)
  maxZ: number;
  focus: number;
  pointers: Map<number, { x: number; y: number }>;
  pinchDist: number;
  dragMode: "none" | "canvas" | "ruler";
  dragMoved: number;
  dragStartY: number;
  lastMoveT: number;
  pausedRef: boolean;
}


const STARS = (() => {
  const r = rng(424242);
  return Array.from({ length: 140 }, () => ({ a: r.next() * Math.PI * 2, ph: r.next(), s: r.range(0.6, 1.8), tw: r.next() * 6 }));
})();

/** Background tint drifts with scale: quantum violet → earthly blue → cosmic plum. */
const TINTS: [number, [number, number, number]][] = [
  [-18, [46, 22, 92]],
  [-9, [14, 44, 70]],
  [-3, [18, 40, 52]],
  [2, [22, 30, 72]],
  [8, [10, 18, 48]],
  [14, [20, 12, 46]],
  [21, [44, 16, 60]],
  [27, [60, 20, 40]],
];
function tintAt(z: number): [number, number, number] {
  if (z <= TINTS[0][0]) return TINTS[0][1];
  for (let i = 0; i < TINTS.length - 1; i++) {
    const [z0, c0] = TINTS[i];
    const [z1, c1] = TINTS[i + 1];
    if (z <= z1) {
      const u = (z - z0) / (z1 - z0);
      return [0, 1, 2].map((k) => c0[k] + (c1[k] - c0[k]) * u) as [number, number, number];
    }
  }
  return TINTS[TINTS.length - 1][1];
}

const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};


export function render(ctx: CanvasRenderingContext2D, s: Sim, pos: Float64Array, reducedMotion: boolean) {
  const { w, h, z, t } = s;
  ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
  const viewW = w - rulerWidth(w);
  const cx = viewW / 2;
  const cy = h / 2;
  const span = Math.min(viewW, h);
  const unit = 10 ** z; // metres per span

  // background
  const [tr, tg, tb] = tintAt(z);
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.75);
  bg.addColorStop(0, `rgb(${tr},${tg},${tb})`);
  bg.addColorStop(1, C.bg);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // scale-dust tunnel (moves inward as you zoom out)
  const maxR = Math.hypot(w, h) * 0.6;
  for (const st of STARS) {
    const u = reducedMotion ? st.ph : (((st.ph - z * 0.55) % 1) + 1) % 1;
    const d = 0.06 * 10 ** (u * 1.35) * maxR;
    const a = Math.min(1, u * 4) * Math.min(1, (1 - u) * 3) * (0.35 + 0.25 * Math.sin(t * 2 + st.tw));
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = C.ink;
    ctx.fillRect(cx + Math.cos(st.a) * d, cy + Math.sin(st.a) * d, st.s, st.s);
  }
  ctx.globalAlpha = 1;

  // power-of-ten rings
  ctx.lineWidth = 1;
  ctx.font = `10px ${FONTS.mono}`;
  ctx.textAlign = "center";
  for (let n = Math.floor(z) - 1; n <= Math.floor(z) + 1; n++) {
    const rr = (10 ** (n - z) * span) / 2;
    const a = clamp((rr - 30) / 80, 0, 1) * clamp((maxR - rr) / 200, 0, 1) * 0.16;
    if (a <= 0.005) continue;
    ctx.globalAlpha = a;
    ctx.strokeStyle = C.accent2;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.accent2;
    ctx.globalAlpha = a * 3;
    ctx.fillText(formatLength(10 ** n), cx, cy - rr - 4);
  }
  ctx.globalAlpha = 1;

  // objects
  const { cam } = layout(z, pos);
  for (let j = 0; j < OBJECTS.length; j++) {
    const o = OBJECTS[j];
    const isCp = !!o.teaser;
    const rv = isCp ? s.reveal[j] : 1;
    if (rv <= 0) continue;
    let r = ((o.size / 2) / unit) * span;
    if (r < 0.3) continue;
    if (r > span * 2.6) continue;
    const x = cx + ((pos[j] - cam) / unit) * span;
    if (x + r * 2 < 0 || x - r * 2 > viewW + 40) continue;
    let alpha = clamp((span * 2.6 - r) / (span * 1.3), 0, 1) * clamp((r - 0.3) / 1.2, 0, 1);
    if (isCp && rv < 1) {
      const e = reducedMotion ? rv : easeOutBack(rv);
      alpha *= Math.min(1, rv * 1.6);
      r *= Math.max(0.01, e);
      if (!reducedMotion) {
        const ring = (((o.size / 2) / unit) * span) * (1 + rv * 1.4);
        ctx.globalAlpha = (1 - rv) * 0.8;
        ctx.strokeStyle = C.accent2;
        ctx.lineWidth = 3 * (1 - rv) + 1;
        ctx.beginPath();
        ctx.arc(x, cy, ring, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    if (alpha <= 0.01) continue;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, cy);
    if (r < 2.5) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 6);
      g.addColorStop(0, DOT[o.id] ?? C.ink);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.globalAlpha = alpha * 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = DOT[o.id] ?? C.ink;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, r), 0, Math.PI * 2);
      ctx.fill();
    } else {
      DRAW[o.id]?.(ctx, r, t);
    }
    ctx.restore();

    // label for non-focused objects
    if (j !== s.focus && r > 9 && r < span * 0.75) {
      const la = alpha * clamp((r - 9) / 16, 0, 1) * clamp((span * 0.75 - r) / (span * 0.25), 0, 1);
      if (la > 0.02) {
        ctx.globalAlpha = la * 0.85;
        ctx.fillStyle = C.ink;
        ctx.font = `600 12px ${FONTS.display}`;
        ctx.textAlign = "center";
        ctx.fillText(o.name, x, cy + r * 1.08 + 16);
        ctx.globalAlpha = 1;
      }
    }
  }

  // locked horizon hint while a checkpoint is pending
  if (s.phase === "explore" && s.next < CHECKPOINTS.length) {
    const gz = gateZ(CHECKPOINTS[s.next]);
    const near = clamp(1 - (gz - z) / 0.6, 0, 1);
    if (near > 0) {
      const g = ctx.createLinearGradient(viewW, 0, viewW * 0.55, 0);
      g.addColorStop(0, `rgba(94,242,214,${0.18 * near})`);
      g.addColorStop(1, "rgba(94,242,214,0)");
      ctx.fillStyle = g;
      ctx.fillRect(viewW * 0.55, 0, viewW * 0.45, h);
    }
  }

  drawScaleBar(ctx, viewW, h, z, span);
  drawRuler(ctx, s, w, h, viewW);
}

function drawScaleBar(ctx: CanvasRenderingContext2D, viewW: number, h: number, z: number, span: number) {
  const maxPx = Math.min(220, viewW * 0.38);
  let best = { px: 0, m: 0 };
  for (let n = Math.floor(z) - 2; n <= Math.floor(z) + 1; n++) {
    for (const m of [1, 2, 5]) {
      const len = m * 10 ** n;
      const px = (len / 10 ** z) * span;
      if (px <= maxPx && px > best.px) best = { px, m: len };
    }
  }
  if (!best.px) return;
  const x0 = 18;
  const y0 = h - 22;
  ctx.strokeStyle = C.ink;
  ctx.fillStyle = C.ink;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 6);
  ctx.lineTo(x0, y0);
  ctx.lineTo(x0 + best.px, y0);
  ctx.lineTo(x0 + best.px, y0 - 6);
  ctx.stroke();
  ctx.font = `600 12px ${FONTS.mono}`;
  ctx.textAlign = "left";
  ctx.fillText(formatLength(best.m), x0, y0 - 10);
  ctx.globalAlpha = 1;
}

function drawRuler(ctx: CanvasRenderingContext2D, s: Sim, w: number, h: number, viewW: number) {
  const rw = w - viewW;
  const x0 = viewW;
  const ppd = pxPerDecade(h);
  const cy = h / 2;
  const z = s.z;
  const g = ctx.createLinearGradient(x0, 0, w, 0);
  g.addColorStop(0, "rgba(11,13,31,0.0)");
  g.addColorStop(0.25, "rgba(11,13,31,0.75)");
  g.addColorStop(1, "rgba(11,13,31,0.92)");
  ctx.fillStyle = g;
  ctx.fillRect(x0 - 12, 0, rw + 12, h);
  const narrow = rw < RULER_W;
  const spine = x0 + (narrow ? 8 : 12);
  ctx.strokeStyle = "rgba(238,240,255,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(spine, 0);
  ctx.lineTo(spine, h);
  ctx.stroke();

  // locked zone above the next gate
  if (s.next < CHECKPOINTS.length) {
    const gz = gateZ(CHECKPOINTS[s.next]);
    const gy = cy - (gz - z) * ppd;
    if (gy > 0) {
      ctx.fillStyle = "rgba(155,123,255,0.12)";
      ctx.fillRect(x0, 0, rw, gy);
      ctx.strokeStyle = C.accent;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  const lo = Math.floor(z - cy / ppd) - 1;
  const hiN = Math.ceil(z + cy / ppd) + 1;
  ctx.textAlign = "left";
  for (let n = lo; n <= hiN; n++) {
    const y = cy - (n - z) * ppd;
    if (y < -10 || y > h + 10) continue;
    const fade = clamp(1 - Math.abs(y - cy) / (h * 0.55), 0.15, 1);
    ctx.globalAlpha = fade;
    ctx.strokeStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(spine - 6, y);
    ctx.lineTo(spine + 6, y);
    ctx.stroke();
    for (let m = 2; m < 10; m++) {
      const yy = y - Math.log10(m) * ppd;
      ctx.beginPath();
      ctx.moveTo(spine - 2, yy);
      ctx.lineTo(spine + 2, yy);
      ctx.stroke();
    }
    ctx.fillStyle = C.ink;
    ctx.font = `700 ${narrow ? 11 : 12}px ${FONTS.mono}`;
    ctx.fillText(`10${sup(n)}`, spine + (narrow ? 7 : 10), y + 1);
    if (!narrow) {
      ctx.font = `10px ${FONTS.mono}`;
      ctx.globalAlpha = fade * 0.6;
      ctx.fillText(unitHint(n), spine + 10, y + 13);
    }
  }
  ctx.globalAlpha = 1;

  // checkpoint diamonds
  // answered checkpoints sit at their true size; pending ones at their gate (never leak the answer)
  CHECKPOINTS.forEach((obj, i) => {
    const y = cy - ((i < s.next ? LOG[obj] : gateZ(obj)) - z) * ppd;
    if (y < -10 || y > h + 10) return;
    ctx.save();
    ctx.translate(spine, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = i < s.next ? C.accent2 : C.bg;
    ctx.strokeStyle = i < s.next ? C.accent2 : C.accent;
    ctx.lineWidth = 2;
    ctx.fillRect(-4.5, -4.5, 9, 9);
    ctx.strokeRect(-4.5, -4.5, 9, 9);
    ctx.restore();
  });

  // current position pointer
  ctx.fillStyle = C.accent2;
  ctx.beginPath();
  ctx.moveTo(x0 - 2, cy - 7);
  ctx.lineTo(x0 + 9, cy);
  ctx.lineTo(x0 - 2, cy + 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x0 + 2, cy - 1, rw - 4, 2);
}

