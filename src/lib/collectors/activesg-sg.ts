import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de ActiveSG Circle (activesgcircle.gov.sg), el portal
// oficial de eventos deportivos de Sport Singapore (SportSG) — el
// organismo estatutario del gobierno de Singapur a cargo del deporte
// (bajo el Ministry of Culture, Community and Youth). No es un
// agregador comercial tipo JustRunLah o RunSociety: es la propia
// autoridad deportiva nacional publicando su calendario de eventos,
// que incluye tanto programas propios como carreras "independently
// organised" dadas de alta por los organizadores (2XU Compression Run,
// Income Eco Run, Great Green Run, Great Eastern Women's Run, la
// maratón nacional, etc.) — mucho más volumen que AIMS (que solo trae
// la maratón nacional certificada).
//
// Singapore Athletics (singaporeathletics.org.sg), la federación de
// atletismo, se descartó porque es una SPA en React sin datos en el
// HTML servido (ver aims-sg.ts); ActiveSG Circle sí sirve datos vía un
// endpoint JSON.
//
// robots.txt de activesgcircle.gov.sg (sitio en HubSpot CMS) solo
// bloquea /activehealth/*, /_hcms/preview/, /hs/manage-preferences/,
// /hs/preferences-center/ y query params de preview/cache-buster — no
// restringe /things-to-do/events ni el endpoint /_hcms/api/, así que
// se usa ese mismo endpoint JSON que consume la página pública (se
// encontró inspeccionando el JS del sitio: template_events-schedule-
// v2.min.js hace POST a /_hcms/api/evnetsCalendarData con
// {date, filter, type, search}). Devuelve JSON ya estructurado, más
// confiable que parsear HTML.
//
// El campo "type" filtra por categoría del sitio: "Runs" trae carreras
// de running propiamente dichas; "Races" mezcla running con
// triatlón/duatlón/acuatlón, así que se consultan ambas categorías y
// se filtra por el propio nombre del evento (debe mencionar "run" o
// "marathon"), descartando así el resto sin necesidad de listas de
// exclusión.
//
// El parámetro "date" funciona como filtro "desde esta fecha en
// adelante" (start_date >= date); se pide desde el 1 de enero del año
// actual para traer el año completo de un solo llamado por categoría.

const URL_BASE = "https://www.activesgcircle.gov.sg/things-to-do/events";
const URL_API = "https://www.activesgcircle.gov.sg/_hcms/api/evnetsCalendarData";
const CODIGO_PAIS = "SG";
const FUENTE_TIPO = "activesg_sg";
const TIPOS_A_CONSULTAR = ["Runs", "Races"];

interface PropiedadesEvento {
  hs_object_id?: string;
  event_title?: string;
  event_path?: string;
  description_long?: string;
  description_short?: string;
  start_date?: string;
  end_date?: string;
  fees?: string;
  registration_url?: string | null;
  published?: string;
}

interface EventoApi {
  id?: string;
  properties?: PropiedadesEvento;
}

function quitarHtml(texto: string): string {
  return texto
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&rsquo;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

// Extrae todas las distancias mencionadas en el título + descripción
// del evento (ej. "Featuring a headline 21.1KM Half Marathon, alongside
// the 10KM Run, 5KM Run and 670M Kids Dash"). "Half marathon" se saca
// aparte primero para que la palabra "marathon" que queda dentro no se
// cuente además como maratón completa.
function distanciasDesdeTexto(texto: string): number[] {
  let t = texto.toLowerCase();
  const kms = new Set<number>();

  if (/half[\s-]*marathon|media\s*marat[oó]n/.test(t)) {
    kms.add(21.0975);
    t = t.replace(/half[\s-]*marathon/g, "");
  }
  if (/\bmarathon\b/.test(t)) kms.add(42.195);

  const regexKm = /(\d{1,3}(?:\.\d+)?)\s*km\b/g;
  let m: RegExpExecArray | null;
  while ((m = regexKm.exec(t))) {
    const km = parseFloat(m[1]);
    if (km < 0.5 || km > 100) continue;
    // Evita duplicados casi iguales, tipo tener 21.0975 (de "half
    // marathon") Y 21.1 (del propio texto "21.1KM") como si fueran dos
    // distancias distintas.
    const yaExiste = [...kms].some((existente) => Math.abs(existente - km) < 0.3);
    if (!yaExiste) kms.add(km);
  }

  if (kms.size === 0) return [0];
  return [...kms].sort((a, b) => a - b);
}

function precioDesdeFees(fees: string | undefined): number | undefined {
  if (!fees) return undefined;
  const m = fees.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : undefined;
}

function aCarreraExterna(evento: EventoApi): CarreraExterna | null {
  const p = evento.properties;
  if (!p || p.published !== "true") return null;

  const externalId = p.hs_object_id ?? evento.id;
  const nombre = p.event_title?.trim();
  if (!externalId || !nombre || !p.start_date) return null;

  // Solo nos interesan las carreras de running propiamente dichas: el
  // filtro "Races" del sitio también trae triatlón/duatlón/acuatlón,
  // que quedan descartados acá al no mencionar "run"/"marathon" en el
  // título (ej. "Youth Aquathlon League", "T100 Singapore").
  if (!/run|marathon/i.test(nombre)) return null;

  const fecha = new Date(p.start_date);
  if (Number.isNaN(fecha.getTime())) return null;

  const { pais, continente } = paisDesdeCodigoIso(CODIGO_PAIS);
  const textoCompleto = `${nombre} ${quitarHtml(p.description_long ?? p.description_short ?? "")}`;
  const kms = distanciasDesdeTexto(textoCompleto);

  const sitioWeb =
    p.registration_url && /^https?:\/\//.test(p.registration_url)
      ? p.registration_url
      : `${URL_BASE}/${p.event_path ?? ""}`;

  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: "ActiveSG Circle — Sport Singapore (SportSG)",
    fuenteUrl: URL_BASE,
    externalId,
    nombre,
    ciudad: pais,
    pais,
    codigoPais: CODIGO_PAIS,
    continente,
    lat: 0,
    lng: 0,
    sitioWeb,
    anio: fecha.getFullYear(),
    fecha,
    precioDesde: precioDesdeFees(p.fees),
    moneda: p.fees ? "SGD" : undefined,
    urlInscripcionOficial: sitioWeb,
    distancias: kms.map((km) => ({ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" as const })),
  };
}

async function obtenerEventos(tipo: string, desdeMs: number): Promise<EventoApi[]> {
  const res = await fetch(URL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)",
    },
    body: JSON.stringify({ date: desdeMs, filter: "All", type: tipo, search: "" }),
  });
  if (!res.ok) throw new Error(`ActiveSG Circle (${tipo}) respondió ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function correrCollectorActiveSgSg() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    const anioActual = new Date().getUTCFullYear();
    const desdeMs = Date.UTC(anioActual, 0, 1);

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;
    const vistos = new Set<string>();

    for (const tipo of TIPOS_A_CONSULTAR) {
      let eventos: EventoApi[];
      try {
        eventos = await obtenerEventos(tipo, desdeMs);
      } catch {
        errores++;
        continue;
      }

      for (const evento of eventos) {
        try {
          const externa = aCarreraExterna(evento);
          if (!externa) continue;
          if (vistos.has(externa.externalId)) continue;
          vistos.add(externa.externalId);

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
