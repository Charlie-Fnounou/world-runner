import Link from "next/link";
import { Smartphone, Users } from "lucide-react";
import type { GameMeta } from "@/lib/types";
import { GAME_ART } from "@/games/arts";
import { readableOn } from "@/lib/color";

const CATEGORY_LABEL = { experiment: "Experiment", brain: "Brain", arcade: "Arcade" } as const;

export function GameCard({ game, size = "md", index }: { game: GameMeta; size?: "md" | "lg"; index?: number }) {
  const Art = GAME_ART[game.slug];
  const players = game.players.max > 1 ? `${game.players.min === 1 && game.cpuOpponents ? "1" : game.players.min}–${game.players.max}` : "1";
  return (
    <Link
      href={`/play/${game.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border-2 border-ink bg-paper shadow-[0_5px_0_0_var(--color-ink)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_9px_0_0_var(--color-ink)] focus-visible:-translate-y-1"
    >
      <div
        className={`relative overflow-hidden border-b-2 border-ink ${size === "lg" ? "aspect-[16/10]" : "aspect-[4/3]"}`}
        style={{ background: game.theme.bg }}
      >
        {Art && <Art className="absolute inset-0 h-full w-full transition duration-500 ease-out group-hover:scale-[1.06]" />}
        {typeof index === "number" && (
          <span
            className="absolute left-3 top-3 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold"
            style={{ background: game.theme.ink, color: game.theme.bg }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
        <span
          className="absolute bottom-3 right-3 translate-y-2 rounded-full px-3 py-1 text-sm font-bold opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100"
          style={{ background: game.theme.accent, color: readableOn(game.theme.accent) }}
        >
          Play →
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          <span>{CATEGORY_LABEL[game.category]}</span>
          <span aria-hidden>·</span>
          <span>{game.duration}</span>
        </div>
        <h3 className={`mt-1.5 font-display font-extrabold leading-tight tracking-tight ${size === "lg" ? "text-3xl" : "text-2xl"}`}>
          {game.title}
        </h3>
        <p className={`mt-1 font-serif italic leading-snug text-ink-2 ${size === "lg" ? "text-xl" : "text-lg"}`}>{game.tagline}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-ink px-2 py-0.5">
            <Users size={12} /> {players}
            {game.players.max > 1 ? " players" : " player"}
          </span>
          {game.cpuOpponents && <span className="rounded-full border-[1.5px] border-ink px-2 py-0.5">vs CPU</span>}
          {game.party && <span className="rounded-full bg-ink px-2 py-0.5 text-paper">Party</span>}
          {game.touch && (
            <span className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-ink px-2 py-0.5" title="Works on touch screens">
              <Smartphone size={12} /> Touch
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
