"use client";

import { useState } from "react";
import Link from "next/link";
import type { Carrera } from "@/lib/types";
import { Badge } from "./Badge";
import { fmtFecha, nf } from "@/lib/format";
import { slugify } from "@/lib/races-data";

type TabId = "rapidas" | "populares" | "economicas" | "dificiles" | "valoradas" | "frescas";

const TABS: { id: TabId; label: string; ordenar: (rs: Carrera[]) => Carrera[] }[] = [
  { id: "rapidas", label: "⚡ Más rápidas", ordenar: (rs) => [...rs].filter((r) => r.dist === "Maratón").sort((a, b) => a.elev - b.elev) },
  { id: "populares", label: "👥 Más populares", ordenar: (rs) => [...rs].sort((a, b) => b.runners - a.runners) },
  { id: "economicas", label: "💰 Más económicas", ordenar: (rs) => [...rs].sort((a, b) => a.price - b.price) },
  { id: "dificiles", label: "🔥 Más difíciles", ordenar: (rs) => [...rs].sort((a, b) => b.diff * 1000 + b.elev - (a.diff * 1000 + a.elev)) },
  { id: "valoradas", label: "⭐ Mejor valoradas", ordenar: (rs) => [...rs].sort((a, b) => b.rating - a.rating) },
  { id: "frescas", label: "❄️ Mejor clima frío", ordenar: (rs) => [...rs].sort((a, b) => a.temp - b.temp) },
];

function medalla(i: number): string {
  return i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1);
}

function metrica(tab: TabId, r: Carrera): string {
  switch (tab) {
    case "rapidas":
      return `${nf(r.elev)} m D+`;
    case "populares":
      return `${nf(r.runners)} corredores`;
    case "economicas":
      return `${r.cur}${r.price}`;
    case "dificiles":
      return `${"●".repeat(r.diff)} · ${nf(r.elev)} m D+`;
    case "valoradas":
      return `★ ${r.rating}`;
    case "frescas":
      return `${r.temp} °C`;
  }
}

export function RankingsClient({ carreras }: { carreras: Carrera[] }) {
  const [tab, setTab] = useState<TabId>("rapidas");
  const actual = TABS.find((t) => t.id === tab)!;
  const lista = actual.ordenar(carreras).slice(0, 10);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 w-full">
      <h1 className="font-display font-bold uppercase mt-6 mb-1" style={{ color: "var(--wr-ink)", fontSize: 30 }}>
        Rankings mundiales
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--wr-mut)" }}>
        Generados automáticamente a partir de los datos de cada carrera.
      </p>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap"
            style={{
              background: tab === t.id ? "var(--wr-acc)" : "var(--wr-chip)",
              color: tab === t.id ? "var(--wr-acc-ink)" : "var(--wr-mut)",
              border: `1px solid ${tab === t.id ? "var(--wr-acc)" : "var(--wr-line)"}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {lista.map((r, i) => (
          <Link
            key={r.id}
            href={`/carreras/${slugify(r.id, r.name)}`}
            className="rounded-xl p-3.5 flex items-center gap-4 text-left hover:opacity-90 transition-opacity wr-panel"
            style={{ border: `1px solid ${i < 3 ? "var(--wr-acc)55" : "var(--wr-line)"}` }}
          >
            <span className="w-8 text-center text-lg font-bold font-mono" style={{ color: "var(--wr-ink)" }}>
              {medalla(i)}
            </span>
            <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: `linear-gradient(135deg,${r.g[0]},${r.g[1]})` }} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate" style={{ color: "var(--wr-ink)" }}>
                {r.flag} {r.name}
              </div>
              <div className="text-xs" style={{ color: "var(--wr-mut)" }}>
                {r.city}, {r.country} · {fmtFecha(r.date)}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono font-bold tabular-nums text-sm" style={{ color: "var(--wr-acc)" }}>
                {metrica(tab, r)}
              </div>
              <Badge estado={r.status} sm />
            </div>
          </Link>
        ))}
        {lista.length === 0 && (
          <p className="text-sm text-center py-10" style={{ color: "var(--wr-mut)" }}>
            Todavía no hay suficientes carreras para este ranking.
          </p>
        )}
      </div>
    </div>
  );
}
