"use client";

import { useMemo } from "react";
import type { Carrera } from "@/lib/types";
import { RaceCard } from "./RaceCard";
import { useFavoritos } from "@/hooks/useFavoritos";
import { MESES_FULL } from "@/lib/format";

export function CalendarioClient({
  carreras,
  favoritosIniciales,
}: {
  carreras: Carrera[];
  favoritosIniciales: string[];
}) {
  const { favoritos, alternar } = useFavoritos(favoritosIniciales);

  const porMes = useMemo(() => {
    const grupos = new Map<string, Carrera[]>();
    const ordenadas = [...carreras].sort((a, b) => a.date.localeCompare(b.date));
    for (const r of ordenadas) {
      const dt = new Date(r.date + "T12:00:00");
      const clave = `${dt.getFullYear()}-${String(dt.getMonth()).padStart(2, "0")}`;
      if (!grupos.has(clave)) grupos.set(clave, []);
      grupos.get(clave)!.push(r);
    }
    return grupos;
  }, [carreras]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 w-full flex flex-col gap-10">
      <h1 className="font-display font-extrabold text-4xl">Calendario de carreras</h1>
      {[...porMes.entries()].map(([clave, races]) => {
        const [anio, mes] = clave.split("-").map(Number);
        return (
          <section key={clave}>
            <h2 className="font-display font-bold text-2xl mb-4">
              {MESES_FULL[mes]} {anio}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {races.map((r) => (
                <RaceCard key={r.id} r={r} favorito={favoritos.has(r.id)} onFavorito={alternar} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
