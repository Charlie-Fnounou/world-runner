"use server";

import { revalidatePath } from "next/cache";
import { EstadoInscripcion, EstadoModeracion } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { detectarYNotificarCambios } from "@/lib/alertas";

const ESTADOS_VALIDOS = Object.values(EstadoInscripcion);

export async function moderarEnvio(id: string, estado: "APROBADO" | "RECHAZADO", notasAdmin?: string) {
  const admin = await requireAdmin();

  await prisma.envioComunidad.update({
    where: { id },
    data: {
      estado: estado as EstadoModeracion,
      notasAdmin: notasAdmin?.trim() || null,
      revisadoPor: admin.email,
      revisadoEn: new Date(),
    },
  });

  revalidatePath("/admin/comunidad");
}

export async function actualizarEdicion(edicionId: string, formData: FormData) {
  await requireAdmin();

  const estado = String(formData.get("estado") || "");
  const fecha = String(formData.get("fecha") || "");
  const precioDesde = formData.get("precioDesde");
  const numCorredores = formData.get("numCorredores");

  if (!ESTADOS_VALIDOS.includes(estado as EstadoInscripcion)) throw new Error("Estado inválido");

  const antes = await prisma.edicion.findUniqueOrThrow({ where: { id: edicionId } });

  const edicion = await prisma.edicion.update({
    where: { id: edicionId },
    data: {
      estado: estado as EstadoInscripcion,
      fecha: fecha ? new Date(`${fecha}T07:00:00Z`) : undefined,
      precioDesde: precioDesde ? Number(precioDesde) : undefined,
      numCorredores: numCorredores ? Number(numCorredores) : undefined,
    },
  });

  await prisma.historialCambio.create({
    data: {
      eventoId: edicion.eventoId,
      edicionId: edicion.id,
      campo: "actualización manual (admin)",
      valorNuevo: `estado=${estado}, fecha=${fecha}, precio=${precioDesde}, corredores=${numCorredores}`,
      fuente: "panel-admin",
      esImportante: true,
    },
  });

  await detectarYNotificarCambios(edicion.eventoId, antes, edicion, "panel-admin");

  revalidatePath("/admin/carreras");
  revalidatePath(`/admin/carreras/${edicion.eventoId}`);
  revalidatePath("/");
}
