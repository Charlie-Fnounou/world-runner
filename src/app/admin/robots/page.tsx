import { prisma } from "@/lib/prisma";
import { correrCollectoresAhora } from "@/app/actions/robots";

export default async function AdminRobotsPage() {
  const ejecuciones = await prisma.ejecucionRobot.findMany({
    orderBy: { iniciadoEn: "desc" },
    take: 50,
  });

  const runsignupConfigurado = Boolean(process.env.RUNSIGNUP_API_KEY && process.env.RUNSIGNUP_API_SECRET);

  const botonManual = (
    <form action={correrCollectoresAhora}>
      <button
        type="submit"
        disabled={!runsignupConfigurado}
        className="rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-40"
        style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
      >
        Correr recolectores ahora
      </button>
      {!runsignupConfigurado && (
        <p className="text-xs mt-2" style={{ color: "var(--wr-mut)" }}>
          Falta configurar RUNSIGNUP_API_KEY / RUNSIGNUP_API_SECRET para poder correrlo.
        </p>
      )}
    </form>
  );

  if (ejecuciones.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {botonManual}
        <div className="rounded-2xl p-8 wr-panel text-center" style={{ color: "var(--wr-mut)" }}>
          Todavía no hay robots corriendo. Aquí vas a ver el historial de cada sincronización
          (RunSignup, federaciones, sitios oficiales).
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {botonManual}
      <section className="rounded-2xl wr-panel overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--wr-mut)" }}>
            <th className="p-3">Collector</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Mensaje</th>
            <th className="p-3">Cuándo</th>
          </tr>
        </thead>
        <tbody>
          {ejecuciones.map((e) => (
            <tr key={e.id} style={{ borderTop: "1px solid var(--wr-line)" }}>
              <td className="p-3 font-medium">{e.collector}</td>
              <td className="p-3">{e.estado}</td>
              <td className="p-3" style={{ color: "var(--wr-mut)" }}>
                {e.mensaje ?? "—"}
              </td>
              <td className="p-3 font-mono text-xs">{e.iniciadoEn.toISOString().slice(0, 16).replace("T", " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </section>
    </div>
  );
}
