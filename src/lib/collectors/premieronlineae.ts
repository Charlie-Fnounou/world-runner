import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de Premier Online (premieronline.com), la plataforma de
// inscripción a eventos deportivos con base en Dubái que usan
// directamente organizadores y clubes de EAU (incluida la propia UAE
// Athletics Federation, que publica ahí eventos como "Global Running
// Day with UAE Athletics Federation") — no es un agregador tipo
// Ahotu/Finishers que solo enlaza a otros sitios: acá la inscripción
// se hace en el propio Premier Online. robots.txt solo bloquea
// /cf.php y /xml, /calendar y /event están permitidos.
//
// /calendar/<año> trae, server-rendered, TODAS las carreras de ese
// año (running y de otros deportes, y de varios países del Golfo:
// EAU, Omán, además de algunos eventos internacionales) en una tabla
// con mes/día, nombre+link, y "Ciudad, Emirato Día-semana, hora" con
// una bandera <img alt="UAE"|"Oman"|...>. Se filtra por
// alt="UAE" para quedarnos solo con Emiratos Árabes Unidos.
//
// No trae columna de distancia aparte (la celda "e-dis-tag" viene
// vacía) — se intenta sacar la distancia del propio nombre del
// evento (ej. "16k,10k,5k,3k", "Half Marathon"), y si no aparece
// ningún número se cae a OTRA en vez de adivinar.
//
// Se piden dos años (el actual y el siguiente) para cubrir carreras
// futuras sin depender de en qué mes del año se corra el recolector.

const BASE_URL = "https://www.premieronline.com";

const DIAS_SEMANA = "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday";

interface FilaPremier {
  mes: string; // "JAN".."DEC"
  dia: number;
  nombre: string;
  href: string;
  ciudad: string;
}

const MESES: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

function extraerFilasUae(html: string): FilaPremier[] {
  const bloques = html.split(/(?=<tr id="month_)/);
  const filas: FilaPremier[] = [];

  for (const bloque of bloques) {
    if (!bloque.includes('alt="UAE"')) continue;

    const fechaM = bloque.match(/<span class="month">([A-Z]{3})<\/span>\s*<span class="day">(\d+)<\/span>/);
    const tituloM = bloque.match(/<h4><a href="([^"]+)">([^<]+)<\/a><\/h4>/);
    const ciudadM = bloque.match(new RegExp(`alt="UAE"[^>]*>\\s*([\\s\\S]+?)\\s+(?:${DIAS_SEMANA})`));
    if (!fechaM || !tituloM) continue;

    filas.push({
      mes: fechaM[1],
      dia: Number(fechaM[2]),
      href: tituloM[1],
      nombre: decodificarHtml(tituloM[2]),
      ciudad: ciudadM ? decodificarHtml(ciudadM[1]).replace(/,\s*$/, "") : "",
    });
  }

  return filas;
}

// Distancias tipo "16k,10k,5k,3k" o "Half Marathon" dentro del
// nombre del evento — se sacan todos los números seguidos de "k"/"km"
// que aparezcan; si no hay ninguno, se cae a OTRA.
function distanciasDesdeNombre(nombre: string): { tipo: TipoDistancia; km: number; terreno: "ASFALTO" }[] {
  const matches = [...nombre.matchAll(/(\d+(?:\.\d+)?)\s*k(?:m)?\b/gi)];
  if (!matches.length) return [{ tipo: TipoDistancia.OTRA, km: 0, terreno: "ASFALTO" }];

  const kms = [...new Set(matches.map((m) => parseFloat(m[1])))];
  return kms.map((km) => ({ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" as const }));
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

// El calendario mezcla running con otros deportes (triatlón, ciclismo,
// natación, remo...); se descartan por nombre ya que no hay categoría
// aparte en la tabla.
const PALABRAS_EXCLUIDAS = /triathlon|duathlon|aquathlon|cycling|\bbike\b|\bride\b|swim|\bswimming\b|rowing|paddle|kayak/i;

function aCarreraExterna(f: FilaPremier, anio: number): CarreraExterna | null {
  const mes = MESES[f.mes];
  if (!mes || !f.dia || !f.nombre) return null;
  if (PALABRAS_EXCLUIDAS.test(f.nombre)) return null;
  const fecha = new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(f.dia).padStart(2, "0")}T08:00:00Z`);

  const idM = f.href.match(/_(\d+)$/);
  const externalId = idM ? idM[1] : normalizar(f.href).replace(/[^a-z0-9]+/g, "-").slice(0, 140);

  return {
    fuenteTipo: "premieronline_ae",
    fuenteNombre: "Premier Online",
    fuenteUrl: `${BASE_URL}/calendar`,
    externalId,
    nombre: f.nombre,
    ciudad: f.ciudad || "Emiratos Árabes",
    pais: "Emiratos Árabes",
    codigoPais: "AE",
    continente: "ASIA",
    lat: 0,
    lng: 0,
    sitioWeb: f.href,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: f.href,
    distancias: distanciasDesdeNombre(f.nombre),
  };
}

export async function correrCollectorPremierOnlineAe() {
  return registrarEjecucion("premieronline_ae", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const anioActual = new Date().getFullYear();

    for (const anio of [anioActual, anioActual + 1]) {
      try {
        const res = await fetch(`${BASE_URL}/calendar/${anio}`, {
          headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
        });
        if (!res.ok) continue;
        const html = await res.text();
        const filas = extraerFilasUae(html);

        for (const fila of filas) {
          try {
            const externa = aCarreraExterna(fila, anio);
            if (!externa) continue;
            const { creada } = await upsertCarreraExterna(externa);
            if (creada) nuevas++;
            else actualizadas++;
          } catch {
            errores++;
          }
        }
      } catch {
        errores++;
      }
    }

    return { nuevas, actualizadas, errores };
  });
}
