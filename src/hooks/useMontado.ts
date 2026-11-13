"use client";

import { useSyncExternalStore } from "react";

const sinSuscripcion = () => () => {};

// true en el navegador, false en el servidor: para no renderizar en el HTML
// inicial algo que depende de datos que solo existen en el navegador.
export function useMontado(): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );
}
