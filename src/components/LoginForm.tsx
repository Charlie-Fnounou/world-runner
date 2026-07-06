"use client";

import { useActionState } from "react";
import { enviarLinkMagico, iniciarConGoogle } from "@/app/login/actions";

const ESTADO_INICIAL: { error?: string; ok?: boolean } = {};

export function LoginForm({ next = "/" }: { next?: string }) {
  const [estado, formAction, pendiente] = useActionState(enviarLinkMagico, ESTADO_INICIAL);

  return (
    <div className="max-w-sm mx-auto px-4 py-20 w-full flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-display font-extrabold text-3xl">Entrar a WorldRunner</h1>
        <p className="text-sm mt-2" style={{ color: "var(--wr-mut)" }}>
          Guarda tus favoritos, recibe alertas y sigue tus carreras completadas.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <input
          type="email"
          name="email"
          required
          placeholder="tu@correo.com"
          className="w-full rounded-full px-5 py-3.5 text-sm outline-none wr-panel"
          style={{ color: "var(--wr-ink)" }}
        />
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-full px-5 py-3.5 text-sm font-semibold disabled:opacity-60"
          style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
        >
          {pendiente ? "Enviando…" : "Enviarme un link para entrar"}
        </button>
      </form>

      {estado?.ok && (
        <p className="text-sm text-center rounded-xl px-4 py-3 wr-chip">
          ✅ Revisa tu correo y haz clic en el link para entrar.
        </p>
      )}
      {estado?.error && (
        <p className="text-sm text-center rounded-xl px-4 py-3" style={{ background: "#EF444422", color: "#EF4444" }}>
          {estado.error}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--wr-mut)" }}>
        <div className="flex-1 h-px" style={{ background: "var(--wr-line)" }} />
        o
        <div className="flex-1 h-px" style={{ background: "var(--wr-line)" }} />
      </div>

      <form action={iniciarConGoogle}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="w-full rounded-full px-5 py-3.5 text-sm font-semibold wr-panel"
          style={{ color: "var(--wr-ink)" }}
        >
          Continuar con Google
        </button>
      </form>
    </div>
  );
}
