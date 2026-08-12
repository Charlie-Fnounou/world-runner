// Generado por el agente automático (ver scripts/agente-recolectores/) y
// revisado/probado a mano antes de conectarlo: 8 carreras nuevas, 1 error
// aislado en la primera corrida real.

import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de la Asociación de Carreras de Ruta de Taipei Chino (Sportsnet Taiwán)
// (https://www.sportsnet.org.tw/race.php).
// Es el principal organismo y calendario de eventos de running en Taiwán.
//
// La portada /race.php sirve en HTML plano los próximos eventos populares con
// nombre, fecha (YYYY-MM-DD) y enlace oficial/detalles.

const URL_RACE = "https://www.sportsnet.org.tw/race.php";
const BASE_URL = "https://www.sportsnet.org.tw";

interface FilaSportsnet {
  href: string;
  nombre: string;
  fechaTexto: string;
}

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

function parsearFilas(html: string): FilaSportsnet[] {
  const filas: FilaSportsnet[] = [];
  const re = /<li><img[^>]*><a\s+href="([^"]+)"[^>]*>([^<]+)<\/a><div\s+class="date">(\d{4}-\d{2}-\d{2})<\/div><\/li>/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html))) {
    const href = m[1].trim();
    const nombre = decodificarHtml(m[2]);
    const fechaTexto = m[3].trim();

    if (nombre && fechaTexto) {
      filas.push({ href, nombre, fechaTexto });
    }
  }

  return filas;
}

function ciudadDesdeNombre(nombre: string): string {
  if (/金門/.test(nombre)) return "Kinmen";
  if (/臺北|台北/.test(nombre)) return "Taipei";
  if (/高雄/.test(nombre)) return "Kaohsiung";
  if (/臺中|台中/.test(nombre)) return "Taichung";
  if (/臺南|台南/.test(nombre)) return "Tainan";
  if (/新北/.test(nombre)) return "New Taipei";
  if (/桃園/.test(nombre)) return "Taoyuan";
  if (/陽明山/.test(nombre)) return "Taipei";
  return "Taipei";
}

function kmDesdeNombre(nombre: string): number {
  if (/半程馬拉松|半馬/.test(nombre)) return 21.0975;
  if (/馬拉松/.test(nombre)) return 42.195;

  const m = nombre.match(/(\d+(?:\.\d+)?)\s*(?:k|km|公里)/i);
  return m ? parseFloat(m[1]) : 0;
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

function generarExternalId(fila: FilaSportsnet): string {
  const parteUrl = fila.href.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]/g, "_");
  const parteNombre = fila.nombre.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "");
  return `${fila.fechaTexto}_${parteUrl}_${parteNombre}`.slice(0, 100);
}

function aCarreraExterna(fila: FilaSportsnet): CarreraExterna | null {
  const fecha = new Date(`${fila.fechaTexto}T10:00:00Z`);
  if (isNaN(fecha.getTime())) return null;

  const urlCompleta = fila.href.startsWith("http") ? fila.href : `${BASE_URL}/${fila.href.replace(/^\//, "")}`;
  const km = kmDesdeNombre(fila.nombre);
  const esTrail = /越野|trail/i.test(fila.nombre);
  const { pais, continente } = paisDesdeCodigoIso("TW");

  return {
    fuenteTipo: "sportsnet-tw",
    fuenteNombre: "CTRRA Sportsnet Taiwan",
    fuenteUrl: urlCompleta,
    externalId: generarExternalId(fila),
    nombre: fila.nombre,
    ciudad: ciudadDesdeNombre(fila.nombre),
    pais,
    codigoPais: "TW",
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlCompleta,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: esTrail ? "TRAIL" : "ASFALTO" }],
  };
}

export async function correrCollectorSportsnetTw() {
  return registrarEjecucion("sportsnet-tw", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_RACE, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Sportsnet Taiwán respondió ${res.status}`);
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
