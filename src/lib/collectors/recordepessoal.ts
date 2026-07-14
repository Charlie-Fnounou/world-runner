import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de Recorde Pessoal (recordepessoal.pt), calendario de
// carreras de Portugal. HTML server-rendered, robots.txt permisivo
// (solo bloquea /admin/). Cada evento aparece duplicado en el HTML
// (tarjeta + overlay al pasar el mouse) — se deduplica por href.

const URL_EVENTOS = "https://www.recordepessoal.pt/eventos";
const BASE_URL = "https://www.recordepessoal.pt";

const MESES: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  março: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

interface FilaRp {
  href: string;
  fecha: string;
  nombre: string;
  lugar: string;
}

const FILA_REGEX =
  /class="evento" data-evento="([^"]*)"[^>]*>[\s\S]*?<div class="data">\s*([^<]*?)\s*<\/div>\s*<div class="titulo">([^<]*)<\/div>\s*<div class="local">([^<]*)<\/div>/g;

// BTT = "Bicicleta Todo o Terreno" (mountain bike), no es running.
const PALABRAS_NO_RUNNING = /\bBTT\b/i;

function parsearFilas(html: string): FilaRp[] {
  const filas: FilaRp[] = [];
  const vistos = new Set<string>();
  const re = new RegExp(FILA_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (vistos.has(m[1])) continue;
    vistos.add(m[1]);
    filas.push({
      href: m[1],
      fecha: m[2].replace(/&nbsp;/g, " ").trim(),
      nombre: m[3].trim(),
      lugar: m[4].trim(),
    });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  const m = texto.match(/(\d{1,2})\s+([A-Za-zçÇ]+)\s+(\d{4})/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = MESES[m[2].toLowerCase()];
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T11:00:00Z`);
}

function aCarreraExterna(fila: FilaRp): CarreraExterna | null {
  if (PALABRAS_NO_RUNNING.test(fila.nombre)) return null;
  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha || !fila.nombre) return null;

  const urlCompleta = `${BASE_URL}${fila.href}`;
  const externalId = fila.href.replace(/^\/evento\//, "");
  const esTrail = /trail/i.test(fila.nombre);

  return {
    fuenteTipo: "recordepessoal",
    fuenteNombre: "Recorde Pessoal",
    fuenteUrl: urlCompleta,
    externalId,
    nombre: fila.nombre,
    ciudad: fila.lugar.split(",")[0].trim() || "Portugal",
    pais: "Portugal",
    codigoPais: "PT",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlCompleta,
    distancias: [{ tipo: TipoDistancia.OTRA, km: 0, terreno: esTrail ? "TRAIL" : "ASFALTO" }],
  };
}

export async function correrCollectorRecordePessoal() {
  return registrarEjecucion("recordepessoal", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_EVENTOS, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Recorde Pessoal respondió ${res.status}`);
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
