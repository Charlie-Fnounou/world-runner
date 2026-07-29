"use client";

import { useSeguimientoUbicacion } from "@/hooks/useSeguimientoUbicacion";
import type { TipoSeguimiento } from "@/app/actions/seguimientos";
import { useIdioma } from "./LanguageProvider";

export function SeguimientoUbicacionBanner({ tipo, valor }: { tipo: TipoSeguimiento; valor: string }) {
  const { activo, alternar } = useSeguimientoUbicacion(tipo, valor);
  const { t } = useIdioma();

  return (
    <div className="rounded-2xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3 wr-panel">
      <div>
        <div className="text-sm font-semibold" style={{ color: "var(--wr-ink)" }}>
          📍 {tipo === "pais" ? t.home.viendoPais(valor) : t.home.viendoCiudad(valor)}
        </div>
        {!activo && (
          <div className="text-xs mt-0.5" style={{ color: "var(--wr-mut)" }}>
            {t.home.seguimientoAviso}
          </div>
        )}
      </div>
      <button
        onClick={alternar}
        className="rounded-full px-4 py-2 text-sm font-semibold shrink-0 wr-chip"
        style={activo ? { color: "var(--wr-ink)" } : { background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
      >
        {activo ? t.home.siguiendoLugar : t.home.seguirLugar}
      </button>
    </div>
  );
}
