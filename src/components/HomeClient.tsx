"use client";

import { useMemo, useState } from "react";
import type { Carrera } from "@/lib/types";
import { SearchBar } from "./SearchBar";
import { RaceCard } from "./RaceCard";
import { MapaMundialLazy } from "./MapaMundialLazy";
import { useFavoritos } from "@/hooks/useFavoritos";
import { buscarCarreras } from "@/lib/search";

export function HomeClient({ carreras, favoritosIniciales }: { carreras: Carrera[]; favoritosIniciales: string[] }) {
  const [query, setQuery] = useState("");
  const { favoritos, alternar } = useFavoritos(favoritosIniciales);

  const filtradas = useMemo(() => buscarCarreras(carreras, query), [carreras, query]);

  const destacadas = useMemo(() => carreras.filter((r) => r.major), [carreras]);

  const proximasAperturas = useMemo(
    () =>
      carreras
        .filter((r) => r.status === "abierta" || r.status === "ultimos")
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 8),
    [carreras],
  );

  const mostrarResultadosBusqueda = query.trim().length > 0;

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

      {mostrarResultadosBusqueda ? (
        <section className="max-w-6xl mx-auto px-4 w-full">
          <h2 className="font-display font-bold text-2xl mb-4">
            Resultados para “{query}” ({filtradas.length})
          </h2>
          {filtradas.length === 0 ? (
            <p style={{ color: "var(--wr-mut)" }}>No encontramos carreras que coincidan. Prueba con otro término.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtradas.map((r) => (
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

          <section className="max-w-6xl mx-auto px-4 w-full">
            <h2 className="font-display font-bold text-2xl mb-4">Próximas aperturas e inscripciones abiertas</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {proximasAperturas.map((r) => (
                <RaceCard key={r.id} r={r} favorito={favoritos.has(r.id)} onFavorito={alternar} />
              ))}
            </div>
          </section>

          <section className="max-w-6xl mx-auto px-4 w-full">
            <h2 className="font-display font-bold text-2xl mb-4">Mapa mundial</h2>
            <MapaMundialLazy carreras={carreras} />
          </section>
        </>
      )}
    </div>
  );
}
