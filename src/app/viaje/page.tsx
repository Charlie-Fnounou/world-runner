import { Suspense } from "react";
import { getCarreras } from "@/lib/races-data";
import { TripClient } from "@/components/TripClient";

export const revalidate = 86400;

export const metadata = {
  title: "Corre durante tu viaje",
};

export default async function ViajePage() {
  const carreras = await getCarreras();
  return (
    <Suspense>
      <TripClient carreras={carreras} />
    </Suspense>
  );
}
