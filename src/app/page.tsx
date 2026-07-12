import { getCarreras } from "@/lib/races-data";
import { getFavoritoIds } from "@/lib/favoritos";
import { HomeClient } from "@/components/HomeClient";
import { BannerPublicitario } from "@/components/BannerPublicitario";

export const revalidate = 300;

export default async function Home() {
  const [carreras, favoritosIniciales] = await Promise.all([getCarreras(), getFavoritoIds()]);
  return (
    <HomeClient
      carreras={carreras}
      favoritosIniciales={favoritosIniciales}
      bannerDestacado={<BannerPublicitario ubicacion="HOME_DESTACADO" />}
      bannerMedio={<BannerPublicitario ubicacion="HOME_MEDIO" />}
    />
  );
}
