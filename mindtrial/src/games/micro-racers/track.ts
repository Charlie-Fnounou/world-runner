/**
 * Micro Racers — track definitions and geometry helpers (pure, no DOM).
 * Tracks are closed Catmull-Rom splines through control points, resampled
 * at a fixed arc-length step so that "progress along the track" is simple.
 */

export const W = 1280;
export const H = 800;
/** Bottom strip reserved for the HUD. */
export const HUD_H = 58;

export interface BoostDef {
  /** Position along the lap, 0..1. */
  t: number;
  /** Lateral position as a fraction of half-width (-1..1, + = right of travel). */
  offset: number;
}

export type DecorKind = "coffee" | "pencil" | "clip" | "eraser" | "ruler" | "sticky" | "crumbs";
export interface DecorDef {
  kind: DecorKind;
  x: number;
  y: number;
  angle?: number;
  size?: number;
  color?: string;
}

export interface TrackDef {
  name: string;
  subtitle: string;
  width: number;
  points: [number, number][];
  boosts: BoostDef[];
  decor: DecorDef[];
}

export interface Track {
  def: TrackDef;
  width: number;
  half: number;
  /** Resampled centerline. */
  xs: Float64Array;
  ys: Float64Array;
  /** Unit tangent. */
  tx: Float64Array;
  ty: Float64Array;
  /** Signed curvature (1/px), positive = turning right (screen coords, clockwise). */
  curv: Float64Array;
  /** Racing-line lateral offset (px, + = right of travel). */
  line: Float64Array;
  n: number;
  step: number;
  length: number;
  boosts: { i: number; x: number; y: number; angle: number; s: number; offset: number }[];
}

export const BOOST_LEN = 54;
export const BOOST_WID = 34;

export const TRACKS: TrackDef[] = [
  {
    name: "Ruler Ring",
    subtitle: "Fast sweepers around the stationery",
    width: 104,
    points: [
      [330, 115],
      [640, 100],
      [960, 112],
      [1135, 175],
      [1180, 320],
      [1100, 435],
      [960, 455],
      [855, 525],
      [850, 620],
      [740, 680],
      [520, 680],
      [300, 675],
      [150, 600],
      [110, 430],
      [150, 230],
    ],
    boosts: [
      { t: 0.11, offset: 0.3 },
      { t: 0.68, offset: -0.35 },
    ],
    decor: [
      { kind: "coffee", x: 470, y: 380, size: 92 },
      { kind: "pencil", x: 640, y: 300, angle: -0.12, size: 440, color: "#f6c431" },
      { kind: "clip", x: 1040, y: 600, angle: 0.6 },
      { kind: "eraser", x: 300, y: 300, angle: 0.4 },
      { kind: "sticky", x: 1000, y: 300, angle: -0.08, color: "#ffe36e" },
      { kind: "crumbs", x: 640, y: 470 },
      { kind: "coffee", x: 1210, y: 700, size: 60 },
    ],
  },
  {
    name: "Hairpin Hustle",
    subtitle: "Two hairpins and a sneaky esses",
    width: 96,
    points: [
      [250, 650],
      [560, 670],
      [880, 660],
      [1130, 615],
      [1185, 490],
      [1100, 430],
      [930, 430],
      [740, 480],
      [570, 485],
      [490, 390],
      [590, 285],
      [800, 268],
      [990, 258],
      [1130, 240],
      [1175, 165],
      [1100, 105],
      [940, 95],
      [640, 100],
      [330, 110],
      [160, 190],
      [120, 380],
      [140, 560],
    ],
    boosts: [
      { t: 0.06, offset: -0.3 },
      { t: 0.55, offset: 0.3 },
      { t: 0.8, offset: 0 },
    ],
    decor: [
      { kind: "coffee", x: 330, y: 400, size: 110 },
      { kind: "pencil", x: 930, y: 540, angle: 0.06, size: 300, color: "#3b7dd8" },
      { kind: "ruler", x: 760, y: 170, angle: -0.02, size: 420 },
      { kind: "clip", x: 1220, y: 300, angle: 1.2 },
      { kind: "eraser", x: 320, y: 230, angle: -0.5 },
      { kind: "crumbs", x: 980, y: 520 },
      { kind: "sticky", x: 330, y: 540, angle: 0.1, color: "#9fe3c0" },
    ],
  },
  {
    name: "Coffee Kidney",
    subtitle: "Around the mug, mind the spill",
    width: 100,
    points: [
      [640, 640],
      [900, 670],
      [1110, 600],
      [1180, 430],
      [1120, 240],
      [940, 130],
      [770, 140],
      [700, 230],
      [580, 230],
      [510, 140],
      [340, 120],
      [170, 220],
      [110, 400],
      [170, 580],
      [380, 660],
    ],
    boosts: [
      { t: 0.03, offset: 0.25 },
      { t: 0.34, offset: -0.3 },
      { t: 0.74, offset: 0.3 },
    ],
    decor: [
      { kind: "coffee", x: 640, y: 450, size: 120 },
      { kind: "coffee", x: 900, y: 400, size: 70 },
      { kind: "pencil", x: 360, y: 400, angle: 1.35, size: 300, color: "#e8513d" },
      { kind: "clip", x: 640, y: 80, angle: 0.1 },
      { kind: "eraser", x: 1230, y: 120, angle: 0.9 },
      { kind: "crumbs", x: 380, y: 300 },
      { kind: "sticky", x: 66, y: 66, angle: -0.12, color: "#ffb3c7" },
    ],
  },
];

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function wrapIndex(i: number, n: number) {
  return ((i % n) + n) % n;
}

/** Wrap a distance into (-L/2, L/2]. */
export function wrapDist(d: number, L: number) {
  d = d % L;
  if (d > L / 2) d -= L;
  if (d <= -L / 2) d += L;
  return d;
}

export function buildTrack(def: TrackDef, step = 6): Track {
  const P = def.points;
  const m = P.length;
  // Dense polyline.
  const dense: [number, number][] = [];
  const SUB = 60;
  for (let i = 0; i < m; i++) {
    const p0 = P[wrapIndex(i - 1, m)];
    const p1 = P[i];
    const p2 = P[wrapIndex(i + 1, m)];
    const p3 = P[wrapIndex(i + 2, m)];
    for (let k = 0; k < SUB; k++) {
      const t = k / SUB;
      dense.push([catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)]);
    }
  }
  // Cumulative length.
  const cum = [0];
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1];
    const b = dense[i % dense.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[dense.length];
  const n = Math.max(16, Math.round(total / step));
  const realStep = total / n;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = i * realStep;
    while (j < dense.length - 1 && cum[j + 1] < s) j++;
    const a = dense[j];
    const b = dense[(j + 1) % dense.length];
    const seg = cum[j + 1] - cum[j] || 1;
    const u = (s - cum[j]) / seg;
    xs[i] = a[0] + (b[0] - a[0]) * u;
    ys[i] = a[1] + (b[1] - a[1]) * u;
  }
  const tx = new Float64Array(n);
  const ty = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = wrapIndex(i - 1, n);
    const b = wrapIndex(i + 1, n);
    const dx = xs[b] - xs[a];
    const dy = ys[b] - ys[a];
    const l = Math.hypot(dx, dy) || 1;
    tx[i] = dx / l;
    ty[i] = dy / l;
  }
  const rawCurv = new Float64Array(n);
  const K = 3;
  for (let i = 0; i < n; i++) {
    const a = wrapIndex(i - K, n);
    const b = wrapIndex(i + K, n);
    const cross = tx[a] * ty[b] - ty[a] * tx[b];
    const dot = tx[a] * tx[b] + ty[a] * ty[b];
    rawCurv[i] = Math.atan2(cross, dot) / (2 * K * realStep);
  }
  const curv = smooth(rawCurv, 3);
  // Racing line: hug the inside of corners, smoothed widely so it swings outside before them.
  const half = def.width / 2;
  const lineRaw = new Float64Array(n);
  for (let i = 0; i < n; i++) lineRaw[i] = Math.max(-1, Math.min(1, curv[i] * 160)) * half * 0.55;
  const line = smooth(lineRaw, Math.round(40 / realStep) + 4);
  for (let i = 0; i < n; i++) line[i] = Math.max(-half * 0.55, Math.min(half * 0.55, line[i] * 1.4));

  const boosts = def.boosts.map((b) => {
    const i = Math.round(b.t * n) % n;
    const nx = -ty[i];
    const ny = tx[i];
    const off = b.offset * half * 0.6;
    return { i, s: i * realStep, offset: off, x: xs[i] + nx * off, y: ys[i] + ny * off, angle: Math.atan2(ty[i], tx[i]) };
  });

  return { def, width: def.width, half, xs, ys, tx, ty, curv, line, n, step: realStep, length: total, boosts };
}

function smooth(src: Float64Array, radius: number): Float64Array {
  const n = src.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let wsum = 0;
    for (let k = -radius; k <= radius; k++) {
      const w = radius + 1 - Math.abs(k);
      sum += src[wrapIndex(i + k, n)] * w;
      wsum += w;
    }
    out[i] = sum / wsum;
  }
  return out;
}

export interface Projection {
  i: number;
  /** Arc length of the nearest sample. */
  s: number;
  /** Signed lateral offset (+ = right of travel direction). */
  d: number;
  dist: number;
}

/** Nearest centerline sample; searches locally around `hint` first. */
export function project(t: Track, x: number, y: number, hint = -1): Projection {
  let best = -1;
  let bestD = Infinity;
  const scan = (from: number, to: number) => {
    for (let k = from; k <= to; k++) {
      const i = wrapIndex(k, t.n);
      const dx = x - t.xs[i];
      const dy = y - t.ys[i];
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) {
        bestD = d2;
        best = i;
      }
    }
  };
  if (hint >= 0) {
    const R = 30;
    scan(hint - R, hint + R);
    if (Math.sqrt(bestD) > t.half * 1.4) {
      scan(0, t.n - 1);
    }
  } else {
    scan(0, t.n - 1);
  }
  const i = best;
  const dx = x - t.xs[i];
  const dy = y - t.ys[i];
  // Normal pointing to the right of travel in screen coords (y down): (-ty, tx).
  const d = dx * -t.ty[i] + dy * t.tx[i];
  // Refine s along tangent.
  const along = dx * t.tx[i] + dy * t.ty[i];
  const s = (i * t.step + along + t.length) % t.length;
  return { i, s, d, dist: Math.sqrt(bestD) };
}

/** Point on the track at arc length s with lateral offset d. */
export function pointAt(t: Track, s: number, d = 0) {
  const f = (((s % t.length) + t.length) % t.length) / t.step;
  const i0 = Math.floor(f) % t.n;
  const i1 = (i0 + 1) % t.n;
  const u = f - Math.floor(f);
  const x = t.xs[i0] + (t.xs[i1] - t.xs[i0]) * u;
  const y = t.ys[i0] + (t.ys[i1] - t.ys[i0]) * u;
  const txv = t.tx[i0] + (t.tx[i1] - t.tx[i0]) * u;
  const tyv = t.ty[i0] + (t.ty[i1] - t.ty[i0]) * u;
  const l = Math.hypot(txv, tyv) || 1;
  return { x: x + (-tyv / l) * d, y: y + (txv / l) * d, tx: txv / l, ty: tyv / l, i: i0 };
}
