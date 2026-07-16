import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de RUNNET (runnet.jp), "日本最大級のランニングポータル"
// (el mayor portal de running de Japón), operado por RECRUIT. No es
// un simple agregador: los organizadores usan RUNNET directamente
// como su plataforma de inscripción (el propio robots.txt de
// runnet.jp bloquea, carrera por carrera, páginas puntuales de
// "entry" ya cerradas — lo que confirma que /entry/ es la ruta real
// de inscripción del sitio, no un link de salida a otro lado). La
// ruta que se usa acá, /entry/runtes/user/pc/RaceSearchZZSDetailAction.do,
// no aparece en ningún Disallow.
//
// serviceType=101 filtra la categoría "マラソン・駅伝" (maratón /
// ekiden = carreras de ruta), dejando afuera trail, caminata,
// triatlón, etc. (esos tienen sus propios serviceType, ej. 200/205).
//
// La página de resultados no trae ciudad/prefectura en un campo
// aparte, pero la describe en el primer tramo del texto libre
// "tourDetail" (ej. "静岡県藤枝市で5回目の開催..." = "en la ciudad de
// Fujieda, prefectura de Shizuoka..."), así que se extrae buscando
// alguna de las 47 prefecturas japonesas al principio del texto. La
// distancia sale del campo "種目" (modalidades), buscando los "km"
// mencionados o palabras como "ハーフ" (media maratón) / "フル"
// (maratón completo).
//
// La paginación (?command=page&pageIndex=N) depende de una sesión de
// servidor creada por la búsqueda inicial (sin cookie no avanza), así
// que este recolector se queda con la primera página de resultados
// (por defecto ~20 carreras, ordenadas por relevancia) en vez de
// simular sesión — alcanza para ir sumando carreras japonesas de a
// poco en cada corrida, igual que otros recolectores de una sola
// página (inschrijven.ts).

const URL_BUSQUEDA =
  "https://runnet.jp/entry/runtes/user/pc/RaceSearchZZSDetailAction.do?command=search&serviceType=101";
const URL_DETALLE = (raceId: string) =>
  `https://runnet.jp/entry/runtes/user/pc/competitionDetailAction.do?raceId=${raceId}&div=1`;

const PREFECTURAS = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

interface FilaRunnet {
  raceId: string;
  nombre: string;
  anio: number;
  mes: number;
  dia: number;
  descripcion: string;
  modalidades: string;
}

function extraerBloques(html: string): string[] {
  const inicios: number[] = [];
  const marcador = '<div class="item-title">';
  let idx = html.indexOf(marcador);
  while (idx !== -1) {
    inicios.push(idx);
    idx = html.indexOf(marcador, idx + marcador.length);
  }
  const bloques: string[] = [];
  for (let i = 0; i < inicios.length; i++) {
    const fin = i + 1 < inicios.length ? inicios[i + 1] : html.length;
    bloques.push(html.slice(inicios[i], fin));
  }
  return bloques;
}

function parsearBloque(bloque: string): FilaRunnet | null {
  const titulo = bloque.match(/competitionDetailAction\.do\?raceId=(\d+)&div=1">([^<]*)<\/a>/);
  if (!titulo) return null;
  const fecha = bloque.match(/<p class="date">(\d{4})年<span>(\d{1,2})<\/span>月<span>(\d{1,2})<\/span>日/);
  if (!fecha) return null;
  const descripcion = bloque.match(/<p class="tourDetail">([^<]*)<\/p>/)?.[1] ?? "";
  const modalidades = bloque.match(/<th><span>種目<\/span><\/th>\s*<td>\s*<div>([\s\S]*?)<\/div>/)?.[1] ?? "";

  return {
    raceId: titulo[1],
    nombre: titulo[2].trim(),
    anio: Number(fecha[1]),
    mes: Number(fecha[2]),
    dia: Number(fecha[3]),
    descripcion,
    modalidades: modalidades.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  };
}

function ciudadDesdeDescripcion(texto: string): string {
  for (const pref of PREFECTURAS) {
    const idx = texto.indexOf(pref);
    if (idx === -1) continue;
    const resto = texto.slice(idx + pref.length);
    const ciudad = resto.match(/^([^\s、。！？,.]{1,10}?(?:市|区|町|村))/)?.[1];
    return ciudad ? `${pref}${ciudad}` : pref;
  }
  return "Japón";
}

function kmDesdeModalidades(texto: string): number {
  const numeros = [...texto.matchAll(/(\d+(?:\.\d+)?)\s*km/gi)].map((m) => parseFloat(m[1]));
  // Ojo: NO se busca la palabra genérica "マラソン" (maratón) sola,
  // porque aparece también en "ハーフマラソン" (media maratón) y
  // "リレーマラソン" (maratón por relevos) — solo cuenta como maratón
  // completo si dice explícitamente "フル" (full) o el número 42.195.
  if (/フル|42\.195/.test(texto) && !numeros.some((n) => n > 40)) numeros.push(42.195);
  if (/ハーフ/.test(texto) && !numeros.some((n) => n > 20 && n < 22)) numeros.push(21.0975);
  return numeros.length ? Math.max(...numeros) : 0;
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

function aCarreraExterna(fila: FilaRunnet): CarreraExterna | null {
  if (!fila.nombre) return null;
  const fecha = new Date(
    `${fila.anio}-${String(fila.mes).padStart(2, "0")}-${String(fila.dia).padStart(2, "0")}T10:00:00Z`,
  );
  if (Number.isNaN(fecha.getTime())) return null;

  const { pais, continente } = paisDesdeCodigoIso("JP");
  const km = kmDesdeModalidades(fila.modalidades);
  const esTrail = /トレイル|山岳|登山/.test(fila.modalidades + fila.descripcion);
  const urlDetalle = URL_DETALLE(fila.raceId);

  return {
    fuenteTipo: "runnet",
    fuenteNombre: "RUNNET",
    fuenteUrl: urlDetalle,
    externalId: fila.raceId,
    nombre: fila.nombre,
    ciudad: ciudadDesdeDescripcion(fila.descripcion),
    pais,
    codigoPais: "JP",
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: urlDetalle,
    anio: fila.anio,
    fecha,
    urlInscripcionOficial: urlDetalle,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: esTrail ? "TRAIL" : "ASFALTO" }],
  };
}

export async function correrCollectorRunnet() {
  return registrarEjecucion("runnet", async () => {
    const res = await fetch(URL_BUSQUEDA, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`RUNNET respondió ${res.status}`);
    const html = await res.text();
    const filas = extraerBloques(html).map(parsearBloque).filter((f): f is FilaRunnet => f !== null);

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    for (const fila of filas) {
      try {
        const externa = aCarreraExterna(fila);
        if (!externa) continue;
        console.log("[runnet]", externa.nombre, "|", externa.ciudad, "|", externa.fecha.toISOString());
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
