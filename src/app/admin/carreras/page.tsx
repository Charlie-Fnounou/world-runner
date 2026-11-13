import Link from "next/link";
import { prisma } from "@/lib/prisma";

const POR_PAGINA = 100;

// Con ~19.000 carreras, traerlas todas en una tabla tardaba más de un
// minuto y gastaba cuota de la base: búsqueda por nombre/ciudad/país y páginas.
export default async function AdminCarrerasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const { q = "", pagina = "1" } = await searchParams;
  const numPagina = Math.max(1, Number(pagina) || 1);
  const texto = q.trim().slice(0, 100);
  const where = texto
    ? {
        OR: [
          { nombre: { contains: texto, mode: "insensitive" as const } },
          { ciudad: { contains: texto, mode: "insensitive" as const } },
          { pais: { contains: texto, mode: "insensitive" as const } },
        ],
      }
    : {};
  const [total, eventos] = await Promise.all([
    prisma.evento.count({ where }),
    prisma.evento.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip: (numPagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { ediciones: { orderBy: { anio: "desc" }, take: 1 } },
    }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlace = (n: number) =>
    `/admin/carreras?${new URLSearchParams({ ...(texto ? { q: texto } : {}), pagina: String(n) })}`;

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex gap-2 flex-wrap items-center"
        action="/admin/carreras"
      >
        <label htmlFor="admin-buscar" className="sr-only">
          Buscar carrera
        </label>
        <input
          id="admin-buscar"
          name="q"
          defaultValue={texto}
          placeholder="Buscar por nombre, ciudad o país"
          className="rounded-full px-4 py-2 text-sm wr-panel flex-1 min-w-[200px]"
        />
        <button
          type="submit"
          className="rounded-full px-4 py-2 text-sm font-semibold"
          style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
        >
          Buscar
        </button>
        <span className="text-sm" style={{ color: "var(--wr-mut)" }}>
          {total} carreras · página {numPagina} de {paginas}
        </span>
      </form>
      <section className="rounded-2xl wr-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-left text-xs uppercase tracking-wider"
              style={{ color: "var(--wr-mut)" }}
            >
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
                <tr
                  key={e.id}
                  style={{ borderTop: "1px solid var(--wr-line)" }}
                >
                  <td className="p-3 font-medium">
                    {e.bandera} {e.nombre}
                  </td>
                  <td className="p-3" style={{ color: "var(--wr-mut)" }}>
                    {e.ciudad}, {e.pais}
                  </td>
                  <td className="p-3 font-mono">
                    {edicion?.fecha.toISOString().slice(0, 10) ?? "—"}
                  </td>
                  <td className="p-3">{edicion?.estado ?? "—"}</td>
                  <td className="p-3 font-mono">
                    {edicion?.moneda ?? ""}
                    {edicion?.precioDesde ?? "—"}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/carreras/${e.id}`}
                      className="font-semibold"
                      style={{ color: "var(--wr-acc-txt)" }}
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <nav className="flex gap-3 text-sm">
        {numPagina > 1 && (
          <Link href={enlace(numPagina - 1)} style={{ color: "var(--wr-acc-txt)" }}>
            ← Anterior
          </Link>
        )}
        {numPagina < paginas && (
          <Link href={enlace(numPagina + 1)} style={{ color: "var(--wr-acc-txt)" }}>
            Siguiente →
          </Link>
        )}
      </nav>
    </div>
  );
}
