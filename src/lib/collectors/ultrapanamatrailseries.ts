import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de la Ultra Panamá Trail Series, la serie de ultra trail
// más importante de Panamá (parte de UTMB World Series / Circuito
// Latinoamericano de Trail). El sitio oficial (ultrapanamatrailseries.com)
// está protegido por un challenge de Cloudflare en TODAS sus rutas
// (incluido /robots.txt y /sitemap.xml), así que no se puede scrapear
// sin sortear una protección anti-bots — algo que este proyecto no
// hace. La inscripción real de la edición vigente corre por
// my.raceresult.com (plataforma suiza de timing/inscripción usada por
// el organizador), que sí es accesible: robots.txt solo bloquea rutas
// de certificados/listados internos, no la página del evento, y esa
// página trae un bloque JSON-LD (schema.org/Event) con nombre, fechas
// y ubicación.
//
// Cada edición anual de RaceResult tiene su propio ID numérico de
// evento (no hay un listado público para descubrirlos todos), así que
// por ahora se seguirá a mano la edición vigente y se actualizará este
// ID cuando cambie de sede/año.
const ID_EVENTO_RACERESULT = "372008"; // "ULTRA PANAMA TRAIL SERIES 2026 | Boquete"
const URL_EVENTO = `https://my.raceresult.com/${ID_EVENTO_RACERESULT}/`;
const CODIGO_PAIS = "PA";
const FUENTE_TIPO = "ultrapanamatrailseries";

interface EventoJsonLd {
  name: string;
  startDate: string;
  endDate?: string;
  location?: { address?: { addressLocality?: string } };
}

function parsearJsonLd(html: string): EventoJsonLd | null {
  const bloque = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!bloque) return null;
  try {
    return JSON.parse(bloque[1].trim());
  } catch {
    return null;
  }
}

// El nombre trae el año y la sede pegados (ej. "... 2026 | Boquete");
// la distancia insignia de la serie es el ultra de 80K (la que se
// destaca en la descripción de cada edición), con la media (42K) y
// corta (25K) como categorías hermanas habituales de la serie.
const DISTANCIAS_SERIE: { km: number; tipo: TipoDistancia }[] = [
  { km: 80, tipo: TipoDistancia.ULTRA },
  { km: 42, tipo: TipoDistancia.MARATON },
  { km: 25, tipo: TipoDistancia.KM_25 },
];

function aCarreraExterna(datos: EventoJsonLd): CarreraExterna | null {
  const fecha = new Date(`${datos.startDate}T08:00:00Z`);
  if (isNaN(fecha.getTime())) return null;

  const { pais, continente } = paisDesdeCodigoIso(CODIGO_PAIS);
  const ciudad = datos.location?.address?.addressLocality || "Panamá";

  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: "Ultra Panamá Trail Series (inscripción vía RaceResult)",
    fuenteUrl: URL_EVENTO,
    externalId: ID_EVENTO_RACERESULT,
    nombre: datos.name,
    ciudad,
    pais,
    codigoPais: CODIGO_PAIS,
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: "https://ultrapanamatrailseries.com",
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: `${URL_EVENTO}registration`,
    distancias: DISTANCIAS_SERIE.map((d) => ({ tipo: d.tipo, km: d.km, terreno: "TRAIL" as const })),
  };
}

export async function correrCollectorUltraPanamaTrailSeries() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    const res = await fetch(URL_EVENTO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`RaceResult (Ultra Panamá Trail Series) respondió ${res.status}`);
    const html = await res.text();
    const datos = parsearJsonLd(html);
    const externa = datos && aCarreraExterna(datos);

    if (!externa) {
      return { nuevas: 0, actualizadas: 0, errores: 1 };
    }

    try {
      const { creada } = await upsertCarreraExterna(externa);
      return creada ? { nuevas: 1, actualizadas: 0, errores: 0 } : { nuevas: 0, actualizadas: 1, errores: 0 };
    } catch {
      return { nuevas: 0, actualizadas: 0, errores: 1 };
    }
  });
}
