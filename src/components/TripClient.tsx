"use client";

import { useMemo, useState } from "react";
import type { Carrera } from "@/lib/types";
import { RaceCard } from "./RaceCard";
import { useFavoritos } from "@/hooks/useFavoritos";
import { normalizar } from "@/lib/text";

function coincideDestino(r: Carrera, destino: string): boolean {
  const qts = normalizar(destino).split(/\s+/).filter(Boolean);
  if (!qts.length) return true;
  const hay = normalizar([r.city, r.country, r.continent].join(" "));
  return qts.every((qt) => hay.includes(qt));
}

export function TripClient({ carreras, favoritosIniciales }: { carreras: Carrera[]; favoritosIniciales: string[] }) {
  const { favoritos, alternar } = useFavoritos(favoritosIniciales);
  const [dest, setDest] = useState("");
  const [d1, setD1] = useState("");
  const [d2, setD2] = useState("");

  const resultados = useMemo(() => {
    if (!dest && !d1 && !d2) return null;
    return carreras
      .filter((r) => {
        if (dest && !coincideDestino(r, dest)) return false;
        if (d1 && r.date < d1) return false;
        if (d2 && r.date > d2) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [dest, d1, d2, carreras]);

  return (
    <div className="max-w-5xl mx-auto px-4 pb-16 w-full">
      <h1 className="font-display font-bold uppercase mt-6 mb-1" style={{ color: "var(--wr-ink)", fontSize: 30 }}>
        Corre durante tu viaje
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--wr-mut)" }}>
        Decinos a dónde vas y cuándo, y te mostramos todas las carreras disponibles en ese destino y rango de
        fechas. Ej.: «Japón» del 1 al 15 de marzo.
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl p-3 wr-panel">
          <label className="text-[11px] uppercase tracking-wider block mb-1" style={{ color: "var(--wr-mut)" }}>
            Destino (país, ciudad o continente)
          </label>
          <input
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            placeholder="p. ej. España, Japón, Europa…"
            className="w-full bg-transparent outline-none text-sm"
            style={{ color: "var(--wr-ink)" }}
          />
        </div>
        <div className="rounded-xl p-3 wr-panel">
          <label className="text-[11px] uppercase tracking-wider block mb-1" style={{ color: "var(--wr-mut)" }}>
            Desde
          </label>
          <input
            type="date"
            value={d1}
            onChange={(e) => setD1(e.target.value)}
            className="w-full bg-transparent outline-none text-sm"
            style={{ color: "var(--wr-ink)" }}
          />
        </div>
        <div className="rounded-xl p-3 wr-panel">
          <label className="text-[11px] uppercase tracking-wider block mb-1" style={{ color: "var(--wr-mut)" }}>
            Hasta
          </label>
          <input
            type="date"
            value={d2}
            onChange={(e) => setD2(e.target.value)}
            className="w-full bg-transparent outline-none text-sm"
            style={{ color: "var(--wr-ink)" }}
          />
        </div>
      </div>

      {resultados === null ? (
        <div className="rounded-2xl p-10 text-center wr-panel" style={{ borderStyle: "dashed" }}>
          <div className="text-3xl mb-2">🧳</div>
          <p className="font-semibold" style={{ color: "var(--wr-ink)" }}>
            Planifica tu próximo viaje corriendo
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--wr-mut)" }}>
            Escribe un destino o elige fechas para empezar.
          </p>
        </div>
      ) : resultados.length === 0 ? (
        <div className="rounded-2xl p-10 text-center wr-panel" style={{ borderStyle: "dashed" }}>
          <div className="text-3xl mb-2">🏜️</div>
          <p className="font-semibold" style={{ color: "var(--wr-ink)" }}>
            No encontramos carreras en ese destino y fechas
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--wr-mut)" }}>
            Prueba ampliando el rango o buscando por país o continente.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm mb-3" style={{ color: "var(--wr-mut)" }}>
            <b style={{ color: "var(--wr-ink)" }}>{resultados.length}</b> carrera{resultados.length !== 1 ? "s" : ""}{" "}
            durante tu viaje:
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resultados.map((r) => (
              <RaceCard key={r.id} r={r} favorito={favoritos.has(r.id)} onFavorito={alternar} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
