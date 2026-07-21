"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { InstagramIcon, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "./InstagramIcon";
import { useIdioma } from "./LanguageProvider";
import { IDIOMAS } from "@/lib/i18n";

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const { idioma, cambiarIdioma, t } = useIdioma();
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  useEffect(() => {
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setAbierto(true)}
        aria-label={t.nav.abrirMenu}
        className="w-9 h-9 rounded-full flex items-center justify-center border text-lg"
        style={{ borderColor: "var(--wr-line)", color: "var(--wr-ink)" }}
      >
        ☰
      </button>

      {/* Portal al final de <body>: si el panel se rendera como
          descendiente del <header> (que usa backdrop-blur), queda
          "aplastado" dentro de la altura del header en vez de ocupar
          toda la pantalla, porque backdrop-filter genera un containing
          block para sus hijos con position fixed/absolute. */}
      {montado &&
        abierto &&
        createPortal(
          <div className="fixed inset-0 z-30">
            <div
              className="absolute inset-0"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={() => setAbierto(false)}
            />
            <nav
              role="dialog"
              aria-modal="true"
              aria-label={t.nav.menu}
              className="absolute top-0 right-0 h-full w-64 max-w-[80vw] flex flex-col gap-1 p-5 pt-6 wr-panel overflow-y-auto"
              style={{ color: "var(--wr-ink)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-display font-bold uppercase tracking-wide">{t.nav.menu}</span>
                <button
                  onClick={() => setAbierto(false)}
                  aria-label={t.nav.cerrarMenu}
                  className="w-9 h-9 rounded-full flex items-center justify-center border"
                  style={{ borderColor: "var(--wr-line)" }}
                >
                  ✕
                </button>
              </div>
              {items.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setAbierto(false)}
                  className="px-3 py-3 rounded-lg text-base font-medium hover:opacity-80"
                  style={{ color: "var(--wr-ink)" }}
                >
                  {n.label}
                </Link>
              ))}

              <div className="mt-2 pt-4 border-t flex flex-wrap gap-2" style={{ borderColor: "var(--wr-line)" }}>
                {IDIOMAS.map((i) => (
                  <button
                    key={i.codigo}
                    onClick={() => cambiarIdioma(i.codigo)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold border"
                    style={{
                      borderColor: "var(--wr-line)",
                      color: "var(--wr-ink)",
                      background: i.codigo === idioma ? "var(--wr-panel-2)" : "transparent",
                    }}
                  >
                    {i.bandera} {i.codigo.toUpperCase()}
                  </button>
                ))}
              </div>

              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-medium hover:opacity-80"
                style={{ color: "var(--wr-mut)" }}
              >
                <InstagramIcon size={16} />@{INSTAGRAM_HANDLE}
              </a>
            </nav>
          </div>,
          document.body,
        )}
    </div>
  );
}
