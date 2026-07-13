import { getCarreras } from "@/lib/races-data";
import { CompareClient } from "@/components/CompareClient";

export const revalidate = 300;

export const metadata = {
  title: "Comparador de carreras",
};

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const [carreras, { a, b }] = await Promise.all([getCarreras(), searchParams]);
  const destacadas = carreras.filter((r) => r.rating > 0).sort((x, y) => y.rating - x.rating);
  const base = destacadas.length >= 2 ? destacadas : carreras;
  const inicialA = a ?? base[0]?.id ?? "";
  const inicialB = b ?? base.find((r) => r.id !== inicialA)?.id ?? "";
  return <CompareClient carreras={carreras} inicialA={inicialA} inicialB={inicialB} />;
}
