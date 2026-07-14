import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de Runner.com.bo (calendario-de-carreras-en-bolivia),
// portal boliviano especializado en running (no agregador
// internacional). HTML server-rendered (Joomla), sin robots.txt que
// prohíba esta ruta.
//
// La fecha no aparece como texto en la tarjeta, pero sí codificada en
// la URL de la imagen de portada ("/images/2026/20260716-slug/...",
// YYYYMMDD), así que se saca de ahí.

const BASE_URL = "https://www.runner.com.bo";
const URL_CALENDARIO = `${BASE_URL}/calendario-de-carreras-en-bolivia`;

interface FilaRunnerBo {
  href: string;
  imgSrc: string;
  nombre: string;
  distanciasTexto: string;
  ciudad: string;
}

function normalizarEspacios(html: string): string {
  return html.replace(/\s+>/g, ">").replace(/>\s+/g, ">").replace(/\s+</g, "<");
}

function parsearFilas(html: string): FilaRunnerBo[] {
  const norm = normalizarEspacios(html);
  const imgs = [...norm.matchAll(/<div class="itemcci"><a href="([^"]+)"[^>]*><img src="([^"]*)"/g)];
  const cards = [
    ...norm.matchAll(
      /<h4>([^<]*)<\/h4><\/a><p><i class="fa fa-rocket"><\/i>([^<]*)<\/p><strong><i class="fa fa-map-marker"><\/i>([^<]*)<\/strong>/g,
    ),
  ];
  if (imgs.length !== cards.length) return [];

  return imgs.map((img, i) => ({
    href: img[1],
    imgSrc: img[2],
    nombre: cards[i][1].trim(),
    distanciasTexto: cards[i][2].trim(),
    ciudad: cards[i][3].trim(),
  }));
}

function fechaDesdeImagen(src: string): Date | null {
  const m = src.match(/\/images\/\d{4}\/(\d{4})(\d{2})(\d{2})-/);
  if (!m) return null;
  const [, anio, mes, dia] = m;
  return new Date(`${anio}-${mes}-${dia}T12:00:00Z`);
}

function kmDesdeTexto(texto: string): number {
  const numeros = [...texto.matchAll(/(\d+(?:[.,]\d+)?)/g)].map((m) => parseFloat(m[1].replace(",", ".")));
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

function aCarreraExterna(fila: FilaRunnerBo): CarreraExterna | null {
  const fecha = fechaDesdeImagen(fila.imgSrc);
  if (!fecha || !fila.nombre) return null;

  const km = kmDesdeTexto(fila.distanciasTexto);
  const externalId = fila.href.match(/\/carreras\/(\d+)/)?.[1] ?? fila.href;
  const urlCompleta = `${BASE_URL}${fila.href}`;

  return {
    fuenteTipo: "runnerbo",
    fuenteNombre: "Runner.com.bo",
    fuenteUrl: urlCompleta,
    externalId,
    nombre: fila.nombre,
    ciudad: fila.ciudad || "Bolivia",
    pais: "Bolivia",
    codigoPais: "BO",
    continente: "AMERICA_DEL_SUR",
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlCompleta,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorRunnerBo() {
  return registrarEjecucion("runnerbo", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_CALENDARIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Runner.com.bo respondió ${res.status}`);
    const html = await res.text();
    const filas = parsearFilas(html);

    for (const fila of filas) {
      try {
        const externa = aCarreraExterna(fila);
        if (!externa) continue;
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
