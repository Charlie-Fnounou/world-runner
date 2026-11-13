import { prisma } from "./prisma";

import { PRECIOS, LIMITES_GRATIS } from "./precios";

export { PRECIOS, LIMITES_GRATIS };

// Días de margen si PayPal todavía no confirmó la renovación de una
// suscripción activa (el cobro puede llegar unas horas después).
const MARGEN_RENOVACION_MS = 3 * 864e5;

export type PlanActual = { esPro: boolean; plan: "GRATIS" | "PRO" | "PASE"; periodo: string | null; estado: string | null; vigenteHasta: string | null };

interface SuscripcionGuardada {
  plan: "PRO" | "PASE";
  periodo: string;
  estado: string;
  vigenteHasta: Date | null;
}

// Regla única de "¿tiene Pro ahora?" (la usan los límites del plan
// gratis, la publicidad y el perfil). Pura, para poder probarla sin base.
export function calcularPlan(s: SuscripcionGuardada | null, ahora = Date.now()): PlanActual {
  if (!s || !s.vigenteHasta) return { esPro: false, plan: "GRATIS", periodo: null, estado: null, vigenteHasta: null };
  const margen = s.estado === "activa" && s.plan === "PRO" ? MARGEN_RENOVACION_MS : 0;
  const vigente = s.vigenteHasta.getTime() + margen > ahora && s.estado !== "suspendida" && s.estado !== "vencida";
  return {
    esPro: vigente,
    plan: vigente ? s.plan : "GRATIS",
    periodo: s.periodo,
    estado: s.estado,
    vigenteHasta: s.vigenteHasta.toISOString(),
  };
}

export async function planDeUsuario(usuarioId: string): Promise<PlanActual> {
  const s = await prisma.suscripcion.findUnique({ where: { usuarioId } });
  return calcularPlan(s);
}

// Estado interno a partir del estado de la suscripción en PayPal. Los
// estados de PayPal que no son definitivos (APPROVAL_PENDING, APPROVED)
// devuelven null: no se activa nada sin confirmación real.
export function estadoDesdePayPal(status: string): "activa" | "cancelada" | "suspendida" | "vencida" | null {
  switch (status) {
    case "ACTIVE":
      return "activa";
    case "CANCELLED":
      return "cancelada";
    case "SUSPENDED":
      return "suspendida";
    case "EXPIRED":
      return "vencida";
    default:
      return null;
  }
}

// Al pasar a Pro con un pase todavía vigente, no se pierden los días ya pagados.
export function vigenciaAlActivar(nueva: Date, anterior: Date | null | undefined, ahora = Date.now()): Date {
  if (anterior && anterior.getTime() > ahora && anterior.getTime() > nueva.getTime()) return anterior;
  return nueva;
}

interface CapturaOrden {
  status: string;
  purchase_units: { payments?: { captures?: { status: string; custom_id?: string; amount: { value: string; currency_code: string } }[] } }[];
}

// El pago del pase solo vale si PayPal lo marca completo, es de este
// usuario y por el monto exacto (no se confía en nada que mande el navegador).
export function pagoPaseValido(orden: CapturaOrden, usuarioId: string, precio: number): boolean {
  const captura = orden.purchase_units[0]?.payments?.captures?.[0];
  return (
    orden.status === "COMPLETED" &&
    captura?.status === "COMPLETED" &&
    captura.custom_id === usuarioId &&
    captura.amount.currency_code === "USD" &&
    captura.amount.value === precio.toFixed(2)
  );
}
