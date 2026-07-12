import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

const NAV = [
  { href: "/", label: "Explorar" },
  { href: "/calendario", label: "Calendario" },
];

export function Header() {
  return (
    <header
      className="sticky top-0 z-20 backdrop-blur border-b"
      style={{ borderColor: "var(--wr-line)", background: "color-mix(in srgb, var(--wr-bg) 85%, transparent)" }}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-display font-bold text-xl uppercase tracking-wide"
          style={{ color: "var(--wr-ink)" }}
        >
          <Image src="/brand/icono.png" alt="" width={32} height={32} priority />
          <span>
            <span style={{ color: "var(--wr-acc)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
              The
            </span>{" "}
            World Runner
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium" style={{ color: "var(--wr-mut)" }}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:opacity-80">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
