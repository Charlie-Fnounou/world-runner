import type { MetadataRoute } from "next";
import { getCarreras, slugify } from "@/lib/races-data";

export const revalidate = 86400;

// Solo carreras que todavía no pasaron (más una semana de margen): miles de
// fichas de carreras viejas o duplicadas diluyen la indexación de las que
// la gente busca. Los duplicados ya vienen excluidos de getCarreras.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://theworldrunner.com";
  const desde = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const races = (await getCarreras()).filter((r) => r.date >= desde && r.status !== "cancelada");
  const estaticas = ["", "/calendario", "/radar", "/rankings", "/comparar", "/viaje", "/asistente", "/planes", "/terminos", "/privacidad"];

  return [
    ...estaticas.map((ruta) => ({ url: `${base}${ruta}`, changeFrequency: "daily" as const })),
    ...races.map((r) => ({ url: `${base}/carreras/${slugify(r.id, r.name)}`, changeFrequency: "weekly" as const })),
  ];
}
