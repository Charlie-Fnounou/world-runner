"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Carrera } from "@/lib/types";
import { Badge } from "./Badge";
import { fmtFecha, nf } from "@/lib/format";
import { slugify } from "@/lib/races-data";
import { useIdioma } from "./LanguageProvider";

type TabId = "planas" | "populares" | "economicas" | "desnivel" | "valoradas";

// Cada ranking usa solo carreras que tienen el dato real (0 = "sin dato").
// Un ranking con menos de MINIMO carreras con datos no se muestra: un
// "top" de 1 o 2 carreras no compara nada. "Mejor valoradas" exige
// reseñas reales de corredores, y precios solo se comparan dentro de una
// misma moneda (sin tipo de cambio verificado, mezclarlas engaña).
const MINIMO = 3;
const MIN_RESENAS = 3;

function proximas(rs: Carrera[]): Carrera[] {
  const hoy = new Date().toISOString().slice(0, 10);
  return rs.filter((r) => r.date >= hoy && r.status !== "cancelada");
}

const TABS: { id: TabId; ordenar: (rs: Carrera[], moneda: string) => Carrera[] }[] = [
  { id: "planas", ordenar: (rs) => rs.filter((r) => r.dist === "Maratón" && r.elev > 0).sort((a, b) => a.elev - b.elev) },
  { id: "populares", ordenar: (rs) => rs.filter((r) => r.runners > 0).sort((a, b) => b.runners - a.runners) },
  { id: "economicas", ordenar: (rs, moneda) => rs.filter((r) => r.price > 0 && r.cur === moneda).sort((a, b) => a.price - b.price) },
  { id: "desnivel", ordenar: (rs) => rs.filter((r) => r.elev > 0).sort((a, b) => b.elev - a.elev) },
  { id: "valoradas", ordenar: (rs) => rs.filter((r) => r.rating > 0 && r.nrev >= MIN_RESENAS).sort((a, b) => b.rating - a.rating) },
];

function medalla(i: number): string {
  return i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1);
}

export function RankingsClient({ carreras }: { carreras: Carrera[] }) {
  const { idioma, t } = useIdioma();
  const vigentes = useMemo(() => proximas(carreras), [carreras]);
  const monedas = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const r of vigentes) if (r.price > 0 && r.cur) cuenta.set(r.cur, (cuenta.get(r.cur) ?? 0) + 1);
    return [...cuenta.entries()].filter(([, n]) => n >= MINIMO).sort((a, b) => b[1] - a[1]).map(([m]) => m);
  }, [vigentes]);
  const [moneda, setMoneda] = useState("");
  const monedaActiva = monedas.includes(moneda) ? moneda : (monedas[0] ?? "");
  const disponibles = TABS.filter((tt) => tt.ordenar(vigentes, monedaActiva).length >= MINIMO);
  const [tab, setTab] = useState<TabId>("planas");
  const actual = disponibles.find((tt) => tt.id === tab) ?? disponibles[0];
  const lista = actual ? actual.ordenar(vigentes, monedaActiva).slice(0, 10) : [];

  function metrica(r: Carrera): string {
    switch (actual?.id) {
      case "planas":
      case "desnivel":
        return `${nf(r.elev, idioma)} m D+`;
      case "populares":
        return `${nf(r.runners, idioma)} ${t.rankings.corredoresSufijo}`;
      case "economicas":
        return `${r.cur} ${nf(r.price, idioma)}`;
      case "valoradas":
        return `★ ${r.rating} (${nf(r.nrev, idioma)})`;
      default:
        return "";
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 w-full">
      <h1 className="font-display font-bold uppercase mt-6 mb-1" style={{ color: "var(--wr-ink)", fontSize: 30 }}>
        {t.rankings.titulo}
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--wr-mut)" }}>
        {t.rankings.subtitulo}
      </p>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {disponibles.map((tt) => (
          <button
            key={tt.id}
            type="button"
            onClick={() => setTab(tt.id)}
            aria-pressed={actual?.id === tt.id}
            className="rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap"
            style={{
              background: actual?.id === tt.id ? "var(--wr-acc)" : "var(--wr-chip)",
              color: actual?.id === tt.id ? "var(--wr-acc-ink)" : "var(--wr-mut)",
              border: `1px solid ${actual?.id === tt.id ? "var(--wr-acc)" : "var(--wr-line)"}`,
            }}
          >
            {t.rankings.tabs[tt.id]}
          </button>
        ))}
      </div>

      {actual?.id === "economicas" && monedas.length > 1 && (
        <div className="flex gap-2 flex-wrap items-center mb-4 text-xs" style={{ color: "var(--wr-mut)" }}>
          {t.rankings.moneda}
          {monedas.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMoneda(m)}
              aria-pressed={m === monedaActiva}
              className="rounded-full px-3 py-1 font-mono"
              style={{ background: m === monedaActiva ? "var(--wr-acc)" : "var(--wr-chip)", color: m === monedaActiva ? "var(--wr-acc-ink)" : "var(--wr-mut)" }}
            >
              {m}
            </button>
          ))}
        </div>
      )}

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
                {r.city}, {r.country} · {fmtFecha(r.date, idioma)}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono font-bold tabular-nums text-sm" style={{ color: "var(--wr-acc)" }}>
                {metrica(r)}
              </div>
              <Badge estado={r.status} sm />
            </div>
          </Link>
        ))}
        {lista.length === 0 && (
          <p className="text-sm text-center py-10" style={{ color: "var(--wr-mut)" }}>
            {t.rankings.sinDatos}
          </p>
        )}
      </div>
    </div>
  );
}
