"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { Carrera } from "@/lib/types";
import { Badge } from "./Badge";
import { fmtFecha, nf } from "@/lib/format";
import { slugify } from "@/lib/races-data";

type Fila = {
  label: string;
  valor: (r: Carrera) => ReactNode;
  mejor?: (x: Carrera, y: Carrera) => boolean;
};

// Varios collectors nuevos no traen distancia, precio o desnivel exactos,
// y esos campos quedan en 0 (que quiere decir "sin dato", no un valor
// real). Mostrarlo como "0 km"/"$0" es engañoso, y peor todavía es
// marcarlo como "el mejor" (menor precio/desnivel) frente a una carrera
// que sí tiene el dato cargado — por eso esos comparadores exigen que
// ambos valores sean mayores a 0 antes de declarar un ganador.
const FILAS: Fila[] = [
  { label: "Fecha", valor: (r) => fmtFecha(r.date) },
  { label: "Distancia", valor: (r) => (r.km > 0 ? r.km + " km" : "—") },
  {
    label: "Precio",
    valor: (r) => (r.price > 0 ? r.cur + nf(r.price) : "—"),
    mejor: (x, y) => x.price > 0 && y.price > 0 && x.price < y.price,
  },
  { label: "Corredores", valor: (r) => nf(r.runners), mejor: (x, y) => x.runners > y.runners },
  {
    label: "Desnivel +",
    valor: (r) => (r.elev > 0 ? nf(r.elev) + " m" : "—"),
    mejor: (x, y) => x.elev > 0 && y.elev > 0 && x.elev < y.elev,
  },
  { label: "Temp. promedio", valor: (r) => r.temp + " °C" },
  { label: "Tiempo límite", valor: (r) => r.limit },
  { label: "Dificultad", valor: (r) => "●".repeat(r.diff) + "○".repeat(5 - r.diff), mejor: (x, y) => x.diff < y.diff },
  { label: "Valoración", valor: (r) => "★ " + r.rating, mejor: (x, y) => x.rating > y.rating },
  { label: "Estado", valor: (r) => <Badge estado={r.status} sm /> },
];

function Selector({
  carreras,
  valor,
  set,
  excluir,
}: {
  carreras: Carrera[];
  valor: string;
  set: (id: string) => void;
  excluir: string;
}) {
  return (
    <select
      value={valor}
      onChange={(e) => set(e.target.value)}
      className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none wr-panel"
      style={{ color: "var(--wr-ink)" }}
    >
      {[...carreras]
        .sort((a, b) => a.name.localeCompare(b.name))
        .filter((r) => r.id !== excluir)
        .map((r) => (
          <option key={r.id} value={r.id}>
            {r.flag} {r.name}
          </option>
        ))}
    </select>
  );
}

export function CompareClient({ carreras, inicialA, inicialB }: { carreras: Carrera[]; inicialA: string; inicialB: string }) {
  const [a, setA] = useState(inicialA);
  const [b, setB] = useState(inicialB);
  const A = carreras.find((r) => r.id === a) ?? carreras[0];
  const B = carreras.find((r) => r.id === b) ?? carreras[1];

  if (!A || !B) {
    return (
      <div className="max-w-4xl mx-auto px-4 pb-16 w-full">
        <p className="text-sm py-10 text-center" style={{ color: "var(--wr-mut)" }}>
          Hacen falta al menos 2 carreras para comparar.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 w-full">
      <h1 className="font-display font-bold uppercase mt-6 mb-4" style={{ color: "var(--wr-ink)", fontSize: 30 }}>
        Comparador
      </h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Selector carreras={carreras} valor={a} set={setA} excluir={b} />
        <Selector carreras={carreras} valor={b} set={setB} excluir={a} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[A, B].map((r) => (
          <Link
            key={r.id}
            href={`/carreras/${slugify(r.id, r.name)}`}
            className="rounded-2xl h-24 p-4 text-left text-white font-bold hover:opacity-90 font-display"
            style={{ background: `linear-gradient(135deg,${r.g[0]},${r.g[1]})`, fontSize: 19 }}
          >
            {r.name}
            <div className="text-xs font-normal opacity-80 mt-1" style={{ fontFamily: "system-ui" }}>
              {r.flag} {r.city} · Ver ficha →
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--wr-line)" }}>
        {FILAS.map((f, i) => {
          const ganaA = f.mejor?.(A, B) ?? false;
          const ganaB = f.mejor?.(B, A) ?? false;
          return (
            <div
              key={f.label}
              className="grid grid-cols-[1fr_110px_1fr] items-center text-sm"
              style={{ background: i % 2 ? "var(--wr-panel)" : "var(--wr-panel-2)", borderTop: i ? "1px solid var(--wr-line)" : "none" }}
            >
              <div className="p-3 text-right font-mono tabular-nums" style={{ color: ganaA ? "#16A34A" : "var(--wr-ink)", fontWeight: ganaA ? 700 : 400 }}>
                {f.valor(A)}
                {ganaA ? " ✓" : ""}
              </div>
              <div className="p-3 text-center text-[11px] uppercase tracking-wider" style={{ color: "var(--wr-mut)" }}>
                {f.label}
              </div>
              <div className="p-3 font-mono tabular-nums" style={{ color: ganaB ? "#16A34A" : "var(--wr-ink)", fontWeight: ganaB ? 700 : 400 }}>
                {ganaB ? "✓ " : ""}
                {f.valor(B)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
