"use client";

import type { Carrera } from "@/lib/types";
import type { Novedad } from "@/lib/radar";
import { preguntasDeCarrera } from "@/lib/faq";
import { useFavoritos } from "@/hooks/useFavoritos";
import { RaceCard } from "./RaceCard";
import { RadarFeed } from "./Radar";
import { useIdioma } from "./LanguageProvider";

export function RaceExtras({ r, novedades, cercanas }: { r: Carrera; novedades: Novedad[]; cercanas: Carrera[] }) {
  const { idioma, t } = useIdioma();
  const { favoritos, alternar } = useFavoritos();
  const preguntas = preguntasDeCarrera(r, idioma);

  return (
    <div className="max-w-5xl mx-auto px-4 w-full flex flex-col gap-4 pb-6">
      {novedades.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="font-bold">{t.radar.tituloFicha}</h3>
          <RadarFeed novedades={novedades} />
        </section>
      )}

      <section className="rounded-2xl p-5 wr-panel">
        <h3 className="font-bold mb-2">{t.faq.titulo}</h3>
        <div className="flex flex-col">
          {preguntas.map((q, i) => (
            <details key={q.pregunta} className="group py-3" style={i > 0 ? { borderTop: "1px solid var(--wr-line)" } : undefined}>
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-sm font-semibold" style={{ color: "var(--wr-ink)" }}>
                {q.pregunta}
                <span className="font-mono text-base transition-transform group-open:rotate-45" style={{ color: "var(--wr-acc)" }} aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--wr-mut)" }}>
                {q.respuesta}
              </p>
            </details>
          ))}
        </div>
      </section>

      {cercanas.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="font-bold">{t.faq.cercanasTitulo}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cercanas.map((c) => (
              <RaceCard key={c.id} r={c} favorito={favoritos.has(c.id)} onFavorito={alternar} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
