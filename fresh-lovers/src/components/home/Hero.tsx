"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import Image from "next/image";
import { ArrowIcon } from "@/components/Icons";
import { cartoucheClipPath } from "@/lib/cartouche";
import { getProduct } from "@/data/catalog";
import { photos, type PhotoKey } from "@/data/photos";
import { site } from "@/data/site";

/** Studio shots of the real packaging — one per family. */
const lineupData: { slug: string; photo: PhotoKey; caption: string }[] = [
  { slug: "yogurt-griego", photo: "studio-griego-hero", caption: "Yogurt griego" },
  { slug: "labne", photo: "studio-labne", caption: "Labne" },
  { slug: "yogurt-en-pouch", photo: "studio-yogurt-en-pouch", caption: "Yogurt en pouch" },
  { slug: "queso-prensado", photo: "studio-queso-prensado", caption: "Queso prensado" },
  { slug: "arepa-yuca-con-queso", photo: "studio-arepa-yuca-con-queso", caption: "Arepas" },
  { slug: "yosnack", photo: "studio-yosnack", caption: "YoSnack" },
  { slug: "parfait", photo: "studio-parfait", caption: "Parfait con granola" },
  { slug: "granola", photo: "studio-granola", caption: "Granola" },
  { slug: "cafe-artesanal", photo: "studio-cafe-artesanal", caption: "Café artesanal" },
];
const lineup = lineupData.map((it) => ({ ...it, product: getProduct(it.slug)! }));

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const item = lineup[i];

  const next = useCallback(() => setI((n) => (n + 1) % lineup.length), []);
  const prev = useCallback(() => setI((n) => (n - 1 + lineup.length) % lineup.length), []);

  // autoplay while visible, not hovered, and motion allowed
  useEffect(() => {
    if (reduce || paused) return;
    const el = ref.current;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    if (el) io.observe(el);
    const t = setInterval(() => visible && !document.hidden && next(), 3200);
    return () => {
      clearInterval(t);
      io.disconnect();
    };
  }, [reduce, paused, next]);

  // gentle cursor depth (desktop)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const packX = useTransform(sx, (v) => v * -14);
  const packY = useTransform(sy, (v) => v * -10);
  const typeX = useTransform(sx, (v) => v * -10);

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const darkStage = true;

  return (
    <section
      ref={ref}
      onPointerMove={onMove}
      aria-label="Fresh Lovers"
      className="grain relative flex min-h-[100svh] flex-col overflow-hidden bg-paper pt-20 md:pt-24"
    >
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <clipPath id="hero-cartouche" clipPathUnits="objectBoundingBox">
          <path d={cartoucheClipPath(0.72)} />
        </clipPath>
      </svg>

      <motion.p
        className="kicker gutter relative z-10 text-center text-ink/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 1 }}
      >
        — {site.tagline} —
      </motion.p>

      <div className="relative flex min-h-[64svh] flex-1 items-center justify-center md:min-h-0">
        {/* oversized wordmark behind the stage */}
        <motion.h1
          style={{ x: typeX }}
          className="font-display pointer-events-none absolute inset-0 z-0 select-none text-ink"
        >
          <span className="sr-only">Fresh Lovers Panamá — yogurt, quesos, labne, arepas y café</span>
          <span aria-hidden="true" className="flex h-full flex-col justify-between py-[1svh] leading-[0.8] md:flex-row md:items-center md:px-[3vw] md:py-0">
            <span className="block overflow-hidden self-start pl-[4vw] md:self-auto md:pl-0">
              <motion.span
                className="block text-[31vw] tracking-[-0.03em] md:text-[19vw]"
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 1.3, delay: 0.25, ease: EASE }}
              >
                Fresh
              </motion.span>
            </span>
            <span className="block overflow-hidden self-end pr-[4vw] md:self-auto md:pr-0">
              <motion.em
                className="block pb-[0.06em] text-[31vw] tracking-[-0.03em] md:text-[19vw]"
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 1.3, delay: 0.38, ease: EASE }}
              >
                lovers
              </motion.em>
            </span>
          </span>
        </motion.h1>

        {/* the cartouche stage */}
        <motion.div
          className="relative z-10 aspect-[0.72] w-[min(56vw,32svh)] md:w-[min(25vw,52svh)]"
          initial={{ scale: 0.55, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 1.2, ease: EASE }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <motion.div
            className="absolute inset-0"
            style={{ clipPath: "url(#hero-cartouche)" }}
            animate={{ backgroundColor: "#141210" }}
          >
            <AnimatePresence initial={false}>
              <motion.div
                key={i}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.12 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, ease: EASE }}
              >
                <motion.div style={{ x: packX, y: packY, scale: 1.08 }} className="absolute inset-0">
                  <Image
                    src={photos[item.photo].src}
                    alt={`${item.caption} — Fresh Lovers`}
                    fill
                    priority={i === 0}
                    sizes="(min-width: 768px) 30vw, 70vw"
                    className="object-cover"
                  />
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
          {/* inset rule, like the logo's inner line */}
          <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-[3.5%] h-[93%] w-[93%]" aria-hidden="true">
            <path
              d={cartoucheClipPath(0.72)}
              fill="none"
              stroke={darkStage ? "rgba(255,255,255,.55)" : "rgba(20,18,16,.35)"}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              style={{ transition: "stroke .8s" }}
            />
          </svg>
          <button
            type="button"
            onClick={next}
            className="absolute inset-0 z-10 cursor-pointer rounded-[20%] focus-visible:outline-offset-8"
            aria-label={`Siguiente producto. Ahora: ${item.caption}`}
          />
        </motion.div>
      </div>

      {/* bottom readout */}
      <div className="gutter relative z-10 grid grid-cols-1 items-end gap-5 pb-24 md:grid-cols-3 md:pb-8">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.9, ease: EASE }}
          className="max-w-[22rem] text-[1.02rem] leading-snug text-ink-2 md:text-[1.05rem]"
        >
          Yogurt griego, labne, quesos frescos, arepas y café. Hechos en La Chorrera, Panamá, desde {site.since}.
        </motion.p>

        <div className="hidden justify-center md:flex">
          <Link href="#estante" className="group inline-flex items-center gap-3 text-sm text-ink">
            <span className="grid h-11 w-11 place-items-center rounded-full border border-ink/25 transition-colors group-hover:bg-ink group-hover:text-paper">
              <ArrowIcon dir="down" />
            </span>
            Explorar
          </Link>
        </div>

        <div className="flex items-end justify-between gap-4 md:justify-end">
          <div className="min-w-0 md:text-right" aria-live="polite">
            <p className="kicker text-ink/50">
              {String(i + 1).padStart(2, "0")} / {String(lineup.length).padStart(2, "0")}
            </p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={i}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-1 truncate text-[1.02rem]"
              >
                <Link href={`/productos/${item.product.slug}`} className="hover:underline">
                  {item.caption}
                </Link>
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={prev} aria-label="Producto anterior" className="grid h-11 w-11 place-items-center rounded-full border border-ink/25 hover:bg-ink hover:text-paper">
              <ArrowIcon dir="left" />
            </button>
            <button type="button" onClick={next} aria-label="Producto siguiente" className="grid h-11 w-11 place-items-center rounded-full border border-ink/25 hover:bg-ink hover:text-paper">
              <ArrowIcon />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
