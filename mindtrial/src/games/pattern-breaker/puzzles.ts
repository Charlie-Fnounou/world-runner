/**
 * Pattern Breaker — procedural puzzle generators + independent validators.
 *
 * Every generator builds a puzzle from a hidden rule, then hands it to a
 * validator that knows nothing about the generator: it tries every simple
 * interpretation it can think of and counts how many of the 4 options are
 * consistent with *some* interpretation. A puzzle is only accepted when
 * exactly one option survives and all options are visually distinct.
 */
import { rng as makeRng } from "@/lib/random";

export type Rng = ReturnType<typeof makeRng>;

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

export type ShapeKind = "circle" | "square" | "triangle" | "diamond" | "hexagon" | "star" | "cross" | "arrow" | "pac" | "flag";

/** Rotation period (degrees) after which the shape looks identical. 1 = rotation never matters. */
export const ROT_PERIOD: Record<ShapeKind, number> = {
  circle: 1,
  square: 90,
  triangle: 120,
  diamond: 180,
  hexagon: 60,
  star: 72,
  cross: 90,
  arrow: 360,
  pac: 360,
  flag: 360,
};

export const SHAPE_NAMES: Record<ShapeKind, string> = {
  circle: "circle",
  square: "square",
  triangle: "triangle",
  diamond: "diamond",
  hexagon: "hexagon",
  star: "star",
  cross: "cross",
  arrow: "arrow",
  pac: "chomper",
  flag: "flag",
};

/** Shapes with no rotational symmetry: used whenever rotation is part of the rule. */
export const ASYMMETRIC: ShapeKind[] = ["arrow", "pac", "flag"];
export const SYMMETRIC: ShapeKind[] = ["circle", "square", "triangle", "diamond", "hexagon", "star", "cross"];

export const PALETTE = ["#2457ff", "#ff8a00", "#0a1a3a", "#13b38b"] as const;
export const COLOR_NAMES = ["blue", "orange", "navy", "green"] as const;
export const SIZE_NAMES = ["small", "medium", "large"] as const;
export const FILL_NAMES = ["solid", "hollow", "dotted"] as const;

export interface Glyph {
  shape: ShapeKind;
  /** 1..6 copies. */
  count: number;
  /** Index into PALETTE. */
  color: number;
  /** Degrees. */
  rot: number;
  /** 0 small, 1 medium, 2 large. */
  size: number;
  /** 0 solid, 1 hollow, 2 hollow with a center dot (rotation-invariant). */
  fill: number;
}

export type Item = { t: "num"; v: number } | { t: "glyph"; g: Glyph };

export type Family = "number" | "shape" | "matrix";

export interface Puzzle {
  family: Family;
  level: number;
  /** Number / shape: the visible sequence. Matrix: 8 cells row-major (the 9th is missing). */
  items: Item[];
  options: Item[];
  /** Index of the correct option. */
  answer: number;
  /** Human explanation shown after answering. */
  rule: string;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Canonical visual identity of a glyph (rotation reduced by symmetry). */
export function glyphKey(g: Glyph): string {
  const p = ROT_PERIOD[g.shape];
  return `${g.shape}|${g.count}|${g.color}|${mod(g.rot, p)}|${g.size}|${g.fill}`;
}

export function itemKey(it: Item): string {
  return it.t === "num" ? `n${it.v}` : `g${glyphKey(it.g)}`;
}

/* ------------------------------------------------------------------ */
/* Number sequences                                                    */
/* ------------------------------------------------------------------ */

interface NumRule {
  minLevel: number;
  make: (r: Rng, level: number) => { seq: number[]; next: number; rule: string } | null;
}

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113];

const signed = (n: number) => (n >= 0 ? `adds ${n}` : `subtracts ${-n}`);

const NUM_RULES: Record<string, NumRule> = {
  arithmetic: {
    minLevel: 1,
    make: (r, level) => {
      const d = r.int(2, 4 + level * 2) * (level >= 3 && r.next() < 0.35 ? -1 : 1);
      const a = d < 0 ? r.int(40, 90) : r.int(1, 20 + level * 3);
      const seq = Array.from({ length: 5 }, (_, i) => a + i * d);
      return { seq, next: a + 5 * d, rule: `Each term ${signed(d)}.` };
    },
  },
  doubling: {
    minLevel: 1,
    make: (r, level) => {
      const k = level <= 2 ? 2 : r.pick([2, 3]);
      const a = r.int(1, level <= 2 ? 4 : 6);
      const seq = Array.from({ length: 5 }, (_, i) => a * k ** i);
      return { seq, next: a * k ** 5, rule: k === 2 ? "Each term doubles." : "Each term triples." };
    },
  },
  squares: {
    minLevel: 2,
    make: (r, level) => {
      const n0 = r.int(1, 6);
      const off = level >= 5 ? r.pick([-1, 1, 2, -2]) : 0;
      const seq = Array.from({ length: 5 }, (_, i) => (n0 + i) ** 2 + off);
      const tail = off === 0 ? "" : off > 0 ? ` plus ${off}` : ` minus ${-off}`;
      return { seq, next: (n0 + 5) ** 2 + off, rule: `Square numbers${tail}: ${n0}², ${n0 + 1}², ${n0 + 2}²…` };
    },
  },
  triangular: {
    minLevel: 3,
    make: (r) => {
      const a = r.int(1, 12);
      const d0 = r.int(1, 4);
      const seq = [a];
      for (let i = 0; i < 4; i++) seq.push(seq[i] + d0 + i);
      return { seq, next: seq[4] + d0 + 4, rule: `The gap grows by 1 each step (+${d0}, +${d0 + 1}, +${d0 + 2}…).` };
    },
  },
  alternating: {
    minLevel: 3,
    make: (r, level) => {
      const p = r.int(2, 9);
      let q = r.int(-6, 9 + level);
      if (q === p || q === 0) q = p + 3;
      const a = r.int(2, 20);
      const seq = [a];
      for (let i = 0; i < 5; i++) seq.push(seq[i] + (i % 2 === 0 ? p : q));
      const next = seq[5] + q;
      return { seq, next, rule: `Alternate: ${signed(p)}, then ${signed(q)}, repeating.` };
    },
  },
  affine: {
    minLevel: 4,
    make: (r) => {
      const [k, b] = r.pick([
        [2, -1],
        [2, 1],
        [2, 2],
        [3, -1],
        [2, -2],
        [3, -2],
      ] as const);
      const a = r.int(k === 3 ? 2 : 3, 7);
      const seq = [a];
      for (let i = 0; i < 4; i++) seq.push(seq[i] * k + b);
      const verb = k === 2 ? "doubles" : "triples";
      return { seq, next: seq[4] * k + b, rule: `Each term ${verb}, then ${b > 0 ? `adds ${b}` : `subtracts ${-b}`}.` };
    },
  },
  fibonacci: {
    minLevel: 4,
    make: (r) => {
      const a = r.int(1, 6);
      const b = r.int(a, a + 6);
      const seq = [a, b];
      for (let i = 2; i < 6; i++) seq.push(seq[i - 1] + seq[i - 2]);
      return { seq, next: seq[4] + seq[5], rule: "Each term is the sum of the two before it." };
    },
  },
  secondDiff: {
    minLevel: 5,
    make: (r) => {
      const a = r.int(1, 15);
      const d0 = r.int(1, 5);
      const c = r.int(2, 4);
      const seq = [a];
      for (let i = 0; i < 4; i++) seq.push(seq[i] + d0 + i * c);
      return {
        seq,
        next: seq[4] + d0 + 4 * c,
        rule: `The gaps grow by ${c} each time (+${d0}, +${d0 + c}, +${d0 + 2 * c}…).`,
      };
    },
  },
  interleaved: {
    minLevel: 5,
    make: (r) => {
      const a = r.int(1, 10);
      const da = r.int(2, 6);
      const b = r.int(20, 40);
      const db = -r.int(1, 4);
      const seq: number[] = [];
      for (let i = 0; i < 3; i++) seq.push(a + i * da, b + i * db);
      return {
        seq,
        next: a + 3 * da,
        rule: `Two sequences take turns: one ${signed(da)}, the other ${signed(db)}.`,
      };
    },
  },
  cubes: {
    minLevel: 6,
    make: (r) => {
      const n0 = r.int(1, 3);
      const seq = Array.from({ length: 5 }, (_, i) => (n0 + i) ** 3);
      return { seq, next: (n0 + 5) ** 3, rule: `Cube numbers: ${n0}³, ${n0 + 1}³, ${n0 + 2}³…` };
    },
  },
  mulAdd: {
    minLevel: 6,
    make: (r) => {
      const m = r.pick([2, 3]);
      const p = r.int(1, 6);
      const a = r.int(1, 5);
      const seq = [a];
      for (let i = 0; i < 5; i++) seq.push(i % 2 === 0 ? seq[i] * m : seq[i] + p);
      return { seq, next: seq[5] + p, rule: `Alternate: multiply by ${m}, then add ${p}.` };
    },
  },
  primes: {
    minLevel: 7,
    make: (r) => {
      const s = r.int(0, 18);
      const seq = PRIMES.slice(s, s + 5);
      return { seq, next: PRIMES[s + 5], rule: "Consecutive prime numbers." };
    },
  },
  primeGaps: {
    minLevel: 8,
    make: (r) => {
      const a = r.int(1, 20);
      const seq = [a];
      for (let i = 0; i < 4; i++) seq.push(seq[i] + PRIMES[i]);
      return { seq, next: seq[4] + PRIMES[4], rule: "The gaps are the prime numbers: +2, +3, +5, +7, +11." };
    },
  },
};

/**
 * Independent solver: every simple rule that fits ALL shown terms produces a
 * prediction. Used to make sure no distractor is a legitimate alternative.
 */
export function numberPredictions(seq: number[]): number[] {
  const preds: number[] = [];
  const n = seq.length;
  const diffs = seq.slice(1).map((v, i) => v - seq[i]);
  const allEq = (a: number[]) => a.every((v) => v === a[0]);
  // constant difference
  if (allEq(diffs)) preds.push(seq[n - 1] + diffs[0]);
  // constant ratio
  if (seq.every((v) => v !== 0)) {
    const ratio = seq[1] / seq[0];
    if (seq.every((v, i) => i === 0 || Math.abs(v / seq[i - 1] - ratio) < 1e-9)) preds.push(seq[n - 1] * ratio);
  }
  // constant second difference
  const d2 = diffs.slice(1).map((v, i) => v - diffs[i]);
  if (d2.length >= 2 && allEq(d2)) preds.push(seq[n - 1] + diffs[diffs.length - 1] + d2[0]);
  // third difference
  const d3 = d2.slice(1).map((v, i) => v - d2[i]);
  if (d3.length >= 2 && allEq(d3)) preds.push(seq[n - 1] + diffs[diffs.length - 1] + d2[d2.length - 1] + d3[0]);
  // fibonacci-like
  if (n >= 4 && seq.every((v, i) => i < 2 || v === seq[i - 1] + seq[i - 2])) preds.push(seq[n - 1] + seq[n - 2]);
  // tribonacci-like
  if (n >= 5 && seq.every((v, i) => i < 3 || v === seq[i - 1] + seq[i - 2] + seq[i - 3])) preds.push(seq[n - 1] + seq[n - 2] + seq[n - 3]);
  // period-2 differences
  if (diffs.length >= 3 && diffs.every((v, i) => i < 2 || v === diffs[i - 2])) preds.push(seq[n - 1] + diffs[diffs.length - 2]);
  // period-3 differences
  if (diffs.length >= 4 && diffs.every((v, i) => i < 3 || v === diffs[i - 3])) preds.push(seq[n - 1] + diffs[diffs.length - 3]);
  // two interleaved arithmetic sequences
  if (n >= 5) {
    const even = seq.filter((_, i) => i % 2 === 0);
    const odd = seq.filter((_, i) => i % 2 === 1);
    const ed = even.slice(1).map((v, i) => v - even[i]);
    const od = odd.slice(1).map((v, i) => v - odd[i]);
    if (allEq(ed) && allEq(od) && ed.length >= 1 && od.length >= 1) {
      preds.push(n % 2 === 0 ? even[even.length - 1] + ed[0] : odd[odd.length - 1] + od[0]);
    }
  }
  // affine recurrence x' = k x + b (fit from first 3, verify all)
  if (n >= 4 && seq[1] !== seq[0]) {
    const k = (seq[2] - seq[1]) / (seq[1] - seq[0]);
    const b = seq[1] - k * seq[0];
    if (Number.isInteger(k) && seq.every((v, i) => i === 0 || Math.abs(v - (k * seq[i - 1] + b)) < 1e-9)) preds.push(k * seq[n - 1] + b);
  }
  // alternating ×m / +p
  if (n >= 5) {
    for (const start of [0, 1]) {
      let m: number | null = null;
      let p: number | null = null;
      let ok = true;
      for (let i = 1; i < n && ok; i++) {
        const mult = (i - 1) % 2 === start;
        if (mult) {
          if (seq[i - 1] === 0) ok = false;
          else {
            const mm = seq[i] / seq[i - 1];
            if (m === null) m = mm;
            else if (Math.abs(mm - m) > 1e-9) ok = false;
          }
        } else {
          const pp = seq[i] - seq[i - 1];
          if (p === null) p = pp;
          else if (pp !== p) ok = false;
        }
      }
      if (ok && m !== null && p !== null) preds.push((n - 1) % 2 === start ? seq[n - 1] * m : seq[n - 1] + p);
    }
  }
  // consecutive primes
  const pi = PRIMES.indexOf(seq[0]);
  if (pi >= 0 && seq.every((v, i) => PRIMES[pi + i] === v) && PRIMES[pi + n] !== undefined) preds.push(PRIMES[pi + n]);
  // squares / cubes (+offset)
  for (const pow of [2, 3]) {
    for (let n0 = 0; n0 <= 12; n0++) {
      const off = seq[0] - n0 ** pow;
      if (Math.abs(off) <= 3 && seq.every((v, i) => v === (n0 + i) ** pow + off)) preds.push((n0 + n) ** pow + off);
    }
  }
  return preds.filter((v) => Number.isFinite(v)).map((v) => Math.round(v * 1e6) / 1e6);
}

function genNumber(level: number, r: Rng): Puzzle | null {
  const keys = Object.keys(NUM_RULES).filter((k) => NUM_RULES[k].minLevel <= level);
  // favour rules that just unlocked so each level feels new
  const weighted = keys.flatMap((k) => (NUM_RULES[k].minLevel >= level - 1 ? [k, k] : [k]));
  const made = NUM_RULES[r.pick(weighted)].make(r, level);
  if (!made) return null;
  const { seq, next, rule } = made;
  const preds = numberPredictions(seq);
  if (!preds.includes(next)) return null; // solver must be able to reach the real answer
  const last = seq[seq.length - 1];
  const prev = seq[seq.length - 2];
  const d = last - prev;
  const mag = Math.max(1, Math.round(Math.abs(next) * 0.1));
  const pool = [
    last + d,
    next + d,
    next - d,
    next + 1,
    next - 1,
    next + 2,
    next - 2,
    next + mag,
    next - mag,
    last * 2,
    next + (next - last),
    last + (last - prev) * 2,
    next + 10,
    next - 10,
  ];
  const forbidden = new Set([next, ...preds]);
  const cands = r.shuffle(Array.from(new Set(pool.map((v) => Math.round(v))))).filter((v) => !forbidden.has(v) && !seq.includes(v) && (v >= 0 || seq.some((s) => s < 0)));
  // prefer close distractors
  cands.sort((a, b) => Math.abs(a - next) - Math.abs(b - next) + (r.next() - 0.5) * Math.max(4, Math.abs(next) * 0.2));
  const picked = cands.slice(0, 3);
  if (picked.length < 3) return null;
  const opts = r.shuffle([next, ...picked]);
  return {
    family: "number",
    level,
    items: seq.map((v) => ({ t: "num", v })),
    options: opts.map((v) => ({ t: "num", v })),
    answer: opts.indexOf(next),
    rule,
  };
}

/* ------------------------------------------------------------------ */
/* Shape sequences                                                     */
/* ------------------------------------------------------------------ */

type Attr = "shape" | "count" | "color" | "rot" | "size" | "fill";

function glyphAttr(g: Glyph, a: Attr): string | number {
  if (a === "rot") return mod(g.rot, ROT_PERIOD[g.shape]);
  return g[a];
}

/** Predicted next values for one attribute track, for every simple rule that fits. */
function seqAttrPredictions(vals: (string | number)[], a: Attr): (string | number)[] {
  const out: (string | number)[] = [];
  const n = vals.length;
  // periodic with period 1..4 (covers constant & cycles)
  for (let p = 1; p <= Math.min(4, n - 1); p++) {
    if (vals.every((v, i) => i < p || v === vals[i - p])) out.push(vals[n - p]);
  }
  if (typeof vals[0] === "number") {
    const nums = vals as number[];
    const diffs = nums.slice(1).map((v, i) => v - nums[i]);
    if (a === "rot") {
      const md = diffs.map((d) => mod(d, 360));
      if (md.every((d) => d === md[0])) out.push(mod(nums[n - 1] + md[0], 360));
    } else if (diffs.every((d) => d === diffs[0])) out.push(nums[n - 1] + diffs[0]);
  }
  return out;
}

export function validateShapeSequence(seq: Glyph[], options: Glyph[]): number[] {
  const attrs: Attr[] = ["shape", "count", "color", "rot", "size", "fill"];
  const preds = new Map<Attr, (string | number)[]>();
  // rotation is compared raw (mod 360) when the shape track is asymmetric throughout
  for (const a of attrs) preds.set(a, seqAttrPredictions(seq.map((g) => (a === "rot" ? mod(g.rot, 360) : glyphAttr(g, a))), a));
  const valid: number[] = [];
  options.forEach((o, i) => {
    const ok = attrs.every((a) => {
      const v = a === "rot" ? mod(o.rot, 360) : glyphAttr(o, a);
      const ps = preds.get(a)!;
      if (a === "rot") {
        // a prediction matches if it is visually identical under the option's symmetry
        const p = ROT_PERIOD[o.shape];
        return ps.some((x) => mod(Number(x), p) === mod(Number(v), p));
      }
      return ps.includes(v);
    });
    if (ok) valid.push(i);
  });
  return valid;
}

interface Track {
  attr: Attr;
  values: (i: number) => string | number;
  describe: string;
}

function cycleOf<T>(r: Rng, pool: readonly T[], period: number): T[] {
  return r.shuffle(pool).slice(0, period);
}

function genShape(level: number, r: Rng): Puzzle | null {
  const nChange = level <= 2 ? 1 : level <= 5 ? 2 : 3;
  const candidates: Attr[] = ["rot", "count", "color", "size", "shape", "fill"];
  const changing = r.shuffle(candidates).slice(0, nChange);
  const rotChanges = changing.includes("rot");
  const tracks: Track[] = [];
  const LEN = 6; // 5 shown + 1 answer

  const shapePool = rotChanges ? ASYMMETRIC : SYMMETRIC;
  if (changing.includes("shape")) {
    const period = r.pick([2, 3]);
    const cyc = cycleOf(r, shapePool, Math.min(period, shapePool.length));
    tracks.push({ attr: "shape", values: (i) => cyc[i % cyc.length], describe: `shapes cycle ${cyc.map((s) => SHAPE_NAMES[s]).join(" → ")}` });
  } else {
    const s = r.pick(rotChanges ? ASYMMETRIC : [...SYMMETRIC, ...ASYMMETRIC]);
    tracks.push({ attr: "shape", values: () => s, describe: "" });
  }
  if (rotChanges) {
    const step = r.pick(level <= 3 ? [90, -90, 45] : [45, -45, 90, -90, 135]);
    const r0 = r.pick([0, 90, 180, 270]);
    const dir = step > 0 ? "clockwise" : "counter-clockwise";
    tracks.push({ attr: "rot", values: (i) => mod(r0 + i * step, 360), describe: `turns ${Math.abs(step)}° ${dir} each step` });
  } else {
    tracks.push({ attr: "rot", values: () => 0, describe: "" });
  }
  if (changing.includes("count")) {
    const kind = r.pick(["up", "down", "cycle"] as const);
    if (kind === "up") tracks.push({ attr: "count", values: (i) => 1 + i, describe: "one more copy each step" });
    else if (kind === "down") tracks.push({ attr: "count", values: (i) => 6 - i, describe: "one fewer copy each step" });
    else {
      const cyc = cycleOf(r, [1, 2, 3, 4], 3);
      tracks.push({ attr: "count", values: (i) => cyc[i % 3], describe: `counts cycle ${cyc.join(", ")}` });
    }
  } else {
    const c = r.pick([1, 1, 2, 3]);
    tracks.push({ attr: "count", values: () => c, describe: "" });
  }
  if (changing.includes("color")) {
    const period = r.pick([2, 3, 4]);
    const cyc = cycleOf(r, [0, 1, 2, 3], period);
    tracks.push({ attr: "color", values: (i) => cyc[i % period], describe: `colors cycle ${cyc.map((c) => COLOR_NAMES[c]).join(" → ")}` });
  } else {
    const c = r.int(0, 3);
    tracks.push({ attr: "color", values: () => c, describe: "" });
  }
  if (changing.includes("size")) {
    const cyc = r.pick([
      [0, 1, 2],
      [2, 1, 0],
      [0, 2],
      [0, 1, 2, 1],
    ]);
    tracks.push({ attr: "size", values: (i) => cyc[i % cyc.length], describe: `sizes go ${cyc.map((s) => SIZE_NAMES[s]).join(" → ")}` });
  } else {
    const s = r.int(1, 2);
    tracks.push({ attr: "size", values: () => s, describe: "" });
  }
  if (changing.includes("fill")) {
    const cyc = cycleOf(r, [0, 1, 2], r.pick([2, 3]));
    tracks.push({ attr: "fill", values: (i) => cyc[i % cyc.length], describe: `fills alternate ${cyc.map((f) => FILL_NAMES[f]).join(" → ")}` });
  } else {
    const f = r.pick([0, 0, 1]);
    tracks.push({ attr: "fill", values: () => f, describe: "" });
  }

  const at = (i: number): Glyph => {
    const g = {} as Record<Attr, string | number>;
    for (const t of tracks) g[t.attr] = t.values(i);
    return g as unknown as Glyph;
  };
  const seq = Array.from({ length: LEN - 1 }, (_, i) => at(i));
  const answer = at(LEN - 1);

  // Distractors: plausible single / double attribute slips.
  const variants: Glyph[] = [];
  const alt = (g: Glyph, a: Attr): Glyph[] => {
    const out: Glyph[] = [];
    switch (a) {
      case "shape":
        for (const s of shapePool) if (s !== g.shape) out.push({ ...g, shape: s });
        break;
      case "rot":
        if (ROT_PERIOD[g.shape] === 360 || rotChanges) for (const d of [45, 90, 180, -90, -45]) out.push({ ...g, rot: mod(g.rot + d, 360) });
        break;
      case "count":
        for (const d of [-1, 1, -2, 2]) if (g.count + d >= 1 && g.count + d <= 6) out.push({ ...g, count: g.count + d });
        break;
      case "color":
        for (let c = 0; c < 4; c++) if (c !== g.color) out.push({ ...g, color: c });
        break;
      case "size":
        for (let s = 0; s < 3; s++) if (s !== g.size) out.push({ ...g, size: s });
        break;
      case "fill":
        for (let f = 0; f < 3; f++) if (f !== g.fill) out.push({ ...g, fill: f });
        break;
    }
    return out;
  };
  // the previous term and the one before are classic wrong picks
  variants.push(seq[seq.length - 1], seq[seq.length - 2]);
  for (const a of changing) variants.push(...alt(answer, a));
  for (const a of r.shuffle(candidates.filter((c) => !changing.includes(c))).slice(0, 2)) variants.push(...alt(answer, a));
  // double slips at higher levels
  if (level >= 4) {
    for (let k = 0; k < 6; k++) {
      const a1 = r.pick(changing);
      const a2 = r.pick(candidates);
      const v1 = alt(answer, a1);
      if (!v1.length) continue;
      const v2 = alt(r.pick(v1), a2);
      if (v2.length) variants.push(r.pick(v2));
    }
  }

  const ansKey = glyphKey(answer);
  const seen = new Set([ansKey]);
  const picked: Glyph[] = [];
  // prefer changed-attribute slips first (shuffled), keep previous term high on the list
  const ordered = [...variants.slice(0, 2).filter(() => r.next() < 0.6), ...r.shuffle(variants)];
  for (const v of ordered) {
    if (picked.length === 3) break;
    const k = glyphKey(v);
    if (seen.has(k)) continue;
    if (validateShapeSequence(seq, [v]).length) continue; // still matches some reading → unfair
    seen.add(k);
    picked.push(v);
  }
  if (picked.length < 3) return null;
  const opts = r.shuffle([answer, ...picked]);
  const valid = validateShapeSequence(seq, opts);
  if (valid.length !== 1 || glyphKey(opts[valid[0]]) !== ansKey) return null;

  const desc = tracks.map((t) => t.describe).filter(Boolean);
  const rule = desc.length ? cap(desc.join("; ")) + "." : "Nothing changes.";
  return {
    family: "shape",
    level,
    items: seq.map((g) => ({ t: "glyph", g })),
    options: opts.map((g) => ({ t: "glyph", g })),
    answer: valid[0],
    rule,
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ------------------------------------------------------------------ */
/* 3×3 matrices (Raven-style)                                          */
/* ------------------------------------------------------------------ */

type MAttr = "shape" | "count" | "color" | "size" | "fill";
const M_ATTRS: MAttr[] = ["shape", "count", "color", "size", "fill"];

/** Does the 3×3 grid of values (row-major) satisfy at least one known rule? */
function gridHasRule(v: (string | number)[]): boolean {
  const row = (r: number) => [v[r * 3], v[r * 3 + 1], v[r * 3 + 2]];
  const col = (c: number) => [v[c], v[c + 3], v[c + 6]];
  const same = (a: (string | number)[]) => a[0] === a[1] && a[1] === a[2];
  const distinct = (a: (string | number)[]) => a[0] !== a[1] && a[1] !== a[2] && a[0] !== a[2];
  const setKey = (a: (string | number)[]) => a.map(String).sort().join(",");
  const rows = [0, 1, 2].map(row);
  const cols = [0, 1, 2].map(col);
  // whole-grid constant / row constant / column constant
  if (rows.every(same)) return true;
  if (cols.every(same)) return true;
  // latin rows (same set of three distinct values in every row)
  if (rows.every(distinct) && rows.every((r) => setKey(r) === setKey(rows[0]))) return true;
  if (cols.every(distinct) && cols.every((c) => setKey(c) === setKey(cols[0]))) return true;
  if (typeof v[0] === "number") {
    const nrows = rows as number[][];
    // arithmetic progression along every row with a shared step
    const step = nrows[0][1] - nrows[0][0];
    if (step !== 0 && nrows.every((r) => r[1] - r[0] === step && r[2] - r[1] === step)) return true;
    // row sum rule: third = first + second
    if (nrows.every((r) => r[2] === r[0] + r[1])) return true;
    // column progression
    const ncols = cols as number[][];
    const cstep = ncols[0][1] - ncols[0][0];
    if (cstep !== 0 && ncols.every((c) => c[1] - c[0] === cstep && c[2] - c[1] === cstep)) return true;
  }
  return false;
}

/** Indices of options that complete the matrix consistently on every attribute. */
export function validateMatrix(cells: Glyph[], options: Glyph[]): number[] {
  const valid: number[] = [];
  options.forEach((o, i) => {
    const grid = [...cells, o];
    if (M_ATTRS.every((a) => gridHasRule(grid.map((g) => g[a])))) valid.push(i);
  });
  return valid;
}

interface MRule {
  /** value at row r, col c */
  at: (r: number, c: number) => string | number;
  describe: string;
}

function genMatrix(level: number, r: Rng): Puzzle | null {
  const nVary = level <= 3 ? 2 : level <= 6 ? 3 : 4;
  const varying = new Set<MAttr>(r.shuffle(M_ATTRS).slice(0, nVary));
  const rules = {} as Record<MAttr, MRule>;
  const shift = r.pick([1, 2]); // latin square direction

  const latin = <T extends string | number>(vals: T[], name: (v: T) => string, noun: string): MRule => ({
    at: (row, c) => vals[(c + row * shift) % 3],
    describe: `one of each ${noun} (${vals.map(name).join(", ")})`,
  });
  const rowConst = <T extends string | number>(vals: T[], noun: string): MRule => ({
    at: (row) => vals[row],
    describe: `${noun} stays the same`,
  });

  for (const a of M_ATTRS) {
    if (!varying.has(a)) {
      const fixed: Record<MAttr, string | number> = {
        shape: r.pick(SYMMETRIC),
        count: r.pick([1, 2]),
        color: r.int(0, 3),
        size: 2,
        fill: r.pick([0, 1]),
      };
      rules[a] = { at: () => fixed[a], describe: "" };
      continue;
    }
    const mode = r.pick(a === "count" ? (level >= 5 ? ["prog", "latin", "row", "sum"] : ["prog", "latin", "row"]) : a === "size" ? ["prog", "latin", "row"] : ["latin", "row"]);
    switch (a) {
      case "shape": {
        const vals = r.shuffle(SYMMETRIC).slice(0, 3);
        rules.shape = mode === "latin" ? latin(vals, (s) => SHAPE_NAMES[s], "shape") : rowConst(vals, "the shape");
        break;
      }
      case "color": {
        const vals = r.shuffle([0, 1, 2, 3]).slice(0, 3);
        rules.color = mode === "latin" ? latin(vals, (c) => COLOR_NAMES[c], "color") : rowConst(vals, "the color");
        break;
      }
      case "fill": {
        const vals = r.shuffle([0, 1, 2]);
        rules.fill = mode === "latin" ? latin(vals, (f) => FILL_NAMES[f], "fill") : rowConst(vals, "the fill");
        break;
      }
      case "size": {
        if (mode === "prog") {
          const up = r.next() < 0.5;
          rules.size = { at: (_, c) => (up ? c : 2 - c), describe: `shapes get ${up ? "bigger" : "smaller"} left to right` };
        } else {
          const vals = r.shuffle([0, 1, 2]);
          rules.size = mode === "latin" ? latin(vals, (s) => SIZE_NAMES[s], "size") : rowConst(vals, "the size");
        }
        break;
      }
      case "count": {
        if (mode === "prog") {
          const bases = r.shuffle([1, 2, 3]);
          rules.count = { at: (row, c) => bases[row] + c, describe: "one more copy each step" };
        } else if (mode === "sum") {
          const pairs = r.shuffle([
            [1, 1],
            [1, 2],
            [2, 1],
            [2, 2],
            [1, 3],
            [3, 1],
            [2, 3],
            [3, 2],
            [1, 4],
          ]).slice(0, 3);
          rules.count = { at: (row, c) => (c < 2 ? pairs[row][c] : pairs[row][0] + pairs[row][1]), describe: "the third count is the sum of the first two" };
        } else if (mode === "latin") {
          const vals = r.shuffle([1, 2, 3, 4]).slice(0, 3);
          rules.count = latin(vals, String, "count");
        } else {
          const vals = r.shuffle([1, 2, 3, 4]).slice(0, 3);
          rules.count = rowConst(vals, "the count");
        }
        break;
      }
    }
  }

  const cellAt = (row: number, c: number): Glyph => ({
    shape: rules.shape.at(row, c) as ShapeKind,
    count: rules.count.at(row, c) as number,
    color: rules.color.at(row, c) as number,
    size: rules.size.at(row, c) as number,
    fill: rules.fill.at(row, c) as number,
    rot: 0,
  });
  const cells: Glyph[] = [];
  for (let row = 0; row < 3; row++) for (let c = 0; c < 3; c++) cells.push(cellAt(row, c));
  const answer = cells.pop()!;
  if (validateMatrix(cells, [answer]).length !== 1) return null;

  // Distractors: swap one (or two) attributes for values seen elsewhere in the grid.
  const seenVals = (a: MAttr) => Array.from(new Set(cells.map((g) => g[a])));
  const variants: Glyph[] = [cells[7], cells[5], cells[2]];
  const attrs = r.shuffle(M_ATTRS);
  for (const a of attrs) {
    for (const v of seenVals(a)) if (v !== answer[a]) variants.push({ ...answer, [a]: v });
    if (a === "count") for (const d of [-1, 1]) if (answer.count + d >= 1 && answer.count + d <= 6) variants.push({ ...answer, count: answer.count + d });
  }
  if (level >= 5) {
    for (let k = 0; k < 8; k++) {
      const [a1, a2] = r.shuffle([...varying]).slice(0, 2);
      if (!a2) break;
      const v1 = r.pick(seenVals(a1));
      const v2 = r.pick(seenVals(a2));
      variants.push({ ...answer, [a1]: v1, [a2]: v2 });
    }
  }
  const ansKey = glyphKey(answer);
  const seen = new Set([ansKey]);
  const picked: Glyph[] = [];
  // bias toward slips in the varying attributes (more convincing)
  const scored = r.shuffle(variants).sort((x, y) => diffVarying(y, answer, varying) - diffVarying(x, answer, varying) + (r.next() - 0.5) * 1.5);
  for (const v of scored) {
    if (picked.length === 3) break;
    const k = glyphKey(v);
    if (seen.has(k)) continue;
    if (validateMatrix(cells, [v]).length) continue;
    seen.add(k);
    picked.push(v);
  }
  if (picked.length < 3) return null;
  const opts = r.shuffle([answer, ...picked]);
  const valid = validateMatrix(cells, opts);
  if (valid.length !== 1 || glyphKey(opts[valid[0]]) !== ansKey) return null;

  const desc = M_ATTRS.map((a) => rules[a].describe).filter(Boolean);
  return {
    family: "matrix",
    level,
    items: cells.map((g) => ({ t: "glyph", g })),
    options: opts.map((g) => ({ t: "glyph", g })),
    answer: valid[0],
    rule: "In each row: " + desc.join("; ") + ".",
  };
}

function diffVarying(g: Glyph, ans: Glyph, varying: Set<MAttr>): number {
  let n = 0;
  for (const a of varying) if (g[a] !== ans[a]) n++;
  return n > 0 ? 1 : 0;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export const TOTAL_QUESTIONS = 25;

export function levelFor(questionIndex: number): number {
  return 1 + Math.floor(questionIndex / 3);
}

export function timeLimitFor(level: number): number {
  return Math.max(11, 20 - (level - 1) * 1.1);
}

/** Pick a family for question `q`, avoiding three in a row of the same kind. */
export function familyFor(q: number, level: number, r: Rng, history: Family[]): Family {
  const pool: Family[] = level <= 1 ? ["number", "number", "shape"] : level <= 2 ? ["number", "shape", "matrix"] : ["number", "shape", "matrix", "matrix"];
  void q;
  let f = r.pick(pool);
  const n = history.length;
  if (n >= 2 && history[n - 1] === f && history[n - 2] === f) f = r.pick(pool.filter((p) => p !== f));
  return f;
}

export function generatePuzzle(family: Family, level: number, r: Rng): Puzzle {
  for (let attempt = 0; attempt < 80; attempt++) {
    const p = family === "number" ? genNumber(level, r) : family === "shape" ? genShape(level, r) : genMatrix(level, r);
    if (p && checkPuzzle(p)) return p;
  }
  // Fallback that always validates: plain arithmetic.
  for (;;) {
    const p = genNumber(1, r);
    if (p && checkPuzzle(p)) return { ...p, level };
  }
}

/** Structural sanity check shared by the game and the test script. */
export function checkPuzzle(p: Puzzle): boolean {
  if (p.options.length !== 4) return false;
  const keys = p.options.map(itemKey);
  if (new Set(keys).size !== 4) return false;
  if (p.answer < 0 || p.answer > 3) return false;
  if (p.family === "number") {
    const seq = p.items.map((i) => (i as { v: number }).v);
    const preds = new Set(numberPredictions(seq));
    const opts = p.options.map((i) => (i as { v: number }).v);
    if (!preds.has(opts[p.answer])) return false;
    // exactly one option is predicted by any simple rule
    return opts.filter((v) => preds.has(v)).length === 1;
  }
  const glyphs = p.items.map((i) => (i as { g: Glyph }).g);
  const opts = p.options.map((i) => (i as { g: Glyph }).g);
  const valid = p.family === "shape" ? validateShapeSequence(glyphs, opts) : validateMatrix(glyphs, opts);
  return valid.length === 1 && valid[0] === p.answer;
}
