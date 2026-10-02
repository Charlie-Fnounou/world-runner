"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { PlanActual } from "@/lib/planes";
import { cancelarMiSuscripcion, obtenerMiPlan } from "@/app/actions/planes";
import { fmtFecha } from "@/lib/format";
import { useIdioma } from "./LanguageProvider";

export function MiPlan() {
  const { idioma, t } = useIdioma();
  const m = t.planes.miPlan;
  const [plan, setPlan] = useState<PlanActual | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [cancelada, setCancelada] = useState(false);
  const [pendiente, startTransition] = useTransition();

  useEffect(() => {
    obtenerMiPlan().then(setPlan).catch(() => {});
  }, []);

  if (!plan) return null;

  const fecha = plan.vigenteHasta ? fmtFecha(plan.vigenteHasta.slice(0, 10), idioma) : "";
  const periodo = plan.periodo === "anual" ? t.planes.anual.toLowerCase() : t.planes.mensual.toLowerCase();
  const nombre = !plan.esPro ? m.gratis : plan.plan === "PASE" ? m.pase : m.pro(periodo);
  const detalle = !plan.esPro ? null : plan.plan === "PRO" && plan.estado === "activa" && !cancelada ? m.renueva(fecha) : m.terminaEl(fecha);
  const puedeCancelar = plan.esPro && plan.plan === "PRO" && plan.estado === "activa" && !cancelada;

  return (
    <div className="rounded-2xl p-5 wr-panel flex flex-wrap items-center justify-between gap-4 mt-7">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--wr-mut)" }}>
          {m.titulo}
        </span>
        <span className="font-display font-extrabold text-2xl uppercase" style={{ color: plan.esPro ? "var(--wr-acc)" : "var(--wr-ink)" }}>
          {nombre}
        </span>
        {detalle && (
          <span className="text-sm" style={{ color: "var(--wr-mut)" }}>
            {detalle}
          </span>
        )}
        {cancelada && (
          <span className="text-sm" style={{ color: "var(--wr-mut)" }}>
            {m.cancelada}
          </span>
        )}
      </div>
      {!plan.esPro && (
        <Link href="/planes" className="rounded-full px-5 py-2.5 text-sm font-semibold" style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}>
          {m.mejorar}
        </Link>
      )}
      {puedeCancelar &&
        (confirmando ? (
          <button
            type="button"
            disabled={pendiente}
            onClick={() =>
              startTransition(async () => {
                const r = await cancelarMiSuscripcion();
                if (r.ok) setCancelada(true);
                setConfirmando(false);
              })
            }
            className="rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
            style={{ background: "#EF444422", color: "#EF4444" }}
          >
            {m.confirmarCancelar}
          </button>
        ) : (
          <button type="button" onClick={() => setConfirmando(true)} className="text-sm font-semibold hover:underline" style={{ color: "var(--wr-mut)" }}>
            {m.cancelar}
          </button>
        ))}
    </div>
  );
}
