import type { Metadata } from "next";
import { Suspense } from "react";
import { configActual, configurarPayPal, paypalConfigurado } from "@/lib/paypal";
import { PlanesClient } from "@/components/PlanesClient";

export const metadata: Metadata = {
  title: "Planes",
  description:
    "Alertas por email cuando una carrera cambia de fecha o precio, se queda sin cupos o se cancela. Plan gratis, Pro mensual o anual y pase de 60 días.",
};

export const revalidate = 86400;

// Apenas aparecen las claves de PayPal en Vercel, la primera visita a esta
// página crea sola el producto, los planes y el webhook (así el dueño no
// tiene que entrar al panel de admin a hacerlo). /admin/pagos queda para
// volver a crearlos si cambian los precios.
async function configParaPlanes() {
  if (!paypalConfigurado()) return null;
  const actual = await configActual();
  if (actual) return actual;
  try {
    await configurarPayPal("https://theworldrunner.com");
    return await configActual();
  } catch {
    return null;
  }
}

export default async function PlanesPage() {
  const config = await configParaPlanes();
  return (
    <Suspense>
      <PlanesClient
        clientId={config ? (process.env.PAYPAL_CLIENT_ID ?? null) : null}
        planMensualId={config?.planMensualId ?? null}
        planAnualId={config?.planAnualId ?? null}
      />
    </Suspense>
  );
}
