import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminHomePage() {
  const [carreras, usuarios, favoritos, pendientes, ejecucionesConError] = await Promise.all([
    prisma.evento.count(),
    prisma.usuario.count(),
    prisma.favorito.count(),
    prisma.envioComunidad.count({ where: { estado: "PENDIENTE" } }),
    prisma.ejecucionRobot.count({ where: { estado: "ERROR" } }),
  ]);

  const stats: [string, number, string][] = [
    ["Carreras", carreras, "/admin/carreras"],
    ["Usuarios registrados", usuarios, "/admin"],
    ["Favoritos guardados", favoritos, "/admin"],
    ["Envíos pendientes de moderación", pendientes, "/admin/comunidad"],
    ["Ejecuciones de robots con error", ejecucionesConError, "/admin/robots"],
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map(([label, value, href]) => (
        <Link key={label} href={href} className="rounded-2xl p-5 wr-panel hover:opacity-90">
          <div className="text-3xl font-display font-extrabold">{value}</div>
          <div className="text-sm mt-1" style={{ color: "var(--wr-mut)" }}>
            {label}
          </div>
        </Link>
      ))}
    </div>
  );
}
