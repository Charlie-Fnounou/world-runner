import { getCarreras } from "@/lib/races-data";
import { HomeClient } from "@/components/HomeClient";

export const revalidate = 300;

export default async function Home() {
  const carreras = await getCarreras();
  return <HomeClient carreras={carreras} />;
}
