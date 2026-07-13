import { Continente, TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { prisma } from "@/lib/prisma";
import type { CarreraExterna } from "./types";

// Recolector de RunSignup (EE. UU. y Canadá principalmente). Usa la API
// REST pública de búsqueda de carreras (/rest/races) — no hace falta
// autenticación para esta búsqueda; el OAuth2 (ver /admin/robots) queda
// disponible para funciones futuras que sí lo requieran, pero si se manda
// el token en esta búsqueda, la API la limita solo a las carreras de esa
// cuenta en particular (por eso NO se manda Authorization acá).
//
// Por ahora solo trae los datos básicos del listado (nombre, fecha,
// ciudad, link). Los detalles por carrera (distancias, precio exacto)
// están disponibles en /rest/race/{id} y quedan para una mejora futura,
// para no disparar cientos de llamadas extra en cada corrida semanal.
//
// RunSignup ordena el listado por nombre (A-Z) por defecto, no por
// fecha. Si cada corrida empezara siempre en la página 1, semana tras
// semana traeríamos siempre las mismas ~300 carreras (las que arrancan
// con símbolos/números) y nunca llegaríamos, por ejemplo, a las que
// empiezan con "M" (Miami, Medellín...). Por eso se guarda en
// EstadoCollector en qué página se quedó la última corrida y la
// siguiente sigue desde ahí, dando toda la vuelta al catálogo con el
// tiempo.

const BASE_URL = "https://api.runsignup.com/rest/races";

interface RaceRunSignup {
  race: {
    race_id: number;
    name: string;
    next_date: string; // "MM/DD/YYYY"
    url: string;
    address?: {
      city?: string;
      state?: string;
      country_code?: string;
    };
  };
}

function paisDesdeCodigo(codigo?: string): { pais: string; continente: Continente } {
  if (codigo === "CA") return { pais: "Canadá", continente: "AMERICA_DEL_NORTE" };
  return { pais: "Estados Unidos", continente: "AMERICA_DEL_NORTE" };
}

function fechaDesdeMMDDYYYY(texto: string): Date | null {
  const m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, mes, dia, anio] = m;
  return new Date(`${anio}-${mes}-${dia}T07:00:00Z`);
}

async function obtenerPaginaDeCarreras(pagina: number): Promise<RaceRunSignup[]> {
  const hoy = new Date().toISOString().slice(0, 10);
  const url = new URL(BASE_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("start_date", hoy);
  url.searchParams.set("results_per_page", "100");
  url.searchParams.set("page", String(pagina));
  url.searchParams.set("event_type", "running_race");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)",
    },
  });
  if (!res.ok) throw new Error(`RunSignup respondió ${res.status}`);
  const data = await res.json();
  return data.races ?? [];
}

function aCarreraExterna(r: RaceRunSignup["race"]): CarreraExterna | null {
  const fecha = fechaDesdeMMDDYYYY(r.next_date);
  if (!fecha) return null;

  const { pais, continente } = paisDesdeCodigo(r.address?.country_code);

  return {
    fuenteTipo: "runsignup",
    fuenteNombre: "RunSignup API",
    fuenteUrl: r.url,
    externalId: String(r.race_id),
    nombre: r.name,
    ciudad: r.address?.city ?? "",
    pais,
    codigoPais: r.address?.country_code,
    continente,
    // El listado no trae lat/lng; se completa más adelante con un
    // geocodificador si hace falta para el mapa.
    lat: 0,
    lng: 0,
    sitioWeb: r.url,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: r.url,
    distancias: [{ tipo: TipoDistancia.OTRA, km: 0 }],
  };
}

// Cuántas páginas (de 100 carreras cada una) se procesan por corrida, para
// no pasarnos del tiempo máximo de ejecución del cron (300s, ver
// maxDuration en /api/cron/collectors).
const PAGINAS_POR_CORRIDA = 5;

const COLLECTOR_ID = "runsignup";

export async function correrCollectorRunSignup() {
  return registrarEjecucion("runsignup", async () => {
    const estado = await prisma.estadoCollector.findUnique({ where: { collector: COLLECTOR_ID } });
    const paginaInicial = (estado?.cursor ?? 0) + 1;

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;
    let ultimaPaginaVista = estado?.cursor ?? 0;
    let dioLaVuelta = false;

    for (let i = 0; i < PAGINAS_POR_CORRIDA; i++) {
      const pagina = paginaInicial + i;
      const carreras = await obtenerPaginaDeCarreras(pagina);

      if (carreras.length === 0) {
        // Llegamos al final del catálogo: la próxima corrida arranca
        // de nuevo desde la página 1 para revisar altas nuevas.
        dioLaVuelta = true;
        break;
      }

      ultimaPaginaVista = pagina;

      for (const { race } of carreras) {
        try {
          const externa = aCarreraExterna(race);
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

      // Pausa entre páginas para no golpear la API de golpe.
      await new Promise((r) => setTimeout(r, 500));
    }

    await prisma.estadoCollector.upsert({
      where: { collector: COLLECTOR_ID },
      update: { cursor: dioLaVuelta ? 0 : ultimaPaginaVista },
      create: { collector: COLLECTOR_ID, cursor: dioLaVuelta ? 0 : ultimaPaginaVista },
    });

    return { nuevas, actualizadas, errores };
  });
}
