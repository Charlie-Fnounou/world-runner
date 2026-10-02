"use client";

import Link from "next/link";
import { InstagramIcon, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "./InstagramIcon";
import { useIdioma } from "./LanguageProvider";

export function Footer() {
  const { t } = useIdioma();

  return (
    <footer className="border-t mt-auto" style={{ borderColor: "var(--wr-line)" }}>
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-medium hover:opacity-80"
          style={{ color: "var(--wr-mut)" }}
        >
          <InstagramIcon />
          {t.footer.seguinos}: @{INSTAGRAM_HANDLE}
        </a>
        <nav className="flex gap-4 text-sm" style={{ color: "var(--wr-mut)" }}>
          <Link href="/planes" className="hover:underline">
            {t.nav.planes}
          </Link>
          <Link href="/terminos" className="hover:underline">
            {t.planes.terminos}
          </Link>
          <Link href="/privacidad" className="hover:underline">
            {t.planes.privacidad}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
