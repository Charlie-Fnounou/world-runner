"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarResena, obtenerMiResena, type DatosResena } from "@/app/actions/resenas";

const CATEGORIAS: { campo: keyof Omit<DatosResena, "comentario">; label: string }[] = [
  { campo: "organizacion", label: "Organización" },
  { campo: "paisajes", label: "Paisajes" },
  { campo: "dificultad", label: "Dificultad" },
  { campo: "medalla", label: "Medalla" },
  { campo: "camiseta", label: "Camiseta" },
  { campo: "hidratacion", label: "Hidratación" },
  { campo: "expo", label: "Expo del corredor" },
  { campo: "seguridad", label: "Seguridad" },
  { campo: "calidadPrecio", label: "Calidad/precio" },
];

const VACIO: DatosResena = {
  organizacion: 0,
  paisajes: 0,
  dificultad: 0,
  medalla: 0,
  camiseta: 0,
  hidratacion: 0,
  expo: 0,
  seguridad: 0,
  calidadPrecio: 0,
  comentario: "",
};

function Estrellas({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="text-lg leading-none hover:scale-110 transition-transform"
          aria-label={`${n} estrellas`}
        >
          {n <= valor ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

export function ResenaForm({ eventoId }: { eventoId: string }) {
  const [datos, setDatos] = useState<DatosResena>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [pending, startTransition] = useTransition();
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    obtenerMiResena(eventoId).then((r) => {
      if (r) setDatos(r);
      setCargando(false);
    });
  }, [eventoId]);

  function enviar() {
    const faltantes = CATEGORIAS.filter((c) => datos[c.campo] < 1);
    if (faltantes.length > 0) {
      setError("Calificá todas las categorías antes de enviar.");
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await guardarResena(eventoId, datos);
      if (!res.ok) {
        if (res.error === "no-auth") {
          router.push("/login");
          return;
        }
        setError("No pudimos guardar tu reseña. Intenta de nuevo.");
        return;
      }
      setEnviado(true);
    });
  }

  if (cargando) return null;

  if (enviado) {
    return (
      <div className="rounded-xl p-4 text-sm wr-chip" style={{ color: "var(--wr-ink)" }}>
        ✅ ¡Gracias por tu reseña! Ya se sumó al promedio de esta carrera.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
        {CATEGORIAS.map((c) => (
          <div key={c.campo} className="flex items-center justify-between gap-2">
            <span className="text-sm" style={{ color: "var(--wr-mut)" }}>
              {c.label}
            </span>
            <Estrellas valor={datos[c.campo]} onChange={(v) => setDatos((d) => ({ ...d, [c.campo]: v }))} />
          </div>
        ))}
      </div>
      <textarea
        value={datos.comentario}
        onChange={(e) => setDatos((d) => ({ ...d, comentario: e.target.value }))}
        rows={3}
        placeholder="Contá tu experiencia (opcional)"
        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none wr-chip"
        style={{ color: "var(--wr-ink)" }}
      />
      {error && (
        <p className="text-xs" style={{ color: "#EF4444" }}>
          {error}
        </p>
      )}
      <button
        onClick={enviar}
        disabled={pending}
        className="rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
      >
        {pending ? "Guardando…" : "Publicar reseña"}
      </button>
    </div>
  );
}
