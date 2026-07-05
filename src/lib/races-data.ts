import raw from "@/data/races-seed.json";
import type { Carrera } from "./types";
import { normalizar } from "./text";

// Fuente de datos temporal mientras no está conectada la base de datos real
// (Supabase + Prisma). Cuando se conecte, esta función se reemplaza por
// una consulta a Prisma manteniendo la misma forma de datos (Carrera[]).
export function getCarreras(): Carrera[] {
  return raw as Carrera[];
}

export function getCarreraPorId(id: string): Carrera | undefined {
  return getCarreras().find((r) => r.id === id);
}

export function slugify(id: string, name: string): string {
  const base = normalizar(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${id}`;
}

export function getCarreraPorSlug(slug: string): Carrera | undefined {
  return getCarreras().find((r) => slugify(r.id, r.name) === slug);
}
