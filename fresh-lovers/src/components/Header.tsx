"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Logo } from "./Logo";
import { WhatsAppIcon, InstagramIcon } from "./Icons";
import { instagramLink, site, whatsappLink } from "@/data/site";

const nav = [
  { href: "/productos", label: "Productos" },
  { href: "/#historia", label: "Historia" },
  { href: "/#kosher", label: "Kosher" },
  { href: "/#donde-comprar", label: "Dónde comprar" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const { scrollY } = useScroll();
  const pathname = usePathname();

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(y > 40);
    setHidden(y > 300 && y > prev + 2);
    if (y < prev - 2) setHidden(false);
  });

  // close the menu when the route changes (adjust state during render, not in an effect)
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: hidden && !open ? "-110%" : "0%" }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
          solid && !open ? "bg-paper/85 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="gutter flex h-16 items-center justify-between md:h-20">
          <Link href="/" aria-label="Fresh Lovers — inicio" className="relative z-10 block w-[84px] md:w-[96px]">
            <Logo
              className="h-auto w-full"
              fill={open ? "var(--paper)" : "var(--ink)"}
              ink={open ? "var(--ink)" : "var(--paper)"}
            />
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="group relative text-[0.95rem] text-ink">
                {n.label}
                <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-x-100" />
              </Link>
            ))}
            <a
              href={whatsappLink("Hola Fresh Lovers 👋")}
              target="_blank"
              rel="noopener noreferrer"
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
            className={`relative z-10 flex h-11 items-center gap-3 rounded-full px-4 text-sm md:hidden ${
              open ? "bg-paper text-ink" : "bg-ink text-paper"
            }`}
          >
            <span>{open ? "Cerrar" : "Menú"}</span>
            <span className="relative block h-2.5 w-4" aria-hidden="true">
              <span className={`absolute left-0 top-0 h-px w-full bg-current transition-transform duration-300 ${open ? "translate-y-[5px] rotate-45" : ""}`} />
              <span className={`absolute bottom-0 left-0 h-px w-full bg-current transition-transform duration-300 ${open ? "-translate-y-[4px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            className="fixed inset-0 z-40 flex flex-col bg-ink text-paper md:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
          >
            <nav aria-label="Menú móvil" className="gutter mt-28 flex flex-1 flex-col gap-1">
              {[{ href: "/", label: "Inicio" }, ...nav, { href: "/#contacto", label: "Contacto" }].map((n, i) => (
                <motion.div
                  key={n.href}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.18 + i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link href={n.href} onClick={() => setOpen(false)} className="flex items-baseline gap-4 py-1.5">
                    <span className="kicker w-6 text-paper/40">{String(i + 1).padStart(2, "0")}</span>
                    <span className="font-display text-[11vw] leading-[1.05]">{n.label}</span>
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="gutter flex items-center justify-between gap-3 pb-28 pt-6 text-sm text-paper/70">
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
