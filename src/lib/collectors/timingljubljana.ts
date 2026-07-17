import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de Timing Ljubljana (timingljubljana.si), la empresa
// eslovena de cronometraje que gestiona la inscripción/cronometraje de
// buena parte de las carreras populares del país (equivalente local a
// EQ Timing/Datasport) — los propios organizadores publican ahí su
// carrera porque es quien las cronometra, no es un agregador
// comercial de terceros como Ahotu/Finishers.
//
// No hay robots.txt en el dominio (404 -> sin restricciones).
//
// /Koledar.aspx es una página ASP.NET WebForms que renderiza server-
// side, en una sola tabla HTML sin JavaScript, el calendario restante
// del año en curso (título "Koledar <año>") con TODOS los deportes que
// cronometra la empresa (atletismo, ciclismo, triatlón, natación,
// patinaje...). Los filtros de año/deporte/lugar del formulario son
// un <form method="post"> con __VIEWSTATE (postback de ASP.NET), no
// hay forma de filtrarlos por querystring, así que este collector se
// queda con la tabla completa por defecto (siempre el resto del año
// en curso, que es lo que más importa mantener actualizado en cada
// corrida).
//
// Cada fila trae un icono de deporte (columna final, ej.
// "pics/ico/tek.png" alt="tek") que corresponde 1 a 1 con las
// categorías del propio filtro del sitio ("tek" = correr, distinto de
// "gorski tek" = trail de montaña, "smučarski tek" = esquí de fondo,
// "atletika" = pista/campeonatos federativos, "kolesarstvo" =
// ciclismo, etc.). Nos quedamos solo con icono "tek": en la práctica
// son carreras populares en ciudades eslovenas (no hay carreras
// extranjeras con ese icono en el calendario visto). Se descartan
// además las carreras infantiles ("otroški tek") y los campeonatos
// escolares, que no son carreras abiertas al público general.
//
// La tabla NO trae enlace propio por fila (ni a la carrera ni a su
// inscripción) ni distancia en km, así que se usa la propia página
// del calendario como sitioWeb/urlInscripcionOficial y se infiere la
// distancia del nombre cuando es posible (si no, TipoDistancia.OTRA
// con km 0, igual que el collector de Datasport Polska).

const URL_CALENDARIO = "https://www.timingljubljana.si/Koledar.aspx";
const CODIGO_PAIS = "SI";
const FUENTE_TIPO = "timingljubljana";

const PALABRAS_EXCLUIDAS = /otro[šs]k|za\s+o[šs]\s+in\s+s[šs]/i;

interface FilaTiming {
  dia: number;
  mes: number;
  nombre: string;
  ciudad: string;
}

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
}

function quitarEtiquetas(html: string): string {
  return decodificarHtml(html.replace(/<[^>]+>/g, ""));
}

function parsearFilas(html: string): { anioTabla: number; filas: FilaTiming[] } {
  const inicio = html.indexOf("tabelaKoledar");
  const fin = html.indexOf("</table>", inicio);
  if (inicio === -1 || fin === -1) return { anioTabla: new Date().getFullYear(), filas: [] };
  const tabla = html.slice(inicio, fin);

  const anioTabla = Number(tabla.match(/Koledar\s+(\d{4})/)?.[1]) || new Date().getFullYear();

  const filas: FilaTiming[] = [];
  const filaRegex = /<tr>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = filaRegex.exec(tabla))) {
    const celdas = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]);
    if (celdas.length < 5) continue;

    const fechaTexto = quitarEtiquetas(celdas[0]);
    const nombre = quitarEtiquetas(celdas[2]);
    const ciudad = quitarEtiquetas(celdas[3]);
    const icono = celdas[4].match(/alt="([^"]*)"/)?.[1];

    if (icono !== "tek") continue;

    const fechaMatch = fechaTexto.match(/^(\d{1,2})\.(\d{1,2})\.$/);
    if (!fechaMatch || !nombre) continue;

    filas.push({ dia: Number(fechaMatch[1]), mes: Number(fechaMatch[2]), nombre, ciudad });
  }

  return { anioTabla, filas };
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

function kmDesdeNombre(nombre: string): number {
  const n = nombre.toLowerCase();
  if (/pol\s*maraton|polmaraton/.test(n)) return 21.0975;
  if (/maraton/.test(n)) return 42.195;
  const km = n.match(/(\d+(?:[.,]\d+)?)\s*km\b/);
  return km ? parseFloat(km[1].replace(",", ".")) : 0;
}

function aCarreraExterna(fila: FilaTiming, anio: number): CarreraExterna | null {
  if (PALABRAS_EXCLUIDAS.test(fila.nombre)) return null;
  // Lugares foráneos en este sitio a veces vienen con coma o país entre
  // paréntesis (ej. "Zell am See, Avstrija", "Zagreb (CRO)"); con icono
  // "tek" no se vio ningún caso en la práctica, pero se descarta igual
  // por seguridad en vez de asumir que siempre es Eslovenia.
  if (/[,(]/.test(fila.ciudad)) return null;

  const fecha = new Date(`${anio}-${String(fila.mes).padStart(2, "0")}-${String(fila.dia).padStart(2, "0")}T10:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return null;

  const { pais, continente } = paisDesdeCodigoIso(CODIGO_PAIS);
  const km = kmDesdeNombre(fila.nombre);
  const externalId = `${anio}-${String(fila.mes).padStart(2, "0")}-${String(fila.dia).padStart(2, "0")}-${normalizar(fila.nombre)}`
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 140);

  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: "Timing Ljubljana",
    fuenteUrl: URL_CALENDARIO,
    externalId,
    nombre: fila.nombre,
    ciudad: fila.ciudad || pais,
    pais,
    codigoPais: CODIGO_PAIS,
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: URL_CALENDARIO,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: URL_CALENDARIO,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" as const }],
  };
}

export async function correrCollectorTimingLjubljana() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    const res = await fetch(URL_CALENDARIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Timing Ljubljana respondió ${res.status}`);
    const html = await res.text();
    const { anioTabla, filas } = parsearFilas(html);

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;
    let mesAnterior = 0;
    let anio = anioTabla;

    for (const fila of filas) {
      try {
        // La tabla no repite el año por fila; si el mes retrocede
        // respecto a la fila anterior asumimos que cruzamos a enero
        // del año siguiente (igual criterio que el collector de RFEA).
        if (fila.mes < mesAnterior) anio++;
        mesAnterior = fila.mes;

        const externa = aCarreraExterna(fila, anio);
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
