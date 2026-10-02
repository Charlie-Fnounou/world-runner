"use client";

import Link from "next/link";
import type { EstadisticasRadar, Novedad, TipoNovedad } from "@/lib/radar";
import type { Idioma } from "@/lib/i18n";
import { fmtFecha, nf } from "@/lib/format";
import { useIdioma } from "./LanguageProvider";

const COLOR_TIPO: Record<TipoNovedad, string> = {
  nueva: "#3b5bff",
  fecha: "#D97706",
  precio: "#7C3AED",
  pocosCupos: "#EA580C",
  cancelada: "#DC2626",
  abrio: "#16A34A",
  cerro: "#6B7280",
};

function haceCuanto(iso: string, idioma: Idioma): string {
  const seg = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(idioma, { numeric: "auto" });
  const abs = Math.abs(seg);
  if (abs < 3600) return rtf.format(Math.round(seg / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seg / 3600), "hour");
  return rtf.format(Math.round(seg / 86400), "day");
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--wr-mut)" }}>
      <span className="inline-block h-px w-5" style={{ background: "var(--wr-acc)" }} />
      {children}
    </div>
  );
}

export function RadarEstadisticas({ stats }: { stats: EstadisticasRadar }) {
  const { idioma, t } = useIdioma();
  const items: [number, string][] = [
    [stats.proximos30Dias, t.radar.stats.proximos30],
    [stats.paises, t.radar.stats.paises],
    [stats.nuevasSemana, t.radar.stats.nuevas],
    [stats.cambiosSemana, t.radar.stats.cambios],
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(([n, label]) => (
        <div key={label} className="rounded-2xl wr-panel px-4 py-4 flex flex-col gap-1">
          <span className="font-display font-extrabold text-4xl leading-none tabular-nums" style={{ color: "var(--wr-ink)" }}>
            {nf(n, idioma)}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] leading-snug" style={{ color: "var(--wr-mut)" }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function detalleDe(n: Novedad, idioma: Idioma, antesAhora: (a: string, b: string) => string): string | null {
  if (n.tipo === "fecha" && n.antes && n.despues) return antesAhora(fmtFecha(n.antes.slice(0, 10), idioma), fmtFecha(n.despues.slice(0, 10), idioma));
  if (n.tipo === "precio" && n.antes && n.despues) return antesAhora(n.antes, n.despues);
  return null;
}

export function RadarFeed({ novedades }: { novedades: Novedad[] }) {
  const { idioma, t } = useIdioma();
  if (novedades.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--wr-mut)" }}>
        {t.radar.sinNovedades}
      </p>
    );
  }
  return (
    <ul className="rounded-2xl wr-panel flex flex-col overflow-hidden">
      {novedades.map((n, i) => {
        const detalle = detalleDe(n, idioma, t.radar.antesAhora);
        return (
          <li key={n.id} style={i > 0 ? { borderTop: "1px solid var(--wr-line)" } : undefined}>
            <Link href={`/carreras/${n.slug}`} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3 group">
              <span
                className="justify-self-start rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ background: COLOR_TIPO[n.tipo] + "22", color: COLOR_TIPO[n.tipo] }}
              >
                {t.radar.tipos[n.tipo]}
              </span>
              <span className="font-mono text-[11px] text-right tabular-nums" style={{ color: "var(--wr-mut)" }} suppressHydrationWarning>
                {haceCuanto(n.cuando, idioma)}
              </span>
              <span className="col-span-2 text-sm font-semibold leading-snug group-hover:underline" style={{ color: "var(--wr-ink)" }}>
                {n.nombre}
              </span>
              <span className="col-span-2 text-xs" style={{ color: "var(--wr-mut)" }}>
                {n.bandera} {n.ciudad}, {n.pais}
                {detalle ? ` · ${detalle}` : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function RadarSeccion({ novedades, stats, conLinkTodo = true }: { novedades: Novedad[]; stats: EstadisticasRadar; conLinkTodo?: boolean }) {
  const { t } = useIdioma();
  return (
    <section className="max-w-6xl mx-auto px-4 w-full flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Eyebrow>{t.radar.eyebrow}</Eyebrow>
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl uppercase leading-none" style={{ textWrap: "balance" }}>
          {t.radar.titulo}
        </h2>
        <p className="text-sm max-w-2xl" style={{ color: "var(--wr-mut)" }}>
          {t.radar.subtitulo}
        </p>
      </div>
      <RadarEstadisticas stats={stats} />
      <RadarFeed novedades={novedades} />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: "var(--wr-mut)" }}>
          {t.radar.actualizado}
        </span>
        {conLinkTodo && (
          <Link href="/radar" className="text-sm font-semibold hover:underline" style={{ color: "var(--wr-acc)" }}>
            {t.radar.verTodo}
          </Link>
        )}
      </div>
    </section>
  );
}
