import { getCarreras } from "@/lib/races-data";
import { HomeClient } from "@/components/HomeClient";

export default function Home() {
  const carreras = getCarreras();
  return <HomeClient carreras={carreras} />;
}
