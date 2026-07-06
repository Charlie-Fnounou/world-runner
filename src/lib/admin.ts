import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Solo deja pasar a usuarios con esAdmin=true en la base de datos.
// Se usa al principio de cada página del panel de administración.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");

  const usuario = await prisma.usuario.findUnique({ where: { id: user.id } });
  if (!usuario?.esAdmin) redirect("/");

  return usuario;
}
