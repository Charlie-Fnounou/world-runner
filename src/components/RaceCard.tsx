"use client";

import Link from "next/link";
import type { Carrera } from "@/lib/types";
import { Badge } from "./Badge";
import { diasHasta, fmtFecha, nf } from "@/lib/format";
import { slugify } from "@/lib/races-data";

export function RaceCard({
  r,
  favorito,
  onFavorito,
}: {
  r: Carrera;
  favorito: boolean;
  onFavorito: (id: string) => void;
}) {
  const d = diasHasta(r.date);
  const stats: [string, string][] = [
    [r.dist === "Ultra maratón" || r.dist === "Trail" ? r.km + "K" : r.dist, "distancia"],
    [fmtFecha(r.date).slice(0, 6), "fecha"],
    [r.cur + r.price, "desde"],
    ["★ " + r.rating, "(" + nf(r.nrev) + ")"],
  ];

  return (
    <Link
      href={`/carreras/${slugify(r.id, r.name)}`}
      className="rounded-2xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-1 wr-panel"
    >
      <div
        className="relative h-32 flex items-end p-4"
        style={{ background: `linear-gradient(135deg,${r.g[0]},${r.g[1]})` }}
      >
        <span className="absolute top-3 left-3">
          <Badge estado={r.status} sm />
        </span>
        <button
          onClick={(e) => {
            e.preventDefault();
            onFavorito(r.id);
          }}
          aria-label="Favorito"
          className="absolute top-2.5 right-3 rounded-full w-8 h-8 flex items-center justify-center text-base transition-transform hover:scale-110"
          style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)" }}
        >
          {favorito ? "❤️" : "🤍"}
        </button>
        <div>
          {r.major && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/85">
              ★ World Marathon Major
            </span>
          )}
          <div className="font-display text-white font-bold leading-tight" style={{ fontSize: 23 }}>
            {r.name}
          </div>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: "var(--wr-mut)" }}>
            {r.flag} {r.city}, {r.country}
          </span>
          <span className="font-mono font-semibold tabular-nums" style={{ color: "var(--wr-ink)" }}>
            {d > 0 ? `T–${d}d` : "—"}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center mt-auto">
          {stats.map(([v, l], i) => (
            <div key={i} className="rounded-lg py-1.5" style={{ background: "var(--wr-panel-2)" }}>
              <div className="text-[13px] font-semibold" style={{ color: "var(--wr-ink)" }}>
                {v}
              </div>
              <div className="text-[10px]" style={{ color: "var(--wr-mut)" }}>
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
