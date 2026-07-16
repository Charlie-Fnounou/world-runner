import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de EQ Timing (live.eqtiming.com) para Suecia. Misma
// plataforma nórdica que usa el collector hermano "eqtiming-no" (ver
// ahí la explicación completa de por qué es una fuente primaria y qué
// dice el robots.txt) — acá lo único que cambia es el país. Se
// confirma que es fuente primaria porque el campo "Organization.Name"
// de las carreras suecas es literalmente "Svenska Friidrottsförbundet"
// (la federación sueca de atletismo).

const URL_API = "https://live.eqtiming.com/api/Events";
const PAIS_ISO = "SE";
const COLLECTOR_ID = "eqtiming-se";

// Mismos sportIds del grupo "Athletics" (id 15) que usa eqtiming-no.
const SPORT_IDS = [
  79, 80, 273, 380, 397, 410, 416, 424, 454, 451, 452, 453, 417, 435, 436, 437, 438, 440, 439, 441, 442, 443, 444,
  445, 446, 447, 78, 46,
];

interface CountryEq {
  Iso2: string;
}

interface EventoEq {
  Id: number;
  Name: string;
  Starttime: string;
  Signup: { Active: boolean; ExternalUrl: string | null; Cancelled: boolean };
  Organization: { Name: string; Country: CountryEq };
  City: { Name: string; Country: CountryEq; Coordinate: { Latitude: number; Longitude: number } };
  Published: boolean;
  Date: string;
  Race: Record<string, { Distance: number }>;
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

function fechaYYYYMMDDHHmm(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}+${pad(d.getHours())}%3A${pad(d.getMinutes())}`;
}

async function traerEventos(): Promise<EventoEq[]> {
  const hoy = new Date();
  const enDieciochoMeses = new Date(hoy.getTime());
  enDieciochoMeses.setMonth(enDieciochoMeses.getMonth() + 18);

  const url =
    `${URL_API}?query=&dateFrom=${fechaYYYYMMDDHHmm(hoy)}&dateTo=${fechaYYYYMMDDHHmm(enDieciochoMeses)}` +
    `&organizationId=0&regionIds=&levelIds=&sportIds=${SPORT_IDS.join(",")}` +
    `&take=1000&dateSort=true&desc=false&onlyValidated=false&onlyshowfororganizer=false&organizerIds=&graded=false&racequality=false`;

  const res = await fetch(url, {
    headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
  });
  if (!res.ok) throw new Error(`EQ Timing respondió ${res.status}`);
  return res.json();
}

function aCarreraExterna(ev: EventoEq): CarreraExterna | null {
  if (!ev.Published) return null;
  if (ev.Signup?.Cancelled) return null;
  if (ev.City?.Country?.Iso2 !== PAIS_ISO) return null;
  if (!ev.Name || !ev.Starttime) return null;

  const fecha = new Date(ev.Starttime);
  if (isNaN(fecha.getTime())) return null;

  const distanciaM = ev.Race?.["0"]?.Distance ?? 0;
  const km = distanciaM > 0 ? distanciaM / 1000 : 0;
  const urlEvento = `https://live.eqtiming.com/${ev.Id}`;
  const inscripcion = ev.Signup?.ExternalUrl || urlEvento;
  const lat = ev.City.Coordinate?.Latitude || 0;
  const lng = ev.City.Coordinate?.Longitude || 0;

  return {
    fuenteTipo: "eqtiming-se",
    fuenteNombre: "EQ Timing — Svenska Friidrottsförbundet",
    fuenteUrl: urlEvento,
    externalId: String(ev.Id),
    nombre: ev.Name,
    ciudad: ev.City.Name || "Suecia",
    pais: "Suecia",
    codigoPais: "SE",
    continente: "EUROPA",
    lat,
    lng,
    sitioWeb: urlEvento,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: inscripcion,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorEqTimingSe() {
  return registrarEjecucion(COLLECTOR_ID, async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const eventos = await traerEventos();

    for (const ev of eventos) {
      try {
        const externa = aCarreraExterna(ev);
        if (!externa) continue;
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
