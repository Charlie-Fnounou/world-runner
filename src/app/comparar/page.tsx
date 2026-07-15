import { getCarreras } from "@/lib/races-data";
import { CompareClient } from "@/components/CompareClient";

export const revalidate = 300;

export const metadata = {
  title: "Comparador de carreras",
};

export default async function CompararPage() {
  const carreras = await getCarreras();
  const destacadas = carreras.filter((r) => r.rating > 0).sort((x, y) => y.rating - x.rating);
  const base = destacadas.length >= 2 ? destacadas : carreras;
  const inicialA = base[0]?.id ?? "";
  const inicialB = base.find((r) => r.id !== inicialA)?.id ?? "";
  return <CompareClient carreras={carreras} inicialA={inicialA} inicialB={inicialB} />;
}
