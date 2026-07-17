import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de Running Calendar Australia (runningcalendar.com.au),
// calendario comunitario de carreras australianas (running, trail,
// multideporte) — los organizadores cargan sus propios eventos vía
// "/contact/add-event/", igual que Corro (Argentina) ya usado en este
// repo. No es un revendedor de inscripciones de terceros como Ahotu:
// es un listado curado, gratis, sin login.
//
// robots.txt (verificado) solo bloquea /ads/, /auth/, /contact/,
// /nearby/, /profile/ y /x/ para "*" — /calendar/ y /event/ están
// permitidos.
//
// La portada /calendar/ trae server-rendered los 100 próximos eventos
// (de un total ~860+) con fecha, ubicación y categoría en HTML plano.
// Las páginas siguientes (?page=2, ?page=3...) SÍ existen como links,
// pero se cargan por JavaScript del lado del cliente (el HTML crudo
// de esas URLs no trae los eventos) — se comprobó con fetch directo.
// Por eso este collector se queda solo con la primera página: no hace
// falta cursor porque en cada corrida trae de nuevo los eventos más
// próximos, que es lo que más importa mantener actualizado.
//
// El sitio mezcla running/walk con triatlón, duatlón, adventure race,
// etc. — se filtra por la etiqueta "Run/Walk" que trae cada evento.

const URL_CALENDARIO = "https://www.runningcalendar.com.au/calendar/";
const BASE_URL = "https://www.runningcalendar.com.au";

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

const ESTADOS_AU = new Set(["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]);

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
  // "Friday, 17 July 2026" (el día de la semana al principio se ignora)
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
  if (partes.length === 0) return "Australia";
  const ultimo = partes[partes.length - 1].toUpperCase();
  // El último tramo suele ser el estado (ej. "NSW", "QLD"); si es así,
  // la ciudad real es el tramo anterior.
  if (ESTADOS_AU.has(ultimo) && partes.length >= 2) {
    return partes[partes.length - 2];
  }
  return partes[partes.length - 1];
}

function kmDesdeNombre(nombre: string): number {
  const n = nombre.toLowerCase();
  if (/half[\s-]?marathon/.test(n)) return 21.0975;
  if (/marathon/.test(n)) return 42.195;
  const m = n.match(/(\d+(?:\.\d+)?)\s*k(?:m)?\b/);
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

function aCarreraExterna(fila: FilaRunningCalendar): CarreraExterna | null {
  if (!fila.tags.some((t) => t.toLowerCase() === "run/walk")) return null;

  const fecha = fechaDesdeTexto(fila.fechaTexto);
  if (!fecha || !fila.nombre) return null;

  const urlCompleta = fila.href.startsWith("http") ? fila.href : `${BASE_URL}${fila.href}`;
  const km = kmDesdeNombre(fila.nombre);
  const esTrail = /trail/i.test(fila.nombre) || /trail/i.test(fila.ubicacion);
  const { pais, continente } = paisDesdeCodigoIso("AU");

  return {
    fuenteTipo: "runningcalendar-au",
    fuenteNombre: "Running Calendar Australia",
    fuenteUrl: urlCompleta,
    externalId: fila.id,
    nombre: fila.nombre,
    ciudad: ciudadDesdeUbicacion(fila.ubicacion),
    pais,
    codigoPais: "AU",
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

export async function correrCollectorRunningCalendarAu() {
  return registrarEjecucion("runningcalendar-au", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_CALENDARIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Running Calendar Australia respondió ${res.status}`);
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
