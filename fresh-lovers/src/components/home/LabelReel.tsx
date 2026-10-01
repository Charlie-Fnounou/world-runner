"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";

type Item = {
  src: string;
  w: number;
  h: number;
  name: string;
  flavour: string;
  href: string;
  bg: string;
  ink: string;
  round?: boolean;
};

/** Real label artwork from Canva (public/labels). */
const items: Item[] = [
  { src: "/labels/griego-natural.webp", w: 316, h: 632, name: "Yogurt Griego", flavour: "natural", href: "/productos/yogurt-griego?v=0", bg: "#C3D2E1", ink: "#1F3550" },
  { src: "/labels/labne.webp", w: 447, h: 447, name: "Labne", flavour: "266 ml", href: "/productos/labne", bg: "#5B60D6", ink: "#FFFFFF", round: true },
  { src: "/labels/granola-original.webp", w: 282, h: 706, name: "Granola", flavour: "the original", href: "/productos/granola?v=0", bg: "#E9D8C4", ink: "#6E3B3C" },
  { src: "/labels/olivas-spicy.webp", w: 258, h: 403, name: "Spicy Olives", flavour: "10 oz", href: "/productos/aceitunas-condimentadas?v=1", bg: "#C3C59A", ink: "#2E3517" },
  { src: "/labels/griego-fresa.webp", w: 316, h: 632, name: "Yogurt Griego", flavour: "fresa", href: "/productos/yogurt-griego?v=2", bg: "#F6C3CB", ink: "#7A1F33" },
  { src: "/labels/labne-zaatar.webp", w: 447, h: 447, name: "Labne", flavour: "con za'atar", href: "/productos/labne?v=1", bg: "#A3B05A", ink: "#1F2A0C", round: true },
  { src: "/labels/pouch-fresa-banana.webp", w: 282, h: 574, name: "Yogurt con probióticos", flavour: "fresa - banana", href: "/productos/yogurt-en-pouch?v=3", bg: "#F8E7A8", ink: "#5C3A06" },
  { src: "/labels/ricotta.webp", w: 447, h: 447, name: "Ricotta", flavour: "266 ml", href: "/productos/ricotta", bg: "#5FB3B0", ink: "#08302E", round: true },
  { src: "/labels/granola-choco-chips.webp", w: 282, h: 706, name: "Granola", flavour: "choco chips", href: "/productos/granola?v=1", bg: "#CFE3E6", ink: "#174A55" },
  { src: "/labels/griego-blueberry.webp", w: 316, h: 632, name: "Yogurt Griego", flavour: "blueberry", href: "/productos/yogurt-griego?v=4", bg: "#BFC6EC", ink: "#2E3A8A" },
  { src: "/labels/fruta-manzana-roja.webp", w: 374, h: 534, name: "Fruta seca", flavour: "manzana roja", href: "/productos/fruta-seca?v=0", bg: "#F3D9C9", ink: "#7A1A1E" },
  { src: "/labels/dip-aceituna.webp", w: 447, h: 447, name: "Dip Aceituna", flavour: "180 ml", href: "/productos/dip-aceituna", bg: "#D3C64A", ink: "#2E3517", round: true },
  { src: "/labels/olivas-greek.webp", w: 258, h: 403, name: "Greek Olives", flavour: "10 oz", href: "/productos/aceitunas-condimentadas?v=3", bg: "#BFC79E", ink: "#2E3517" },
];

function Card({ it, n, progress }: { it: Item; n: number; progress: MotionValue<number> }) {
  // each label drifts a little against the track for depth
  const drift = useTransform(progress, [0, 1], [n % 2 ? 24 : -24, n % 2 ? -24 : 24]);
  const tilt = useTransform(progress, [0, 1], [n % 2 ? -3 : 3, n % 2 ? 3 : -3]);
  return (
    <Link
      href={it.href}
      draggable={false}
      className="group relative flex h-full w-[78vw] shrink-0 flex-col justify-between overflow-hidden rounded-[2rem] p-5 sm:w-[46vw] md:w-[30vw] md:p-7"
      style={{ backgroundColor: it.bg, color: it.ink }}
    >
      <p className="kicker opacity-70">{String(n + 1).padStart(2, "0")}</p>
      <motion.div style={{ y: drift, rotate: tilt }} className="relative mx-auto flex h-[62%] w-full items-center justify-center">
        <Image
          src={it.src}
          alt={`Etiqueta ${it.name} ${it.flavour}`}
          width={it.w}
          height={it.h}
          sizes="(min-width: 768px) 30vw, 78vw"
          className={`h-full w-auto max-w-full object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,0.22)] transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.04] ${
            it.round ? "aspect-square rounded-full object-cover" : "rounded-md"
          }`}
        />
      </motion.div>
      <div>
        <p className="text-[1.05rem] leading-tight">{it.name}</p>
        <p className="font-display text-[2rem] italic leading-none md:text-[2.4rem]">{it.flavour}</p>
      </div>
    </Link>
  );
}

/**
 * Reel-style sequence: vertical scroll drives a horizontal track of real labels.
 * The section is pinned while the track crosses the screen; scrolling stays native.
 * With reduced motion it becomes a plain horizontal swipe rail.
 */
export function LabelReel() {
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
          Nuestras <em>etiquetas</em>
        </h2>
        <div className="no-scrollbar mt-10 flex h-[70svh] gap-4 overflow-x-auto px-[var(--gutter)]">
          {items.map((it, n) => (
            <Card key={it.src} it={it} n={n} progress={scrollYProgress} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={section}
      aria-labelledby="reel-title"
      className="relative bg-paper"
      style={{ height: `calc(100svh + ${distance}px)` }}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">
        {/* giant outline word moving against the cards */}
        <motion.p
          aria-hidden="true"
          style={{ x: wordX, WebkitTextStroke: "1px rgba(20,18,16,.18)" }}
          className="font-display pointer-events-none absolute bottom-[4svh] left-0 whitespace-nowrap text-[28vw] italic leading-none text-transparent md:text-[18vw]"
        >
          calidad y sabor · calidad y sabor ·
        </motion.p>

        <div className="gutter relative z-10 flex items-end justify-between gap-6 pt-20 md:pt-24">
          <div>
            <p className="kicker text-ink/55">Etiquetas reales · desliza ↓</p>
            <h2 id="reel-title" className="font-display mt-2 text-[12vw] leading-[0.85] tracking-[-0.02em] md:text-[5.6vw]">
              Nuestras <em>etiquetas</em>
            </h2>
          </div>
          <p className="kicker shrink-0 text-ink/55" aria-live="polite">
            {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </p>
        </div>

        <div className="relative z-10 flex flex-1 items-center py-6">
          <motion.div ref={track} style={{ x }} className="flex h-[62svh] gap-3 px-[var(--gutter)] md:h-[64svh] md:gap-5">
            {items.map((it, n) => (
              <Card key={it.src} it={it} n={n} progress={smooth} />
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
