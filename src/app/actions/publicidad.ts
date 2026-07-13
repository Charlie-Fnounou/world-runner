"use server";

import { revalidatePath } from "next/cache";
import { UbicacionBanner, TamanoBanner, AjusteImagenBanner } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const UBICACIONES_VALIDAS = Object.values(UbicacionBanner);
const TAMANOS_VALIDOS = Object.values(TamanoBanner);
const AJUSTES_VALIDOS = Object.values(AjusteImagenBanner);

function datosDesdeFormulario(formData: FormData) {
  const nombre = String(formData.get("nombre") || "").trim();
  const imagenUrl = String(formData.get("imagenUrl") || "").trim();
  const enlaceUrl = String(formData.get("enlaceUrl") || "").trim();
  const ubicacion = String(formData.get("ubicacion") || "");
  const tamano = String(formData.get("tamano") || "MEDIANO");
  const ajusteImagen = String(formData.get("ajusteImagen") || "CUBRIR");
  const eventoId = String(formData.get("eventoId") || "").trim() || null;

  if (!nombre || !imagenUrl || !enlaceUrl) throw new Error("Faltan campos obligatorios");
  if (!UBICACIONES_VALIDAS.includes(ubicacion as UbicacionBanner)) throw new Error("Ubicación inválida");
  if (!TAMANOS_VALIDOS.includes(tamano as TamanoBanner)) throw new Error("Tamaño inválido");
  if (!AJUSTES_VALIDOS.includes(ajusteImagen as AjusteImagenBanner)) throw new Error("Ajuste de imagen inválido");

  return {
    nombre,
    imagenUrl,
    enlaceUrl,
    ubicacion: ubicacion as UbicacionBanner,
    tamano: tamano as TamanoBanner,
    ajusteImagen: ajusteImagen as AjusteImagenBanner,
    // El destino a una carrera puntual solo tiene sentido en FICHA_CARRERA.
    eventoId: ubicacion === "FICHA_CARRERA" ? eventoId : null,
  };
}

export async function crearPatrocinador(formData: FormData) {
  await requireAdmin();
  const datos = datosDesdeFormulario(formData);

  await prisma.patrocinador.create({ data: datos });

  revalidatePath("/admin/publicidad");
  revalidatePath("/");
  revalidatePath("/carreras/[slug]", "page");
}

export async function actualizarPatrocinador(id: string, formData: FormData) {
  await requireAdmin();
  const datos = datosDesdeFormulario(formData);

  await prisma.patrocinador.update({ where: { id }, data: datos });

  revalidatePath("/admin/publicidad");
  revalidatePath("/");
  revalidatePath("/carreras/[slug]", "page");
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
