"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ProductPhoto, photoFor } from "@/components/ProductPhoto";
import { WhatsAppIcon } from "@/components/Icons";
import { cartoucheClipPath } from "@/lib/cartouche";
import type { Category, Product } from "@/data/catalog";
import { whatsappLink } from "@/data/site";

const EASE = [0.16, 1, 0.3, 1] as const;

const pale = (hex: string) => ["#F4ECE0", "#F7F5F0", "#F6F3EC", "#FBF8F3", "#FBFAF7", "#141210"].includes(hex);

export function ProductView({ product: p, category }: { product: Product; category: Category }) {
  const params = useSearchParams();
  const start = Math.min(Math.max(0, Number(params.get("v") ?? 0) || 0), p.variants.length - 1);
  const [i, setI] = useState(start);
  const v = p.variants[i];
  const stage = pale(v.bg) ? category.bg : v.bg;
  const ingredients = v.ingredients ?? p.ingredients;
  const seals = v.seals ?? p.seals;

  return (
    <div className="grid gap-10 md:grid-cols-12 md:gap-12">
      {/* stage */}
      <div className="md:col-span-6 md:col-start-1">
        <div className="md:sticky md:top-24">
          <svg width="0" height="0" className="absolute" aria-hidden="true">
            <clipPath id="pdp-cartouche" clipPathUnits="objectBoundingBox">
              <path d={cartoucheClipPath(0.86)} />
            </clipPath>
          </svg>
          <motion.div
            className="relative mx-auto aspect-[0.86] w-full max-w-[560px]"
            animate={{ backgroundColor: stage }}
            transition={{ duration: 0.7, ease: EASE }}
            style={{ clipPath: "url(#pdp-cartouche)" }}
          >
            <AnimatePresence initial={false}>
              <motion.div
                key={photoFor(p, i)?.src ?? i}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <ProductPhoto product={p} variant={i} fill priority sizes="(min-width: 768px) 45vw, 92vw" />
              </motion.div>
            </AnimatePresence>
          </motion.div>
          {p.image && <p className="sr-only">Fotografía disponible</p>}
        </div>
      </div>

      {/* details */}
      <div className="md:col-span-6 md:pt-6">
        <p className="kicker text-ink/55">{category.name}</p>
        <h1 className="font-display mt-4 text-[13vw] leading-[0.88] tracking-[-0.02em] md:text-[5.4vw]">{p.name}</h1>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={i}
            className="font-display mt-3 text-[7vw] italic text-ink-2 md:text-[2.2vw]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {p.variants.length > 1 ? v.name : p.sizes[0]}
          </motion.p>
        </AnimatePresence>
        <p className="mt-6 max-w-lg text-[1.08rem] leading-relaxed text-ink-2">{p.description}</p>

        {p.variants.length > 1 && (
          <fieldset className="mt-10">
            <legend className="kicker mb-4 text-ink/55">
              {p.category === "cafe" || p.category === "harinas" ? "Variedad" : "Sabor"} · {p.variants.length}
            </legend>
            <div className="flex flex-wrap gap-2">
              {p.variants.map((x, n) => (
                <button
                  key={x.name}
                  type="button"
                  aria-pressed={n === i}
                  onClick={() => setI(n)}
                  className={`flex items-center gap-2.5 rounded-full border py-2 pl-2 pr-4 text-[0.95rem] transition-colors ${
                    n === i ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink/60"
                  }`}
                >
                  <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: pale(x.bg) ? x.ink : x.bg }} />
                  {x.name}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <dl className="mt-10 border-t-[3px] border-ink">
          <div className="flex justify-between gap-6 border-b border-ink/20 py-3">
            <dt className="font-semibold">Presentación</dt>
            <dd className="text-right">{p.sizes.join(" · ")}</dd>
          </div>
          {p.highlights?.map((h) => (
            <div key={h} className="flex justify-between gap-6 border-b border-ink/20 py-3">
              <dt className="font-semibold">Destacado</dt>
              <dd className="text-right">{h}</dd>
            </div>
          ))}
          {v.note && (
            <div className="flex justify-between gap-6 border-b border-ink/20 py-3">
              <dt className="font-semibold">{v.name}</dt>
              <dd className="text-right">{v.note}</dd>
            </div>
          )}
          {seals?.includes("jalav-israel") && (
            <div className="flex justify-between gap-6 border-b border-ink/20 py-3">
              <dt className="font-semibold">Kosher</dt>
              <dd className="text-right">Jalav Israel (según etiqueta)</dd>
            </div>
          )}
          {seals?.includes("kosher") && (
            <div className="flex justify-between gap-6 border-b border-ink/20 py-3">
              <dt className="font-semibold">Kosher</dt>
              <dd className="text-right">Sello kosher en el empaque</dd>
            </div>
          )}
        </dl>

        {ingredients && (
          <details className="group mt-6 border-b border-ink/20 pb-4" open>
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
              Ingredientes{p.variants.length > 1 && v.ingredients ? ` · ${v.name}` : ""}
              <span aria-hidden="true" className="text-xl transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-2">{ingredients}</p>
          </details>
        )}

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a
            href={whatsappLink(`Hola Fresh Lovers, quiero información sobre ${p.name}${p.variants.length > 1 ? ` (${v.name})` : ""}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-13 items-center justify-center gap-2.5 rounded-full bg-ink px-7 py-4 text-paper transition-transform hover:-translate-y-0.5"
          >
            <WhatsAppIcon />
            Preguntar por WhatsApp
          </a>
          <Link href="/#donde-comprar" className="inline-flex items-center justify-center rounded-full border border-ink/25 px-7 py-4 hover:border-ink">
            Dónde comprar
          </Link>
        </div>
        <p className="mt-6 text-xs text-ink/50">
          Información tomada del catálogo y las etiquetas Fresh Lovers. Consulta siempre la etiqueta del producto.
        </p>
      </div>
    </div>
  );
}
