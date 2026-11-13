import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { prisma } from "@/lib/prisma";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de laufen.de, el calendario del DLV (Deutscher
// Leichtathletik-Verband, federación alemana de atletismo). La página
// /laufkalender carga los resultados por JavaScript, pero el endpoint
// que consulta (GET /dlv-laufkalender/ajax) devuelve JSON directo con
// TODAS las carreras futuras (más de 1000) sin necesitar navegador —
// no está bloqueado por robots.txt (solo bloquea /contao/, el backend
// del CMS).
//
// Como trae más de 1000 carreras de una sola vez, se procesa de a
// tandas (igual que RunSignup con sus páginas): se guarda en
// EstadoCollector hasta qué carrera se llegó la última corrida, y la
// siguiente sigue desde ahí, dando la vuelta cuando termina la lista.

// En noviembre de 2026 laufen.de movió el calendario: la ruta vieja
// (/dlv-laufkalender/ajax) da 404 y ahora es una búsqueda paginada por POST.
const URL_BUSQUEDA = "https://www.laufen.de/laufkalender/ajax/search";
const BASE_URL = "https://www.laufen.de/";
const COLLECTOR_ID = "laufen";
const PAGINAS_POR_CORRIDA = 15;

interface FilaLaufen {
  href: string;
  fecha: string; // "D.M.YYYY"
  nombre: string;
  lugar: string;
  distanciasTexto: string;
}

const TEASER_REGEX =
  /<a href="([^"]*)"[^>]*class="teaser event">[\s\S]*?<div class="date">([^<]*)<\/div>[\s\S]*?<div class="headline[^"]*">([^<]*)<\/div>[\s\S]*?<div class="location">([^<]*)<\/div>[\s\S]*?<div class="strecken">([\s\S]*?)<\/div>\s*<\/div>/g;

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

function parsearEventos(html: string): FilaLaufen[] {
  const filas: FilaLaufen[] = [];
  const re = new RegExp(TEASER_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    filas.push({
      href: m[1],
      fecha: m[2].trim(),
      nombre: decodificarHtml(m[3]),
      lugar: decodificarHtml(m[4]),
      distanciasTexto: m[5].replace(/<[^>]+>/g, " "),
    });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  const m = texto.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T10:00:00Z`);
}

function ciudadDesdeLugar(lugar: string): string {
  return lugar.replace(/^\d{4,5}\s*/, "").trim() || "Alemania";
}

function kmDesdeTexto(texto: string): number {
  const numeros = [...texto.matchAll(/(\d+(?:[.,]\d+)?)\s*Kilometer/gi)].map((m) => parseFloat(m[1].replace(",", ".")));
  return numeros.length ? Math.max(...numeros) : 0;
}

function tipoDistanciaDesdeKm(km: number): TipoDistancia {
  if (km <= 0) return TipoDistancia.OTRA;
  if (km <= 6) return TipoDistancia.KM_5;
  if (km <= 12) return TipoDistancia.KM_10;
  if (km <= 17) return TipoDistancia.KM_15;
  if (km <= 20.5) return TipoDistancia.KM_20;
  if (km <= 22) return TipoDistancia.MEDIA_MARATON;
  if (km <= 27) return TipoDistancia.KM_25;
  if (km <= 35) return TipoDistancia.KM_30;
  if (km <= 43) return TipoDistancia.MARATON;
  return TipoDistancia.ULTRA;
}

export function aCarreraExterna(fila: FilaLaufen): CarreraExterna | null {
  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha || !fila.nombre) return null;

  const urlCompleta = fila.href.startsWith("http") ? fila.href : `${BASE_URL}${fila.href}`;
  // El id es todo lo que sigue a /details/ (puede ser un código o un slug
  // como "1-wuppertaler-löwenlauf"; antes se cortaba en el primer guion y
  // carreras distintas compartían el id "1").
  const detalleId = fila.href.match(/laufkalender\/details\/([^"/?#]+)/)?.[1];
  const externalId = detalleId ?? `${normalizar(fila.fecha)}-${normalizar(fila.nombre).replace(/[^a-z0-9]+/g, "-")}`.slice(0, 140);
  const km = kmDesdeTexto(fila.distanciasTexto);

  return {
    fuenteTipo: "laufen",
    fuenteNombre: "laufen.de — DLV Laufkalender",
    fuenteUrl: urlCompleta,
    externalId,
    nombre: fila.nombre,
    ciudad: ciudadDesdeLugar(fila.lugar),
    pais: "Alemania",
    codigoPais: "DE",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlCompleta,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function obtenerPagina(pagina: number): Promise<{ filas: FilaLaufen[]; paginas: number }> {
  const res = await fetch(URL_BUSQUEDA, {
    method: "POST",
    headers: {
      "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams({ page: String(pagina) }).toString(),
  });
  if (!res.ok) throw new Error(`laufen.de respondió ${res.status}`);
  const data = (await res.json()) as { pages?: number; events?: string; topevents?: string };
  return { filas: parsearEventos(String(data.events ?? "") + String(data.topevents ?? "")), paginas: Number(data.pages) || 1 };
}

export async function correrCollectorLaufen() {
  return registrarEjecucion("laufen", async () => {
    // El cursor guarda la última página procesada: cada corrida sigue desde ahí.
    const estado = await prisma.estadoCollector.findUnique({ where: { collector: COLLECTOR_ID } });
    let pagina = Math.max(1, (estado?.cursor ?? 0) + 1);

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;
    let omitidas = 0;
    const vistos = new Set<string>();

    for (let i = 0; i < PAGINAS_POR_CORRIDA; i++) {
      const { filas, paginas } = await obtenerPagina(pagina);
      for (const fila of filas) {
        if (vistos.has(fila.href)) continue;
        vistos.add(fila.href);
        try {
          const externa = aCarreraExterna(fila);
          if (!externa) {
            omitidas++;
            continue;
          }
          const { creada } = await upsertCarreraExterna(externa);
          if (creada) nuevas++;
          else actualizadas++;
        } catch {
          errores++;
        }
      }
      pagina = pagina >= paginas ? 1 : pagina + 1;
      if (pagina === 1) break;
    }

    await prisma.estadoCollector.upsert({
      where: { collector: COLLECTOR_ID },
      update: { cursor: pagina - 1 },
      create: { collector: COLLECTOR_ID, cursor: pagina - 1 },
    });

    return { nuevas, actualizadas, errores, detalle: omitidas ? `${omitidas} sin fecha válida` : undefined };
  });
}
