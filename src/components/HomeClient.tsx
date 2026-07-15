"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Carrera, EstadoInscripcion } from "@/lib/types";
import { DISTANCIAS, CONTINENTES, ESTADO_INFO } from "@/lib/types";
import { SearchBar } from "./SearchBar";
import { RaceCard } from "./RaceCard";
import { MapaMundialLazy } from "./MapaMundialLazy";
import { Chip } from "./Chip";
import { useFavoritos } from "@/hooks/useFavoritos";
import { buscarCarreras } from "@/lib/search";

const ESTADOS_FILTRO: (EstadoInscripcion | "Todos")[] = ["Todos", "abierta", "ultimos", "sorteo", "proximamente", "cerrada"];

export function HomeClient({
  carreras,
  bannerDestacado,
  bannerMedio,
}: {
  carreras: Carrera[];
  bannerDestacado?: React.ReactNode;
  bannerMedio?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [fDist, setFDist] = useState<(typeof DISTANCIAS)[number]>("Todas");
  const [fCont, setFCont] = useState<(typeof CONTINENTES)[number]>("Todos");
  const [fStat, setFStat] = useState<EstadoInscripcion | "Todos">("Todos");
  const [modo, setModo] = useState<"lista" | "mapa">("lista");
  const { favoritos, alternar } = useFavoritos();

  const buscadas = useMemo(() => buscarCarreras(carreras, query), [carreras, query]);

  const filtrosActivos = fDist !== "Todas" || fCont !== "Todos" || fStat !== "Todos";
  const mostrarExplorador = query.trim().length > 0 || filtrosActivos || modo === "mapa";

  const resultados = useMemo(() => {
    return buscadas
      .filter((r) => {
        if (fDist === "Trail") {
          if (r.type !== "Trail") return false;
        } else if (fDist !== "Todas" && r.dist !== fDist) {
          return false;
        }
        if (fCont !== "Todos" && r.continent !== fCont) return false;
        if (fStat !== "Todos" && r.status !== fStat) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [buscadas, fDist, fCont, fStat]);

  const destacadas = useMemo(() => carreras.filter((r) => r.major), [carreras]);

  const proximasAperturas = useMemo(
    () =>
      carreras
        .filter((r) => r.status === "abierta" || r.status === "ultimos")
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 8),
    [carreras],
  );

  return (
    <div className="flex flex-col gap-14 pb-20">
      <section
        className="px-4 pt-16 pb-14 flex flex-col items-center text-center gap-6"
        style={{ background: "linear-gradient(135deg, var(--wr-panel) 0%, var(--wr-bg) 100%)" }}
      >
        <h1 className="font-display font-extrabold leading-none" style={{ fontSize: "clamp(36px,7vw,64px)" }}>
          Toda carrera.
          <br />
          <span style={{ color: "var(--wr-acc)" }}>Todo el planeta.</span>
        </h1>
        <p className="max-w-xl text-base" style={{ color: "var(--wr-mut)" }}>
          Descubre, compara y planifica maratones, medias maratones, 10K, trails y ultras en
          cualquier país, con links de inscripción oficiales.
        </p>
        <SearchBar carreras={carreras} onQueryChange={setQuery} />
        <div className="text-xs" style={{ color: "var(--wr-mut)" }}>
          {carreras.length} carreras verificadas en {new Set(carreras.map((r) => r.country)).size} países
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 w-full flex flex-col gap-2.5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {DISTANCIAS.map((d) => (
            <Chip key={d} label={d} active={fDist === d} onClick={() => setFDist(d)} />
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CONTINENTES.map((c) => (
            <Chip key={c} label={c} active={fCont === c} onClick={() => setFCont(c)} />
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 items-center">
          {ESTADOS_FILTRO.map((s) => (
            <Chip
              key={s}
              label={s === "Todos" ? "Cualquier estado" : ESTADO_INFO[s].label}
              active={fStat === s}
              onClick={() => setFStat(s)}
            />
          ))}
          <div className="ml-auto flex rounded-xl overflow-hidden shrink-0" style={{ border: "1px solid var(--wr-line)" }}>
            {(["lista", "mapa"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className="px-4 py-1.5 text-sm font-semibold"
                style={{ background: modo === m ? "var(--wr-acc)" : "var(--wr-panel)", color: modo === m ? "var(--wr-acc-ink)" : "var(--wr-mut)" }}
              >
                {m === "lista" ? "☰ Lista" : "🗺 Mapa"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {mostrarExplorador ? (
        <section className="max-w-6xl mx-auto px-4 w-full">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display font-bold text-2xl">
              {resultados.length} carrera{resultados.length !== 1 ? "s" : ""} encontrada{resultados.length !== 1 ? "s" : ""}
            </h2>
            <span className="text-xs font-mono" style={{ color: "var(--wr-mut)" }}>
              ordenadas por fecha
            </span>
          </div>
          {modo === "mapa" ? (
            <MapaMundialLazy carreras={resultados} />
          ) : resultados.length === 0 ? (
            <div className="rounded-2xl p-10 text-center wr-panel" style={{ borderStyle: "dashed" }}>
              <div className="text-3xl mb-2">🏜️</div>
              <p className="font-semibold" style={{ color: "var(--wr-ink)" }}>
                No hay carreras con esos filtros
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--wr-mut)" }}>
                Prueba con otra distancia, continente o estado, o limpia la búsqueda.
              </p>
              <Link href="/proponer" className="inline-block mt-3 text-sm hover:underline" style={{ color: "var(--wr-acc)" }}>
                ¿No encontraste tu carrera? Proponela acá →
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resultados.map((r) => (
                <RaceCard key={r.id} r={r} favorito={favoritos.has(r.id)} onFavorito={alternar} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="max-w-6xl mx-auto px-4 w-full">
            <h2 className="font-display font-bold text-2xl mb-4">★ Carreras destacadas</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {destacadas.map((r) => (
                <RaceCard key={r.id} r={r} favorito={favoritos.has(r.id)} onFavorito={alternar} />
              ))}
            </div>
          </section>

          {bannerDestacado}

          <section className="max-w-6xl mx-auto px-4 w-full">
            <h2 className="font-display font-bold text-2xl mb-4">Próximas aperturas e inscripciones abiertas</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {proximasAperturas.map((r) => (
                <RaceCard key={r.id} r={r} favorito={favoritos.has(r.id)} onFavorito={alternar} />
              ))}
            </div>
          </section>

          {bannerMedio}

          <section className="max-w-6xl mx-auto px-4 w-full">
            <h2 className="font-display font-bold text-2xl mb-4">Mapa mundial</h2>
            <MapaMundialLazy carreras={carreras} />
          </section>
        </>
      )}
    </div>
  );
}
