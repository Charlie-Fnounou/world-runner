"use client";

import { useState, useTransition } from "react";
import type { Carrera } from "@/lib/types";
import { RaceCard } from "./RaceCard";
import { useFavoritos } from "@/hooks/useFavoritos";
import { preguntarAsistente, type RespuestaAsistente } from "@/app/actions/asistente";
import { useIdioma } from "./LanguageProvider";

export function AsistenteClient({ carreras }: { carreras: Carrera[] }) {
  const { idioma, t } = useIdioma();
  const { favoritos, alternar } = useFavoritos();
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
      const resultado = await preguntarAsistente(query, idioma);
      if (!resultado.ok) {
        setErr(resultado.error === "no-configurado" ? t.asistente.errorNoConfigurado : t.asistente.errorGenerico);
        return;
      }
      setRes(resultado.data);
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 w-full">
      <h1 className="font-display font-bold uppercase mt-6 mb-1" style={{ color: "var(--wr-ink)", fontSize: 30 }}>
        {t.asistente.titulo}
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--wr-mut)" }}>
        {t.asistente.descripcion}
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
          placeholder={t.asistente.placeholder}
          className="flex-1 bg-transparent outline-none text-sm resize-none"
          style={{ color: "var(--wr-ink)" }}
        />
        <button
          onClick={() => preguntar()}
          disabled={pending}
          className="rounded-xl px-5 py-2.5 font-bold text-sm shrink-0 disabled:opacity-50"
          style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
        >
          {pending ? t.asistente.pensando : t.asistente.preguntar}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {t.asistente.ejemplos.map((ex) => (
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
            {t.asistente.analizando}
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
