/**
 * Canvas drawing for Chain Reaction — "blueprint on paper" style.
 * All functions draw in logical world units (1200 × 750).
 */
import {
  BALL_R,
  BLAST_R,
  BOMB_R,
  BUMPER_R,
  DOMINO_H,
  DOMINO_W,
  RAMP_R,
  SPRING_LEN,
  SPRING_R,
  TARGET_R,
  WALL_R,
  WORLD_H,
  WORLD_W,
  segEnds,
  type Body,
  type Part,
  type Shock,
  type Spark,
  type WallDef,
} from "./physics";

export const PAPER = "#f4ecdf";
export const INK = "#1b1b1b";
export const RED = "#ff4f2e";
export const BLUE = "#2e6bff";

let hatch: CanvasPattern | null = null;
function hatchPattern(ctx: CanvasRenderingContext2D) {
  if (hatch) return hatch;
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 8;
  const g = c.getContext("2d");
  if (!g) return INK;
  g.fillStyle = INK;
  g.fillRect(0, 0, 8, 8);
  g.strokeStyle = "rgba(244,236,223,0.28)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(-2, 10);
  g.lineTo(10, -2);
  g.moveTo(-2, 2);
  g.lineTo(2, -2);
  g.moveTo(6, 10);
  g.lineTo(10, 6);
  g.stroke();
  hatch = ctx.createPattern(c, "repeat");
  return hatch ?? INK;
}

export function drawPaper(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(46,107,255,0.07)";
  ctx.beginPath();
  for (let x = 25; x < WORLD_W; x += 25) {
    if (x % 100 === 0) continue;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_H);
  }
  for (let y = 25; y < WORLD_H; y += 25) {
    if (y % 100 === 0) continue;
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_W, y);
  }
  ctx.stroke();
  ctx.strokeStyle = "rgba(46,107,255,0.16)";
  ctx.beginPath();
  for (let x = 100; x < WORLD_W; x += 100) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_H);
  }
  for (let y = 100; y < WORLD_H; y += 100) {
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_W, y);
  }
  ctx.stroke();
  // Ruler numbers.
  ctx.fillStyle = "rgba(46,107,255,0.45)";
  ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textBaseline = "top";
  for (let x = 100; x < WORLD_W; x += 100) ctx.fillText(String(x), x + 3, 4);
  for (let y = 100; y < WORLD_H; y += 100) ctx.fillText(String(y), 4, y + 3);
}

export function drawWalls(ctx: CanvasRenderingContext2D, walls: WallDef[]) {
  ctx.lineCap = "round";
  // Soft offset shadow, like ink bleeding into paper.
  ctx.strokeStyle = "rgba(27,27,27,0.12)";
  for (const w of walls) {
    ctx.lineWidth = (w.r ?? WALL_R) * 2;
    ctx.beginPath();
    ctx.moveTo(w.ax + 4, w.ay + 5);
    ctx.lineTo(w.bx + 4, w.by + 5);
    ctx.stroke();
  }
  ctx.strokeStyle = hatchPattern(ctx);
  for (const w of walls) {
    ctx.lineWidth = (w.r ?? WALL_R) * 2;
    ctx.beginPath();
    ctx.moveTo(w.ax, w.ay);
    ctx.lineTo(w.bx, w.by);
    ctx.stroke();
  }
}

export function drawDropper(ctx: CanvasRenderingContext2D, x: number, y: number, showBall: boolean, t: number) {
  // Plumb line to help aim.
  ctx.save();
  ctx.setLineDash([4, 7]);
  ctx.lineDashOffset = -t * 20;
  ctx.strokeStyle = "rgba(46,107,255,0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y + BALL_R + 6);
  ctx.lineTo(x, WORLD_H);
  ctx.stroke();
  ctx.restore();
  // Funnel.
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x - 34, y - 46);
  ctx.lineTo(x - BALL_R - 5, y - 6);
  ctx.lineTo(x - BALL_R - 5, y + 6);
  ctx.moveTo(x + 34, y - 46);
  ctx.lineTo(x + BALL_R + 5, y - 6);
  ctx.lineTo(x + BALL_R + 5, y + 6);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = "bold 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("DROP", x + 40, y - 40);
  ctx.restore();
  if (showBall) drawBallShape(ctx, x, y, BALL_R, RED);
}

function starPath(ctx: CanvasRenderingContext2D, r: number, inner: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : inner;
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

export function drawTarget(ctx: CanvasRenderingContext2D, x: number, y: number, hit: boolean, hitT: number, t: number, index: number) {
  ctx.save();
  ctx.translate(x, y);
  if (hit) {
    // Expanding ring.
    if (hitT < 0.6) {
      ctx.strokeStyle = `rgba(255,79,46,${1 - hitT / 0.6})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, TARGET_R + hitT * 90, 0, Math.PI * 2);
      ctx.stroke();
    }
    const pop = hitT < 0.25 ? 1 + Math.sin((hitT / 0.25) * Math.PI) * 0.45 : 1;
    ctx.scale(pop, pop);
    ctx.rotate(Math.min(hitT, 0.4) * 3);
    starPath(ctx, TARGET_R + 4, 10);
    ctx.fillStyle = RED;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
  } else {
    const pulse = 1 + Math.sin(t * 3 + index) * 0.06;
    ctx.scale(pulse, pulse);
    ctx.rotate(Math.sin(t * 0.8 + index) * 0.12);
    starPath(ctx, TARGET_R + 2, 9);
    ctx.fillStyle = "rgba(255,79,46,0.14)";
    ctx.fill();
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = RED;
    ctx.stroke();
  }
  ctx.restore();
}

export interface PartStyle {
  ghost?: boolean;
  invalid?: boolean;
  selected?: boolean;
  /** Spring / bumper hit animation 0..1. */
  anim?: number;
  /** Domino rotation (radians). */
  th?: number;
  /** Bomb is armed (fuse burning). */
  armed?: boolean;
  time?: number;
}

export function drawPart(ctx: CanvasRenderingContext2D, p: Part, st: PartStyle = {}) {
  const color = st.invalid ? RED : p.fixed ? INK : BLUE;
  ctx.save();
  if (st.ghost) ctx.globalAlpha = 0.5;
  switch (p.kind) {
    case "ramp": {
      const [ax, ay, bx, by] = segEnds(p);
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(27,27,27,0.12)";
      ctx.lineWidth = RAMP_R * 2;
      ctx.beginPath();
      ctx.moveTo(ax + 3, ay + 4);
      ctx.lineTo(bx + 3, by + 4);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.fillStyle = PAPER;
      for (const [x, y] of [
        [ax, ay],
        [bx, by],
        [p.x, p.y],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "spring": {
      const squash = 1 - (st.anim ?? 0) * 0.55;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      const half = SPRING_LEN / 2;
      // Coil below the plate.
      const coilH = 22 * squash + 4;
      ctx.strokeStyle = st.invalid ? RED : INK;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      const zig = 6;
      for (let i = 0; i <= zig; i++) {
        const yy = SPRING_R + (coilH * i) / zig;
        const xx = (i % 2 === 0 ? -1 : 1) * (half - 14);
        if (i === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      ctx.fillStyle = st.invalid ? RED : INK;
      ctx.fillRect(-half + 8, SPRING_R + coilH, SPRING_LEN - 16, 4);
      // Plate.
      ctx.lineCap = "round";
      ctx.strokeStyle = st.invalid ? RED : p.fixed ? INK : RED;
      ctx.lineWidth = SPRING_R * 2;
      ctx.beginPath();
      ctx.moveTo(-half, 0);
      ctx.lineTo(half, 0);
      ctx.stroke();
      // Launch arrow.
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(0, -SPRING_R - 4);
      ctx.lineTo(0, -SPRING_R - 26);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -SPRING_R - 34);
      ctx.lineTo(-5, -SPRING_R - 25);
      ctx.lineTo(5, -SPRING_R - 25);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "bumper": {
      const s = 1 + (st.anim ?? 0) * 0.18;
      ctx.translate(p.x, p.y);
      ctx.scale(s, s);
      ctx.fillStyle = "rgba(27,27,27,0.12)";
      ctx.beginPath();
      ctx.arc(3, 4, BUMPER_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.invalid ? RED : (st.anim ?? 0) > 0.3 ? "#ffb02e" : p.fixed ? INK : RED;
      ctx.beginPath();
      ctx.arc(0, 0, BUMPER_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, BUMPER_R - 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PAPER;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      if (!p.fixed && !st.invalid) {
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, BUMPER_R + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case "bomb": {
      const t = st.time ?? 0;
      ctx.translate(p.x, p.y);
      if (st.armed) {
        const s = 1 + Math.sin(t * 60) * 0.08;
        ctx.scale(s, s);
      }
      ctx.fillStyle = "rgba(27,27,27,0.12)";
      ctx.beginPath();
      ctx.arc(3, 4, BOMB_R, 0, Math.PI * 2);
      ctx.fill();
      // Fuse.
      ctx.strokeStyle = "#8a6a3a";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(8, -BOMB_R + 2);
      ctx.quadraticCurveTo(16, -BOMB_R - 10, 24, -BOMB_R - 6);
      ctx.stroke();
      // Cap.
      ctx.fillStyle = st.invalid ? RED : INK;
      ctx.save();
      ctx.translate(7, -BOMB_R + 1);
      ctx.rotate(0.6);
      ctx.fillRect(-6, -4, 12, 8);
      ctx.restore();
      // Body.
      ctx.fillStyle = st.invalid ? RED : st.armed ? RED : INK;
      ctx.beginPath();
      ctx.arc(0, 0, BOMB_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(244,236,223,0.55)";
      ctx.beginPath();
      ctx.arc(-6, -6, 5, 0, Math.PI * 2);
      ctx.fill();
      if (!p.fixed && !st.invalid) {
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, BOMB_R, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Spark.
      const flick = 0.6 + 0.4 * Math.sin(t * 25 + p.x);
      ctx.fillStyle = "#ffb02e";
      ctx.beginPath();
      ctx.arc(25, -BOMB_R - 6, 3 + flick * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.arc(25, -BOMB_R - 6, 1.5 + flick, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "domino": {
      ctx.translate(p.x, p.y);
      ctx.rotate(st.th ?? 0);
      ctx.fillStyle = "rgba(27,27,27,0.12)";
      roundRect(ctx, -DOMINO_W / 2 + 3, -DOMINO_H + 3, DOMINO_W, DOMINO_H, 3);
      ctx.fill();
      ctx.fillStyle = color;
      roundRect(ctx, -DOMINO_W / 2, -DOMINO_H, DOMINO_W, DOMINO_H, 3);
      ctx.fill();
      ctx.fillStyle = PAPER;
      ctx.fillRect(-DOMINO_W / 2 + 2, -DOMINO_H / 2 - 1, DOMINO_W - 4, 2);
      for (const yy of [-DOMINO_H * 0.78, -DOMINO_H * 0.22, -DOMINO_H * 0.62]) {
        ctx.beginPath();
        ctx.arc(0, yy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Hinge.
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
  if (st.selected) drawSelection(ctx, p, st.time ?? 0);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Bounding box of a part in world space. */
export function partBounds(p: Part): [number, number, number, number] {
  switch (p.kind) {
    case "ramp":
    case "spring": {
      const [ax, ay, bx, by] = segEnds(p);
      const pad = p.kind === "spring" ? 30 : 12;
      return [Math.min(ax, bx) - pad, Math.min(ay, by) - pad, Math.max(ax, bx) + pad, Math.max(ay, by) + pad];
    }
    case "bumper":
      return [p.x - BUMPER_R - 8, p.y - BUMPER_R - 8, p.x + BUMPER_R + 8, p.y + BUMPER_R + 8];
    case "bomb":
      return [p.x - BOMB_R - 8, p.y - BOMB_R - 20, p.x + BOMB_R + 18, p.y + BOMB_R + 8];
    default:
      return [p.x - DOMINO_W - 6, p.y - DOMINO_H - 8, p.x + DOMINO_W + 6, p.y + 6];
  }
}

function drawSelection(ctx: CanvasRenderingContext2D, p: Part, t: number) {
  const [x0, y0, x1, y1] = partBounds(p);
  ctx.save();
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.lineDashOffset = -t * 18;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.setLineDash([]);
  ctx.fillStyle = BLUE;
  for (const [x, y] of [
    [x0, y0],
    [x1, y0],
    [x0, y1],
    [x1, y1],
  ]) {
    ctx.fillRect(x - 3, y - 3, 6, 6);
  }
  if (p.kind === "ramp" || p.kind === "spring") {
    const degs = Math.round((p.angle * 180) / Math.PI);
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${degs > 0 ? "+" : ""}${degs}°`, x0, y0 - 4);
  }
  ctx.restore();
}

function drawBallShape(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.fillStyle = "rgba(27,27,27,0.14)";
  ctx.beginPath();
  ctx.arc(x + 3, y + 4, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBodies(ctx: CanvasRenderingContext2D, bodies: Body[]) {
  // Trails first.
  ctx.lineCap = "round";
  for (const b of bodies) {
    const tr = b.trail;
    const n = tr.length / 2;
    if (n < 2) continue;
    for (let i = 1; i < n; i++) {
      const a = i / n;
      ctx.strokeStyle = b.kind === "ball" ? `rgba(255,79,46,${a * 0.55})` : `rgba(27,27,27,${a * 0.35})`;
      ctx.lineWidth = b.kind === "ball" ? 2 + a * (b.r * 0.9) : 1.5;
      ctx.beginPath();
      ctx.moveTo(tr[(i - 1) * 2], tr[(i - 1) * 2 + 1]);
      ctx.lineTo(tr[i * 2], tr[i * 2 + 1]);
      ctx.stroke();
    }
  }
  for (const b of bodies) {
    if (!b.alive) continue;
    if (b.kind === "ball") drawBallShape(ctx, b.x, b.y, b.r, RED);
    else {
      ctx.fillStyle = INK;
      ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
  }
}

export function drawFx(ctx: CanvasRenderingContext2D, sparks: Spark[], shocks: Shock[]) {
  for (const sh of shocks) {
    const k = sh.t / 0.6;
    ctx.strokeStyle = `rgba(255,79,46,${(1 - k) * 0.8})`;
    ctx.lineWidth = 6 * (1 - k) + 1;
    ctx.beginPath();
    ctx.arc(sh.x, sh.y, 20 + k * BLAST_R, 0, Math.PI * 2);
    ctx.stroke();
    if (k < 0.25) {
      ctx.fillStyle = `rgba(255,176,46,${(1 - k / 0.25) * 0.85})`;
      ctx.beginPath();
      ctx.arc(sh.x, sh.y, 30 + k * 200, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const s of sparks) {
    ctx.globalAlpha = Math.max(0, Math.min(1, s.life / s.max + 0.2));
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}
