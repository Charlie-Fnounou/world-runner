"use client";

import { useState, useTransition } from "react";
import { configurarPagosAhora } from "@/app/actions/planes";

export function BotonConfigurar({ yaConfigurado }: { yaConfigurado: boolean }) {
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2 items-start">
      <button
        type="button"
        disabled={pendiente}
        onClick={() =>
          startTransition(async () => {
            const r = await configurarPagosAhora(window.location.origin);
            setMensaje({ ok: r.ok, texto: r.mensaje });
          })
        }
        className="rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
        style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
      >
        {pendiente ? "Configurando…" : yaConfigurado ? "Volver a crear planes y webhook" : "Configurar PayPal ahora"}
      </button>
      {mensaje && (
        <p className="text-sm" style={{ color: mensaje.ok ? "#16A34A" : "#EF4444" }}>
          {mensaje.texto}
        </p>
      )}
    </div>
  );
}
