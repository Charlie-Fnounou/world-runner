"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/races-data";

export interface DatosResena {
  organizacion: number;
  paisajes: number;
  dificultad: number;
  medalla: number;
  camiseta: number;
  hidratacion: number;
  expo: number;
  seguridad: number;
  calidadPrecio: number;
  comentario?: string;
}

export interface ResenaConUsuario extends DatosResena {
  id: string;
  usuarioNombre: string;
  creadoEn: string;
  promedio: number;
}

const CAMPOS_RESENA = [
  "organizacion",
  "paisajes",
  "dificultad",
  "medalla",
  "camiseta",
  "hidratacion",
  "expo",
  "seguridad",
  "calidadPrecio",
] as const;

function promedioDe(r: Record<(typeof CAMPOS_RESENA)[number], number>): number {
  const suma = CAMPOS_RESENA.reduce((acc, c) => acc + r[c], 0);
  return Math.round((suma / CAMPOS_RESENA.length) * 10) / 10;
}

// Recalcula el promedio y la cantidad de reseñas de un evento, y lo guarda
// en su edición actual (la que usa la ficha/las tarjetas para mostrar
// "★ 4.6 (23)"). Las reseñas son por evento, no por edición puntual.
async function recalcularRating(eventoId: string) {
  const resenas = await prisma.resena.findMany({ where: { eventoId } });
  const promedio =
    resenas.length === 0 ? 0 : Math.round((resenas.reduce((acc, r) => acc + promedioDe(r), 0) / resenas.length) * 10) / 10;

  const hoy = new Date();
  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    include: { ediciones: { orderBy: { fecha: "asc" } } },
  });
  if (!evento) return;
  const actual = evento.ediciones.find((e) => e.fecha >= hoy) ?? evento.ediciones[evento.ediciones.length - 1];
  if (!actual) return;

  await prisma.edicion.update({
    where: { id: actual.id },
    data: { ratingPromedio: promedio, numResenas: resenas.length },
  });
}

export async function obtenerResenas(eventoId: string): Promise<ResenaConUsuario[]> {
  const resenas = await prisma.resena.findMany({
    where: { eventoId },
    include: { usuario: { select: { nombre: true, email: true } } },
    orderBy: { creadoEn: "desc" },
  });
  return resenas.map((r) => ({
    id: r.id,
    organizacion: r.organizacion,
    paisajes: r.paisajes,
    dificultad: r.dificultad,
    medalla: r.medalla,
    camiseta: r.camiseta,
    hidratacion: r.hidratacion,
    expo: r.expo,
    seguridad: r.seguridad,
    calidadPrecio: r.calidadPrecio,
    comentario: r.comentario ?? undefined,
    usuarioNombre: r.usuario.nombre || r.usuario.email.split("@")[0],
    creadoEn: r.creadoEn.toISOString(),
    promedio: promedioDe(r),
  }));
}

export async function obtenerMiResena(eventoId: string): Promise<DatosResena | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const r = await prisma.resena.findUnique({ where: { usuarioId_eventoId: { usuarioId: user.id, eventoId } } });
  if (!r) return null;
  return {
    organizacion: r.organizacion,
    paisajes: r.paisajes,
    dificultad: r.dificultad,
    medalla: r.medalla,
    camiseta: r.camiseta,
    hidratacion: r.hidratacion,
    expo: r.expo,
    seguridad: r.seguridad,
    calidadPrecio: r.calidadPrecio,
    comentario: r.comentario ?? undefined,
  };
}

export async function guardarResena(
  eventoId: string,
  datos: DatosResena,
): Promise<{ ok: boolean; error?: "no-auth" | "datos-invalidos" }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "no-auth" };

  for (const campo of CAMPOS_RESENA) {
    const v = datos[campo];
    if (!Number.isInteger(v) || v < 1 || v > 5) return { ok: false, error: "datos-invalidos" };
  }

  await prisma.resena.upsert({
    where: { usuarioId_eventoId: { usuarioId: user.id, eventoId } },
    update: { ...datos, comentario: datos.comentario?.trim() || null },
    create: { usuarioId: user.id, eventoId, ...datos, comentario: datos.comentario?.trim() || null },
  });

  await recalcularRating(eventoId);
  await otorgarLogrosPorResena(user.id);

  const evento = await prisma.evento.findUnique({ where: { id: eventoId }, select: { nombre: true } });
  if (evento) revalidatePath(`/carreras/${slugify(eventoId, evento.nombre)}`);

  return { ok: true };
}

// Logro por dejar la primera reseña — se importa acá (en vez de en logros.ts
// llamando a este archivo) para evitar un ciclo de imports entre los dos.
async function otorgarLogrosPorResena(usuarioId: string) {
  const { otorgarLogro } = await import("@/lib/logros");
  const total = await prisma.resena.count({ where: { usuarioId } });
  if (total === 1) await otorgarLogro(usuarioId, "primera_resena");
}
