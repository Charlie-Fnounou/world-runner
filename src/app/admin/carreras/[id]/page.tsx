import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { actualizarEdicion } from "@/app/actions/admin";

export default async function AdminEditarCarreraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evento = await prisma.evento.findUnique({
    where: { id },
    include: { ediciones: { orderBy: { anio: "desc" }, take: 1 }, historialCambios: { orderBy: { creadoEn: "desc" }, take: 10 } },
  });
  if (!evento) notFound();

  const edicion = evento.ediciones[0];
  if (!edicion) notFound();

  const actualizar = actualizarEdicion.bind(null, edicion.id);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/carreras" className="text-sm" style={{ color: "var(--wr-mut)" }}>
        ← Volver a carreras
      </Link>

      <div>
        <h2 className="font-display font-bold text-2xl">
          {evento.bandera} {evento.nombre}
        </h2>
        <p className="text-sm" style={{ color: "var(--wr-mut)" }}>
          {evento.ciudad}, {evento.pais}
        </p>
      </div>

      <form action={actualizar} className="rounded-2xl p-5 wr-panel flex flex-col gap-4 max-w-lg">
        <label className="flex flex-col gap-1 text-sm">
          Estado de inscripción
          <select
            name="estado"
            defaultValue={edicion.estado}
            className="rounded-lg px-3 py-2 wr-chip"
            style={{ color: "var(--wr-ink)" }}
          >
            <option value="ABIERTA">Abierta</option>
            <option value="ULTIMOS_CUPOS">Últimos cupos</option>
            <option value="SORTEO">Sorteo</option>
            <option value="PROXIMAMENTE">Próximamente</option>
            <option value="CERRADA">Cerrada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Fecha
          <input
            type="date"
            name="fecha"
            defaultValue={edicion.fecha.toISOString().slice(0, 10)}
            className="rounded-lg px-3 py-2 wr-chip"
            style={{ color: "var(--wr-ink)" }}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Precio desde ({edicion.moneda ?? "$"})
          <input
            type="number"
            name="precioDesde"
            defaultValue={edicion.precioDesde ?? ""}
            className="rounded-lg px-3 py-2 wr-chip"
            style={{ color: "var(--wr-ink)" }}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Cantidad de corredores
          <input
            type="number"
            name="numCorredores"
            defaultValue={edicion.numCorredores ?? ""}
            className="rounded-lg px-3 py-2 wr-chip"
            style={{ color: "var(--wr-ink)" }}
          />
        </label>

        <button
          type="submit"
          className="rounded-full px-5 py-3 text-sm font-semibold self-start"
          style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
        >
          Guardar cambios
        </button>
      </form>

      {evento.historialCambios.length > 0 && (
        <section className="rounded-2xl p-5 wr-panel max-w-lg">
          <h3 className="font-bold mb-3">Historial de cambios</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {evento.historialCambios.map((h) => (
              <li key={h.id} style={{ color: "var(--wr-mut)" }}>
                <span className="font-mono text-xs">{h.creadoEn.toISOString().slice(0, 16).replace("T", " ")}</span> —{" "}
                {h.valorNuevo}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
