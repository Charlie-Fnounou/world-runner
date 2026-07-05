"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Carrera } from "@/lib/types";
import { sugerir } from "@/lib/search";
import { slugify } from "@/lib/races-data";

export function SearchBar({ carreras, onQueryChange }: { carreras: Carrera[]; onQueryChange?: (q: string) => void }) {
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  const sugerencias = useMemo(() => sugerir(carreras, q, 6), [carreras, q]);

  return (
    <div className="relative w-full max-w-xl" ref={boxRef}>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setAbierto(true);
          onQueryChange?.(e.target.value);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Busca una carrera, ciudad o país (ej. medellin, maraton berlim)"
        className="w-full rounded-full px-5 py-3.5 text-sm outline-none wr-panel"
        style={{ color: "var(--wr-ink)" }}
      />
      {abierto && q.trim() && sugerencias.length > 0 && (
        <div
          className="absolute mt-2 w-full rounded-2xl overflow-hidden shadow-lg z-30 wr-panel"
          style={{ maxHeight: 320, overflowY: "auto" }}
        >
          {sugerencias.map((s) =>
            s.carrera ? (
              <button
                key={s.carrera.id}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:opacity-80 border-b last:border-b-0"
                style={{ borderColor: "var(--wr-line)" }}
                onMouseDown={() => router.push(`/carreras/${slugify(s.carrera!.id, s.carrera!.name)}`)}
              >
                <span className="text-lg">{s.carrera.flag}</span>
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--wr-ink)" }}>
                    {s.carrera.name}
                  </div>
                  <div className="text-xs" style={{ color: "var(--wr-mut)" }}>
                    {s.carrera.city}, {s.carrera.country}
                  </div>
                </div>
              </button>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
