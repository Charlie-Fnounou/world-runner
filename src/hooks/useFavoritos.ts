"use client";

import { useCallback, useEffect, useState } from "react";

const CLAVE = "wr_favoritos";

// Favoritos guardados en el navegador (localStorage) mientras no hay
// autenticación conectada. Cuando exista login con Supabase, esto se
// reemplaza por la tabla Favorito de la base de datos.
export function useFavoritos() {
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE);
      if (guardado) setFavoritos(new Set(JSON.parse(guardado)));
    } catch {
      // localStorage no disponible; se ignora
    }
    setListo(true);
  }, []);

  const alternar = useCallback((id: string) => {
    setFavoritos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(CLAVE, JSON.stringify([...next]));
      } catch {
        // localStorage no disponible; se ignora
      }
      return next;
    });
  }, []);

  return { favoritos, alternar, listo };
}
