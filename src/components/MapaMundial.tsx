"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Map as MapLibreMap, NavigationControl, Popup, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import type { Carrera } from "@/lib/types";
import type { Idioma } from "@/lib/i18n";
import { traducirDistancia } from "@/lib/i18n";
import { slugify } from "@/lib/races-data";
import { Badge } from "./Badge";
import { Chip } from "./Chip";
import { useIdioma } from "./LanguageProvider";

interface GrupoPais {
  pais: string;
  bandera: string;
  lat: number;
  lng: number;
  carreras: Carrera[];
}

// Un marcador por país (no uno por carrera): con miles de carreras, mil
// pines individuales se vuelven ilegibles y no dejan "elegir un país". El
// centroide de cada país es el promedio de lat/lng de sus propias carreras.
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
  // (0,0) significa "sin coordenadas": promediarlo arrastraba el marcador
  // del país al medio del océano. Un país sin ninguna coordenada válida
  // queda con NaN y no se dibuja (igual aparece en el panel y el contador).
  for (const g of mapa.values()) {
    const validas = g.carreras.filter((r) => r.lat !== 0 || r.lng !== 0);
    g.lat = validas.reduce((s, r) => s + r.lat, 0) / validas.length;
    g.lng = validas.reduce((s, r) => s + r.lng, 0) / validas.length;
  }
  return [...mapa.values()];
}

// MapLibre arma la URL de su worker a partir de su propia ubicación, y el
// bundler de Next no la resuelve: se sirve una copia fija desde /public.
// Al actualizar maplibre-gl, volver a copiar los dos archivos de
// node_modules/maplibre-gl/dist/ (worker + shared) a public/maplibre/.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

// Estilo oscuro de OpenFreeMap: gratis, sin clave y con uso comercial
// permitido (CARTO, el anterior, empezó a exigir clave y mostraba una
// marca de agua "API KEY REQUIRED" encima del mapa).
const ESTILO_MAPA = "https://tiles.openfreemap.org/styles/dark";

function Globo({
  grupos,
  seleccionados,
  onAlternar,
}: {
  grupos: GrupoPais[];
  seleccionados: Set<string>;
  onAlternar: (pais: string) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapLibreMap | null>(null);
  const listoRef = useRef(false);
  const alternarRef = useRef(onAlternar);

  const datos = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: grupos.filter((g) => Number.isFinite(g.lat)).map((g) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [g.lng, g.lat] },
        properties: { pais: g.pais, bandera: g.bandera, n: g.carreras.length, activo: seleccionados.has(g.pais) ? 1 : 0 },
      })),
    }),
    [grupos, seleccionados],
  );
  const datosRef = useRef(datos);

  useEffect(() => {
    alternarRef.current = onAlternar;
  }, [onAlternar]);

  useEffect(() => {
    if (!contenedor.current) return;
    const map = new MapLibreMap({
      container: contenedor.current,
      style: ESTILO_MAPA,
      center: [-25, 22],
      // En pantallas angostas (celular) el globo entero no entra con el zoom de escritorio.
      zoom: contenedor.current.clientWidth < 520 ? 0.85 : 1.55,
      minZoom: 0.6,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 12, className: "wr-popup" });

    map.on("style.load", () => {
      map.setProjection({ type: "globe" });
      map.addSource("paises", { type: "geojson", data: datosRef.current });
      map.addLayer({
        id: "paises",
        type: "circle",
        source: "paises",
        paint: {
          // Escala logarítmica: EE. UU. (miles de carreras) no tapa a sus vecinos.
          "circle-radius": ["interpolate", ["linear"], ["log10", ["+", ["get", "n"], 1]], 0, 4, 1, 7, 2, 11, 3, 15, 4, 19],
          "circle-color": ["case", ["==", ["get", "activo"], 1], "#3b5bff", "#2547e8"],
          "circle-opacity": ["case", ["==", ["get", "activo"], 1], 0.95, 0.6],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": ["case", ["==", ["get", "activo"], 1], 2.5, 1],
          "circle-stroke-opacity": ["case", ["==", ["get", "activo"], 1], 1, 0.55],
          "circle-pitch-alignment": "viewport",
        },
      });
      listoRef.current = true;
    });

    map.on("click", "paises", (e) => {
      const pais = e.features?.[0]?.properties?.pais;
      if (pais) alternarRef.current(String(pais));
    });
    map.on("mousemove", "paises", (e) => {
      const f = e.features?.[0];
      if (!f || f.geometry.type !== "Point") return;
      map.getCanvas().style.cursor = "pointer";
      const p = f.properties;
      popup
        .setLngLat(f.geometry.coordinates as [number, number])
        .setText(`${p.bandera} ${p.pais} · ${p.n}`)
        .addTo(map);
    });
    map.on("mouseleave", "paises", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    mapaRef.current = map;
    return () => {
      listoRef.current = false;
      mapaRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    datosRef.current = datos;
    if (!listoRef.current) return;
    (mapaRef.current?.getSource("paises") as GeoJSONSource | undefined)?.setData(datos);
  }, [datos]);

  // Tamaño por altura/ancho, no "absolute inset-0": la hoja de estilos de
  // MapLibre fuerza position: relative en el contenedor.
  return <div ref={contenedor} className="h-full w-full" />;
}

function isoHoyMas(meses: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

function partesFecha(fecha: string, idioma: Idioma) {
  const d = new Date(fecha + "T12:00:00Z");
  return {
    dia: String(d.getUTCDate()).padStart(2, "0"),
    mes: d.toLocaleDateString(idioma, { month: "short", timeZone: "UTC" }).replace(".", "").toUpperCase(),
    semana: d.toLocaleDateString(idioma, { weekday: "long", timeZone: "UTC" }),
    anio: d.getUTCFullYear(),
  };
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--wr-mut)" }}>
      <span className="inline-block h-px w-5" style={{ background: "var(--wr-acc)" }} />
      {children}
    </div>
  );
}

function TileFecha({ fecha, idioma, grande }: { fecha: string; idioma: Idioma; grande?: boolean }) {
  const f = partesFecha(fecha, idioma);
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl shrink-0 tabular-nums"
      style={{
        width: grande ? 72 : 52,
        height: grande ? 78 : 56,
        border: `1px solid ${grande ? "var(--wr-acc)" : "var(--wr-line)"}`,
        background: "var(--wr-panel-2)",
      }}
    >
      <span className="font-display font-extrabold leading-none" style={{ fontSize: grande ? 34 : 22, color: "var(--wr-ink)" }}>
        {f.dia}
      </span>
      <span className="font-mono text-[10px] tracking-[0.12em] mt-1" style={{ color: grande ? "var(--wr-acc)" : "var(--wr-mut)" }}>
        {f.mes}
      </span>
    </div>
  );
}

const PASO_LISTA = 60;

export function MapaMundial({
  carreras,
  alto = 460,
  filtroFechas = true,
}: {
  carreras: Carrera[];
  alto?: number;
  filtroFechas?: boolean;
}) {
  const { idioma, t } = useIdioma();
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [desde, setDesde] = useState(() => isoHoyMas(0));
  const [hasta, setHasta] = useState(() => isoHoyMas(12));
  const [limite, setLimite] = useState(PASO_LISTA);

  const enRango = useMemo(
    () => (filtroFechas ? carreras.filter((r) => (!desde || r.date >= desde) && (!hasta || r.date <= hasta)) : carreras),
    [carreras, filtroFechas, desde, hasta],
  );
  const grupos = useMemo(() => agruparPorPais(enRango), [enRango]);
  const abiertas = useMemo(() => enRango.filter((r) => r.status === "abierta" || r.status === "ultimos").length, [enRango]);

  const delPanel = useMemo(
    () => enRango.filter((r) => seleccionados.has(r.country)).sort((a, b) => a.date.localeCompare(b.date)),
    [enRango, seleccionados],
  );
  const proxima = delPanel.find((r) => r.status !== "cerrada") ?? delPanel[0];

  function alternarPais(pais: string) {
    setLimite(PASO_LISTA);
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(pais)) next.delete(pais);
      else next.add(pais);
      return next;
    });
  }

  const estiloInputFecha = {
    background: "var(--wr-panel-2)",
    color: "var(--wr-ink)",
    border: "1px solid var(--wr-line)",
  };

  return (
    <div className="flex flex-col gap-3">
      {filtroFechas && (
        <div className="rounded-2xl wr-panel px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <label htmlFor="mapa-desde" className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--wr-mut)" }}>
            {t.mapa.desde}
            <input
              id="mapa-desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="rounded-lg px-2.5 py-1.5 text-sm font-mono normal-case tracking-normal"
              style={estiloInputFecha}
            />
          </label>
          <label htmlFor="mapa-hasta" className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--wr-mut)" }}>
            {t.mapa.hasta}
            <input
              id="mapa-hasta"
              type="date"
              value={hasta}
              min={desde}
              onChange={(e) => setHasta(e.target.value)}
              className="rounded-lg px-2.5 py-1.5 text-sm font-mono normal-case tracking-normal"
              style={estiloInputFecha}
            />
          </label>
          <span className="ml-auto font-mono text-xs tabular-nums" style={{ color: "var(--wr-mut)" }}>
            {t.mapa.resumen(enRango.length, grupos.length)}
          </span>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative rounded-2xl overflow-hidden" style={{ height: alto, background: "#07090d", border: "1px solid var(--wr-line)" }}>
          <div
            className="absolute top-3 left-3 z-[1000] flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em]"
            style={{ background: "rgba(11,13,17,0.82)", color: "#f2f4f8", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <span className="relative flex" style={{ width: 8, height: 8 }}>
              <span className="wr-pulse absolute inline-flex h-full w-full rounded-full" style={{ background: "#16A34A", opacity: 0.6 }} />
              <span className="relative inline-flex rounded-full" style={{ width: 8, height: 8, background: "#16A34A" }} />
            </span>
            {t.mapa.abiertasAhora(abiertas)}
          </div>
          <Globo grupos={grupos} seleccionados={seleccionados} onAlternar={alternarPais} />
        </div>

        <aside
          className="rounded-2xl wr-panel flex flex-col min-h-[220px] max-h-[560px] lg:max-h-none overflow-hidden"
          style={{ ["--alto" as string]: `${alto}px` }}
        >
          {seleccionados.size === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-8 py-10 lg:h-[var(--alto)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--wr-acc)" strokeWidth="1.8" aria-hidden="true">
                <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
                <circle cx="12" cy="9.5" r="2.5" />
              </svg>
              <p className="text-sm" style={{ color: "var(--wr-ink)" }}>
                {t.mapa.tocaUnPais}
              </p>
              <p className="text-xs" style={{ color: "var(--wr-mut)" }}>
                {t.mapa.podesVarios}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-4 overflow-y-auto lg:h-[var(--alto)]">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <Eyebrow>{t.mapa.paisesElegidos}</Eyebrow>
                  <button
                    type="button"
                    onClick={() => setSeleccionados(new Set())}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: "var(--wr-acc)" }}
                  >
                    {t.mapa.limpiarSeleccion}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {grupos
                    .filter((g) => seleccionados.has(g.pais))
                    .map((g) => (
                      <Chip key={g.pais} active label={`${g.bandera} ${g.pais} ×`} onClick={() => alternarPais(g.pais)} />
                    ))}
                </div>
              </div>

              {!proxima ? (
                <p className="text-sm" style={{ color: "var(--wr-mut)" }}>
                  {t.mapa.sinCarrerasEnRango}
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-2.5">
                    <Eyebrow>{t.mapa.proximaCarrera}</Eyebrow>
                    <Link
                      href={`/carreras/${slugify(proxima.id, proxima.name)}`}
                      className="rounded-xl p-3 flex gap-3 items-center transition-colors hover:brightness-110"
                      style={{ border: "1px solid var(--wr-acc)", background: "color-mix(in srgb, var(--wr-acc) 8%, var(--wr-panel))" }}
                    >
                      <TileFecha fecha={proxima.date} idioma={idioma} grande />
                      <div className="min-w-0 flex flex-col gap-1">
                        <span className="text-[11px] capitalize" style={{ color: "var(--wr-mut)" }}>
                          {partesFecha(proxima.date, idioma).semana} · {partesFecha(proxima.date, idioma).anio}
                        </span>
                        <span className="font-semibold leading-snug line-clamp-2" style={{ color: "var(--wr-ink)" }}>
                          {proxima.name}
                        </span>
                        <span className="text-xs truncate" style={{ color: "var(--wr-mut)" }}>
                          {proxima.flag} {proxima.city}
                          {proxima.dist ? ` · ${traducirDistancia(proxima.dist, idioma)}` : ""}
                        </span>
                        <span className="flex items-center gap-2 flex-wrap">
                          <Badge estado={proxima.status} sm />
                          <span className="font-mono text-[11px]" style={{ color: "var(--wr-acc)" }}>
                            {t.mapa.verCarrera}
                          </span>
                        </span>
                      </div>
                    </Link>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Eyebrow>{t.mapa.todas(delPanel.length)}</Eyebrow>
                    <ul className="flex flex-col">
                      {delPanel.slice(0, limite).map((r) => (
                        <li key={r.id} style={{ borderTop: "1px solid var(--wr-line)" }}>
                          <Link href={`/carreras/${slugify(r.id, r.name)}`} className="flex items-center gap-3 py-2.5 group">
                            <TileFecha fecha={r.date} idioma={idioma} />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium leading-snug line-clamp-2 group-hover:underline" style={{ color: "var(--wr-ink)" }}>
                                {r.name}
                              </div>
                              <div className="text-xs truncate mt-0.5" style={{ color: "var(--wr-mut)" }}>
                                {r.flag} {r.city}
                                {r.dist ? ` · ${traducirDistancia(r.dist, idioma)}` : ""}
                              </div>
                            </div>
                            <Badge estado={r.status} sm />
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {delPanel.length > limite && (
                      <button
                        type="button"
                        onClick={() => setLimite((l) => l + PASO_LISTA)}
                        className="self-start text-xs font-semibold hover:underline"
                        style={{ color: "var(--wr-acc)" }}
                      >
                        {t.mapa.verMas(Math.min(PASO_LISTA, delPanel.length - limite))}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
