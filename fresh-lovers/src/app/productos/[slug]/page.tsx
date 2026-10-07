import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductView } from "@/components/catalog/ProductView";
import { ProductPhoto } from "@/components/ProductPhoto";
import { JsonLd } from "@/components/JsonLd";
import { ArrowIcon } from "@/components/Icons";
import { getCategory, getProduct, products } from "@/data/catalog";
import { photos } from "@/data/photos";
import { site } from "@/data/site";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/productos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return {};
  const variants = p.variants.length > 1 ? ` Sabores: ${p.variants.map((v) => v.name).join(", ")}.` : "";
  return {
    title: p.name,
    description: `${p.description}${variants}`.slice(0, 158),
    alternates: { canonical: `/productos/${p.slug}` },
    openGraph: {
      title: `${p.name} · Fresh Lovers`,
      url: `/productos/${p.slug}`,
      ...(p.image && { images: [{ url: photos[p.image].src, width: photos[p.image].w, height: photos[p.image].h, alt: p.name }] }),
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/productos/[slug]">) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  const category = getCategory(p.category)!;
  const related = products.filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, 4);
  const more = related.length ? related : products.filter((x) => x.slug !== p.slug).slice(0, 4);

  return (
    <div className="gutter pb-28 pt-24 md:pt-28">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            description: p.description,
            brand: { "@type": "Brand", name: site.name },
            manufacturer: { "@type": "Organization", name: site.legalName },
            category: category.name,
            url: `${site.url}/productos/${p.slug}`,
            ...(p.image && { image: `${site.url}${photos[p.image].src}` }),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Inicio", item: site.url },
              { "@type": "ListItem", position: 2, name: "Productos", item: `${site.url}/productos` },
              { "@type": "ListItem", position: 3, name: category.name, item: `${site.url}/productos?c=${category.slug}` },
              { "@type": "ListItem", position: 4, name: p.name, item: `${site.url}/productos/${p.slug}` },
            ],
          },
        ]}
      />
      <nav aria-label="Ruta" className="kicker mb-8 flex flex-wrap gap-2 text-[0.62rem] text-ink/55">
        <Link href="/" className="hover:text-ink">Inicio</Link>/
        <Link href="/productos" className="hover:text-ink">Productos</Link>/
        <Link href={`/productos?c=${category.slug}`} className="hover:text-ink">{category.name}</Link>
      </nav>

      <Suspense fallback={<div className="min-h-[80vh]" />}>
        <ProductView product={p} category={category} />
      </Suspense>

      <section aria-labelledby="related" className="mt-28 border-t border-ink/15 pt-10">
        <div className="flex items-end justify-between gap-4">
          <h2 id="related" className="font-display text-4xl md:text-5xl">
            También <em>en {category.name.toLowerCase()}</em>
          </h2>
          <Link href={`/productos?c=${category.slug}`} className="group hidden items-center gap-2 md:inline-flex">
            Ver categoría <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-6">
          {more.map((r) => (
            <li key={r.slug}>
              <Link href={`/productos/${r.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]" style={{ backgroundColor: getCategory(r.category)!.bg }}>
                  <ProductPhoto product={r} fill sizes="(min-width: 768px) 24vw, 48vw" className="transition-transform duration-700 group-hover:scale-105" />
                </div>
                <p className="mt-3 text-[1rem]">{r.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
