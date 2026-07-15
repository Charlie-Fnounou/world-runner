"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alternarAlerta, obtenerAlertaActiva } from "@/app/actions/alertas";

// Suscripción a alertas real (tabla Alerta), asociada al usuario con sesión
// iniciada. Si no hay sesión, redirige a /login. El estado inicial se pide
// del lado del cliente para que la ficha de carrera pueda quedar cacheada.
export function useAlertas(eventoId: string) {
  const [activa, setActiva] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    obtenerAlertaActiva(eventoId).then(setActiva);
  }, [eventoId]);

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
