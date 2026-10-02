import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { Carrera, EdicionHistorial, EstadoInscripcion } from "./types";
import { normalizar } from "./text";

export function slugify(id: string, name: string): string {
  const base = normalizar(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${id}`;
}

const ESTADO_DB_A_UI: Record<string, EstadoInscripcion> = {
  ABIERTA: "abierta",
  ULTIMOS_CUPOS: "ultimos",
  SORTEO: "sorteo",
  PROXIMAMENTE: "proximamente",
  CERRADA: "cerrada",
  CANCELADA: "cerrada",
};

const CONTINENTE_DB_A_UI: Record<string, string> = {
  EUROPA: "Europa",
  AMERICA_DEL_NORTE: "América del Norte",
  AMERICA_CENTRAL: "América Central",
  AMERICA_DEL_SUR: "América del Sur",
  ASIA: "Asia",
  AFRICA: "África",
  OCEANIA: "Oceanía",
};

const DISTANCIA_DB_A_UI: Record<string, string> = {
  MARATON: "Maratón",
  MEDIA_MARATON: "Media maratón",
  KM_5: "5K",
  KM_10: "10K",
  KM_15: "15K",
  KM_20: "20K",
  KM_25: "25K",
  KM_30: "30K",
  ULTRA: "Ultra maratón",
  RELEVOS: "Relevos",
  OTRA: "Distancia variable",
};

const TERRENO_DB_A_UI: Record<string, string> = {
  ASFALTO: "Asfalto",
  TRAIL: "Trail",
  MIXTO: "Mixto",
  PISTA: "Pista",
};

const EVENTO_CON_EDICIONES = {
  include: {
    ediciones: { orderBy: { anio: "desc" as const } },
    distancias: true,
  },
} satisfies Prisma.EventoDefaultArgs;

type EventoConEdiciones = Prisma.EventoGetPayload<typeof EVENTO_CON_EDICIONES>;

// Las páginas de listado (inicio, calendario, rankings, mapa, asistente...)
// cargan TODO el catálogo de una vez. Traer ahí las descripciones en 4
// idiomas, perfiles de elevación, etc. — que solo usa la ficha individual
// de cada carrera — multiplicaba el tráfico de la base y terminó agotando
// la cuota gratis de Supabase (egress). Acá va solo lo que esas páginas
// muestran; la ficha sigue usando EVENTO_CON_EDICIONES completo.
const EVENTO_LISTADO = {
  select: {
    id: true,
    nombre: true,
    ciudad: true,
    pais: true,
    bandera: true,
    continente: true,
    lat: true,
    lng: true,
    sitioWeb: true,
    colorPrimario: true,
    colorSecundario: true,
    esWorldMarathonMajor: true,
    climaTempPromedioC: true,
    ediciones: {
      orderBy: { anio: "desc" as const },
      select: {
        id: true,
        anio: true,
        fecha: true,
        estado: true,
        precioDesde: true,
        moneda: true,
        numCorredores: true,
        desnivelPositivoM: true,
        tiempoLimite: true,
        dificultad: true,
        ratingPromedio: true,
        numResenas: true,
      },
    },
    distancias: { select: { tipo: true, km: true, terreno: true, edicionId: true } },
  },
} satisfies Prisma.EventoDefaultArgs;

type EventoListado = Prisma.EventoGetPayload<typeof EVENTO_LISTADO>;

function edicionActualDe<E extends { fecha: Date }>(evento: { ediciones: E[] }): E | undefined {
  const hoy = new Date();
  const futuras = evento.ediciones
    .filter((e) => e.fecha >= hoy)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  return futuras[0] ?? evento.ediciones[0];
}

// El estado que guarda cada edición se actualiza solo cuando un
// collector la vuelve a visitar (ver estadoPorDefecto en upsert.ts).
// Si una carrera no se re-scrapea justo después de su fecha, puede
// quedar mostrando "inscripción abierta" indefinidamente aunque ya
// haya pasado. Como red de seguridad, acá se corrige en el momento de
// mostrarla: una fecha ya pasada siempre se ve como cerrada, sin
// importar qué haya quedado guardado.
function estadoParaMostrar(edicion: { fecha: Date; estado: string }): EstadoInscripcion {
  const yaPaso = edicion.fecha < new Date();
  const abiertaOSimilar = edicion.estado === "ABIERTA" || edicion.estado === "ULTIMOS_CUPOS" || edicion.estado === "SORTEO" || edicion.estado === "PROXIMAMENTE";
  if (yaPaso && abiertaOSimilar) return "cerrada";
  return ESTADO_DB_A_UI[edicion.estado] ?? "proximamente";
}

function aCarrera(evento: EventoConEdiciones | EventoListado): Carrera | null {
  const edicion = edicionActualDe<EventoListado["ediciones"][number]>(evento);
  if (!edicion) return null;
  // Solo la ficha individual trae los campos de detalle (ver EVENTO_LISTADO).
  const detalle = "descripcion" in evento ? evento : null;
  const edicionDetalle = detalle ? detalle.ediciones.find((e) => e.id === edicion.id) : undefined;
  const distancia = evento.distancias.find((d) => d.edicionId === edicion.id) ?? evento.distancias[0];

  const history: EdicionHistorial[] = evento.ediciones
    .filter((e) => e.id !== edicion.id)
    .sort((a, b) => b.anio - a.anio)
    .slice(0, 3)
    .map((e) => ({ y: e.anio, r: e.numCorredores ?? 0, p: e.precioDesde ?? 0 }));

  return {
    id: evento.id,
    name: evento.nombre,
    city: evento.ciudad,
    country: evento.pais,
    flag: evento.bandera ?? "",
    continent: CONTINENTE_DB_A_UI[evento.continente] ?? evento.continente,
    lat: evento.lat,
    lng: evento.lng,
    date: edicion.fecha.toISOString().slice(0, 10),
    km: distancia?.km ?? 0,
    dist: distancia ? (DISTANCIA_DB_A_UI[distancia.tipo] ?? distancia.tipo) : "",
    type: distancia ? (TERRENO_DB_A_UI[distancia.terreno] ?? distancia.terreno) : "Asfalto",
    status: estadoParaMostrar(edicion),
    price: edicion.precioDesde ?? 0,
    cur: edicion.moneda ?? "$",
    runners: edicion.numCorredores ?? 0,
    elev: edicion.desnivelPositivoM ?? 0,
    temp: evento.climaTempPromedioC ?? 0,
    limit: edicion.tiempoLimite ?? "",
    diff: edicion.dificultad ?? 1,
    rating: edicion.ratingPromedio ?? 0,
    nrev: edicion.numResenas,
    major: evento.esWorldMarathonMajor,
    web: evento.sitioWeb ?? "",
    airport: detalle?.aeropuerto ?? "",
    hotel: detalle?.zonaHoteles ?? "",
    g: [evento.colorPrimario ?? "#2547E8", evento.colorSecundario ?? "#12151b"],
    desc: detalle?.descripcion ?? "",
    descEn: detalle?.descripcionEn ?? "",
    descPt: detalle?.descripcionPt ?? "",
    descFr: detalle?.descripcionFr ?? "",
    recM: edicionDetalle?.recordMasculino ?? "",
    recF: edicionDetalle?.recordFemenino ?? "",
    profile: Array.isArray(edicionDetalle?.perfilElevacion) ? (edicionDetalle.perfilElevacion as number[]) : [],
    history,
  };
}

async function cargarCarreras(): Promise<Carrera[]> {
  const eventos = await prisma.evento.findMany(EVENTO_LISTADO);
  const carreras = eventos.map(aCarrera).filter((c): c is Carrera => c !== null);
  return carreras.sort((a, b) => a.date.localeCompare(b.date));
}

// Varias páginas se regeneran juntas (y el asistente pregunta seguido):
// sin esto, cada una descargaba el catálogo entero por separado. Dentro de
// una misma instancia del servidor se reutiliza la misma carga un rato.
const MEMO_MS = 10 * 60_000;
let memo: { hasta: number; promesa: Promise<Carrera[]> } | null = null;

export function getCarreras(): Promise<Carrera[]> {
  if (memo && memo.hasta > Date.now()) return memo.promesa;
  const promesa = cargarCarreras();
  memo = { hasta: Date.now() + MEMO_MS, promesa };
  promesa.catch(() => {
    if (memo?.promesa === promesa) memo = null;
  });
  return promesa;
}

export async function getCarreraPorId(id: string): Promise<Carrera | undefined> {
  const evento = await prisma.evento.findUnique({ where: { id }, ...EVENTO_CON_EDICIONES });
  if (!evento) return undefined;
  return aCarrera(evento) ?? undefined;
}

export async function getCarreraPorSlug(slug: string): Promise<Carrera | undefined> {
  const evento = await prisma.evento.findUnique({ where: { slug }, ...EVENTO_CON_EDICIONES });
  if (!evento) return undefined;
  return aCarrera(evento) ?? undefined;
}

// Para la ficha de una carrera: otras del mismo país (o, si no hay, del
// mismo continente) a ±3 semanas. Consulta acotada a propósito: cargar el
// catálogo entero en cada una de las miles de fichas volvería a disparar
// el tráfico de la base (ver EVENTO_LISTADO).
export async function getCarrerasCercanas(r: Carrera, limite = 6): Promise<Carrera[]> {
  const fecha = new Date(r.date + "T12:00:00Z");
  const desde = new Date(Math.max(fecha.getTime() - 21 * 864e5, Date.now()));
  const hasta = new Date(fecha.getTime() + 21 * 864e5);
  const enRango = { ediciones: { some: { fecha: { gte: desde, lte: hasta } } } };

  let eventos = await prisma.evento.findMany({
    where: { pais: r.country, id: { not: r.id }, ...enRango },
    take: limite,
    ...EVENTO_LISTADO,
  });
  if (eventos.length === 0) {
    const continente = Object.entries(CONTINENTE_DB_A_UI).find(([, ui]) => ui === r.continent)?.[0];
    if (continente) {
      eventos = await prisma.evento.findMany({
        where: { continente: continente as Prisma.EventoWhereInput["continente"], id: { not: r.id }, ...enRango },
        take: limite,
        ...EVENTO_LISTADO,
      });
    }
  }
  return eventos
    .map(aCarrera)
    .filter((c): c is Carrera => c !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}
