import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de Eesti Kergejõustikuliit (EKJL), la federación
// estonia de atletismo, desde su calendario oficial de competencias
// (ekjl.ee/competitions/?lang=en). robots.txt sólo bloquea un archivo
// JSON puntual de un plugin de rendimiento; /competitions/ está
// permitido. La página trae, server-rendered sin JavaScript, TODAS
// las próximas competencias (de pista, cross, marcha y carreras de
// calle) agrupadas por mes hasta donde haya eventos cargados —en la
// práctica cubre más de un año hacia adelante—, cada una con su
// tarjeta (nombre, fecha, sede) seguida del modal con los datos
// completos (categoría, link de inscripción/sitio oficial, contacto).
//
// Como la federación mezcla ahí TODO el atletismo, nos quedamos sólo
// con las tarjetas cuyo nombre contiene "jooks" (carrera/corrida, en
// estonio) o "maraton" — así se deja afuera saltos, lanzamientos y
// carreras de pista corta. Se descartan además las que se corren en
// un "staadion" (pista de atletismo: son series de club en pista, no
// carreras de calle) y los campeonatos mundiales que Estonia lista en
// su calendario pero que se corren en el extranjero
// ("maailmameistrivõistlused" fuera de Estonia).
//
// El id de cada tarjeta en el HTML (usado para el modal de Bootstrap,
// ej. "competition-6a583b5199e7c") no es un identificador estable de
// la competencia en sí —cambia entre renders—, así que el externalId
// se arma con fecha + nombre normalizado, como en otros recolectores
// de este repo que no tienen un id propio expuesto.

const URL_COMPETICIONES = "https://www.ekjl.ee/competitions/?lang=en";

// Algunas sedes en el calendario no son nombres de ciudad sino de
// plaza/instalación deportiva — se corrigen a mano las más frecuentes
// en vez de guardar un nombre de "ciudad" que en realidad es una
// plaza o un sendero.
// Claves ya sin diacríticos (se comparan contra normalizar()).
const CIUDADES: Record<string, string> = {
  "vabaduse valjak": "Tallinn",
  "jarvevana tee 3": "Tallinn",
  "sillamae terviserada ja joulinnakud": "Sillamäe",
  "rakvere palermo terviserajad": "Rakvere",
  "jarvakandi terviserajad": "Järvakandi",
};

function limpiarTexto(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

interface FilaEkjl {
  nombre: string;
  fechaTexto: string;
  ubicacion: string;
  url: string | null;
}

function extraerFilas(html: string): FilaEkjl[] {
  const bloques = html.split('<div class="col-12 col-lg-3 col-md-4 col-sm-6">').slice(1);
  const filas: FilaEkjl[] = [];

  for (const b of bloques) {
    const nombre = limpiarTexto(b.match(/<h6 class="font-weight-bold"[^>]*>([^<]+)<\/h6>/)?.[1] ?? "");
    if (!nombre) continue;
    const fechaTexto = b.match(/class="competition-info-date font-weight-bold"[^>]*>([^<]+)</)?.[1]?.trim();
    if (!fechaTexto) continue;
    const ubicacion = limpiarTexto(b.match(/class="competition-info-location"[^>]*>([^<]*)</)?.[1] ?? "");

    // Link de inscripción/info del organizador si está publicado en el
    // modal ("Info ja registreerimine: <a href=...>"); si no, se cae al
    // link "Veebileht" (sitio web) de la ficha.
    const registro = b.match(/registreerimine:\s*<a href="([^"]+)"/)?.[1];
    const veebileht = b.match(/href="([^"]+)"[^>]*>Veebileht<\/a>/)?.[1];

    filas.push({ nombre, fechaTexto, ubicacion, url: registro ?? veebileht ?? null });
  }
  return filas;
}

function esCarreraDeCalle(nombre: string, ubicacion: string): boolean {
  const n = nombre.toLowerCase();
  if (!(n.includes("jooks") || n.includes("maraton"))) return false;
  if (ubicacion.toLowerCase().includes("staadion")) return false; // series de club en pista
  if (n.includes("maailmameistrivõistlused")) return false; // se corre en el extranjero
  return true;
}

function fechaDesdeTexto(texto: string): Date | null {
  const m = texto.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T09:00:00Z`);
}

function distanciaDesdeNombre(nombre: string): { tipo: TipoDistancia; km: number } {
  const n = nombre.toLowerCase();
  const km = n.match(/(\d+(?:[.,]\d+)?)\s*km\b/);
  if (km) {
    const valor = parseFloat(km[1].replace(",", "."));
    return { tipo: tipoDesdeKm(valor), km: valor };
  }
  if (n.includes("poolmaraton")) return { tipo: TipoDistancia.MEDIA_MARATON, km: 21.0975 };
  if (n.includes("maraton")) return { tipo: TipoDistancia.MARATON, km: 42.195 };
  return { tipo: TipoDistancia.OTRA, km: 0 };
}

function tipoDesdeKm(km: number): TipoDistancia {
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

function ciudadDesdeUbicacion(ubicacion: string): string {
  const corregida = CIUDADES[normalizar(ubicacion)];
  return corregida ?? (ubicacion || "Eesti");
}

function aCarreraExterna(f: FilaEkjl): CarreraExterna | null {
  if (!esCarreraDeCalle(f.nombre, f.ubicacion)) return null;
  const fecha = fechaDesdeTexto(f.fechaTexto);
  if (!fecha) return null;

  const url = f.url ?? URL_COMPETICIONES;
  const externalId = `${fecha.toISOString().slice(0, 10)}-${normalizar(f.nombre)}`.replace(/[^a-z0-9]+/g, "-").slice(0, 140);
  const { tipo, km } = distanciaDesdeNombre(f.nombre);

  return {
    fuenteTipo: "ekjl_ee",
    fuenteNombre: "Eesti Kergejõustikuliit (EKJL)",
    fuenteUrl: URL_COMPETICIONES,
    externalId,
    nombre: f.nombre,
    ciudad: ciudadDesdeUbicacion(f.ubicacion),
    pais: "Estonia",
    codigoPais: "EE",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: url,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: url,
    distancias: [{ tipo, km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorEkjlEe() {
  return registrarEjecucion("ekjl_ee", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_COMPETICIONES, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`ekjl.ee respondió ${res.status}`);
    const html = await res.text();
    const filas = extraerFilas(html);

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
