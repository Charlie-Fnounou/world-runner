import { getCarreras } from "@/lib/races-data";
import { getEstadisticasRadar, getNovedades } from "@/lib/radar";
import { HomeClient } from "@/components/HomeClient";
import { BannerPublicitario } from "@/components/BannerPublicitario";
import { RadarSeccion } from "@/components/Radar";

export const revalidate = 86400;

export default async function Home() {
  const [carreras, novedades, stats] = await Promise.all([getCarreras(), getNovedades(10), getEstadisticasRadar()]);
  return (
    <HomeClient
      carreras={carreras}
      radar={<RadarSeccion novedades={novedades} stats={stats} />}
      bannerDestacado={<BannerPublicitario ubicacion="HOME_DESTACADO" />}
      bannerMedio={<BannerPublicitario ubicacion="HOME_MEDIO" />}
    />
  );
}
