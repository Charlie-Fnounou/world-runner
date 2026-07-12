"use server";

import { revalidatePath } from "next/cache";
import { EstadoInscripcion } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { notificarCambios, type TipoCambio } from "@/lib/alertas";

const ESTADOS_VALIDOS = Object.values(EstadoInscripcion);

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

  const cambios: { tipo: TipoCambio; mensaje: string }[] = [];

  if (antes.estado !== edicion.estado) {
    if (edicion.estado === "ABIERTA") {
      cambios.push({ tipo: "apertura", mensaje: "🔔 ¡Ya abrió la inscripción!" });
    } else if (edicion.estado === "ULTIMOS_CUPOS") {
      cambios.push({ tipo: "pocosCupos", mensaje: "⚠️ Quedan últimos cupos." });
    } else if (edicion.estado === "CANCELADA") {
      cambios.push({ tipo: "cancelacion", mensaje: "❌ La carrera fue cancelada." });
    }
  }

  if (antes.precioDesde !== edicion.precioDesde && edicion.precioDesde != null) {
    cambios.push({
      tipo: "precio",
      mensaje: `💰 El precio cambió a ${edicion.moneda ?? "$"}${edicion.precioDesde}.`,
    });
  }

  if (antes.fecha.getTime() !== edicion.fecha.getTime()) {
    cambios.push({
      tipo: "fecha",
      mensaje: `📅 La fecha cambió a ${edicion.fecha.toISOString().slice(0, 10)}.`,
    });
  }

  await notificarCambios(edicion.eventoId, cambios);

  revalidatePath("/admin/carreras");
  revalidatePath(`/admin/carreras/${edicion.eventoId}`);
  revalidatePath("/");
}
