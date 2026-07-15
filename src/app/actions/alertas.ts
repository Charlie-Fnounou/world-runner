"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Se pide desde el cliente (useAlertas) para no obligar a la ficha de
// carrera a ser dinámica solo por leer la sesión — con miles de carreras
// generadas estáticamente, eso se nota mucho.
export async function obtenerAlertaActiva(eventoId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const existente = await prisma.alerta.findUnique({
    where: { usuarioId_eventoId: { usuarioId: user.id, eventoId } },
  });
  return existente !== null;
}

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
