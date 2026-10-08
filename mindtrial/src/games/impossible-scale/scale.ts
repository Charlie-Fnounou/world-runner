/**
 * Pure scale math for Impossible Scale: layout of objects along a log axis,
 * camera interpolation, checkpoints, scoring and human-readable lengths.
 *
 * Camera value z = log10(metres spanned by the short side of the viewport).
 */
import { OBJECTS } from "./objects";
import { rng } from "@/lib/random";

/** Focused object occupies 10^-FOCUS of the view's short side (diameter ≈ 50%). */
export const FOCUS = 0.3;
const GAP = 0.35;

export const LOG = OBJECTS.map((o) => Math.log10(o.size));
export const FOCUS_Z = LOG.map((l) => l + FOCUS);
export const Z_MIN = FOCUS_Z[0] - 0.35;
export const Z_MAX = FOCUS_Z[FOCUS_Z.length - 1];

/** off[i] = x_i - x_{i+1}: each object sits just left of the next bigger one. */
export const OFF = OBJECTS.slice(0, -1).map((o, i) => -(OBJECTS[i + 1].size / 2 + o.size * (0.5 + GAP)));

export const CHECKPOINTS = OBJECTS.map((o, i) => (o.teaser ? i : -1)).filter((i) => i >= 0);

/** The zoom stops here until checkpoint c is answered (while looking at the previous object). */
export function gateZ(objIndex: number): number {
  return FOCUS_Z[objIndex - 1] + 0.04;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Index k such that FOCUS_Z[k] <= z < FOCUS_Z[k+1] (clamped). */
export function anchorIndex(z: number): number {
  let k = 0;
  while (k < FOCUS_Z.length - 2 && z >= FOCUS_Z[k + 1]) k++;
  return k;
}

/**
 * Positions of every object relative to the anchor object k (metres), plus the
 * camera position relative to the same anchor. Working relative to a nearby
 * anchor keeps doubles precise across 45 orders of magnitude.
 */
export function layout(z: number, out: Float64Array): { k: number; cam: number } {
  const k = anchorIndex(z);
  out[k] = 0;
  for (let j = k + 1; j < OBJECTS.length; j++) out[j] = out[j - 1] - OFF[j - 1];
  for (let j = k - 1; j >= 0; j--) out[j] = out[j + 1] + OFF[j];
  const span = FOCUS_Z[k + 1] - FOCUS_Z[k];
  const t = Math.max(0, Math.min(1, (z - FOCUS_Z[k]) / span));
  return { k, cam: smooth(t) * (out[k + 1] - out[k]) };
}

/** Object whose focus zoom is closest to z. */
export function nearestObject(z: number, isVisible: (i: number) => boolean): { i: number; dist: number } {
  let best = -1;
  let dist = Infinity;
  for (let i = 0; i < FOCUS_Z.length; i++) {
    if (!isVisible(i)) continue;
    const d = Math.abs(FOCUS_Z[i] - z);
    if (d < dist) {
      dist = d;
      best = i;
    }
  }
  return { i: best, dist };
}

/* ------------------------------------------------------------------ */
/* Guessing                                                            */
/* ------------------------------------------------------------------ */

export function trueExponent(objIndex: number): number {
  return Math.round(LOG[objIndex]);
}

/** Four ascending power-of-ten options, always including the right one and one neighbour. */
export function guessOptions(objIndex: number, seed: number): number[] {
  const r = rng(seed + objIndex * 977);
  const e = trueExponent(objIndex);
  const near = r.pick([-1, 1]);
  const rest = r.shuffle([-3, -2, -1, 1, 2, 3].filter((d) => d !== near)).slice(0, 2);
  return [0, near, ...rest].map((d) => e + d).sort((a, b) => a - b);
}

export function pointsFor(diff: number): number {
  return diff === 0 ? 100 : diff === 1 ? 60 : diff === 2 ? 25 : 0;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const SUP: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
export const sup = (n: number) => String(n).split("").map((c) => SUP[c] ?? c).join("");
export const pow10Label = (n: number) => `10${sup(n)} m`;

const AU = 1.495978707e11;
const LY = 9.4607e15;

function num(v: number): string {
  if (v >= 100) return Math.round(v).toLocaleString("en");
  if (v >= 10) return String(Math.round(v * 10) / 10);
  if (v >= 1) return String(Math.round(v * 100) / 100);
  return String(Number(v.toPrecision(2)));
}

/** Human-readable length: nm, µm, mm, m, km, AU, light-years… */
export function formatLength(m: number): string {
  if (m < 1e-15) return `${num(m / 1e-18)} am`;
  if (m < 1e-12) return `${num(m / 1e-15)} fm`;
  if (m < 1e-9) return `${num(m / 1e-12)} pm`;
  if (m < 1e-6) return `${num(m / 1e-9)} nm`;
  if (m < 1e-3) return `${num(m / 1e-6)} µm`;
  if (m < 1e-2) return `${num(m / 1e-3)} mm`;
  if (m < 1) return `${num(m / 1e-2)} cm`;
  if (m < 1e3) return `${num(m)} m`;
  if (m < 1e9) return `${num(m / 1e3)} km`;
  if (m < 0.5 * AU) return `${num(m / 1e9)} million km`;
  if (m < 0.1 * LY) return `${num(m / AU)} AU`;
  if (m < 1e6 * LY) return `${num(m / LY)} light-years`;
  if (m < 1e9 * LY) return `${num(m / LY / 1e6)} million light-years`;
  return `${num(m / LY / 1e9)} billion light-years`;
}

/** Short unit name for the ruler. */
export function unitHint(n: number): string {
  return formatLength(10 ** n).replace("light-years", "ly").replace(" million ", "M ").replace(" billion ", "B ");
}
