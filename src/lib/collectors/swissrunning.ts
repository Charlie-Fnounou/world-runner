import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de Swiss Running (guide.swiss-running.ch), el "LaufGuide"
// que administra Swiss Athletics — la federación suiza de atletismo —
// para todas las carreras populares del país. No es un agregador
// comercial de terceros: los propios organizadores cargan su carrera
// ahí para entrar al calendario oficial de la federación.
//
// (Se evaluó primero datasport.com, la plataforma de timing/inscripción
// más usada en Suiza, pero su listado completo de eventos sólo se
// puede filtrar/paginar vía un endpoint bajo /api/, que su robots.txt
// bloquea explícitamente para todos los user-agents; sin eso la home
// sólo entrega 20 eventos mezclados con otros deportes. Por eso se usó
// Swiss Running en su lugar.)
//
// La lista de eventos usa paginación con htmx: cada página trae 20
// carreras en tarjetas <div class="card event-card ...">, sin
// necesitar JavaScript (el propio endpoint de paginación
// /en/search/events?page=N devuelve el fragmento de HTML). robots.txt
// de guide.swiss-running.ch no restringe nada.

const URL_BASE = "https://guide.swiss-running.ch/en/search/events";
const MAX_PAGINAS = 40;

interface FilaSwissRunning {
  id: string;
  nombre: string;
  fechaTexto: string; // "2026-07-15" o "2026-07-15 - 2026-07-19"
  direccion: string; // "Adelboden, BE, Switzerland"
  distanciasTexto: string; // "12.6 km, 8.7 km, 6.0 km"
}

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

function parsearFilas(html: string): FilaSwissRunning[] {
  const filas: FilaSwissRunning[] = [];
  // Cada tarjeta de evento arranca con esta clase + su id numérico;
  // se parte el HTML ahí en vez de usar una regex gigante por fila.
  const bloques = html.split("card event-card h-100' data-url='/en/events/").slice(1);

  for (const bloque of bloques) {
    const id = bloque.match(/^(\d+)'/)?.[1];
    const nombre = decodificarHtml(bloque.match(/<h5 class='card-title'>([^<]+)<\/h5>/)?.[1]?.trim() ?? "");
    const fechaTexto = bloque.match(/start-date[\s\S]*?<div class='small'>([^<]+)<\/div>/)?.[1]?.trim();
    const direccion = bloque.match(/full-address[\s\S]*?<div class='small'>([^<]+)<\/div>/)?.[1]?.trim();
    const distanciasTexto = bloque.match(/distances[\s\S]*?<div class='small'>([^<]+)<\/div>/)?.[1]?.trim() ?? "";

    if (!id || !nombre || !fechaTexto || !direccion) continue;
    filas.push({ id, nombre, fechaTexto, direccion, distanciasTexto });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  // Puede venir como rango "2026-07-15 - 2026-07-19"; nos quedamos con
  // la fecha de inicio.
  const m = texto.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T10:00:00Z`);
}

// "Adelboden, BE, Switzerland" -> { ciudad: "Adelboden", pais: "Switzerland" }
function direccionDesdeTexto(texto: string): { ciudad: string; esSuiza: boolean } {
  const partes = texto
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const ciudad = partes[0] || "Suiza";
  const esSuiza = partes[partes.length - 1]?.toLowerCase() === "switzerland";
  return { ciudad, esSuiza };
}

function distanciaMasLarga(texto: string): number {
  const numeros = [...texto.matchAll(/(\d+(?:[.,]\d+)?)\s*km/gi)].map((m) => parseFloat(m[1].replace(",", ".")));
  return numeros.length ? Math.max(...numeros) : 0;
}

function tipoDistanciaDesdeKm(km: number): TipoDistancia {
  if (km <= 0) return TipoDistancia.OTRA;
  if (km <= 6) return TipoDistancia.KM_5;
  if (km <= 12) return TipoDistancia.KM_10;
  if (km <= 17) return TipoDistancia.KM_15;
  if (km <= 20.5) return TipoDistancia.KM_20;
  if (km <= 22) return TipoDistancia.MEDIA_MARATON;
  if (km <= 27) return TipoDistancia.KM_25;
  if (km <= 35) return TipoDistancia.KM_30;
  if (km <= 43) return TipoDistancia.MARATON;
  return TipoDistancia.ULTRA;
}

function aCarreraExterna(fila: FilaSwissRunning): CarreraExterna | null {
  const fecha = fechaDesdeTexto(fila.fechaTexto);
  if (!fecha) return null;

  const { ciudad, esSuiza } = direccionDesdeTexto(fila.direccion);
  if (!esSuiza) return null; // el guide puede listar alguna carrera fronteriza; nos quedamos sólo con Suiza

  const km = distanciaMasLarga(fila.distanciasTexto);
  const url = `https://guide.swiss-running.ch/en/events/${fila.id}`;

  return {
    fuenteTipo: "swiss_running",
    fuenteNombre: "Swiss Running — LaufGuide (Swiss Athletics)",
    fuenteUrl: url,
    externalId: fila.id,
    nombre: fila.nombre,
    ciudad,
    pais: "Suiza",
    codigoPais: "CH",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: url,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: url,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorSwissRunning() {
  return registrarEjecucion("swiss_running", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const hoy = new Date().toISOString().slice(0, 10);

    for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
      const url = `${URL_BASE}?from=${hoy}&name=&page=${pagina}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
      });
      if (!res.ok) throw new Error(`Swiss Running respondió ${res.status}`);
      const html = await res.text();
      const filas = parsearFilas(html);
      if (filas.length === 0) break;

      for (const fila of filas) {
        try {
          const externa = aCarreraExterna(fila);
          if (!externa) continue;
          const { creada } = await upsertCarreraExterna(externa);
          if (creada) nuevas++;
          else actualizadas++;
        } catch {
          errores++;
        }
      }
    }

    return { nuevas, actualizadas, errores };
  });
}
