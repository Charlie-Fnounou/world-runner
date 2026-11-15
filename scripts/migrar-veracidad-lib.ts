// Piezas compartidas entre migrar-veracidad.ts y restaurar-veracidad.ts.

export interface Cambio {
  tabla: "Evento" | "Edicion";
  id: string;
  campo: string;
  antes: unknown;
  despues: unknown;
  motivo: string;
  // Solo ediciones: ultimaVerificacion al planificar. Si cambió, un robot
  // la actualizó con el código nuevo y su dato manda.
  verificadaEn?: string | null;
}

export function iguales(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function identificarBase(url = process.env.DATABASE_URL ?? ""): { host: string; nombre: string } {
  const m = url.match(/@([^/:]+)(?::\d+)?\/([^?]+)/);
  return { host: m?.[1] ?? "desconocido", nombre: m?.[2] ?? "desconocida" };
}
