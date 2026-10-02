import { prisma } from "./prisma";
import { slugify } from "./races-data";

export type TipoNovedad = "nueva" | "fecha" | "precio" | "pocosCupos" | "cancelada" | "abrio" | "cerro";

export interface Novedad {
  id: string;
  tipo: TipoNovedad;
  slug: string;
  nombre: string;
  ciudad: string;
  pais: string;
  bandera: string;
  antes: string | null;
  despues: string | null;
  cuando: string;
}

export interface EstadisticasRadar {
  proximos30Dias: number;
  paises: number;
  nuevasSemana: number;
  cambiosSemana: number;
}

// Hasta el 2/10/2026, upsert.ts registraba como "cambio de estado" también
// los estados DEDUCIDOS por la cercanía de la fecha (no informados por la
// fuente). Esos registros viejos no son noticias reales: de antes de esta
// fecha solo se toman los estados que no pueden ser deducidos.
const DESDE_ESTADOS_REALES = new Date("2026-10-02T00:00:00Z");

// Primer filtro en la base (el resto, comparar valores, en esCambioReal).
const FILTRO_CAMBIOS_CANDIDATOS = {
  OR: [
    { campo: "fecha" },
    { campo: "precioDesde" },
    { campo: "estado", valorNuevo: { in: ["ULTIMOS_CUPOS", "CANCELADA", "SORTEO"] } },
    { campo: "estado", creadoEn: { gte: DESDE_ESTADOS_REALES } },
  ],
};

const SELECT_EVENTO = { select: { id: true, nombre: true, ciudad: true, pais: true, bandera: true } } as const;

function tipoDeCambio(campo: string, valorNuevo: string | null): TipoNovedad | null {
  if (campo === "fecha") return "fecha";
  if (campo === "precioDesde") return "precio";
  if (campo !== "estado") return null;
  if (valorNuevo === "ULTIMOS_CUPOS") return "pocosCupos";
  if (valorNuevo === "CANCELADA") return "cancelada";
  if (valorNuevo === "ABIERTA" || valorNuevo === "SORTEO") return "abrio";
  if (valorNuevo === "CERRADA") return "cerro";
  return null;
}

function esCambioReal(h: { campo: string; valorAnterior: string | null; valorNuevo: string | null; creadoEn: Date }): boolean {
  if (h.campo === "fecha") return (h.valorAnterior ?? "").slice(0, 10) !== (h.valorNuevo ?? "").slice(0, 10);
  if (h.campo === "precioDesde") return h.valorAnterior !== h.valorNuevo;
  if (h.campo === "estado") {
    if (h.creadoEn >= DESDE_ESTADOS_REALES) return true;
    return h.valorNuevo === "ULTIMOS_CUPOS" || h.valorNuevo === "CANCELADA" || h.valorNuevo === "SORTEO";
  }
  return false;
}

// Las últimas novedades reales del catálogo: carreras recién agregadas y
// cambios detectados por los robots. Se trae de más y se filtra en memoria
// porque "cambio real" depende de comparar valores (ver esCambioReal).
export async function getNovedades(limite = 24, eventoId?: string): Promise<Novedad[]> {
  const cambios = await prisma.historialCambio.findMany({
    where: { ...FILTRO_CAMBIOS_CANDIDATOS, ...(eventoId ? { eventoId } : {}) },
    orderBy: { creadoEn: "desc" },
    take: limite * 4,
    select: { id: true, campo: true, valorAnterior: true, valorNuevo: true, creadoEn: true, evento: SELECT_EVENTO },
  });

  const desdeCambios: Novedad[] = [];
  for (const h of cambios) {
    if (!esCambioReal(h)) continue;
    const tipo = tipoDeCambio(h.campo, h.valorNuevo);
    if (!tipo) continue;
    desdeCambios.push({
      id: h.id,
      tipo,
      slug: slugify(h.evento.id, h.evento.nombre),
      nombre: h.evento.nombre,
      ciudad: h.evento.ciudad,
      pais: h.evento.pais,
      bandera: h.evento.bandera ?? "",
      antes: h.valorAnterior,
      despues: h.valorNuevo,
      cuando: h.creadoEn.toISOString(),
    });
    if (desdeCambios.length >= limite) break;
  }

  // La ficha de una carrera solo muestra sus propios cambios.
  if (eventoId) return desdeCambios;

  const nuevas = await prisma.evento.findMany({
    where: { ediciones: { some: { fecha: { gte: new Date() } } } },
    orderBy: { creadoEn: "desc" },
    take: Math.ceil(limite / 2),
    select: { ...SELECT_EVENTO.select, creadoEn: true },
  });

  const desdeNuevas: Novedad[] = nuevas.map((e) => ({
    id: "n-" + e.id,
    tipo: "nueva",
    slug: slugify(e.id, e.nombre),
    nombre: e.nombre,
    ciudad: e.ciudad,
    pais: e.pais,
    bandera: e.bandera ?? "",
    antes: null,
    despues: null,
    cuando: e.creadoEn.toISOString(),
  }));

  return [...desdeCambios, ...desdeNuevas].sort((a, b) => b.cuando.localeCompare(a.cuando)).slice(0, limite);
}

export async function getEstadisticasRadar(): Promise<EstadisticasRadar> {
  const ahora = new Date();
  const en30 = new Date(ahora.getTime() + 30 * 864e5);
  const hace7 = new Date(ahora.getTime() - 7 * 864e5);

  const [proximos30Dias, paises, nuevasSemana, cambiosSemana] = await Promise.all([
    prisma.edicion.count({ where: { fecha: { gte: ahora, lte: en30 } } }),
    prisma.evento.findMany({ distinct: ["pais"], select: { pais: true } }).then((r) => r.length),
    prisma.evento.count({ where: { creadoEn: { gte: hace7 } } }),
    prisma.historialCambio
      .findMany({
        where: { creadoEn: { gte: hace7 }, ...FILTRO_CAMBIOS_CANDIDATOS },
        select: { campo: true, valorAnterior: true, valorNuevo: true, creadoEn: true },
      })
      .then((r) => r.filter(esCambioReal).length),
  ]);

  return { proximos30Dias, paises, nuevasSemana, cambiosSemana };
}
