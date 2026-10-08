import type { PlayerConfig } from "@/lib/types";

const ORDINAL = ["1st", "2nd", "3rd", "4th"];

/** Podium list from per-player placements (0 = winner, ties share). */
export function Standings({ players, placements, className = "" }: { players: PlayerConfig[]; placements: number[]; className?: string }) {
  const order = players.map((p, i) => ({ p, rank: placements[i] ?? players.length - 1 })).sort((a, b) => a.rank - b.rank);
  return (
    <ol className={`space-y-2 ${className}`}>
      {order.map(({ p, rank }) => (
        <li
          key={p.index}
          className="flex items-center gap-3 rounded-2xl px-4 py-2.5"
          style={{ background: rank === 0 ? p.color : "color-mix(in srgb, currentColor 8%, transparent)", color: rank === 0 ? "#111" : undefined }}
        >
          <span className="w-10 font-mono text-sm font-bold">{ORDINAL[rank] ?? `${rank + 1}th`}</span>
          <span className="h-3.5 w-3.5 rounded-full ring-2 ring-black/20" style={{ background: p.color }} />
          <span className="flex-1 font-display text-lg font-bold">{p.name}</span>
          {rank === 0 && <span className="text-xl" aria-hidden>👑</span>}
        </li>
      ))}
    </ol>
  );
}
