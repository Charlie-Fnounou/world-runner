import type { EstadoInscripcion } from "@prisma/client";
import type { CarreraExterna } from "./types";

// Estado a guardar para una edición. Solo se afirma "abierta", "abre
// pronto", etc. cuando la fuente lo informa (`explicito`). Si no lo
// informa: una fecha ya pasada es un hecho (la inscripción terminó); una
// fecha futura queda SIN_CONFIRMAR. Antes se deducía "abierta" por la
// cercanía de la fecha y se mostraba como si fuera un dato real.
export function estadoAGuardar(
  fecha: Date,
  explicito: EstadoInscripcion | undefined,
  actual: EstadoInscripcion | null,
  ahora = Date.now(),
  informaEstado = false,
): EstadoInscripcion {
  if (explicito) return explicito;
  if (fecha.getTime() < ahora) return actual === "CANCELADA" ? "CANCELADA" : "CERRADA";
  // Si la fuente publica el estado y no dice "abierta", lo de antes ya no vale.
  if (informaEstado) return "SIN_CONFIRMAR";
  // Si la fuente nunca informa estado, no se pisa uno puesto a mano.
  if (actual && actual !== "CERRADA") return actual;
  return "SIN_CONFIRMAR";
}

// Solo links web. Las fuentes externas a veces traen "javascript:", rutas
// relativas o texto basura, y esos links terminan en un <a href>.
export function urlSegura(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const limpia = url.trim();
  try {
    const u = new URL(limpia);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

const FECHA_MIN = Date.UTC(2000, 0, 1);
const FECHA_MAX_ANIOS = 4;

// Rechaza lo que claramente está roto antes de que llegue a la base.
// Devuelve el motivo, o null si se puede guardar.
export function problemaDeCarrera(c: CarreraExterna, ahora = Date.now()): string | null {
  if (!c.externalId?.trim()) return "sin externalId";
  if ((c.nombre.match(/\p{L}/gu)?.length ?? 0) < 2) return "nombre vacío o sin letras";
  if (c.nombre.length > 2000) return "nombre demasiado largo";
  if (!(c.fecha instanceof Date) || Number.isNaN(c.fecha.getTime())) return "fecha inválida";
  if (c.fecha.getTime() < FECHA_MIN || c.fecha.getTime() > ahora + FECHA_MAX_ANIOS * 365 * 864e5) return "fecha fuera de rango";
  if (c.anio !== c.fecha.getUTCFullYear() && Math.abs(c.anio - c.fecha.getUTCFullYear()) > 1) return "año no coincide con la fecha";
  if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng) || Math.abs(c.lat) > 90 || Math.abs(c.lng) > 180) return "coordenadas inválidas";
  if (c.precioDesde !== undefined && (!Number.isFinite(c.precioDesde) || c.precioDesde < 0 || c.precioDesde > 100_000)) return "precio inválido";
  if (c.numCorredores !== undefined && (!Number.isInteger(c.numCorredores) || c.numCorredores < 0 || c.numCorredores > 200_000)) return "cupo inválido";
  return null;
}
