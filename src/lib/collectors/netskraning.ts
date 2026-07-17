import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de Netskráning.is, la plataforma islandesa de inscripción
// para carreras de calle, trail y ultras (equivalente local a
// RunSignup/CarrerasPanama). Es la fuente donde los propios
// organizadores islandeses (Náttúruhlaup, Félag Maraþonhlaupara,
// clubes deportivos locales, etc.) abren la inscripción de sus
// carreras, no un agregador comercial.
// robots.txt no existe en el dominio (404), y no hay ningún otro
// mecanismo de bloqueo — se scrapea con cabecera de User-Agent
// identificable de todas formas.
//
// La página de inicio también lista eventos de ciclismo (Hjólreiðas/
// gravel), un mercadillo de fitness (HYROX) y meets de pista federados
// (Frjálsar íþróttir), que se filtran porque no son carreras a pie.

const URL_INICIO = "https://netskraning.is/";
const CODIGO_PAIS = "IS";
const FUENTE_TIPO = "netskraning";

const EXCLUIR_NO_CARRERA = /hj[oó]l|gravel|hyrox|track\s*&\s*field|frj[aá]lsar\s*[ií]þr[oó]ttir/i;

const MESES_IS: Record<string, number> = {
  janúar: 1,
  febrúar: 2,
  mars: 3,
  apríl: 4,
  maí: 5,
  júní: 6,
  júlí: 7,
  ágúst: 8,
  september: 9,
  október: 10,
  nóvember: 11,
  desember: 12,
};

interface FilaNetskraning {
  externalId: string;
  nombre: string;
  ciudad: string;
  fecha: Date;
  sitioWeb: string;
  textoDistancias: string;
}

function parsearFecha(fechaTexto: string): Date | null {
  // Formatos vistos: "19. júlí 2026", "17. - 19. júlí 2026" (mismo mes),
  // "31. júlí - 1. ágúst 2026" (cruza de mes) — siempre nos quedamos con
  // el primer día y el primer nombre de mes que aparece en el texto,
  // que es el día de inicio de la carrera en todos los casos vistos.
  const diaMatch = fechaTexto.match(/^(\d{1,2})\./);
  const anioMatch = fechaTexto.match(/(\d{4})/);
  if (!diaMatch || !anioMatch) return null;

  let mes: number | null = null;
  const bajo = fechaTexto.toLowerCase();
  for (const nombreMes of Object.keys(MESES_IS)) {
    if (bajo.includes(nombreMes)) {
      mes = MESES_IS[nombreMes];
      break;
    }
  }
  if (!mes) return null;

  const dia = diaMatch[1].padStart(2, "0");
  const mesStr = String(mes).padStart(2, "0");
  // Islandia usa GMT todo el año (sin horario de verano), así que un
  // horario fijo a mediodía UTC no desplaza la fecha en ningún caso.
  return new Date(`${anioMatch[1]}-${mesStr}-${dia}T12:00:00Z`);
}

function parsearFilas(html: string): FilaNetskraning[] {
  const bloques = html.split('<a class="btn btn-primary"').slice(1);
  const filas: FilaNetskraning[] = [];

  for (const bloque of bloques) {
    const hrefMatch = bloque.match(/href="([^"]+)"/);
    if (!hrefMatch) continue;
    const url = hrefMatch[1].replace(/\/$/, "");
    const slug = url.replace(/^https?:\/\/netskraning\.is\//, "");
    if (!slug) continue;

    const nombreTags = [...bloque.matchAll(/<b>([^<]+)<\/b>/g)].map((m) => m[1].trim());
    if (nombreTags.length === 0) continue;
    const nombreBase = nombreTags[0].replace(/&amp;/g, "&");

    const subtituloMatch = bloque.match(/<b><i>([^<]+)<\/i><\/b>/);
    const subtitulo = subtituloMatch ? subtituloMatch[1].trim().replace(/&amp;/g, "&") : undefined;

    const fechaLineaMatch = bloque.match(/(\d{1,2}\.[^|]*?)\|\s*([^<]+?)\s*<br>/);
    if (!fechaLineaMatch) continue;
    const fecha = parsearFecha(fechaLineaMatch[1].trim());
    if (!fecha) continue;
    const ciudad = fechaLineaMatch[2].trim();

    // El "tipo" de carrera (Utanvegahlaup/Trail run, Götuhlaup/Road run,
    // distancias explícitas, etc.) viene justo después de la línea de
    // fecha/ciudad, antes de cerrar la celda de la tabla.
    const resto = bloque.slice(bloque.indexOf(fechaLineaMatch[0]) + fechaLineaMatch[0].length);
    const tipoMatch = resto.match(/^\s*([^<]*)/);
    const tipo = tipoMatch ? tipoMatch[1].replace(/\s+/g, " ").trim() : "";

    const textoCompleto = `${nombreBase} ${subtitulo ?? ""} ${tipo} ${slug}`;
    if (EXCLUIR_NO_CARRERA.test(textoCompleto)) continue;

    const nombre = subtitulo && subtitulo !== nombreBase ? `${nombreBase} (${subtitulo})` : nombreBase;

    filas.push({
      externalId: slug,
      nombre,
      ciudad,
      fecha,
      sitioWeb: url,
      textoDistancias: textoCompleto,
    });
  }
  return filas;
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

function distanciasDesdeTexto(texto: string): { tipo: TipoDistancia; km: number }[] {
  const resultados: { tipo: TipoDistancia; km: number }[] = [];

  const tieneMedia = /hálft\s*mara(þ|th)on|half[\s-]?marathon/i.test(texto);
  const tieneCompleto = /heilt\s*mara(þ|th)on|full\s*marathon|(?<!hálft\s)(?<!half-)(?<!half\s)mara(þ|th)on/i.test(
    texto
  );
  if (tieneMedia) resultados.push({ tipo: TipoDistancia.MEDIA_MARATON, km: 21.0975 });
  if (tieneCompleto) resultados.push({ tipo: TipoDistancia.MARATON, km: 42.195 });

  // Distancias numéricas explícitas tipo "10 km", "100 K", "5 km og 10 km".
  const kmMatches = [...texto.matchAll(/\b(\d{1,3})\s*[kK](?:m)?\b/g)];
  for (const m of kmMatches) {
    const km = parseInt(m[1], 10);
    if (km > 0 && km < 250) {
      resultados.push({ tipo: tipoDistanciaDesdeKm(km), km });
    }
  }

  if (resultados.length === 0) {
    // La página no siempre da una distancia parseable (p.ej. "Grindavík
    // Ultra" o "Molduxi trail" sin km explícito) — se guarda como OTRA
    // en vez de inventar un número que la fuente no da.
    resultados.push({ tipo: TipoDistancia.OTRA, km: 0 });
  }

  // Deduplicar por tipo+km (una carrera con "Hálft og heilt maraþon"
  // y además "21K" explícito en el texto no debería duplicar la media).
  const vistos = new Set<string>();
  return resultados.filter((d) => {
    const clave = `${d.tipo}-${d.km}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

function aCarreraExterna(fila: FilaNetskraning): CarreraExterna {
  const { pais, continente } = paisDesdeCodigoIso(CODIGO_PAIS);
  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: "Netskráning.is",
    fuenteUrl: URL_INICIO,
    externalId: fila.externalId,
    nombre: fila.nombre,
    ciudad: fila.ciudad || pais,
    pais,
    codigoPais: CODIGO_PAIS,
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: fila.sitioWeb,
    anio: fila.fecha.getFullYear(),
    fecha: fila.fecha,
    urlInscripcionOficial: fila.sitioWeb,
    distancias: distanciasDesdeTexto(fila.textoDistancias),
  };
}

export async function correrCollectorNetskraning() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    const res = await fetch(URL_INICIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Netskráning respondió ${res.status}`);
    const html = await res.text();
    const filas = parsearFilas(html);

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    for (const fila of filas) {
      try {
        const { creada } = await upsertCarreraExterna(aCarreraExterna(fila));
        if (creada) nuevas++;
        else actualizadas++;
      } catch {
        errores++;
      }
    }

    return { nuevas, actualizadas, errores };
  });
}
