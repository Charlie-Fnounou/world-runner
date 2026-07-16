import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de AIMS (Association of International Marathons and
// Distance Races, aims-worldrunning.org) para Canadá.
//
// Se buscó primero una fuente canadiense dedicada más completa que
// RunSignup (que ya trae algo de Canadá): se descartaron Race Roster
// (raceroster.com/search es una SPA — el HTML servido trae un
// <div id="js-search-wrapper"></div> vacío, todo se arma por JS sin
// datos en el HTML crudo), Sportstats (sportstats.ca redirige a
// sportstats.one, cuyo robots.txt bloquea explícitamente /api/, que es
// de donde sale toda la data — el resto del sitio es la misma SPA sin
// contenido servido), Athletics Canada (no expone un REST API de
// eventos — /wp-json/tribe/events/v1/events da 404 — y su calendario
// interactivo también requiere JS) y Road Running Canada
// (roadrunningcanada.ca/upcoming-races es solo un bloque de texto
// libre no estructurado, sin marcado consistente entre carreras, poco
// confiable para parsear con regex). AIMS terminó siendo la mejor
// fuente primaria disponible: no es un agregador comercial, es el
// organismo internacional que agrupa y certifica maratones y carreras
// de calle en más de 100 países, y cada carrera de su directorio es
// miembro propio dado de alta por el organizador.
//
// El robots.txt de aims-worldrunning.org prohíbe /events, /downloads,
// /my-books, /members, /footprints y /symposium, pero NO prohíbe
// /countries/ ni /races/ — así que se scrapea la página de directorio
// por país (/countries/19.html para Canadá; el ID de país se obtuvo
// navegando /directory.html) en vez de tocar el calendario
// (/calendar.html) o las tarjetas .ics de /events/, que sí están
// bloqueadas. Mismo patrón que los collectors hermanos aims-sa.ts,
// aims-th.ts, aims-vn.ts, aims-id.ts, aims-sg.ts, aims-cn.ts y
// aims-kr.ts.
//
// La ciudad no se puede sacar de forma confiable de la dirección de
// contacto del organizador (a veces es la oficina administrativa, no
// la sede de la carrera — ej. algunos casos en países hermanos traen
// una ciudad de otro país). Como Canadá trae solo 4 carreras conocidas
// y estables, se usa un mapa fijo externalId -> ciudad en vez de
// intentar parsear la dirección.

const ID_PAIS_AIMS = "19";
const URL_PAIS = `https://aims-worldrunning.org/countries/${ID_PAIS_AIMS}.html`;
const CODIGO_PAIS = "CA";
const FUENTE_TIPO = "aims_ca";

const CIUDADES: Record<string, string> = {
  "833": "Victoria",
  "849": "Toronto",
  "742": "Ottawa",
  "724": "Toronto",
};

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
  sitioWeb: string;
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
      nombre: cab[3].trim().replace(/&amp;/g, "&"),
      externalId: cab[2],
      urlRaza: cab[1],
      fecha,
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
  if (/half[\s-]+marathon/i.test(nombre)) return 21.0975;
  if (/marathon/i.test(nombre)) return 42.195;
  const m = nombre.match(/(\d{1,2})\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}

function aCarreraExterna(fila: FilaAims): CarreraExterna {
  const { pais, continente } = paisDesdeCodigoIso(CODIGO_PAIS);
  const km = distanciaDesdeNombre(fila.nombre);
  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: `AIMS — Association of International Marathons and Distance Races (${pais})`,
    fuenteUrl: URL_PAIS,
    externalId: fila.externalId,
    nombre: fila.nombre,
    ciudad: CIUDADES[fila.externalId] ?? pais,
    pais,
    codigoPais: CODIGO_PAIS,
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: fila.sitioWeb,
    anio: fila.fecha.getFullYear(),
    fecha: fila.fecha,
    urlInscripcionOficial: fila.sitioWeb,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorAimsCa() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    const res = await fetch(URL_PAIS, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`AIMS (Canadá) respondió ${res.status}`);
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
