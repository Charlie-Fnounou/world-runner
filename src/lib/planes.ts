import { prisma } from "./prisma";

import { PRECIOS, LIMITES_GRATIS } from "./precios";

export { PRECIOS, LIMITES_GRATIS };

// Días de margen si PayPal todavía no confirmó la renovación de una
// suscripción activa (el cobro puede llegar unas horas después).
const MARGEN_RENOVACION_MS = 3 * 864e5;

export type PlanActual = { esPro: boolean; plan: "GRATIS" | "PRO" | "PASE"; periodo: string | null; estado: string | null; vigenteHasta: string | null };

export async function planDeUsuario(usuarioId: string): Promise<PlanActual> {
  const s = await prisma.suscripcion.findUnique({ where: { usuarioId } });
  if (!s || !s.vigenteHasta) return { esPro: false, plan: "GRATIS", periodo: null, estado: null, vigenteHasta: null };
  const margen = s.estado === "activa" && s.plan === "PRO" ? MARGEN_RENOVACION_MS : 0;
  const vigente = s.vigenteHasta.getTime() + margen > Date.now() && s.estado !== "suspendida" && s.estado !== "vencida";
  return {
    esPro: vigente,
    plan: vigente ? s.plan : "GRATIS",
    periodo: s.periodo,
    estado: s.estado,
    vigenteHasta: s.vigenteHasta.toISOString(),
  };
}
