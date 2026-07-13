import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCarreras } from "@/lib/races-data";
import { getFavoritoIds } from "@/lib/favoritos";
import { getAlertaIds } from "@/lib/alertas";
import { getCompletadas } from "@/lib/completadas";
import { PerfilClient } from "@/components/PerfilClient";

export const metadata = {
  title: "Mi perfil",
};

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil");

  const [usuario, carreras, favoritoIds, alertaIds, completadas] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: user.id } }),
    getCarreras(),
    getFavoritoIds(),
    getAlertaIds(),
    getCompletadas(),
  ]);

  return (
    <PerfilClient
      nombre={usuario?.nombre ?? null}
      email={user.email ?? ""}
      corredorDesde={usuario?.creadoEn.toISOString().slice(0, 10) ?? ""}
      carreras={carreras}
      favoritoIds={favoritoIds}
      alertaIds={alertaIds}
      completadas={completadas}
    />
  );
}
