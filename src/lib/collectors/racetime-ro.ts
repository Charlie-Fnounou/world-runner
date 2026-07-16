import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de RaceTime (racetime.ro), plataforma rumana de
// inscripción a eventos deportivos (running, ciclismo, triatlón) que
// usan directamente decenas de organizadores para vender dorsales —
// cada carrera enlaza a su propio formulario en
// racetime.ro/events/{id}/register.
//
// Se investigaron antes: Federația Română de Atletism (fra.ro/
// competitii/calendar — Joomla, robots.txt abierto, pero el calendario
// solo trae campeonatos federativos de pista/cross, no carreras
// populares de calle); 321Start.run (calendario/agregador de carreras
// de terceros, del tipo que se pidió evitar); y 42km.ro /
// register.42km.ro (otra plataforma de inscripción directa, pero su
// robots.txt bloquea explícitamente a "ClaudeBot" con
// "Content-Signal: ai-train=no" — se descartó por respeto a esa
// política, igual que RockTheSport en España). RaceTime tiene
// robots.txt totalmente abierto ("Disallow:" vacío) y no menciona
// crawlers de IA.
//
// La home de racetime.ro es una SPA (Vue/Laravel) casi vacía en el
// HTML inicial, EXCEPTO el menú desplegable de "Próximos eventos" del
// header, que sí viene renderizado en el HTML del servidor con
// nombre + fecha + link de inscripción para cada carrera futura (no
// hay una página /events adicional: ese menú es el listado completo).
// No trae ciudad (las páginas de detalle de cada evento sí son SPA
// pura, sin datos en el HTML), así que ciudad queda como "Rumania".
//
// RaceTime también lista eventos de ciclismo (MTB, "Turul", cupas de
// bici) mezclados con carreras a pie: se filtran por palabras clave
// típicas de running para no meter carreras de bici en el directorio.

const URL_HOME = "https://racetime.ro/";

const MESES: Record<string, number> = {
  ian: 1,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  mai: 5,
  may: 5,
  iun: 6,
  jun: 6,
  iul: 7,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  noi: 11,
  nov: 11,
  dec: 12,
};

// Sin límite de palabra en "run": muchas carreras rumanas usan nombres
// pegados tipo "AniRUN", "DreamRun" sin espacio antes de "run".
const PALABRAS_RUNNING = /marat|alerg|\bcros(s)?\b|run/i;
const PALABRAS_CICLISMO = /\bmtb\b|ciclis|bike|velo|criterium|\bturul\b|cupa\b(?!.*run)/i;

interface EventoRacetime {
  id: string;
  nombre: string;
  fechaTexto: string; // ej. "20 Sep 2026" o "05 - 06 Sep 2026"
}

const ITEM_REGEX =
  /<a href="https:\/\/racetime\.ro\/events\/(\d+)\/register"[\s\S]*?<p class="text-base font-medium text-zinc-900">\s*([\s\S]*?)\s*<\/p>\s*<p class="mt-1 text-sm text-zinc-500">\s*([\s\S]*?)\s*<\/p>/g;

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

function extraerEventos(html: string): EventoRacetime[] {
  const vistos = new Set<string>();
  const eventos: EventoRacetime[] = [];
  const re = new RegExp(ITEM_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const [, id, nombre, fechaTexto] = m;
    if (vistos.has(id)) continue; // el menú aparece duplicado (versión escritorio + móvil)
    vistos.add(id);
    eventos.push({ id, nombre: decodificarHtml(nombre), fechaTexto: decodificarHtml(fechaTexto) });
  }
  return eventos;
}

function fechaDesdeTexto(texto: string): Date | null {
  // Formatos vistos: "20 Sep 2026" y, para eventos de varios días,
  // "05 - 06 Sep 2026" (se toma el primer día).
  const m = texto.match(/(\d{1,2})\s*(?:-\s*\d{1,2}\s*)?([A-Za-zÀ-ÿ]{3,})\.?\s*(\d{4})/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = MESES[m[2].slice(0, 3).toLowerCase()];
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T09:00:00Z`);
}

function esCarreraAPie(nombre: string): boolean {
  if (PALABRAS_RUNNING.test(nombre)) return true;
  if (PALABRAS_CICLISMO.test(nombre)) return false;
  // Ambiguo (ni palabra de running ni de ciclismo detectada): se
  // descarta por precaución para no meter eventos de otro deporte.
  return false;
}

function kmDesdeTitulo(nombre: string): { km: number; tipo: TipoDistancia } {
  const t = nombre.toLowerCase();
  if (/semimarat/.test(t)) return { km: 21.097, tipo: TipoDistancia.MEDIA_MARATON };
  if (/marat/.test(t)) return { km: 42.195, tipo: TipoDistancia.MARATON };
  const mKm = t.match(/(\d+(?:[.,]\d+)?)\s*km/i);
  if (mKm) {
    const km = parseFloat(mKm[1].replace(",", "."));
    if (km <= 6) return { km, tipo: TipoDistancia.KM_5 };
    if (km <= 12) return { km, tipo: TipoDistancia.KM_10 };
    if (km <= 22) return { km, tipo: TipoDistancia.KM_20 };
    if (km <= 43) return { km, tipo: TipoDistancia.MARATON };
    return { km, tipo: TipoDistancia.ULTRA };
  }
  return { km: 0, tipo: TipoDistancia.OTRA };
}

function aCarreraExterna(ev: EventoRacetime): CarreraExterna | null {
  if (!esCarreraAPie(ev.nombre)) return null;
  const fecha = fechaDesdeTexto(ev.fechaTexto);
  if (!fecha || !ev.nombre) return null;

  const urlInscripcion = `https://racetime.ro/events/${ev.id}/register`;
  const { km, tipo } = kmDesdeTitulo(ev.nombre);
  const esTrail = /trail|munte|mountain/i.test(ev.nombre);

  return {
    fuenteTipo: "racetime-ro",
    fuenteNombre: "RaceTime (racetime.ro)",
    fuenteUrl: URL_HOME,
    externalId: ev.id,
    nombre: ev.nombre,
    ciudad: "Rumania",
    pais: "Rumania",
    codigoPais: "RO",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: URL_HOME,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlInscripcion,
    distancias: [{ tipo, km, terreno: esTrail ? "TRAIL" : "ASFALTO" }],
  };
}

export async function correrCollectorRacetimeRo() {
  return registrarEjecucion("racetime-ro", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_HOME, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`RaceTime respondió ${res.status}`);
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
