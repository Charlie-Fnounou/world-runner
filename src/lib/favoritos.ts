import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// IDs de eventos favoritos del usuario que tiene sesión iniciada.
// Devuelve [] si no hay sesión (invitado).
export async function getFavoritoIds(): Promise<string[]> {
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
