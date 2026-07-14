import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de Timing Ecuador (timingecuador.com/carreras.php),
// empresa ecuatoriana de cronometraje (organizador/proveedor directo).
// HTML simple (PHP clásico), sin robots.txt que lo prohíba.

const BASE_URL = "https://www.timingecuador.com";
const URL_CARRERAS = `${BASE_URL}/carreras.php`;

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

interface FilaTimingEc {
  fecha: string;
  id: string;
  nombre: string;
}

const FILA_REGEX =
  /<h2 class="text-thin"><b>([^<]*)<\/b><\/h2>[\s\S]*?href="carrera\.php\?id=(\d+)">[\s\S]*?<h2 class="text-thin">([^<]*)<\/h2>/g;

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

function parsearFilas(html: string): FilaTimingEc[] {
  const filas: FilaTimingEc[] = [];
  const re = new RegExp(FILA_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    filas.push({ fecha: m[1].trim(), id: m[2], nombre: decodificarHtml(m[3]) });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  const m = texto.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = MESES[m[2].toLowerCase()];
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00Z`);
}

function aCarreraExterna(fila: FilaTimingEc): CarreraExterna | null {
  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha || !fila.nombre) return null;

  const urlCompleta = `${BASE_URL}/carrera.php?id=${fila.id}`;

  return {
    fuenteTipo: "timingecuador",
    fuenteNombre: "Timing Ecuador",
    fuenteUrl: urlCompleta,
    externalId: fila.id,
    nombre: fila.nombre,
    ciudad: "Ecuador",
    pais: "Ecuador",
    codigoPais: "EC",
    continente: "AMERICA_DEL_SUR",
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlCompleta,
    distancias: [{ tipo: TipoDistancia.OTRA, km: 0, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorTimingEcuador() {
  return registrarEjecucion("timingecuador", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_CARRERAS, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Timing Ecuador respondió ${res.status}`);
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
