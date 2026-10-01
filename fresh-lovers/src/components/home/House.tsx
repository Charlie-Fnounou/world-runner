"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Pack } from "@/components/Pack";
import { ArrowIcon } from "@/components/Icons";
import { MaskLine, Reveal } from "@/components/Reveal";
import { getProduct, productsIn } from "@/data/catalog";
import { useDragScroll } from "@/lib/useDragScroll";

/* ───────────── Labne ───────────── */

function Labne() {
  const labne = getProduct("labne")!;
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
          <div className="flex gap-3 md:col-span-6 md:col-start-2">
            <motion.div style={{ y: tubY, rotate: tubR }} className="w-1/2 md:w-[44%]">
              <Pack product={labne} variant={0} className="h-auto w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.3)]" />
            </motion.div>
            <motion.div style={{ y: tubY }} className="mt-16 w-1/2 md:w-[44%]">
              <Pack product={labne} variant={1} className="h-auto w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.3)]" />
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

const arepaLook: Record<string, { base: string; edge: string; fleck?: string; flecks?: number }> = {
  "arepa-maiz-con-queso": { base: "#F2CC5C", edge: "#D9A535", fleck: "#FFF6DA", flecks: 14 },
  "arepa-maiz": { base: "#F4D46A", edge: "#DCAA3A" },
  "arepa-yuca-con-queso": { base: "#F1E4BE", edge: "#D9C28A", fleck: "#FFFDF4", flecks: 12 },
  "arepa-yuca": { base: "#EEE2C0", edge: "#D2BE8C" },
  "arepa-yuca-queso-pesto": { base: "#E9E0B4", edge: "#CDBF82", fleck: "#5F8A2E", flecks: 16 },
  "arepa-platano-con-queso": { base: "#E8A23A", edge: "#C67C1F", fleck: "#FFF0CC", flecks: 10 },
  "arepa-zanahoria-chia": { base: "#EC8A34", edge: "#C9661B", fleck: "#2A1E18", flecks: 26 },
};

function Arepa({ slug }: { slug: string }) {
  const look = arepaLook[slug] ?? { base: "#F2CC5C", edge: "#D9A535" };
  const flecks = Array.from({ length: look.flecks ?? 0 }, (_, i) => {
    const a = (i * 137.5 * Math.PI) / 180;
    const r = 12 + ((i * 29) % 62);
    return { x: Math.round((100 + Math.cos(a) * r) * 100) / 100, y: Math.round((100 + Math.sin(a) * r) * 100) / 100, s: 1.4 + (i % 3) };
  });
  return (
    <svg viewBox="0 0 200 200" className="h-auto w-full" aria-hidden="true">
      <defs>
        <radialGradient id={`ar-${slug}`} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </radialGradient>
        <clipPath id={`arc-${slug}`}>
          <circle cx="100" cy="100" r="86" />
        </clipPath>
      </defs>
      <circle cx="100" cy="106" r="90" fill="#000" opacity="0.1" />
      <circle cx="100" cy="100" r="90" fill={look.edge} />
      <circle cx="100" cy="100" r="86" fill={look.base} />
      <g clipPath={`url(#arc-${slug})`}>
        {flecks.map((f, i) => (
          <circle key={i} cx={f.x} cy={f.y} r={f.s} fill={look.fleck} opacity="0.9" />
        ))}
        {/* grill marks */}
        {/* toasted patches + soft grill marks */}
        <circle cx="70" cy="80" r="34" fill="#8A4A16" opacity="0.12" />
        <circle cx="132" cy="126" r="40" fill="#8A4A16" opacity="0.1" />
        <g stroke="#5E3010" strokeOpacity="0.32" strokeWidth="7" strokeLinecap="round">
          {[-36, 0, 36].map((o) => (
            <line key={o} x1={58 + o} y1={30} x2={142 + o} y2={170} />
          ))}
        </g>
        <circle cx="100" cy="100" r="86" fill={`url(#ar-${slug})`} />
      </g>
    </svg>
  );
}

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
              <div className="transition-transform duration-700 ease-[var(--ease-out)] group-hover:-translate-y-2 group-hover:rotate-[24deg]">
                <Arepa slug={p.slug} />
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
              <Pack product={cafe} variant={n} className="h-auto w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.35)]" />
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
