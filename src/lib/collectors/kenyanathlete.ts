import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de KenyanAthlete.com, sitio de noticias de atletismo de
// Kenia que publica a mano un artículo-calendario anual ("Calendar of
// Athletics Events") con los carreras y campeonatos del año, mes por
// mes. No encontramos una fuente mejor: la página de Athletics Kenya
// (athleticskenya.or.ke/results-and-calendar/) casi no tiene carreras
// de ruta abiertas al público (son actas de campeonatos), y los sitios
// tipo "Ahotu Kenya" / "Run Beyond" / "Fit Savanna" son agregadores
// comerciales (el último además renderiza todo por JavaScript del
// lado del cliente, sin datos en el HTML crudo) — se descartaron por
// las reglas éticas del proyecto.
//
// robots.txt (verificado) solo bloquea /wp-admin/ — el artículo del
// calendario es HTML estático simple (WordPress clásico).
//
// El artículo mezcla carreras keniatas (la mayoría) con campeonatos
// internacionales que le interesan a un atleta keniata (Diamond
// League, mundiales, etc. en otros países) — se filtra con una lista
// de palabras clave de países/ciudades extranjeras que el propio
// sitio siempre menciona en esas líneas. Es un filtro heurístico: no
// es perfecto, pero en la práctica separa bien lo local de lo
// internacional dado el formato consistente "día: evento, lugar".

const URL_CALENDARIO = "https://kenyanathlete.com/calendar-of-events/";

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

// Palabras que delatan que el evento es en el extranjero (países,
// ciudades o estados que aparecen en el calendario para campeonatos
// internacionales/Diamond League). Si el texto del evento contiene
// alguna, se descarta.
const PALABRAS_EXTRANJERO = [
  "usa",
  "u\\.s\\.a",
  "uk\\b",
  "japan",
  "italy",
  "poland",
  "france",
  "germany",
  "spain",
  "netherlands",
  "belgium",
  "china",
  "india",
  "qatar",
  "scotland",
  "england",
  "ireland",
  "uganda",
  "ethiopia",
  "tanzania",
  "rwanda",
  "nigeria",
  "morocco",
  "egypt",
  "south africa",
  "australia",
  "canada",
  "brazil",
  "botswana",
  "senegal",
  "korea",
  "switzerland",
  "sweden",
  "norway",
  "denmark",
  "monaco",
  "ghana",
  "boston",
  "chicago",
  "new york",
  "london",
  "berlin",
  "paris",
  "valencia",
  "rotterdam",
  "tokyo",
  "torun",
  "copenhagen",
  "kobenhavn",
  "barcelona",
  "budapest",
  "eugene",
  "oregon",
  "doha",
  "tallahassee",
  "brasilia",
  "shanghai",
  "xiamen",
  "rabat",
  "rome",
  "roma\\b",
  "stockholm",
  "oslo",
  "accra",
  "gaborone",
  "glasgow",
  "scotstoun",
  "lausanne",
  "laussane",
  "silesia",
  "brussels",
  "daegu",
  "dakar",
];
const REGEX_EXTRANJERO = new RegExp(`\\b(${PALABRAS_EXTRANJERO.join("|")})\\b`, "i");

interface FilaEvento {
  dia: number;
  mes: number;
  anio: number;
  nombre: string;
  ubicacion: string;
}

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

// "10th January: 46th World Cross Country Championships, Tallahassee, FL, USA"
// "16th – 17th January: 2nd AK Track and Field, Thika"
// "26-28th February: 3rd AK Track and Field, Kapsabet"
const LINEA_REGEX =
  /^(\d{1,2})(?:st|nd|rd|th)?(?:\s*[-–]\s*\d{1,2}(?:st|nd|rd|th)?)?\s+([A-Za-z]+):\s*(.+)$/;

function parsearFilas(html: string): FilaEvento[] {
  const filas: FilaEvento[] = [];
  const inicio = html.indexOf('entry-content"');
  const contenido = inicio >= 0 ? html.slice(inicio, inicio + 100000) : html;

  const bloqueRegex = /<h3[^>]*>([A-Za-z]+)\s+(\d{4})<\/h3>|<p class="">([^<]+)<\/p>/g;
  let mesActual: number | null = null;
  let anioActual: number | null = null;

  let m: RegExpExecArray | null;
  while ((m = bloqueRegex.exec(contenido))) {
    if (m[1]) {
      mesActual = MESES[m[1].toLowerCase()] ?? null;
      anioActual = Number(m[2]);
      continue;
    }
    if (!m[3] || mesActual === null || anioActual === null) continue;

    const texto = decodificarHtml(m[3]);
    const lm = texto.match(LINEA_REGEX);
    if (!lm) continue;

    const dia = Number(lm[1]);
    const mesDelTexto = MESES[lm[2].toLowerCase()];
    const resto = lm[3].trim();
    if (!dia || !mesDelTexto || !resto) continue;

    const comaIdx = resto.indexOf(",");
    const nombre = (comaIdx >= 0 ? resto.slice(0, comaIdx) : resto).trim();
    const ubicacion = (comaIdx >= 0 ? resto.slice(comaIdx + 1) : "").trim();

    filas.push({ dia, mes: mesDelTexto, anio: anioActual, nombre, ubicacion });
  }

  return filas;
}

function kmDesdeNombre(nombre: string): number {
  const n = nombre.toLowerCase();
  if (/half[\s-]?marathon/.test(n)) return 21.0975;
  if (/marathon/.test(n)) return 42.195;
  const m = n.match(/(\d+(?:\.\d+)?)\s*k(?:m)?\b/);
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

function aCarreraExterna(fila: FilaEvento): CarreraExterna | null {
  if (REGEX_EXTRANJERO.test(fila.nombre) || REGEX_EXTRANJERO.test(fila.ubicacion)) return null;

  const fecha = new Date(
    `${fila.anio}-${String(fila.mes).padStart(2, "0")}-${String(fila.dia).padStart(2, "0")}T10:00:00Z`,
  );
  if (Number.isNaN(fecha.getTime())) return null;

  const km = kmDesdeNombre(fila.nombre);
  const esTrail = /(trail|mountain|forest|hills?)/i.test(fila.nombre);
  const { pais, continente } = paisDesdeCodigoIso("KE");

  const externalId = `${fila.anio}-${String(fila.mes).padStart(2, "0")}-${String(fila.dia).padStart(2, "0")}-${normalizar(
    fila.nombre,
  ).replace(/[^a-z0-9]+/g, "-")}`.slice(0, 140);

  return {
    fuenteTipo: "kenyanathlete",
    fuenteNombre: "KenyanAthlete — Calendar of Athletics Events",
    fuenteUrl: URL_CALENDARIO,
    externalId,
    nombre: fila.nombre,
    ciudad: fila.ubicacion.split(",").map((p) => p.trim()).filter(Boolean).pop() || "Kenia",
    pais,
    codigoPais: "KE",
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: URL_CALENDARIO,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: URL_CALENDARIO,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: esTrail ? "TRAIL" : "ASFALTO" }],
  };
}

export async function correrCollectorKenyanAthlete() {
  return registrarEjecucion("kenyanathlete", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_CALENDARIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`KenyanAthlete respondió ${res.status}`);
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
