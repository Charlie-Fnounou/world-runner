import { getCarreras } from "@/lib/races-data";
import { getFavoritoIds } from "@/lib/favoritos";
import { TripClient } from "@/components/TripClient";

export const revalidate = 300;

export const metadata = {
  title: "Corre durante tu viaje",
};

export default async function ViajePage() {
  const [carreras, favoritosIniciales] = await Promise.all([getCarreras(), getFavoritoIds()]);
  return <TripClient carreras={carreras} favoritosIniciales={favoritosIniciales} />;
}
