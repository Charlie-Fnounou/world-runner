import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector del ÖLV (Österreichischer Leichtathletik-Verband, la
// federación austríaca de atletismo). El ÖLV administra su calendario
// de competencias en la plataforma ATHMIN (oelv.athmin.at/events.aspx),
// que no tiene robots.txt (404 -> sin restricciones). Es la fuente
// oficial: ahí se dan de alta tanto carreras de calle/trail como
// competencias de pista de clubes.
//
// Ese calendario mezcla TODO tipo de eventos de atletismo (carreras de
// calle, campeonatos de pista, jabalina, salto con garrocha...) y
// también eventos internacionales fuera de Austria en los que compiten
// atletas austríacos (aparecen con el país entre paréntesis, ej.
// "Rieti (ITA)"). Por eso se filtra por palabras clave de carrera
// ("lauf", "trail", "marathon"/"marathon") y se descartan filas cuyo
// lugar termina en "(XXX)" (evento en el exterior).
//
// Nota: la paginación de la tabla (más de 250 eventos en total) se
// hace con __doPostBack de ASP.NET WebForms, no con un parámetro de
// URL, así que sólo se puede traer con fetch simple la primera
// página (ordenada por fecha ascendente, ~20 eventos más próximos).
// Como el recolector corre periódicamente, esto igual cubre bien el
// calendario: cada corrida trae los eventos más cercanos en el tiempo,
// y a medida que quedan atrás entran los siguientes a la ventana.

const URL_EVENTOS = "https://oelv.athmin.at/events.aspx";

interface FilaOelv {
  id: string;
  fecha: string; // "DD.MM.YYYY"
  nombre: string;
  club: string;
  lugar: string;
}

const PALABRAS_CARRERA = /lauf|trail|marathon/i;

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß")
    .trim();
}

function parsearFilas(html: string): FilaOelv[] {
  const filas: FilaOelv[] = [];
  const bloques = html.split("<tr>").slice(1);

  for (const bloque of bloques) {
    const fecha = bloque.match(/<td>(\d{2}\.\d{2}\.\d{4})<\/td>/)?.[1];
    const nombreCrudo = bloque.match(/<td>\d{2}\.\d{2}\.\d{4}<\/td>\s*<td>([\s\S]*?)<\/td>/)?.[1];
    const club = decodificarHtml(bloque.match(/<td class='hidden-xs'>([^<]*)<\/td>/)?.[1] ?? "");
    const lugar = decodificarHtml(bloque.match(/<td class='hidden-xs'>[^<]*<\/td>\s*<td class='hidden-xs'>([^<]*)<\/td>/)?.[1] ?? "");
    const id = bloque.match(/event-details\.aspx\?event=(\d+)/)?.[1];

    if (!fecha || !nombreCrudo || !id) continue;
    const nombre = decodificarHtml(nombreCrudo.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

    filas.push({ id, fecha, nombre, club, lugar });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  const m = texto.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T10:00:00Z`);
}

// "T - 6020 Innsbruck, Wurfplatz Arzl" -> "Innsbruck"
// "Feldkirchen am Flatschacher See" -> se deja tal cual
function ciudadDesdeLugar(lugar: string): string {
  const sinPrefijo = lugar.replace(/^[A-ZÄÖÜ]{1,3}\s*-\s*\d{4,5}\s*/, "");
  const primeraParte = sinPrefijo.split(",")[0]?.trim();
  return primeraParte || "Austria";
}

function esEventoEnElExterior(lugar: string): boolean {
  return /\([A-Z]{3}\)\s*$/.test(lugar.trim());
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

function aCarreraExterna(fila: FilaOelv): CarreraExterna | null {
  if (!PALABRAS_CARRERA.test(fila.nombre)) return null;
  if (esEventoEnElExterior(fila.lugar)) return null;

  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha) return null;

  const url = `https://oelv.athmin.at/event-details.aspx?event=${fila.id}`;

  return {
    fuenteTipo: "oelv_athmin",
    fuenteNombre: "ÖLV — Österreichischer Leichtathletik-Verband",
    fuenteUrl: url,
    externalId: fila.id,
    nombre: fila.nombre,
    ciudad: ciudadDesdeLugar(fila.lugar),
    pais: "Austria",
    codigoPais: "AT",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: url,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: url,
    // El listado del ÖLV no expone la distancia de cada carrera.
    distancias: [{ tipo: tipoDistanciaDesdeKm(0), km: 0, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorOelvAthmin() {
  return registrarEjecucion("oelv_athmin", async () => {
    const res = await fetch(URL_EVENTOS, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`ÖLV Athmin respondió ${res.status}`);
    const html = await res.text();
    const filas = parsearFilas(html);

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

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
