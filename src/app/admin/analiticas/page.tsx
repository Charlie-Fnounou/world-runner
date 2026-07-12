import { prisma } from "@/lib/prisma";

function inicioDeHoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function haceDias(dias: number) {
  const d = inicioDeHoy();
  d.setDate(d.getDate() - dias);
  return d;
}

export default async function AdminAnaliticasPage() {
  const [visitasTotales, visitasHoy, visitasSemana, visitasMes, totalCuentas, cuentasSemana, masVisitadas] =
    await Promise.all([
      prisma.visitaPagina.count(),
      prisma.visitaPagina.count({ where: { creadoEn: { gte: inicioDeHoy() } } }),
      prisma.visitaPagina.count({ where: { creadoEn: { gte: haceDias(7) } } }),
      prisma.visitaPagina.count({ where: { creadoEn: { gte: haceDias(30) } } }),
      prisma.usuario.count(),
      prisma.usuario.count({ where: { creadoEn: { gte: haceDias(7) } } }),
      prisma.visitaPagina.groupBy({
        by: ["ruta"],
        _count: { ruta: true },
        orderBy: { _count: { ruta: "desc" } },
        take: 10,
      }),
    ]);

  const stats: [string, number][] = [
    ["Visitas hoy", visitasHoy],
    ["Visitas últimos 7 días", visitasSemana],
    ["Visitas últimos 30 días", visitasMes],
    ["Visitas totales", visitasTotales],
    ["Cuentas creadas", totalCuentas],
    ["Cuentas nuevas (7 días)", cuentasSemana],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl p-5 wr-panel">
            <div className="text-3xl font-display font-extrabold">{value.toLocaleString("es")}</div>
            <div className="text-sm mt-1" style={{ color: "var(--wr-mut)" }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl p-5 wr-panel max-w-2xl">
        <h2 className="font-bold mb-3">Páginas más visitadas</h2>
        {masVisitadas.length === 0 ? (
          <p style={{ color: "var(--wr-mut)" }}>Todavía no hay visitas registradas.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {masVisitadas.map((v) => (
              <div key={v.ruta} className="flex items-center justify-between text-sm">
                <span className="font-mono truncate" style={{ color: "var(--wr-ink)" }}>
                  {v.ruta}
                </span>
                <span className="font-semibold" style={{ color: "var(--wr-mut)" }}>
                  {v._count.ruta.toLocaleString("es")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
