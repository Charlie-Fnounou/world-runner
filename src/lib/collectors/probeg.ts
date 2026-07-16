import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { prisma } from "@/lib/prisma";
import type { CarreraExterna } from "./types";

// Recolector de probeg.org, «ПроБЕГ» — el portal de carreras más
// completo de Rusia (fundado en 2002, gestionado por la ANO sin fines
// de lucro "ПроБЕГ", corredores aficionados voluntarios; no cobra por
// listar carreras, ver /about/). No es un agregador comercial de los
// prohibidos (Ahotu, Finishers, running.life, etc.) sino el
// equivalente ruso a un portal comunitario tipo AIMS: 76.000+ carreras
// y 4 millones de resultados registrados en 24 años.
//
// robots.txt (https://probeg.org/robots.txt) solo bloquea rutas de
// administración/backup (/backup/, /cgi-bin/, /login/, /result/,
// /results/ con resultados de corredores, etc.) y "/races/?csrf" —
// pero NO bloquea "/races/?country=RU&date_region=..." ni "/races/"
// en general. Sí exige "Crawl-delay: 30", que respetamos pidiendo
// como mucho UNA página por corrida del recolector.
//
// El formulario de filtros (GET a /races/, ver <form id="frmSearch">)
// acepta country=RU y date_region=2 ("hoy y en adelante"). Con esos
// filtros la tabla de resultados devuelve fecha completa DD.MM.YYYY
// (o "DD–DD.MM.YYYY" para eventos de varios días, quedándonos con el
// primer día) — a diferencia de la portada /races/ sin filtrar, que
// muestra solo DD.MM sin año. El listado no está ordenado por fecha
// sino por popularidad/rating, y pagina con ?page=N (visto en pruebas
// más de 700 páginas), así que se recorre con un cursor de página
// guardado en EstadoCollector — de a una página por corrida, dando la
// vuelta cuando una página sale vacía.
//
// Nota: se probó también el filtro country=UA (Ucrania) en el mismo
// sitio, pero devuelve solo eventos históricos (2021–2024, ninguno
// posterior) — el calendario ucraniano de este portal ruso no se
// mantiene desde la guerra. Por eso Ucrania se cubre en un recolector
// aparte (ver vsiprobihy.ts) y este archivo se queda solo con Rusia.

const URL_BASE = "https://probeg.org";
const COLLECTOR_ID = "probeg";
const MAX_PAGINA = 400; // válvula de seguridad para no quedar en loop si nunca sale una página vacía

interface FilaProbeg {
  id: string;
  dia: number;
  mes: number;
  anio: number;
  nombre: string;
  ciudad: string;
  distanciasTexto: string;
  urlExterna?: string;
}

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// La tabla de resultados filtrados empieza después del <tr class="info">
// de cabecera (columnas: №, Дата, Название, Город, Дистанции,
// Финишировало, Ссылки). Cada fila de evento es un <tr> plano.
function parsearFilas(html: string): FilaProbeg[] {
  const inicio = html.indexOf('<tr class="info">');
  if (inicio === -1) return [];
  const tabla = html.slice(inicio);

  const filas: FilaProbeg[] = [];
  const filaRegex = /<tr>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = filaRegex.exec(tabla))) {
    const fila = m[1];

    const idMatch = fila.match(/\/event\/(\d+)\//);
    const fechaMatch = fila.match(/(\d{1,2})(?:[–-]\d{1,2})?\.(\d{2})\.(\d{4})/);
    const nombreMatch = fila.match(/<td><a href="\/event\/\d+\/">([^<]+)<\/a>/);
    const ciudadMatch = fila.match(/<a href="\/races\/city\/\d+\/">([^<]+)<\/a>/);
    // La celda de distancias es la que viene justo antes de la celda
    // "Финишировало" (class="text-center"): así se distingue de la
    // otra celda "text-right" (la de la fecha), que va antes.
    const distMatch = fila.match(/<td class="text-right">((?:<span>[\s\S]*?<\/span>\s*(?:<br\/>)?\s*)+)<\/td>\s*<td class="text-center">/);

    if (!idMatch || !fechaMatch || !nombreMatch) continue;

    // Último bloque de la fila: enlaces (registro / sitio / redes /
    // "Положение" en PDF), en la última celda "text-right". Nos
    // quedamos con el primer link externo que no sea red social ni
    // documento del propio probeg.org.
    const ultimaCelda = fila.lastIndexOf('<td class="text-right">');
    const bloqueLinks = ultimaCelda === -1 ? "" : fila.slice(ultimaCelda);
    const hrefs = [...bloqueLinks.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((h) => h[1]);
    const urlExterna = hrefs.find(
      (h) => !/vk\.com|instagram\.com|facebook\.com|t\.me|probeg\.org\/dj_media/.test(h),
    );

    filas.push({
      id: idMatch[1],
      dia: Number(fechaMatch[1]),
      mes: Number(fechaMatch[2]),
      anio: Number(fechaMatch[3]),
      nombre: decodificarHtml(nombreMatch[1]),
      ciudad: ciudadMatch ? decodificarHtml(ciudadMatch[1]) : "Rusia",
      distanciasTexto: distMatch ? distMatch[1] : "",
      urlExterna,
    });
  }
  return filas;
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

// Cada <span> de la celda de distancias trae cosas como "10 км",
// "6706 м", "53400 м (zagedan 65) (+2900м)", o directamente palabras
// sin número como "марафон", "полумарафон" o "backyard" (formato de
// carrera de resistencia sin distancia fija). Las que no se pueden
// convertir a km se descartan (no las palabras sueltas tipo
// "backyard"), salvo maratón/media maratón que sí tienen km fijos.
function parsearDistancias(texto: string): { tipo: TipoDistancia; km: number }[] {
  const spans = [...texto.matchAll(/<span>([\s\S]*?)<\/span>/g)].map((m) => decodificarHtml(m[1]));
  const resultado: { tipo: TipoDistancia; km: number }[] = [];

  for (const span of spans) {
    // "\b" no sirve de límite acá porque el cirílico no cuenta como
    // "\w" en JS: se usa un lookahead negativo de letra en su lugar.
    const numMatch = span.match(/^([\d.,]+)\s*(км|м)(?![а-яіїєґa-z])/i);
    if (numMatch) {
      let km = parseFloat(numMatch[1].replace(",", "."));
      if (numMatch[2].toLowerCase() === "м") km /= 1000;
      if (km > 0) resultado.push({ km, tipo: tipoDistanciaDesdeKm(km) });
      continue;
    }
    const palabra = span.toLowerCase();
    if (/^марафон$/.test(palabra)) resultado.push({ km: 42.195, tipo: TipoDistancia.MARATON });
    else if (/полумарафон/.test(palabra)) resultado.push({ km: 21.097, tipo: TipoDistancia.MEDIA_MARATON });
  }

  return resultado.length ? resultado : [{ km: 0, tipo: TipoDistancia.OTRA }];
}

function aCarreraExterna(fila: FilaProbeg): CarreraExterna | null {
  if (!fila.dia || !fila.mes || !fila.anio || !fila.nombre) return null;
  const fecha = new Date(`${fila.anio}-${String(fila.mes).padStart(2, "0")}-${String(fila.dia).padStart(2, "0")}T10:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return null;

  const urlDetalle = `${URL_BASE}/event/${fila.id}/`;
  const urlOficial = fila.urlExterna ?? urlDetalle;

  return {
    fuenteTipo: "probeg",
    fuenteNombre: "ПроБЕГ (probeg.org)",
    fuenteUrl: urlDetalle,
    externalId: fila.id,
    nombre: fila.nombre,
    ciudad: fila.ciudad,
    pais: "Rusia",
    codigoPais: "RU",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: urlOficial,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlOficial,
    distancias: parsearDistancias(fila.distanciasTexto),
  };
}

export async function correrCollectorProbeg() {
  return registrarEjecucion(COLLECTOR_ID, async () => {
    const estado = await prisma.estadoCollector.findUnique({ where: { collector: COLLECTOR_ID } });
    let pagina = (estado?.cursor ?? 0) + 1;
    if (pagina > MAX_PAGINA) pagina = 1;

    const url = `${URL_BASE}/races/?country=RU&date_region=2&page=${pagina}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`probeg.org respondió ${res.status}`);
    const html = await res.text();
    const filas = parsearFilas(html);

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

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

    // Página vacía (se acabaron los resultados de este filtro): la
    // próxima corrida arranca de nuevo desde la página 1.
    const siguienteCursor = filas.length === 0 ? 0 : pagina;
    await prisma.estadoCollector.upsert({
      where: { collector: COLLECTOR_ID },
      update: { cursor: siguienteCursor },
      create: { collector: COLLECTOR_ID, cursor: siguienteCursor },
    });

    return { nuevas, actualizadas, errores };
  });
}
