import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { GAMES } from "@/lib/catalog";

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-ink bg-ink text-paper">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Wordmark className="text-4xl" />
          <p className="mt-4 max-w-sm font-serif text-xl italic text-paper/80">
            An arcade, a museum and an intelligence playground. Free, no sign-up, made for sharing.
          </p>
          <p className="mt-6 font-mono text-xs text-paper/50">
            Records are saved only in this browser. No accounts, no tracking cookies.
          </p>
        </div>
        <div>
          <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-paper/50">Games</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm md:grid-cols-1">
            {GAMES.map((g) => (
              <li key={g.slug}>
                <Link href={`/play/${g.slug}`} className="hover:underline">
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-paper/50">More</h2>
          <ul className="mt-4 space-y-1.5 text-sm">
            <li>
              <Link href="/party" className="hover:underline">Party Mode</Link>
            </li>
            <li>
              <Link href="/records" className="hover:underline">My Records</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-paper/15">
        <p className="mx-auto max-w-7xl px-4 py-5 font-mono text-[11px] text-paper/50 sm:px-6">
          © {new Date().getFullYear()} MINDTRIAL · All games are original works · Public beta
        </p>
      </div>
    </footer>
  );
}
