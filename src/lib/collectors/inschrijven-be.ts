import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de inschrijven.nl para Bélgica. Es la misma plataforma
// neerlandesa de inscripción a carreras que ya usa el collector
// "inschrijven" (Países Bajos): su portada trae un array JSON completo
// embebido (`events=[...]`) con carreras de varios países vecinos,
// identificadas con un código de país (`ln`). Entre "NED" (Países
// Bajos), "FRA", "ESP", "LUX" y "CUR" también aparece "BEL" (Bélgica)
// con carreras reales ( places como Rijkevorsel, Antwerpen, Beerse,
// Edegem...). Mismo robots.txt permisivo sobre la portada que ya se
// verificó para el collector neerlandés.

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

// El feed mezcla carreras a pie con triatlones y viajes/excursiones de
// club de marcha; se descartan por nombre.
const PALABRAS_EXCLUIDAS = ["triatlon", "triathlon", "duatlon", "duathlon", "clubreis", "zwem", "fiets"];

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
  if (ev.ln !== "BEL") return null;
  if (!ev.nm) return null;

  const nombreMin = ev.nm.toLowerCase();
  if (PALABRAS_EXCLUIDAS.some((p) => nombreMin.includes(p))) return null;

  const fecha = fechaDesdeTexto(ev.dt);
  if (!fecha) return null;

  return {
    fuenteTipo: "inschrijven-be",
    fuenteNombre: "Inschrijven.nl",
    fuenteUrl: URL_HOME,
    externalId: ev.id,
    nombre: ev.nm,
    ciudad: ev.pl || "Bélgica",
    pais: "Bélgica",
    codigoPais: "BE",
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

export async function correrCollectorInschrijvenBe() {
  return registrarEjecucion("inschrijven-be", async () => {
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
