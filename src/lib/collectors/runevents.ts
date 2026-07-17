import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de RunEvents (England Athletics), el directorio oficial
// de carreras de ruta/trail avaladas por la federación inglesa de
// atletismo (no es un agregador comercial: es la propia federación
// listando sus eventos licenciados). La página de búsqueda
// (/runevents/search/) es una SPA en Vue, pero el widget consulta un
// endpoint JSON propio del sitio:
//   wp-admin/admin-ajax.php?action=data_api_search
// paginado (máximo 100 resultados por página, ~7 páginas en total para
// todo el país — no hace falta cursor). El robots.txt de
// englandathletics.org bloquea /wp-admin/ en general pero permite
// explícitamente "Allow: /wp-admin/admin-ajax.php", que es justo el
// endpoint que se usa acá.

const URL_BASE = "https://www.englandathletics.org/runevents/wp-admin/admin-ajax.php";
const POR_PAGINA = 100;

// El propio endpoint ya se filtra con types[]=event (deja afuera los
// clubes), pero por las dudas se descartan por nombre otras
// disciplinas que a veces comparten calendario con el running.
const PALABRAS_EXCLUIDAS = ["triathlon", "duathlon", "swim", "cycl", "bike"];

interface CarreraApi {
  id: string;
  type: string;
  status: string;
  name: string;
  start: string; // "YYYY-MM-DD HH:MM:SS"
  registration_url?: string | null;
  website_url?: string | null;
  races?: { name: string; distance: string }[];
  address?: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
}

interface RespuestaApi {
  data: CarreraApi[];
  meta?: { current_page: number; last_page: number };
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

// Convierte el texto libre de una distancia ("10 km", "6 miles", "Half
// Marathon", "Marathon", "Ultra", "Fun Run"...) a km. Para "Ultra" se
// usa un valor de comparación muy alto (no hay km exacto) así se
// prioriza como la distancia más larga cuando el evento ofrece varias.
function kmDesdeDistancia(texto: string): { km: number; comparacion: number } {
  const t = (texto || "").toLowerCase();
  if (t.includes("ultra")) return { km: 0, comparacion: 1000 };
  if (t.includes("half marathon")) return { km: 21.0975, comparacion: 21.0975 };
  if (t.includes("marathon")) return { km: 42.195, comparacion: 42.195 };

  const km = t.match(/(\d+(?:\.\d+)?)\s*km/);
  if (km) {
    const valor = parseFloat(km[1]);
    return { km: valor, comparacion: valor };
  }

  const millas = t.match(/(\d+(?:\.\d+)?)\s*miles?/);
  if (millas) {
    const valor = parseFloat(millas[1]) * 1.60934;
    return { km: valor, comparacion: valor };
  }

  return { km: 0, comparacion: 0 };
}

function distanciaMasLarga(races: { distance: string }[] | undefined): number {
  if (!races || races.length === 0) return 0;
  let mejor = { km: 0, comparacion: -1 };
  for (const r of races) {
    const info = kmDesdeDistancia(r.distance);
    if (info.comparacion > mejor.comparacion) mejor = info;
  }
  return mejor.km;
}

function aCarreraExterna(ev: CarreraApi): CarreraExterna | null {
  if (ev.type !== "event" || ev.status !== "ACTIVE") return null;
  if (!ev.name) return null;

  const nombreMin = ev.name.toLowerCase();
  if (PALABRAS_EXCLUIDAS.some((p) => nombreMin.includes(p))) return null;

  const fecha = new Date(`${ev.start.replace(" ", "T")}Z`);
  if (Number.isNaN(fecha.getTime())) return null;

  const km = distanciaMasLarga(ev.races);
  const urlInscripcion = ev.registration_url || undefined;
  const sitioWeb = ev.website_url || ev.registration_url || URL_BASE;

  return {
    fuenteTipo: "runevents",
    fuenteNombre: "England Athletics — RunEvents",
    fuenteUrl: sitioWeb,
    externalId: ev.id,
    nombre: ev.name,
    ciudad: ev.address?.city || ev.address?.region || "Reino Unido",
    pais: "Reino Unido",
    codigoPais: "GB",
    continente: "EUROPA",
    lat: ev.address?.latitude ?? 0,
    lng: ev.address?.longitude ?? 0,
    sitioWeb,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlInscripcion,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorRunEvents() {
  return registrarEjecucion("runevents", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    let pagina = 1;
    let ultimaPagina = 1;

    do {
      const url = `${URL_BASE}?action=data_api_search&types[]=event&limit=${POR_PAGINA}&page=${pagina}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
      });
      if (!res.ok) throw new Error(`RunEvents respondió ${res.status}`);
      const data: RespuestaApi = await res.json();
      ultimaPagina = data.meta?.last_page ?? 1;

      for (const ev of data.data ?? []) {
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

      pagina++;
    } while (pagina <= ultimaPagina);

    return { nuevas, actualizadas, errores };
  });
}
