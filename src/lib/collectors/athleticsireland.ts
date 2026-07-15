import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de Athletics Ireland (AAI), la federación irlandesa de
// atletismo. Su sistema de membresía y calendario ("EventMaster") es
// donde los clubes irlandeses dan de alta sus carreras con permiso
// oficial ("Permit Approved") — no es un agregador de terceros, es la
// fuente donde los propios organizadores registran el evento.
//
// La web pública (athleticsireland.eventmaster.ie/event-calendar/)
// carga el calendario embebiendo un iframe/widget cuyo HTML sale de
// membership.athleticsireland.ie/api/eventathletic/getdataevents — un
// endpoint que devuelve HTML (no JSON) ya con la tabla de eventos,
// paginado con "currentPage". Ese dominio no tiene robots.txt (404 ->
// sin restricciones). Se filtra a eventType=ROAD_RACE para no traer
// atletismo en pista ni cross country de clubes.

const URL_BASE = "https://membership.athleticsireland.ie/api/eventathletic/getdataevents";
const MAX_PAGINAS = 30;

interface FilaAthleticsIreland {
  externalId: string;
  nombre: string;
  fechaTexto: string; // "July 15th 2026"
  county: string;
  precioTexto: string;
  distanciaTexto: string;
  url: string;
}

const MESES: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function totalPaginasDesdeHtml(html: string): number {
  const m = html.match(/evm-countEvent"\s+value="(\d+)"/);
  return m ? parseInt(m[1], 10) : 1;
}

function parsearFilas(html: string): FilaAthleticsIreland[] {
  const filas: FilaAthleticsIreland[] = [];
  // Cada fila de la tabla empieza con este <tr>; se parte el HTML ahí
  // (mismo patrón que otros recolectores del proyecto) en vez de usar
  // una única regex gigante para toda la fila.
  const bloques = html.split('<tr class="md:!evm-border-b-2').slice(1);

  for (const bloque of bloques) {
    const href = bloque.match(/href="(https:\/\/eventmaster\.ie\/event\/[A-Za-z0-9]+)"/)?.[1];
    const nombre = bloque
      .match(/evm-text-2xl evm-text-gray-800 evm-text-center !evm-align-middle !evm-bg-white">\s*([^<]+?)\s*</)?.[1]
      ?.trim();
    const fechaTexto = bloque
      .match(/evm-justify-center evm-align-top evm-py-1 evm-font-semibold !evm-text-xl !evm-text-gray-700">\s*([^<]+?)\s*</)?.[1]
      ?.trim();
    const county =
      bloque
        .match(/data-label="County"[\s\S]*?evm-font-bold !evm-text-black !evm-text-lg md:evm-mt-2 evm-py-1">\s*([^<]+?)\s*</)?.[1]
        ?.trim() ?? "";
    const precioTexto =
      bloque
        .match(/data-label="Price"[\s\S]*?evm-font-bold !evm-text-black !evm-text-base md:evm-mt-2 evm-py-1">\s*([^<]+?)\s*</)?.[1]
        ?.trim() ?? "";
    const distanciaTexto = bloque.match(/Distance\s*<\/div>\s*<div class="!evm-text-gray-700">\s*([^<]+?)\s*<\/div>/)?.[1]?.trim() ?? "";

    if (!href || !nombre || !fechaTexto) continue;

    const externalId = href.split("/event/")[1] ?? "";
    if (!externalId) continue;

    filas.push({ externalId, nombre, fechaTexto, county, precioTexto, distanciaTexto, url: href });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  // "July 15th 2026"
  const m = texto.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)\s+(\d{4})$/);
  if (!m) return null;
  const mes = MESES[m[1].toLowerCase()];
  const dia = Number(m[2]);
  const anio = Number(m[3]);
  if (!mes || !dia || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T10:00:00Z`);
}

function precioDesdeTexto(texto: string): number | undefined {
  const m = texto.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : undefined;
}

// Convierte un token de distancia ("5km", "10mile", "13.1m/21km",
// "26.2m/42.2km", "Other") a km. El campo puede traer varias
// distancias separadas por coma (el evento ofrece varias carreras el
// mismo día); nos quedamos con la más larga, igual que runevents.ts.
function kmDesdeToken(token: string): number {
  const t = token.trim().toLowerCase();
  if (t.includes("42.2km")) return 42.195;
  if (t.includes("21km")) return 21.0975;
  const km = t.match(/(\d+(?:\.\d+)?)\s*km/);
  if (km) return parseFloat(km[1]);
  const millas = t.match(/(\d+(?:\.\d+)?)\s*mile/);
  if (millas) return parseFloat(millas[1]) * 1.60934;
  return 0;
}

function distanciaMasLarga(texto: string): number {
  if (!texto) return 0;
  const tokens = texto.split(",");
  let mejor = 0;
  for (const token of tokens) {
    const km = kmDesdeToken(token);
    if (km > mejor) mejor = km;
  }
  return mejor;
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

function aCarreraExterna(fila: FilaAthleticsIreland): CarreraExterna | null {
  const fecha = fechaDesdeTexto(fila.fechaTexto);
  if (!fecha) return null;

  const km = distanciaMasLarga(fila.distanciaTexto);

  return {
    fuenteTipo: "athletics_ireland",
    fuenteNombre: "Athletics Ireland — EventMaster",
    fuenteUrl: fila.url,
    externalId: fila.externalId,
    nombre: fila.nombre,
    ciudad: fila.county || "Irlanda",
    pais: "Irlanda",
    codigoPais: "IE",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: fila.url,
    anio: fecha.getFullYear(),
    fecha,
    precioDesde: precioDesdeTexto(fila.precioTexto),
    moneda: fila.precioTexto ? "€" : undefined,
    urlInscripcionOficial: fila.url,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorAthleticsIreland() {
  return registrarEjecucion("athletics_ireland", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    let pagina = 1;
    let totalPaginas = 1;
    const vistos = new Set<string>();

    do {
      const res = await fetch(`${URL_BASE}?currentPage=${pagina}&eventType=ROAD_RACE`, {
        headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
      });
      if (!res.ok) throw new Error(`Athletics Ireland respondió ${res.status}`);
      const html = await res.text();
      totalPaginas = totalPaginasDesdeHtml(html);

      const filas = parsearFilas(html);
      if (filas.length === 0) break;

      for (const fila of filas) {
        const clave = normalizar(fila.externalId);
        if (vistos.has(clave)) continue;
        vistos.add(clave);
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

      pagina++;
    } while (pagina <= totalPaginas && pagina <= MAX_PAGINAS);

    return { nuevas, actualizadas, errores };
  });
}
