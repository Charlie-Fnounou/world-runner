import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de Corro (corro.com.ar), calendario de carreras de
// Argentina (sobre todo Buenos Aires). HTML simple server-rendered
// (Joomla/K2), sin robots.txt que lo prohíba. Es un listado chico
// (curado a mano por el sitio, ~15 carreras), así que se recorre
// completo en cada corrida en vez de necesitar un cursor como
// RunSignup/FIDAL.

const BASE_URL = "https://www.corro.com.ar/carreras";

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

interface FilaCorro {
  url: string;
  titulo: string;
  cuerpo: string;
}

const FILA_REGEX =
  /<h3 class="catItemTitle">[\s\S]*?<a href="([^"]+)">\s*([^<]+?)\s*<\/a>[\s\S]*?<div class="catItemIntroText">\s*<p>([\s\S]*?)<\/p>/g;

function parsearFilas(html: string): FilaCorro[] {
  const filas: FilaCorro[] = [];
  const re = new RegExp(FILA_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    filas.push({ url: m[1], titulo: m[2].trim(), cuerpo: m[3] });
  }
  return filas;
}

function campoDesdeCuerpo(cuerpo: string, etiqueta: string): string | null {
  const re = new RegExp(`${etiqueta}:\\s*([^<]+?)\\s*(?:<br|</strong>)`, "i");
  return cuerpo.match(re)?.[1]?.trim() ?? null;
}

function fechaDesdeTexto(texto: string): Date | null {
  // "13 de Septiembre de 2026" (case variable en el nombre del mes)
  const m = texto.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})/i);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = MESES[m[2].toLowerCase()];
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T11:00:00Z`);
}

function ciudadDesdeLugar(lugar: string | null): string {
  if (!lugar) return "Buenos Aires";
  const partes = lugar.split(",");
  if (partes.length > 1) {
    return partes[partes.length - 1]
      .replace(/[().]/g, "")
      .trim();
  }
  return "Buenos Aires";
}

function kmDesdeTexto(texto: string | null): number {
  if (!texto) return 0;
  const m = texto.match(/(\d+(?:[.,]\d+)?)\s*K/i);
  if (!m) return 0;
  return parseFloat(m[1].replace(",", "."));
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

function aCarreraExterna(fila: FilaCorro): CarreraExterna | null {
  const fechaTexto = campoDesdeCuerpo(fila.cuerpo, "Fecha");
  const fecha = fechaTexto ? fechaDesdeTexto(fechaTexto) : null;
  if (!fecha) return null;

  const lugar = campoDesdeCuerpo(fila.cuerpo, "Largada y llegada");
  const distanciaTexto = campoDesdeCuerpo(fila.cuerpo, "Distancia");
  const km = kmDesdeTexto(distanciaTexto);

  const urlCompleta = fila.url.startsWith("http") ? fila.url : `https://www.corro.com.ar${fila.url}`;
  const externalId = fila.url.replace(/^\/carreras\//, "").replace(/\/$/, "");

  return {
    fuenteTipo: "corro",
    fuenteNombre: "Corro — Calendario de Carreras",
    fuenteUrl: urlCompleta,
    externalId,
    nombre: fila.titulo,
    ciudad: ciudadDesdeLugar(lugar),
    pais: "Argentina",
    codigoPais: "AR",
    continente: "AMERICA_DEL_SUR",
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlCompleta,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

async function fetchPagina(start: number): Promise<string> {
  const url = start === 0 ? BASE_URL : `${BASE_URL}?start=${start}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
  });
  if (!res.ok) throw new Error(`Corro respondió ${res.status}`);
  return res.text();
}

function tieneSiguientePagina(html: string, actual: number): number | null {
  const m = html.match(/title="Next"\s+href="[^"]*start=(\d+)"/);
  if (!m) return null;
  const siguiente = Number(m[1]);
  return siguiente > actual ? siguiente : null;
}

const MAX_PAGINAS = 10; // tope de seguridad, el sitio hoy tiene 2

export async function correrCollectorCorro() {
  return registrarEjecucion("corro", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;
    let start = 0;

    for (let i = 0; i < MAX_PAGINAS; i++) {
      const html = await fetchPagina(start);
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

      const siguiente = tieneSiguientePagina(html, start);
      if (siguiente === null) break;
      start = siguiente;

      await new Promise((r) => setTimeout(r, 400));
    }

    return { nuevas, actualizadas, errores };
  });
}
