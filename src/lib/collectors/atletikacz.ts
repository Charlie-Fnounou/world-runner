import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector del Český atletický svaz (ČAS), la federación checa de
// atletismo. Su calendario oficial (online.atletika.cz/kalendar/) es
// donde los clubes y organizadores dan de alta cualquier competencia,
// desde entrenamientos de club hasta maratones. El formulario de
// búsqueda tiene un filtro "Skupina kalendáře" (grupo de calendario)
// con la opción "Běhy mimo dráhu" ("carreras fuera de la pista", id=9)
// que deja afuera atletismo de pista y entrenamientos de club — es
// justo la categoría de carreras de calle/trail que nos interesa.
//
// El calendario se consulta con POST a /kalendar/ (formulario clásico,
// no hay API JSON). robots.txt de online.atletika.cz sólo bloquea
// /administrace/, /prihlaska/, /atletikatest/, /prihlasky/ y
// /vysledky-atleta/ — /kalendar/ está permitido. Con un rango de
// fechas amplio (12 meses) devuelve todos los resultados en una sola
// respuesta, sin paginación.

const URL_KALENDAR = "https://online.atletika.cz/kalendar/";
const GRUPO_BEHY_MIMO_DRAHU = "9";

interface FilaAtletikaCz {
  fecha: string; // "DD. MM. YYYY"
  nombre: string;
  lugar: string;
  url?: string;
}

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

function parsearFilas(html: string): FilaAtletikaCz[] {
  const filas: FilaAtletikaCz[] = [];
  const bloques = html.split('<li class="results__row">').slice(1);

  for (const bloque of bloques) {
    const fecha = bloque.match(/<span class="results__date">\s*([^<]+?)\s*<\/span>/)?.[1];
    const nombre = decodificarHtml(bloque.match(/<strong>([^<]+)<\/strong>/)?.[1] ?? "");
    const lugar = decodificarHtml(bloque.match(/<\/strong><br \/>\s*([^<]+?)\s*<\/span>/)?.[1] ?? "");
    const url = bloque.match(/href="([^"]+)"\s+target="_blank"\s+data-tooltip="Propozice"/)?.[1];

    if (!fecha || !nombre) continue;
    filas.push({ fecha, nombre, lugar, url });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  // "18. 07. 2026" (a veces con rango "16. - 19. 07. 2026"; nos
  // quedamos con el día final que es el que trae la fecha completa).
  const m = texto.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T10:00:00Z`);
}

function ciudadDesdeLugar(lugar: string): string {
  return lugar.split(",")[0]?.trim() || "Česko";
}

function kmDesdeNombre(nombre: string): number {
  const n = nombre.toLowerCase();
  if (/půlmaraton|pulmaraton|half\s*marathon/.test(n)) return 21.0975;
  if (/\bmaraton\b/.test(n)) return 42.195;
  const km = n.match(/(\d+(?:[.,]\d+)?)\s*km/);
  if (km) return parseFloat(km[1].replace(",", "."));
  return 0;
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

function aCarreraExterna(fila: FilaAtletikaCz): CarreraExterna | null {
  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha) return null;

  const url = fila.url?.startsWith("http") ? fila.url : fila.url ? `https://online.atletika.cz${fila.url}` : URL_KALENDAR;
  const km = kmDesdeNombre(fila.nombre);
  // No hay un id propio expuesto en el listado para todas las filas
  // (sólo las que tienen "propozice" alojada en el propio sitio del
  // ČAS lo traen en la URL); se arma un id estable con fecha + nombre.
  const externalId = `${fila.fecha}-${normalizar(fila.nombre)}`.replace(/[^a-z0-9]+/g, "-").slice(0, 140);

  return {
    fuenteTipo: "atletika_cz",
    fuenteNombre: "Český atletický svaz (ČAS)",
    fuenteUrl: url,
    externalId,
    nombre: fila.nombre,
    ciudad: ciudadDesdeLugar(fila.lugar),
    pais: "Chequia",
    codigoPais: "CZ",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: url,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: fila.url ? url : undefined,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorAtletikaCz() {
  return registrarEjecucion("atletika_cz", async () => {
    const hoy = new Date();
    const dentroDeUnAnio = new Date(hoy);
    dentroDeUnAnio.setFullYear(dentroDeUnAnio.getFullYear() + 1);

    const body = new URLSearchParams({
      DateFrom: hoy.toISOString(),
      DateTo: dentroDeUnAnio.toISOString(),
      type: "",
      region: "",
      category: "",
      discipline: "",
      calendar_group: GRUPO_BEHY_MIMO_DRAHU,
      filterType: "0",
      fulltext: "",
      c_id: "",
    });

    const res = await fetch(URL_KALENDAR, {
      method: "POST",
      headers: {
        "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`Český atletický svaz respondió ${res.status}`);
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
