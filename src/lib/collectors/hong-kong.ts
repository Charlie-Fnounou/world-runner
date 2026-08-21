import { EstadoInscripcion, TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de PaoBaoDao Hong Kong (paobaodao.com/hong-kong/en/),
// calendario especializado de carreras de calle, trail y ultra en HK.
//
// El listado principal viene server-rendered en HTML plano con fechas,
// distancias, modalidad (Road / Trail / Ultra) y enlaces a detalle.
// robots.txt permite el rastreo general con User-Agent honesto.

const URL_CALENDARIO = "https://www.paobaodao.com/hong-kong/en/";
const BASE_URL = "https://www.paobaodao.com";

const MESES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

interface CardPaobaodao {
  detailUrl: string;
  nombre: string;
  lugar: string;
  region: string;
  mesTexto: string;
  diaTexto: string;
  deadlineTexto: string;
  raceTypes: string[];
  distanciasTexto: string[];
}

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

function parsearCards(html: string): CardPaobaodao[] {
  const cards: CardPaobaodao[] = [];
  const re = /<article\s+class="race-card"[^>]*data-detail-url="([^"]+)"[\s\S]*?<\/article>/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html))) {
    const detailUrl = m[1];
    const bloque = m[0];

    const nombreM = bloque.match(/<h2 class="name-en">([^<]+)<\/h2>/);
    if (!nombreM) continue;

    const lugarM = bloque.match(/<div class="race-location">([^<]+)<\/div>/);
    const mesM = bloque.match(/<div class="month">([^<]+)<\/div>/);
    const diaM = bloque.match(/<div class="day">([^<]+)<\/div>/);
    const deadlineM = bloque.match(/<div class="deadline-text"><span>([^<]+)<\/span><\/div>/);
    const regionM = bloque.match(/<div class="race-city">[\s\S]*?<span>([^<]+)<\/span>/);

    const raceTypes: string[] = [];
    const distanciasTexto: string[] = [];
    const tagRe = /<button[^>]*data-filter-group="([^"]+)"[^>]*data-filter-value="([^"]+)"/g;
    let tm: RegExpExecArray | null;
    while ((tm = tagRe.exec(bloque))) {
      const grupo = tm[1];
      const valor = tm[2];
      if (grupo === "raceTypes") raceTypes.push(valor);
      if (grupo === "distances") distanciasTexto.push(valor);
    }

    cards.push({
      detailUrl,
      nombre: decodificarHtml(nombreM[1]),
      lugar: lugarM ? decodificarHtml(lugarM[1]) : "",
      region: regionM ? decodificarHtml(regionM[1]) : "Hong Kong",
      mesTexto: mesM ? mesM[1].trim() : "",
      diaTexto: diaM ? diaM[1].trim() : "",
      deadlineTexto: deadlineM ? deadlineM[1].trim() : "",
      raceTypes,
      distanciasTexto,
    });
  }

  return cards;
}

function fechaDesdeCard(mesTexto: string, diaTexto: string, deadlineTexto: string): Date | null {
  const mes = MESES[mesTexto.toLowerCase().slice(0, 3)];
  if (!mes) return null;

  // "28-29" -> toma el primer día
  const primerDiaM = diaTexto.match(/^(\d{1,2})/);
  if (!primerDiaM) return null;
  const dia = Number(primerDiaM[1]);

  // Si el texto de deadline tiene año (ej. "Registration closes 2026-09-27"), se deduce
  let anio = 2026;
  const deadlineAnioM = deadlineTexto.match(/(\d{4})-\d{2}-\d{2}/);
  if (deadlineAnioM) {
    const anioDeadline = Number(deadlineAnioM[1]);
    const mesDeadline = Number(deadlineTexto.match(/\d{4}-(\d{2})-\d{2}/)?.[1] || mes);
    if (mes < mesDeadline) {
      anio = anioDeadline + 1;
    } else {
      anio = anioDeadline;
    }
  }

  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T08:00:00Z`);
}

function parsearKm(texto: string): number {
  const m = texto.match(/(\d+(?:\.\d+)?)\s*k(?:m)?\b/i);
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

function estadoDesdeDeadline(deadlineTexto: string): EstadoInscripcion {
  const d = deadlineTexto.toLowerCase();
  if (d.includes("closes") || d.includes("open")) return EstadoInscripcion.ABIERTA;
  if (d.includes("closed") || d.includes("ended")) return EstadoInscripcion.CERRADA;
  return EstadoInscripcion.ABIERTA;
}

function aCarreraExterna(card: CardPaobaodao): CarreraExterna | null {
  // Excluir eventos que sean exclusivamente triatlón / acuatlón sin running
  const esMultiSinRun =
    (card.raceTypes.includes("Triathlon") || card.raceTypes.includes("Aquathlon")) &&
    !card.raceTypes.some((t) => ["Road", "Trail", "Ultra"].includes(t)) &&
    card.distanciasTexto.length === 0;
  if (esMultiSinRun) return null;

  const fecha = fechaDesdeCard(card.mesTexto, card.diaTexto, card.deadlineTexto);
  if (!fecha || !card.nombre) return null;

  const urlCompleta = card.detailUrl.startsWith("http") ? card.detailUrl : `${BASE_URL}${card.detailUrl}`;
  const esTrail = card.raceTypes.some((t) => t.toLowerCase() === "trail") || /trail/i.test(card.nombre);
  const { pais, continente } = paisDesdeCodigoIso("HK");

  // externalId combina el slug con la fecha para evitar colisiones en eventos con varias ediciones/días
  const slug = card.detailUrl.replace(/^\/|\/$/g, "").split("/").pop() || card.nombre;
  const fechaIso = fecha.toISOString().slice(0, 10);
  const externalId = `${slug}-${fechaIso}`;

  const distancias = card.distanciasTexto.map((dt) => {
    const km = parsearKm(dt);
    return {
      tipo: tipoDistanciaDesdeKm(km),
      km,
      terreno: (esTrail ? "TRAIL" : "ASFALTO") as "TRAIL" | "ASFALTO",
    };
  });

  if (distancias.length === 0) {
    distancias.push({
      tipo: TipoDistancia.OTRA,
      km: 0,
      terreno: (esTrail ? "TRAIL" : "ASFALTO") as "TRAIL" | "ASFALTO",
    });
  }

  const ciudad = card.region || "Hong Kong";

  return {
    fuenteTipo: "paobaodao-hk",
    fuenteNombre: "PaoBaoDao Hong Kong",
    fuenteUrl: urlCompleta,
    externalId,
    nombre: card.nombre,
    ciudad,
    pais,
    codigoPais: "HK",
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    estado: estadoDesdeDeadline(card.deadlineTexto),
    urlInscripcionOficial: urlCompleta,
    distancias,
  };
}

export async function correrCollectorPaobaodaoHk() {
  return registrarEjecucion("paobaodao-hk", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_CALENDARIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`PaoBaoDao HK respondió ${res.status}`);
    const html = await res.text();
    const cards = parsearCards(html);

    for (const card of cards) {
      try {
        const externa = aCarreraExterna(card);
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
