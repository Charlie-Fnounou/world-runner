"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import { photos, type PhotoKey } from "@/data/photos";

type Item = { photo: PhotoKey; name: string; detail: string; href: string; bg: string; ink: string };

/** Studio shots of the real packaging. */
const items: Item[] = [
  { photo: "studio-labne", name: "Labne", detail: "solo o con za'atar", href: "/productos/labne", bg: "#5B60D6", ink: "#FFFFFF" },
  { photo: "studio-parfait", name: "Parfait", detail: "yogurt, mermelada y granola", href: "/productos/parfait", bg: "#8E2B2B", ink: "#FFF4EE" },
  { photo: "studio-arepa-maiz-con-queso", name: "Arepas", detail: "siete maneras", href: "/productos?c=arepas", bg: "#F2C14E", ink: "#3B2406" },
  { photo: "studio-queso-prensado", name: "Queso Prensado", detail: "con sal o bajo en sal", href: "/productos/queso-prensado", bg: "#EFE3C4", ink: "#3A2E12" },
  { photo: "studio-yogurt-en-pouch", name: "Yogurt en Pouch", detail: "250 ml y Pouch de niños", href: "/productos/yogurt-en-pouch", bg: "#E9C8C0", ink: "#5C1A22" },
  { photo: "studio-granola", name: "Granola", detail: "avena integral", href: "/productos/granola", bg: "#E9D8C4", ink: "#6E3B3C" },
  { photo: "studio-yogurt-copa-especiales", name: "Yogurt Copa", detail: "chocolate · dulce de leche · mermelada", href: "/productos/yogurt-copa-especiales", bg: "#D8CFC6", ink: "#3A2A20" },
  { photo: "studio-cafe-artesanal", name: "Café Artesanal", detail: "cuenca del Canal de Panamá", href: "/productos/cafe-artesanal", bg: "#22305F", ink: "#F4EFE6" },
  { photo: "studio-aceitunas-condimentadas", name: "Aceitunas", detail: "condimentadas · 10 oz", href: "/productos/aceitunas-condimentadas", bg: "#C3C59A", ink: "#2E3517" },
  { photo: "studio-sopas", name: "Sopas", detail: "sin lácteos", href: "/productos/sopas", bg: "#E9744A", ink: "#2A0F06" },
  { photo: "studio-mix-sopero", name: "De la Finca", detail: "listo para la olla", href: "/productos?c=de-la-finca", bg: "#B7D96A", ink: "#1E3510" },
];

function Card({ it, n, progress }: { it: Item; n: number; progress: MotionValue<number> }) {
  // photo drifts inside its frame against the track direction — depth without gimmicks
  const shift = useTransform(progress, [0, 1], ["-6%", "6%"]);
  const ph = photos[it.photo];
  return (
    <Link
      href={it.href}
      draggable={false}
      className="group relative flex h-full w-[80vw] shrink-0 snap-start flex-col overflow-hidden rounded-[2rem] sm:w-[48vw] md:w-[34vw]"
      style={{ backgroundColor: it.bg, color: it.ink }}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <motion.div style={{ x: shift }} className="absolute inset-y-0 -left-[8%] -right-[8%]">
          <Image
            src={ph.src}
            alt={`${it.name} — Fresh Lovers`}
            fill
            sizes="(min-width: 768px) 38vw, 85vw"
            className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out)] group-hover:scale-[1.05]"
          />
        </motion.div>
        <span className="kicker absolute left-4 top-4 rounded-full bg-black/35 px-2.5 py-1 text-[0.6rem] text-white backdrop-blur-sm">
          {String(n + 1).padStart(2, "0")}
        </span>
      </div>
      <div className="flex items-end justify-between gap-4 p-5 md:p-6">
        <div>
          <p className="font-display text-[2rem] leading-none md:text-[2.4rem]">{it.name}</p>
          <p className="mt-1.5 text-[0.95rem] opacity-80">{it.detail}</p>
        </div>
        <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-current/40 transition-transform group-hover:translate-x-1" style={{ borderColor: "color-mix(in srgb, currentColor 40%, transparent)" }}>
          →
        </span>
      </div>
    </Link>
  );
}

/**
 * Product reel: a native horizontal rail of product photos. Page scroll is never
 * held — swipe, trackpad or the arrows move the rail, and the photos drift with it.
 */
export function ProductReel() {
  const rail = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const { scrollXProgress } = useScroll({ container: rail });
  const wordX = useTransform(scrollXProgress, [0, 1], ["0%", "-35%"]);
  const bar = useTransform(scrollXProgress, [0, 1], ["0%", "100%"]);

  useMotionValueEvent(scrollXProgress, "change", (p) =>
    setIndex(Math.min(items.length - 1, Math.round(p * (items.length - 1)))),
  );

  const step = (dir: 1 | -1) => {
    const el = rail.current;
    const card = el?.querySelector("a");
    if (!el || !card) return;
    el.scrollBy({ left: dir * (card.getBoundingClientRect().width + 16), behavior: "smooth" });
  };

  const arrow =
    "grid h-11 w-11 place-items-center rounded-full border border-ink/25 transition-colors hover:border-ink hover:bg-ink hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink";

  return (
    <section aria-labelledby="reel-title" className="relative overflow-hidden bg-paper py-20 md:py-24">
      <motion.p
        aria-hidden="true"
        style={{ x: wordX, WebkitTextStroke: "1px rgba(20,18,16,.16)" }}
        className="font-display pointer-events-none absolute bottom-6 left-0 whitespace-nowrap text-[28vw] italic leading-none text-transparent md:text-[18vw]"
      >
        calidad y sabor · calidad y sabor ·
      </motion.p>

      <div className="gutter relative z-10 flex items-end justify-between gap-6">
        <div>
          <p className="kicker text-ink/55">Productos · desliza →</p>
          <h2 id="reel-title" className="font-display mt-2 text-[12vw] leading-[0.85] tracking-[-0.02em] md:text-[5.6vw]">
            Para cada <em>antojo</em>
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="kicker text-ink/55" aria-live="polite">
            {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </p>
          <button type="button" aria-label="Anterior" onClick={() => step(-1)} disabled={index === 0} className={`${arrow} hidden md:grid`}>
            ←
          </button>
          <button type="button" aria-label="Siguiente" onClick={() => step(1)} disabled={index === items.length - 1} className={`${arrow} hidden md:grid`}>
            →
          </button>
        </div>
      </div>

      <div
        ref={rail}
        style={{ scrollPaddingInline: "var(--gutter)" }}
        className="no-scrollbar relative z-10 mt-8 flex h-[64svh] snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-[var(--gutter)] md:mt-10 md:h-[66svh] md:gap-5"
      >
        {items.map((it, n) => (
          <Card key={it.photo} it={it} n={n} progress={scrollXProgress} />
        ))}
      </div>

      <div className="gutter relative z-10 mt-6">
        <div className="h-px w-full bg-ink/15">
          <motion.div style={{ width: bar }} className="h-px bg-ink" />
        </div>
      </div>
    </section>
  );
}
