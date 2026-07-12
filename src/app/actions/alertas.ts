"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function alternarAlerta(
  eventoId: string,
): Promise<{ ok: boolean; activa?: boolean; error?: "no-auth" }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "no-auth" };

  const existente = await prisma.alerta.findUnique({
    where: { usuarioId_eventoId: { usuarioId: user.id, eventoId } },
  });

  if (existente) {
    await prisma.alerta.delete({ where: { id: existente.id } });
    return { ok: true, activa: false };
  }

  await prisma.alerta.create({ data: { usuarioId: user.id, eventoId } });
  return { ok: true, activa: true };
}
