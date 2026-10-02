"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { PlanActual } from "@/lib/planes";
import { PRECIOS } from "@/lib/precios";
import { completarPase, confirmarSuscripcion, estadoCompra, iniciarPase } from "@/app/actions/planes";
import { BotonPagoPayPal, BotonSuscripcionPayPal } from "./BotonesPayPal";
import { Eyebrow } from "./Radar";
import { useIdioma } from "./LanguageProvider";

type Estado = "idle" | "procesando" | "exito" | "error";

function Tilde() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--wr-acc)" strokeWidth="2.5" className="shrink-0 mt-0.5" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Precio({ valor, sufijo }: { valor: string; sufijo: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-display font-extrabold text-5xl leading-none tabular-nums" style={{ color: "var(--wr-ink)" }}>
        {valor}
      </span>
      <span className="text-sm" style={{ color: "var(--wr-mut)" }}>
        {sufijo}
      </span>
    </div>
  );
}

function BotonNeutro({ children, href }: { children: React.ReactNode; href?: string }) {
  const clase = "w-full rounded-full px-5 py-3 text-sm font-semibold text-center";
  const estilo = { background: "var(--wr-panel-2)", color: "var(--wr-mut)", border: "1px solid var(--wr-line)" };
  if (href)
    return (
      <Link href={href} className={clase + " hover:brightness-110"} style={{ ...estilo, color: "var(--wr-ink)" }}>
        {children}
      </Link>
    );
  return (
    <div className={clase} style={estilo}>
      {children}
    </div>
  );
}

export function PlanesClient({
  clientId,
  planMensualId,
  planAnualId,
}: {
  clientId: string | null;
  planMensualId: string | null;
  planAnualId: string | null;
}) {
  const { t } = useIdioma();
  const p = t.planes;
  const router = useRouter();
  const motivo = useSearchParams().get("motivo");
  const [periodo, setPeriodo] = useState<"mensual" | "anual">("mensual");
  const [cuenta, setCuenta] = useState<{ usuarioId: string | null; plan: PlanActual | null } | null>(null);
  const [estado, setEstado] = useState<Estado>("idle");

  useEffect(() => {
    estadoCompra().then(setCuenta).catch(() => setCuenta({ usuarioId: null, plan: null }));
  }, []);

  const configurado = Boolean(clientId && planMensualId && planAnualId);
  const esProSuscripto = cuenta?.plan?.esPro && cuenta.plan.plan === "PRO" && cuenta.plan.estado === "activa";
  const planId = periodo === "mensual" ? planMensualId : planAnualId;

  async function terminar(promesa: Promise<{ ok: boolean }>) {
    setEstado("procesando");
    try {
      const r = await promesa;
      if (!r.ok) throw new Error();
      setEstado("exito");
      setTimeout(() => router.push("/perfil"), 1500);
    } catch {
      setEstado("error");
    }
  }

  function accionPago(tipo: "pase" | "pro") {
    if (!configurado || !clientId) return <BotonNeutro>{p.muyPronto}</BotonNeutro>;
    if (!cuenta) return <BotonNeutro>…</BotonNeutro>;
    if (!cuenta.usuarioId) return <BotonNeutro href="/login?next=/planes">{p.entrarParaComprar}</BotonNeutro>;
    if (tipo === "pro" && esProSuscripto) return <BotonNeutro>{p.tuPlanActual}</BotonNeutro>;
    if (tipo === "pase" && esProSuscripto) return null;
    if (tipo === "pro" && planId)
      return (
        <BotonSuscripcionPayPal
          key={planId}
          clientId={clientId}
          planId={planId}
          usuarioId={cuenta.usuarioId}
          onAprobado={(id) => terminar(confirmarSuscripcion(id))}
          onError={() => setEstado("error")}
        />
      );
    return (
      <BotonPagoPayPal
        clientId={clientId}
        crearOrden={async () => {
          const r = await iniciarPase();
          if (!r.id) throw new Error(r.error);
          return r.id;
        }}
        onAprobado={(id) => terminar(completarPase(id))}
        onError={() => setEstado("error")}
      />
    );
  }

  const aviso = motivo === "alertas" ? p.avisoLimite.alertas : motivo === "seguimientos" ? p.avisoLimite.seguimientos : null;
  const mensajeEstado = estado === "procesando" ? p.procesando : estado === "exito" ? p.exito : estado === "error" ? p.error : null;

  const tarjetas = [
    {
      clave: "gratis",
      nombre: p.gratis.nombre,
      descripcion: p.gratis.descripcion,
      precio: <Precio valor="US$0" sufijo="" />,
      nota: null as string | null,
      items: p.gratis.items,
      destacada: false,
      accion:
        cuenta?.usuarioId && !cuenta.plan?.esPro ? (
          <BotonNeutro>{p.tuPlanActual}</BotonNeutro>
        ) : cuenta?.usuarioId ? null : (
          <BotonNeutro href="/login?next=/planes">{p.gratis.cta}</BotonNeutro>
        ),
    },
    {
      clave: "pase",
      nombre: p.pase.nombre,
      descripcion: p.pase.descripcion,
      precio: <Precio valor={`US$${PRECIOS.pase60}`} sufijo="" />,
      nota: p.pagoUnico(PRECIOS.diasPase),
      items: p.pase.items,
      destacada: false,
      accion: accionPago("pase"),
    },
    {
      clave: "pro",
      nombre: p.pro.nombre,
      descripcion: p.pro.descripcion,
      precio:
        periodo === "mensual" ? (
          <Precio valor={`US$${PRECIOS.proMensual}`} sufijo={p.porMes} />
        ) : (
          <Precio valor={`US$${PRECIOS.proAnual}`} sufijo={p.porAnio} />
        ),
      nota: periodo === "mensual" ? p.prueba(PRECIOS.diasPrueba) : p.ahorroAnual,
      items: p.pro.items,
      destacada: true,
      accion: accionPago("pro"),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 w-full flex flex-col gap-12">
      <header className="flex flex-col gap-3 max-w-3xl">
        <Eyebrow>{p.eyebrow}</Eyebrow>
        <h1 className="font-display font-extrabold uppercase leading-[0.95]" style={{ fontSize: "clamp(40px,6vw,64px)", textWrap: "balance" }}>
          {p.titulo}
        </h1>
        <p className="text-base leading-relaxed" style={{ color: "var(--wr-mut)" }}>
          {p.subtitulo}
        </p>
      </header>

      {aviso && (
        <div className="rounded-2xl px-5 py-4 text-sm" style={{ border: "1px solid var(--wr-acc)", background: "color-mix(in srgb, var(--wr-acc) 10%, var(--wr-panel))", color: "var(--wr-ink)" }}>
          {aviso}
        </div>
      )}

      <div className="flex flex-col gap-5">
        <div className="self-start flex rounded-full p-1 wr-panel" role="tablist">
          {(["mensual", "anual"] as const).map((op) => (
            <button
              key={op}
              type="button"
              role="tab"
              aria-selected={periodo === op}
              onClick={() => setPeriodo(op)}
              className="rounded-full px-5 py-2 text-sm font-semibold"
              style={{ background: periodo === op ? "var(--wr-acc)" : "transparent", color: periodo === op ? "var(--wr-acc-ink)" : "var(--wr-mut)" }}
            >
              {op === "mensual" ? p.mensual : `${p.anual} · ${p.ahorroAnual}`}
            </button>
          ))}
        </div>

        {mensajeEstado && (
          <div
            className="rounded-2xl px-5 py-4 text-sm font-semibold"
            role="status"
            style={{
              background: estado === "error" ? "#EF444422" : estado === "exito" ? "#16A34A22" : "var(--wr-panel-2)",
              color: estado === "error" ? "#EF4444" : estado === "exito" ? "#16A34A" : "var(--wr-ink)",
            }}
          >
            {mensajeEstado}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {tarjetas.map((c) => (
            <section
              key={c.clave}
              className="relative rounded-3xl p-6 flex flex-col gap-5"
              style={{
                background: c.destacada ? "color-mix(in srgb, var(--wr-acc) 7%, var(--wr-panel))" : "var(--wr-panel)",
                border: `1px solid ${c.destacada ? "var(--wr-acc)" : "var(--wr-line)"}`,
              }}
            >
              {c.destacada && (
                <span className="absolute -top-3 left-6 rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em]" style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}>
                  {p.masElegido}
                </span>
              )}
              <div className="flex flex-col gap-1.5">
                <h2 className="font-display font-extrabold text-2xl uppercase">{c.nombre}</h2>
                <p className="text-sm" style={{ color: "var(--wr-mut)" }}>
                  {c.descripcion}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                {c.precio}
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] min-h-4" style={{ color: c.destacada ? "var(--wr-acc)" : "var(--wr-mut)" }}>
                  {c.nota ?? ""}
                </span>
              </div>
              <ul className="flex flex-col gap-2.5 flex-1">
                {c.items.map((it) => (
                  <li key={it} className="flex gap-2.5 text-sm leading-snug" style={{ color: "var(--wr-ink)" }}>
                    <Tilde />
                    {it}
                  </li>
                ))}
              </ul>
              <div className="min-h-[52px] flex flex-col justify-end">{c.accion}</div>
            </section>
          ))}
        </div>
        <p className="text-xs" style={{ color: "var(--wr-mut)" }}>
          {p.cancelarNota}
        </p>
      </div>

      <section className="flex flex-col gap-5">
        <h2 className="font-display font-extrabold text-3xl uppercase">{p.comoFuncionaTitulo}</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {p.pasos.map((paso, i) => (
            <li key={paso.titulo} className="rounded-2xl wr-panel p-5 flex flex-col gap-2">
              <span className="font-mono text-xs tracking-[0.12em]" style={{ color: "var(--wr-acc)" }}>
                {i + 1}
              </span>
              <span className="font-semibold" style={{ color: "var(--wr-ink)" }}>
                {paso.titulo}
              </span>
              <span className="text-sm leading-relaxed" style={{ color: "var(--wr-mut)" }}>
                {paso.texto}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3 max-w-3xl">
        <h2 className="font-display font-extrabold text-3xl uppercase">{p.preguntasTitulo}</h2>
        <div className="rounded-2xl wr-panel px-5">
          {p.preguntas.map((q, i) => (
            <details key={q.p} className="group py-4" style={i > 0 ? { borderTop: "1px solid var(--wr-line)" } : undefined}>
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-sm font-semibold" style={{ color: "var(--wr-ink)" }}>
                {q.p}
                <span className="font-mono text-base transition-transform group-open:rotate-45" style={{ color: "var(--wr-acc)" }} aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--wr-mut)" }}>
                {q.r}
              </p>
            </details>
          ))}
        </div>
      </section>

      <p className="text-xs" style={{ color: "var(--wr-mut)" }}>
        {p.pie}{" "}
        <Link href="/terminos" className="underline">
          {p.terminos}
        </Link>{" "}
        ·{" "}
        <Link href="/privacidad" className="underline">
          {p.privacidad}
        </Link>
      </p>
    </div>
  );
}
