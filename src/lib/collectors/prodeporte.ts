import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de Prodeporte (prodeporte.com.uy/carreras/), listado de
// carreras de Uruguay. HTML server-rendered (WordPress/Elementor),
// robots.txt permisivo. No trae ubicación ni link de inscripción
// propio (solo nombre + fecha), así que la ciudad queda genérica.

const URL_CARRERAS = "https://prodeporte.com.uy/carreras/";

const FILA_REGEX =
  /elementor-gallery-item__title">\s*([^<]*)<\/div><div class="elementor-gallery-item__description">\s*([^<]*)<\/div>/g;

// Solo la pestaña "Próximas" (tag 0); "Anteriores" es tag 1.
const TAG_REGEX = /data-e-gallery-tags="(\d)"[^>]*>[\s\S]*?elementor-gallery-item__title">\s*([^<]*)<\/div><div class="elementor-gallery-item__description">\s*([^<]*)<\/div>/g;

interface FilaProdeporte {
  nombre: string;
  fecha: string;
}

function parsearFilas(html: string): FilaProdeporte[] {
  const filas: FilaProdeporte[] = [];
  const re = new RegExp(TAG_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[1] !== "0") continue; // descarta "Anteriores"
    filas.push({ nombre: m[2].trim(), fecha: m[3].trim() });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  // "29-03-26" o "10/05/2026"
  const m = texto.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  let anio = Number(m[3]);
  if (anio < 100) anio += 2000;
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00Z`);
}

function aCarreraExterna(fila: FilaProdeporte): CarreraExterna | null {
  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha || !fila.nombre) return null;

  const externalId = `${fila.fecha}-${fila.nombre}`.slice(0, 150);

  return {
    fuenteTipo: "prodeporte",
    fuenteNombre: "Prodeporte",
    fuenteUrl: URL_CARRERAS,
    externalId,
    nombre: fila.nombre,
    ciudad: "Montevideo",
    pais: "Uruguay",
    codigoPais: "UY",
    continente: "AMERICA_DEL_SUR",
    lat: 0,
    lng: 0,
    sitioWeb: URL_CARRERAS,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: URL_CARRERAS,
    distancias: [{ tipo: TipoDistancia.OTRA, km: 0, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorProdeporte() {
  return registrarEjecucion("prodeporte", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_CARRERAS, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Prodeporte respondió ${res.status}`);
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
