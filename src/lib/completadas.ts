import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export interface CompletadaInfo {
  eventoId: string;
  tiempoFinal: string | null;
}

// Carreras que el usuario con sesión iniciada marcó como corridas.
// Devuelve [] si no hay sesión (invitado).
export async function getCompletadas(): Promise<CompletadaInfo[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const completadas = await prisma.carreraCompletada.findMany({
    where: { usuarioId: user.id },
    select: { eventoId: true, tiempoFinal: true },
  });
  return completadas;
}
