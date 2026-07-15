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
  KM_10: "10K",
  KM_20: "20K",
  ULTRA: "Ultra maratón",
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

function edicionActualDe(evento: EventoConEdiciones) {
  const hoy = new Date();
  const futuras = evento.ediciones
    .filter((e) => e.fecha >= hoy)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  return futuras[0] ?? evento.ediciones[0];
}

function aCarrera(evento: EventoConEdiciones): Carrera | null {
  const edicion = edicionActualDe(evento);
  if (!edicion) return null;
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
    status: ESTADO_DB_A_UI[edicion.estado] ?? "proximamente",
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
    airport: evento.aeropuerto ?? "",
    hotel: evento.zonaHoteles ?? "",
    g: [evento.colorPrimario ?? "#2547E8", evento.colorSecundario ?? "#12151b"],
    desc: evento.descripcion ?? "",
    recM: edicion.recordMasculino ?? "",
    recF: edicion.recordFemenino ?? "",
    profile: Array.isArray(edicion.perfilElevacion) ? (edicion.perfilElevacion as number[]) : [],
    history,
  };
}

export async function getCarreras(): Promise<Carrera[]> {
  const eventos = await prisma.evento.findMany(EVENTO_CON_EDICIONES);
  const carreras = eventos.map(aCarrera).filter((c): c is Carrera => c !== null);
  return carreras.sort((a, b) => a.date.localeCompare(b.date));
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
