import { prisma } from "@/lib/prisma";
import { ComunidadAdminClient } from "@/components/ComunidadAdminClient";

export default async function AdminComunidadPage() {
  const envios = await prisma.envioComunidad.findMany({
    where: { estado: "PENDIENTE" },
    orderBy: { creadoEn: "desc" },
    include: { usuario: { select: { email: true } } },
  });

  return (
    <ComunidadAdminClient
      envios={envios.map((e) => ({
        id: e.id,
        tipo: e.tipo,
        eventoId: e.eventoId,
        datos: e.datos,
        creadoEn: e.creadoEn.toISOString(),
        usuarioEmail: e.usuario?.email ?? null,
      }))}
    />
  );
}
