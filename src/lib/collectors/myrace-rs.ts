import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de MyRace.rs, la plataforma serbia de cronometraje e
// inscripción de carreras ("Sports Events Timing Solutions"): los
// propios organizadores (clubes, municipios, asociaciones) cargan ahí
// su evento para vender inscripciones y publicar resultados —
// equivalente local a RunSignup/CarrerasPanama, no un agregador de
// terceros. No tiene robots.txt (404 al pedirlo), o sea que no declara
// ninguna restricción.
//
// La home publica los próximos eventos como bloques JSON-LD
// (schema.org/Event) embebidos en <script type="application/ld+json">,
// uno por carrera, con fecha, ubicación, organizador y descripción ya
// estructurados — no hace falta parsear divs a mano.

const URL_INICIO = "https://myrace.rs/";
const CODIGO_PAIS = "RS";
const FUENTE_TIPO = "myrace_rs";

interface EventoJsonLd {
  "@type"?: string;
  startDate?: string;
  name?: string;
  description?: string;
  location?: { name?: string; address?: string };
  offers?: { url?: string };
  url?: string;
}

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

function extraerEventosJsonLd(html: string): EventoJsonLd[] {
  const eventos: EventoJsonLd[] = [];
  const bloques = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  for (const bloque of bloques) {
    try {
      const datos = JSON.parse(bloque[1]);
      if (datos && datos["@type"] === "Event") eventos.push(datos);
    } catch {
      // bloque JSON-LD mal formado o no es un evento; se ignora
    }
  }
  return eventos;
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

// Junta nombre + descripción y saca todas las distancias en km
// mencionadas (ej. "46 km", "24 km", "10 km"). Si no hay ninguna pero
// se menciona "maraton"/"marathon", asume 42.195. Si no hay nada, cae
// en [0] -> OTRA (igual que el resto de los collectors del proyecto).
function distanciasDesdeTexto(texto: string): number[] {
  const numeros = [...texto.matchAll(/(\d{1,3}(?:[.,]\d+)?)\s*km/gi)].map((m) => parseFloat(m[1].replace(",", ".")));
  const unicos = [...new Set(numeros.filter((n) => n > 0))];
  if (unicos.length) return unicos;
  if (/\bmaraton(?!ac)|marathon\b/i.test(texto)) return [42.195];
  return [0];
}

function terrenoDesdeTexto(texto: string): "TRAIL" | "ASFALTO" {
  return /trail|trejl|planin|ultra/i.test(texto) ? "TRAIL" : "ASFALTO";
}

function aCarreraExterna(evento: EventoJsonLd): CarreraExterna | null {
  if (!evento.startDate || !evento.name) return null;
  const fecha = new Date(evento.startDate);
  if (Number.isNaN(fecha.getTime())) return null;

  const urlEvento = evento.offers?.url || evento.url;
  if (!urlEvento) return null;

  const nombre = decodificarHtml(evento.name);
  const ubicacion = decodificarHtml(evento.location?.name || evento.location?.address || "");
  const { pais, continente } = paisDesdeCodigoIso(CODIGO_PAIS);
  const textoCompleto = `${nombre} ${decodificarHtml(evento.description || "")}`;
  const kms = distanciasDesdeTexto(textoCompleto);
  const terreno = terrenoDesdeTexto(textoCompleto);

  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: "MyRace.rs",
    fuenteUrl: URL_INICIO,
    externalId: urlEvento,
    nombre,
    ciudad: ubicacion || pais,
    pais,
    codigoPais: CODIGO_PAIS,
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: urlEvento,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlEvento,
    distancias: kms.map((km) => ({ tipo: tipoDistanciaDesdeKm(km), km, terreno })),
  };
}

export async function correrCollectorMyRaceRs() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    const res = await fetch(URL_INICIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`MyRace.rs respondió ${res.status}`);
    const html = await res.text();
    const eventos = extraerEventosJsonLd(html);

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    for (const evento of eventos) {
      try {
        const externa = aCarreraExterna(evento);
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
