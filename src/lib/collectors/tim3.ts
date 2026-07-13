import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de TIM3 (tim3.com.mx), empresa mexicana de timing e
// inscripciones (organizador directo, no agregador). Cobertura
// regional (sobre todo Jalisco/Guanajuato/Bajío), no todo México
// todavía. HTML server-rendered simple, robots.txt permisivo
// (solo bloquea áreas privadas /admin/, /api/, etc.).

const URL_HOME = "https://www.tim3.com.mx/";

const MESES: Record<string, number> = {
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dic: 12,
};

interface FilaTim3 {
  nombre: string;
  fecha: string;
  lugar: string;
  href: string;
}

function parsearFilas(html: string): FilaTim3[] {
  const filas: FilaTim3[] = [];
  const bloques = html.split('<h3 class="font-bebas text-2xl text-center">').slice(1);

  for (const bloque of bloques) {
    const nombre = bloque.match(/^([^<]*)<\/h3>/)?.[1]?.trim();
    const fecha = bloque.match(/(\d{1,2} [A-Za-z]{3} \d{4})/)?.[1];
    const lugar = bloque.match(/<\/svg>\s*([^<]*?)\s*<\/span>\s*<\/div>/)?.[1]?.trim();
    const href = bloque.match(/href="(evento\/[^"]+)"/)?.[1];

    if (nombre && fecha && href) {
      filas.push({ nombre, fecha, lugar: lugar ?? "", href });
    }
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  const m = texto.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = MESES[m[2].toLowerCase()];
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00Z`);
}

function ciudadDesdeLugar(lugar: string): string {
  const partes = lugar
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  // Descarta segmentos que son solo un código postal o una abreviatura
  // de estado muy corta (ej. "Gto.", "45200.").
  const candidatos = partes.filter((p) => p.replace(/[0-9.]/g, "").trim().length > 4);
  const elegido = candidatos[candidatos.length - 1] ?? partes[partes.length - 1] ?? lugar;
  return (
    elegido
      .replace(/^\d+\s*/, "")
      .replace(/\.$/, "")
      .trim() || "México"
  );
}

function kmDesdeTexto(texto: string): number {
  const m = texto.match(/(\d+(?:[.,]\d+)?)\s*k/i);
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

// TIM3 organiza de todo (triatlones, ciclismo), no solo running. Se
// descartan por palabras clave en el nombre ya que el sitio no expone
// un campo de disciplina aparte.
const PALABRAS_NO_RUNNING = /triatl[oó]n|duatl[oó]n|gravel|ciclismo|mtb|bike|nataci[oó]n/i;

function aCarreraExterna(fila: FilaTim3): CarreraExterna | null {
  if (PALABRAS_NO_RUNNING.test(fila.nombre)) return null;

  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha) return null;

  const urlCompleta = `https://www.tim3.com.mx/${fila.href}`;
  const externalId = fila.href.replace(/^evento\//, "");
  const km = kmDesdeTexto(fila.nombre);

  return {
    fuenteTipo: "tim3",
    fuenteNombre: "TIM3",
    fuenteUrl: urlCompleta,
    externalId,
    nombre: fila.nombre,
    ciudad: ciudadDesdeLugar(fila.lugar),
    pais: "México",
    codigoPais: "MX",
    continente: "AMERICA_DEL_NORTE",
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlCompleta,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorTim3() {
  return registrarEjecucion("tim3", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_HOME, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`TIM3 respondió ${res.status}`);
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
