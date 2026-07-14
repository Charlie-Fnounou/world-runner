import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de MaratónGuate (maratonguate.com), productora deportiva
// guatemalteca (organizador directo, no agregador). HTML server-
// rendered (WordPress/Divi), robots.txt permisivo.

const URL_HOME = "https://maratonguate.com/";

const MESES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

interface FilaMaratonGuate {
  nombre: string;
  fecha: string;
  lugar: string | null;
}

function decodificarHtml(texto: string): string {
  return texto
    .replace(/<br\s*\/?>/g, " ")
    .replace(/&#8211;/g, "-")
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// El párrafo de fecha/lugar es lo más fácil de anclar (formato fijo);
// el título se busca hacia atrás en el <h1> más cercano, porque el
// HTML generado por Divi a veces no cierra el <p> correctamente.
const FECHA_REGEX =
  /<p><strong>FECHA:<\/strong>\s*([^<]*)<br[^>]*>\s*(?:<strong>HORA:<\/strong>[^<]*<br[^>]*>\s*)?(?:<strong>LUGAR:<\/strong>\s*([^<]*))?/g;

function parsearFilas(html: string): FilaMaratonGuate[] {
  const filas: FilaMaratonGuate[] = [];
  const re = new RegExp(FECHA_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const antes = html.slice(Math.max(0, m.index - 300), m.index);
    const h1 = antes.match(/<h1>([\s\S]*?)<\/h1>\s*$/);
    if (!h1) continue;
    filas.push({ nombre: decodificarHtml(h1[1]), fecha: m[1].trim(), lugar: m[2] ? decodificarHtml(m[2]) : null });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  // "19 de julio 2026" (un solo "de", sin repetir antes del año)
  const m = texto.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+(\d{4})/i);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = MESES[m[2].toLowerCase()];
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00Z`);
}

function aCarreraExterna(fila: FilaMaratonGuate): CarreraExterna | null {
  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha || !fila.nombre) return null;

  const externalId = `${fila.fecha}-${fila.nombre}`.slice(0, 150);

  return {
    fuenteTipo: "maratonguate",
    fuenteNombre: "MaratónGuate",
    fuenteUrl: URL_HOME,
    externalId,
    nombre: fila.nombre,
    ciudad: fila.lugar?.split(",")[0]?.trim() || "Guatemala",
    pais: "Guatemala",
    codigoPais: "GT",
    continente: "AMERICA_CENTRAL",
    lat: 0,
    lng: 0,
    sitioWeb: URL_HOME,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: URL_HOME,
    distancias: [{ tipo: TipoDistancia.OTRA, km: 0, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorMaratonGuate() {
  return registrarEjecucion("maratonguate", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_HOME, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`MaratónGuate respondió ${res.status}`);
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
