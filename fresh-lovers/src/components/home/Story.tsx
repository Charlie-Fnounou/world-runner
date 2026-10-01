"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { Reveal } from "@/components/Reveal";
import { RoundSeal } from "@/components/RoundSeal";
import { categories, skuCount } from "@/data/catalog";
import { site } from "@/data/site";

const TEXT =
  "Elaborado por Fresh Lovers S.A. en La Herradura, La Chorrera. Desde 2018 hacemos quesos, yogurt y mucho más, con ingredientes naturales y frescos, y con supervisión de kashrut.";

function Word({ w, progress, range }: { w: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block pr-[0.25em]">
      {w}
    </motion.span>
  );
}

export function Story() {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = TEXT.split(" ");

  const facts: [string, string][] = [
    ["Elaborado por", site.legalName],
    ["Planta", `${site.plant.line1}, ${site.plant.locality}`],
    ["Desde", String(site.since)],
    ["Kashrut", site.kashrut],
    ["Conservación", "Lácteos: mantener refrigerado menor a 4 °C"],
    ["Contenido", `${categories.length} categorías · ${skuCount} productos`],
  ];

  return (
    <section id="historia" aria-labelledby="historia-title" className="relative bg-paper py-24 md:py-36">
      <div className="gutter">
        <h2 id="historia-title" className="kicker text-ink/60">
          Historia — leída como una etiqueta
        </h2>
        <p ref={ref} className="font-display mt-8 max-w-[22ch] text-[9vw] leading-[1.04] tracking-[-0.01em] md:max-w-[24ch] md:text-[5.2vw]">
          {words.map((w, n) => (
            <Word key={n} w={w} progress={scrollYProgress} range={[n / words.length, (n + 1) / words.length]} />
          ))}
        </p>
      </div>

      {/* the back-of-pack panel, at monument scale */}
      <div className="gutter mt-20 grid gap-10 md:mt-28 md:grid-cols-12">
        <div className="flex items-center justify-center md:col-span-4 md:col-start-1">
          <RoundSeal className="w-[62vw] text-ink md:w-full md:max-w-[340px]" />
        </div>
        <Reveal className="md:col-span-7 md:col-start-6">
          <div className="border-[3px] border-ink p-4 md:p-6">
            <p className="font-display border-b-[10px] border-ink pb-2 text-[9vw] font-semibold leading-none md:text-[3.4vw]">
              Información
            </p>
            <dl>
              {facts.map(([k, val], n) => (
                <div
                  key={k}
                  className={`flex items-baseline justify-between gap-6 py-2.5 ${n === 2 ? "border-b-[6px]" : "border-b"} border-ink`}
                >
                  <dt className="font-semibold">{k}</dt>
                  <dd className="text-right">{val}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[0.78rem] leading-snug text-ink-2">
              Datos tomados de nuestras etiquetas. Consulta ingredientes y sellos en el empaque de cada producto.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
