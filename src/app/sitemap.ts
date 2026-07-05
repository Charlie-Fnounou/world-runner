import type { MetadataRoute } from "next";
import { getCarreras, slugify } from "@/lib/races-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://world-runner.vercel.app";
  const races = await getCarreras();
  const carreras = races.map((r) => ({
    url: `${base}/carreras/${slugify(r.id, r.name)}`,
    lastModified: new Date(),
  }));

  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/calendario`, lastModified: new Date() },
    ...carreras,
  ];
}
