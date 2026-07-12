"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alternarAlerta } from "@/app/actions/alertas";

// Suscripción a alertas real (tabla Alerta), asociada al usuario con sesión
// iniciada. Si no hay sesión, redirige a /login.
export function useAlertas(eventoId: string, activaInicial: boolean) {
  const [activa, setActiva] = useState(activaInicial);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const alternar = useCallback(() => {
    const siguiente = !activa;
    setActiva(siguiente);

    startTransition(async () => {
      const res = await alternarAlerta(eventoId);
      if (!res.ok) {
        setActiva(!siguiente);
        if (res.error === "no-auth") router.push("/login");
      }
    });
  }, [activa, eventoId, router]);

  return { activa, alternar };
}
