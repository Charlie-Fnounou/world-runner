"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarResena, obtenerMiResena, type DatosResena } from "@/app/actions/resenas";
import { useIdioma } from "./LanguageProvider";

const CAMPOS: (keyof Omit<DatosResena, "comentario">)[] = [
  "organizacion",
  "paisajes",
  "dificultad",
  "medalla",
  "camiseta",
  "hidratacion",
  "expo",
  "seguridad",
  "calidadPrecio",
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

function Estrellas({ valor, onChange, aria }: { valor: number; onChange: (v: number) => void; aria: (n: number) => string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="text-lg leading-none hover:scale-110 transition-transform"
          aria-label={aria(n)}
        >
          {n <= valor ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

export function ResenaForm({ eventoId }: { eventoId: string }) {
  const { t } = useIdioma();
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
    const faltantes = CAMPOS.filter((campo) => datos[campo] < 1);
    if (faltantes.length > 0) {
      setError(t.resena.errorFaltantes);
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
        setError(t.resena.errorGuardar);
        return;
      }
      setEnviado(true);
    });
  }

  if (cargando) return null;

  if (enviado) {
    return (
      <div className="rounded-xl p-4 text-sm wr-chip" style={{ color: "var(--wr-ink)" }}>
        {t.resena.gracias}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
        {CAMPOS.map((campo) => (
          <div key={campo} className="flex items-center justify-between gap-2">
            <span className="text-sm" style={{ color: "var(--wr-mut)" }}>
              {t.resena.categorias[campo]}
            </span>
            <Estrellas valor={datos[campo]} onChange={(v) => setDatos((d) => ({ ...d, [campo]: v }))} aria={t.resena.estrellasAria} />
          </div>
        ))}
      </div>
      <textarea
        value={datos.comentario}
        onChange={(e) => setDatos((d) => ({ ...d, comentario: e.target.value }))}
        rows={3}
        placeholder={t.resena.comentarioPlaceholder}
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
        {pending ? t.resena.guardando : t.resena.publicar}
      </button>
    </div>
  );
}
