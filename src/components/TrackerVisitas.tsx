"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Registra una visita cada vez que cambia la ruta (carga inicial y
// navegación entre páginas). "Fire and forget": no bloquea nada si falla.
export function TrackerVisitas() {
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/track-visita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruta: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
