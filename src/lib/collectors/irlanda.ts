// Generado por el agente automático (ver scripts/agente-recolectores/) y
// revisado/probado a mano antes de conectarlo: 94 carreras nuevas, 0
// errores en la primera corrida real.

import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de Running Calendar Ireland (runningcalendar.ie),
// calendario de carreras irlandesas (running, trail, multideporte).
// Mismo formato hCalendar/vevent que Running Calendar Australia.
//
// La portada /calendar/ trae server-rendered los 100 próximos eventos
// con fecha, ubicación y categoría en HTML plano.
//
// robots.txt (verificado) bloquea una lista larga de bots conocidos
// (Ahrefs, Semrush, MJ12bot, GPTBot, etc.) pero NO a WorldRunnerBot —
// identificándose honestamente con nuestro propio User-Agent responde
// 200 sin problema. (Un User-Agent de navegador spoofeado daba 403 por
// motivos aparte, no relacionados con robots.txt — no hace falta ni
// corresponde disfrazarse.)
//
// El sitio mezcla running/walk con triatlón y multideporte — se filtra
// por la etiqueta "Run/Walk" que trae cada evento.

const URL_CALENDARIO = "https://www.runningcalendar.ie/calendar/";
const BASE_URL = "https://www.runningcalendar.ie";

const MESES: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

interface FilaRunningCalendar {
  id: string;
  href: string;
  nombre: string;
  fechaTexto: string;
  ubicacion: string;
  tags: string[];
}

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .replace(/&rsquo;/g, "'")
    .trim();
}

function tagsDesdeBloque(bloque: string): string[] {
  const tags: string[] = [];
  const re = /<span class="tag">(?:<i[^>]*><\/i>)?([^<]+)<\/span>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bloque))) tags.push(m[1].trim());
  return tags;
}

function parsearFilas(html: string): FilaRunningCalendar[] {
  const filas: FilaRunningCalendar[] = [];
  const re = /<li class="calendar__event vevent" data-id="(\d+)">([\s\S]*?)<\/li>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const id = m[1];
    const bloque = m[2];

    const enlace = bloque.match(/<a class="url calendar__event__link" href="([^"]+)">([^<]+)<\/a>/);
    if (!enlace) continue;

    const fechaM = bloque.match(/<span class="dtstart[^"]*">([^<]+)<\/span>/);
    const ubicacionM = bloque.match(/class="location">(?:<i[^>]*><\/i>)?([^<]+)<\/div>/);

    filas.push({
      id,
      href: enlace[1],
      nombre: decodificarHtml(enlace[2]),
      fechaTexto: fechaM ? fechaM[1].trim() : "",
      ubicacion: ubicacionM ? decodificarHtml(ubicacionM[1]) : "",
      tags: tagsDesdeBloque(bloque),
    });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  // "Wednesday, 12 August 2026"
  const m = texto.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = MESES[m[2].toLowerCase()];
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T10:00:00Z`);
}

function ciudadDesdeUbicacion(ubicacion: string): string {
  const partes = ubicacion
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (partes.length === 0) return "Ireland";
  // En Irlanda la primera parte suele ser la localidad/pueblo ("Castlepollard, Co. Westmeath")
  return partes[0];
}

function kmDesdeNombre(nombre: string): number {
  const n = nombre.toLowerCase();
  if (/half[\s-]?marathon/.test(n)) return 21.0975;
  if (/marathon/.test(n)) return 42.195;

  const mMillas = n.match(/(\d+(?:\.\d+)?)\s*mile(?:s)?\b/);
  if (mMillas) return parseFloat(mMillas[1]) * 1.60934;

  const mKm = n.match(/(\d+(?:\.\d+)?)\s*k(?:m)?\b/);
  return mKm ? parseFloat(mKm[1]) : 0;
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

function aCarreraExterna(fila: FilaRunningCalendar): CarreraExterna | null {
  if (!fila.tags.some((t) => t.toLowerCase() === "run/walk")) return null;

  const fecha = fechaDesdeTexto(fila.fechaTexto);
  if (!fecha || !fila.nombre) return null;

  const urlCompleta = fila.href.startsWith("http") ? fila.href : `${BASE_URL}${fila.href}`;
  const km = kmDesdeNombre(fila.nombre);
  const esTrail = /trail/i.test(fila.nombre) || /trail/i.test(fila.ubicacion);
  const { pais, continente } = paisDesdeCodigoIso("IE");

  return {
    fuenteTipo: "runningcalendar-ie",
    fuenteNombre: "Running Calendar Ireland",
    fuenteUrl: urlCompleta,
    externalId: fila.id,
    nombre: fila.nombre,
    ciudad: ciudadDesdeUbicacion(fila.ubicacion),
    pais,
    codigoPais: "IE",
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlCompleta,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: esTrail ? "TRAIL" : "ASFALTO" }],
  };
}

export async function correrCollectorRunningCalendarIe() {
  return registrarEjecucion("runningcalendar-ie", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_CALENDARIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Running Calendar Ireland respondió ${res.status}`);
    const html = await res.text();
    const filas = parsearFilas(html);

    for (const fila of filas) {
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

    return { nuevas, actualizadas, errores };
  });
}
