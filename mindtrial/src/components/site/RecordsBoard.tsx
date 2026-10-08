"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2, Trophy } from "lucide-react";
import { GAMES } from "@/lib/catalog";
import { clearRecords, getPlayCounts, getRecords, type RecordEntry } from "@/lib/records";
import { formatRecord } from "@/lib/format";
import { GAME_ART } from "@/games/arts";

/** Personal bests read from this browser's localStorage. */
export function RecordsBoard() {
  const [records, setRecords] = useState<Record<string, RecordEntry> | null>(null);
  const [plays, setPlays] = useState<Record<string, number>>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser storage after mount
    setRecords(getRecords());
    setPlays(getPlayCounts());
  }, []);

  if (records === null) return <p className="mt-10 font-mono text-sm text-muted">Loading your records…</p>;

  const totalPlays = Object.values(plays).reduce((a, b) => a + b, 0);

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center gap-4">
        <p className="font-serif text-2xl italic text-ink-2">
          {totalPlays === 0 ? "No games finished yet — your trophies will appear here." : `${totalPlays} finished ${totalPlays === 1 ? "game" : "games"} so far.`}
        </p>
        {totalPlays > 0 && (
          <button
            className="btn ml-auto text-sm"
            onClick={() => {
              if (confirm("Erase all records saved in this browser?")) {
                clearRecords();
                setRecords({});
                setPlays({});
              }
            }}
          >
            <Trash2 size={16} /> Reset records
          </button>
        )}
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => {
          const r = records[g.slug];
          const Art = GAME_ART[g.slug];
          return (
            <li key={g.slug}>
              <Link href={`/play/${g.slug}`} className="group flex h-full items-stretch overflow-hidden rounded-[20px] border-2 border-ink bg-paper transition hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_var(--color-ink)]">
                <span className="relative w-28 shrink-0 border-r-2 border-ink" style={{ background: g.theme.bg }}>
                  {Art && <Art className="absolute inset-0 h-full w-full" />}
                </span>
                <span className="flex flex-1 flex-col p-4">
                  <span className="font-display text-xl font-extrabold">{g.title}</span>
                  {g.record ? (
                    r ? (
                      <span className="mt-1 flex items-center gap-1.5 font-display text-2xl font-black tabular-nums">
                        <Trophy size={18} className="text-amber" /> {formatRecord(g, r.best)}
                      </span>
                    ) : (
                      <span className="mt-1 font-serif text-lg italic text-muted">No record yet</span>
                    )
                  ) : (
                    <span className="mt-1 font-serif text-lg italic text-muted">Multiplayer — no solo record</span>
                  )}
                  <span className="mt-auto pt-2 font-mono text-[11px] uppercase tracking-wider text-muted">
                    {g.record?.label ? `${g.record.label} · ` : ""}
                    {plays[g.slug] ?? 0} {(plays[g.slug] ?? 0) === 1 ? "play" : "plays"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
