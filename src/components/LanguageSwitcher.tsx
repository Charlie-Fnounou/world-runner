"use client";

import { useEffect, useRef, useState } from "react";
import { IDIOMAS } from "@/lib/i18n";
import { useIdioma } from "./LanguageProvider";

export function LanguageSwitcher() {
  const { idioma, cambiarIdioma } = useIdioma();
  const [abierto, setAbierto] = useState(false);
  const cajaRef = useRef<HTMLDivElement>(null);
  const actual = IDIOMAS.find((i) => i.codigo === idioma) ?? IDIOMAS[0];

  // Un div de fondo "fixed inset-0" para cerrar al hacer clic afuera se
  // queda "aplastado" dentro de la altura del header (que usa
  // backdrop-blur, ver MobileNav.tsx) — se usa en cambio un listener en
  // document, que no tiene ese problema.
  useEffect(() => {
    if (!abierto) return;
    function alClicAfuera(e: MouseEvent) {
      if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", alClicAfuera);
    return () => document.removeEventListener("mousedown", alClicAfuera);
  }, [abierto]);

  return (
    <div className="relative" ref={cajaRef}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label="Cambiar idioma"
        title="Cambiar idioma"
        className="h-9 px-2.5 rounded-full flex items-center gap-1 border text-sm font-semibold"
        style={{ borderColor: "var(--wr-line)", color: "var(--wr-ink)" }}
      >
        <span>{actual.bandera}</span>
        <span className="hidden md:inline uppercase">{actual.codigo}</span>
      </button>

      {abierto && (
        <div className="absolute right-0 top-11 z-40 rounded-xl overflow-hidden wr-panel" style={{ minWidth: 160 }}>
          {IDIOMAS.map((i) => (
            <button
              key={i.codigo}
              onClick={() => {
                cambiarIdioma(i.codigo);
                setAbierto(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:opacity-80"
              style={{
                color: "var(--wr-ink)",
                background: i.codigo === idioma ? "var(--wr-panel-2)" : "transparent",
              }}
            >
              <span>{i.bandera}</span>
              {i.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
