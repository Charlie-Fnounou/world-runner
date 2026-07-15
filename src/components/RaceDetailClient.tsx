"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Carrera } from "@/lib/types";
import { Badge } from "./Badge";
import { Countdown } from "./Countdown";
import { ElevationChart } from "./ElevationChart";
import { useFavoritos } from "@/hooks/useFavoritos";
import { useAlertas } from "@/hooks/useAlertas";
import { marcarCompletada, quitarCompletada, obtenerCompletadaInicial } from "@/app/actions/completadas";
import { ResenaForm } from "./ResenaForm";
import { ResenasList } from "./ResenasList";
import { fmtFecha, nf } from "@/lib/format";

// Algunos collectors traen la URL del sitio oficial tal cual la publica la
// fuente, que a veces viene mal escrita (ej. "http//;sitio.com" en vez de
// "http://sitio.com"). new URL() tira si el string no es una URL válida —
// eso no puede tumbar el build de 2000+ páginas por un solo dato sucio.
function hostnameDe(web: string): string {
  try {
    return new URL(web).hostname;
  } catch {
    return web.replace(/^https?:?\/*/i, "").split(/[/?#]/)[0] || web;
  }
}

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

export function RaceDetailClient({ r }: { r: Carrera }) {
  const { favoritos, alternar } = useFavoritos();
  const { activa: alertaActiva, alternar: alternarAlerta } = useAlertas(r.id);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [completada, setCompletada] = useState(false);
  const [tiempo, setTiempo] = useState("");
  const [pendingCompletada, startTransitionCompletada] = useTransition();
  const router = useRouter();
  const fav = favoritos.has(r.id);

  useEffect(() => {
    obtenerCompletadaInicial(r.id).then(setCompletada);
  }, [r.id]);

  function alternarCompletada() {
    if (completada) {
      setCompletada(false);
      startTransitionCompletada(async () => {
        const res = await quitarCompletada(r.id);
        if (!res.ok) setCompletada(true);
      });
      return;
    }
    setCompletada(true);
    startTransitionCompletada(async () => {
      const res = await marcarCompletada(r.id, tiempo || undefined);
      if (!res.ok) {
        setCompletada(false);
        if (res.error === "no-auth") router.push("/login");
      }
    });
  }

  const cta =
    r.status === "cerrada"
      ? "Sitio oficial ↗"
      : r.status === "sorteo"
        ? "Entrar al sorteo ↗"
        : r.status === "proximamente"
          ? "Ver convocatoria ↗"
          : "Inscribirse ahora ↗";

  // Varios collectors nuevos no traen distancia, precio, desnivel,
  // corredores o clima exactos (la fuente no los publica): "0 km", "$0" o
  // "0 m" sería engañoso, mejor un guion.
  const distanciaTexto = r.km > 0 ? r.km + " km" : "—";
  const precioTexto = r.price > 0 ? r.cur + nf(r.price) : "—";
  const corredoresTexto = r.runners > 0 ? nf(r.runners) : "—";
  const desnivelTexto = r.elev > 0 ? nf(r.elev) + " m" : "—";
  const tempTexto = r.temp !== 0 ? r.temp + " °C" : "—";

  const datos: [string, string][] = [
    ["Distancia", distanciaTexto],
    ["Precio desde", precioTexto],
    ["Corredores", corredoresTexto],
    ["Desnivel +", desnivelTexto],
    ["Temp. promedio", tempTexto],
    ["Tiempo límite", r.limit || "—"],
    ["Dificultad", "●".repeat(r.diff) + "○".repeat(5 - r.diff)],
    ["Valoración", r.rating > 0 ? "★ " + r.rating + " (" + nf(r.nrev) + ")" : "Sin valoraciones"],
  ];

  const done = Object.values(checks).filter(Boolean).length;

  return (
    <div className="max-w-5xl mx-auto px-4 pb-16 w-full">
      <button
        onClick={() => router.back()}
        className="mt-4 mb-3 inline-block text-sm font-medium hover:opacity-70"
        style={{ color: "var(--wr-mut)" }}
      >
        ← Volver
      </button>

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
            {r.km > 0 && <span className="text-xs bg-white/15 rounded-full px-3 py-1">{r.km} km</span>}
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
                onClick={alternarAlerta}
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

          {r.profile.length > 1 && (
            <section className="rounded-2xl p-5 wr-panel">
              <h3 className="font-bold mb-1">Perfil de elevación</h3>
              <p className="text-xs mb-3" style={{ color: "var(--wr-mut)" }}>
                Desnivel positivo acumulado: {nf(r.elev)} m
              </p>
              <ElevationChart profile={r.profile} color={r.g[0]} />
            </section>
          )}

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
            <h3 className="font-bold mb-3">¿Ya la corriste?</h3>
            {completada ? (
              <button
                onClick={alternarCompletada}
                disabled={pendingCompletada}
                className="rounded-full px-4 py-2.5 text-sm font-semibold w-full"
                style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
              >
                ✅ Marcada como corrida · quitar
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  value={tiempo}
                  onChange={(e) => setTiempo(e.target.value)}
                  placeholder="Tu tiempo (opcional), ej. 3:45:12"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none wr-chip"
                  style={{ color: "var(--wr-ink)" }}
                />
                <button
                  onClick={alternarCompletada}
                  disabled={pendingCompletada}
                  className="rounded-full px-4 py-2.5 text-sm font-semibold w-full wr-chip"
                  style={{ color: "var(--wr-ink)" }}
                >
                  Marcar como corrida
                </button>
              </div>
            )}
          </section>

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
                    {hostnameDe(r.web)}
                  </a>
                </dd>
              </div>
            </dl>
            <Link
              href={`/proponer?eventoId=${r.id}&nombre=${encodeURIComponent(r.name)}`}
              className="inline-block mt-3 text-xs hover:underline"
              style={{ color: "var(--wr-mut)" }}
            >
              ⚠️ Reportar un error en esta carrera
            </Link>
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

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <section className="rounded-2xl p-5 wr-panel">
          <h3 className="font-bold mb-3">Dejá tu reseña</h3>
          <ResenaForm eventoId={r.id} />
        </section>
        <section className="rounded-2xl p-5 wr-panel md:col-span-2">
          <h3 className="font-bold mb-3">Reseñas de corredores</h3>
          <ResenasList eventoId={r.id} />
        </section>
      </div>
    </div>
  );
}
