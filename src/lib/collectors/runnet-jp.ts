import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de RUNNET (runjapan.jp), la plataforma de inscripción a
// carreras más grande de Japón (más de 2000 eventos/año, en operación
// desde 1997). No es un agregador: los propios organizadores usan
// RUNNET directamente para gestionar la inscripción de sus carreras
// (lo mismo que RunSignup en EE.UU.), y tiene una versión en inglés
// pensada para corredores internacionales (runjapan.jp).
//
// robots.txt (https://runjapan.jp/robots.txt) solo bloquea dos rutas
// puntuales (/E331027/ y /E331087/), nada relacionado a la búsqueda de
// carreras.
//
// La portada de búsqueda (GET /entry/runtes/smp/racesearchdetail.do
// ?command=search) devuelve, sin JavaScript, una selección de ~10
// carreras próximas ya con fecha, ciudad y distancias en el HTML
// (bloques <section class="event-region-section">). El resto del
// listado se carga por AJAX con paginación vía jPages, que no expone
// un endpoint JSON simple — en vez de perseguir eso, este recolector
// se queda con ese bloque inicial, que igual trae carreras reales y
// vigentes (fechas 2026 confirmadas al momento de escribir esto).

const URL_BUSQUEDA = "https://runjapan.jp/entry/runtes/smp/racesearchdetail.do?command=search";
const URL_BASE = "https://runjapan.jp";

const MESES: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

interface EventoRunnet {
  raceId: string;
  titulo: string;
  fechaTexto: string;
  ubicacion: string;
  distanciasTexto: string;
}

function limpiarTexto(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extraerEventos(html: string): EventoRunnet[] {
  const eventos: EventoRunnet[] = [];
  const bloques = html.split('<section class="event-region-section"').slice(1);

  for (const bloqueCrudo of bloques) {
    const bloque = bloqueCrudo.split("</section>")[0];

    const raceId = bloque.match(/competitiondetail\.do\?raceId=([A-Za-z0-9]+)/)?.[1];
    if (!raceId) continue;

    const tituloMatch = bloque.match(/<h3 class="event-title">([\s\S]*?)<\/h3>/);
    const titulo = tituloMatch ? limpiarTexto(tituloMatch[1]) : "";
    if (!titulo || titulo.toLowerCase() === "register") continue;

    const fechaMatch = bloque.match(/<p class="event-date">([\s\S]*?)<\/p>/);
    const fechaTexto = fechaMatch ? limpiarTexto(fechaMatch[1]) : "";

    const ubicacionMatch = bloque.match(/<p class="event-locations">([\s\S]*?)<\/p>/);
    const ubicacion = ubicacionMatch ? limpiarTexto(ubicacionMatch[1]) : "";

    const distanciasMatch = bloque.match(/<p class="event-distances">([\s\S]*?)<\/p>/);
    const distanciasTexto = distanciasMatch ? limpiarTexto(distanciasMatch[1]) : "";

    eventos.push({ raceId, titulo, fechaTexto, ubicacion, distanciasTexto });
  }

  // Cada carrera puede aparecer dos veces en el HTML (el título arriba
  // y el botón "Register" que repite el mismo raceId): se deduplica.
  const vistos = new Set<string>();
  return eventos.filter((e) => {
    if (vistos.has(e.raceId)) return false;
    vistos.add(e.raceId);
    return true;
  });
}

function fechaDesdeTexto(texto: string): Date | null {
  const m = texto.match(/([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})/);
  if (!m) return null;
  const mes = MESES[m[1].toLowerCase()];
  const dia = Number(m[2]);
  const anio = Number(m[3]);
  if (!mes || !dia || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T10:00:00Z`);
}

function ciudadDesdeUbicacion(ubicacion: string): string {
  // Formato típico: "Fujiyoshida City (Yamanashi) , Japan"
  return ubicacion.replace(/,?\s*Japan\s*$/i, "").trim() || "Japón";
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

function distanciaDesdeTexto(texto: string): { tipo: TipoDistancia; km: number } | null {
  const t = texto.trim();
  if (!t) return null;
  const low = t.toLowerCase();

  if (low.includes("half marathon")) return { tipo: TipoDistancia.MEDIA_MARATON, km: 21.1 };
  if (low === "marathon" || low.includes("full marathon")) return { tipo: TipoDistancia.MARATON, km: 42.195 };

  const km = low.match(/(\d+(?:\.\d+)?)\s*km/)?.[1] ?? low.match(/(\d+(?:\.\d+)?)\s*k\b/)?.[1];
  if (km) {
    const valor = parseFloat(km);
    return { tipo: tipoDistanciaDesdeKm(valor), km: valor };
  }

  return { tipo: TipoDistancia.OTRA, km: 0 };
}

function distanciasDesdeTexto(texto: string): { tipo: TipoDistancia; km: number; terreno: "ASFALTO" | "TRAIL" }[] {
  const partes = texto
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const esTrail = /trail/i.test(texto);
  const distancias = partes
    .map(distanciaDesdeTexto)
    .filter((d): d is { tipo: TipoDistancia; km: number } => d !== null)
    .map((d) => ({ ...d, terreno: (esTrail ? "TRAIL" : "ASFALTO") as "ASFALTO" | "TRAIL" }));

  return distancias.length ? distancias : [{ tipo: TipoDistancia.OTRA, km: 0, terreno: "ASFALTO" }];
}

function aCarreraExterna(ev: EventoRunnet): CarreraExterna | null {
  const fecha = fechaDesdeTexto(ev.fechaTexto);
  if (!fecha || !ev.titulo) return null;

  const urlDetalle = `${URL_BASE}/entry/runtes/smp/competitiondetail.do?raceId=${ev.raceId}&div=1`;
  const { pais, continente } = paisDesdeCodigoIso("JP");

  return {
    fuenteTipo: "runnet-jp",
    fuenteNombre: "RUNNET Japan (Run Japan)",
    fuenteUrl: urlDetalle,
    externalId: ev.raceId,
    nombre: ev.titulo,
    ciudad: ciudadDesdeUbicacion(ev.ubicacion),
    pais,
    codigoPais: "JP",
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: urlDetalle,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlDetalle,
    distancias: distanciasDesdeTexto(ev.distanciasTexto),
  };
}

export async function correrCollectorRunnetJp() {
  return registrarEjecucion("runnet-jp", async () => {
    const res = await fetch(URL_BUSQUEDA, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`runjapan.jp respondió ${res.status}`);
    const html = await res.text();
    const eventos = extraerEventos(html);

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

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
