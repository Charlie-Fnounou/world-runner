import { prisma } from "@/lib/prisma";
import type { User } from "@supabase/supabase-js";

export async function upsertUsuario(user: User) {
  await prisma.usuario.upsert({
    where: { id: user.id },
    update: { email: user.email ?? "" },
    create: {
      id: user.id,
      email: user.email ?? "",
      nombre: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
    },
  });
}
