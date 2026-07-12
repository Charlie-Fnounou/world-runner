import type { UbicacionBanner } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function BannerPublicitario({ ubicacion }: { ubicacion: UbicacionBanner }) {
  const patrocinadores = await prisma.patrocinador.findMany({
    where: { ubicacion, activo: true },
    orderBy: { creadoEn: "desc" },
  });

  if (patrocinadores.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 w-full flex flex-col gap-3">
      {patrocinadores.map((p) => (
        <a
          key={p.id}
          href={p.enlaceUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="block rounded-2xl overflow-hidden wr-panel hover:opacity-90"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.imagenUrl} alt={p.nombre} className="w-full max-h-40 object-cover" />
        </a>
      ))}
    </div>
  );
}
