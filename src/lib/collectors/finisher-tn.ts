import { TipoDistancia, TipoTerreno } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de Finisher.tn, plataforma tunecina de inscripción y
// cronometraje para carreras de calle y trail (equivalente local a
// RunSignup/CarrerasPanama): los propios organizadores dan de alta sus
// eventos ahí para vender inscripciones (formulario de "Vérifier mon
// inscription", tarifas en TND por distancia, notificaciones de
// apertura). No es un agregador comercial de terceros como Ahotu o
// Finishers.com (a pesar del nombre parecido, es un sitio distinto): es
// el propio sitio donde corre el negocio de inscripción.
//
// robots.txt de finisher.tn permite todo salvo zonas privadas/admin
// (/admin, /mon-club, /runners/*, /organizer, /login, /panier, /checkout,
// etc.), ninguna de las cuales tocamos aquí. Se usa distinto fuenteTipo
// que aims-tn.ts para no chocar; al momento de escribir esto, ninguna de
// las carreras listadas en Finisher.tn coincide con el maratón COMAR de
// AIMS.
//
// La federación tunecina de atletismo (ftathletisme.tn) se investigó
// primero pero su calendario (calendar-results.php / competitions.php)
// tira un error fatal de base de datos ("Table ... doesn't exist"), así
// que no es una fuente scrapeable.

const URL_LISTADO = "https://finisher.tn/evenements";
const CODIGO_PAIS = "TN";
const FUENTE_TIPO = "finisher_tn";
const HEADERS = { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" };

interface EventoFinisher {
  externalId: string;
  nombre: string;
  fecha: Date;
  ciudad: string;
  sitioWeb: string;
  esTrail: boolean;
  kms: number[];
}

function extraerIdsListado(html: string): string[] {
  const ids = new Set<string>();
  for (const m of html.matchAll(/finisher\.tn\/event\/(\d+)/g)) {
    ids.add(m[1]);
  }
  return [...ids];
}

interface JsonLdSportsEvent {
  name?: string;
  startDate?: string;
  location?: {
    name?: string;
    address?: { addressLocality?: string; addressCountry?: string };
  };
}

function extraerJsonLd(html: string): JsonLdSportsEvent | null {
  const m = html.match(/<script type="application\/ld\+json">\s*(\{[\s\S]*?"@type":"SportsEvent"[\s\S]*?\})\s*<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as JsonLdSportsEvent;
  } catch {
    return null;
  }
}

// Distancia inferida del nombre de la carrera cuando la sección "Les
// distances" viene vacía (el organizador no cargó las sub-carreras
// todavía, solo dejó el título). Mismo criterio que carreraspanama.ts.
function distanciasDesdeNombre(nombre: string): number[] {
  if (/semi[\s-]*marathon|half[\s-]+marathon/i.test(nombre)) return [21.0975];
  if (/marathon(?!\s*(o|ien))/i.test(nombre)) return [42.195];
  const matches = [...nombre.matchAll(/(\d{1,2}(?:[.,]\d+)?)\s*[kK][mM]?(?!\w)/g)];
  const kms = matches.map((m) => parseFloat(m[1].replace(",", "."))).filter((n) => n > 0);
  return kms.length ? kms : [0];
}

function extraerDistancias(html: string): number[] {
  const seccion = html.match(/id="courses"[\s\S]*?<!-- Right sticky/);
  if (!seccion) return [];
  const kms = new Set<number>();
  for (const m of seccion[0].matchAll(/(\d{1,3}(?:[.,]\d+)?)\s*KM\b/gi)) {
    const km = parseFloat(m[1].replace(",", "."));
    if (km > 0) kms.add(km);
  }
  return [...kms];
}

async function obtenerEvento(id: string): Promise<EventoFinisher | null> {
  const url = `https://finisher.tn/event/${id}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const html = await res.text();

  const jsonLd = extraerJsonLd(html);
  if (!jsonLd?.name || !jsonLd.startDate) return null;

  const fecha = new Date(jsonLd.startDate);
  if (isNaN(fecha.getTime())) return null;

  const ciudadCruda = jsonLd.location?.address?.addressLocality || jsonLd.location?.name || "";
  const ciudad = ciudadCruda && ciudadCruda.toLowerCase() !== "tunisie" ? ciudadCruda.replace(/,\s*Tunisie$/i, "").trim() : "";

  let kms = extraerDistancias(html);
  if (kms.length === 0) kms = distanciasDesdeNombre(jsonLd.name);

  return {
    externalId: id,
    nombre: jsonLd.name.trim(),
    fecha,
    ciudad,
    sitioWeb: url,
    esTrail: /trail/i.test(jsonLd.name),
    kms,
  };
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

function aCarreraExterna(evento: EventoFinisher): CarreraExterna {
  const { pais, continente } = paisDesdeCodigoIso(CODIGO_PAIS);
  const terreno: TipoTerreno = evento.esTrail ? TipoTerreno.TRAIL : TipoTerreno.ASFALTO;
  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: "Finisher.tn",
    fuenteUrl: URL_LISTADO,
    externalId: evento.externalId,
    nombre: evento.nombre,
    ciudad: evento.ciudad || pais,
    pais,
    codigoPais: CODIGO_PAIS,
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: evento.sitioWeb,
    anio: evento.fecha.getFullYear(),
    fecha: evento.fecha,
    urlInscripcionOficial: evento.sitioWeb,
    distancias: evento.kms.map((km) => ({ tipo: tipoDistanciaDesdeKm(km), km, terreno })),
  };
}

export async function correrCollectorFinisherTn() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    const res = await fetch(URL_LISTADO, { headers: HEADERS });
    if (!res.ok) throw new Error(`Finisher.tn respondió ${res.status}`);
    const html = await res.text();
    const ids = extraerIdsListado(html);

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    for (const id of ids) {
      try {
        const evento = await obtenerEvento(id);
        if (!evento) {
          errores++;
          continue;
        }
        const { creada } = await upsertCarreraExterna(aCarreraExterna(evento));
        if (creada) nuevas++;
        else actualizadas++;
      } catch {
        errores++;
      }
    }

    return { nuevas, actualizadas, errores };
  });
}
