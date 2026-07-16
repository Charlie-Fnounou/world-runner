import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de Uganda Athletics (ugandaathletics.org), la federación
// nacional de atletismo de Uganda, miembro de World Athletics. Es la
// fuente primaria correcta para Uganda: publica su propio calendario de
// eventos ("Events Calendar") en /events-calendar/, con fecha, lugar y
// link a cada evento.
//
// robots.txt de ugandaathletics.org (sitio WordPress) solo prohíbe
// /wp-admin/ (con excepción de admin-ajax.php) y algunas rutas de
// WooCommerce; no bloquea /events-calendar/ ni /event/.
//
// El calendario de Uganda Athletics mezcla carreras de calle abiertas
// al público (ej. "Source of the Nile Half Marathon") con competencias
// de pista solo para atletas federados (National Trials, National
// Championship, Cross Country Championship, "Over Distance", etc.) que
// no tienen sentido en un directorio de carreras para corredores
// aficionados. Por eso se filtra por nombre: solo se guardan eventos
// cuyo título menciona una distancia de ruta reconocible (maratón,
// media maratón o un número de km), que es la señal más confiable de
// que es una carrera abierta a inscripción pública y no una
// competencia federativa cerrada.
//
// La página usa el plugin WP Event Manager (wp-event-manager): el
// listado de próximos eventos viene renderizado en el HTML servido (sin
// necesidad de JavaScript) dentro de bloques
// <div class="event_listing post-ID ...">, con fecha en formato
// "YYYY-MM-DD @ HH:MM - YYYY-MM-DD @ HH:MM" y el lugar en un <span>
// aparte. El listado servido trae un máximo de ~10 eventos (el resto
// requiere el botón "Load more", que depende de JavaScript/AJAX y no
// se scrapea), así que este collector cubre los próximos eventos
// publicados, no el calendario completo del año.

const URL_CALENDARIO = "https://ugandaathletics.org/events-calendar/";
const FUENTE_TIPO = "ugandaathletics";

interface EventoListado {
  nombre: string;
  urlEvento: string;
  fecha: Date;
  ciudad: string;
}

function parsearEventos(html: string): EventoListado[] {
  const bloques = html.split('<div class="event_listing post-').slice(1);
  const eventos: EventoListado[] = [];

  for (const bloque of bloques) {
    const href = bloque.match(/<a href="(https:\/\/ugandaathletics\.org\/event\/[^"]+)"/)?.[1];
    const titulo = bloque.match(/<h3 class="wpem-heading-text">([^<]+)<\/h3>/)?.[1]?.trim();
    const fechaTexto = bloque.match(/wpem-event-date-time-text">\s*(\d{4}-\d{2}-\d{2})/)?.[1];
    const ubicacion = bloque.match(/wpem-event-location-text">\s*([^<]+?)\s*<\/span>/)?.[1]?.trim();
    if (!href || !titulo || !fechaTexto) continue;

    const fecha = new Date(`${fechaTexto}T09:00:00Z`);
    if (Number.isNaN(fecha.getTime())) continue;

    // El plugin trae la dirección completa ("Namboole National
    // Stadium, Stadium Round Rd, Kampala"); nos quedamos con el último
    // tramo (ciudad) para no meter direcciones enteras en el campo
    // ciudad.
    const ciudad = ubicacion ? ubicacion.split(",").pop()!.trim() : "";

    eventos.push({ nombre: titulo, urlEvento: href, fecha, ciudad: ciudad || "Kampala" });
  }
  return eventos;
}

// Solo nos interesan carreras de ruta abiertas al público (maratón,
// media maratón, o un "NNkm"); se descartan trials/campeonatos
// federativos que comparten el mismo calendario.
function esCarreraPublica(nombre: string): boolean {
  return /marathon|\d+\s?km\b/i.test(nombre);
}

function kmDesdeNombre(nombre: string): number {
  const n = nombre.toLowerCase();
  if (/half[\s-]?marathon/.test(n)) return 21.0975;
  if (/\bmarathon\b/.test(n)) return 42.195;
  const m = n.match(/(\d+(?:\.\d+)?)\s*km/);
  return m ? parseFloat(m[1]) : 0;
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

function aCarreraExterna(evento: EventoListado): CarreraExterna {
  const { pais, continente } = paisDesdeCodigoIso("UG");
  const km = kmDesdeNombre(evento.nombre);
  const slug = evento.urlEvento.replace(/\/$/, "").split("/").pop() || normalizar(evento.nombre).replace(/[^a-z0-9]+/g, "-");

  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: "Uganda Athletics Federation (calendario oficial)",
    fuenteUrl: URL_CALENDARIO,
    externalId: `${slug}-${evento.fecha.toISOString().slice(0, 10)}`,
    nombre: evento.nombre,
    ciudad: evento.ciudad,
    pais,
    codigoPais: "UG",
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: evento.urlEvento,
    anio: evento.fecha.getFullYear(),
    fecha: evento.fecha,
    urlInscripcionOficial: evento.urlEvento,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorUgandaAthletics() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_CALENDARIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`ugandaathletics.org respondió ${res.status}`);
    const html = await res.text();
    const eventos = parsearEventos(html).filter((e) => esCarreraPublica(e.nombre));

    for (const evento of eventos) {
      try {
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
