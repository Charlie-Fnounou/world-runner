"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { GameProps } from "@/lib/types";
import { getGame } from "@/lib/catalog";
import { GAME_LOADERS } from "@/games/registry";
import { GameShell, type PartyHook } from "./GameShell";

/** Loads a game's chunk on the client and mounts it inside the shell. */
export function GameLoader({ slug, party }: { slug: string; party?: PartyHook }) {
  const meta = getGame(slug);
  const [loaded, setLoaded] = useState<{ slug: string; Game: ComponentType<GameProps> } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const loader = GAME_LOADERS[slug];
    if (!loader) return;
    loader()
      .then((m) => alive && setLoaded({ slug, Game: m.default }))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (!meta) return null;
  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center p-6 text-center" style={{ background: meta.theme.bg, color: meta.theme.ink }}>
        <div>
          <p className="font-display text-3xl font-black">Couldn&apos;t load {meta.title}.</p>
          <button className="btn mt-6" onClick={() => location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (!loaded || loaded.slug !== slug) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4" style={{ background: meta.theme.bg, color: meta.theme.ink }}>
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-current border-t-transparent opacity-70" />
        <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">Loading {meta.title}</p>
      </div>
    );
  }
  return <GameShell key={slug} meta={meta} Game={loaded.Game} party={party} />;
}
