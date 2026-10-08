import { rng } from "@/lib/random";

/** Pure scene generation for Visual Hunt (no React, no DOM). */

export type ThemeId = "tiles" | "critters" | "flowers" | "clocks" | "arrows" | "fish" | "urchins";
export type DiffKind = "shape" | "hue" | "rot" | "mirror" | "detail" | "scale" | "count";

/** Everything that determines how an item LOOKS. Position jitter is not part of it. */
export interface Look {
  theme: ThemeId;
  /** OKLCH hue, 0..359. */
  hue: number;
  /** Shape variant (inner shape, body shape, petal style, time preset, head style, tail style, spike style). */
  alt: number;
  /** Petals / spikes / eyes / stripes. 0 when unused by the theme. */
  count: number;
  /** Degrees. For clocks this is an extra offset on the minute hand. */
  rot: number;
  mirror: boolean;
  /** A tiny detail (dot, tooth, eye, marker). */
  detail: boolean;
  scale: number;
}

export interface Item {
  look: Look;
  /** Jitter inside the cell, -1..1 (scaled by the free space at layout time). */
  jx: number;
  jy: number;
}

export interface Stage {
  stage: number;
  theme: ThemeId;
  seed: number;
  diff: DiffKind;
  base: Look;
  variant: Look;
  odd: number;
  items: Item[];
}

interface ThemeSpec {
  label: string;
  kinds: DiffKind[];
  alts: number;
  count: [number, number] | null;
  /** Rotational symmetry period in degrees for the whole item (360 = none). */
  period: (look: Look) => number;
}

export const CLOCK_TIMES: [number, number][] = [
  [2, 40],
  [4, 10],
  [7, 25],
  [8, 50],
  [11, 5],
  [5, 35],
];

export const THEMES: Record<ThemeId, ThemeSpec> = {
  tiles: { label: "Tiles", kinds: ["shape", "hue", "rot", "detail", "scale"], alts: 5, count: null, period: () => 90 },
  critters: { label: "Critters", kinds: ["shape", "hue", "mirror", "count", "detail", "scale"], alts: 3, count: [1, 3], period: () => 360 },
  flowers: { label: "Garden", kinds: ["shape", "hue", "count", "detail", "scale"], alts: 2, count: [5, 8], period: (l) => 360 / l.count },
  clocks: { label: "Clockwork", kinds: ["shape", "hue", "rot", "mirror", "detail", "scale"], alts: CLOCK_TIMES.length, count: null, period: () => 360 },
  arrows: { label: "Signposts", kinds: ["shape", "hue", "rot", "mirror", "detail", "scale"], alts: 3, count: null, period: () => 360 },
  fish: { label: "Aquarium", kinds: ["shape", "hue", "rot", "mirror", "count", "detail", "scale"], alts: 2, count: [1, 3], period: () => 360 },
  urchins: { label: "Urchins", kinds: ["shape", "hue", "rot", "count", "detail", "scale"], alts: 2, count: [5, 9], period: (l) => 360 / l.count },
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

/** Item count: 9 on stage 1, growing to 80. */
export function itemsFor(stage: number): number {
  return Math.min(80, 9 + Math.round((stage - 1) * 3.1));
}

/** Which kinds of difference are allowed at a stage (obvious first, subtle later). */
export function kindsFor(stage: number): DiffKind[] {
  if (stage <= 2) return ["shape", "hue"];
  if (stage <= 5) return ["shape", "hue", "count", "mirror"];
  if (stage <= 8) return ["shape", "hue", "count", "mirror", "rot", "detail", "scale"];
  return ["hue", "count", "mirror", "rot", "detail", "scale"];
}

export const hueDelta = (stage: number) => Math.max(12, 90 - stage * 6);
export const rotDelta = (stage: number) => Math.max(8, 40 - stage * 2);
export const shrinkFactor = (stage: number) => (stage < 6 ? 0.68 : Math.min(0.88, 0.62 + stage * 0.018));

type R = ReturnType<typeof rng>;

function applyDiff(base: Look, kind: DiffKind, stage: number, r: R): Look {
  const spec = THEMES[base.theme];
  const v: Look = { ...base };
  switch (kind) {
    case "hue": {
      const d = hueDelta(stage) * (r.next() < 0.5 ? -1 : 1);
      v.hue = (((base.hue + d) % 360) + 360) % 360;
      break;
    }
    case "shape":
      v.alt = (base.alt + r.int(1, spec.alts - 1)) % spec.alts;
      break;
    case "count": {
      const [lo, hi] = spec.count!;
      v.count = base.count >= hi ? base.count - 1 : base.count <= lo ? base.count + 1 : base.count + (r.next() < 0.5 ? -1 : 1);
      break;
    }
    case "mirror":
      v.mirror = !base.mirror;
      break;
    case "detail":
      v.detail = false;
      break;
    case "scale": {
      const f = shrinkFactor(stage);
      v.scale = r.next() < 0.4 ? Math.round((1 + (1 - f) * 0.7) * 100) / 100 : f;
      break;
    }
    case "rot": {
      const half = spec.period(base) / 2;
      const d = Math.min(rotDelta(stage), half - 4);
      v.rot = base.rot + d * (r.next() < 0.5 ? -1 : 1);
      break;
    }
  }
  return v;
}

export function makeStage(stage: number, theme: ThemeId, seed: number, cap = 80): Stage {
  const r = rng(seed);
  const spec = THEMES[theme];
  const n = Math.max(6, Math.min(cap, itemsFor(stage)));
  const base: Look = {
    theme,
    hue: r.int(0, 359),
    alt: r.int(0, spec.alts - 1),
    count: spec.count ? r.int(spec.count[0], spec.count[1]) : 0,
    rot: theme === "arrows" ? r.int(0, 7) * 45 : 0,
    mirror: spec.kinds.includes("mirror") ? r.next() < 0.5 : false,
    detail: spec.kinds.includes("detail"),
    scale: 1,
  };
  const kinds = kindsFor(stage).filter((k) => spec.kinds.includes(k));
  const diff = r.pick(kinds);
  const variant = applyDiff(base, diff, stage, r);
  const odd = r.int(0, n - 1);
  const items: Item[] = Array.from({ length: n }, (_, i) => ({
    look: i === odd ? variant : base,
    jx: r.range(-1, 1),
    jy: r.range(-1, 1),
  }));
  return { stage, theme, seed, diff, base, variant, odd, items };
}

/** Stable string of every appearance-relevant field. Two items look identical iff keys match. */
export function lookKey(l: Look): string {
  return [l.theme, l.hue, l.alt, l.count, l.rot, l.mirror ? 1 : 0, l.detail ? 1 : 0, l.scale].join("|");
}

/** A run's theme order: every theme once, shuffled, then repeating. */
export function themeOrder(seed: number): ThemeId[] {
  return rng(seed).shuffle(THEME_IDS);
}

export interface Cell {
  /** Cell rect in px. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Item centre and drawn size in px. */
  cx: number;
  cy: number;
  size: number;
}

/** Base drawn size relative to the cell's shorter side. */
export const ITEM_FILL = 0.74;

/**
 * Grid-with-jitter layout. Picks the column count that gives the biggest cells,
 * scatters the items over the cells (leaving random holes) and jitters each
 * one only as far as its own free margin allows, so items never overlap.
 */
export function layout(st: Stage, w: number, h: number): Cell[] {
  const n = st.items.length;
  let best = { cols: 1, rows: n, cell: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cell = Math.min(w / cols, h / rows);
    if (cell > best.cell) best = { cols, rows, cell };
  }
  const { cols, rows } = best;
  const cw = w / cols;
  const ch = h / rows;
  const slots = rng(st.seed ^ 0x5bd1e995).shuffle(Array.from({ length: cols * rows }, (_, i) => i)).slice(0, n);
  slots.sort((a, b) => a - b);
  return st.items.map((it, i) => {
    const slot = slots[i];
    const x = (slot % cols) * cw;
    const y = Math.floor(slot / cols) * ch;
    const side = Math.min(cw, ch);
    const size = side * ITEM_FILL * it.look.scale;
    const freeX = Math.max(0, (cw - size) / 2 - side * 0.03);
    const freeY = Math.max(0, (ch - size) / 2 - side * 0.03);
    return { x, y, w: cw, h: ch, cx: x + cw / 2 + it.jx * freeX * 0.8, cy: y + ch / 2 + it.jy * freeY * 0.8, size };
  });
}

/** Most items that still leave ~44 px touch targets in a w×h box. */
export function capacity(w: number, h: number): number {
  return Math.max(9, Math.floor(w / 44) * Math.floor(h / 44));
}
