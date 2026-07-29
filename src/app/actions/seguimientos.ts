"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type TipoSeguimiento = "pais" | "ciudad";

// Mismo patrón que obtenerAlertaActiva/alternarAlerta (ver actions/alertas.ts),
// pero para un país/ciudad entero en vez de una carrera puntual.
export async function obtenerSeguimientoActivo(tipo: TipoSeguimiento, valor: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const existente = await prisma.seguimientoUbicacion.findUnique({
    where: { usuarioId_tipo_valor: { usuarioId: user.id, tipo, valor } },
  });
  return existente !== null;
}

export async function alternarSeguimiento(
  tipo: TipoSeguimiento,
  valor: string,
): Promise<{ ok: boolean; activo?: boolean; error?: "no-auth" }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "no-auth" };

  const existente = await prisma.seguimientoUbicacion.findUnique({
    where: { usuarioId_tipo_valor: { usuarioId: user.id, tipo, valor } },
  });

  if (existente) {
    await prisma.seguimientoUbicacion.delete({ where: { id: existente.id } });
    return { ok: true, activo: false };
  }

  await prisma.seguimientoUbicacion.create({ data: { usuarioId: user.id, tipo, valor } });
  return { ok: true, activo: true };
}
