"use server";

import { revalidatePath } from "next/cache";
import { UbicacionBanner } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const UBICACIONES_VALIDAS = Object.values(UbicacionBanner);

export async function crearPatrocinador(formData: FormData) {
  await requireAdmin();

  const nombre = String(formData.get("nombre") || "").trim();
  const imagenUrl = String(formData.get("imagenUrl") || "").trim();
  const enlaceUrl = String(formData.get("enlaceUrl") || "").trim();
  const ubicacion = String(formData.get("ubicacion") || "");

  if (!nombre || !imagenUrl || !enlaceUrl) throw new Error("Faltan campos obligatorios");
  if (!UBICACIONES_VALIDAS.includes(ubicacion as UbicacionBanner)) throw new Error("Ubicación inválida");

  await prisma.patrocinador.create({
    data: { nombre, imagenUrl, enlaceUrl, ubicacion: ubicacion as UbicacionBanner },
  });

  revalidatePath("/admin/publicidad");
  revalidatePath("/");
}

export async function alternarPatrocinadorActivo(id: string) {
  await requireAdmin();

  const patrocinador = await prisma.patrocinador.findUniqueOrThrow({ where: { id } });
  await prisma.patrocinador.update({ where: { id }, data: { activo: !patrocinador.activo } });

  revalidatePath("/admin/publicidad");
  revalidatePath("/");
}

export async function eliminarPatrocinador(id: string) {
  await requireAdmin();
  await prisma.patrocinador.delete({ where: { id } });

  revalidatePath("/admin/publicidad");
  revalidatePath("/");
}
