"use client";

import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cartoucheClipPath } from "@/lib/cartouche";
import { WhatsAppIcon, InstagramIcon } from "@/components/Icons";
import { MaskLine, Reveal } from "@/components/Reveal";
import { instagramLink, site, whatsappLink } from "@/data/site";
import { faqs } from "@/data/faqs";



/** WhatsApp CTA shaped like the brand cartouche, with a magnetic pull on desktop. */
function MagneticCartouche() {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 150, damping: 15 });
  const y = useSpring(useMotionValue(0), { stiffness: 150, damping: 15 });

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.18);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.18);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      ref={ref}
      href={whatsappLink("Hola Fresh Lovers 👋")}
      target="_blank"
      rel="noopener noreferrer"
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ x, y }}
      className="group relative block aspect-[1.55] w-full max-w-[560px]"
      aria-label={`Escríbenos por WhatsApp al ${site.phoneDisplay}`}
    >
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <clipPath id="cta-cartouche" clipPathUnits="objectBoundingBox">
          <path d={cartoucheClipPath(1.55)} />
        </clipPath>
      </svg>
      <span className="absolute inset-0 bg-ink transition-colors duration-500 group-hover:bg-[#25D366]" style={{ clipPath: "url(#cta-cartouche)" }} />
      <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-[4%] h-[92%] w-[92%]" aria-hidden="true">
        <path d={cartoucheClipPath(1.55)} fill="none" stroke="#f4efe6" strokeOpacity=".6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-paper transition-colors duration-500 group-hover:text-ink">
        <WhatsAppIcon className="h-7 w-7 md:h-9 md:w-9" />
        <span className="font-display mt-3 text-[9vw] leading-none md:text-[3.4vw]">WhatsApp</span>
        <span className="kicker mt-3">{site.phoneDisplay}</span>
      </span>
    </motion.a>
  );
}

export function Contact() {
  return (
    <section id="contacto" aria-labelledby="contacto-title" className="relative overflow-hidden bg-paper py-24 md:py-36">
      <div className="gutter grid items-center gap-14 md:grid-cols-12">
        <div className="md:col-span-6">
          <p className="kicker text-ink/60">Contacto</p>
          <h2 id="contacto-title" className="font-display mt-6 text-[19vw] leading-[0.84] tracking-[-0.03em] md:text-[9vw]">
            <MaskLine>Escrí</MaskLine>
            <MaskLine delay={0.08}>
              <em>benos.</em>
            </MaskLine>
          </h2>
          <Reveal className="mt-8 max-w-sm text-[1.05rem] leading-relaxed text-ink-2">
            Pedidos, distribución o una pregunta sobre un producto. Te respondemos por WhatsApp.
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="mt-8 space-y-2 text-[1rem]">
              <li>
                <a href={`mailto:${site.email}`} className="underline-offset-4 hover:underline">
                  {site.email}
                </a>
              </li>
              <li>
                <a href={instagramLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline-offset-4 hover:underline">
                  <InstagramIcon className="h-4 w-4" />@{site.instagram}
                </a>
              </li>
            </ul>
          </Reveal>
        </div>
        <div className="flex justify-center md:col-span-6">
          <MagneticCartouche />
        </div>
      </div>

      <div className="gutter mt-24 grid gap-8 md:mt-36 md:grid-cols-12">
        <h3 className="font-display text-4xl md:col-span-4 md:text-5xl">
          Preguntas <em>frecuentes</em>
        </h3>
        <div className="md:col-span-8">
          {faqs.map((f) => (
            <details key={f.q} className="group border-b border-ink/15 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[1.1rem] md:text-[1.25rem] [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden="true" className="relative h-4 w-4 shrink-0">
                  <span className="absolute left-0 top-1/2 h-px w-4 bg-current" />
                  <span className="absolute left-1/2 top-0 h-4 w-px bg-current transition-transform duration-300 group-open:scale-y-0" />
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
