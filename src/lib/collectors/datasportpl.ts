import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de Datasport (online.datasport.pl), la plataforma polaca
// de inscripción y cronometraje que usan directamente los organizadores
// de carreras (equivalente local a RunSignup/RaceResult) — no agrega
// carreras de terceros, es donde se inscriben los corredores.
//
// La página /lista.php no tiene versión JSON pública, pero devuelve
// una única tabla HTML con TODAS las carreras (pasadas y futuras, miles
// de filas) en texto plano — sin necesitar JavaScript. No hay
// robots.txt en el dominio (404 -> sin restricciones).
//
// El HTML está codificado en windows-1250 (europeo central), no UTF-8,
// así que hay que decodificar el body a mano en vez de usar res.text().
// Las filas no traen un id propio (el atributo id="kotwN" del <tr> es
// sólo un ancla de scroll para las ~15 filas alrededor de "hoy", no un
// identificador de la carrera): el id externo se arma con el id de
// inscripción de Datasport ("zawody=NNNN") cuando está disponible, o
// con fecha+nombre si no.
//
// De las miles de filas totales, sólo hay un puñado con fecha futura
// en cada corrida (Datasport carga las carreras a medida que se
// acercan), así que no hace falta paginar en tandas como laufen.ts.

const URL_LISTA = "https://online.datasport.pl/lista.php";
const CONCURRENCIA = 8; // upserts en simultáneo, por si acaso hay más filas futuras de las esperadas

interface FilaDatasport {
  fecha: string; // "YYYY-MM-DD"
  nombre: string;
  ciudad: string;
  urlInscripcion?: string;
  urlResultados?: string;
}

// Datasport también gestiona ciclismo, triatlón, natación en aguas
// abiertas, etc. Se descartan por nombre ya que la lista no separa por
// disciplina. También se descartan las filas de prueba internas del
// portal ("TEST PORTALU", "Test PKO", etc).
const PALABRAS_NO_RUNNING =
  /\bbike\b|rowerow|kolarsk|\bmtb\b|triathlon|triatlon|duathlon|duatlon|pływani|plywani|narciar|nordic\s*walking|\btest\b/i;

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

function parsearFilas(html: string): FilaDatasport[] {
  const filas: FilaDatasport[] = [];
  const bloques = html.split('<tr bgcolor="').slice(1);

  for (const bloque of bloques) {
    const fecha = bloque.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
    const nombre = decodificarHtml(bloque.match(/width="250"><font[^>]*>([^<]*)&nbsp;<\/font>/)?.[1] ?? "");
    const ciudad = decodificarHtml(bloque.match(/width="100"><font[^>]*>([^<]*)&nbsp;<\/font>/)?.[1] ?? "");
    const urlInscripcion = bloque.match(/href="([^"]*)"\s+target="_blank">Zapisy</)?.[1];
    const urlResultados = bloque.match(/href="([^"]*)"\s+target="_blank">Wyniki</)?.[1];

    // A veces la fila trae un nombre degenerado (ej. "." cuando la
    // celda real no tenía texto reconocible) — se descarta en vez de
    // guardar una carrera sin nombre útil.
    if (!fecha || !nombre || !/[a-zA-Z]{2,}/.test(nombre)) continue;
    filas.push({ fecha, nombre, ciudad, urlInscripcion, urlResultados });
  }
  return filas;
}

// Los nombres polacos suelen incluir la distancia ("Półmaraton",
// "X km"): se extrae para no perder el dato aunque la lista no traiga
// un campo de distancia aparte.
function kmDesdeNombre(nombre: string): number {
  const n = nombre.toLowerCase();
  if (/półmaraton|polmaraton/.test(n)) return 21.0975;
  if (/\bmaraton\b/.test(n)) return 42.195;
  const km = n.match(/(\d+(?:[.,]\d+)?)\s*km/);
  if (km) return parseFloat(km[1].replace(",", "."));
  return 0;
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

function externalIdDesdeFila(fila: FilaDatasport): string {
  const idInscripcion = fila.urlInscripcion?.match(/zawody=(\d+)/)?.[1];
  if (idInscripcion) return `zawody-${idInscripcion}`;
  const idResultados = fila.urlResultados?.match(/results(\d+)/)?.[1];
  if (idResultados) return `results-${idResultados}`;
  return `${fila.fecha}-${normalizar(fila.nombre)}`.replace(/[^a-z0-9]+/g, "-").slice(0, 140);
}

function aCarreraExterna(fila: FilaDatasport): CarreraExterna | null {
  if (PALABRAS_NO_RUNNING.test(fila.nombre)) return null;

  const fecha = new Date(`${fila.fecha}T12:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return null;

  const url = fila.urlInscripcion || fila.urlResultados || URL_LISTA;
  const km = kmDesdeNombre(fila.nombre);

  return {
    fuenteTipo: "datasport_pl",
    fuenteNombre: "Datasport Polska",
    fuenteUrl: url,
    externalId: externalIdDesdeFila(fila),
    nombre: fila.nombre,
    ciudad: fila.ciudad || "Polonia",
    pais: "Polonia",
    codigoPais: "PL",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: url,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: fila.urlInscripcion,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorDatasportPl() {
  return registrarEjecucion("datasport_pl", async () => {
    const res = await fetch(URL_LISTA, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`Datasport Polska respondió ${res.status}`);

    // La página está en windows-1250, no UTF-8.
    const buffer = await res.arrayBuffer();
    const html = new TextDecoder("windows-1250").decode(buffer);

    const hoy = new Date().toISOString().slice(0, 10);
    // Tope de seguridad: si algún día hay más filas futuras de las
    // esperadas, que la corrida siga entrando en la ventana de 60s del
    // cron en vez de quedar cerca del límite. Ordenadas por fecha, así
    // que se procesan primero las más próximas.
    const filas = parsearFilas(html)
      .filter((f) => f.fecha >= hoy)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(0, 70);

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    for (let inicioLote = 0; inicioLote < filas.length; inicioLote += CONCURRENCIA) {
      const lote = filas.slice(inicioLote, inicioLote + CONCURRENCIA);
      const resultados = await Promise.all(
        lote.map(async (fila) => {
          try {
            const externa = aCarreraExterna(fila);
            if (!externa) return "salteada";
            const { creada } = await upsertCarreraExterna(externa);
            return creada ? "nueva" : "actualizada";
          } catch {
            return "error";
          }
        }),
      );
      for (const r of resultados) {
        if (r === "nueva") nuevas++;
        else if (r === "actualizada") actualizadas++;
        else if (r === "error") errores++;
      }
    }

    return { nuevas, actualizadas, errores };
  });
}
