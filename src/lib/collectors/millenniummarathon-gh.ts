import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de Millennium Marathon Sports Limited (millenniummarathon.com),
// la organizadora ghanesa detrás de la KGL Millennium Marathon —una media
// maratón de Accra con ranking de World Athletics, distinta de la Accra
// International Marathon que ya cubre aimghana.ts— y de otras carreras
// propias suyas como el Independence Day Run. Es el sitio oficial del
// organizador, no un agregador: las páginas de cada carrera están
// publicadas directamente por Millennium Marathon Sports Limited.
//
// robots.txt (https://millenniummarathon.com/robots.txt) solo bloquea
// /wp-admin/ (con /wp-admin/admin-ajax.php explícitamente permitido) y
// /wp-content/uploads/bulk-media-register-tmp/; ninguna de las páginas de
// carreras que usamos aquí está restringida.
//
// El sitio también expone un REST API de "The Events Calendar"
// (/wp-json/tribe/events/v1/events) pero ese endpoint solo trae puntos de
// encuentro de "run clubs" locales (Ridge Run Club, Spintex Run Club,
// etc.), no carreras con inscripción/distancias, así que no se usa acá.
// Las carreras reales de la organizadora están en páginas fijas del sitio
// (events-info, independence-day-run), enlazadas desde /race-calendar/.
// También existe /junior-mile-race/ (carrera infantil 3-15 años) pero al
// momento de escribir este collector su única fecha publicada era la
// edición pasada (22 nov 2025), sin fecha 2026/2027 confirmada todavía,
// así que se omite por ahora (mismo criterio que aimghana.ts con Black
// Star Marathon: no insertar fechas viejas como si fueran la próxima
// edición).

const CODIGO_PAIS = "GH";
const FUENTE_TIPO = "millenniummarathon-gh";
const CIUDAD = "Accra";
const HEADERS = { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" };

const MESES: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function parsearFechaLarga(texto: string): Date | null {
  const m = texto.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December),?\s+(\d{4})/i,
  );
  if (!m) return null;
  const mes = MESES[m[2].toLowerCase()];
  if (mes === undefined) return null;
  const dia = parseInt(m[1], 10);
  const anio = parseInt(m[3], 10);
  const fecha = new Date(Date.UTC(anio, mes, dia, 10, 0, 0));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
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

function kmReal(km: number): number {
  // 21KM se anuncia redondeado pero la carrera es la media maratón oficial.
  if (km >= 20.5 && km <= 21.5) return 21.0975;
  if (km >= 41.5 && km <= 42.5) return 42.195;
  return km;
}

interface CarreraFija {
  externalId: string;
  nombre: string;
  url: string;
  urlInscripcion?: string;
  parsear: (html: string) => { fecha: Date; distancias: { km: number; precio?: number }[] } | null;
}

// KGL Millennium Marathon: fecha en texto plano tipo
// "<p>Saturday 12th September, 2026</p>" y precios tipo
// "<p>5KM Ghanaian &#8211; GHS 100</p><p>21KM Ghanaian &#8211; GHS 150</p>".
function parsearMillenniumMarathon(html: string) {
  const fecha = parsearFechaLarga(html);
  if (!fecha) return null;

  const distancias = new Map<number, number | undefined>();
  const regexPrecio = /(\d{1,2})KM\s+Ghanaian\s*(?:&#8211;|-|–)\s*GHS\s*(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = regexPrecio.exec(html))) {
    const km = kmReal(parseInt(m[1], 10));
    const precio = parseInt(m[2], 10);
    const actual = distancias.get(km);
    if (actual === undefined || precio < actual) distancias.set(km, precio);
  }
  if (distancias.size === 0) return null;

  return {
    fecha,
    distancias: [...distancias.entries()].map(([km, precio]) => ({ km, precio })),
  };
}

// Independence Day Run: fecha tipo "Race Date - Saturday 7th March, 2027"
// y distancias como texto de botón "<span class="elementor-button-text">5KM</span>".
function parsearIndependenceDayRun(html: string) {
  const bloqueFecha = html.match(/Race Date\s*-[^<]*/i);
  const fecha = bloqueFecha ? parsearFechaLarga(bloqueFecha[0]) : null;
  if (!fecha) return null;

  const distancias = new Map<number, number | undefined>();
  const regexDistancia = /elementor-button-text">(\d{1,2})KM</gi;
  let m: RegExpExecArray | null;
  while ((m = regexDistancia.exec(html))) {
    const km = kmReal(parseInt(m[1], 10));
    if (!distancias.has(km)) distancias.set(km, undefined);
  }
  if (distancias.size === 0) return null;

  return {
    fecha,
    distancias: [...distancias.entries()].map(([km, precio]) => ({ km, precio })),
  };
}

const CARRERAS: CarreraFija[] = [
  {
    externalId: "millennium-marathon",
    nombre: "KGL Millennium Marathon",
    url: "https://millenniummarathon.com/events-info/",
    parsear: parsearMillenniumMarathon,
  },
  {
    externalId: "independence-day-run",
    nombre: "Independence Day Run",
    url: "https://millenniummarathon.com/independence-day-run/",
    urlInscripcion: "https://millenniummarathon.com/ind-reg/",
    parsear: parsearIndependenceDayRun,
  },
];

function aCarreraExterna(carrera: CarreraFija, datos: { fecha: Date; distancias: { km: number; precio?: number }[] }): CarreraExterna {
  const { pais, continente } = paisDesdeCodigoIso(CODIGO_PAIS);
  const precios = datos.distancias.map((d) => d.precio).filter((p): p is number => typeof p === "number");

  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: "Millennium Marathon Sports Limited (sitio oficial millenniummarathon.com)",
    fuenteUrl: carrera.url,
    externalId: `${carrera.externalId}-${datos.fecha.getFullYear()}`,
    nombre: carrera.nombre,
    ciudad: CIUDAD,
    pais,
    codigoPais: CODIGO_PAIS,
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: carrera.url,
    anio: datos.fecha.getFullYear(),
    fecha: datos.fecha,
    precioDesde: precios.length ? Math.min(...precios) : undefined,
    moneda: precios.length ? "GHS" : undefined,
    urlInscripcionOficial: carrera.urlInscripcion ?? carrera.url,
    distancias: datos.distancias.map((d) => ({ tipo: tipoDistanciaDesdeKm(d.km), km: d.km, terreno: "ASFALTO" as const })),
  };
}

export async function correrCollectorMillenniumMarathonGH() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    for (const carrera of CARRERAS) {
      try {
        const res = await fetch(carrera.url, { headers: HEADERS });
        if (!res.ok) {
          errores++;
          continue;
        }
        const html = await res.text();
        const datos = carrera.parsear(html);
        if (!datos) {
          // Página sin fecha/distancias parseables en este momento (p.ej.
          // todavía no se publicó la próxima edición): se omite este run,
          // no es un error de red.
          continue;
        }
        const { creada } = await upsertCarreraExterna(aCarreraExterna(carrera, datos));
        if (creada) nuevas++;
        else actualizadas++;
      } catch {
        errores++;
      }
    }

    return { nuevas, actualizadas, errores };
  });
}
