import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { correrCollectoresAhora } from "@/app/actions/robots";

export default async function AdminRobotsPage({
  searchParams,
}: {
  searchParams: Promise<{ runsignup?: string; error?: string }>;
}) {
  const { runsignup, error } = await searchParams;

  const [ejecuciones, integracion] = await Promise.all([
    prisma.ejecucionRobot.findMany({ orderBy: { iniciadoEn: "desc" }, take: 50 }),
    prisma.integracionOAuth.findUnique({ where: { proveedor: "runsignup" } }),
  ]);

  const runsignupConectado = Boolean(integracion?.refreshToken);

  const panelRunSignup = (
    <section className="rounded-2xl p-5 wr-panel max-w-lg flex flex-col gap-3">
      <h2 className="font-bold">RunSignup</h2>

      {runsignup === "conectado" && (
        <p className="text-sm rounded-xl px-4 py-3 wr-chip">✅ RunSignup se conectó correctamente.</p>
      )}
      {error && (
        <p className="text-sm rounded-xl px-4 py-3" style={{ background: "#EF444422", color: "#EF4444" }}>
          {error}
        </p>
      )}

      <p className="text-sm" style={{ color: "var(--wr-mut)" }}>
        La búsqueda de carreras funciona sin conexión extra. La conexión de abajo es opcional, solo
        hace falta para funciones futuras que necesiten acceso a la cuenta.
      </p>

      {runsignupConectado ? (
        <p className="text-sm" style={{ color: "var(--wr-mut)" }}>
          ✅ Conectado. Se renueva solo cuando hace falta.
        </p>
      ) : (
        <Link
          href="/api/runsignup/oauth/start"
          className="rounded-full px-5 py-2.5 text-sm font-semibold self-start"
          style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
        >
          Conectar RunSignup
        </Link>
      )}

      <form action={correrCollectoresAhora}>
        <button
          type="submit"
          className="rounded-full px-5 py-2.5 text-sm font-semibold wr-chip"
          style={{ color: "var(--wr-ink)" }}
        >
          Correr recolectores ahora
        </button>
      </form>
    </section>
  );

  if (ejecuciones.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {panelRunSignup}
        <div className="rounded-2xl p-8 wr-panel text-center" style={{ color: "var(--wr-mut)" }}>
          Todavía no hay robots corriendo. Aquí vas a ver el historial de cada sincronización
          (RunSignup, federaciones, sitios oficiales).
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {panelRunSignup}
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
