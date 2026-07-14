import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de inschrijven.nl, plataforma neerlandesa de inscripción
// a carreras (running, trail, walking). La home trae un array JSON
// completo embebido en el HTML (`events=[...]`), sin robots.txt
// restrictivo sobre la portada.

const URL_HOME = "https://inschrijven.nl/";

const MESES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mrt: 3,
  apr: 4,
  mei: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  okt: 10,
  nov: 11,
  dec: 12,
};

interface EventoInschrijven {
  id: string;
  nm: string;
  pl: string;
  ln: string;
  dt: string; // "DD MMM YYYY" en holandés
}

function extraerEventos(html: string): EventoInschrijven[] {
  const m = html.match(/events\s*=\s*(\[.*?\]);/);
  if (!m) return [];
  try {
    return JSON.parse(m[1]);
  } catch {
    return [];
  }
}

function fechaDesdeTexto(texto: string): Date | null {
  const m = texto.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = MESES[m[2].toLowerCase()];
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T10:00:00Z`);
}

function aCarreraExterna(ev: EventoInschrijven): CarreraExterna | null {
  if (ev.ln !== "NED") return null; // por ahora solo Países Bajos
  const fecha = fechaDesdeTexto(ev.dt);
  if (!fecha || !ev.nm) return null;

  return {
    fuenteTipo: "inschrijven",
    fuenteNombre: "Inschrijven.nl",
    fuenteUrl: URL_HOME,
    externalId: ev.id,
    nombre: ev.nm,
    ciudad: ev.pl || "Países Bajos",
    pais: "Países Bajos",
    codigoPais: "NL",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: URL_HOME,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: URL_HOME,
    distancias: [{ tipo: TipoDistancia.OTRA, km: 0, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorInschrijven() {
  return registrarEjecucion("inschrijven", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_HOME, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Inschrijven.nl respondió ${res.status}`);
    const html = await res.text();
    const eventos = extraerEventos(html);

    for (const ev of eventos) {
      try {
        const externa = aCarreraExterna(ev);
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
