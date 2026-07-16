import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de runINDIA (runindia.in), plataforma india de
// inscripción a carreras de calle: los organizadores publican su
// carrera ahí y los corredores se anotan y pagan directo en el sitio
// (cada tarjeta tiene un botón "Register Now" a
// /events/{id}/register-wizard) — no es un directorio que solo
// enlaza a otro lado, es la inscripción en sí. robots.txt no
// restringe nada ("Disallow:" vacío).
//
// La página /events funciona sin JavaScript: aunque está armada con
// Laravel Livewire, el primer response ya trae las tarjetas
// renderizadas en HTML plano, con la fecha, ciudad y coordenadas del
// evento embebidas como atributos `data-*` y en la llamada
// `openMap(lat, lng, lugar, direccion, ciudad, estado)` de cada
// tarjeta.
//
// Por ahora la plataforma solo lista un puñado de carreras próximas
// (la paginación con ?page=N se agota rápido, sin más resultados) —
// es una plataforma joven y todavía con pocos organizadores, pero es
// la fuente primaria real, así que se toma lo que hay; va a ir
// creciendo con cada corrida del recolector.

const URL_BASE = "https://www.runindia.in";
const URL_EVENTOS = `${URL_BASE}/events`;

const TARJETA_REGEX =
  /<div class="event-card"\s+data-event-name="([^"]*)"\s+data-event-city="([^"]*)"\s+data-event-date="(\d+)">/g;

interface TarjetaRunIndia {
  nombreAtributo: string;
  ciudadAtributo: string;
  fechaEpoch: number;
  bloque: string;
}

function extraerTarjetas(html: string): TarjetaRunIndia[] {
  const inicios: { idx: number; nombreAtributo: string; ciudadAtributo: string; fechaEpoch: number }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(TARJETA_REGEX);
  while ((m = re.exec(html))) {
    inicios.push({ idx: m.index, nombreAtributo: m[1], ciudadAtributo: m[2], fechaEpoch: Number(m[3]) });
  }
  return inicios.map((ini, i) => ({
    ...ini,
    bloque: html.slice(ini.idx, i + 1 < inicios.length ? inicios[i + 1].idx : ini.idx + 6000),
  }));
}

function parsearTarjeta(t: TarjetaRunIndia): { externalId: string; nombre: string; ciudad: string; lat: number; lng: number } | null {
  const detalle = t.bloque.match(/href="https:\/\/www\.runindia\.in\/events\/([A-Za-z0-9_-]+)"[^>]*>\s*\n?\s*([^<]+?)\s*<\/a>/);
  if (!detalle) return null;
  const mapa = t.bloque.match(/openMap\(\s*'([^']*)',\s*'([^']*)',\s*'[^']*',\s*'[^']*',\s*'([^']*)',\s*'([^']*)'/);
  return {
    externalId: detalle[1],
    nombre: detalle[2].trim(),
    ciudad: mapa?.[3] || capitalizar(t.ciudadAtributo),
    lat: mapa ? parseFloat(mapa[1]) : 0,
    lng: mapa ? parseFloat(mapa[2]) : 0,
  };
}

function capitalizar(texto: string): string {
  return texto.replace(/\b\w/g, (c) => c.toUpperCase());
}

function kmDesdeNombre(nombre: string): number {
  const n = nombre.toLowerCase();
  const numeros = [...n.matchAll(/(\d+(?:\.\d+)?)\s*k(?:m)?\b/g)].map((m) => parseFloat(m[1]));
  if (/full marathon|\b42\.195\b/.test(n) && !numeros.some((x) => x > 40)) numeros.push(42.195);
  if (/half marathon/.test(n) && !numeros.some((x) => x > 20 && x < 22)) numeros.push(21.0975);
  return numeros.length ? Math.max(...numeros) : 0;
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

function aCarreraExterna(t: TarjetaRunIndia): CarreraExterna | null {
  const datos = parsearTarjeta(t);
  if (!datos || !datos.nombre || !t.fechaEpoch) return null;

  const fecha = new Date(t.fechaEpoch * 1000);
  if (Number.isNaN(fecha.getTime())) return null;

  const { pais, continente } = paisDesdeCodigoIso("IN");
  const km = kmDesdeNombre(datos.nombre);
  const esTrail = /trail/i.test(datos.nombre);
  const urlEvento = `${URL_BASE}/events/${datos.externalId}`;

  return {
    fuenteTipo: "runindia",
    fuenteNombre: "runINDIA",
    fuenteUrl: urlEvento,
    externalId: datos.externalId,
    nombre: datos.nombre,
    ciudad: datos.ciudad || "India",
    pais,
    codigoPais: "IN",
    continente,
    lat: datos.lat,
    lng: datos.lng,
    sitioWeb: urlEvento,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: `${urlEvento}/register-wizard`,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: esTrail ? "TRAIL" : "ASFALTO" }],
  };
}

export async function correrCollectorRunIndia() {
  return registrarEjecucion("runindia", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_EVENTOS, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`runINDIA respondió ${res.status}`);
    const html = await res.text();
    const tarjetas = extraerTarjetas(html);

    for (const tarjeta of tarjetas) {
      try {
        const externa = aCarreraExterna(tarjeta);
        if (!externa) continue;
        console.log("[runindia]", externa.nombre, "|", externa.ciudad, "|", externa.fecha.toISOString());
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
