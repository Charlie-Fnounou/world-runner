import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { prisma } from "@/lib/prisma";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector de RunSignup (mayoría EE. UU., con carreras sueltas de
// otros países también). Usa la API REST pública de búsqueda de
// carreras (/rest/races) — no hace falta autenticación para esta
// búsqueda; el OAuth2 (ver /admin/robots) queda disponible para
// funciones futuras que sí lo requieran, pero si se manda el token en
// esta búsqueda, la API la limita solo a las carreras de esa cuenta en
// particular (por eso NO se manda Authorization acá).
//
// Por ahora solo trae los datos básicos del listado (nombre, fecha,
// ciudad, link). Los detalles por carrera (distancias, precio exacto)
// están disponibles en /rest/race/{id} y quedan para una mejora
// futura, para no disparar cientos de llamadas extra en cada corrida.
//
// LA API TIENE UN TOPE DURO DE 50 PÁGINAS ("page" debe ser menor a 51)
// sin importar cuántos resultados haya en total — pedir la página 51
// da error. Con results_per_page=100 eso es un techo de 5.000
// carreras, muy por debajo de todo lo que tiene RunSignup en EE. UU.
// (un solo mes puede tener más de 2.000 carreras). Por eso NO se pagina
// sobre el catálogo entero: se filtra por un rango de fechas de UN MES
// a la vez (start_date/end_date), donde 5.000 sí alcanza para agotar
// ese mes, y se guarda en EstadoCollector en qué mes (y en qué página
// dentro de ese mes) se quedó la última corrida, avanzando mes a mes
// con el tiempo y reiniciando al llegar al horizonte.

const BASE_URL = "https://api.runsignup.com/rest/races";
// upsertCarreraExterna hace ~6-8 consultas secuenciales a la base por
// carrera (findUnique + update/create de evento, edicion, fuenteDato,
// historial de cambios...). Contra una base remota eso da algo así
// como 300-800ms por carrera. El cron le da a cada collector un límite
// de 60s (ver conLimiteDeTiempo en route.ts), así que una sola página
// de 1000 podía tardar varios minutos y nunca terminaba a tiempo — la
// corrida quedaba abandonada sin guardar nada. Con 35 carreras y
// concurrencia moderada entra cómodo en la ventana de 60s, y al correr
// todos los días igual se cubre el catálogo con el tiempo.
const RESULTS_PER_PAGE = 35;
const PAGINAS_POR_CORRIDA = 1;
const CONCURRENCIA = 8; // upserts en simultáneo, para no saturar el pool de conexiones
const HORIZONTE_MESES = 18; // no ir más allá de año y medio adelante antes de reiniciar
const COLLECTOR_ID = "runsignup";

interface RaceRunSignup {
  race: {
    race_id: number;
    name: string;
    next_date: string; // "MM/DD/YYYY"
    url: string;
    address?: {
      city?: string;
      state?: string;
      country_code?: string;
    };
  };
}

function fechaDesdeMMDDYYYY(texto: string | null | undefined): Date | null {
  // Series, programas de entrenamiento y clubes recurrentes no tienen
  // una única fecha próxima definida y vienen con next_date null/vacío.
  if (!texto) return null;
  const m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, mes, dia, anio] = m;
  return new Date(`${anio}-${mes}-${dia}T07:00:00Z`);
}

function rangoDelMes(monthOffset: number): { inicio: string; fin: string } {
  const hoy = new Date();
  const base = new Date(hoy.getFullYear(), hoy.getMonth() + monthOffset, 1);
  const inicioDate = monthOffset === 0 ? hoy : base;
  const finDate = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { inicio: inicioDate.toISOString().slice(0, 10), fin: finDate.toISOString().slice(0, 10) };
}

async function obtenerPaginaDeCarreras(pagina: number, inicio: string, fin: string): Promise<RaceRunSignup[]> {
  const url = new URL(BASE_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("start_date", inicio);
  url.searchParams.set("end_date", fin);
  url.searchParams.set("results_per_page", String(RESULTS_PER_PAGE));
  url.searchParams.set("page", String(pagina));
  url.searchParams.set("event_type", "running_race");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)",
    },
  });
  if (!res.ok) throw new Error(`RunSignup respondió ${res.status}`);
  const data = await res.json();
  if (data.error) return []; // ej. se pasó de la página 50: tratamos como "no hay más"
  return data.races ?? [];
}

function aCarreraExterna(r: RaceRunSignup["race"]): CarreraExterna | null {
  const fecha = fechaDesdeMMDDYYYY(r.next_date);
  if (!fecha) return null;

  const { pais, continente } = paisDesdeCodigoIso(r.address?.country_code);

  return {
    fuenteTipo: "runsignup",
    fuenteNombre: "RunSignup API",
    fuenteUrl: r.url,
    externalId: String(r.race_id),
    nombre: r.name,
    ciudad: r.address?.city ?? "",
    pais,
    codigoPais: r.address?.country_code,
    continente,
    // El listado no trae lat/lng; se completa más adelante con un
    // geocodificador si hace falta para el mapa.
    lat: 0,
    lng: 0,
    sitioWeb: r.url,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: r.url,
    distancias: [{ tipo: TipoDistancia.OTRA, km: 0 }],
  };
}

// El cursor combina mes (0 = mes actual, 1 = el que viene, ...) y en
// qué página de ESE mes se quedó, codificados en un solo entero:
// mes*1000 + pagina. Así EstadoCollector no necesita más columnas.
function decodificarCursor(cursor: number | null): { mes: number; pagina: number } {
  if (cursor === null || cursor < 0) return { mes: 0, pagina: 0 };
  return { mes: Math.floor(cursor / 1000), pagina: cursor % 1000 };
}
function codificarCursor(mes: number, pagina: number): number {
  return mes * 1000 + pagina;
}

export async function correrCollectorRunSignup() {
  return registrarEjecucion("runsignup", async () => {
    const estado = await prisma.estadoCollector.findUnique({ where: { collector: COLLECTOR_ID } });
    let { mes, pagina } = decodificarCursor(estado?.cursor ?? null);

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    for (let i = 0; i < PAGINAS_POR_CORRIDA; i++) {
      pagina += 1;
      const { inicio, fin } = rangoDelMes(mes);
      const carreras = await obtenerPaginaDeCarreras(pagina, inicio, fin);

      if (carreras.length === 0) {
        // Se agotó este mes (o se pasó de la página 50 del rango):
        // pasa al mes siguiente, dando la vuelta al llegar al horizonte.
        mes = mes + 1 > HORIZONTE_MESES ? 0 : mes + 1;
        pagina = 0;
        continue;
      }

      for (let inicioLote = 0; inicioLote < carreras.length; inicioLote += CONCURRENCIA) {
        const lote = carreras.slice(inicioLote, inicioLote + CONCURRENCIA);
        const resultados = await Promise.all(
          lote.map(async ({ race }) => {
            try {
              const externa = aCarreraExterna(race);
              if (!externa) return "error";
              const { creada } = await upsertCarreraExterna(externa);
              return creada ? "nueva" : "actualizada";
            } catch {
              return "error";
            }
          }),
        );
        for (const r of resultados) {
          if (r === "nueva") nuevas++;
          else if (r === "actualizada") actualizadas++;
          else errores++;
        }
      }
    }

    await prisma.estadoCollector.upsert({
      where: { collector: COLLECTOR_ID },
      update: { cursor: codificarCursor(mes, pagina) },
      create: { collector: COLLECTOR_ID, cursor: codificarCursor(mes, pagina) },
    });

    return { nuevas, actualizadas, errores };
  });
}
