"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { CATEGORIES, GAMES } from "@/lib/catalog";
import type { Category } from "@/lib/types";
import { GameCard } from "./GameCard";

type PlayerFilter = "all" | "solo" | "multi";

/** Searchable, filterable grid of every game. */
export function Catalog() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [players, setPlayers] = useState<PlayerFilter>("all");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GAMES.filter((g) => {
      if (category !== "all" && g.category !== category) return false;
      if (players === "solo" && !(g.players.min === 1)) return false;
      if (players === "multi" && g.players.max < 2) return false;
      if (!q) return true;
      return [g.title, g.tagline, g.description, ...g.tags].join(" ").toLowerCase().includes(q);
    });
  }, [query, category, players]);

  const chip = (active: boolean) =>
    `rounded-full border-2 border-ink px-4 py-1.5 text-sm font-bold transition ${active ? "bg-ink text-paper" : "hover:bg-ink/10"}`;

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <label className="relative flex-1 lg:max-w-sm">
          <span className="sr-only">Search games</span>
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search: physics, memory, racing…"
            className="w-full rounded-full border-2 border-ink bg-paper py-2.5 pl-11 pr-10 text-[15px] font-medium outline-none placeholder:text-muted focus:shadow-[0_4px_0_0_var(--color-ink)]"
          />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-ink/10">
              <X size={16} />
            </button>
          )}
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          <button className={chip(category === "all")} aria-pressed={category === "all"} onClick={() => setCategory("all")}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className={chip(category === c.id)} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 lg:ml-auto" role="group" aria-label="Players">
          {(["all", "solo", "multi"] as const).map((p) => (
            <button key={p} className={chip(players === p)} aria-pressed={players === p} onClick={() => setPlayers(p)}>
              {p === "all" ? "Any players" : p === "solo" ? "Solo" : "Multiplayer"}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-muted" aria-live="polite">
        {results.length} {results.length === 1 ? "game" : "games"}
      </p>
      {results.length > 0 ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((g) => (
            <GameCard key={g.slug} game={g} index={GAMES.indexOf(g)} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[22px] border-2 border-dashed border-ink p-10 text-center">
          <p className="font-display text-2xl font-bold">Nothing matches that.</p>
          <p className="mt-1 font-serif text-lg italic text-ink-2">Try “reflex”, “physics” or “memory”.</p>
          <button
            className="btn mt-5"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setPlayers("all");
            }}
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
