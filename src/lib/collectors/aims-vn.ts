import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de AIMS (Association of International Marathons and
// Distance Races, aims-worldrunning.org) para Vietnam. AIMS no es un
// agregador comercial: es el organismo internacional que agrupa y
// certifica maratones y carreras de calle en más de 100 países (el
// equivalente, para maratones, a lo que World Athletics es para
// atletismo en general) — cada carrera que aparece en su directorio es
// miembro propio de AIMS, dado de alta por el organizador de la
// carrera.
//
// El robots.txt de aims-worldrunning.org prohíbe /events, /downloads,
// /my-books, /members, /footprints y /symposium, pero NO prohíbe
// /countries/ ni /races/ — así que se scrapea la página de directorio
// por país (/countries/123.html para Vietnam; el ID de país se obtuvo
// una sola vez navegando /directory.html) en vez de tocar el
// calendario (/calendar.html) o las tarjetas .ics de /events/, que sí
// están bloqueadas.
//
// La ciudad se obtiene de la dirección de contacto del organizador (el
// único dato geográfico que trae la página) — para carreras conocidas
// suele coincidir con la sede real, pero no siempre (algunos
// organizadores tienen oficina en otra ciudad). La distancia se infiere
// del propio nombre de la carrera ("Marathon", "Half Marathon" o un
// número final tipo "10"/"21"), sin inventar datos que la página no
// trae.
//
// Ver también los collectors hermanos aims-th.ts, aims-id.ts y
// aims-sg.ts (misma fuente, mismo parser, distinto país).

const ID_PAIS_AIMS = "123";
const URL_PAIS = `https://aims-worldrunning.org/countries/${ID_PAIS_AIMS}.html`;
const PAIS = "Vietnam";
const CODIGO_PAIS = "VN";
const FUENTE_TIPO = "aims_vn";

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

interface FilaAims {
  nombre: string;
  externalId: string;
  urlRaza: string;
  fecha: Date;
  ciudad: string;
  sitioWeb: string;
}

function parsearDireccion(bloque: string): string {
  const m = bloque.match(/class="seven columns alpha">([\s\S]*?)<p class="(?:phone|email|web)"/);
  if (!m) return "";
  const lineas = m[1]
    .split(/<br\s*\/?>/)
    .map((l) => l.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const ultima = lineas[lineas.length - 1] ?? "";
  return ultima.replace(/\s+\d{4,6}$/, "").trim();
}

function parsearFecha(bloque: string): Date | null {
  const m = bloque.match(/Next (?:confirmed )?event:\s*([^<]+)/);
  if (!m) return null;
  const fm = m[1].match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!fm) return null; // "to be confirmed" u otro texto sin fecha concreta
  const dia = Number(fm[1]);
  const mes = MESES[fm[2].toLowerCase()];
  const anio = Number(fm[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T10:00:00Z`);
}

function parsearFilas(html: string): FilaAims[] {
  const bloques = html.split('<div class="rcdi row alpha rule">').slice(1);
  const filas: FilaAims[] = [];

  for (const bloque of bloques) {
    const cab = bloque.match(/<h3[^>]*><a href="(https:\/\/aims-worldrunning\.org\/races\/(\d+)\.html)">([^<]+)<\/a>/);
    if (!cab) continue;
    const fecha = parsearFecha(bloque);
    if (!fecha) continue;

    let sitioWeb = bloque.match(/<p class="web"><a href="([^"]+)">/)?.[1]?.trim() || cab[1];
    if (sitioWeb.startsWith("//")) sitioWeb = `https:${sitioWeb}`;

    filas.push({
      nombre: cab[3].trim(),
      externalId: cab[2],
      urlRaza: cab[1],
      fecha,
      ciudad: parsearDireccion(bloque) || PAIS,
      sitioWeb,
    });
  }
  return filas;
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

function distanciaDesdeNombre(nombre: string): number {
  if (/half\s+marathon/i.test(nombre)) return 21.0975;
  if (/marathon/i.test(nombre)) return 42.195;
  const m = nombre.match(/(\d{1,2})\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}

function aCarreraExterna(fila: FilaAims): CarreraExterna {
  const km = distanciaDesdeNombre(fila.nombre);
  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: `AIMS — Association of International Marathons and Distance Races (${PAIS})`,
    fuenteUrl: URL_PAIS,
    externalId: fila.externalId,
    nombre: fila.nombre,
    ciudad: fila.ciudad,
    pais: PAIS,
    codigoPais: CODIGO_PAIS,
    continente: "ASIA",
    lat: 0,
    lng: 0,
    sitioWeb: fila.sitioWeb,
    anio: fila.fecha.getFullYear(),
    fecha: fila.fecha,
    urlInscripcionOficial: fila.sitioWeb,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorAimsVn() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    const res = await fetch(URL_PAIS, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`AIMS (${PAIS}) respondió ${res.status}`);
    const html = await res.text();
    const filas = parsearFilas(html);

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    for (const fila of filas) {
      try {
        const { creada } = await upsertCarreraExterna(aCarreraExterna(fila));
        if (creada) nuevas++;
        else actualizadas++;
      } catch {
        errores++;
      }
    }

    return { nuevas, actualizadas, errores };
  });
}
