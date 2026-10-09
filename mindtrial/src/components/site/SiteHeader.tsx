import Link from "next/link";
import { Gamepad2, MessageSquare, Trophy, Users } from "lucide-react";
import { FEEDBACK_URL } from "@/lib/links";
import { Wordmark } from "./Wordmark";
import { t } from "@/lib/i18n";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="text-2xl sm:text-[1.7rem]" aria-label="MINDTRIAL home">
          <Wordmark />
        </Link>
        <span className="hidden rounded-full border-2 border-ink px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest md:inline">
          Public beta
        </span>
        <nav className="ml-auto flex items-center gap-1 text-sm font-semibold sm:gap-2" aria-label="Main">
          <Link href="/#games" className="flex items-center gap-1.5 rounded-full px-3 py-2 transition hover:bg-ink hover:text-paper">
            <Gamepad2 size={16} /> <span className="hidden sm:inline">{t.nav.games}</span>
          </Link>
          <Link href="/party" className="flex items-center gap-1.5 rounded-full px-3 py-2 transition hover:bg-ink hover:text-paper">
            <Users size={16} /> <span className="hidden sm:inline">{t.nav.party}</span>
          </Link>
          <Link href="/records" className="flex items-center gap-1.5 rounded-full px-3 py-2 transition hover:bg-ink hover:text-paper">
            <Trophy size={16} /> <span className="hidden sm:inline">{t.nav.records}</span>
          </Link>
          <a
            href={FEEDBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Send feedback (opens GitHub)"
            className="flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1.5 transition hover:bg-ink hover:text-paper"
          >
            <MessageSquare size={16} /> <span className="hidden lg:inline">Feedback</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
