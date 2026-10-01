import { getCarreras } from "@/lib/races-data";
import { AsistenteClient } from "@/components/AsistenteClient";

export const revalidate = 86400;

export const metadata = {
  title: "Asistente IA",
};

export default async function AsistentePage() {
  const carreras = await getCarreras();
  return <AsistenteClient carreras={carreras} />;
}
