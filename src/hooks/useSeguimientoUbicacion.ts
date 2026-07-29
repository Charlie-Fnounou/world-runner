"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alternarSeguimiento, obtenerSeguimientoActivo, type TipoSeguimiento } from "@/app/actions/seguimientos";

// Mismo patrón que useAlertas, pero para un país/ciudad entero.
export function useSeguimientoUbicacion(tipo: TipoSeguimiento, valor: string) {
  const [activo, setActivo] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    obtenerSeguimientoActivo(tipo, valor).then(setActivo);
  }, [tipo, valor]);

  const alternar = useCallback(() => {
    const siguiente = !activo;
    setActivo(siguiente);

    startTransition(async () => {
      const res = await alternarSeguimiento(tipo, valor);
      if (!res.ok) {
        setActivo(!siguiente);
        if (res.error === "no-auth") router.push("/login");
      }
    });
  }, [activo, tipo, valor, router]);

  return { activo, alternar };
}
