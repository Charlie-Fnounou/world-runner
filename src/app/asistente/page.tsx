import { getCarreras } from "@/lib/races-data";
import { getFavoritoIds } from "@/lib/favoritos";
import { AsistenteClient } from "@/components/AsistenteClient";

export const revalidate = 300;

export const metadata = {
  title: "Asistente IA",
};

export default async function AsistentePage() {
  const [carreras, favoritosIniciales] = await Promise.all([getCarreras(), getFavoritoIds()]);
  return <AsistenteClient carreras={carreras} favoritosIniciales={favoritosIniciales} />;
}
