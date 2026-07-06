"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alternarFavorito } from "@/app/actions/favoritos";

// Favoritos reales, guardados en la base de datos y asociados al usuario
// con sesión iniciada (Supabase Auth). Si no hay sesión, redirige a /login.
export function useFavoritos(favoritosIniciales: string[] = []) {
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set(favoritosIniciales));
  const [, startTransition] = useTransition();
  const router = useRouter();

  const alternar = useCallback(
    (id: string) => {
      let seEstabaAgregando = false;
      setFavoritos((prev) => {
        const next = new Set(prev);
        seEstabaAgregando = !next.has(id);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });

      startTransition(async () => {
        const res = await alternarFavorito(id);
        if (!res.ok) {
          setFavoritos((prev) => {
            const next = new Set(prev);
            if (seEstabaAgregando) next.delete(id);
            else next.add(id);
            return next;
          });
          if (res.error === "no-auth") router.push("/login");
        }
      });
    },
    [router],
  );

  return { favoritos, alternar };
}
