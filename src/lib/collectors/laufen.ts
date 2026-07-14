import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { prisma } from "@/lib/prisma";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de laufen.de, el calendario del DLV (Deutscher
// Leichtathletik-Verband, federación alemana de atletismo). La página
// /laufkalender carga los resultados por JavaScript, pero el endpoint
// que consulta (GET /dlv-laufkalender/ajax) devuelve JSON directo con
// TODAS las carreras futuras (más de 1000) sin necesitar navegador —
// no está bloqueado por robots.txt (solo bloquea /contao/, el backend
// del CMS).
//
// Como trae más de 1000 carreras de una sola vez, se procesa de a
// tandas (igual que RunSignup con sus páginas): se guarda en
// EstadoCollector hasta qué carrera se llegó la última corrida, y la
// siguiente sigue desde ahí, dando la vuelta cuando termina la lista.

const URL_AJAX = "https://www.laufen.de/dlv-laufkalender/ajax";
const BASE_URL = "https://www.laufen.de/";
const COLLECTOR_ID = "laufen";
const POR_CORRIDA = 250;

interface FilaLaufen {
  href: string;
  fecha: string; // "D.M.YYYY"
  nombre: string;
  lugar: string;
  distanciasTexto: string;
}

const TEASER_REGEX =
  /<a href="([^"]*)"[^>]*class="teaser event">[\s\S]*?<div class="date">([^<]*)<\/div>[\s\S]*?<div class="headline[^"]*">([^<]*)<\/div>[\s\S]*?<div class="location">([^<]*)<\/div>[\s\S]*?<div class="strecken">([\s\S]*?)<\/div>\s*<\/div>/g;

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

function parsearEventos(html: string): FilaLaufen[] {
  const filas: FilaLaufen[] = [];
  const re = new RegExp(TEASER_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    filas.push({
      href: m[1],
      fecha: m[2].trim(),
      nombre: decodificarHtml(m[3]),
      lugar: decodificarHtml(m[4]),
      distanciasTexto: m[5].replace(/<[^>]+>/g, " "),
    });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  const m = texto.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T10:00:00Z`);
}

function ciudadDesdeLugar(lugar: string): string {
  return lugar.replace(/^\d{4,5}\s*/, "").trim() || "Alemania";
}

function kmDesdeTexto(texto: string): number {
  const numeros = [...texto.matchAll(/(\d+(?:[.,]\d+)?)\s*Kilometer/gi)].map((m) => parseFloat(m[1].replace(",", ".")));
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

function aCarreraExterna(fila: FilaLaufen): CarreraExterna | null {
  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha || !fila.nombre) return null;

  const urlCompleta = fila.href.startsWith("http") ? fila.href : `${BASE_URL}${fila.href}`;
  const detalleId = fila.href.match(/laufkalender\/details\/([A-Za-z0-9]+)/)?.[1];
  const externalId = detalleId ?? `${normalizar(fila.fecha)}-${normalizar(fila.nombre).replace(/[^a-z0-9]+/g, "-")}`.slice(0, 140);
  const km = kmDesdeTexto(fila.distanciasTexto);

  return {
    fuenteTipo: "laufen",
    fuenteNombre: "laufen.de — DLV Laufkalender",
    fuenteUrl: urlCompleta,
    externalId,
    nombre: fila.nombre,
    ciudad: ciudadDesdeLugar(fila.lugar),
    pais: "Alemania",
    codigoPais: "DE",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlCompleta,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorLaufen() {
  return registrarEjecucion("laufen", async () => {
    const res = await fetch(URL_AJAX, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`laufen.de respondió ${res.status}`);
    const data = await res.json();
    const filas = parsearEventos(String(data.events ?? ""));

    const estado = await prisma.estadoCollector.findUnique({ where: { collector: COLLECTOR_ID } });
    let inicio = (estado?.cursor ?? -1) + 1;
    if (inicio >= filas.length) inicio = 0;

    const tanda = filas.slice(inicio, inicio + POR_CORRIDA);

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    for (const fila of tanda) {
      try {
        const externa = aCarreraExterna(fila);
        if (!externa) continue;
        const { creada } = await upsertCarreraExterna(externa);
        if (creada) nuevas++;
        else actualizadas++;
      } catch {
        errores++;
      }
    }

    const siguienteCursor = inicio + tanda.length - 1;
    await prisma.estadoCollector.upsert({
      where: { collector: COLLECTOR_ID },
      update: { cursor: siguienteCursor >= filas.length - 1 ? -1 : siguienteCursor },
      create: { collector: COLLECTOR_ID, cursor: siguienteCursor >= filas.length - 1 ? -1 : siguienteCursor },
    });

    return { nuevas, actualizadas, errores };
  });
}
