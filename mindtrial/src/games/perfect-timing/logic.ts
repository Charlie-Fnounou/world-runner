import { rng } from "@/lib/random";

/** Pure rules for Perfect Timing (no React, no DOM). */

export const ROUNDS = 5;
/** Anyone who has not stopped by target + CAP_MS gets this error for the round. */
export const CAP_MS = 5000;
/** How long the "Ready / Set" lead-in lasts before the clock starts (seconds). */
export const READY_S = 2.4;
/** Length of the fade-out once the clock starts hiding (ms). */
export const FADE_MS = 450;

/**
 * Five targets between 2.00 s and 9.99 s, one from each band so a run always
 * mixes short, medium and long holds. The first round is never one of the two
 * longest bands, so the opener is a friendly warm-up.
 */
export function makeTargets(seed: number): number[] {
  const r = rng(seed);
  const bands: [number, number][] = [
    [2000, 3400],
    [3400, 4900],
    [4900, 6400],
    [6400, 8100],
    [8100, 9990],
  ];
  const order = r.shuffle([0, 1, 2, 3, 4]);
  if (order[0] >= 3) {
    const swap = order.findIndex((b) => b <= 2);
    [order[0], order[swap]] = [order[swap], order[0]];
  }
  return order.map((b) => {
    const [lo, hi] = bands[b];
    // Round to 10 ms so the target reads as a clean "x.yz" value.
    return Math.min(9990, Math.round(r.range(lo, hi) / 10) * 10);
  });
}

/** Milliseconds the running clock stays fully visible in a given round (0-based). Later rounds hide sooner. */
export function visibleMs(round: number): number {
  return Math.max(900, 1500 - round * 125);
}

/** 0..1 visibility of the clock at `elapsed` ms into round `round`. */
export function clockVisibility(elapsed: number, round: number): number {
  const v = visibleMs(round);
  if (elapsed <= v) return 1;
  return Math.max(0, 1 - (elapsed - v) / FADE_MS);
}

export interface Rating {
  word: string;
  /** 0 (best) .. 4 (worst). */
  tier: number;
}

export function rate(errorMs: number): Rating {
  const e = Math.abs(errorMs);
  if (e <= 20) return { word: "Inhuman", tier: 0 };
  if (e <= 75) return { word: "Sharp", tier: 1 };
  if (e <= 200) return { word: "Close", tier: 2 };
  if (e <= 500) return { word: "Meh", tier: 3 };
  return { word: "Lost in time", tier: 4 };
}

export interface RoundOutcome {
  /** Elapsed ms when this player stopped, or null when they never stopped. */
  stopMs: number | null;
  /** Signed error (stop - target), null when they never stopped. */
  signed: number | null;
  /** Absolute error, capped at CAP_MS. */
  error: number;
}

export function outcome(stopMs: number | null, target: number): RoundOutcome {
  if (stopMs === null) return { stopMs: null, signed: null, error: CAP_MS };
  const signed = Math.round(stopMs - target);
  return { stopMs, signed, error: Math.min(CAP_MS, Math.abs(signed)) };
}

/** Lower total wins. Ties share a rank (standard competition ranking). */
export function placementsFromTotals(totals: number[]): number[] {
  return totals.map((t) => totals.filter((o) => o < t).length);
}

export const fmtClock = (ms: number) => (Math.max(0, ms) / 1000).toFixed(2);
export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
export const fmtSigned = (ms: number) => `${ms > 0 ? "+" : ms < 0 ? "−" : "±"}${fmtInt(Math.abs(ms))} ms`;

/**
 * Position on the ruler for a signed error, in -1..1. A square-root scale so
 * that 10 ms vs 40 ms is still readable while ±1 s fits on the same strip.
 */
export function rulerPos(signed: number, range = 1000): number {
  const t = Math.min(1, Math.sqrt(Math.abs(signed) / range));
  return signed < 0 ? -t : t;
}

/** Overall verdict for a solo run, from the average error per round. */
export function soloHeadline(totalMs: number): string {
  const avg = totalMs / ROUNDS;
  if (avg <= 30) return "Metronome brain.";
  if (avg <= 90) return "Razor sharp.";
  if (avg <= 220) return "Nicely tuned.";
  if (avg <= 550) return "Roughly on time.";
  return "Time is a construct.";
}
