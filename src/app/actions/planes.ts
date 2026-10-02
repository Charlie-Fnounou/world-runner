"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { PRECIOS, planDeUsuario, type PlanActual } from "@/lib/planes";
import { requireAdmin } from "@/lib/admin";
import {
  cancelarSuscripcionPayPal,
  capturarOrden,
  configActual,
  configurarPayPal,
  crearOrdenPase,
  obtenerSuscripcion,
  paypalConfigurado,
} from "@/lib/paypal";

type Resultado = { ok: boolean; error?: string };

async function usuarioActual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function obtenerMiPlan(): Promise<PlanActual | null> {
  const user = await usuarioActual();
  if (!user) return null;
  return planDeUsuario(user.id);
}

// Después de que el usuario aprueba la suscripción en la ventana de PayPal,
// se confirma contra la API de PayPal (nunca se confía en lo que manda el
// navegador): que sea de este usuario, de uno de nuestros planes y activa.
export async function confirmarSuscripcion(subscriptionId: string): Promise<Resultado> {
  const user = await usuarioActual();
  if (!user) return { ok: false, error: "no-auth" };
  const config = await configActual();
  if (!config) return { ok: false, error: "no-configurado" };

  const s = await obtenerSuscripcion(subscriptionId);
  if (s.custom_id !== user.id) return { ok: false, error: "no-coincide" };
  const periodo = s.plan_id === config.planMensualId ? "mensual" : s.plan_id === config.planAnualId ? "anual" : null;
  if (!periodo) return { ok: false, error: "plan-desconocido" };
  if (s.status !== "ACTIVE" && s.status !== "APPROVED") return { ok: false, error: "no-activa" };

  const vigenteHasta = s.billing_info?.next_billing_time
    ? new Date(s.billing_info.next_billing_time)
    : new Date(Date.now() + PRECIOS.diasPrueba * 864e5);

  const datos = { plan: "PRO" as const, periodo, estado: "activa", paypalSubscriptionId: s.id, paypalOrderId: null, vigenteHasta };
  await prisma.suscripcion.upsert({ where: { usuarioId: user.id }, update: datos, create: { usuarioId: user.id, ...datos } });
  revalidatePath("/perfil");
  return { ok: true };
}

export async function iniciarPase(): Promise<{ id?: string; error?: string }> {
  const user = await usuarioActual();
  if (!user) return { error: "no-auth" };
  if (!paypalConfigurado()) return { error: "no-configurado" };
  const plan = await planDeUsuario(user.id);
  if (plan.esPro && plan.plan === "PRO" && plan.estado === "activa") return { error: "ya-es-pro" };
  return { id: await crearOrdenPase(user.id) };
}

export async function completarPase(orderId: string): Promise<Resultado> {
  const user = await usuarioActual();
  if (!user) return { ok: false, error: "no-auth" };

  const orden = await capturarOrden(orderId);
  const captura = orden.purchase_units[0]?.payments?.captures?.[0];
  const pagoValido =
    orden.status === "COMPLETED" &&
    captura?.status === "COMPLETED" &&
    captura.custom_id === user.id &&
    captura.amount.currency_code === "USD" &&
    captura.amount.value === PRECIOS.pase60.toFixed(2);
  if (!pagoValido) return { ok: false, error: "pago-invalido" };

  // Si ya tenía un pase vigente, los 60 días se suman al final.
  const actual = await prisma.suscripcion.findUnique({ where: { usuarioId: user.id } });
  const base = actual?.vigenteHasta && actual.vigenteHasta.getTime() > Date.now() ? actual.vigenteHasta.getTime() : Date.now();
  const datos = {
    plan: "PASE" as const,
    periodo: "pase60",
    estado: "activa",
    paypalOrderId: orderId,
    paypalSubscriptionId: null,
    vigenteHasta: new Date(base + PRECIOS.diasPase * 864e5),
  };
  await prisma.suscripcion.upsert({ where: { usuarioId: user.id }, update: datos, create: { usuarioId: user.id, ...datos } });
  revalidatePath("/perfil");
  return { ok: true };
}

// Pro sigue activo hasta el final del período ya pagado (vigenteHasta).
export async function cancelarMiSuscripcion(): Promise<Resultado> {
  const user = await usuarioActual();
  if (!user) return { ok: false, error: "no-auth" };
  const s = await prisma.suscripcion.findUnique({ where: { usuarioId: user.id } });
  if (!s?.paypalSubscriptionId || s.estado !== "activa") return { ok: false, error: "sin-suscripcion" };
  await cancelarSuscripcionPayPal(s.paypalSubscriptionId);
  await prisma.suscripcion.update({ where: { id: s.id }, data: { estado: "cancelada" } });
  revalidatePath("/perfil");
  return { ok: true };
}

export async function configurarPagosAhora(urlSitio: string): Promise<{ ok: boolean; mensaje: string }> {
  await requireAdmin();
  if (!paypalConfigurado()) return { ok: false, mensaje: "Faltan PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET en Vercel." };
  try {
    const r = await configurarPayPal(urlSitio);
    revalidatePath("/planes");
    revalidatePath("/admin/pagos");
    return { ok: true, mensaje: `Listo (${r.entorno}). Planes creados: ${r.planMensualId} / ${r.planAnualId}.` };
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function estadoCompra(): Promise<{ usuarioId: string | null; plan: PlanActual | null }> {
  const user = await usuarioActual();
  if (!user) return { usuarioId: null, plan: null };
  return { usuarioId: user.id, plan: await planDeUsuario(user.id) };
}
