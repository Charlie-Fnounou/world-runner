import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de FIDAL (Federazione Italiana Di Atletica Leggera), el
// calendario oficial de carreras de Italia. Es HTML simple (no hace
// falta JavaScript), sin robots.txt que lo prohíba — fuente primaria
// (la propia federación), no un agregador comercial.
//
// Los parámetros "anno"/"mese" de la URL NO cambian lo que devuelve el
// servidor por una petición GET simple (se probó pidiendo julio y
// agosto y devolvió exactamente las mismas carreras) — el filtro de
// mes parece aplicarse solo al enviar el formulario de verdad
// (sesión/POST), que no podemos simular con un fetch simple. Por eso
// este collector no pagina por mes: simplemente trae el "mes actual"
// que el sitio siempre muestra por defecto, cada vez que corre. Con el
// tiempo eso alcanza para tener siempre las carreras del mes en curso
// actualizadas; llegar a meses futuros queda para una mejora futura
// (simular el submit del formulario).

const BASE_URL = "https://www.fidal.it/calendario.php";
const NIVELES = ["COD", "REG"];

// Solo estos tipos son carreras a las que un corredor común se puede
// anotar. El resto (Outdoor, Indoor, Cross, Piazza, Nordic walking) son
// reuniones de pista/marcha, no carreras de calle/montaña/trail/ultra.
const TIPOS_VALIDOS = new Set(["STRADA", "TRAIL", "MONTAGNA", "ULTRAMARATONA"]);

const ENTIDADES: Record<string, string> = {
  amp: "&",
  quot: '"',
  lt: "<",
  gt: ">",
  agrave: "à",
  egrave: "è",
  igrave: "ì",
  ograve: "ò",
  ugrave: "ù",
  eacute: "é",
  copy: "©",
  apos: "'",
};

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&([a-zA-Z]+);/g, (m, nombre) => ENTIDADES[nombre] ?? m)
    .trim();
}

interface FilaFidal {
  fecha: string; // "DD/MM" o "DD-DD/MM"
  url: string;
  nombre: string;
  distanciaTexto: string;
  tipo: string;
  lugar: string;
}

const FILA_REGEX =
  /<tr><td>.*?<\/td><td><b[^>]*title="[^"]*">([^<]+)<\/b><\/td><td><abbr[^>]*>([^<]*)<\/abbr><\/td><td[^>]*><a href="([^"]+)">([^<]+)<\/a><br><font[^>]*>([^<]*)<\/font><\/td><td[^>]*>([^<]*)<\/td><td[^>]*>([^<]*)<\/td><\/tr>/g;

function parsearFilas(html: string): FilaFidal[] {
  const filas: FilaFidal[] = [];
  const re = new RegExp(FILA_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    filas.push({
      fecha: m[1].trim(),
      url: m[3],
      nombre: decodificarHtml(m[4]),
      distanciaTexto: m[5].trim(),
      tipo: m[6].trim(),
      lugar: decodificarHtml(m[7]),
    });
  }
  return filas;
}

async function fetchNivel(nivel: string): Promise<string> {
  const url = new URL(BASE_URL);
  url.searchParams.set("livello", nivel);

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
  });
  if (!res.ok) throw new Error(`FIDAL respondió ${res.status}`);
  return res.text();
}

// El día y el mes salen de la propia fila ("DD/MM" o "DD-DD/MM", toma
// el primer día del rango). El año no viene en el texto: se asume el
// año en curso, o el que viene si el mes ya pasó hace mucho (para no
// romper en diciembre/enero).
function fechaDesdeFilaFidal(fecha: string, hoy: Date): Date | null {
  const m = fecha.match(/^(\d{1,2})(?:-\d{1,2})?\/(\d{1,2})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  if (!dia || !mes) return null;

  let anio = hoy.getFullYear();
  // Si el mes de la fila es "muy anterior" al mes actual, es del año
  // que viene (ej. estamos en diciembre y la fila dice "05/01").
  if (mes < hoy.getMonth() + 1 - 2) anio += 1;

  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T09:00:00Z`);
}

function lugarDesdeTexto(lugar: string): { ciudad: string } {
  const conParentesis = lugar.match(/^(.*?)\s*\([A-Z]{2}\)$/);
  if (conParentesis) return { ciudad: conParentesis[1].trim() };
  const conSufijo = lugar.match(/^(.*?)\s+[A-Z]{2}$/);
  if (conSufijo && conSufijo[1].trim().length > 1) return { ciudad: conSufijo[1].trim() };
  return { ciudad: lugar.replace(/-+$/, "").trim() };
}

function kmDesdeTexto(texto: string): number {
  const m = texto.match(/([\d.,]+)\s*km/i);
  if (!m) return 0;
  return parseFloat(m[1].replace(",", "."));
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

function aCarreraExterna(fila: FilaFidal, hoy: Date): CarreraExterna | null {
  if (!TIPOS_VALIDOS.has(fila.tipo.toUpperCase())) return null;
  if (fila.nombre.toLowerCase().startsWith("annullat")) return null; // carrera cancelada

  const fecha = fechaDesdeFilaFidal(fila.fecha, hoy);
  if (!fecha) return null;

  const cod = fila.url.match(/COD(\d+)/)?.[0] ?? fila.url;
  const { ciudad } = lugarDesdeTexto(fila.lugar);
  const km = kmDesdeTexto(fila.distanciaTexto);

  return {
    fuenteTipo: "fidal",
    fuenteNombre: "FIDAL — Calendario Federale",
    fuenteUrl: fila.url,
    externalId: cod,
    nombre: fila.nombre,
    ciudad,
    pais: "Italia",
    codigoPais: "IT",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: fila.url,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: fila.url,
    distancias: [
      {
        tipo: tipoDistanciaDesdeKm(km),
        km,
        terreno: fila.tipo.toUpperCase() === "TRAIL" || fila.tipo.toUpperCase() === "MONTAGNA" ? "TRAIL" : "ASFALTO",
      },
    ],
  };
}

export async function correrCollectorFidal() {
  return registrarEjecucion("fidal", async () => {
    const hoy = new Date();
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    for (const nivel of NIVELES) {
      try {
        const html = await fetchNivel(nivel);
        const filas = parsearFilas(html);

        for (const fila of filas) {
          try {
            const externa = aCarreraExterna(fila, hoy);
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

      await new Promise((r) => setTimeout(r, 400));
    }

    return { nuevas, actualizadas, errores };
  });
}
