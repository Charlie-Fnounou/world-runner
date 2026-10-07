"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ProductPhoto } from "@/components/ProductPhoto";
import { ArrowIcon } from "@/components/Icons";
import { MaskLine, Reveal } from "@/components/Reveal";
import { getProduct, productsIn } from "@/data/catalog";
import { useDragScroll } from "@/lib/useDragScroll";

/* ───────────── Labne ───────────── */

function Labne() {
  const labne = getProduct("labne")!;
  const chips = getProduct("labne-con-chips")!;
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["6%", "-14%"]);
  const tubY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const tubR = useTransform(scrollYProgress, [0, 1], [-8, 6]);

  return (
    <section ref={ref} aria-labelledby="labne-title" className="relative overflow-hidden bg-[#5B60D6] text-white">
      <div className="gutter relative pb-16 pt-20 md:pb-24 md:pt-28">
        <p className="kicker opacity-80">Labne & Dips</p>
        <motion.h2
          id="labne-title"
          style={{ x }}
          className="font-display mt-4 whitespace-nowrap text-[30vw] leading-[0.8] tracking-[-0.02em] md:text-[27vw]"
        >
          LABNE
        </motion.h2>

        <div className="relative mt-[-14vw] grid items-end gap-10 md:mt-[-12vw] md:grid-cols-12">
          <div className="relative flex items-start gap-3 md:col-span-7 md:col-start-1">
            <motion.div style={{ y: tubY, rotate: tubR }} className="relative aspect-[4/3] w-[78%] overflow-hidden rounded-[2rem] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.5)]">
              <ProductPhoto product={labne} photo={labne.image} fill sizes="(min-width: 768px) 45vw, 78vw" />
            </motion.div>
            <motion.div style={{ y: tubY }} className="relative -ml-[18%] mt-[28%] aspect-[3/4] w-[40%] overflow-hidden rounded-[1.5rem] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]">
              <ProductPhoto product={chips} photo={chips.image} fill sizes="(min-width: 768px) 20vw, 40vw" />
            </motion.div>
          </div>
          <Reveal className="md:col-span-4 md:col-start-9 md:pb-10">
            <p className="font-display text-[8vw] leading-[1.02] md:text-[2.6vw]">
              Solo, o con <em>za&apos;atar</em> y aceite de oliva.
            </p>
            <ul className="mt-6 space-y-1 text-[0.98rem] opacity-85">
              <li>266 ml · Jalav Israel</li>
              <li>También: Labne con Chips, Ricotta, Dip Aceituna</li>
            </ul>
            <Link href="/productos?c=labne-dips" className="group mt-8 inline-flex items-center gap-2 border-b border-white/50 pb-1 text-[0.98rem]">
              Ver Labne & Dips
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Arepas ───────────── */

function Arepas() {
  const arepas = productsIn("arepas").filter((p) => p.shape === "arepas");
  const rail = useRef<HTMLDivElement>(null);
  useDragScroll(rail);
  return (
    <section aria-labelledby="arepas-title" className="relative overflow-hidden bg-[#F2C14E] py-20 text-[#3B2406] md:py-28">
      <div className="gutter flex flex-wrap items-end justify-between gap-6">
        <h2 id="arepas-title" className="font-display text-[20vw] leading-[0.82] tracking-[-0.02em] md:text-[12vw]">
          <MaskLine>Arepas</MaskLine>
          <MaskLine delay={0.1}>
            <em className="pl-[8vw] text-[0.55em]">siete maneras</em>
          </MaskLine>
        </h2>
        <Reveal className="max-w-xs text-[1.05rem] leading-snug">
          Maíz, yuca, plátano, zanahoria con chía. Con queso o sin. Perfectas para cualquier momento del día.
        </Reveal>
      </div>

      <div ref={rail} style={{ scrollPaddingInline: "var(--gutter)" }} className="no-scrollbar mt-12 flex snap-x gap-6 overflow-x-auto px-[var(--gutter)] pb-4 md:cursor-grab md:gap-8">
        {arepas.map((p, n) => (
          <Reveal key={p.slug} delay={n * 0.06} className="w-[48vw] shrink-0 snap-start sm:w-[30vw] md:w-[17vw]">
            <Link href={`/productos/${p.slug}`} className="group block text-center" draggable={false}>
              <div className="relative aspect-square overflow-hidden rounded-full shadow-[0_24px_40px_-20px_rgba(59,36,6,0.6)] transition-transform duration-700 ease-[var(--ease-out)] group-hover:-translate-y-2">
                <ProductPhoto product={p} photo={p.image} fill sizes="(min-width: 768px) 18vw, 50vw" className="transition-transform duration-[1.2s] group-hover:scale-110" />
              </div>
              <p className="font-display mt-4 text-[1.3rem] leading-tight">{p.title}</p>
              <p className="kicker mt-1 opacity-70">{p.sizes[0]}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Café ───────────── */

function Mola() {
  // stepped geometric band inspired by the coffee bag pattern
  return (
    <svg viewBox="0 0 400 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="mola" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M0 30 h10 v-10 h10 v-10 h10 v10 h10" fill="none" stroke="#C88A55" strokeWidth="3" />
          <path d="M0 38 h14 v-10 h12 v10 h14" fill="none" stroke="#8C7BC8" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="400" height="40" fill="url(#mola)" />
    </svg>
  );
}

function Cafe() {
  const cafe = getProduct("cafe-artesanal")!;
  return (
    <section aria-labelledby="cafe-title" className="relative overflow-hidden bg-[#22305F] text-[#F4EFE6]">
      <div className="h-10 opacity-90 md:h-14">
        <Mola />
      </div>
      <div className="gutter grid items-center gap-12 py-20 md:grid-cols-12 md:py-28">
        <div className="md:col-span-6">
          <p className="kicker opacity-70">Café artesanal</p>
          <h2 id="cafe-title" className="font-display mt-5 text-[13vw] leading-[0.9] tracking-[-0.02em] md:text-[6.2vw]">
            <MaskLine>Cosechado</MaskLine>
            <MaskLine delay={0.08}>
              <em>en la cuenca</em>
            </MaskLine>
            <MaskLine delay={0.16}>del Canal.</MaskLine>
          </h2>
          <Reveal className="mt-8 max-w-md text-[1.05rem] leading-relaxed opacity-85">
            Café artesanal Fresh Lovers, con un perfil de sabor único y aroma envolvente. En granos, molido o turco.
          </Reveal>
          <Reveal delay={0.1}>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-white/20 pt-5">
              {[
                ["En granos", "450 g"],
                ["Molido", "225 · 450 g"],
                ["Turco", "225 · 450 g"],
              ].map(([k, val]) => (
                <div key={k}>
                  <dt className="font-display text-xl italic">{k}</dt>
                  <dd className="mt-1 text-sm opacity-70">{val}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
        <div className="relative flex justify-center gap-2 md:col-span-6">
          {[0, 1, 2].map((n) => (
            <Reveal key={n} delay={n * 0.12} y={60} className={`w-1/3 ${n === 1 ? "-mt-10" : "mt-8"}`}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-[1.25rem] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]">
                <ProductPhoto product={cafe} variant={n} fill sizes="(min-width: 768px) 16vw, 33vw" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function House() {
  return (
    <>
      <Labne />
      <Arepas />
      <Cafe />
    </>
  );
}
