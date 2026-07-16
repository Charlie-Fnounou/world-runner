import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector del Hrvatski atletski savez (HAS), la federación croata
// de atletismo. Su "Kalendar natjecanja" (has.hr/index.php/natjecanja/
// kalendar-natjecanja) es la única tabla oficial de TODAS las
// competencias de atletismo del año en Croacia — desde mítines de
// pista y campeonatos juveniles hasta carreras de calle populares —
// publicada como HTML clásico (Joomla) sin JavaScript. robots.txt
// (Joomla estándar) sólo bloquea /administrator/, /cache/, /components/,
// etc.; /index.php/natjecanja/kalendar-natjecanja está permitido.
//
// La tabla no separa carreras de calle del resto: mezcla campeonatos
// de pista ("Dvoranski miting", "Prvenstvo"), cross ("Kros") y carreras
// populares de calle ("utrka", "maraton", "polumaraton"). Como
// tampoco trae distancia como columna propia, nos quedamos sólo con
// las filas cuyo nombre contiene "utrka" (carrera, en croata) o
// "maraton" — así se filtra la pista y el cross sin adivinar mal. La
// distancia se infiere del propio nombre (maratón/medio maratón) y,
// si no se reconoce, se guarda como OTRA con km 0 en vez de inventar
// un número.
//
// Tampoco hay columna de año: la tabla vigente en la portada es
// siempre la del año en curso (el link "Kalendar natjecanja za AAAA.
// [pdf]" arriba de la tabla lo confirma), así que se usa el año actual
// para las 12 filas de meses (Siječanj a Prosinac).

const URL_CALENDARIO = "https://www.has.hr/index.php/natjecanja/kalendar-natjecanja";
const BASE_URL = "https://www.has.hr";

// Claves ya sin diacríticos (comparamos contra normalizar(), que les
// quita los acentos): sijecanj, veljaca, ozujak...
const MESES: Record<string, number> = {
  sijecanj: 1,
  veljaca: 2,
  ozujak: 3,
  travanj: 4,
  svibanj: 5,
  lipanj: 6,
  srpanj: 7,
  kolovoz: 8,
  rujan: 9,
  listopad: 10,
  studeni: 11,
  prosinac: 12,
};

interface FilaHas {
  dia: number;
  mes: number;
  nombre: string;
  ciudad: string;
  url: string | null;
}

function limpiarTexto(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

function extraerFilas(html: string): FilaHas[] {
  const filas: FilaHas[] = [];
  let mesActual: number | null = null;

  const reFila = /<tr bgcolor="#(?:ffffff|cdcdfe)">([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = reFila.exec(html))) {
    const fila = m[1];

    // Fila de encabezado de mes: <td colspan="4">...<strong>Mjesec</strong>...
    const mesHeader = fila.match(/<strong>([^<]+)<\/strong>/);
    if (mesHeader) {
      mesActual = MESES[normalizar(mesHeader[1])] ?? mesActual;
      continue;
    }

    const celdas = [...fila.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]);
    if (celdas.length !== 4 || mesActual === null) continue;

    const fechaTexto = limpiarTexto(celdas[1]);
    const fecha = fechaTexto.match(/^(\d{1,2})\.(\d{1,2})\.?/);
    if (!fecha) continue;

    const nombre = limpiarTexto(celdas[2]);
    if (!nombre) continue;
    const href = celdas[2].match(/href="([^"]+)"/);
    const ciudad = limpiarTexto(celdas[3]).replace(/\s*\([^)]*\)\s*$/, "").trim();

    filas.push({
      dia: Number(fecha[1]),
      mes: mesActual,
      nombre,
      ciudad: ciudad || "Hrvatska",
      url: href?.[1] ?? null,
    });
  }
  return filas;
}

// Sólo nos interesan carreras de calle populares, no toda la pista ni
// el cross — ver comentario de cabecera.
function esCarreraDeCalle(nombre: string): boolean {
  const n = nombre.toLowerCase();
  return n.includes("utrka") || n.includes("maraton");
}

function distanciaDesdeNombre(nombre: string): { tipo: TipoDistancia; km: number } {
  const n = nombre.toLowerCase();
  if (n.includes("polumaraton")) return { tipo: TipoDistancia.MEDIA_MARATON, km: 21.0975 };
  if (n.includes("supermaraton")) return { tipo: TipoDistancia.ULTRA, km: 0 };
  if (n.includes("maraton")) return { tipo: TipoDistancia.MARATON, km: 42.195 };
  return { tipo: TipoDistancia.OTRA, km: 0 };
}

function aCarreraExterna(f: FilaHas, anio: number): CarreraExterna | null {
  if (!esCarreraDeCalle(f.nombre)) return null;

  const fecha = new Date(`${anio}-${String(f.mes).padStart(2, "0")}-${String(f.dia).padStart(2, "0")}T09:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return null;

  const url = f.url ? (f.url.startsWith("http") ? f.url : `${BASE_URL}${f.url}`) : URL_CALENDARIO;
  const externalId = `${anio}-${f.mes}-${f.dia}-${normalizar(f.nombre)}`.replace(/[^a-z0-9]+/g, "-").slice(0, 140);
  const { tipo, km } = distanciaDesdeNombre(f.nombre);

  return {
    fuenteTipo: "has_hr",
    fuenteNombre: "Hrvatski atletski savez (HAS)",
    fuenteUrl: URL_CALENDARIO,
    externalId,
    nombre: f.nombre,
    ciudad: f.ciudad,
    pais: "Croacia",
    codigoPais: "HR",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: url,
    anio,
    fecha,
    urlInscripcionOficial: url,
    distancias: [{ tipo, km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorHasHr() {
  return registrarEjecucion("has_hr", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_CALENDARIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`has.hr respondió ${res.status}`);
    const html = await res.text();
    const anio = new Date().getFullYear();
    const filas = extraerFilas(html);

    for (const fila of filas) {
      try {
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
