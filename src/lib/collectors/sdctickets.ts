import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de SDC Tickets (sdctickets.do), plataforma dominicana de
// inscripción a carreras (organizador/timing directo). HTML server-
// rendered, robots.txt totalmente permisivo ("Disallow:" vacío).

const BASE_URL = "https://www.sdctickets.do";
const URL_HOME = `${BASE_URL}/`;

const MESES: Record<string, number> = {
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dic: 12,
};

interface FilaSdc {
  id: string;
  nombre: string;
  fecha: string;
}

const FILA_REGEX =
  /<div class="inners">\s*<img loader-src="[^"]*evento\/(\d+)\/imagen">\s*<div class="inner-info">\s*<h4><span>(?:<!-- comment 1 -->)?\s*([\s\S]*?)\s*<em>[\s\S]*?<label>Fecha: <\/label>\s*([^<]*?)\s*<\/p>/g;

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
}

function parsearFilas(html: string): FilaSdc[] {
  const filas: FilaSdc[] = [];
  const re = new RegExp(FILA_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    filas.push({ id: m[1], nombre: decodificarHtml(m[2]), fecha: m[3].trim() });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  // "domingo 19 jul., 2026"
  const m = texto.match(/(\d{1,2})\s+([a-záéíóúñ]{3})\.?,?\s+(\d{4})/i);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = MESES[m[2].toLowerCase()];
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00Z`);
}

function aCarreraExterna(fila: FilaSdc): CarreraExterna | null {
  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha || !fila.nombre) return null;

  const urlCompleta = `${BASE_URL}/detail/${fila.id}`;

  return {
    fuenteTipo: "sdctickets",
    fuenteNombre: "SDC Tickets",
    fuenteUrl: urlCompleta,
    externalId: fila.id,
    nombre: fila.nombre,
    ciudad: "República Dominicana",
    pais: "República Dominicana",
    codigoPais: "DO",
    continente: "AMERICA_CENTRAL",
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlCompleta,
    distancias: [{ tipo: TipoDistancia.OTRA, km: 0, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorSdcTickets() {
  return registrarEjecucion("sdctickets", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_HOME, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`SDC Tickets respondió ${res.status}`);
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
