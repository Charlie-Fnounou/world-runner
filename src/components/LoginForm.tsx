"use client";

import { useActionState } from "react";
import Image from "next/image";
import { enviarLinkMagico, iniciarConGoogle } from "@/app/login/actions";
import { useIdioma } from "./LanguageProvider";

const ESTADO_INICIAL: { error?: string; ok?: boolean } = {};

export function LoginForm({ next = "/" }: { next?: string }) {
  const { t } = useIdioma();
  const [estado, formAction, pendiente] = useActionState(enviarLinkMagico, ESTADO_INICIAL);

  return (
    <div className="max-w-sm mx-auto px-4 py-20 w-full flex flex-col gap-6">
      <div className="text-center">
        <Image src="/brand/icono.png" alt="" width={64} height={64} className="mx-auto mb-4" priority />
        <h1 className="font-display font-extrabold text-3xl">{t.login.titulo}</h1>
        <p className="text-sm mt-2" style={{ color: "var(--wr-mut)" }}>
          {t.login.subtitulo}
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <input
          type="email"
          name="email"
          required
          placeholder={t.login.emailPlaceholder}
          className="w-full rounded-full px-5 py-3.5 text-sm outline-none wr-panel"
          style={{ color: "var(--wr-ink)" }}
        />
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-full px-5 py-3.5 text-sm font-semibold disabled:opacity-60"
          style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
        >
          {pendiente ? t.login.enviando : t.login.enviarBoton}
        </button>
      </form>

      {estado?.ok && <p className="text-sm text-center rounded-xl px-4 py-3 wr-chip">{t.login.exito}</p>}
      {estado?.error && (
        <p className="text-sm text-center rounded-xl px-4 py-3" style={{ background: "#EF444422", color: "#EF4444" }}>
          {estado.error}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--wr-mut)" }}>
        <div className="flex-1 h-px" style={{ background: "var(--wr-line)" }} />
        {t.login.o}
        <div className="flex-1 h-px" style={{ background: "var(--wr-line)" }} />
      </div>

      <form action={iniciarConGoogle}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="w-full rounded-full px-5 py-3.5 text-sm font-semibold wr-panel"
          style={{ color: "var(--wr-ink)" }}
        >
          {t.login.continuarGoogle}
        </button>
      </form>
    </div>
  );
}
