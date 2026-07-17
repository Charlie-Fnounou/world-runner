import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de EQ Timing (live.eqtiming.com) para Noruega. EQ Timing
// es la plataforma de cronometraje/inscripción que usa directamente
// Norges Friidrettsforbund (la federación noruega de atletismo) para
// publicar su calendario oficial de carreras — se confirma mirando el
// campo "Organization.Name" de cada evento devuelto por la API, que es
// literalmente "Norges Friidrettsforbund". No es un agregador
// comercial: es el sistema que la propia federación usa para que los
// clubes organizadores carguen sus carreras.
//
// El robots.txt de live.eqtiming.com solo prohíbe /api/Startlist/* (no
// /api/Events, que es el endpoint que usamos acá). La misma API
// devuelve TODOS los deportes que cronometra EQ Timing (esquí, biatlón,
// orientación...), así que se filtra por los sportIds que cuelgan del
// grupo "Athletics" (id 15) en /api/SportParents — quedan carreras de
// calle, montaña, trail y ultra ("Gateløp", "Terrengløp", "Motbakkeløp",
// "Fjell-løp", "Ultraløp", "Friidrott", etc.), sin necesitar tocar
// /api/Startlist.
//
// Vale la pena aclarar: el mismo sitio también trae carreras suecas
// (la federación sueca, Svenska Friidrottsförbundet, usa la misma
// plataforma) — ver el collector hermano "eqtiming-se". Dinamarca y
// Finlandia NO aparecen en EQ Timing (se probó con las organizaciones
// danesas/finlandesas registradas ahí y no hay carreras futuras), así
// que para esos dos países hacen falta fuentes separadas.

const URL_API = "https://live.eqtiming.com/api/Events";
const PAIS_ISO = "NO";
const COLLECTOR_ID = "eqtiming-no";
const CONCURRENCIA = 8; // upserts en simultáneo, para no tardar minutos con listados grandes

// SportIds que cuelgan del grupo padre "Athletics" (id 15) según
// /api/SportParents — disciplinas de carrera a pie (no esquí, no
// orientación, no ciclismo).
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
    // take=1000 traía ~400 carreras noruegas válidas por corrida, que a
    // ~7 consultas de base de datos cada una tardaba minutos — muy por
    // encima del límite de 60s del cron. Casi todo lo que devuelve la
    // API en esta ventana es de Noruega (poco mezclado con Suecia), así
    // que hay que bajar el take en serio, no solo a la mitad. Con
    // take=80 (ordenado por fecha, lo más próximo primero) entra en la
    // ventana de 60s.
    `&take=80&dateSort=true&desc=false&onlyValidated=false&onlyshowfororganizer=false&organizerIds=&graded=false&racequality=false`;

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
    fuenteTipo: "eqtiming-no",
    fuenteNombre: "EQ Timing — Norges Friidrettsforbund",
    fuenteUrl: urlEvento,
    externalId: String(ev.Id),
    nombre: ev.Name,
    ciudad: ev.City.Name || "Noruega",
    pais: "Noruega",
    codigoPais: "NO",
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

export async function correrCollectorEqTimingNo() {
  return registrarEjecucion(COLLECTOR_ID, async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const eventos = await traerEventos();

    for (let inicioLote = 0; inicioLote < eventos.length; inicioLote += CONCURRENCIA) {
      const lote = eventos.slice(inicioLote, inicioLote + CONCURRENCIA);
      const resultados = await Promise.all(
        lote.map(async (ev) => {
          try {
            const externa = aCarreraExterna(ev);
            if (!externa) return "salteada";
            const { creada } = await upsertCarreraExterna(externa);
            return creada ? "nueva" : "actualizada";
          } catch {
            return "error";
          }
        }),
      );
      for (const r of resultados) {
        if (r === "nueva") nuevas++;
        else if (r === "actualizada") actualizadas++;
        else if (r === "error") errores++;
      }
    }

    return { nuevas, actualizadas, errores };
  });
}
