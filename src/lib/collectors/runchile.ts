import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de Runchile (runchile.cl/nuevo-calendario), calendario
// comunitario sin fines de lucro de carreras de Chile. Tabla HTML
// estática (plugin TablePress), sin robots.txt que lo prohíba.

const URL_CALENDARIO = "https://www.runchile.cl/nuevo-calendario/";

interface FilaRunchile {
  fecha: string;
  nombre: string;
  lugar: string;
  categoria: string;
  distanciasTexto: string;
  link: string | null;
}

const FILA_REGEX =
  /<tr class="row-\d+ (?:odd|even)">\s*<td class="column-1">([^<]*)<\/td><td class="column-2">([^<]*)<\/td><td class="column-3">([^<]*)<\/td><td class="column-4">([^<]*)<\/td><td class="column-5">([^<]*)<\/td><td class="column-6">([^<]*)<\/td><td class="column-7">([\s\S]*?)<\/td><td class="column-8">([\s\S]*?)<\/td><td class="column-9">([^<]*)<\/td>/g;

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&Iacute;/g, "Í")
    .trim();
}

function parsearFilas(html: string): FilaRunchile[] {
  const filas: FilaRunchile[] = [];
  const re = new RegExp(FILA_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const link = m[7].match(/href="([^"]+)"/)?.[1] ?? null;
    filas.push({
      fecha: decodificarHtml(m[1]),
      nombre: decodificarHtml(m[2]),
      lugar: decodificarHtml(m[3]),
      categoria: decodificarHtml(m[4]),
      distanciasTexto: decodificarHtml(m[5]),
      link: link ? decodificarHtml(link) : null,
    });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  // "DD/MM/YYYY" o "Del DD al DD/MM/YYYY" (rango -> toma el primer día)
  const m = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00Z`);
}

function ciudadDesdeLugar(lugar: string): string {
  const partes = lugar.split(",");
  return partes[0].trim() || "Chile";
}

function kmDesdeTexto(texto: string): number {
  const m = texto.match(/(\d+(?:[.,]\d+)?)\s*K/i);
  if (!m) return 0;
  return parseFloat(m[1].replace(",", "."));
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

function aCarreraExterna(fila: FilaRunchile): CarreraExterna | null {
  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha || !fila.nombre.trim()) return null;

  const km = kmDesdeTexto(fila.distanciasTexto);
  const esTrail = fila.categoria.toLowerCase().includes("trail");
  // No hay un id propio por carrera en esta tabla: se arma uno estable a
  // partir de la fecha + el nombre normalizado.
  const externalId = `${fila.fecha}-${normalizar(fila.nombre).replace(/[^a-z0-9]+/g, "-")}`.slice(0, 150);

  return {
    fuenteTipo: "runchile",
    fuenteNombre: "Runchile — Calendario",
    fuenteUrl: URL_CALENDARIO,
    externalId,
    nombre: fila.nombre,
    ciudad: ciudadDesdeLugar(fila.lugar),
    pais: "Chile",
    codigoPais: "CL",
    continente: "AMERICA_DEL_SUR",
    lat: 0,
    lng: 0,
    sitioWeb: fila.link ?? URL_CALENDARIO,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: fila.link ?? undefined,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: esTrail ? "TRAIL" : "ASFALTO" }],
  };
}

export async function correrCollectorRunchile() {
  return registrarEjecucion("runchile", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_CALENDARIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Runchile respondió ${res.status}`);
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
