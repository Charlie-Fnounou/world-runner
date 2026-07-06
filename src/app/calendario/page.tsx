import type { Metadata } from "next";
import { getCarreras } from "@/lib/races-data";
import { getFavoritoIds } from "@/lib/favoritos";
import { CalendarioClient } from "@/components/CalendarioClient";

export const metadata: Metadata = {
  title: "Calendario de carreras",
  description: "Todas las carreras de running del mundo organizadas por mes.",
};

export const revalidate = 300;

export default async function CalendarioPage() {
  const [carreras, favoritosIniciales] = await Promise.all([getCarreras(), getFavoritoIds()]);
  return <CalendarioClient carreras={carreras} favoritosIniciales={favoritosIniciales} />;
}
