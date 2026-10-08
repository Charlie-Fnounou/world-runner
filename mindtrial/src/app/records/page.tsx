import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { RecordsBoard } from "@/components/site/RecordsBoard";

export const metadata: Metadata = {
  title: "My Records",
  description: "Your personal bests across every MINDTRIAL game, saved in this browser.",
};

export default function RecordsPage() {
  return (
    <>
      <SiteHeader />
      <main className="grain mx-auto min-h-[70dvh] max-w-7xl px-4 py-14 sm:px-6">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-muted">Hall of personal fame</p>
        <h1 className="mt-2 font-display text-[clamp(2.6rem,7vw,5.5rem)] font-black leading-[0.9] tracking-[-0.045em]">
          My <span className="font-serif font-normal italic text-coral">records</span>
        </h1>
        <p className="mt-3 max-w-xl font-mono text-xs text-muted">Saved only on this device. Clearing your browser data erases them.</p>
        <RecordsBoard />
      </main>
      <SiteFooter />
    </>
  );
}
