import { Continente, TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de RunSignup (EE. UU. y Canadá principalmente). Usa la API
// REST oficial y abierta — nada de scraping. Necesita una cuenta de
// desarrollador gratis en runsignup.com/API para conseguir las claves.
//
// Documentación: https://runsignup.com/API/Methods (método races/GET)

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
  // Mapeo mínimo; RunSignup es sobre todo EE. UU./Canadá.
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
  const apiKey = process.env.RUNSIGNUP_API_KEY;
  const apiSecret = process.env.RUNSIGNUP_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error("Faltan RUNSIGNUP_API_KEY / RUNSIGNUP_API_SECRET");

  const hoy = new Date().toISOString().slice(0, 10);
  const url = new URL(BASE_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("api_secret", apiSecret);
  url.searchParams.set("format", "json");
  url.searchParams.set("start_date", hoy);
  url.searchParams.set("results_per_page", "100");
  url.searchParams.set("page", String(pagina));
  url.searchParams.set("event_type", "running");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
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
    // RunSignup no siempre da lat/lng en la respuesta básica; se completan
    // más adelante con un geocodificador si hace falta.
    lat: 0,
    lng: 0,
    sitioWeb: r.url,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: r.url,
    // La API básica no trae distancias por evento en este endpoint; se
    // deja un placeholder y se puede enriquecer con una llamada de detalle
    // por carrera (races/{race_id}) más adelante.
    distancias: [{ tipo: TipoDistancia.OTRA, km: 0 }],
  };
}

export async function correrCollectorRunSignup() {
  return registrarEjecucion("runsignup", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    for (let pagina = 1; pagina <= 5; pagina++) {
      const carreras = await obtenerPaginaDeCarreras(pagina);
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
