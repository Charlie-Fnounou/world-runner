"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DICCIONARIOS, IDIOMA_POR_DEFECTO, type Diccionario, type Idioma } from "@/lib/i18n";

const CLAVE_STORAGE = "wr-idioma";

interface ContextoIdioma {
  idioma: Idioma;
  cambiarIdioma: (idioma: Idioma) => void;
  t: Diccionario;
}

const Contexto = createContext<ContextoIdioma | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>(IDIOMA_POR_DEFECTO);

  useEffect(() => {
    const guardado = localStorage.getItem(CLAVE_STORAGE) as Idioma | null;
    if (guardado && guardado in DICCIONARIOS) setIdioma(guardado);
  }, []);

  useEffect(() => {
    document.documentElement.lang = idioma;
  }, [idioma]);

  function cambiarIdioma(nuevo: Idioma) {
    setIdioma(nuevo);
    localStorage.setItem(CLAVE_STORAGE, nuevo);
  }

  const value = useMemo(() => ({ idioma, cambiarIdioma, t: DICCIONARIOS[idioma] }), [idioma]);

  return <Contexto.Provider value={value}>{children}</Contexto.Provider>;
}

// El hook devuelve siempre el diccionario español si se usa fuera del
// provider (no debería pasar, pero evita un crash si algún día se
// renderiza un componente aislado en tests/Storybook).
export function useIdioma(): ContextoIdioma {
  const ctx = useContext(Contexto);
  if (ctx) return ctx;
  return { idioma: IDIOMA_POR_DEFECTO, cambiarIdioma: () => {}, t: DICCIONARIOS[IDIOMA_POR_DEFECTO] };
}
