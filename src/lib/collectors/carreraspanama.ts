import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de CarrerasPanama.com, la plataforma panameña de
// inscripción y cronometraje para carreras de calle (equivalente local
// a RunSignup/Runchile). Fuente primaria: los propios organizadores
// dan de alta sus eventos ahí para vender inscripciones.
// robots.txt no restringe nada ("Disallow:" vacío).

const URL_INICIO = "https://carreraspanama.com/";
const CODIGO_PAIS = "PA";
const FUENTE_TIPO = "carreraspanama";

interface FilaCarrerasPanama {
  externalId: string;
  nombre: string;
  fecha: Date;
  sitioWeb: string;
}

function parsearFecha(ddmmyyyy: string): Date | null {
  const m = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dia, mes, anio] = m;
  return new Date(`${anio}-${mes}-${dia}T10:00:00Z`);
}

function parsearFilas(html: string): FilaCarrerasPanama[] {
  const bloques = html.split('<div class="pro-list-box-2">').slice(1);
  const filas: FilaCarrerasPanama[] = [];

  for (const bloque of bloques) {
    const idMatch = bloque.match(/evento\/(\d+)\/registrar/);
    const fechaMatch = bloque.match(/fa-calendar-alt[^>]*><\/i>\s*(\d{2}\/\d{2}\/\d{4})/);
    const nombreMatch = bloque.match(/<h4>([^<]+)<\/h4>/);
    if (!idMatch || !fechaMatch || !nombreMatch) continue;

    const fecha = parsearFecha(fechaMatch[1]);
    if (!fecha) continue;

    filas.push({
      externalId: idMatch[1],
      nombre: nombreMatch[1].trim().replace(/&amp;/g, "&"),
      fecha,
      sitioWeb: `https://carreraspanama.com/tarjeta/evento/${idMatch[1]}/registrar`,
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

function distanciasDesdeNombre(nombre: string): number[] {
  if (/media\s+maraton|half[\s-]+marathon/i.test(nombre)) return [21.0975];
  if (/maraton(?!\s*(o|ia))|marathon/i.test(nombre)) return [42.195];
  const matches = [...nombre.matchAll(/(\d{1,2})\s*[kK](?!\w)/g)];
  const kms = matches.map((m) => parseInt(m[1], 10)).filter((n) => n > 0);
  return kms.length ? kms : [0];
}

function aCarreraExterna(fila: FilaCarrerasPanama): CarreraExterna {
  const { pais, continente } = paisDesdeCodigoIso(CODIGO_PAIS);
  const kms = distanciasDesdeNombre(fila.nombre);
  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: "CarrerasPanama.com",
    fuenteUrl: URL_INICIO,
    externalId: fila.externalId,
    nombre: fila.nombre,
    ciudad: pais,
    pais,
    codigoPais: CODIGO_PAIS,
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: fila.sitioWeb,
    anio: fila.fecha.getFullYear(),
    fecha: fila.fecha,
    urlInscripcionOficial: fila.sitioWeb,
    distancias: kms.map((km) => ({ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" as const })),
  };
}

export async function correrCollectorCarrerasPanama() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    const res = await fetch(URL_INICIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`CarrerasPanama respondió ${res.status}`);
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
