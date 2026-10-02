import { prisma } from "@/lib/prisma";
import { configActual, entornoPayPal, paypalConfigurado } from "@/lib/paypal";
import { PRECIOS } from "@/lib/precios";
import { BotonConfigurar } from "./BotonConfigurar";

function soloVigentes<T extends { vigenteHasta: Date | null; estado: string }>(lista: T[]): T[] {
  const ahora = Date.now();
  return lista.filter((s) => s.vigenteHasta && s.vigenteHasta.getTime() > ahora && s.estado !== "suspendida" && s.estado !== "vencida");
}

export default async function AdminPagosPage() {
  const configurado = paypalConfigurado();
  const entorno = entornoPayPal();
  const [config, suscripciones] = await Promise.all([
    configurado ? configActual() : null,
    prisma.suscripcion.findMany({ orderBy: { actualizadoEn: "desc" }, take: 30, include: { usuario: { select: { email: true } } } }),
  ]);
  const activas = soloVigentes(suscripciones);

  const pasos: [boolean, string][] = [
    [configurado, "Claves de PayPal cargadas en Vercel (PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET)"],
    [entorno === "live", "Modo real activado (PAYPAL_ENV = live). Sin esto, PayPal funciona en modo de prueba y no cobra"],
    [Boolean(config), "Planes creados en PayPal (botón de abajo)"],
    [Boolean(config?.webhookId), "Webhook creado (para enterarnos de cobros y cancelaciones)"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl p-5 wr-panel flex flex-col gap-4">
        <h2 className="font-bold text-lg">Estado de los pagos</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {pasos.map(([ok, texto]) => (
            <li key={texto} className="flex gap-2">
              <span style={{ color: ok ? "#16A34A" : "#EF4444" }}>{ok ? "✓" : "✗"}</span>
              <span>{texto}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm" style={{ color: "var(--wr-mut)" }}>
          Precios actuales: Pro US${PRECIOS.proMensual}/mes (con {PRECIOS.diasPrueba} días gratis) · US${PRECIOS.proAnual}/año · Pase{" "}
          {PRECIOS.diasPase} días US${PRECIOS.pase60}. Entorno: <b>{entorno}</b>.
        </p>
        {configurado && <BotonConfigurar yaConfigurado={Boolean(config)} />}
      </section>

      <section className="rounded-2xl p-5 wr-panel flex flex-col gap-3">
        <h2 className="font-bold text-lg">Suscripciones ({activas.length} activas)</h2>
        {suscripciones.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--wr-mut)" }}>
            Todavía no hay ninguna.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--wr-mut)" }}>
                  <th className="py-2 pr-4">Usuario</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2">Vigente hasta</th>
                </tr>
              </thead>
              <tbody>
                {suscripciones.map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid var(--wr-line)" }}>
                    <td className="py-2 pr-4">{s.usuario.email}</td>
                    <td className="py-2 pr-4">
                      {s.plan} {s.periodo}
                    </td>
                    <td className="py-2 pr-4">{s.estado}</td>
                    <td className="py-2 tabular-nums">{s.vigenteHasta?.toISOString().slice(0, 10) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
