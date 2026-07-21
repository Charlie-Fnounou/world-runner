"use client";

import { ESTADO_INFO, type EstadoInscripcion } from "@/lib/types";
import { traducirEstado } from "@/lib/i18n";
import { useIdioma } from "./LanguageProvider";

export function Badge({ estado, sm }: { estado: EstadoInscripcion; sm?: boolean }) {
  const { idioma } = useIdioma();
  const info = ESTADO_INFO[estado];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap"
      style={{
        background: info.color + "1c",
        color: info.color,
        fontSize: sm ? 11 : 12,
        padding: sm ? "3px 9px" : "4px 12px",
      }}
    >
      <span className="relative flex" style={{ width: 7, height: 7 }}>
        {info.pulse && (
          <span
            className="wr-pulse absolute inline-flex h-full w-full rounded-full"
            style={{ background: info.color, opacity: 0.5 }}
          />
        )}
        <span className="relative inline-flex rounded-full" style={{ width: 7, height: 7, background: info.color }} />
      </span>
      {traducirEstado(estado, idioma)}
    </span>
  );
}
