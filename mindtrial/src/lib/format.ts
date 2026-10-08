import type { GameMeta } from "./types";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 });
const plain = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

export function formatNumber(n: number): string {
  return Math.abs(n) >= 100_000 ? compact.format(n) : plain.format(n);
}

/** Format a stored record value using the game's record unit. */
export function formatRecord(meta: GameMeta, value: number): string {
  const unit = meta.record?.unit;
  if (unit === "s") return `${value.toFixed(2)} s`;
  return unit ? `${formatNumber(value)} ${unit}` : formatNumber(value);
}
