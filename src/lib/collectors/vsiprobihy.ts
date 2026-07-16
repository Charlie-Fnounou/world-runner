import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de vsiprobihy.org («ВсіПробіги» — "Todos los próbegi/
// carreras", calendario ucraniano de carreras desde 2015, "el lugar
// de encuentro de todos los corredores"). robots.txt es totalmente
// permisivo ("User-agent: *" / "Disallow:" sin rutas), y la portada
// trae en HTML server-renderizado (Yii2 GridView) TODO el calendario
// de próximas carreras agrupado por mes — no hace falta paginar ni
// hay parámetros de fecha que filtrar.
//
// Se investigaron varias alternativas para Ucrania antes de elegir
// esta:
// - uaf.org.ua (Федерація легкої атлетики України, la federación
//   oficial): tiene calendario, pero solo campeonatos federados de
//   pista/carretera de elite, no el universo de carreras populares.
// - probeg.org (portal ruso "ПроБЕГ", usado para el recolector de
//   Rusia): tiene un filtro por Ucrania, pero devuelve solo eventos
//   históricos de 2021 a 2024 — no se actualiza desde la guerra.
// - myrace.com.ua: devolvió 403 al pedir robots.txt (bloquea bots no
//   navegador) y es una plataforma de inscripción comercial — se
//   descartó.
// - get.run, timingevents.com, ticketme.org: plataformas comerciales
//   de inscripción/ticketing, no fuentes primarias — se descartaron.
//
// vsiprobihy.org resultó ser la mejor opción: gratuito, sin registro
// de pago para los organizadores, mantenido activamente en 2026 con
// carreras reales en Kyiv, Odesa, Cherkasy, Leópolis, Kryvyi Rih, etc.
// pese a la guerra. No es agregador comercial de los prohibidos.
//
// La grilla no expone el sitio/inscripción oficial de cada carrera en
// el listado (solo nombre del organizador en texto plano), así que
// —igual que hace inschrijven.ts con el portal neerlandés— se usa la
// página de detalle en el propio portal (/race/{id}) como sitioWeb y
// urlInscripcionOficial.

const URL_BASE = "https://vsiprobihy.org";

const MESES_UA: Record<string, number> = {
  "Січень": 1,
  "Лютий": 2,
  "Березень": 3,
  "Квітень": 4,
  "Травень": 5,
  "Червень": 6,
  "Липень": 7,
  "Серпень": 8,
  "Вересень": 9,
  "Жовтень": 10,
  "Листопад": 11,
  "Грудень": 12,
};

interface FilaVsiprobihy {
  id: string;
  dia: number;
  mes: number;
  anio: number;
  nombre: string;
  ciudad: string;
  distanciasTexto: string;
}

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();
}

// Convierte el HTML de una celda a texto plano, respetando los <br>
// como separador (algunas celdas de ciudad traen HTML con divs sin
// cerrar bien — no importa, no somos tag-aware: solo buscamos texto).
function textoPlano(html: string): string {
  return decodificarHtml(
    html
      .replace(/<br\s*\/?>/gi, ", ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .replace(/,\s*,/g, ",")
      .replace(/^[,\s]+|[,\s]+$/g, ""),
  );
}

// La portada agrupa las filas por mes con un separador
// <tr><td class="groupview-extra-row" colspan="5">{Mes} {Año}</td></tr>.
// Partir el HTML por ese separador da pares [etiqueta, filasDelMes].
function parsearFilas(html: string): FilaVsiprobihy[] {
  const partes = html.split(/<tr><td class="groupview-extra-row" colspan="5">([^<]+)<\/td><\/tr>/);
  const filas: FilaVsiprobihy[] = [];

  for (let i = 1; i < partes.length; i += 2) {
    const etiqueta = partes[i]?.trim().split(/\s+/) ?? [];
    const mes = MESES_UA[etiqueta[0]];
    const anio = Number(etiqueta[1]);
    if (!mes || !anio) continue;

    const rowsHtml = partes[i + 1] ?? "";
    const filaRegex = /<tr class="[^"]*" key="(\d+)"[^>]*>([\s\S]*?)<\/tr>/g;
    let m: RegExpExecArray | null;
    while ((m = filaRegex.exec(rowsHtml))) {
      const id = m[1];
      const celdas = [...m[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]);
      if (celdas.length < 4) continue;

      const [fechaHtml, nombreHtml, ciudadHtml, distanciasHtml] = celdas;
      const fechaMatch = fechaHtml.match(/(\d{1,2})\.(\d{1,2})/);
      const nombreMatch = nombreHtml.match(/<a href="\/race\/\d+">([^<]+)<\/a>/);
      if (!fechaMatch || !nombreMatch) continue;

      filas.push({
        id,
        dia: Number(fechaMatch[1]),
        mes: Number(fechaMatch[2]),
        anio,
        nombre: decodificarHtml(nombreMatch[1]).trim(),
        ciudad: textoPlano(ciudadHtml) || "Ucrania",
        distanciasTexto: distanciasHtml,
      });
    }
  }

  return filas;
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

// La celda de distancias es una lista separada por comas con formatos
// mixtos: "21км", "6,5км" (coma decimal), "200м" / "100м" (metros),
// "4х5,25км" (posta/relevo — nos quedamos con el tramo numérico), y
// también palabras sin número ("дитячий" = infantil, "онлайн",
// "Vertical", "почесний кілометр" = "kilómetro honorario") que se
// descartan al no tener distancia cuantificable.
function parsearDistancias(texto: string): { tipo: TipoDistancia; km: number }[] {
  // OJO: no se puede partir por "," a secas — el separador decimal
  // ucraniano también es la coma ("6,5км", "21,095км"), y en el HTML
  // viene sin espacio después, a diferencia del separador de items de
  // la lista ("21+км,  Trail 10+ км", con espacio(s) después de la
  // coma). Por eso se parte solo en coma seguida de espacio.
  const tokens = decodificarHtml(texto)
    .split(/,\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const resultado: { tipo: TipoDistancia; km: number }[] = [];
  for (const token of tokens) {
    // "\b" no sirve de límite acá porque el cirílico no cuenta como
    // "\w" en JS: se usa un lookahead negativo de letra en su lugar.
    // El "+" opcional cubre distancias aproximadas tipo "20+км".
    const m = token.match(/(\d+(?:[.,]\d+)?)\+?\s*(км|м)(?![а-яіїєґa-z])/i);
    if (!m) continue;
    let km = parseFloat(m[1].replace(",", "."));
    if (m[2].toLowerCase() === "м") km /= 1000;
    if (km > 0) resultado.push({ km, tipo: tipoDistanciaDesdeKm(km) });
  }

  return resultado.length ? resultado : [{ km: 0, tipo: TipoDistancia.OTRA }];
}

function aCarreraExterna(fila: FilaVsiprobihy): CarreraExterna | null {
  if (!fila.dia || !fila.mes || !fila.anio || !fila.nombre) return null;
  const fecha = new Date(`${fila.anio}-${String(fila.mes).padStart(2, "0")}-${String(fila.dia).padStart(2, "0")}T10:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return null;

  const urlDetalle = `${URL_BASE}/race/${fila.id}`;

  return {
    fuenteTipo: "vsiprobihy",
    fuenteNombre: "ВсіПробіги (vsiprobihy.org)",
    fuenteUrl: urlDetalle,
    externalId: fila.id,
    nombre: fila.nombre,
    ciudad: fila.ciudad,
    pais: "Ucrania",
    codigoPais: "UA",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: urlDetalle,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlDetalle,
    distancias: parsearDistancias(fila.distanciasTexto),
  };
}

export async function correrCollectorVsiprobihy() {
  return registrarEjecucion("vsiprobihy", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(`${URL_BASE}/`, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`vsiprobihy.org respondió ${res.status}`);
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
