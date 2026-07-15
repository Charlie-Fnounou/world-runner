"use client";

import { useTransition } from "react";
import { moderarEnvio } from "@/app/actions/admin";

interface Envio {
  id: string;
  tipo: string;
  eventoId: string | null;
  datos: unknown;
  creadoEn: string;
  usuarioEmail: string | null;
}

function fmtFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

function Campo({ label, valor }: { label: string; valor: string }) {
  if (!valor) return null;
  return (
    <div>
      <span className="text-xs uppercase tracking-wider" style={{ color: "var(--wr-mut)" }}>
        {label}
      </span>
      <p className="text-sm" style={{ color: "var(--wr-ink)" }}>
        {valor}
      </p>
    </div>
  );
}

function EnvioCard({ envio }: { envio: Envio }) {
  const [pending, startTransition] = useTransition();
  const d = envio.datos as Record<string, string>;

  function moderar(estado: "APROBADO" | "RECHAZADO") {
    startTransition(() => moderarEnvio(envio.id, estado));
  }

  return (
    <div className="rounded-xl p-4 wr-panel flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-wider rounded-full px-2.5 py-1"
          style={{ background: "var(--wr-chip)", color: "var(--wr-mut)" }}
        >
          {envio.tipo === "nueva_carrera" ? "🆕 Carrera nueva" : "⚠️ Reporte de error"}
        </span>
        <span className="text-xs" style={{ color: "var(--wr-mut)" }}>
          {fmtFechaCorta(envio.creadoEn)} · {envio.usuarioEmail ?? "anónimo"}
        </span>
      </div>

      {envio.tipo === "nueva_carrera" ? (
        <div className="grid sm:grid-cols-2 gap-2">
          <Campo label="Nombre" valor={d.nombre} />
          <Campo label="Ciudad, país" valor={[d.ciudad, d.pais].filter(Boolean).join(", ")} />
          <Campo label="Fecha" valor={d.fecha} />
          <Campo label="Sitio web" valor={d.sitioWeb} />
          <div className="sm:col-span-2">
            <Campo label="Comentario" valor={d.comentario} />
          </div>
        </div>
      ) : (
        <div>
          <Campo label="Carrera" valor={d.eventoNombre} />
          <Campo label="Descripción" valor={d.descripcion} />
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={() => moderar("RECHAZADO")}
          disabled={pending}
          className="rounded-full px-3.5 py-1.5 text-xs font-semibold wr-chip disabled:opacity-50"
          style={{ color: "var(--wr-ink)" }}
        >
          Rechazar
        </button>
        <button
          onClick={() => moderar("APROBADO")}
          disabled={pending}
          className="rounded-full px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
        >
          Marcar como revisado
        </button>
      </div>
    </div>
  );
}

export function ComunidadAdminClient({ envios }: { envios: Envio[] }) {
  if (envios.length === 0) {
    return (
      <div className="rounded-2xl p-8 wr-panel text-center" style={{ color: "var(--wr-mut)" }}>
        No hay envíos de la comunidad pendientes de moderación por ahora.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {envios.map((e) => (
        <EnvioCard key={e.id} envio={e} />
      ))}
    </div>
  );
}
