import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="grain flex min-h-[80dvh] flex-col items-center justify-center px-4 text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-muted">Error 404</p>
        <h1 className="mt-3 font-display text-[clamp(3rem,12vw,9rem)] font-black leading-[0.85] tracking-[-0.05em]">
          Lost the <span className="font-serif font-normal italic text-coral">plot.</span>
        </h1>
        <p className="mt-4 font-serif text-2xl italic text-ink-2">This exhibit doesn&apos;t exist (yet).</p>
        <Link href="/" className="btn mt-8 bg-ink text-paper">
          Back to the museum
        </Link>
      </main>
    </>
  );
}
