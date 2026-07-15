"use client";

import { useMemo, useState } from "react";
import type { Carrera, EstadoInscripcion } from "@/lib/types";
import { ESTADO_INFO } from "@/lib/types";
import { RaceCard } from "./RaceCard";
import { useFavoritos } from "@/hooks/useFavoritos";
import { MESES_FULL } from "@/lib/format";

const HOY = new Date();
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function CalendarioClient({ carreras }: { carreras: Carrera[] }) {
  const { favoritos, alternar } = useFavoritos();
  const [anio, setAnio] = useState(HOY.getFullYear());
  const [mes, setMes] = useState(HOY.getMonth());
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);

  const navegar = (dir: number) => {
    const d = new Date(anio, mes + dir, 1);
    setAnio(d.getFullYear());
    setMes(d.getMonth());
    setDiaSeleccionado(null);
  };

  const porDia = useMemo(() => {
    const mapa = new Map<number, Carrera[]>();
    for (const r of carreras) {
      const dt = new Date(r.date + "T12:00:00");
      if (dt.getFullYear() === anio && dt.getMonth() === mes) {
        const dia = dt.getDate();
        if (!mapa.has(dia)) mapa.set(dia, []);
        mapa.get(dia)!.push(r);
      }
    }
    return mapa;
  }, [carreras, anio, mes]);

  const primerDia = new Date(anio, mes, 1);
  const offsetInicio = (primerDia.getDay() + 6) % 7; // lunes=0
  const diasDelMes = new Date(anio, mes + 1, 0).getDate();

  const carrerasDelDia = diaSeleccionado ? (porDia.get(diaSeleccionado) ?? []) : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 w-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl">Calendario mundial</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navegar(-1)} className="rounded-lg w-9 h-9 font-bold wr-chip" style={{ color: "var(--wr-ink)" }}>
            ←
          </button>
          <span className="font-semibold w-36 text-center text-sm" style={{ color: "var(--wr-ink)" }}>
            {MESES_FULL[mes]} {anio}
          </span>
          <button onClick={() => navegar(1)} className="rounded-lg w-9 h-9 font-bold wr-chip" style={{ color: "var(--wr-ink)" }}>
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-xs uppercase tracking-wider" style={{ color: "var(--wr-mut)" }}>
        {DIAS_SEMANA.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: offsetInicio }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: diasDelMes }).map((_, i) => {
          const dia = i + 1;
          const rs = porDia.get(dia) ?? [];
          const esHoy = anio === HOY.getFullYear() && mes === HOY.getMonth() && dia === HOY.getDate();
          const seleccionado = diaSeleccionado === dia;
          const estados = [...new Set(rs.map((r) => r.status))] as EstadoInscripcion[];

          return (
            <button
              key={dia}
              onClick={() => setDiaSeleccionado(rs.length ? (seleccionado ? null : dia) : null)}
              className="rounded-xl p-1.5 min-h-[64px] flex flex-col items-center gap-1.5 text-left wr-panel transition-colors"
              style={{
                border: `1px solid ${seleccionado ? "var(--wr-acc)" : esHoy ? "var(--wr-acc)66" : "var(--wr-line)"}`,
                cursor: rs.length ? "pointer" : "default",
              }}
            >
              <span className="text-[11px] font-mono self-start" style={{ color: esHoy ? "var(--wr-acc)" : "var(--wr-mut)" }}>
                {dia}
              </span>
              {rs.length > 0 && (
                <div className="flex flex-col items-center gap-1 mt-auto">
                  <div className="flex items-center gap-0.5 flex-wrap justify-center">
                    {estados.slice(0, 4).map((s) => (
                      <span key={s} className="rounded-full" style={{ width: 6, height: 6, background: ESTADO_INFO[s].color }} />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono font-semibold" style={{ color: "var(--wr-ink)" }}>
                    {rs.length}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs" style={{ color: "var(--wr-mut)" }}>
        Los colores indican el estado de inscripción. Toca un día con carreras para ver el detalle.
      </p>

      {diaSeleccionado && carrerasDelDia.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display font-bold text-xl">
            {diaSeleccionado} de {MESES_FULL[mes]} — {carrerasDelDia.length} carrera{carrerasDelDia.length !== 1 ? "s" : ""}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {carrerasDelDia.map((r) => (
              <RaceCard key={r.id} r={r} favorito={favoritos.has(r.id)} onFavorito={alternar} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
