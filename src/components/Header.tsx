import Link from "next/link";
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
        <Link href="/" className="font-display font-bold text-2xl" style={{ color: "var(--wr-ink)" }}>
          World<span style={{ color: "var(--wr-acc)" }}>Runner</span>
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
