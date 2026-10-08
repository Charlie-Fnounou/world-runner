import type { PlayerConfig } from "@/lib/types";

/** Per-player key map shown before multiplayer games. */
export function ControlsLegend({ players, className = "" }: { players: PlayerConfig[]; className?: string }) {
  return (
    <ul className={`mt-3 space-y-2 text-sm ${className}`}>
      {players.map((p) => (
        <li key={p.index} className="flex items-center gap-3">
          <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white/40" style={{ background: p.color }} />
          <span className="w-20 shrink-0 truncate font-bold">{p.name}</span>
          {p.cpu ? (
            <span className="font-mono text-xs opacity-60">computer</span>
          ) : (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="kbd">{p.controls.moveLabel}</span>
              <span className="kbd">{p.controls.actionLabel}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
