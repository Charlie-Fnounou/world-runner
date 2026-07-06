import { prisma } from "@/lib/prisma";

export default async function AdminComunidadPage() {
  const envios = await prisma.envioComunidad.findMany({
    where: { estado: "PENDIENTE" },
    orderBy: { creadoEn: "desc" },
  });

  if (envios.length === 0) {
    return (
      <div className="rounded-2xl p-8 wr-panel text-center" style={{ color: "var(--wr-mut)" }}>
        No hay envíos de la comunidad pendientes de moderación todavía. Aquí aparecerán las
        carreras nuevas y los reportes de error que envíen los usuarios (Fase 4).
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {envios.map((e) => (
        <div key={e.id} className="rounded-xl p-4 wr-panel">
          <div className="text-sm font-semibold">{e.tipo}</div>
          <pre className="text-xs mt-2 overflow-x-auto" style={{ color: "var(--wr-mut)" }}>
            {JSON.stringify(e.datos, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}
