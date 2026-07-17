import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector del sitio oficial del Kigali International Peace Marathon,
// la carrera de calle más importante de Ruanda, organizada por la Rwanda
// Athletics Federation (RAF) junto con el Ministerio de Deportes
// (MINISPORTS). Ruanda no tiene una plataforma de calendario nacional de
// carreras ni un colector de inscripciones tipo RunSignup, así que se usa
// la página "General Info" del sitio oficial del evento, que trae fecha,
// distancias y estado de inscripción en una tabla HTML fija y estable
// entre ediciones.
// robots.txt de kigalimarathon.org solo prohíbe /wp-admin/; la ruta
// usada acá (/general-info/) no está restringida.

const URL_INICIO = "https://kigalimarathon.org/general-info/";
const CODIGO_PAIS = "RW";
const FUENTE_TIPO = "kigalimarathon";

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

function parsearFecha(texto: string): Date | null {
  const m = texto.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return null;
  const mes = MESES[m[1].toLowerCase()];
  if (!mes) return null;
  const dia = m[2].padStart(2, "0");
  const mesStr = String(mes).padStart(2, "0");
  return new Date(`${m[3]}-${mesStr}-${dia}T09:00:00Z`);
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

interface DatosKigaliMarathon {
  externalId: string;
  nombre: string;
  fecha: Date;
  distanciasKm: number[];
}

function parsearPagina(html: string): DatosKigaliMarathon | null {
  const nombreMatch = html.match(/Name of event:<\/td><td class="column-2">\s*([^<]+?)\s*<\/td>/i);
  const fechaCelda = html.match(/Date of event:<\/td><td class="column-2">([\s\S]*?)<\/td>/i);
  if (!nombreMatch || !fechaCelda) return null;

  // La celda de fecha trae 1 o 2 fechas separadas por <br /> (sábado del
  // "fun run" y domingo del maratón/media maratón); nos quedamos con la
  // última, que es el día principal del evento.
  const fechasEncontradas = [...fechaCelda[1].matchAll(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/g)];
  if (!fechasEncontradas.length) return null;
  const fecha = parsearFecha(fechasEncontradas[fechasEncontradas.length - 1][0]);
  if (!fecha) return null;

  // El nombre viene con el número de edición adelante, ej. "21. Kigali
  // International Peace Marathon" — se descarta, ya lo guardamos aparte.
  const nombre = nombreMatch[1].replace(/^\d+\.\s*/, "").trim();

  const distanciasKm: number[] = [];
  const fullMatch = html.match(/Full Marathon,\s*([\d,.]+)\s*km/i);
  const halfMatch = html.match(/Half Marathon,\s*([\d,.]+)\s*km/i);
  const funRunMatch = html.match(/Fun [Rr]un for Peace\s*\((\d{1,2})\s*km/i);
  if (fullMatch) distanciasKm.push(parseFloat(fullMatch[1].replace(",", ".")));
  if (halfMatch) distanciasKm.push(parseFloat(halfMatch[1].replace(",", ".")));
  if (funRunMatch) distanciasKm.push(parseInt(funRunMatch[1], 10));
  if (!distanciasKm.length) distanciasKm.push(42.195);

  return {
    externalId: `kigali-peace-marathon-${fecha.getFullYear()}`,
    nombre,
    fecha,
    distanciasKm,
  };
}

function aCarreraExterna(datos: DatosKigaliMarathon): CarreraExterna {
  const { pais, continente } = paisDesdeCodigoIso(CODIGO_PAIS);
  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: "Kigali International Peace Marathon (sitio oficial)",
    fuenteUrl: URL_INICIO,
    externalId: datos.externalId,
    nombre: datos.nombre,
    ciudad: "Kigali",
    pais,
    codigoPais: CODIGO_PAIS,
    continente,
    lat: -1.9441,
    lng: 30.0619,
    sitioWeb: "https://kigalimarathon.org/",
    anio: datos.fecha.getFullYear(),
    fecha: datos.fecha,
    urlInscripcionOficial: "https://www.kigalimarathon.rw/registration",
    distancias: datos.distanciasKm.map((km) => ({ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" as const })),
  };
}

export async function correrCollectorKigaliMarathon() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    const res = await fetch(URL_INICIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Kigali Marathon respondió ${res.status}`);
    const html = await res.text();
    const datos = parsearPagina(html);

    if (!datos) {
      return { nuevas: 0, actualizadas: 0, errores: 1 };
    }

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    try {
      const { creada } = await upsertCarreraExterna(aCarreraExterna(datos));
      if (creada) nuevas++;
      else actualizadas++;
    } catch {
      errores++;
    }

    return { nuevas, actualizadas, errores };
  });
}
