import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector del sitio oficial del Access Bank Lagos City Marathon
// (lagoscitymarathon.com), la maratón más grande de Nigeria (World
// Athletics Elite Label Road Race) y una de las citas insignia del
// atletismo de ruta en África Occidental.
//
// No encontramos una fuente mejor para Nigeria: el sitio de la
// Athletics Federation of Nigeria (athleticsnigeria.org) es un blog de
// WordPress con noticias, pero su sección "/events/" y "/athletics-
// events/" solo tiene notas viejas (2013-2022) sin ningún calendario
// de carreras de ruta actual, y su REST API está bloqueada para
// consultas anónimas (plugin Shield Security). No se encontró ninguna
// plataforma nigeriana de timing/inscripción con calendario propio.
//
// robots.txt de lagoscitymarathon.com no tiene ninguna directiva
// Disallow (solo el preámbulo estándar sobre "content signals" para
// IA, sin bloquear nada en la práctica).
//
// Es un sitio de una sola carrera anual, así que se scrapea la home
// completa buscando la fecha (banner de cuenta regresiva) y las
// distancias que tengan botón de inscripción propio (cambian de año a
// año: en 2026 fueron 42K y 10K, en ediciones pasadas hubo también 21K
// y 5K).

const URL_SITIO = "https://lagoscitymarathon.com/";
const NOMBRE = "Access Bank Lagos City Marathon";

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

// "February 14, 2026" (texto del contador regresivo de la home).
const FECHA_REGEX = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})\b/i;

function fechaDesdeHtml(html: string): Date | null {
  const m = html.match(FECHA_REGEX);
  if (!m) return null;
  const mes = MESES[m[1].toLowerCase()];
  const dia = Number(m[2]);
  const anio = Number(m[3]);
  if (!mes || !dia || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T09:00:00Z`);
}

function tipoDistanciaDesdeKm(km: number): TipoDistancia {
  if (km <= 6) return TipoDistancia.KM_5;
  if (km <= 12) return TipoDistancia.KM_10;
  if (km <= 22) return TipoDistancia.MEDIA_MARATON;
  if (km <= 43) return TipoDistancia.MARATON;
  return TipoDistancia.ULTRA;
}

// Detecta qué distancias tienen botón de inscripción propio en la home
// ("42km Race Registration", "10km Race Registration", etc.) en vez de
// hardcodear una lista fija, para seguir funcionando si el evento
// agrega o saca distancias de una edición a la otra.
function distanciasDesdeHtml(html: string): { tipo: TipoDistancia; km: number; terreno: "ASFALTO" }[] {
  const km = new Set<number>();
  const re = /(\d{1,2})\s*km\s*Race/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const valor = Number(m[1]);
    if (valor > 0 && valor <= 50) km.add(valor);
  }
  if (km.size === 0) return [{ tipo: TipoDistancia.MARATON, km: 42.195, terreno: "ASFALTO" }];
  return [...km].map((k) => ({ tipo: tipoDistanciaDesdeKm(k), km: k === 42 ? 42.195 : k === 21 ? 21.0975 : k, terreno: "ASFALTO" as const }));
}

function aCarreraExterna(html: string): CarreraExterna | null {
  const fecha = fechaDesdeHtml(html);
  if (!fecha) return null;

  const { pais, continente } = paisDesdeCodigoIso("NG");
  const externalId = `${fecha.getFullYear()}`;

  return {
    fuenteTipo: "lagoscitymarathon",
    fuenteNombre: "Access Bank Lagos City Marathon (sitio oficial)",
    fuenteUrl: URL_SITIO,
    externalId,
    nombre: NOMBRE,
    ciudad: "Lagos",
    pais,
    codigoPais: "NG",
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: URL_SITIO,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: URL_SITIO,
    distancias: distanciasDesdeHtml(html),
  };
}

export async function correrCollectorLagosCityMarathon() {
  return registrarEjecucion("lagoscitymarathon", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_SITIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`lagoscitymarathon.com respondió ${res.status}`);
    const html = await res.text();

    try {
      const externa = aCarreraExterna(html);
      if (!externa) {
        errores++;
      } else {
        const { creada } = await upsertCarreraExterna(externa);
        if (creada) nuevas++;
        else actualizadas++;
      }
    } catch {
      errores++;
    }

    return { nuevas, actualizadas, errores };
  });
}
