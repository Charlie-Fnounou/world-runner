"use client";

import Link from "next/link";
import { useIdioma } from "./LanguageProvider";

export function PantallaError({ tipo, onReintentar }: { tipo: "error" | "no-encontrada"; onReintentar?: () => void }) {
  const { t } = useIdioma();
  const e = t.errores;
  return (
    <div className="max-w-xl mx-auto px-4 py-20 w-full flex flex-col items-center text-center gap-4">
      <h1 className="font-display font-extrabold text-3xl uppercase">{tipo === "error" ? e.titulo : e.noEncontradaTitulo}</h1>
      <p className="text-sm" style={{ color: "var(--wr-mut)" }}>
        {tipo === "error" ? e.texto : e.noEncontradaTexto}
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        {onReintentar && (
          <button
            type="button"
            onClick={onReintentar}
            className="rounded-full px-5 py-2.5 text-sm font-semibold"
            style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
          >
            {e.reintentar}
          </button>
        )}
        <Link href="/" className="rounded-full px-5 py-2.5 text-sm font-semibold wr-panel" style={{ color: "var(--wr-ink)" }}>
          {e.inicio}
        </Link>
      </div>
    </div>
  );
}
