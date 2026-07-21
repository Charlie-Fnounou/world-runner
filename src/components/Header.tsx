"use client";

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { MobileNav } from "./MobileNav";
import { InstagramIcon, INSTAGRAM_URL } from "./InstagramIcon";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useIdioma } from "./LanguageProvider";

export function Header() {
  const { t } = useIdioma();

  const nav = [
    { href: "/", label: t.nav.explorar },
    { href: "/calendario", label: t.nav.calendario },
    { href: "/rankings", label: t.nav.rankings },
    { href: "/comparar", label: t.nav.comparar },
    { href: "/viaje", label: t.nav.viaje },
    { href: "/asistente", label: t.nav.ia },
    { href: "/perfil", label: t.nav.perfil },
  ];

  return (
    <header
      className="sticky top-0 z-20 backdrop-blur border-b"
      style={{ borderColor: "var(--wr-line)", background: "color-mix(in srgb, var(--wr-bg) 85%, transparent)" }}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-display font-bold text-xl uppercase tracking-wide shrink-0 whitespace-nowrap"
          style={{ color: "var(--wr-ink)" }}
        >
          <Image src="/brand/icono.png" alt="" width={32} height={32} priority />
          <span className="hidden md:inline">
            <span style={{ color: "var(--wr-acc)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
              The
            </span>{" "}
            World Runner
          </span>
        </Link>
        <nav
          className="hidden sm:flex items-center gap-3 lg:gap-5 text-sm font-medium overflow-x-auto min-w-0"
          style={{ color: "var(--wr-mut)" }}
        >
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="hover:opacity-80 whitespace-nowrap">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.nav.seguinosInstagram}
            title={t.nav.seguinosInstagram}
            className="w-9 h-9 rounded-full hidden sm:flex items-center justify-center border hover:opacity-80"
            style={{ borderColor: "var(--wr-line)", color: "var(--wr-ink)" }}
          >
            <InstagramIcon />
          </a>
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <ThemeToggle />
          <UserMenu />
          <MobileNav items={nav} />
        </div>
      </div>
    </header>
  );
}
