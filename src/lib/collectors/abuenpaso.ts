import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de A Buen Paso (abuenpaso.cr), calendario comunitario de
// carreras de Costa Rica. HTML server-rendered, robots.txt vacío (sin
// restricciones).

const BASE_URL = "https://www.abuenpaso.cr";
const URL_CARRERAS = `${BASE_URL}/Race`;

const MESES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  setiembre: 9,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

interface FilaAbp {
  mes: string;
  dia: string;
  nombre: string;
  km: string;
  lugar: string;
  href: string;
}

function normalizarEspacios(html: string): string {
  return html
    .replace(/\r/g, "")
    .replace(/\s+>/g, ">")
    .replace(/>\s+/g, ">")
    .replace(/\s+</g, "<");
}

// El sitio a veces devuelve cada tarjeta como <div class="race boxSize5">
// con varios <a href> internos, y otras veces como un solo
// <a class="race boxSize5" href="..."> con <span> sueltos adentro (no
// depende de nuestro User-Agent, es inconsistencia del propio sitio) —
// por eso el parseo no asume un tag fijo: busca los marcadores de
// inicio de cada tarjeta/mes y extrae los <span> y el primer href de lo
// que hay entre un marcador y el siguiente.
function parsearFilas(html: string): FilaAbp[] {
  const normalizado = normalizarEspacios(html);
  const marcadorRe = /<a class="race month boxSize5"><span>([^<]*)<\/span>|<(?:a|div) class="race boxSize5"[^>]*>/g;
  const marcadores: { idx: number; fin: number; mes?: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = marcadorRe.exec(normalizado))) {
    marcadores.push({ idx: m.index, fin: m.index + m[0].length, mes: m[1] });
  }

  let mesActual = "";
  const filas: FilaAbp[] = [];
  for (let i = 0; i < marcadores.length; i++) {
    const mk = marcadores[i];
    if (mk.mes !== undefined) {
      mesActual = mk.mes;
      continue;
    }
    const finBloque = i + 1 < marcadores.length ? marcadores[i + 1].idx : normalizado.length;
    const bloque = normalizado.slice(mk.fin, finBloque);
    // Prioriza un href que sea realmente la ficha de una carrera
    // ("/Race/detail/N/slug"); una tarjeta puede traer otros links
    // sueltos adentro (ej. banners de entrenamiento) que no son la
    // carrera en sí.
    const href =
      bloque.match(/href="(\/Race\/detail\/[^"]*)"/)?.[1] ??
      normalizado.slice(mk.idx, mk.fin).match(/href="(\/Race\/detail\/[^"]*)"/)?.[1];
    const spans = [...bloque.matchAll(/<span[^>]*>([^<]*)<\/span/g)].map((s) => s[1].trim()).filter(Boolean);
    if (spans.length < 4 || !href) continue;
    const [dia, nombre, km, lugar] = spans;
    filas.push({ mes: mesActual, dia, nombre, km, lugar, href });
  }
  return filas;
}

function kmDesdeTexto(texto: string): number {
  // "5-10-21 km" -> toma la distancia más larga (suele ser la carrera insignia)
  const numeros = [...texto.matchAll(/(\d+(?:[.,]\d+)?)/g)].map((m) => parseFloat(m[1].replace(",", ".")));
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

function aCarreraExterna(fila: FilaAbp, anio: number): CarreraExterna | null {
  const mes = MESES[fila.mes.toLowerCase()];
  const dia = Number(fila.dia);
  if (!mes || !dia || !fila.nombre) return null;

  const fecha = new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00Z`);
  const km = kmDesdeTexto(fila.km);
  const externalId = fila.href.match(/\/Race\/detail\/(\d+)/)?.[1] ?? fila.href;
  const urlCompleta = `${BASE_URL}${fila.href}`;

  return {
    fuenteTipo: "abuenpaso",
    fuenteNombre: "A Buen Paso",
    fuenteUrl: urlCompleta,
    externalId,
    nombre: fila.nombre,
    ciudad: fila.lugar.split(",")[0].trim() || "Costa Rica",
    pais: "Costa Rica",
    codigoPais: "CR",
    continente: "AMERICA_CENTRAL",
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlCompleta,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorAbuenpaso() {
  return registrarEjecucion("abuenpaso", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_CARRERAS, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`A Buen Paso respondió ${res.status}`);
    const html = await res.text();
    const anio = new Date().getFullYear();
    const filas = parsearFilas(html);

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

    return { nuevas, actualizadas, errores };
  });
}
