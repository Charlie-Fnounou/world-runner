import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Páginas privadas o sin contenido para buscadores.
      disallow: ["/admin", "/perfil", "/login", "/auth/", "/api/"],
    },
    sitemap: "https://theworldrunner.com/sitemap.xml",
  };
}
