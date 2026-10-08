/**
 * Build a shuffled rotation of `rounds` games from `pool`, cycling through the
 * whole pool before repeating and never playing the same game twice in a row
 * (when the pool has more than one game).
 */
export function buildRotation(pool: string[], rounds: number, random: () => number = Math.random): string[] {
  const out: string[] = [];
  const shuffle = (arr: string[]) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  while (out.length < rounds) {
    let bag = shuffle(pool);
    if (pool.length > 1 && out.length && bag[0] === out[out.length - 1]) {
      bag = [...bag.slice(1), bag[0]];
    }
    out.push(...bag);
  }
  return out.slice(0, rounds);
}

/**
 * Points per player from placements (0 = first). Winner gets n-1, last gets 0,
 * tied players share the points of the higher rank.
 */
export function pointsFor(placements: number[]): number[] {
  const n = placements.length;
  return placements.map((rank) => Math.max(0, n - 1 - rank));
}
