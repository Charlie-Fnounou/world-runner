import { getCarreras } from "@/lib/races-data";
import { RankingsClient } from "@/components/RankingsClient";

export const revalidate = 300;

export const metadata = {
  title: "Rankings mundiales",
};

export default async function RankingsPage() {
  const carreras = await getCarreras();
  return <RankingsClient carreras={carreras} />;
}
