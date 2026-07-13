import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de KMS (kms.fr), plataforma de inscripción a carreras
// avalada por la FFA (federación francesa de atletismo). El listado
// público (/v5/public/courses) trae, además de las tarjetas visibles,
// un índice de búsqueda oculto con TODAS las carreras en atributos
// data-* limpios (ciudad, departamento, tipo, fecha, link) — de ahí se
// parsea, sin hacer falta JavaScript. Sin robots.txt que lo prohíba.

const URL_COURSES = "https://www.kms.fr/v5/public/courses";

// Solo carreras a pie; se descartan Natación, Marcha Nórdica, Bicicleta, etc.
const TIPOS_VALIDOS = new Set(["course à pied", "trail", "ekiden"]);

interface FilaKms {
  depnom: string;
  ciudad: string;
  tipo: string;
  fecha: string;
  url: string;
  nombre: string;
}

const FILA_REGEX =
  /<span id="recherche"[^>]*\s+data-depnom="([^"]*)"\s+data-ville="([^"]*)"\s+data-depnum="[^"]*"\s+data-typcrs="([^"]*)"\s+data-date="([^"]*)">\s*<a href="([^"]*)"[^>]*>\s*([^<]*?)\s*<\/a>/g;

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

function parsearFilas(html: string): FilaKms[] {
  const filas: FilaKms[] = [];
  const re = new RegExp(FILA_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    filas.push({
      depnom: decodificarHtml(m[1]),
      ciudad: decodificarHtml(m[2]),
      tipo: decodificarHtml(m[3]),
      fecha: m[4],
      url: m[5],
      nombre: decodificarHtml(m[6]),
    });
  }
  return filas;
}

function paisDesdeDepartamento(depnom: string): { pais: string; continente: "EUROPA" | "AFRICA" } {
  if (/afrique/i.test(depnom)) {
    const pais = depnom.split("-").slice(1).join("-").trim() || "África";
    return { pais, continente: "AFRICA" };
  }
  return { pais: "Francia", continente: "EUROPA" };
}

function tipoDistanciaPorDefecto(tipo: string): TipoDistancia {
  return tipo.toLowerCase() === "ekiden" ? TipoDistancia.RELEVOS : TipoDistancia.OTRA;
}

function aCarreraExterna(fila: FilaKms): CarreraExterna | null {
  if (!TIPOS_VALIDOS.has(fila.tipo.toLowerCase())) return null;

  const fecha = new Date(fila.fecha.replace(" ", "T") + "Z");
  if (Number.isNaN(fecha.getTime())) return null;

  const externalId = fila.url.match(/courses\/(\d+)/)?.[1] ?? fila.url;
  const { pais, continente } = paisDesdeDepartamento(fila.depnom);
  const esTrail = fila.tipo.toLowerCase() === "trail";

  return {
    fuenteTipo: "kms",
    fuenteNombre: "KMS — Calendrier des courses",
    fuenteUrl: fila.url,
    externalId,
    nombre: fila.nombre,
    ciudad: fila.ciudad,
    pais,
    codigoPais: pais === "Francia" ? "FR" : undefined,
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: fila.url,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: fila.url,
    distancias: [{ tipo: tipoDistanciaPorDefecto(fila.tipo), km: 0, terreno: esTrail ? "TRAIL" : "ASFALTO" }],
  };
}

export async function correrCollectorKms() {
  return registrarEjecucion("kms", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_COURSES, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`KMS respondió ${res.status}`);
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
