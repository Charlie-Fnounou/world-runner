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
// historial de cambios...). Medido contra la base real: ~640ms/carrera
// con concurrencia 8, ~345ms/carrera con concurrencia 16 (el pool de
// Supabase soporta hasta 17 conexiones simultáneas). Este collector es,
// con diferencia, la fuente más grande (EE. UU. tiene miles de carreras
// por mes) y por eso recibe un límite de tiempo propio y más alto en el
// cron (ver TIEMPOS_ESPECIALES en route.ts) en vez del de 60s parejo
// que usan el resto de los ~90 collectors más chicos. 300 carreras/día
// a ~345ms c/u son ~103s, cómodo dentro de ese presupuesto extendido.
// Antes esto estaba en 35 carreras/día (limitado al viejo tope de 60s):
// a ese ritmo, cubrir el horizonte de 18 meses tardaba casi 3 años.
const RESULTS_PER_PAGE = 100;
const PAGINAS_POR_CORRIDA = 3;
const CONCURRENCIA = 14; // upserts en simultáneo, por debajo del límite de 17 conexiones del pool
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

// ============================================================
// Enriquecimiento: /rest/race/{id} trae precio real, distancia y cupo
// por carrera — datos que el listado básico de arriba no incluye (por
// eso la gran mayoría de las carreras de RunSignup se ven con "—" en
// vez de precio/distancia real). Es un paso APARTE del listado: no
// pisa nada que el listado ya haya guardado (upsert.ts ignora los
// campos que este collector no toca), así que una vez enriquecida una
// carrera, queda así aunque el listado la vuelva a tocar después.
const LOTE_ENRIQUECIMIENTO = 40;
const CONCURRENCIA_ENRIQUECIMIENTO = 10;

interface EventoDetalleRunSignup {
  event_type: string;
  distance?: string;
  participant_cap?: number;
  registration_periods?: { race_fee?: string; registration_closes: string }[];
}

interface RaceDetalleRunSignup {
  race: {
    description?: string;
    logo_url?: string;
    events?: EventoDetalleRunSignup[];
  };
}

function textoSinHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

function kmDesdeTextoDistancia(texto: string): number {
  const t = texto.toLowerCase();
  if (/half\s*marathon/.test(t)) return 21.0975;
  if (/marathon/.test(t) && !/half/.test(t)) return 42.195;
  const millas = t.match(/(\d+(?:\.\d+)?)\s*mile/);
  if (millas) return Math.round(parseFloat(millas[1]) * 1.60934 * 100) / 100;
  const km = t.match(/(\d+(?:\.\d+)?)\s*k(?:m)?\b/);
  return km ? parseFloat(km[1]) : 0;
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

// El precio cambia con el tiempo (early bird, etc.) — se toma el de la
// franja vigente ahora mismo; si la carrera ya pasó (todas las franjas
// vencidas), se toma la última conocida como referencia igual.
function precioActualDeEvento(ev: EventoDetalleRunSignup): number | null {
  const ahora = Date.now();
  const periodos = ev.registration_periods ?? [];
  const vigente = periodos.find((p) => new Date(p.registration_closes).getTime() >= ahora);
  const elegido = vigente ?? periodos[periodos.length - 1];
  if (!elegido?.race_fee) return null;
  const n = parseFloat(elegido.race_fee.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

export async function enriquecerCarrerasRunSignup() {
  return registrarEjecucion("runsignup-enriquecer", async () => {
    const pendientes = await prisma.evento.findMany({
      where: { descripcion: null, fuentes: { some: { tipo: "runsignup" } } },
      select: { id: true, fuentes: { where: { tipo: "runsignup" }, select: { externalId: true } } },
      take: LOTE_ENRIQUECIMIENTO,
    });

    let actualizadas = 0;
    let errores = 0;

    for (let i = 0; i < pendientes.length; i += CONCURRENCIA_ENRIQUECIMIENTO) {
      const lote = pendientes.slice(i, i + CONCURRENCIA_ENRIQUECIMIENTO);
      await Promise.all(
        lote.map(async (evento) => {
          const externalId = evento.fuentes[0]?.externalId;
          if (!externalId) {
            errores++;
            return;
          }
          try {
            const res = await fetch(`https://api.runsignup.com/rest/race/${externalId}?format=json`, {
              headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: RaceDetalleRunSignup = await res.json();
            const race = data.race;

            const eventos = (race.events ?? []).filter(
              (e) => e.event_type === "running_race" || e.event_type === "virtual_race",
            );
            const distancias = eventos
              .map((e) => kmDesdeTextoDistancia(e.distance ?? ""))
              .filter((km) => km > 0);
            const precios = eventos.map(precioActualDeEvento).filter((p): p is number => p !== null);
            const cuposTotales = eventos.reduce((s, e) => s + (e.participant_cap ?? 0), 0) || null;

            await prisma.evento.update({
              where: { id: evento.id },
              data: {
                descripcion: race.description ? textoSinHtml(race.description) : "",
                logoUrl: race.logo_url || undefined,
              },
            });

            const precioMinimo = precios.length > 0 ? Math.min(...precios) : null;
            if (precioMinimo !== null || cuposTotales !== null) {
              await prisma.edicion.updateMany({
                where: { eventoId: evento.id },
                data: {
                  ...(precioMinimo !== null ? { precioDesde: precioMinimo, moneda: "USD" } : {}),
                  ...(cuposTotales !== null ? { cuposTotales } : {}),
                },
              });
            }

            if (distancias.length > 0) {
              const distanciaExistente = await prisma.distancia.findFirst({ where: { eventoId: evento.id } });
              if (distanciaExistente && distanciaExistente.km === 0) {
                const kmPrincipal = Math.max(...distancias);
                await prisma.distancia.update({
                  where: { id: distanciaExistente.id },
                  data: { km: kmPrincipal, tipo: tipoDistanciaDesdeKm(kmPrincipal) },
                });
              }
            }

            actualizadas++;
          } catch {
            errores++;
          }
        }),
      );
    }

    return { nuevas: 0, actualizadas, errores };
  });
}
