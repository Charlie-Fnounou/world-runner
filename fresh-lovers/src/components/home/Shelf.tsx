"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ProductPhoto } from "@/components/ProductPhoto";
import { ArrowIcon } from "@/components/Icons";
import { categories, products, skuCount, type CategorySlug } from "@/data/catalog";
import { useDragScroll } from "@/lib/useDragScroll";

const EASE = [0.16, 1, 0.3, 1] as const;

/** One card per photographed variant; otherwise one card per product. */
function shelfItems(slug: CategorySlug) {
  return products
    // home shelf shows photographed products only (Yogurt Griego has label art, no photo yet)
    .filter((p) => p.category === slug && (p.image || p.variants.some((v) => v.photo)))
    .flatMap((p) => {
      const shot = p.variants.map((v, i) => ({ p, i, v })).filter(({ v }) => v.photo);
      return shot.length > 1 ? shot : [{ p, i: 0, v: p.variants[0], all: true }];
    })
    .slice(0, 12);
}

export function Shelf() {
  const [active, setActive] = useState<CategorySlug>("yogurt");
  const cat = categories.find((c) => c.slug === active)!;
  const idx = categories.indexOf(cat);
  const items = useMemo(() => shelfItems(active), [active]);
  const rail = useRef<HTMLDivElement>(null);
  useDragScroll(rail);

  const select = (slug: CategorySlug) => {
    setActive(slug);
    rail.current?.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior });
  };
  const nudge = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.7, behavior: "smooth" });

  return (
    <motion.section
      id="estante"
      aria-labelledby="estante-title"
      className="relative overflow-hidden py-20 md:py-28"
      animate={{ backgroundColor: cat.bg, color: cat.ink }}
      initial={false}
      transition={{ duration: 0.8, ease: EASE }}
    >
      <div className="gutter flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="kicker opacity-70">
            El estante · {categories.length} categorías · {skuCount} productos
          </p>
          <h2 id="estante-title" className="font-display mt-4 text-[15vw] leading-[0.85] tracking-[-0.02em] md:text-[9vw]">
            <span className="sr-only">Productos: </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={cat.slug}
                className="block"
                initial={{ y: 30, opacity: 0, filter: "blur(6px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -24, opacity: 0, filter: "blur(6px)" }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                {cat.name}
              </motion.span>
            </AnimatePresence>
          </h2>
        </div>
        <div className="max-w-sm">
          <p className="kicker opacity-60">
            {String(idx + 1).padStart(2, "0")} / {String(categories.length).padStart(2, "0")}
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={cat.slug}
              className="mt-2 text-[1.05rem] leading-snug"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {cat.blurb}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* category selector — horizontally scrollable on phones */}
      <div role="tablist" aria-label="Categorías" className="no-scrollbar gutter mt-10 flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => {
          const on = c.slug === active;
          return (
            <button
              key={c.slug}
              role="tab"
              aria-selected={on}
              aria-controls="estante-rail"
              onClick={() => select(c.slug)}
              className={`relative shrink-0 rounded-full border px-4 py-2.5 text-[0.95rem] transition-colors duration-300 ${
                on ? "border-current" : "border-current/20 opacity-70 hover:opacity-100"
              }`}
              style={{ borderColor: on ? "currentColor" : undefined }}
            >
              {on && (
                <motion.span
                  layoutId="shelf-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: "currentColor" }}
                  transition={{ duration: 0.5, ease: EASE }}
                />
              )}
              <span className="relative" style={{ color: on ? cat.bg : undefined }}>
                {c.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* the shelf */}
      <div className="relative mt-10 md:mt-14">
        <div
          id="estante-rail"
          ref={rail}
          role="tabpanel"
          aria-label={cat.name}
          style={{ scrollPaddingInline: "var(--gutter)" }}
          className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto px-[var(--gutter)] pb-6 md:cursor-grab md:gap-4 md:active:cursor-grabbing"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map(({ p, i, v, ...rest }, n) => (
              <motion.div
                key={`${p.slug}-${i}`}
                className="w-[58vw] shrink-0 snap-start sm:w-[36vw] md:w-[21vw] lg:w-[17vw]"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                transition={{ duration: 0.7, delay: n * 0.05, ease: EASE }}
              >
                <Link
                  href={`/productos/${p.slug}${p.variants.length > 1 && !("all" in rest) ? `?v=${i}` : ""}`}
                  className="group block"
                  draggable={false}
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-black/10">
                    <ProductPhoto
                      product={p}
                      variant={i}
                      fill
                      sizes="(min-width: 1024px) 18vw, (min-width: 768px) 22vw, 60vw"
                      className="transition-transform duration-[1.1s] ease-[var(--ease-out)] group-hover:scale-[1.06]"
                    />
                  </div>
                  <div className="mt-2 border-t border-current/25 pt-3" style={{ borderColor: "color-mix(in srgb, currentColor 25%, transparent)" }}>
                    <p className="text-[1rem] leading-tight">{p.name}</p>
                    <p className="font-display mt-0.5 italic opacity-75">
                      {"all" in rest || p.variants.length === 1
                        ? p.variants.length > 1
                          ? `${p.variants.length} variedades`
                          : p.sizes[0]
                        : v.name.toLowerCase()}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="w-[40vw] shrink-0 snap-start sm:w-[30vw] md:w-[17vw]">
            <Link
              href={`/productos?c=${cat.slug}`}
              className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-[2rem] border border-current/30 text-center transition-colors hover:bg-black/5"
              style={{ borderColor: "color-mix(in srgb, currentColor 30%, transparent)" }}
            >
              <ArrowIcon className="h-6 w-6" />
              <span className="font-display text-xl italic">Ver todo {cat.name.toLowerCase()}</span>
            </Link>
          </div>
        </div>
        <div className="gutter mt-4 hidden items-center justify-between md:flex">
          <Link href="/productos" className="group inline-flex items-center gap-2 text-[0.95rem]">
            Catálogo completo
            <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <div className="flex gap-2">
            <button type="button" aria-label="Desplazar a la izquierda" onClick={() => nudge(-1)} className="grid h-11 w-11 place-items-center rounded-full border border-current/30 hover:bg-black/5" style={{ borderColor: "color-mix(in srgb, currentColor 30%, transparent)" }}>
              <ArrowIcon dir="left" />
            </button>
            <button type="button" aria-label="Desplazar a la derecha" onClick={() => nudge(1)} className="grid h-11 w-11 place-items-center rounded-full border border-current/30 hover:bg-black/5" style={{ borderColor: "color-mix(in srgb, currentColor 30%, transparent)" }}>
              <ArrowIcon />
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
