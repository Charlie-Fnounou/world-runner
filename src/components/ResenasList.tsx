"use client";

import { useEffect, useState } from "react";
import { obtenerResenas, type ResenaConUsuario } from "@/app/actions/resenas";

function fmtFechaCorta(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

export function ResenasList({ eventoId }: { eventoId: string }) {
  const [resenas, setResenas] = useState<ResenaConUsuario[] | null>(null);

  useEffect(() => {
    obtenerResenas(eventoId).then(setResenas);
  }, [eventoId]);

  if (!resenas) return null;
  if (resenas.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--wr-mut)" }}>
        Todavía no hay reseñas de esta carrera. ¡Sé el primero en dejar una!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {resenas.map((r) => (
        <div key={r.id} className="rounded-xl p-3.5 wr-chip">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-sm font-semibold" style={{ color: "var(--wr-ink)" }}>
              {r.usuarioNombre}
            </span>
            <span className="text-xs font-mono" style={{ color: "var(--wr-acc)" }}>
              ★ {r.promedio}
            </span>
          </div>
          {r.comentario && (
            <p className="text-sm mb-1.5" style={{ color: "var(--wr-ink)" }}>
              {r.comentario}
            </p>
          )}
          <span className="text-[11px]" style={{ color: "var(--wr-mut)" }}>
            {fmtFechaCorta(r.creadoEn)}
          </span>
        </div>
      ))}
    </div>
  );
}
