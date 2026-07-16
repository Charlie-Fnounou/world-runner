import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de iaa.co.il, el sitio oficial del Israel Athletic
// Association / איגוד האתלטיקה בישראל (la federación israelí de
// atletismo). OJO: existe también iaa.org.il, que es un sitio
// distinto (una app Angular sin contenido server-rendered, no sirve
// para parsear) — el correcto es iaa.co.il (dominio ".co.il", con
// WordPress clásico). robots.txt de iaa.co.il solo bloquea
// /wp-admin/, todo lo demás está permitido.
//
// La federación publica cada año un post "יומן מרוצים לשנת NNNN"
// (calendario de carreras del año NNNN) dentro de la categoría
// "מרוצים" (carreras), con una tabla armada con el addon Elementor
// UAEL que trae, por fila: fecha, nombre de la carrera, distancia(s),
// hora de salida, organizador, teléfono y link al sitio oficial de
// inscripción — todo en HTML plano, sin JavaScript.
//
// Como el ID del post de cada año no es predecible (ej. 2026 es
// /30577/, 2027 es /31951/), primero se lee la página de la
// categoría para encontrar el link del año actual y el siguiente, y
// recién ahí se pide cada tabla.
//
// La tabla no trae columna de ciudad — se intenta reconocer el
// nombre de la ciudad dentro del nombre de la carrera (patrón típico
// israelí: "מרוץ <ciudad>" / "מרתון <ciudad>"); si no se reconoce
// ninguna, se guarda "Israel" en vez de adivinar mal.

const URL_CATEGORIA = "https://www.iaa.co.il/category/%D7%9E%D7%A8%D7%95%D7%A6%D7%99%D7%9D/";
const BASE_URL = "https://www.iaa.co.il/";

// Ciudades israelíes reconocibles dentro del nombre de la carrera
// (substring en hebreo -> nombre en español/inglés). No es
// exhaustivo, cubre lo que aparece en la práctica en el calendario.
const CIUDADES: [string, string][] = [
  ["תל אביב", "Tel Aviv"],
  ["פארק הירקון", "Tel Aviv"],
  ["טבריה", "Tiberias"],
  ["ים המלח", "Mar Muerto"],
  ["אור יהודה", "Or Yehuda"],
  ["ירושלים", "Jerusalén"],
  ["אשקלון", "Ashkelon"],
  ["אשדוד", "Ashdod"],
  ["גבעת שמואל", "Givat Shmuel"],
  ["מודיעין", "Modiín"],
  ["קרית גת", "Kiryat Gat"],
  ["קריית גת", "Kiryat Gat"],
  ["הרצליה", "Herzliya"],
  ["נס ציונה", "Ness Ziona"],
  ["באר שבע", "Beer Sheva"],
  ["חדרה", "Hadera"],
  ["סביון", "Savyon"],
  ["קריית אונו", "Kiryat Ono"],
  ["קרית אונו", "Kiryat Ono"],
  ["קיסריה", "Caesarea"],
  ["יבנה", "Yavne"],
  ["נשר", "Nesher"],
  ["חיפה", "Haifa"],
  ["נתניה", "Netanya"],
  ["אילת", "Eilat"],
  ["רמת גן", "Ramat Gan"],
  ["ראשון לציון", "Rishon LeZion"],
];

interface FilaIaa {
  fechaTexto: string; // "D/M/YYYY"
  nombre: string;
  distanciaTexto: string;
  href: string | null;
}

function extraerAniosDisponibles(html: string): { anio: number; url: string }[] {
  const re = /<a href="(https:\/\/www\.iaa\.co\.il\/\d+\/)" rel="bookmark">יומן מרוצים לשנת (\d{4})<\/a>/g;
  const resultado: { anio: number; url: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    resultado.push({ url: m[1], anio: Number(m[2]) });
  }
  return resultado;
}

function extraerFilas(html: string): FilaIaa[] {
  const filas: FilaIaa[] = [];
  const reFila = /<tr data-entry="\d+" class="uael-table-row">([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = reFila.exec(html))) {
    const fila = m[1];
    const fecha = fila.match(/data-title="תאריך">[\s\S]*?uael-table__text-inner">([^<]*)</);
    const nombre = fila.match(/data-title="שם המרוץ">[\s\S]*?uael-table__text-inner">([^<]*)</);
    const distancia = fila.match(/data-title="מרחק">[\s\S]*?uael-table__text-inner">([^<]*)</);
    const href = fila.match(/id="tableLinkBold"[\s\S]*?href="([^"]+)"/);
    if (!fecha || !nombre) continue;
    filas.push({
      fechaTexto: fecha[1].trim(),
      nombre: nombre[1].trim(),
      distanciaTexto: distancia?.[1]?.trim() ?? "",
      href: href?.[1] ?? null,
    });
  }
  return filas;
}

function fechaDesdeTexto(texto: string): Date | null {
  const m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T08:00:00Z`);
}

function ciudadDesdeNombre(nombre: string): string {
  for (const [patron, ciudad] of CIUDADES) {
    if (nombre.includes(patron)) return ciudad;
  }
  return "Israel";
}

// Distancias vienen como "42.2/21.1/10/5 ק\"מ" (varias distancias en
// km separadas por "/", con la unidad al final) — se convierte cada
// número en una distancia propia. Si el texto trae otras unidades
// (millas, horas, para ultras de tiempo fijo) no se intenta parsear
// y se cae a OTRA en vez de adivinar mal.
function distanciasDesdeTexto(texto: string): { tipo: TipoDistancia; km: number; terreno: "ASFALTO" }[] {
  const limpio = texto.trim();
  if (!/ק"?מ/.test(limpio) || /מייל|שע(ה|ות)/.test(limpio)) {
    return [{ tipo: TipoDistancia.OTRA, km: 0, terreno: "ASFALTO" }];
  }
  const numeros = limpio.match(/\d+(?:[.,]\d+)?/g);
  if (!numeros) return [{ tipo: TipoDistancia.OTRA, km: 0, terreno: "ASFALTO" }];

  return numeros.map((n) => {
    const km = parseFloat(n.replace(",", "."));
    return { tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" as const };
  });
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

function aCarreraExterna(f: FilaIaa): CarreraExterna | null {
  const fecha = fechaDesdeTexto(f.fechaTexto);
  if (!fecha || !f.nombre) return null;

  const externalId = `${normalizar(f.fechaTexto)}-${normalizar(f.nombre)}`.replace(/[^a-z0-9]+/g, "-").slice(0, 140);

  return {
    fuenteTipo: "iaa_israel",
    fuenteNombre: "Israel Athletic Association (iaa.co.il)",
    fuenteUrl: BASE_URL,
    externalId,
    nombre: f.nombre,
    ciudad: ciudadDesdeNombre(f.nombre),
    pais: "Israel",
    codigoPais: "IL",
    continente: "ASIA",
    lat: 0,
    lng: 0,
    sitioWeb: f.href ?? BASE_URL,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: f.href ?? BASE_URL,
    distancias: distanciasDesdeTexto(f.distanciaTexto),
  };
}

export async function correrCollectorIaaIsrael() {
  return registrarEjecucion("iaa_israel", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const resCat = await fetch(URL_CATEGORIA, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!resCat.ok) throw new Error(`iaa.co.il (categoría) respondió ${resCat.status}`);
    const htmlCat = await resCat.text();
    const anios = extraerAniosDisponibles(htmlCat);

    const anioActual = new Date().getFullYear();
    const relevantes = anios.filter((a) => a.anio >= anioActual).slice(0, 2);

    for (const { url } of relevantes) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
        });
        if (!res.ok) continue;
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
      } catch {
        errores++;
      }
    }

    return { nuevas, actualizadas, errores };
  });
}
