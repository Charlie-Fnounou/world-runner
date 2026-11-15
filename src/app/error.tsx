"use client";

import { useEffect } from "react";
import { PantallaError } from "@/components/PantallaError";

// Si una página falla al cargar (ej. la base no responde un momento), se
// muestra esto dentro del sitio en vez de la pantalla genérica de Next.
export default function ErrorDePagina({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <PantallaError tipo="error" onReintentar={retry} />;
}
