/** Timer-pool rules for Visual Hunt (pure). */

/** Seconds in the pool at the start of a run. */
export const START_TIME = 12;
/** The pool never holds more than this, so a hot streak can't bank forever. */
export const MAX_TIME = 20;
/** Seconds lost per wrong pick. */
export const WRONG_PENALTY = 2;
/** Below this the bar turns red and ticks. */
export const LOW_TIME = 4;

/**
 * Seconds added to the pool when the anomaly is found: a base, more for
 * crowded scenes, and a +1 s bonus for a find under two seconds.
 */
export function findBonus(items: number, findTime: number): number {
  const raw = 3 + items / 30 + (findTime < 2 ? 1 : 0);
  return Math.round(raw * 2) / 2;
}

export function headlineFor(cleared: number): string {
  if (cleared === 0) return "Hidden in plain sight.";
  if (cleared < 5) return "Keen-ish eye.";
  if (cleared < 10) return "Sharp spotter.";
  if (cleared < 18) return "Eagle eye.";
  return "Pixel hawk.";
}

export const fmtSec = (s: number) => `${s.toFixed(1)} s`;
