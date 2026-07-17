import { EstadoInscripcion, TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de Marathon.mn, la plataforma oficial de inscripción para
// carreras de Mongolia (marathon.mn / api.marathon.mn). No es un
// agregador comercial: cada evento vive en un subdominio propio del
// organizador dentro de la misma plataforma (ej.
// https://ulaanbaatar.marathon.mn para el Maratón de Ulán Bator que
// organiza la ciudad, https://khadattrail.marathon.mn para Khadat
// Trail) — es el equivalente mongol de RunSignup/CarrerasPanama: los
// propios organizadores dan de alta ahí sus eventos para vender
// inscripciones y cobrar con Hipay. La app https://marathon.mn/ es una
// SPA en React; el listado real de eventos activos sale de su API
// pública en JSON (sin autenticación) en
// https://api.marathon.mn/api/front/season/list/company.
//
// robots.txt: marathon.mn y *.marathon.mn tienen "Disallow:" vacío (no
// restringen nada). api.marathon.mn no tiene robots.txt (404), lo que
// por convención se interpreta como sin restricciones.

const URL_API = "https://api.marathon.mn/api/front/season/list/company";
const URL_INICIO = "https://marathon.mn/";
const CODIGO_PAIS = "MN";
const FUENTE_TIPO = "marathonmn";

interface TemporadaMarathonMn {
  ID: string;
  TITLE?: string;
  TITLE_EN?: string;
  LOCATION?: string;
  LOCATION_EN?: string;
  LOCATION_LAT?: number | null;
  LOCATION_LONG?: number | null;
  START_DATE?: string;
  REGISTER_START_DATE?: string;
  REGISTER_CLOSE_DATE?: string;
  REG_DISABLED?: number;
  MERCHANT_DOMAIN?: string;
}

interface RespuestaMarathonMn {
  success: boolean;
  activeSeasons?: TemporadaMarathonMn[];
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

// La API no expone las distancias/categorías de cada carrera de forma
// pública (ese detalle vive detrás de login, en el flujo de compra) —
// se infieren del nombre del evento, igual que en carreraspanama.ts.
function distanciasDesdeNombre(nombre: string): number[] {
  if (/media\s+maraton|half[\s-]*marathon/i.test(nombre)) return [21.0975];
  if (/maraton(?!\s*(o|ia))|marathon/i.test(nombre)) return [42.195];
  const matches = [...nombre.matchAll(/(\d{1,3})\s*[kK](?!\w)/g)];
  const kms = matches.map((m) => parseInt(m[1], 10)).filter((n) => n > 0);
  return kms.length ? kms : [0];
}

function estadoDesdeTemporada(t: TemporadaMarathonMn, fecha: Date): EstadoInscripcion | undefined {
  if (t.REG_DISABLED === 1) return EstadoInscripcion.CERRADA;
  const ahora = Date.now();
  const inicio = t.REGISTER_START_DATE ? new Date(t.REGISTER_START_DATE).getTime() : undefined;
  const cierre = t.REGISTER_CLOSE_DATE ? new Date(t.REGISTER_CLOSE_DATE).getTime() : undefined;
  if (inicio && ahora < inicio) return EstadoInscripcion.PROXIMAMENTE;
  if (cierre && ahora > cierre) return EstadoInscripcion.CERRADA;
  if (fecha.getTime() < ahora) return EstadoInscripcion.CERRADA;
  if (inicio || cierre) return EstadoInscripcion.ABIERTA;
  return undefined;
}

function aCarreraExterna(t: TemporadaMarathonMn): CarreraExterna | null {
  if (!t.ID || !t.START_DATE) return null;
  const fecha = new Date(t.START_DATE);
  if (Number.isNaN(fecha.getTime())) return null;

  const nombre = (t.TITLE_EN || t.TITLE || "").trim();
  if (!nombre) return null;

  const { pais, continente } = paisDesdeCodigoIso(CODIGO_PAIS);
  const kms = distanciasDesdeNombre(nombre);
  const dominio = t.MERCHANT_DOMAIN ? `https://${t.MERCHANT_DOMAIN}.marathon.mn/` : URL_INICIO;

  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: "Marathon.mn",
    fuenteUrl: URL_INICIO,
    externalId: t.ID,
    nombre,
    ciudad: (t.LOCATION_EN || t.LOCATION || pais).trim(),
    pais,
    codigoPais: CODIGO_PAIS,
    continente,
    lat: t.LOCATION_LAT ?? 0,
    lng: t.LOCATION_LONG ?? 0,
    sitioWeb: dominio,
    anio: fecha.getFullYear(),
    fecha,
    estado: estadoDesdeTemporada(t, fecha),
    urlInscripcionOficial: dominio,
    distancias: kms.map((km) => ({ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" as const })),
  };
}

export async function correrCollectorMarathonMn() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    const res = await fetch(URL_API, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Marathon.mn respondió ${res.status}`);
    const data = (await res.json()) as RespuestaMarathonMn;
    if (!data.success || !Array.isArray(data.activeSeasons)) {
      throw new Error("Marathon.mn: respuesta sin activeSeasons");
    }

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    for (const temporada of data.activeSeasons) {
      const carrera = aCarreraExterna(temporada);
      if (!carrera) {
        errores++;
        continue;
      }
      try {
        const { creada } = await upsertCarreraExterna(carrera);
        if (creada) nuevas++;
        else actualizadas++;
      } catch {
        errores++;
      }
    }

    return { nuevas, actualizadas, errores };
  });
}
