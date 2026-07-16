import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de RunRio Events Inc. (runrio.com), la organizadora de
// carreras más grande de Filipinas (Condura, PUMA Philippine Half
// Marathon Series, Rexona 10 Miler, etc.). No es un agregador de
// carreras ajenas: RunRio organiza o coorganiza cada evento que lista
// en su propio calendario, y cada tarjeta enlaza a la inscripción real
// en Race Roster (raceroster.com), la plataforma de registro que usan.
// robots.txt de runrio.com no tiene restricciones (User-agent: * /
// Allow: /), así que se scrapea la página /race-calendar/ directamente
// (viene renderizada en el servidor con Elementor, sin necesitar
// JavaScript).
//
// La página mezcla, de vez en cuando, alguna carrera de la franquicia
// "Disney Run" que RunRio organiza en otros países de la región
// (Singapur, Tailandia) — se descartan esas filas para no etiquetar
// carreras extranjeras como si fueran de Filipinas.

const URL_CALENDARIO = "https://runrio.com/race-calendar/";
const MARCADOR_FILA = 'class="elementor elementor-988 e-loop-item';
const PAISES_EXTRANJEROS = ["singapore", "thailand", "malaysia", "vietnam", "indonesia"];

const MESES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

interface FilaRunRio {
  nombre: string;
  ciudad: string;
  distanciasTexto: string;
  url: string;
  anio: number;
  dia: number;
  mes: number;
}

function parsearFilas(html: string): FilaRunRio[] {
  const bloques = html.split(MARCADOR_FILA).slice(1);
  const filas: FilaRunRio[] = [];

  for (const bloque of bloques) {
    const nombre = bloque.match(/<h2 class="elementor-heading-title elementor-size-default">([^<]+)<\/h2>/)?.[1]?.trim();
    const urlMatch = bloque.match(/href="(https:\/\/raceroster\.com\/events\/(\d{4})\/[^"]+)"/);
    if (!nombre || !urlMatch) continue;

    // Cada tarjeta trae la fecha partida en dos widgets sueltos justo
    // antes del título: el día ("05") y el mes abreviado en inglés
    // ("JUL"), en ese orden — son los dos únicos widgets
    // "text-editor.default" del bloque.
    const [diaTexto, mesTexto] = [...bloque.matchAll(/data-widget_type="text-editor\.default">\s*([^<]+?)\s*<\/div>/g)].map(
      (m) => m[1],
    );
    const dia = Number(diaTexto);
    const mes = mesTexto ? MESES[mesTexto.toLowerCase().slice(0, 3)] : undefined;
    if (!dia || !mes) continue;

    const iconos = [...bloque.matchAll(/<span class="elementor-icon-list-text">([\s\S]*?)<\/span>\s*<\/li>/g)].map((m) =>
      m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    );
    const ciudad = iconos[0] ?? "";
    if (PAISES_EXTRANJEROS.some((p) => ciudad.toLowerCase().includes(p))) continue;

    filas.push({
      nombre,
      ciudad,
      distanciasTexto: iconos[1] ?? "",
      url: urlMatch[1],
      anio: Number(urlMatch[2]),
      dia,
      mes,
    });
  }
  return filas;
}

function ciudadCorta(ciudad: string): string {
  // "Ayala Triangle Gardens, Makati City" -> "Makati City"; si no hay
  // coma (ej. "SM Seaside, Cebu City" sí tiene, pero "Baguio" no),
  // se usa tal cual.
  const partes = ciudad.split(",");
  return partes[partes.length - 1]?.trim() || "Filipinas";
}

function kmDesdeToken(token: string): number {
  const m = token.trim().match(/^(\d+(?:\.\d+)?)\s*KM$/i);
  return m ? parseFloat(m[1]) : 0;
}

function distanciaMasLarga(texto: string): number {
  if (!texto) return 0;
  let mejor = 0;
  for (const token of texto.split("/")) {
    const km = kmDesdeToken(token);
    if (km > mejor) mejor = km;
  }
  return mejor;
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

function aCarreraExterna(fila: FilaRunRio): CarreraExterna | null {
  const externalId = fila.url.match(/raceroster\.com\/events\/\d{4}\/(\d+)\//)?.[1];
  if (!externalId) return null;

  const fecha = new Date(`${fila.anio}-${String(fila.mes).padStart(2, "0")}-${String(fila.dia).padStart(2, "0")}T10:00:00Z`);
  const km = distanciaMasLarga(fila.distanciasTexto);

  return {
    fuenteTipo: "runrio",
    fuenteNombre: "RunRio Events Inc. — Race Calendar",
    fuenteUrl: URL_CALENDARIO,
    externalId,
    nombre: fila.nombre,
    ciudad: ciudadCorta(fila.ciudad),
    pais: "Filipinas",
    codigoPais: "PH",
    continente: "ASIA",
    lat: 0,
    lng: 0,
    sitioWeb: fila.url,
    anio: fila.anio,
    fecha,
    urlInscripcionOficial: fila.url,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorRunRio() {
  return registrarEjecucion("runrio", async () => {
    const res = await fetch(URL_CALENDARIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`RunRio respondió ${res.status}`);
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

    return { nuevas, actualizadas, errores };
  });
}
