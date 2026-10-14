"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
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

const EASE = [0.16, 1, 0.3, 1] as const;

function Card({ it, n }: { it: Item; n: number }) {
  const ph = photos[it.photo];
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.7, delay: (n % 4) * 0.06, ease: EASE }}
    >
      <Link
        href={it.href}
        className="group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] md:rounded-[2rem]"
        style={{ backgroundColor: it.bg, color: it.ink }}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={ph.src}
            alt={`${it.name} — Fresh Lovers`}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out)] group-hover:scale-[1.05]"
          />
        </div>
        <div className="flex flex-1 items-end justify-between gap-3 p-4 md:p-5">
          <div className="min-w-0">
            <p className="font-display text-[1.45rem] leading-none md:text-[1.9rem]">{it.name}</p>
            <p className="mt-1.5 text-[0.85rem] leading-snug opacity-80 md:text-[0.95rem]">{it.detail}</p>
          </div>
          <span aria-hidden="true" className="hidden h-9 w-9 shrink-0 place-items-center rounded-full border transition-transform group-hover:translate-x-1 sm:grid" style={{ borderColor: "color-mix(in srgb, currentColor 40%, transparent)" }}>
            →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/** Every category at a glance: one grid, no sideways scrolling. */
export function ProductReel() {
  return (
    <section aria-labelledby="reel-title" className="relative bg-paper py-20 md:py-24">
      <div className="gutter">
        <p className="kicker text-ink/55">Productos · {items.length} categorías</p>
        <h2 id="reel-title" className="font-display mt-2 text-[12vw] leading-[0.85] tracking-[-0.02em] md:text-[5.6vw]">
          Para cada <em>antojo</em>
        </h2>
      </div>

      <div className="gutter mt-8 grid grid-cols-2 gap-3 md:mt-10 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {items.map((it, n) => (
          <Card key={it.photo} it={it} n={n} />
        ))}
      </div>
    </section>
  );
}
