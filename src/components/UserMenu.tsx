"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cerrarSesion, obtenerMenuUsuario } from "@/app/login/actions";
import { useIdioma } from "./LanguageProvider";

// Se resuelve del lado del cliente (no como Server Component) para que
// el header —presente en TODAS las páginas vía el layout raíz— no
// obligue a que ninguna página de la web se pueda cachear solo por
// mostrar el botón de Entrar/Salir.
export function UserMenu() {
  const { t } = useIdioma();
  const [usuario, setUsuario] = useState<{ email: string; esAdmin: boolean } | null | undefined>(undefined);

  useEffect(() => {
    obtenerMenuUsuario().then(setUsuario);
  }, []);

  if (usuario === undefined) {
    return <div className="w-[88px] h-9" aria-hidden />;
  }

  if (!usuario) {
    return (
      <Link
        href="/login"
        className="rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap"
        style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
      >
        {t.nav.entrar}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {usuario.esAdmin && (
        <Link
          href="/admin"
          className="rounded-full px-3 py-2 text-sm font-semibold wr-chip whitespace-nowrap"
          style={{ color: "var(--wr-ink)" }}
        >
          {t.nav.admin}
        </Link>
      )}
      <form action={cerrarSesion} className="flex items-center gap-2">
        <span className="hidden md:inline text-sm truncate max-w-[160px]" style={{ color: "var(--wr-mut)" }}>
          {usuario.email}
        </span>
        <button
          type="submit"
          className="rounded-full px-4 py-2 text-sm font-semibold wr-panel whitespace-nowrap"
          style={{ color: "var(--wr-ink)" }}
        >
          {t.nav.salir}
        </button>
      </form>
    </div>
  );
}
