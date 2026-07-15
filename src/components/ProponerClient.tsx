"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { proponerCarrera, reportarError } from "@/app/actions/comunidad";

type Tab = "carrera" | "error";

function Campo({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium" style={{ color: "var(--wr-ink)" }}>
        {label}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={placeholder}
          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none wr-chip"
          style={{ color: "var(--wr-ink)" }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none wr-chip"
          style={{ color: "var(--wr-ink)" }}
        />
      )}
    </label>
  );
}

function FormularioCarrera() {
  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [pais, setPais] = useState("");
  const [fecha, setFecha] = useState("");
  const [sitioWeb, setSitioWeb] = useState("");
  const [comentario, setComentario] = useState("");
  const [pending, startTransition] = useTransition();
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  function enviar() {
    setError("");
    startTransition(async () => {
      const res = await proponerCarrera({ nombre, ciudad, pais, fecha, sitioWeb, comentario });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEnviado(true);
    });
  }

  if (enviado) {
    return (
      <div className="rounded-xl p-5 text-sm wr-chip" style={{ color: "var(--wr-ink)" }}>
        ✅ ¡Gracias! Un admin va a revisar la propuesta y la va a publicar apenas la verifique.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Campo label="Nombre de la carrera" value={nombre} onChange={setNombre} placeholder="ej. Maratón de Rosario" />
      <div className="grid sm:grid-cols-2 gap-3">
        <Campo label="Ciudad" value={ciudad} onChange={setCiudad} placeholder="ej. Rosario" />
        <Campo label="País" value={pais} onChange={setPais} placeholder="ej. Argentina" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Campo label="Fecha (si la sabés)" value={fecha} onChange={setFecha} placeholder="ej. Octubre 2026" />
        <Campo label="Sitio web oficial" value={sitioWeb} onChange={setSitioWeb} placeholder="https://…" />
      </div>
      <Campo
        label="Algo más que quieras contarnos"
        value={comentario}
        onChange={setComentario}
        placeholder="Distancias, precio, cómo te enteraste…"
        textarea
      />
      {error && (
        <p className="text-xs" style={{ color: "#EF4444" }}>
          {error}
        </p>
      )}
      <button
        onClick={enviar}
        disabled={pending}
        className="rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50 self-start"
        style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
      >
        {pending ? "Enviando…" : "Enviar propuesta"}
      </button>
    </div>
  );
}

function FormularioError({ eventoIdInicial, nombreInicial }: { eventoIdInicial: string; nombreInicial: string }) {
  const [eventoId] = useState(eventoIdInicial);
  const [eventoNombre] = useState(nombreInicial);
  const [descripcion, setDescripcion] = useState("");
  const [pending, startTransition] = useTransition();
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  function enviar() {
    setError("");
    startTransition(async () => {
      const res = await reportarError({ eventoId, eventoNombre, descripcion });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEnviado(true);
    });
  }

  if (enviado) {
    return (
      <div className="rounded-xl p-5 text-sm wr-chip" style={{ color: "var(--wr-ink)" }}>
        ✅ ¡Gracias por avisarnos! Un admin va a revisar el reporte.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {eventoNombre && (
        <p className="text-sm" style={{ color: "var(--wr-mut)" }}>
          Sobre: <strong style={{ color: "var(--wr-ink)" }}>{eventoNombre}</strong>
        </p>
      )}
      {!eventoId && (
        <p className="text-xs" style={{ color: "var(--wr-mut)" }}>
          Tip: si entrás a esta página desde el botón &ldquo;Reportar un error&rdquo; de una ficha de carrera, la
          identificamos automáticamente.
        </p>
      )}
      <Campo
        label="¿Qué está mal o desactualizado?"
        value={descripcion}
        onChange={setDescripcion}
        placeholder="ej. El precio ya cambió, la fecha está mal, el link de inscripción no funciona…"
        textarea
      />
      {error && (
        <p className="text-xs" style={{ color: "#EF4444" }}>
          {error}
        </p>
      )}
      <button
        onClick={enviar}
        disabled={pending}
        className="rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50 self-start"
        style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
      >
        {pending ? "Enviando…" : "Enviar reporte"}
      </button>
    </div>
  );
}

function ProponerContenido() {
  const params = useSearchParams();
  const eventoId = params.get("eventoId") ?? "";
  const nombre = params.get("nombre") ?? "";
  const [tab, setTab] = useState<Tab>(eventoId ? "error" : "carrera");

  return (
    <div className="max-w-2xl mx-auto px-4 pb-16 w-full">
      <h1 className="font-display font-bold uppercase mt-6 mb-1" style={{ color: "var(--wr-ink)", fontSize: 30 }}>
        Ayudanos a mejorar
      </h1>
      <p className="text-sm mb-5" style={{ color: "var(--wr-mut)" }}>
        Proponé una carrera que falte o avisanos si algo está mal. Un admin revisa cada envío antes de publicarlo.
      </p>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab("carrera")}
          className="rounded-full px-4 py-2 text-sm font-semibold"
          style={{
            background: tab === "carrera" ? "var(--wr-acc)" : "var(--wr-chip)",
            color: tab === "carrera" ? "var(--wr-acc-ink)" : "var(--wr-mut)",
          }}
        >
          Proponer carrera
        </button>
        <button
          onClick={() => setTab("error")}
          className="rounded-full px-4 py-2 text-sm font-semibold"
          style={{
            background: tab === "error" ? "var(--wr-acc)" : "var(--wr-chip)",
            color: tab === "error" ? "var(--wr-acc-ink)" : "var(--wr-mut)",
          }}
        >
          Reportar un error
        </button>
      </div>

      <div className="rounded-2xl p-5 wr-panel">
        {tab === "carrera" ? <FormularioCarrera /> : <FormularioError eventoIdInicial={eventoId} nombreInicial={nombre} />}
      </div>
    </div>
  );
}

export function ProponerClient() {
  return (
    <Suspense fallback={null}>
      <ProponerContenido />
    </Suspense>
  );
}
