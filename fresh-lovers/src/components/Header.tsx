"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Logo } from "./Logo";
import { WhatsAppIcon, InstagramIcon, ArrowIcon } from "./Icons";
import { ProductPhoto } from "./ProductPhoto";
import { categories, products, type CategorySlug } from "@/data/catalog";
import { instagramLink, site, whatsappLink } from "@/data/site";

const EASE = [0.16, 1, 0.3, 1] as const;

const nav = [
  { href: "/#donde-comprar", label: "Dónde comprar" },
  { href: "/#contacto", label: "Contacto" },
];

const inCategory = (slug: CategorySlug) => products.filter((p) => p.category === slug);

/* ───────────────────────── desktop mega menu ───────────────────────── */

function MegaMenu({ active, setActive, close }: { active: CategorySlug; setActive: (c: CategorySlug) => void; close: () => void }) {
  const list = inCategory(active);
  const cat = categories.find((c) => c.slug === active)!;
  return (
    <div className="gutter grid grid-cols-12 gap-10 pb-12 pt-8">
      {/* categories */}
      <div className="col-span-3 border-r border-ink/10 pr-6">
        <p className="kicker mb-4 text-ink/45">Categorías</p>
        <ul className="space-y-0.5">
          {categories.map((c) => {
            const on = c.slug === active;
            return (
              <li key={c.slug}>
                <Link
                  href={`/productos?c=${c.slug}`}
                  onMouseEnter={() => setActive(c.slug)}
                  onFocus={() => setActive(c.slug)}
                  onClick={close}
                  className={`group flex items-center justify-between rounded-lg px-3 py-1.5 transition-colors ${on ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"}`}
                >
                  <span className="font-display text-[1.35rem] leading-tight">{c.name}</span>
                  <span className={`text-xs ${on ? "text-paper/60" : "text-ink/40"}`}>{inCategory(c.slug).length}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <Link href="/productos" onClick={close} className="group mt-6 inline-flex items-center gap-2 px-3 text-[0.95rem] text-ink">
          Ver todo el catálogo
          <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* products of the hovered category */}
      <div className="col-span-9">
        <div className="mb-4 flex items-baseline justify-between">
          <p className="kicker text-ink/45">{cat.name}</p>
          <Link href={`/productos?c=${cat.slug}`} onClick={close} className="text-sm text-ink/70 hover:text-ink">
            Ver {cat.name.toLowerCase()} →
          </Link>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={active}
            className="grid grid-cols-4 gap-x-5 gap-y-6 xl:grid-cols-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            {list.map((p) => (
              <li key={p.slug}>
                <Link href={`/productos/${p.slug}`} onClick={close} className="group block">
                  <div className="relative aspect-square overflow-hidden rounded-2xl" style={{ backgroundColor: cat.bg }}>
                    <ProductPhoto
                      product={p}
                      fill
                      sizes="200px"
                      className="transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.06]"
                    />
                  </div>
                  <p className="mt-2 text-[0.95rem] leading-tight text-ink">{p.name}</p>
                  <p className="text-xs text-ink/55">
                    {p.variants.length > 1 ? `${p.variants.length} sabores / variedades` : p.sizes[0]}
                  </p>
                </Link>
              </li>
            ))}
          </motion.ul>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ───────────────────────── header ───────────────────────── */

export function Header() {
  const [open, setOpen] = useState(false); // mobile overlay
  const [mega, setMega] = useState(false); // desktop products panel
  const [active, setActive] = useState<CategorySlug>("yogurt");
  const [mobileCat, setMobileCat] = useState<CategorySlug | null>(null);
  const [mobileProducts, setMobileProducts] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const { scrollY } = useScroll();
  const pathname = usePathname();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(y > 40);
    setHidden(y > 300 && y > prev + 2);
    if (y < prev - 2) setHidden(false);
  });

  // close menus when the route changes (adjust state during render, not in an effect)
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
    setMega(false);
  }

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMega(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // hover intent: open immediately, close after a short grace period
  const openMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMega(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMega(false), 160);
  };
  const closeAll = () => {
    setMega(false);
    setOpen(false);
  };

  const showBg = (solid || mega) && !open;

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: hidden && !open && !mega ? "-110%" : "0%" }}
        transition={{ duration: 0.45, ease: EASE }}
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${showBg ? (mega ? "bg-paper" : "bg-paper/85 backdrop-blur-md") : "bg-transparent"}`}
        onMouseLeave={scheduleClose}
      >
        <div className="gutter flex h-16 items-center justify-between md:h-20">
          <Link href="/" aria-label="Fresh Lovers — inicio" className="relative z-10 block w-[84px] md:w-[96px]" onClick={closeAll}>
            <Logo className="h-auto w-full" fill={open ? "var(--paper)" : "var(--ink)"} ink={open ? "var(--ink)" : "var(--paper)"} />
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
            <button
              type="button"
              aria-expanded={mega}
              aria-controls="mega-menu"
              onMouseEnter={openMega}
              onFocus={openMega}
              onClick={() => setMega((m) => !m)}
              className="group relative inline-flex items-center gap-1.5 text-[0.95rem] text-ink"
            >
              Productos
              <svg viewBox="0 0 12 12" className={`h-2.5 w-2.5 transition-transform duration-300 ${mega ? "rotate-180" : ""}`} aria-hidden="true">
                <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span className={`absolute -bottom-1 left-0 h-px w-full origin-left bg-current transition-transform duration-500 ease-[var(--ease-out)] ${mega ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
            </button>
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onMouseEnter={scheduleClose} className="group relative text-[0.95rem] text-ink">
                {n.label}
                <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-x-100" />
              </Link>
            ))}
            <a
              href={whatsappLink("Hola Fresh Lovers 👋")}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={scheduleClose}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.95rem] text-paper transition-transform duration-300 hover:-translate-y-0.5"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Escríbenos
            </a>
          </nav>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="menu"
            className={`relative z-10 flex h-11 items-center gap-3 rounded-full px-4 text-sm md:hidden ${open ? "bg-paper text-ink" : "bg-ink text-paper"}`}
          >
            <span>{open ? "Cerrar" : "Menú"}</span>
            <span className="relative block h-2.5 w-4" aria-hidden="true">
              <span className={`absolute left-0 top-0 h-px w-full bg-current transition-transform duration-300 ${open ? "translate-y-[5px] rotate-45" : ""}`} />
              <span className={`absolute bottom-0 left-0 h-px w-full bg-current transition-transform duration-300 ${open ? "-translate-y-[4px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>

        {/* desktop mega menu */}
        <AnimatePresence>
          {mega && (
            <motion.div
              id="mega-menu"
              role="region"
              aria-label="Productos"
              className="hidden overflow-hidden border-t border-ink/10 bg-paper shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)] md:block"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              onMouseEnter={openMega}
            >
              <MegaMenu active={active} setActive={setActive} close={closeAll} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* dim the page behind the mega menu */}
      <AnimatePresence>
        {mega && (
          <motion.div
            aria-hidden="true"
            className="fixed inset-0 z-40 hidden bg-ink/25 backdrop-blur-[2px] md:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setMega(false)}
            onMouseEnter={scheduleClose}
          />
        )}
      </AnimatePresence>

      {/* mobile overlay with collapsible products */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-ink text-paper md:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
          >
            <nav aria-label="Menú móvil" className="gutter mt-24 flex flex-1 flex-col">
              <Link href="/" onClick={closeAll} className="font-display py-2 text-[10vw] leading-[1.05]">
                Inicio
              </Link>

              <button
                type="button"
                aria-expanded={mobileProducts}
                onClick={() => setMobileProducts((v) => !v)}
                className="font-display flex items-center justify-between py-2 text-left text-[10vw] leading-[1.05]"
              >
                Productos
                <span aria-hidden="true" className={`text-[6vw] transition-transform duration-300 ${mobileProducts ? "rotate-45" : ""}`}>
                  +
                </span>
              </button>
              <AnimatePresence initial={false}>
                {mobileProducts && (
                  <motion.ul
                    className="overflow-hidden border-l border-paper/15 pl-4"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    {categories.map((c) => {
                      const on = mobileCat === c.slug;
                      return (
                        <li key={c.slug} className="border-b border-paper/10">
                          <button
                            type="button"
                            aria-expanded={on}
                            onClick={() => setMobileCat(on ? null : c.slug)}
                            className="flex w-full items-center justify-between py-3 text-left text-[1.15rem]"
                          >
                            {c.name}
                            <span aria-hidden="true" className={`text-paper/60 transition-transform duration-300 ${on ? "rotate-90" : ""}`}>
                              ›
                            </span>
                          </button>
                          <AnimatePresence initial={false}>
                            {on && (
                              <motion.ul
                                className="overflow-hidden"
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                transition={{ duration: 0.35, ease: EASE }}
                              >
                                {inCategory(c.slug).map((p) => (
                                  <li key={p.slug}>
                                    <Link href={`/productos/${p.slug}`} onClick={closeAll} className="flex items-center gap-3 py-2">
                                      <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-xl" style={{ backgroundColor: c.bg }}>
                                        <ProductPhoto product={p} fill sizes="48px" />
                                      </span>
                                      <span className="text-[0.98rem] text-paper/90">{p.name}</span>
                                    </Link>
                                  </li>
                                ))}
                                <li>
                                  <Link href={`/productos?c=${c.slug}`} onClick={closeAll} className="block py-2 pb-4 text-sm text-paper/60">
                                    Ver todo {c.name.toLowerCase()} →
                                  </Link>
                                </li>
                              </motion.ul>
                            )}
                          </AnimatePresence>
                        </li>
                      );
                    })}
                    <li>
                      <Link href="/productos" onClick={closeAll} className="block py-4 text-[1rem] text-paper/80">
                        Ver todo el catálogo →
                      </Link>
                    </li>
                  </motion.ul>
                )}
              </AnimatePresence>

              {nav.map((n) => (
                <Link key={n.href} href={n.href} onClick={closeAll} className="font-display py-2 text-[10vw] leading-[1.05]">
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="gutter flex items-center justify-between gap-3 pb-28 pt-8 text-sm text-paper/70">
              <a href={instagramLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                <InstagramIcon className="h-4 w-4" />@{site.instagram}
              </a>
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
