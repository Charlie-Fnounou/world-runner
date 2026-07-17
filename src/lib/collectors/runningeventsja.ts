import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de Running Events Jamaica (runningeventsja.com), la
// plataforma jamaiquina de inscripción/cronometraje para carreras de
// calle abiertas al público (5K/10K corporativos, benéficos, etc.).
// Es una fuente primaria distinta de AIMS (aims-jm.ts, que solo trae
// carreras certificadas internacionalmente como el Reggae Marathon):
// esta empresa organiza e inscribe decenas de carreras jamaiquinas al
// año que nunca pasan por AIMS (ver /results/ del sitio: Sagicor Sigma
// Corporate Run, Burger King 5K, JN Group Race For Hope, CIBC Walk For
// The Cure, etc.) — no es un agregador comercial internacional, es el
// propio operador de inscripción/cronometraje local.
//
// robots.txt de runningeventsja.com (WordPress) solo prohíbe
// /wp-admin/ (con excepción de admin-ajax.php); no bloquea la home ni
// /registration/.
//
// El sitio usa el plugin Modern Events Calendar, pero su calendario
// interno está vacío — los próximos eventos en realidad se publican a
// mano como tarjetas en la portada (constructor de páginas Avada), cada
// una con un <h1> "Nombre — [Save the Date —] Weekday, Month Day[st|nd|
// rd|th], Year[ at H:MMam/pm]" enlazando a /registration/?event=CODIGO.
// No todas las tarjetas traen ese "?event=" (algunas enlazan solo a
// /registration/ genérico); cuando falta, se arma un externalId propio
// a partir del nombre y la fecha. Las tarjetas marcadas "Cancelled" se
// descartan.
const URL_INICIO = "https://www.runningeventsja.com/";
const CODIGO_PAIS = "JM";
const FUENTE_TIPO = "runningeventsja";

// Ciudad conocida por coincidir con un lugar inequívoco en el nombre
// del evento (no siempre viene explícita en la tarjeta).
const CIUDADES_POR_PISTA: { patron: RegExp; ciudad: string }[] = [
  { patron: /sangster|montego\s*bay|mobay/i, ciudad: "Montego Bay" },
  { patron: /kingston|palisadoes|norman\s*manley/i, ciudad: "Kingston" },
];

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

interface TarjetaEvento {
  externalId: string;
  nombre: string;
  fecha: Date;
  sitioWeb: string;
}

function quitarEtiquetas(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function decodificarEntidades(texto: string): string {
  return texto
    .replace(/&#8211;|&#8212;/g, "-")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function parsearFecha(texto: string): Date | null {
  const m = texto.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/);
  if (!m) return null;
  const mes = MESES[m[1].toLowerCase()];
  const dia = Number(m[2]);
  const anio = Number(m[3]);
  if (!mes || !dia || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T10:00:00Z`);
}

function parsearTarjetas(html: string): TarjetaEvento[] {
  const patronTarjeta = /race_title"[^>]*><h1[^>]*>([\s\S]*?)<\/h1>[\s\S]*?<a class="fusion-column-anchor" href="([^"]+)"/g;
  const tarjetas: TarjetaEvento[] = [];

  for (const m of html.matchAll(patronTarjeta)) {
    const textoCompleto = decodificarEntidades(quitarEtiquetas(m[1]));
    const href = m[2];

    if (/cancelled|canceled/i.test(textoCompleto)) continue;

    const fecha = parsearFecha(textoCompleto);
    if (!fecha) continue;

    const nombre = textoCompleto.split(/\s*-\s*/)[0].trim();
    if (!nombre) continue;

    const codigoEvento = href.match(/[?&]event=([A-Za-z0-9]+)/)?.[1];
    const externalId = codigoEvento
      ? codigoEvento
      : `${normalizar(nombre).replace(/[^a-z0-9]+/g, "-")}-${fecha.toISOString().slice(0, 10)}`;

    let sitioWeb = href.startsWith("http") ? href : `https://www.runningeventsja.com${href}`;
    if (sitioWeb.startsWith("http://")) sitioWeb = sitioWeb.replace("http://", "https://");

    tarjetas.push({ externalId, nombre, fecha, sitioWeb });
  }
  return tarjetas;
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

function distanciasDesdeNombre(nombre: string): number[] {
  if (/media\s+maraton|half[\s-]+marathon/i.test(nombre)) return [21.0975];
  if (/maraton(?!\s*(o|ia))|marathon/i.test(nombre)) return [42.195];
  const matches = [...nombre.matchAll(/(\d{1,2})\s*[kK](?!\w)/g)];
  const kms = matches.map((m) => parseInt(m[1], 10)).filter((n) => n > 0);
  return kms.length ? kms : [0];
}

function ciudadDesdeNombre(nombre: string, pais: string): string {
  for (const { patron, ciudad } of CIUDADES_POR_PISTA) {
    if (patron.test(nombre)) return ciudad;
  }
  return pais;
}

function aCarreraExterna(tarjeta: TarjetaEvento): CarreraExterna {
  const { pais, continente } = paisDesdeCodigoIso(CODIGO_PAIS);
  const kms = distanciasDesdeNombre(tarjeta.nombre);
  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: "Running Events Jamaica",
    fuenteUrl: URL_INICIO,
    externalId: tarjeta.externalId,
    nombre: tarjeta.nombre,
    ciudad: ciudadDesdeNombre(tarjeta.nombre, pais),
    pais,
    codigoPais: CODIGO_PAIS,
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: tarjeta.sitioWeb,
    anio: tarjeta.fecha.getFullYear(),
    fecha: tarjeta.fecha,
    urlInscripcionOficial: tarjeta.sitioWeb,
    distancias: kms.map((km) => ({ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" as const })),
  };
}

export async function correrCollectorRunningEventsJa() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    const res = await fetch(URL_INICIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Running Events Jamaica respondió ${res.status}`);
    const html = await res.text();
    const tarjetas = parsearTarjetas(html);

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    for (const tarjeta of tarjetas) {
      try {
        const { creada } = await upsertCarreraExterna(aCarreraExterna(tarjeta));
        if (creada) nuevas++;
        else actualizadas++;
      } catch {
        errores++;
      }
    }

    return { nuevas, actualizadas, errores };
  });
}
