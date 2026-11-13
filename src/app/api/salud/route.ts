import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Chequeo de salud para monitoreo externo (ej. un monitor gratuito de
// uptime): responde 200 si la base contesta y el cron corrió en las
// últimas 30 horas, 503 si no. Solo cifras agregadas, nada privado.
export async function GET() {
  try {
    const desde = new Date(Date.now() - 30 * 3600_000);
    const [ultima, recientes] = await Promise.all([
      prisma.ejecucionRobot.findFirst({ orderBy: { iniciadoEn: "desc" }, select: { iniciadoEn: true } }),
      prisma.ejecucionRobot.groupBy({ by: ["estado"], where: { iniciadoEn: { gte: desde } }, _count: { _all: true } }),
    ]);
    const horas = ultima ? (Date.now() - ultima.iniciadoEn.getTime()) / 3600_000 : null;
    const ok = horas !== null && horas < 30;
    const conteo = Object.fromEntries(recientes.map((r) => [r.estado, r._count._all]));
    return NextResponse.json(
      { ok, horasDesdeUltimaCorrida: horas === null ? null : Math.round(horas * 10) / 10, corridasUltimas30h: conteo },
      { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "base de datos no disponible" }, { status: 503 });
  }
}
