import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de Hipereventos (hipereventos.com), plataforma venezolana
// de organización/inscripción de carreras. HTML server-rendered, sin
// robots.txt que bloquee la home (solo rutas técnicas internas).
//
// El listado mezcla eventos pasados y futuros sin separarlos, y trae
// otras categorías (Curso = workshop) que no son carreras — se filtra
// por categoría y por fecha futura.

const URL_HOME = "https://www.hipereventos.com/";

const CATEGORIAS_VALIDAS = new Set(["carrera", "multiples"]);

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

interface FilaHipereventos {
  tipo: string;
  id: string;
  nombre: string;
  fecha: string;
}

const FILA_REGEX =
  /work-v1-badge radius-3">([^<]*)<\/span>\s*<h2 class="work-v1-title"><a href="[^"]*eventos_id=(\d+)">([^<]*)<\/a><\/h2>[\s\S]*?Fecha: <\/strong><\/span>([^<]*)<br/g;

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

function parsearFilas(html: string): FilaHipereventos[] {
  const filas: FilaHipereventos[] = [];
  const re = new RegExp(FILA_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    filas.push({ tipo: m[1].trim(), id: m[2], nombre: decodificarHtml(m[3]), fecha: decodificarHtml(m[4]) });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  const m = texto.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+del?\s+(\d{4})/i);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = MESES[m[2].toLowerCase()];
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00Z`);
}

function aCarreraExterna(fila: FilaHipereventos, hoy: Date): CarreraExterna | null {
  if (!CATEGORIAS_VALIDAS.has(fila.tipo.toLowerCase())) return null;

  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha || fecha < hoy) return null;

  const urlCompleta = `${URL_HOME}index.php?route=evento/evento&eventos_id=${fila.id}`;

  return {
    fuenteTipo: "hipereventos",
    fuenteNombre: "Hipereventos",
    fuenteUrl: urlCompleta,
    externalId: fila.id,
    nombre: fila.nombre,
    ciudad: "Venezuela",
    pais: "Venezuela",
    codigoPais: "VE",
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

export async function correrCollectorHipereventos() {
  return registrarEjecucion("hipereventos", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_HOME, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Hipereventos respondió ${res.status}`);
    const html = await res.text();
    const hoy = new Date();
    const filas = parsearFilas(html);

    for (const fila of filas) {
      try {
        const externa = aCarreraExterna(fila, hoy);
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
