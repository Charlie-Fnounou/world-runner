import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de ethiopianrun.org, el sitio oficial del "Great Ethiopian
// Run" (GER), la organización fundada por Haile Gebrselassie que
// produce la carrera de ruta más grande de África (10K en Addis Abeba,
// ~45.000 corredores) y un puñado de carreras hermanas más chicas en
// otras ciudades etíopes durante el año.
//
// No encontramos una federación nacional con calendario público
// (Ethiopian Athletics Federation no tiene sitio propio con calendario
// de carreras de ruta abiertas al público; solo resultados de pista).
// GER es la fuente primaria más confiable: organiza las carreras
// directamente (no es un agregador de terceros).
//
// El sitio es una SPA (React/Vite) sin contenido en el HTML crudo,
// pero expone un endpoint JSON público que la propia SPA consume para
// pintar la lista de carreras próximas: GET /api/races/get/upcoming
// (se encontró inspeccionando el bundle JS del sitio, que referencia
// ese path junto con otros endpoints de contenido no relacionados con
// carreras, como /api/news o /api/gallery).
//
// robots.txt de ethiopianrun.org no existe (la ruta /robots.txt cae en
// el fallback de la SPA y devuelve el mismo index.html con 200, sin
// ninguna directiva Disallow real) — no hay restricción declarada.

const URL_API = "https://www.ethiopianrun.org/api/races/get/upcoming";
const URL_SITIO = "https://www.ethiopianrun.org/";

interface RaceApi {
  _id: string;
  raceName: string;
  raceDate: string; // ISO
  slug: string;
  raceType?: string;
  isAvaiable?: boolean;
}

interface RespuestaApi {
  success: boolean;
  count: number;
  data: RaceApi[];
}

function kmDesdeNombre(nombre: string): number {
  const n = nombre.toLowerCase();
  if (/half[\s-]?marathon/.test(n)) return 21.0975;
  if (/\bmarathon\b/.test(n)) return 42.195;
  const m = n.match(/(\d+(?:\.\d+)?)\s*km/);
  if (m) return parseFloat(m[1]);
  // La mayoría de las carreras de GER (incluida la insignia de Addis
  // Abeba) son 10K aunque el nombre no siempre lo diga explícito.
  return 10;
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

// GER no manda la ciudad en este endpoint, solo el nombre de la
// carrera. Varias de sus carreras "hermanas" llevan el nombre de la
// ciudad donde se corren (ej. "Great Harar Run" -> Harar); si no se
// reconoce ninguna, se asume Addis Abeba (donde vive la carrera
// insignia y la sede de la organización).
const CIUDADES_CONOCIDAS = ["Harar", "Hawassa", "Bahir Dar", "Mekelle", "Adama", "Dire Dawa", "Entoto"];

function ciudadDesdeNombre(nombre: string): string {
  for (const ciudad of CIUDADES_CONOCIDAS) {
    if (nombre.toLowerCase().includes(ciudad.toLowerCase())) {
      return ciudad === "Entoto" ? "Addis Abeba" : ciudad;
    }
  }
  return "Addis Abeba";
}

function aCarreraExterna(race: RaceApi): CarreraExterna | null {
  if (!race.raceName || !race.raceDate) return null;
  const fecha = new Date(race.raceDate);
  if (Number.isNaN(fecha.getTime())) return null;

  const nombre = race.raceName
    .split(" ")
    .map((p) => (p.length > 2 ? p[0] + p.slice(1).toLowerCase() : p.toLowerCase()))
    .join(" ");
  const km = kmDesdeNombre(race.raceName);
  const { pais, continente } = paisDesdeCodigoIso("ET");
  const urlRaza = `${URL_SITIO}race/${race.slug}`;

  return {
    fuenteTipo: "ethiopianrun",
    fuenteNombre: "Great Ethiopian Run (GER)",
    fuenteUrl: URL_SITIO,
    externalId: race._id || normalizar(race.slug || race.raceName).replace(/[^a-z0-9]+/g, "-"),
    nombre,
    ciudad: ciudadDesdeNombre(race.raceName),
    pais,
    codigoPais: "ET",
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: urlRaza,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlRaza,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorEthiopianRun() {
  return registrarEjecucion("ethiopianrun", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_API, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)", Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`ethiopianrun.org respondió ${res.status}`);
    const data = (await res.json()) as RespuestaApi;
    const races = Array.isArray(data?.data) ? data.data : [];

    for (const race of races) {
      try {
        const externa = aCarreraExterna(race);
        if (!externa) {
          errores++;
          continue;
        }
        const { creada } = await upsertCarreraExterna(externa);
        if (creada) nuevas++;
        else actualizadas++;
      } catch {
        errores++;
      }
    }

    return { nuevas, actualizadas, errores };
  });
}
