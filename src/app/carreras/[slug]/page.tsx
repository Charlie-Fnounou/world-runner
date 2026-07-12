import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCarreras, getCarreraPorSlug, slugify } from "@/lib/races-data";
import { getFavoritoIds } from "@/lib/favoritos";
import { getAlertaIds } from "@/lib/alertas";
import { RaceDetailClient } from "@/components/RaceDetailClient";
import { BannerPublicitario } from "@/components/BannerPublicitario";
import { fmtFecha } from "@/lib/format";

export const revalidate = 300;

export async function generateStaticParams() {
  const carreras = await getCarreras();
  return carreras.map((r) => ({ slug: slugify(r.id, r.name) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const r = await getCarreraPorSlug(slug);
  if (!r) return {};
  const titulo = `${r.name} — ${fmtFecha(r.date)}`;
  const descripcion = r.desc.slice(0, 155);
  return {
    title: titulo,
    description: descripcion,
    openGraph: { title: titulo, description: descripcion, type: "website" },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion },
    alternates: { canonical: `/carreras/${slug}` },
  };
}

export default async function RacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = await getCarreraPorSlug(slug);
  if (!r) notFound();

  const [favoritosIniciales, alertasIniciales] = await Promise.all([getFavoritoIds(), getAlertaIds()]);
  const favoritoInicial = favoritosIniciales.includes(r.id);
  const alertaInicial = alertasIniciales.includes(r.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: r.name,
    startDate: r.date,
    sport: "Running",
    location: {
      "@type": "Place",
      name: `${r.city}, ${r.country}`,
      geo: { "@type": "GeoCoordinates", latitude: r.lat, longitude: r.lng },
    },
    offers: r.price
      ? { "@type": "Offer", price: r.price, priceCurrency: r.cur === "€" ? "EUR" : r.cur === "$" ? "USD" : r.cur === "£" ? "GBP" : "USD", url: r.web }
      : undefined,
    url: r.web,
    description: r.desc,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RaceDetailClient r={r} favoritoInicial={favoritoInicial} alertaInicial={alertaInicial} />
      <div className="pb-16">
        <BannerPublicitario ubicacion="FICHA_CARRERA" />
      </div>
    </>
  );
}
