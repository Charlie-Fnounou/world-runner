"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ProductPhoto } from "@/components/ProductPhoto";
import { ArrowIcon } from "@/components/Icons";
import { cartoucheClipPath } from "@/lib/cartouche";
import { getProduct } from "@/data/catalog";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Flavour showcase for Yogurt Copa (real catalog photos per flavour).
 * One screen tall and never pinned: flavours rotate on their own while the
 * section is on screen, and the buttons pick one directly.
 */
export function GreekSequence() {
  const product = getProduct("yogurt-copa")!;
  const flavours = product.variants;
  const ref = useRef<HTMLElement>(null);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { amount: 0.4 });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  useEffect(() => {
    if (!inView || paused || reduce) return;
    const t = setTimeout(() => setI((n) => (n + 1) % flavours.length), 3200);
    return () => clearTimeout(t);
  }, [i, inView, paused, reduce, flavours.length]);

  const ring = useTransform(scrollYProgress, [0, 1], [-40, 120]);
  const v = flavours[i];

  return (
    <section
      ref={ref}
      aria-labelledby="copa-title"
      className="relative"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <clipPath id="copa-cartouche" clipPathUnits="objectBoundingBox">
          <path d={cartoucheClipPath(0.86)} />
        </clipPath>
      </svg>
      <motion.div
        className="relative flex min-h-[100svh] flex-col overflow-hidden"
        animate={{ backgroundColor: v.bg, color: v.ink }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <motion.div
          aria-hidden="true"
          style={{ rotate: ring }}
          className="absolute left-1/2 top-1/2 aspect-square w-[150vw] -translate-x-1/2 -translate-y-1/2 md:w-[70vw]"
        >
          <div className="absolute inset-[18%] rounded-full bg-white/30" />
          <div className="absolute inset-0 rounded-full border border-current opacity-15" />
        </motion.div>

        <div className="gutter relative z-10 flex flex-1 flex-col pt-20 md:grid md:grid-cols-12 md:items-center md:pt-0">
          <div className="md:col-span-4">
            <p className="kicker opacity-80">Y O G U R T · copa 150 ml</p>
            <h2 id="copa-title" className="font-display mt-2 text-[22vw] leading-[0.82] tracking-[-0.03em] md:mt-4 md:text-[9.5vw]">
              Copa
            </h2>
            <div className="relative mt-1 h-[11vw] overflow-hidden md:mt-3 md:h-[5vw]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.p
                  key={v.name}
                  className="font-display absolute inset-0 text-[10vw] italic leading-none md:text-[4.4vw]"
                  initial={{ y: "100%" }}
                  animate={{ y: "0%" }}
                  exit={{ y: "-100%" }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  {v.name.toLowerCase()}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* pinned photo in the brand cartouche */}
          <div className="relative flex flex-1 items-center justify-center md:col-span-4 md:h-full">
            <div className="relative aspect-[0.86] w-[70vw] max-w-[440px] md:w-[30vw]" style={{ clipPath: "url(#copa-cartouche)" }}>
              <AnimatePresence initial={false}>
                <motion.div
                  key={i}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: EASE }}
                >
                  <ProductPhoto product={product} variant={i} fill sizes="(min-width: 768px) 30vw, 70vw" />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="pb-6 md:col-span-4 md:pb-0 md:pl-[4vw]">
            <p className="font-display max-w-sm text-[4.4vw] leading-[1.2] md:text-[1.9vw]">{product.description}</p>
            <Link href={`/productos/yogurt-copa?v=${i}`} className="group mt-6 hidden items-center gap-2 text-[0.95rem] md:inline-flex">
              Ver Yogurt Copa {v.name.toLowerCase()}
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        <nav aria-label="Sabores de Yogurt Copa" className="gutter relative z-10 pb-24 md:pb-8">
          <ol className="flex flex-wrap gap-x-5 gap-y-1 md:gap-x-8">
            {flavours.map((f, n) => (
              <li key={f.name}>
                <button
                  type="button"
                  onClick={() => setI(n)}
                  aria-current={n === i}
                  className={`font-display text-[1.1rem] italic transition-opacity md:text-[1.3rem] ${n === i ? "opacity-100" : "opacity-45 hover:opacity-80"}`}
                >
                  <span className="mr-1.5 font-sans text-[0.65rem] not-italic tracking-widest">{String(n + 1).padStart(2, "0")}</span>
                  {f.name.toLowerCase()}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </motion.div>
    </section>
  );
}
