"use client";

/** Personal records stored in localStorage. Only real finished runs are recorded. */

export interface RecordEntry {
  best: number;
  plays: number;
  lastPlayed: number;
  better: "higher" | "lower";
}

type RecordBook = Record<string, RecordEntry>;
const KEY = "mindtrial:records:v1";
const PLAYS_KEY = "mindtrial:plays:v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or privacy mode */
  }
}

export function getRecords(): RecordBook {
  return read<RecordBook>(KEY, {});
}

export function getRecord(slug: string): RecordEntry | undefined {
  return getRecords()[slug];
}

/** Returns `true` if this score is a new personal best. */
export function submitScore(slug: string, score: number, better: "higher" | "lower"): boolean {
  if (!Number.isFinite(score)) return false;
  const book = getRecords();
  const prev = book[slug];
  const isBest = !prev || (better === "higher" ? score > prev.best : score < prev.best);
  book[slug] = {
    best: isBest ? score : prev.best,
    plays: (prev?.plays ?? 0) + 1,
    lastPlayed: Date.now(),
    better,
  };
  write(KEY, book);
  return isBest;
}

/** Play counter for every game (including unscored toys and multiplayer). */
export function countPlay(slug: string) {
  const plays = read<Record<string, number>>(PLAYS_KEY, {});
  plays[slug] = (plays[slug] ?? 0) + 1;
  write(PLAYS_KEY, plays);
}

export function getPlayCounts(): Record<string, number> {
  return read<Record<string, number>>(PLAYS_KEY, {});
}

export function clearRecords() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(PLAYS_KEY);
  } catch {
    /* ignore */
  }
}
