"use client";

import { useEffect, useState } from "react";
import { obtenerMiPlan } from "@/app/actions/planes";

// Una sola consulta por carga de página aunque haya varios banners.
let consulta: Promise<boolean> | null = null;
function esProActual(): Promise<boolean> {
  consulta ??= obtenerMiPlan()
    .then((p) => Boolean(p?.esPro))
    .catch(() => false);
  return consulta;
}

// Las páginas públicas se generan sin sesión (para poder cachearlas), así
// que "sin publicidad para Pro" se resuelve acá, del lado del navegador.
export function OcultarParaPro({ children }: { children: React.ReactNode }) {
  const [esPro, setEsPro] = useState(false);
  useEffect(() => {
    esProActual().then(setEsPro);
  }, []);
  return esPro ? null : <>{children}</>;
}
