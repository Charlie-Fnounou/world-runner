import type { Metadata } from "next";
import { Suspense } from "react";
import { configActual, paypalConfigurado } from "@/lib/paypal";
import { PlanesClient } from "@/components/PlanesClient";

export const metadata: Metadata = {
  title: "Planes",
  description:
    "Alertas por email cuando una carrera cambia de fecha o precio, se queda sin cupos o se cancela. Plan gratis, Pro mensual o anual y pase de 60 días.",
};

export const revalidate = 86400;

export default async function PlanesPage() {
  const config = paypalConfigurado() ? await configActual() : null;
  return (
    <Suspense>
      <PlanesClient
        clientId={paypalConfigurado() ? (process.env.PAYPAL_CLIENT_ID ?? null) : null}
        planMensualId={config?.planMensualId ?? null}
        planAnualId={config?.planAnualId ?? null}
      />
    </Suspense>
  );
}
