import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/app/login/actions";
import { prisma } from "@/lib/prisma";

export async function UserMenu() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap"
        style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
      >
        Entrar
      </Link>
    );
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: user.id }, select: { esAdmin: true } });

  return (
    <div className="flex items-center gap-2">
      {usuario?.esAdmin && (
        <Link
          href="/admin"
          className="rounded-full px-3 py-2 text-sm font-semibold wr-chip whitespace-nowrap"
          style={{ color: "var(--wr-ink)" }}
        >
          Admin
        </Link>
      )}
      <form action={cerrarSesion} className="flex items-center gap-2">
        <span className="hidden md:inline text-sm truncate max-w-[160px]" style={{ color: "var(--wr-mut)" }}>
          {user.email}
        </span>
        <button
          type="submit"
          className="rounded-full px-4 py-2 text-sm font-semibold wr-panel whitespace-nowrap"
          style={{ color: "var(--wr-ink)" }}
        >
          Salir
        </button>
      </form>
    </div>
  );
}
