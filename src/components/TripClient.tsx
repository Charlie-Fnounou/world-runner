"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Carrera, EstadoInscripcion } from "@/lib/types";
import { DISTANCIAS } from "@/lib/types";
import { traducirDistancia, traducirEstado } from "@/lib/i18n";
import { RaceCard } from "./RaceCard";
import { Chip } from "./Chip";
import { useFavoritos } from "@/hooks/useFavoritos";
import { normalizar } from "@/lib/text";
import { useIdioma } from "./LanguageProvider";

const ESTADOS_FILTRO: (EstadoInscripcion | "Todos")[] = ["Todos", "abierta", "ultimos", "sorteo", "proximamente", "cerrada"];

function coincideDestino(r: Carrera, destino: string): boolean {
  const qts = normalizar(destino).split(/\s+/).filter(Boolean);
  if (!qts.length) return true;
  const hay = normalizar([r.city, r.country, r.continent].join(" "));
  return qts.every((qt) => hay.includes(qt));
}

export function TripClient({ carreras }: { carreras: Carrera[] }) {
  const { idioma, t } = useIdioma();
  const { favoritos, alternar } = useFavoritos();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dest, setDest] = useState(() => searchParams.get("destino") ?? "");
  const [d1, setD1] = useState(() => searchParams.get("desde") ?? "");
  const [d2, setD2] = useState(() => searchParams.get("hasta") ?? "");
  const [fDist, setFDist] = useState<(typeof DISTANCIAS)[number]>(
    () => (searchParams.get("dist") as (typeof DISTANCIAS)[number]) ?? "Todas",
  );
  const [fStat, setFStat] = useState<EstadoInscripcion | "Todos">(
    () => (searchParams.get("estado") as EstadoInscripcion | "Todos") ?? "Todos",
  );

  // La búsqueda se refleja en la URL (no solo en memoria) para que "Volver"
  // desde la ficha de una carrera restaure el mismo viaje que tenías armado.
  useEffect(() => {
    const params = new URLSearchParams();
    if (dest) params.set("destino", dest);
    if (d1) params.set("desde", d1);
    if (d2) params.set("hasta", d2);
    if (fDist !== "Todas") params.set("dist", fDist);
    if (fStat !== "Todos") params.set("estado", fStat);
    const qs = params.toString();
    router.replace(qs ? `/viaje?${qs}` : "/viaje", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest, d1, d2, fDist, fStat]);

  const resultados = useMemo(() => {
    if (!dest && !d1 && !d2) return null;
    return carreras
      .filter((r) => {
        if (dest && !coincideDestino(r, dest)) return false;
        if (d1 && r.date < d1) return false;
        if (d2 && r.date > d2) return false;
        if (fDist === "Trail") {
          if (r.type !== "Trail") return false;
        } else if (fDist !== "Todas" && r.dist !== fDist) {
          return false;
        }
        if (fStat !== "Todos" && r.status !== fStat) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [dest, d1, d2, fDist, fStat, carreras]);

  return (
    <div className="max-w-5xl mx-auto px-4 pb-16 w-full">
      <h1 className="font-display font-bold uppercase mt-6 mb-1" style={{ color: "var(--wr-ink)", fontSize: 30 }}>
        {t.viaje.titulo}
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--wr-mut)" }}>
        {t.viaje.descripcion}
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl p-3 wr-panel">
          <label className="text-[11px] uppercase tracking-wider block mb-1" style={{ color: "var(--wr-mut)" }}>
            {t.viaje.destinoLabel}
          </label>
          <input
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            placeholder={t.viaje.destinoPlaceholder}
            className="w-full bg-transparent outline-none text-sm"
            style={{ color: "var(--wr-ink)" }}
          />
        </div>
        <div className="rounded-xl p-3 wr-panel">
          <label className="text-[11px] uppercase tracking-wider block mb-1" style={{ color: "var(--wr-mut)" }}>
            {t.viaje.desdeLabel}
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
            {t.viaje.hastaLabel}
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

      {resultados !== null && (
        <div className="flex flex-col gap-2.5 mb-5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {DISTANCIAS.map((d) => (
              <Chip key={d} label={traducirDistancia(d, idioma)} active={fDist === d} onClick={() => setFDist(d)} />
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ESTADOS_FILTRO.map((s) => (
              <Chip
                key={s}
                label={s === "Todos" ? t.home.cualquierEstado : traducirEstado(s, idioma)}
                active={fStat === s}
                onClick={() => setFStat(s)}
              />
            ))}
          </div>
        </div>
      )}

      {resultados === null ? (
        <div className="rounded-2xl p-10 text-center wr-panel" style={{ borderStyle: "dashed" }}>
          <div className="text-3xl mb-2">🧳</div>
          <p className="font-semibold" style={{ color: "var(--wr-ink)" }}>
            {t.viaje.vacioTitulo}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--wr-mut)" }}>
            {t.viaje.vacioTexto}
          </p>
        </div>
      ) : resultados.length === 0 ? (
        <div className="rounded-2xl p-10 text-center wr-panel" style={{ borderStyle: "dashed" }}>
          <div className="text-3xl mb-2">🏜️</div>
          <p className="font-semibold" style={{ color: "var(--wr-ink)" }}>
            {t.viaje.sinResultadosTitulo}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--wr-mut)" }}>
            {t.viaje.sinResultadosTexto}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm mb-3" style={{ color: "var(--wr-mut)" }}>
            {t.viaje.resultados(resultados.length)}
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
