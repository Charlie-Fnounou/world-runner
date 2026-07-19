import { prisma } from "@/lib/prisma";

// Barrida diaria de calidad de datos: corre sola dentro del cron
// existente (no hace falta que nadie entre a revisar manualmente).
// Solo hace correcciones de bajo riesgo, sin ambigüedad — nunca borra
// ni fusiona carreras que podrían ser legítimas aunque se parezcan
// (ver /admin sobre duplicados: eso queda para revisión manual a
// propósito, acá no se toca).
export async function corregirCalidadDeDatos() {
  // 1. Estados de inscripción vencidos: la UI ya los muestra siempre
  // como "cerrada" cuando la fecha pasó (ver estadoParaMostrar en
  // races-data.ts), pero también se corrige en la base para que
  // cualquier otra vista (admin, exports) sea consistente.
  const estadosCorregidos = await prisma.edicion.updateMany({
    where: {
      estado: { in: ["ABIERTA", "ULTIMOS_CUPOS", "SORTEO", "PROXIMAMENTE"] },
      fecha: { lt: new Date() },
    },
    data: { estado: "CERRADA" },
  });

  // 2. Nombres degenerados (ej. "." cuando el parseo de algún collector
  // falló y no capturó texto real): se borra el evento completo, no
  // tiene valor mostrarlo con un nombre así. Unicode-aware (\p{L}) para
  // no borrar por error nombres en alfabetos no latinos (ruso, chino,
  // coreano, tailandés, árabe, etc.) — solo cuenta como "sin nombre
  // real" si tiene menos de 2 letras de cualquier idioma.
  const eventos = await prisma.evento.findMany({ select: { id: true, nombre: true } });
  const idsNombreRoto = eventos
    .filter((e) => (e.nombre.match(/\p{L}/gu)?.length ?? 0) < 2)
    .map((e) => e.id);

  let eventosEliminados = 0;
  if (idsNombreRoto.length > 0) {
    const r = await prisma.evento.deleteMany({ where: { id: { in: idsNombreRoto } } });
    eventosEliminados = r.count;
  }

  return {
    estadosCorregidos: estadosCorregidos.count,
    eventosEliminados,
  };
}
