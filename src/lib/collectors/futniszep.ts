import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de Köridő (nevezes.futniszep.hu), plataforma húngara de
// cronometraje e inscripción usada directamente por decenas de
// organizadores de carreras (running, trail, OCR, duatlón...) para
// vender dorsales — no es un agregador comercial de terceros, cada
// carrera enlaza a su propia página de inscripción dentro de la misma
// plataforma (rutas "..._reg").
//
// Se investigó primero la Federación Húngara de Atletismo (MASZ,
// atletika.hu) pero su robots.txt bloquea TODO el sitio
// ("Disallow: /" para User-agent: *), así que se descartó. También se
// evaluaron futanet.hu (el sitio de un único organizador, BSI, cuyo
// robots.txt además bloquea explícitamente a "ClaudeBot") y sitios
// tipo "FutóversenyInfo"/"Futóversenyek" (agregadores que compilan
// carreras de terceros, el tipo de fuente que se pidió evitar).
//
// robots.txt de nevezes.futniszep.hu solo bloquea rutas de
// certificados, resultados, login y formularios de inscripción en sí
// (*_reg*, que de todas formas no se visitan: solo se guarda el link).
// La portada /events no está restringida y devuelve una tabla HTML
// simple (sin JS) con todas las carreras futuras (~46 al momento de
// escribir esto, sin paginación).

const URL_EVENTS = "https://nevezes.futniszep.hu/events";

const MESES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  maj: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  okt: 10,
  nov: 11,
  dec: 12,
};

interface FilaFutniszep {
  fecha: string; // "YYYY.MM.DD"
  href: string;
  nombre: string;
  lugar: string;
}

const FILA_REGEX =
  /<td align=center>(\d{4}\.\d{2}\.\d{2})<\/td>\s*<\/td>\s*<td><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/td>\s*<td[^>]*>([^<]*)<\/td>/g;

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "") // saca <span>VIRTUÁLIS</span> u otro marcado interno
    .trim();
}

function parsearFilas(html: string): FilaFutniszep[] {
  const filas: FilaFutniszep[] = [];
  const re = new RegExp(FILA_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    filas.push({
      fecha: m[1],
      href: m[2],
      nombre: decodificarHtml(m[3]),
      lugar: decodificarHtml(m[4]),
    });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  const m = texto.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (!anio || !mes || !dia) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T09:00:00Z`);
}

function esCarreraDePie(nombre: string, lugar: string): boolean {
  // La plataforma también lista eventos virtuales sin ubicación real
  // ("Bárhol" = "en cualquier lugar"); se descartan por no ser
  // carreras físicas verificables.
  if (/bárhol|barhol|online/i.test(lugar)) return false;
  if (/virtu[aá]lis/i.test(nombre)) return false;
  return true;
}

function kmDesdeTexto(texto: string): number {
  const m = texto.match(/(\d+(?:[.,]\d+)?)\s*km/i);
  return m ? parseFloat(m[1].replace(",", ".")) : 0;
}

function tipoDistanciaDesdeKm(km: number): TipoDistancia {
  if (km <= 0) return TipoDistancia.OTRA;
  if (km <= 6) return TipoDistancia.KM_5;
  if (km <= 12) return TipoDistancia.KM_10;
  if (km <= 17) return TipoDistancia.KM_15;
  if (km <= 22) return TipoDistancia.KM_20;
  if (km <= 27) return TipoDistancia.KM_25;
  if (km <= 35) return TipoDistancia.KM_30;
  if (km <= 43) return TipoDistancia.MARATON;
  return TipoDistancia.ULTRA;
}

function aCarreraExterna(fila: FilaFutniszep): CarreraExterna | null {
  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha || !fila.nombre || !esCarreraDePie(fila.nombre, fila.lugar)) return null;

  const urlCompleta = fila.href.startsWith("http") ? fila.href : `https:${fila.href}`;
  // El link de inscripción trae un id propio de evento, ej.
  // ".../2026VadkertiTo_reg" -> se usa como externalId estable.
  const externalId =
    urlCompleta.match(/\/(\d{4}[A-Za-z0-9]+)_reg/)?.[1] ??
    `${normalizar(fila.fecha)}-${normalizar(fila.nombre).replace(/[^a-z0-9]+/g, "-")}`.slice(0, 140);

  const km = kmDesdeTexto(fila.nombre) || kmDesdeTexto(fila.lugar);
  const esTrail = /trail|terep|hegy/i.test(fila.nombre);

  return {
    fuenteTipo: "futniszep",
    fuenteNombre: "Köridő (futniszep.hu)",
    fuenteUrl: URL_EVENTS,
    externalId,
    nombre: fila.nombre,
    ciudad: fila.lugar || "Hungría",
    pais: "Hungría",
    codigoPais: "HU",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlCompleta,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: esTrail ? "TRAIL" : "ASFALTO" }],
  };
}

export async function correrCollectorFutniszep() {
  return registrarEjecucion("futniszep", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_EVENTS, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Köridő (futniszep.hu) respondió ${res.status}`);
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
