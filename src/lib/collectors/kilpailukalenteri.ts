import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de kilpailukalenteri.fi, el calendario electrónico
// OFICIAL de Suomen Urheiluliitto (SUL, la federación finlandesa de
// atletismo) — "sisältää kaikki Suomen Urheiluliiton hyväksymät
// kilpailut" (contiene todas las competencias aprobadas por la
// federación). robots.txt solo prohíbe /seura/, /seurat/, /admin/,
// /sul_v2/ y /y* — nada de eso lo pisa esta ruta de búsqueda
// (?cs=21 y ?cs=16), así que está permitido.
//
// El calendario completo mezcla TODO el atletismo (pista, campo a
// través, marcha, mítines de clubes de niños...), así que se usa el
// propio filtro de "Luokitus" (clasificación) del buscador del sitio
// con el valor acl[]=8, que corresponde a "Maantiekisat" (carreras de
// ruta) — se identificó mirando las <option> del <select name="acl[]">
// en la página de búsqueda (?cs=20). Con ese filtro puesto, el
// resultado ya es limpio: maratones, medias maratones y carreras de
// calle reales (Paavo Nurmi Marathon, Finlandia Maraton, Vantaan
// Maraton, Midnight Run Helsinki, etc.), sin mítines de pista.
//
// La lista de resultados no trae distancia ni ciudad limpia, así que
// por cada carrera se pide también su página de detalle (?cs=16&nid=)
// para sacar la ciudad, el sitio web del organizador y las distancias
// ofrecidas. Como el filtro de ruta deja pocas carreras (unas 20-30
// por temporada), alcanza con una petición extra por carrera.

const BASE_URL = "https://www.kilpailukalenteri.fi/";
const COLLECTOR_ID = "kilpailukalenteri";

interface FilaBusqueda {
  fechaTexto: string; // "DD.MM.YY" o "DD.MM – DD.MM.YY"
  nid: string;
  nombre: string;
  ciudadLista: string;
}

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&aring;/g, "å")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Aring;/g, "Å")
    .replace(/&ndash;/g, "–")
    .trim();
}

const FILA_REGEX =
  /<tr>\s*<td>([^<]*)<\/td>\s*<td>maantie<\/td>\s*<td>\s*<a href="\?cs=16&nid=(\d+)">([^<]*)<\/a>\s*<\/td>\s*<td>([^<]*)<\/td>/g;

function parsearBusqueda(html: string): FilaBusqueda[] {
  const filas: FilaBusqueda[] = [];
  const re = new RegExp(FILA_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    filas.push({
      fechaTexto: decodificarHtml(m[1]).trim(),
      nid: m[2],
      nombre: decodificarHtml(m[3]),
      ciudadLista: decodificarHtml(m[4]).trim(),
    });
  }
  return filas;
}

// "08.08.26" o "14.08 – 15.08.26" (rango: toma el primer día, el año
// va siempre pegado a la última fecha del rango).
function fechaDesdeTexto(texto: string): Date | null {
  const m = texto.match(/^(\d{1,2})\.(\d{1,2})(?:\s*[–-]\s*\d{1,2}\.\d{1,2})?\.(\d{2,4})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  let anio = Number(m[3]);
  if (anio < 100) anio += 2000;
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T09:00:00Z`);
}

interface DetalleFinlandia {
  ciudad: string;
  sitioWeb: string | null;
  km: number;
}

async function traerDetalle(nid: string): Promise<DetalleFinlandia> {
  const url = `${BASE_URL}?cs=16&nid=${nid}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
  });
  if (!res.ok) throw new Error(`kilpailukalenteri.fi (detalle) respondió ${res.status}`);
  const html = await res.text();

  const venueM = html.match(/<tr class="hakuotsikko">\s*<th>[^<]*<\/th><th>([^<]*)<\/th>/);
  const venue = venueM ? decodificarHtml(venueM[1]) : "";
  const ciudad = venue.split(",")[0]?.trim() || "";

  const wwwM = html.match(/WWW<\/strong><\/td><td><a target="_blank" href="([^"]*)"/);
  const sitioWeb = wwwM ? decodificarHtml(wwwM[1]).trim() : null;

  const sarjatM = html.match(/Sarjat\/Lajit<\/strong><\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/);
  const sarjatTexto = sarjatM ? sarjatM[1].replace(/<[^>]+>/g, " ") : "";
  const km = kmDesdeTexto(sarjatTexto);

  return { ciudad, sitioWeb, km };
}

// Junta números "X km" sueltos + palabras "maraton"/"puolimaraton" (que
// no vienen con el número de km al lado) y se queda con la distancia
// más larga ofrecida, igual que otros collectors del repo (laufen).
function kmDesdeTexto(texto: string): number {
  const minusc = texto.toLowerCase();
  const numeros = [...minusc.matchAll(/(\d+(?:[.,]\d+)?)\s*km/g)].map((m) => parseFloat(m[1].replace(",", ".")));
  if (/puolimaraton|puoli\s*maraton/.test(minusc)) numeros.push(21.0975);
  if (/(?<!puoli)maraton/.test(minusc.replace(/puolimaraton/g, ""))) numeros.push(42.195);
  return numeros.length ? Math.max(...numeros) : 0;
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

function aCarreraExterna(fila: FilaBusqueda, detalle: DetalleFinlandia): CarreraExterna | null {
  const fecha = fechaDesdeTexto(fila.fechaTexto);
  if (!fecha || !fila.nombre) return null;

  const urlEvento = `${BASE_URL}?cs=16&nid=${fila.nid}`;
  const ciudad = detalle.ciudad || fila.ciudadLista || "Finlandia";
  const inscripcion = detalle.sitioWeb || urlEvento;

  return {
    fuenteTipo: "kilpailukalenteri",
    fuenteNombre: "Kilpailukalenteri.fi — Suomen Urheiluliitto",
    fuenteUrl: urlEvento,
    externalId: fila.nid,
    nombre: fila.nombre,
    ciudad,
    pais: "Finlandia",
    codigoPais: "FI",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: inscripcion,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: inscripcion,
    distancias: [{ tipo: tipoDistanciaDesdeKm(detalle.km), km: detalle.km, terreno: "ASFALTO" }],
  };
}

async function buscarCarrerasDeRuta(): Promise<FilaBusqueda[]> {
  const anioActual = new Date().getFullYear();
  const url =
    `${BASE_URL}?cs=21&npa=0&nka=0&nva=${anioActual}&npl=0&nkl=0&nvl=${anioActual + 1}` + `&acl%5B%5D=8`;
  const res = await fetch(url, {
    headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
  });
  if (!res.ok) throw new Error(`kilpailukalenteri.fi (búsqueda) respondió ${res.status}`);
  const html = await res.text();
  return parsearBusqueda(html);
}

export async function correrCollectorKilpailukalenteri() {
  return registrarEjecucion(COLLECTOR_ID, async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const filas = await buscarCarrerasDeRuta();
    // Por si el mismo nid aparece dos veces en el listado (pasa con
    // carreras de varios días, cada jornada puede salir como fila
    // aparte apuntando al mismo evento).
    const vistos = new Set<string>();

    for (const fila of filas) {
      const clave = normalizar(fila.nid);
      if (vistos.has(clave)) continue;
      vistos.add(clave);

      try {
        const detalle = await traerDetalle(fila.nid);
        const externa = aCarreraExterna(fila, detalle);
        if (!externa) continue;
        const { creada } = await upsertCarreraExterna(externa);
        if (creada) nuevas++;
        else actualizadas++;
      } catch {
        errores++;
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    return { nuevas, actualizadas, errores };
  });
}
