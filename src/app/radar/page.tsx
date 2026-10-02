import type { Metadata } from "next";
import { getEstadisticasRadar, getNovedades } from "@/lib/radar";
import { RadarSeccion } from "@/components/Radar";

export const metadata: Metadata = {
  title: "Radar de carreras",
  description:
    "Carreras de running nuevas, cambios de fecha y de precio, últimos cupos y cancelaciones detectados cada día en más de 90 fuentes oficiales.",
};

export const revalidate = 86400;

export default async function RadarPage() {
  const [novedades, stats] = await Promise.all([getNovedades(80), getEstadisticasRadar()]);
  return (
    <div className="py-12">
      <RadarSeccion novedades={novedades} stats={stats} conLinkTodo={false} />
    </div>
  );
}
