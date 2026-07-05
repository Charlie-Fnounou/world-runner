import type { MetadataRoute } from "next";
import { getCarreras, slugify } from "@/lib/races-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://world-runner.vercel.app";
  const carreras = getCarreras().map((r) => ({
    url: `${base}/carreras/${slugify(r.id, r.name)}`,
    lastModified: new Date(),
  }));

  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/calendario`, lastModified: new Date() },
    ...carreras,
  ];
}
