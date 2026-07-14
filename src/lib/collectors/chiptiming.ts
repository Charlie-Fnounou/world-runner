import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de Chiptiming Perú (chiptiming.com.pe), empresa peruana
// de cronometraje — organizador/proveedor directo de eventos (no
// agregador), HTML simple (PHP clásico), sin robots.txt.

const URL_EVENTOS = "https://chiptiming.com.pe/eventos.php";

// Grupos que sí son carreras a pie; se descartan Natación, Triatlón,
// Crossfit, Duatlón y Acuatlón.
const GRUPOS_VALIDOS = new Set(["running", "en provincias", "trail"]);

interface FilaChiptiming {
  grupo: string;
  fecha: string;
  url: string;
  nombre: string;
}

const FILA_REGEX =
  /<div class="grid-item" data-groups='\["([^"]*)"\]'>[\s\S]*?<a class="portfolio-sub-title" href="#">Fecha\s*:\s*([^<]*)<\/a>\s*<a class="portfolio-title" href="([^"]*)">([^<]*)<\/a>/g;

function parsearFilas(html: string): FilaChiptiming[] {
  const filas: FilaChiptiming[] = [];
  const re = new RegExp(FILA_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    filas.push({ grupo: m[1].trim(), fecha: m[2].trim(), url: m[3], nombre: m[4].trim() });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  // "DD-MM-AA"
  const m = texto.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = 2000 + Number(m[3]);
  if (!dia || !mes) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00Z`);
}

function aCarreraExterna(fila: FilaChiptiming): CarreraExterna | null {
  if (!GRUPOS_VALIDOS.has(fila.grupo.toLowerCase())) return null;

  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha) return null;

  const externalId = fila.url.match(/cod_evento=(\d+)/)?.[1] ?? fila.url;
  const urlCompleta = `https://chiptiming.com.pe/${fila.url}`;
  const esTrail = fila.grupo.toLowerCase() === "trail";

  return {
    fuenteTipo: "chiptiming",
    fuenteNombre: "Chiptiming Perú",
    fuenteUrl: urlCompleta,
    externalId,
    nombre: fila.nombre,
    ciudad: fila.grupo.toLowerCase() === "en provincias" ? "Perú" : "Lima",
    pais: "Perú",
    codigoPais: "PE",
    continente: "AMERICA_DEL_SUR",
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlCompleta,
    distancias: [{ tipo: TipoDistancia.OTRA, km: 0, terreno: esTrail ? "TRAIL" : "ASFALTO" }],
  };
}

export async function correrCollectorChiptiming() {
  return registrarEjecucion("chiptiming", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_EVENTOS, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Chiptiming respondió ${res.status}`);
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
