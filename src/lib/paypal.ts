import { prisma } from "./prisma";
import { PRECIOS } from "./planes";

// Integración directa con la API REST de PayPal (sin SDK de servidor: son
// pocas llamadas). Se eligió PayPal porque Stripe no acepta comercios de
// Panamá. Variables necesarias en Vercel: PAYPAL_CLIENT_ID,
// PAYPAL_CLIENT_SECRET y PAYPAL_ENV ("live" para cobrar de verdad; sin
// esa variable se usa el entorno de pruebas "sandbox").

export function entornoPayPal(): "live" | "sandbox" {
  return process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
}

export function paypalConfigurado(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function baseUrl(): string {
  return entornoPayPal() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function token(): Promise<string> {
  const credenciales = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${credenciales}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal rechazó las credenciales (${res.status})`);
  return (await res.json()).access_token;
}

async function api<T>(ruta: string, opciones: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${baseUrl()}${ruta}`, {
    method: opciones.method ?? "GET",
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: opciones.body === undefined ? undefined : JSON.stringify(opciones.body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal ${opciones.method ?? "GET"} ${ruta} respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const EVENTOS_WEBHOOK = [
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "PAYMENT.SALE.COMPLETED",
];

function plan(productoId: string, nombre: string, unidad: "MONTH" | "YEAR", precio: number, conPrueba: boolean) {
  const regular = {
    frequency: { interval_unit: unidad, interval_count: 1 },
    tenure_type: "REGULAR",
    sequence: conPrueba ? 2 : 1,
    total_cycles: 0,
    pricing_scheme: { fixed_price: { value: precio.toFixed(2), currency_code: "USD" } },
  };
  const prueba = {
    frequency: { interval_unit: "DAY", interval_count: PRECIOS.diasPrueba },
    tenure_type: "TRIAL",
    sequence: 1,
    total_cycles: 1,
  };
  return {
    product_id: productoId,
    name: nombre,
    status: "ACTIVE",
    billing_cycles: conPrueba ? [prueba, regular] : [regular],
    payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 2 },
  };
}

// Crea en la cuenta PayPal del dueño el producto, los dos planes (mensual
// con prueba gratis y anual) y el webhook, y guarda los IDs. Se dispara con
// un botón desde /admin/pagos, así el dueño no tiene que hacerlo a mano.
export async function configurarPayPal(urlSitio: string) {
  const entorno = entornoPayPal();
  const producto = await api<{ id: string }>("/v1/catalogs/products", {
    method: "POST",
    body: { name: "The World Runner Pro", type: "SERVICE", category: "SOFTWARE", home_url: urlSitio },
  });
  const mensual = await api<{ id: string }>("/v1/billing/plans", {
    method: "POST",
    body: plan(producto.id, "World Runner Pro — mensual", "MONTH", PRECIOS.proMensual, true),
  });
  const anual = await api<{ id: string }>("/v1/billing/plans", {
    method: "POST",
    body: plan(producto.id, "World Runner Pro — anual", "YEAR", PRECIOS.proAnual, false),
  });

  let webhookId: string | null = null;
  if (urlSitio.startsWith("https://")) {
    const webhook = await api<{ id: string }>("/v1/notifications/webhooks", {
      method: "POST",
      body: { url: `${urlSitio}/api/paypal/webhook`, event_types: EVENTOS_WEBHOOK.map((name) => ({ name })) },
    });
    webhookId = webhook.id;
  }

  const datos = { productoId: producto.id, planMensualId: mensual.id, planAnualId: anual.id, webhookId };
  await prisma.configPayPal.upsert({ where: { entorno }, update: datos, create: { entorno, ...datos } });
  return { entorno, ...datos };
}

export async function configActual() {
  return prisma.configPayPal.findUnique({ where: { entorno: entornoPayPal() } });
}

export interface SuscripcionPayPal {
  id: string;
  status: string;
  plan_id: string;
  custom_id?: string;
  billing_info?: { next_billing_time?: string };
}

export function obtenerSuscripcion(id: string) {
  return api<SuscripcionPayPal>(`/v1/billing/subscriptions/${encodeURIComponent(id)}`);
}

export function cancelarSuscripcionPayPal(id: string) {
  return api<void>(`/v1/billing/subscriptions/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: { reason: "Cancelada por el usuario desde The World Runner" },
  });
}

export async function crearOrdenPase(usuarioId: string) {
  const orden = await api<{ id: string }>("/v2/checkout/orders", {
    method: "POST",
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: usuarioId,
          description: `The World Runner — Pase Pro ${PRECIOS.diasPase} días`,
          amount: { currency_code: "USD", value: PRECIOS.pase60.toFixed(2) },
        },
      ],
    },
  });
  return orden.id;
}

interface OrdenCapturada {
  status: string;
  purchase_units: { payments?: { captures?: { status: string; custom_id?: string; amount: { value: string; currency_code: string } }[] } }[];
}

export function capturarOrden(id: string) {
  return api<OrdenCapturada>(`/v2/checkout/orders/${encodeURIComponent(id)}/capture`, { method: "POST", body: {} });
}

export async function verificarFirmaWebhook(headers: Headers, evento: unknown, webhookId: string): Promise<boolean> {
  const r = await api<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: {
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: evento,
    },
  });
  return r.verification_status === "SUCCESS";
}
