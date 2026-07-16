import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de Connect Atletik (connect.atletik.dk), el calendario
// OFICIAL de Dansk Atletik Forbund (DAF, la federación danesa de
// atletismo) — "kun stævner der fremgår i Connect anses for officielle
// og kan indgå i forbundets statistik" (solo las competencias en
// Connect son oficiales para la federación). No tiene robots.txt (404
// al pedirlo), así que no hay restricciones publicadas.
//
// OJO con sportstiming.dk: se investigó primero como fuente para
// Dinamarca porque también trae carreras danesas, pero se descartó:
// su endpoint de datos (/General/EventList/SearchEvents) devuelve
// "TotalResults":0 cuando el User-Agent es "WorldRunnerBot" (nuestro
// UA honesto) y devuelve los datos reales solo con un User-Agent de
// navegador — es decir, bloquea activamente a los bots por UA (y su
// robots.txt lista explícitamente a ClaudeBot, GPTBot, etc. como
// prohibidos). Falsificar el User-Agent para esquivar eso violaría la
// regla de usar siempre "WorldRunnerBot/1.0", así que se abandonó esa
// fuente. Connect Atletik, en cambio, responde igual sin importar el
// User-Agent.
//
// El calendario de Connect mezcla TODO el atletismo (pista, campo,
// marcha, cursos de jueces, mítines de escuela...), y a diferencia de
// FIDAL (Italia) o de la propia API de EQ Timing, el listado no trae
// un campo de "tipo de disciplina" para filtrar. Se filtra entonces
// por palabras clave en el título (løb/maraton/rundt/run/timer) menos
// una lista de exclusión (kursus, møde) para descartar mítines de
// pista/campo. No es perfecto, pero en la práctica separa bien las
// carreras de calle reales (HCA Marathon, Herlevløbet, Bak Half
// Marathon...) de las reuniones de club/pista.
//
// Como el filtro de título deja pocas carreras por mes, se pide
// también la página de detalle de cada candidata para sacar la
// distancia (viene en la bajada del texto, ej. "5km. og 10km."), la
// ciudad (de la dirección) y el sitio web oficial de inscripción.

const BASE_URL = "https://connect.atletik.dk";
const COLLECTOR_ID = "connect-atletik";
const MESES_A_RECORRER = 6;

const PALABRAS_INCLUSION = /løb|maraton|marathon|\brun\b|\brundt\b/i;
const PALABRAS_EXCLUSION = /kursus|\bmøde\b/i;

interface FilaCalendario {
  diaTexto: string; // "D" o "D-D" (día del mes que se está pidiendo)
  href: string; // "/Calendar/View/1234"
  nombre: string;
}

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

function parsearMes(html: string): FilaCalendario[] {
  const filas: FilaCalendario[] = [];
  const bloques = html.split('<tr class="small d-flex">').slice(1);
  for (const bloque of bloques) {
    const dia = bloque.match(/<td class="col-1 text-end">([^<]*)<\/td>/);
    const link = bloque.match(/<a class="text-decoration-none link-dafskyb" href="(\/Calendar\/View\/\d+)">\s*([^<]+?)\s*<\/a>/);
    if (!dia || !link) continue;
    filas.push({ diaTexto: dia[1].trim(), href: link[1], nombre: decodificarHtml(link[2]) });
  }
  return filas;
}

// La columna "Dato" del calendario mensual trae "D/M" o "D-D/M" (rango
// dentro del mismo mes, ej. "29-30/8"): se usa el primer día del rango
// y el mes que ya sabemos por la URL /Calendar/{anio}/{mes} que se pidió.
function fechaDesdeFila(diaTexto: string, anio: number, mes: number): Date | null {
  const m = diaTexto.match(/^(\d{1,2})(?:-\d{1,2})?\/(\d{1,2})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  if (!dia) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T10:00:00Z`);
}

interface DetalleDinamarca {
  ciudad: string;
  sitioWeb: string | null;
  km: number;
}

function kmDesdeTexto(texto: string): number {
  const minusc = texto.toLowerCase();
  const numeros = [...minusc.matchAll(/(\d+(?:[.,]\d+)?)\s*km/g)].map((m) => parseFloat(m[1].replace(",", ".")));
  if (/halvmaraton|half\s*marathon/.test(minusc)) numeros.push(21.0975);
  else if (/maraton|marathon/.test(minusc)) numeros.push(42.195);
  return numeros.length ? Math.max(...numeros) : 0;
}

// Saca la ciudad de una dirección tipo "Israels Plads 3, Bolbro, 5200
// Odense V, Danmark" o "Churchillparken, 1263 København K": toma lo
// que sigue al código postal de 4 dígitos y le quita el sufijo de
// zona postal danesa de 1-2 letras (Odense V -> Odense, Aarhus C ->
// Aarhus).
function ciudadDesdeDireccion(direccion: string): string {
  const m = direccion.match(/\d{4}\s+([^\d,]+)/);
  if (!m) return "";
  return m[1].replace(/\s+[A-ZÆØÅ]{1,2}$/, "").trim();
}

async function traerDetalle(href: string): Promise<DetalleDinamarca> {
  const url = `${BASE_URL}${href}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
  });
  if (!res.ok) throw new Error(`Connect Atletik (detalle) respondió ${res.status}`);
  const html = await res.text();

  const descM = html.match(/<div class="card-body">\s*([\s\S]*?)\s*<\/div>/);
  const descripcion = descM ? decodificarHtml(descM[1]) : "";

  const addrM = html.match(/bi-geo-alt-fill[\s\S]*?<\/i><\/td>\s*<td>([^<]*)<\/td>/);
  const direccion = addrM ? decodificarHtml(addrM[1]) : "";

  const webM = html.match(/bi-globe[\s\S]*?<\/i><\/td>\s*<td><a href="([^"]*)"/);
  const sitioWeb = webM ? decodificarHtml(webM[1]) : null;

  return {
    ciudad: ciudadDesdeDireccion(direccion),
    sitioWeb,
    km: kmDesdeTexto(descripcion),
  };
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

function aCarreraExterna(fila: FilaCalendario, fecha: Date, detalle: DetalleDinamarca): CarreraExterna | null {
  if (!fila.nombre) return null;
  const id = fila.href.match(/\/View\/(\d+)/)?.[1];
  if (!id) return null;

  const urlEvento = `${BASE_URL}${fila.href}`;
  const inscripcion = detalle.sitioWeb || urlEvento;

  return {
    fuenteTipo: "connect-atletik",
    fuenteNombre: "Connect Atletik — Dansk Atletik Forbund",
    fuenteUrl: urlEvento,
    externalId: id,
    nombre: fila.nombre,
    ciudad: detalle.ciudad || "Dinamarca",
    pais: "Dinamarca",
    codigoPais: "DK",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: inscripcion,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: inscripcion,
    distancias: [{ tipo: tipoDistanciaDesdeKm(detalle.km), km: detalle.km, terreno: "ASFALTO" }],
  };
}

async function traerMes(anio: number, mes: number): Promise<FilaCalendario[]> {
  const res = await fetch(`${BASE_URL}/Calendar/${anio}/${mes}`, {
    headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
  });
  if (!res.ok) throw new Error(`Connect Atletik (${anio}/${mes}) respondió ${res.status}`);
  const html = await res.text();
  return parsearMes(html);
}

export async function correrCollectorConnectAtletik() {
  return registrarEjecucion(COLLECTOR_ID, async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const hoy = new Date();
    const vistos = new Set<string>();

    for (let i = 0; i < MESES_A_RECORRER; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
      const anio = fecha.getFullYear();
      const mes = fecha.getMonth() + 1;

      try {
        const filas = await traerMes(anio, mes);

        for (const fila of filas) {
          const nombreMin = fila.nombre.toLowerCase();
          if (!PALABRAS_INCLUSION.test(nombreMin) || PALABRAS_EXCLUSION.test(nombreMin)) continue;

          const id = fila.href.match(/\/View\/(\d+)/)?.[1];
          if (!id || vistos.has(id)) continue;
          vistos.add(id);

          const fechaCarrera = fechaDesdeFila(fila.diaTexto, anio, mes);
          if (!fechaCarrera) continue;

          try {
            const detalle = await traerDetalle(fila.href);
            const externa = aCarreraExterna(fila, fechaCarrera, detalle);
            if (!externa) continue;
            const { creada } = await upsertCarreraExterna(externa);
            if (creada) nuevas++;
            else actualizadas++;
          } catch {
            errores++;
          }
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch {
        errores++;
      }
    }

    return { nuevas, actualizadas, errores };
  });
}
