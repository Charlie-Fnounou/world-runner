"use client";

import { useState } from "react";
import Link from "next/link";
import type { Carrera } from "@/lib/types";
import { Badge } from "./Badge";
import { Countdown } from "./Countdown";
import { useFavoritos } from "@/hooks/useFavoritos";
import { fmtFecha, nf } from "@/lib/format";

const CHECKLIST = [
  "Inscripción confirmada",
  "Pasaporte vigente",
  "Visa (si aplica)",
  "Seguro de viaje",
  "Vuelo reservado",
  "Hotel reservado",
  "Recogida de dorsal agendada",
  "Chip / dorsal",
  "Equipamiento probado",
  "Plan de hidratación",
  "Transporte a la salida",
  "Visita a la Expo",
];

export function RaceDetailClient({ r, favoritoInicial }: { r: Carrera; favoritoInicial: boolean }) {
  const { favoritos, alternar } = useFavoritos(favoritoInicial ? [r.id] : []);
  const [alertaActiva, setAlertaActiva] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const fav = favoritos.has(r.id);

  const cta =
    r.status === "cerrada"
      ? "Sitio oficial ↗"
      : r.status === "sorteo"
        ? "Entrar al sorteo ↗"
        : r.status === "proximamente"
          ? "Ver convocatoria ↗"
          : "Inscribirse ahora ↗";

  const datos: [string, string][] = [
    ["Distancia", r.km + " km"],
    ["Precio desde", r.cur + nf(r.price)],
    ["Corredores", nf(r.runners)],
    ["Desnivel +", nf(r.elev) + " m"],
    ["Temp. promedio", r.temp + " °C"],
    ["Tiempo límite", r.limit],
    ["Dificultad", "●".repeat(r.diff) + "○".repeat(5 - r.diff)],
    ["Valoración", "★ " + r.rating + " (" + nf(r.nrev) + ")"],
  ];

  const done = Object.values(checks).filter(Boolean).length;

  return (
    <div className="max-w-5xl mx-auto px-4 pb-16 w-full">
      <Link
        href="/"
        className="mt-4 mb-3 inline-block text-sm font-medium hover:opacity-70"
        style={{ color: "var(--wr-mut)" }}
      >
        ← Volver
      </Link>

      <div className="rounded-3xl overflow-hidden" style={{ background: `linear-gradient(135deg,${r.g[0]},${r.g[1]})` }}>
        <div className="p-6 md:p-10 text-white">
          <div className="flex flex-wrap items-center gap-3">
            <Badge estado={r.status} />
            {r.major && (
              <span className="text-xs font-bold uppercase tracking-widest bg-white/15 rounded-full px-3 py-1">
                ★ World Marathon Major
              </span>
            )}
            <span className="text-xs bg-white/15 rounded-full px-3 py-1">{r.type}</span>
            <span className="text-xs bg-white/15 rounded-full px-3 py-1">{r.km} km</span>
          </div>
          <h1
            className="font-display mt-4 font-bold leading-none"
            style={{ fontSize: "clamp(32px,6vw,56px)" }}
          >
            {r.name}
          </h1>
          <p className="mt-1 text-white/85 text-lg">
            {r.flag} {r.city}, {r.country} · {fmtFecha(r.date)}
          </p>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div className="rounded-2xl bg-black/25 px-5 py-4">
              <Countdown date={r.date} big light />
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={r.web}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl px-6 py-3.5 font-bold text-base transition-transform hover:scale-105"
                style={{ background: "#fff", color: r.g[1] }}
              >
                {cta}
              </a>
              <button
                onClick={() => setAlertaActiva((v) => !v)}
                title="Alertas de esta carrera"
                className="rounded-xl px-4 py-3.5 text-xl transition-colors"
                style={{ background: alertaActiva ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)" }}
              >
                {alertaActiva ? "🔔" : "🔕"}
              </button>
              <button
                onClick={() => alternar(r.id)}
                className="rounded-xl px-4 py-3.5 bg-white/15 hover:bg-white/25 text-xl"
              >
                {fav ? "❤️" : "🤍"}
              </button>
            </div>
          </div>
          {alertaActiva && (
            <p className="mt-3 text-xs text-white/80">
              🔔 Alertas activas: te avisaremos si cambia el precio, quedan pocos cupos, cambia la fecha o el
              recorrido, o abre/cierra la inscripción.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {datos.map(([l, v]) => (
          <div key={l} className="rounded-xl p-3.5 wr-panel">
            <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--wr-mut)" }}>
              {l}
            </div>
            <div className="mt-1 font-semibold font-mono tabular-nums text-[15px]" style={{ color: "var(--wr-ink)" }}>
              {v}
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-2 flex flex-col gap-4">
          <section className="rounded-2xl p-5 wr-panel">
            <h3 className="font-bold mb-2">Sobre la carrera</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--wr-mut)" }}>
              {r.desc}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs" style={{ color: "var(--wr-mut)" }}>
              {["🏅 Medalla finisher", "👕 Camiseta oficial", "💧 Hidratación en ruta", "🎪 Expo del corredor", "📸 Fotos oficiales", "🚑 Asistencia médica"].map(
                (s) => (
                  <span key={s} className="rounded-full px-3 py-1.5 wr-chip">
                    {s}
                  </span>
                ),
              )}
            </div>
          </section>

          <section className="rounded-2xl p-5 wr-panel">
            <h3 className="font-bold mb-3">Historial de ediciones</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--wr-mut)" }}>
                    <th className="pb-2 pr-4">Edición</th>
                    <th className="pb-2 pr-4">Corredores*</th>
                    <th className="pb-2">Precio*</th>
                  </tr>
                </thead>
                <tbody>
                  {r.history.map((h) => (
                    <tr key={h.y} style={{ borderTop: "1px solid var(--wr-line)" }}>
                      <td className="py-2.5 pr-4 font-semibold">{h.y}</td>
                      <td className="py-2.5 pr-4 font-mono tabular-nums">{nf(h.r)}</td>
                      <td className="py-2.5 font-mono tabular-nums">
                        {r.cur}
                        {nf(h.p)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] mt-2" style={{ color: "var(--wr-mut)" }}>
              * Estimado a partir de la edición actual. Se reemplaza por datos reales cuando los robots
              registren cada edición.
            </p>
          </section>

          <section className="rounded-2xl p-5 wr-panel">
            <h3 className="font-bold mb-3">Récords</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wider" style={{ color: "var(--wr-mut)" }}>
                  Masculino
                </div>
                <div className="font-mono mt-1">{r.recM}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider" style={{ color: "var(--wr-mut)" }}>
                  Femenino
                </div>
                <div className="font-mono mt-1">{r.recF}</div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-2xl p-5 wr-panel">
            <h3 className="font-bold mb-3">Información práctica</h3>
            <dl className="text-sm flex flex-col gap-2.5">
              <div className="flex justify-between gap-3">
                <dt style={{ color: "var(--wr-mut)" }}>Aeropuerto</dt>
                <dd className="text-right">{r.airport}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt style={{ color: "var(--wr-mut)" }}>Zona de hoteles</dt>
                <dd className="text-right">{r.hotel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt style={{ color: "var(--wr-mut)" }}>Sitio oficial</dt>
                <dd className="text-right truncate max-w-[55%]">
                  <a href={r.web} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "var(--wr-acc)" }}>
                    {new URL(r.web).hostname}
                  </a>
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl p-5 wr-panel">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Checklist del corredor</h3>
              <span className="text-xs font-mono" style={{ color: "var(--wr-mut)" }}>
                {done}/{CHECKLIST.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {CHECKLIST.map((item) => (
                <label key={item} className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!checks[item]}
                    onChange={() => setChecks((c) => ({ ...c, [item]: !c[item] }))}
                    className="w-4 h-4 rounded"
                  />
                  <span style={{ color: checks[item] ? "var(--wr-mut)" : "var(--wr-ink)", textDecoration: checks[item] ? "line-through" : "none" }}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
