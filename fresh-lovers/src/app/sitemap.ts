import type { MetadataRoute } from "next";
import { products } from "@/data/catalog";
import { site } from "@/data/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: site.url, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/productos`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...products.map((p) => ({
      url: `${site.url}/productos/${p.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
