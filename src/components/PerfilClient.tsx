"use client";

import { useTransition } from "react";
import Link from "next/link";
import type { Carrera } from "@/lib/types";
import type { CompletadaInfo } from "@/lib/completadas";
import { Countdown } from "./Countdown";
import { MapaMundialLazy } from "./MapaMundialLazy";
import { quitarCompletada } from "@/app/actions/completadas";
import { fmtFecha, diasHasta } from "@/lib/format";
import { slugify } from "@/lib/races-data";

interface Logro {
  emoji: string;
  label: string;
  ok: boolean;
}

function calcularLogros(completas: Carrera[], paises: string[], tieneResena: boolean): Logro[] {
  const distancias = new Set(completas.map((r) => r.dist));
  return [
    { emoji: "🥉", label: "Primer 10K", ok: distancias.has("10K") },
    { emoji: "🥈", label: "Primera media", ok: distancias.has("Media maratón") },
    { emoji: "🥇", label: "Primer maratón", ok: distancias.has("Maratón") },
    { emoji: "🌎", label: "5 países", ok: paises.length >= 5 },
    { emoji: "🔟", label: "10 carreras", ok: completas.length >= 10 },
    { emoji: "⭐", label: "Una Major", ok: completas.some((r) => r.major) },
    { emoji: "👑", label: "Six Star Finisher", ok: completas.filter((r) => r.major).length >= 6 },
    { emoji: "🏔️", label: "Primer trail", ok: distancias.has("Trail") },
    { emoji: "✍️", label: "Primera reseña", ok: tieneResena },
  ];
}

export function PerfilClient({
  nombre,
  email,
  corredorDesde,
  carreras,
  favoritoIds,
  alertaIds,
  completadas,
  tieneResena,
}: {
  nombre: string | null;
  email: string;
  corredorDesde: string;
  carreras: Carrera[];
  favoritoIds: string[];
  alertaIds: string[];
  completadas: CompletadaInfo[];
  tieneResena: boolean;
}) {
  const [, startTransition] = useTransition();
  const completadaIds = new Set(completadas.map((c) => c.eventoId));
  const completas = carreras.filter((r) => completadaIds.has(r.id));
  const paises = [...new Set(completas.map((r) => r.country))];
  const km = completas.reduce((s, r) => s + r.km, 0);
  const logros = calcularLogros(completas, paises, tieneResena);

  const favoritas = carreras.filter((r) => favoritoIds.includes(r.id));
  const proximas = favoritas.filter((r) => diasHasta(r.date) > 0).sort((a, b) => a.date.localeCompare(b.date));
  const alertList = carreras.filter((r) => alertaIds.includes(r.id));

  const iniciales = (nombre || email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="max-w-5xl mx-auto px-4 pb-16 w-full">
      <div className="flex items-center gap-4 mt-6 mb-5">
        <div
          className="rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold text-white shrink-0"
          style={{ background: "var(--wr-acc)" }}
        >
          {iniciales || "🏃"}
        </div>
        <div>
          <h1 className="font-display font-bold uppercase leading-none" style={{ color: "var(--wr-ink)", fontSize: 28 }}>
            {nombre || email}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--wr-mut)" }}>
            {corredorDesde ? `Corredor/a desde ${fmtFecha(corredorDesde)}` : email}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ["Carreras completadas", String(completas.length)],
          ["Km en carrera", km.toFixed(1)],
          ["Países", String(paises.length)],
          ["Favoritas", String(favoritas.length)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl p-4 wr-panel">
            <div className="font-mono font-bold text-2xl tabular-nums" style={{ color: "var(--wr-ink)" }}>
              {v}
            </div>
            <div className="text-[11px] uppercase tracking-wider mt-1" style={{ color: "var(--wr-mut)" }}>
              {l}
            </div>
          </div>
        ))}
      </div>

      {completas.length > 0 && (
        <>
          <h3 className="font-bold mt-7 mb-3" style={{ color: "var(--wr-ink)" }}>
            Mapa personal · dónde has corrido
          </h3>
          <MapaMundialLazy carreras={completas} alto={300} />
        </>
      )}

      <h3 className="font-bold mt-7 mb-3" style={{ color: "var(--wr-ink)" }}>
        Logros
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {logros.map((l) => (
          <div
            key={l.label}
            className="rounded-xl p-3.5 flex items-center gap-3 wr-panel"
            style={{ border: `1px solid ${l.ok ? "var(--wr-acc)" : "var(--wr-line)"}`, opacity: l.ok ? 1 : 0.45 }}
          >
            <span className="text-2xl">{l.emoji}</span>
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--wr-ink)" }}>
                {l.label}
              </div>
              <div className="text-[11px]" style={{ color: "var(--wr-mut)" }}>
                {l.ok ? "Desbloqueado" : "Bloqueado"}
              </div>
            </div>
          </div>
        ))}
      </div>

      {completas.length > 0 && (
        <>
          <h3 className="font-bold mt-7 mb-3" style={{ color: "var(--wr-ink)" }}>
            Carreras corridas
          </h3>
          <div className="flex flex-col gap-2">
            {completas.map((r) => {
              const info = completadas.find((c) => c.eventoId === r.id);
              return (
                <div key={r.id} className="rounded-xl p-3.5 flex items-center justify-between gap-3 wr-panel">
                  <Link href={`/carreras/${slugify(r.id, r.name)}`} className="hover:underline">
                    <div className="font-semibold text-sm" style={{ color: "var(--wr-ink)" }}>
                      {r.flag} {r.name}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--wr-mut)" }}>
                      {fmtFecha(r.date)} · {r.city}
                      {info?.tiempoFinal ? ` · ⏱ ${info.tiempoFinal}` : ""}
                    </div>
                  </Link>
                  <button
                    onClick={() =>
                      startTransition(() => {
                        quitarCompletada(r.id);
                      })
                    }
                    className="text-xs px-3 py-1.5 rounded-full wr-chip shrink-0"
                    style={{ color: "var(--wr-mut)" }}
                  >
                    Quitar
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <h3 className="font-bold mt-7 mb-3" style={{ color: "var(--wr-ink)" }}>
        Próximas carreras (tus favoritos)
      </h3>
      {proximas.length === 0 ? (
        <div className="rounded-xl p-6 text-center text-sm wr-panel" style={{ borderStyle: "dashed", color: "var(--wr-mut)" }}>
          Marca ❤️ en cualquier carrera para verla aquí con su cuenta regresiva.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {proximas.map((r) => (
            <Link
              key={r.id}
              href={`/carreras/${slugify(r.id, r.name)}`}
              className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 wr-panel hover:opacity-90"
            >
              <div>
                <div className="font-semibold" style={{ color: "var(--wr-ink)" }}>
                  {r.flag} {r.name}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--wr-mut)" }}>
                  {fmtFecha(r.date)} · {r.city}
                </div>
              </div>
              <Countdown date={r.date} />
            </Link>
          ))}
        </div>
      )}

      <h3 className="font-bold mt-7 mb-3" style={{ color: "var(--wr-ink)" }}>
        🔔 Alertas activas
      </h3>
      {alertList.length === 0 ? (
        <div className="rounded-xl p-6 text-center text-sm wr-panel" style={{ borderStyle: "dashed", color: "var(--wr-mut)" }}>
          Activa la campanita 🔔 en la ficha de una carrera para recibir avisos de apertura de inscripciones, cambios
          de precio, pocos cupos, cambios de fecha o recorrido.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {alertList.map((r) => (
            <Link
              key={r.id}
              href={`/carreras/${slugify(r.id, r.name)}`}
              className="rounded-full px-4 py-2 text-sm font-medium hover:opacity-80 wr-chip"
              style={{ color: "var(--wr-ink)" }}
            >
              🔔 {r.flag} {r.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
