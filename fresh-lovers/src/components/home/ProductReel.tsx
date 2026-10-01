"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { photos, type PhotoKey } from "@/data/photos";

type Item = { photo: PhotoKey; name: string; detail: string; href: string; bg: string; ink: string };

/** Real product photography (2026 catalog). */
const items: Item[] = [
  { photo: "labne", name: "Labne", detail: "solo o con za'atar", href: "/productos/labne", bg: "#5B60D6", ink: "#FFFFFF" },
  { photo: "parfait", name: "Parfait", detail: "yogurt, mermelada y granola", href: "/productos/parfait", bg: "#8E2B2B", ink: "#FFF4EE" },
  { photo: "cover-arepas", name: "Arepas", detail: "siete maneras", href: "/productos?c=arepas", bg: "#F2C14E", ink: "#3B2406" },
  { photo: "queso-prensado", name: "Queso Prensado", detail: "con sal o bajo en sal", href: "/productos/queso-prensado", bg: "#EFE3C4", ink: "#3A2E12" },
  { photo: "pouch-250", name: "Yogurt en Pouch", detail: "ocho sabores · 250 ml", href: "/productos/yogurt-en-pouch", bg: "#E9C8C0", ink: "#5C1A22" },
  { photo: "granola", name: "Granola", detail: "avena integral", href: "/productos/granola", bg: "#E9D8C4", ink: "#6E3B3C" },
  { photo: "especiales", name: "Yogurt Copa", detail: "chocolate · dulce de leche · mermelada", href: "/productos/yogurt-copa-especiales", bg: "#D8CFC6", ink: "#3A2A20" },
  { photo: "cafe", name: "Café Artesanal", detail: "cuenca del Canal de Panamá", href: "/productos/cafe-artesanal", bg: "#22305F", ink: "#F4EFE6" },
  { photo: "olivas-spicy", name: "Aceitunas", detail: "condimentadas · 10 oz", href: "/productos/aceitunas-condimentadas", bg: "#C3C59A", ink: "#2E3517" },
  { photo: "pouches-ninos", name: "Yogurt Pouches", detail: "para loncheras", href: "/productos/yogurt-pouches-ninos", bg: "#F6C928", ink: "#3A2600" },
  { photo: "sopa-tomate", name: "Sopas", detail: "sin lácteos", href: "/productos/sopas", bg: "#E9744A", ink: "#2A0F06" },
  { photo: "finca-mix", name: "De la Finca", detail: "listo para la olla", href: "/productos?c=de-la-finca", bg: "#B7D96A", ink: "#1E3510" },
];

function Card({ it, n, progress }: { it: Item; n: number; progress: MotionValue<number> }) {
  // photo drifts inside its frame against the track direction — depth without gimmicks
  const shift = useTransform(progress, [0, 1], ["-6%", "6%"]);
  const ph = photos[it.photo];
  return (
    <Link
      href={it.href}
      draggable={false}
      className="group relative flex h-full w-[80vw] shrink-0 flex-col overflow-hidden rounded-[2rem] sm:w-[48vw] md:w-[34vw]"
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
 * Reel-style sequence: vertical scroll drives a horizontal track of product photos.
 * The section pins while the track crosses the screen; scrolling stays native.
 * With reduced motion it becomes a plain horizontal swipe rail.
 */
export function ProductReel() {
  const reduce = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const [index, setIndex] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      if (!track.current) return;
      setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const x = useTransform(smooth, [0, 1], [0, -distance]);
  const wordX = useTransform(smooth, [0, 1], ["0%", "-35%"]);
  const bar = useTransform(smooth, [0, 1], ["0%", "100%"]);

  useMotionValueEvent(scrollYProgress, "change", (p) =>
    setIndex(Math.min(items.length - 1, Math.round(p * (items.length - 1)))),
  );

  if (reduce) {
    return (
      <section aria-labelledby="reel-title" className="bg-paper py-20">
        <h2 id="reel-title" className="font-display gutter text-[14vw] leading-[0.85] md:text-[7vw]">
          De nuestra <em>cocina</em>
        </h2>
        <div className="no-scrollbar mt-10 flex h-[72svh] gap-4 overflow-x-auto px-[var(--gutter)]">
          {items.map((it, n) => (
            <Card key={it.photo} it={it} n={n} progress={scrollYProgress} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={section} aria-labelledby="reel-title" className="relative bg-paper" style={{ height: `calc(100svh + ${distance}px)` }}>
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">
        <motion.p
          aria-hidden="true"
          style={{ x: wordX, WebkitTextStroke: "1px rgba(20,18,16,.16)" }}
          className="font-display pointer-events-none absolute bottom-[3svh] left-0 whitespace-nowrap text-[28vw] italic leading-none text-transparent md:text-[18vw]"
        >
          calidad y sabor · calidad y sabor ·
        </motion.p>

        <div className="gutter relative z-10 flex items-end justify-between gap-6 pt-20 md:pt-24">
          <div>
            <p className="kicker text-ink/55">Productos · desliza ↓</p>
            <h2 id="reel-title" className="font-display mt-2 text-[12vw] leading-[0.85] tracking-[-0.02em] md:text-[5.6vw]">
              De nuestra <em>cocina</em>
            </h2>
          </div>
          <p className="kicker shrink-0 text-ink/55" aria-live="polite">
            {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </p>
        </div>

        <div className="relative z-10 flex flex-1 items-center py-6">
          <motion.div ref={track} style={{ x }} className="flex h-[64svh] gap-3 px-[var(--gutter)] md:h-[66svh] md:gap-5">
            {items.map((it, n) => (
              <Card key={it.photo} it={it} n={n} progress={smooth} />
            ))}
          </motion.div>
        </div>

        <div className="gutter relative z-10 pb-24 md:pb-8">
          <div className="h-px w-full bg-ink/15">
            <motion.div style={{ width: bar }} className="h-px bg-ink" />
          </div>
        </div>
      </div>
    </section>
  );
}
