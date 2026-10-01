"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Pack } from "@/components/Pack";
import { categories, products, type CategorySlug, type Product } from "@/data/catalog";

const EASE = [0.16, 1, 0.3, 1] as const;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

function haystack(p: Product) {
  const cat = categories.find((c) => c.slug === p.category)?.name ?? "";
  return norm([p.name, p.title, p.kicker, p.description, cat, ...p.variants.map((v) => v.name), ...p.sizes].join(" "));
}

function Card({ p }: { p: Product }) {
  const [v, setV] = useState(0);
  const cat = categories.find((c) => c.slug === p.category)!;
  return (
    <Link
      href={`/productos/${p.slug}`}
      className="group block"
      onMouseEnter={() => p.variants.length > 1 && setV(1)}
      onMouseLeave={() => setV(0)}
    >
      <div className="relative overflow-hidden rounded-[1.75rem] transition-colors duration-500" style={{ backgroundColor: p.variants[v].bg === "#141210" ? cat.bg : `color-mix(in srgb, ${p.variants[v].bg} 70%, ${cat.bg})` }}>
        {p.isNew && <span className="kicker absolute left-4 top-4 z-10 rounded-full bg-ink px-2.5 py-1 text-[0.6rem] text-paper">Nuevo</span>}
        <div className="px-[12%] pb-[4%] pt-[10%]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={v}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <Pack product={p} variant={v} className="h-auto w-full transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.04]" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="kicker text-[0.62rem] text-ink/55">{cat.name}</p>
          <h3 className="mt-1 text-[1.05rem] leading-tight">{p.name}</h3>
          <p className="font-display mt-0.5 italic text-ink-2">
            {p.variants.length > 1 ? `${p.variants.length} sabores / variedades` : p.sizes.join(" · ")}
          </p>
        </div>
        {p.variants.length > 1 && (
          <ul className="mt-1 flex shrink-0 -space-x-1" aria-hidden="true">
            {p.variants.slice(0, 5).map((x) => (
              <li key={x.name} className="h-3.5 w-3.5 rounded-full border border-paper" style={{ backgroundColor: x.bg === "#F4ECE0" || x.bg === "#F7F5F0" || x.bg === "#F6F3EC" || x.bg === "#FBF8F3" ? x.ink : x.bg }} />
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}

export function CatalogBrowser() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initial = params.get("c") as CategorySlug | null;
  const [active, setActive] = useState<CategorySlug | "all">(initial && categories.some((c) => c.slug === initial) ? initial : "all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const nq = norm(q.trim());
    return products.filter((p) => (active === "all" || p.category === active) && (!nq || haystack(p).includes(nq)));
  }, [active, q]);

  const choose = (slug: CategorySlug | "all") => {
    setActive(slug);
    const sp = new URLSearchParams(params.toString());
    if (slug === "all") sp.delete("c");
    else sp.set("c", slug);
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  };

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-[var(--gutter)] mt-8 bg-paper/90 px-[var(--gutter)] pb-4 pt-4 backdrop-blur-md md:top-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div role="group" aria-label="Filtrar por categoría" className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] md:mx-0 md:flex-wrap md:px-0">
            {[{ slug: "all" as const, name: "Todo" }, ...categories].map((c) => {
              const on = active === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => choose(c.slug)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-[0.92rem] transition-colors ${
                    on ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink/60"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
          <label className="relative block md:w-72">
            <span className="sr-only">Buscar productos</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar: labne, fresa, yuca…"
              className="h-11 w-full rounded-full border border-ink/20 bg-transparent px-5 text-[0.95rem] placeholder:text-ink/45 focus:border-ink focus:outline-none"
            />
          </label>
        </div>
        <p className="kicker mt-4 text-ink/55" aria-live="polite">
          {list.length} {list.length === 1 ? "producto" : "productos"}
          {active !== "all" && ` · ${categories.find((c) => c.slug === active)?.name}`}
        </p>
      </div>

      <motion.ul layout className="mt-6 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-14 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {list.map((p) => (
            <motion.li
              key={p.slug}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <Card p={p} />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
      {list.length === 0 && (
        <div className="py-24 text-center">
          <p className="font-display text-3xl italic">Nada por aquí.</p>
          <button type="button" onClick={() => (setQ(""), choose("all"))} className="mt-4 underline underline-offset-4">
            Ver todos los productos
          </button>
        </div>
      )}
    </div>
  );
}
