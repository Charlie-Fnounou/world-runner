/** Pure rules for Ghost Memory (no React, no DOM). */

export interface Rand {
  next: () => number;
  int: (min: number, maxInclusive: number) => number;
}

/** Grid edge length for a level: 3×3, then 4×4 from level 6, 5×5 from level 11. */
export function sizeFor(level: number): number {
  return level >= 11 ? 5 : level >= 6 ? 4 : 3;
}

/** Level 1 = 3 steps, each level adds one. */
export function lengthFor(level: number): number {
  return level + 2;
}

/** Playback speed in ms: how long each ghost shows and the gap after it. */
export function timingFor(level: number): { on: number; gap: number } {
  return {
    on: Math.max(250, 600 - (level - 1) * 24),
    gap: Math.max(110, 250 - (level - 1) * 10),
  };
}

export const DECOY_INTRO = 4;
export const REVERSE_INTRO = 7;

/** Levels where the grid grows never carry a twist, so only one new thing happens at a time. */
export const isGrowLevel = (level: number) => level > 1 && sizeFor(level) !== sizeFor(level - 1);

export interface Twist {
  decoys: number;
  reverse: boolean;
}

export function twistFor(level: number, r: Rand): Twist {
  const none = { decoys: 0, reverse: false };
  if (level < DECOY_INTRO || isGrowLevel(level)) return none;
  const decoyCount = Math.min(3, 1 + Math.floor((level - DECOY_INTRO) / 6));
  if (level === DECOY_INTRO) return { decoys: 1, reverse: false };
  if (level < REVERSE_INTRO) return r.next() < 0.5 ? { decoys: 1, reverse: false } : none;
  if (level === REVERSE_INTRO) return { decoys: 0, reverse: true };
  const roll = r.next();
  if (level >= 13 && roll < 0.15) return { decoys: Math.max(1, decoyCount - 1), reverse: true };
  if (roll < 0.5) return { decoys: decoyCount, reverse: false };
  if (roll < 0.8) return { decoys: 0, reverse: true };
  return none;
}

/** Map a tile index from an n×n grid onto an m×m grid, stretching the pattern so its shape survives. */
export function remap(idx: number, from: number, to: number): number {
  if (from === to) return idx;
  const r = Math.floor(idx / from);
  const c = idx % from;
  const s = (v: number) => Math.round((v * (to - 1)) / (from - 1));
  return s(r) * to + s(c);
}

/**
 * Simon-style: the sequence is cumulative. Each level keeps the previous steps
 * (stretched onto the bigger grid when it grows) and appends new ones, never
 * repeating the same tile twice in a row so every step is visible.
 */
export function extendSequence(prev: number[], prevSize: number, size: number, length: number, r: Rand): number[] {
  const seq = prev.map((i) => remap(i, prevSize, size)).slice(0, length);
  const cells = size * size;
  while (seq.length < length) {
    const last = seq[seq.length - 1];
    let t = r.int(0, cells - 1);
    if (t === last) t = (t + 1 + r.int(0, cells - 2)) % cells;
    seq.push(t);
  }
  return seq;
}

export type EventKind = "step" | "decoy";
export interface ShowEvent {
  tile: number;
  kind: EventKind;
  /** ms from the start of playback. */
  start: number;
  end: number;
}

export const LEAD_IN_MS = 650;

export interface LevelPlan {
  level: number;
  size: number;
  seq: number[];
  reverse: boolean;
  decoys: number;
  events: ShowEvent[];
  /** Total playback length (ms), including lead-in and a short tail. */
  duration: number;
  /** Tiles the player must tap, in order. */
  expected: number[];
}

export function planLevel(level: number, prev: number[], prevSize: number, r: Rand): LevelPlan {
  const size = sizeFor(level);
  const seq = extendSequence(prev, prevSize, size, lengthFor(level), r);
  const twist = twistFor(level, r);
  const { on, gap } = timingFor(level);
  const cells = size * size;

  // Decoys go into distinct gaps between real steps (never before the first step).
  const gaps = Array.from({ length: seq.length - 1 }, (_, i) => i);
  const decoyAfter = new Set<number>();
  while (decoyAfter.size < Math.min(twist.decoys, gaps.length)) decoyAfter.add(gaps[r.int(0, gaps.length - 1)]);

  const events: ShowEvent[] = [];
  let t = LEAD_IN_MS;
  seq.forEach((tile, i) => {
    events.push({ tile, kind: "step", start: t, end: t + on });
    t += on + gap;
    if (decoyAfter.has(i)) {
      // A decoy never sits on the tile just shown or the one about to be shown.
      let d = r.int(0, cells - 1);
      let guard = 0;
      while ((d === tile || d === seq[i + 1]) && guard++ < 50) d = r.int(0, cells - 1);
      events.push({ tile: d, kind: "decoy", start: t, end: t + on });
      t += on + gap;
    }
  });

  return {
    level,
    size,
    seq,
    reverse: twist.reverse,
    decoys: decoyAfter.size,
    events,
    duration: t + 250,
    expected: twist.reverse ? [...seq].reverse() : seq,
  };
}

/** Distinct soft colours per tile; hues skip the pink/magenta band reserved for decoys. */
export function tileColor(i: number): string {
  const hues = [158, 200, 48, 265, 18, 120, 228, 82, 182, 280, 0, 140, 245, 32, 100, 215, 62, 170, 255, 8, 132, 190, 72, 236, 25];
  const h = hues[i % hues.length];
  const l = i % 2 === 0 ? 74 : 68;
  return `hsl(${h} 90% ${l}%)`;
}

/** A distinct pitch per tile: a major scale climbing from the bottom row to the top row. */
export function tileFreq(i: number, size: number): number {
  const row = Math.floor(i / size);
  const col = i % size;
  const step = (size - 1 - row) * size + col;
  const scale = [0, 2, 4, 5, 7, 9, 11];
  const semis = Math.floor(step / 7) * 12 + scale[step % 7];
  const base = size >= 5 ? 131 : size === 4 ? 165 : 196;
  return base * Math.pow(2, semis / 12);
}

/** Numpad layout for 3×3: 7 8 9 / 4 5 6 / 1 2 3. Returns tile index or -1. */
export function numpadTile(code: string): number {
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(code);
  if (!m) return -1;
  const d = Number(m[1]);
  const row = 2 - Math.floor((d - 1) / 3);
  const col = (d - 1) % 3;
  return row * 3 + col;
}

export function numpadLabel(tile: number): number {
  const row = Math.floor(tile / 3);
  const col = tile % 3;
  return (2 - row) * 3 + col + 1;
}

export function headlineFor(completed: number): string {
  if (completed === 0) return "Spooked on sight.";
  if (completed < 3) return "The ghosts giggle.";
  if (completed < 6) return "Good haunting.";
  if (completed < 10) return "Spirit medium.";
  if (completed < 14) return "Ghost whisperer.";
  return "One with the beyond.";
}

export function fmtTime(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
