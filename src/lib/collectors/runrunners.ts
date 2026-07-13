import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de RunRunners Colombia (runrunnerscolombia.com/eventos).
// Es una app Next.js pero la lista de eventos viene en HTML simple en
// la respuesta inicial (no hace falta ejecutar JavaScript). Sin
// robots.txt que lo prohíba (el sitio no tiene archivo robots.txt, lo
// que por estándar significa que todo está permitido).
//
// Hoy el sitio lista muy pocos eventos (a veces uno solo) — es chico
// pero real.

const URL_EVENTOS = "https://runrunnerscolombia.com/eventos";

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

interface FilaRunRunners {
  nombre: string;
  ciudad: string;
  fecha: string;
  link: string;
}

const FILA_REGEX =
  /<h2 class="[^"]*">([^<]*)<\/h2><p class="text-sm text-gray-400[^"]*">([^<]*)(?:<!-- -->[^<]*)?<\/p><p class="text-sm text-gray-500[^"]*">([^<]*)<\/p>[\s\S]*?href="(\/eventos\/[a-z0-9-]+)\/inscribirse"/g;

function parsearEventos(html: string): FilaRunRunners[] {
  const eventos: FilaRunRunners[] = [];
  const re = new RegExp(FILA_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    eventos.push({
      nombre: m[1].trim(),
      ciudad: m[2].trim() || "Colombia",
      fecha: m[3].trim(),
      link: m[4],
    });
  }
  return eventos;
}

function fechaDesdeTexto(texto: string): Date | null {
  const m = texto.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})/i);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = MESES[m[2].toLowerCase()];
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00Z`);
}

function aCarreraExterna(fila: FilaRunRunners): CarreraExterna | null {
  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha) return null;

  const urlCompleta = `https://runrunnerscolombia.com${fila.link}`;
  const externalId = fila.link.replace(/^\/eventos\//, "");

  return {
    fuenteTipo: "runrunners",
    fuenteNombre: "RunRunners Colombia",
    fuenteUrl: urlCompleta,
    externalId,
    nombre: fila.nombre,
    ciudad: fila.ciudad,
    pais: "Colombia",
    codigoPais: "CO",
    continente: "AMERICA_DEL_SUR",
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlCompleta,
    distancias: [{ tipo: TipoDistancia.OTRA, km: 0, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorRunRunners() {
  return registrarEjecucion("runrunners", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_EVENTOS, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`RunRunners respondió ${res.status}`);
    const html = await res.text();
    const eventos = parsearEventos(html);

    for (const fila of eventos) {
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
