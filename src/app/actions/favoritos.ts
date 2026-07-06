"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function alternarFavorito(
  eventoId: string,
): Promise<{ ok: boolean; favorito?: boolean; error?: "no-auth" }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "no-auth" };

  const existente = await prisma.favorito.findUnique({
    where: { usuarioId_eventoId: { usuarioId: user.id, eventoId } },
  });

  if (existente) {
    await prisma.favorito.delete({ where: { id: existente.id } });
    return { ok: true, favorito: false };
  }

  await prisma.favorito.create({ data: { usuarioId: user.id, eventoId } });
  return { ok: true, favorito: true };
}
