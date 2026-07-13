"use client";

import { useState, useTransition } from "react";
import type { Carrera } from "@/lib/types";
import { RaceCard } from "./RaceCard";
import { useFavoritos } from "@/hooks/useFavoritos";
import { preguntarAsistente, type RespuestaAsistente } from "@/app/actions/asistente";

const EJEMPLOS = [
  "Quiero correr una media maratón en octubre por menos de $150",
  "Un maratón plano y fresco para hacer mi mejor marca en 2027",
  "Quiero correr 4 carreras este año gastando poco, cerca de Latinoamérica",
  "Recomiéndame un trail épico para mi primera ultra",
];

export function AsistenteClient({ carreras, favoritosIniciales }: { carreras: Carrera[]; favoritosIniciales: string[] }) {
  const { favoritos, alternar } = useFavoritos(favoritosIniciales);
  const [q, setQ] = useState("");
  const [pending, startTransition] = useTransition();
  const [res, setRes] = useState<RespuestaAsistente | null>(null);
  const [err, setErr] = useState("");

  function preguntar(texto?: string) {
    const query = texto ?? q;
    if (!query.trim() || pending) return;
    setErr("");
    setRes(null);
    startTransition(async () => {
      const resultado = await preguntarAsistente(query);
      if (!resultado.ok) {
        setErr(
          resultado.error === "no-configurado"
            ? "El asistente todavía no está activado. Hace falta configurar la clave de la IA."
            : "No pude consultar al asistente en este momento. Inténtalo de nuevo.",
        );
        return;
      }
      setRes(resultado.data);
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 w-full">
      <h1 className="font-display font-bold uppercase mt-6 mb-1" style={{ color: "var(--wr-ink)", fontSize: 30 }}>
        Asistente IA
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--wr-mut)" }}>
        Describe tu objetivo con tus palabras y el asistente elegirá las mejores carreras usando todos los datos de
        la plataforma.
      </p>

      <div className="rounded-2xl p-3 flex items-end gap-2 wr-panel">
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              preguntar();
            }
          }}
          placeholder="p. ej. «Quiero bajar de 3:30 en maratón: busco algo plano, fresco y con inscripción abierta»"
          className="flex-1 bg-transparent outline-none text-sm resize-none"
          style={{ color: "var(--wr-ink)" }}
        />
        <button
          onClick={() => preguntar()}
          disabled={pending}
          className="rounded-xl px-5 py-2.5 font-bold text-sm shrink-0 disabled:opacity-50"
          style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
        >
          {pending ? "Pensando…" : "Preguntar"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {EJEMPLOS.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setQ(ex);
              preguntar(ex);
            }}
            className="rounded-full px-3.5 py-1.5 text-xs text-left hover:opacity-80 wr-chip"
            style={{ color: "var(--wr-mut)" }}
          >
            💬 {ex}
          </button>
        ))}
      </div>

      {pending && (
        <div className="mt-6 rounded-2xl p-8 text-center wr-panel">
          <div className="text-2xl animate-pulse">🏃‍♀️💨</div>
          <p className="text-sm mt-2" style={{ color: "var(--wr-mut)" }}>
            Analizando fechas, precios, clima y desniveles…
          </p>
        </div>
      )}

      {err && (
        <div className="mt-6 rounded-2xl p-5 text-sm wr-panel" style={{ border: "1px solid #EF4444", color: "var(--wr-ink)" }}>
          ⚠️ {err}
        </div>
      )}

      {res && (
        <div className="mt-6">
          <div className="rounded-2xl p-5 mb-4 wr-panel" style={{ border: "1px solid var(--wr-acc)55" }}>
            <p className="text-sm leading-relaxed" style={{ color: "var(--wr-ink)" }}>
              🤖 {res.intro}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {res.recs.map((rec) => {
              const r = carreras.find((x) => x.id === rec.id);
              if (!r) return null;
              return (
                <div key={rec.id} className="flex flex-col gap-2">
                  <RaceCard r={r} favorito={favoritos.has(r.id)} onFavorito={alternar} />
                  <p className="text-xs px-1" style={{ color: "var(--wr-mut)" }}>
                    💡 {rec.reason}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
