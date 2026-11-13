import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { configActual, obtenerSuscripcion, verificarFirmaWebhook } from "@/lib/paypal";
import { estadoDesdePayPal, vigenciaAlActivar } from "@/lib/planes";

// PayPal avisa acá cada cobro, cancelación o vencimiento de una suscripción,
// así el plan se mantiene al día aunque el usuario no vuelva a entrar.
// Toda notificación se verifica con PayPal antes de tocar nada.
export async function POST(request: Request) {
  const config = await configActual();
  if (!config?.webhookId) return NextResponse.json({ error: "webhook no configurado" }, { status: 400 });

  const evento = await request.json();
  const valido = await verificarFirmaWebhook(request.headers, evento, config.webhookId).catch(() => false);
  if (!valido) return NextResponse.json({ error: "firma inválida" }, { status: 401 });

  const tipo: string = evento.event_type;
  const recurso = evento.resource ?? {};

  const idSuscripcion: string | undefined = tipo === "PAYMENT.SALE.COMPLETED" ? recurso.billing_agreement_id : recurso.id;
  if (!idSuscripcion) return NextResponse.json({ ok: true });

  const s = await obtenerSuscripcion(idSuscripcion);
  const periodo = s.plan_id === config.planMensualId ? "mensual" : s.plan_id === config.planAnualId ? "anual" : null;
  if (!periodo || !s.custom_id) return NextResponse.json({ ok: true });

  const usuario = await prisma.usuario.findUnique({ where: { id: s.custom_id }, select: { id: true } });
  if (!usuario) return NextResponse.json({ ok: true });

  const estado = estadoDesdePayPal(s.status);
  if (!estado) return NextResponse.json({ ok: true });

  const actual = await prisma.suscripcion.findUnique({ where: { usuarioId: usuario.id }, select: { vigenteHasta: true, paypalSubscriptionId: true } });
  // Un aviso viejo de otra suscripción (ej. una cancelada antes de volver a
  // suscribirse) no debe pisar la suscripción vigente del usuario.
  if (actual?.paypalSubscriptionId && actual.paypalSubscriptionId !== s.id && estado !== "activa") return NextResponse.json({ ok: true });

  const proximoCobro =
    s.billing_info?.next_billing_time && estado === "activa"
      ? vigenciaAlActivar(new Date(s.billing_info.next_billing_time), actual?.vigenteHasta)
      : undefined;
  const datos = {
    plan: "PRO" as const,
    periodo,
    estado,
    paypalSubscriptionId: s.id,
    ...(proximoCobro ? { vigenteHasta: proximoCobro } : {}),
  };
  await prisma.suscripcion.upsert({
    where: { usuarioId: usuario.id },
    update: datos,
    create: { usuarioId: usuario.id, ...datos, vigenteHasta: proximoCobro ?? new Date() },
  });
  return NextResponse.json({ ok: true });
}
