import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de Singletree Events Ceylon Pvt Ltd (singletreeevents.com),
// organizador oficial srilanqués detrás de la serie "Run for Sri
// Lanka" (Nestomalt) y de la Kandy Half Marathon — fuente primaria: es
// el propio sitio oficial del organizador de las carreras, no un
// agregador. Se complementa con aims-lk.ts (que solo trae la LSR
// Colombo Marathon, la única carrera de Sri Lanka certificada por
// AIMS); estas carreras de Singletree no están certificadas por AIMS
// así que no se pisan entre sí (fuenteTipo distinto).
//
// robots.txt de singletreeevents.com no bloquea /event/ ni los
// wp-sitemaps (solo /wp-admin/, uploads de WooCommerce y URLs de
// carrito de compra). Se usa el sitemap propio de WordPress
// (wp-sitemap-posts-event-1.xml, tipo de post "event" del plugin The
// Events Calendar) para listar todas las carreras sin adivinar URLs, y
// se lee el bloque JSON-LD (schema.org/Event) que cada página trae
// embebido con nombre, fecha y precio.
//
// El campo "location" del JSON-LD viene con datos placeholder sin usar
// (ej. "New York, NY, USA" en la carrera de Kandy) así que no es
// confiable — la ciudad se obtiene en cambio buscando el nombre de una
// ciudad srilanquesa conocida dentro del propio nombre del evento
// (todas las carreras de esta fuente llevan la ciudad en el título).
// Las distancias se sacan de las menciones "N km" que trae la
// descripción (todas ofrecen los mismos 4 recorridos: 21.1/10/5/2 km).

const URL_SITEMAP = "https://singletreeevents.com/wp-sitemap-posts-event-1.xml";
const PAIS = "Sri Lanka";
const CODIGO_PAIS = "LK";
const FUENTE_TIPO = "singletree_lk";
const FUENTE_NOMBRE = "Singletree Events Ceylon (singletreeevents.com)";

const CIUDADES: Record<string, string> = {
  colombo: "Colombo",
  galle: "Galle",
  jaffna: "Jaffna",
  kandy: "Kandy",
  negombo: "Negombo",
};

interface EventoSingletree {
  externalId: string;
  urlPagina: string;
  nombre: string;
  fecha: Date;
  ciudad: string;
  precio?: number;
  moneda?: string;
  urlInscripcion?: string;
  distancias: number[];
}

function ciudadDesdeNombre(nombre: string): string {
  const nombreMin = nombre.toLowerCase();
  for (const [clave, valor] of Object.entries(CIUDADES)) {
    if (nombreMin.includes(clave)) return valor;
  }
  return PAIS;
}

function distanciasDesdeTexto(texto: string): number[] {
  const matches = [...texto.matchAll(/(\d{1,2}(?:\.\d+)?)\s*km/gi)];
  const kms = matches
    .map((m) => parseFloat(m[1]))
    .filter((n) => n > 0 && n <= 42.5);
  return [...new Set(kms)];
}

// Alguna carrera de esta serie (ej. la de Jaffna) todavía no publicó
// su lista completa de distancias en la descripción, pero el propio
// nombre del evento ya adelanta la distancia principal ("... HALF
// MARATHON" / "... MARATHON") — mismo criterio que aims-lk.ts para no
// perder la carrera solo porque la página no detalla las categorías
// menores (10K/5K/2K) todavía.
function distanciaDesdeNombre(nombre: string): number[] {
  if (/half\s*marathon/i.test(nombre)) return [21.0975];
  if (/marathon/i.test(nombre)) return [42.195];
  return [];
}

function extraerUrlsDelSitemap(xml: string): string[] {
  return [...xml.matchAll(/<loc>(https:\/\/singletreeevents\.com\/event\/[^<]+)<\/loc>/g)].map((m) => m[1]);
}

// El bloque JSON-LD de estas páginas trae la descripción con saltos de
// línea reales sin escapar dentro del string, lo que lo vuelve JSON
// inválido (JSON.parse falla con "Bad control character"). Se sacan
// los campos con regex en vez de parsear el bloque entero, siguiendo
// la misma convención del resto de los collectors del proyecto.
function extraerBloqueEvento(html: string): string | null {
  const bloques = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  for (const bloque of bloques) {
    const texto = bloque[1];
    if (texto.includes('"@type": "Event"') || texto.includes('"@type":"Event"')) return texto;
  }
  return null;
}

async function parsearEvento(url: string): Promise<EventoSingletree | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
  });
  if (!res.ok) return null;
  const html = await res.text();

  const bloque = extraerBloqueEvento(html);
  if (!bloque) return null;

  const nombre = bloque.match(/"name":\s*"([^"]*)"/)?.[1]?.replace(/&#8211;/g, "–").trim() || "";
  const startDate = bloque.match(/"startDate":\s*"([^"]*)"/)?.[1] || "";
  const descripcion = bloque.match(/"description":\s*"([\s\S]*?)"\s*,\s*\n?\s*"offers"/)?.[1] || "";
  if (!nombre || !startDate) return null;

  // Solo nos interesan carreras de calle: se descarta cualquier evento
  // que no mencione running/marathon ni traiga distancias en km (esta
  // fuente también podría, en el futuro, listar eventos de otro rubro
  // bajo la misma categoría "sport").
  const esCarrera = /marathon|\brun\b|running/i.test(nombre) || /marathon|\brun\b|running/i.test(descripcion);
  const distancias = distanciasDesdeTexto(descripcion);
  const distanciasFinal = distancias.length > 0 ? distancias : distanciaDesdeNombre(nombre);
  if (!esCarrera || distanciasFinal.length === 0) return null;

  const fecha = new Date(startDate);
  if (Number.isNaN(fecha.getTime())) return null;

  const precioTexto = bloque.match(/"offers":[\s\S]*?"price":\s*"([^"]*)"/)?.[1];
  const moneda = bloque.match(/"offers":[\s\S]*?"priceCurrency":\s*"([^"]*)"/)?.[1];
  const urlInscripcion = bloque.match(/"offers":[\s\S]*?"url":\s*"([^"]*)"/)?.[1]?.replace(/\\\//g, "/");
  const precio = precioTexto ? parseFloat(precioTexto) : undefined;

  const externalId = url.replace(/\/$/, "").split("/").pop() || url;

  return {
    externalId,
    urlPagina: url,
    nombre,
    fecha,
    ciudad: ciudadDesdeNombre(nombre),
    precio,
    moneda,
    urlInscripcion,
    distancias: distanciasFinal,
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

function aCarreraExterna(ev: EventoSingletree): CarreraExterna {
  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: FUENTE_NOMBRE,
    fuenteUrl: ev.urlPagina,
    externalId: ev.externalId,
    nombre: ev.nombre,
    ciudad: ev.ciudad,
    pais: PAIS,
    codigoPais: CODIGO_PAIS,
    continente: "ASIA",
    lat: 0,
    lng: 0,
    sitioWeb: ev.urlPagina,
    anio: ev.fecha.getFullYear(),
    fecha: ev.fecha,
    precioDesde: ev.precio,
    moneda: ev.moneda,
    urlInscripcionOficial: ev.urlInscripcion || ev.urlPagina,
    distancias: ev.distancias.map((km) => ({ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" as const })),
  };
}

export async function correrCollectorSingletreeLk() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    const res = await fetch(URL_SITEMAP, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Singletree Events (sitemap) respondió ${res.status}`);
    const xml = await res.text();
    const urls = extraerUrlsDelSitemap(xml);

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    for (const url of urls) {
      try {
        const evento = await parsearEvento(url);
        if (!evento) continue;
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
