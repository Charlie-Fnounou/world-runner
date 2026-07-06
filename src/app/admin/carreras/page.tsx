import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminCarrerasPage() {
  const eventos = await prisma.evento.findMany({
    orderBy: { nombre: "asc" },
    include: { ediciones: { orderBy: { anio: "desc" }, take: 1 } },
  });

  return (
    <section className="rounded-2xl wr-panel overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--wr-mut)" }}>
            <th className="p-3">Carrera</th>
            <th className="p-3">Ciudad / País</th>
            <th className="p-3">Próxima fecha</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Precio</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((e) => {
            const edicion = e.ediciones[0];
            return (
              <tr key={e.id} style={{ borderTop: "1px solid var(--wr-line)" }}>
                <td className="p-3 font-medium">
                  {e.bandera} {e.nombre}
                </td>
                <td className="p-3" style={{ color: "var(--wr-mut)" }}>
                  {e.ciudad}, {e.pais}
                </td>
                <td className="p-3 font-mono">{edicion?.fecha.toISOString().slice(0, 10) ?? "—"}</td>
                <td className="p-3">{edicion?.estado ?? "—"}</td>
                <td className="p-3 font-mono">
                  {edicion?.moneda ?? ""}
                  {edicion?.precioDesde ?? "—"}
                </td>
                <td className="p-3">
                  <Link href={`/admin/carreras/${e.id}`} className="font-semibold" style={{ color: "var(--wr-acc)" }}>
                    Editar
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
