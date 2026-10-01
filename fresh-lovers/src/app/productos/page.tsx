import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { JsonLd } from "@/components/JsonLd";
import { categories, products, skuCount } from "@/data/catalog";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Productos",
  description:
    "Catálogo Fresh Lovers: yogurt griego, yogurt en pouch, quesos frescos, labne, arepas, granola, café artesanal, aceitunas, sopas, fruta seca y harinas.",
  alternates: { canonical: "/productos" },
};

export default function ProductosPage() {
  return (
    <div className="gutter pb-28">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Productos Fresh Lovers",
          itemListElement: products.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${site.url}/productos/${p.slug}`,
            name: p.name,
          })),
        }}
      />
      <header className="pt-28 md:pt-36">
        <p className="kicker text-ink/55">
          Catálogo · {categories.length} categorías · {skuCount} productos
        </p>
        <h1 className="font-display mt-4 text-[20vw] leading-[0.82] tracking-[-0.03em] md:text-[11vw]">
          Productos
        </h1>
      </header>
      <Suspense fallback={<div className="h-96" />}>
        <CatalogBrowser />
      </Suspense>
    </div>
  );
}
