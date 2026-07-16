import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de Latvijas Vieglatlētikas savienība (LVS), la
// federación letona de atletismo, desde su calendario oficial
// athletics.lv/lv/events. robots.txt permite el rastreo (sólo trae
// Crawl-delay: 10 para "*" y bloquea algunos bots de SEO/backlinks
// puntuales, ninguno de los cuales somos nosotros) — se respeta igual
// pidiendo una sola página por corrida.
//
// El formulario de búsqueda trae casillas ("type[]") para filtrar por
// categoría de evento; se usan sólo "Latvijas" (competencias letonas,
// id=3) y "Garās distances" (larga distancia, id=5) — así se deja
// afuera velocidad/saltos/lanzamientos/competencias de otros países
// sin depender de adivinar por el nombre. Igual la lista mezcla
// campeonatos de marcha atlética (soļošana) y carreras de calle
// populares, así que además nos quedamos sólo con las filas cuyo
// nombre contiene "skrējiens" (carrera/corrida), "maratons" o
// "pusmaratons" (medio maratón) — y se descartan las de marcha
// atlética ("soļošana"), que además suelen correrse fuera de Letonia
// (campeonatos que se disputan en Lituania/Eslovaquia).
//
// La consulta se hace con un rango de fechas amplio (todo el año en
// curso + el que viene) vía query string GET, sin necesitar JavaScript
// — el HTML ya trae la grilla de eventos server-rendered.

const BASE_URL = "https://athletics.lv";

function limpiarTexto(texto: string): string {
  return texto
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

interface FilaLv {
  href: string;
  nombre: string;
  fechaTexto: string; // "DD/MM/YYYY - DD/MM/YYYY"
  venue: string;
}

function extraerFilas(html: string): FilaLv[] {
  const filas: FilaLv[] = [];
  const re =
    /<a class="calendar__event-link[^"]*" href="([^"]+)">\s*([^<]+?)\s*<\/a>\s*<span class="calendar__event-date[^"]*">([^<]+)<\/span>\s*<span class="calendar__event-venue[^"]*">([^<]*)<\/span>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    filas.push({
      href: m[1],
      nombre: limpiarTexto(m[2]),
      fechaTexto: m[3].trim(),
      venue: limpiarTexto(m[4]),
    });
  }
  return filas;
}

// Raíces sin declinar (el letón conjuga "maratons/maratona/maratonā"
// según el caso gramatical) para no perder variantes por una "s" de
// menos o de más al final.
const PALABRAS_CARRERA = ["skrējien", "skrejien", "maraton"];

function esCarreraDeCalle(nombre: string): boolean {
  const n = nombre.toLowerCase();
  if (n.includes("soļošan") || n.includes("solosan")) return false; // marcha atlética
  return PALABRAS_CARRERA.some((p) => n.includes(p));
}

function fechaDesdeTexto(texto: string): Date | null {
  const m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T09:00:00Z`);
}

function distanciaDesdeNombre(nombre: string): { tipo: TipoDistancia; km: number } {
  const n = nombre.toLowerCase();
  if (n.includes("ultramaraton") || n.includes("24h")) return { tipo: TipoDistancia.ULTRA, km: 0 };
  if (n.includes("pusmaraton")) return { tipo: TipoDistancia.MEDIA_MARATON, km: 21.0975 };
  if (n.includes("maraton")) return { tipo: TipoDistancia.MARATON, km: 42.195 };
  return { tipo: TipoDistancia.OTRA, km: 0 };
}

function aCarreraExterna(f: FilaLv): CarreraExterna | null {
  if (!esCarreraDeCalle(f.nombre)) return null;
  const fecha = fechaDesdeTexto(f.fechaTexto);
  if (!fecha) return null;

  const id = f.href.match(/\/event\/(\d+)\//)?.[1];
  if (!id) return null;

  const { tipo, km } = distanciaDesdeNombre(f.nombre);

  return {
    fuenteTipo: "athletics_lv",
    fuenteNombre: "Latvijas Vieglatlētikas savienība (athletics.lv)",
    fuenteUrl: `${BASE_URL}/lv/events`,
    externalId: id,
    nombre: f.nombre,
    ciudad: f.venue || "Latvija",
    pais: "Letonia",
    codigoPais: "LV",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: f.href,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: f.href,
    distancias: [{ tipo, km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorAthleticsLv() {
  return registrarEjecucion("athletics_lv", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const hoy = new Date();
    const desde = `01/01/${hoy.getFullYear()}`;
    const hasta = `31/12/${hoy.getFullYear() + 1}`;
    const url = `${BASE_URL}/lv/events?event-date-from=${desde}&event-date-to=${hasta}&type%5B%5D=3&type%5B%5D=5`;

    const res = await fetch(url, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`athletics.lv respondió ${res.status}`);
    const html = await res.text();
    const filas = extraerFilas(html);

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
