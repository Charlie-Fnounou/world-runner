"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Se pide desde el cliente (useFavoritos) en vez de en el render del
// servidor: leer la sesión ahí adentro obligaría a Next a tratar toda la
// página como dinámica (sin caché), y con miles de carreras eso se nota.
export async function obtenerFavoritoIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const favoritos = await prisma.favorito.findMany({
    where: { usuarioId: user.id },
    select: { eventoId: true },
  });
  return favoritos.map((f) => f.eventoId);
}

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
