"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { Pack } from "@/components/Pack";
import { ArrowIcon } from "@/components/Icons";
import { getProduct } from "@/data/catalog";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Pinned flavour sequence. Scrolling moves through the six real Yogurt Griego
 * flavours; the pouch persists and its label colour morphs. Plain vertical
 * scroll, no hijacking — flavour buttons jump to the matching scroll position.
 */
export function GreekSequence() {
  const product = getProduct("yogurt-griego")!;
  const flavours = product.variants;
  const ref = useRef<HTMLElement>(null);
  const [i, setI] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const n = Math.min(flavours.length - 1, Math.max(0, Math.floor(p * flavours.length * 0.999)));
    setI(n);
  });

  const rotate = useTransform(scrollYProgress, [0, 1], [-4, 4]);
  const ring = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const v = flavours[i];

  const jump = (n: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span * ((n + 0.5) / flavours.length), behavior: "smooth" });
  };

  return (
    <section ref={ref} aria-labelledby="griego-title" className="relative" style={{ height: `${flavours.length * 60 + 100}svh` }}>
      <motion.div
        className="sticky top-0 flex h-[100svh] flex-col overflow-hidden"
        animate={{ backgroundColor: v.bg, color: v.ink }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        {/* rotating label field */}
        <motion.div
          aria-hidden="true"
          style={{ rotate: ring }}
          className="absolute left-1/2 top-1/2 aspect-square w-[150vw] -translate-x-1/2 -translate-y-1/2 md:w-[70vw]"
        >
          <div className="absolute inset-[18%] rounded-full bg-white/30" />
          <div className="absolute inset-0 rounded-full border border-current opacity-15" />
        </motion.div>

        <div className="gutter relative z-10 flex flex-1 flex-col pt-20 md:grid md:grid-cols-12 md:items-center md:pt-0">
          {/* name */}
          <div className="md:col-span-4">
            <p className="kicker opacity-80">Nuevo · Y O G U R T</p>
            <h2 id="griego-title" className="font-display mt-2 text-[22vw] leading-[0.82] tracking-[-0.03em] text-[#2A2622] md:mt-4 md:text-[9.5vw]">
              Griego
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
                  {v.name}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* pinned pouch */}
          <div className="relative flex flex-1 items-center justify-center md:col-span-4 md:h-full">
            <motion.div style={{ rotate }} className="w-[52vw] max-w-[360px] md:w-[24vw]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.94, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.04, y: -20 }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  <Pack product={product} variant={i} className="h-auto w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.18)]" />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* facts — all from the label */}
          <div className="pb-6 md:col-span-4 md:pb-0 md:pl-[4vw]">
            <dl className="grid grid-cols-3 gap-4 md:grid-cols-1 md:gap-7">
              <div>
                <dt className="kicker opacity-70">Proteínas</dt>
                <dd className="font-display text-[9vw] leading-none md:text-[4vw]">9 g</dd>
              </div>
              <div>
                <dt className="kicker opacity-70">Contiene</dt>
                <dd className="font-display text-[5.4vw] italic leading-tight md:text-[2.2vw]">probióticos</dd>
              </div>
              <div>
                <dt className="kicker opacity-70">Formatos</dt>
                <dd className="text-[3.6vw] leading-snug md:text-[1.05rem]">
                  150 ml · 250 ml
                  <br />
                  470 ml
                </dd>
              </div>
            </dl>
            <div className="mt-4 h-6 md:mt-7">
              <AnimatePresence mode="wait">
                {v.note && (
                  <motion.p
                    key="note"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="kicker"
                  >
                    {v.note} · Jalav Israel
                  </motion.p>
                )}
                {!v.note && (
                  <motion.p key="jalav" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="kicker opacity-80">
                    Jalav Israel
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <Link
              href="/productos/yogurt-griego"
              className="group mt-4 hidden items-center gap-2 text-[0.95rem] md:inline-flex"
            >
              Ver ingredientes y formatos
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* flavour index */}
        <nav aria-label="Sabores de Yogurt Griego" className="gutter relative z-10 pb-24 md:pb-8">
          <ol className="flex flex-wrap gap-x-4 gap-y-1 md:gap-x-8">
            {flavours.map((f, n) => (
              <li key={f.name}>
                <button
                  type="button"
                  onClick={() => jump(n)}
                  aria-current={n === i}
                  className={`font-display text-[1.05rem] italic transition-opacity md:text-[1.25rem] ${n === i ? "opacity-100" : "opacity-45 hover:opacity-80"}`}
                >
                  <span className="mr-1.5 font-sans text-[0.65rem] not-italic tracking-widest">{String(n + 1).padStart(2, "0")}</span>
                  {f.name}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </motion.div>
    </section>
  );
}
