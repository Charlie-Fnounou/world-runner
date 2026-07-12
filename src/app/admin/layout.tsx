import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

const NAV = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/carreras", label: "Carreras" },
  { href: "/admin/comunidad", label: "Comunidad" },
  { href: "/admin/robots", label: "Robots" },
  { href: "/admin/publicidad", label: "Publicidad" },
  { href: "/admin/analiticas", label: "Analíticas" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 w-full flex flex-col gap-6">
      <div>
        <h1 className="font-display font-extrabold text-3xl">Panel de administración</h1>
        <nav className="flex gap-2 mt-4 flex-wrap">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-4 py-2 text-sm font-medium wr-panel hover:opacity-80"
              style={{ color: "var(--wr-ink)" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
