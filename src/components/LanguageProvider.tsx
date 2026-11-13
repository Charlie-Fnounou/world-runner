"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { DICCIONARIOS, IDIOMA_POR_DEFECTO, type Diccionario, type Idioma } from "@/lib/i18n";

const CLAVE_STORAGE = "wr-idioma";

interface ContextoIdioma {
  idioma: Idioma;
  cambiarIdioma: (idioma: Idioma) => void;
  t: Diccionario;
}

const Contexto = createContext<ContextoIdioma | null>(null);

const EVENTO_CAMBIO = "wr-idioma-cambio";

function leerIdioma(): Idioma {
  try {
    const guardado = localStorage.getItem(CLAVE_STORAGE);
    return guardado && guardado in DICCIONARIOS ? (guardado as Idioma) : IDIOMA_POR_DEFECTO;
  } catch {
    return IDIOMA_POR_DEFECTO;
  }
}

function suscribir(avisar: () => void) {
  window.addEventListener("storage", avisar);
  window.addEventListener(EVENTO_CAMBIO, avisar);
  return () => {
    window.removeEventListener("storage", avisar);
    window.removeEventListener(EVENTO_CAMBIO, avisar);
  };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // El idioma elegido vive en localStorage (por navegador). En el servidor
  // siempre es el idioma por defecto; en el navegador se lee al hidratar.
  const idioma = useSyncExternalStore(suscribir, leerIdioma, () => IDIOMA_POR_DEFECTO);

  useEffect(() => {
    document.documentElement.lang = idioma;
  }, [idioma]);

  const cambiarIdioma = useCallback((nuevo: Idioma) => {
    try {
      localStorage.setItem(CLAVE_STORAGE, nuevo);
    } catch {}
    window.dispatchEvent(new Event(EVENTO_CAMBIO));
  }, []);

  const value = useMemo(() => ({ idioma, cambiarIdioma, t: DICCIONARIOS[idioma] }), [idioma, cambiarIdioma]);

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
