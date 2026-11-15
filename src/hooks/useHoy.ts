"use client";

import { useSyncExternalStore } from "react";

const sinSuscripcion = () => () => {};
const hoyIso = () => new Date().toISOString().slice(0, 10);

// Fecha de hoy (YYYY-MM-DD) del navegador, o null en el servidor y durante
// la hidratación. Las páginas se pre-generan una vez por día: si el HTML
// dependiera de "hoy", no coincidiría con lo que dibuja el navegador horas
// después (error #418 de React). Con null primero, coinciden; después se
// actualiza con la fecha real.
export function useHoy(): string | null {
  return useSyncExternalStore(sinSuscripcion, hoyIso, () => null);
}
