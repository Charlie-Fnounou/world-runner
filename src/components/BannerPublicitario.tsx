import type { UbicacionBanner } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ALTO_POR_TAMANO: Record<string, string> = {
  PEQUENO: "h-20",
  MEDIANO: "h-40",
  GRANDE: "h-64",
};

export async function BannerPublicitario({
  ubicacion,
  eventoId,
}: {
  ubicacion: UbicacionBanner;
  // Solo tiene sentido para FICHA_CARRERA: filtra a los banners de esta
  // carrera puntual + los banners "generales" (sin carrera asignada).
  eventoId?: string;
}) {
  const patrocinadores = await prisma.patrocinador.findMany({
    where: {
      ubicacion,
      activo: true,
      ...(ubicacion === "FICHA_CARRERA" ? { OR: [{ eventoId: null }, { eventoId: eventoId ?? "__ninguna__" }] } : {}),
    },
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
          style={p.ajusteImagen === "CONTENER" ? { background: "var(--wr-panel-2)" } : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.imagenUrl}
            alt={p.nombre}
            className={`w-full ${ALTO_POR_TAMANO[p.tamano] ?? "max-h-40"} ${p.ajusteImagen === "CONTENER" ? "object-contain" : "object-cover"}`}
          />
        </a>
      ))}
    </div>
  );
}
