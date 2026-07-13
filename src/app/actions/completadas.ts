"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type Resultado = { ok: true } | { ok: false; error: "no-auth" };

// Marca una carrera como corrida por el usuario logueado. Si ya la había
// marcado, actualiza el tiempo/ritmo en vez de duplicar.
export async function marcarCompletada(eventoId: string, tiempoFinal?: string): Promise<Resultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "no-auth" };

  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    include: { ediciones: { orderBy: { anio: "desc" }, take: 1 } },
  });
  if (!evento) return { ok: false, error: "no-auth" };

  const existente = await prisma.carreraCompletada.findFirst({
    where: { usuarioId: user.id, eventoId },
  });

  if (existente) {
    await prisma.carreraCompletada.update({
      where: { id: existente.id },
      data: { tiempoFinal: tiempoFinal || existente.tiempoFinal },
    });
  } else {
    await prisma.carreraCompletada.create({
      data: {
        usuarioId: user.id,
        eventoId,
        edicionId: evento.ediciones[0]?.id,
        tiempoFinal: tiempoFinal || undefined,
      },
    });
  }

  revalidatePath("/perfil");
  return { ok: true };
}

export async function quitarCompletada(eventoId: string): Promise<Resultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "no-auth" };

  await prisma.carreraCompletada.deleteMany({ where: { usuarioId: user.id, eventoId } });
  revalidatePath("/perfil");
  return { ok: true };
}
