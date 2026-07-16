import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de The TriFactory (thetrifactory.com), "Egypt's leading
// organiser of running races and mass participation sports events"
// (así se describe en su propia meta-descripción). Organiza en forma
// directa carreras como Pyramids Half Marathon, Saqqara Half Marathon,
// El Gouna Half Marathon y Madinaty Half Marathon, entre otras — no es
// un agregador de terceros, es la productora oficial de estos eventos
// (equivalente egipcio a un RunSignup/timing local).
//
// No encontramos una fuente mejor: el sitio de la Egyptian Athletic
// Federation no tiene calendario público de carreras de ruta (solo un
// portal de login para clubes en system.eaf-eg.com), y el sitio
// "Egyptian Marathon" (egyptianmarathon.com / .net) está protegido con
// contraseña ("Temporary Site Access" / site-lock) al momento de
// revisar, así que no se puede scrapear.
//
// El sitio de TriFactory es una SPA de Angular con Server-Side
// Rendering (Angular Universal): el HTML crudo de CUALQUIER página
// (probado con la home y con una página de carrera puntual) incluye un
// <script id="ng-state" type="application/json"> con el "TransferState"
// de Angular — ahí viaja, ya resuelta, la respuesta de la consulta que
// alimenta el menú de eventos: un array "events" con TODAS las carreras
// (pasadas y futuras) de la productora, cada una con su categoría
// ("website_header"). Se filtra por la categoría "1.Running Races" para
// quedarse solo con carreras de running y descartar Tough Mudder
// (obstáculos), "Row the Nile" (remo) y festivales de bienestar/aventura
// que también organiza la misma empresa.
//
// robots.txt de thetrifactory.com tampoco existe como archivo real (la
// ruta cae en el fallback de la SPA de Angular y devuelve el mismo
// index.html con 200), así que no hay ninguna directiva Disallow.

const URL_HOME = "https://www.thetrifactory.com/";
const CATEGORIA_RUNNING = "1.running races";

interface EventoApi {
  id: number;
  name: string;
  city?: string;
  country?: string;
  address?: string;
  event_start: string; // "2026-12-11 00:00:00"
  event_end?: string;
  slug?: string;
  website_header?: string;
  coming_soon?: number;
}

function desescaparEntidades(texto: string): string {
  return texto
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Busca, entre todos los valores del objeto ng-state (cuyas claves son
// hashes internos de Angular que pueden cambiar de build a build), el
// primero que tenga la forma { b: { events: [...] } } — así no depende
// de una clave puntual que podría dejar de existir en cualquier deploy.
function extraerEventos(ngState: Record<string, unknown>): EventoApi[] {
  for (const valor of Object.values(ngState)) {
    const posibles = (valor as { b?: { events?: unknown } })?.b?.events;
    if (Array.isArray(posibles) && posibles.length > 0 && typeof posibles[0] === "object") {
      return posibles as EventoApi[];
    }
  }
  return [];
}

function parsearNgState(html: string): EventoApi[] {
  const m = html.match(/<script id="ng-state"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return [];
  try {
    const json = JSON.parse(desescaparEntidades(m[1]));
    return extraerEventos(json);
  } catch {
    return [];
  }
}

function kmDesdeNombre(nombre: string): number {
  const n = nombre.toLowerCase();
  if (/half[\s-]?marathon/.test(n)) return 21.0975;
  if (/\bmarathon\b/.test(n)) return 42.195;
  const m = n.match(/(\d+(?:\.\d+)?)\s*k(?:m)?\b/);
  return m ? parseFloat(m[1]) : 10;
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

function fechaDesdeTexto(texto: string): Date | null {
  // "2026-12-11 00:00:00" (hora local de Egipto, no UTC explícito) —
  // se ancla al mediodía UTC para no correr de día al convertir zonas.
  const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const fecha = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00Z`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function ciudadDesdeEvento(evento: EventoApi): string {
  if (evento.city && evento.city.trim()) return evento.city.trim();
  if (evento.address) return evento.address.split(",").map((p) => p.trim()).filter(Boolean).pop() || "Egipto";
  return "Egipto";
}

function aCarreraExterna(evento: EventoApi): CarreraExterna | null {
  const fecha = fechaDesdeTexto(evento.event_start);
  // El listado de la productora mezcla ediciones pasadas y futuras de la
  // misma carrera; solo interesan las que todavía no pasaron.
  if (!fecha || !evento.name || fecha < new Date()) return null;

  const km = kmDesdeNombre(evento.name);
  const { pais, continente } = paisDesdeCodigoIso("EG");
  const externalId = String(evento.id || `${evento.slug}-${evento.event_start}`);
  const urlEvento = evento.slug ? `${URL_HOME}${evento.slug}` : URL_HOME;

  return {
    fuenteTipo: "thetrifactory",
    fuenteNombre: "The TriFactory",
    fuenteUrl: URL_HOME,
    externalId,
    nombre: evento.name,
    ciudad: ciudadDesdeEvento(evento),
    pais,
    codigoPais: "EG",
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: urlEvento,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlEvento,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorTheTriFactory() {
  return registrarEjecucion("thetrifactory", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_HOME, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`thetrifactory.com respondió ${res.status}`);
    const html = await res.text();
    const eventos = parsearNgState(html).filter(
      (e) => normalizar(e.website_header || "") === CATEGORIA_RUNNING,
    );

    for (const evento of eventos) {
      try {
        const externa = aCarreraExterna(evento);
        if (!externa) {
          errores++;
          continue;
        }
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
