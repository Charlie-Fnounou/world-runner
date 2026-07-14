import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de Asunción Runners (asuncionrunners.com/calendario.html),
// club/organizador de carreras en Paraguay. HTML server-rendered
// (plantilla estática), sin robots.txt (404 = sin restricciones).

const BASE_URL = "https://www.asuncionrunners.com";
const URL_CALENDARIO = `${BASE_URL}/calendario.html`;

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

interface FilaAsuncion {
  nombre: string;
  fecha: string; // "DD de Mes"
  lugar: string;
  href: string;
}

const FILA_REGEX =
  /<a href="([^"]+\.html)" class="member">\s*<img[^>]*>\s*<h4>([^<]*)<\/h4>\s*<span>(\d{1,2}) de ([A-Za-zÁÉÍÓÚáéíóú]+),\s*([^<]*)<\/span>/g;

function parsearFilas(html: string): FilaAsuncion[] {
  const filas: FilaAsuncion[] = [];
  const re = new RegExp(FILA_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    filas.push({ href: m[1], nombre: m[2].trim(), fecha: `${m[3]} de ${m[4]}`, lugar: m[5].trim() });
  }
  return filas;
}

function fechaDesdeTexto(texto: string, hoy: Date): Date | null {
  const m = texto.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)/i);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = MESES[m[2].toLowerCase()];
  if (!dia || !mes) return null;

  let anio = hoy.getFullYear();
  if (mes < hoy.getMonth() + 1 - 2) anio += 1;

  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00Z`);
}

function aCarreraExterna(fila: FilaAsuncion, hoy: Date): CarreraExterna | null {
  const fecha = fechaDesdeTexto(fila.fecha, hoy);
  if (!fecha || !fila.nombre) return null;

  const urlCompleta = `${BASE_URL}/${fila.href}`;
  const externalId = fila.href.replace(/\.html$/, "");

  return {
    fuenteTipo: "asuncionrunners",
    fuenteNombre: "Asunción Runners",
    fuenteUrl: urlCompleta,
    externalId,
    nombre: fila.nombre,
    ciudad: fila.lugar || "Asunción",
    pais: "Paraguay",
    codigoPais: "PY",
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

export async function correrCollectorAsuncionRunners() {
  return registrarEjecucion("asuncionrunners", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_CALENDARIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Asunción Runners respondió ${res.status}`);
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
