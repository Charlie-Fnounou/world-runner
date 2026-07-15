import { getCarreras } from "@/lib/races-data";
import { HomeClient } from "@/components/HomeClient";
import { BannerPublicitario } from "@/components/BannerPublicitario";

export const revalidate = 300;

export default async function Home() {
  const carreras = await getCarreras();
  return (
    <HomeClient
      carreras={carreras}
      bannerDestacado={<BannerPublicitario ubicacion="HOME_DESTACADO" />}
      bannerMedio={<BannerPublicitario ubicacion="HOME_MEDIO" />}
    />
  );
}
