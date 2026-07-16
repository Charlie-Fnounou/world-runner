import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector del sitio oficial del International Marathon of
// Marrakech (marrakechmarathon.com), carrera bajo el alto patronazgo
// del Rey Mohammed VI y una de las maratones más grandes de Marruecos
// (~9.000 corredores), con Maratón (42.195 km) y Semi-Maratón
// (21.0975 km).
//
// No se usó la Fédération Royale Marocaine d'Athlétisme (frma.ma) a
// propósito: su robots.txt bloquea explícitamente con
// "User-agent: ClaudeBot / Disallow: /" (bloque gestionado por
// Cloudflare que también frena a otros bots de IA como GPTBot o
// Google-Extended). Aunque técnicamente ese Disallow puntual no aplica
// al User-Agent propio de este proyecto (WorldRunnerBot), usar un
// User-Agent distinto para esquivar un bloqueo dirigido explícitamente
// a bots de Claude/IA va en contra del espíritu de esa regla — así que
// se descartó esa fuente por precaución ética, no solo técnica.
//
// robots.txt de marrakechmarathon.com responde 200 con el cuerpo
// vacío (no existe el archivo) — sin ninguna restricción.
//
// El sitio es un WordPress/Elementor clásico sin API propia. La home
// menciona varias ediciones (pasadas y la próxima, con su fecha y
// número de edición) en el HTML crudo; se extraen TODAS las fechas
// "Domingo/Sunday DD Mes YYYY" que aparecen y se toma la más lejana en
// el tiempo (la próxima edición promocionada), en vez de asumir un año
// fijo.

const URL_SITIO = "https://marrakechmarathon.com/";
const NOMBRE = "International Marathon of Marrakech";

const MESES: Record<string, number> = {
  jan: 1,
  january: 1,
  janvier: 1,
  feb: 2,
  february: 2,
  fevrier: 2,
  février: 2,
  mar: 3,
  march: 3,
  mars: 3,
  apr: 4,
  april: 4,
  avril: 4,
  may: 5,
  mai: 5,
  jun: 6,
  june: 6,
  juin: 6,
  jul: 7,
  july: 7,
  juillet: 7,
  aug: 8,
  august: 8,
  aout: 8,
  août: 8,
  sep: 9,
  september: 9,
  septembre: 9,
  oct: 10,
  october: 10,
  octobre: 10,
  nov: 11,
  november: 11,
  novembre: 11,
  dec: 12,
  december: 12,
  decembre: 12,
  décembre: 12,
};

// "Sunday 31 Jan 2027", "Sunday 25 January 2026" — con o sin nombre del
// día adelante, día en número, mes en letras (abreviado o completo) y
// año de 4 dígitos.
const FECHA_REGEX = /\b(\d{1,2})\s+([A-Za-zàéûî]{3,10})\.?\s+(\d{4})\b/g;

function todasLasFechas(html: string): Date[] {
  const fechas: Date[] = [];
  const re = new RegExp(FECHA_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const dia = Number(m[1]);
    const mes = MESES[m[2].toLowerCase()];
    const anio = Number(m[3]);
    if (!dia || !mes || !anio || anio < 2020 || anio > 2100) continue;
    const fecha = new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T09:00:00Z`);
    if (!Number.isNaN(fecha.getTime())) fechas.push(fecha);
  }
  return fechas;
}

// De todas las fechas mencionadas en la home (ediciones pasadas +
// próxima), la próxima edición promocionada es siempre la más lejana
// en el tiempo.
function proximaFecha(html: string): Date | null {
  const fechas = todasLasFechas(html);
  if (fechas.length === 0) return null;
  return fechas.reduce((max, f) => (f.getTime() > max.getTime() ? f : max));
}

function aCarreraExterna(html: string): CarreraExterna | null {
  const fecha = proximaFecha(html);
  if (!fecha) return null;

  const { pais, continente } = paisDesdeCodigoIso("MA");

  return {
    fuenteTipo: "marrakechmarathon",
    fuenteNombre: "International Marathon of Marrakech (sitio oficial)",
    fuenteUrl: URL_SITIO,
    externalId: `${fecha.getFullYear()}`,
    nombre: NOMBRE,
    ciudad: "Marrakech",
    pais,
    codigoPais: "MA",
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: URL_SITIO,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: `${URL_SITIO}race-info/`,
    distancias: [
      { tipo: TipoDistancia.MARATON, km: 42.195, terreno: "ASFALTO" },
      { tipo: TipoDistancia.MEDIA_MARATON, km: 21.0975, terreno: "ASFALTO" },
    ],
  };
}

export async function correrCollectorMarrakechMarathon() {
  return registrarEjecucion("marrakechmarathon", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_SITIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`marrakechmarathon.com respondió ${res.status}`);
    const html = await res.text();

    try {
      const externa = aCarreraExterna(html);
      if (!externa) {
        errores++;
      } else {
        const { creada } = await upsertCarreraExterna(externa);
        if (creada) nuevas++;
        else actualizadas++;
      }
    } catch {
      errores++;
    }

    return { nuevas, actualizadas, errores };
  });
}
