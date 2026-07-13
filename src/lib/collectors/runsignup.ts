import { Continente, TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { obtenerAccessTokenRunSignup } from "./runsignup-auth";
import type { CarreraExterna } from "./types";

// Recolector de RunSignup (EE. UU. y Canadá principalmente). Usa la API
// REST oficial vía OAuth2 (ver /admin/robots para conectar la cuenta) —
// nada de scraping.
//
// Por ahora solo trae los datos básicos del listado (nombre, fecha,
// ciudad, link). Los detalles por carrera (distancias, precio exacto)
// están disponibles en /rest/race/{id} y quedan para una mejora futura,
// para no disparar cientos de llamadas extra en cada corrida semanal.

const BASE_URL = "https://runsignup.com/rest/races";

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

async function obtenerPaginaDeCarreras(accessToken: string, pagina: number): Promise<RaceRunSignup[]> {
  const hoy = new Date().toISOString().slice(0, 10);
  const url = new URL(BASE_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("start_date", hoy);
  url.searchParams.set("results_per_page", "100");
  url.searchParams.set("page", String(pagina));
  url.searchParams.set("event_type", "running");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
// no pasarnos del tiempo máximo de ejecución del cron.
const PAGINAS_POR_CORRIDA = 3;

export async function correrCollectorRunSignup() {
  return registrarEjecucion("runsignup", async () => {
    const accessToken = await obtenerAccessTokenRunSignup();

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    for (let pagina = 1; pagina <= PAGINAS_POR_CORRIDA; pagina++) {
      const carreras = await obtenerPaginaDeCarreras(accessToken, pagina);
      if (carreras.length === 0) break;

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

    return { nuevas, actualizadas, errores };
  });
}
