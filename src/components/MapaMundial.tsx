"use client";

import "leaflet/dist/leaflet.css";
import { useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import type { Carrera } from "@/lib/types";
import { RaceCard } from "./RaceCard";
import { Chip } from "./Chip";
import { useIdioma } from "./LanguageProvider";
import { useFavoritos } from "@/hooks/useFavoritos";

interface GrupoPais {
  pais: string;
  bandera: string;
  lat: number;
  lng: number;
  carreras: Carrera[];
}

// Un marcador por país (no uno por carrera): con miles de carreras, mil
// pines individuales se vuelven ilegibles y no dejan "elegir un país". El
// centroide de cada país es el promedio de lat/lng de sus propias carreras
// (no hace falta una lista aparte de capitales/centros geográficos).
function agruparPorPais(carreras: Carrera[]): GrupoPais[] {
  const mapa = new Map<string, GrupoPais>();
  for (const r of carreras) {
    let g = mapa.get(r.country);
    if (!g) {
      g = { pais: r.country, bandera: r.flag, lat: 0, lng: 0, carreras: [] };
      mapa.set(r.country, g);
    }
    g.carreras.push(r);
  }
  for (const g of mapa.values()) {
    g.lat = g.carreras.reduce((s, r) => s + r.lat, 0) / g.carreras.length;
    g.lng = g.carreras.reduce((s, r) => s + r.lng, 0) / g.carreras.length;
  }
  return [...mapa.values()];
}

// Radio en px según cantidad de carreras: raíz cuadrada para que un país
// con 10x más carreras no se vuelva 10x más grande (quedaría gigante).
function radioDesdeCantidad(n: number): number {
  return Math.min(28, 8 + Math.sqrt(n) * 4);
}

export function MapaMundial({ carreras, alto = 460 }: { carreras: Carrera[]; alto?: number }) {
  const { t } = useIdioma();
  const { favoritos, alternar: alternarFavorito } = useFavoritos();
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const grupos = useMemo(() => agruparPorPais(carreras), [carreras]);

  function alternarPais(pais: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(pais)) next.delete(pais);
      else next.add(pais);
      return next;
    });
  }

  const carrerasSeleccionadas = useMemo(
    () => carreras.filter((r) => seleccionados.has(r.country)).sort((a, b) => a.date.localeCompare(b.date)),
    [carreras, seleccionados],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl overflow-hidden wr-panel" style={{ height: alto }}>
        <MapContainer
          center={[20, 10]}
          zoom={2}
          minZoom={2}
          style={{ height: "100%", width: "100%", background: "var(--wr-bg)" }}
          worldCopyJump
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />
          {grupos.map((g) => {
            const activo = seleccionados.has(g.pais);
            return (
              <CircleMarker
                key={g.pais}
                center={[g.lat, g.lng]}
                radius={radioDesdeCantidad(g.carreras.length)}
                pathOptions={{
                  color: activo ? "var(--wr-acc)" : "#fff",
                  weight: activo ? 3 : 1.5,
                  fillColor: activo ? "var(--wr-acc)" : "#2563eb",
                  fillOpacity: activo ? 0.9 : 0.55,
                }}
                eventHandlers={{ click: () => alternarPais(g.pais) }}
              >
                <Tooltip direction="top" offset={[0, -4]}>
                  {g.bandera} {g.pais} · {g.carreras.length}
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <p className="text-xs" style={{ color: "var(--wr-mut)" }}>
        {t.mapa.ayuda}
      </p>

      {seleccionados.size > 0 && (
        <div className="rounded-2xl p-4 wr-panel flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-wrap gap-2">
              {grupos
                .filter((g) => seleccionados.has(g.pais))
                .map((g) => (
                  <Chip
                    key={g.pais}
                    active
                    label={`${g.bandera} ${g.pais} (${g.carreras.length}) ×`}
                    onClick={() => alternarPais(g.pais)}
                  />
                ))}
            </div>
            <button
              onClick={() => setSeleccionados(new Set())}
              className="text-xs font-semibold hover:underline shrink-0"
              style={{ color: "var(--wr-acc)" }}
            >
              {t.mapa.limpiarSeleccion}
            </button>
          </div>

          <div className="text-xs font-mono" style={{ color: "var(--wr-mut)" }}>
            {t.mapa.carrerasEnSeleccion(carrerasSeleccionadas.length)}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {carrerasSeleccionadas.map((r) => (
              <RaceCard key={r.id} r={r} favorito={favoritos.has(r.id)} onFavorito={alternarFavorito} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
