"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ProductPhoto } from "@/components/ProductPhoto";
import { ArrowIcon } from "@/components/Icons";
import { categories, products, type Category, type CategorySlug, type Product } from "@/data/catalog";

const EASE = [0.16, 1, 0.3, 1] as const;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const pale = (hex: string) => ["#F4ECE0", "#F7F5F0", "#F6F3EC", "#FBF8F3", "#FBFAF7", "#F3F1EC", "#141210"].includes(hex);

/** One entry per flavour / variety — the smallest unit we sell. */
type Item = { p: Product; v: number; key: string; hay: string };

const items: Item[] = products.flatMap((p) => {
  const cat = categories.find((c) => c.slug === p.category)?.name ?? "";
  const base = [p.name, p.title, p.kicker, p.description, cat, ...p.sizes].join(" ");
  return p.variants.map((x, v) => ({ p, v, key: `${p.slug}-${v}`, hay: norm(`${base} ${x.name}`) }));
});

function Card({ item: { p, v }, cat }: { item: Item; cat: Category }) {
  const x = p.variants[v];
  const many = p.variants.length > 1;
  return (
    <Link href={`/productos/${p.slug}${many ? `?v=${v}` : ""}`} className="group block">
      <div
        className="relative overflow-hidden rounded-[1.5rem]"
        style={{ backgroundColor: pale(x.bg) ? cat.bg : `color-mix(in srgb, ${x.bg} 70%, ${cat.bg})` }}
      >
        {p.isNew && v === 0 && <span className="kicker absolute left-3 top-3 z-10 rounded-full bg-ink px-2.5 py-1 text-[0.6rem] text-paper">Nuevo</span>}
        <div className="relative aspect-[4/5]">
          <ProductPhoto
            product={p}
            variant={v}
            fill
            sizes="(min-width: 1280px) 19vw, (min-width: 1024px) 24vw, (min-width: 768px) 32vw, 48vw"
            className="transition-transform duration-[1.1s] ease-[var(--ease-out)] group-hover:scale-[1.05]"
          />
        </div>
      </div>
      <div className="mt-3 px-1">
        <h4 className="text-[1.02rem] leading-tight">{many ? x.name : p.name}</h4>
        <p className="mt-0.5 text-[0.85rem] text-ink/55">{many ? p.name : p.sizes.join(" · ")}</p>
      </div>
    </Link>
  );
}

function Grid({ list, cat }: { list: Item[]; cat: Category }) {
  return (
    <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 md:gap-y-10 lg:grid-cols-4 xl:grid-cols-5">
      {list.map((it) => (
        <motion.li
          key={it.key}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -40px 0px" }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <Card item={it} cat={cat} />
        </motion.li>
      ))}
    </ul>
  );
}

export function CatalogBrowser() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialC = params.get("c") as CategorySlug | null;
  const initialL = params.get("l");
  const [active, setActive] = useState<CategorySlug | "all">(initialC && categories.some((c) => c.slug === initialC) ? initialC : "all");
  const [line, setLine] = useState<string | null>(initialL && products.some((p) => p.slug === initialL && p.category === initialC) ? initialL : null);
  const [q, setQ] = useState("");

  const lines = active === "all" ? [] : products.filter((p) => p.category === active);

  const list = useMemo(() => {
    const nq = norm(q.trim());
    return items.filter(
      (it) => (active === "all" || it.p.category === active) && (!line || it.p.slug === line) && (!nq || it.hay.includes(nq)),
    );
  }, [active, line, q]);

  const sync = (c: CategorySlug | "all", l: string | null) => {
    const sp = new URLSearchParams(params.toString());
    if (c === "all") sp.delete("c");
    else sp.set("c", c);
    if (l) sp.set("l", l);
    else sp.delete("l");
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  };
  const choose = (c: CategorySlug | "all") => (setActive(c), setLine(null), sync(c, null));
  const chooseLine = (l: string | null) => (setLine(l), sync(active, l));

  // category → product line → variants
  const sections = categories
    .map((cat) => ({
      cat,
      groups: products
        .filter((p) => p.category === cat.slug)
        .map((p) => ({ p, list: list.filter((it) => it.p === p) }))
        .filter((g) => g.list.length),
    }))
    .filter((s) => s.groups.length);

  const chip = (on: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-[0.92rem] transition-colors ${on ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink/60"}`;

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-[var(--gutter)] mt-8 bg-paper/90 px-[var(--gutter)] pb-4 pt-4 backdrop-blur-md md:top-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div role="group" aria-label="Filtrar por categoría" className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] md:mx-0 md:flex-wrap md:px-0">
            {[{ slug: "all" as const, name: "Todo" }, ...categories].map((c) => (
              <button key={c.slug} type="button" aria-pressed={active === c.slug} onClick={() => choose(c.slug)} className={chip(active === c.slug)}>
                {c.name}
              </button>
            ))}
          </div>
          <label className="relative block shrink-0 md:w-72">
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
        {lines.length > 1 && (
          <div role="group" aria-label="Filtrar por línea" className="no-scrollbar -mx-[var(--gutter)] mt-3 flex gap-2 overflow-x-auto px-[var(--gutter)] md:mx-0 md:flex-wrap md:px-0">
            <button type="button" aria-pressed={!line} onClick={() => chooseLine(null)} className={`${chip(!line)} py-1.5 text-[0.85rem]`}>
              Todas
            </button>
            {lines.map((p) => (
              <button key={p.slug} type="button" aria-pressed={line === p.slug} onClick={() => chooseLine(p.slug)} className={`${chip(line === p.slug)} py-1.5 text-[0.85rem]`}>
                {p.name}
                <span className="ml-1.5 opacity-55">{p.variants.length}</span>
              </button>
            ))}
          </div>
        )}
        <p className="kicker mt-4 text-ink/55" aria-live="polite">
          {list.length} {list.length === 1 ? "producto" : "productos"}
          {active !== "all" && ` · ${categories.find((c) => c.slug === active)?.name}`}
          {line && ` · ${products.find((p) => p.slug === line)?.name}`}
        </p>
      </div>

      {sections.map(({ cat, groups }) => (
        <section key={cat.slug} aria-labelledby={`cat-${cat.slug}`} className="mt-12 md:mt-16">
          {active === "all" && (
            <div className="flex items-end justify-between gap-4 border-b-[3px] border-ink pb-3">
              <h2 id={`cat-${cat.slug}`} className="font-display text-[11vw] leading-[0.9] md:text-[4.5vw]">
                {cat.name}
              </h2>
              <button type="button" onClick={() => (choose(cat.slug), window.scrollTo({ top: 0, behavior: "smooth" }))} className="group mb-1 inline-flex shrink-0 items-center gap-2 text-[0.9rem]">
                Ver solo {cat.name.toLowerCase()} <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}
          {active !== "all" && <h2 id={`cat-${cat.slug}`} className="sr-only">{cat.name}</h2>}
          {groups.map(({ p, list: gl }) => (
            <div key={p.slug} className="mt-8 first:mt-6">
              {(groups.length > 1 || p.variants.length > 1) && (
                <div className="flex items-baseline justify-between gap-4 border-b border-ink/15 pb-2">
                  <h3 className="font-display text-[1.6rem] italic leading-tight md:text-[2rem]">
                    {p.name}
                    <span className="kicker ml-3 align-middle text-[0.6rem] not-italic text-ink/50">
                      {p.variants.length > 1 ? `${p.variants.length} ${p.category === "cafe" || p.category === "harinas" ? "variedades" : "sabores"}` : p.sizes.join(" · ")}
                    </span>
                  </h3>
                  <Link href={`/productos/${p.slug}`} className="shrink-0 text-[0.85rem] text-ink/60 underline-offset-4 hover:text-ink hover:underline">
                    Ficha
                  </Link>
                </div>
              )}
              <Grid list={gl} cat={cat} />
            </div>
          ))}
        </section>
      ))}

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
