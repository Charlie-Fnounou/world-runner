import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de Race Timing BG (racetimingbg.com), empresa búlgara de
// cronometraje e inscripciones — organiza/cronometra directamente los
// eventos que publica (no es un agregador de terceros). robots.txt
// (Yoast SEO, "Disallow:" vacío) no restringe nada.
//
// Se descartó bul.opentrack.run (calendario oficial de la BFLA, la
// federación búlgara) porque su robots.txt bloquea explícitamente a
// "ClaudeBot" con Disallow: /, y racecalendar.bg porque es un
// agregador comunitario de carreras de terceros (no organiza ni
// cronometra nada), no una fuente primaria.
//
// La página "/събития/" ("Eventos") trae la lista de próximos
// eventos como tarjetas HTML server-rendered (sin JavaScript), cada
// una con el nombre y la fecha juntos en el atributo title, ej.:
//   <a href=".../event/hisarya-run-16-08-2026/"
//      class="kl-ptfsortable-item-title-link"
//      title="Хисаря Рън – 16.08.2026">
// El atributo data-date de cada <li> es la fecha de PUBLICACIÓN del
// post, no la fecha de la carrera — no sirve, hay que parsear la
// fecha del texto del título.
//
// Race Timing BG cronometra de todo (carreras a pie, natación en
// aguas abiertas, triatlón, duatlón, acuatlón, ciclismo) bajo el
// mismo listado, así que se descartan por nombre los eventos que
// claramente no son carreras a pie. Las páginas de detalle de cada
// evento no traen distancias ni precio parseables (son básicamente
// una landing vacía hasta que hay resultados), así que las
// distancias quedan en OTRA/0 km, como en otros collectors mínimos
// del proyecto (asuncionrunners.ts, chiptiming.ts).

const BASE_URL = "https://racetimingbg.com";
const URL_EVENTOS = encodeURI(`${BASE_URL}/събития/`);
const FUENTE_TIPO = "racetimingbg";
const CODIGO_PAIS = "BG";

const EXCLUIR_REGEX = /плувен|триатлон|акватлон|дуатлон|олимпийска дистанция|спринт дистанция|\bbike\b|вело/i;
const TRAIL_REGEX = /ultra|улт|връх|върхове|планин|trail/i;

interface FilaEvento {
  href: string;
  titulo: string;
}

function extraerFilas(html: string): FilaEvento[] {
  const filas: FilaEvento[] = [];
  const re = /<a href="(https:\/\/racetimingbg\.com\/event\/[^"]+)" class="kl-ptfsortable-item-title-link" title="([^"]+)">/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    filas.push({ href: m[1], titulo: m[2] });
  }
  return filas;
}

function limpiarTexto(texto: string): string {
  return texto
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
}

interface NombreYFecha {
  nombre: string;
  fecha: Date;
}

// El título trae "NOMBRE – DD.MM.YYYY" o, para eventos de varios
// días, "NOMBRE DD-DD.MM.YYYY" (ej. "Вършец Ултра – 12-13.07.2025").
// Cuando hay rango de días se usa el último (el día de la carrera en
// sí, en los formatos de dos días que se vieron en el sitio).
function parsearNombreYFecha(tituloCrudo: string): NombreYFecha | null {
  const titulo = limpiarTexto(tituloCrudo);
  const m = titulo.match(/(\d{1,2})(?:[-–](\d{1,2}))?\.(\d{2})\.(\d{4})\s*$/);
  if (!m || m.index === undefined) return null;

  const dia = m[2] ? Number(m[2]) : Number(m[1]);
  const mes = Number(m[3]);
  const anio = Number(m[4]);
  if (!dia || !mes || !anio) return null;

  const nombre = titulo
    .slice(0, m.index)
    .replace(/[\s–-]+$/, "")
    .trim();
  if (!nombre) return null;

  const fecha = new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T10:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return null;

  return { nombre, fecha };
}

function aCarreraExterna(fila: FilaEvento): CarreraExterna | null {
  if (EXCLUIR_REGEX.test(fila.titulo)) return null;

  const datos = parsearNombreYFecha(fila.titulo);
  if (!datos) return null;

  const { pais, continente } = paisDesdeCodigoIso(CODIGO_PAIS);
  const esTrail = TRAIL_REGEX.test(datos.nombre);

  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: "Race Timing BG",
    fuenteUrl: URL_EVENTOS,
    externalId: fila.href,
    nombre: datos.nombre,
    ciudad: pais,
    pais,
    codigoPais: CODIGO_PAIS,
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: fila.href,
    anio: datos.fecha.getFullYear(),
    fecha: datos.fecha,
    urlInscripcionOficial: fila.href,
    distancias: [{ tipo: TipoDistancia.OTRA, km: 0, terreno: esTrail ? "TRAIL" : "ASFALTO" }],
  };
}

export async function correrCollectorRaceTimingBg() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    const res = await fetch(URL_EVENTOS, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Race Timing BG respondió ${res.status}`);
    const html = await res.text();
    const filas = extraerFilas(html);

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
